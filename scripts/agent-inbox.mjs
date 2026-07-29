#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTrackerTransaction } from './tracker-utils.mjs';

export const AGENT_INBOX_SCHEMA_VERSION = 1;
const META = JSON.stringify({
  schemaVersion: AGENT_INBOX_SCHEMA_VERSION,
  event: 'meta',
  invariant: 'no-send-no-submit',
});

function ensureQueue(path) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) return;
  try {
    writeFileSync(path, `${META}\n`, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

function parseEvents(content) {
  return String(content)
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(
          `agent inbox line ${index + 1} is invalid JSON: ${error.message}`,
        );
      }
    });
}

export function reduceAgentInbox(events, now = new Date()) {
  const items = new Map();
  for (const event of events) {
    if (event.event === 'meta') continue;
    if (event.event === 'enqueue') {
      if (items.has(event.itemId)) {
        throw new Error(`duplicate agent inbox item ID: ${event.itemId}`);
      }
      items.set(event.itemId, {
        id: event.itemId,
        createdAt: event.timestamp,
        sourceType: event.sourceType,
        sourceRef: event.sourceRef,
        summary: event.summary,
        payload: event.payload,
        status: 'pending',
        claim: null,
        review: null,
        outcome: null,
      });
      continue;
    }
    const item = items.get(event.itemId);
    if (!item)
      throw new Error(`event references unknown inbox item: ${event.itemId}`);
    if (event.event === 'claim') {
      item.claim = {
        token: event.claimToken,
        claimedBy: event.claimedBy,
        claimedAt: event.timestamp,
        leaseUntil: event.leaseUntil,
      };
      item.status = 'claimed';
    } else if (event.event === 'review') {
      item.review = {
        decision: event.decision,
        note: event.note,
        reviewedAt: event.timestamp,
      };
      item.status =
        event.decision === 'approve'
          ? 'approved'
          : event.decision === 'reject'
            ? 'rejected'
            : 'needs_context';
    } else if (event.event === 'outcome') {
      item.outcome = {
        status: event.status,
        note: event.note,
        artifacts: event.artifacts,
        recordedAt: event.timestamp,
      };
      item.status = event.status;
    }
  }
  for (const item of items.values()) {
    if (
      item.status === 'claimed' &&
      item.claim &&
      new Date(item.claim.leaseUntil) <= now
    ) {
      item.status = 'pending';
      item.claim = null;
    }
  }
  return [...items.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

async function mutateQueue(root, operation) {
  const queuePath = resolve(root, 'data/agent-inbox.jsonl');
  ensureQueue(queuePath);
  const transaction = await openTrackerTransaction(queuePath);
  let result;
  let operationError = null;
  try {
    const before = transaction.read();
    const events = parseEvents(before);
    const change = operation(events, reduceAgentInbox(events));
    if (change?.event) {
      transaction.replace(
        `${before.trimEnd()}\n${JSON.stringify(change.event)}\n`,
      );
    }
    result = change?.result;
  } catch (error) {
    operationError = error;
  }
  const closeError = transaction.close();
  if (operationError) throw operationError;
  if (closeError) throw closeError;
  return result;
}

function timestamp() {
  return new Date().toISOString();
}

export async function enqueueAgentInboxItem({
  root = process.cwd(),
  sourceType,
  sourceRef = null,
  summary,
  payload = null,
  itemId = randomUUID(),
}) {
  if (
    !['paste', 'email', 'calendar', 'job_url', 'note', 'integration'].includes(
      sourceType,
    )
  ) {
    throw new Error('invalid inbox source type');
  }
  if (!summary || String(summary).length > 1000) {
    throw new Error('summary is required and limited to 1000 characters');
  }
  return mutateQueue(resolve(root), (_events, items) => {
    if (items.some((item) => item.id === itemId)) {
      throw new Error(`agent inbox item already exists: ${itemId}`);
    }
    const event = {
      schemaVersion: AGENT_INBOX_SCHEMA_VERSION,
      event: 'enqueue',
      eventId: randomUUID(),
      timestamp: timestamp(),
      itemId,
      sourceType,
      sourceRef,
      summary: String(summary).trim(),
      payload,
      invariant: 'no-send-no-submit',
    };
    return {
      event,
      result: {
        itemId,
        status: 'pending',
        queue: 'data/agent-inbox.jsonl',
        sendPerformed: false,
        submissionPerformed: false,
      },
    };
  });
}

export async function claimAgentInboxItem({
  root = process.cwd(),
  itemId,
  claimedBy = 'codex',
  leaseMinutes = 30,
}) {
  if (
    !Number.isInteger(Number(leaseMinutes)) ||
    leaseMinutes < 1 ||
    leaseMinutes > 1440
  ) {
    throw new Error('leaseMinutes must be from 1 to 1440');
  }
  return mutateQueue(resolve(root), (_events, items) => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) throw new Error(`agent inbox item not found: ${itemId}`);
    if (item.status !== 'pending') {
      throw new Error(`agent inbox item is ${item.status}, not pending`);
    }
    const now = new Date();
    const token = randomUUID();
    const leaseUntil = new Date(
      now.getTime() + Number(leaseMinutes) * 60_000,
    ).toISOString();
    return {
      event: {
        schemaVersion: AGENT_INBOX_SCHEMA_VERSION,
        event: 'claim',
        eventId: randomUUID(),
        timestamp: now.toISOString(),
        itemId,
        claimToken: token,
        claimedBy,
        leaseUntil,
      },
      result: { itemId, status: 'claimed', claimToken: token, leaseUntil },
    };
  });
}

function requireClaim(item, claimToken) {
  if (!item?.claim || item.claim.token !== claimToken) {
    throw new Error('valid current claim token is required');
  }
  const leaseUntil = new Date(item.claim.leaseUntil);
  if (
    Number.isNaN(leaseUntil.getTime()) ||
    leaseUntil.getTime() <= Date.now()
  ) {
    throw new Error('current claim lease has expired; claim the item again');
  }
}

export async function reviewAgentInboxItem({
  root = process.cwd(),
  itemId,
  claimToken,
  decision,
  note = '',
}) {
  if (!['approve', 'reject', 'needs_context'].includes(decision)) {
    throw new Error('decision must be approve, reject, or needs_context');
  }
  return mutateQueue(resolve(root), (_events, items) => {
    const item = items.find((candidate) => candidate.id === itemId);
    requireClaim(item, claimToken);
    const event = {
      schemaVersion: AGENT_INBOX_SCHEMA_VERSION,
      event: 'review',
      eventId: randomUUID(),
      timestamp: timestamp(),
      itemId,
      claimToken,
      decision,
      note: String(note).slice(0, 2000),
    };
    return {
      event,
      result: {
        itemId,
        status:
          decision === 'approve'
            ? 'approved'
            : decision === 'reject'
              ? 'rejected'
              : 'needs_context',
      },
    };
  });
}

export async function recordAgentInboxOutcome({
  root = process.cwd(),
  itemId,
  claimToken,
  status,
  note = '',
  artifacts = [],
}) {
  if (!['completed', 'failed', 'deferred'].includes(status)) {
    throw new Error('outcome status must be completed, failed, or deferred');
  }
  if (
    !Array.isArray(artifacts) ||
    artifacts.some((path) => typeof path !== 'string')
  ) {
    throw new Error('artifacts must be an array of project-relative paths');
  }
  return mutateQueue(resolve(root), (_events, items) => {
    const item = items.find((candidate) => candidate.id === itemId);
    requireClaim(item, claimToken);
    if (item.review?.decision !== 'approve') {
      throw new Error(
        'an approved review is required before recording an outcome',
      );
    }
    const event = {
      schemaVersion: AGENT_INBOX_SCHEMA_VERSION,
      event: 'outcome',
      eventId: randomUUID(),
      timestamp: timestamp(),
      itemId,
      claimToken,
      status,
      note: String(note).slice(0, 2000),
      artifacts,
      sendPerformed: false,
      submissionPerformed: false,
    };
    return {
      event,
      result: {
        itemId,
        status,
        sendPerformed: false,
        submissionPerformed: false,
      },
    };
  });
}

export function listAgentInbox({ root = process.cwd() } = {}) {
  const path = resolve(root, 'data/agent-inbox.jsonl');
  if (!existsSync(path)) return [];
  return reduceAgentInbox(parseEvents(readFileSync(path, 'utf8')));
}

function argument(argv, name) {
  return argv
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function usage() {
  return [
    'Usage:',
    '  node scripts/agent-inbox.mjs enqueue --source-type=paste --summary=...',
    '  node scripts/agent-inbox.mjs claim --id=... [--claimed-by=codex]',
    '  node scripts/agent-inbox.mjs review --id=... --token=... --decision=approve|reject|needs_context',
    '  node scripts/agent-inbox.mjs outcome --id=... --token=... --status=completed|failed|deferred',
    '  node scripts/agent-inbox.mjs list',
  ].join('\n');
}

export async function runAgentInboxCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const [command] = argv.filter((value) => !value.startsWith('--'));
  const root = options.root || argument(argv, '--root') || process.cwd();
  let result;
  if (command === 'enqueue') {
    result = await enqueueAgentInboxItem({
      root,
      sourceType: argument(argv, '--source-type'),
      sourceRef: argument(argv, '--source-ref') || null,
      summary: argument(argv, '--summary'),
      payload: argument(argv, '--payload') || null,
    });
  } else if (command === 'claim') {
    result = await claimAgentInboxItem({
      root,
      itemId: argument(argv, '--id'),
      claimedBy: argument(argv, '--claimed-by') || 'codex',
      leaseMinutes: Number(argument(argv, '--lease-minutes') || 30),
    });
  } else if (command === 'review') {
    result = await reviewAgentInboxItem({
      root,
      itemId: argument(argv, '--id'),
      claimToken: argument(argv, '--token'),
      decision: argument(argv, '--decision'),
      note: argument(argv, '--note') || '',
    });
  } else if (command === 'outcome') {
    result = await recordAgentInboxOutcome({
      root,
      itemId: argument(argv, '--id'),
      claimToken: argument(argv, '--token'),
      status: argument(argv, '--status'),
      note: argument(argv, '--note') || '',
      artifacts: argument(argv, '--artifacts')
        ? argument(argv, '--artifacts')
            .split(',')
            .map((value) => value.trim())
        : [],
    });
  } else if (command === 'list') {
    result = listAgentInbox({ root });
  } else {
    throw new Error(usage());
  }
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = await runAgentInboxCli();
  } catch (error) {
    console.error(`Agent inbox failed: ${error.message}`);
    process.exitCode = 1;
  }
}

#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  claimAgentInboxItem,
  enqueueAgentInboxItem,
  listAgentInbox,
  recordAgentInboxOutcome,
  reviewAgentInboxItem,
} from './agent-inbox.mjs';

const root = mkdtempSync(join(tmpdir(), 'jobhunt-agent-inbox-'));
try {
  const queued = await enqueueAgentInboxItem({
    root,
    sourceType: 'paste',
    summary: 'Employer reply needs classification',
    payload: 'Pasted message text',
    itemId: 'item-1',
  });
  assert.equal(queued.status, 'pending');
  assert.equal(queued.sendPerformed, false);
  const claim = await claimAgentInboxItem({
    root,
    itemId: 'item-1',
    claimedBy: 'test',
  });
  await assert.rejects(
    claimAgentInboxItem({ root, itemId: 'item-1' }),
    /not pending/,
  );
  await assert.rejects(
    reviewAgentInboxItem({
      root,
      itemId: 'item-1',
      claimToken: 'wrong',
      decision: 'approve',
    }),
    /claim token/,
  );
  const review = await reviewAgentInboxItem({
    root,
    itemId: 'item-1',
    claimToken: claim.claimToken,
    decision: 'approve',
    note: 'Classification reviewed.',
  });
  assert.equal(review.status, 'approved');
  const outcome = await recordAgentInboxOutcome({
    root,
    itemId: 'item-1',
    claimToken: claim.claimToken,
    status: 'completed',
    artifacts: ['reports/reply-review.json'],
  });
  assert.equal(outcome.submissionPerformed, false);
  const items = listAgentInbox({ root });
  assert.equal(items[0].status, 'completed');
  assert.deepEqual(items[0].outcome.artifacts, ['reports/reply-review.json']);

  await enqueueAgentInboxItem({
    root,
    sourceType: 'integration',
    summary: 'Approved work must not outlive its lease',
    itemId: 'item-expired',
  });
  const expiringClaim = await claimAgentInboxItem({
    root,
    itemId: 'item-expired',
    claimedBy: 'test',
  });
  await reviewAgentInboxItem({
    root,
    itemId: 'item-expired',
    claimToken: expiringClaim.claimToken,
    decision: 'approve',
  });
  const queuePath = join(root, 'data/agent-inbox.jsonl');
  const expiredEvents = readFileSync(queuePath, 'utf8')
    .split('\n')
    .map((line) => {
      if (!line) return line;
      const event = JSON.parse(line);
      if (event.event === 'claim' && event.itemId === 'item-expired') {
        event.leaseUntil = '2000-01-01T00:00:00.000Z';
      }
      return JSON.stringify(event);
    })
    .join('\n');
  writeFileSync(queuePath, expiredEvents, { mode: 0o600 });
  await assert.rejects(
    recordAgentInboxOutcome({
      root,
      itemId: 'item-expired',
      claimToken: expiringClaim.claimToken,
      status: 'completed',
    }),
    /lease has expired/,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Agent inbox queue tests passed');

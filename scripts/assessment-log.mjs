#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as z from 'zod';
import { parseTracker } from './tracker-parse.mjs';
import {
  openTrackerTransaction,
  resolveTrackerPath,
} from './tracker-utils.mjs';

export const ASSESSMENT_LOG_SCHEMA_VERSION = 1;
const HEADER =
  'schema_version\tevaluated_at\tapp_num\tcompany\tplatform\tskill\toutcome\tsource\tstale_after\tnote\n';

export const AssessmentRecordSchema = z
  .object({
    schemaVersion: z.literal(ASSESSMENT_LOG_SCHEMA_VERSION),
    evaluatedAt: z.iso.date(),
    appNum: z.number().int().positive(),
    company: z.string().min(1).max(200),
    platform: z.string().min(1).max(200),
    skill: z.string().min(1).max(300),
    outcome: z.enum(['passed', 'failed', 'unknown']),
    source: z.string().min(1).max(500),
    staleAfter: z.iso.date().nullable().default(null),
    note: z.string().max(1500).default(''),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (record.staleAfter !== null && record.staleAfter < record.evaluatedAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['staleAfter'],
        message: 'staleAfter cannot be before evaluatedAt',
      });
    }
  });

function cell(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\t\r\n\u2028\u2029]+/g, ' ')
    .trim();
}

function ensureLog(path) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) return;
  try {
    writeFileSync(path, HEADER, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

function serialize(record) {
  return [
    record.schemaVersion,
    record.evaluatedAt,
    record.appNum,
    record.company,
    record.platform,
    record.skill,
    record.outcome,
    record.source,
    record.staleAfter || '',
    record.note,
  ]
    .map(cell)
    .join('\t');
}

export function parseAssessmentLog(content) {
  const records = [];
  const malformed = [];
  for (const [index, line] of String(content).split('\n').entries()) {
    if (!line.trim() || line.startsWith('schema_version\t')) continue;
    const columns = line.split('\t');
    if (columns.length !== 10) {
      malformed.push({
        line: index + 1,
        reason: `expected 10 columns, found ${columns.length}`,
      });
      continue;
    }
    try {
      records.push(
        AssessmentRecordSchema.parse({
          schemaVersion: Number(columns[0]),
          evaluatedAt: columns[1],
          appNum: Number(columns[2]),
          company: columns[3],
          platform: columns[4],
          skill: columns[5],
          outcome: columns[6],
          source: columns[7],
          staleAfter: columns[8] || null,
          note: columns[9],
        }),
      );
    } catch (error) {
      malformed.push({
        line: index + 1,
        reason: error.issues?.[0]?.message || error.message,
      });
    }
  }
  return { records, malformed };
}

export function summarizeAssessments(
  records,
  malformed = [],
  today = new Date().toISOString().slice(0, 10),
) {
  const byPlatform = {};
  const bySkill = {};
  let stale = 0;
  for (const record of records) {
    const isStale =
      record.staleAfter !== null && record.staleAfter < String(today);
    if (isStale) stale++;
    for (const [map, key] of [
      [byPlatform, record.platform],
      [bySkill, record.skill],
    ]) {
      map[key] ??= { total: 0, passed: 0, failed: 0, unknown: 0, stale: 0 };
      map[key].total++;
      map[key][record.outcome]++;
      if (isStale) map[key].stale++;
    }
  }
  return {
    schemaVersion: ASSESSMENT_LOG_SCHEMA_VERSION,
    records: records.map((record) => ({
      ...record,
      stale: record.staleAfter !== null && record.staleAfter < String(today),
    })),
    aggregates: { byPlatform, bySkill },
    dataQuality: {
      total: records.length,
      stale,
      malformed,
      stalenessPolicy:
        'stale only when an explicit staleAfter date has passed; absence means unknown, not current',
    },
  };
}

function assertTrackerIdentity(root, record) {
  const tracker = resolveTrackerPath(root);
  if (!existsSync(tracker)) throw new Error(`Tracker not found at ${tracker}`);
  const row = parseTracker(readFileSync(tracker, 'utf8')).rows.find(
    (candidate) => candidate.num === record.appNum,
  );
  if (!row) throw new Error(`Tracker row #${record.appNum} does not exist`);
  const key = (value) =>
    String(value)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '');
  if (key(row.company) !== key(record.company)) {
    throw new Error(
      `Company mismatch for tracker #${record.appNum}: expected ${row.company}`,
    );
  }
}

export async function appendAssessmentRecord({ root = process.cwd(), record }) {
  const projectRoot = resolve(root);
  const parsed = AssessmentRecordSchema.parse(record);
  assertTrackerIdentity(projectRoot, parsed);
  const path = resolve(projectRoot, 'data/assessments.tsv');
  ensureLog(path);
  const transaction = await openTrackerTransaction(path);
  let operationError = null;
  try {
    const before = transaction.read();
    const line = serialize(parsed);
    if (before.split('\n').includes(line)) {
      throw new Error('Exact assessment record already exists');
    }
    transaction.replace(`${before.replace(/\n*$/, '')}\n${line}\n`);
  } catch (error) {
    operationError = error;
  }
  const closeError = transaction.close();
  if (operationError) throw operationError;
  if (closeError) throw closeError;
  return {
    added: true,
    appNum: parsed.appNum,
    skill: parsed.skill,
    outcome: parsed.outcome,
  };
}

export function readAssessments({ root = process.cwd(), today } = {}) {
  const path = resolve(root, 'data/assessments.tsv');
  const parsed = parseAssessmentLog(
    existsSync(path) ? readFileSync(path, 'utf8') : '',
  );
  return summarizeAssessments(parsed.records, parsed.malformed, today);
}

function argument(argv, name) {
  return argv
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function usage() {
  return [
    'Usage:',
    '  node scripts/assessment-log.mjs add --input=assessment.json [--root=.]',
    '  node scripts/assessment-log.mjs [--summary] [--today=YYYY-MM-DD] [--root=.]',
  ].join('\n');
}

export async function runAssessmentLogCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const root = resolve(
    argument(argv, '--root') || options.root || process.cwd(),
  );
  if (argv[0] === 'add') {
    const input = argument(argv, '--input');
    if (!input) throw new Error(usage());
    const result = await appendAssessmentRecord({
      root,
      record: JSON.parse(readFileSync(resolve(root, input), 'utf8')),
    });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  const result = readAssessments({
    root,
    today: argument(argv, '--today'),
  });
  if (argv.includes('--summary')) {
    console.log(
      `${result.dataQuality.total} assessment(s), ${result.dataQuality.stale} explicitly stale`,
    );
    for (const [skill, values] of Object.entries(result.aggregates.bySkill)) {
      console.log(
        `${skill}: ${values.passed} passed, ${values.failed} failed, ${values.unknown} unknown, ${values.stale} stale`,
      );
    }
    if (result.dataQuality.malformed.length > 0) {
      console.log(
        `${result.dataQuality.malformed.length} malformed row(s) reported`,
      );
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  runAssessmentLogCli().catch((error) => {
    console.error(`Assessment log failed: ${error.message}`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  aggregateTokenUsageReports,
  createTokenUsageReport,
  extractMeasuredUsage,
  runTokenUsageCli,
} from './token-usage.mjs';

const log = [
  JSON.stringify({ type: 'turn.started' }),
  'not-json',
  JSON.stringify({
    type: 'item.completed',
    item: { usage: { input_tokens: 50, output_tokens: 5 } },
  }),
  JSON.stringify({
    type: 'turn.completed',
    usage: {
      input_tokens: 1200,
      output_tokens: 300,
      cached_input_tokens: 400,
      total_tokens: 1500,
    },
  }),
].join('\n');

assert.equal(extractMeasuredUsage(log).usage.totalTokens, 1500);
const report = createTokenUsageReport({
  jsonl: log,
  spendTier: 'economy',
  reasoningEffort: 'low',
});
assert.equal(report.steps.posting_preflight.totalTokens, 0);
assert.equal(report.steps.evaluation_worker.measurement, 'measured');
assert.equal(report.totals.cachedInputTokens, 400);
assert.equal(report.pricing.estimatedCost, null);

const unavailable = createTokenUsageReport({
  jsonl: '{"type":"turn.completed"}',
});
assert.equal(unavailable.totals.measurement, 'unavailable');
assert.equal(
  aggregateTokenUsageReports([report, unavailable]).measuredReportCount,
  1,
);

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-usage-'));
try {
  mkdirSync(join(sandbox, 'batch', 'logs'), { recursive: true });
  writeFileSync(join(sandbox, 'batch', 'logs', '001-1.log'), log);
  const exitCode = await runTokenUsageCli(
    [
      'batch/logs/001-1.log',
      '--output=batch/logs/001-1.usage.json',
      '--spend-tier=premium',
      '--effort=high',
    ],
    { root: sandbox },
  );
  assert.equal(exitCode, 0);
  const stored = JSON.parse(
    readFileSync(join(sandbox, 'batch', 'logs', '001-1.usage.json'), 'utf8'),
  );
  assert.equal(stored.policy.spendTier, 'premium');
  await assert.rejects(
    runTokenUsageCli(
      ['../outside.log', '--output=batch/logs/outside.usage.json'],
      { root: sandbox },
    ),
    /inside batch\/logs/,
  );
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('Token usage tests passed');

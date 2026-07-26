#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildPortalHealthRow,
  createScanRunId,
  readLatestPortalHealth,
  recordScanLedgers,
} from './scan-ledger.mjs';

assert.equal(
  createScanRunId({
    timestamp: '2026-07-26T12:34:56.789Z',
    uuid: '12345678-abcd-1234-abcd-123456789abc',
  }),
  'scan-20260726123456789-12345678',
);
assert.equal(
  buildPortalHealthRow(
    { portal: 'Acme', outcome: 'failure' },
    { consecutive_failures: '2', health_score: '70' },
  ).health_score,
  45,
);
assert.equal(
  buildPortalHealthRow(
    { portal: 'Acme', outcome: 'success' },
    { consecutive_failures: '3', health_score: '45' },
  ).health_score,
  55,
);

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-scan-ledger-'));
try {
  const baseRun = {
    run_id: 'scan-1',
    started_at: '2026-07-26T12:00:00.000Z',
    completed_at: '2026-07-26T12:00:05.000Z',
    mode: 'live',
    configured: 2,
    targeted: 2,
    skipped: 0,
    succeeded: 1,
    failed: 1,
    jobs_found: 3,
    filtered: 1,
    duplicates: 0,
    new_offers: 2,
  };
  recordScanLedgers(sandbox, {
    run: baseRun,
    portals: [
      {
        timestamp: baseRun.completed_at,
        run_id: baseRun.run_id,
        portal: 'Acme',
        provider: 'greenhouse',
        outcome: 'failure',
        duration_ms: 12,
        jobs_found: 0,
        error: 'bad\tresponse\nredacted',
      },
      {
        timestamp: baseRun.completed_at,
        run_id: baseRun.run_id,
        portal: 'Beta',
        provider: 'lever',
        outcome: 'success',
        duration_ms: 20,
        jobs_found: 3,
        error: '',
      },
    ],
  });
  recordScanLedgers(sandbox, {
    run: { ...baseRun, run_id: 'scan-2' },
    portals: [
      {
        timestamp: baseRun.completed_at,
        run_id: 'scan-2',
        portal: 'Acme',
        provider: 'greenhouse',
        outcome: 'failure',
        duration_ms: 10,
        jobs_found: 0,
        error: 'again',
      },
    ],
  });

  const healthPath = join(sandbox, 'data', 'portal-health.tsv');
  const health = readFileSync(healthPath, 'utf8');
  assert.match(health, /^timestamp\trun_id\tportal\tprovider\toutcome/m);
  assert.doesNotMatch(health, /bad\tresponse/);
  assert.match(health, /bad response redacted/);
  const latest = readLatestPortalHealth(healthPath);
  assert.equal(latest.get('Acme').consecutive_failures, '2');
  assert.equal(latest.get('Acme').health_score, '65');

  const runs = readFileSync(join(sandbox, 'data', 'scan-runs.tsv'), 'utf8');
  assert.equal(runs.match(/^scan-/gm).length, 2);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('scan ledger regression tests pass');

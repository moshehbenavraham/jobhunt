#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  formatReportId,
  gcReportReservations,
  releaseReportIds,
  reserveReportIds,
} from './reserve-report-ids.mjs';

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

const root = mkdtempSync(join(tmpdir(), 'jobhunt-report-reservations-'));
write(
  join(root, 'data', 'applications.md'),
  [
    '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '|---|------|---------|------|-------|--------|-----|--------|-------|',
    '| 999 | 2026-07-25 | Acme | Engineer | 4.5/5 | Applied | | [1000](reports/1000-acme.md) | |',
    '',
  ].join('\n'),
);
write(join(root, 'reports', '1001-existing.md'), '# report\n');
write(
  join(root, 'batch', 'batch-state.tsv'),
  'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries\n1\thttps://example.com\tprocessing\t-\t-\t1002\t-\t-\t0\n',
);
write(
  join(root, 'batch', 'tracker-additions', '998-pending.tsv'),
  '998\t2026-07-26\tPending\tEngineer\tEvaluated\t4.0/5\t\t[998](reports/998-pending.md)\tpending\n',
);

assert.equal(formatReportId(7), '007');
assert.equal(formatReportId(1003), '1003');
assert.throws(() => formatReportId(0));

const contiguous = await reserveReportIds(3, { root });
assert.deepEqual([...contiguous], [1003, 1004, 1005]);
const reservationNames = readdirSync(join(root, 'reports', '.reservations'));
assert.deepEqual(reservationNames, ['1003.json', '1004.json', '1005.json']);
assert.equal(
  readdirSync(join(root, 'reports')).some((name) => name.includes('RESERVED')),
  false,
);
assert.equal(await releaseReportIds(contiguous, { root }), 3);

const concurrent = await Promise.all(
  Array.from({ length: 12 }, () => reserveReportIds(1, { root })),
);
const concurrentNumbers = concurrent.map(([number]) => number);
assert.equal(new Set(concurrentNumbers).size, concurrentNumbers.length);
assert.deepEqual(
  [...concurrentNumbers].sort((a, b) => a - b),
  Array.from({ length: 12 }, (_, index) => 1003 + index),
);
await Promise.all(
  concurrent.map((reservation) => releaseReportIds(reservation, { root })),
);

const owned = await reserveReportIds(1, { root });
await assert.rejects(
  releaseReportIds([...owned], { root }),
  /ownership token/i,
);
assert.equal(await releaseReportIds(owned, { root }), 1);

const active = await reserveReportIds(1, { root });
const activePath = join(
  root,
  'reports',
  '.reservations',
  `${formatReportId(active[0])}.json`,
);
const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
utimesSync(activePath, oldDate, oldDate);
assert.equal(
  await gcReportReservations({ root, maxAgeMs: 1 }),
  0,
  'GC must not remove a live owner',
);
const owner = JSON.parse(readFileSync(activePath, 'utf8'));
owner.pid = 2_147_483_647;
writeFileSync(activePath, `${JSON.stringify(owner)}\n`, 'utf8');
utimesSync(activePath, oldDate, oldDate);
assert.equal(await gcReportReservations({ root, maxAgeMs: 1 }), 1);

const completed = await reserveReportIds(1, { root });
write(
  join(root, 'reports', `${formatReportId(completed[0])}-done.md`),
  '# done\n',
);
assert.equal(
  await gcReportReservations({ root, maxAgeMs: 24 * 60 * 60 * 1000 }),
  1,
  'durable report should make its sentinel collectable immediately',
);

const escapeRoot = mkdtempSync(join(tmpdir(), 'jobhunt-report-escape-'));
const external = mkdtempSync(join(tmpdir(), 'jobhunt-report-external-'));
mkdirSync(join(escapeRoot, 'data'), { recursive: true });
write(
  join(escapeRoot, 'data', 'applications.md'),
  '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n',
);
symlinkSync(external, join(escapeRoot, 'reports'));
await assert.rejects(
  reserveReportIds(1, { root: escapeRoot }),
  /escapes the Job-Hunt root/,
);

rmSync(root, { recursive: true, force: true });
rmSync(escapeRoot, { recursive: true, force: true });
rmSync(external, { recursive: true, force: true });
console.log('atomic report ID reservation tests pass');

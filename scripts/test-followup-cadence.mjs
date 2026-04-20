#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function withCapturedLogs(fn) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => {
    lines.push(args.join(' '));
  };
  try {
    const result = fn();
    return { result, output: lines.join('\n') };
  } finally {
    console.log = original;
  }
}

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-followup-cadence-'));
process.env.JOBHUNT_ROOT = sandbox;

writeFile(
  join(sandbox, 'data', 'applications.md'),
  [
    '# Applications Tracker',
    '',
    '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
    '| 1 | 2026-04-01 | Acme | Platform Engineer | 4.6 | Applied | ✅ | [001](reports/001.md) | Emailed Jane Doe at jane@example.com |',
    '| 2 | 2026-04-15 | Beta | Backend Engineer | 4.1 | Respondido |  | [002](reports/002.md) | contact: Raj |',
    '| 3 | 2026-04-10 | Gamma | ML Engineer | 3.9 | Interview | ✅ | [003](reports/003.md) | Followed up with gamma@example.com |',
    '| 4 | 2026-04-12 | Delta | Data Engineer | 2.8 | Rejected |  | [004](reports/004.md) | no action |',
    '| 5 | 2026-04-13 | Echo | Analyst | 3.0 | Applied |  | [005](reports/005.md) | second follow-up already sent to echo@example.com |',
    '',
  ].join('\n'),
);

writeFile(
  join(sandbox, 'data', 'follow-ups.md'),
  [
    '# Follow Ups',
    '',
    '| # | App # | Date | Company | Role | Channel | Contact | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| 1 | 1 | 2026-04-05 | Acme | Platform Engineer | email | Jane Doe | first follow up |',
    '| 2 | 5 | 2026-04-14 | Echo | Analyst | email | Echo Recruiter | second nudge |',
    '| 3 | 5 | 2026-04-15 | Echo | Analyst | linkedin | Echo Recruiter | last nudge |',
    '',
  ].join('\n'),
);

for (const report of ['001', '002', '003', '004', '005']) {
  writeFile(join(sandbox, 'reports', `${report}.md`), `# Report ${report}\n`);
}

const followupModule = await import(
  pathToFileURL(join(ROOT, 'scripts', 'followup-cadence.mjs')).href
);

assert.equal(followupModule.normalizeStatus('Aplicada 2026-04-01'), 'applied');
assert.equal(followupModule.today().toISOString().length, 24);
assert.equal(followupModule.parseDate('bad-date'), null);
assert.equal(
  followupModule.addDays(new Date('2026-04-01T00:00:00Z'), 3),
  '2026-04-04',
);
assert.equal(
  followupModule.daysBetween(
    new Date('2026-04-01T00:00:00Z'),
    new Date('2026-04-11T00:00:00Z'),
  ),
  10,
);
assert.deepEqual(
  followupModule.extractContacts('Emailed Jane Doe at jane@example.com'),
  [{ email: 'jane@example.com', name: null }],
);
assert.equal(
  followupModule.computeUrgency('applied', 20, 8, 0, {
    applied_first: 7,
    applied_subsequent: 7,
    applied_max_followups: 2,
    responded_initial: 1,
    responded_subsequent: 3,
    interview_thankyou: 1,
  }),
  'overdue',
);
assert.equal(
  followupModule.computeUrgency('responded', 0, null, 0, {
    applied_first: 7,
    applied_subsequent: 7,
    applied_max_followups: 2,
    responded_initial: 1,
    responded_subsequent: 3,
    interview_thankyou: 1,
  }),
  'urgent',
);
assert.equal(
  followupModule.computeNextFollowupDate(
    'applied',
    '2026-04-01',
    '2026-04-05',
    1,
    {
      applied_first: 7,
      applied_subsequent: 7,
      applied_max_followups: 2,
      responded_initial: 1,
      responded_subsequent: 3,
      interview_thankyou: 1,
    },
  ),
  '2026-04-12',
);
assert.equal(
  followupModule.resolveReportPath('[001](reports/001.md)'),
  'reports/001.md',
);

const analysisNow = new Date('2026-04-15T00:00:00Z');
const result = followupModule.analyze({
  appliedFirst: 10,
  overdueOnlyFilter: false,
  now: analysisNow,
});

assert.equal(result.metadata.totalTracked, 5);
assert.equal(result.metadata.actionable, 4);
assert.equal(result.metadata.overdue, 2);
assert.equal(result.metadata.urgent, 1);
assert.equal(result.metadata.cold, 1);
assert.equal(result.metadata.waiting, 0);
assert.equal(result.entries[0].company, 'Beta');
assert.equal(result.entries[0].urgency, 'urgent');
assert.equal(result.entries[1].company, 'Acme');
assert.equal(result.entries[1].contacts[0].email, 'jane@example.com');
assert.equal(result.entries[1].reportPath, 'reports/001.md');
assert.equal(result.entries[3].company, 'Echo');
assert.equal(result.entries[3].urgency, 'cold');
assert.equal(result.cadenceConfig.applied_first, 10);

const overdueOnly = followupModule.analyze({
  appliedFirst: 10,
  overdueOnlyFilter: true,
  now: analysisNow,
});
assert.equal(overdueOnly.entries.length, 3);
assert.ok(overdueOnly.entries.every((entry) => entry.urgency !== 'cold'));

const summary = withCapturedLogs(() =>
  followupModule.runFollowupCli([
    '--summary',
    '--overdue-only',
    '--applied-days',
    '10',
  ]),
);
assert.match(summary.output, /Follow-up Cadence Dashboard/);
assert.match(summary.output, /OVERDUE/);

rmSync(sandbox, { recursive: true, force: true });

const emptySandbox = mkdtempSync(join(tmpdir(), 'jobhunt-followup-empty-'));
process.env.JOBHUNT_ROOT = emptySandbox;
const emptyModule = await import(
  `${pathToFileURL(join(ROOT, 'scripts', 'followup-cadence.mjs')).href}?empty`
);
const emptyResult = withCapturedLogs(() =>
  emptyModule.runFollowupCli(['--summary']),
);
assert.match(emptyResult.output, /No applications found/);
assert.equal(emptyResult.result.error, 'No applications found in tracker.');
rmSync(emptySandbox, { recursive: true, force: true });

console.log('followup-cadence regression tests pass');

#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { extractTrackerReportNumbers, parseTracker } from './tracker-parse.mjs';
import { setTrackerStatus } from './set-status.mjs';
import {
  acquireTrackerLock,
  cell,
  loadCanonicalStates,
  resolveCanonicalState,
  trackerLockDirFor,
  writeFileAtomic,
} from './tracker-utils.mjs';

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function tracker(rows) {
  return [
    '# Applications Tracker',
    '',
    '| Empresa | Notas | Estado | # | Puesto | Fecha | Informe | Score | PDF | Ubicación | Vía |',
    '| ------- | ----- | ------ | - | ------ | ----- | ------- | ----- | --- | --------- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const parsed = parseTracker(
  tracker([
    '| Acmé | note | Applied | 7 | Staff AI Engineer | 2026-07-25 | [007](reports/007-acme-(ai).md) | 4.7/5 | ✅ | Tel Aviv | Referral |',
    '| Beta |  | Interview | 8 | Platform Engineer | 2026-07-26 | reports/008-beta.md | 4.2/5 |  | Remote | Agencia',
  ]),
);
assert.equal(parsed.rows.length, 2);
assert.equal(parsed.rows[0].company, 'Acmé');
assert.equal(parsed.rows[0].location, 'Tel Aviv');
assert.equal(parsed.rows[1].via, 'Agencia');
assert.equal(parsed.rows[1].notes, '');
assert.deepEqual(extractTrackerReportNumbers(parsed.rows[0].report), [7]);
assert.deepEqual(extractTrackerReportNumbers(parsed.rows[1].report), [8]);
assert.deepEqual(
  extractTrackerReportNumbers('[42](https://example.com/reports/042-role.md)'),
  [],
);
assert.deepEqual(
  extractTrackerReportNumbers('[42](reports/042-role.md "title")'),
  [42],
);

assert.equal(cell('A|B\nC\u0000'), 'A / B C');
assert.equal(cell('  space   safe  '), 'space safe');

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-tracker-core-'));
const statesPath = join(sandbox, 'templates', 'states.yml');
write(
  statesPath,
  [
    'states:',
    '  - id: evaluated',
    '    label: Evaluated',
    '    aliases: [evaluada]',
    '  - id: applied',
    '    label: Applied',
    '    aliases: [aplicado]',
    '  - id: interview',
    '    label: Interview',
    '    aliases: [entrevista]',
    '  - id: hired',
    '    label: Hired',
    '    aliases: [contratado]',
    '',
  ].join('\n'),
);
const states = loadCanonicalStates(statesPath);
assert.equal(resolveCanonicalState('CONTRATADO', states), 'Hired');
assert.equal(resolveCanonicalState('unknown', states), null);

const trackerPath = join(sandbox, 'data', 'applications.md');
write(
  trackerPath,
  tracker([
    '| Acme | first | Evaluated | 1 | Platform Engineer | 2026-07-25 | [001](reports/001-acme.md) | 4.6/5 | ✅ | Remote | Direct |',
    '| Acme | second | Applied | 2 | Data Engineer | 2026-07-26 | [002](reports/002-acme.md) | 4.2/5 |  | Berlin | Agency |',
    '| Beta | third | Applied | 2 | Security Engineer | 2026-07-26 | [003](reports/003-beta.md) | 4.1/5 |  | Paris | Direct |',
  ]),
);

const originalTrackerEnv = process.env.JOBHUNT_TRACKER;
process.env.JOBHUNT_TRACKER = trackerPath;
try {
  const dryRun = await setTrackerStatus({
    root: sandbox,
    selector: 'report:1',
    state: 'applied',
    note: 'form submitted',
    dryRun: true,
  });
  assert.equal(dryRun.changed, true);
  assert.equal(
    readFileSync(trackerPath, 'utf8').includes('form submitted'),
    false,
  );

  await assert.rejects(
    setTrackerStatus({
      root: sandbox,
      selector: 'Acme',
      state: 'Interview',
    }),
    (error) => error.code === 'AMBIGUOUS',
  );
  await assert.rejects(
    setTrackerStatus({
      root: sandbox,
      selector: '#2',
      state: 'Interview',
    }),
    (error) => error.code === 'AMBIGUOUS',
  );

  const firstChange = await setTrackerStatus({
    root: sandbox,
    selector: 'Acme',
    role: 'Data Engineer',
    state: 'Interview',
    note: 'Recruiter screen',
    source: 'test',
  });
  assert.equal(firstChange.status, 'Interview');
  assert.equal(firstChange.row.num, 2);
  assert.equal(firstChange.followupSeedCandidate, false);
  let updated = parseTracker(readFileSync(trackerPath, 'utf8'));
  assert.equal(updated.rows[1].status, 'Interview');
  assert.equal(updated.rows[1].notes, 'second; Recruiter screen');

  const logPath = join(sandbox, 'data', 'status-log.tsv');
  const firstLog = readFileSync(logPath, 'utf8');
  assert.equal(firstLog.trim().split('\n').length, 2);
  assert.match(firstLog, /\tApplied\tInterview\ttest\tRecruiter screen$/m);

  const noChange = await setTrackerStatus({
    root: sandbox,
    selector: 'report:2',
    state: 'Interview',
    note: 'recruiter screen',
  });
  assert.equal(noChange.changed, false);
  assert.equal(readFileSync(logPath, 'utf8'), firstLog);

  await Promise.all([
    setTrackerStatus({
      root: sandbox,
      selector: '#1',
      state: 'Applied',
      source: 'concurrency-a',
    }),
    setTrackerStatus({
      root: sandbox,
      selector: 'report:3',
      state: 'Interview',
      source: 'concurrency-b',
    }),
  ]);
  updated = parseTracker(readFileSync(trackerPath, 'utf8'));
  assert.equal(updated.rows.find((row) => row.num === 1).status, 'Applied');
  assert.equal(
    updated.rows.find((row) => row.company === 'Beta').status,
    'Interview',
  );
  assert.equal(readFileSync(logPath, 'utf8').trim().split('\n').length, 4);

  const recoveryEvent = 'recover-event';
  const currentContent = readFileSync(trackerPath, 'utf8');
  write(
    join(sandbox, 'data', `.status-transition-${recoveryEvent}.json`),
    `${JSON.stringify({
      schemaVersion: 1,
      trackerBasename: 'applications.md',
      statusLogBasename: 'status-log.tsv',
      beforeSha256: sha256('old tracker state'),
      afterSha256: sha256(currentContent),
      logLine: `${recoveryEvent}\t2026-07-26T00:00:00.000Z\t1\t1\tAcme\tPlatform Engineer\tEvaluated\tApplied\trecovery\t\n`,
    })}\n`,
  );
  await setTrackerStatus({
    root: sandbox,
    selector: '#1',
    state: 'Hired',
    source: 'recovery-trigger',
  });
  assert.match(readFileSync(logPath, 'utf8'), /^recover-event\t/m);
  assert.equal(
    existsSync(
      join(sandbox, 'data', `.status-transition-${recoveryEvent}.json`),
    ),
    false,
  );

  const beforeFailure = readFileSync(trackerPath, 'utf8');
  rmSync(logPath);
  mkdirSync(logPath);
  await assert.rejects(
    setTrackerStatus({
      root: sandbox,
      selector: 'report:2',
      state: 'Hired',
      source: 'forced-log-failure',
    }),
  );
  assert.equal(readFileSync(trackerPath, 'utf8'), beforeFailure);
  rmSync(logPath, { recursive: true, force: true });
} finally {
  if (originalTrackerEnv === undefined) delete process.env.JOBHUNT_TRACKER;
  else process.env.JOBHUNT_TRACKER = originalTrackerEnv;
}

const atomicPath = join(sandbox, 'atomic.txt');
writeFileAtomic(atomicPath, 'first');
writeFileAtomic(atomicPath, 'second');
assert.equal(readFileSync(atomicPath, 'utf8'), 'second');
assert.equal(
  existsSync(dirname(atomicPath)) &&
    !readFileSync(atomicPath, 'utf8').includes('first'),
  true,
);

const lockPath = trackerLockDirFor(trackerPath);
const firstLock = await acquireTrackerLock(lockPath, {
  tracker: trackerPath,
  timeoutMs: 100,
  retryMs: 10,
});
await assert.rejects(
  acquireTrackerLock(lockPath, {
    tracker: trackerPath,
    timeoutMs: 30,
    retryMs: 5,
  }),
  (error) => error.code === 'LOCK_TIMEOUT',
);
firstLock.release();

mkdirSync(lockPath);
write(
  join(lockPath, 'owner.json'),
  `${JSON.stringify({ pid: 2_147_483_647, token: 'dead-owner' })}\n`,
);
const recovered = await acquireTrackerLock(lockPath, {
  tracker: trackerPath,
  timeoutMs: 100,
  retryMs: 5,
});
assert.equal(recovered.staleRecovered, true);
recovered.release();

rmSync(sandbox, { recursive: true, force: true });
console.log('tracker parser, lock, transition, and audit-log tests pass');

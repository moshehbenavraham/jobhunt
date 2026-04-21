#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function createSandbox(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function runScript(script, sandbox, args = []) {
  return spawnSync('node', [join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT,
    env: { ...process.env, JOBHUNT_ROOT: sandbox },
    encoding: 'utf8',
  });
}

{
  const sandbox = createSandbox('jobhunt-normalize-');
  writeFile(
    join(sandbox, 'data', 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
      '| 1 | 2026-04-01 | Acme | Engineer | **4.2/5** | aplicado 2026-04-01 | ✅ | [001](reports/001.md) | note |',
      '| 2 | 2026-04-02 | Beta | Engineer | 3.8/5 | DUP 002 |  | [002](reports/002.md) | |',
      '| 3 | 2026-04-03 | Gamma | Engineer | 3.5/5 | monitor |  | [003](reports/003.md) | |',
      '| 4 | 2026-04-04 | Delta | Engineer | 3.0/5 | mystery |  | [004](reports/004.md) | |',
      '| 5 | 2026-04-05 | Echo | Engineer | 2.9/5 | — |  | [005](reports/005.md) | |',
      '| 6 | 2026-04-06 | Zeta | Engineer | 2.5/5 | repost #7 |  | [006](reports/006.md) | |',
      '',
    ].join('\n'),
  );

  const dryRun = runScript('normalize-statuses.mjs', sandbox, ['--dry-run']);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /aplicado 2026-04-01/);
  assert.match(dryRun.stdout, /unknown statuses/i);
  assert.equal(existsSync(join(sandbox, 'data', 'applications.md.bak')), false);

  const live = runScript('normalize-statuses.mjs', sandbox);
  assert.equal(live.status, 0, live.stderr);
  assert.equal(existsSync(join(sandbox, 'data', 'applications.md.bak')), true);
  const normalized = readFileSync(
    join(sandbox, 'data', 'applications.md'),
    'utf8',
  );
  assert.match(
    normalized,
    /\| 1 \| 2026-04-01 \| Acme \| Engineer \| 4.2\/5 \| Applied \|/,
  );
  assert.match(
    normalized,
    /\| 2 \| 2026-04-02 \| Beta \| Engineer \| 3.8\/5 \| Discarded \|/,
  );
  assert.match(normalized, /DUP 002/);
  assert.match(
    normalized,
    /\| 3 \| 2026-04-03 \| Gamma \| Engineer \| 3.5\/5 \| SKIP \|/,
  );
  assert.match(
    normalized,
    /\| 5 \| 2026-04-05 \| Echo \| Engineer \| 2.9\/5 \| Discarded \|/,
  );
  assert.match(
    normalized,
    /\| 6 \| 2026-04-06 \| Zeta \| Engineer \| 2.5\/5 \| Discarded \|/,
  );

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = createSandbox('jobhunt-dedup-');
  writeFile(
    join(sandbox, 'data', 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
      '| 1 | 2026-04-01 | Acme, Inc. | Senior Data Platform Systems Engineer | 4.5/5 | Evaluated | ✅ | [001](reports/001.md) | first |',
      '| 2 | 2026-04-02 | Acme Inc | Platform Systems Engineer Remote | 4.1/5 | Interview |  | [002](reports/002.md) | second |',
      '| 3 | 2026-04-03 | Beta | Data Engineer | 3.0/5 | Applied |  | [003](reports/003.md) | keep |',
      '',
    ].join('\n'),
  );

  const dryRun = runScript('dedup-tracker.mjs', sandbox, ['--dry-run']);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /duplicates removed/);
  assert.equal(existsSync(join(sandbox, 'data', 'applications.md.bak')), false);

  const live = runScript('dedup-tracker.mjs', sandbox);
  assert.equal(live.status, 0, live.stderr);
  assert.equal(existsSync(join(sandbox, 'data', 'applications.md.bak')), true);
  const deduped = readFileSync(
    join(sandbox, 'data', 'applications.md'),
    'utf8',
  );
  assert.doesNotMatch(deduped, /\| 2 \| 2026-04-02 \|/);
  assert.match(
    deduped,
    /\| 1 \| 2026-04-01 \| Acme, Inc\. \| Senior Data Platform Systems Engineer \| 4.5\/5 \| Interview \|/,
  );

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = createSandbox('jobhunt-verify-bad-');
  writeFile(
    join(sandbox, 'data', 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
      '| 1 | 2026-04-01 | Acme | Engineer | **4.5/5** | **Aplicado 2026-04-01** | ✅ | [001](reports/missing.md) | note |',
      '| 2 | 2026-04-02 | Acme | Engineer | invalid | WeirdStatus |  | [002](reports/002.md) | note |',
      '',
    ].join('\n'),
  );
  writeFile(
    join(sandbox, 'batch', 'tracker-additions', '001-acme.tsv'),
    '1\t2026-04-03\tAcme\tEngineer\tApplied\t4.5/5\t✅\t[003](reports/003.md)\n',
  );
  writeFile(join(sandbox, 'reports', '002.md'), '# ok\n');

  const bad = runScript('verify-pipeline.mjs', sandbox);
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stdout, /Non-canonical status/);
  assert.match(bad.stdout, /Status contains markdown bold/);
  assert.match(bad.stdout, /Status contains date/);
  assert.match(bad.stdout, /Possible duplicates/);
  assert.match(bad.stdout, /Report not found/);
  assert.match(bad.stdout, /Invalid score format/);
  assert.match(bad.stdout, /pending TSVs/);

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = createSandbox('jobhunt-verify-clean-');
  writeFile(
    join(sandbox, 'data', 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
      '| 1 | 2026-04-01 | Acme | Engineer | 4.5/5 | Applied | ✅ | [001](reports/001.md) | note |',
      '',
    ].join('\n'),
  );
  writeFile(join(sandbox, 'reports', '001.md'), '# ok\n');

  const clean = runScript('verify-pipeline.mjs', sandbox);
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /Pipeline is clean|Pipeline OK with warnings/);

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = createSandbox('jobhunt-merge-');
  writeFile(
    join(sandbox, 'data', 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
      '| 1 | 2026-04-01 | Acme | Platform Engineer | 4.0/5 | Applied | ✅ | [001](reports/001.md) | existing |',
      '',
    ].join('\n'),
  );
  writeFile(
    join(sandbox, 'batch', 'tracker-additions', '001-new.tsv'),
    '2\t2026-04-02\tBeta\tData Engineer\tApplied\t4.1/5\t✅\t[002](reports/002.md)\tnew add\n',
  );
  writeFile(
    join(sandbox, 'batch', 'tracker-additions', '002-update.tsv'),
    '1\t2026-04-03\tAcme\tPlatform Engineer\tApplied\t4.7/5\t✅\t[001](reports/001.md)\thigher score\n',
  );
  writeFile(
    join(sandbox, 'batch', 'tracker-additions', '003-skip.tsv'),
    '1\t2026-04-04\tAcme\tPlatform Engineer\tApplied\t3.1/5\t✅\t[001](reports/001.md)\tlower score\n',
  );
  writeFile(
    join(sandbox, 'batch', 'tracker-additions', '004-pipe.tsv'),
    '| 4 | 2026-04-05 | Gamma | Backend Engineer | 4.3/5 | Evaluada | ✅ | [004](reports/004.md) | pipe add |',
  );
  writeFile(
    join(sandbox, 'batch', 'tracker-additions', '005-swapped.tsv'),
    '5\t2026-04-06\tDelta\tML Engineer\t4.2/5\tEntrevista\t✅\t[005](reports/005.md)\tswapped order\n',
  );
  writeFile(
    join(sandbox, 'batch', 'tracker-additions', '006-bad.tsv'),
    'broken',
  );
  writeFile(
    join(sandbox, 'scripts', 'verify-pipeline.mjs'),
    `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(join(sandbox, 'verify-ran.txt'))}, 'yes'); process.exit(0);\n`,
  );

  const dryRun = runScript('merge-tracker.mjs', sandbox, ['--dry-run']);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /Found 6 pending additions/);
  assert.match(dryRun.stdout, /Add #2: Beta/);
  assert.match(dryRun.stdout, /Update: #1 Acme/);
  assert.equal(
    existsSync(join(sandbox, 'batch', 'tracker-additions', 'merged')),
    false,
  );

  const live = runScript('merge-tracker.mjs', sandbox, ['--verify']);
  assert.equal(live.status, 0, live.stderr);
  assert.equal(existsSync(join(sandbox, 'verify-ran.txt')), true);
  const mergedTracker = readFileSync(
    join(sandbox, 'data', 'applications.md'),
    'utf8',
  );
  assert.match(
    mergedTracker,
    /\| 2 \| 2026-04-02 \| Beta \| Data Engineer \| 4.1\/5 \| Applied \|/,
  );
  assert.match(
    mergedTracker,
    /\| 4 \| 2026-04-05 \| Gamma \| Backend Engineer \| 4.3\/5 \| Evaluated \|/,
  );
  assert.match(
    mergedTracker,
    /\| 5 \| 2026-04-06 \| Delta \| ML Engineer \| 4.2\/5 \| Interview \|/,
  );
  assert.match(mergedTracker, /Re-eval 2026-04-03 \(4→4.7\)\. higher score/);
  assert.equal(
    existsSync(
      join(sandbox, 'batch', 'tracker-additions', 'merged', '001-new.tsv'),
    ),
    true,
  );
  assert.equal(
    existsSync(
      join(sandbox, 'batch', 'tracker-additions', 'merged', '006-bad.tsv'),
    ),
    true,
  );

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const failing = createSandbox('jobhunt-doctor-fail-');
  const failed = runScript('doctor.mjs', failing);
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /Dependencies not installed/);
  assert.match(failed.stdout, /profile\/cv\.md not found/);
  assert.match(failed.stdout, /config\/portals\.yml not found/);

  const passing = createSandbox('jobhunt-doctor-pass-');
  mkdirSync(join(passing, 'node_modules'), { recursive: true });
  writeFile(join(passing, 'profile', 'cv.md'), '# CV\n');
  writeFile(join(passing, 'config', 'profile.yml'), 'name: Test User\n');
  writeFile(join(passing, 'config', 'portals.yml'), 'tracked_companies: []\n');
  writeFile(join(passing, 'fonts', 'test-font.ttf'), 'font');

  const passed = runScript('doctor.mjs', passing);
  assert.equal(passed.status, 0, passed.stdout + passed.stderr);
  assert.match(passed.stdout, /All checks passed/);
  assert.match(passed.stdout, /OpenAI account auth not set up yet/);
  assert.match(passed.stdout, /npm run auth:openai -- login/);
  assert.equal(existsSync(join(passing, 'data')), true);
  assert.equal(existsSync(join(passing, 'output')), true);
  assert.equal(existsSync(join(passing, 'reports')), true);

  writeFile(
    join(passing, 'data', 'openai-account-auth.json'),
    JSON.stringify(
      {
        version: 1,
        provider: 'openai-codex',
        updatedAt: new Date().toISOString(),
        credentials: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 60_000,
          accountId: 'acct-doctor',
        },
      },
      null,
      2,
    ),
  );

  const passedWithAuth = runScript('doctor.mjs', passing);
  assert.equal(
    passedWithAuth.status,
    0,
    passedWithAuth.stdout + passedWithAuth.stderr,
  );
  assert.match(
    passedWithAuth.stdout,
    /OpenAI account auth ready \(acct-doctor\)/,
  );

  rmSync(failing, { recursive: true, force: true });
  rmSync(passing, { recursive: true, force: true });
}

{
  const sandbox = createSandbox('jobhunt-doctor-preinstall-');
  mkdirSync(join(sandbox, 'scripts', 'lib', 'openai-account-auth'), {
    recursive: true,
  });
  writeFile(
    join(sandbox, 'scripts', 'doctor.mjs'),
    readFileSync(join(ROOT, 'scripts', 'doctor.mjs'), 'utf8'),
  );
  for (const authLibFile of ['common.mjs', 'storage.mjs']) {
    writeFile(
      join(sandbox, 'scripts', 'lib', 'openai-account-auth', authLibFile),
      readFileSync(
        join(ROOT, 'scripts', 'lib', 'openai-account-auth', authLibFile),
        'utf8',
      ),
    );
  }

  const preinstall = spawnSync(
    'node',
    [join(sandbox, 'scripts', 'doctor.mjs')],
    {
      cwd: sandbox,
      encoding: 'utf8',
    },
  );

  assert.equal(preinstall.status, 1, preinstall.stdout + preinstall.stderr);
  assert.match(preinstall.stdout, /Dependencies not installed/);
  assert.doesNotMatch(
    preinstall.stdout + preinstall.stderr,
    /@openai\/agents-core/,
  );

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = createSandbox('jobhunt-scan-state-archive-pipeline-');
  writeFile(
    join(sandbox, 'data', 'pipeline.md'),
    [
      '# Pipeline',
      '',
      '## Shortlist',
      '',
      'stale shortlist',
      '',
      '## Pending',
      '',
      '- [ ] https://jobs.example.com/acme | Acme | Forward Deployed Engineer',
      '',
      '## Processed',
      '',
    ].join('\n'),
  );
  writeFile(
    join(sandbox, 'data', 'scan-history.tsv'),
    [
      'url\tfirst_seen\tportal\ttitle\tcompany\tstatus',
      'https://jobs.example.com/acme\t2026-04-01\tgreenhouse-api\tForward Deployed Engineer\tAcme\tadded',
      '',
    ].join('\n'),
  );

  const archived = runScript('manage-scan-state.mjs', sandbox, [
    '--archive-pipeline',
  ]);
  assert.equal(archived.status, 0, archived.stdout + archived.stderr);
  assert.match(archived.stdout, /Archived data\/pipeline\.md ->/);
  assert.match(archived.stdout, /Reset data\/pipeline\.md ->/);
  const refreshedPipeline = readFileSync(
    join(sandbox, 'data', 'pipeline.md'),
    'utf8',
  );
  assert.match(refreshedPipeline, /## Shortlist/);
  assert.doesNotMatch(refreshedPipeline, /jobs\.example\.com\/acme/);
  assert.match(
    readFileSync(join(sandbox, 'data', 'scan-history.tsv'), 'utf8'),
    /https:\/\/jobs\.example\.com\/acme/,
  );
  assert.equal(existsSync(join(sandbox, 'tmp', 'scan-state')), true);

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = createSandbox('jobhunt-scan-state-archive-all-');
  writeFile(
    join(sandbox, 'data', 'pipeline.md'),
    '# Pipeline\n\n## Pending\n\n- [ ] https://jobs.example.com/acme\n',
  );
  writeFile(
    join(sandbox, 'data', 'scan-history.tsv'),
    [
      'url\tfirst_seen\tportal\ttitle\tcompany\tstatus',
      'https://jobs.example.com/acme\t2026-04-01\tgreenhouse-api\tRole\tAcme\tadded',
      '',
    ].join('\n'),
  );

  const archived = runScript('manage-scan-state.mjs', sandbox, [
    '--archive-all',
  ]);
  assert.equal(archived.status, 0, archived.stdout + archived.stderr);
  assert.match(archived.stdout, /Archived data\/pipeline\.md ->/);
  assert.match(archived.stdout, /Archived data\/scan-history\.tsv ->/);
  assert.match(
    readFileSync(join(sandbox, 'data', 'pipeline.md'), 'utf8'),
    /Run `npm run scan` to refresh the shortlist\./,
  );
  assert.equal(
    readFileSync(join(sandbox, 'data', 'scan-history.tsv'), 'utf8'),
    'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n',
  );
  assert.equal(existsSync(join(sandbox, 'tmp', 'scan-state')), true);

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = createSandbox('jobhunt-scan-state-reset-');
  writeFile(
    join(sandbox, 'data', 'pipeline.md'),
    '# Pipeline\n\n## Pending\n\n- [ ] https://jobs.example.com/acme\n',
  );
  writeFile(
    join(sandbox, 'data', 'scan-history.tsv'),
    [
      'url\tfirst_seen\tportal\ttitle\tcompany\tstatus',
      'https://jobs.example.com/acme\t2026-04-01\tgreenhouse-api\tRole\tAcme\tadded',
      '',
    ].join('\n'),
  );

  const refused = runScript('manage-scan-state.mjs', sandbox, [
    '--reset-history',
  ]);
  assert.equal(refused.status, 1);
  assert.match(
    refused.stderr,
    /Refusing to reset data\/scan-history\.tsv without --yes\./,
  );
  assert.match(
    readFileSync(join(sandbox, 'data', 'scan-history.tsv'), 'utf8'),
    /https:\/\/jobs\.example\.com\/acme/,
  );

  const resetPipeline = runScript('manage-scan-state.mjs', sandbox, [
    '--reset-pipeline',
  ]);
  assert.equal(
    resetPipeline.status,
    0,
    resetPipeline.stdout + resetPipeline.stderr,
  );
  assert.match(resetPipeline.stdout, /Reset data\/pipeline\.md ->/);
  assert.doesNotMatch(
    readFileSync(join(sandbox, 'data', 'pipeline.md'), 'utf8'),
    /jobs\.example\.com\/acme/,
  );
  assert.equal(existsSync(join(sandbox, 'tmp', 'scan-state')), false);

  const resetHistory = runScript('manage-scan-state.mjs', sandbox, [
    '--reset-history',
    '--yes',
  ]);
  assert.equal(
    resetHistory.status,
    0,
    resetHistory.stdout + resetHistory.stderr,
  );
  assert.match(resetHistory.stdout, /Reset data\/scan-history\.tsv ->/);
  assert.equal(
    readFileSync(join(sandbox, 'data', 'scan-history.tsv'), 'utf8'),
    'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n',
  );

  rmSync(sandbox, { recursive: true, force: true });
}

console.log('maintenance script regressions pass');

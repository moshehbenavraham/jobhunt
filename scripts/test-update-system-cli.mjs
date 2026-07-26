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

function runUpdate(sandbox, args = []) {
  return spawnSync(
    'node',
    [join(ROOT, 'scripts', 'update-system.mjs'), ...args],
    {
      cwd: ROOT,
      env: { ...process.env, JOBHUNT_ROOT: sandbox },
      encoding: 'utf8',
    },
  );
}

function git(sandbox, ...args) {
  const result = spawnSync('git', args, { cwd: sandbox, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

function gitOutput(sandbox, ...args) {
  const result = spawnSync('git', args, { cwd: sandbox, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function initRepo(path) {
  git(path, 'init', '-b', 'main');
  git(path, 'config', 'user.name', 'Test User');
  git(path, 'config', 'user.email', 'test@example.com');
}

{
  const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-update-dismiss-'));
  writeFile(join(sandbox, 'VERSION'), '1.0.0\n');

  const dismiss = runUpdate(sandbox, ['dismiss']);
  assert.equal(dismiss.status, 0, dismiss.stderr);
  assert.equal(existsSync(join(sandbox, '.update-dismissed')), true);

  const checkDismissed = runUpdate(sandbox, ['check']);
  assert.equal(checkDismissed.status, 0, checkDismissed.stderr);
  assert.match(checkDismissed.stdout, /"status":"dismissed"/);

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = mkdtempSync(
    join(tmpdir(), 'jobhunt-update-invalid-version-'),
  );
  writeFile(join(sandbox, 'VERSION'), 'bad-version\n');

  const invalidVersion = runUpdate(sandbox, ['check']);
  assert.equal(invalidVersion.status, 1);
  assert.match(invalidVersion.stderr, /Invalid semver/);

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-update-git-'));
  writeFile(join(sandbox, 'VERSION'), '1.0.0\n');
  writeFile(join(sandbox, 'README.md'), 'initial\n');
  writeFile(
    join(sandbox, 'package.json'),
    '{"name":"jobhunt","version":"1.0.0"}\n',
  );
  git(sandbox, 'init');
  git(sandbox, 'config', 'user.name', 'Test User');
  git(sandbox, 'config', 'user.email', 'test@example.com');
  git(sandbox, 'add', '.');
  git(sandbox, 'commit', '-m', 'init');

  writeFile(join(sandbox, '.update-lock'), 'busy');
  const lockedApply = runUpdate(sandbox, ['apply']);
  assert.equal(lockedApply.status, 1);
  assert.match(lockedApply.stderr, /Update already in progress/);

  const rollback = runUpdate(sandbox, ['rollback']);
  assert.equal(rollback.status, 1);
  assert.match(rollback.stderr, /No backup branches found/);

  const invalidCommand = runUpdate(sandbox, ['wat']);
  assert.equal(invalidCommand.status, 1);
  assert.match(
    invalidCommand.stdout,
    /Usage: node scripts\/update-system\.mjs/,
  );

  rmSync(sandbox, { recursive: true, force: true });
}

{
  const origin = mkdtempSync(join(tmpdir(), 'jobhunt-update-origin-'));
  initRepo(origin);
  writeFile(join(origin, 'VERSION'), '1.0.1\n');
  writeFile(join(origin, '.gitignore'), 'portals.yml\nconfig/portals.yml\n');
  writeFile(
    join(origin, 'package.json'),
    '{"name":"jobhunt","version":"1.0.1"}\n',
  );
  writeFile(
    join(origin, 'config', 'portals.example.yml'),
    '# new portals template\n',
  );
  writeFile(
    join(origin, 'scripts', 'openai-account-auth.mjs'),
    '#!/usr/bin/env node\nconsole.log("auth");\n',
  );
  writeFile(
    join(origin, 'scripts', 'openai-codex-smoke.mjs'),
    '#!/usr/bin/env node\nconsole.log("codex");\n',
  );
  writeFile(
    join(origin, 'scripts', 'openai-agents-codex-smoke.mjs'),
    '#!/usr/bin/env node\nconsole.log("agents");\n',
  );
  writeFile(
    join(origin, 'scripts', 'lib', 'openai-account-auth', 'common.mjs'),
    'export const marker = "auth-lib";\n',
  );
  writeFile(
    join(origin, 'scripts', 'update-system.mjs'),
    "import './update-helper.mjs';\n",
  );
  writeFile(
    join(origin, 'scripts', 'update-helper.mjs'),
    'export const updateHelper = true;\n',
  );
  writeFile(
    join(origin, 'scripts', 'new-runtime', 'feature.mjs'),
    'export const feature = true;\n',
  );
  writeFile(
    join(origin, 'scripts', 'update-manifest.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        systemPaths: ['scripts/'],
        requiredPaths: [
          'scripts/update-system.mjs',
          'scripts/update-helper.mjs',
          'scripts/new-runtime/feature.mjs',
        ],
        migrations: [
          {
            operation: 'remove-system-path',
            path: 'templates/legacy-system.txt',
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  git(origin, 'add', '.');
  git(origin, 'commit', '-m', 'origin init');

  const decoyUpstream = mkdtempSync(
    join(tmpdir(), 'jobhunt-update-decoy-upstream-'),
  );
  initRepo(decoyUpstream);
  writeFile(join(decoyUpstream, 'VERSION'), '9.9.9\n');
  writeFile(
    join(decoyUpstream, 'package.json'),
    '{"name":"career-ops","version":"9.9.9"}\n',
  );
  git(decoyUpstream, 'add', '.');
  git(decoyUpstream, 'commit', '-m', 'decoy upstream init');
  git(decoyUpstream, 'tag', 'career-ops-v9.9.9');

  const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-update-apply-'));
  initRepo(sandbox);
  writeFile(join(sandbox, 'VERSION'), '1.0.0\n');
  writeFile(
    join(sandbox, 'package.json'),
    '{"name":"jobhunt","version":"1.0.0"}\n',
  );
  writeFile(
    join(sandbox, 'templates', 'portals.example.yml'),
    '# old template\n',
  );
  writeFile(
    join(sandbox, 'templates', 'legacy-system.txt'),
    'restore me on rollback\n',
  );
  writeFile(join(sandbox, 'portals.yml'), 'tracked_companies: []\n');
  git(
    sandbox,
    'add',
    'VERSION',
    'package.json',
    'templates/portals.example.yml',
    'templates/legacy-system.txt',
  );
  git(sandbox, 'commit', '-m', 'local init');
  git(sandbox, 'remote', 'add', 'origin', origin);
  git(sandbox, 'remote', 'add', 'upstream', decoyUpstream);

  const apply = runUpdate(sandbox, ['apply']);
  assert.equal(apply.status, 0, apply.stdout + apply.stderr);
  assert.match(apply.stdout, /Update complete: v1\.0\.0 -> v1\.0\.1/);
  assert.doesNotMatch(apply.stdout, /9\.9\.9/);
  assert.equal(
    existsSync(join(sandbox, 'templates', 'portals.example.yml')),
    false,
  );
  assert.equal(
    existsSync(join(sandbox, 'config', 'portals.example.yml')),
    true,
  );
  assert.equal(existsSync(join(sandbox, 'scripts', 'update-helper.mjs')), true);
  assert.equal(
    existsSync(join(sandbox, 'scripts', 'new-runtime', 'feature.mjs')),
    true,
  );
  assert.equal(
    existsSync(join(sandbox, 'templates', 'legacy-system.txt')),
    false,
  );
  assert.equal(
    existsSync(join(sandbox, 'scripts', 'openai-account-auth.mjs')),
    true,
  );
  assert.equal(
    existsSync(join(sandbox, 'scripts', 'openai-codex-smoke.mjs')),
    true,
  );
  assert.equal(
    existsSync(join(sandbox, 'scripts', 'openai-agents-codex-smoke.mjs')),
    true,
  );
  assert.equal(
    existsSync(
      join(sandbox, 'scripts', 'lib', 'openai-account-auth', 'common.mjs'),
    ),
    true,
  );
  assert.equal(existsSync(join(sandbox, 'portals.yml')), true);
  assert.match(
    gitOutput(sandbox, 'status', '--short', '--ignored', '--', 'portals.yml'),
    /!! portals\.yml/,
  );

  const rollbackApplied = runUpdate(sandbox, ['rollback']);
  assert.equal(
    rollbackApplied.status,
    0,
    rollbackApplied.stdout + rollbackApplied.stderr,
  );
  assert.equal(
    existsSync(join(sandbox, 'scripts', 'new-runtime', 'feature.mjs')),
    false,
  );
  assert.equal(
    existsSync(join(sandbox, 'scripts', 'update-helper.mjs')),
    false,
  );
  assert.equal(
    existsSync(join(sandbox, 'templates', 'legacy-system.txt')),
    true,
  );
  assert.equal(existsSync(join(sandbox, 'portals.yml')), true);

  writeFile(join(origin, 'VERSION'), '1.0.2\n');
  writeFile(
    join(origin, 'scripts', 'update-manifest.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        systemPaths: ['scripts/'],
        requiredPaths: ['scripts/does-not-exist.mjs'],
        migrations: [],
      },
      null,
      2,
    )}\n`,
  );
  git(origin, 'add', '.');
  git(origin, 'commit', '-m', 'broken target manifest');

  const failureSandbox = mkdtempSync(
    join(tmpdir(), 'jobhunt-update-manifest-failure-'),
  );
  initRepo(failureSandbox);
  writeFile(join(failureSandbox, 'VERSION'), '1.0.1\n');
  writeFile(
    join(failureSandbox, 'package.json'),
    '{"name":"jobhunt","version":"1.0.1"}\n',
  );
  git(failureSandbox, 'add', '.');
  git(failureSandbox, 'commit', '-m', 'local init');
  git(failureSandbox, 'remote', 'add', 'origin', origin);
  const failedApply = runUpdate(failureSandbox, ['apply']);
  assert.equal(failedApply.status, 1);
  assert.match(
    failedApply.stdout + failedApply.stderr,
    /Target manifest requires missing ref path/,
  );
  assert.equal(
    readFileSync(join(failureSandbox, 'VERSION'), 'utf8'),
    '1.0.1\n',
  );
  assert.equal(existsSync(join(failureSandbox, '.update-lock')), false);

  rmSync(origin, { recursive: true, force: true });
  rmSync(decoyUpstream, { recursive: true, force: true });
  rmSync(sandbox, { recursive: true, force: true });
  rmSync(failureSandbox, { recursive: true, force: true });
}

console.log('update-system regression tests pass');

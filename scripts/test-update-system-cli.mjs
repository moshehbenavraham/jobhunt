#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
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

console.log('update-system regression tests pass');

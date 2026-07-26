#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertContainedPath,
  ensureContainedDirectory,
  pathIsInside,
  PathPolicyError,
  safeFilename,
} from './path-policy.mjs';

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-path-policy-'));
try {
  const output = join(sandbox, 'output');
  mkdirSync(output);
  writeFileSync(join(output, 'existing.txt'), 'ok');

  assert.equal(
    assertContainedPath(output, 'existing.txt', { mustExist: true }),
    join(output, 'existing.txt'),
  );
  assert.equal(
    ensureContainedDirectory(output, 'nested/deeper'),
    join(output, 'nested', 'deeper'),
  );
  assert.equal(pathIsInside(output, join(output, 'nested')), true);
  assert.equal(pathIsInside(output, output), false);

  assert.throws(
    () => assertContainedPath(output, '../secret.txt'),
    PathPolicyError,
  );
  assert.throws(() => assertContainedPath(output, output), /escapes/);
  assert.throws(
    () =>
      assertContainedPath(output, 'missing.txt', {
        mustExist: true,
      }),
    /does not exist/,
  );

  const outside = join(sandbox, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(output, 'escape'));
  assert.throws(
    () => assertContainedPath(output, 'escape/payload.txt'),
    /resolves outside|traverses a symlink/,
  );

  const insideTarget = join(output, 'nested');
  symlinkSync(insideTarget, join(output, 'inside-link'));
  assert.throws(
    () => assertContainedPath(output, 'inside-link/file.txt'),
    /traverses a symlink/,
  );

  assert.equal(
    safeFilename('../../Résumé | Final?.pdf'),
    'Résumé - Final-.pdf',
  );
  assert.equal(safeFilename('..'), 'artifact');
  assert.equal(safeFilename('a\u0000b'), 'ab');
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('path policy regression tests pass');

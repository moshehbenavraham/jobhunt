#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  atomicWriteArtifact,
  publishArtifactSet,
  resolveArtifactPath,
} from './artifact-policy.mjs';

const root = mkdtempSync(join(tmpdir(), 'jobhunt-artifact-policy-'));
const outside = mkdtempSync(join(tmpdir(), 'jobhunt-artifact-outside-'));
try {
  const resolved = resolveArtifactPath({
    root,
    directory: 'output',
    requested: 'nested/test.pdf',
    extensions: ['.pdf'],
  });
  assert.equal(resolved.path, join(root, 'output', 'nested', 'test.pdf'));
  await atomicWriteArtifact(resolved.path, 'first');
  assert.equal(readFileSync(resolved.path, 'utf8'), 'first');

  assert.throws(
    () =>
      resolveArtifactPath({
        root,
        directory: 'output',
        requested: '../escape.pdf',
      }),
    /escapes/,
  );
  assert.throws(
    () =>
      resolveArtifactPath({
        root,
        directory: 'output',
        requested: 'not-a-pdf.txt',
        extensions: ['.pdf'],
      }),
    /must end/,
  );

  mkdirSync(join(root, 'output', 'symlink-parent'), { recursive: true });
  symlinkSync(outside, join(root, 'output', 'escape'));
  assert.throws(
    () =>
      resolveArtifactPath({
        root,
        directory: 'output',
        requested: 'escape/file.pdf',
      }),
    /resolves outside|traverses a symlink/,
  );

  const stage = join(root, 'output', 'symlink-parent', 'staged');
  const final = join(root, 'output', 'published');
  writeFileSync(stage, 'new');
  writeFileSync(final, 'old');
  await publishArtifactSet(new Map([[stage, final]]), { force: true });
  assert.equal(readFileSync(final, 'utf8'), 'new');
  assert.equal(existsSync(stage), false);
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
}

console.log('artifact publication policy tests passed');

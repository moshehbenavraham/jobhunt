#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  convertImageToPdfArtifact,
  detectImageType,
} from './img-to-pdf.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = join(
  ROOT,
  'scripts',
  'test-fixtures',
  'pdf-snapshots',
  'a4-page-1.png',
);
const png = readFileSync(INPUT);
assert.equal(detectImageType(INPUT, png).mime, 'image/png');
assert.throws(
  () => detectImageType('renamed.jpg', png),
  /bytes do not match/,
);
assert.throws(
  () => detectImageType('active.svg', Buffer.from('<svg/>')),
  /Unsupported image type/,
);

const root = mkdtempSync(join(tmpdir(), 'jobhunt-img-pdf-'));
try {
  const result = await convertImageToPdfArtifact({
    root,
    inputPath: INPUT,
    outputPath: 'output/screenshot.pdf',
  });
  assert.equal(result.dimensions.width, 596);
  assert.equal(result.dimensions.height, 843);
  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.pageCount, 1);
  assert.equal(existsSync(result.pdfPath), true);
  assert.equal(existsSync(result.manifestPath), true);
  const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf8'));
  assert.equal(manifest.artifactType, 'image-pdf');
  assert.equal(manifest.validation.valid, true);
  assert.match(manifest.source.path, /^external:/);

  await assert.rejects(
    () =>
      convertImageToPdfArtifact({
        root,
        inputPath: INPUT,
        outputPath: '../escape.pdf',
      }),
    /escapes/,
  );
  await assert.rejects(
    () =>
      convertImageToPdfArtifact({
        root,
        inputPath: INPUT,
        outputPath: 'screenshot.pdf',
      }),
    /Refusing to overwrite/,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('image-to-PDF artifact tests passed');

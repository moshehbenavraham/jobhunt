#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const FIXTURES_DIR = join(ROOT, 'scripts', 'test-fixtures');

const { normalizeTextForATS } = await import(
  pathToFileURL(join(ROOT, 'scripts', 'generate-pdf.mjs')).href
);

const inputHtml = readFileSync(
  join(FIXTURES_DIR, 'ats-normalization-input.html'),
  'utf8',
);
const expectedHtml = readFileSync(
  join(FIXTURES_DIR, 'ats-normalization-expected.html'),
  'utf8',
);

const { html, replacements } = normalizeTextForATS(inputHtml);

assert.equal(
  html,
  expectedHtml,
  'normalized HTML should match the checked-in ATS fixture output',
);
assert.deepEqual(replacements, {
  'em-dash': 1,
  'en-dash': 1,
  'smart-double-quote': 2,
  'smart-single-quote': 1,
  ellipsis: 1,
  'zero-width': 1,
  nbsp: 1,
});

console.log('ATS normalization fixture passes');

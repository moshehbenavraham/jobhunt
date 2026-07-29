#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractCvFactClaims,
  stripCvMarkup,
  verifyCvFacts,
} from './verify-cv-facts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'verify-cv-facts.mjs');

assert.match(stripCvMarkup('<p>p&lt;0.001 and &amp; evidence</p>'), /p<0\.001/);
assert.equal(
  stripCvMarkup(
    '<script>Served 999 users.</script\t\n data-ignored><p>Served 2 users.</p>',
  ),
  'Served 2 users.',
);
assert.equal(stripCvMarkup('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
assert.deepEqual(
  extractCvFactClaims(
    'Improved 40 %, served 2,000+ users, reached $ 1.5M, and delivered 3x.',
  ).map((claim) => claim.normalized),
  ['40%', '$1.5m', '3x', '2000+ users'],
);

const passing = verifyCvFacts({
  targetText:
    '<style>.page{width:100%}</style><p>Served 2,000+ users and improved 40%.</p>',
  sourceTexts: ['Served 2,000+ users; improved conversion by 40 %.'],
});
assert.equal(passing.valid, true);

const failing = verifyCvFacts({
  targetText: 'Improved 99% with world-class proprietary expertise.',
  sourceTexts: ['Improved 40%.'],
  config: { forbidden_phrases: ['world-class proprietary'] },
});
assert.equal(failing.valid, false);
assert.deepEqual(
  failing.unsupportedClaims.map((claim) => claim.normalized),
  ['99%'],
);
assert.deepEqual(failing.forbiddenPhrases, ['world-class proprietary']);

const allowed = verifyCvFacts({
  targetText: 'Improved 99%.',
  sourceTexts: ['No metric here.'],
  config: { allow_metrics: ['99 %'] },
});
assert.equal(allowed.valid, true);

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-cv-facts-'));
try {
  mkdirSync(join(sandbox, 'profile'));
  mkdirSync(join(sandbox, 'output'));
  writeFileSync(
    join(sandbox, 'profile', 'cv.md'),
    'Improved quality by 40%.\n',
  );
  writeFileSync(join(sandbox, 'output', 'cv.md'), 'Improved quality by 99%.\n');
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT,
      'output/cv.md',
      `--root=${sandbox}`,
      '--source=profile/cv.md',
      '--json',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.unsupportedClaims[0].normalized, '99%');

  const pathEscape = spawnSync(
    process.execPath,
    [SCRIPT, '../outside.md', `--root=${sandbox}`],
    { encoding: 'utf8' },
  );
  assert.equal(pathEscape.status, 2);
  assert.match(pathEscape.stderr, /escapes/);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('CV fact verifier tests passed');

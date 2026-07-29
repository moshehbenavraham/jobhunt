#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCvLatex } from './build-cv-latex.mjs';
import { validateLatexContent } from './generate-latex.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = mkdtempSync(join(tmpdir(), 'jobhunt-cv-latex-'));
try {
  for (const directory of ['profile', 'config', 'modes', 'templates']) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  for (const path of [
    'profile/cv.example.md',
    'config/profile.example.yml',
    'modes/_profile.template.md',
    'templates/cv-template.tex',
  ]) {
    cpSync(join(ROOT, path), join(root, path));
  }
  const fixturePath = join(
    ROOT,
    'scripts',
    'test-fixtures',
    'cv-build-letter.json',
  );
  const result = await buildCvLatex({
    root,
    buildPath: fixturePath,
    outputPath: 'output/example.tex',
  });
  assert.equal(existsSync(result.texPath), true);
  assert.equal(existsSync(result.buildPath), true);
  assert.equal(existsSync(result.manifestPath), true);
  const tex = readFileSync(result.texPath, 'utf8');
  assert.equal(validateLatexContent(tex).valid, true);
  assert.doesNotMatch(tex, /\{\{\{?[A-Z0-9_]+\}?\}\}/);
  assert.match(tex, /\\section\{Professional Summary\}/);
  assert.match(tex, /\\resumeItem\{Built end-to-end ML pipelines/);
  assert.doesNotMatch(tex, /mailto:mailto:/);

  const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf8'));
  assert.equal(manifest.artifactType, 'cv-latex');
  assert.equal(manifest.validation.valid, true);

  const optionalFixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  optionalFixture.projects = [];
  optionalFixture.education = [];
  const optionalPath = join(root, 'optional.json');
  writeFileSync(optionalPath, JSON.stringify(optionalFixture));
  const optional = await buildCvLatex({
    root,
    buildPath: optionalPath,
    outputPath: 'optional.tex',
  });
  const optionalTex = readFileSync(optional.texPath, 'utf8');
  assert.match(optionalTex, /jobhunt-optional-section-projects:\s*omitted/);
  assert.equal(validateLatexContent(optionalTex).valid, true);

  await assert.rejects(
    () =>
      buildCvLatex({
        root,
        buildPath: fixturePath,
        outputPath: '../escape.tex',
      }),
    /escapes/,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('structured LaTeX CV build tests passed');

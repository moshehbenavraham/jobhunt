#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCoverLetter } from './build-cover-letter.mjs';
import {
  CoverLetterBuildSchema,
  defaultCoverLetterBase,
  parseAndValidateCoverLetterBuild,
  renderCoverLetterHtml,
  renderCoverLetterMarkdown,
} from './cover-letter-core.mjs';
import { validateCoverLetterManifest } from './validate-cover-letter.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const FIXTURE = resolve(ROOT, 'scripts/test-fixtures/cover-letter-build.json');

async function copyFixtureRoot(destination) {
  for (const directory of [
    'templates',
    'profile',
    'config',
    'modes',
    'output',
  ]) {
    await mkdir(join(destination, directory), { recursive: true });
  }
  await cp(join(ROOT, 'fonts'), join(destination, 'fonts'), {
    recursive: true,
  });
  for (const [source, target] of [
    [
      'templates/cover-letter-template.html',
      'templates/cover-letter-template.html',
    ],
    ['profile/cv.example.md', 'profile/cv.md'],
    ['config/profile.example.yml', 'config/profile.yml'],
    ['modes/_profile.template.md', 'modes/_profile.md'],
    ['VERSION', 'VERSION'],
  ]) {
    await copyFile(join(ROOT, source), join(destination, target));
  }
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'jobhunt-cover-letter-'));
try {
  await copyFixtureRoot(temporaryRoot);
  const raw = JSON.parse(await readFile(FIXTURE, 'utf8'));
  const build = CoverLetterBuildSchema.parse(raw);

  assert.equal(
    defaultCoverLetterBase(build),
    'cover-letter-jane-smith-example-corporation-senior-ai-engineer-2026-07-26',
  );

  const evidence = await parseAndValidateCoverLetterBuild(raw, {
    root: temporaryRoot,
  });
  assert.equal(evidence.evidence.valid, true);
  assert.equal(evidence.evidence.verifiedParagraphCount, 4);

  const template = await readFile(
    join(temporaryRoot, 'templates/cover-letter-template.html'),
    'utf8',
  );
  const injection = structuredClone(build);
  injection.letter.greeting = '<script>{{PARAGRAPHS}}</script>';
  const rendered = renderCoverLetterHtml(injection, template);
  assert.ok(rendered.includes('&lt;script&gt;{{PARAGRAPHS}}&lt;/script&gt;'));
  assert.ok(!rendered.includes('<script>{{PARAGRAPHS}}</script>'));
  const markdown = renderCoverLetterMarkdown(build);
  assert.ok(markdown.includes('human review and editing required'));
  assert.ok(markdown.includes('40%'));

  const unsupportedMetric = structuredClone(raw);
  unsupportedMetric.letter.paragraphs[1].text =
    unsupportedMetric.letter.paragraphs[1].text.replace('40%', '41%');
  await assert.rejects(
    parseAndValidateCoverLetterBuild(unsupportedMetric, {
      root: temporaryRoot,
    }),
    /quantity "41%" not present in its evidence/,
  );

  const markdownOnly = await buildCoverLetter({
    root: temporaryRoot,
    buildPath: FIXTURE,
  });
  assert.ok((await stat(markdownOnly.markdown)).size > 500);
  assert.ok((await stat(markdownOnly.html)).size > 2_000);
  assert.equal(markdownOnly.pdf, null);
  assert.equal(markdownOnly.validation.valid, true);
  let manifest = JSON.parse(await readFile(markdownOnly.manifest, 'utf8'));
  assert.equal(manifest.artifactType, 'cover-letter');
  assert.equal(manifest.review.humanReviewRequired, true);
  assert.equal(manifest.review.status, 'draft');

  const markdownValidation = await validateCoverLetterManifest({
    root: temporaryRoot,
    manifestPath: markdownOnly.manifest,
  });
  assert.equal(markdownValidation.valid, true);

  await assert.rejects(
    buildCoverLetter({
      root: temporaryRoot,
      buildPath: FIXTURE,
    }),
    /Refusing to overwrite existing cover-letter artifacts/,
  );
  await assert.rejects(
    buildCoverLetter({
      root: temporaryRoot,
      buildPath: FIXTURE,
      outBase: '../escape',
    }),
    /must stay inside output/,
  );

  const outside = await mkdtemp(join(tmpdir(), 'jobhunt-cover-outside-'));
  try {
    await symlink(outside, join(temporaryRoot, 'output', 'linked'));
    await assert.rejects(
      buildCoverLetter({
        root: temporaryRoot,
        buildPath: FIXTURE,
        outBase: 'linked/escape',
      }),
      /resolves outside output\/ via a symlink/,
    );
  } finally {
    await rm(outside, { recursive: true, force: true });
  }

  const pdf = await buildCoverLetter({
    root: temporaryRoot,
    buildPath: FIXTURE,
    outBase: 'uploadable-example',
    pdf: true,
  });
  assert.ok((await stat(pdf.pdf)).size > 10_000);
  assert.equal(pdf.validation.valid, true);
  manifest = JSON.parse(await readFile(pdf.manifest, 'utf8'));
  assert.equal(manifest.output.pageCount, 1);
  assert.equal(manifest.output.tagged, true);
  assert.equal(manifest.output.outline, true);

  const pdfValidation = await validateCoverLetterManifest({
    root: temporaryRoot,
    manifestPath: pdf.manifest,
  });
  assert.equal(pdfValidation.valid, true, pdfValidation.errors.join('\n'));

  await writeFile(
    pdf.markdown,
    `${await readFile(pdf.markdown, 'utf8')}\nedit`,
  );
  const stale = await validateCoverLetterManifest({
    root: temporaryRoot,
    manifestPath: pdf.manifest,
  });
  assert.equal(stale.valid, false);
  assert.ok(
    stale.errors.some((error) => error.includes('markdown draft changed')),
  );

  console.log('Cover letter pipeline tests passed.');
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

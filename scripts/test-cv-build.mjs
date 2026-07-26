#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createCvBuildJsonSchema,
  parseAndValidateCvBuild,
  renderCvBuild,
  shortDisplayUrl,
} from './cv-build-core.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const FIXTURE_PATH = join(
  ROOT,
  'scripts',
  'test-fixtures',
  'cv-build-letter.json',
);

function clone(value) {
  return structuredClone(value);
}

async function expectRejects(label, operation, pattern) {
  await assert.rejects(operation, pattern, label);
}

const fixture = JSON.parse(await readFile(FIXTURE_PATH, 'utf8'));
const template = await readFile(
  join(ROOT, 'templates', 'cv-template.html'),
  'utf8',
);

const { build, coverage } = await parseAndValidateCvBuild(fixture, {
  root: ROOT,
});
assert.equal(coverage.mustHave.coveragePercent, 75);
assert.equal(coverage.mustHave.supportedCoveragePercent, 100);
assert.equal(coverage.niceToHave.coveragePercent, 100);
assert.equal(coverage.unsupportedIncludedCount, 0);
assert.deepEqual(coverage.gaps, [{ id: 'kubernetes', text: 'Kubernetes' }]);

const html = renderCvBuild(build, template);
assert.doesNotMatch(html, /\{\{[^}]+\}\}/);
assert.match(html, /<main class="page">/);
assert.match(html, /<header class="header avoid-break">/);
assert.match(html, /<section class="section projects"/);
assert.match(html, /<h2 class="section-title"/);
assert.doesNotMatch(html, /class="separator"/);
assert.doesNotMatch(html, />\|<\/span>/);
assert.doesNotMatch(
  html.match(/<address class="contact-row">([\s\S]*?)<\/address>/)[1],
  /[|•·]/,
);
assert.match(html, /<li data-evidence-ids="profile-ml profile-fast">/);
assert.match(html, /janesmith\.example\.com<\/a>/);
assert.match(
  html,
  /href="https:\/\/janesmith\.example\.com\/artificial-intelligence-portfolio-solutions-and-case-studies"/,
);

assert.equal(
  shortDisplayUrl(
    'https://example.com/a-very-long-portfolio-path-that-would-overflow',
  ),
  'example.com',
);

const unsupportedLeak = clone(fixture);
unsupportedLeak.summary += ' Kubernetes';
await expectRejects(
  'unsupported requirement terms must not leak into the CV',
  () => parseAndValidateCvBuild(unsupportedLeak, { root: ROOT }),
  /unsupported terms included/,
);

const inventedMetric = clone(fixture);
inventedMetric.experience[0].bullets[0].text += ' Improved quality 99%.';
await expectRejects(
  'quantitative claims must exist in linked evidence',
  () => parseAndValidateCvBuild(inventedMetric, { root: ROOT }),
  /quantity "99%"/,
);

const brokenEvidence = clone(fixture);
brokenEvidence.experience[0].bullets[0].evidenceIds = ['missing-evidence'];
await expectRejects(
  'all evidence references must resolve',
  () => parseAndValidateCvBuild(brokenEvidence, { root: ROOT }),
  /unknown evidence ID/,
);

const unrelatedRequirementEvidence = clone(fixture);
unrelatedRequirementEvidence.job.requirements[0].evidenceIds = ['cv-product'];
await expectRejects(
  'supported requirements must point to evidence containing a declared term',
  () => parseAndValidateCvBuild(unrelatedRequirementEvidence, { root: ROOT }),
  /no declared term in its evidence excerpts/,
);

const fallbackCandidate = clone(fixture);
fallbackCandidate.candidate.name = 'Candidate';
await expectRejects(
  'fallback candidate values must be rejected',
  () => parseAndValidateCvBuild(fallbackCandidate, { root: ROOT }),
  /fallback value is not allowed/,
);

const unknownField = clone(fixture);
unknownField.candidate.unvalidatedClaim = 'should not be silently stripped';
await expectRejects(
  'unknown structured fields must be rejected',
  () => parseAndValidateCvBuild(unknownField, { root: ROOT }),
  /Unrecognized key/,
);

assert.throws(
  () => renderCvBuild(build, `${template}\n{{UNDECLARED_TOKEN}}`),
  /Missing template replacements: UNDECLARED_TOKEN/,
);

const schema = JSON.parse(
  await readFile(join(ROOT, 'templates', 'cv-build.schema.json'), 'utf8'),
);
assert.deepEqual(schema, createCvBuildJsonSchema());
assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.ok(schema.properties.candidate);
assert.ok(schema.properties.job);
assert.ok(schema.properties.evidence);

console.log('Structured CV build contract passes');

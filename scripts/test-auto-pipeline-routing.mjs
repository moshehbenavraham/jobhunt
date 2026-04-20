#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const atsModule = await import(
  pathToFileURL(join(ROOT, 'scripts', 'ats-core.mjs')).href
);

const supportedUrl =
  'https://jobs.ashbyhq.com/livekit/1757f49e-7e19-4c45-85f7-e4637dff66fb';
const unsupportedUrl = 'https://example.com/jobs/123';

const atsCalls = [];
const genericCalls = [];

const atsResult = await atsModule.extractUrlForAutoPipeline(supportedUrl, {
  extractAtsJobImpl: async (url) => {
    atsCalls.push(url);
    return {
      ats: 'ashby',
      title: 'Senior Software Engineer, Agents',
      company: 'LiveKit',
      location: 'Remote, U.S',
      applyUrl: `${url}/application`,
      datePosted: '2025-01-13T18:34:08.613+00:00',
      compensation: {
        summary: 'USD 200000 - 260000 per year',
        currency: null,
        min: null,
        max: null,
        interval: null,
      },
      descriptionText: 'Build realtime agents.',
      descriptionHtml: '<p>Build realtime agents.</p>',
    };
  },
  genericExtractImpl: async (...args) => {
    genericCalls.push(args);
    throw new Error('generic extractor should not run on ATS success');
  },
});

assert.equal(atsResult.strategy, 'ats');
assert.equal(atsResult.title, 'Senior Software Engineer, Agents');
assert.equal(atsResult.company, 'LiveKit');
assert.equal(atsResult.descriptionText, 'Build realtime agents.');
assert.equal(atsCalls.length, 1);
assert.equal(genericCalls.length, 0);

const fallbackCalls = [];
const fallbackResult = await atsModule.extractUrlForAutoPipeline(supportedUrl, {
  extractAtsJobImpl: async () => {
    throw new Error('ATS extractor failed');
  },
  genericExtractImpl: async (url, context) => {
    fallbackCalls.push({ url, context });
    return {
      title: 'Fallback title',
      descriptionText: 'Fallback JD',
      extractionMethod: 'playwright',
    };
  },
});

assert.equal(fallbackResult.strategy, 'generic-fallback');
assert.equal(fallbackResult.title, 'Fallback title');
assert.equal(fallbackResult.descriptionText, 'Fallback JD');
assert.equal(fallbackResult.extractionMethod, 'playwright');
assert.equal(fallbackResult.fallbackReason, 'ATS extractor failed');
assert.equal(fallbackCalls.length, 1);
assert.equal(fallbackCalls[0].url, supportedUrl);
assert.equal(fallbackCalls[0].context.reason, 'ATS extractor failed');
assert.equal(fallbackCalls[0].context.detection.type, 'ashby');

const genericOnlyCalls = [];
const genericResult = await atsModule.extractUrlForAutoPipeline(
  unsupportedUrl,
  {
    genericExtractImpl: async (url, context) => {
      genericOnlyCalls.push({ url, context });
      return {
        title: 'Generic title',
        descriptionText: 'Generic JD',
        extractionMethod: 'webfetch',
      };
    },
  },
);

assert.equal(genericResult.strategy, 'generic');
assert.equal(genericResult.title, 'Generic title');
assert.equal(genericResult.extractionMethod, 'webfetch');
assert.equal(genericOnlyCalls.length, 1);
assert.equal(genericOnlyCalls[0].url, unsupportedUrl);
assert.equal(genericOnlyCalls[0].context.reason, null);
assert.equal(genericOnlyCalls[0].context.detection, null);

await assert.rejects(
  () => atsModule.extractUrlForAutoPipeline(unsupportedUrl),
  /No generic extractor provided/,
);

function read(path) {
  return readFileSync(join(ROOT, path), 'utf-8');
}

const autoPipelineMode = read('modes/auto-pipeline.md');
assert.match(autoPipelineMode, /node scripts\/extract-job\.mjs <url>/);
assert.match(autoPipelineMode, /Ashby, Greenhouse, or Lever/i);
assert.match(autoPipelineMode, /If the ATS helper fails, fall back to:/);
assert.match(autoPipelineMode, /Playwright \(preferred\)/);
assert.match(autoPipelineMode, /WebFetch \(fallback\)/);
assert.match(autoPipelineMode, /WebSearch \(last resort\)/);

const pipelineMode = read('modes/pipeline.md');
assert.match(pipelineMode, /node scripts\/extract-job\.mjs <url>/);
assert.match(
  pipelineMode,
  /If the ATS helper does not support the URL or fails/,
);

const scriptsDoc = read('docs/SCRIPTS.md');
assert.match(scriptsDoc, /auto-pipeline uses this\s+helper first/i);
assert.match(
  scriptsDoc,
  /fall\s+back to Playwright, WebFetch, then WebSearch/i,
);

console.log('auto-pipeline ATS routing regression tests pass');

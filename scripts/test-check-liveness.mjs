#!/usr/bin/env node

import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const livenessModule = await import(
  pathToFileURL(join(ROOT, 'scripts', 'check-liveness.mjs')).href
);

function createPage({
  status = 200,
  finalUrl = 'https://jobs.example.com/role',
  bodyText = '',
  applyControls = [],
  error = null,
}) {
  let evaluateCount = 0;
  return {
    async goto() {
      if (error) {
        throw new Error(error);
      }
      return {
        status() {
          return status;
        },
      };
    },
    async waitForTimeout() {},
    url() {
      return finalUrl;
    },
    async evaluate() {
      evaluateCount++;
      return evaluateCount === 1 ? bodyText : applyControls;
    },
  };
}

assert.deepEqual(await livenessModule.resolveUrls(['https://a', 'https://b']), [
  'https://a',
  'https://b',
]);
assert.deepEqual(
  await livenessModule.resolveUrls(['--file', 'urls.txt'], async () =>
    ['https://a', '', '# comment', ' https://b '].join('\n'),
  ),
  ['https://a', 'https://b'],
);
await assert.rejects(
  () => livenessModule.resolveUrls([]),
  /Usage: node scripts\/check-liveness\.mjs/,
);

const active = await livenessModule.checkUrl(
  createPage({
    bodyText: 'x'.repeat(400),
    applyControls: ['Apply now'],
  }),
  'https://jobs.example.com/active',
);
assert.equal(active.result, 'active');

const expired = await livenessModule.checkUrl(
  createPage({
    status: 404,
    bodyText: 'not found',
  }),
  'https://jobs.example.com/expired',
);
assert.equal(expired.result, 'expired');

const uncertain = await livenessModule.checkUrl(
  createPage({
    bodyText: 'x'.repeat(400),
    applyControls: [],
  }),
  'https://jobs.example.com/uncertain',
);
assert.equal(uncertain.result, 'uncertain');

const navigationError = await livenessModule.checkUrl(
  createPage({
    error: 'socket hang up',
  }),
  'https://jobs.example.com/error',
);
assert.equal(navigationError.result, 'expired');
assert.match(navigationError.reason, /navigation error/);

function createBrowser(page) {
  let closed = false;
  return {
    async newPage() {
      return page;
    },
    async close() {
      closed = true;
    },
    get closed() {
      return closed;
    },
  };
}

const successLogs = [];
const successBrowser = createBrowser(
  createPage({
    bodyText: 'x'.repeat(400),
    applyControls: ['Apply now'],
  }),
);
const successCode = await livenessModule.runChecks({
  args: ['https://jobs.example.com/one'],
  launchBrowser: async () => successBrowser,
  stdout: (line) => successLogs.push(line),
});
assert.equal(successCode, 0);
assert.equal(successBrowser.closed, true);
assert.match(successLogs.join('\n'), /1 active/);

const failureLogs = [];
const failureBrowser = createBrowser(
  createPage({
    bodyText: 'This job is no longer open.',
    applyControls: [],
  }),
);
const failureCode = await livenessModule.runChecks({
  args: ['--file', 'urls.txt'],
  readText: async () => 'https://jobs.example.com/two\n',
  launchBrowser: async () => failureBrowser,
  stdout: (line) => failureLogs.push(line),
});
assert.equal(failureCode, 1);
assert.equal(failureBrowser.closed, true);
assert.match(failureLogs.join('\n'), /expired/);

console.log('check-liveness regression tests pass');

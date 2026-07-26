#!/usr/bin/env node

import assert from 'node:assert/strict';
import { extractBrowserJobBoard } from './browser-extract.mjs';

let browserClosed = false;
let guardRemoved = false;
const page = {
  async goto(url) {
    assert.equal(url, 'https://careers.example.org/jobs');
    return { status: () => 200 };
  },
  async waitForTimeout() {},
  url() {
    return 'https://careers.example.org/jobs';
  },
  async evaluate() {
    return [
      {
        title: 'AI Engineer',
        url: '/jobs/1',
        company: '',
        location: 'Remote',
        description: 'Build customer AI systems.',
        postedAt: '2026-07-01',
      },
    ];
  },
};
const jobs = await extractBrowserJobBoard(
  {
    name: 'Acme',
    careers_url: 'https://careers.example.org/jobs',
  },
  {
    assertSafeUrlImpl: async (url) => {
      assert.match(url, /^https:\/\/careers\.example\.org/);
    },
    installNetworkGuardImpl: async () => async () => {
      guardRemoved = true;
    },
    launchBrowser: async () => ({
      async newPage() {
        return page;
      },
      async close() {
        browserClosed = true;
      },
    }),
  },
);
assert.equal(jobs.length, 1);
assert.equal(jobs[0].url, 'https://careers.example.org/jobs/1');
assert.equal(jobs[0].company, 'Acme');
assert.equal(jobs[0].postedAt, Date.parse('2026-07-01'));
assert.equal(browserClosed, true);
assert.equal(guardRemoved, true);

await assert.rejects(
  () =>
    extractBrowserJobBoard(
      { name: 'Unsafe', careers_url: 'http://127.0.0.1/admin' },
      {
        assertSafeUrlImpl: async () => {
          throw new Error('blocked');
        },
        launchBrowser: async () => {
          throw new Error('browser should not launch');
        },
      },
    ),
  /blocked/,
);

console.log('browser board extraction regression tests pass');

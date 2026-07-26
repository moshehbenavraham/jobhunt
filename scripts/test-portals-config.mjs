#!/usr/bin/env node

import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeHttpContext } from './providers/_http.mjs';
import { loadProviders } from './providers/_registry.mjs';
import { validatePortalConfig } from './validate-portals.mjs';
import { verifyPortalEntries } from './verify-portals.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const providers = await loadProviders(join(ROOT, 'scripts', 'providers'), {
  onError(error) {
    throw error;
  },
});

const valid = {
  title_filter: { positive: ['Engineer'], negative: [] },
  scan_filters: { salary: { unknown: 'allow' } },
  tracked_companies: [
    {
      name: 'Acme',
      careers_url: 'https://jobs.ashbyhq.com/acme',
      enabled: true,
    },
  ],
  job_boards: [{ name: 'Remotive', provider: 'remotive', enabled: false }],
};
assert.equal(validatePortalConfig(valid, { providers }).valid, true);

const invalid = validatePortalConfig(
  {
    title_filter: { positive: 'Engineer' },
    scan_filters: { posting: { unknown: 'maybe' } },
    tracked_companies: [
      {
        name: 'Duplicate',
        careers_url: 'http://user:pass@localhost:8080/jobs',
        enabled: 'yes',
      },
      { name: 'duplicate', provider: 'missing' },
    ],
  },
  { providers },
);
assert.equal(invalid.valid, false);
assert.match(invalid.errors.join('\n'), /title_filter\.positive/);
assert.match(invalid.errors.join('\n'), /credential-free HTTPS/);
assert.match(invalid.errors.join('\n'), /duplicated/);
assert.match(invalid.errors.join('\n'), /unknown provider/);

let clock = 0;
const report = await verifyPortalEntries(valid, {
  providers,
  now: () => {
    clock += 5;
    return clock;
  },
  context: makeHttpContext({
    fetchJson: async () => ({
      jobs: [
        {
          title: 'AI Engineer',
          jobUrl: 'https://jobs.ashbyhq.com/acme/1',
          location: 'Remote',
        },
      ],
    }),
  }),
});
assert.equal(report.results.length, 1);
assert.deepEqual(report.results[0], {
  name: 'Acme',
  provider: 'ashby',
  outcome: 'healthy',
  jobs: 1,
  durationMs: 5,
});
assert.deepEqual(valid.tracked_companies[0], {
  name: 'Acme',
  careers_url: 'https://jobs.ashbyhq.com/acme',
  enabled: true,
});

console.log('portal config validation and verification tests pass');

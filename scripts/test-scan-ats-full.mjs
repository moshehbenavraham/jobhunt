#!/usr/bin/env node

import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeHttpContext } from './providers/_http.mjs';
import { loadProviders } from './providers/_registry.mjs';
import { flattenSeedSets, runReverseDiscovery } from './scan-ats-full.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const providers = await loadProviders(join(ROOT, 'scripts', 'providers'), {
  onError(error) {
    throw error;
  },
});
const config = {
  seed_sets: [
    {
      name: 'Portfolio A',
      source_url: 'https://vc.example.org/portfolio',
      entries: [
        {
          name: 'Acme',
          careers_url: 'https://jobs.ashbyhq.com/acme',
        },
        {
          name: 'Duplicate Source',
          careers_url: 'https://jobs.ashbyhq.com/acme',
        },
      ],
    },
    {
      name: 'Disabled',
      enabled: false,
      entries: [{ name: 'Nope' }],
    },
  ],
};
const entries = flattenSeedSets(config);
assert.equal(entries.length, 2);
assert.equal(entries[0].seedSet, 'Portfolio A');
assert.equal(flattenSeedSets(config, { selectedSet: 'portfolio a' }).length, 2);
assert.equal(flattenSeedSets(config, { selectedSet: 'missing' }).length, 0);

const report = await runReverseDiscovery(entries, {
  providers,
  concurrency: 2,
  context: makeHttpContext({
    fetchJson: async () => ({
      jobs: [
        {
          title: 'AI Engineer',
          jobUrl: 'https://jobs.ashbyhq.com/acme/1?utm_source=vc',
          location: 'Remote',
        },
      ],
    }),
  }),
});
assert.equal(report.errors.length, 0);
assert.equal(report.jobs.length, 1);
assert.equal(report.jobs[0].seedSet, 'Portfolio A');
assert.equal(report.jobs[0].provider, 'ashby');
assert.ok(Number.isInteger(report.jobs[0].trustScore));

await assert.rejects(
  () =>
    runReverseDiscovery(entries, {
      providers,
      concurrency: 21,
    }),
  /integer from 1 to 20/,
);
const failed = await runReverseDiscovery(
  [{ name: 'Unknown', careers_url: 'https://careers.example.org' }],
  { providers, concurrency: 1 },
);
assert.equal(failed.errors.length, 1);

console.log('reverse ATS seed discovery regression tests pass');

#!/usr/bin/env node

import assert from 'node:assert/strict';
import { checkApiLiveness } from './liveness-api.mjs';

const url = 'https://job-boards.greenhouse.io/acme/jobs/12345';
assert.deepEqual(
  await checkApiLiveness(url, {
    extractAtsJobImpl: async () => ({
      title: 'AI Engineer',
      descriptionText: 'Build customer AI systems.',
    }),
  }),
  {
    result: 'active',
    reason: 'greenhouse API returned the posting and JD content',
    strategy: 'api',
  },
);
assert.equal(
  await checkApiLiveness(url, {
    extractAtsJobImpl: async () => ({ title: 'AI Engineer' }),
  }),
  null,
);
assert.equal(
  (
    await checkApiLiveness(url, {
      extractAtsJobImpl: async () => {
        const error = new Error('HTTP 404');
        error.status = 404;
        throw error;
      },
    })
  ).result,
  'expired',
);
assert.equal(
  await checkApiLiveness(url, {
    extractAtsJobImpl: async () => {
      throw new Error('socket hang up');
    },
  }),
  null,
);
assert.equal(
  await checkApiLiveness('https://careers.example.org/jobs/1', {
    extractAtsJobImpl: async () => {
      throw new Error('must not run');
    },
  }),
  null,
);

console.log('API liveness regression tests pass');

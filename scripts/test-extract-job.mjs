#!/usr/bin/env node

import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const extractorModule = await import(
  pathToFileURL(join(ROOT, 'scripts', 'ats-core.mjs')).href
);

const ashbyUrl = 'https://jobs.ashbyhq.com/livekit/1757f49e-7e19-4c45-85f7-e4637dff66fb/application';
const greenhouseUrl =
  'https://job-boards.greenhouse.io/figma/jobs/5364702004?gh_jid=5364702004';
const leverUrl =
  'https://jobs.lever.co/entrata/3793997e-8983-4995-b896-4031c8169f63/apply';

assert.deepEqual(extractorModule.detectAtsJobUrl(ashbyUrl), {
  type: 'ashby',
  companyKey: 'livekit',
  jobId: '1757f49e-7e19-4c45-85f7-e4637dff66fb',
  canonicalUrl:
    'https://jobs.ashbyhq.com/livekit/1757f49e-7e19-4c45-85f7-e4637dff66fb',
});
assert.deepEqual(extractorModule.detectAtsJobUrl(greenhouseUrl), {
  type: 'greenhouse',
  companyKey: 'figma',
  jobId: '5364702004',
  canonicalUrl: 'https://job-boards.greenhouse.io/figma/jobs/5364702004',
});
assert.deepEqual(extractorModule.detectAtsJobUrl(leverUrl), {
  type: 'lever',
  companyKey: 'entrata',
  jobId: '3793997e-8983-4995-b896-4031c8169f63',
  canonicalUrl:
    'https://jobs.lever.co/entrata/3793997e-8983-4995-b896-4031c8169f63',
});
assert.equal(
  extractorModule.detectAtsJobUrl('https://example.com/jobs/123'),
  null,
);

const fixtures = new Map([
  [
    'https://api.ashbyhq.com/posting-api/job-board/livekit?includeCompensation=true',
    {
      jobs: [
        {
          id: '1757f49e-7e19-4c45-85f7-e4637dff66fb',
          title: 'Senior Software Engineer, Agents',
          department: 'R&D',
          team: 'Engineering',
          employmentType: 'FullTime',
          location: 'Remote, U.S',
          publishedAt: '2025-01-13T18:34:08.613+00:00',
          workplaceType: 'Remote',
          jobUrl:
            'https://jobs.ashbyhq.com/livekit/1757f49e-7e19-4c45-85f7-e4637dff66fb',
          applyUrl:
            'https://jobs.ashbyhq.com/livekit/1757f49e-7e19-4c45-85f7-e4637dff66fb/application',
          descriptionHtml: '<p>Build realtime agents.</p><ul><li>Own APIs</li></ul>',
          compensationTierSummary: 'USD 200000 - 260000 per year',
        },
      ],
    },
  ],
  [
    'https://boards-api.greenhouse.io/v1/boards/figma/jobs/5364702004',
    {
      title: 'Account Executive, Emerging Enterprise (Berlin, Germany)',
      absolute_url:
        'https://job-boards.greenhouse.io/figma/jobs/5364702004?gh_jid=5364702004',
      location: { name: 'Berlin, Germany' },
      company_name: 'Figma',
      first_published: '2024-11-01T06:05:10-04:00',
      content:
        '&lt;p&gt;Grow the enterprise book.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Close deals&lt;/li&gt;&lt;/ul&gt;',
      departments: [{ name: 'Sales' }],
      metadata: [
        {
          name: 'Compensation',
          value: '$150,000 - $200,000 USD OTE',
        },
      ],
    },
  ],
  [
    'https://api.lever.co/v0/postings/entrata?mode=json',
    [
      {
        id: '3793997e-8983-4995-b896-4031c8169f63',
        text: 'Account Executive',
        hostedUrl:
          'https://jobs.lever.co/entrata/3793997e-8983-4995-b896-4031c8169f63',
        applyUrl:
          'https://jobs.lever.co/entrata/3793997e-8983-4995-b896-4031c8169f63/apply',
        categories: {
          commitment: 'Full-Time',
          department: 'Revenue Platform',
          location: 'Lehi, Utah',
          team: 'Sales',
        },
        workplaceType: 'onsite',
        createdAt: '2025-02-02T12:00:00.000Z',
        descriptionPlain: 'Lead complex sales.',
        description: '<p>Lead complex sales.</p>',
        lists: [
          {
            text: 'Responsibilities',
            content: '<li>Build pipeline</li><li>Close business</li>',
          },
        ],
        additionalPlain: 'Benefits included.',
        additional: '<p>Benefits included.</p>',
        salaryRange: {
          min: 75000,
          max: 95000,
          currency: 'USD',
          interval: 'per-year-salary',
        },
      },
    ],
  ],
]);

const htmlFixtures = new Map([
  [
    'https://jobs.ashbyhq.com/livekit/1757f49e-7e19-4c45-85f7-e4637dff66fb',
    '<html><head><title>Senior Software Engineer, Agents at LiveKit</title></head></html>',
  ],
  [
    'https://job-boards.greenhouse.io/figma/jobs/5364702004',
    '<html><head><meta property="og:site_name" content="Figma Careers"></head></html>',
  ],
  [
    'https://jobs.lever.co/entrata/3793997e-8983-4995-b896-4031c8169f63',
    '<html><head><meta property="og:title" content="Account Executive at Entrata"></head></html>',
  ],
]);

async function fetchJsonFixture(url) {
  if (!fixtures.has(url)) {
    throw new Error(`Unexpected JSON fetch: ${url}`);
  }
  return fixtures.get(url);
}

async function fetchTextFixture(url) {
  if (!htmlFixtures.has(url)) {
    throw new Error(`Unexpected HTML fetch: ${url}`);
  }
  return htmlFixtures.get(url);
}

const ashbyJob = await extractorModule.extractAtsJob(ashbyUrl, {
  fetchJsonImpl: fetchJsonFixture,
  fetchTextImpl: fetchTextFixture,
});
assert.equal(ashbyJob.ats, 'ashby');
assert.equal(ashbyJob.company, 'LiveKit');
assert.equal(ashbyJob.title, 'Senior Software Engineer, Agents');
assert.equal(ashbyJob.location, 'Remote, U.S');
assert.equal(ashbyJob.team, 'Engineering');
assert.equal(ashbyJob.department, 'R&D');
assert.equal(ashbyJob.employmentType, 'FullTime');
assert.equal(ashbyJob.workplaceType, 'Remote');
assert.equal(ashbyJob.descriptionText, 'Build realtime agents.\n\n- Own APIs');
assert.deepEqual(ashbyJob.compensation, {
  summary: 'USD 200000 - 260000 per year',
  currency: null,
  min: null,
  max: null,
  interval: null,
});

const greenhouseJob = await extractorModule.extractAtsJob(greenhouseUrl, {
  fetchJsonImpl: fetchJsonFixture,
  fetchTextImpl: fetchTextFixture,
});
assert.equal(greenhouseJob.ats, 'greenhouse');
assert.equal(greenhouseJob.company, 'Figma');
assert.equal(greenhouseJob.department, 'Sales');
assert.equal(greenhouseJob.descriptionText, 'Grow the enterprise book.\n\n- Close deals');
assert.deepEqual(greenhouseJob.compensation, {
  summary: '$150,000 - $200,000 USD OTE',
  currency: null,
  min: null,
  max: null,
  interval: null,
});

const leverJob = await extractorModule.extractAtsJob(leverUrl, {
  fetchJsonImpl: fetchJsonFixture,
  fetchTextImpl: fetchTextFixture,
});
assert.equal(leverJob.ats, 'lever');
assert.equal(leverJob.company, 'Entrata');
assert.equal(leverJob.location, 'Lehi, Utah');
assert.equal(leverJob.team, 'Sales');
assert.equal(leverJob.department, 'Revenue Platform');
assert.equal(leverJob.employmentType, 'Full-Time');
assert.equal(leverJob.workplaceType, 'onsite');
assert.match(leverJob.descriptionText, /Lead complex sales/);
assert.match(leverJob.descriptionText, /Responsibilities/);
assert.deepEqual(leverJob.compensation, {
  summary: null,
  currency: 'USD',
  min: 75000,
  max: 95000,
  interval: 'per-year-salary',
});

await assert.rejects(
  () =>
    extractorModule.extractAtsJob('https://example.com/jobs/123', {
      fetchJsonImpl: fetchJsonFixture,
      fetchTextImpl: fetchTextFixture,
    }),
  /Unsupported ATS URL/,
);

console.log('extract-job regression tests pass');

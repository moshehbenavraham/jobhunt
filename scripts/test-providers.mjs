#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchNormalized } from './providers/_contract.mjs';
import { makeHttpContext } from './providers/_http.mjs';
import { loadProviders, resolveProvider } from './providers/_registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const providers = await loadProviders(join(ROOT, 'scripts', 'providers'), {
  onError(error) {
    throw error;
  },
});
const expected = [
  'arbeitnow',
  'ashby',
  'bamboohr',
  'browser',
  'greenhouse',
  'himalayas',
  'jobicy',
  'lever',
  'personio',
  'pinpoint',
  'recruitee',
  'remoteok',
  'remotive',
  'rippling',
  'smartrecruiters',
  'teamtailor',
  'themuse',
  'workable',
  'workday',
];
assert.deepEqual([...providers.keys()].sort(), expected);

assert.equal(
  resolveProvider(
    { name: 'Acme', careers_url: 'https://jobs.ashbyhq.com/acme' },
    providers,
  ).provider.id,
  'ashby',
);
assert.equal(
  resolveProvider({ name: 'Remote', provider: 'remotive' }, providers).provider
    .id,
  'remotive',
);
assert.match(
  resolveProvider({ name: 'Bad', provider: 'missing' }, providers).error,
  /unknown provider/,
);

const cases = {
  arbeitnow: {
    data: [
      {
        title: 'AI Engineer',
        url: 'https://www.arbeitnow.com/jobs/acme-ai',
        company_name: 'Acme',
        location: 'Berlin',
        remote: true,
        created_at: 1_700_000_000,
      },
    ],
  },
  ashby: {
    jobs: [
      {
        title: 'AI Engineer',
        jobUrl: 'https://jobs.ashbyhq.com/acme/job-1',
        location: 'Remote',
        publishedAt: '2026-01-01',
      },
    ],
  },
  bamboohr: {
    result: [
      {
        id: '1',
        jobOpeningName: 'AI Engineer',
        location: { city: 'Austin', state: 'TX' },
        isRemote: true,
      },
    ],
  },
  browser: null,
  greenhouse: {
    jobs: [
      {
        title: 'AI Engineer',
        absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/1',
        location: { name: 'Remote' },
        first_published: '2026-01-01',
      },
    ],
  },
  himalayas: {
    jobs: [
      {
        title: 'AI Engineer',
        applicationLink: 'https://himalayas.app/companies/acme/jobs/ai',
        companyName: 'Acme',
        locationRestrictions: ['Worldwide'],
        pubDate: 1_700_000_000,
      },
    ],
  },
  jobicy: {
    jobs: [
      {
        jobTitle: 'AI Engineer',
        url: 'https://jobicy.com/jobs/acme-ai',
        companyName: 'Acme',
        jobGeo: 'Anywhere',
        pubDate: '2026-01-01',
      },
    ],
  },
  lever: [
    {
      text: 'AI Engineer',
      hostedUrl: 'https://jobs.lever.co/acme/job-1',
      categories: { location: 'Remote' },
      createdAt: 1_700_000_000_000,
    },
  ],
  personio: [
    '<workzag-jobs><position>',
    '<id>1</id><name>AI Engineer</name><office>Berlin</office>',
    '<createdAt>2026-01-01</createdAt>',
    '</position></workzag-jobs>',
  ].join(''),
  pinpoint: {
    data: [
      {
        title: 'AI Engineer',
        url: 'https://acme.pinpointhq.com/postings/1',
        location: { name: 'Remote' },
      },
    ],
  },
  recruitee: {
    offers: [
      {
        title: 'AI Engineer',
        careers_url: 'https://acme.recruitee.com/o/ai-engineer',
        location: 'Remote',
      },
    ],
  },
  remoteok: [
    {
      position: 'AI Engineer',
      url: 'https://remoteok.com/remote-jobs/1',
      company: 'Acme',
      location: 'Worldwide',
      epoch: 1_700_000_000,
    },
  ],
  remotive: {
    jobs: [
      {
        title: 'AI Engineer',
        url: 'https://remotive.com/remote-jobs/software-dev/acme-ai-1',
        company_name: 'Acme',
        candidate_required_location: 'Worldwide',
        publication_date: '2026-01-01',
      },
    ],
  },
  rippling: [
    {
      name: 'AI Engineer',
      url: 'https://ats.rippling.com/acme/jobs/1',
      workLocation: { label: 'Remote' },
    },
  ],
  smartrecruiters: {
    content: [
      {
        id: '1',
        name: 'AI Engineer',
        location: { fullLocation: 'Remote' },
        releasedDate: '2026-01-01',
      },
    ],
  },
  teamtailor: [
    '<rss><channel><item>',
    '<title>AI Engineer</title>',
    '<link>https://acme.teamtailor.com/jobs/1</link>',
    '<tt:city>Stockholm</tt:city><tt:country>Sweden</tt:country>',
    '<pubDate>2026-01-01</pubDate>',
    '</item></channel></rss>',
  ].join(''),
  themuse: {
    results: [
      {
        name: 'AI Engineer',
        refs: { landing_page: 'https://www.themuse.com/jobs/acme/ai' },
        company: { name: 'Acme' },
        locations: [{ name: 'Remote' }],
      },
    ],
  },
  workable: [
    '| Title | Department | Location | Type | Salary | Posted | Details |',
    '| AI Engineer | Engineering | Remote | Full time | | Today | [View](https://apply.workable.com/acme/jobs/view/1.md) |',
  ].join('\n'),
  workday: {
    total: 1,
    jobPostings: [
      {
        title: 'AI Engineer',
        externalPath: '/en-US/acme/job/AI-Engineer_R1',
        locationsText: 'Remote',
      },
    ],
  },
};

const careersUrls = {
  ashby: 'https://jobs.ashbyhq.com/acme',
  bamboohr: 'https://acme.bamboohr.com/careers',
  browser: 'https://careers.acme.com/jobs',
  lever: 'https://jobs.lever.co/acme',
  personio: 'https://acme.jobs.personio.de',
  pinpoint: 'https://acme.pinpointhq.com',
  recruitee: 'https://acme.recruitee.com',
  rippling: 'https://ats.rippling.com/acme/jobs',
  smartrecruiters: 'https://jobs.smartrecruiters.com/acme',
  teamtailor: 'https://acme.teamtailor.com',
  workable: 'https://apply.workable.com/acme',
  workday: 'https://acme.wd5.myworkdayjobs.com/en-US/acme',
};

for (const id of expected) {
  const provider = providers.get(id);
  const entry = {
    name: 'Acme',
    provider: id,
    api:
      id === 'greenhouse'
        ? 'https://boards-api.greenhouse.io/v1/boards/acme/jobs'
        : undefined,
    careers_url: careersUrls[id] || 'https://jobs.ashbyhq.com/acme',
  };
  let requestOptions;
  const context = makeHttpContext({
    fetchJson: async (_url, options) => {
      requestOptions = options;
      return cases[id];
    },
    fetchText: async (_url, options) => {
      requestOptions = options;
      return cases[id];
    },
    browserExtract: async () => [
      {
        title: 'AI Engineer',
        url: 'https://careers.acme.com/jobs/1',
        company: 'Acme',
        location: 'Remote',
      },
    ],
  });
  const jobs = await fetchNormalized(provider, entry, context);
  assert.equal(jobs.length, 1, id);
  assert.equal(jobs[0].title, 'AI Engineer', id);
  assert.equal(jobs[0].provider, id, id);
  assert.equal(jobs[0].source, 'Acme', id);
  assert.ok(Number.isInteger(jobs[0].trustScore), id);
  if (id !== 'browser') assert.equal(requestOptions.redirect, 'error', id);
}

const duplicatePayload = {
  jobs: [
    {
      title: 'One',
      absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/1',
    },
    {
      title: 'Duplicate',
      absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/1',
    },
    {
      title: '',
      absolute_url: 'http://127.0.0.1/private',
    },
  ],
};
const deduplicated = await fetchNormalized(
  providers.get('greenhouse'),
  {
    name: 'Acme',
    api: 'https://boards-api.greenhouse.io/v1/boards/acme/jobs',
  },
  makeHttpContext({ fetchJson: async () => duplicatePayload }),
);
assert.equal(deduplicated.length, 1);

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-providers-'));
try {
  mkdirSync(join(sandbox, 'outside'));
  writeFileSync(
    join(sandbox, 'outside', 'evil.mjs'),
    "export default { id: 'evil', kind: 'source', async fetch() { return []; } };",
  );
  symlinkSync(join(sandbox, 'outside', 'evil.mjs'), join(sandbox, 'evil.mjs'));
  const errors = [];
  const isolated = await loadProviders(sandbox, {
    onError: (error) => errors.push(error.message),
  });
  assert.equal(isolated.size, 0);
  assert.match(errors.join('\n'), /regular file|symlink/);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('provider registry regression tests pass');

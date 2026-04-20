#!/usr/bin/env node

import assert from 'node:assert/strict';
import http from 'node:http';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function withCapturedLogs(fn) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => {
    lines.push(args.join(' '));
  };
  return Promise.resolve()
    .then(fn)
    .then(
      (result) => ({ result, output: lines.join('\n') }),
      (error) => {
        throw error;
      },
    )
    .finally(() => {
      console.log = original;
    });
}

const server = http.createServer((req, res) => {
  if (req.url === '/greenhouse') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        jobs: [
          {
            title: 'Senior Platform Engineer',
            absolute_url: 'https://jobs.example.com/new-role',
            location: { name: 'Remote' },
          },
          {
            title: 'Senior Platform Engineer',
            absolute_url: 'https://jobs.example.com/us-role',
            location: { name: 'Remote - US' },
          },
          {
            title: 'Senior Platform Engineer',
            absolute_url: 'https://jobs.example.com/london-role',
            location: { name: 'London' },
          },
          {
            title: 'Senior Platform Engineer',
            absolute_url: 'https://jobs.example.com/remote-japan-role',
            location: { name: 'Remote - Japan' },
          },
          {
            title: 'Sales Manager',
            absolute_url: 'https://jobs.example.com/filtered-role',
            location: { name: 'NYC' },
          },
          {
            title: 'ML Engineer',
            absolute_url: 'https://jobs.example.com/duplicate-url',
            location: { name: 'Remote' },
          },
          {
            title: 'Data Engineer',
            absolute_url: 'https://jobs.example.com/existing-company-role',
            location: { name: 'Remote' },
          },
        ],
      }),
    );
    return;
  }

  if (req.url === '/greenhouse-broken') {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'boom' }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'missing' }));
});

await new Promise((resolveListen) =>
  server.listen(0, '127.0.0.1', resolveListen),
);
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-scan-'));
process.env.JOBHUNT_ROOT = sandbox;
const skippedCompanyLines = Array.from({ length: 10 }, (_, index) => [
  `  - name: DisabledCo${index + 1}`,
  '    enabled: false',
]);

writeFile(
  join(sandbox, 'portals.yml'),
  [
    'title_filter:',
    '  positive:',
    '    - engineer',
    '  negative:',
    '    - manager',
    '  seniority_boost:',
    '    - senior',
    'search_queries:',
    '  - name: Manual query',
    '    query: site:example.com engineer',
    '    enabled: false',
    'tracked_companies:',
    ...skippedCompanyLines.flat(),
    '  - name: AshbyCo',
    '    enabled: false',
    '    careers_url: https://jobs.ashbyhq.com/acme',
    '  - name: UnknownCo',
    '    enabled: true',
    '    scan_method: websearch',
    '    scan_query: site:example.com/careers engineer',
    '    careers_url: https://example.com/careers',
    `  - name: GreenhouseCo`,
    '    enabled: true',
    `    api: ${baseUrl}/greenhouse`,
    `  - name: BrokenCo`,
    '    enabled: true',
    `    api: ${baseUrl}/greenhouse-broken`,
    '',
  ].join('\n'),
);
writeFile(
  join(sandbox, 'config', 'profile.yml'),
  [
    'candidate:',
    '  full_name: Test User',
    'compensation:',
    '  location_flexibility: Remote preferred',
    'location:',
    '  country: United States',
    'discovery:',
    '  remote_policy: remote_or_allowed_locations',
    '  allowed_location_terms:',
    '    - United States',
    '    - US',
    '  blocked_regions:',
    '    - APAC',
    '  allow_unknown_locations: false',
    '  allow_remote_unknown_locations: true',
    '',
  ].join('\n'),
);
writeFile(
  join(sandbox, 'data', 'scan-history.tsv'),
  [
    'url\tfirst_seen\tportal\ttitle\tcompany\tstatus',
    'https://jobs.example.com/duplicate-url\t2026-04-01\tgreenhouse-api\tML Engineer\tGreenhouseCo\tadded',
    '',
  ].join('\n'),
);
writeFile(
  join(sandbox, 'data', 'pipeline.md'),
  [
    '# Pipeline',
    '',
    '## Pending',
    '',
    '- [ ] https://jobs.example.com/pipeline-existing | GreenhouseCo | Existing Role',
    '',
    '## Processed',
    '',
  ].join('\n'),
);
writeFile(
  join(sandbox, 'data', 'applications.md'),
  [
    '# Applications',
    '',
    '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
    '| 1 | 2026-04-01 | GreenhouseCo | Data Engineer | 4.0 | Applied |  | [001](reports/001.md) | https://jobs.example.com/application-inline |',
    '',
  ].join('\n'),
);

const scanModule = await import(
  pathToFileURL(join(ROOT, 'scripts', 'scan.mjs')).href
);

assert.deepEqual(scanModule.detectApi({ api: `${baseUrl}/greenhouse` }), {
  type: 'greenhouse',
  url: `${baseUrl}/greenhouse`,
});
assert.deepEqual(
  scanModule.detectApi({ careers_url: 'https://jobs.ashbyhq.com/acme' }),
  {
    type: 'ashby',
    url: 'https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true',
  },
);
assert.deepEqual(
  scanModule.detectApi({ careers_url: 'https://jobs.lever.co/acme' }),
  {
    type: 'lever',
    url: 'https://api.lever.co/v0/postings/acme',
  },
);
assert.deepEqual(
  scanModule.detectApi({
    careers_url: 'https://job-boards.greenhouse.io/acme',
  }),
  {
    type: 'greenhouse',
    url: 'https://boards-api.greenhouse.io/v1/boards/acme/jobs',
  },
);
assert.equal(
  scanModule.detectApi({ careers_url: 'https://example.com/jobs' }),
  null,
);

assert.deepEqual(
  scanModule.parseGreenhouse(
    {
      jobs: [
        { title: 'Role', absolute_url: 'u', location: { name: 'Remote' } },
      ],
    },
    'Acme',
  ),
  [{ title: 'Role', url: 'u', company: 'Acme', location: 'Remote' }],
);
assert.deepEqual(
  scanModule.parseAshby(
    { jobs: [{ title: 'Role', jobUrl: 'u', location: 'Remote' }] },
    'Acme',
  ),
  [{ title: 'Role', url: 'u', company: 'Acme', location: 'Remote' }],
);
assert.deepEqual(
  scanModule.parseLever(
    [{ text: 'Role', hostedUrl: 'u', categories: { location: 'Remote' } }],
    'Acme',
  ),
  [{ title: 'Role', url: 'u', company: 'Acme', location: 'Remote' }],
);
assert.deepEqual(scanModule.parseLever({}, 'Acme'), []);

const titleFilter = scanModule.buildTitleFilter({
  positive: ['engineer'],
  negative: ['manager'],
});
assert.equal(titleFilter('Principal Engineer'), true);
assert.equal(titleFilter('Sales Manager'), false);
assert.equal(titleFilter('Designer'), false);

const implicitDiscoveryConfig = scanModule.buildDiscoveryConfig({
  compensation: {
    location_flexibility:
      'Remote within EU; up to 1 week/month on-site in Berlin or any EU city',
  },
  location: { country: 'Germany' },
  candidate: { location: 'Berlin, Germany' },
});
assert.equal(implicitDiscoveryConfig.enabled, false);
assert.equal(implicitDiscoveryConfig.remotePolicy, 'unrestricted');
assert.deepEqual(implicitDiscoveryConfig.allowedLocationTerms, []);

const discoveryConfig = scanModule.buildDiscoveryConfig({
  compensation: { location_flexibility: 'Remote preferred' },
  location: { country: 'United States' },
  discovery: {
    remote_policy: 'remote_or_allowed_locations',
    allowed_location_terms: ['United States', 'US'],
    blocked_regions: ['APAC'],
    allow_unknown_locations: false,
    allow_remote_unknown_locations: true,
  },
});
assert.equal(discoveryConfig.remotePolicy, 'remote_or_allowed_locations');
assert.deepEqual(discoveryConfig.allowedLocationTerms, ['United States', 'US']);
assert.deepEqual(scanModule.classifyLocation('Remote - US').regions, [
  'REMOTE',
  'US',
]);
assert.equal(
  scanModule.evaluateLocation('Remote - US', discoveryConfig).allowed,
  true,
);
assert.equal(
  scanModule.evaluateLocation('London', discoveryConfig).allowed,
  false,
);
assert.equal(
  scanModule.describeLocationDecision(
    scanModule.evaluateLocation('Remote - Japan', discoveryConfig),
  ),
  'blocked region (APAC)',
);
const discoveryConfigAllowUnknown = scanModule.buildDiscoveryConfig({
  discovery: {
    remote_policy: 'remote_or_allowed_locations',
    allowed_location_terms: ['United States', 'US'],
    allow_unknown_locations: true,
    allow_remote_unknown_locations: true,
  },
});
assert.equal(
  scanModule.evaluateLocation('Hybrid', discoveryConfigAllowUnknown).allowed,
  true,
);
assert.equal(
  scanModule.evaluateLocation(
    'San Mateo, California',
    discoveryConfigAllowUnknown,
  ).allowed,
  true,
);
assert.equal(
  scanModule.evaluateLocation(
    'Flexible',
    scanModule.buildDiscoveryConfig({
      discovery: {
        remote_policy: 'allowed_locations_only',
        allowed_location_terms: ['United States', 'US'],
        allow_unknown_locations: false,
      },
    }),
  ).reason,
  'unknown-location',
);
assert.equal(
  scanModule.evaluateLocation(
    'Remote',
    scanModule.buildDiscoveryConfig({
      discovery: {
        remote_policy: 'allowed_locations_only',
        allowed_location_terms: ['United States', 'US'],
        allow_unknown_locations: false,
        allow_remote_unknown_locations: false,
      },
    }),
  ).reason,
  'unknown-location',
);
assert.deepEqual(
  scanModule.parsePendingOffersFromPipeline(
    [
      '# Pipeline',
      '',
      '## Pending',
      '',
      '- [ ] https://jobs.example.com/a | GreenhouseCo | Platform Engineer',
      '- [ ] https://jobs.example.com/b',
      '',
      '## Processed',
      '',
    ].join('\n'),
  ),
  [
    {
      url: 'https://jobs.example.com/a',
      company: 'GreenhouseCo',
      title: 'Platform Engineer',
      location: '',
    },
    {
      url: 'https://jobs.example.com/b',
      company: '',
      title: '',
      location: '',
    },
  ],
);
const shortlist = scanModule.buildShortlist(
  [
    {
      url: 'https://jobs.example.com/new-role',
      company: 'GreenhouseCo',
      title: 'Senior Platform Engineer',
      location: 'Remote',
    },
    {
      url: 'https://jobs.example.com/side-role',
      company: 'GreenhouseCo',
      title: 'Existing Role',
      location: '',
    },
  ],
  {
    positiveKeywords: ['engineer'],
    companyPriority: new Map([['greenhouseco', 0]]),
    discovery: discoveryConfig,
  },
);
assert.equal(shortlist.bucketCounts['possible-fit'], 1);
assert.equal(shortlist.bucketCounts['adjacent-or-noisy'], 1);
assert.equal(shortlist.topOffers[0].bucket, 'possible-fit');
assert.match(
  scanModule.renderShortlistSection(shortlist, '2026-04-16'),
  /## Shortlist[\s\S]*Bucket counts:[\s\S]*Top 10 to evaluate first:/,
);

const seenUrls = scanModule.loadSeenUrls();
assert.ok(seenUrls.has('https://jobs.example.com/duplicate-url'));
assert.ok(seenUrls.has('https://jobs.example.com/pipeline-existing'));
assert.ok(seenUrls.has('https://jobs.example.com/application-inline'));

const seenCompanyRoles = scanModule.loadSeenCompanyRoles();
assert.ok(seenCompanyRoles.has('greenhouseco::data engineer'));

const order = [];
const fetched = await scanModule.parallelFetch(
  [
    async () => {
      order.push('a');
      return 'a';
    },
    async () => {
      order.push('b');
      return 'b';
    },
  ],
  2,
);
assert.deepEqual(fetched.sort(), ['a', 'b']);
assert.deepEqual(order.sort(), ['a', 'b']);

writeFile(
  join(sandbox, 'data', 'pipeline.md'),
  ['# Pipeline', '', '## Processed', ''].join('\n'),
);
scanModule.appendToPipeline([
  {
    url: 'https://jobs.example.com/manual',
    company: 'ManualCo',
    title: 'Manual Engineer',
  },
]);
assert.match(
  readFileSync(join(sandbox, 'data', 'pipeline.md'), 'utf8'),
  /## Pending[\s\S]*https:\/\/jobs\.example\.com\/manual/,
);

scanModule.appendToScanHistory(
  [
    {
      url: 'https://jobs.example.com/manual',
      source: 'greenhouse-api',
      title: 'Manual Engineer',
      company: 'ManualCo',
    },
  ],
  '2026-04-15',
);
assert.match(
  readFileSync(join(sandbox, 'data', 'scan-history.tsv'), 'utf8'),
  /manual\t2026-04-15\tgreenhouse-api\tManual Engineer\tManualCo\tadded/,
);

const dryRun = await withCapturedLogs(() => scanModule.runScan(['--dry-run']));
assert.match(dryRun.output, /dry run/);
assert.match(dryRun.output, /Companies configured:\s+14/);
assert.match(dryRun.output, /Companies scanned:\s+2/);
assert.match(dryRun.output, /Companies skipped:\s+12/);
assert.match(dryRun.output, /Filtered by location:\s+2 removed/);
assert.match(dryRun.output, /Duplicates:\s+3 skipped/);
assert.match(dryRun.output, /New offers added:\s+1/);
assert.match(dryRun.output, /Skipped companies \(12\):/);
assert.match(dryRun.output, /AshbyCo: disabled in portals\.yml/);
assert.match(
  dryRun.output,
  /UnknownCo: no supported ATS API detected from api\/careers_url/,
);
assert.match(dryRun.output, /Unsupported config \(3\):/);
assert.match(
  dryRun.output,
  /search_queries \(1\) are stored in portals\.yml but ignored by this scanner/,
);
assert.match(
  dryRun.output,
  /title_filter\.seniority_boost \(1\) is present but ignored by this scanner/,
);
assert.match(
  dryRun.output,
  /tracked_companies\.scan_method\/scan_query are ignored for 1 entries: UnknownCo/,
);
assert.match(dryRun.output, /Profile constraints \(3\):/);
assert.match(dryRun.output, /Allowed location terms: US, United States/);
assert.match(dryRun.output, /Blocked regions: APAC/);
assert.match(dryRun.output, /Location rejections \(2\):/);
assert.match(dryRun.output, /outside allowed geography: London/);
assert.match(dryRun.output, /blocked region \(APAC\): Remote - Japan/);
assert.match(dryRun.output, /Shortlist buckets:/);
assert.match(dryRun.output, /Top 10 to evaluate first:/);
assert.match(dryRun.output, /Possible fit: 1/);
assert.doesNotMatch(
  readFileSync(join(sandbox, 'data', 'pipeline.md'), 'utf8'),
  /new-role/,
);

const liveRun = await withCapturedLogs(() => scanModule.runScan([]));
assert.match(liveRun.output, /Errors \(1\)/);
assert.match(liveRun.output, /BrokenCo/);
assert.match(
  readFileSync(join(sandbox, 'data', 'pipeline.md'), 'utf8'),
  /https:\/\/jobs\.example\.com\/new-role \| GreenhouseCo \| Senior Platform Engineer/,
);
assert.match(
  readFileSync(join(sandbox, 'data', 'pipeline.md'), 'utf8'),
  /## Shortlist[\s\S]*Top 10 to evaluate first:[\s\S]*https:\/\/jobs\.example\.com\/new-role \| GreenhouseCo \| Senior Platform Engineer/,
);
assert.match(
  readFileSync(join(sandbox, 'data', 'scan-history.tsv'), 'utf8'),
  /https:\/\/jobs\.example\.com\/new-role\t\d{4}-\d{2}-\d{2}\tgreenhouse-api\tSenior Platform Engineer\tGreenhouseCo\tadded/,
);

const compareCleanRun = await withCapturedLogs(() =>
  scanModule.runScan(['--compare-clean']),
);
assert.match(compareCleanRun.output, /compare-clean mode/);
assert.match(compareCleanRun.output, /New offers added:\s+3/);
assert.match(compareCleanRun.output, /Filtered by location:\s+2 removed/);
assert.match(compareCleanRun.output, /Shortlist buckets:/);
assert.match(compareCleanRun.output, /Possible fit: 3/);
assert.doesNotMatch(
  readFileSync(join(sandbox, 'data', 'pipeline.md'), 'utf8'),
  /https:\/\/jobs\.example\.com\/duplicate-url/,
);

const freshSandbox = mkdtempSync(join(tmpdir(), 'jobhunt-scan-fresh-'));
process.env.JOBHUNT_ROOT = freshSandbox;

writeFile(
  join(freshSandbox, 'portals.yml'),
  [
    'title_filter:',
    '  positive:',
    '    - engineer',
    '  negative:',
    '    - manager',
    'tracked_companies:',
    '  - name: GreenhouseCo',
    '    enabled: true',
    `    api: ${baseUrl}/greenhouse`,
    '',
  ].join('\n'),
);

const freshScanModule = await import(
  `${pathToFileURL(join(ROOT, 'scripts', 'scan.mjs')).href}?fresh=${Date.now()}`
);

assert.equal(existsSync(join(freshSandbox, 'data', 'pipeline.md')), false);
assert.equal(existsSync(join(freshSandbox, 'data', 'scan-history.tsv')), false);

const freshRun = await withCapturedLogs(() => freshScanModule.runScan([]));
assert.match(freshRun.output, /Companies configured:\s+1/);
assert.ok(existsSync(join(freshSandbox, 'data', 'pipeline.md')));
assert.ok(existsSync(join(freshSandbox, 'data', 'scan-history.tsv')));
assert.match(
  readFileSync(join(freshSandbox, 'data', 'pipeline.md'), 'utf8'),
  /# Pipeline[\s\S]*## Shortlist[\s\S]*## Pending[\s\S]*https:\/\/jobs\.example\.com\/new-role/,
);
assert.match(
  readFileSync(join(freshSandbox, 'data', 'scan-history.tsv'), 'utf8'),
  /^url\tfirst_seen\tportal\ttitle\tcompany\tstatus/m,
);

await new Promise((resolveClose, rejectClose) =>
  server.close((error) => (error ? rejectClose(error) : resolveClose())),
);
rmSync(sandbox, { recursive: true, force: true });
rmSync(freshSandbox, { recursive: true, force: true });

console.log('scan regression tests pass');

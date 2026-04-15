#!/usr/bin/env node

import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
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

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-scan-'));
process.env.JOBHUNT_ROOT = sandbox;

writeFile(
  join(sandbox, 'portals.yml'),
  [
    'title_filter:',
    '  positive:',
    '    - engineer',
    '  negative:',
    '    - manager',
    'tracked_companies:',
    `  - name: GreenhouseCo`,
    '    enabled: true',
    `    api: ${baseUrl}/greenhouse`,
    `  - name: BrokenCo`,
    '    enabled: true',
    `    api: ${baseUrl}/greenhouse-broken`,
    '  - name: AshbyCo',
    '    enabled: false',
    '    careers_url: https://jobs.ashbyhq.com/acme',
    '  - name: UnknownCo',
    '    enabled: true',
    '    careers_url: https://example.com/careers',
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
assert.deepEqual(scanModule.detectApi({ careers_url: 'https://jobs.ashbyhq.com/acme' }), {
  type: 'ashby',
  url: 'https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true',
});
assert.deepEqual(scanModule.detectApi({ careers_url: 'https://jobs.lever.co/acme' }), {
  type: 'lever',
  url: 'https://api.lever.co/v0/postings/acme',
});
assert.deepEqual(scanModule.detectApi({ careers_url: 'https://job-boards.greenhouse.io/acme' }), {
  type: 'greenhouse',
  url: 'https://boards-api.greenhouse.io/v1/boards/acme/jobs',
});
assert.equal(scanModule.detectApi({ careers_url: 'https://example.com/jobs' }), null);

assert.deepEqual(scanModule.parseGreenhouse({ jobs: [{ title: 'Role', absolute_url: 'u', location: { name: 'Remote' } }] }, 'Acme'), [
  { title: 'Role', url: 'u', company: 'Acme', location: 'Remote' },
]);
assert.deepEqual(scanModule.parseAshby({ jobs: [{ title: 'Role', jobUrl: 'u', location: 'Remote' }] }, 'Acme'), [
  { title: 'Role', url: 'u', company: 'Acme', location: 'Remote' },
]);
assert.deepEqual(scanModule.parseLever([{ text: 'Role', hostedUrl: 'u', categories: { location: 'Remote' } }], 'Acme'), [
  { title: 'Role', url: 'u', company: 'Acme', location: 'Remote' },
]);
assert.deepEqual(scanModule.parseLever({}, 'Acme'), []);

const titleFilter = scanModule.buildTitleFilter({
  positive: ['engineer'],
  negative: ['manager'],
});
assert.equal(titleFilter('Principal Engineer'), true);
assert.equal(titleFilter('Sales Manager'), false);
assert.equal(titleFilter('Designer'), false);

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
assert.match(dryRun.output, /New offers added:\s+1/);
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
  readFileSync(join(sandbox, 'data', 'scan-history.tsv'), 'utf8'),
  /https:\/\/jobs\.example\.com\/new-role\t\d{4}-\d{2}-\d{2}\tgreenhouse-api\tSenior Platform Engineer\tGreenhouseCo\tadded/,
);

await new Promise((resolveClose, rejectClose) =>
  server.close((error) => (error ? rejectClose(error) : resolveClose())),
);
rmSync(sandbox, { recursive: true, force: true });

console.log('scan regression tests pass');

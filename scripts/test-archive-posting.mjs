#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  archiveFilename,
  archivePosting,
  companyFromPostingUrl,
  extractPendingArchiveTargets,
  parsePostingPageTitle,
} from './archive-posting.mjs';

assert.deepEqual(parsePostingPageTitle('Senior Engineer at Acme'), {
  role: 'Senior Engineer',
  company: 'Acme',
});
assert.equal(
  companyFromPostingUrl('https://jobs.ashbyhq.com/Acme/123'),
  'Acme',
);
assert.equal(
  archiveFilename({
    date: '2026-07-26',
    company: '../../Acme',
    role: 'Staff AI | Engineer',
  }),
  '2026-07-26_acme_staff-ai-engineer.pdf',
);
assert.deepEqual(
  extractPendingArchiveTargets(
    '- [ ] https://jobs.example.com/1 | Acme | Engineer\n- [x] https://example.com/2',
  ),
  [
    {
      url: 'https://jobs.example.com/1',
      company: 'Acme',
      role: 'Engineer',
    },
  ],
);

const resolver = async () => [{ address: '93.184.216.34', family: 4 }];
let closed = false;
const page = {
  async route() {},
  async unroute() {},
  async goto() {
    return { status: () => 200 };
  },
  async waitForLoadState() {},
  url() {
    return 'https://jobs.example.com/role/123';
  },
  async title() {
    return 'Staff AI Engineer at Acme';
  },
  async $eval(selector) {
    if (selector === 'h1') return 'Staff AI Engineer';
    return [
      'Staff AI Engineer',
      'About the role',
      'Responsibilities include production delivery and platform ownership.',
      'Qualifications include extensive distributed systems experience.',
      'Work with a cross-functional team to ship reliable customer outcomes.',
    ].join(' ');
  },
  async pdf() {
    return Buffer.from('%PDF-fixture');
  },
  async close() {
    closed = true;
  },
};
const browser = { async newPage() { return page; } };
const root = mkdtempSync(join(tmpdir(), 'jobhunt-archive-'));
try {
  const result = await archivePosting({
    root,
    browser,
    url: 'https://jobs.example.com/role/123',
    date: '2026-07-26',
    resolver,
    validatePdf: async (buffer) => ({
      valid: true,
      pageCount: 2,
      size: buffer.length,
      sha256: 'a'.repeat(64),
      checks: [{ id: 'fixture', valid: true }],
    }),
  });
  assert.equal(closed, true);
  assert.equal(existsSync(result.pdfPath), true);
  assert.equal(existsSync(result.manifestPath), true);
  const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf8'));
  assert.equal(manifest.validation.valid, true);
  assert.equal(manifest.source.finalUrl, 'https://jobs.example.com/role/123');
  assert.equal(manifest.output.pageCount, 2);

  await assert.rejects(
    () =>
      archivePosting({
        root,
        browser,
        url: 'http://127.0.0.1/private',
        resolver,
      }),
    /not allowed|private|loopback|non-public/i,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('posting archive tests passed');

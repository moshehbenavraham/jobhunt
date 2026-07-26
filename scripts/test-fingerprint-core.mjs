#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  canonicalizeListingUrl,
  classifyListingAgainstHistory,
  enrichListingFingerprint,
  fingerprintSimilarity,
  fingerprintText,
  identityFingerprint,
  normalizeJdText,
} from './fingerprint-core.mjs';

assert.equal(
  canonicalizeListingUrl(
    'HTTPS://Jobs.Example.org./role//1/?utm_source=mail&b=2&a=1#apply',
  ),
  'https://jobs.example.org/role/1?a=1&b=2',
);
assert.equal(
  canonicalizeListingUrl('https://jobs.example.org/role?id=1&source=linkedin'),
  'https://jobs.example.org/role?id=1',
);
assert.equal(canonicalizeListingUrl('file:///etc/passwd'), '');
assert.equal(normalizeJdText('<b>Hello</b> &amp; WORLD'), 'hello world');
assert.equal(fingerprintText('too short'), '');

const body = [
  'Build production AI systems with customers and own delivery from discovery through deployment.',
  'Partner with engineering teams on evaluation, observability, security, and reliable integrations.',
  'Explain technical tradeoffs clearly and turn ambiguous requirements into maintainable software.',
].join(' ');
const closeBody = `${body} You will also mentor peers and improve shared tooling.`;
const differentBody = [
  'Own payroll operations, prepare monthly reports, reconcile invoices, and support tax compliance.',
  'Partner with finance leaders and external auditors across multiple international legal entities.',
  'Maintain accounting controls and document repeatable administrative processes for the business.',
].join(' ');
const first = fingerprintText(body);
const close = fingerprintText(closeBody);
const different = fingerprintText(differentBody);
assert.match(first, /^[0-9a-f]{16}$/);
assert.ok(fingerprintSimilarity(first, close) >= 0.8);
assert.ok(fingerprintSimilarity(first, different) < 0.8);
assert.equal(fingerprintSimilarity('', first), 0);

assert.equal(
  identityFingerprint({ company: 'Acme, Inc.', title: 'Senior AI Engineer' }),
  identityFingerprint({ company: 'ACME INC', title: 'Senior-AI Engineer' }),
);

const job = enrichListingFingerprint({
  url: 'https://jobs.example.org/acme/1?utm_campaign=x',
  company: 'Acme',
  title: 'Senior AI Engineer',
  description: body,
});
const baseHistory = {
  firstSeen: '2026-07-01',
  canonicalUrl: job.canonicalUrl,
  identityFingerprint: job.identityFingerprint,
  contentFingerprint: job.contentFingerprint,
};
assert.equal(
  classifyListingAgainstHistory(job, [baseHistory], {
    now: Date.UTC(2026, 6, 26),
  }).kind,
  'cosmetic_duplicate',
);
assert.equal(
  classifyListingAgainstHistory(
    { ...job, canonicalUrl: 'https://jobs.example.org/acme/2' },
    [baseHistory],
    { now: Date.UTC(2026, 6, 26) },
  ).kind,
  'relisted',
);
assert.equal(
  classifyListingAgainstHistory(
    {
      ...job,
      canonicalUrl: 'https://agency.example.org/jobs/22',
      identityFingerprint: identityFingerprint({
        company: 'Agency',
        title: job.title,
      }),
    },
    [baseHistory],
    { now: Date.UTC(2026, 6, 26) },
  ).kind,
  'cross_listing',
);
assert.equal(
  classifyListingAgainstHistory(
    {
      ...job,
      canonicalUrl: 'https://jobs.example.org/acme/3',
      contentFingerprint: different,
    },
    [baseHistory],
    { now: Date.UTC(2026, 6, 26) },
  ).kind,
  'materially_changed',
);

console.log('listing fingerprint regression tests pass');

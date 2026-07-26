#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  detectListingEvents,
  parseFingerprintHistory,
  renderRepostSummary,
} from './detect-reposts.mjs';
import {
  canonicalizeListingUrl,
  fingerprintText,
  identityFingerprint,
} from './fingerprint-core.mjs';

const body =
  'Build reliable customer AI systems with evaluation observability security deployment integrations and production ownership. '.repeat(
    4,
  );
const changed =
  'Own finance reporting payroll audit accounting compliance invoices and international tax operations. '.repeat(
    5,
  );
const identity = identityFingerprint({
  company: 'Acme',
  title: 'Senior AI Engineer',
});
const rows = [
  {
    url: 'https://jobs.example.org/acme/1?utm_source=x',
    date: '2026-07-01',
    company: 'Acme',
    title: 'Senior AI Engineer',
    canonicalUrl: canonicalizeListingUrl(
      'https://jobs.example.org/acme/1?utm_source=x',
    ),
    identityFingerprint: identity,
    contentFingerprint: fingerprintText(body),
  },
  {
    url: 'https://jobs.example.org/acme/2',
    date: '2026-07-10',
    company: 'Acme',
    title: 'Senior AI Engineer',
    canonicalUrl: canonicalizeListingUrl('https://jobs.example.org/acme/2'),
    identityFingerprint: identity,
    contentFingerprint: fingerprintText(body),
  },
  {
    url: 'https://agency.example.org/jobs/44',
    date: '2026-07-12',
    company: 'Agency',
    title: 'AI Delivery Engineer',
    canonicalUrl: canonicalizeListingUrl('https://agency.example.org/jobs/44'),
    identityFingerprint: identityFingerprint({
      company: 'Agency',
      title: 'AI Delivery Engineer',
    }),
    contentFingerprint: fingerprintText(body),
  },
  {
    url: 'https://jobs.example.org/acme/3',
    date: '2026-07-20',
    company: 'Acme',
    title: 'Senior AI Engineer',
    canonicalUrl: canonicalizeListingUrl('https://jobs.example.org/acme/3'),
    identityFingerprint: identity,
    contentFingerprint: fingerprintText(changed),
  },
];
const events = detectListingEvents(rows, {
  now: Date.UTC(2026, 6, 26),
});
assert.ok(events.some((event) => event.kind === 'relisted'));
assert.ok(events.some((event) => event.kind === 'cross_listing'));
assert.ok(events.some((event) => event.kind === 'materially_changed'));
assert.match(renderRepostSummary(events), /cross_listing/);

const parsed = parseFingerprintHistory(
  [
    'url\tfirst_seen\tcompany\ttitle\tstatus\tcanonical_url\tidentity_fingerprint\tcontent_fingerprint',
    `https://jobs.example.org/1\t2026-07-01\tAcme\tAI Engineer\tadded\thttps://jobs.example.org/1\t${identity}\t${fingerprintText(body)}`,
  ].join('\n'),
);
assert.equal(parsed.length, 1);
assert.equal(parsed[0].company, 'Acme');
assert.deepEqual(parseFingerprintHistory(''), []);

console.log('repost detection regression tests pass');

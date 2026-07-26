#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  buildScanFilter,
  inferAnnualSalary,
  validateScanFilters,
} from './scan-policy.mjs';

assert.deepEqual(
  inferAnnualSalary({
    salaryMin: 140_000,
    salaryMax: 180_000,
    salaryCurrency: 'usd',
    salaryInterval: 'year',
  }),
  {
    min: 140_000,
    max: 180_000,
    currency: 'USD',
    source: 'provider',
  },
);
assert.deepEqual(
  inferAnnualSalary({
    description: 'The range is €120,000 – €150,000 per year.',
  }),
  {
    min: 120_000,
    max: 150_000,
    currency: 'EUR',
    source: 'description',
  },
);
assert.equal(inferAnnualSalary({ description: '$50-$70 hourly' }), null);
assert.deepEqual(validateScanFilters({ salary: { unknown: 'maybe' } }), [
  'salary.unknown must be allow or reject',
]);
assert.deepEqual(validateScanFilters({ cooldown_days: -1 }), [
  'cooldown_days must be a non-negative number',
]);

const now = Date.UTC(2026, 6, 26);
const filter = buildScanFilter(
  {
    company_blacklist: ['Bad Corp'],
    title_blacklist: ['intern'],
    seniority: { include: ['senior', 'staff'], exclude: ['manager'] },
    description: {
      include: ['customer'],
      exclude: ['unpaid'],
      unknown: 'reject',
    },
    salary: {
      min_annual: 130_000,
      currencies: ['USD'],
      unknown: 'reject',
    },
    posting: { max_age_days: 30, unknown: 'reject' },
    visa: { exclude_no_sponsorship: true, unknown: 'allow' },
  },
  { now: () => now },
);

assert.deepEqual(
  filter({
    company: 'Acme',
    title: 'Senior AI Engineer',
    description:
      'Partner with every customer. Visa sponsorship is available. USD $140,000 - $180,000.',
    postedAt: now - 5 * 86_400_000,
  }).reasons,
  [],
);

const rejected = filter({
  company: 'Bad Corp',
  title: 'Junior Engineering Manager Intern',
  description:
    'This unpaid role cannot provide visa sponsorship. USD $80,000 - $100,000.',
  postedAt: now - 90 * 86_400_000,
});
assert.deepEqual(rejected.reasons.sort(), [
  'company_blacklist',
  'description_term_excluded',
  'description_terms_missing',
  'posting_too_old',
  'salary_below_minimum',
  'seniority_excluded',
  'seniority_not_included',
  'title_blacklist',
  'visa_sponsorship_unavailable',
]);

const unknown = filter({
  company: 'Acme',
  title: 'Senior AI Engineer',
});
assert.deepEqual(unknown.reasons.sort(), [
  'description_unknown',
  'posting_date_unknown',
  'salary_unknown',
]);

console.log('rich scan filter regression tests pass');

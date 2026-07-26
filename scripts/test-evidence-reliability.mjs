#!/usr/bin/env node

import assert from 'node:assert/strict';
import { classifyEvidenceReliability } from './evidence-reliability.mjs';

assert.equal(classifyEvidenceReliability().tier, 'unknown');
assert.equal(
  classifyEvidenceReliability({
    sources: [{ kind: 'job_board_listing', label: 'Board' }],
  }).tier,
  'inferred',
);
assert.equal(
  classifyEvidenceReliability({
    sources: [{ kind: 'government_statistics', label: 'BLS' }],
  }).tier,
  'reliable_third_party',
);
assert.equal(
  classifyEvidenceReliability({
    subject: 'compensation',
    sources: [
      { kind: 'employer_posting', label: 'JD' },
      { kind: 'employee_report', label: 'Anonymous report' },
    ],
    conflicts: true,
  }).tier,
  'first_party',
);
assert.equal(
  classifyEvidenceReliability({
    sources: [{ kind: 'made_up_kind', url: 'javascript:alert(1)' }],
  }).sourceCount,
  0,
);
assert.equal(
  classifyEvidenceReliability({
    sources: [{ kind: 'reputable_media', url: 'https://example.com/story' }],
  }).sources[0].url,
  'https://example.com/story',
);

console.log('Evidence reliability tests passed');

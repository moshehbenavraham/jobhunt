#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  classifyInboundMessage,
  matchInboundMessage,
} from './inbound-match.mjs';

const rows = [
  {
    num: 10,
    company: 'Acme Corporation',
    role: 'Staff Platform Engineer',
    status: 'Applied',
    notes: 'Req R123456; https://acme.example/jobs/R123456',
  },
  {
    num: 11,
    company: 'Acme Corporation',
    role: 'AI Product Manager',
    status: 'Applied',
    notes: 'Req R999999; https://acme.example/jobs/R999999',
  },
  {
    num: 12,
    company: 'Other Co',
    role: 'Staff Platform Engineer',
    status: 'Rejected',
    notes: '',
  },
];

const invite = {
  id: 'message-1',
  from: 'Recruiter <person@acme.example>',
  subject: 'Interview for Staff Platform Engineer',
  body: 'Please select a time for Req R123456.',
  companyHint: 'Acme',
  roleHint: 'Staff Platform Engineer',
};
const result = matchInboundMessage(invite, rows);
assert.equal(result.classification, 'interview_invite');
assert.equal(result.match.applicationNum, 10);
assert.equal(result.match.confidence, 'high');
assert.equal(result.recommendedTransition.to, 'Interview');
assert.equal(result.mutationPerformed, false);

const ambiguous = matchInboundMessage(
  {
    id: 'message-2',
    from: 'Recruiter <person@shared-recruiting.example>',
    subject: 'Interview with Acme Corporation',
    body: 'We would like to talk.',
    companyHint: 'Acme Corporation',
    roleHint: '',
  },
  rows,
);
assert.equal(ambiguous.match, null);
assert.equal(
  ambiguous.conflict,
  'multiple tracker rows have the same evidence score',
);

assert.equal(
  classifyInboundMessage({
    id: 'message-3',
    subject: 'Application received',
    body: 'Thank you for applying.',
  }).recommendedStatus,
  'Applied',
);
assert.equal(
  classifyInboundMessage({
    id: 'message-4',
    subject: 'Job alert',
    body: 'Recommended jobs',
  }).recommendedStatus,
  null,
);

console.log('Inbound reply and invite matching tests passed');

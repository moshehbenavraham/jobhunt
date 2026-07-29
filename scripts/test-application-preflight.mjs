#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectApplicationAts,
  prepareApplicationPreflight,
} from './application-preflight.mjs';

assert.equal(
  detectApplicationAts('https://boards.greenhouse.io/acme/jobs/123'),
  'greenhouse',
);
assert.equal(
  detectApplicationAts('https://acme.wd5.myworkdayjobs.com/job/123'),
  'workday',
);

const root = mkdtempSync(join(tmpdir(), 'jobhunt-apply-preflight-'));
try {
  mkdirSync(join(root, 'data'), { recursive: true });
  mkdirSync(join(root, 'output'), { recursive: true });
  writeFileSync(
    join(root, 'data', 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      '| 7 | 2026-07-01 | Acme | Platform Engineer | 4.2/5 | Applied | Yes | [007](reports/007-acme.md) | |',
    ].join('\n'),
  );
  const pdf = join(root, 'output', 'cv-acme.pdf');
  writeFileSync(pdf, '%PDF-1.7\nfixture');
  writeFileSync(
    join(root, 'output', 'cv-acme.manifest.json'),
    JSON.stringify({ validation: { valid: true } }),
  );

  const snapshot = {
    schemaVersion: 1,
    url: 'https://boards.greenhouse.io/acme/jobs/123',
    pageTitle: 'Senior Platform Engineer — Acme',
    company: 'Acme',
    role: 'Senior Platform Engineer',
    fields: [
      {
        id: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        options: [],
        value: null,
      },
      {
        id: 'sponsorship',
        label: 'Will you require sponsorship?',
        type: 'radio',
        required: true,
        options: ['Yes', 'No'],
        value: null,
      },
      {
        id: 'privacy',
        label: 'I accept the privacy terms',
        type: 'checkbox',
        required: true,
        options: [],
        value: null,
      },
      {
        id: 'resume',
        label: 'Resume',
        type: 'file',
        required: true,
        options: [],
        value: null,
      },
    ],
  };
  const blocked = prepareApplicationPreflight({
    snapshot,
    profile: { candidate: { email: 'candidate@example.com' } },
    expected: { company: 'Acme', role: 'AI Product Manager' },
    files: ['output/cv-acme.pdf'],
    root,
  });
  assert.equal(blocked.readiness, 'blocked_for_missing_answers');
  assert.equal(blocked.guard.maySubmit, false);
  assert.equal(blocked.contextMatch.roleDrift, 'review_required');
  assert.equal(blocked.repeatCompany[0].warning, 'same-company-similar-role');
  assert.equal(blocked.consentFields[0].autoFillAllowed, false);
  assert.equal(blocked.files[0].validation, 'valid-and-fresh');

  const ready = prepareApplicationPreflight({
    snapshot,
    profile: { candidate: { email: 'candidate@example.com' } },
    answers: { sponsorship: 'No', privacy: false },
    root,
  });
  assert.equal(ready.readiness, 'ready_for_human_review');
  assert.equal(
    ready.preparedFields.find((field) => field.id === 'sponsorship').source,
    'explicit_user_answer',
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Application preflight tests passed');

#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendSalaryObservation,
  parseSalaryObservations,
  readSalaryObservations,
  SalaryObservationSchema,
} from './salary-observations.mjs';

const root = mkdtempSync(join(tmpdir(), 'jobhunt-salary-observations-'));
try {
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(
    join(root, 'data', 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      '| 42 | 2026-07-20 | Acme | Platform Engineer | 4.4/5 | Offer | No | [042](reports/042-acme.md) | |',
      '',
    ].join('\n'),
  );
  const base = {
    schemaVersion: 1,
    date: '2026-07-26',
    appNum: 42,
    company: 'Acme',
    type: 'desired',
    amountMin: 180000,
    amountMax: 200000,
    currency: 'USD',
    period: 'annual',
    source: 'candidate',
    sourceRef: 'candidate target stated in this session',
    note: '',
    round: '',
    interviewer: '',
  };
  await appendSalaryObservation({ root, observation: base });
  await appendSalaryObservation({
    root,
    observation: {
      ...base,
      type: 'advertised',
      amountMin: 170000,
      amountMax: 190000,
      source: 'job_description',
      sourceRef: 'reports/042-acme.md',
    },
  });
  await appendSalaryObservation({
    root,
    observation: {
      ...base,
      type: 'stated',
      amountMin: 185000,
      amountMax: null,
      source: 'recruiter_verbal',
      sourceRef: 'candidate note after recruiter screen',
      round: 'recruiter screen',
      interviewer: 'Recruiter',
    },
  });
  const result = readSalaryObservations({ root });
  assert.equal(result.applications[0].gap.minDifference, -10000);
  assert.equal(result.applications[0].statedHistory.length, 1);
  assert.equal(result.dataQuality.conversionsPerformed, false);
  await assert.rejects(
    appendSalaryObservation({ root, observation: base }),
    /already exists/,
  );
  assert.throws(
    () =>
      SalaryObservationSchema.parse({
        ...base,
        type: 'stated',
      }),
    /requires the round/,
  );
  const ledger = readFileSync(
    join(root, 'data', 'salary-observations.tsv'),
    'utf8',
  );
  const parsed = parseSalaryObservations(`${ledger}bad\trow\n`);
  assert.equal(parsed.observations.length, 3);
  assert.equal(parsed.malformed.length, 1);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Append-only no-conversion salary observation tests passed');

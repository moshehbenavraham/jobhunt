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
import { parseNextOverrides } from './followup-cadence.mjs';
import { seedFollowup } from './followup-seed.mjs';
import { setTrackerStatus } from './set-status.mjs';

const root = mkdtempSync(join(tmpdir(), 'jobhunt-followup-seed-'));
try {
  mkdirSync(join(root, 'data'), { recursive: true });
  mkdirSync(join(root, 'templates'), { recursive: true });
  writeFileSync(
    join(root, 'templates', 'states.yml'),
    [
      'states:',
      '  - id: evaluated',
      '    label: Evaluated',
      '    aliases: []',
      '  - id: applied',
      '    label: Applied',
      '    aliases: []',
    ].join('\n'),
  );
  writeFileSync(
    join(root, 'data', 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      '| 1 | 2026-07-01 | Acme | Engineer | 4.2/5 | Applied | Yes | [001](reports/001-acme.md) | |',
      '| 2 | 2026-07-01 | Beta | Engineer | 4.1/5 | Evaluated | Yes | [002](reports/002-beta.md) | |',
    ].join('\n'),
  );
  const seeded = await seedFollowup({
    root,
    appNum: 1,
    appliedDate: '2026-07-10',
    days: 7,
  });
  assert.equal(seeded.nextDate, '2026-07-17');
  assert.equal(seeded.seeded, true);
  const again = await seedFollowup({
    root,
    appNum: 1,
    appliedDate: '2026-07-10',
  });
  assert.equal(again.seeded, false);
  const content = readFileSync(join(root, 'data', 'follow-ups.md'), 'utf8');
  assert.equal(parseNextOverrides(content).get(1).variant, 'standard');
  await assert.rejects(
    seedFollowup({ root, appNum: 2, appliedDate: '2026-07-10' }),
    /not Applied/,
  );
  const transitioned = await setTrackerStatus({
    root,
    selector: '#2',
    state: 'Applied',
    appliedDate: '2026-07-22',
  });
  assert.equal(transitioned.followupSeed.seeded, true);
  assert.equal(transitioned.followupSeed.nextDate, '2026-07-29');
  const variant = await seedFollowup({
    root,
    appNum: 1,
    appliedDate: '2026-07-20',
    days: 1,
    variant: 'no_show',
    force: true,
  });
  assert.equal(variant.variant, 'no_show');
  assert.equal(
    parseNextOverrides(
      readFileSync(join(root, 'data', 'follow-ups.md'), 'utf8'),
    ).get(1).nextDate,
    '2026-07-21',
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Follow-up seeding tests passed');

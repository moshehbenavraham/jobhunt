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
  ApplicationEmailDraftSchema,
  runApplicationEmailCli,
} from './application-email.mjs';

const root = mkdtempSync(join(tmpdir(), 'jobhunt-email-'));
try {
  mkdirSync(join(root, 'config'), { recursive: true });
  mkdirSync(join(root, 'modes'), { recursive: true });
  mkdirSync(join(root, 'profile'), { recursive: true });
  mkdirSync(join(root, 'reports'), { recursive: true });
  writeFileSync(
    join(root, 'config', 'profile.yml'),
    'candidate:\n  full_name: Jane Smith\n  email: jane@example.com\n',
  );
  writeFileSync(
    join(root, 'modes', '_profile.md'),
    '# Voice\n\nUse direct, concrete language.\n',
  );
  writeFileSync(
    join(root, 'profile', 'cv.md'),
    '# CV\n\nBuilt production AI systems.\n',
  );
  const draft = {
    schemaVersion: 1,
    reportId: '042',
    kind: 'hr_application',
    company: 'Example AI',
    role: 'Staff Engineer',
    recipientName: null,
    recipientEmail: null,
    subject: 'Application — Staff Engineer',
    greeting: 'Hello hiring team,',
    paragraphs: [
      {
        text: 'I am applying for the Staff Engineer role.',
        evidenceIds: ['voice'],
      },
      {
        text: 'I have built production AI systems.',
        evidenceIds: ['cv'],
      },
    ],
    signOff: 'Best,',
    evidence: [
      {
        id: 'voice',
        source: 'modes/_profile.md',
        sourceText: 'Use direct, concrete language.',
      },
      {
        id: 'cv',
        source: 'profile/cv.md',
        sourceText: 'Built production AI systems.',
      },
    ],
    sourceFiles: ['config/profile.yml', 'modes/_profile.md', 'profile/cv.md'],
    attachments: [],
    humanReviewRequired: true,
    sendPerformedByTool: false,
  };
  writeFileSync(join(root, 'draft.json'), JSON.stringify(draft));
  assert.equal(
    await runApplicationEmailCli([`--input=${join(root, 'draft.json')}`], {
      root,
    }),
    0,
  );
  const artifact = readFileSync(
    join(root, 'reports', '042-example-ai.application-email.md'),
    'utf8',
  );
  assert.match(artifact, /Sent by tool:\*\* no/);
  assert.match(artifact, /jane@example.com/);
  const manifest = JSON.parse(
    readFileSync(
      join(root, 'reports', '042-example-ai.application-email.json'),
      'utf8',
    ),
  );
  assert.equal(manifest.sendPerformedByTool, false);
  assert.throws(
    () =>
      ApplicationEmailDraftSchema.parse({
        ...draft,
        sendPerformedByTool: true,
      }),
    /false/,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Application email draft tests passed');

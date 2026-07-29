#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createInterviewSession,
  InterviewSessionSchema,
} from './interview-session.mjs';

const root = mkdtempSync(join(tmpdir(), 'jobhunt-interview-session-'));
try {
  mkdirSync(join(root, 'interview-prep', 'sessions'), { recursive: true });
  const transcript =
    'Interviewer: Tell me about a difficult migration.\nCandidate: I moved the platform in stages and added rollback gates.\n';
  writeFileSync(
    join(root, 'interview-prep', 'sessions', 'acme-transcript.txt'),
    transcript,
  );
  const evidence = {
    source: 'interview_transcript',
    reference: 'interview-prep/sessions/acme-transcript.txt',
    excerpt: 'I moved the platform in stages and added rollback gates.',
    url: null,
  };
  const common = {
    schemaVersion: 1,
    company: 'Acme',
    role: 'Platform Engineer',
    trackerNum: 42,
    round: {
      type: 'panel',
      scheduledAt: '2026-07-26T12:00:00+03:00',
    },
    panel: [],
    redFlags: [],
    storyCandidates: [],
    humanReviewRequired: true,
  };
  const plan = await createInterviewSession({
    root,
    input: {
      ...common,
      sessionId: 'acme-plan-01',
      kind: 'plan',
      strengths: ['Verified platform architecture experience.'],
      gaps: [
        {
          topic: 'Rust depth',
          priority: 'high',
          evidence: {
            source: 'job_description',
            reference: 'jds/acme.md line 14',
            excerpt: 'Production Rust experience required.',
            url: null,
          },
        },
      ],
      blocks: [
        {
          title: 'Lock the narrative',
          minutes: 30,
          goal: 'Practice the sourced background pitch.',
        },
      ],
      quickReview: ['Lead with the verified platform migration.'],
    },
  });
  assert.match(
    readFileSync(join(root, plan.session), 'utf8'),
    /Time-Blocked Plan/,
  );
  const practice = await createInterviewSession({
    root,
    input: {
      ...common,
      sessionId: 'acme-practice-01',
      kind: 'practice',
      exchanges: [
        {
          question: 'How do you de-risk a platform migration?',
          answer: 'I stage the migration and define rollback gates.',
          competency: 'migration leadership',
          status: 'solid',
          landed: ['Named a concrete safety mechanism.'],
          sharpen: ['Connect the mechanism to a verified outcome.'],
          claimReview: 'candidate_confirmed',
        },
      ],
    },
  });
  assert.match(
    readFileSync(join(root, practice.session), 'utf8'),
    /Practice Exchanges/,
  );
  const input = {
    schemaVersion: 1,
    sessionId: 'acme-debrief-01',
    kind: 'debrief',
    company: 'Acme',
    role: 'Platform Engineer',
    trackerNum: 42,
    round: {
      type: 'panel',
      scheduledAt: '2026-07-26T12:00:00+03:00',
    },
    panel: [
      {
        name: 'Jordan',
        role: 'VP Engineering',
        audienceTag: 'hiring_manager',
        decisionWeight: 'primary',
        careerSignal: 'Owns the reporting line in the supplied invite.',
        closingQuestion: 'What result would define a strong first six months?',
        evidence: [
          {
            source: 'candidate_note',
            reference: 'pasted interview invite',
            excerpt: 'You will meet Jordan, VP Engineering.',
            url: null,
          },
        ],
      },
    ],
    redFlags: [
      {
        dimension: 'scope',
        status: 'watch',
        severity: 'medium',
        signal: 'Ownership described differently by two panelists.',
        evidence: [evidence],
        candidateReview: 'pending',
      },
      {
        dimension: 'culture',
        status: 'unknown',
        severity: 'unknown',
        signal: 'Not enough direct evidence yet.',
        evidence: [],
        candidateReview: 'pending',
      },
    ],
    storyCandidates: [
      {
        title: 'Staged platform migration',
        situation: 'A platform migration carried rollback risk.',
        task: 'Move production safely.',
        action: 'Migrated in stages and added rollback gates.',
        result: 'The migration completed without an unrecoverable cutover.',
        reflection: 'Instrument rollback criteria earlier.',
        evidence: [evidence],
      },
    ],
    humanReviewRequired: true,
    transcriptPath: 'interview-prep/sessions/acme-transcript.txt',
    transcriptEvidence: [evidence],
    wentWell: ['The answer named a concrete risk-control mechanism.'],
    gaps: ['The business outcome needs a more precise source.'],
    followUps: ['Send a candidate-reviewed thank-you draft.'],
  };

  const created = await createInterviewSession({ root, input });
  assert.equal(created.realTimeInterviewAssistance, false);
  assert.equal(created.storiesAppended, 0);
  assert.equal(existsSync(join(root, created.session)), true);
  const snapshot = JSON.parse(
    readFileSync(join(root, created.snapshot), 'utf8'),
  );
  assert.equal(snapshot.artifact.transcriptSha256.length, 64);
  assert.match(
    readFileSync(join(root, created.session), 'utf8'),
    /Panel Intel/,
  );
  assert.equal(
    existsSync(join(root, 'interview-prep', 'story-bank.md')),
    false,
  );

  await assert.rejects(
    createInterviewSession({ root, input }),
    /Refusing to overwrite/,
  );
  const accepted = await createInterviewSession({
    root,
    input,
    force: true,
    acceptStoryUpdates: true,
  });
  assert.equal(accepted.storiesAppended, 1);
  const storyBank = readFileSync(
    join(root, 'interview-prep', 'story-bank.md'),
    'utf8',
  );
  assert.match(storyBank, /Staged platform migration/);
  const repeated = await createInterviewSession({
    root,
    input,
    force: true,
    acceptStoryUpdates: true,
  });
  assert.equal(repeated.storiesAppended, 0);

  await assert.rejects(
    createInterviewSession({
      root,
      input: {
        ...input,
        sessionId: 'bad-excerpt',
        transcriptEvidence: [{ ...evidence, excerpt: 'This was never said.' }],
      },
    }),
    /occur exactly/,
  );
  assert.throws(
    () =>
      InterviewSessionSchema.parse({
        ...input,
        redFlags: [
          {
            ...input.redFlags[1],
            evidence: [evidence],
          },
        ],
      }),
    /unknown signals/,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Interview plan/practice/debrief and intelligence tests passed');

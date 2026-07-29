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
import * as yaml from 'js-yaml';
import { RISK_LABELS } from './evaluation-summary.mjs';
import {
  aggregateGapEvidence,
  buildAggregateUpskillReport,
  buildTargetedUpskillReport,
  writeUpskillReport,
} from './upskill-report.mjs';

const root = mkdtempSync(join(tmpdir(), 'jobhunt-upskill-report-'));
try {
  mkdirSync(join(root, 'reports'), { recursive: true });
  mkdirSync(join(root, 'jds'), { recursive: true });
  mkdirSync(join(root, 'profile'), { recursive: true });
  const riskSummary = Object.fromEntries(
    Object.keys(RISK_LABELS).map((key) => [
      key,
      {
        status: key === 'legitimacy' ? 'clear' : 'not_evaluated',
        severity: key === 'legitimacy' ? 'none' : 'unknown',
        source: key === 'legitimacy' ? 'live_posting' : 'not_available',
        evidence: key === 'legitimacy' ? 'Live first-party posting.' : null,
      },
    ]),
  );
  const summary = {
    schema_version: 1,
    report_id: '042',
    date: '2026-07-26',
    url: 'https://example.com/jobs/42',
    company: 'Acme',
    role: 'Platform Engineer',
    score: 3.4,
    dimension_scores: {
      cv_match: 3.5,
      north_star_alignment: 4,
      compensation: 3,
      culture_working_model: 3.5,
      red_flag_adjustment: -0.5,
    },
    legitimacy_tier: 'High Confidence',
    archetype: 'Platform Builder',
    final_decision: 'consider',
    risk_level: 'medium',
    confidence: 'high',
    next_action: 'Verify the gap before applying.',
    hard_stops: ['Production Rust ownership'],
    soft_gaps: ['Formal FinOps experience'],
    top_strengths: ['Platform architecture'],
    discard_reasons: [],
    via: null,
    company_confidential: false,
    advertised_comp: null,
    output_language: 'en',
    market_ruleset: 'us',
    company_evidence: {
      tier: 'first_party',
      conflicts: false,
      sources: [
        {
          kind: 'employer_site',
          label: 'Acme careers',
          url: 'https://example.com/jobs/42',
        },
      ],
    },
    compensation_evidence: {
      tier: 'unknown',
      conflicts: false,
      sources: [],
    },
    risk_summary: riskSummary,
  };
  writeFileSync(
    join(root, 'reports', '042-acme.md'),
    `## Machine Summary\n\n\`\`\`yaml\n${yaml.dump(summary)}\`\`\`\n`,
  );
  writeFileSync(
    join(root, 'reports', '042-acme.skill-gap.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      sources: { jdPath: 'jds/acme.md' },
      requirements: [
        {
          skill: 'Rust',
          importance: 'must-have',
          classification: 'gap',
        },
      ],
    })}\n`,
  );
  const aggregate = buildAggregateUpskillReport(root);
  assert.equal(aggregate.dataQuality.machineSummaries, 1);
  assert.ok(
    aggregate.gaps.some(
      (item) => item.requirement === 'Production Rust ownership',
    ),
  );
  assert.ok(aggregate.gaps.some((item) => item.requirement === 'Rust'));
  const deduped = aggregateGapEvidence([
    {
      requirement: 'Rust',
      kind: 'hard_stop',
      sourcePath: 'reports/1.md',
      weight: 2,
    },
    {
      requirement: 'rust',
      kind: 'hard_stop',
      sourcePath: 'reports/1.md',
      weight: 2,
    },
  ]);
  assert.equal(deduped[0].sources.length, 1);

  writeFileSync(
    join(root, 'jds', 'target.md'),
    '## Requirements\n- Python and Kubernetes\n- Rust required\n',
  );
  writeFileSync(join(root, 'profile', 'cv.md'), '# Skills\nPython\n');
  const targeted = buildTargetedUpskillReport({
    root,
    jdPath: 'jds/target.md',
  });
  assert.equal(targeted.mode, 'targeted');
  assert.ok(targeted.gaps.some((item) => item.requirement === 'Rust'));
  const written = await writeUpskillReport({ root, report: aggregate });
  assert.match(
    readFileSync(join(root, written.report), 'utf8'),
    /Source links are retained/,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Aggregate and single-JD exact upskill report tests passed');

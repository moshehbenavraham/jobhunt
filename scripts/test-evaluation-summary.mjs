#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createEvaluationSummaryJsonSchema,
  parseEvaluationSummary,
  validateEvaluationReport,
} from './evaluation-summary.mjs';

const summary = {
  schema_version: 1,
  report_id: '042',
  date: '2026-07-26',
  url: 'https://jobs.example.com/roles/42',
  company: 'Example AI',
  role: 'Staff AI Engineer',
  score: 4.2,
  dimension_scores: {
    cv_match: 4.5,
    north_star_alignment: 4.5,
    compensation: 4,
    culture_working_model: 3.5,
    red_flag_adjustment: -0.3,
  },
  legitimacy_tier: 'High Confidence',
  archetype: 'AI Platform / LLMOps',
  final_decision: 'apply',
  risk_level: 'low',
  confidence: 'high',
  next_action: 'Tailor the CV and apply.',
  hard_stops: [],
  soft_gaps: ['No direct Rust production evidence'],
  top_strengths: ['Production AI delivery'],
  discard_reasons: [],
  via: null,
  company_confidential: false,
  advertised_comp: '$180,000-$220,000 base',
  output_language: 'en',
  market_ruleset: 'us',
  company_evidence: {
    tier: 'first_party',
    conflicts: false,
    sources: [
      {
        kind: 'employer_site',
        label: 'Employer careers page',
        url: 'https://jobs.example.com/roles/42',
      },
    ],
  },
  compensation_evidence: {
    tier: 'first_party',
    conflicts: false,
    sources: [
      {
        kind: 'job_description',
        label: 'Published salary band',
        url: 'https://jobs.example.com/roles/42',
      },
    ],
  },
  risk_summary: {},
};

const riskSources = {
  legitimacy: [
    'clear',
    'none',
    'live_posting',
    'Live apply control and full JD',
  ],
  remote_contradiction: [
    'clear',
    'none',
    'job_description',
    'Remote terms agree',
  ],
  employment_classification: [
    'clear',
    'none',
    'job_description',
    'Employee role',
  ],
  compensation_reliability: [
    'clear',
    'none',
    'job_description',
    'Base band explicit',
  ],
  ai_infrastructure: [
    'clear',
    'none',
    'job_description',
    'Infrastructure matches claims',
  ],
  country_benefit_terminology: [
    'clear',
    'none',
    'job_description',
    'US terms are consistent',
  ],
  third_party_tags: ['not_evaluated', 'unknown', 'not_available', null],
  culture: ['clear', 'none', 'employer_site', 'Working model is explicit'],
  interview_redflags: ['not_evaluated', 'unknown', 'not_available', null],
};
for (const [key, [status, severity, source, evidence]] of Object.entries(
  riskSources,
)) {
  summary.risk_summary[key] = { status, severity, source, evidence };
}

const yaml = JSON.stringify(summary, null, 2);
const row = (label, status, source) => `| ${label} | ${status} | ${source} |`;
const report = `# Evaluation: Example AI — Staff AI Engineer

**Date:** 2026-07-26
**URL:** https://jobs.example.com/roles/42
**Archetype:** AI Platform / LLMOps
**Score:** 4.2/5
**Legitimacy:** High Confidence
**PDF:** pending

---

## Machine Summary

\`\`\`yaml
${yaml}
\`\`\`

## A) Role Summary

Content.

## Risk Summary

| Signal | Status | Source |
| --- | --- | --- |
${row('Posting legitimacy', '✅ clear — High Confidence', 'live posting')}
${row('Remote/location contradiction', '✅ clear', 'JD')}
${row('Employment classification', '✅ clear', 'JD')}
${row('Compensation reliability', '✅ clear', 'JD')}
${row('AI claims vs. infrastructure', '✅ clear', 'JD')}
${row('Country/benefit terminology', '✅ clear', 'JD')}
${row('Third-party tags', '— not evaluated', 'not available')}
${row('Culture screen', '✅ clear', 'employer site')}
${row('Interview red flags', '— no interview sessions yet', 'not available')}
`;

assert.equal(parseEvaluationSummary(report).report_id, '042');
const validResult = validateEvaluationReport(report);
assert.equal(validResult.valid, true, validResult.issues.join('\n'));
assert.equal(createEvaluationSummaryJsonSchema().type, 'object');

const badHeader = report.replace('**Score:** 4.2/5', '**Score:** 4.8/5');
const headerResult = validateEvaluationReport(badHeader);
assert.equal(headerResult.valid, false);
assert.match(headerResult.issues.join('\n'), /header Score mismatch/);

const badRisk = report.replace(
  '| Compensation reliability | ✅ clear |',
  '| Compensation reliability | ⚠️ flagged |',
);
assert.match(
  validateEvaluationReport(badRisk).issues.join('\n'),
  /Compensation reliability/,
);

assert.throws(
  () =>
    parseEvaluationSummary(
      report.replace(
        '"source": "not_available"',
        '"source": "model_inference"',
      ),
    ),
  /not_evaluated risks need source/,
);

console.log('Evaluation summary tests passed');

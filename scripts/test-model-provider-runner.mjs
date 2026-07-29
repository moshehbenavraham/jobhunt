#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildProviderPrompts,
  redactProviderError,
  runProviderEvaluation,
  saveProviderEvaluation,
} from './model-provider-runner.mjs';

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
  legitimacy_tier: 'Proceed with Caution',
  archetype: 'AI Platform / LLMOps',
  final_decision: 'research_first',
  risk_level: 'medium',
  confidence: 'medium',
  next_action: 'Verify the live posting before deciding.',
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
    tier: 'inferred',
    conflicts: false,
    sources: [
      {
        kind: 'job_description',
        label: 'User-supplied job description',
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
  risk_summary: {
    legitimacy: {
      status: 'flagged',
      severity: 'medium',
      source: 'job_description',
      evidence: 'Live posting was not verified by this read-only runner',
    },
    remote_contradiction: {
      status: 'clear',
      severity: 'none',
      source: 'job_description',
      evidence: 'Remote terms agree',
    },
    employment_classification: {
      status: 'clear',
      severity: 'none',
      source: 'job_description',
      evidence: 'Employee role',
    },
    compensation_reliability: {
      status: 'clear',
      severity: 'none',
      source: 'job_description',
      evidence: 'Base band explicit',
    },
    ai_infrastructure: {
      status: 'clear',
      severity: 'none',
      source: 'job_description',
      evidence: 'Infrastructure matches claims',
    },
    country_benefit_terminology: {
      status: 'clear',
      severity: 'none',
      source: 'job_description',
      evidence: 'US terms are consistent',
    },
    third_party_tags: {
      status: 'not_evaluated',
      severity: 'unknown',
      source: 'not_available',
      evidence: null,
    },
    culture: {
      status: 'not_evaluated',
      severity: 'unknown',
      source: 'not_available',
      evidence: null,
    },
    interview_redflags: {
      status: 'not_evaluated',
      severity: 'unknown',
      source: 'not_available',
      evidence: null,
    },
  },
};

const row = (label, status, source) => `| ${label} | ${status} | ${source} |`;
const report = `# Evaluation: Example AI — Staff AI Engineer

**Date:** 2026-07-26
**URL:** https://jobs.example.com/roles/42
**Archetype:** AI Platform / LLMOps
**Score:** 4.2/5
**Legitimacy:** Proceed with Caution
**PDF:** pending

---

## Machine Summary

\`\`\`yaml
${JSON.stringify(summary, null, 2)}
\`\`\`

## A) Role Summary

Draft content for human review.

## Risk Summary

| Signal | Status | Source |
| --- | --- | --- |
${row('Posting legitimacy', '⚠️ flagged', 'user-supplied JD only')}
${row('Remote/location contradiction', '✅ clear', 'JD')}
${row('Employment classification', '✅ clear', 'JD')}
${row('Compensation reliability', '✅ clear', 'JD')}
${row('AI claims vs. infrastructure', '✅ clear', 'JD')}
${row('Country/benefit terminology', '✅ clear', 'JD')}
${row('Third-party tags', '— not evaluated', 'not available')}
${row('Culture screen', '— not evaluated', 'not available')}
${row('Interview red flags', '— no interview sessions yet', 'not available')}
`;

const context = {
  shared: 'Shared invariant: never invent facts.',
  profileMode: 'Candidate-specific facts.',
  offerMode: 'Evaluate in blocks A-G.',
  profileYaml:
    'spend_tier: standard\nlanguage:\n  output: en\nmarket:\n  ruleset: us\n',
  cv: '# CV\n\nVerified experience.',
  articleDigest: '',
  policy: {
    outputLanguage: 'en',
    market: { ruleset: 'us', country: 'United States' },
  },
};
const jdText =
  'Example AI seeks a Staff AI Engineer to own production model infrastructure, reliability, evaluation, and platform delivery. The published base salary is $180,000-$220,000.';

function response(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  };
}

async function evaluate(provider, body, env, extra = {}) {
  let request;
  const result = await runProviderEvaluation({
    provider,
    model: provider === 'openrouter' ? 'vendor/model-free' : 'model-test',
    jdText,
    postingUrl: summary.url,
    reportId: summary.report_id,
    date: summary.date,
    context,
    env,
    fetchImpl: async (url, init) => {
      request = { url, init };
      return response(body);
    },
    ...extra,
  });
  return { request, result };
}

const prompts = buildProviderPrompts({
  context,
  jdText,
  postingUrl: summary.url,
  reportId: summary.report_id,
  date: summary.date,
});
assert.match(prompts.systemPrompt, /read-only evaluation worker/);
assert.match(prompts.systemPrompt, /human must review/i);
assert.match(prompts.systemPrompt, /Do not claim to update the tracker/);

const gemini = await evaluate(
  'gemini',
  {
    candidates: [
      { content: { parts: [{ text: `\`\`\`markdown\n${report}\n\`\`\`` }] } },
    ],
    usageMetadata: {
      promptTokenCount: 120,
      candidatesTokenCount: 40,
      totalTokenCount: 160,
    },
  },
  { GEMINI_API_KEY: 'gemini-test-secret' },
);
assert.match(gemini.request.url, /generativelanguage\.googleapis\.com/);
assert.equal(gemini.request.init.redirect, 'error');
assert.equal(
  gemini.request.init.headers['x-goog-api-key'],
  'gemini-test-secret',
);
assert.equal(gemini.result.usage.totalTokens, 160);
assert.equal(gemini.result.summary.final_decision, 'research_first');

const ollama = await evaluate(
  'ollama',
  {
    message: { content: report },
    prompt_eval_count: 80,
    eval_count: 30,
  },
  {},
);
assert.equal(ollama.request.url, 'http://127.0.0.1:11434/api/chat');
assert.equal(ollama.result.usage.totalTokens, 110);
await assert.rejects(
  runProviderEvaluation({
    provider: 'ollama',
    model: 'model-test',
    jdText,
    postingUrl: summary.url,
    reportId: summary.report_id,
    date: summary.date,
    context,
    env: { OLLAMA_BASE_URL: 'https://remote.example.com' },
    fetchImpl: async () => response({}),
  }),
  /loopback|localhost/,
);

const openrouter = await evaluate(
  'openrouter',
  {
    choices: [{ message: { content: report } }],
    usage: { prompt_tokens: 90, completion_tokens: 35, total_tokens: 125 },
  },
  { OPENROUTER_API_KEY: 'sk-or-v1-test-secret' },
);
assert.equal(
  openrouter.request.url,
  'https://openrouter.ai/api/v1/chat/completions',
);
assert.equal(openrouter.result.usage.inputTokens, 90);
assert.match(openrouter.request.init.headers.authorization, /^Bearer /);

await assert.rejects(
  runProviderEvaluation({
    provider: 'openrouter',
    model: 'vendor/model',
    jdText,
    postingUrl: summary.url,
    reportId: summary.report_id,
    date: summary.date,
    context,
    env: { OPENROUTER_API_KEY: 'sk-or-v1-do-not-print' },
    fetchImpl: async () =>
      response(
        { error: { message: 'bad key sk-or-v1-do-not-print' } },
        { ok: false, status: 401 },
      ),
  }),
  (error) =>
    /REDACTED/.test(error.message) &&
    !error.message.includes('sk-or-v1-do-not-print'),
);
assert.equal(
  redactProviderError('Bearer abc123 and AIzaSecret', ['abc123']),
  'Bearer [REDACTED] and [REDACTED]',
);

await assert.rejects(
  runProviderEvaluation({
    provider: 'gemini',
    model: 'model-test',
    jdText,
    postingUrl: summary.url,
    reportId: summary.report_id,
    date: summary.date,
    context,
    env: { GEMINI_API_KEY: 'test-key' },
    fetchImpl: async () =>
      response({
        candidates: [{ content: { parts: [{ text: '# invalid' }] } }],
      }),
  }),
  /canonical evaluation contract/,
);
await assert.rejects(
  runProviderEvaluation({
    provider: 'gemini',
    model: 'model-test',
    jdText,
    postingUrl: 'https://user:password@jobs.example.com/roles/42',
    reportId: summary.report_id,
    date: summary.date,
    context,
    env: { GEMINI_API_KEY: 'test-key' },
    fetchImpl: async () => response({}),
  }),
  /credentials/,
);

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-runner-'));
try {
  mkdirSync(join(sandbox, 'reports'), { recursive: true });
  const saved = await saveProviderEvaluation({
    root: sandbox,
    output: 'reports/042-example-ai.md',
    result: gemini.result,
  });
  assert.equal(readFileSync(saved.reportPath, 'utf8'), `${report.trim()}\n`);
  const manifest = JSON.parse(readFileSync(saved.manifestPath, 'utf8'));
  assert.equal(manifest.usage.totalTokens, 160);
  assert.equal(manifest.invariants.humanReviewRequired, true);
  assert.equal(manifest.invariants.trackerUpdated, false);
  assert.equal(manifest.invariants.pdfGenerated, false);
  assert.equal(manifest.invariants.applicationSubmitted, false);
  assert.equal(manifest.invariants.messageSent, false);
  await assert.rejects(
    saveProviderEvaluation({
      root: sandbox,
      output: '../outside.md',
      result: gemini.result,
    }),
    /escapes|inside/,
  );
  const outside = mkdtempSync(join(tmpdir(), 'jobhunt-runner-outside-'));
  try {
    symlinkSync(outside, join(sandbox, 'reports', 'escape'));
    await assert.rejects(
      saveProviderEvaluation({
        root: sandbox,
        output: 'reports/escape/042-bad.md',
        result: gemini.result,
      }),
      /symlink|resolves outside/,
    );
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('model provider runner tests pass');

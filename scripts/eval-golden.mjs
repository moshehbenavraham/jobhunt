#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GOLDEN_EVAL_SCHEMA_VERSION = 1;

function safeModelId(model) {
  return String(model || 'cheap-stub')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readJsonFiles(directory) {
  if (!existsSync(directory))
    throw new Error(`directory not found: ${directory}`);
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`directory must be a real directory: ${directory}`);
  }
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const path = resolve(directory, name);
      const fileStat = lstatSync(path);
      if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
        throw new Error(`fixture must be a regular non-symlink file: ${path}`);
      }
      return { name, value: JSON.parse(readFileSync(path, 'utf8')) };
    });
}

function validateCase(value, name) {
  if (
    value?.schema_version !== GOLDEN_EVAL_SCHEMA_VERSION ||
    typeof value.id !== 'string' ||
    !/^[a-z0-9][a-z0-9-]*$/.test(value.id) ||
    typeof value.jd !== 'string' ||
    value.jd.length < 100 ||
    typeof value.expected?.archetype !== 'string' ||
    !Number.isFinite(value.expected?.score) ||
    typeof value.expected?.final_decision !== 'string' ||
    typeof value.expected?.legitimacy_tier !== 'string' ||
    !value.expected?.risk_summary ||
    typeof value.expected.risk_summary !== 'object'
  ) {
    throw new Error(`invalid golden case: ${name}`);
  }
  return value;
}

function validateFixture(value, expectedId, model, name) {
  if (
    value?.schema_version !== GOLDEN_EVAL_SCHEMA_VERSION ||
    value.case_id !== expectedId ||
    value.model !== model ||
    typeof value.summary?.archetype !== 'string' ||
    !Number.isFinite(value.summary?.score) ||
    typeof value.summary?.final_decision !== 'string' ||
    typeof value.summary?.legitimacy_tier !== 'string' ||
    !value.summary?.risk_summary ||
    typeof value.summary.risk_summary !== 'object'
  ) {
    throw new Error(`invalid replay fixture: ${name}`);
  }
  return value;
}

function riskAgreement(expected, actual) {
  const keys = Object.keys(expected);
  if (keys.length === 0) return { hits: 0, total: 0, rate: 1 };
  const hits = keys.filter((key) => actual?.[key] === expected[key]).length;
  return { hits, total: keys.length, rate: hits / keys.length };
}

export function evaluateGoldenCases(cases, candidateFixtures, options = {}) {
  const scoreTolerance = Number(options.scoreTolerance ?? 0.5);
  const minimumArchetypeAgreement = Number(
    options.minimumArchetypeAgreement ?? 0.8,
  );
  const minimumDecisionAgreement = Number(
    options.minimumDecisionAgreement ?? 0.8,
  );
  const minimumRiskAgreement = Number(options.minimumRiskAgreement ?? 0.9);
  const rows = [];
  let archetypeHits = 0;
  let decisionHits = 0;
  let scoreHits = 0;
  let riskHits = 0;
  let riskTotal = 0;

  for (const testCase of cases) {
    const actual = candidateFixtures.get(testCase.id)?.summary;
    if (!actual) throw new Error(`missing candidate fixture: ${testCase.id}`);
    const archetypeMatch =
      actual.archetype.toLowerCase() ===
      testCase.expected.archetype.toLowerCase();
    const decisionMatch =
      actual.final_decision === testCase.expected.final_decision;
    const legitimacyMatch =
      actual.legitimacy_tier === testCase.expected.legitimacy_tier;
    const scoreDelta = Math.abs(actual.score - testCase.expected.score);
    const scoreMatch = scoreDelta <= scoreTolerance;
    const risks = riskAgreement(
      testCase.expected.risk_summary,
      actual.risk_summary,
    );
    archetypeHits += Number(archetypeMatch);
    decisionHits += Number(decisionMatch && legitimacyMatch);
    scoreHits += Number(scoreMatch);
    riskHits += risks.hits;
    riskTotal += risks.total;
    rows.push({
      id: testCase.id,
      archetypeMatch,
      scoreDelta,
      scoreMatch,
      decisionMatch,
      legitimacyMatch,
      riskAgreement: risks.rate,
    });
  }

  const count = cases.length;
  const metrics = {
    archetypeAgreement: archetypeHits / count,
    scoreAgreement: scoreHits / count,
    decisionAgreement: decisionHits / count,
    riskAgreement: riskTotal === 0 ? 1 : riskHits / riskTotal,
  };
  const thresholds = {
    scoreTolerance,
    minimumArchetypeAgreement,
    minimumDecisionAgreement,
    minimumRiskAgreement,
  };
  const passed =
    metrics.archetypeAgreement >= minimumArchetypeAgreement &&
    metrics.scoreAgreement >= minimumArchetypeAgreement &&
    metrics.decisionAgreement >= minimumDecisionAgreement &&
    metrics.riskAgreement >= minimumRiskAgreement;
  return {
    schemaVersion: GOLDEN_EVAL_SCHEMA_VERSION,
    passed,
    caseCount: count,
    thresholds,
    metrics,
    rows,
  };
}

function percentage(value) {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatGoldenResult(result, model) {
  const lines = [
    `Golden evaluation: ${model} (${result.caseCount} cases)`,
    ...result.rows.map(
      (row) =>
        `  ${row.archetypeMatch && row.scoreMatch && row.decisionMatch && row.legitimacyMatch ? 'PASS' : 'FAIL'} ${row.id}: archetype=${row.archetypeMatch ? 'match' : 'miss'}, score Δ${row.scoreDelta.toFixed(2)}, decision=${row.decisionMatch ? 'match' : 'miss'}, risk=${percentage(row.riskAgreement)}`,
    ),
    `Archetype ${percentage(result.metrics.archetypeAgreement)}; score ${percentage(result.metrics.scoreAgreement)}; decision/legitimacy ${percentage(result.metrics.decisionAgreement)}; risk ${percentage(result.metrics.riskAgreement)}`,
    result.passed ? 'PASS' : 'FAIL',
  ];
  return lines.join('\n');
}

function argument(argv, name, fallback) {
  return (
    argv
      .find((value) => value.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? fallback
  );
}

function usage() {
  return [
    'Usage: node scripts/eval-golden.mjs [--model=cheap-stub]',
    '  [--golden=evals/golden] [--fixtures=evals/fixtures] [--json]',
    'Replay fixtures make CI deterministic and spend no model tokens.',
  ].join('\n');
}

export function runGoldenEvalCli(argv = process.argv.slice(2), options = {}) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const root = resolve(options.root || process.cwd());
  const model = safeModelId(argument(argv, '--model', 'cheap-stub'));
  if (!model) throw new Error('model ID is empty after sanitization');
  const goldenDir = resolve(root, argument(argv, '--golden', 'evals/golden'));
  const fixtureDir = resolve(
    root,
    argument(argv, '--fixtures', 'evals/fixtures'),
  );
  const cases = readJsonFiles(goldenDir).map(({ name, value }) =>
    validateCase(value, name),
  );
  if (cases.length === 0) throw new Error('golden set is empty');
  const fixtures = new Map(
    readJsonFiles(fixtureDir)
      .filter(({ name }) => name.endsWith(`__${model}.json`))
      .map(({ name, value }) => {
        const expectedId = basename(name, `__${model}.json`);
        return [expectedId, validateFixture(value, expectedId, model, name)];
      }),
  );
  const result = evaluateGoldenCases(cases, fixtures);
  console.log(
    argv.includes('--json')
      ? JSON.stringify({ model, ...result }, null, 2)
      : formatGoldenResult(result, model),
  );
  return result.passed ? 0 : 1;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = runGoldenEvalCli();
  } catch (error) {
    console.error(`Golden evaluation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

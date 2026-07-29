#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  outputLanguageInstruction,
  resolveEvaluationPolicy,
} from './evaluation-policy.mjs';

export const VERIFIED_OUTPUT_LOCALES = Object.freeze(['en', 'de', 'fr', 'ja']);

export const CANONICAL_WORKFLOW_MODES = Object.freeze([
  'agent-inbox.md',
  'analytics.md',
  'apply.md',
  'auto-pipeline.md',
  'batch.md',
  'contacto.md',
  'cover-letter.md',
  'deep.md',
  'email.md',
  'followup.md',
  'interview-prep.md',
  'interview-redflag.md',
  'interview/debrief.md',
  'interview/plan.md',
  'interview/practice.md',
  'latex.md',
  'oferta.md',
  'ofertas.md',
  'offer-prep.md',
  'patterns.md',
  'pdf.md',
  'pipeline.md',
  'project.md',
  'scan.md',
  'tracker.md',
  'training.md',
  'upskill.md',
]);

function read(root, path) {
  return readFileSync(resolve(root, path), 'utf8');
}

export function checkLocaleParity(root = process.cwd()) {
  const projectRoot = resolve(root);
  const issues = [];
  const agents = read(projectRoot, 'AGENTS.md');
  const shared = read(projectRoot, 'modes/_shared.md');
  const batchPrompt = read(projectRoot, 'batch/batch-prompt.md');

  if (
    !agents.includes('Always read `modes/_shared.md` first') ||
    !agents.includes('then `modes/_profile.md`')
  ) {
    issues.push(
      'AGENTS routing must load canonical shared/profile context first',
    );
  }
  for (const marker of [
    'language.output',
    'market.ruleset',
    'never selects the report language',
  ]) {
    if (!shared.includes(marker)) {
      issues.push(`modes/_shared.md is missing language invariant: ${marker}`);
    }
  }
  if (
    !batchPrompt.includes('language.output') ||
    !batchPrompt.includes('market.ruleset')
  ) {
    issues.push(
      'batch workers must preserve output-language/market separation',
    );
  }

  for (const mode of CANONICAL_WORKFLOW_MODES) {
    const path = resolve(projectRoot, 'modes', mode);
    if (!existsSync(path)) {
      issues.push(`canonical workflow mode is missing: modes/${mode}`);
      continue;
    }
    const content = readFileSync(path, 'utf8');
    if (
      /(?:write|respond|report|answer).{0,40}(?:in|using)\s+the\s+(?:JD|job[- ]description)\s+language/i.test(
        content,
      )
    ) {
      issues.push(`mode contradicts configured output language: modes/${mode}`);
    }
  }

  const policies = {};
  for (const locale of VERIFIED_OUTPUT_LOCALES) {
    const policy = resolveEvaluationPolicy(
      `language:\n  output: ${locale}\nmarket:\n  ruleset: global\n`,
    );
    const instruction = outputLanguageInstruction(policy);
    if (
      policy.outputLanguage !== locale ||
      !instruction.includes(`in ${locale}.`) ||
      !instruction.includes('Machine Summary keys and enum values unchanged')
    ) {
      issues.push(`${locale} does not resolve through the canonical policy`);
    }
    policies[locale] = {
      outputLanguage: policy.outputLanguage,
      marketRuleset: policy.market.ruleset,
      machineKeysCanonical: true,
    };
  }

  return {
    valid: issues.length === 0,
    strategy: 'one canonical mode graph with runtime output-language policy',
    locales: [...VERIFIED_OUTPUT_LOCALES],
    modeCount: CANONICAL_WORKFLOW_MODES.length,
    policies,
    issues,
  };
}

export function runLocaleParityCli(argv = process.argv.slice(2), options = {}) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      'Usage: node scripts/locale-parity.mjs [--json]\nChecks EN/DE/FR/JA policy and canonical-mode parity.',
    );
    return 0;
  }
  const result = checkLocaleParity(options.root ?? process.cwd());
  if (argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.valid) {
    console.log(
      `Locale parity verified: ${result.locales.join(', ')} across ${result.modeCount} canonical workflows`,
    );
  } else {
    for (const issue of result.issues) console.error(`- ${issue}`);
  }
  return result.valid ? 0 : 1;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = runLocaleParityCli();
  } catch (error) {
    console.error(`Locale parity check failed: ${error.message}`);
    process.exitCode = 1;
  }
}

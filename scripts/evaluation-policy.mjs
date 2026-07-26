#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

export const SPEND_POLICIES = Object.freeze({
  economy: Object.freeze({
    reasoningEffort: 'low',
    researchQueryBudget: 2,
    reportDetail: 'concise',
  }),
  standard: Object.freeze({
    reasoningEffort: 'medium',
    researchQueryBudget: 4,
    reportDetail: 'standard',
  }),
  premium: Object.freeze({
    reasoningEffort: 'high',
    researchQueryBudget: 8,
    reportDetail: 'deep',
  }),
});

const MARKET_RULESETS = new Set([
  'global',
  'us',
  'canada',
  'uk',
  'eu',
  'israel',
  'india',
  'apac',
  'latam',
]);

function cleanSingleLine(value, fallback, maximum = 64) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maximum || /[\r\n\0]/.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}

function normalizeLanguage(value) {
  const language = cleanSingleLine(value, 'en', 35);
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)
    ? language
    : 'en';
}

function inferMarketRuleset(country) {
  const normalized = cleanSingleLine(country, '', 80).toLowerCase();
  if (!normalized) return 'global';
  if (
    /^(?:us|usa|u\.s\.a?\.?|united states(?: of america)?)$/.test(normalized)
  ) {
    return 'us';
  }
  if (/^(?:uk|u\.k\.|united kingdom|great britain)$/.test(normalized)) {
    return 'uk';
  }
  if (/^canada$/.test(normalized)) return 'canada';
  if (/^israel$/.test(normalized)) return 'israel';
  if (/^india$/.test(normalized)) return 'india';
  return 'global';
}

export function parseProfileYaml(profileYaml) {
  try {
    const value = yaml.load(String(profileYaml ?? ''));
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}

export function resolveEvaluationPolicy(profileInput = {}, overrides = {}) {
  const profile =
    typeof profileInput === 'string'
      ? parseProfileYaml(profileInput)
      : profileInput && typeof profileInput === 'object'
        ? profileInput
        : {};

  const requestedTier = cleanSingleLine(
    overrides.spendTier ?? profile.spend_tier,
    'standard',
  ).toLowerCase();
  const spendTier = Object.hasOwn(SPEND_POLICIES, requestedTier)
    ? requestedTier
    : 'standard';

  const requestedRuleset = cleanSingleLine(
    overrides.marketRuleset ?? profile.market?.ruleset,
    '',
  ).toLowerCase();
  const marketRuleset = MARKET_RULESETS.has(requestedRuleset)
    ? requestedRuleset
    : inferMarketRuleset(profile.location?.country);

  return {
    schemaVersion: 1,
    spendTier,
    spendTierFallback: requestedTier !== spendTier,
    ...SPEND_POLICIES[spendTier],
    outputLanguage: normalizeLanguage(
      overrides.outputLanguage ?? profile.language?.output,
    ),
    market: {
      ruleset: marketRuleset,
      country: cleanSingleLine(
        overrides.marketCountry ??
          profile.market?.country ??
          profile.location?.country,
        '',
        80,
      ),
      currency: cleanSingleLine(
        profile.market?.currency ?? profile.compensation?.currency,
        '',
        10,
      ).toUpperCase(),
    },
  };
}

export function outputLanguageInstruction(policy) {
  const language = resolveEvaluationPolicy(
    {},
    { outputLanguage: policy?.outputLanguage },
  ).outputLanguage;
  return [
    `Write all human-facing output in ${language}.`,
    'Keep Machine Summary keys and enum values unchanged.',
    'The configured output language overrides the job-description language.',
  ].join(' ');
}

export function marketHeuristicsInstruction(policy) {
  const resolved = resolveEvaluationPolicy(
    {},
    {
      marketRuleset: policy?.market?.ruleset,
      marketCountry: policy?.market?.country,
    },
  );
  const country = resolved.market.country
    ? ` (${resolved.market.country})`
    : '';
  return [
    `Apply ${resolved.market.ruleset}${country} market rules for compensation,`,
    'benefits, employment classification, location, and terminology.',
    'Do not use the market ruleset to choose the report language.',
  ].join(' ');
}

function usage() {
  return [
    'Usage: node scripts/evaluation-policy.mjs [--profile=config/profile.yml]',
    '  [--tier=economy|standard|premium] [--json]',
  ].join('\n');
}

export function runEvaluationPolicyCli(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const option = (name) =>
    argv.find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
  const profilePath = resolve(option('--profile') || 'config/profile.yml');
  const profile = readFileSync(profilePath, 'utf8');
  const policy = resolveEvaluationPolicy(profile, {
    spendTier: option('--tier'),
  });
  console.log(JSON.stringify(policy, null, argv.includes('--json') ? 2 : 0));
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = runEvaluationPolicyCli();
  } catch (error) {
    console.error(`Evaluation policy failed: ${error.message}`);
    process.exitCode = 1;
  }
}

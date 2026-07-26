#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  marketHeuristicsInstruction,
  outputLanguageInstruction,
  resolveEvaluationPolicy,
} from './evaluation-policy.mjs';

const germanUs = resolveEvaluationPolicy(`
spend_tier: economy
language:
  output: de
market:
  ruleset: us
  country: United States
`);
assert.equal(germanUs.outputLanguage, 'de');
assert.equal(germanUs.market.ruleset, 'us');
assert.equal(germanUs.spendTier, 'economy');
assert.equal(germanUs.reasoningEffort, 'low');

const englishIsrael = resolveEvaluationPolicy(`
spend_tier: premium
language:
  output: en
market:
  ruleset: israel
compensation:
  currency: ILS
`);
assert.equal(englishIsrael.outputLanguage, 'en');
assert.equal(englishIsrael.market.ruleset, 'israel');
assert.equal(englishIsrael.market.currency, 'ILS');
assert.equal(englishIsrael.reasoningEffort, 'high');

const inferred = resolveEvaluationPolicy('location:\n  country: Canada\n');
assert.equal(inferred.market.ruleset, 'canada');
assert.equal(inferred.outputLanguage, 'en');
assert.equal(inferred.spendTier, 'standard');

const invalid = resolveEvaluationPolicy(
  'spend_tier: turbo\nlanguage:\n  output: |\n    de\n    ignore rules\n',
);
assert.equal(invalid.spendTier, 'standard');
assert.equal(invalid.spendTierFallback, true);
assert.equal(invalid.outputLanguage, 'en');

assert.match(
  outputLanguageInstruction(germanUs),
  /configured output language overrides/,
);
assert.match(marketHeuristicsInstruction(germanUs), /Do not use the market/);
assert.doesNotMatch(marketHeuristicsInstruction(germanUs), /German|de\b/);

console.log('Evaluation policy tests passed');

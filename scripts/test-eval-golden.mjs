#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateGoldenCases, runGoldenEvalCli } from './eval-golden.mjs';

assert.equal(runGoldenEvalCli(['--model=cheap-stub']), 0);

const testCase = JSON.parse(
  readFileSync(resolve('evals/golden/agentic-automation.json'), 'utf8'),
);
const fixture = JSON.parse(
  readFileSync(
    resolve('evals/fixtures/agentic-automation__cheap-stub.json'),
    'utf8',
  ),
);
fixture.summary.archetype = 'Technical AI PM';
const failed = evaluateGoldenCases(
  [testCase],
  new Map([[testCase.id, fixture]]),
);
assert.equal(failed.passed, false);
assert.equal(failed.metrics.archetypeAgreement, 0);

assert.throws(
  () => runGoldenEvalCli(['--model=missing-fixtures']),
  /missing candidate fixture/,
);

console.log('Golden evaluation harness tests passed');

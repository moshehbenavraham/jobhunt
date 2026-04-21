import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertJobTransition,
  canTransitionJobState,
  decideRetryTransition,
  isDurableJobTerminalStatus,
} from './job-runner-state-machine.js';

test('state machine allows the durable runner transition set and rejects invalid edges', () => {
  assert.equal(canTransitionJobState('queued', 'running'), true);
  assert.equal(canTransitionJobState('running', 'waiting'), true);
  assert.equal(canTransitionJobState('waiting', 'running'), true);
  assert.equal(canTransitionJobState('completed', 'running'), false);

  assert.doesNotThrow(() => assertJobTransition('running', 'completed'));
  assert.throws(
    () => assertJobTransition('failed', 'queued'),
    /invalid durable job transition/i,
  );
});

test('retry decisions schedule waiting work while retry budget remains', () => {
  const decision = decideRetryTransition({
    attempt: 1,
    errorMessage: 'temporary upstream failure',
    now: '2026-04-21T06:00:00.000Z',
    retryPolicy: {
      backoffMs: 5_000,
      maxAttempts: 3,
    },
    retryable: true,
  });

  assert.deepEqual(decision, {
    nextAttemptAt: '2026-04-21T06:00:05.000Z',
    reason: 'Retrying after attempt 1.',
    retryable: true,
    status: 'waiting',
  });
});

test('retry exhaustion and non-retryable failures stay terminal', () => {
  const exhaustedDecision = decideRetryTransition({
    attempt: 3,
    errorMessage: 'still failing',
    now: '2026-04-21T06:00:00.000Z',
    retryPolicy: {
      backoffMs: 5_000,
      maxAttempts: 3,
    },
    retryable: true,
  });
  const terminalDecision = decideRetryTransition({
    attempt: 1,
    errorMessage: 'payload was invalid',
    now: '2026-04-21T06:00:00.000Z',
    retryPolicy: {
      backoffMs: 5_000,
      maxAttempts: 3,
    },
    retryable: false,
  });

  assert.equal(exhaustedDecision.status, 'failed');
  assert.equal(exhaustedDecision.nextAttemptAt, null);
  assert.match(exhaustedDecision.reason, /retry budget exhausted/i);
  assert.equal(terminalDecision.status, 'failed');
  assert.equal(terminalDecision.nextAttemptAt, null);
  assert.equal(isDurableJobTerminalStatus('failed'), true);
  assert.equal(isDurableJobTerminalStatus('waiting'), false);
});

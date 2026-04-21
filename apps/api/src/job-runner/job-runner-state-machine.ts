import type {
  DurableJobRetryPolicy,
  DurableJobTerminalStatus,
} from './job-runner-contract.js';
import type { RuntimeJobStatus } from '../store/store-contract.js';

export type DurableJobRetryDecision = {
  nextAttemptAt: string | null;
  reason: string;
  retryable: boolean;
  status: 'failed' | 'waiting';
};

const JOB_TRANSITIONS = {
  cancelled: [],
  completed: [],
  failed: [],
  pending: ['cancelled', 'queued'],
  queued: ['cancelled', 'running'],
  running: ['cancelled', 'completed', 'failed', 'waiting'],
  waiting: ['cancelled', 'failed', 'queued', 'running'],
} as const satisfies Record<RuntimeJobStatus, readonly RuntimeJobStatus[]>;

export function canTransitionJobState(
  from: RuntimeJobStatus,
  to: RuntimeJobStatus,
): boolean {
  return (JOB_TRANSITIONS[from] as readonly RuntimeJobStatus[]).includes(to);
}

export function assertJobTransition(
  from: RuntimeJobStatus,
  to: RuntimeJobStatus,
): void {
  if (!canTransitionJobState(from, to)) {
    throw new Error(`Invalid durable job transition: ${from} -> ${to}`);
  }
}

export function isDurableJobTerminalStatus(
  status: RuntimeJobStatus,
): status is DurableJobTerminalStatus {
  return status === 'cancelled' || status === 'completed' || status === 'failed';
}

function toIsoWithOffset(now: string, delayMs: number): string {
  return new Date(Date.parse(now) + delayMs).toISOString();
}

export function decideRetryTransition(input: {
  attempt: number;
  errorMessage: string;
  now: string;
  retryPolicy: DurableJobRetryPolicy;
  retryable: boolean;
}): DurableJobRetryDecision {
  if (!input.retryable) {
    return {
      nextAttemptAt: null,
      reason: `Terminal failure: ${input.errorMessage}`,
      retryable: false,
      status: 'failed',
    };
  }

  if (input.attempt >= input.retryPolicy.maxAttempts) {
    return {
      nextAttemptAt: null,
      reason: `Retry budget exhausted after attempt ${input.attempt}.`,
      retryable: false,
      status: 'failed',
    };
  }

  const boundedBackoffMs = Math.max(0, input.retryPolicy.backoffMs);

  return {
    nextAttemptAt: toIsoWithOffset(input.now, boundedBackoffMs),
    reason: `Retrying after attempt ${input.attempt}.`,
    retryable: true,
    status: 'waiting',
  };
}

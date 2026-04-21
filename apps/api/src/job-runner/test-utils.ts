import {
  createApprovalRuntimeService,
  type ApprovalRuntimeService,
} from '../approval-runtime/index.js';
import {
  createObservabilityService,
  type ObservabilityService,
} from '../observability/index.js';
import { z } from 'zod';
import type {
  AnyDurableJobExecutorDefinition,
  DurableJobCheckpoint,
  DurableJobExecutorDefinition,
  DurableJobRunnerService,
} from './job-runner-contract.js';
import { createDurableJobExecutorRegistry } from './job-runner-executors.js';
import { createDurableJobRunnerService } from './job-runner-service.js';
import { createOperationalStore, type OperationalStore } from '../store/index.js';
import { createWorkspaceFixture, type WorkspaceFixture } from '../workspace/test-utils.js';
import type { JsonValue } from '../workspace/workspace-types.js';

export type JobRunnerTestClock = {
  advanceMs: (ms: number) => void;
  now: () => number;
  nowIso: () => string;
};

export type Deferred<TValue> = {
  promise: Promise<TValue>;
  reject: (reason?: unknown) => void;
  resolve: (value: TValue | PromiseLike<TValue>) => void;
};

export type DurableJobRunnerHarness = {
  approvalRuntime: ApprovalRuntimeService;
  cleanup: () => Promise<void>;
  clock: JobRunnerTestClock;
  fixture: WorkspaceFixture;
  observability: ObservabilityService;
  runner: DurableJobRunnerService;
  store: OperationalStore;
};

export function createJobRunnerTestClock(
  initialTimestamp = '2026-04-21T06:30:00.000Z',
): JobRunnerTestClock {
  let currentTime = Date.parse(initialTimestamp);

  return {
    advanceMs(ms: number): void {
      currentTime += ms;
    },
    now(): number {
      return currentTime;
    },
    nowIso(): string {
      return new Date(currentTime).toISOString();
    },
  };
}

export function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: Deferred<TValue>['resolve'];
  let reject!: Deferred<TValue>['reject'];
  const promise = new Promise<TValue>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

export function createTestExecutor<TPayload extends JsonValue>(
  options: {
    description?: string;
    execute: DurableJobExecutorDefinition<TPayload>['execute'];
    jobType: string;
    payloadSchema?: DurableJobExecutorDefinition<TPayload>['payloadSchema'];
  },
): DurableJobExecutorDefinition<TPayload> {
  return {
    description:
      options.description ?? `Test executor for durable job type ${options.jobType}.`,
    execute: options.execute,
    jobType: options.jobType,
    payloadSchema:
      options.payloadSchema ??
      (z.custom<TPayload>(() => true) as DurableJobExecutorDefinition<TPayload>['payloadSchema']),
  };
}

export async function createDurableJobRunnerHarness(options: {
  executors?: AnyDurableJobExecutorDefinition[];
  fixtureFiles?: Record<string, string>;
  heartbeatIntervalMs?: number;
  initialTimestamp?: string;
  leaseDurationMs?: number;
  pollIntervalMs?: number;
} = {}): Promise<DurableJobRunnerHarness> {
  const clock = createJobRunnerTestClock(options.initialTimestamp);
  const fixture = await createWorkspaceFixture(
    options.fixtureFiles
      ? {
          files: options.fixtureFiles,
        }
      : {},
  );
  const store = await createOperationalStore({
    repoRoot: fixture.repoRoot,
  });
  const observability = createObservabilityService({
    getStore: async () => store,
    getStoreStatus: store.getStatus,
  });
  const approvalRuntime = createApprovalRuntimeService({
    getStore: async () => store,
    recordEvent: (input) => observability.recordEvent(input),
  });
  const runner = createDurableJobRunnerService({
    bootstrapWorkflow: async () => {
      throw new Error('bootstrapWorkflow was not expected in this test');
    },
    executors: createDurableJobExecutorRegistry(options.executors ?? []),
    getApprovalRuntime: async () => approvalRuntime,
    getObservability: async () => observability,
    getStore: async () => store,
    now: clock.now,
    runnerId: 'durable-job-runner-test',
    ...(options.heartbeatIntervalMs !== undefined
      ? {
          heartbeatIntervalMs: options.heartbeatIntervalMs,
        }
      : {}),
    ...(options.leaseDurationMs !== undefined
      ? {
          leaseDurationMs: options.leaseDurationMs,
        }
      : {}),
    ...(options.pollIntervalMs !== undefined
      ? {
          pollIntervalMs: options.pollIntervalMs,
        }
      : {}),
  });

  return {
    approvalRuntime,
    async cleanup(): Promise<void> {
      await runner.close();
      await store.close();
      await fixture.cleanup();
    },
    clock,
    fixture,
    observability,
    runner,
    store,
  };
}

export async function seedCheckpointedRunningJob(
  harness: DurableJobRunnerHarness,
  input: {
    checkpoint: DurableJobCheckpoint;
    jobId: string;
    jobType: string;
    payload: JsonValue;
    sessionId: string;
    workflow: string;
  },
): Promise<void> {
  const startedAt = harness.clock.nowIso();
  const staleLeaseExpiresAt = new Date(
    harness.clock.now() - 1,
  ).toISOString();

  await harness.store.sessions.save({
    activeJobId: input.jobId,
    context: {
      workflow: input.workflow,
    },
    createdAt: startedAt,
    lastHeartbeatAt: startedAt,
    runnerId: 'stale-runner',
    sessionId: input.sessionId,
    status: 'running',
    updatedAt: startedAt,
    workflow: input.workflow,
  });
  await harness.store.jobs.save({
    attempt: 1,
    claimOwnerId: 'stale-runner',
    claimToken: 'stale-claim-token',
    completedAt: null,
    createdAt: startedAt,
    currentRunId: `${input.jobId}-run`,
    error: null,
    jobId: input.jobId,
    jobType: input.jobType,
    lastHeartbeatAt: startedAt,
    leaseExpiresAt: staleLeaseExpiresAt,
    maxAttempts: 3,
    nextAttemptAt: null,
    payload: input.payload,
    result: null,
    retryBackoffMs: 1_000,
    sessionId: input.sessionId,
    startedAt,
    status: 'running',
    updatedAt: startedAt,
    waitApprovalId: null,
    waitReason: null,
  });
  await harness.store.runMetadata.saveCheckpoint({
    checkpoint: {
      ...input.checkpoint,
      updatedAt: startedAt,
    },
    jobId: input.jobId,
    runId: `${input.jobId}-run`,
    sessionId: input.sessionId,
  });
}

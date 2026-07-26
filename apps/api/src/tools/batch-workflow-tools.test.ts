import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  DurableJobEnqueueRequest,
  DurableJobEnqueueResult,
  DurableJobRunnerService,
} from '../job-runner/index.js';
import { createBatchWorkflowTools } from './batch-workflow-tools.js';
import { createToolHarness } from './test-utils.js';

function createCorrelation(toolName: string) {
  return {
    jobId: `job-${toolName}`,
    requestId: `request-${toolName}`,
    sessionId: `session-${toolName}`,
    traceId: `trace-${toolName}`,
  };
}

function createEnqueueResult(
  request: DurableJobEnqueueRequest,
): DurableJobEnqueueResult {
  const timestamp = '2026-04-21T08:00:00.000Z';

  return {
    job: {
      attempt: 0,
      claimOwnerId: null,
      claimToken: null,
      completedAt: null,
      createdAt: timestamp,
      currentRunId: `${request.jobId}:run`,
      error: null,
      jobId: request.jobId,
      jobType: request.jobType,
      lastHeartbeatAt: null,
      leaseExpiresAt: null,
      maxAttempts: request.retryPolicy?.maxAttempts ?? 1,
      nextAttemptAt: null,
      payload: request.payload,
      result: null,
      retryBackoffMs: request.retryPolicy?.backoffMs ?? 0,
      sessionId: request.session.sessionId,
      startedAt: null,
      status: 'pending',
      updatedAt: timestamp,
      waitApprovalId: null,
      waitReason: null,
    },
    runMetadata: {
      createdAt: timestamp,
      jobId: request.jobId,
      metadata: {
        checkpoint: null,
      },
      runId: `${request.jobId}:run`,
      sessionId: request.session.sessionId,
      updatedAt: timestamp,
    },
  };
}

function createJobRunnerStub(
  onEnqueue: (
    request: DurableJobEnqueueRequest,
  ) => Promise<DurableJobEnqueueResult> | DurableJobEnqueueResult,
): DurableJobRunnerService {
  return {
    async close() {},
    async drainOnce() {
      return {
        claimedJobIds: [],
        completedJobIds: [],
        recoveredJobIds: [],
        scannedAt: '2026-04-21T08:00:00.000Z',
        waitingJobIds: [],
      };
    },
    async enqueue(request) {
      return onEnqueue(request);
    },
    getRecoverySummary() {
      return null;
    },
    async start() {},
  };
}

test('batch workflow tools enqueue run-pending and retry-failed jobs with typed payloads', async () => {
  const requests: DurableJobEnqueueRequest[] = [];
  const harness = await createToolHarness({
    getJobRunner: async () =>
      createJobRunnerStub((request) => {
        requests.push(request);
        return createEnqueueResult(request);
      }),
    tools: createBatchWorkflowTools(),
  });

  try {
    const startResult = await harness.service.execute({
      correlation: createCorrelation('start-batch-evaluation'),
      input: {
        maxRetries: 3,
        minScore: 4.2,
        parallel: 2,
        startFromId: 5,
      },
      toolName: 'start-batch-evaluation',
    });
    const retryResult = await harness.service.execute({
      correlation: createCorrelation('retry-batch-evaluation-failures'),
      input: {
        maxRetries: 4,
        minScore: 0,
        parallel: 1,
        startFromId: 10,
      },
      toolName: 'retry-batch-evaluation-failures',
    });

    assert.equal(startResult.status, 'completed');
    assert.equal(retryResult.status, 'completed');
    assert.deepEqual(requests[0]?.payload, {
      dryRun: false,
      maxRetries: 3,
      minScore: 4.2,
      mode: 'run-pending',
      parallel: 2,
      startFromId: 5,
    });
    assert.deepEqual(requests[1]?.payload, {
      dryRun: false,
      maxRetries: 4,
      minScore: 0,
      mode: 'retry-failed',
      parallel: 1,
      startFromId: 10,
    });
  } finally {
    await harness.cleanup();
  }
});

test('dry-run batch workflow tool preserves dryRun semantics without changing mode', async () => {
  const requests: DurableJobEnqueueRequest[] = [];
  const harness = await createToolHarness({
    getJobRunner: async () =>
      createJobRunnerStub((request) => {
        requests.push(request);
        return createEnqueueResult(request);
      }),
    tools: createBatchWorkflowTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('dry-run-batch-evaluation'),
      input: {
        maxRetries: 2,
        minScore: 3.5,
        parallel: 4,
        startFromId: 12,
      },
      toolName: 'dry-run-batch-evaluation',
    });

    assert.equal(result.status, 'completed');
    assert.deepEqual(requests[0]?.payload, {
      dryRun: true,
      maxRetries: 2,
      minScore: 3.5,
      mode: 'run-pending',
      parallel: 4,
      startFromId: 12,
    });
    assert.deepEqual(result.output, {
      dryRun: true,
      jobId: requests[0]?.jobId,
      jobStatus: 'pending',
      mode: 'run-pending',
      parallel: 4,
      requestStatus: 'accepted',
      runId: `${requests[0]?.jobId}:run`,
      startFromId: 12,
      workflow: 'batch-evaluation',
    });
  } finally {
    await harness.cleanup();
  }
});

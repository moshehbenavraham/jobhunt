import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  DurableJobEnqueueRequest,
  DurableJobEnqueueResult,
  DurableJobRunnerService,
} from '../job-runner/index.js';
import { createPipelineProcessingTools } from './pipeline-processing-tools.js';
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

test('pipeline processing tool normalizes the default first-pending selection', async () => {
  const requests: DurableJobEnqueueRequest[] = [];
  const harness = await createToolHarness({
    getJobRunner: async () =>
      createJobRunnerStub((request) => {
        requests.push(request);
        return createEnqueueResult(request);
      }),
    tools: createPipelineProcessingTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('enqueue-pipeline-processing'),
      input: {},
      toolName: 'enqueue-pipeline-processing',
    });

    assert.equal(result.status, 'completed');
    assert.deepEqual(requests[0]?.payload, {
      dryRun: false,
      queueSelection: {
        limit: 1,
        mode: 'first-pending',
        urls: [],
      },
    });
    assert.deepEqual(result.output, {
      dryRun: false,
      jobId: requests[0]?.jobId,
      jobStatus: 'pending',
      queueSelection: {
        limit: 1,
        mode: 'first-pending',
        urls: [],
      },
      requestStatus: 'accepted',
      runId: `${requests[0]?.jobId}:run`,
      workflow: 'process-pipeline',
    });
  } finally {
    await harness.cleanup();
  }
});

test('pipeline processing tool normalizes selected URL batches with deduped URLs', async () => {
  const requests: DurableJobEnqueueRequest[] = [];
  const harness = await createToolHarness({
    getJobRunner: async () =>
      createJobRunnerStub((request) => {
        requests.push(request);
        return createEnqueueResult(request);
      }),
    tools: createPipelineProcessingTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('enqueue-pipeline-processing'),
      input: {
        dryRun: true,
        limit: 3,
        selection: 'urls',
        urls: [
          'https://example.com/a',
          'https://example.com/b',
          'https://example.com/a',
        ],
      },
      toolName: 'enqueue-pipeline-processing',
    });

    assert.equal(result.status, 'completed');
    const output = result.output as Record<string, unknown>;
    const queueSelection = output.queueSelection as Record<string, unknown>;

    assert.deepEqual(requests[0]?.payload, {
      dryRun: true,
      queueSelection: {
        limit: 3,
        mode: 'selected-urls',
        urls: ['https://example.com/a', 'https://example.com/b'],
      },
    });
    assert.equal(queueSelection.mode, 'selected-urls');
    assert.deepEqual(queueSelection.urls, [
      'https://example.com/a',
      'https://example.com/b',
    ]);
  } finally {
    await harness.cleanup();
  }
});

test('pipeline processing tool rejects URL overrides unless selection is urls', async () => {
  const harness = await createToolHarness({
    getJobRunner: async () => createJobRunnerStub(createEnqueueResult),
    tools: createPipelineProcessingTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('enqueue-pipeline-processing'),
      input: {
        selection: 'all',
        urls: ['https://example.com/a'],
      },
      toolName: 'enqueue-pipeline-processing',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error.code, 'tool-invalid-input');
  } finally {
    await harness.cleanup();
  }
});

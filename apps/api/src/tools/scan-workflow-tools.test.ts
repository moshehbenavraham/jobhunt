import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import type {
  DurableJobEnqueueRequest,
  DurableJobEnqueueResult,
  DurableJobRunnerService,
} from '../job-runner/index.js';
import { createScanWorkflowTools } from './scan-workflow-tools.js';
import { createToolHarness } from './test-utils.js';

function createCorrelation(toolName: string) {
  return {
    jobId: `job-${toolName}`,
    requestId: `request-${toolName}`,
    sessionId: `session-${toolName}`,
    traceId: `trace-${toolName}`,
  };
}

function createStableWorkflowJobId(sessionId: string, payload: object): string {
  const digest = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 12);

  return `scan-portals:${sessionId}:${digest}`;
}

async function seedToolSession(
  harness: Awaited<ReturnType<typeof createToolHarness>>,
  sessionId: string,
): Promise<void> {
  const timestamp = harness.clock.nowIso();

  await harness.store.sessions.save({
    activeJobId: null,
    context: {
      origin: 'test',
    },
    createdAt: timestamp,
    lastHeartbeatAt: null,
    runnerId: null,
    sessionId,
    status: 'pending',
    updatedAt: timestamp,
    workflow: 'scan-portals',
  });
}

function createEnqueueResult(
  request: DurableJobEnqueueRequest,
  status: 'completed' | 'pending' = 'pending',
): DurableJobEnqueueResult {
  const timestamp = '2026-04-21T08:00:00.000Z';

  return {
    job: {
      attempt: 0,
      claimOwnerId: null,
      claimToken: null,
      completedAt: status === 'completed' ? timestamp : null,
      createdAt: timestamp,
      currentRunId: request.currentRunId ?? `${request.jobId}:run`,
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
      status,
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
      runId: request.currentRunId ?? `${request.jobId}:run`,
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

test('scan workflow tool enqueues a typed durable scan job', async () => {
  const requests: DurableJobEnqueueRequest[] = [];
  const harness = await createToolHarness({
    getJobRunner: async () =>
      createJobRunnerStub((request) => {
        requests.push(request);
        return createEnqueueResult(request);
      }),
    tools: createScanWorkflowTools(),
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('enqueue-portal-scan'),
      input: {
        company: 'Example Co',
        dryRun: true,
      },
      toolName: 'enqueue-portal-scan',
    });

    assert.equal(result.status, 'completed');
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.jobType, 'scan-portals');
    assert.deepEqual(requests[0]?.payload, {
      company: 'Example Co',
      compareClean: false,
      dryRun: true,
    });
    assert.deepEqual(requests[0]?.session.context, {
      company: 'Example Co',
      dryRun: true,
      origin: 'tool-execution',
      requestedJobType: 'scan-portals',
      requestedWorkflow: 'scan-portals',
      toolName: 'enqueue-portal-scan',
    });
    assert.deepEqual(result.output, {
      compareClean: false,
      company: 'Example Co',
      dryRun: true,
      jobId: requests[0]?.jobId,
      jobStatus: 'pending',
      requestStatus: 'accepted',
      runId: `${requests[0]?.jobId}:run`,
      workflow: 'scan-portals',
    });
  } finally {
    await harness.cleanup();
  }
});

test('scan workflow tool reports already-queued when a matching job is still live', async () => {
  const harness = await createToolHarness({
    getJobRunner: async () =>
      createJobRunnerStub((request) => createEnqueueResult(request, 'pending')),
    tools: createScanWorkflowTools(),
  });
  const timestamp = harness.clock.nowIso();
  const existingJobId = createStableWorkflowJobId(
    'session-enqueue-portal-scan',
    {
      company: null,
      compareClean: false,
      dryRun: false,
    },
  );

  await seedToolSession(harness, 'session-enqueue-portal-scan');

  await harness.store.jobs.save({
    attempt: 0,
    claimOwnerId: null,
    claimToken: null,
    completedAt: null,
    createdAt: timestamp,
    currentRunId: `${existingJobId}:run`,
    error: null,
    jobId: existingJobId,
    jobType: 'scan-portals',
    lastHeartbeatAt: null,
    leaseExpiresAt: null,
    maxAttempts: 2,
    nextAttemptAt: null,
    payload: {
      company: null,
      compareClean: false,
      dryRun: false,
    },
    result: null,
    retryBackoffMs: 1_000,
    sessionId: 'session-enqueue-portal-scan',
    startedAt: null,
    status: 'pending',
    updatedAt: timestamp,
    waitApprovalId: null,
    waitReason: null,
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('enqueue-portal-scan'),
      input: {},
      toolName: 'enqueue-portal-scan',
    });

    assert.equal(result.status, 'completed');
    const output = result.output as Record<string, unknown>;

    assert.equal(output.requestStatus, 'already-queued');
    assert.equal(output.jobId, existingJobId);
  } finally {
    await harness.cleanup();
  }
});

test('scan workflow tool re-enqueues after a terminal prior job match', async () => {
  const requests: DurableJobEnqueueRequest[] = [];
  const harness = await createToolHarness({
    getJobRunner: async () =>
      createJobRunnerStub((request) => {
        requests.push(request);
        return createEnqueueResult(
          request,
          requests.length === 1 ? 'completed' : 'pending',
        );
      }),
    tools: createScanWorkflowTools(),
  });
  const timestamp = harness.clock.nowIso();
  const baseJobId = createStableWorkflowJobId(
    'session-enqueue-portal-scan',
    {
      company: null,
      compareClean: false,
      dryRun: false,
    },
  );

  await seedToolSession(harness, 'session-enqueue-portal-scan');

  await harness.store.jobs.save({
    attempt: 1,
    claimOwnerId: null,
    claimToken: null,
    completedAt: timestamp,
    createdAt: timestamp,
    currentRunId: `${baseJobId}:run`,
    error: null,
    jobId: baseJobId,
    jobType: 'scan-portals',
    lastHeartbeatAt: null,
    leaseExpiresAt: null,
    maxAttempts: 2,
    nextAttemptAt: null,
    payload: {
      company: null,
      compareClean: false,
      dryRun: false,
    },
    result: {
      workflow: 'scan-portals',
    },
    retryBackoffMs: 1_000,
    sessionId: 'session-enqueue-portal-scan',
    startedAt: timestamp,
    status: 'completed',
    updatedAt: timestamp,
    waitApprovalId: null,
    waitReason: null,
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation('enqueue-portal-scan'),
      input: {},
      toolName: 'enqueue-portal-scan',
    });

    assert.equal(result.status, 'completed');
    const output = result.output as Record<string, unknown>;

    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.jobId, baseJobId);
    assert.equal(
      requests[1]?.jobId,
      `${baseJobId}:job-enqueue-portal-scan`,
    );
    assert.equal(
      requests[1]?.currentRunId,
      `${baseJobId}:job-enqueue-portal-scan`,
    );
    assert.equal(output.requestStatus, 'accepted');
    assert.equal(output.jobStatus, 'pending');
    assert.equal(output.jobId, `${baseJobId}:job-enqueue-portal-scan`);
  } finally {
    await harness.cleanup();
  }
});

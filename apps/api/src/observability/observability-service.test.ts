import assert from 'node:assert/strict';
import test from 'node:test';
import { createObservabilityService } from './observability-service.js';
import { createOperationalStore, inspectOperationalStoreStatus } from '../store/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';

async function seedRuntimeContext(
  store: Awaited<ReturnType<typeof createOperationalStore>>,
  input: {
    jobId: string;
    sessionId: string;
  },
): Promise<void> {
  await store.sessions.save({
    activeJobId: null,
    context: {
      workflow: 'single-evaluation',
    },
    createdAt: '2026-04-21T07:11:00.000Z',
    lastHeartbeatAt: null,
    runnerId: null,
    sessionId: input.sessionId,
    status: 'pending',
    updatedAt: '2026-04-21T07:11:00.000Z',
    workflow: 'single-evaluation',
  });
  await store.jobs.save({
    attempt: 0,
    claimOwnerId: null,
    claimToken: null,
    completedAt: null,
    createdAt: '2026-04-21T07:11:00.000Z',
    currentRunId: `${input.jobId}-run`,
    error: null,
    jobId: input.jobId,
    jobType: 'evaluate-job',
    lastHeartbeatAt: null,
    leaseExpiresAt: null,
    maxAttempts: 3,
    nextAttemptAt: null,
    payload: {
      company: 'Example Co',
    },
    result: null,
    retryBackoffMs: 1_000,
    sessionId: input.sessionId,
    startedAt: null,
    status: 'queued',
    updatedAt: '2026-04-21T07:11:00.000Z',
    waitApprovalId: null,
    waitReason: null,
  });
}

test('observability service redacts sensitive metadata and supports bounded correlation filters', async () => {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
  const observability = createObservabilityService({
    getStore: async () => store,
    getStoreStatus: store.getStatus,
  });

  try {
    await seedRuntimeContext(store, {
      jobId: 'job-001',
      sessionId: 'session-001',
    });
    const firstEvent = await observability.recordEvent({
      correlation: {
        jobId: 'job-001',
        requestId: 'request-001',
        sessionId: 'session-001',
        traceId: 'trace-001',
      },
      eventType: 'http-request-received',
      metadata: {
        nested: {
          transcript: 'raw transcript',
        },
        prompt: 'raw prompt',
        safe: 'kept',
      },
      occurredAt: '2026-04-21T07:12:00.000Z',
      summary: 'Request received.',
    });
    await observability.recordEvent({
      correlation: {
        jobId: 'job-001',
        requestId: 'request-001',
        sessionId: 'session-001',
        traceId: 'trace-001',
      },
      eventType: 'job-completed',
      metadata: {
        result: 'ok',
      },
      occurredAt: '2026-04-21T07:13:00.000Z',
      summary: 'Job completed.',
    });

    const filtered = await observability.getDiagnosticsSummary({
      limit: 1,
      traceId: 'trace-001',
    });
    const firstMetadata = firstEvent?.metadata as
      | {
          nested?: unknown;
          prompt?: unknown;
          safe?: unknown;
        }
      | undefined;

    assert.equal(firstMetadata?.prompt, '[redacted]');
    assert.deepEqual(firstMetadata?.nested, {
      transcript: '[redacted]',
    });
    assert.equal(firstMetadata?.safe, 'kept');
    assert.equal(filtered.recentEvents.length, 1);
    assert.equal(filtered.recentEvents[0]?.eventType, 'job-completed');
  } finally {
    await store.close();
    await fixture.cleanup();
  }
});

test('observability diagnostics summarize failed jobs and stay read-only while the store is absent', async () => {
  const readyFixture = await createWorkspaceFixture();
  const readyStore = await createOperationalStore({ repoRoot: readyFixture.repoRoot });
  const readyObservability = createObservabilityService({
    getStore: async () => readyStore,
    getStoreStatus: readyStore.getStatus,
  });

  try {
    await seedRuntimeContext(readyStore, {
      jobId: 'job-failed',
      sessionId: 'session-failed',
    });
    await readyObservability.recordEvent({
      correlation: {
        jobId: 'job-failed',
        requestId: 'request-failed',
        sessionId: 'session-failed',
        traceId: 'trace-failed',
      },
      eventType: 'job-failed',
      level: 'error',
      metadata: {
        message: 'Upstream API failed',
        runId: 'run-failed',
      },
      occurredAt: '2026-04-21T07:14:00.000Z',
      summary: 'Job failed.',
    });

    const readyDiagnostics = await readyObservability.getDiagnosticsSummary({
      traceId: 'trace-failed',
    });

    assert.deepEqual(readyDiagnostics.failedJobs, [
      {
        failedAt: '2026-04-21T07:14:00.000Z',
        jobId: 'job-failed',
        message: 'Upstream API failed',
        runId: 'run-failed',
        sessionId: 'session-failed',
        traceId: 'trace-failed',
      },
    ]);
  } finally {
    await readyStore.close();
    await readyFixture.cleanup();
  }

  const absentFixture = await createWorkspaceFixture();
  let getStoreCalled = false;
  const absentObservability = createObservabilityService({
    getStore: async () => {
      getStoreCalled = true;
      throw new Error('store should not be opened while absent');
    },
    getStoreStatus: () => inspectOperationalStoreStatus({ repoRoot: absentFixture.repoRoot }),
  });

  try {
    const event = await absentObservability.recordEvent({
      correlation: {
        requestId: 'request-absent',
      },
      eventType: 'http-request-received',
      metadata: null,
      occurredAt: '2026-04-21T07:15:00.000Z',
      summary: 'Absent store request.',
    });
    const diagnostics = await absentObservability.getDiagnosticsSummary();

    assert.equal(event, null);
    assert.deepEqual(diagnostics, {
      failedJobs: [],
      recentEvents: [],
    });
    assert.equal(getStoreCalled, false);
  } finally {
    await absentFixture.cleanup();
  }
});

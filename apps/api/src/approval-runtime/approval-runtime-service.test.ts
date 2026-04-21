import assert from 'node:assert/strict';
import test from 'node:test';
import { createApprovalRuntimeService } from './approval-runtime-service.js';
import { createObservabilityService } from '../observability/index.js';
import { createOperationalStore } from '../store/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';

async function createRuntimeHarness() {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
  const observability = createObservabilityService({
    getStore: async () => store,
    getStoreStatus: store.getStatus,
  });
  const approvalRuntime = createApprovalRuntimeService({
    getStore: async () => store,
    recordEvent: (input) => observability.recordEvent(input),
  });

  return {
    approvalRuntime,
    async cleanup() {
      await store.close();
      await fixture.cleanup();
    },
    observability,
    store,
  };
}

async function seedWaitingApprovalJob(harness: Awaited<ReturnType<typeof createRuntimeHarness>>) {
  await harness.store.sessions.save({
    activeJobId: 'job-approval',
    context: {
      workflow: 'single-evaluation',
    },
    createdAt: '2026-04-21T07:05:00.000Z',
    lastHeartbeatAt: '2026-04-21T07:05:00.000Z',
    runnerId: 'runner-approval',
    sessionId: 'session-approval',
    status: 'running',
    updatedAt: '2026-04-21T07:05:00.000Z',
    workflow: 'single-evaluation',
  });
  await harness.store.jobs.save({
    attempt: 1,
    claimOwnerId: 'runner-approval',
    claimToken: 'claim-approval',
    completedAt: null,
    createdAt: '2026-04-21T07:05:00.000Z',
    currentRunId: 'run-approval',
    error: null,
    jobId: 'job-approval',
    jobType: 'evaluate-job',
    lastHeartbeatAt: '2026-04-21T07:05:00.000Z',
    leaseExpiresAt: '2026-04-21T07:06:00.000Z',
    maxAttempts: 3,
    nextAttemptAt: null,
    payload: {
      company: 'Example Co',
    },
    result: null,
    retryBackoffMs: 1_000,
    sessionId: 'session-approval',
    startedAt: '2026-04-21T07:05:00.000Z',
    status: 'running',
    updatedAt: '2026-04-21T07:05:00.000Z',
    waitApprovalId: null,
    waitReason: null,
  });
}

test('approval runtime creates idempotent pending approvals and lists pending summaries', async () => {
  const harness = await createRuntimeHarness();

  try {
    await seedWaitingApprovalJob(harness);

    const firstApproval = await harness.approvalRuntime.createApproval({
      requestedAt: '2026-04-21T07:06:00.000Z',
      request: {
        action: 'send-email',
        correlation: {
          jobId: 'job-approval',
          requestId: 'request-approval',
          sessionId: 'session-approval',
          traceId: 'trace-approval',
        },
        details: {
          template: 'follow-up',
        },
        title: 'Send follow-up email',
      },
    });
    const duplicateApproval = await harness.approvalRuntime.createApproval({
      requestedAt: '2026-04-21T07:06:30.000Z',
      request: {
        action: 'send-email',
        correlation: {
          jobId: 'job-approval',
          requestId: 'request-approval-2',
          sessionId: 'session-approval',
          traceId: 'trace-approval',
        },
        details: {
          template: 'ignored',
        },
        title: 'Ignored duplicate approval',
      },
    });
    const pendingApprovals = await harness.approvalRuntime.listPendingApprovals();
    const approvalEvents = await harness.store.events.list({
      eventTypes: ['approval-requested'],
    });

    assert.equal(firstApproval.approval.status, 'pending');
    assert.equal(duplicateApproval.approval.approvalId, firstApproval.approval.approvalId);
    assert.deepEqual(pendingApprovals, [
      {
        action: 'send-email',
        approvalId: firstApproval.approval.approvalId,
        jobId: 'job-approval',
        requestedAt: '2026-04-21T07:06:00.000Z',
        sessionId: 'session-approval',
        title: 'Send follow-up email',
        traceId: 'trace-approval',
      },
    ]);
    assert.equal(approvalEvents.length, 1);
  } finally {
    await harness.cleanup();
  }
});

test('approval runtime resolves approvals into queued or failed jobs with idempotent follow-up calls', async () => {
  const harness = await createRuntimeHarness();

  try {
    await seedWaitingApprovalJob(harness);

    const approval = await harness.approvalRuntime.createApproval({
      requestedAt: '2026-04-21T07:06:00.000Z',
      request: {
        action: 'send-email',
        correlation: {
          jobId: 'job-approval',
          requestId: 'request-approval',
          sessionId: 'session-approval',
          traceId: 'trace-approval',
        },
        details: null,
        title: 'Send follow-up email',
      },
    });
    await harness.store.jobs.wait({
      approvalId: approval.approval.approvalId,
      claimToken: 'claim-approval',
      error: null,
      jobId: 'job-approval',
      nextAttemptAt: null,
      result: null,
      timestamp: '2026-04-21T07:06:00.000Z',
      waitReason: 'approval',
    });

    const approved = await harness.approvalRuntime.resolveApproval({
      approvalId: approval.approval.approvalId,
      decision: 'approved',
      reason: null,
      resolvedAt: '2026-04-21T07:07:00.000Z',
      responseMetadata: {
        approvedBy: 'operator',
      },
    });
    const approvedAgain = await harness.approvalRuntime.resolveApproval({
      approvalId: approval.approval.approvalId,
      decision: 'approved',
      reason: null,
      resolvedAt: '2026-04-21T07:08:00.000Z',
      responseMetadata: {
        approvedBy: 'operator',
      },
    });
    const queuedJob = await harness.store.jobs.getById('job-approval');
    const queuedSession = await harness.store.sessions.getById('session-approval');

    assert.equal(approved.applied, true);
    assert.equal(approvedAgain.applied, false);
    assert.equal(queuedJob?.status, 'queued');
    assert.equal(queuedJob?.waitReason, null);
    assert.equal(queuedSession?.status, 'pending');

    await harness.store.jobs.save({
      ...queuedJob!,
      claimOwnerId: 'runner-approval',
      claimToken: 'claim-approval-2',
      lastHeartbeatAt: '2026-04-21T07:09:00.000Z',
      leaseExpiresAt: '2026-04-21T07:10:00.000Z',
      startedAt: '2026-04-21T07:09:00.000Z',
      status: 'running',
      updatedAt: '2026-04-21T07:09:00.000Z',
    });
    const rejectionApproval = await harness.approvalRuntime.createApproval({
      requestedAt: '2026-04-21T07:09:30.000Z',
      request: {
        action: 'delete-draft',
        correlation: {
          jobId: 'job-approval',
          requestId: 'request-reject',
          sessionId: 'session-approval',
          traceId: 'trace-approval-reject',
        },
        details: null,
        title: 'Delete generated draft',
      },
    });
    await harness.store.jobs.wait({
      approvalId: rejectionApproval.approval.approvalId,
      claimToken: 'claim-approval-2',
      error: null,
      jobId: 'job-approval',
      nextAttemptAt: null,
      result: null,
      timestamp: '2026-04-21T07:09:30.000Z',
      waitReason: 'approval',
    });

    const rejected = await harness.approvalRuntime.resolveApproval({
      approvalId: rejectionApproval.approval.approvalId,
      decision: 'rejected',
      reason: 'Operator rejected the destructive action.',
      resolvedAt: '2026-04-21T07:10:00.000Z',
      responseMetadata: {
        rejectedBy: 'operator',
      },
    });
    const failedJob = await harness.store.jobs.getById('job-approval');
    const failedSession = await harness.store.sessions.getById('session-approval');

    assert.equal(rejected.applied, true);
    assert.equal(failedJob?.status, 'failed');
    assert.equal(failedSession?.status, 'failed');
    assert.deepEqual(failedJob?.error, {
      approvalId: rejectionApproval.approval.approvalId,
      code: 'approval-rejected',
      decision: 'rejected',
      message: 'Operator rejected the destructive action.',
      retryable: false,
    });
  } finally {
    await harness.cleanup();
  }
});

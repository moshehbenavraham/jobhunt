import assert from 'node:assert/strict';
import test from 'node:test';
import { createOperationalStore } from '../store/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { OrchestrationError } from './orchestration-contract.js';
import { createSessionLifecycle } from './session-lifecycle.js';

function createRoute(overrides: Record<string, unknown> = {}) {
  return {
    message: 'Route ready.',
    missingCapabilities: [],
    requestKind: 'launch' as const,
    sessionId: 'session-test',
    specialistId: 'evaluation-specialist' as const,
    status: 'ready' as const,
    workflow: 'single-evaluation' as const,
    ...overrides,
  };
}

async function createLifecycleHarness() {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({
    repoRoot: fixture.repoRoot,
  });
  const lifecycle = createSessionLifecycle({
    getStore: async () => store,
    now: () => Date.parse('2026-04-21T11:00:00.000Z'),
  });

  return {
    async cleanup() {
      await store.close();
      await fixture.cleanup();
    },
    lifecycle,
    store,
  };
}

test('session lifecycle creates a new launch session with orchestration metadata', async () => {
  const harness = await createLifecycleHarness();

  try {
    const session = await harness.lifecycle.ensureSession({
      request: {
        context: {
          origin: 'test',
        },
        kind: 'launch',
        sessionId: 'session-test',
        workflow: 'single-evaluation',
      },
      route: createRoute(),
    });
    const storedSession = await harness.store.sessions.getById('session-test');

    assert.equal(session?.reused, false);
    assert.equal(storedSession?.status, 'pending');
    assert.deepEqual(
      (storedSession?.context as Record<string, unknown>).orchestration,
      {
        lastRouteStatus: 'ready',
        lastRoutedAt: '2026-04-21T11:00:00.000Z',
        missingCapabilities: [],
        requestKind: 'launch',
        specialistId: 'evaluation-specialist',
        workflow: 'single-evaluation',
      },
    );
  } finally {
    await harness.cleanup();
  }
});

test('session lifecycle reuses an existing launch session for the same workflow', async () => {
  const harness = await createLifecycleHarness();

  try {
    await harness.lifecycle.ensureSession({
      request: {
        context: null,
        kind: 'launch',
        sessionId: 'session-test',
        workflow: 'single-evaluation',
      },
      route: createRoute(),
    });

    const session = await harness.lifecycle.ensureSession({
      request: {
        context: {
          refreshed: true,
        },
        kind: 'launch',
        sessionId: 'session-test',
        workflow: 'single-evaluation',
      },
      route: createRoute(),
    });

    assert.equal(session?.reused, true);
  } finally {
    await harness.cleanup();
  }
});

test('session lifecycle rejects cross-workflow reuse for the same session id', async () => {
  const harness = await createLifecycleHarness();

  try {
    await harness.lifecycle.ensureSession({
      request: {
        context: null,
        kind: 'launch',
        sessionId: 'session-test',
        workflow: 'single-evaluation',
      },
      route: createRoute(),
    });

    await assert.rejects(
      () =>
        harness.lifecycle.ensureSession({
          request: {
            context: null,
            kind: 'launch',
            sessionId: 'session-test',
            workflow: 'scan-portals',
          },
          route: createRoute({
            specialistId: 'scan-specialist',
            workflow: 'scan-portals',
          }),
        }),
      (error: unknown) => {
        assert.ok(error instanceof OrchestrationError);
        assert.equal(error.code, 'orchestration-invalid-request');
        return true;
      },
    );
  } finally {
    await harness.cleanup();
  }
});

test('session lifecycle summarizes active jobs and pending approvals for a session', async () => {
  const harness = await createLifecycleHarness();

  try {
    await harness.store.sessions.save({
      activeJobId: 'job-waiting',
      context: {},
      createdAt: '2026-04-21T11:00:00.000Z',
      lastHeartbeatAt: null,
      runnerId: null,
      sessionId: 'session-activity',
      status: 'waiting',
      updatedAt: '2026-04-21T11:00:00.000Z',
      workflow: 'single-evaluation',
    });
    await harness.store.jobs.save({
      attempt: 1,
      claimOwnerId: null,
      claimToken: null,
      completedAt: null,
      createdAt: '2026-04-21T11:00:00.000Z',
      currentRunId: 'job-waiting-run',
      error: null,
      jobId: 'job-waiting',
      jobType: 'single-evaluation',
      lastHeartbeatAt: null,
      leaseExpiresAt: null,
      maxAttempts: 3,
      nextAttemptAt: null,
      payload: {},
      result: null,
      retryBackoffMs: 1_000,
      sessionId: 'session-activity',
      startedAt: '2026-04-21T11:01:00.000Z',
      status: 'waiting',
      updatedAt: '2026-04-21T11:02:00.000Z',
      waitApprovalId: 'approval-1',
      waitReason: 'approval',
    });
    await harness.store.approvals.save({
      approvalId: 'approval-1',
      jobId: 'job-waiting',
      request: {
        action: 'approve-write',
        title: 'Approve write',
      },
      requestedAt: '2026-04-21T11:03:00.000Z',
      resolvedAt: null,
      response: null,
      sessionId: 'session-activity',
      status: 'pending',
      traceId: 'trace-approval-1',
      updatedAt: '2026-04-21T11:03:00.000Z',
    });

    const summary =
      await harness.lifecycle.summarizeActivity('session-activity');

    assert.equal(summary.job?.jobId, 'job-waiting');
    assert.equal(summary.job?.status, 'waiting');
    assert.equal(summary.pendingApproval?.approvalId, 'approval-1');
    assert.equal(summary.pendingApproval?.action, 'approve-write');
  } finally {
    await harness.cleanup();
  }
});

test('session lifecycle marks failed orchestration sessions with compensation metadata', async () => {
  const harness = await createLifecycleHarness();

  try {
    await harness.store.sessions.save({
      activeJobId: null,
      context: {},
      createdAt: '2026-04-21T11:00:00.000Z',
      lastHeartbeatAt: null,
      runnerId: null,
      sessionId: 'session-failed',
      status: 'pending',
      updatedAt: '2026-04-21T11:00:00.000Z',
      workflow: 'single-evaluation',
    });

    const summary = await harness.lifecycle.markSessionFailed({
      code: 'orchestration-bootstrap-failed',
      message: 'bootstrap exploded',
      sessionId: 'session-failed',
    });
    const storedSession =
      await harness.store.sessions.getById('session-failed');

    assert.equal(summary?.status, 'failed');
    assert.equal(storedSession?.status, 'failed');
    assert.deepEqual(
      (storedSession?.context as Record<string, Record<string, unknown>>)
        .orchestrationFailure,
      {
        code: 'orchestration-bootstrap-failed',
        failedAt: '2026-04-21T11:00:00.000Z',
        message: 'bootstrap exploded',
      },
    );
  } finally {
    await harness.cleanup();
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createOperationalStore } from './index.js';
import type { JsonValue } from '../workspace/workspace-types.js';

function createSessionRecord(overrides: Partial<{
  activeJobId: string | null;
  createdAt: string;
  lastHeartbeatAt: string | null;
  runnerId: string | null;
  sessionId: string;
  status: 'cancelled' | 'completed' | 'failed' | 'pending' | 'running' | 'waiting';
  updatedAt: string;
  workflow: string;
}> = {}) {
  return {
    activeJobId: overrides.activeJobId ?? null,
    context: {
      workflow: overrides.workflow ?? 'auto-pipeline',
    },
    createdAt: overrides.createdAt ?? '2026-04-21T04:40:00.000Z',
    lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
    runnerId: overrides.runnerId ?? null,
    sessionId: overrides.sessionId ?? 'session-001',
    status: overrides.status ?? 'pending',
    updatedAt: overrides.updatedAt ?? '2026-04-21T04:40:00.000Z',
    workflow: overrides.workflow ?? 'auto-pipeline',
  } as const;
}

function createJobRecord(overrides: Partial<{
  attempt: number;
  claimOwnerId: string | null;
  claimToken: string | null;
  completedAt: string | null;
  createdAt: string;
  currentRunId: string;
  error: JsonValue;
  jobId: string;
  jobType: string;
  lastHeartbeatAt: string | null;
  leaseExpiresAt: string | null;
  maxAttempts: number;
  nextAttemptAt: string | null;
  payload: JsonValue;
  result: JsonValue;
  retryBackoffMs: number;
  sessionId: string;
  startedAt: string | null;
  status: 'cancelled' | 'completed' | 'failed' | 'pending' | 'queued' | 'running' | 'waiting';
  updatedAt: string;
}> = {}) {
  return {
    attempt: overrides.attempt ?? 0,
    claimOwnerId: overrides.claimOwnerId ?? null,
    claimToken: overrides.claimToken ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? '2026-04-21T04:41:00.000Z',
    currentRunId: overrides.currentRunId ?? 'run-001',
    error: overrides.error ?? null,
    jobId: overrides.jobId ?? 'job-001',
    jobType: overrides.jobType ?? 'evaluate-job',
    lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
    leaseExpiresAt: overrides.leaseExpiresAt ?? null,
    maxAttempts: overrides.maxAttempts ?? 3,
    nextAttemptAt: overrides.nextAttemptAt ?? null,
    payload: overrides.payload ?? {
      company: 'Example Co',
    },
    result: overrides.result ?? null,
    retryBackoffMs: overrides.retryBackoffMs ?? 1_000,
    sessionId: overrides.sessionId ?? 'session-001',
    startedAt: overrides.startedAt ?? null,
    status: overrides.status ?? 'queued',
    updatedAt: overrides.updatedAt ?? '2026-04-21T04:41:00.000Z',
  } as const;
}

test('repositories persist and reload sessions, jobs, approvals, and run metadata with durable runner fields', async () => {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
  const session = createSessionRecord({
    activeJobId: 'job-001',
    lastHeartbeatAt: '2026-04-21T04:42:00.000Z',
    runnerId: 'runner-001',
    status: 'running',
    updatedAt: '2026-04-21T04:42:00.000Z',
  });
  const job = createJobRecord({
    attempt: 1,
    claimOwnerId: 'runner-001',
    claimToken: 'claim-token-001',
    lastHeartbeatAt: '2026-04-21T04:42:00.000Z',
    leaseExpiresAt: '2026-04-21T04:43:00.000Z',
    startedAt: '2026-04-21T04:42:00.000Z',
    status: 'running',
    updatedAt: '2026-04-21T04:42:00.000Z',
  });
  const approval = {
    approvalId: 'approval-001',
    jobId: job.jobId,
    request: {
      action: 'send-email',
    },
    requestedAt: '2026-04-21T04:43:00.000Z',
    resolvedAt: null,
    response: null,
    sessionId: session.sessionId,
    status: 'pending' as const,
    updatedAt: '2026-04-21T04:43:00.000Z',
  };
  const runMetadata = {
    createdAt: '2026-04-21T04:44:00.000Z',
    jobId: job.jobId,
    metadata: {
      checkpoint: {
        completedSteps: ['bootstrapped'],
        cursor: 'step-1',
        updatedAt: '2026-04-21T04:44:00.000Z',
        value: {
          traceId: 'trace-001',
        },
      },
    },
    runId: job.currentRunId,
    sessionId: session.sessionId,
    updatedAt: '2026-04-21T04:44:00.000Z',
  };

  try {
    assert.deepEqual(await store.sessions.save(session), session);
    assert.deepEqual(await store.jobs.save(job), job);
    assert.deepEqual(await store.approvals.save(approval), approval);
    assert.deepEqual(await store.runMetadata.save(runMetadata), runMetadata);

    assert.deepEqual(await store.sessions.getById(session.sessionId), session);
    assert.deepEqual(await store.jobs.getById(job.jobId), job);
    assert.deepEqual(await store.approvals.getById(approval.approvalId), approval);
    assert.deepEqual(await store.runMetadata.getByRunId(runMetadata.runId), runMetadata);
    assert.deepEqual(await store.runMetadata.getLatestByJobId(job.jobId), runMetadata);
    assert.deepEqual(await store.runMetadata.loadCheckpoint(runMetadata.runId), {
      completedSteps: ['bootstrapped'],
      cursor: 'step-1',
      updatedAt: '2026-04-21T04:44:00.000Z',
      value: {
        traceId: 'trace-001',
      },
    });

    assert.deepEqual(await store.sessions.listActive(), [session]);
    assert.deepEqual(await store.sessions.listByStatus('running'), [session]);
    assert.deepEqual(await store.jobs.listBySessionId(session.sessionId), [job]);
    assert.deepEqual(await store.approvals.listBySessionId(session.sessionId), [approval]);
    assert.deepEqual(await store.runMetadata.listBySessionId(session.sessionId), [runMetadata]);
  } finally {
    await store.close();
    await fixture.cleanup();
  }
});

test('job and session repositories support claims, heartbeats, retry waiting, and terminal completion', async () => {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
  const sessionId = 'session-claim';

  try {
    await store.sessions.save(
      createSessionRecord({
        sessionId,
        workflow: 'scan',
      }),
    );
    await store.jobs.save(
      createJobRecord({
        currentRunId: 'run-claim',
        jobId: 'job-claim',
        jobType: 'scan-portal',
        payload: {
          portal: 'example',
        },
        sessionId,
      }),
    );

    assert.equal((await store.jobs.listClaimable('2026-04-21T05:00:00.000Z')).length, 1);

    const claimed = await store.jobs.claimNext({
      claimOwnerId: 'runner-claim',
      claimToken: 'claim-001',
      leaseExpiresAt: '2026-04-21T05:01:00.000Z',
      timestamp: '2026-04-21T05:00:00.000Z',
    });

    assert.equal(claimed?.status, 'running');
    assert.equal(claimed?.attempt, 1);
    assert.equal(claimed?.claimOwnerId, 'runner-claim');

    const touchedSession = await store.sessions.touchHeartbeat({
      activeJobId: 'job-claim',
      runnerId: 'runner-claim',
      sessionId,
      status: 'running',
      timestamp: '2026-04-21T05:00:30.000Z',
    });
    const touchedJob = await store.jobs.touchHeartbeat({
      claimToken: 'claim-001',
      jobId: 'job-claim',
      leaseExpiresAt: '2026-04-21T05:02:00.000Z',
      timestamp: '2026-04-21T05:00:30.000Z',
    });

    assert.equal(touchedSession.runnerId, 'runner-claim');
    assert.equal(touchedJob.lastHeartbeatAt, '2026-04-21T05:00:30.000Z');

    const waitingJob = await store.jobs.wait({
      claimToken: 'claim-001',
      error: {
        message: 'Retry later',
        retryable: true,
      },
      jobId: 'job-claim',
      nextAttemptAt: '2026-04-21T05:05:00.000Z',
      result: null,
      timestamp: '2026-04-21T05:01:00.000Z',
    });

    assert.equal(waitingJob.status, 'waiting');
    assert.equal(waitingJob.nextAttemptAt, '2026-04-21T05:05:00.000Z');
    assert.equal((await store.jobs.listClaimable('2026-04-21T05:02:00.000Z')).length, 0);

    const resumed = await store.jobs.claimNext({
      claimOwnerId: 'runner-claim',
      claimToken: 'claim-002',
      leaseExpiresAt: '2026-04-21T05:06:00.000Z',
      timestamp: '2026-04-21T05:05:00.000Z',
    });

    assert.equal(resumed?.status, 'running');
    assert.equal(resumed?.attempt, 2);

    const completed = await store.jobs.complete({
      claimToken: 'claim-002',
      error: null,
      jobId: 'job-claim',
      result: {
        done: true,
      },
      status: 'completed',
      timestamp: '2026-04-21T05:06:00.000Z',
    });

    assert.equal(completed.status, 'completed');
    assert.equal(completed.claimToken, null);
  } finally {
    await store.close();
    await fixture.cleanup();
  }
});

test('stale running jobs remain recoverable and run metadata checkpoints merge in place', async () => {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });

  try {
    await store.sessions.save(
      createSessionRecord({
        activeJobId: 'job-stale',
        lastHeartbeatAt: '2026-04-21T05:10:00.000Z',
        runnerId: 'stale-runner',
        sessionId: 'session-stale',
        status: 'running',
        updatedAt: '2026-04-21T05:10:00.000Z',
      }),
    );
    await store.jobs.save(
      createJobRecord({
        attempt: 1,
        claimOwnerId: 'stale-runner',
        claimToken: 'stale-claim',
        currentRunId: 'run-stale',
        jobId: 'job-stale',
        lastHeartbeatAt: '2026-04-21T05:10:00.000Z',
        leaseExpiresAt: '2026-04-21T05:10:30.000Z',
        sessionId: 'session-stale',
        startedAt: '2026-04-21T05:10:00.000Z',
        status: 'running',
        updatedAt: '2026-04-21T05:10:00.000Z',
      }),
    );

    await store.runMetadata.saveCheckpoint({
      checkpoint: {
        completedSteps: ['downloaded-jd'],
        cursor: 'step-1',
        updatedAt: '2026-04-21T05:10:05.000Z',
        value: {
          page: 1,
        },
      },
      jobId: 'job-stale',
      runId: 'run-stale',
      sessionId: 'session-stale',
    });
    await store.runMetadata.saveCheckpoint({
      checkpoint: {
        completedSteps: ['downloaded-jd', 'scored-fit'],
        cursor: 'step-2',
        updatedAt: '2026-04-21T05:10:10.000Z',
        value: {
          page: 2,
        },
      },
      jobId: 'job-stale',
      runId: 'run-stale',
      sessionId: 'session-stale',
    });

    const recoverableJobs = await store.jobs.listRecoverable(
      '2026-04-21T05:11:00.000Z',
    );

    assert.deepEqual(recoverableJobs.map((job) => job.jobId), ['job-stale']);
    assert.deepEqual(await store.runMetadata.loadCheckpoint('run-stale'), {
      completedSteps: ['downloaded-jd', 'scored-fit'],
      cursor: 'step-2',
      updatedAt: '2026-04-21T05:10:10.000Z',
      value: {
        page: 2,
      },
    });

    const recovered = await store.jobs.claimNext({
      claimOwnerId: 'fresh-runner',
      claimToken: 'fresh-claim',
      leaseExpiresAt: '2026-04-21T05:12:00.000Z',
      timestamp: '2026-04-21T05:11:00.000Z',
    });

    assert.equal(recovered?.jobId, 'job-stale');
    assert.equal(recovered?.attempt, 1);
    assert.equal(recovered?.claimOwnerId, 'fresh-runner');
    assert.equal(recovered?.claimToken, 'fresh-claim');
  } finally {
    await store.close();
    await fixture.cleanup();
  }
});

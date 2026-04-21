import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createOperationalStore } from './index.js';

test('repositories persist and reload sessions, jobs, approvals, and run metadata', async () => {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });

  const session = {
    context: {
      workflow: 'auto-pipeline',
    },
    createdAt: '2026-04-21T04:40:00.000Z',
    lastHeartbeatAt: '2026-04-21T04:41:00.000Z',
    sessionId: 'session-001',
    status: 'running' as const,
    updatedAt: '2026-04-21T04:41:00.000Z',
    workflow: 'auto-pipeline',
  };
  const job = {
    attempt: 1,
    completedAt: null,
    createdAt: '2026-04-21T04:41:30.000Z',
    error: null,
    jobId: 'job-001',
    jobType: 'evaluate-job',
    payload: {
      company: 'Example Co',
    },
    result: null,
    sessionId: session.sessionId,
    startedAt: '2026-04-21T04:42:00.000Z',
    status: 'running' as const,
    updatedAt: '2026-04-21T04:42:00.000Z',
  };
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
      traceId: 'trace-001',
    },
    runId: 'run-001',
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

    assert.deepEqual(await store.sessions.listByStatus('running'), [session]);
    assert.deepEqual(await store.jobs.listBySessionId(session.sessionId), [job]);
    assert.deepEqual(await store.approvals.listBySessionId(session.sessionId), [approval]);
    assert.deepEqual(await store.runMetadata.listBySessionId(session.sessionId), [runMetadata]);
  } finally {
    await store.close();
    await fixture.cleanup();
  }
});

test('repository saves stay idempotent for repeated identifiers', async () => {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });

  try {
    await store.sessions.save({
      context: {
        workflow: 'scan',
      },
      createdAt: '2026-04-21T04:45:00.000Z',
      lastHeartbeatAt: null,
      sessionId: 'session-002',
      status: 'pending',
      updatedAt: '2026-04-21T04:45:00.000Z',
      workflow: 'scan',
    });

    const updatedSession = await store.sessions.save({
      context: {
        workflow: 'scan',
        worker: 'scan-1',
      },
      createdAt: '2026-04-21T04:00:00.000Z',
      lastHeartbeatAt: '2026-04-21T04:47:00.000Z',
      sessionId: 'session-002',
      status: 'running',
      updatedAt: '2026-04-21T04:47:00.000Z',
      workflow: 'scan',
    });

    await store.jobs.save({
      attempt: 0,
      completedAt: null,
      createdAt: '2026-04-21T04:46:00.000Z',
      error: null,
      jobId: 'job-002',
      jobType: 'scan-portal',
      payload: {
        portal: 'example',
      },
      result: null,
      sessionId: 'session-002',
      startedAt: null,
      status: 'queued',
      updatedAt: '2026-04-21T04:46:00.000Z',
    });

    const updatedJob = await store.jobs.save({
      attempt: 1,
      completedAt: '2026-04-21T04:49:00.000Z',
      createdAt: '2026-04-21T03:59:00.000Z',
      error: null,
      jobId: 'job-002',
      jobType: 'scan-portal',
      payload: {
        portal: 'example',
        page: 1,
      },
      result: {
        active: true,
      },
      sessionId: 'session-002',
      startedAt: '2026-04-21T04:48:00.000Z',
      status: 'completed',
      updatedAt: '2026-04-21T04:49:00.000Z',
    });

    await store.approvals.save({
      approvalId: 'approval-002',
      jobId: 'job-002',
      request: {
        action: 'approve-scan',
      },
      requestedAt: '2026-04-21T04:50:00.000Z',
      resolvedAt: null,
      response: null,
      sessionId: 'session-002',
      status: 'pending',
      updatedAt: '2026-04-21T04:50:00.000Z',
    });

    const updatedApproval = await store.approvals.save({
      approvalId: 'approval-002',
      jobId: 'job-002',
      request: {
        action: 'approve-scan',
      },
      requestedAt: '2026-04-21T04:00:00.000Z',
      resolvedAt: '2026-04-21T04:51:00.000Z',
      response: {
        decision: 'approved',
      },
      sessionId: 'session-002',
      status: 'approved',
      updatedAt: '2026-04-21T04:51:00.000Z',
    });

    await store.runMetadata.save({
      createdAt: '2026-04-21T04:52:00.000Z',
      jobId: 'job-002',
      metadata: {
        traceId: 'trace-002',
      },
      runId: 'run-002',
      sessionId: 'session-002',
      updatedAt: '2026-04-21T04:52:00.000Z',
    });

    const updatedRunMetadata = await store.runMetadata.save({
      createdAt: '2026-04-21T04:00:00.000Z',
      jobId: 'job-002',
      metadata: {
        traceId: 'trace-002',
        warningCount: 1,
      },
      runId: 'run-002',
      sessionId: 'session-002',
      updatedAt: '2026-04-21T04:53:00.000Z',
    });

    assert.equal(updatedSession.createdAt, '2026-04-21T04:45:00.000Z');
    assert.equal(updatedJob.createdAt, '2026-04-21T04:46:00.000Z');
    assert.equal(updatedApproval.requestedAt, '2026-04-21T04:50:00.000Z');
    assert.equal(updatedRunMetadata.createdAt, '2026-04-21T04:52:00.000Z');

    assert.equal((await store.sessions.listByStatus('running')).length, 1);
    assert.equal((await store.jobs.listBySessionId('session-002')).length, 1);
    assert.equal((await store.approvals.listBySessionId('session-002')).length, 1);
    assert.equal((await store.runMetadata.listBySessionId('session-002')).length, 1);
  } finally {
    await store.close();
    await fixture.cleanup();
  }
});

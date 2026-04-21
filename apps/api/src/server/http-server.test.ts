import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import {
  createAgentRuntimeAuthFixture,
  getRepoOpenAIAccountModuleImportPath,
  startFakeCodexBackend,
} from '../agent-runtime/test-utils.js';
import { createAgentRuntimeService } from '../agent-runtime/index.js';
import { STARTUP_SESSION_ID, STARTUP_SERVICE_NAME } from '../index.js';
import {
  createApiServiceContainer,
  type ApiServiceContainer,
} from '../runtime/service-container.js';
import { createOperationalStore } from '../store/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { startStartupHttpServer } from './http-server.js';

async function readJsonResponse(
  url: string,
  init: RequestInit = {},
): Promise<{
  payload: unknown;
  response: Response;
}> {
  const response = await fetch(url, init);
  const payload = await response.json();

  return {
    payload,
    response,
  };
}

async function createReadyFixture() {
  return createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
}

const ONBOARDING_TEMPLATE_FIXTURE_FILES = {
  'config/portals.example.yml': 'title_filter:\n  positive:\n    - AI Engineer\n',
  'config/profile.example.yml': 'candidate:\n  full_name: Template User\n',
  'data/applications.example.md': [
    '# Applications Tracker',
    '',
    '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
    '',
  ].join('\n'),
  'modes/_profile.template.md': '# Profile Template\n',
  'profile/cv.example.md': '# Template CV\n',
};

async function createOnboardingFixture(
  files: Record<string, string> = {},
) {
  return createWorkspaceFixture({
    files: {
      ...ONBOARDING_TEMPLATE_FIXTURE_FILES,
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
      ...files,
    },
  });
}

async function seedRuntimeContext(
  store: Awaited<ReturnType<typeof createOperationalStore>>,
  input: {
    jobId: string;
    sessionId: string;
  },
): Promise<void> {
  await store.sessions.save({
    activeJobId: input.jobId,
    context: {
      workflow: 'single-evaluation',
    },
    createdAt: '2026-04-21T07:24:00.000Z',
    lastHeartbeatAt: '2026-04-21T07:24:00.000Z',
    runnerId: 'runner-http',
    sessionId: input.sessionId,
    status: 'running',
    updatedAt: '2026-04-21T07:24:00.000Z',
    workflow: 'single-evaluation',
  });
  await store.jobs.save({
    attempt: 1,
    claimOwnerId: 'runner-http',
    claimToken: 'claim-http',
    completedAt: null,
    createdAt: '2026-04-21T07:24:00.000Z',
    currentRunId: `${input.jobId}-run`,
    error: null,
    jobId: input.jobId,
    jobType: 'evaluate-job',
    lastHeartbeatAt: '2026-04-21T07:24:00.000Z',
    leaseExpiresAt: '2026-04-21T07:25:00.000Z',
    maxAttempts: 3,
    nextAttemptAt: null,
    payload: {
      company: 'HTTP Co',
    },
    result: null,
    retryBackoffMs: 1_000,
    sessionId: input.sessionId,
    startedAt: '2026-04-21T07:24:00.000Z',
    status: 'running',
    updatedAt: '2026-04-21T07:24:00.000Z',
    waitApprovalId: null,
    waitReason: null,
  });
}

async function seedWaitingApprovalContext(
  input: {
    approvalRuntime: Awaited<
      ReturnType<ApiServiceContainer['approvalRuntime']['getService']>
    >;
    observability: Awaited<
      ReturnType<ApiServiceContainer['observability']['getService']>
    >;
    store: Awaited<ReturnType<typeof createOperationalStore>>;
    title: string;
    jobId: string;
    requestId: string;
    sessionId: string;
    timestamp: string;
    traceId: string;
    workflow: string;
  },
) {
  await input.store.sessions.save({
    activeJobId: input.jobId,
    context: {
      workflow: input.workflow,
    },
    createdAt: input.timestamp,
    lastHeartbeatAt: input.timestamp,
    runnerId: 'runner-approval-http',
    sessionId: input.sessionId,
    status: 'waiting',
    updatedAt: input.timestamp,
    workflow: input.workflow,
  });

  await input.store.jobs.save({
    attempt: 1,
    claimOwnerId: 'runner-approval-http',
    claimToken: 'claim-approval-http',
    completedAt: null,
    createdAt: input.timestamp,
    currentRunId: `${input.jobId}-run`,
    error: null,
    jobId: input.jobId,
    jobType: 'evaluate-job',
    lastHeartbeatAt: input.timestamp,
    leaseExpiresAt: null,
    maxAttempts: 3,
    nextAttemptAt: null,
    payload: {
      company: input.title,
    },
    result: null,
    retryBackoffMs: 1_000,
    sessionId: input.sessionId,
    startedAt: input.timestamp,
    status: 'running',
    updatedAt: input.timestamp,
    waitApprovalId: null,
    waitReason: null,
  });

  const approval = await input.approvalRuntime.createApproval({
    requestedAt: input.timestamp,
    request: {
      action: 'approval-review',
      correlation: {
        jobId: input.jobId,
        requestId: input.requestId,
        sessionId: input.sessionId,
        traceId: input.traceId,
      },
      details: {
        label: input.title,
      },
      title: input.title,
    },
  });

  await input.store.jobs.save({
    attempt: 1,
    claimOwnerId: 'runner-approval-http',
    claimToken: 'claim-approval-http',
    completedAt: null,
    createdAt: input.timestamp,
    currentRunId: `${input.jobId}-run`,
    error: null,
    jobId: input.jobId,
    jobType: 'evaluate-job',
    lastHeartbeatAt: input.timestamp,
    leaseExpiresAt: null,
    maxAttempts: 3,
    nextAttemptAt: null,
    payload: {
      company: input.title,
    },
    result: null,
    retryBackoffMs: 1_000,
    sessionId: input.sessionId,
    startedAt: input.timestamp,
    status: 'waiting',
    updatedAt: input.timestamp,
    waitApprovalId: approval.approval.approvalId,
    waitReason: 'approval',
  });

  await input.observability.recordEvent({
    correlation: {
      approvalId: approval.approval.approvalId,
      jobId: input.jobId,
      requestId: input.requestId,
      sessionId: input.sessionId,
      traceId: input.traceId,
    },
    eventType: 'job-waiting-approval',
    metadata: {
      waitReason: 'approval',
    },
    occurredAt: input.timestamp,
    summary: `${input.title} is waiting for approval.`,
  });

  return approval.approval;
}

test('health and startup routes report ready diagnostics after explicit store initialization', async () => {
  const fixture = await createReadyFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const backend = await startFakeCodexBackend();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
  await store.close();
  await authFixture.setReady({ accountId: 'acct-http-ready' });
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      env: {
        JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
        JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
        JOBHUNT_API_OPENAI_ORIGINATOR: 'jobhunt-http-test',
      },
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });

  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    rateLimitMaxRequests: 20,
    services,
  });

  try {
    const { payload: healthPayload, response: healthResponse } =
      await readJsonResponse(`${handle.url}/health`);
    const { payload: startupPayload, response: startupResponse } =
      await readJsonResponse(`${handle.url}/startup`);

    assert.equal(healthResponse.status, 200);
    assert.equal(startupResponse.status, 200);

    assert.equal(
      (healthPayload as { service: string }).service,
      STARTUP_SERVICE_NAME,
    );
    assert.equal(
      (healthPayload as { sessionId: string }).sessionId,
      STARTUP_SESSION_ID,
    );
    assert.equal((healthPayload as { status: string }).status, 'ok');
    assert.equal(
      (
        healthPayload as {
          agentRuntime: { status: string };
        }
      ).agentRuntime.status,
      'ready',
    );
    assert.equal(
      (healthPayload as { operationalStore: { status: string } })
        .operationalStore.status,
      'ready',
    );

    assert.equal((startupPayload as { status: string }).status, 'ready');
    assert.equal(
      (
        startupPayload as {
          diagnostics: { agentRuntime: { status: string } };
        }
      ).diagnostics.agentRuntime.status,
      'ready',
    );
    assert.equal(
      (startupPayload as { operationalStore: { status: string } })
        .operationalStore.status,
      'ready',
    );
    assert.equal(
      (
        startupPayload as {
          diagnostics: { onboardingMissing: unknown[] };
        }
      ).diagnostics.onboardingMissing.length,
      0,
    );
    assert.equal(
      (
        startupPayload as {
          diagnostics: { runtimeMissing: unknown[] };
        }
      ).diagnostics.runtimeMissing.length,
      0,
    );
    assert.equal(
      (
        startupPayload as {
          diagnostics: { currentSession: { id: string } };
        }
      ).diagnostics.currentSession.id,
      STARTUP_SESSION_ID,
    );
    assert.equal(
      (
        startupPayload as {
          bootSurface: { startupPath: string };
        }
      ).bootSurface.startupPath,
      '/startup',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await backend.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('startup route reports onboarding gaps without mutating user-layer files', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const beforeSnapshot = await fixture.snapshotUserLayer();
  const appStateRoot = join(fixture.repoRoot, '.jobhunt-app');
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    rateLimitMaxRequests: 20,
    services,
  });

  try {
    const { payload: healthPayload, response: healthResponse } =
      await readJsonResponse(`${handle.url}/health`);
    const { payload: startupPayload, response: startupResponse } =
      await readJsonResponse(`${handle.url}/startup`);
    const afterSnapshot = await fixture.snapshotUserLayer();

    assert.equal(healthResponse.status, 200);
    assert.equal(startupResponse.status, 200);
    assert.equal((healthPayload as { status: string }).status, 'degraded');
    assert.equal(
      (healthPayload as { operationalStore: { status: string } })
        .operationalStore.status,
      'absent',
    );
    assert.equal(
      (startupPayload as { status: string }).status,
      'missing-prerequisites',
    );
    assert.equal(
      (
        startupPayload as {
          diagnostics: { agentRuntime: { status: string } };
        }
      ).diagnostics.agentRuntime.status,
      'auth-required',
    );
    assert.equal(
      (startupPayload as { operationalStore: { status: string } })
        .operationalStore.status,
      'absent',
    );
    assert.deepEqual(afterSnapshot, beforeSnapshot);
    assert.equal(existsSync(appStateRoot), false);
    assert.deepEqual(
      (
        startupPayload as {
          diagnostics: {
            onboardingMissing: Array<{ surfaceKey: string }>;
          };
        }
      ).diagnostics.onboardingMissing.map((item) => item.surfaceKey),
      ['profileConfig', 'profileCv'],
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('startup routes surface agent runtime auth-required status without mutating user-layer files', async () => {
  const fixture = await createReadyFixture();
  const beforeSnapshot = await fixture.snapshotUserLayer();
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    rateLimitMaxRequests: 20,
    services,
  });

  try {
    const { payload: healthPayload, response: healthResponse } =
      await readJsonResponse(`${handle.url}/health`);
    const { payload: startupPayload, response: startupResponse } =
      await readJsonResponse(`${handle.url}/startup`);
    const afterSnapshot = await fixture.snapshotUserLayer();

    assert.equal(healthResponse.status, 200);
    assert.equal(startupResponse.status, 200);
    assert.equal((healthPayload as { status: string }).status, 'degraded');
    assert.equal(
      (startupPayload as { status: string }).status,
      'auth-required',
    );
    assert.equal(
      (
        startupPayload as {
          diagnostics: { agentRuntime: { auth: { authPath: string } } };
        }
      ).diagnostics.agentRuntime.auth.authPath,
      join(fixture.repoRoot, 'data', 'openai-account-auth.json'),
    );
    assert.deepEqual(afterSnapshot, beforeSnapshot);
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('operator-shell route reports missing prerequisites without creating runtime activity state', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    rateLimitMaxRequests: 20,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/operator-shell`,
    );

    assert.equal(response.status, 200);
    assert.equal((payload as { status: string }).status, 'missing-prerequisites');
    assert.equal(
      (
        payload as {
          activity: { state: string };
        }
      ).activity.state,
      'unavailable',
    );
    assert.equal(
      (
        payload as {
          health: { missing: { onboarding: number } };
        }
      ).health.missing.onboarding,
      2,
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('operator-shell route reports ready shell state without leaking raw runtime records', async () => {
  const fixture = await createReadyFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const backend = await startFakeCodexBackend();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
  await store.close();
  await authFixture.setReady({ accountId: 'acct-http-shell-ready' });
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      env: {
        JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
        JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
        JOBHUNT_API_OPENAI_ORIGINATOR: 'jobhunt-http-shell-test',
      },
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/operator-shell`,
    );

    assert.equal(response.status, 200);
    assert.equal((payload as { status: string }).status, 'ready');
    assert.equal(
      (
        payload as {
          activity: {
            activeSession: null;
            pendingApprovalCount: number;
            recentFailureCount: number;
            state: string;
          };
        }
      ).activity.state,
      'idle',
    );
    assert.equal(
      (
        payload as {
          activity: {
            activeSession: null;
            pendingApprovalCount: number;
            recentFailureCount: number;
          };
        }
      ).activity.pendingApprovalCount,
      0,
    );
    assert.equal(
      (
        payload as {
          activity: {
            activeSession: null;
            pendingApprovalCount: number;
            recentFailureCount: number;
          };
        }
      ).activity.recentFailureCount,
      0,
    );
    assert.equal(
      (
        payload as {
          activity: { activeSession: null };
        }
      ).activity.activeSession,
      null,
    );
    assert.equal(
      (
        payload as {
          currentSession: { id: string };
        }
      ).currentSession.id,
      STARTUP_SESSION_ID,
    );
    assert.equal(
      'diagnostics' in (payload as Record<string, unknown>),
      false,
    );
  } finally {
    await handle.close();
    await services.dispose();
    await backend.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('startup routes surface corrupt operational-store state as a runtime error', async () => {
  const fixture = await createReadyFixture();
  const corruptStorePath = join(fixture.repoRoot, '.jobhunt-app', 'app.db');
  await mkdir(join(fixture.repoRoot, '.jobhunt-app'), { recursive: true });
  await writeFile(corruptStorePath, 'not sqlite\n', 'utf8');
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });

  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload: healthPayload, response: healthResponse } =
      await readJsonResponse(`${handle.url}/health`);
    const { payload: startupPayload, response: startupResponse } =
      await readJsonResponse(`${handle.url}/startup`);

    assert.equal(healthResponse.status, 503);
    assert.equal(startupResponse.status, 503);
    assert.equal((healthPayload as { status: string }).status, 'error');
    assert.equal(
      (healthPayload as { startupStatus: string }).startupStatus,
      'runtime-error',
    );
    assert.equal(
      (startupPayload as { status: string }).status,
      'runtime-error',
    );
    assert.equal(
      (
        startupPayload as {
          operationalStore: { status: string };
        }
      ).operationalStore.status,
      'corrupt',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('startup route maps repo-root resolution failures to explicit error payloads', async () => {
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    repoRoot: join(process.cwd(), 'not-a-valid-repo-root'),
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/startup`,
    );

    assert.equal(response.status, 500);
    assert.equal(
      (payload as { error: { code: string } }).error.code,
      'repo-root-resolution-failed',
    );
    assert.equal((payload as { status: string }).status, 'error');
  } finally {
    await handle.close();
  }
});

test('operator-shell route exposes active-work badges and validates bounded query params', async () => {
  const fixture = await createReadyFixture();
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const store = await services.operationalStore.getStore();
  await seedRuntimeContext(store, {
    jobId: 'job-shell-route',
    sessionId: 'session-shell-route',
  });
  const approvalRuntime = await services.approvalRuntime.getService();
  const observability = await services.observability.getService();
  const approval = await approvalRuntime.createApproval({
    requestedAt: '2026-04-21T08:10:00.000Z',
    request: {
      action: 'apply-with-review',
      correlation: {
        jobId: 'job-shell-route',
        requestId: 'request-shell-route',
        sessionId: 'session-shell-route',
        traceId: 'trace-shell-route',
      },
      details: null,
      title: 'Review shell approval',
    },
  });
  await observability.recordEvent({
    correlation: {
      jobId: 'job-shell-route',
      requestId: 'request-shell-route',
      sessionId: 'session-shell-route',
      traceId: 'trace-shell-route',
    },
    eventType: 'job-failed',
    level: 'error',
    metadata: {
      message: 'Shell route failure',
      runId: 'job-shell-route-run',
    },
    occurredAt: '2026-04-21T08:11:00.000Z',
    summary: 'Shell job failed.',
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/operator-shell?approvalLimit=1&failureLimit=1`,
    );

    assert.equal(response.status, 200);
    assert.equal(
      (
        payload as {
          activity: { state: string };
        }
      ).activity.state,
      'attention-required',
    );
    assert.equal(
      (
        payload as {
          activity: {
            activeSession: { sessionId: string; activeJobId: string | null };
          };
        }
      ).activity.activeSession.sessionId,
      'session-shell-route',
    );
    assert.equal(
      (
        payload as {
          activity: {
            activeSession: { sessionId: string; activeJobId: string | null };
          };
        }
      ).activity.activeSession.activeJobId,
      'job-shell-route',
    );
    assert.equal(
      (
        payload as {
          activity: { pendingApprovalCount: number };
        }
      ).activity.pendingApprovalCount,
      1,
    );
    assert.equal(
      (
        payload as {
          activity: { recentFailureCount: number };
        }
      ).activity.recentFailureCount,
      1,
    );
    assert.equal(
      (
        payload as {
          activity: { latestPendingApprovals: Array<{ approvalId: string }> };
        }
      ).activity.latestPendingApprovals[0]?.approvalId,
      approval.approval.approvalId,
    );
    assert.equal(
      (
        payload as {
          activity: { recentFailures: Array<{ jobId: string }> };
        }
      ).activity.recentFailures[0]?.jobId,
      'job-shell-route',
    );

    const { payload: invalidPayload, response: invalidResponse } =
      await readJsonResponse(`${handle.url}/operator-shell?approvalLimit=0`);

    assert.equal(invalidResponse.status, 400);
    assert.equal(
      (
        invalidPayload as {
          error: { code: string };
        }
      ).error.code,
      'invalid-operator-shell-query',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('chat-console route reports workflow support and selected-session detail without leaking store internals', async () => {
  const fixture = await createReadyFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const backend = await startFakeCodexBackend();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
  await store.close();
  await authFixture.setReady({ accountId: 'acct-http-chat-console' });
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      env: {
        JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
        JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
        JOBHUNT_API_OPENAI_ORIGINATOR: 'jobhunt-http-chat-console-test',
      },
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const runtimeStore = await services.operationalStore.getStore();
  await seedRuntimeContext(runtimeStore, {
    jobId: 'job-chat-console',
    sessionId: 'session-chat-console',
  });
  const approvalRuntime = await services.approvalRuntime.getService();
  const observability = await services.observability.getService();
  await approvalRuntime.createApproval({
    requestedAt: '2026-04-21T08:15:00.000Z',
    request: {
      action: 'approve-chat-console',
      correlation: {
        jobId: 'job-chat-console',
        requestId: 'request-chat-console',
        sessionId: 'session-chat-console',
        traceId: 'trace-chat-console',
      },
      details: null,
      title: 'Approve chat console run',
    },
  });
  await observability.recordEvent({
    correlation: {
      jobId: 'job-chat-console',
      requestId: 'request-chat-console',
      sessionId: 'session-chat-console',
      traceId: 'trace-chat-console',
    },
    eventType: 'job-waiting-approval',
    metadata: {
      waitReason: 'approval',
    },
    occurredAt: '2026-04-21T08:16:00.000Z',
    summary: 'Chat console run is waiting for approval.',
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/chat-console?sessionId=session-chat-console`,
    );

    assert.equal(response.status, 200);
    assert.equal((payload as { status: string }).status, 'ready');
    assert.equal(
      (
        payload as {
          workflows: Array<{ intent: string; status: string }>;
        }
      ).workflows.some(
        (workflow) =>
          workflow.intent === 'single-evaluation' &&
          workflow.status === 'ready',
      ),
      true,
    );
    assert.equal(
      (
        payload as {
          recentSessions: Array<{ sessionId: string }>;
        }
      ).recentSessions[0]?.sessionId,
      'session-chat-console',
    );
    assert.equal(
      (
        payload as {
          selectedSession: { session: { state: string } };
        }
      ).selectedSession.session.state,
      'waiting-for-approval',
    );
    assert.equal(
      (
        payload as {
          selectedSession: { timeline: Array<{ summary: string }> };
        }
      ).selectedSession.timeline[0]?.summary,
      'Chat console run is waiting for approval.',
    );
    assert.equal(
      'context' in
        (
          payload as {
            selectedSession: { session: Record<string, unknown> };
          }
        ).selectedSession.session,
      false,
    );
  } finally {
    await handle.close();
    await services.dispose();
    await backend.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('orchestration route returns auth-blocked launch handoffs and explicit missing-session resume envelopes', async () => {
  const fixture = await createReadyFixture();
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload: launchPayload, response: launchResponse } =
      await readJsonResponse(`${handle.url}/orchestration`, {
        body: JSON.stringify({
          context: {
            promptText: 'Evaluate this JD',
          },
          kind: 'launch',
          workflow: 'single-evaluation',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });

    assert.equal(launchResponse.status, 200);
    assert.equal(
      (
        launchPayload as {
          handoff: { route: { status: string } };
        }
      ).handoff.route.status,
      'ready',
    );
    assert.equal(
      (
        launchPayload as {
          handoff: { runtime: { status: string } };
        }
      ).handoff.runtime.status,
      'blocked',
    );
    assert.equal(
      (
        launchPayload as {
          handoff: { state: string };
        }
      ).handoff.state,
      'auth-required',
    );
    assert.equal(
      (
        launchPayload as {
          handoff: { selectedSession: { session: { sessionId: string } } };
        }
      ).handoff.selectedSession.session.sessionId.length > 0,
      true,
    );

    const { payload: resumePayload, response: resumeResponse } =
      await readJsonResponse(`${handle.url}/orchestration`, {
        body: JSON.stringify({
          kind: 'resume',
          sessionId: 'missing-session',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });

    assert.equal(resumeResponse.status, 200);
    assert.equal(
      (
        resumePayload as {
          handoff: { route: { status: string } };
        }
      ).handoff.route.status,
      'session-not-found',
    );
    assert.equal(
      (
        resumePayload as {
          handoff: { state: string };
        }
      ).handoff.state,
      'failed',
    );
    assert.equal(
      (
        resumePayload as {
          handoff: { selectedSession: unknown | null };
        }
      ).handoff.selectedSession,
      null,
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('health route handles HEAD requests without emitting a response body', async () => {
  const fixture = await createReadyFixture();
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const response = await fetch(`${handle.url}/health`, {
      method: 'HEAD',
    });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(body, '');
    assert.equal(
      response.headers.get('content-type'),
      'application/json; charset=utf-8',
    );
    assert.equal(
      Number(response.headers.get('content-length') ?? '0') > 0,
      true,
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('runtime approval and diagnostics routes expose pending approvals, failed diagnostics, and request correlation headers', async () => {
  const fixture = await createReadyFixture();
  const services = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });
  const store = await services.operationalStore.getStore();
  await seedRuntimeContext(store, {
    jobId: 'job-runtime-route',
    sessionId: 'session-runtime-route',
  });
  const approvalRuntime = await services.approvalRuntime.getService();
  const observability = await services.observability.getService();
  const approval = await approvalRuntime.createApproval({
    requestedAt: '2026-04-21T07:24:30.000Z',
    request: {
      action: 'send-email',
      correlation: {
        jobId: 'job-runtime-route',
        requestId: 'request-runtime-route',
        sessionId: 'session-runtime-route',
        traceId: 'trace-runtime-route',
      },
      details: null,
      title: 'Send route email',
    },
  });
  await observability.recordEvent({
    correlation: {
      jobId: 'job-runtime-route',
      requestId: 'request-runtime-route',
      sessionId: 'session-runtime-route',
      traceId: 'trace-runtime-route',
    },
    eventType: 'job-failed',
    level: 'error',
    metadata: {
      message: 'Route diagnostics failure',
      runId: 'job-runtime-route-run',
    },
    occurredAt: '2026-04-21T07:25:00.000Z',
    summary: 'Job failed.',
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload: approvalsPayload, response: approvalsResponse } =
      await readJsonResponse(
        `${handle.url}/runtime/approvals?sessionId=session-runtime-route`,
      );
    const approvalsRequestId = approvalsResponse.headers.get('x-request-id');
    const approvalsTraceId = approvalsResponse.headers.get('x-trace-id');
    const { payload: diagnosticsPayload, response: diagnosticsResponse } =
      await readJsonResponse(
        `${handle.url}/runtime/diagnostics?traceId=trace-runtime-route`,
      );

    assert.equal(approvalsResponse.status, 200);
    assert.equal(diagnosticsResponse.status, 200);
    assert.ok(approvalsRequestId);
    assert.ok(approvalsTraceId);
    assert.equal(
      (approvalsPayload as { approvals: Array<{ approvalId: string }> })
        .approvals[0]?.approvalId,
      approval.approval.approvalId,
    );
    assert.equal(
      (
        diagnosticsPayload as {
          diagnostics: { failedJobs: Array<{ jobId: string }> };
        }
      ).diagnostics.failedJobs[0]?.jobId,
      'job-runtime-route',
    );

    const requestEvents = await store.events.list({
      requestId: approvalsRequestId ?? undefined,
    });

    assert.equal(
      requestEvents.some(
        (event) => event.eventType === 'http-request-completed',
      ),
      true,
    );
    assert.equal(
      requestEvents.some(
        (event) => event.eventType === 'http-request-received',
      ),
      true,
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('approval inbox and resolution routes cover filtered queue reads, stale states, rejected handoffs, and invalid input handling', async () => {
  const fixture = await createReadyFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const backend = await startFakeCodexBackend();
  const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
  await store.close();
  await authFixture.setReady({ accountId: 'acct-http-approval-inbox' });
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      env: {
        JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
        JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
        JOBHUNT_API_OPENAI_ORIGINATOR: 'jobhunt-http-approval-inbox-test',
      },
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const runtimeStore = await services.operationalStore.getStore();
  const approvalRuntime = await services.approvalRuntime.getService();
  const observability = await services.observability.getService();
  const primaryApproval = await seedWaitingApprovalContext({
    approvalRuntime,
    jobId: 'job-approval-primary',
    observability,
    requestId: 'request-approval-primary',
    sessionId: 'session-approval-primary',
    store: runtimeStore,
    timestamp: '2026-04-21T09:00:00.000Z',
    title: 'Review primary approval',
    traceId: 'trace-approval-primary',
    workflow: 'single-evaluation',
  });
  const rejectedApproval = await seedWaitingApprovalContext({
    approvalRuntime,
    jobId: 'job-approval-rejected',
    observability,
    requestId: 'request-approval-rejected',
    sessionId: 'session-approval-rejected',
    store: runtimeStore,
    timestamp: '2026-04-21T09:01:00.000Z',
    title: 'Review rejected approval',
    traceId: 'trace-approval-rejected',
    workflow: 'single-evaluation',
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    rateLimitMaxRequests: 20,
    services,
  });

  try {
    const { payload: filteredPayload, response: filteredResponse } =
      await readJsonResponse(
        `${handle.url}/approval-inbox?sessionId=session-approval-primary&approvalId=${primaryApproval.approvalId}&limit=1`,
      );

    assert.equal(filteredResponse.status, 200);
    assert.equal((filteredPayload as { status: string }).status, 'ready');
    assert.equal(
      (
        filteredPayload as {
          pendingApprovalCount: number;
        }
      ).pendingApprovalCount,
      1,
    );
    assert.equal(
      (
        filteredPayload as {
          queue: Array<{ approvalId: string }>;
        }
      ).queue[0]?.approvalId,
      primaryApproval.approvalId,
    );
    assert.equal(
      (
        filteredPayload as {
          selected: {
            selectionState: string;
            approval: { approvalId: string; status: string };
            interruptedRun: { state: string };
            route: { message: string };
            session: { pendingApprovalCount: number };
            timeline: Array<{ summary: string }>;
          };
        }
      ).selected.selectionState,
      'active',
    );
    assert.equal(
      (
        filteredPayload as {
          selected: {
            approval: { approvalId: string; status: string };
          };
        }
      ).selected.approval.approvalId,
      primaryApproval.approvalId,
    );
    assert.equal(
      (
        filteredPayload as {
          selected: {
            approval: { approvalId: string; status: string };
          };
        }
      ).selected.approval.status,
      'pending',
    );
    assert.equal(
      (
        filteredPayload as {
          selected: {
            interruptedRun: { state: string };
          };
        }
      ).selected.interruptedRun.state,
      'waiting-for-approval',
    );
    assert.equal(
      (
        filteredPayload as {
          selected: {
            session: { pendingApprovalCount: number };
          };
        }
      ).selected.session.pendingApprovalCount,
      1,
    );
    assert.equal(
      (
        filteredPayload as {
          selected: {
            timeline: Array<{ summary: string }>;
          };
        }
      ).selected.timeline.some(
        (item) => item.summary === 'Review primary approval is waiting for approval.',
      ),
      true,
    );
    assert.equal(
      'request' in
        (
          filteredPayload as {
            selected: { approval: Record<string, unknown> };
          }
        ).selected.approval,
      false,
    );

    const { payload: approvePayload, response: approveResponse } =
      await readJsonResponse(`${handle.url}/approval-resolution`, {
        body: JSON.stringify({
          approvalId: primaryApproval.approvalId,
          decision: 'approved',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });

    assert.equal(approveResponse.status, 200);
    assert.equal(
      (
        approvePayload as {
          resolution: { outcome: string; applied: boolean; job: { status: string } };
        }
      ).resolution.outcome,
      'approved',
    );
    assert.equal(
      (
        approvePayload as {
          resolution: { outcome: string; applied: boolean; job: { status: string } };
        }
      ).resolution.applied,
      true,
    );
    assert.equal(
      (
        approvePayload as {
          resolution: { outcome: string; applied: boolean; job: { status: string } };
        }
      ).resolution.job.status,
      'queued',
    );

    const { payload: staleApprovePayload, response: staleApproveResponse } =
      await readJsonResponse(`${handle.url}/approval-resolution`, {
        body: JSON.stringify({
          approvalId: primaryApproval.approvalId,
          decision: 'approved',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });

    assert.equal(staleApproveResponse.status, 200);
    assert.equal(
      (
        staleApprovePayload as {
          resolution: { outcome: string; applied: boolean };
        }
      ).resolution.outcome,
      'already-approved',
    );
    assert.equal(
      (
        staleApprovePayload as {
          resolution: { outcome: string; applied: boolean };
        }
      ).resolution.applied,
      false,
    );

    const { payload: approvedSummaryPayload, response: approvedSummaryResponse } =
      await readJsonResponse(
        `${handle.url}/approval-inbox?approvalId=${primaryApproval.approvalId}`,
      );

    assert.equal(approvedSummaryResponse.status, 200);
    assert.equal(
      (
        approvedSummaryPayload as {
          selected: { selectionState: string };
        }
      ).selected.selectionState,
      'approved',
    );

    const { payload: rejectedPayload, response: rejectedResponse } =
      await readJsonResponse(`${handle.url}/approval-resolution`, {
        body: JSON.stringify({
          approvalId: rejectedApproval.approvalId,
          decision: 'rejected',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });

    assert.equal(rejectedResponse.status, 200);
    assert.equal(
      (
        rejectedPayload as {
          resolution: { outcome: string; applied: boolean; job: { status: string } };
        }
      ).resolution.outcome,
      'rejected',
    );
    assert.equal(
      (
        rejectedPayload as {
          resolution: { outcome: string; applied: boolean; job: { status: string } };
        }
      ).resolution.job.status,
      'failed',
    );

    const { payload: rejectedSummaryPayload, response: rejectedSummaryResponse } =
      await readJsonResponse(
        `${handle.url}/approval-inbox?approvalId=${rejectedApproval.approvalId}`,
      );

    assert.equal(rejectedSummaryResponse.status, 200);
    assert.equal(
      (
        rejectedSummaryPayload as {
          selected: {
            selectionState: string;
            interruptedRun: { state: string };
          };
        }
      ).selected.selectionState,
      'rejected',
    );
    assert.equal(
      (
        rejectedSummaryPayload as {
          selected: {
            selectionState: string;
            interruptedRun: { state: string };
          };
        }
      ).selected.interruptedRun.state,
      'resume-ready',
    );

    const { payload: invalidSummaryPayload, response: invalidSummaryResponse } =
      await readJsonResponse(`${handle.url}/approval-inbox?limit=0`);

    assert.equal(invalidSummaryResponse.status, 400);
    assert.equal(
      (
        invalidSummaryPayload as {
          error: { code: string };
        }
      ).error.code,
      'invalid-approval-inbox-query',
    );

    const { payload: invalidResolutionPayload, response: invalidResolutionResponse } =
      await readJsonResponse(`${handle.url}/approval-resolution`, {
        body: JSON.stringify({
          approvalId: rejectedApproval.approvalId,
          decision: 'maybe',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });

    assert.equal(invalidResolutionResponse.status, 400);
    assert.equal(
      (
        invalidResolutionPayload as {
          error: { code: string };
        }
      ).error.code,
      'invalid-approval-resolution-request',
    );

    const { payload: missingResolutionPayload, response: missingResolutionResponse } =
      await readJsonResponse(`${handle.url}/approval-resolution`, {
        body: JSON.stringify({
          approvalId: 'missing-approval',
          decision: 'approved',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });

    assert.equal(missingResolutionResponse.status, 404);
    assert.equal(
      (
        missingResolutionPayload as {
          error: { code: string };
        }
      ).error.code,
      'approval-not-found',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await backend.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('onboarding summary route composes startup checklist state with bounded repair preview data', async () => {
  const fixture = await createOnboardingFixture();
  const beforeSnapshot = await fixture.snapshotUserLayer();
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/onboarding?targets=applicationsTracker,profileConfig,profileCv`,
    );
    const afterSnapshot = await fixture.snapshotUserLayer();

    assert.equal(response.status, 200);
    assert.equal((payload as { status: string }).status, 'missing-prerequisites');
    assert.equal(
      (
        payload as {
          checklist: { required: Array<{ surfaceKey: string }> };
        }
      ).checklist.required.length,
      2,
    );
    assert.deepEqual(
      (
        payload as {
          repairPreview: { targets: string[] };
        }
      ).repairPreview.targets,
      ['applicationsTracker', 'profileConfig', 'profileCv'],
    );
    assert.equal(
      (
        payload as {
          repairPreview: { repairableCount: number; targetCount: number };
        }
      ).repairPreview.repairableCount,
      3,
    );
    assert.equal(
      (
        payload as {
          repairPreview: { repairableCount: number; targetCount: number };
        }
      ).repairPreview.targetCount,
      3,
    );
    assert.deepEqual(afterSnapshot, beforeSnapshot);
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('onboarding summary route rejects unsupported target filters', async () => {
  const fixture = await createOnboardingFixture();
  const services = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/onboarding?targets=profileConfig,unknownTarget`,
    );

    assert.equal(response.status, 400);
    assert.equal((payload as { status: string }).status, 'bad-request');
    assert.equal(
      (payload as { error: { code: string } }).error.code,
      'invalid-onboarding-query',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('onboarding repair route creates requested files and revalidates startup state from the live repo', async () => {
  const fixture = await createOnboardingFixture();
  const beforeSnapshot = await fixture.snapshotUserLayer();
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/onboarding/repair`,
      {
        body: JSON.stringify({
          confirm: true,
          targets: ['profileConfig', 'profileCv'],
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    );
    const afterSnapshot = await fixture.snapshotUserLayer();

    assert.equal(response.status, 200);
    assert.equal(
      (payload as { repairedCount: number }).repairedCount,
      2,
    );
    assert.equal((payload as { status: string }).status, 'auth-required');
    assert.equal(
      (
        payload as {
          health: { missing: { onboarding: number } };
        }
      ).health.missing.onboarding,
      0,
    );
    assert.equal(
      await fixture.readText('config/profile.yml'),
      'candidate:\n  full_name: Template User\n',
    );
    assert.equal(await fixture.readText('profile/cv.md'), '# Template CV\n');
    assert.notDeepEqual(afterSnapshot, beforeSnapshot);
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('onboarding repair route rejects already-present requested targets', async () => {
  const fixture = await createOnboardingFixture({
    'config/profile.yml': 'full_name: Existing User\n',
  });
  const services = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/onboarding/repair`,
      {
        body: JSON.stringify({
          confirm: true,
          targets: ['profileConfig'],
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(response.status, 409);
    assert.equal((payload as { status: string }).status, 'error');
    assert.equal(
      (payload as { error: { code: string } }).error.code,
      'onboarding-target-already-present',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('onboarding repair route rejects invalid target input', async () => {
  const fixture = await createOnboardingFixture();
  const services = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/onboarding/repair`,
      {
        body: JSON.stringify({
          confirm: true,
          targets: ['profileConfig', 'not-real-target'],
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(response.status, 400);
    assert.equal((payload as { status: string }).status, 'bad-request');
    assert.equal(
      (payload as { error: { code: string } }).error.code,
      'invalid-onboarding-repair-request',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('onboarding repair route maps missing template sources to explicit server errors', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.example.yml': 'title_filter:\n  positive: []\n',
      'data/applications.example.md': '# Applications Tracker\n',
      'modes/_profile.template.md': '# Profile Template\n',
      'profile/cv.example.md': '# Template CV\n',
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const services = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload, response } = await readJsonResponse(
      `${handle.url}/onboarding/repair`,
      {
        body: JSON.stringify({
          confirm: true,
          targets: ['profileConfig'],
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(response.status, 500);
    assert.equal((payload as { status: string }).status, 'error');
    assert.equal(
      (payload as { error: { code: string } }).error.code,
      'onboarding-template-missing',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('dispatcher returns explicit 404 and 405 error contracts', async () => {
  const fixture = await createReadyFixture();
  const services = createApiServiceContainer({
    agentRuntime: createAgentRuntimeService({
      authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
      repoRoot: fixture.repoRoot,
    }),
    repoRoot: fixture.repoRoot,
  });
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    services,
  });

  try {
    const { payload: methodPayload, response: methodResponse } =
      await readJsonResponse(`${handle.url}/health`, {
        method: 'POST',
      });
    const { payload: missingPayload, response: missingResponse } =
      await readJsonResponse(`${handle.url}/missing-route`);

    assert.equal(methodResponse.status, 405);
    assert.equal(methodResponse.headers.get('allow'), 'GET, HEAD');
    assert.equal(
      (methodPayload as { status: string }).status,
      'method-not-allowed',
    );
    assert.equal(
      (methodPayload as { error: { code: string } }).error.code,
      'method-not-allowed',
    );

    assert.equal(missingResponse.status, 404);
    assert.equal((missingPayload as { status: string }).status, 'not-found');
    assert.equal(
      (missingPayload as { error: { code: string } }).error.code,
      'route-not-found',
    );
  } finally {
    await handle.close();
    await services.dispose();
    await fixture.cleanup();
  }
});

test('startup server rate limits burst traffic per client', async () => {
  const fixture = await createReadyFixture();

  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    repoRoot: fixture.repoRoot,
  });

  try {
    let lastResponse: Response | undefined;
    let lastPayload: unknown;

    for (let requestIndex = 0; requestIndex < 6; requestIndex += 1) {
      const response = await fetch(`${handle.url}/health`);
      lastResponse = response;
      lastPayload = await response.json();
    }

    assert.ok(lastResponse);
    assert.equal(lastResponse.status, 429);
    assert.equal((lastPayload as { status: string }).status, 'rate-limited');
    assert.match(
      String(
        lastPayload &&
          (lastPayload as { error?: { message?: string } }).error?.message,
      ),
      /Too many requests/i,
    );
    assert.equal(lastResponse.headers.get('retry-after') !== null, true);
    assert.equal(lastResponse.headers.get('x-ratelimit-limit'), '5');
    assert.equal(lastResponse.headers.get('x-ratelimit-remaining'), '0');
  } finally {
    await handle.close();
    await fixture.cleanup();
  }
});

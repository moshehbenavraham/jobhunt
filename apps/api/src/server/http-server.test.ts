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
import { createApiServiceContainer } from '../runtime/service-container.js';
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
    services,
  });

  try {
    const { payload: healthPayload, response: healthResponse } =
      await readJsonResponse(`${handle.url}/health`);
    const { payload: startupPayload, response: startupResponse } =
      await readJsonResponse(`${handle.url}/startup`);

    assert.equal(healthResponse.status, 200);
    assert.equal(startupResponse.status, 200);

    assert.equal((healthPayload as { service: string }).service, STARTUP_SERVICE_NAME);
    assert.equal(
      (healthPayload as { sessionId: string }).sessionId,
      STARTUP_SESSION_ID,
    );
    assert.equal((healthPayload as { status: string }).status, 'ok');
    assert.equal(
      (healthPayload as {
        agentRuntime: { status: string };
      }).agentRuntime.status,
      'ready',
    );
    assert.equal(
      (healthPayload as { operationalStore: { status: string } }).operationalStore.status,
      'ready',
    );

    assert.equal((startupPayload as { status: string }).status, 'ready');
    assert.equal(
      (startupPayload as {
        diagnostics: { agentRuntime: { status: string } };
      }).diagnostics.agentRuntime.status,
      'ready',
    );
    assert.equal(
      (startupPayload as { operationalStore: { status: string } }).operationalStore.status,
      'ready',
    );
    assert.equal(
      (startupPayload as {
        diagnostics: { onboardingMissing: unknown[] };
      }).diagnostics.onboardingMissing.length,
      0,
    );
    assert.equal(
      (startupPayload as {
        diagnostics: { runtimeMissing: unknown[] };
      }).diagnostics.runtimeMissing.length,
      0,
    );
    assert.equal(
      (startupPayload as {
        diagnostics: { currentSession: { id: string } };
      }).diagnostics.currentSession.id,
      STARTUP_SESSION_ID,
    );
    assert.equal(
      (startupPayload as {
        bootSurface: { startupPath: string };
      }).bootSurface.startupPath,
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
      (healthPayload as { operationalStore: { status: string } }).operationalStore.status,
      'absent',
    );
    assert.equal(
      (startupPayload as { status: string }).status,
      'missing-prerequisites',
    );
    assert.equal(
      (startupPayload as {
        diagnostics: { agentRuntime: { status: string } };
      }).diagnostics.agentRuntime.status,
      'auth-required',
    );
    assert.equal(
      (startupPayload as { operationalStore: { status: string } }).operationalStore.status,
      'absent',
    );
    assert.deepEqual(afterSnapshot, beforeSnapshot);
    assert.equal(existsSync(appStateRoot), false);
    assert.deepEqual(
      (startupPayload as {
        diagnostics: {
          onboardingMissing: Array<{ surfaceKey: string }>;
        };
      }).diagnostics.onboardingMissing.map((item) => item.surfaceKey),
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
    assert.equal((startupPayload as { status: string }).status, 'auth-required');
    assert.equal(
      (startupPayload as {
        diagnostics: { agentRuntime: { auth: { authPath: string } } };
      }).diagnostics.agentRuntime.auth.authPath,
      join(fixture.repoRoot, 'data', 'openai-account-auth.json'),
    );
    assert.deepEqual(afterSnapshot, beforeSnapshot);
  } finally {
    await handle.close();
    await services.dispose();
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
      (startupPayload as {
        operationalStore: { status: string };
      }).operationalStore.status,
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
    const { payload, response } = await readJsonResponse(`${handle.url}/startup`);

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
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
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
      (approvalsPayload as { approvals: Array<{ approvalId: string }> }).approvals[0]
        ?.approvalId,
      approval.approval.approvalId,
    );
    assert.equal(
      (diagnosticsPayload as {
        diagnostics: { failedJobs: Array<{ jobId: string }> };
      }).diagnostics.failedJobs[0]?.jobId,
      'job-runtime-route',
    );

    const requestEvents = await store.events.list({
      requestId: approvalsRequestId ?? undefined,
    });

    assert.equal(
      requestEvents.some((event) => event.eventType === 'http-request-completed'),
      true,
    );
    assert.equal(
      requestEvents.some((event) => event.eventType === 'http-request-received'),
      true,
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
    assert.equal(
      (lastPayload as { status: string }).status,
      'rate-limited',
    );
    assert.match(
      String(lastPayload && (lastPayload as { error?: { message?: string } }).error?.message),
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

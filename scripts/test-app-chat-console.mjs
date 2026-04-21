#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

function createDeferred() {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}

function createReadyStartupPayload() {
  return {
    appStateRoot: {
      exists: true,
      path: `${ROOT}/.jobhunt-app`,
    },
    bootSurface: {
      defaultHost: '127.0.0.1',
      defaultPort: 4174,
      healthPath: '/health',
      startupPath: '/startup',
    },
    diagnostics: {
      onboardingMissing: [],
      optionalMissing: [],
      promptContract: {
        cacheMode: 'read-through-mtime',
        sourceOrder: ['agents-guide', 'workflow-mode'],
        sources: [],
        supportedWorkflows: ['single-evaluation', 'tracker-status'],
        workflowRoutes: [
          {
            description: 'Single evaluation route',
            intent: 'single-evaluation',
            modeRepoRelativePath: 'modes/oferta.md',
          },
          {
            description: 'Tracker status route',
            intent: 'tracker-status',
            modeRepoRelativePath: 'modes/tracker.md',
          },
        ],
      },
      runtimeMissing: [],
      workspace: {
        protectedOwners: ['system', 'user'],
        writableRoots: ['config', 'data', 'output', 'profile', 'reports'],
      },
    },
    health: {
      message: 'Bootstrap diagnostics are ready.',
      missing: {
        onboarding: 0,
        optional: 0,
        runtime: 0,
      },
      ok: true,
      operationalStore: {
        message: 'Operational store ready.',
        status: 'ready',
      },
      service: 'jobhunt-api-scaffold',
      sessionId: 'phase01-session03-agent-runtime-bootstrap',
      startupStatus: 'ready',
      status: 'ok',
    },
    message: 'Bootstrap diagnostics are ready.',
    mutationPolicy: 'app-owned-only',
    operationalStore: {
      databasePath: `${ROOT}/.jobhunt-app/app.db`,
      message: 'Operational store ready.',
      reason: null,
      rootExists: true,
      rootPath: `${ROOT}/.jobhunt-app`,
      status: 'ready',
    },
    repoRoot: ROOT,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
    userLayerWrites: 'disabled',
  };
}

function createReadyShellSummary() {
  return {
    activity: {
      activeSession: null,
      activeSessionCount: 0,
      latestPendingApprovals: [],
      pendingApprovalCount: 0,
      recentFailureCount: 0,
      recentFailures: [],
      state: 'idle',
    },
    currentSession: {
      id: 'phase03-session02-chat-console-and-session-resume',
      monorepo: true,
      packagePath: 'apps/web',
      phase: 3,
      source: 'state-file',
      stateFilePath: `${ROOT}/.spec_system/state.json`,
    },
    generatedAt: '2026-04-21T23:55:00.000Z',
    health: {
      agentRuntime: {
        authPath: `${ROOT}/data/openai-account-auth.json`,
        message: 'Agent runtime ready.',
        promptState: 'ready',
        status: 'ready',
      },
      message: 'Bootstrap diagnostics are ready.',
      missing: {
        onboarding: 0,
        optional: 0,
        runtime: 0,
      },
      ok: true,
      operationalStore: {
        message: 'Operational store ready.',
        status: 'ready',
      },
      service: 'jobhunt-api-scaffold',
      sessionId: 'phase01-session03-agent-runtime-bootstrap',
      startupStatus: 'ready',
      status: 'ok',
    },
    message: 'Bootstrap diagnostics are ready.',
    ok: true,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
  };
}

function createWorkflowOptions() {
  return [
    {
      description: 'Single evaluation route',
      intent: 'single-evaluation',
      label: 'Single Evaluation',
      message:
        'Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.',
      missingCapabilities: [],
      modeRepoRelativePath: 'modes/oferta.md',
      specialist: {
        description: 'Owns job-description intake and evaluation follow-through.',
        id: 'evaluation-specialist',
        label: 'Evaluation Specialist',
      },
      status: 'ready',
    },
    {
      description: 'Tracker status route',
      intent: 'tracker-status',
      label: 'Tracker Status',
      message:
        'Tracker status remains blocked until a typed tracker-summary tool is implemented.',
      missingCapabilities: ['typed-tracker-summary'],
      modeRepoRelativePath: 'modes/tracker.md',
      specialist: {
        description: 'Owns tracker review workflows.',
        id: 'tracker-specialist',
        label: 'Tracker Specialist',
      },
      status: 'tooling-gap',
    },
  ];
}

function createSessionSummary(overrides = {}) {
  return {
    activeJobId: overrides.activeJobId ?? 'job-live',
    job: overrides.job ?? {
      attempt: 1,
      completedAt: null,
      currentRunId: 'run-live',
      jobId: 'job-live',
      jobType: 'evaluate-job',
      startedAt: '2026-04-21T23:57:00.000Z',
      status: overrides.jobStatus ?? 'running',
      updatedAt: overrides.updatedAt ?? '2026-04-21T23:57:00.000Z',
      waitReason: overrides.waitReason ?? null,
    },
    latestFailure: overrides.latestFailure ?? null,
    lastHeartbeatAt: overrides.updatedAt ?? '2026-04-21T23:57:00.000Z',
    pendingApproval: overrides.pendingApproval ?? null,
    pendingApprovalCount: overrides.pendingApprovalCount ?? 0,
    resumeAllowed: true,
    sessionId: overrides.sessionId ?? 'session-live',
    state: overrides.state ?? 'running',
    status: overrides.status ?? 'running',
    updatedAt: overrides.updatedAt ?? '2026-04-21T23:57:00.000Z',
    workflow: overrides.workflow ?? 'single-evaluation',
  };
}

function createSessionDetail(summary, overrides = {}) {
  return {
    approvals: overrides.approvals ?? [],
    failure: overrides.failure ?? null,
    jobs: overrides.jobs ?? (summary.job ? [summary.job] : []),
    route: overrides.route ?? {
      message:
        'Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.',
      missingCapabilities: [],
      specialistId: 'evaluation-specialist',
      status: 'ready',
    },
    session: summary,
    timeline:
      overrides.timeline ?? [
        {
          approvalId: null,
          eventId: 'event-live',
          eventType: 'job-execution-started',
          jobId: summary.job?.jobId ?? null,
          level: 'info',
          occurredAt: summary.updatedAt,
          requestId: 'request-live',
          sessionId: summary.sessionId,
          summary: overrides.timelineSummary ?? 'Launch accepted.',
          traceId: 'trace-live',
        },
      ],
  };
}

function createChatConsoleSummaryPayload(state, selectedSessionId = null) {
  const sessions = [...state.sessionDetails.values()]
    .map((detail) => detail.session)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const selectedDetail =
    (selectedSessionId && state.sessionDetails.get(selectedSessionId)) ||
    state.sessionDetails.get(state.selectedSessionId) ||
    state.sessionDetails.get(sessions[0]?.sessionId) ||
    null;

  return {
    generatedAt: '2026-04-21T23:58:00.000Z',
    message: 'Chat console summary is ready.',
    ok: true,
    recentSessions: sessions,
    selectedSession: selectedDetail,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
    workflows: createWorkflowOptions(),
  };
}

function createCommandPayload(input) {
  return {
    generatedAt: '2026-04-21T23:58:30.000Z',
    handoff: {
      job: input.detail?.session.job ?? null,
      message: input.message,
      pendingApproval: input.detail?.session.pendingApproval ?? null,
      requestedAt: '2026-04-21T23:58:30.000Z',
      route: {
        message: input.routeMessage,
        missingCapabilities: input.missingCapabilities ?? [],
        requestKind: input.requestKind,
        sessionId: input.detail?.session.sessionId ?? input.sessionId ?? null,
        specialistId: input.specialistId ?? null,
        status: input.routeStatus,
        workflow: input.workflow ?? null,
      },
      runtime: input.runtime,
      selectedSession: input.detail ?? null,
      session: input.detail?.session ?? null,
      specialist:
        input.specialistId === null
          ? null
          : {
              description: input.specialistLabel ?? 'Specialist handoff',
              id: input.specialistId,
              label: input.specialistLabel ?? 'Specialist handoff',
            },
      state: input.state,
      toolingGap:
        input.state === 'tooling-gap'
          ? {
              message: input.message,
              missingCapabilities: input.missingCapabilities ?? [],
            }
          : null,
    },
    ok: true,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: input.status ?? 'ready',
  };
}

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (typeof address !== 'object' || address === null) {
        reject(new Error('Failed to allocate a free local port.'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePort(address.port);
      });
    });
  });
}

async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (child.exitCode !== null) {
      return;
    }

    await delay(100);
  }

  child.kill('SIGKILL');
}

async function waitForHttpOk(url, child, stderrLog) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(
        `Web server exited before becoming ready. stderr:\n${stderrLog.join('')}`,
      );
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch (_error) {
      // Keep polling until the dev server responds or exits.
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for ${url}. stderr:\n${stderrLog.join('')}`);
}

async function startFakeApiServer() {
  const state = {
    chatConsoleMode: 'empty',
    launchCount: 0,
    launchMode: 'running',
    nextLaunchGate: null,
    resumeCount: 0,
    selectedSessionId: null,
    sessionDetails: new Map(),
    summaryDelayMs: 0,
  };
  const readyStartupPayload = createReadyStartupPayload();
  const readyShellSummary = createReadyShellSummary();

  const server = createHttpServer(async (request, response) => {
    if (request.url === '/startup') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(readyStartupPayload, null, 2));
      return;
    }

    if (request.url === '/operator-shell') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(readyShellSummary, null, 2));
      return;
    }

    if ((request.url ?? '').startsWith('/chat-console')) {
      if (state.summaryDelayMs > 0) {
        await delay(state.summaryDelayMs);
      }

      if (state.chatConsoleMode === 'invalid-payload') {
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(JSON.stringify({ ok: true, message: 'broken' }, null, 2));
        return;
      }

      const url = new URL(request.url, 'http://127.0.0.1');
      const selectedSessionId = url.searchParams.get('sessionId');
      const payload = createChatConsoleSummaryPayload(state, selectedSessionId);

      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(payload, null, 2));
      return;
    }

    if (request.url === '/orchestration' && request.method === 'POST') {
      const chunks = [];

      for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

      if (body.kind === 'launch') {
        state.launchCount += 1;

        if (state.nextLaunchGate) {
          await state.nextLaunchGate.promise;
          state.nextLaunchGate = null;
        }

        if (body.workflow === 'tracker-status' || state.launchMode === 'tooling-gap') {
          const detail = createSessionDetail(
            createSessionSummary({
              sessionId: 'session-gap',
              state: 'tooling-gap',
              status: 'pending',
              updatedAt: '2026-04-21T23:59:20.000Z',
              workflow: 'tracker-status',
            }),
            {
              route: {
                message:
                  'Tracker status remains blocked until a typed tracker-summary tool is implemented.',
                missingCapabilities: ['typed-tracker-summary'],
                specialistId: 'tracker-specialist',
                status: 'tooling-gap',
              },
              timelineSummary: 'Tracker launch is blocked by missing tooling.',
            },
          );
          state.sessionDetails.set(detail.session.sessionId, detail);
          state.selectedSessionId = detail.session.sessionId;

          response.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
          });
          response.end(
            JSON.stringify(
              createCommandPayload({
                detail,
                message:
                  'Tracker status remains blocked until a typed tracker-summary tool is implemented.',
                missingCapabilities: ['typed-tracker-summary'],
                requestKind: 'launch',
                routeMessage:
                  'Tracker status remains blocked until a typed tracker-summary tool is implemented.',
                routeStatus: 'tooling-gap',
                runtime: {
                  message:
                    'Tracker status remains blocked until a typed tracker-summary tool is implemented.',
                  modeRepoRelativePath: null,
                  model: null,
                  promptState: null,
                  startedAt: null,
                  status: 'skipped',
                  workflow: null,
                },
                specialistId: 'tracker-specialist',
                specialistLabel: 'Tracker Specialist',
                state: 'tooling-gap',
                workflow: 'tracker-status',
              }),
              null,
              2,
            ),
          );
          return;
        }

        if (state.launchMode === 'auth-blocked') {
          const detail = createSessionDetail(
            createSessionSummary({
              sessionId: 'session-auth',
              state: 'ready',
              status: 'pending',
              updatedAt: '2026-04-21T23:59:10.000Z',
            }),
            {
              timelineSummary: 'Launch created a blocked session.',
            },
          );
          state.sessionDetails.set(detail.session.sessionId, detail);
          state.selectedSessionId = detail.session.sessionId;

          response.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
          });
          response.end(
            JSON.stringify(
              createCommandPayload({
                detail,
                message: 'Stored OpenAI account credentials are required.',
                requestKind: 'launch',
                routeMessage:
                  'Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.',
                routeStatus: 'ready',
                runtime: {
                  message: 'Stored OpenAI account credentials are required.',
                  modeRepoRelativePath: null,
                  model: null,
                  promptState: 'ready',
                  startedAt: null,
                  status: 'blocked',
                  workflow: null,
                },
                specialistId: 'evaluation-specialist',
                specialistLabel: 'Evaluation Specialist',
                state: 'auth-required',
                status: 'auth-required',
                workflow: 'single-evaluation',
              }),
              null,
              2,
            ),
          );
          return;
        }

        const detail = createSessionDetail(
          createSessionSummary({
            sessionId: 'session-live',
            state: 'running',
            status: 'running',
            updatedAt: '2026-04-21T23:59:00.000Z',
            workflow: 'single-evaluation',
          }),
          {
            timelineSummary: 'Launch accepted.',
          },
        );
        state.sessionDetails.set(detail.session.sessionId, detail);
        state.selectedSessionId = detail.session.sessionId;

        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(
          JSON.stringify(
            createCommandPayload({
              detail,
              message: 'Run handoff is active.',
              requestKind: 'launch',
              routeMessage:
                'Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.',
              routeStatus: 'ready',
              runtime: {
                message: 'Runtime is ready for workflow single-evaluation.',
                modeRepoRelativePath: 'modes/oferta.md',
                model: 'gpt-5.4-mini',
                promptState: 'ready',
                startedAt: '2026-04-21T23:59:00.000Z',
                status: 'ready',
                workflow: 'single-evaluation',
              },
              specialistId: 'evaluation-specialist',
              specialistLabel: 'Evaluation Specialist',
              state: 'running',
              workflow: 'single-evaluation',
            }),
            null,
            2,
          ),
        );
        return;
      }

      state.resumeCount += 1;
      const existingDetail = state.sessionDetails.get(body.sessionId);

      if (!existingDetail) {
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(
          JSON.stringify(
            createCommandPayload({
              detail: null,
              message: `Runtime session does not exist: ${body.sessionId}.`,
              requestKind: 'resume',
              routeMessage: `Runtime session does not exist: ${body.sessionId}.`,
              routeStatus: 'session-not-found',
              runtime: {
                message: `Runtime session does not exist: ${body.sessionId}.`,
                modeRepoRelativePath: null,
                model: null,
                promptState: null,
                startedAt: null,
                status: 'skipped',
                workflow: null,
              },
              specialistId: null,
              state: 'failed',
              workflow: null,
            }),
            null,
            2,
          ),
        );
        return;
      }

      const resumedDetail = createSessionDetail(
        createSessionSummary({
          pendingApproval: {
            action: 'approve-run',
            approvalId: 'approval-resume',
            jobId: 'job-live',
            requestedAt: '2026-04-22T00:00:00.000Z',
            title: 'Review resumed run',
            traceId: 'trace-resume',
          },
          pendingApprovalCount: 1,
          sessionId: existingDetail.session.sessionId,
          state: 'waiting-for-approval',
          status: 'waiting',
          updatedAt: '2026-04-22T00:00:00.000Z',
          waitReason: 'approval',
          workflow: existingDetail.session.workflow,
        }),
        {
          approvals: [
            {
              action: 'approve-run',
              approvalId: 'approval-resume',
              jobId: 'job-live',
              requestedAt: '2026-04-22T00:00:00.000Z',
              title: 'Review resumed run',
              traceId: 'trace-resume',
            },
          ],
          route: existingDetail.route,
          timelineSummary: 'Run is waiting for approval.',
        },
      );
      state.sessionDetails.set(resumedDetail.session.sessionId, resumedDetail);
      state.selectedSessionId = resumedDetail.session.sessionId;

      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(
        JSON.stringify(
          createCommandPayload({
            detail: resumedDetail,
            message: 'Run is waiting for approval: Review resumed run.',
            requestKind: 'resume',
            routeMessage: existingDetail.route.message,
            routeStatus: 'ready',
            runtime: {
              message: 'Runtime is ready for workflow single-evaluation.',
              modeRepoRelativePath: 'modes/oferta.md',
              model: 'gpt-5.4-mini',
              promptState: 'ready',
              startedAt: '2026-04-22T00:00:00.000Z',
              status: 'ready',
              workflow: 'single-evaluation',
            },
            specialistId: 'evaluation-specialist',
            specialistLabel: 'Evaluation Specialist',
            state: 'waiting-for-approval',
            workflow: 'single-evaluation',
          }),
          null,
          2,
        ),
      );
      return;
    }

    response.writeHead(404, {
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(
      JSON.stringify(
        {
          error: {
            code: 'route-not-found',
            message: `Unknown route ${request.url ?? '/'}.`,
          },
          ok: false,
          service: 'jobhunt-api-scaffold',
          sessionId: 'phase01-session03-agent-runtime-bootstrap',
          status: 'not-found',
        },
        null,
        2,
      ),
    );
  });

  await new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();

  if (typeof address !== 'object' || address === null) {
    throw new Error('Failed to start the fake chat-console API.');
  }

  return {
    close: () =>
      new Promise((resolvePromise, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolvePromise();
        });
      }),
    holdNextLaunch() {
      state.nextLaunchGate = createDeferred();
      return state.nextLaunchGate;
    },
    setChatConsoleMode(mode) {
      state.chatConsoleMode = mode;
    },
    setLaunchMode(mode) {
      state.launchMode = mode;
    },
    setSummaryDelayMs(delayMs) {
      state.summaryDelayMs = delayMs;
    },
    state,
    url: `http://127.0.0.1:${address.port}`,
  };
}

const fakeApi = await startFakeApiServer();
const webPort = await getFreePort();
const webUrl = `http://127.0.0.1:${webPort}`;
const stderrLog = [];
const webChild = spawn(
  'node',
  [
    join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    String(webPort),
  ],
  {
    cwd: join(ROOT, 'apps', 'web'),
    env: {
      ...process.env,
      JOBHUNT_API_ORIGIN: fakeApi.url,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  },
);

webChild.stderr.setEncoding('utf-8');
webChild.stderr.on('data', (chunk) => {
  stderrLog.push(chunk);
});

try {
  await waitForHttpOk(webUrl, webChild, stderrLog);

  const browser = await chromium.launch({ headless: true });

  try {
    fakeApi.setSummaryDelayMs(800);
    const page = await browser.newPage();
    await page.goto(`${webUrl}#chat`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('heading', { name: 'Job-Hunt control surface' }).waitFor();
    await page.getByRole('heading', { name: 'Launch a supported workflow' }).waitFor();
    await page.getByRole('heading', { name: 'Loading recent sessions' }).waitFor();
    await page.getByRole('heading', { name: 'Loading timeline' }).waitFor();

    await page.waitForLoadState('networkidle');
    fakeApi.setSummaryDelayMs(0);
    await page.getByRole('heading', { name: 'No recent sessions yet' }).waitFor();

    const launchGate = fakeApi.holdNextLaunch();
    const launchButton = page.getByRole('button', {
      name: 'Launch Single Evaluation',
    });
    await launchButton.click();
    await page.getByText('Launching...').waitFor();
    assert.equal(await launchButton.isDisabled(), true);
    await delay(200);
    assert.equal(fakeApi.state.launchCount, 1);
    launchGate.resolve();

    await page.getByText('Run handoff is active.').waitFor();
    await page.getByText('session-live').first().waitFor();

    await page.getByRole('button', { name: 'Resume' }).first().click();
    await page.getByText('Run is waiting for approval: Review resumed run.').waitFor();
    assert.equal(fakeApi.state.resumeCount, 1);

    fakeApi.setLaunchMode('auth-blocked');
    await page.getByRole('button', { name: 'Launch Single Evaluation' }).click();
    await page.getByText('Stored OpenAI account credentials are required.').waitFor();

    fakeApi.setLaunchMode('running');
    await page.getByLabel('Select workflow').selectOption('tracker-status');
    await page.getByRole('button', { name: 'Launch Tracker Status' }).click();
    await page
      .locator('section[aria-labelledby="chat-console-status-title"]')
      .getByText(
        'Tracker status remains blocked until a typed tracker-summary tool is implemented.',
      )
      .waitFor();

    fakeApi.setChatConsoleMode('invalid-payload');
    const errorPage = await browser.newPage();
    await errorPage.goto(`${webUrl}#chat`, { waitUntil: 'networkidle' });
    await errorPage
      .getByRole('heading', { name: 'Recent sessions unavailable' })
      .waitFor();
    await errorPage.close();
    fakeApi.setChatConsoleMode('empty');

    const offlinePage = await browser.newPage();
    await offlinePage.route('**/api/chat-console*', async (route) => {
      await route.abort('failed');
    });
    await offlinePage.goto(`${webUrl}#chat`, { waitUntil: 'networkidle' });
    await offlinePage
      .getByRole('heading', { name: 'Recent sessions offline' })
      .waitFor();
    await offlinePage
      .getByRole('heading', { name: 'Timeline offline' })
      .waitFor();
    await offlinePage.close();

    await page.close();
  } finally {
    await browser.close();
  }
} finally {
  await stopChild(webChild);
  await fakeApi.close();
}

console.log('App chat console smoke checks passed.');

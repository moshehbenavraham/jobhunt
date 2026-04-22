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
        cacheMode: 'fresh',
        sourceOrder: ['agents-guide', 'mode-file'],
        sources: [
          {
            key: 'agents-guide',
            label: 'AGENTS guide',
            notes: [],
            optional: false,
            precedence: 1,
            role: 'system',
          },
        ],
        supportedWorkflows: ['single-evaluation'],
        workflowRoutes: [
          {
            description: 'Single evaluation route',
            intent: 'single-evaluation',
            modeRepoRelativePath: 'modes/oferta.md',
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
      activeSession: {
        activeJob: {
          jobId: 'job-live',
          status: 'running',
          updatedAt: '2026-04-21T22:50:00.000Z',
          waitReason: null,
        },
        activeJobId: 'job-live',
        lastHeartbeatAt: '2026-04-21T22:50:00.000Z',
        pendingApprovalCount: 2,
        sessionId: 'session-live',
        status: 'running',
        updatedAt: '2026-04-21T22:50:00.000Z',
        workflow: 'single-evaluation',
      },
      activeSessionCount: 1,
      latestPendingApprovals: [
        {
          action: 'approve-email',
          approvalId: 'approval-1',
          jobId: 'job-live',
          requestedAt: '2026-04-21T22:49:00.000Z',
          sessionId: 'session-live',
          title: 'Review application email',
          traceId: 'trace-approval-1',
        },
        {
          action: 'approve-pdf',
          approvalId: 'approval-2',
          jobId: 'job-live',
          requestedAt: '2026-04-21T22:49:30.000Z',
          sessionId: 'session-live',
          title: 'Publish tailored PDF',
          traceId: 'trace-approval-2',
        },
      ],
      pendingApprovalCount: 2,
      recentFailureCount: 1,
      recentFailures: [
        {
          failedAt: '2026-04-21T22:48:00.000Z',
          jobId: 'job-failed',
          message: 'Recent shell failure',
          runId: 'run-failed',
          sessionId: 'session-failed',
          traceId: 'trace-failed',
        },
      ],
      state: 'attention-required',
    },
    currentSession: {
      id: 'phase04-session04-pipeline-review-workspace',
      monorepo: true,
      packagePath: 'apps/web',
      phase: 4,
      source: 'state-file',
      stateFilePath: `${ROOT}/.spec_system/state.json`,
    },
    generatedAt: '2026-04-21T22:50:00.000Z',
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

function createRuntimeErrorShellSummary() {
  return {
    activity: {
      activeSession: null,
      activeSessionCount: 0,
      latestPendingApprovals: [],
      pendingApprovalCount: 0,
      recentFailureCount: 0,
      recentFailures: [],
      state: 'unavailable',
    },
    currentSession: {
      id: 'phase04-session04-pipeline-review-workspace',
      monorepo: true,
      packagePath: 'apps/web',
      phase: 4,
      source: 'state-file',
      stateFilePath: `${ROOT}/.spec_system/state.json`,
    },
    generatedAt: '2026-04-21T22:55:00.000Z',
    health: {
      agentRuntime: {
        authPath: `${ROOT}/data/openai-account-auth.json`,
        message: 'Agent runtime ready.',
        promptState: 'ready',
        status: 'ready',
      },
      message: 'Bootstrap is live, but required system files are missing.',
      missing: {
        onboarding: 0,
        optional: 0,
        runtime: 1,
      },
      ok: false,
      operationalStore: {
        message: 'Operational store is corrupt.',
        status: 'corrupt',
      },
      service: 'jobhunt-api-scaffold',
      sessionId: 'phase01-session03-agent-runtime-bootstrap',
      startupStatus: 'runtime-error',
      status: 'error',
    },
    message: 'Bootstrap is live, but required system files are missing.',
    ok: true,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'runtime-error',
  };
}

function createReadyChatConsoleSummary() {
  return {
    generatedAt: '2026-04-21T22:56:00.000Z',
    message: 'Chat console summary is ready.',
    ok: true,
    recentSessions: [],
    selectedSession: null,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
    workflows: [
      {
        description: 'Single evaluation route',
        intent: 'single-evaluation',
        label: 'Single Evaluation',
        message:
          'Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.',
        missingCapabilities: [],
        modeRepoRelativePath: 'modes/oferta.md',
        specialist: {
          description:
            'Owns job-description intake and evaluation follow-through.',
          id: 'evaluation-specialist',
          label: 'Evaluation Specialist',
        },
        status: 'ready',
      },
    ],
  };
}

function createPipelineReviewPayload() {
  return {
    filters: {
      limit: 12,
      offset: 0,
      reportNumber: null,
      section: 'all',
      sort: 'queue',
      url: null,
    },
    generatedAt: '2026-04-22T00:00:00.000Z',
    message: 'Showing 1 queue row for review.',
    ok: true,
    queue: {
      counts: {
        malformed: 0,
        pending: 1,
        processed: 0,
      },
      hasMore: false,
      items: [
        {
          company: 'Acme',
          kind: 'pending',
          legitimacy: null,
          pdf: {
            exists: false,
            message:
              'Pending queue rows do not have checked-in PDF artifacts yet.',
            repoRelativePath: null,
          },
          report: {
            exists: false,
            message:
              'Pending queue rows do not have checked-in report artifacts yet.',
            repoRelativePath: null,
          },
          reportNumber: null,
          role: 'Forward Deployed Engineer',
          score: null,
          selected: false,
          url: 'https://example.com/jobs/pending-fde',
          verification: null,
          warningCount: 0,
          warnings: [],
        },
      ],
      limit: 12,
      offset: 0,
      section: 'all',
      sort: 'queue',
      totalCount: 1,
    },
    selectedDetail: {
      message: 'Select a queue row to inspect its review detail.',
      origin: 'none',
      requestedReportNumber: null,
      requestedUrl: null,
      row: null,
      state: 'empty',
    },
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    shortlist: {
      available: true,
      bucketCounts: {
        adjacentOrNoisy: 0,
        possibleFit: 0,
        strongestFit: 1,
      },
      campaignGuidance: 'Current strongest lane: Forward Deployed.',
      generatedBy: 'npm run scan',
      lastRefreshed: '2026-04-22',
      message: 'Shortlist guidance is available for queue review.',
      topRoles: [
        {
          bucketLabel: 'Strongest fit',
          company: 'Acme',
          reasonSummary: 'direct forward-deployed title',
          role: 'Forward Deployed Engineer',
          url: 'https://example.com/jobs/pending-fde',
        },
      ],
    },
    status: 'ready',
  };
}

function createUpdateCheck(updateState) {
  if (updateState === 'update-available') {
    return {
      changelogExcerpt: 'New settings surface shipped.',
      checkedAt: '2026-04-22T00:00:00.000Z',
      command: 'node scripts/update-system.mjs check',
      localVersion: '1.5.38',
      message: 'Job-Hunt update available (1.5.38 -> 1.6.0).',
      remoteVersion: '1.6.0',
      state: 'update-available',
    };
  }

  return {
    changelogExcerpt: null,
    checkedAt: '2026-04-22T00:00:00.000Z',
    command: 'node scripts/update-system.mjs check',
    localVersion: '1.5.38',
    message: 'Job-Hunt is up to date (1.5.38).',
    remoteVersion: '1.5.38',
    state: 'up-to-date',
  };
}

function createSettingsSummary(updateState) {
  return {
    auth: {
      auth: {
        accountId: 'acct-settings-ready',
        authPath: `${ROOT}/data/openai-account-auth.json`,
        expiresAt: 1778777777000,
        message: 'OpenAI account auth is ready.',
        nextSteps: ['Run `npm run doctor` after auth changes.'],
        state: 'ready',
        updatedAt: '2026-04-22T00:00:00.000Z',
      },
      config: {
        authPath: `${ROOT}/data/openai-account-auth.json`,
        baseUrl: 'https://chatgpt.com/backend-api',
        model: 'gpt-5.4-mini',
        originator: 'jobhunt-web-shell-smoke',
        overrides: {
          authPath: false,
          baseUrl: false,
          model: false,
          originator: true,
        },
      },
      message: 'Agent runtime ready.',
      status: 'ready',
    },
    currentSession: {
      id: 'phase03-session05-settings-and-maintenance-surface',
      monorepo: true,
      packagePath: 'apps/web',
      phase: 3,
      source: 'state-file',
      stateFilePath: `${ROOT}/.spec_system/state.json`,
    },
    generatedAt: '2026-04-22T00:00:00.000Z',
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
    maintenance: {
      commands: [
        {
          category: 'diagnostics',
          command: 'npm run doctor',
          description: 'Validate repo prerequisites.',
          id: 'doctor',
          label: 'Run doctor',
        },
      ],
      updateCheck: createUpdateCheck(updateState),
    },
    message: 'Settings summary is ready.',
    ok: true,
    operationalStore: {
      databasePath: `${ROOT}/.jobhunt-app/app.db`,
      message: 'Operational store ready.',
      reason: null,
      rootExists: true,
      rootPath: `${ROOT}/.jobhunt-app`,
      status: 'ready',
    },
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
    support: {
      prompt: {
        cacheMode: 'read-through-mtime',
        sourceOrder: ['agents-guide', 'shared-mode'],
        sources: [
          {
            key: 'agents-guide',
            label: 'AGENTS guide',
            optional: false,
            precedence: 1,
            role: 'system',
          },
        ],
        supportedWorkflowCount: 2,
      },
      tools: {
        hasMore: false,
        previewLimit: 2,
        tools: [
          {
            description: 'Summarize prompt-routed workflow support.',
            jobTypes: [],
            mutationTargets: [],
            name: 'summarize-workflow-support',
            requiresApproval: false,
            scripts: [],
          },
        ],
        totalCount: 1,
      },
      workflows: {
        hasMore: false,
        previewLimit: 2,
        totalCount: 1,
        workflows: [
          {
            description: 'Single evaluation route',
            intent: 'single-evaluation',
            message:
              'Single evaluation can launch with the evaluation specialist.',
            missingCapabilities: [],
            modeExists: true,
            modeRepoRelativePath: 'modes/oferta.md',
            specialist: {
              description: 'Owns evaluation follow-through.',
              id: 'evaluation-specialist',
              label: 'Evaluation Specialist',
            },
            status: 'ready',
            toolPreview: ['bootstrap-single-evaluation'],
          },
        ],
      },
    },
    workspace: {
      agentsGuidePath: `${ROOT}/AGENTS.md`,
      apiPackagePath: `${ROOT}/apps/api`,
      appStateRootPath: `${ROOT}/.jobhunt-app`,
      currentSession: {
        id: 'phase03-session05-settings-and-maintenance-surface',
        monorepo: true,
        packageAbsolutePath: `${ROOT}/apps/web`,
        packagePath: 'apps/web',
        phase: 3,
        source: 'state-file',
        specDirectoryPath: `${ROOT}/.spec_system/specs/phase03-session05-settings-and-maintenance-surface`,
        stateFilePath: `${ROOT}/.spec_system/state.json`,
      },
      dataContractPath: `${ROOT}/docs/DATA_CONTRACT.md`,
      protectedOwners: ['system', 'user'],
      repoRoot: ROOT,
      specSystemPath: `${ROOT}/.spec_system`,
      webPackagePath: `${ROOT}/apps/web`,
      writableRoots: ['config', 'data', 'output', 'profile', 'reports'],
    },
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

  throw new Error(
    `Timed out waiting for ${url}. stderr:\n${stderrLog.join('')}`,
  );
}

async function startFakeApiServer() {
  const state = {
    shellMode: 'ready',
    settingsUpdateState: 'update-available',
  };
  const readyStartupPayload = createReadyStartupPayload();
  const readyChatConsoleSummary = createReadyChatConsoleSummary();
  const readyShellSummary = createReadyShellSummary();
  const runtimeErrorSummary = createRuntimeErrorShellSummary();

  const server = createHttpServer((request, response) => {
    if (request.url === '/startup') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(readyStartupPayload, null, 2));
      return;
    }

    if (request.url === '/operator-shell') {
      const payload =
        state.shellMode === 'runtime-error'
          ? runtimeErrorSummary
          : readyShellSummary;
      const statusCode = state.shellMode === 'runtime-error' ? 503 : 200;

      response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(payload, null, 2));
      return;
    }

    if (request.url === '/chat-console') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(readyChatConsoleSummary, null, 2));
      return;
    }

    if ((request.url ?? '').startsWith('/pipeline-review')) {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(createPipelineReviewPayload(), null, 2));
      return;
    }

    if ((request.url ?? '').startsWith('/settings')) {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(
        JSON.stringify(
          createSettingsSummary(state.settingsUpdateState),
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
    throw new Error('Failed to start the fake app-shell API.');
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
    setShellMode(mode) {
      state.shellMode = mode;
    },
    setSettingsUpdateState(mode) {
      state.settingsUpdateState = mode;
    },
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
    const page = await browser.newPage();
    await page.goto(webUrl, { waitUntil: 'networkidle' });

    await page
      .getByRole('heading', { name: 'Job-Hunt control surface' })
      .waitFor();
    await page.getByRole('link', { name: /Startup/ }).waitFor();
    await page.getByRole('link', { name: /Approvals/ }).waitFor();
    await page.getByText('Review application email').waitFor();
    await page.getByText('Job-Hunt startup diagnostics').waitFor();

    await page.getByRole('link', { name: /Chat/ }).click();
    await page
      .getByRole('heading', { name: 'Launch a supported workflow' })
      .waitFor();
    await page
      .getByRole('heading', { name: 'No recent sessions yet' })
      .waitFor();
    await page.getByRole('link', { name: /Pipeline/ }).click();
    await page
      .getByRole('heading', { name: 'Pipeline review workspace' })
      .waitFor();
    await page.getByText('Current strongest lane: Forward Deployed.').waitFor();
    await page.getByRole('link', { name: /Approvals/ }).click();
    await page
      .getByRole('heading', { name: 'Approval inbox and human review flow' })
      .waitFor();
    assert.match(page.url(), /#approvals$/);

    await page.reload({ waitUntil: 'networkidle' });
    await page
      .getByRole('heading', { name: 'Approval inbox and human review flow' })
      .waitFor();

    fakeApi.setShellMode('runtime-error');
    await page
      .getByRole('button', { name: /Refresh operator shell summary/ })
      .click();
    await page.getByRole('heading', { name: 'Runtime blocked' }).waitFor();
    await page
      .getByText('Bootstrap is live, but required system files are missing.', {
        exact: true,
      })
      .first()
      .waitFor();

    fakeApi.setShellMode('ready');
    await page
      .getByRole('button', { name: /Refresh operator shell summary/ })
      .click();
    await page
      .getByText('Bootstrap diagnostics are ready.', { exact: true })
      .first()
      .waitFor();

    await page.getByRole('link', { name: /Settings/ }).click();
    await page
      .getByRole('heading', { name: 'Settings and maintenance surface' })
      .waitFor();
    await page.getByText('Run doctor', { exact: true }).waitFor();
    assert.match(page.url(), /#settings$/);

    fakeApi.setSettingsUpdateState('up-to-date');
    await page
      .getByRole('button', { name: /Refresh settings summary/ })
      .click();
    await page.getByText('Updater is current').waitFor();

    await page.getByRole('link', { name: /Startup/ }).click();
    await page.getByText('Job-Hunt startup diagnostics').waitFor();
    await page.getByRole('link', { name: /Settings/ }).click();
    await page
      .getByRole('heading', { name: 'Settings and maintenance surface' })
      .waitFor();
    await page.getByText('Updater is current').waitFor();

    await page.route('**/api/operator-shell', async (route) => {
      await route.abort('failed');
    });
    await page
      .getByRole('button', { name: /Refresh operator shell summary/ })
      .click();
    await page.getByText('Offline after the last good summary').waitFor();
  } finally {
    await browser.close();
  }
} finally {
  await stopChild(webChild);
  await fakeApi.close();
}

console.log('App shell smoke checks passed.');

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

function createChecklistItem(input) {
  return {
    candidates: input.candidates,
    canonicalRepoRelativePath: input.path,
    description: input.description,
    missingBehavior: input.missingBehavior,
    owner: 'user',
    surfaceKey: input.surfaceKey,
  };
}

function createHealth(input) {
  return {
    agentRuntime: {
      authPath: `${ROOT}/data/openai-account-auth.json`,
      message:
        input.startupStatus === 'auth-required'
          ? 'Authentication is still required.'
          : 'Agent runtime is ready.',
      promptState: input.startupStatus === 'auth-required' ? null : 'ready',
      status: input.startupStatus === 'auth-required' ? 'auth-required' : 'ready',
    },
    message: input.message,
    missing: {
      onboarding: input.onboardingCount,
      optional: input.optionalCount,
      runtime: input.runtimeCount,
    },
    ok: input.healthStatus !== 'error',
    operationalStore: {
      message: 'Operational store ready.',
      status: 'ready',
    },
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    startupStatus: input.startupStatus,
    status: input.healthStatus,
  };
}

function createStartupPayload(input) {
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
      onboardingMissing: input.requiredItems,
      optionalMissing: input.optionalItems,
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
      runtimeMissing: input.runtimeItems,
      workspace: {
        protectedOwners: ['system', 'user'],
        writableRoots: ['config', 'data', 'output', 'profile', 'reports'],
      },
    },
    health: createHealth(input),
    message: input.message,
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
    status: input.startupStatus,
    userLayerWrites: 'disabled',
  };
}

function createShellSummary(input) {
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
      id: 'phase03-session03-startup-checklist-and-onboarding-wizard',
      monorepo: true,
      packagePath: 'apps/web',
      phase: 3,
      source: 'state-file',
      stateFilePath: `${ROOT}/.spec_system/state.json`,
    },
    generatedAt: '2026-04-22T00:00:00.000Z',
    health: createHealth(input),
    message: input.message,
    ok: true,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: input.startupStatus,
  };
}

function createRepairPreviewItems() {
  return [
    {
      description: 'Create the starter applications tracker.',
      destination: {
        canonicalRepoRelativePath: 'data/applications.md',
        matchedRepoRelativePath: null,
        status: 'missing',
        surfaceKey: 'applicationsTracker',
      },
      ready: true,
      reason: 'ready',
      source: {
        repoRelativePath: 'data/applications.example.md',
        status: 'found',
        surfaceKey: 'applicationsTrackerTemplate',
      },
    },
    {
      description: 'Create the starter profile configuration.',
      destination: {
        canonicalRepoRelativePath: 'config/profile.yml',
        matchedRepoRelativePath: null,
        status: 'missing',
        surfaceKey: 'profileConfig',
      },
      ready: true,
      reason: 'ready',
      source: {
        repoRelativePath: 'config/profile.example.yml',
        status: 'found',
        surfaceKey: 'profileConfigTemplate',
      },
    },
    {
      description: 'Create the starter CV markdown file.',
      destination: {
        canonicalRepoRelativePath: 'profile/cv.md',
        matchedRepoRelativePath: null,
        status: 'missing',
        surfaceKey: 'profileCv',
      },
      ready: true,
      reason: 'ready',
      source: {
        repoRelativePath: 'profile/cv.example.md',
        status: 'found',
        surfaceKey: 'profileCvTemplate',
      },
    },
  ];
}

function createOnboardingSummary(mode) {
  const requiredItems =
    mode === 'complete' || mode === 'empty'
      ? []
      : [
          createChecklistItem({
            candidates: ['config/profile.yml'],
            description: 'Profile configuration is missing.',
            missingBehavior: 'onboarding-required',
            path: 'config/profile.yml',
            surfaceKey: 'profileConfig',
          }),
          createChecklistItem({
            candidates: ['profile/cv.md', 'cv.md'],
            description: 'Profile CV markdown is missing.',
            missingBehavior: 'onboarding-required',
            path: 'profile/cv.md',
            surfaceKey: 'profileCv',
          }),
        ];
  const optionalItems =
    mode === 'complete'
      ? [
          createChecklistItem({
            candidates: ['data/applications.md'],
            description: 'Applications tracker has not been created yet.',
            missingBehavior: 'optional',
            path: 'data/applications.md',
            surfaceKey: 'applicationsTracker',
          }),
        ]
      : [];
  const startupStatus = mode === 'complete' || mode === 'empty'
    ? 'auth-required'
    : 'missing-prerequisites';
  const message =
    mode === 'empty'
      ? 'No onboarding repair targets are registered for this workspace.'
      : mode === 'complete'
        ? 'Workspace onboarding prerequisites are complete.'
        : '2 onboarding prerequisites are missing. 3 can be repaired from checked-in templates.';
  const items = mode === 'empty' ? [] : createRepairPreviewItems();

  return {
    checklist: {
      optional: optionalItems,
      required: requiredItems,
      runtime: [],
    },
    currentSession: {
      id: 'phase03-session03-startup-checklist-and-onboarding-wizard',
      monorepo: true,
      packagePath: 'apps/web',
      phase: 3,
      source: 'state-file',
      stateFilePath: `${ROOT}/.spec_system/state.json`,
    },
    generatedAt: '2026-04-22T00:00:00.000Z',
    health: createHealth({
      healthStatus: startupStatus === 'missing-prerequisites' ? 'degraded' : 'degraded',
      message:
        startupStatus === 'missing-prerequisites'
          ? 'Bootstrap is live, but onboarding files are still missing.'
          : 'Authentication is still required.',
      onboardingCount: requiredItems.length,
      optionalCount: optionalItems.length,
      runtimeCount: 0,
      startupStatus,
    }),
    message,
    ok: true,
    repairPreview: {
      items,
      readyTargets: items
        .filter((item) => item.ready)
        .map((item) => item.destination.surfaceKey),
      repairableCount: items.filter((item) => item.ready).length,
      targetCount: items.length,
      targets: items.map((item) => item.destination.surfaceKey),
    },
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: startupStatus,
  };
}

function createRepairPayload(targets) {
  return {
    created: targets.map((target) => ({
      repoRelativePath:
        target === 'profileConfig'
          ? 'config/profile.yml'
          : target === 'profileCv'
            ? 'profile/cv.md'
            : 'data/applications.md',
      target: target === 'applicationsTracker' ? 'tracker' : 'profile',
    })),
    generatedAt: '2026-04-22T00:00:01.000Z',
    health: createHealth({
      healthStatus: 'degraded',
      message: 'Authentication is still required.',
      onboardingCount: 0,
      optionalCount: 1,
      runtimeCount: 0,
      startupStatus: 'auth-required',
    }),
    message: `${targets.length} onboarding files repaired. Authentication is still required.`,
    ok: true,
    repairedCount: targets.length,
    requestedTargets: targets,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'auth-required',
  };
}

function getAppState(mode) {
  if (mode === 'complete' || mode === 'empty') {
    return {
      healthStatus: 'degraded',
      message: 'Authentication is still required.',
      onboardingCount: 0,
      optionalCount: 1,
      requiredItems: [],
      runtimeCount: 0,
      runtimeItems: [],
      startupStatus: 'auth-required',
      optionalItems: [
        createChecklistItem({
          candidates: ['data/applications.md'],
          description: 'Applications tracker has not been created yet.',
          missingBehavior: 'optional',
          path: 'data/applications.md',
          surfaceKey: 'applicationsTracker',
        }),
      ],
    };
  }

  return {
    healthStatus: 'degraded',
    message: 'Bootstrap is live, but onboarding files are still missing.',
    onboardingCount: 2,
    optionalCount: 0,
    requiredItems: [
      createChecklistItem({
        candidates: ['config/profile.yml'],
        description: 'Profile configuration is missing.',
        missingBehavior: 'onboarding-required',
        path: 'config/profile.yml',
        surfaceKey: 'profileConfig',
      }),
      createChecklistItem({
        candidates: ['profile/cv.md', 'cv.md'],
        description: 'Profile CV markdown is missing.',
        missingBehavior: 'onboarding-required',
        path: 'profile/cv.md',
        surfaceKey: 'profileCv',
      }),
    ],
    runtimeCount: 0,
    runtimeItems: [],
    startupStatus: 'missing-prerequisites',
    optionalItems: [],
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
    lastRepairTargets: [],
    onboardingMode: 'missing',
    repairRequests: 0,
    shouldDelayFirstSummary: true,
  };

  const server = createHttpServer(async (request, response) => {
    const appState = getAppState(
      state.onboardingMode === 'error' ? 'missing' : state.onboardingMode,
    );

    if (request.url === '/startup') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(createStartupPayload(appState), null, 2));
      return;
    }

    if (request.url === '/operator-shell') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(createShellSummary(appState), null, 2));
      return;
    }

    if (request.url?.startsWith('/onboarding')) {
      if (request.method === 'GET') {
        if (state.onboardingMode === 'error') {
          response.writeHead(400, {
            'content-type': 'application/json; charset=utf-8',
          });
          response.end(
            JSON.stringify(
              {
                error: {
                  code: 'onboarding-summary-failed',
                  message: 'Onboarding summary failed in the fake API.',
                },
                ok: false,
                service: 'jobhunt-api-scaffold',
                sessionId: 'phase01-session03-agent-runtime-bootstrap',
                status: 'bad-request',
              },
              null,
              2,
            ),
          );
          return;
        }

        if (state.shouldDelayFirstSummary) {
          state.shouldDelayFirstSummary = false;
          await delay(500);
        }

        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(
          JSON.stringify(createOnboardingSummary(state.onboardingMode), null, 2),
        );
        return;
      }

      if (request.method === 'POST' && request.url === '/onboarding/repair') {
        const body = await new Promise((resolveBody, reject) => {
          let rawBody = '';

          request.setEncoding('utf8');
          request.on('data', (chunk) => {
            rawBody += chunk;
          });
          request.on('end', () => resolveBody(rawBody));
          request.on('error', reject);
        });
        const parsedBody = JSON.parse(body);
        state.repairRequests += 1;
        state.lastRepairTargets = [...parsedBody.targets].sort();
        await delay(700);
        state.onboardingMode = 'complete';

        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(
          JSON.stringify(createRepairPayload(parsedBody.targets), null, 2),
        );
        return;
      }
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
    throw new Error('Failed to start the fake onboarding API.');
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
    getRepairRequests: () => state.repairRequests,
    getSelectedRepairTargets: () => [...state.lastRepairTargets],
    setOnboardingMode: (mode) => {
      state.onboardingMode = mode;
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
    page.on('pageerror', (error) => {
      console.error(`PAGEERROR: ${error.message}`);
    });
    await page.goto(webUrl, { waitUntil: 'networkidle' });

    try {
      await page
        .getByRole('button', { name: /Open.*onboarding/i })
        .waitFor();
    } catch (error) {
      console.error(await page.locator('body').textContent());
      throw error;
    }
    await page.getByRole('button', { name: /Open.*onboarding/i }).click();
    await page.getByRole('heading', { name: 'Loading onboarding checklist' }).waitFor();
    await page
      .getByRole('heading', { name: 'Startup checklist and onboarding wizard' })
      .waitFor();
    await page.getByText('config/profile.yml', { exact: true }).first().waitFor();
    await page.getByText('profile/cv.md', { exact: true }).first().waitFor();

    await page.getByLabel('Select repair target applicationsTracker').click();
    await page.getByText('Repair 2 selected targets').waitFor();

    const repairButton = page.getByRole('button', {
      name: /Confirm onboarding repair|Repair 2 selected targets/i,
    });
    await repairButton.dblclick();
    await page.getByText('Repairing 2 targets: profileConfig, profileCv').waitFor();
    await page.getByText('2 files created.').waitFor();

    assert.equal(fakeApi.getRepairRequests(), 1);
    assert.deepEqual(fakeApi.getSelectedRepairTargets(), [
      'profileConfig',
      'profileCv',
    ]);

    await page.getByRole('button', { name: 'Open the startup surface' }).click();
    await page.getByText('Missing counts: onboarding 0, optional 1, runtime 0').waitFor();

    await page.getByRole('link', { name: /Onboarding/ }).click();
    fakeApi.setOnboardingMode('empty');
    await page.getByRole('button', { name: /Refresh onboarding summary/i }).click();
    await page
      .getByText(
        'No onboarding repair targets are registered for this workspace.',
      )
      .first()
      .waitFor();

    fakeApi.setOnboardingMode('error');
    await page.getByRole('button', { name: /Refresh onboarding summary/i }).click();
    await page.getByRole('heading', { name: 'Onboarding summary error' }).waitFor();

    await page.route('**/api/onboarding*', async (route) => {
      await route.abort('failed');
    });
    await page.getByRole('button', { name: /Refresh onboarding summary/i }).click();
    await page
      .getByRole('heading', { name: 'Using the last good onboarding summary' })
      .waitFor();
  } finally {
    await browser.close();
  }
} finally {
  await stopChild(webChild);
  await fakeApi.close();
}

console.log('App onboarding smoke checks passed.');

#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const APP_STATE_ROOT = join(ROOT, '.jobhunt-app');
const state = readJson('.spec_system/state.json');
const currentSessionId =
  typeof state.current_session === 'string'
    ? state.current_session
    : 'phase01-session03-agent-runtime-bootstrap';

function run(command, args) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), 'utf-8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function snapshotFile(relativePath) {
  const absolutePath = join(ROOT, relativePath);

  return {
    exists: existsSync(absolutePath),
    relativePath,
    contents: existsSync(absolutePath)
      ? readFileSync(absolutePath, 'utf-8')
      : null,
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

function createEvent(name, payload) {
  return `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : (value ?? ''),
    ]),
  );
}

function createStoredAuthRecord() {
  return `${JSON.stringify(
    {
      credentials: {
        accessToken: 'access-token-bootstrap',
        accountId: 'acct-bootstrap-smoke',
        expiresAt: Date.now() + 60_000,
        refreshToken: 'refresh-token-bootstrap',
      },
      provider: 'openai-codex',
      updatedAt: new Date().toISOString(),
      version: 1,
    },
    null,
    2,
  )}\n`;
}

async function startFakeCodexBackend() {
  const seenRequests = [];
  const sockets = new Set();
  let requestCount = 0;

  const server = createHttpServer(async (request, response) => {
    if (
      request.method === 'POST' &&
      request.url === '/backend-api/codex/responses'
    ) {
      requestCount += 1;
      seenRequests.push({
        body: JSON.parse(await readRequestBody(request)),
        headers: normalizeHeaders(request.headers),
      });

      response.statusCode = 200;
      response.setHeader('connection', 'close');
      response.setHeader('content-type', 'text/event-stream');
      response.write(
        [
          createEvent('response.created', {
            response: {
              id: `resp_bootstrap_${requestCount}`,
              model: 'gpt-5.4-mini-2026-03-17',
              status: 'in_progress',
            },
            type: 'response.created',
          }),
          createEvent('response.completed', {
            response: {
              id: `resp_bootstrap_${requestCount}`,
              model: 'gpt-5.4-mini-2026-03-17',
              output: [],
              status: 'completed',
              usage: {
                input_tokens: 10,
                output_tokens: 0,
                total_tokens: 10,
              },
            },
            type: 'response.completed',
          }),
        ].join(''),
      );
      response.end();
      return;
    }

    response.statusCode = 404;
    response.end('not found');
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  await new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  if (typeof address !== 'object' || address === null) {
    throw new Error('Failed to start the fake Codex backend.');
  }

  return {
    async close() {
      await new Promise((resolvePromise, reject) => {
        server.close((error) => {
          if (typeof server.closeIdleConnections === 'function') {
            server.closeIdleConnections();
          }
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }

          for (const socket of sockets) {
            socket.destroy();
          }

          if (error) {
            reject(error);
            return;
          }

          resolvePromise();
        });
      });
    },
    seenRequests,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function waitForHealthy(url, child, stderrLog) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(
        `API server exited before becoming healthy. stderr:\n${stderrLog.join('')}`,
      );
    }

    try {
      const response = await fetch(`${url}/health`);

      if (response.ok) {
        return;
      }
    } catch (_error) {
      // Keep polling until the server is reachable or exits.
    }

    await delay(100);
  }

  throw new Error(
    `Timed out waiting for ${url}/health. stderr:\n${stderrLog.join('')}`,
  );
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

const userLayerSnapshots = [
  'profile/cv.md',
  'profile/article-digest.md',
  'config/profile.yml',
  'config/portals.yml',
  'modes/_profile.md',
  'data/applications.md',
  'data/pipeline.md',
  'data/follow-ups.md',
].map(snapshotFile);

const appStateExistedBefore = existsSync(APP_STATE_ROOT);
const appStateStatBefore = appStateExistedBefore
  ? statSync(APP_STATE_ROOT)
  : null;
const rootPackage = readJson('package.json');

for (const scriptName of [
  'app:api:serve',
  'app:api:test:agent-runtime',
  'app:api:test:runtime',
  'app:api:test:store',
  'app:boot:test',
  'app:validate',
]) {
  assert(
    typeof rootPackage.scripts?.[scriptName] === 'string',
    `Root package.json is missing script: ${scriptName}`,
  );
}

run('npm', ['run', 'app:check']);
run('npm', ['run', 'app:api:test:agent-runtime']);
run('npm', ['run', 'app:api:test:runtime']);
run('npm', ['run', 'app:api:test:store']);
run('npm', ['run', 'app:api:build']);
run('npm', ['run', 'app:web:build']);

assert(
  existsSync(join(ROOT, 'apps', 'api', 'dist', 'server', 'index.js')),
  'API build did not produce apps/api/dist/server/index.js.',
);
assert(
  existsSync(join(ROOT, 'apps', 'web', 'dist', 'index.html')),
  'Web build did not produce apps/web/dist/index.html.',
);

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const authSandbox = mkdtempSync(join(tmpdir(), 'jobhunt-app-bootstrap-'));
const authPath = join(authSandbox, 'data', 'openai-account-auth.json');
mkdirSync(join(authSandbox, 'data'), { recursive: true });
writeFileSync(authPath, createStoredAuthRecord(), 'utf8');
const fakeBackend = await startFakeCodexBackend();
const stderrLog = [];
const child = spawn('node', ['apps/api/dist/server/index.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    JOBHUNT_API_OPENAI_AUTH_PATH: authPath,
    JOBHUNT_API_OPENAI_BASE_URL: `${fakeBackend.url}/backend-api`,
    JOBHUNT_API_OPENAI_MODEL: 'openai-codex/gpt-5.4-mini',
    JOBHUNT_API_OPENAI_ORIGINATOR: 'jobhunt-bootstrap-smoke',
    JOBHUNT_API_HOST: '127.0.0.1',
    JOBHUNT_API_PORT: String(port),
    JOBHUNT_API_REPO_ROOT: ROOT,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stderr.setEncoding('utf-8');
child.stderr.on('data', (chunk) => {
  stderrLog.push(chunk);
});

try {
  await waitForHealthy(baseUrl, child, stderrLog);

  const healthResponse = await fetch(`${baseUrl}/health`);
  const startupResponse = await fetch(`${baseUrl}/startup`);
  const healthPayload = await healthResponse.json();
  const startupPayload = await startupResponse.json();

  assert(healthResponse.status === 200, 'Expected /health to return HTTP 200.');
  assert(
    startupResponse.status === 200,
    'Expected /startup to return HTTP 200.',
  );
  assert(
    healthPayload.status === 'ok',
    'Expected /health to report status "ok".',
  );
  assert(
    healthPayload.agentRuntime.status === 'ready',
    'Expected /health to report a ready agent-runtime state.',
  );
  assert(
    startupPayload.status === 'ready',
    'Expected /startup to report a ready bootstrap state.',
  );
  assert(
    startupPayload.repoRoot === ROOT,
    'Startup payload reported an unexpected repo root.',
  );
  assert(
    startupPayload.diagnostics.onboardingMissing.length === 0,
    'Startup payload reported unexpected onboarding blockers in the live repo.',
  );
  assert(
    startupPayload.diagnostics.agentRuntime.status === 'ready',
    'Startup payload did not report a ready agent-runtime state.',
  );
  assert(
    startupPayload.diagnostics.agentRuntime.auth.authPath === authPath,
    'Startup payload reported an unexpected auth-path override.',
  );
  assert(
    startupPayload.diagnostics.runtimeMissing.length === 0,
    'Startup payload reported unexpected runtime blockers in the live repo.',
  );
  assert(
    startupPayload.bootSurface.startupPath === '/startup',
    'Startup payload reported an unexpected startup path.',
  );
  assert(
    startupPayload.sessionId === 'phase01-session03-agent-runtime-bootstrap',
    'Startup payload reported an unexpected session id.',
  );
  assert(
    startupPayload.diagnostics.currentSession.id === currentSessionId,
    'Startup payload reported unexpected current-session metadata.',
  );
  assert(
    healthPayload.operationalStore.status ===
      startupPayload.operationalStore.status,
    'Health and startup payloads disagreed on operational-store status.',
  );
  assert(
    startupPayload.operationalStore.status !== 'corrupt',
    'Startup payload reported a corrupt operational store in the live repo.',
  );
  assert(
    fakeBackend.seenRequests.length === 0,
    'Startup diagnostics unexpectedly contacted the Codex backend.',
  );
} finally {
  await stopChild(child);
  await fakeBackend.close();
  rmSync(authSandbox, { force: true, recursive: true });
}

if (!appStateExistedBefore) {
  assert(
    !existsSync(APP_STATE_ROOT),
    '.jobhunt-app was created by the bootstrap smoke harness.',
  );
} else {
  const appStateStatAfter = statSync(APP_STATE_ROOT);
  assert(
    appStateStatBefore !== null &&
      appStateStatAfter.mtimeMs === appStateStatBefore.mtimeMs,
    '.jobhunt-app was modified by the bootstrap smoke harness.',
  );
}

for (const snapshot of userLayerSnapshots) {
  const absolutePath = join(ROOT, snapshot.relativePath);
  const existsAfter = existsSync(absolutePath);

  assert(
    existsAfter === snapshot.exists,
    `Bootstrap smoke harness changed file existence for ${snapshot.relativePath}.`,
  );

  if (snapshot.exists) {
    const contentsAfter = readFileSync(absolutePath, 'utf-8');

    assert(
      contentsAfter === snapshot.contents,
      `Bootstrap smoke harness mutated user-layer file contents: ${snapshot.relativePath}.`,
    );
  }
}

console.log('App bootstrap smoke checks passed.');

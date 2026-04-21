#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const APP_STATE_ROOT = join(ROOT, '.jobhunt-app');

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
const appStateStatBefore = appStateExistedBefore ? statSync(APP_STATE_ROOT) : null;
const rootPackage = readJson('package.json');

for (const scriptName of [
  'app:api:serve',
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
const stderrLog = [];
const child = spawn('node', ['apps/api/dist/server/index.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
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
  assert(startupResponse.status === 200, 'Expected /startup to return HTTP 200.');
  assert(healthPayload.status === 'ok', 'Expected /health to report status "ok".');
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
    startupPayload.diagnostics.runtimeMissing.length === 0,
    'Startup payload reported unexpected runtime blockers in the live repo.',
  );
  assert(
    startupPayload.bootSurface.startupPath === '/startup',
    'Startup payload reported an unexpected startup path.',
  );
  assert(
    startupPayload.sessionId === 'phase01-session02-sqlite-operational-store',
    'Startup payload reported an unexpected session id.',
  );
  assert(
    healthPayload.operationalStore.status === startupPayload.operationalStore.status,
    'Health and startup payloads disagreed on operational-store status.',
  );
  assert(
    startupPayload.operationalStore.status !== 'corrupt',
    'Startup payload reported a corrupt operational store in the live repo.',
  );
} finally {
  await stopChild(child);
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

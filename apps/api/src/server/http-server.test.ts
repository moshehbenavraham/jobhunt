import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { STARTUP_SESSION_ID, STARTUP_SERVICE_NAME } from '../index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { startStartupHttpServer } from './http-server.js';

async function readJsonResponse(url: string): Promise<{
  payload: unknown;
  response: Response;
}> {
  const response = await fetch(url);
  const payload = await response.json();

  return {
    payload,
    response,
  };
}

test('health and startup routes report ready diagnostics for a configured repo', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });

  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    repoRoot: fixture.repoRoot,
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

    assert.equal((startupPayload as { status: string }).status, 'ready');
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
        bootSurface: { startupPath: string };
      }).bootSurface.startupPath,
      '/startup',
    );
  } finally {
    await handle.close();
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
  const handle = await startStartupHttpServer({
    host: '127.0.0.1',
    port: 0,
    repoRoot: fixture.repoRoot,
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
      'missing-prerequisites',
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

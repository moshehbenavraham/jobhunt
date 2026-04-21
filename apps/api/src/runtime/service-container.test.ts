import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { createAgentRuntimeService } from '../agent-runtime/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createApiServiceContainer } from './service-container.js';
import { getRepoOpenAIAccountModuleImportPath } from '../agent-runtime/test-utils.js';

test('service container reuses runtime services while reflecting live repo state', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const agentRuntime = createAgentRuntimeService({
    authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
    repoRoot: fixture.repoRoot,
  });
  const container = createApiServiceContainer({
    agentRuntime,
    repoRoot: fixture.repoRoot,
  });

  try {
    const beforeFirstRead = await fixture.snapshotUserLayer();
    const firstDiagnostics = await container.startupDiagnostics.getDiagnostics();
    const runtimeReadiness = await container.agentRuntime.getReadiness();
    const afterFirstRead = await fixture.snapshotUserLayer();

    assert.deepEqual(afterFirstRead, beforeFirstRead);
    assert.deepEqual(
      firstDiagnostics.onboardingMissing.map((item) => item.surfaceKey),
      ['profileConfig', 'profileCv'],
    );
    assert.equal(firstDiagnostics.agentRuntime.status, 'auth-required');
    assert.equal(runtimeReadiness.status, 'auth-required');
    assert.equal(
      runtimeReadiness.auth.authPath,
      join(fixture.repoRoot, 'data', 'openai-account-auth.json'),
    );

    await fixture.writeText('config/profile.yml', 'full_name: Test User\n');
    await fixture.writeText('profile/cv.md', '# CV\n');

    const beforeSecondRead = await fixture.snapshotUserLayer();
    const secondDiagnostics = await container.startupDiagnostics.getDiagnostics();
    const afterSecondRead = await fixture.snapshotUserLayer();

    assert.deepEqual(afterSecondRead, beforeSecondRead);
    assert.equal(secondDiagnostics.onboardingMissing.length, 0);
    assert.equal(secondDiagnostics.agentRuntime.status, 'auth-required');
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container cleanup is idempotent, disposes the agent runtime, and blocks reuse after dispose', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  let agentRuntimeCloseCount = 0;
  const container = createApiServiceContainer({
    agentRuntime: {
      async bootstrap() {
        throw new Error('bootstrap not needed in this test');
      },
      async close() {
        agentRuntimeCloseCount += 1;
      },
      async getReadiness() {
        return {
          auth: {
            accountId: null,
            authPath: join(fixture.repoRoot, 'data', 'openai-account-auth.json'),
            expiresAt: null,
            message: 'Stored OpenAI account credentials are required.',
            nextSteps: ['npm run auth:openai -- login'],
            state: 'auth-required' as const,
            updatedAt: null,
          },
          config: {
            authPath: join(fixture.repoRoot, 'data', 'openai-account-auth.json'),
            baseUrl: 'https://chatgpt.com/backend-api',
            model: 'gpt-5.4-mini',
            originator: 'pi',
            overrides: {
              authPath: false,
              baseUrl: false,
              model: false,
              originator: false,
            },
          },
          message: 'Stored OpenAI account credentials are required.',
          prompt: null,
          status: 'auth-required' as const,
        };
      },
    },
    repoRoot: fixture.repoRoot,
  });
  let cleanupCount = 0;

  container.addCleanupTask(() => {
    cleanupCount += 1;
  });
  await container.agentRuntime.getReadiness();

  await container.dispose();
  await container.dispose();

  assert.equal(cleanupCount, 1);
  assert.equal(agentRuntimeCloseCount, 1);
  await assert.rejects(
    () => container.startupDiagnostics.getDiagnostics(),
    /disposed/i,
  );

  await fixture.cleanup();
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createStartupDiagnosticsService } from '../index.js';
import { createWorkspaceAdapter } from '../workspace/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createStartupInspectionTools } from './startup-inspection-tools.js';

function createReadOnlyContext(repoRoot: string) {
  const workspace = createWorkspaceAdapter({ repoRoot });

  return {
    correlation: {
      jobId: 'job-startup-tool',
      requestId: 'request-startup-tool',
      sessionId: 'session-startup-tool',
      traceId: 'trace-startup-tool',
    },
    enqueueJob: async () => {
      throw new Error('startup tools should not enqueue durable jobs');
    },
    input: {},
    mutateWorkspace: async () => {
      throw new Error('mutateWorkspace should not be called by startup tools');
    },
    now: () => Date.parse('2026-04-21T08:00:00.000Z'),
    observe: async () => {},
    request: {
      correlation: {
        jobId: 'job-startup-tool',
        requestId: 'request-startup-tool',
        sessionId: 'session-startup-tool',
        traceId: 'trace-startup-tool',
      },
      input: {},
      toolName: 'startup-tool',
    },
    runScript: async () => {
      throw new Error('runScript should not be called by startup tools');
    },
    workspace,
  };
}

function createStubAgentRuntime(repoRoot: string) {
  return {
    async bootstrap() {
      throw new Error('bootstrap is not used by startup inspection tests');
    },
    async close() {},
    async getReadiness() {
      return {
        auth: {
          accountId: null,
          authPath: `${repoRoot}/data/openai-account-auth.json`,
          expiresAt: null,
          message: 'Stored OpenAI account credentials are required.',
          nextSteps: ['npm run auth:openai -- login'],
          state: 'auth-required' as const,
          updatedAt: null,
        },
        config: {
          authPath: `${repoRoot}/data/openai-account-auth.json`,
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
  };
}

test('startup inspection tool reports onboarding gaps without hidden writes', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const startupDiagnostics = createStartupDiagnosticsService(
    {
      repoRoot: fixture.repoRoot,
    },
    {
      agentRuntime: createStubAgentRuntime(fixture.repoRoot),
      workspace,
    },
  );
  const tool = createStartupInspectionTools({
    getStartupDiagnostics: () => startupDiagnostics.getDiagnostics(),
  }).find((candidate) => candidate.name === 'inspect-startup-diagnostics');

  assert.ok(tool);

  try {
    const beforeSnapshot = await fixture.snapshotUserLayer();
    const result = await tool.execute(
      tool.inputSchema.parse({}),
      createReadOnlyContext(fixture.repoRoot),
    );
    const afterSnapshot = await fixture.snapshotUserLayer();

    assert.deepEqual(afterSnapshot, beforeSnapshot);
    assert.equal(result.output?.service, 'jobhunt-api-scaffold');
    assert.deepEqual(
      (result.output?.onboardingMissing as Array<{ surfaceKey: string }>)
        .map((item) => item.surfaceKey)
        .sort(),
      ['profileConfig', 'profileCv'],
    );
    assert.deepEqual(result.output?.workspace.writableRoots, ['.jobhunt-app']);
  } finally {
    await fixture.cleanup();
  }
});

test('prompt contract inspection selects the requested workflow route', async () => {
  const fixture = await createWorkspaceFixture();
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const startupDiagnostics = createStartupDiagnosticsService(
    {
      repoRoot: fixture.repoRoot,
    },
    {
      agentRuntime: createStubAgentRuntime(fixture.repoRoot),
      workspace,
    },
  );
  const tool = createStartupInspectionTools({
    getStartupDiagnostics: () => startupDiagnostics.getDiagnostics(),
  }).find((candidate) => candidate.name === 'inspect-prompt-contract');

  assert.ok(tool);

  try {
    const result = await tool.execute(
      tool.inputSchema.parse({
        workflow: 'scan-portals',
      }),
      createReadOnlyContext(fixture.repoRoot),
    );

    assert.equal(result.output?.selectedRoute.intent, 'scan-portals');
    assert.equal(
      result.output?.selectedRoute.modeRepoRelativePath,
      'modes/scan.md',
    );
    assert.ok(
      (result.output?.sourceOrder as string[]).includes('workflow-mode'),
    );
    assert.ok(
      (result.output?.supportedWorkflows as string[]).includes('scan-portals'),
    );
  } finally {
    await fixture.cleanup();
  }
});

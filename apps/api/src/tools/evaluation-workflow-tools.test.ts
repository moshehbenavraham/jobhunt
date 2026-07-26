import assert from 'node:assert/strict';
import test from 'node:test';
import { createAgentRuntimeService } from '../agent-runtime/index.js';
import {
  createAgentRuntimeAuthFixture,
  getRepoOpenAIAccountModuleImportPath,
  startFakeCodexBackend,
} from '../agent-runtime/test-utils.js';
import { createWorkspaceAdapter } from '../workspace/index.js';
import { createPromptFixture } from '../prompt/test-utils.js';
import { createEvaluationWorkflowTools } from './evaluation-workflow-tools.js';

function createReadOnlyContext(repoRoot: string, toolName: string) {
  const workspace = createWorkspaceAdapter({ repoRoot });

  return {
    correlation: {
      jobId: `job-${toolName}`,
      requestId: `request-${toolName}`,
      sessionId: `session-${toolName}`,
      traceId: `trace-${toolName}`,
    },
    enqueueJob: async () => {
      throw new Error('workflow tools should not enqueue durable jobs');
    },
    input: {},
    mutateWorkspace: async () => {
      throw new Error('workflow tools should not mutate the workspace');
    },
    now: () => Date.parse('2026-04-21T08:00:00.000Z'),
    observe: async () => {},
    request: {
      correlation: {
        jobId: `job-${toolName}`,
        requestId: `request-${toolName}`,
        sessionId: `session-${toolName}`,
        traceId: `trace-${toolName}`,
      },
      input: {},
      toolName,
    },
    runScript: async () => {
      throw new Error('workflow tools should not dispatch scripts');
    },
    workspace,
  };
}

function createWorkflowTools(
  bootstrapWorkflow: (
    workflow: 'auto-pipeline' | 'single-evaluation',
  ) => ReturnType<ReturnType<typeof createAgentRuntimeService>['bootstrap']>,
) {
  return createEvaluationWorkflowTools({
    bootstrapWorkflow,
  });
}

test('workflow bootstrap tool maps auth-required state without surfacing provider errors', async () => {
  const fixture = await createPromptFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const service = createAgentRuntimeService({
    authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
    env: {
      JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
    },
    repoRoot: fixture.repoRoot,
  });
  const tool = createWorkflowTools((workflow) =>
    service.bootstrap(workflow),
  ).find((candidate) => candidate.name === 'bootstrap-single-evaluation');

  assert.ok(tool);

  try {
    await authFixture.setMissing();

    const result = await tool.execute(
      tool.inputSchema.parse({}),
      createReadOnlyContext(fixture.repoRoot, tool.name),
    );

    assert.equal(result.output?.status, 'auth-required');
    assert.match(String(result.output?.message), /required/i);
  } finally {
    await service.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('workflow bootstrap tool maps missing workflow prompts explicitly', async () => {
  const fixture = await createPromptFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const service = createAgentRuntimeService({
    authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
    env: {
      JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
    },
    repoRoot: fixture.repoRoot,
  });
  const tool = createWorkflowTools((workflow) =>
    service.bootstrap(workflow),
  ).find((candidate) => candidate.name === 'bootstrap-auto-pipeline');

  assert.ok(tool);

  try {
    await authFixture.setReady();
    await fixture.deleteText('modes/auto-pipeline.md');

    const result = await tool.execute(
      tool.inputSchema.parse({}),
      createReadOnlyContext(fixture.repoRoot, tool.name),
    );

    assert.equal(result.output?.status, 'prompt-missing');
    assert.equal(result.output?.workflow, 'auto-pipeline');
  } finally {
    await service.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('workflow bootstrap tool returns prompt bundle metadata when the runtime is ready', async () => {
  const fixture = await createPromptFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const backend = await startFakeCodexBackend();
  const service = createAgentRuntimeService({
    authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
    env: {
      JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
      JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
      JOBHUNT_API_OPENAI_MODEL: 'openai-codex/gpt-5.4-mini',
      JOBHUNT_API_OPENAI_ORIGINATOR: 'jobhunt-workflow-tool-test',
    },
    repoRoot: fixture.repoRoot,
  });
  const tool = createWorkflowTools((workflow) =>
    service.bootstrap(workflow),
  ).find((candidate) => candidate.name === 'bootstrap-single-evaluation');

  assert.ok(tool);

  try {
    await authFixture.setReady({
      accountId: 'acct-workflow-tool',
    });

    const result = await tool.execute(
      tool.inputSchema.parse({}),
      createReadOnlyContext(fixture.repoRoot, tool.name),
    );

    assert.equal(result.output?.status, 'ready');
    assert.equal(result.output?.workflow, 'single-evaluation');
    assert.equal(
      result.output?.promptBundle.workflow.modeRepoRelativePath,
      'modes/oferta.md',
    );
    assert.equal(result.output?.model, 'gpt-5.4-mini');
  } finally {
    await service.close();
    await backend.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

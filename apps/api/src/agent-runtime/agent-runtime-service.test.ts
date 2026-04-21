import assert from 'node:assert/strict';
import test from 'node:test';
import { Agent, run } from '@openai/agents';
import { createPromptFixture } from '../prompt/test-utils.js';
import { AgentRuntimeBootstrapError } from './agent-runtime-contract.js';
import { createAgentRuntimeService } from './agent-runtime-service.js';
import {
  createAgentRuntimeAuthFixture,
  getRepoOpenAIAccountModuleImportPath,
  startFakeCodexBackend,
} from './test-utils.js';

function createService(repoRoot: string, env: NodeJS.ProcessEnv = {}) {
  return createAgentRuntimeService({
    authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
    env,
    repoRoot,
  });
}

test('agent runtime service rejects unsupported workflows with an explicit bootstrap error', async () => {
  const fixture = await createPromptFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const service = createService(fixture.repoRoot, {
    JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
  });

  try {
    await authFixture.setReady();

    await assert.rejects(
      () => service.bootstrap('not-a-real-workflow'),
      (error: unknown) =>
        error instanceof AgentRuntimeBootstrapError &&
        error.code === 'unsupported-workflow',
    );
  } finally {
    await service.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('agent runtime service reports missing workflow prompts before provider bootstrap', async () => {
  const fixture = await createPromptFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const service = createService(fixture.repoRoot, {
    JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
  });

  try {
    await authFixture.setReady();
    await fixture.deleteText('modes/scan.md');

    await assert.rejects(
      () => service.bootstrap('scan-portals'),
      (error: unknown) =>
        error instanceof AgentRuntimeBootstrapError &&
        error.code === 'prompt-missing',
    );
  } finally {
    await service.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('agent runtime service returns a ready bootstrap and configures the fake backend for agent runs', async () => {
  const fixture = await createPromptFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const backend = await startFakeCodexBackend();
  const service = createService(fixture.repoRoot, {
    JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
    JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
    JOBHUNT_API_OPENAI_MODEL: 'openai-codex/gpt-5.4-mini',
    JOBHUNT_API_OPENAI_ORIGINATOR: 'jobhunt-agent-runtime-test',
  });

  try {
    await authFixture.setReady({ accountId: 'acct-agent-runtime-service' });

    const bootstrap = await service.bootstrap('single-evaluation');

    assert.equal(bootstrap.status, 'ready');
    assert.equal(bootstrap.prompt.workflow, 'single-evaluation');
    assert.equal(
      bootstrap.promptBundle.workflow.modeRepoRelativePath,
      'modes/oferta.md',
    );
    assert.deepEqual(bootstrap.promptBundle.sourceOrder[0], 'agents-guide');

    const agent = new Agent({
      instructions: 'You are terse. Reply with the single word PONG.',
      model: bootstrap.model,
      name: 'Agent runtime service test',
    });
    const result = await run(agent, 'Reply with the single word PONG.');

    assert.equal(result.finalOutput, 'PONG');
    assert.equal(backend.seenRequests.length, 1);
    assert.equal(
      backend.seenRequests[0]?.headers['chatgpt-account-id'],
      'acct-agent-runtime-service',
    );
    assert.equal(
      backend.seenRequests[0]?.headers.originator,
      'jobhunt-agent-runtime-test',
    );
  } finally {
    await service.close();
    await backend.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

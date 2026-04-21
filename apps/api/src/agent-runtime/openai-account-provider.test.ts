import assert from 'node:assert/strict';
import test from 'node:test';
import { Agent, run } from '@openai/agents';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createAgentRuntimeConfig } from './agent-runtime-config.js';
import {
  createConfiguredOpenAIAccountProvider,
  getOpenAIAccountProviderDefaults,
  inspectOpenAIAccountReadiness,
} from './openai-account-provider.js';
import {
  createAgentRuntimeAuthFixture,
  getRepoOpenAIAccountModuleImportPath,
  startFakeCodexBackend,
} from './test-utils.js';

test('openai account provider maps missing, invalid, expired, and ready auth states', async () => {
  const fixture = await createWorkspaceFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const { defaults, moduleRef } = await getOpenAIAccountProviderDefaults({
    authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
    repoRoot: fixture.repoRoot,
  });
  const config = createAgentRuntimeConfig(defaults, {
    authPath: authFixture.authPath,
    repoRoot: fixture.repoRoot,
  });

  try {
    await authFixture.setMissing();
    const missing = await inspectOpenAIAccountReadiness(config, {
      moduleRef,
      repoRoot: fixture.repoRoot,
    });

    assert.equal(missing.state, 'auth-required');
    assert.equal(missing.authPath, authFixture.authPath);

    await authFixture.setInvalid();
    const invalid = await inspectOpenAIAccountReadiness(config, {
      moduleRef,
      repoRoot: fixture.repoRoot,
    });

    assert.equal(invalid.state, 'invalid-auth');
    assert.match(invalid.message, /invalid/i);

    await authFixture.setExpired();
    const expired = await inspectOpenAIAccountReadiness(config, {
      moduleRef,
      repoRoot: fixture.repoRoot,
    });

    assert.equal(expired.state, 'expired-auth');
    assert.equal(expired.authPath, authFixture.authPath);

    await authFixture.setReady({ accountId: 'acct-provider-ready' });
    const ready = await inspectOpenAIAccountReadiness(config, {
      moduleRef,
      repoRoot: fixture.repoRoot,
    });

    assert.equal(ready.state, 'ready');
    assert.equal(ready.accountId, 'acct-provider-ready');
  } finally {
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

test('openai account provider bootstraps the fake backend with normalized overrides', async () => {
  const fixture = await createWorkspaceFixture();
  const authFixture = await createAgentRuntimeAuthFixture();
  const backend = await startFakeCodexBackend();
  const { defaults, moduleRef } = await getOpenAIAccountProviderDefaults({
    authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
    repoRoot: fixture.repoRoot,
  });

  let providerToClose:
    | Awaited<ReturnType<typeof createConfiguredOpenAIAccountProvider>>['provider']
    | undefined;

  try {
    await authFixture.setReady({ accountId: 'acct-provider-bootstrap' });

    const config = createAgentRuntimeConfig(defaults, {
      authPath: authFixture.authPath,
      baseUrl: `${backend.url}/backend-api`,
      model: 'openai-codex/gpt-5.4-mini',
      originator: 'jobhunt-api-test',
      repoRoot: fixture.repoRoot,
    });
    const configured = await createConfiguredOpenAIAccountProvider(config, {
      moduleRef,
      repoRoot: fixture.repoRoot,
    });

    providerToClose = configured.provider;

    const agent = new Agent({
      instructions: 'You are terse. Reply with the single word PONG.',
      model: configured.model,
      name: 'Agent runtime provider test',
    });
    const result = await run(agent, 'Reply with the single word PONG.');

    assert.equal(result.finalOutput, 'PONG');
    assert.equal(backend.seenRequests.length, 1);
    assert.equal(
      backend.seenRequests[0]?.headers['chatgpt-account-id'],
      'acct-provider-bootstrap',
    );
    assert.equal(backend.seenRequests[0]?.headers.originator, 'jobhunt-api-test');
    assert.equal(backend.seenRequests[0]?.body.model, 'gpt-5.4-mini');
  } finally {
    await providerToClose?.close();
    await backend.close();
    await authFixture.cleanup();
    await fixture.cleanup();
  }
});

import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import {
  AGENT_RUNTIME_AUTH_PATH_ENV,
  AGENT_RUNTIME_BASE_URL_ENV,
  AGENT_RUNTIME_MODEL_ENV,
  AGENT_RUNTIME_ORIGINATOR_ENV,
  AgentRuntimeConfigValidationError,
  createAgentRuntimeConfig,
  readAgentRuntimeConfigFromEnv,
} from './agent-runtime-config.js';

const DEFAULTS = {
  authPath: 'data/openai-account-auth.json',
  baseUrl: 'https://chatgpt.com/backend-api',
  model: 'gpt-5.4-mini',
  originator: 'pi',
} as const;

test('agent runtime config resolves repo-root-aware auth paths and env overrides', () => {
  const repoRoot = join('/tmp', 'jobhunt-agent-runtime-config');
  const config = readAgentRuntimeConfigFromEnv(
    DEFAULTS,
    {
      [AGENT_RUNTIME_AUTH_PATH_ENV]: 'fixtures/auth.json',
      [AGENT_RUNTIME_BASE_URL_ENV]: 'http://127.0.0.1:4318/backend-api/',
      [AGENT_RUNTIME_MODEL_ENV]: 'openai-codex/gpt-5.4-mini',
      [AGENT_RUNTIME_ORIGINATOR_ENV]: 'jobhunt-api-test',
    },
    { repoRoot },
  );

  assert.equal(config.authPath, join(repoRoot, 'fixtures', 'auth.json'));
  assert.equal(config.baseUrl, 'http://127.0.0.1:4318/backend-api');
  assert.equal(config.model, 'openai-codex/gpt-5.4-mini');
  assert.equal(config.originator, 'jobhunt-api-test');
  assert.deepEqual(config.overrides, {
    authPath: true,
    baseUrl: true,
    model: true,
    originator: true,
  });
});

test('agent runtime config rejects invalid override values', () => {
  assert.throws(
    () =>
      createAgentRuntimeConfig(DEFAULTS, {
        authPath: '   ',
      }),
    AgentRuntimeConfigValidationError,
  );
  assert.throws(
    () =>
      createAgentRuntimeConfig(DEFAULTS, {
        baseUrl: 'not-a-valid-url',
      }),
    AgentRuntimeConfigValidationError,
  );
  assert.throws(
    () =>
      createAgentRuntimeConfig(DEFAULTS, {
        originator: '   ',
      }),
    AgentRuntimeConfigValidationError,
  );
  assert.throws(
    () =>
      createAgentRuntimeConfig(DEFAULTS, {
        model: '   ',
      }),
    AgentRuntimeConfigValidationError,
  );
});

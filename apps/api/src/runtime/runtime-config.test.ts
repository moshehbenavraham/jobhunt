import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_BOOT_HOST,
  DEFAULT_BOOT_PORT,
  DEFAULT_DIAGNOSTICS_TIMEOUT_MS,
  DEFAULT_KEEP_ALIVE_TIMEOUT_MS,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  RuntimeConfigValidationError,
  createRuntimeConfig,
  readRuntimeConfigFromEnv,
} from './runtime-config.js';

test('createRuntimeConfig applies the API runtime defaults', () => {
  const config = createRuntimeConfig();

  assert.deepEqual(config, {
    diagnosticsTimeoutMs: DEFAULT_DIAGNOSTICS_TIMEOUT_MS,
    host: DEFAULT_BOOT_HOST,
    keepAliveTimeoutMs: DEFAULT_KEEP_ALIVE_TIMEOUT_MS,
    port: DEFAULT_BOOT_PORT,
    rateLimitMaxRequests: DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    rateLimitWindowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  });
});

test('readRuntimeConfigFromEnv parses explicit runtime overrides', () => {
  const config = readRuntimeConfigFromEnv({
    JOBHUNT_API_DIAGNOSTICS_TIMEOUT_MS: '3000',
    JOBHUNT_API_HOST: '0.0.0.0',
    JOBHUNT_API_KEEP_ALIVE_TIMEOUT_MS: '1500',
    JOBHUNT_API_PORT: '0',
    JOBHUNT_API_RATE_LIMIT_MAX_REQUESTS: '9',
    JOBHUNT_API_RATE_LIMIT_WINDOW_MS: '2500',
    JOBHUNT_API_REQUEST_TIMEOUT_MS: '4000',
  });

  assert.deepEqual(config, {
    diagnosticsTimeoutMs: 3000,
    host: '0.0.0.0',
    keepAliveTimeoutMs: 1500,
    port: 0,
    rateLimitMaxRequests: 9,
    rateLimitWindowMs: 2500,
    requestTimeoutMs: 4000,
  });
});

test('runtime config rejects invalid host and numeric values', () => {
  assert.throws(
    () => createRuntimeConfig({ host: '   ' }),
    RuntimeConfigValidationError,
  );
  assert.throws(
    () => readRuntimeConfigFromEnv({ JOBHUNT_API_PORT: 'abc' }),
    RuntimeConfigValidationError,
  );
  assert.throws(
    () =>
      readRuntimeConfigFromEnv({
        JOBHUNT_API_REQUEST_TIMEOUT_MS: '0',
      }),
    RuntimeConfigValidationError,
  );
});

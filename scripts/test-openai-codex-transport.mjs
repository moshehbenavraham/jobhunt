#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const authModule = await import(
  pathToFileURL(
    join(ROOT, 'scripts', 'lib', 'openai-account-auth', 'index.mjs'),
  ).href
);

const {
  CodexTransportError,
  loadStoredCredentials,
  parseCodexErrorResponse,
  requestCodexResponse,
  runCodexTextPrompt,
  saveStoredCredentials,
} = authModule;

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-codex-transport-'));
const authPath = join(sandbox, 'data', 'openai-account-auth.json');

try {
  const successServer = await startCodexServer();
  await saveStoredCredentials(
    {
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      expiresAt: Date.now() + 60_000,
      accountId: 'acct-primary',
    },
    { authPath },
  );

  const successResult = await runCodexTextPrompt({
    authPath,
    baseUrl: `${successServer.url}/backend-api`,
    instructions: 'You are terse.',
    model: 'gpt-5.4-mini',
    prompt: 'Reply with the single word PONG.',
  });
  assert.equal(successResult.text, 'PONG');
  assert.equal(successResult.responseId, 'resp_success');
  assert.equal(successResult.responseStatus, 'completed');
  assert.deepEqual(successResult.usage, {
    inputTokens: 31,
    outputTokens: 6,
    totalTokens: 37,
  });
  assert.equal(successServer.seenRequests.length, 1);
  assert.equal(successServer.seenRequests[0].headers.originator, 'pi');
  assert.equal(
    successServer.seenRequests[0].headers['chatgpt-account-id'],
    'acct-primary',
  );
  assert.equal(
    successServer.seenRequests[0].body.instructions,
    'You are terse.',
  );
  await successServer.close();

  const refreshServer = await startCodexServer({
    requireRefresh: true,
  });
  await saveStoredCredentials(
    {
      accessToken: 'expired-access-token',
      refreshToken: 'refresh-token-1',
      expiresAt: Date.now() - 10_000,
      accountId: 'acct-expired',
    },
    { authPath },
  );

  const refreshedResult = await requestCodexResponse({
    authPath,
    baseUrl: `${refreshServer.url}/backend-api`,
    prompt: 'Reply with the single word PONG.',
    refreshAuthConfig: {
      clientId: 'test-client-id',
      tokenUrl: `${refreshServer.url}/token`,
    },
  });
  assert.equal(refreshedResult.text, 'PONG');
  assert.equal(refreshServer.refreshCount, 1);
  assert.equal(refreshServer.seenRequests.length, 1);
  assert.equal(
    refreshServer.seenRequests[0].headers.authorization,
    `Bearer ${createJwt('acct-refresh')}`,
  );
  assert.equal(
    refreshServer.seenRequests[0].headers['chatgpt-account-id'],
    'acct-refresh',
  );
  const refreshedCredentials = await loadStoredCredentials({ authPath });
  assert.equal(refreshedCredentials.accountId, 'acct-refresh');
  assert.equal(refreshedCredentials.refreshToken, 'refresh-token-2');
  await refreshServer.close();

  const cliServer = await startCodexServer();
  await saveStoredCredentials(
    {
      accessToken: 'access-token-cli',
      refreshToken: 'refresh-token-cli',
      expiresAt: Date.now() + 60_000,
      accountId: 'acct-cli',
    },
    { authPath },
  );
  const cli = await runCli([
    join(ROOT, 'scripts', 'openai-codex-smoke.mjs'),
    '--json',
    '--auth-path',
    authPath,
    '--base-url',
    `${cliServer.url}/backend-api`,
  ]);
  assert.equal(cli.status, 0, cli.stderr);
  const cliPayload = JSON.parse(cli.stdout);
  assert.equal(cliPayload.ok, true);
  assert.equal(cliPayload.result.text, 'PONG');
  await cliServer.close();

  const missingCli = await runCli([
    join(ROOT, 'scripts', 'openai-codex-smoke.mjs'),
    '--json',
    '--auth-path',
    join(sandbox, 'data', 'missing-openai-account-auth.json'),
  ]);
  assert.equal(missingCli.status, 1);
  const missingCliPayload = JSON.parse(missingCli.stdout);
  assert.equal(missingCliPayload.ok, false);
  assert.equal(missingCliPayload.error.code, 'missing_auth');
  assert.equal(
    missingCliPayload.recovery.commands[0],
    'npm run auth:openai -- login',
  );

  const errorResponse = new Response(
    JSON.stringify({
      error: {
        code: 'usage_limit_reached',
        message: 'Limit reached.',
        plan_type: 'Plus',
        resets_at: Math.floor(Date.now() / 1000) + 600,
      },
    }),
    {
      status: 429,
      headers: { 'content-type': 'application/json' },
    },
  );
  const parsedError = await parseCodexErrorResponse(errorResponse);
  assert.ok(parsedError instanceof CodexTransportError);
  assert.equal(parsedError.status, 429);
  assert.equal(parsedError.kind, 'usage_limit');
  assert.equal(parsedError.retryable, false);
  assert.match(parsedError.message, /ChatGPT usage limit/i);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('openai-codex transport regression tests pass');

async function startCodexServer(options = {}) {
  const seenRequests = [];
  const sockets = new Set();
  let refreshCount = 0;

  const server = createServer(async (request, response) => {
    if (request.method === 'POST' && request.url === '/token') {
      refreshCount++;
      const body = await readRequestBody(request);
      const params = new URLSearchParams(body);
      assert.equal(params.get('grant_type'), 'refresh_token');
      assert.equal(params.get('client_id'), 'test-client-id');
      assert.equal(params.get('refresh_token'), 'refresh-token-1');
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({
          access_token: createJwt('acct-refresh'),
          refresh_token: 'refresh-token-2',
          expires_in: 3600,
        }),
      );
      return;
    }

    if (
      request.method === 'POST' &&
      request.url === '/backend-api/codex/responses'
    ) {
      const body = JSON.parse(await readRequestBody(request));
      seenRequests.push({
        headers: normalizeHeaders(request.headers),
        body,
      });
      assert.equal(request.headers.accept, 'text/event-stream');
      assert.equal(request.headers['content-type'], 'application/json');
      assert.equal(request.headers['openai-beta'], 'responses=experimental');
      assert.equal(body.stream, true);
      assert.equal(body.store, false);
      assert.ok(typeof body.instructions === 'string');
      assert.ok(Array.isArray(body.input));
      assert.ok(typeof body.prompt_cache_key === 'string');

      if (options.requireRefresh) {
        assert.equal(
          request.headers.authorization,
          `Bearer ${createJwt('acct-refresh')}`,
        );
      }

      response.statusCode = 200;
      response.setHeader('connection', 'close');
      response.write(
        [
          createEvent('response.created', {
            type: 'response.created',
            response: {
              id: 'resp_success',
              status: 'in_progress',
              model: 'gpt-5.4-mini-2026-03-17',
            },
          }),
          createEvent('response.output_text.delta', {
            type: 'response.output_text.delta',
            delta: 'P',
          }),
          createEvent('response.output_text.delta', {
            type: 'response.output_text.delta',
            delta: 'ONG',
          }),
          createEvent('response.completed', {
            type: 'response.completed',
            response: {
              id: 'resp_success',
              status: 'completed',
              model: 'gpt-5.4-mini-2026-03-17',
              usage: {
                input_tokens: 31,
                output_tokens: 6,
                total_tokens: 37,
              },
            },
          }),
        ].join(''),
      );
      response.end();
      return;
    }

    response.statusCode = 404;
    response.end('not found');
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  const address = server.address();
  return {
    seenRequests,
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
        for (const socket of sockets) {
          socket.destroy();
        }
      }),
    get refreshCount() {
      return refreshCount;
    },
  };
}

function createEvent(name, payload) {
  return `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function createJwt(accountId) {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    'https://api.openai.com/auth': {
      chatgpt_account_id: accountId,
    },
  });
  return `${header}.${payload}.signature`;
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return normalized;
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve({
        status: typeof code === 'number' ? code : -1,
        signal,
        stdout,
        stderr,
      });
    });
  });
}

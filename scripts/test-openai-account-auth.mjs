#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  getStoredCredentialsStatus,
  loadStoredCredentials,
  login,
  refreshCredentials,
  refreshStoredCredentials,
  saveStoredCredentials,
} = authModule;

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-openai-auth-'));
const authPath = join(sandbox, 'data', 'openai-account-auth.json');
const tokenServer = await startTokenServer();

try {
  const redirectPort = await getFreePort();
  let seenAuthorizationUrl;

  const loggedIn = await login({
    authConfig: {
      authorizeUrl: 'https://example.test/oauth/authorize',
      tokenUrl: tokenServer.url,
      clientId: 'test-client-id',
      redirectUri: `http://localhost:${redirectPort}/auth/callback`,
      callbackHost: '127.0.0.1',
      scope: 'openid profile email offline_access',
      originator: 'pi',
    },
    onAuth: async ({ url }) => {
      seenAuthorizationUrl = new URL(url);
      const callbackUrl = new URL(
        `http://127.0.0.1:${redirectPort}/auth/callback`,
      );
      callbackUrl.searchParams.set('code', 'auth-code-1');
      callbackUrl.searchParams.set(
        'state',
        seenAuthorizationUrl.searchParams.get('state'),
      );
      const response = await fetch(callbackUrl);
      assert.equal(response.status, 200);
    },
    onManualCodeInput: async (_prompt, { signal }) =>
      await waitForAbort(signal),
  });

  assert.equal(loggedIn.accountId, 'acct-auth-code');
  assert.equal(seenAuthorizationUrl.searchParams.get('originator'), 'pi');
  assert.equal(
    seenAuthorizationUrl.searchParams.get('codex_cli_simplified_flow'),
    'true',
  );

  await saveStoredCredentials(loggedIn, { authPath });

  const loaded = await loadStoredCredentials({ authPath });
  assert.deepEqual(loaded, loggedIn);

  const status = await getStoredCredentialsStatus({ authPath });
  assert.equal(status.authenticated, true);
  assert.equal(status.accountId, 'acct-auth-code');
  assert.equal(status.expired, false);

  const refreshed = await refreshStoredCredentials(
    (current) =>
      refreshCredentials(current.refreshToken, {
        tokenUrl: tokenServer.url,
        clientId: 'test-client-id',
      }),
    { authPath },
  );
  assert.equal(refreshed.accountId, 'acct-refresh');

  const refreshedStatus = await getStoredCredentialsStatus({ authPath });
  assert.equal(refreshedStatus.authenticated, true);
  assert.equal(refreshedStatus.accountId, 'acct-refresh');

  const cliStatus = runCli(['status', '--json', '--auth-path', authPath]);
  assert.equal(cliStatus.status, 0, cliStatus.stderr);
  assert.equal(JSON.parse(cliStatus.stdout).authenticated, true);

  const cliStatusText = runCli(['status', '--auth-path', authPath]);
  assert.equal(cliStatusText.status, 0, cliStatusText.stderr);
  assert.match(cliStatusText.stdout, /npm run codex:smoke -- --json/);
  assert.match(cliStatusText.stdout, /npm run agents:codex:smoke -- --json/);

  const cliLogout = runCli(['logout', '--json', '--auth-path', authPath]);
  assert.equal(cliLogout.status, 0, cliLogout.stderr);

  const postLogoutStatus = runCli([
    'status',
    '--json',
    '--auth-path',
    authPath,
  ]);
  assert.equal(postLogoutStatus.status, 0, postLogoutStatus.stderr);
  assert.equal(JSON.parse(postLogoutStatus.stdout).authenticated, false);

  const postLogoutStatusText = runCli(['status', '--auth-path', authPath]);
  assert.equal(postLogoutStatusText.status, 0, postLogoutStatusText.stderr);
  assert.match(postLogoutStatusText.stdout, /npm run auth:openai -- login/);

  await saveStoredCredentials(
    {
      accessToken: createJwt('acct-expired'),
      refreshToken: 'refresh-token-expired',
      expiresAt: Date.now() - 1_000,
      accountId: 'acct-expired',
    },
    { authPath },
  );

  const expiredStatusText = runCli(['status', '--auth-path', authPath]);
  assert.equal(expiredStatusText.status, 0, expiredStatusText.stderr);
  assert.match(expiredStatusText.stdout, /Credentials: expired/);
  assert.match(expiredStatusText.stdout, /npm run auth:openai -- refresh/);
  assert.match(expiredStatusText.stdout, /npm run auth:openai -- reauth/);

  const mismatchPort = await getFreePort();
  await assert.rejects(
    () =>
      login({
        authConfig: {
          tokenUrl: tokenServer.url,
          clientId: 'test-client-id',
          redirectUri: `http://localhost:${mismatchPort}/auth/callback`,
          callbackHost: '127.0.0.1',
        },
        onAuth: () => {},
        onManualCodeInput: async () =>
          'http://localhost/auth/callback?code=bad&state=wrong-state',
      }),
    /State mismatch/,
  );

  const missingCodePort = await getFreePort();
  await assert.rejects(
    () =>
      login({
        authConfig: {
          tokenUrl: tokenServer.url,
          clientId: 'test-client-id',
          redirectUri: `http://localhost:${missingCodePort}/auth/callback`,
          callbackHost: '127.0.0.1',
        },
        onAuth: () => {},
        onManualCodeInput: async () => '',
      }),
    /Missing authorization code/,
  );
} finally {
  await tokenServer.close();
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('openai-account-auth regression tests pass');

async function startTokenServer() {
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/token') {
      response.statusCode = 404;
      response.end('not found');
      return;
    }

    const body = await readRequestBody(request);
    const params = new URLSearchParams(body);
    const grantType = params.get('grant_type');

    if (grantType === 'authorization_code') {
      assert.equal(params.get('client_id'), 'test-client-id');
      assert.equal(params.get('code'), 'auth-code-1');
      assert.ok(params.get('code_verifier'));
      assert.ok(params.get('redirect_uri'));
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({
          access_token: createJwt('acct-auth-code'),
          refresh_token: 'refresh-token-1',
          expires_in: 3600,
        }),
      );
      return;
    }

    if (grantType === 'refresh_token') {
      assert.equal(params.get('client_id'), 'test-client-id');
      assert.equal(params.get('refresh_token'), 'refresh-token-1');
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({
          access_token: createJwt('acct-refresh'),
          refresh_token: 'refresh-token-2',
          expires_in: 7200,
        }),
      );
      return;
    }

    response.statusCode = 400;
    response.end(`unexpected grant type: ${grantType}`);
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/token`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
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

function runCli(args) {
  return spawnSync(
    'node',
    [join(ROOT, 'scripts', 'openai-account-auth.mjs'), ...args],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function waitForAbort(signal) {
  return new Promise((_resolve, reject) => {
    signal.addEventListener(
      'abort',
      () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      },
      { once: true },
    );
  });
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const port = address.port;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return port;
}

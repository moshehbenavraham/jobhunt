import { spawn } from 'node:child_process';
import http from 'node:http';
import {
  OPENAI_CODEX_AUTHORIZE_URL,
  OPENAI_CODEX_CLIENT_ID,
  OPENAI_CODEX_REDIRECT_URI,
  OPENAI_CODEX_SCOPE,
  OPENAI_CODEX_TOKEN_URL,
  createErrorHtml,
  createState,
  createSuccessHtml,
  extractChatGptAccountId,
  generatePkcePair,
  getDefaultCallbackHost,
  parseAuthorizationInput,
} from './common.mjs';

export function createAuthorizationFlow(options = {}) {
  const config = getAuthConfig(options);
  const { verifier, challenge } = generatePkcePair();
  const state = createState();
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('id_token_add_organizations', 'true');
  url.searchParams.set('codex_cli_simplified_flow', 'true');
  url.searchParams.set('originator', config.originator);

  return {
    config,
    verifier,
    state,
    url: url.toString(),
  };
}

export async function exchangeAuthorizationCode(code, verifier, options = {}) {
  const config = getAuthConfig(options);
  const fetchImpl = config.fetchImpl || fetch;
  const response = await fetchImpl(config.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      code_verifier: verifier,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Authorization code exchange failed (${response.status}): ${body || 'no response body'}`,
    );
  }

  const payload = await response.json();
  return normalizeTokenPayload(payload);
}

export async function refreshCredentials(refreshToken, options = {}) {
  const config = getAuthConfig(options);
  const fetchImpl = config.fetchImpl || fetch;
  const response = await fetchImpl(config.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Credential refresh failed (${response.status}): ${body || 'no response body'}`,
    );
  }

  const payload = await response.json();
  return normalizeTokenPayload(payload);
}

export async function login(options) {
  const flow = createAuthorizationFlow(options?.authConfig);
  const server = await startCallbackServer({
    expectedState: flow.state,
    callbackHost: flow.config.callbackHost,
    redirectUri: flow.config.redirectUri,
  });

  await Promise.resolve(
    options.onAuth?.({
      url: flow.url,
      instructions:
        'Complete the browser login. The CLI also accepts a pasted callback URL or raw code.',
    }),
  );
  options.onProgress?.('Waiting for OpenAI account authentication...');

  let manualAbortController;
  let manualPromise;
  let serverPromise;

  try {
    if (options.onManualCodeInput) {
      manualAbortController = new AbortController();
      manualPromise = options
        .onManualCodeInput(
          {
            message:
              'Paste the full callback URL or the authorization code if automatic redirect does not finish:',
          },
          { state: flow.state, signal: manualAbortController.signal },
        )
        .then((value) => ({ source: 'manual', value }))
        .catch((error) => {
          if (error?.name === 'AbortError') {
            return { source: 'manual-aborted' };
          }
          throw error;
        });
      serverPromise = server.waitForResult().then((value) => ({
        source: 'server',
        value,
      }));

      const first = await Promise.race([manualPromise, serverPromise]);
      if (first.source === 'manual') {
        server.cancel();
        return await finishLoginFromManualInput(
          first.value,
          flow.state,
          flow.verifier,
          flow.config,
        );
      }

      if (first.source === 'server') {
        if (first.value === null) {
          const manualResult = await manualPromise;
          if (manualResult.source === 'manual') {
            return await finishLoginFromManualInput(
              manualResult.value,
              flow.state,
              flow.verifier,
              flow.config,
            );
          }
        }
        manualAbortController.abort();
        return await finishLoginFromServerResult(first.value, flow, options);
      }

      const finalServerResult = await serverPromise;
      return await finishLoginFromServerResult(finalServerResult.value, flow, options);
    }

    const serverResult = await server.waitForResult();
    if (serverResult?.type === 'code') {
      return await finishLoginFromServerResult(serverResult, flow, options);
    }

    if (options.onPrompt) {
      const input = await options.onPrompt({
        message:
          'Paste the full callback URL or the authorization code to complete login:',
      });
      return await finishLoginFromManualInput(
        input,
        flow.state,
        flow.verifier,
        flow.config,
      );
    }

    if (serverResult?.type === 'error') {
      throw new Error(serverResult.message);
    }

    throw new Error('Missing authorization code');
  } finally {
    manualAbortController?.abort();
    server.close();
  }
}

export async function startCallbackServer(options = {}) {
  const { callbackHost, redirectUri, expectedState } = {
    callbackHost: getDefaultCallbackHost(),
    redirectUri: OPENAI_CODEX_REDIRECT_URI,
    ...options,
  };
  const redirect = new URL(redirectUri);
  const port = Number(redirect.port || (redirect.protocol === 'https:' ? 443 : 80));
  const callbackPath = redirect.pathname;

  let settleResult;
  const resultPromise = new Promise((resolve) => {
    settleResult = (value) => resolve(value);
  });

  const server = http.createServer((request, response) => {
    try {
      const requestUrl = new URL(
        request.url || '',
        `${redirect.protocol}//${redirect.host}`,
      );
      if (requestUrl.pathname !== callbackPath) {
        response.statusCode = 404;
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end(createErrorHtml('Callback route not found.'));
        return;
      }

      const returnedState = requestUrl.searchParams.get('state');
      const code = requestUrl.searchParams.get('code');

      if (returnedState !== expectedState) {
        response.statusCode = 400;
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end(createErrorHtml('State mismatch.'));
        settleResult({
          type: 'error',
          message: 'State mismatch',
        });
        return;
      }

      if (!code) {
        response.statusCode = 400;
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end(createErrorHtml('Missing authorization code.'));
        settleResult({
          type: 'error',
          message: 'Missing authorization code',
        });
        return;
      }

      response.statusCode = 200;
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end(
        createSuccessHtml(
          'OpenAI authentication completed. Return to the terminal.',
        ),
      );
      settleResult({
        type: 'code',
        code,
      });
    } catch (error) {
      response.statusCode = 500;
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end(createErrorHtml('Internal error while handling the callback.'));
      settleResult({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Internal error while handling the callback.',
      });
    }
  });

  const waitForResult = new Promise((resolve) => {
    server.listen(port, callbackHost, () => {
      resolve({
        close: () => {
          try {
            server.close();
          } catch {
            // Ignore close errors during shutdown.
          }
        },
        cancel: () => {
          settleResult(null);
        },
        waitForResult: () => resultPromise,
      });
    });

    server.on('error', () => {
      resolve({
        close: () => {
          try {
            server.close();
          } catch {
            // Ignore close errors during shutdown.
          }
        },
        cancel: () => {},
        waitForResult: async () => null,
      });
    });
  });

  return waitForResult;
}

export async function maybeOpenBrowser(url) {
  const commands = [];
  if (process.platform === 'darwin') {
    commands.push(['open', [url]]);
  } else if (process.platform === 'win32') {
    commands.push(['cmd', ['/c', 'start', '', url]]);
  } else {
    commands.push(['wslview', [url]]);
    commands.push(['xdg-open', [url]]);
  }

  for (const [command, args] of commands) {
    const launched = await trySpawn(command, args);
    if (launched) {
      return true;
    }
  }

  return false;
}

function getAuthConfig(options = {}) {
  return {
    authorizeUrl: OPENAI_CODEX_AUTHORIZE_URL,
    tokenUrl: OPENAI_CODEX_TOKEN_URL,
    clientId: OPENAI_CODEX_CLIENT_ID,
    redirectUri: OPENAI_CODEX_REDIRECT_URI,
    scope: OPENAI_CODEX_SCOPE,
    originator: 'pi',
    callbackHost: getDefaultCallbackHost(),
    fetchImpl: undefined,
    ...options,
  };
}

function normalizeTokenPayload(payload) {
  const accessToken = payload?.access_token;
  const refreshToken = payload?.refresh_token;
  const expiresIn = payload?.expires_in;
  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof expiresIn !== 'number'
  ) {
    throw new Error('Token response missing required fields');
  }

  const accountId = extractChatGptAccountId(accessToken);
  if (!accountId) {
    throw new Error('Failed to extract chatgpt_account_id from access token');
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    accountId,
  };
}

async function finishLoginFromServerResult(serverResult, flow, options) {
  if (!serverResult) {
    if (options.onPrompt) {
      const input = await options.onPrompt({
        message:
          'Automatic callback did not complete. Paste the full callback URL or the authorization code:',
      });
      return finishLoginFromManualInput(
        input,
        flow.state,
        flow.verifier,
        flow.config,
      );
    }
    throw new Error('Missing authorization code');
  }

  if (serverResult.type === 'error') {
    throw new Error(serverResult.message);
  }

  return exchangeAuthorizationCode(serverResult.code, flow.verifier, flow.config);
}

async function finishLoginFromManualInput(
  input,
  expectedState,
  verifier,
  authConfig,
) {
  const parsed = parseAuthorizationInput(input);
  if (parsed.state && parsed.state !== expectedState) {
    throw new Error('State mismatch');
  }
  if (!parsed.code) {
    throw new Error('Missing authorization code');
  }
  return exchangeAuthorizationCode(parsed.code, verifier, authConfig);
}

function trySpawn(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.once('error', () => resolve(false));
    child.once('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}

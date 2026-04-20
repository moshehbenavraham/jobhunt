#!/usr/bin/env node

import { createInterface } from 'node:readline/promises';
import { stdin, stdout, stderr, exit } from 'node:process';
import {
  clearStoredCredentials,
  getDefaultAuthPath,
  getStoredCredentialsStatus,
  loadStoredCredentials,
  login,
  maybeOpenBrowser,
  refreshCredentials,
  refreshStoredCredentials,
  saveStoredCredentials,
} from './lib/openai-account-auth/index.mjs';

async function main() {
  const { command, json, noBrowser, authPath } = parseArgs(process.argv.slice(2));

  if (!command || command === 'help' || command === '--help') {
    printUsage();
    return;
  }

  if (command === 'status') {
    const status = await getStoredCredentialsStatus({ authPath });
    emitResult(json, status, renderStatus(status));
    return;
  }

  if (command === 'login' || command === 'reauth') {
    const completionPrefix =
      command === 'reauth' ? 'Re-authentication complete.' : 'Login complete.';
    const credentials = await login({
      onAuth: async ({ url, instructions }) => {
        if (!json) {
          stdout.write(`OpenAI account login URL:\n${url}\n\n`);
          if (instructions) {
            stdout.write(`${instructions}\n`);
          }
        }

        if (!noBrowser) {
          const opened = await maybeOpenBrowser(url);
          if (!json && !opened) {
            stdout.write(
              'Browser auto-open failed. Open the URL above manually.\n\n',
            );
          }
        }
      },
      onManualCodeInput: async (prompt, context) =>
        ask(prompt.message, context.signal),
      onPrompt: async (prompt) => ask(prompt.message),
    });

    await saveStoredCredentials(credentials, { authPath });
    const status = await getStoredCredentialsStatus({ authPath });
    emitResult(json, status, renderStatus(status, completionPrefix));
    return;
  }

  if (command === 'refresh') {
    const refreshed = await refreshStoredCredentials(
      (current) => refreshCredentials(current.refreshToken),
      { authPath },
    );
    const status = await getStoredCredentialsStatus({ authPath });
    emitResult(
      json,
      {
        ...status,
        refreshedExpiresAt: refreshed.expiresAt,
      },
      renderStatus(status, 'Refresh complete.'),
    );
    return;
  }

  if (command === 'logout') {
    await clearStoredCredentials({ authPath });
    const status = await getStoredCredentialsStatus({ authPath });
    emitResult(
      json,
      status,
      renderStatus(status, 'Stored OpenAI account credentials cleared.'),
    );
    return;
  }

  if (command === 'print-access-token') {
    const credentials = await loadStoredCredentials({ authPath });
    if (!credentials) {
      throw new Error(
        `No stored OpenAI account credentials found at ${authPath || getDefaultAuthPath()}.`,
      );
    }
    stdout.write(`${credentials.accessToken}\n`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function parseArgs(args) {
  const options = {
    command: args[0],
    json: false,
    noBrowser: false,
    authPath: undefined,
  };

  for (let index = 1; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--no-browser') {
      options.noBrowser = true;
      continue;
    }
    if (arg === '--auth-path') {
      if (typeof args[index + 1] !== 'string') {
        throw new Error('Missing value for --auth-path');
      }
      options.authPath = args[index + 1];
      index++;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function ask(message, signal) {
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    return await rl.question(`${message}\n> `, signal ? { signal } : undefined);
  } finally {
    rl.close();
  }
}

function emitResult(json, value, text) {
  if (json) {
    stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  stdout.write(`${text}\n`);
}

function renderStatus(status, prefix) {
  if (!status.authenticated) {
    const message =
      prefix ||
      (status.reason === 'invalid'
        ? 'Stored OpenAI account credentials are invalid.'
        : 'No stored OpenAI account credentials found.');
    const recoveryLine =
      status.reason === 'invalid'
        ? 'Next: run `npm run auth:openai -- logout`, then `npm run auth:openai -- login`.'
        : 'Next: run `npm run auth:openai -- login`.';
    return [message, `Auth path: ${status.authPath}`, recoveryLine].join('\n');
  }

  const lines = [
    prefix || 'Stored OpenAI account credentials found.',
    `Auth path: ${status.authPath}`,
    `Account ID: ${status.accountId}`,
    `Expires at: ${new Date(status.expiresAt).toISOString()}`,
    status.expired ? 'Credentials: expired' : 'Credentials: valid',
  ];

  if (status.expired) {
    lines.push(
      'Next: run `npm run auth:openai -- refresh` or `npm run auth:openai -- reauth`.',
    );
  } else {
    lines.push(
      'Next: run `npm run codex:smoke -- --json` or `npm run agents:codex:smoke -- --json`.',
    );
  }

  return lines.join('\n');
}

function printUsage() {
  stdout.write(`Usage: node scripts/openai-account-auth.mjs <command> [options]

Commands:
  login                 Run the OpenAI account login flow and store credentials
  reauth                Replace stored credentials with a fresh login
  status                Show whether stored credentials exist and whether they are expired
  refresh               Refresh stored credentials in place
  logout                Delete stored credentials
  print-access-token    Print the stored access token for debugging

Options:
  --auth-path <path>    Override the auth file path
  --json                Emit machine-readable JSON
  --no-browser          Do not attempt to open the browser automatically
`);
}

main().catch((error) => {
  stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  exit(1);
});

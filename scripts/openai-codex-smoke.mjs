#!/usr/bin/env node

import { stderr, stdout, exit } from 'node:process';
import {
  CodexTransportError,
  OPENAI_CODEX_DEFAULT_INSTRUCTIONS,
  OPENAI_CODEX_DEFAULT_MODEL,
  getDefaultAuthPath,
  runCodexTextPrompt,
} from './lib/openai-account-auth/index.mjs';

const options = parseArgs(process.argv.slice(2));

run().catch((error) => {
  const recovery = buildRecovery(error, options.authPath);
  if (options.json) {
    const payload =
      error instanceof CodexTransportError
        ? error.toJSON()
        : {
            name: error?.name || 'Error',
            message: error instanceof Error ? error.message : String(error),
          };
    stdout.write(
      `${JSON.stringify({ ok: false, error: payload, recovery }, null, 2)}\n`,
    );
  } else {
    stderr.write(renderFailure(error, recovery));
  }
  exit(1);
});

async function run() {
  const result = await runCodexTextPrompt({
    authPath: options.authPath,
    baseUrl: options.baseUrl,
    instructions: options.instructions,
    model: options.model,
    prompt: options.prompt,
  });

  if (options.json) {
    stdout.write(`${JSON.stringify({ ok: true, result }, null, 2)}\n`);
    return;
  }

  const lines = [
    'Codex smoke test complete.',
    `Auth path: ${options.authPath || getDefaultAuthPath()}`,
    `Model: ${result.model}`,
    `Response ID: ${result.responseId || 'unknown'}`,
    `Text: ${result.text}`,
  ];

  if (result.usage) {
    lines.push(
      `Usage: input ${result.usage.inputTokens ?? 'unknown'}, output ${result.usage.outputTokens ?? 'unknown'}, total ${result.usage.totalTokens ?? 'unknown'}`,
    );
  }

  stdout.write(`${lines.join('\n')}\n`);
}

function parseArgs(args) {
  const parsed = {
    authPath: undefined,
    baseUrl: undefined,
    instructions: OPENAI_CODEX_DEFAULT_INSTRUCTIONS,
    json: false,
    model: OPENAI_CODEX_DEFAULT_MODEL,
    prompt: 'Reply with the single word PONG.',
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--auth-path') {
      parsed.authPath = requireValue(arg, args[index + 1]);
      index++;
      continue;
    }
    if (arg === '--base-url') {
      parsed.baseUrl = requireValue(arg, args[index + 1]);
      index++;
      continue;
    }
    if (arg === '--instructions') {
      parsed.instructions = requireValue(arg, args[index + 1]);
      index++;
      continue;
    }
    if (arg === '--json') {
      parsed.json = true;
      continue;
    }
    if (arg === '--model') {
      parsed.model = requireValue(arg, args[index + 1]);
      index++;
      continue;
    }
    if (arg === '--prompt') {
      parsed.prompt = requireValue(arg, args[index + 1]);
      index++;
      continue;
    }
    if (arg === '--help' || arg === 'help') {
      printUsage();
      exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function requireValue(flag, value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function printUsage() {
  stdout.write(`Usage: node scripts/openai-codex-smoke.mjs [options]

Options:
  --auth-path <path>      Override the stored auth file path
  --base-url <url>        Override the Codex backend base URL
  --instructions <text>   Override the request instructions
  --json                  Emit machine-readable JSON
  --model <id>            Override the model ID
  --prompt <text>         Override the smoke-test prompt
`);
}

function renderFailure(error, recovery) {
  const lines = [error instanceof Error ? error.message : String(error)];
  if (recovery.summary) {
    lines.push(recovery.summary);
  }
  if (recovery.commands.length > 0) {
    lines.push(...recovery.commands.map((command) => `Next: ${command}`));
  }
  return `${lines.join('\n')}\n`;
}

function buildRecovery(error, authPath) {
  const resolvedAuthPath = authPath || getDefaultAuthPath();
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof CodexTransportError && error.code === 'missing_auth') {
    return {
      summary: `No stored OpenAI account auth was found at ${resolvedAuthPath}.`,
      commands: [
        'npm run auth:openai -- login',
        'npm run codex:smoke -- --json',
      ],
    };
  }

  if (message.includes('Stored auth file is invalid')) {
    return {
      summary: `The stored OpenAI account auth file at ${resolvedAuthPath} is invalid.`,
      commands: [
        'npm run auth:openai -- logout',
        'npm run auth:openai -- login',
      ],
    };
  }

  return {
    summary: undefined,
    commands: [],
  };
}

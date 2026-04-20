#!/usr/bin/env node

import { exit, stderr, stdout } from 'node:process';
import { Agent, run } from '@openai/agents';
import {
  OPENAI_CODEX_DEFAULT_MODEL,
  configureDefaultOpenAICodexModelProvider,
  getDefaultAuthPath,
} from './lib/openai-account-auth/index.mjs';

const options = parseArgs(process.argv.slice(2));

main().catch((error) => {
  const recovery = buildRecovery(error, options.authPath);
  if (options.json) {
    stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error: {
            name: error?.name || 'Error',
            message: error instanceof Error ? error.message : String(error),
          },
          recovery,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    stderr.write(renderFailure(error, recovery));
  }
  exit(1);
});

async function main() {
  configureDefaultOpenAICodexModelProvider({
    authPath: options.authPath,
    baseUrl: options.baseUrl,
    originator: options.originator,
  });

  const agent = new Agent({
    name: 'OpenAI Codex smoke test',
    instructions: options.instructions,
    model: options.model,
  });

  if (options.stream) {
    const result = await run(agent, options.prompt, { stream: true });
    let streamedText = '';
    for await (const chunk of result.toTextStream()) {
      streamedText += chunk;
    }
    await result.completed;
    emitResult({
      authPath: options.authPath || getDefaultAuthPath(),
      mode: 'stream',
      model: options.model,
      prompt: options.prompt,
      instructions: options.instructions,
      text: streamedText,
      finalOutput: result.finalOutput,
      lastResponseId: result.lastResponseId || null,
    });
    return;
  }

  const result = await run(agent, options.prompt);
  emitResult({
    authPath: options.authPath || getDefaultAuthPath(),
    mode: 'run',
    model: options.model,
    prompt: options.prompt,
    instructions: options.instructions,
    text: String(result.finalOutput ?? ''),
    finalOutput: result.finalOutput,
    lastResponseId: result.lastResponseId || null,
  });
}

function emitResult(result) {
  if (options.json) {
    stdout.write(`${JSON.stringify({ ok: true, result }, null, 2)}\n`);
    return;
  }

  stdout.write(
    [
      'OpenAI Agents Codex smoke test complete.',
      `Auth path: ${result.authPath}`,
      `Mode: ${result.mode}`,
      `Model: ${result.model}`,
      `Response ID: ${result.lastResponseId || 'unknown'}`,
      `Text: ${result.text}`,
    ].join('\n') + '\n',
  );
}

function parseArgs(args) {
  const parsed = {
    authPath: undefined,
    baseUrl: undefined,
    instructions: 'You are terse. Reply with the single word PONG.',
    json: false,
    model: OPENAI_CODEX_DEFAULT_MODEL,
    originator: undefined,
    prompt: 'Reply with the single word PONG.',
    stream: false,
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
    if (arg === '--originator') {
      parsed.originator = requireValue(arg, args[index + 1]);
      index++;
      continue;
    }
    if (arg === '--prompt') {
      parsed.prompt = requireValue(arg, args[index + 1]);
      index++;
      continue;
    }
    if (arg === '--stream') {
      parsed.stream = true;
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
  stdout.write(`Usage: node scripts/openai-agents-codex-smoke.mjs [options]

Options:
  --auth-path <path>      Override the stored auth file path
  --base-url <url>        Override the Codex backend base URL
  --instructions <text>   Override the agent instructions
  --json                  Emit machine-readable JSON
  --model <id>            Override the model ID
  --originator <text>     Override the Codex originator header
  --prompt <text>         Override the user prompt
  --stream                Validate the streamed agent run path
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

  if (message.includes('No stored OpenAI account credentials found at')) {
    return {
      summary: `No stored OpenAI account auth was found at ${resolvedAuthPath}.`,
      commands: [
        'npm run auth:openai -- login',
        'npm run agents:codex:smoke -- --json',
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

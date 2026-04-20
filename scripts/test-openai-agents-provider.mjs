#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Agent, run } from '@openai/agents';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const authModule = await import(
  pathToFileURL(join(ROOT, 'scripts', 'lib', 'openai-account-auth', 'index.mjs'))
    .href,
);

const {
  configureDefaultOpenAICodexModelProvider,
  normalizeOpenAICodexModelName,
  saveStoredCredentials,
} = authModule;

const sandbox = mkdtempSync(join(tmpdir(), 'jobhunt-agents-codex-'));
const authPath = join(sandbox, 'data', 'openai-account-auth.json');

try {
  const server = await startCodexServer();
  await saveStoredCredentials(
    {
      accessToken: 'access-token-agents',
      refreshToken: 'refresh-token-agents',
      expiresAt: Date.now() + 60_000,
      accountId: 'acct-agents',
    },
    { authPath },
  );

  assert.equal(
    normalizeOpenAICodexModelName('openai-codex/gpt-5.4-mini'),
    'gpt-5.4-mini',
  );
  assert.equal(
    normalizeOpenAICodexModelName('openai-codex:gpt-5.4-mini'),
    'gpt-5.4-mini',
  );
  assert.equal(normalizeOpenAICodexModelName(undefined), 'gpt-5.4-mini');

  configureDefaultOpenAICodexModelProvider({
    authPath,
    baseUrl: `${server.url}/backend-api`,
  });

  const agent = new Agent({
    name: 'Codex account adapter smoke',
    instructions: 'You are terse. Reply with the single word PONG.',
    model: 'openai-codex/gpt-5.4-mini',
  });

  const runResult = await run(agent, 'Reply with the single word PONG.');
  assert.equal(runResult.finalOutput, 'PONG');
  assert.equal(runResult.lastResponseId, 'resp_agent_1');

  const streamResult = await run(agent, 'Reply with the single word PONG.', {
    stream: true,
  });
  let streamedText = '';
  for await (const chunk of streamResult.toTextStream()) {
    streamedText += chunk;
  }
  await streamResult.completed;
  assert.equal(streamedText, 'PONG');
  assert.equal(streamResult.finalOutput, 'PONG');
  assert.equal(streamResult.lastResponseId, 'resp_agent_2');

  const cli = await runCli([
    join(ROOT, 'scripts', 'openai-agents-codex-smoke.mjs'),
    '--json',
    '--auth-path',
    authPath,
    '--base-url',
    `${server.url}/backend-api`,
  ]);
  assert.equal(cli.status, 0, cli.stderr);
  const cliPayload = JSON.parse(cli.stdout);
  assert.equal(cliPayload.ok, true);
  assert.equal(cliPayload.result.text, 'PONG');

  const missingCli = await runCli([
    join(ROOT, 'scripts', 'openai-agents-codex-smoke.mjs'),
    '--json',
    '--auth-path',
    join(sandbox, 'data', 'missing-openai-account-auth.json'),
  ]);
  assert.equal(missingCli.status, 1);
  const missingCliPayload = JSON.parse(missingCli.stdout);
  assert.equal(missingCliPayload.ok, false);
  assert.equal(
    missingCliPayload.recovery.commands[0],
    'npm run auth:openai -- login',
  );

  assert.equal(server.seenRequests.length, 3);
  assert.equal(
    server.seenRequests[0].headers['chatgpt-account-id'],
    'acct-agents',
  );
  assert.equal(server.seenRequests[0].body.model, 'gpt-5.4-mini');
  assert.equal(
    server.seenRequests[0].body.instructions,
    'You are terse. Reply with the single word PONG.',
  );
  assert.equal(server.seenRequests[0].body.stream, true);
  assert.ok(Array.isArray(server.seenRequests[0].body.input));
  assert.equal(server.seenRequests[1].body.stream, true);
  assert.equal(server.seenRequests[2].body.model, 'gpt-5.4-mini');

  await server.close();
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log('openai-agents Codex provider regression tests pass');

async function startCodexServer() {
  const seenRequests = [];
  const sockets = new Set();
  let requestCount = 0;

  const server = createServer(async (request, response) => {
    if (
      request.method === 'POST' &&
      request.url === '/backend-api/codex/responses'
    ) {
      requestCount++;
      const body = JSON.parse(await readRequestBody(request));
      seenRequests.push({
        headers: normalizeHeaders(request.headers),
        body,
      });

      response.statusCode = 200;
      response.setHeader('connection', 'close');
      response.setHeader('content-type', 'text/event-stream');
      response.write(
        [
          createEvent('response.created', {
            type: 'response.created',
            response: {
              id: `resp_agent_${requestCount}`,
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
              id: `resp_agent_${requestCount}`,
              status: 'completed',
              model: 'gpt-5.4-mini-2026-03-17',
              usage: {
                input_tokens: 27,
                output_tokens: 6,
                total_tokens: 33,
              },
              output: [
                {
                  id: `msg_agent_${requestCount}`,
                  type: 'message',
                  role: 'assistant',
                  status: 'completed',
                  content: [
                    {
                      type: 'output_text',
                      text: 'PONG',
                    },
                  ],
                },
              ],
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
    url: `http://127.0.0.1:${address.port}`,
    seenRequests,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (typeof server.closeIdleConnections === 'function') {
            server.closeIdleConnections();
          }
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
          for (const socket of sockets) {
            socket.destroy();
          }
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

function createEvent(name, payload) {
  return `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : value,
    ]),
  );
}

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn('node', args, {
      cwd: ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutBuffer = '';
    let stderrBuffer = '';

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString('utf8');
    });
    child.on('close', (code, signal) => {
      resolve({
        status: code,
        signal,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
      });
    });
  });
}

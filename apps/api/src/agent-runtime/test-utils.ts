import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  resolveRepoRelativePath,
  type RepoPathOptions,
} from '../config/repo-paths.js';

export type FakeCodexRequest = {
  body: Record<string, unknown>;
  headers: Record<string, string>;
};

export type FakeCodexBackend = {
  close: () => Promise<void>;
  seenRequests: FakeCodexRequest[];
  url: string;
};

export type AgentRuntimeAuthFixture = {
  authPath: string;
  cleanup: () => Promise<void>;
  readText: () => Promise<string | null>;
  sandboxRoot: string;
  setExpired: () => Promise<void>;
  setInvalid: () => Promise<void>;
  setMissing: () => Promise<void>;
  setReady: (options?: {
    accountId?: string;
    expiresAt?: number;
  }) => Promise<void>;
};

function createEvent(name: string, payload: Record<string, unknown>): string {
  return `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
}

async function readRequestBody(
  request: AsyncIterable<Buffer>,
): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : (value ?? ''),
    ]),
  );
}

function createStoredAuthRecord(
  options: {
    accountId?: string;
    expiresAt?: number;
  } = {},
): string {
  const expiresAt = options.expiresAt ?? Date.now() + 60_000;

  return `${JSON.stringify(
    {
      credentials: {
        accessToken: 'access-token-agent-runtime',
        accountId: options.accountId ?? 'acct-agent-runtime',
        expiresAt,
        refreshToken: 'refresh-token-agent-runtime',
      },
      provider: 'openai-codex',
      updatedAt: new Date(Date.now()).toISOString(),
      version: 1,
    },
    null,
    2,
  )}\n`;
}

export async function createAgentRuntimeAuthFixture(): Promise<AgentRuntimeAuthFixture> {
  const sandboxRoot = await mkdtemp(
    join(tmpdir(), 'jobhunt-agent-runtime-auth-'),
  );
  const authPath = join(sandboxRoot, 'data', 'openai-account-auth.json');

  async function writeAuthFile(contents: string): Promise<void> {
    await mkdir(dirname(authPath), { recursive: true });
    await writeFile(authPath, contents, 'utf8');
  }

  return {
    authPath,
    async cleanup(): Promise<void> {
      await rm(sandboxRoot, { force: true, recursive: true });
    },
    async readText(): Promise<string | null> {
      try {
        return await readFile(authPath, 'utf8');
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          return null;
        }

        throw error;
      }
    },
    sandboxRoot,
    async setExpired(): Promise<void> {
      await writeAuthFile(
        createStoredAuthRecord({ expiresAt: Date.now() - 60_000 }),
      );
    },
    async setInvalid(): Promise<void> {
      await writeAuthFile('{\n  "invalid": true\n}\n');
    },
    async setMissing(): Promise<void> {
      await rm(authPath, { force: true });
    },
    async setReady(options = {}): Promise<void> {
      await writeAuthFile(createStoredAuthRecord(options));
    },
  };
}

export async function startFakeCodexBackend(): Promise<FakeCodexBackend> {
  const seenRequests: FakeCodexRequest[] = [];
  const sockets = new Set<import('node:net').Socket>();
  let requestCount = 0;

  const server = createServer(async (request, response) => {
    if (
      request.method === 'POST' &&
      request.url === '/backend-api/codex/responses'
    ) {
      requestCount += 1;
      seenRequests.push({
        body: JSON.parse(await readRequestBody(request)),
        headers: normalizeHeaders(request.headers),
      });

      response.statusCode = 200;
      response.setHeader('connection', 'close');
      response.setHeader('content-type', 'text/event-stream');
      response.write(
        [
          createEvent('response.created', {
            response: {
              id: `resp_agent_runtime_${requestCount}`,
              model: 'gpt-5.4-mini-2026-03-17',
              status: 'in_progress',
            },
            type: 'response.created',
          }),
          createEvent('response.output_text.delta', {
            delta: 'P',
            type: 'response.output_text.delta',
          }),
          createEvent('response.output_text.delta', {
            delta: 'ONG',
            type: 'response.output_text.delta',
          }),
          createEvent('response.completed', {
            response: {
              id: `resp_agent_runtime_${requestCount}`,
              model: 'gpt-5.4-mini-2026-03-17',
              output: [
                {
                  content: [
                    {
                      text: 'PONG',
                      type: 'output_text',
                    },
                  ],
                  id: `msg_agent_runtime_${requestCount}`,
                  role: 'assistant',
                  status: 'completed',
                  type: 'message',
                },
              ],
              status: 'completed',
              usage: {
                input_tokens: 24,
                output_tokens: 6,
                total_tokens: 30,
              },
            },
            type: 'response.completed',
          }),
        ].join(''),
      );
      response.end();
      return;
    }

    response.statusCode = 404;
    response.end('not found');
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  await new Promise<void>((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      resolvePromise();
    });
  });

  const address = server.address();
  if (typeof address !== 'object' || address === null) {
    throw new Error('Failed to start the fake Codex backend.');
  }

  return {
    async close(): Promise<void> {
      await new Promise<void>((resolvePromise, reject) => {
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

          resolvePromise();
        });
      });
    },
    seenRequests,
    url: `http://127.0.0.1:${address.port}`,
  };
}

export function getRepoOpenAIAccountModuleImportPath(
  options: RepoPathOptions = {},
): string {
  return pathToFileURL(
    resolveRepoRelativePath(
      'scripts/lib/openai-account-auth/index.mjs',
      options,
    ),
  ).href;
}

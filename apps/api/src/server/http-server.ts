import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { URL } from 'node:url';
import type { RepoPathOptions } from '../config/repo-paths.js';
import {
  DEFAULT_BOOT_HOST,
  DEFAULT_BOOT_PORT,
  STARTUP_SERVICE_NAME,
  STARTUP_SESSION_ID,
  getStartupDiagnostics,
} from '../index.js';
import {
  createHealthPayload,
  createStartupErrorPayload,
  createStartupPayload,
  getHealthHttpStatus,
  getStartupHttpStatus,
} from './startup-status.js';

const DEFAULT_DIAGNOSTICS_TIMEOUT_MS = 5000;
const DEFAULT_KEEP_ALIVE_TIMEOUT_MS = 2000;

export type StartupHttpServerOptions = RepoPathOptions & {
  diagnosticsTimeoutMs?: number;
  host?: string;
  port?: number;
  requestTimeoutMs?: number;
};

export type StartupHttpServerHandle = {
  close: () => Promise<void>;
  host: string;
  port: number;
  server: Server;
  url: string;
};

type RequestErrorPayload = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: 'error' | 'method-not-allowed' | 'not-found';
};

function createRequestErrorPayload(
  status: RequestErrorPayload['status'],
  code: string,
  message: string,
): RequestErrorPayload {
  return {
    error: {
      code,
      message,
    },
    ok: false,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status,
  };
}

function isHeadRequest(request: IncomingMessage): boolean {
  return request.method === 'HEAD';
}

function writeJson(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {},
): void {
  const body = JSON.stringify(payload, null, 2);

  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body).toString(),
    'content-type': 'application/json; charset=utf-8',
    ...headers,
  });

  if (isHeadRequest(request)) {
    response.end();
    return;
  }

  response.end(body);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(`Startup diagnostics timed out after ${timeoutMs}ms.`),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function resolveDiagnostics(
  options: StartupHttpServerOptions,
) {
  const repoPathOptions: RepoPathOptions = {};

  if (options.repoRoot) {
    repoPathOptions.repoRoot = options.repoRoot;
  }

  if (options.startDirectory) {
    repoPathOptions.startDirectory = options.startDirectory;
  }

  return withTimeout(
    getStartupDiagnostics(repoPathOptions),
    options.diagnosticsTimeoutMs ?? DEFAULT_DIAGNOSTICS_TIMEOUT_MS,
  );
}

async function handleHealthRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: StartupHttpServerOptions,
): Promise<void> {
  try {
    const diagnostics = await resolveDiagnostics(options);
    const payload = createHealthPayload(diagnostics);

    writeJson(
      request,
      response,
      getHealthHttpStatus(payload.status),
      payload,
    );
  } catch (error) {
    writeJson(
      request,
      response,
      500,
      createStartupErrorPayload(error, {
        service: STARTUP_SERVICE_NAME,
        sessionId: STARTUP_SESSION_ID,
      }),
    );
  }
}

async function handleStartupRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: StartupHttpServerOptions,
): Promise<void> {
  try {
    const diagnostics = await resolveDiagnostics(options);
    const payload = createStartupPayload(diagnostics);

    writeJson(
      request,
      response,
      getStartupHttpStatus(payload.status),
      payload,
    );
  } catch (error) {
    writeJson(
      request,
      response,
      500,
      createStartupErrorPayload(error, {
        service: STARTUP_SERVICE_NAME,
        sessionId: STARTUP_SESSION_ID,
      }),
    );
  }
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: StartupHttpServerOptions,
): Promise<void> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');

  if (method !== 'GET' && method !== 'HEAD') {
    writeJson(
      request,
      response,
      405,
      createRequestErrorPayload(
        'method-not-allowed',
        'method-not-allowed',
        `Unsupported method ${method}. Use GET or HEAD.`,
      ),
      {
        allow: 'GET, HEAD',
      },
    );
    return;
  }

  if (url.pathname === '/health') {
    await handleHealthRequest(request, response, options);
    return;
  }

  if (url.pathname === '/startup') {
    await handleStartupRequest(request, response, options);
    return;
  }

  writeJson(
    request,
    response,
    404,
    createRequestErrorPayload(
      'not-found',
      'route-not-found',
      `Unknown route ${url.pathname}.`,
    ),
  );
}

export function createStartupHttpServer(
  options: StartupHttpServerOptions = {},
): Server {
  const server = createServer((request, response) => {
    void handleRequest(request, response, options);
  });

  server.headersTimeout = options.requestTimeoutMs ?? DEFAULT_DIAGNOSTICS_TIMEOUT_MS;
  server.requestTimeout = options.requestTimeoutMs ?? DEFAULT_DIAGNOSTICS_TIMEOUT_MS;
  server.keepAliveTimeout = DEFAULT_KEEP_ALIVE_TIMEOUT_MS;

  return server;
}

export async function startStartupHttpServer(
  options: StartupHttpServerOptions = {},
): Promise<StartupHttpServerHandle> {
  const server = createStartupHttpServer(options);
  const host = options.host ?? DEFAULT_BOOT_HOST;
  const port = options.port ?? DEFAULT_BOOT_PORT;

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });

  const address = server.address();
  const resolvedPort =
    typeof address === 'object' && address !== null
      ? (address as AddressInfo).port
      : port;

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    host,
    port: resolvedPort,
    server,
    url: `http://${host}:${resolvedPort}`,
  };
}

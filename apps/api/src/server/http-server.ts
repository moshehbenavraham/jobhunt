import { randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import type { RepoPathOptions } from '../config/repo-paths.js';
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../index.js';
import {
  createRuntimeConfig,
  type ApiRuntimeConfig,
  type ApiRuntimeConfigOverrides,
} from '../runtime/runtime-config.js';
import {
  createApiServiceContainer,
  type ApiServiceContainer,
} from '../runtime/service-container.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  createMethodNotAllowedResponse,
  createNotFoundResponse,
  createRateLimitedResponse,
  parseApiRequestInput,
  type ApiRouteDefinition,
  type ApiRouteMethod,
  type JsonRouteResponse,
} from './route-contract.js';
import { createApiRouteRegistry } from './routes/index.js';
import { createStartupErrorPayload } from './startup-status.js';

export type StartupHttpServerOptions = RepoPathOptions &
  ApiRuntimeConfigOverrides & {
    routes?: ApiRouteDefinition[];
    services?: ApiServiceContainer;
  };

export type StartupHttpServerHandle = {
  close: () => Promise<void>;
  host: string;
  port: number;
  server: Server;
  url: string;
};

type RateLimitState = {
  count: number;
  windowStartedAt: number;
};

const BOOT_SURFACE_PATHS = new Set(['/health', '/startup']);

function getClientKey(request: IncomingMessage): string {
  return request.socket.remoteAddress ?? 'unknown';
}

function shouldPersistRequestEvent(pathname: string): boolean {
  return !BOOT_SURFACE_PATHS.has(pathname);
}

function createRateLimiter(config: ApiRuntimeConfig) {
  const rateLimits = new Map<string, RateLimitState>();

  return {
    check(request: IncomingMessage) {
      const clientKey = getClientKey(request);
      const now = Date.now();
      const state = rateLimits.get(clientKey);

      if (!state || now - state.windowStartedAt >= config.rateLimitWindowMs) {
        rateLimits.set(clientKey, {
          count: 1,
          windowStartedAt: now,
        });

        return {
          allowed: true,
          limit: config.rateLimitMaxRequests,
          remaining: config.rateLimitMaxRequests - 1,
          retryAfterSeconds: 0,
        };
      }

      const nextCount = state.count + 1;

      state.count = nextCount;

      if (nextCount <= config.rateLimitMaxRequests) {
        return {
          allowed: true,
          limit: config.rateLimitMaxRequests,
          remaining: config.rateLimitMaxRequests - nextCount,
          retryAfterSeconds: 0,
        };
      }

      const windowResetAt = state.windowStartedAt + config.rateLimitWindowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowResetAt - now) / 1000),
      );

      return {
        allowed: false,
        limit: config.rateLimitMaxRequests,
        remaining: 0,
        retryAfterSeconds,
      };
    },
  };
}

function writeJsonResponse(
  method: string,
  response: ServerResponse,
  routeResponse: JsonRouteResponse,
): void {
  const body = JSON.stringify(routeResponse.payload, null, 2);

  response.writeHead(routeResponse.statusCode, {
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body).toString(),
    'content-type': 'application/json; charset=utf-8',
    ...(routeResponse.headers ?? {}),
  });

  if (method === 'HEAD') {
    response.end();
    return;
  }

  response.end(body);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function createUnexpectedErrorResponse(error: unknown): JsonRouteResponse {
  return createJsonRouteResponse(
    500,
    createStartupErrorPayload(error, {
      service: STARTUP_SERVICE_NAME,
      sessionId: STARTUP_SESSION_ID,
    }),
  );
}

function getRoutesForPath(
  routes: readonly ApiRouteDefinition[],
  pathname: string,
): ApiRouteDefinition[] {
  return routes.filter((route) => route.path === pathname);
}

function getAllowedMethods(
  routes: readonly ApiRouteDefinition[],
): ApiRouteMethod[] {
  return [...new Set(routes.flatMap((route) => route.methods))];
}

function getRouteExecutionTimeout(runtimeConfig: ApiRuntimeConfig): number {
  return Math.min(
    runtimeConfig.diagnosticsTimeoutMs,
    runtimeConfig.requestTimeoutMs,
  );
}

function getTraceId(request: IncomingMessage, requestId: string): string {
  const headerValue = request.headers['x-trace-id'];

  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  return requestId;
}

function getEventLevel(statusCode: number): 'error' | 'info' | 'warn' {
  if (statusCode >= 500) {
    return 'error';
  }

  if (statusCode >= 400) {
    return 'warn';
  }

  return 'info';
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  runtimeConfig: ApiRuntimeConfig,
  services: ApiServiceContainer,
  routes: readonly ApiRouteDefinition[],
  rateLimiter: ReturnType<typeof createRateLimiter>,
): Promise<void> {
  const startedAtMs = Date.now();
  const requestId = randomUUID();
  const traceId = getTraceId(request, requestId);
  let requestInput: ReturnType<typeof parseApiRequestInput> | undefined;

  async function recordRequestEvent(
    eventType: 'http-request-completed' | 'http-request-received',
    input: {
      level?: 'error' | 'info' | 'warn';
      metadata: Record<string, string | number | null>;
      pathname: string;
      statusCode?: number;
      summary: string;
    },
  ): Promise<void> {
    if (!shouldPersistRequestEvent(input.pathname)) {
      return;
    }

    try {
      const observability = await services.observability.getService();
      await observability.recordEvent({
        correlation: {
          approvalId: null,
          jobId: null,
          requestId,
          sessionId: null,
          traceId,
        },
        eventType,
        metadata: {
          ...input.metadata,
          method: request.method?.trim().toUpperCase() ?? 'GET',
          path: input.pathname,
          statusCode: input.statusCode ?? null,
        },
        occurredAt: new Date().toISOString(),
        summary: input.summary,
        ...(input.level ? { level: input.level } : {}),
      });
    } catch {
      // Observability writes must not break the request path.
    }
  }

  async function writeRouteResponse(
    routeResponse: JsonRouteResponse,
  ): Promise<void> {
    await recordRequestEvent('http-request-completed', {
      level: getEventLevel(routeResponse.statusCode),
      metadata: {
        durationMs: Date.now() - startedAtMs,
      },
      pathname: requestInput?.pathname ?? request.url ?? '/',
      statusCode: routeResponse.statusCode,
      summary: `HTTP ${request.method?.trim().toUpperCase() ?? 'GET'} ${requestInput?.pathname ?? request.url ?? '/'} completed with ${routeResponse.statusCode}.`,
    });

    writeJsonResponse(request.method?.trim().toUpperCase() || 'GET', response, {
      ...routeResponse,
      headers: {
        ...(routeResponse.headers ?? {}),
        'x-request-id': requestId,
        'x-trace-id': traceId,
      },
    });
  }

  try {
    requestInput = parseApiRequestInput(request);
  } catch (error) {
    const routeResponse =
      error instanceof ApiRequestValidationError
        ? createBadRequestResponse(error)
        : createUnexpectedErrorResponse(error);
    const method = request.method?.trim().toUpperCase() || 'GET';

    writeJsonResponse(method, response, {
      ...routeResponse,
      headers: {
        ...(routeResponse.headers ?? {}),
        'x-request-id': requestId,
        'x-trace-id': traceId,
      },
    });
    return;
  }

  await recordRequestEvent('http-request-received', {
    metadata: {
      durationMs: 0,
    },
    pathname: requestInput.pathname,
    summary: `HTTP ${requestInput.method} ${requestInput.pathname} received.`,
  });

  const rateLimit = rateLimiter.check(request);

  if (!rateLimit.allowed) {
    await writeRouteResponse(
      createRateLimitedResponse(
        rateLimit.retryAfterSeconds,
        rateLimit.remaining,
        rateLimit.limit,
      ),
    );
    return;
  }

  const matchingRoutes = getRoutesForPath(routes, requestInput.pathname);

  if (matchingRoutes.length === 0) {
    await writeRouteResponse(createNotFoundResponse(requestInput.pathname));
    return;
  }

  const matchingRoute = matchingRoutes.find((route) =>
    route.methods.includes(requestInput.method as ApiRouteMethod),
  );

  if (!matchingRoute) {
    await writeRouteResponse(
      createMethodNotAllowedResponse(
        requestInput.method,
        getAllowedMethods(matchingRoutes),
      ),
    );
    return;
  }

  try {
    const routeResponse = await withTimeout(
      Promise.resolve(
        matchingRoute.handle({
          request,
          requestInput,
          response,
          runtimeConfig,
          services,
        }),
      ),
      getRouteExecutionTimeout(runtimeConfig),
      `API route execution timed out after ${getRouteExecutionTimeout(runtimeConfig)}ms.`,
    );

    await writeRouteResponse(routeResponse);
  } catch (error) {
    await writeRouteResponse(createUnexpectedErrorResponse(error));
  }
}

function createConfiguredStartupHttpServer(params: {
  routes: readonly ApiRouteDefinition[];
  runtimeConfig: ApiRuntimeConfig;
  services: ApiServiceContainer;
}): Server {
  const rateLimiter = createRateLimiter(params.runtimeConfig);
  const server = createServer((request, response) => {
    void handleRequest(
      request,
      response,
      params.runtimeConfig,
      params.services,
      params.routes,
      rateLimiter,
    );
  });

  server.headersTimeout = params.runtimeConfig.requestTimeoutMs;
  server.requestTimeout = params.runtimeConfig.requestTimeoutMs;
  server.keepAliveTimeout = params.runtimeConfig.keepAliveTimeoutMs;

  return server;
}

export function createStartupHttpServer(
  options: StartupHttpServerOptions = {},
): Server {
  return createConfiguredStartupHttpServer({
    routes: options.routes ?? createApiRouteRegistry(),
    runtimeConfig: createRuntimeConfig(options),
    services: options.services ?? createApiServiceContainer(options),
  });
}

export async function startStartupHttpServer(
  options: StartupHttpServerOptions = {},
): Promise<StartupHttpServerHandle> {
  const runtimeConfig = createRuntimeConfig(options);
  const routes = options.routes ?? createApiRouteRegistry();
  const ownsServices = options.services === undefined;
  const services = options.services ?? createApiServiceContainer(options);
  const server = createConfiguredStartupHttpServer({
    routes,
    runtimeConfig,
    services,
  });

  try {
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
      server.listen(runtimeConfig.port, runtimeConfig.host);
    });
  } catch (error) {
    if (ownsServices) {
      await services.dispose();
    }

    throw error;
  }

  const address = server.address();
  const resolvedPort =
    typeof address === 'object' && address !== null
      ? (address as AddressInfo).port
      : runtimeConfig.port;
  let closed = false;

  return {
    async close(): Promise<void> {
      if (closed) {
        return;
      }

      closed = true;

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      if (ownsServices) {
        await services.dispose();
      }
    },
    host: runtimeConfig.host,
    port: resolvedPort,
    server,
    url: `http://${runtimeConfig.host}:${resolvedPort}`,
  };
}

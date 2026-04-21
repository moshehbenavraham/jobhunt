import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../index.js';
import type { ApiRuntimeConfig } from '../runtime/runtime-config.js';
import type { ApiServiceContainer } from '../runtime/service-container.js';

const SUPPORTED_ROUTE_METHODS = ['GET', 'HEAD'] as const;

export type ApiRouteMethod = (typeof SUPPORTED_ROUTE_METHODS)[number];
export type ApiErrorStatus =
  | 'bad-request'
  | 'error'
  | 'method-not-allowed'
  | 'not-found'
  | 'rate-limited';

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: ApiErrorStatus;
};

export type JsonRouteResponse = {
  headers?: Record<string, string>;
  payload: unknown;
  statusCode: number;
};

export type ApiRequestInput = {
  method: string;
  pathname: string;
  requestUrl: URL;
  searchParams: URLSearchParams;
};

export type ApiRouteContext = {
  request: IncomingMessage;
  requestInput: ApiRequestInput;
  response: ServerResponse;
  runtimeConfig: ApiRuntimeConfig;
  services: ApiServiceContainer;
};

export type ApiRouteDefinition = {
  handle: (
    context: ApiRouteContext,
  ) => JsonRouteResponse | Promise<JsonRouteResponse>;
  methods: readonly ApiRouteMethod[];
  path: string;
};

export class ApiRequestValidationError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code = 'invalid-request', statusCode = 400) {
    super(message);
    this.code = code;
    this.name = 'ApiRequestValidationError';
    this.statusCode = statusCode;
  }
}

function isSupportedRouteMethod(method: string): method is ApiRouteMethod {
  return SUPPORTED_ROUTE_METHODS.includes(method as ApiRouteMethod);
}

function normalizeHttpMethod(rawMethod: string | undefined): string {
  const normalizedMethod = rawMethod?.trim().toUpperCase() ?? 'GET';

  if (!normalizedMethod || !/^[A-Z]+$/.test(normalizedMethod)) {
    throw new ApiRequestValidationError(
      `Unsupported HTTP method value: ${rawMethod ?? '(empty)'}.`,
      'invalid-method',
    );
  }

  return normalizedMethod;
}

function normalizeRoutePath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`Route paths must start with "/": ${path}`);
  }

  if (path.length > 1 && path.endsWith('/')) {
    throw new Error(`Route paths must not end with "/": ${path}`);
  }

  return path;
}

export function parseApiRequestInput(
  request: IncomingMessage,
): ApiRequestInput {
  let requestUrl: URL;

  try {
    requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ApiRequestValidationError(
      `Invalid request URL: ${message}`,
      'invalid-url',
    );
  }

  return {
    method: normalizeHttpMethod(request.method),
    pathname: requestUrl.pathname,
    requestUrl,
    searchParams: requestUrl.searchParams,
  };
}

export function defineApiRoute(
  definition: ApiRouteDefinition,
): ApiRouteDefinition {
  if (definition.methods.length === 0) {
    throw new Error(
      `Route ${definition.path} must declare at least one method.`,
    );
  }

  for (const method of definition.methods) {
    if (!isSupportedRouteMethod(method)) {
      throw new Error(
        `Route ${definition.path} declares an unsupported method: ${method}`,
      );
    }
  }

  return {
    ...definition,
    methods: [...definition.methods],
    path: normalizeRoutePath(definition.path),
  };
}

export function createJsonRouteResponse(
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {},
): JsonRouteResponse {
  return {
    headers,
    payload,
    statusCode,
  };
}

export function createErrorPayload(
  status: ApiErrorStatus,
  code: string,
  message: string,
): ApiErrorPayload {
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

export function createBadRequestResponse(
  error: ApiRequestValidationError,
): JsonRouteResponse {
  return createJsonRouteResponse(
    error.statusCode,
    createErrorPayload('bad-request', error.code, error.message),
  );
}

export function createMethodNotAllowedResponse(
  method: string,
  allowedMethods: readonly ApiRouteMethod[],
): JsonRouteResponse {
  return createJsonRouteResponse(
    405,
    createErrorPayload(
      'method-not-allowed',
      'method-not-allowed',
      `Unsupported method ${method}. Use ${allowedMethods.join(' or ')}.`,
    ),
    {
      allow: allowedMethods.join(', '),
    },
  );
}

export function createNotFoundResponse(pathname: string): JsonRouteResponse {
  return createJsonRouteResponse(
    404,
    createErrorPayload(
      'not-found',
      'route-not-found',
      `Unknown route ${pathname}.`,
    ),
  );
}

export function createRateLimitedResponse(
  retryAfterSeconds: number,
  remaining: number,
  limit: number,
): JsonRouteResponse {
  return createJsonRouteResponse(
    429,
    createErrorPayload(
      'rate-limited',
      'rate-limit-exceeded',
      `Too many requests. Retry after ${retryAfterSeconds} seconds.`,
    ),
    {
      'retry-after': retryAfterSeconds.toString(),
      'x-ratelimit-limit': limit.toString(),
      'x-ratelimit-remaining': remaining.toString(),
    },
  );
}

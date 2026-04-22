import {
  parseChatConsoleCommandPayload,
  parseChatConsoleErrorPayload,
  parseChatConsoleSummaryPayload,
  type ChatConsoleCommandPayload,
  type ChatConsoleErrorPayload,
  type ChatConsoleSummaryPayload,
  type ChatConsoleWorkflowIntent,
} from './chat-console-types';

const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export type ChatConsoleCommandInput =
  | {
      context: unknown | null;
      kind: 'launch';
      sessionId: string | null;
      workflow: ChatConsoleWorkflowIntent;
    }
  | {
      kind: 'resume';
      sessionId: string;
    };

export class ChatConsoleClientError extends Error {
  code: string;
  httpStatus: number | null;
  payload: ChatConsoleErrorPayload | null;
  state: 'error' | 'offline';

  constructor(options: {
    cause?: unknown;
    code: string;
    httpStatus?: number | null;
    message: string;
    payload?: ChatConsoleErrorPayload | null;
    state: 'error' | 'offline';
  }) {
    super(
      options.message,
      options.cause ? { cause: options.cause } : undefined,
    );
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.name = 'ChatConsoleClientError';
    this.payload = options.payload ?? null;
    this.state = options.state;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveChatConsoleSummaryEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/chat-console`;
  }

  return '/api/chat-console';
}

export function resolveOrchestrationEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/orchestration`;
  }

  return '/api/orchestration';
}

function createSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal,
): {
  cleanup: () => void;
  didTimeout: () => boolean;
  signal: AbortSignal;
} {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortFromExternal = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', abortFromExternal, {
        once: true,
      });
    }
  }

  return {
    cleanup: () => {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortFromExternal);
    },
    didTimeout: () => timedOut,
    signal: controller.signal,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function shouldRetry(error: unknown): boolean {
  if (!(error instanceof ChatConsoleClientError)) {
    return false;
  }

  return error.state === 'offline' || error.httpStatus === 429;
}

async function waitForRetry(
  delayMs: number,
  signal?: AbortSignal,
): Promise<void> {
  if (delayMs === 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', abortListener);
      resolve();
    }, delayMs);

    const abortListener = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (!signal) {
      return;
    }

    if (signal.aborted) {
      abortListener();
      return;
    }

    signal.addEventListener('abort', abortListener, { once: true });
  });
}

function buildSummaryUrl(options: {
  endpoint?: string;
  sessionId?: string | null;
}): string {
  const endpoint = options.endpoint ?? resolveChatConsoleSummaryEndpoint();

  if (!options.sessionId) {
    return endpoint;
  }

  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set('sessionId', options.sessionId);

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

async function parseResponsePayload<TPayload>(
  response: Response,
  parser: (value: unknown) => TPayload,
): Promise<TPayload> {
  const rawPayload = await response.json().catch((error: unknown) => {
    throw new ChatConsoleClientError({
      cause: error,
      code: 'invalid-json',
      httpStatus: response.status,
      message: 'Chat-console endpoint returned invalid JSON.',
      state: 'error',
    });
  });

  try {
    return parser(rawPayload);
  } catch (_payloadError) {
    try {
      const errorPayload = parseChatConsoleErrorPayload(rawPayload);

      throw new ChatConsoleClientError({
        code: errorPayload.error.code,
        httpStatus: response.status,
        message: errorPayload.error.message,
        payload: errorPayload,
        state: response.status >= 500 ? 'error' : 'offline',
      });
    } catch (parsedError) {
      if (parsedError instanceof ChatConsoleClientError) {
        throw parsedError;
      }

      throw new ChatConsoleClientError({
        cause: parsedError,
        code: 'invalid-response',
        httpStatus: response.status,
        message: 'Chat-console endpoint returned an unexpected payload.',
        state: 'error',
      });
    }
  }
}

async function fetchSummaryOnce(options: {
  endpoint?: string;
  sessionId?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<ChatConsoleSummaryPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(
      buildSummaryUrl({
        ...(options.endpoint ? { endpoint: options.endpoint } : {}),
        ...(options.sessionId !== undefined
          ? { sessionId: options.sessionId }
          : {}),
      }),
      {
        headers: {
          accept: 'application/json',
        },
        method: 'GET',
        signal: request.signal,
      },
    );

    return parseResponsePayload(response, parseChatConsoleSummaryPayload);
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new ChatConsoleClientError({
        cause: error,
        code: 'timeout',
        message: 'Chat-console summary timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof ChatConsoleClientError) {
      throw error;
    }

    throw new ChatConsoleClientError({
      cause: error,
      code: 'offline',
      message:
        'Chat-console summary endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function fetchChatConsoleSummary(
  options: {
    endpoint?: string;
    sessionId?: string | null;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<ChatConsoleSummaryPayload> {
  let lastError: unknown;

  for (const delayMs of RETRY_DELAYS_MS) {
    await waitForRetry(delayMs, options.signal);

    try {
      return await fetchSummaryOnce(options);
    } catch (error) {
      if (options.signal?.aborted && isAbortError(error)) {
        throw error;
      }

      lastError = error;

      if (!shouldRetry(error) || delayMs === RETRY_DELAYS_MS.at(-1)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function submitChatConsoleCommand(
  input: ChatConsoleCommandInput,
  options: {
    endpoint?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<ChatConsoleCommandPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(
      options.endpoint ?? resolveOrchestrationEndpoint(),
      {
        body: JSON.stringify(input),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: request.signal,
      },
    );

    return parseResponsePayload(response, parseChatConsoleCommandPayload);
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new ChatConsoleClientError({
        cause: error,
        code: 'timeout',
        message: 'Orchestration request timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof ChatConsoleClientError) {
      throw error;
    }

    throw new ChatConsoleClientError({
      cause: error,
      code: 'offline',
      message:
        'Orchestration endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

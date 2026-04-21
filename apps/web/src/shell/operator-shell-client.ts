import {
  parseOperatorShellErrorPayload,
  parseOperatorShellSummaryPayload,
  type OperatorShellErrorPayload,
  type OperatorShellSummaryPayload,
} from './shell-types';

const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export class OperatorShellClientError extends Error {
  code: string;
  httpStatus: number | null;
  payload: OperatorShellErrorPayload | null;
  state: 'error' | 'offline';

  constructor(options: {
    cause?: unknown;
    code: string;
    httpStatus?: number | null;
    message: string;
    payload?: OperatorShellErrorPayload | null;
    state: 'error' | 'offline';
  }) {
    super(options.message, options.cause ? { cause: options.cause } : undefined);
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.name = 'OperatorShellClientError';
    this.payload = options.payload ?? null;
    this.state = options.state;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveOperatorShellEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/operator-shell`;
  }

  return '/api/operator-shell';
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
  if (!(error instanceof OperatorShellClientError)) {
    return false;
  }

  return error.state === 'offline' || error.httpStatus === 429;
}

async function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
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

async function fetchOnce(options: {
  endpoint?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<OperatorShellSummaryPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(
      options.endpoint ?? resolveOperatorShellEndpoint(),
      {
        headers: {
          accept: 'application/json',
        },
        method: 'GET',
        signal: request.signal,
      },
    );
    const rawPayload = await response.json().catch((error: unknown) => {
      throw new OperatorShellClientError({
        cause: error,
        code: 'invalid-json',
        httpStatus: response.status,
        message: 'Operator-shell endpoint returned invalid JSON.',
        state: 'error',
      });
    });

    try {
      return parseOperatorShellSummaryPayload(rawPayload);
    } catch (_summaryError) {
      try {
        const errorPayload = parseOperatorShellErrorPayload(rawPayload);

        throw new OperatorShellClientError({
          code: errorPayload.error.code,
          httpStatus: response.status,
          message: errorPayload.error.message,
          payload: errorPayload,
          state: response.status >= 500 ? 'error' : 'offline',
        });
      } catch (parsedError) {
        if (parsedError instanceof OperatorShellClientError) {
          throw parsedError;
        }

        throw new OperatorShellClientError({
          cause: parsedError,
          code: 'invalid-response',
          httpStatus: response.status,
          message: 'Operator-shell endpoint returned an unexpected payload.',
          state: 'error',
        });
      }
    }
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new OperatorShellClientError({
        cause: error,
        code: 'timeout',
        message: 'Operator-shell endpoint timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof OperatorShellClientError) {
      throw error;
    }

    throw new OperatorShellClientError({
      cause: error,
      code: 'offline',
      message:
        'Operator-shell endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function fetchOperatorShellSummary(
  options: {
    endpoint?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<OperatorShellSummaryPayload> {
  let lastError: unknown;

  for (const delayMs of RETRY_DELAYS_MS) {
    await waitForRetry(delayMs, options.signal);

    try {
      return await fetchOnce(options);
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

import {
  parseStartupErrorPayload,
  parseStartupPayload,
  type StartupErrorPayload,
  type StartupPayload,
} from './startup-types';

const DEFAULT_TIMEOUT_MS = 4000;

export class StartupClientError extends Error {
  code: string;
  httpStatus: number | null;
  payload: StartupErrorPayload | null;
  state: 'error' | 'offline';

  constructor(options: {
    cause?: unknown;
    code: string;
    httpStatus?: number | null;
    message: string;
    payload?: StartupErrorPayload | null;
    state: 'error' | 'offline';
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'StartupClientError';
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.payload = options.payload ?? null;
    this.state = options.state;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveStartupEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/startup`;
  }

  return '/api/startup';
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

export async function fetchStartupDiagnostics(options: {
  endpoint?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
} = {}): Promise<StartupPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(options.endpoint ?? resolveStartupEndpoint(), {
      headers: {
        accept: 'application/json',
      },
      method: 'GET',
      signal: request.signal,
    });
    const rawPayload = await response.json().catch((error: unknown) => {
      throw new StartupClientError({
        cause: error,
        code: 'invalid-json',
        httpStatus: response.status,
        message: 'Bootstrap endpoint returned invalid JSON.',
        state: 'error',
      });
    });

    try {
      return parseStartupPayload(rawPayload);
    } catch (_startupError) {
      try {
        const errorPayload = parseStartupErrorPayload(rawPayload);

        throw new StartupClientError({
          code: errorPayload.error.code,
          httpStatus: response.status,
          message: errorPayload.error.message,
          payload: errorPayload,
          state: 'error',
        });
      } catch (parsedError) {
        if (parsedError instanceof StartupClientError) {
          throw parsedError;
        }

        throw new StartupClientError({
          cause: parsedError,
          code: 'invalid-response',
          httpStatus: response.status,
          message: 'Bootstrap endpoint returned an unexpected payload.',
          state: 'error',
        });
      }
    }
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new StartupClientError({
        cause: error,
        code: 'timeout',
        message: 'Bootstrap endpoint timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof StartupClientError) {
      throw error;
    }

    throw new StartupClientError({
      cause: error,
      code: 'offline',
      message: 'Bootstrap endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

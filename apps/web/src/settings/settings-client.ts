import {
  parseSettingsErrorPayload,
  parseSettingsSummaryPayload,
  type SettingsErrorPayload,
  type SettingsSummaryPayload,
} from './settings-types';

const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export class SettingsClientError extends Error {
  code: string;
  httpStatus: number | null;
  payload: SettingsErrorPayload | null;
  state: 'error' | 'offline';

  constructor(options: {
    cause?: unknown;
    code: string;
    httpStatus?: number | null;
    message: string;
    payload?: SettingsErrorPayload | null;
    state: 'error' | 'offline';
  }) {
    super(
      options.message,
      options.cause ? { cause: options.cause } : undefined,
    );
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.name = 'SettingsClientError';
    this.payload = options.payload ?? null;
    this.state = options.state;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveSettingsEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/settings`;
  }

  return '/api/settings';
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
  if (!(error instanceof SettingsClientError)) {
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

function buildSettingsUrl(options: {
  endpoint?: string;
  toolLimit?: number;
  workflowLimit?: number;
}): string {
  const endpoint = options.endpoint ?? resolveSettingsEndpoint();
  const url = new URL(endpoint, window.location.origin);

  if (options.toolLimit !== undefined) {
    url.searchParams.set('toolLimit', options.toolLimit.toString());
  }

  if (options.workflowLimit !== undefined) {
    url.searchParams.set('workflowLimit', options.workflowLimit.toString());
  }

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

async function fetchOnce(options: {
  endpoint?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  toolLimit?: number;
  workflowLimit?: number;
}): Promise<SettingsSummaryPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(
      buildSettingsUrl({
        ...(options.endpoint ? { endpoint: options.endpoint } : {}),
        ...(options.toolLimit !== undefined
          ? { toolLimit: options.toolLimit }
          : {}),
        ...(options.workflowLimit !== undefined
          ? { workflowLimit: options.workflowLimit }
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
    const rawPayload = await response.json().catch((error: unknown) => {
      throw new SettingsClientError({
        cause: error,
        code: 'invalid-json',
        httpStatus: response.status,
        message: 'Settings endpoint returned invalid JSON.',
        state: 'error',
      });
    });

    try {
      return parseSettingsSummaryPayload(rawPayload);
    } catch (_summaryError) {
      try {
        const errorPayload = parseSettingsErrorPayload(rawPayload);

        throw new SettingsClientError({
          code: errorPayload.error.code,
          httpStatus: response.status,
          message: errorPayload.error.message,
          payload: errorPayload,
          state: response.status >= 500 ? 'error' : 'offline',
        });
      } catch (parsedError) {
        if (parsedError instanceof SettingsClientError) {
          throw parsedError;
        }

        throw new SettingsClientError({
          cause: parsedError,
          code: 'invalid-response',
          httpStatus: response.status,
          message: 'Settings endpoint returned an unexpected payload.',
          state: 'error',
        });
      }
    }
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new SettingsClientError({
        cause: error,
        code: 'timeout',
        message: 'Settings endpoint timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof SettingsClientError) {
      throw error;
    }

    throw new SettingsClientError({
      cause: error,
      code: 'offline',
      message:
        'Settings endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function fetchSettingsSummary(
  options: {
    endpoint?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    toolLimit?: number;
    workflowLimit?: number;
  } = {},
): Promise<SettingsSummaryPayload> {
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

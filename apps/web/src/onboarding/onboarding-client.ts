import {
  parseOnboardingErrorPayload,
  parseOnboardingRepairPayload,
  parseOnboardingSummaryPayload,
  type OnboardingErrorPayload,
  type OnboardingRepairPayload,
  type OnboardingRepairTarget,
  type OnboardingSummaryPayload,
} from './onboarding-types';

const DEFAULT_TIMEOUT_MS = 4_000;
const SUMMARY_RETRY_DELAYS_MS = [0, 250, 700] as const;
const REPAIR_RETRY_DELAYS_MS = [0, 400] as const;

export class OnboardingClientError extends Error {
  code: string;
  httpStatus: number | null;
  payload: OnboardingErrorPayload | null;
  state: 'error' | 'offline';

  constructor(options: {
    cause?: unknown;
    code: string;
    httpStatus?: number | null;
    message: string;
    payload?: OnboardingErrorPayload | null;
    state: 'error' | 'offline';
  }) {
    super(
      options.message,
      options.cause ? { cause: options.cause } : undefined,
    );
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.name = 'OnboardingClientError';
    this.payload = options.payload ?? null;
    this.state = options.state;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveOnboardingSummaryEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/onboarding`;
  }

  return '/api/onboarding';
}

export function resolveOnboardingRepairEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/onboarding/repair`;
  }

  return '/api/onboarding/repair';
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

function shouldRetrySummary(error: unknown): boolean {
  return (
    error instanceof OnboardingClientError &&
    (error.state === 'offline' || error.httpStatus === 429)
  );
}

function shouldRetryRepair(error: unknown): boolean {
  return error instanceof OnboardingClientError && error.httpStatus === 429;
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

async function parseResponsePayload<TPayload>(
  response: Response,
  parser: (value: unknown) => TPayload,
  contextLabel: string,
): Promise<TPayload> {
  const rawPayload = await response.json().catch((error: unknown) => {
    throw new OnboardingClientError({
      cause: error,
      code: 'invalid-json',
      httpStatus: response.status,
      message: `${contextLabel} returned invalid JSON.`,
      state: 'error',
    });
  });

  try {
    return parser(rawPayload);
  } catch (_payloadError) {
    try {
      const errorPayload = parseOnboardingErrorPayload(rawPayload);

      throw new OnboardingClientError({
        code: errorPayload.error.code,
        httpStatus: response.status,
        message: errorPayload.error.message,
        payload: errorPayload,
        state:
          response.status === 429 || response.status >= 500
            ? 'offline'
            : 'error',
      });
    } catch (parsedError) {
      if (parsedError instanceof OnboardingClientError) {
        throw parsedError;
      }

      throw new OnboardingClientError({
        cause: parsedError,
        code: 'invalid-response',
        httpStatus: response.status,
        message: `${contextLabel} returned an unexpected payload.`,
        state: 'error',
      });
    }
  }
}

function buildSummaryUrl(options: {
  endpoint?: string;
  targets?: readonly OnboardingRepairTarget[];
}): string {
  const endpoint = options.endpoint ?? resolveOnboardingSummaryEndpoint();

  if (!options.targets || options.targets.length === 0) {
    return endpoint;
  }

  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set('targets', [...options.targets].join(','));

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

async function fetchSummaryOnce(options: {
  endpoint?: string;
  signal?: AbortSignal;
  targets?: readonly OnboardingRepairTarget[];
  timeoutMs?: number;
}): Promise<OnboardingSummaryPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(
      buildSummaryUrl({
        ...(options.endpoint ? { endpoint: options.endpoint } : {}),
        ...(options.targets ? { targets: options.targets } : {}),
      }),
      {
        headers: {
          accept: 'application/json',
        },
        method: 'GET',
        signal: request.signal,
      },
    );

    return parseResponsePayload(
      response,
      parseOnboardingSummaryPayload,
      'Onboarding summary',
    );
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new OnboardingClientError({
        cause: error,
        code: 'timeout',
        message: 'Onboarding summary timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof OnboardingClientError) {
      throw error;
    }

    throw new OnboardingClientError({
      cause: error,
      code: 'offline',
      message:
        'The onboarding API is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function fetchOnboardingSummary(
  options: {
    endpoint?: string;
    signal?: AbortSignal;
    targets?: readonly OnboardingRepairTarget[];
    timeoutMs?: number;
  } = {},
): Promise<OnboardingSummaryPayload> {
  let lastError: unknown;

  for (const delayMs of SUMMARY_RETRY_DELAYS_MS) {
    try {
      await waitForRetry(delayMs, options.signal);
      return await fetchSummaryOnce(options);
    } catch (error) {
      if (options.signal?.aborted && isAbortError(error)) {
        throw error;
      }

      lastError = error;

      if (
        !shouldRetrySummary(error) ||
        delayMs === SUMMARY_RETRY_DELAYS_MS.at(-1)
      ) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Onboarding summary failed unexpectedly.');
}

async function submitRepairOnce(options: {
  endpoint?: string;
  signal?: AbortSignal;
  targets: readonly OnboardingRepairTarget[];
  timeoutMs?: number;
}): Promise<OnboardingRepairPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(
      options.endpoint ?? resolveOnboardingRepairEndpoint(),
      {
        body: JSON.stringify({
          confirm: true,
          targets: [...options.targets],
        }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: request.signal,
      },
    );

    return parseResponsePayload(
      response,
      parseOnboardingRepairPayload,
      'Onboarding repair',
    );
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new OnboardingClientError({
        cause: error,
        code: 'timeout',
        message: 'Onboarding repair timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof OnboardingClientError) {
      throw error;
    }

    throw new OnboardingClientError({
      cause: error,
      code: 'offline',
      message:
        'The onboarding repair request could not reach the API. Check the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function submitOnboardingRepair(options: {
  endpoint?: string;
  signal?: AbortSignal;
  targets: readonly OnboardingRepairTarget[];
  timeoutMs?: number;
}): Promise<OnboardingRepairPayload> {
  let lastError: unknown;

  for (const delayMs of REPAIR_RETRY_DELAYS_MS) {
    try {
      await waitForRetry(delayMs, options.signal);
      return await submitRepairOnce(options);
    } catch (error) {
      if (options.signal?.aborted && isAbortError(error)) {
        throw error;
      }

      lastError = error;

      if (
        !shouldRetryRepair(error) ||
        delayMs === REPAIR_RETRY_DELAYS_MS.at(-1)
      ) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Onboarding repair failed unexpectedly.');
}

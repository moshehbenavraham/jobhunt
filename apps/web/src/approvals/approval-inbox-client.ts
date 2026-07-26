import {
  parseApprovalInboxErrorPayload,
  parseApprovalInboxSummaryPayload,
  parseApprovalResolutionPayload,
  type ApprovalInboxErrorPayload,
  type ApprovalInboxSummaryPayload,
  type ApprovalResolutionPayload,
} from './approval-inbox-types';
import {
  parseChatConsoleCommandPayload,
  type ChatConsoleCommandPayload,
} from '../chat/chat-console-types';
import { resolveOrchestrationEndpoint } from '../chat/chat-console-client';

const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;
export const APPROVAL_FOCUS_EVENT = 'jobhunt:approval-focus-change';

export type ApprovalInboxFocus = {
  approvalId: string | null;
  sessionId: string | null;
};

export class ApprovalInboxClientError extends Error {
  code: string;
  httpStatus: number | null;
  payload: ApprovalInboxErrorPayload | null;
  state: 'error' | 'offline';

  constructor(options: {
    cause?: unknown;
    code: string;
    httpStatus?: number | null;
    message: string;
    payload?: ApprovalInboxErrorPayload | null;
    state: 'error' | 'offline';
  }) {
    super(
      options.message,
      options.cause ? { cause: options.cause } : undefined,
    );
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.name = 'ApprovalInboxClientError';
    this.payload = options.payload ?? null;
    this.state = options.state;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveApprovalInboxSummaryEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/approval-inbox`;
  }

  return '/api/approval-inbox';
}

export function resolveApprovalResolutionEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/approval-resolution`;
  }

  return '/api/approval-resolution';
}

export function readApprovalInboxFocusFromUrl(): ApprovalInboxFocus {
  const url = new URL(window.location.href);
  const approvalId = url.searchParams.get('approval')?.trim() || null;
  const sessionId = url.searchParams.get('reviewSession')?.trim() || null;

  return {
    approvalId,
    sessionId,
  };
}

export function syncApprovalInboxFocus(
  focus: Partial<ApprovalInboxFocus>,
  options: {
    openSurface?: boolean;
    replace?: boolean;
  } = {},
): void {
  const nextFocus = {
    ...readApprovalInboxFocusFromUrl(),
    ...focus,
  };
  const url = new URL(window.location.href);

  if (nextFocus.approvalId) {
    url.searchParams.set('approval', nextFocus.approvalId);
  } else {
    url.searchParams.delete('approval');
  }

  if (nextFocus.sessionId) {
    url.searchParams.set('reviewSession', nextFocus.sessionId);
  } else {
    url.searchParams.delete('reviewSession');
  }

  if (options.openSurface) {
    url.hash = '#approvals';
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    if (options.replace) {
      window.history.replaceState(null, '', nextUrl);
    } else {
      window.history.pushState(null, '', nextUrl);
    }
  }

  window.dispatchEvent(new Event(APPROVAL_FOCUS_EVENT));
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
  if (!(error instanceof ApprovalInboxClientError)) {
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
  focus?: Partial<ApprovalInboxFocus>;
}): string {
  const endpoint = options.endpoint ?? resolveApprovalInboxSummaryEndpoint();
  const url = new URL(endpoint, window.location.origin);

  if (options.focus?.approvalId) {
    url.searchParams.set('approvalId', options.focus.approvalId);
  }

  if (options.focus?.sessionId) {
    url.searchParams.set('sessionId', options.focus.sessionId);
  }

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
    throw new ApprovalInboxClientError({
      cause: error,
      code: 'invalid-json',
      httpStatus: response.status,
      message: 'Approval-inbox endpoint returned invalid JSON.',
      state: 'error',
    });
  });

  try {
    return parser(rawPayload);
  } catch (_payloadError) {
    try {
      const errorPayload = parseApprovalInboxErrorPayload(rawPayload);

      throw new ApprovalInboxClientError({
        code: errorPayload.error.code,
        httpStatus: response.status,
        message: errorPayload.error.message,
        payload: errorPayload,
        state:
          response.status >= 500 || response.status === 409
            ? 'error'
            : 'offline',
      });
    } catch (parsedError) {
      if (parsedError instanceof ApprovalInboxClientError) {
        throw parsedError;
      }

      throw new ApprovalInboxClientError({
        cause: parsedError,
        code: 'invalid-response',
        httpStatus: response.status,
        message: 'Approval-inbox endpoint returned an unexpected payload.',
        state: 'error',
      });
    }
  }
}

async function fetchSummaryOnce(options: {
  endpoint?: string;
  focus?: Partial<ApprovalInboxFocus>;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<ApprovalInboxSummaryPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(buildSummaryUrl(options), {
      headers: {
        accept: 'application/json',
      },
      method: 'GET',
      signal: request.signal,
    });

    return parseResponsePayload(response, parseApprovalInboxSummaryPayload);
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new ApprovalInboxClientError({
        cause: error,
        code: 'timeout',
        message: 'Approval-inbox summary timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof ApprovalInboxClientError) {
      throw error;
    }

    throw new ApprovalInboxClientError({
      cause: error,
      code: 'offline',
      message:
        'Approval-inbox summary endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function fetchApprovalInboxSummary(
  options: {
    endpoint?: string;
    focus?: Partial<ApprovalInboxFocus>;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<ApprovalInboxSummaryPayload> {
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

export async function submitApprovalResolution(
  input: {
    approvalId: string;
    decision: 'approved' | 'rejected';
  },
  options: {
    endpoint?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<ApprovalResolutionPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(
      options.endpoint ?? resolveApprovalResolutionEndpoint(),
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

    return await parseResponsePayload(response, parseApprovalResolutionPayload);
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new ApprovalInboxClientError({
        cause: error,
        code: 'timeout',
        message: 'Approval resolution timed out before it completed.',
        state: 'offline',
      });
    }

    if (error instanceof ApprovalInboxClientError) {
      throw error;
    }

    throw new ApprovalInboxClientError({
      cause: error,
      code: 'offline',
      message:
        'Approval resolution endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function submitApprovalResume(
  input: {
    sessionId: string;
  },
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
        body: JSON.stringify({
          kind: 'resume',
          sessionId: input.sessionId,
        }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: request.signal,
      },
    );

    return await parseResponsePayload(response, parseChatConsoleCommandPayload);
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new ApprovalInboxClientError({
        cause: error,
        code: 'timeout',
        message: 'Resume handoff timed out before it completed.',
        state: 'offline',
      });
    }

    if (error instanceof ApprovalInboxClientError) {
      throw error;
    }

    throw new ApprovalInboxClientError({
      cause: error,
      code: 'offline',
      message:
        'Resume handoff endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

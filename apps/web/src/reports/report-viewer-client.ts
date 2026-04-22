import {
  REPORT_VIEWER_ARTIFACT_GROUPS,
  parseReportViewerErrorPayload,
  parseReportViewerSummaryPayload,
  type ReportViewerArtifactGroup,
  type ReportViewerErrorPayload,
  type ReportViewerSummaryPayload,
} from './report-viewer-types';

const DEFAULT_ARTIFACT_LIMIT = 8;
const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export const REPORT_VIEWER_FOCUS_EVENT = 'jobhunt:report-viewer-focus-change';

export type ReportViewerFocus = {
  group: ReportViewerArtifactGroup;
  offset: number;
  reportPath: string | null;
};

export class ReportViewerClientError extends Error {
  code: string;
  httpStatus: number | null;
  payload: ReportViewerErrorPayload | null;
  state: 'error' | 'offline';

  constructor(options: {
    cause?: unknown;
    code: string;
    httpStatus?: number | null;
    message: string;
    payload?: ReportViewerErrorPayload | null;
    state: 'error' | 'offline';
  }) {
    super(
      options.message,
      options.cause ? { cause: options.cause } : undefined,
    );
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.name = 'ReportViewerClientError';
    this.payload = options.payload ?? null;
    this.state = options.state;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function readArtifactGroup(value: string | null): ReportViewerArtifactGroup {
  if (
    value &&
    REPORT_VIEWER_ARTIFACT_GROUPS.includes(value as ReportViewerArtifactGroup)
  ) {
    return value as ReportViewerArtifactGroup;
  }

  return 'all';
}

function readOffset(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function mergeFocus(
  focus: Partial<ReportViewerFocus> | undefined,
): ReportViewerFocus {
  return {
    ...readReportViewerFocusFromUrl(),
    ...focus,
    group: focus?.group ?? readReportViewerFocusFromUrl().group,
    offset: focus?.offset ?? readReportViewerFocusFromUrl().offset,
    reportPath:
      focus?.reportPath !== undefined
        ? focus.reportPath
        : readReportViewerFocusFromUrl().reportPath,
  };
}

export function resolveReportViewerEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/report-viewer`;
  }

  return '/api/report-viewer';
}

export function readReportViewerFocusFromUrl(): ReportViewerFocus {
  const url = new URL(window.location.href);

  return {
    group: readArtifactGroup(url.searchParams.get('artifactGroup')),
    offset: readOffset(url.searchParams.get('artifactOffset')),
    reportPath: url.searchParams.get('report')?.trim() || null,
  };
}

export function syncReportViewerFocus(
  focus: Partial<ReportViewerFocus>,
  options: {
    openSurface?: boolean;
    replace?: boolean;
  } = {},
): void {
  const nextFocus = mergeFocus(focus);
  const url = new URL(window.location.href);

  if (nextFocus.group === 'all') {
    url.searchParams.delete('artifactGroup');
  } else {
    url.searchParams.set('artifactGroup', nextFocus.group);
  }

  if (nextFocus.offset > 0) {
    url.searchParams.set('artifactOffset', String(nextFocus.offset));
  } else {
    url.searchParams.delete('artifactOffset');
  }

  if (nextFocus.reportPath) {
    url.searchParams.set('report', nextFocus.reportPath);
  } else {
    url.searchParams.delete('report');
  }

  if (options.openSurface) {
    url.hash = '#artifacts';
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

  window.dispatchEvent(new Event(REPORT_VIEWER_FOCUS_EVENT));
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
  if (!(error instanceof ReportViewerClientError)) {
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
  focus?: Partial<ReportViewerFocus>;
  limit?: number;
}): string {
  const endpoint = options.endpoint ?? resolveReportViewerEndpoint();
  const url = new URL(endpoint, window.location.origin);
  const focus = mergeFocus(options.focus);

  url.searchParams.set('group', focus.group);
  url.searchParams.set(
    'limit',
    String(options.limit ?? DEFAULT_ARTIFACT_LIMIT),
  );

  if (focus.offset > 0) {
    url.searchParams.set('offset', String(focus.offset));
  }

  if (focus.reportPath) {
    url.searchParams.set('reportPath', focus.reportPath);
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
    throw new ReportViewerClientError({
      cause: error,
      code: 'invalid-json',
      httpStatus: response.status,
      message: 'Report-viewer endpoint returned invalid JSON.',
      state: 'error',
    });
  });

  try {
    return parser(rawPayload);
  } catch (_payloadError) {
    try {
      const errorPayload = parseReportViewerErrorPayload(rawPayload);

      throw new ReportViewerClientError({
        code: errorPayload.error.code,
        httpStatus: response.status,
        message: errorPayload.error.message,
        payload: errorPayload,
        state:
          response.status === 400 || response.status >= 500
            ? 'error'
            : 'offline',
      });
    } catch (parsedError) {
      if (parsedError instanceof ReportViewerClientError) {
        throw parsedError;
      }

      throw new ReportViewerClientError({
        cause: parsedError,
        code: 'invalid-response',
        httpStatus: response.status,
        message: 'Report-viewer endpoint returned an unexpected payload.',
        state: 'error',
      });
    }
  }
}

async function fetchSummaryOnce(options: {
  endpoint?: string;
  focus?: Partial<ReportViewerFocus>;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<ReportViewerSummaryPayload> {
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

    return parseResponsePayload(response, parseReportViewerSummaryPayload);
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new ReportViewerClientError({
        cause: error,
        code: 'timeout',
        message: 'Report-viewer summary timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof ReportViewerClientError) {
      throw error;
    }

    throw new ReportViewerClientError({
      cause: error,
      code: 'offline',
      message:
        'Report-viewer endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function fetchReportViewerSummary(
  options: {
    endpoint?: string;
    focus?: Partial<ReportViewerFocus>;
    limit?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<ReportViewerSummaryPayload> {
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

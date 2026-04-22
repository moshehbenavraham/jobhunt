import {
  parsePipelineReviewErrorPayload,
  parsePipelineReviewSummaryPayload,
  PIPELINE_REVIEW_QUEUE_SECTIONS,
  PIPELINE_REVIEW_SORT_VALUES,
  type PipelineReviewErrorPayload,
  type PipelineReviewQueueSection,
  type PipelineReviewSort,
  type PipelineReviewSummaryPayload,
} from './pipeline-review-types';

const DEFAULT_PIPELINE_REVIEW_LIMIT = 12;
const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export const PIPELINE_REVIEW_FOCUS_EVENT = 'jobhunt:pipeline-review-focus-change';

export type PipelineReviewFocus = {
  offset: number;
  reportNumber: string | null;
  section: PipelineReviewQueueSection;
  sort: PipelineReviewSort;
  url: string | null;
};

export class PipelineReviewClientError extends Error {
  code: string;
  httpStatus: number | null;
  payload: PipelineReviewErrorPayload | null;
  state: 'error' | 'offline';

  constructor(options: {
    cause?: unknown;
    code: string;
    httpStatus?: number | null;
    message: string;
    payload?: PipelineReviewErrorPayload | null;
    state: 'error' | 'offline';
  }) {
    super(
      options.message,
      options.cause ? { cause: options.cause } : undefined,
    );
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? null;
    this.name = 'PipelineReviewClientError';
    this.payload = options.payload ?? null;
    this.state = options.state;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function readSection(value: string | null): PipelineReviewQueueSection {
  if (
    value &&
    PIPELINE_REVIEW_QUEUE_SECTIONS.includes(value as PipelineReviewQueueSection)
  ) {
    return value as PipelineReviewQueueSection;
  }

  return 'all';
}

function readSort(value: string | null): PipelineReviewSort {
  if (
    value &&
    PIPELINE_REVIEW_SORT_VALUES.includes(value as PipelineReviewSort)
  ) {
    return value as PipelineReviewSort;
  }

  return 'queue';
}

function readOffset(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function readReportNumber(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return /^\d{3}$/.test(value) ? value : null;
}

function readSelection(value: {
  reportNumber: string | null;
  url: string | null;
}): {
  reportNumber: string | null;
  url: string | null;
} {
  if (value.reportNumber) {
    return {
      reportNumber: value.reportNumber,
      url: null,
    };
  }

  return {
    reportNumber: null,
    url: value.url?.trim() || null,
  };
}

function mergeFocus(
  focus: Partial<PipelineReviewFocus> | undefined,
): PipelineReviewFocus {
  const currentFocus = readPipelineReviewFocusFromUrl();
  const nextSelection = readSelection({
    reportNumber:
      focus?.reportNumber !== undefined
        ? focus.reportNumber
        : currentFocus.reportNumber,
    url: focus?.url !== undefined ? focus.url : currentFocus.url,
  });

  return {
    ...currentFocus,
    ...focus,
    ...nextSelection,
    offset: focus?.offset ?? currentFocus.offset,
    section: focus?.section ?? currentFocus.section,
    sort: focus?.sort ?? currentFocus.sort,
  };
}

export function resolvePipelineReviewEndpoint(): string {
  const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return `${trimTrailingSlash(configuredOrigin)}/pipeline-review`;
  }

  return '/api/pipeline-review';
}

export function readPipelineReviewFocusFromUrl(): PipelineReviewFocus {
  const url = new URL(window.location.href);
  const selection = readSelection({
    reportNumber: readReportNumber(
      url.searchParams.get('pipelineReportNumber'),
    ),
    url: url.searchParams.get('pipelineUrl'),
  });

  return {
    offset: readOffset(url.searchParams.get('pipelineOffset')),
    reportNumber: selection.reportNumber,
    section: readSection(url.searchParams.get('pipelineSection')),
    sort: readSort(url.searchParams.get('pipelineSort')),
    url: selection.url,
  };
}

export function syncPipelineReviewFocus(
  focus: Partial<PipelineReviewFocus>,
  options: {
    openSurface?: boolean;
    replace?: boolean;
  } = {},
): void {
  const nextFocus = mergeFocus(focus);
  const url = new URL(window.location.href);

  if (nextFocus.section === 'all') {
    url.searchParams.delete('pipelineSection');
  } else {
    url.searchParams.set('pipelineSection', nextFocus.section);
  }

  if (nextFocus.sort === 'queue') {
    url.searchParams.delete('pipelineSort');
  } else {
    url.searchParams.set('pipelineSort', nextFocus.sort);
  }

  if (nextFocus.offset > 0) {
    url.searchParams.set('pipelineOffset', String(nextFocus.offset));
  } else {
    url.searchParams.delete('pipelineOffset');
  }

  if (nextFocus.reportNumber) {
    url.searchParams.set('pipelineReportNumber', nextFocus.reportNumber);
    url.searchParams.delete('pipelineUrl');
  } else if (nextFocus.url) {
    url.searchParams.set('pipelineUrl', nextFocus.url);
    url.searchParams.delete('pipelineReportNumber');
  } else {
    url.searchParams.delete('pipelineReportNumber');
    url.searchParams.delete('pipelineUrl');
  }

  if (options.openSurface) {
    url.hash = '#pipeline';
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl =
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    if (options.replace) {
      window.history.replaceState(null, '', nextUrl);
    } else {
      window.history.pushState(null, '', nextUrl);
    }
  }

  window.dispatchEvent(new Event(PIPELINE_REVIEW_FOCUS_EVENT));
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
  if (!(error instanceof PipelineReviewClientError)) {
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
  focus?: Partial<PipelineReviewFocus>;
  limit?: number;
}): string {
  const endpoint = options.endpoint ?? resolvePipelineReviewEndpoint();
  const url = new URL(endpoint, window.location.origin);
  const focus = mergeFocus(options.focus);

  url.searchParams.set('section', focus.section);
  url.searchParams.set('sort', focus.sort);
  url.searchParams.set(
    'limit',
    String(options.limit ?? DEFAULT_PIPELINE_REVIEW_LIMIT),
  );

  if (focus.offset > 0) {
    url.searchParams.set('offset', String(focus.offset));
  }

  if (focus.reportNumber) {
    url.searchParams.set('reportNumber', focus.reportNumber);
  } else if (focus.url) {
    url.searchParams.set('url', focus.url);
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
    throw new PipelineReviewClientError({
      cause: error,
      code: 'invalid-json',
      httpStatus: response.status,
      message: 'Pipeline-review endpoint returned invalid JSON.',
      state: 'error',
    });
  });

  try {
    return parser(rawPayload);
  } catch (_payloadError) {
    try {
      const errorPayload = parsePipelineReviewErrorPayload(rawPayload);

      throw new PipelineReviewClientError({
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
      if (parsedError instanceof PipelineReviewClientError) {
        throw parsedError;
      }

      throw new PipelineReviewClientError({
        cause: parsedError,
        code: 'invalid-response',
        httpStatus: response.status,
        message: 'Pipeline-review endpoint returned an unexpected payload.',
        state: 'error',
      });
    }
  }
}

async function fetchSummaryOnce(options: {
  endpoint?: string;
  focus?: Partial<PipelineReviewFocus>;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<PipelineReviewSummaryPayload> {
  const request = createSignal(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    options.signal,
  );

  try {
    const response = await fetch(
      buildSummaryUrl(options),
      {
        headers: {
          accept: 'application/json',
        },
        method: 'GET',
        signal: request.signal,
      },
    );

    return await parseResponsePayload(
      response,
      parsePipelineReviewSummaryPayload,
    );
  } catch (error) {
    if (options.signal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (request.didTimeout()) {
      throw new PipelineReviewClientError({
        cause: error,
        code: 'timeout',
        message: 'Pipeline-review endpoint timed out before it responded.',
        state: 'offline',
      });
    }

    if (error instanceof PipelineReviewClientError) {
      throw error;
    }

    throw new PipelineReviewClientError({
      cause: error,
      code: 'offline',
      message:
        'Pipeline-review endpoint is unavailable. Start the local API server and try again.',
      state: 'offline',
    });
  } finally {
    request.cleanup();
  }
}

export async function fetchPipelineReviewSummary(
  options: {
    endpoint?: string;
    focus?: Partial<PipelineReviewFocus>;
    limit?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<PipelineReviewSummaryPayload> {
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

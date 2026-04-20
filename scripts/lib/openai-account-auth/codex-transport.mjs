import { randomUUID } from 'node:crypto';
import { getDefaultAuthPath } from './common.mjs';
import { refreshCredentials } from './oauth.mjs';
import { loadStoredCredentials, refreshStoredCredentials } from './storage.mjs';

export const OPENAI_CODEX_RESPONSES_BASE_URL =
  'https://chatgpt.com/backend-api';
export const OPENAI_CODEX_RESPONSES_BETA_HEADER = 'responses=experimental';
export const OPENAI_CODEX_DEFAULT_MODEL = 'gpt-5.4-mini';
export const OPENAI_CODEX_DEFAULT_INSTRUCTIONS =
  'You are a concise assistant.';
export const OPENAI_CODEX_DEFAULT_ORIGINATOR = 'pi';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class CodexTransportError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'CodexTransportError';
    this.code = options.code || 'codex_transport_error';
    this.status =
      typeof options.status === 'number' ? options.status : undefined;
    this.kind = options.kind || 'transport';
    this.retryable = Boolean(options.retryable);
    this.friendlyMessage =
      typeof options.friendlyMessage === 'string'
        ? options.friendlyMessage
        : undefined;
    this.details = options.details;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      kind: this.kind,
      retryable: this.retryable,
      friendlyMessage: this.friendlyMessage,
      details: this.details,
    };
  }
}

export function createCodexRequestId() {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return `codex_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveCodexResponsesUrl(baseUrl = OPENAI_CODEX_RESPONSES_BASE_URL) {
  const normalized = String(baseUrl || OPENAI_CODEX_RESPONSES_BASE_URL)
    .trim()
    .replace(/\/+$/g, '');
  if (normalized.endsWith('/codex/responses')) {
    return normalized;
  }
  if (normalized.endsWith('/codex')) {
    return `${normalized}/responses`;
  }
  return `${normalized}/codex/responses`;
}

export function buildCodexResponsesBody(options = {}) {
  const sessionId = options.sessionId || createCodexRequestId();
  const prebuiltRequestData =
    options.requestData &&
    typeof options.requestData === 'object' &&
    !Array.isArray(options.requestData)
      ? options.requestData
      : null;
  const prompt = normalizeOptionalString(options.prompt);
  const input = Array.isArray(options.input)
    ? options.input
    : Array.isArray(prebuiltRequestData?.input)
      ? prebuiltRequestData.input
    : prompt
      ? [
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ]
      : null;

  if (!input || input.length === 0) {
    throw new CodexTransportError(
      'Codex requests need either a prompt string or a prebuilt input array.',
      {
        code: 'missing_input',
        kind: 'invalid_request',
      },
    );
  }

  if (prebuiltRequestData) {
    const textConfig =
      prebuiltRequestData.text &&
      typeof prebuiltRequestData.text === 'object' &&
      !Array.isArray(prebuiltRequestData.text)
        ? prebuiltRequestData.text
        : {};

    return {
      ...prebuiltRequestData,
      model:
        normalizeOptionalString(prebuiltRequestData.model) ||
        normalizeOptionalString(options.model) ||
        OPENAI_CODEX_DEFAULT_MODEL,
      store:
        typeof prebuiltRequestData.store === 'boolean'
          ? prebuiltRequestData.store
          : false,
      stream: true,
      instructions:
        normalizeOptionalString(prebuiltRequestData.instructions) ||
        normalizeOptionalString(options.instructions) ||
        OPENAI_CODEX_DEFAULT_INSTRUCTIONS,
      input,
      text: {
        ...textConfig,
        verbosity:
          normalizeOptionalString(textConfig.verbosity) ||
          normalizeOptionalString(options.textVerbosity) ||
          'low',
      },
      prompt_cache_key:
        normalizeOptionalString(prebuiltRequestData.prompt_cache_key) ||
        sessionId,
    };
  }

  return {
    model: normalizeOptionalString(options.model) || OPENAI_CODEX_DEFAULT_MODEL,
    store: false,
    stream: true,
    instructions:
      normalizeOptionalString(options.instructions) ||
      OPENAI_CODEX_DEFAULT_INSTRUCTIONS,
    input,
    text: {
      verbosity: normalizeOptionalString(options.textVerbosity) || 'low',
    },
    prompt_cache_key: sessionId,
    tool_choice: 'auto',
    parallel_tool_calls: true,
  };
}

export function buildCodexResponsesHeaders(credentials, options = {}) {
  if (!credentials?.accessToken || !credentials?.accountId) {
    throw new CodexTransportError(
      'Codex transport requires accessToken and accountId credentials.',
      {
        code: 'missing_credentials',
        kind: 'auth',
      },
    );
  }

  const headers = new Headers(options.headers || {});
  headers.set('authorization', `Bearer ${credentials.accessToken}`);
  headers.set('chatgpt-account-id', credentials.accountId);
  headers.set(
    'originator',
    normalizeOptionalString(options.originator) ||
      OPENAI_CODEX_DEFAULT_ORIGINATOR,
  );
  headers.set('OpenAI-Beta', OPENAI_CODEX_RESPONSES_BETA_HEADER);
  headers.set('accept', 'text/event-stream');
  headers.set('content-type', 'application/json');

  if (options.sessionId) {
    headers.set('session_id', options.sessionId);
    headers.set('x-client-request-id', options.sessionId);
  }

  return headers;
}

export async function createCodexResponseEventStream(options = {}) {
  const authPath = options.authPath || getDefaultAuthPath();
  const sessionId = options.sessionId || createCodexRequestId();
  const body = buildCodexResponsesBody({
    ...options,
    sessionId,
  });
  const requestUrl = resolveCodexResponsesUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl || fetch;

  let credentials = options.credentials;
  if (!credentials) {
    credentials = await loadActiveCredentials({
      authPath,
      refreshAuthConfig: options.refreshAuthConfig,
      now: options.now,
    });
  }

  const response = await fetchCodexResponse({
    fetchImpl,
    requestUrl,
    body,
    credentials,
    sessionId,
    signal: options.signal,
    originator: options.originator,
    headers: options.headers,
    authPath,
    refreshAuthConfig: options.refreshAuthConfig,
    allowRefreshRetry: !options.credentials,
  });

  if (!response.body) {
    throw new CodexTransportError('Codex response body was empty.', {
      code: 'empty_body',
      kind: 'transport',
      status: response.status,
    });
  }

  return {
    authPath,
    requestUrl,
    requestId: sessionId,
    model: body.model,
    instructions: body.instructions,
    body,
    events: augmentCodexResponseEvents(parseSseEvents(response.body)),
  };
}

export async function collectCodexResponseEventStream(
  streamState,
  options = {},
) {
  const onEvent =
    typeof options.onEvent === 'function' ? options.onEvent : undefined;
  const onTextDelta =
    typeof options.onTextDelta === 'function' ? options.onTextDelta : undefined;
  const result = {
    authPath: streamState.authPath,
    requestUrl: streamState.requestUrl,
    requestId: streamState.requestId,
    model: streamState.model,
    instructions: streamState.instructions,
    body: streamState.body,
    text: '',
    responseId: null,
    responseStatus: null,
    usage: null,
    eventCount: 0,
    finalResponse: null,
  };

  let completed = false;

  for await (const event of streamState.events) {
    result.eventCount++;
    onEvent?.(event);

    const payload = event.data;
    if (!payload || typeof payload !== 'object') {
      continue;
    }

    const type = payload.type;
    if (typeof type !== 'string') {
      continue;
    }

    if (type === 'error') {
      const message = normalizeOptionalString(payload.message);
      throw new CodexTransportError(
        message || 'Codex emitted an error event.',
        {
          code: normalizeOptionalString(payload.code) || 'stream_error',
          kind: 'transport',
          details: payload,
        },
      );
    }

    if (type === 'response.created' || type === 'response.in_progress') {
      const responseState = payload.response;
      if (responseState && typeof responseState === 'object') {
        if (
          typeof responseState.id === 'string' &&
          result.responseId === null
        ) {
          result.responseId = responseState.id;
        }
        if (typeof responseState.status === 'string') {
          result.responseStatus = responseState.status;
        }
      }
      continue;
    }

    if (type === 'response.output_text.delta') {
      const delta = normalizeOptionalString(payload.delta) || '';
      result.text += delta;
      onTextDelta?.(delta, result);
      continue;
    }

    if (
      type === 'response.completed' ||
      type === 'response.done' ||
      type === 'response.incomplete'
    ) {
      const responseState = payload.response;
      if (responseState && typeof responseState === 'object') {
        result.finalResponse = responseState;
        if (typeof responseState.id === 'string') {
          result.responseId = responseState.id;
        }
        if (typeof responseState.status === 'string') {
          result.responseStatus = responseState.status;
        }
        if (responseState.usage && typeof responseState.usage === 'object') {
          result.usage = {
            inputTokens: numberOrNull(responseState.usage.input_tokens),
            outputTokens: numberOrNull(responseState.usage.output_tokens),
            totalTokens: numberOrNull(responseState.usage.total_tokens),
          };
        }
        if (
          typeof responseState.model === 'string' &&
          responseState.model.length > 0
        ) {
          result.model = responseState.model;
        }
      }
      completed = true;
      break;
    }

    if (type === 'response.failed') {
      const responseState = payload.response;
      const errorState =
        responseState && typeof responseState === 'object'
          ? responseState.error
          : undefined;
      const message =
        normalizeOptionalString(errorState?.message) ||
        'Codex response failed.';
      throw new CodexTransportError(message, {
        code: normalizeOptionalString(errorState?.code) || 'response_failed',
        kind: 'transport',
        details: payload,
      });
    }
  }

  if (!completed) {
    throw new CodexTransportError(
      'Codex stream ended before response completion.',
      {
        code: 'stream_truncated',
        kind: 'transport',
      },
    );
  }

  return result;
}

export async function requestCodexResponse(options = {}) {
  const streamState = await createCodexResponseEventStream(options);
  return collectCodexResponseEventStream(streamState, options);
}

export async function runCodexTextPrompt(options = {}) {
  return requestCodexResponse(options);
}

export async function parseCodexErrorResponse(response) {
  const raw = await response.text().catch(() => '');
  let parsed = null;
  let message = raw || response.statusText || 'Codex request failed.';
  let code = `http_${response.status}`;
  let kind = kindFromStatus(response.status);
  let retryable = RETRYABLE_STATUS_CODES.has(response.status);
  let friendlyMessage;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === 'object') {
    const parsedError =
      parsed.error && typeof parsed.error === 'object' ? parsed.error : null;
    const detail = normalizeOptionalString(parsed.detail);
    const topLevelMessage = normalizeOptionalString(parsed.message);

    if (parsedError) {
      code =
        normalizeOptionalString(parsedError.code) ||
        normalizeOptionalString(parsedError.type) ||
        code;
      message =
        normalizeOptionalString(parsedError.message) ||
        detail ||
        topLevelMessage ||
        message;

      if (
        /usage_limit_reached|usage_not_included|rate_limit_exceeded/i.test(code)
      ) {
        const plan = normalizeOptionalString(parsedError.plan_type);
        const resetAt =
          typeof parsedError.resets_at === 'number'
            ? parsedError.resets_at
            : null;
        const minutes =
          resetAt === null
            ? null
            : Math.max(
                0,
                Math.round((resetAt * 1000 - Date.now()) / 60000),
              );
        friendlyMessage = `You have hit your ChatGPT usage limit${
          plan ? ` (${plan.toLowerCase()} plan)` : ''
        }.${minutes === null ? '' : ` Try again in ~${minutes} min.`}`.trim();
        kind = 'usage_limit';
        retryable = false;
      }
    } else if (detail || topLevelMessage) {
      message = detail || topLevelMessage || message;
      if (/instructions are required/i.test(message)) {
        code = 'instructions_required';
        kind = 'invalid_request';
      } else if (
        /not supported when using Codex with a ChatGPT account/i.test(message)
      ) {
        code = 'unsupported_chatgpt_account_model';
        kind = 'invalid_request';
      }
    }
  }

  if (response.status === 401) {
    kind = 'auth';
    retryable = false;
    if (code === `http_${response.status}`) {
      code = 'unauthorized';
    }
  } else if (response.status >= 500) {
    kind = 'server';
  } else if (response.status === 429 && kind !== 'usage_limit') {
    kind = 'rate_limit';
  } else if (response.status >= 400 && kind === 'transport') {
    kind = 'invalid_request';
  }

  return new CodexTransportError(friendlyMessage || message, {
    code,
    status: response.status,
    kind,
    retryable,
    friendlyMessage,
    details: parsed || raw || undefined,
  });
}

async function fetchCodexResponse(options) {
  const headers = buildCodexResponsesHeaders(options.credentials, {
    sessionId: options.sessionId,
    originator: options.originator,
    headers: options.headers,
  });
  const response = await options.fetchImpl(options.requestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(options.body),
    signal: options.signal,
  });

  if (
    response.status === 401 &&
    options.allowRefreshRetry &&
    options.authPath &&
    !options.signal?.aborted
  ) {
    await response.arrayBuffer().catch(() => {});
    const refreshed = await refreshStoredCredentials(
      (current) =>
        refreshCredentials(current.refreshToken, options.refreshAuthConfig),
      { authPath: options.authPath },
    );
    return fetchCodexResponse({
      ...options,
      credentials: refreshed,
      allowRefreshRetry: false,
    });
  }

  if (!response.ok) {
    throw await parseCodexErrorResponse(response);
  }

  return response;
}

async function loadActiveCredentials(options = {}) {
  const authPath = options.authPath || getDefaultAuthPath();
  const credentials = await loadStoredCredentials({ authPath });
  if (!credentials) {
    throw new CodexTransportError(
      `No stored OpenAI account credentials found at ${authPath}.`,
      {
        code: 'missing_auth',
        kind: 'auth',
      },
    );
  }

  const now = typeof options.now === 'number' ? options.now : Date.now();
  if (credentials.expiresAt > now) {
    return credentials;
  }

  return refreshStoredCredentials(
    (current) =>
      refreshCredentials(current.refreshToken, options.refreshAuthConfig),
    { authPath },
  );
}

async function* parseSseEvents(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let boundary = findSseBoundary(buffer);
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + boundaryLength(buffer, boundary));
        const event = parseSseChunk(chunk);
        if (event) {
          yield event;
        }
        boundary = findSseBoundary(buffer);
      }
    }

    const finalChunk = buffer.trim();
    if (finalChunk) {
      const event = parseSseChunk(finalChunk);
      if (event) {
        yield event;
      }
    }
  } finally {
    try {
      reader.cancel();
    } catch {
      // Ignore reader shutdown failures.
    }
    try {
      reader.releaseLock();
    } catch {
      // Ignore release failures.
    }
  }
}

async function* augmentCodexResponseEvents(events) {
  const outputItems = [];

  for await (const event of events) {
    const payload = event?.data;
    if (payload && typeof payload === 'object') {
      trackCodexOutputItems(outputItems, payload);
      if (isCodexTerminalResponseEvent(payload.type)) {
        yield withAugmentedTerminalOutput(event, outputItems);
        continue;
      }
    }

    yield event;
  }
}

function trackCodexOutputItems(outputItems, payload) {
  if (payload.type === 'response.output_item.added') {
    if (
      Number.isInteger(payload.output_index) &&
      payload.output_index >= 0 &&
      payload.item &&
      typeof payload.item === 'object'
    ) {
      outputItems[payload.output_index] = structuredClone(payload.item);
    }
    return;
  }

  if (payload.type === 'response.output_item.done') {
    if (
      Number.isInteger(payload.output_index) &&
      payload.output_index >= 0 &&
      payload.item &&
      typeof payload.item === 'object'
    ) {
      outputItems[payload.output_index] = structuredClone(payload.item);
    }
    return;
  }

  if (
    payload.type === 'response.content_part.added' ||
    payload.type === 'response.content_part.done'
  ) {
    const item = getTrackedOutputItem(outputItems, payload.output_index);
    if (!item) {
      return;
    }
    if (!Array.isArray(item.content)) {
      item.content = [];
    }
    if (
      Number.isInteger(payload.content_index) &&
      payload.content_index >= 0 &&
      payload.part &&
      typeof payload.part === 'object'
    ) {
      item.content[payload.content_index] = structuredClone(payload.part);
    }
    return;
  }

  if (payload.type === 'response.output_text.done') {
    const item = getTrackedOutputItem(outputItems, payload.output_index);
    if (!item) {
      return;
    }
    if (!Array.isArray(item.content)) {
      item.content = [];
    }
    if (
      Number.isInteger(payload.content_index) &&
      payload.content_index >= 0 &&
      typeof payload.text === 'string'
    ) {
      const part =
        item.content[payload.content_index] &&
        typeof item.content[payload.content_index] === 'object'
          ? item.content[payload.content_index]
          : { type: 'output_text' };
      item.content[payload.content_index] = {
        ...part,
        text: payload.text,
      };
    }
  }
}

function getTrackedOutputItem(outputItems, outputIndex) {
  return Number.isInteger(outputIndex) && outputIndex >= 0
    ? outputItems[outputIndex]
    : null;
}

function isCodexTerminalResponseEvent(type) {
  return (
    type === 'response.completed' ||
    type === 'response.done' ||
    type === 'response.failed' ||
    type === 'response.incomplete'
  );
}

function withAugmentedTerminalOutput(event, outputItems) {
  const payload = event?.data;
  const responseState =
    payload?.response && typeof payload.response === 'object'
      ? payload.response
      : null;
  if (!responseState || hasNonEmptyArray(responseState.output)) {
    return event;
  }

  const synthesizedOutput = outputItems.filter(Boolean);
  if (synthesizedOutput.length === 0) {
    return event;
  }

  return {
    ...event,
    data: {
      ...payload,
      response: {
        ...responseState,
        output: synthesizedOutput.map((item) => structuredClone(item)),
      },
    },
  };
}

function findSseBoundary(buffer) {
  const windowsBoundary = buffer.indexOf('\r\n\r\n');
  const unixBoundary = buffer.indexOf('\n\n');
  if (windowsBoundary === -1) {
    return unixBoundary;
  }
  if (unixBoundary === -1) {
    return windowsBoundary;
  }
  return Math.min(windowsBoundary, unixBoundary);
}

function boundaryLength(buffer, boundaryIndex) {
  return buffer.startsWith('\r\n\r\n', boundaryIndex) ? 4 : 2;
}

function parseSseChunk(chunk) {
  const normalized = chunk.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  let eventName = 'message';
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() || eventName;
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const rawData = dataLines.join('\n').trim();
  if (!rawData || rawData === '[DONE]') {
    return null;
  }

  try {
    return {
      event: eventName,
      data: JSON.parse(rawData),
      rawData,
    };
  } catch {
    return {
      event: eventName,
      data: null,
      rawData,
    };
  }
}

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function kindFromStatus(status) {
  if (status === 401) {
    return 'auth';
  }
  if (status === 429) {
    return 'rate_limit';
  }
  if (status >= 500) {
    return 'server';
  }
  if (status >= 400) {
    return 'invalid_request';
  }
  return 'transport';
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

import { setDefaultModelProvider } from '@openai/agents-core';
import { OpenAIResponsesModel } from '@openai/agents-openai';
import {
  CodexTransportError,
  OPENAI_CODEX_DEFAULT_MODEL,
  OPENAI_CODEX_DEFAULT_ORIGINATOR,
  collectCodexResponseEventStream,
  createCodexResponseEventStream,
} from './codex-transport.mjs';

export const OPENAI_CODEX_AGENTS_PROVIDER_NAME = 'openai-codex';
export const OPENAI_CODEX_AGENTS_MODEL_PREFIX = `${OPENAI_CODEX_AGENTS_PROVIDER_NAME}/`;
export const OPENAI_CODEX_AGENTS_MODEL_PREFIX_ALT = `${OPENAI_CODEX_AGENTS_PROVIDER_NAME}:`;

export function normalizeOpenAICodexModelName(modelName) {
  const normalized = normalizeOptionalString(modelName);
  if (!normalized || normalized === OPENAI_CODEX_AGENTS_PROVIDER_NAME) {
    return OPENAI_CODEX_DEFAULT_MODEL;
  }
  if (normalized.startsWith(OPENAI_CODEX_AGENTS_MODEL_PREFIX)) {
    return (
      normalizeOptionalString(
        normalized.slice(OPENAI_CODEX_AGENTS_MODEL_PREFIX.length),
      ) || OPENAI_CODEX_DEFAULT_MODEL
    );
  }
  if (normalized.startsWith(OPENAI_CODEX_AGENTS_MODEL_PREFIX_ALT)) {
    return (
      normalizeOptionalString(
        normalized.slice(OPENAI_CODEX_AGENTS_MODEL_PREFIX_ALT.length),
      ) || OPENAI_CODEX_DEFAULT_MODEL
    );
  }
  return normalized;
}

export class OpenAICodexResponsesModel extends OpenAIResponsesModel {
  constructor(model, options = {}) {
    super(createOpenAICodexResponsesClient(options), model);
  }

  getRetryAdvice(args) {
    if (args?.error instanceof CodexTransportError) {
      return {
        suggested: args.error.retryable,
        reason: args.error.friendlyMessage || args.error.message,
        normalized: {
          statusCode: args.error.status,
          errorCode: args.error.code,
          isNetworkError:
            args.error.kind === 'transport' || args.error.kind === 'server',
          isAbort: false,
        },
      };
    }

    if (args?.error?.name === 'AbortError') {
      return {
        suggested: false,
        reason: 'The Codex account request was aborted.',
        normalized: {
          isAbort: true,
          isNetworkError: false,
        },
      };
    }

    return undefined;
  }
}

export class OpenAICodexModelProvider {
  #options;
  #modelCache = new Map();

  constructor(options = {}) {
    this.#options = {
      ...options,
      defaultModel:
        normalizeOptionalString(options.defaultModel) ||
        OPENAI_CODEX_DEFAULT_MODEL,
      originator:
        normalizeOptionalString(options.originator) ||
        OPENAI_CODEX_DEFAULT_ORIGINATOR,
    };
  }

  getModel(modelName) {
    const resolvedModel = normalizeOpenAICodexModelName(
      modelName || this.#options.defaultModel,
    );
    const cacheKey = JSON.stringify([
      resolvedModel,
      this.#options.authPath || null,
      this.#options.baseUrl || null,
      this.#options.originator || null,
    ]);
    const cached = this.#modelCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const model = new OpenAICodexResponsesModel(resolvedModel, this.#options);
    this.#modelCache.set(cacheKey, model);
    return model;
  }

  async close() {
    const cachedModels = Array.from(new Set(this.#modelCache.values()));
    this.#modelCache.clear();
    await Promise.all(
      cachedModels.map(async (model) => {
        if (typeof model.close === 'function') {
          await model.close();
        }
      }),
    );
  }
}

export function createOpenAICodexResponsesClient(options = {}) {
  return {
    responses: {
      create(requestData, requestOptions = {}) {
        return createCodexResponsesOperation(
          {
            authPath: options.authPath,
            baseUrl: options.baseUrl,
            originator: options.originator,
            refreshAuthConfig: options.refreshAuthConfig,
          },
          requestData,
          requestOptions,
        );
      },
    },
  };
}

export function createOpenAICodexModelProvider(options = {}) {
  return new OpenAICodexModelProvider(options);
}

export function configureDefaultOpenAICodexModelProvider(options = {}) {
  const provider =
    options instanceof OpenAICodexModelProvider
      ? options
      : new OpenAICodexModelProvider(options);
  setDefaultModelProvider(provider);
  return provider;
}

function createCodexResponsesOperation(
  providerOptions,
  requestData,
  requestOptions = {},
) {
  if (requestData?.stream === true) {
    return {
      async withResponse() {
        const streamState = await createCodexResponseEventStream(
          resolveCodexCreateOptions(
            providerOptions,
            requestData,
            requestOptions,
            true,
          ),
        );
        return {
          data: createRawResponsesEventIterable(streamState.events),
          request_id: streamState.requestId,
        };
      },
    };
  }

  return (async () => {
    const streamState = await createCodexResponseEventStream(
      resolveCodexCreateOptions(
        providerOptions,
        requestData,
        requestOptions,
        false,
      ),
    );
    const result = await collectCodexResponseEventStream(streamState);
    if (!result.finalResponse || typeof result.finalResponse !== 'object') {
      throw new CodexTransportError(
        'Codex account provider did not return a final response payload.',
        {
          code: 'missing_final_response',
          kind: 'transport',
        },
      );
    }
    return attachResponseRequestId(result.finalResponse, streamState.requestId);
  })();
}

function resolveCodexCreateOptions(
  providerOptions,
  requestData,
  requestOptions,
  forceStream,
) {
  const { requestData: strippedRequestData, codexOptions } =
    stripOpenAICodexProviderData(requestData);
  return {
    authPath:
      normalizeOptionalString(codexOptions.authPath) ||
      normalizeOptionalString(codexOptions.auth_path) ||
      normalizeOptionalString(providerOptions.authPath) ||
      undefined,
    baseUrl:
      normalizeOptionalString(codexOptions.baseUrl) ||
      normalizeOptionalString(codexOptions.base_url) ||
      normalizeOptionalString(providerOptions.baseUrl) ||
      undefined,
    originator:
      normalizeOptionalString(codexOptions.originator) ||
      normalizeOptionalString(providerOptions.originator) ||
      OPENAI_CODEX_DEFAULT_ORIGINATOR,
    refreshAuthConfig:
      codexOptions.refreshAuthConfig || providerOptions.refreshAuthConfig,
    headers: requestOptions.headers,
    signal: requestOptions.signal,
    requestData: {
      ...strippedRequestData,
      stream: forceStream ? true : strippedRequestData.stream,
    },
  };
}

function stripOpenAICodexProviderData(requestData) {
  const normalizedRequestData =
    requestData &&
    typeof requestData === 'object' &&
    !Array.isArray(requestData)
      ? { ...requestData }
      : {};
  const nestedCamel =
    normalizedRequestData.openaiCodex &&
    typeof normalizedRequestData.openaiCodex === 'object' &&
    !Array.isArray(normalizedRequestData.openaiCodex)
      ? normalizedRequestData.openaiCodex
      : null;
  const nestedSnake =
    normalizedRequestData.openai_codex &&
    typeof normalizedRequestData.openai_codex === 'object' &&
    !Array.isArray(normalizedRequestData.openai_codex)
      ? normalizedRequestData.openai_codex
      : null;

  delete normalizedRequestData.openaiCodex;
  delete normalizedRequestData.openai_codex;

  return {
    requestData: normalizedRequestData,
    codexOptions: {
      ...(nestedSnake || {}),
      ...(nestedCamel || {}),
    },
  };
}

async function* createRawResponsesEventIterable(events) {
  for await (const event of events) {
    const payload = event?.data;
    if (!payload || typeof payload !== 'object') {
      continue;
    }
    if (payload.type === 'error') {
      throw new CodexTransportError(
        normalizeOptionalString(payload.message) ||
          'Codex emitted an error event.',
        {
          code: normalizeOptionalString(payload.code) || 'stream_error',
          kind: 'transport',
          details: payload,
        },
      );
    }
    yield payload;
  }
}

function attachResponseRequestId(response, requestId) {
  if (!requestId) {
    return response;
  }
  try {
    Object.defineProperty(response, '_request_id', {
      value: requestId,
      enumerable: false,
    });
  } catch {
    // Ignore frozen response objects and return the raw response.
  }
  return response;
}

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  resolveRepoRelativePath,
  type RepoPathOptions,
} from '../config/repo-paths.js';
import type {
  AgentRuntimeAuthReadiness,
  AgentRuntimeConfig,
  OpenAICodexModelProviderLike,
} from './agent-runtime-contract.js';
import type { AgentRuntimeConfigDefaults } from './agent-runtime-config.js';

type StoredCredentialsStatus =
  | {
      authPath: string;
      authenticated: false;
      reason: 'invalid' | 'missing';
    }
  | {
      accountId: string;
      authPath: string;
      authenticated: true;
      expired: boolean;
      expiresAt: number;
      updatedAt?: string;
    };

export type OpenAIAccountAuthModule = {
  OPENAI_CODEX_DEFAULT_MODEL: string;
  OPENAI_CODEX_DEFAULT_ORIGINATOR: string;
  OPENAI_CODEX_RESPONSES_BASE_URL: string;
  configureDefaultOpenAICodexModelProvider: (
    providerOrOptions: OpenAICodexModelProviderLike | Record<string, unknown>,
  ) => unknown;
  createOpenAICodexModelProvider: (options?: {
    authPath?: string;
    baseUrl?: string;
    defaultModel?: string;
    originator?: string;
  }) => OpenAICodexModelProviderLike;
  getStoredCredentialsStatus: (options?: {
    authPath?: string;
    now?: number;
  }) => Promise<StoredCredentialsStatus>;
  normalizeOpenAICodexModelName: (modelName?: string) => string;
};

export type OpenAIAccountModuleRef = {
  importPath: string;
  module: OpenAIAccountAuthModule;
};

export type OpenAIAccountProviderOptions = RepoPathOptions & {
  authModuleImportPath?: string;
  now?: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertStringExport(
  value: unknown,
  exportName: string,
  importPath: string,
): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `OpenAI account auth module ${importPath} is missing string export ${exportName}.`,
    );
  }

  return value;
}

function assertFunctionExport<T extends (...args: never[]) => unknown>(
  value: unknown,
  exportName: string,
  importPath: string,
): T {
  if (typeof value !== 'function') {
    throw new Error(
      `OpenAI account auth module ${importPath} is missing function export ${exportName}.`,
    );
  }

  return value as T;
}

function toModuleImportPath(
  options: OpenAIAccountProviderOptions = {},
): string {
  const providedPath = options.authModuleImportPath?.trim();

  if (providedPath) {
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(providedPath)) {
      return providedPath;
    }

    return pathToFileURL(
      resolve(options.repoRoot ?? process.cwd(), providedPath),
    ).href;
  }

  return pathToFileURL(
    resolveRepoRelativePath(
      'scripts/lib/openai-account-auth/index.mjs',
      options,
    ),
  ).href;
}

function toDefaults(
  moduleRef: OpenAIAccountModuleRef,
  options: RepoPathOptions = {},
): AgentRuntimeConfigDefaults {
  return {
    authPath: resolveRepoRelativePath('data/openai-account-auth.json', options),
    baseUrl: moduleRef.module.OPENAI_CODEX_RESPONSES_BASE_URL,
    model: moduleRef.module.OPENAI_CODEX_DEFAULT_MODEL,
    originator: moduleRef.module.OPENAI_CODEX_DEFAULT_ORIGINATOR,
  };
}

function toMissingAuthSummary(authPath: string): AgentRuntimeAuthReadiness {
  return {
    accountId: null,
    authPath,
    expiresAt: null,
    message: `Stored OpenAI account credentials are required at ${authPath}.`,
    nextSteps: ['npm run auth:openai -- login'],
    state: 'auth-required',
    updatedAt: null,
  };
}

function toInvalidAuthSummary(authPath: string): AgentRuntimeAuthReadiness {
  return {
    accountId: null,
    authPath,
    expiresAt: null,
    message: `Stored OpenAI account credentials are invalid at ${authPath}.`,
    nextSteps: [
      'npm run auth:openai -- logout',
      'npm run auth:openai -- login',
    ],
    state: 'invalid-auth',
    updatedAt: null,
  };
}

function toExpiredAuthSummary(
  status: Extract<StoredCredentialsStatus, { authenticated: true }>,
): AgentRuntimeAuthReadiness {
  return {
    accountId: status.accountId,
    authPath: status.authPath,
    expiresAt: status.expiresAt,
    message: `Stored OpenAI account credentials are expired at ${status.authPath}.`,
    nextSteps: [
      'npm run auth:openai -- refresh',
      'npm run auth:openai -- reauth',
    ],
    state: 'expired-auth',
    updatedAt: status.updatedAt ?? null,
  };
}

function toReadyAuthSummary(
  status: Extract<StoredCredentialsStatus, { authenticated: true }>,
): AgentRuntimeAuthReadiness & {
  state: 'ready';
} {
  return {
    accountId: status.accountId,
    authPath: status.authPath,
    expiresAt: status.expiresAt,
    message: `Stored OpenAI account credentials are ready at ${status.authPath}.`,
    nextSteps: [
      'npm run codex:smoke -- --json',
      'npm run agents:codex:smoke -- --json',
    ],
    state: 'ready',
    updatedAt: status.updatedAt ?? null,
  };
}

export async function loadOpenAIAccountModule(
  options: OpenAIAccountProviderOptions = {},
): Promise<OpenAIAccountModuleRef> {
  const importPath = toModuleImportPath(options);
  const loadedModule = await import(importPath);

  if (!isObject(loadedModule)) {
    throw new Error(
      `OpenAI account auth module ${importPath} did not resolve to an object export.`,
    );
  }

  return {
    importPath,
    module: {
      OPENAI_CODEX_DEFAULT_MODEL: assertStringExport(
        loadedModule.OPENAI_CODEX_DEFAULT_MODEL,
        'OPENAI_CODEX_DEFAULT_MODEL',
        importPath,
      ),
      OPENAI_CODEX_DEFAULT_ORIGINATOR: assertStringExport(
        loadedModule.OPENAI_CODEX_DEFAULT_ORIGINATOR,
        'OPENAI_CODEX_DEFAULT_ORIGINATOR',
        importPath,
      ),
      OPENAI_CODEX_RESPONSES_BASE_URL: assertStringExport(
        loadedModule.OPENAI_CODEX_RESPONSES_BASE_URL,
        'OPENAI_CODEX_RESPONSES_BASE_URL',
        importPath,
      ),
      configureDefaultOpenAICodexModelProvider: assertFunctionExport(
        loadedModule.configureDefaultOpenAICodexModelProvider,
        'configureDefaultOpenAICodexModelProvider',
        importPath,
      ),
      createOpenAICodexModelProvider: assertFunctionExport(
        loadedModule.createOpenAICodexModelProvider,
        'createOpenAICodexModelProvider',
        importPath,
      ),
      getStoredCredentialsStatus: assertFunctionExport(
        loadedModule.getStoredCredentialsStatus,
        'getStoredCredentialsStatus',
        importPath,
      ),
      normalizeOpenAICodexModelName: assertFunctionExport(
        loadedModule.normalizeOpenAICodexModelName,
        'normalizeOpenAICodexModelName',
        importPath,
      ),
    },
  };
}

export async function getOpenAIAccountProviderDefaults(
  options: OpenAIAccountProviderOptions = {},
): Promise<{
  defaults: AgentRuntimeConfigDefaults;
  moduleRef: OpenAIAccountModuleRef;
}> {
  const moduleRef = await loadOpenAIAccountModule(options);

  return {
    defaults: toDefaults(moduleRef, options),
    moduleRef,
  };
}

export async function inspectOpenAIAccountReadiness(
  config: AgentRuntimeConfig,
  options: OpenAIAccountProviderOptions & {
    moduleRef?: OpenAIAccountModuleRef;
  } = {},
): Promise<AgentRuntimeAuthReadiness> {
  const moduleRef =
    options.moduleRef ?? (await loadOpenAIAccountModule(options));
  const statusOptions: {
    authPath?: string;
    now?: number;
  } = {
    authPath: config.authPath,
  };

  if (options.now !== undefined) {
    statusOptions.now = options.now;
  }

  const status =
    await moduleRef.module.getStoredCredentialsStatus(statusOptions);

  if (!status.authenticated) {
    return status.reason === 'invalid'
      ? toInvalidAuthSummary(status.authPath)
      : toMissingAuthSummary(status.authPath);
  }

  if (status.expired) {
    return toExpiredAuthSummary(status);
  }

  return toReadyAuthSummary(status);
}

export async function createConfiguredOpenAIAccountProvider(
  config: AgentRuntimeConfig,
  options: OpenAIAccountProviderOptions & {
    moduleRef?: OpenAIAccountModuleRef;
  } = {},
): Promise<{
  model: string;
  provider: OpenAICodexModelProviderLike;
}> {
  const moduleRef =
    options.moduleRef ?? (await loadOpenAIAccountModule(options));
  const model = moduleRef.module.normalizeOpenAICodexModelName(config.model);
  const provider = moduleRef.module.createOpenAICodexModelProvider({
    authPath: config.authPath,
    baseUrl: config.baseUrl,
    defaultModel: model,
    originator: config.originator,
  });

  provider.getModel(model);
  moduleRef.module.configureDefaultOpenAICodexModelProvider(provider);

  return {
    model,
    provider,
  };
}

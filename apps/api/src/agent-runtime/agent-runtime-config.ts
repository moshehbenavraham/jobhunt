import { resolve } from 'node:path';
import type { RepoPathOptions } from '../config/repo-paths.js';
import type { AgentRuntimeConfig } from './agent-runtime-contract.js';

export const AGENT_RUNTIME_AUTH_PATH_ENV =
  'JOBHUNT_API_OPENAI_AUTH_PATH' as const;
export const AGENT_RUNTIME_BASE_URL_ENV =
  'JOBHUNT_API_OPENAI_BASE_URL' as const;
export const AGENT_RUNTIME_MODEL_ENV = 'JOBHUNT_API_OPENAI_MODEL' as const;
export const AGENT_RUNTIME_ORIGINATOR_ENV =
  'JOBHUNT_API_OPENAI_ORIGINATOR' as const;

export type AgentRuntimeConfigDefaults = {
  authPath: string;
  baseUrl: string;
  model: string;
  originator: string;
};

export type AgentRuntimeConfigOverrides = Partial<
  Pick<AgentRuntimeConfig, 'authPath' | 'baseUrl' | 'model' | 'originator'>
>;

type AgentRuntimeEnv = {
  [AGENT_RUNTIME_AUTH_PATH_ENV]?: string;
  [AGENT_RUNTIME_BASE_URL_ENV]?: string;
  [AGENT_RUNTIME_MODEL_ENV]?: string;
  [AGENT_RUNTIME_ORIGINATOR_ENV]?: string;
};

export class AgentRuntimeConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentRuntimeConfigValidationError';
  }
}

function normalizeRequiredString(
  value: string | undefined,
  fieldName: string,
): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new AgentRuntimeConfigValidationError(
      `Invalid ${fieldName} value: expected a non-empty string.`,
    );
  }

  return normalized;
}

function resolveAuthPath(
  value: string,
  options: RepoPathOptions = {},
): string {
  const normalized = normalizeRequiredString(value, AGENT_RUNTIME_AUTH_PATH_ENV);
  const basePath = options.repoRoot ?? process.cwd();
  return resolve(basePath, normalized);
}

function resolveBaseUrl(value: string): string {
  const normalized = normalizeRequiredString(value, AGENT_RUNTIME_BASE_URL_ENV)
    .replace(/\/+$/g, '');
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalized);
  } catch (error) {
    throw new AgentRuntimeConfigValidationError(
      `Invalid ${AGENT_RUNTIME_BASE_URL_ENV} value: ${normalized}. Expected an absolute URL.`,
    );
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new AgentRuntimeConfigValidationError(
      `Invalid ${AGENT_RUNTIME_BASE_URL_ENV} value: ${normalized}. Expected an http or https URL.`,
    );
  }

  return normalized;
}

function resolveOriginator(value: string): string {
  return normalizeRequiredString(value, AGENT_RUNTIME_ORIGINATOR_ENV);
}

function resolveModel(value: string): string {
  return normalizeRequiredString(value, AGENT_RUNTIME_MODEL_ENV);
}

export function createAgentRuntimeConfig(
  defaults: AgentRuntimeConfigDefaults,
  options: RepoPathOptions & AgentRuntimeConfigOverrides = {},
): AgentRuntimeConfig {
  return {
    authPath: resolveAuthPath(options.authPath ?? defaults.authPath, options),
    baseUrl: resolveBaseUrl(options.baseUrl ?? defaults.baseUrl),
    model: resolveModel(options.model ?? defaults.model),
    originator: resolveOriginator(options.originator ?? defaults.originator),
    overrides: {
      authPath: options.authPath !== undefined,
      baseUrl: options.baseUrl !== undefined,
      model: options.model !== undefined,
      originator: options.originator !== undefined,
    },
  };
}

export function readAgentRuntimeConfigFromEnv(
  defaults: AgentRuntimeConfigDefaults,
  env: AgentRuntimeEnv = process.env,
  options: RepoPathOptions & AgentRuntimeConfigOverrides = {},
): AgentRuntimeConfig {
  const configOverrides: RepoPathOptions & AgentRuntimeConfigOverrides = {};

  if (options.repoRoot !== undefined) {
    configOverrides.repoRoot = options.repoRoot;
  }

  if (options.startDirectory !== undefined) {
    configOverrides.startDirectory = options.startDirectory;
  }

  const authPath = options.authPath ?? env[AGENT_RUNTIME_AUTH_PATH_ENV];
  const baseUrl = options.baseUrl ?? env[AGENT_RUNTIME_BASE_URL_ENV];
  const model = options.model ?? env[AGENT_RUNTIME_MODEL_ENV];
  const originator = options.originator ?? env[AGENT_RUNTIME_ORIGINATOR_ENV];

  if (authPath !== undefined) {
    configOverrides.authPath = authPath;
  }

  if (baseUrl !== undefined) {
    configOverrides.baseUrl = baseUrl;
  }

  if (model !== undefined) {
    configOverrides.model = model;
  }

  if (originator !== undefined) {
    configOverrides.originator = originator;
  }

  return createAgentRuntimeConfig(defaults, configOverrides);
}

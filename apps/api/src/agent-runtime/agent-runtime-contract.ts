import type {
  PromptBundle,
  PromptSourceKey,
  WorkflowIntent,
} from '../prompt/index.js';

export const AGENT_RUNTIME_AUTH_STATES = [
  'auth-required',
  'expired-auth',
  'invalid-auth',
  'ready',
] as const;

export type AgentRuntimeAuthState = (typeof AGENT_RUNTIME_AUTH_STATES)[number];

export const AGENT_RUNTIME_PROMPT_STATES = [
  'empty',
  'missing',
  'ready',
  'unsupported-workflow',
] as const;

export type AgentRuntimePromptState = (typeof AGENT_RUNTIME_PROMPT_STATES)[number];

export const AGENT_RUNTIME_READINESS_STATUSES = [
  'auth-required',
  'expired-auth',
  'invalid-auth',
  'prompt-failure',
  'ready',
] as const;

export type AgentRuntimeReadinessStatus =
  (typeof AGENT_RUNTIME_READINESS_STATUSES)[number];

export const AGENT_RUNTIME_BOOTSTRAP_ERROR_CODES = [
  'auth-required',
  'expired-auth',
  'invalid-auth',
  'prompt-empty',
  'prompt-missing',
  'provider-bootstrap-failed',
  'unsupported-workflow',
] as const;

export type AgentRuntimeBootstrapErrorCode =
  (typeof AGENT_RUNTIME_BOOTSTRAP_ERROR_CODES)[number];

export type AgentRuntimeConfig = {
  authPath: string;
  baseUrl: string;
  model: string;
  originator: string;
  overrides: {
    authPath: boolean;
    baseUrl: boolean;
    model: boolean;
    originator: boolean;
  };
};

export type AgentRuntimeAuthReadiness = {
  accountId: string | null;
  authPath: string;
  expiresAt: number | null;
  message: string;
  nextSteps: string[];
  state: AgentRuntimeAuthState;
  updatedAt: string | null;
};

export type AgentRuntimePromptSummary = {
  emptySources: PromptSourceKey[];
  issues: string[];
  message: string;
  missingSources: PromptSourceKey[];
  modeRepoRelativePath: string | null;
  requestedWorkflow: string | null;
  state: AgentRuntimePromptState;
  supportedWorkflows: readonly WorkflowIntent[];
  workflow: WorkflowIntent | null;
};

export type AgentRuntimeReadinessSummary = {
  auth: AgentRuntimeAuthReadiness;
  config: AgentRuntimeConfig;
  message: string;
  prompt: AgentRuntimePromptSummary | null;
  status: AgentRuntimeReadinessStatus;
};

export type OpenAICodexModelProviderLike = {
  close: () => Promise<void>;
  getModel: (modelName?: string) => unknown;
};

export type AgentRuntimeBootstrap = {
  auth: AgentRuntimeAuthReadiness & {
    state: 'ready';
  };
  config: AgentRuntimeConfig;
  model: string;
  prompt: AgentRuntimePromptSummary & {
    modeRepoRelativePath: string;
    requestedWorkflow: string;
    state: 'ready';
    workflow: WorkflowIntent;
  };
  promptBundle: PromptBundle;
  provider: OpenAICodexModelProviderLike;
  startedAt: string;
  status: 'ready';
};

export type AgentRuntimeService = {
  bootstrap: (workflowInput: unknown) => Promise<AgentRuntimeBootstrap>;
  close: () => Promise<void>;
  getReadiness: () => Promise<AgentRuntimeReadinessSummary>;
};

export class AgentRuntimeBootstrapError extends Error {
  auth?: AgentRuntimeAuthReadiness;
  code: AgentRuntimeBootstrapErrorCode;
  prompt?: AgentRuntimePromptSummary;

  constructor(
    code: AgentRuntimeBootstrapErrorCode,
    message: string,
    options: {
      auth?: AgentRuntimeAuthReadiness;
      cause?: unknown;
      prompt?: AgentRuntimePromptSummary;
    } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'AgentRuntimeBootstrapError';
    this.code = code;

    if (options.auth) {
      this.auth = options.auth;
    }

    if (options.prompt) {
      this.prompt = options.prompt;
    }
  }
}

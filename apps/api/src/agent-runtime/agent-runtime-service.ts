import {
  createPromptLoader,
  type PromptLoader,
  type PromptLoaderResult,
  type PromptSourceKey,
  WORKFLOW_INTENTS,
} from '../prompt/index.js';
import { createWorkspaceAdapter, type WorkspaceAdapter } from '../workspace/index.js';
import type { RepoPathOptions } from '../config/repo-paths.js';
import {
  AgentRuntimeBootstrapError,
  type AgentRuntimeAuthReadiness,
  type AgentRuntimeBootstrap,
  type AgentRuntimeConfig,
  type AgentRuntimePromptSummary,
  type AgentRuntimeReadinessSummary,
  type AgentRuntimeService,
  type OpenAICodexModelProviderLike,
} from './agent-runtime-contract.js';
import { readAgentRuntimeConfigFromEnv } from './agent-runtime-config.js';
import {
  createConfiguredOpenAIAccountProvider,
  getOpenAIAccountProviderDefaults,
  inspectOpenAIAccountReadiness,
  type OpenAIAccountModuleRef,
} from './openai-account-provider.js';

type AgentRuntimeServiceOptions = RepoPathOptions & {
  authModuleImportPath?: string;
  env?: NodeJS.ProcessEnv;
  now?: number;
  promptLoader?: PromptLoader;
  workspace?: WorkspaceAdapter;
};

type CachedProviderState = {
  key: string;
  provider: OpenAICodexModelProviderLike;
};

const BASELINE_PROMPT_SURFACES = [
  {
    promptKey: 'agents-guide',
    surfaceKey: 'agentsGuide',
  },
  {
    promptKey: 'shared-mode',
    surfaceKey: 'sharedMode',
  },
  {
    promptKey: 'profile-mode',
    surfaceKey: 'profileMode',
  },
  {
    promptKey: 'profile-config',
    surfaceKey: 'profileConfig',
  },
  {
    promptKey: 'profile-cv',
    surfaceKey: 'profileCv',
  },
] as const;

function toPromptIssues(
  prefix: string,
  promptKeys: readonly PromptSourceKey[],
): string[] {
  return promptKeys.map((promptKey) => `${prefix}: ${promptKey}`);
}

function toPromptSummary(
  result: PromptLoaderResult,
): {
  promptBundle: AgentRuntimeBootstrap['promptBundle'] | null;
  summary: AgentRuntimePromptSummary;
} {
  switch (result.state) {
    case 'ready':
      return {
        promptBundle: result.bundle,
        summary: {
          emptySources: [],
          issues: [],
          message: `Prompt bundle for workflow ${result.workflow} is ready.`,
          missingSources: [],
          modeRepoRelativePath: result.bundle.workflow.modeRepoRelativePath,
          requestedWorkflow: result.requestedWorkflow,
          state: 'ready',
          supportedWorkflows: result.supportedWorkflows,
          workflow: result.workflow,
        },
      };
    case 'missing': {
      const missingSources = result.missingSources.map((source) => source.key);
      return {
        promptBundle: null,
        summary: {
          emptySources: [],
          issues: toPromptIssues('Missing prompt source', missingSources),
          message: `Prompt bundle for workflow ${result.workflow} is missing required sources.`,
          missingSources,
          modeRepoRelativePath: result.bundle.workflow.modeRepoRelativePath,
          requestedWorkflow: result.requestedWorkflow,
          state: 'missing',
          supportedWorkflows: result.supportedWorkflows,
          workflow: result.workflow,
        },
      };
    }
    case 'empty': {
      const emptySources = result.emptySources.map((source) => source.key);
      return {
        promptBundle: null,
        summary: {
          emptySources,
          issues: toPromptIssues('Empty prompt source', emptySources),
          message: `Prompt bundle for workflow ${result.workflow} has empty required sources.`,
          missingSources: [],
          modeRepoRelativePath: result.bundle.workflow.modeRepoRelativePath,
          requestedWorkflow: result.requestedWorkflow,
          state: 'empty',
          supportedWorkflows: result.supportedWorkflows,
          workflow: result.workflow,
        },
      };
    }
    case 'unsupported-workflow':
      return {
        promptBundle: null,
        summary: {
          emptySources: [],
          issues: [...result.issues],
          message:
            result.issues[0] ??
            `Unsupported workflow ${result.requestedWorkflow}.`,
          missingSources: [],
          modeRepoRelativePath: null,
          requestedWorkflow: result.requestedWorkflow,
          state: 'unsupported-workflow',
          supportedWorkflows: result.supportedWorkflows,
          workflow: null,
        },
      };
    case 'loading':
      return {
        promptBundle: null,
        summary: {
          emptySources: [],
          issues: ['Prompt loader did not resolve before bootstrap.'],
          message: 'Prompt loader is still resolving the requested workflow.',
          missingSources: [],
          modeRepoRelativePath: null,
          requestedWorkflow: result.requestedWorkflow,
          state: 'unsupported-workflow',
          supportedWorkflows: result.supportedWorkflows,
          workflow: result.workflow,
        },
      };
  }
}

async function inspectBaselinePromptReadiness(
  workspace: WorkspaceAdapter,
): Promise<AgentRuntimePromptSummary> {
  const results = await Promise.all(
    BASELINE_PROMPT_SURFACES.map(async (entry) => ({
      promptKey: entry.promptKey,
      result: await workspace.readSurface(entry.surfaceKey),
    })),
  );
  const missingSources = results
    .filter((entry) => entry.result.status === 'missing')
    .map((entry) => entry.promptKey);
  const emptySources = results
    .filter(
      (entry) =>
        entry.result.status === 'found' &&
        typeof entry.result.value === 'string' &&
        entry.result.value.trim().length === 0,
    )
    .map((entry) => entry.promptKey);

  if (missingSources.length > 0) {
    return {
      emptySources: [],
      issues: toPromptIssues('Missing prompt prerequisite', missingSources),
      message:
        'Prompt bootstrap is blocked because required prompt prerequisites are missing.',
      missingSources,
      modeRepoRelativePath: null,
      requestedWorkflow: null,
      state: 'missing',
      supportedWorkflows: WORKFLOW_INTENTS,
      workflow: null,
    };
  }

  if (emptySources.length > 0) {
    return {
      emptySources,
      issues: toPromptIssues('Empty prompt prerequisite', emptySources),
      message:
        'Prompt bootstrap is blocked because required prompt prerequisites are empty.',
      missingSources: [],
      modeRepoRelativePath: null,
      requestedWorkflow: null,
      state: 'empty',
      supportedWorkflows: WORKFLOW_INTENTS,
      workflow: null,
    };
  }

  return {
    emptySources: [],
    issues: [],
    message: 'Prompt bootstrap prerequisites are ready.',
    missingSources: [],
    modeRepoRelativePath: null,
    requestedWorkflow: null,
    state: 'ready',
    supportedWorkflows: WORKFLOW_INTENTS,
    workflow: null,
  };
}

function getReadinessStatus(
  auth: AgentRuntimeAuthReadiness,
  prompt: AgentRuntimePromptSummary,
): AgentRuntimeReadinessSummary['status'] {
  if (auth.state !== 'ready') {
    return auth.state;
  }

  if (prompt.state === 'missing' || prompt.state === 'empty') {
    return 'prompt-failure';
  }

  return 'ready';
}

function getReadinessMessage(
  auth: AgentRuntimeAuthReadiness,
  prompt: AgentRuntimePromptSummary,
): string {
  if (auth.state !== 'ready') {
    return auth.message;
  }

  if (prompt.state === 'missing' || prompt.state === 'empty') {
    return prompt.message;
  }

  return 'Authenticated agent runtime prerequisites are ready.';
}

function toProviderKey(
  moduleRef: OpenAIAccountModuleRef,
  config: AgentRuntimeConfig,
): string {
  return JSON.stringify([
    moduleRef.importPath,
    config.authPath,
    config.baseUrl,
    config.originator,
    config.model,
  ]);
}

export function createAgentRuntimeService(
  options: AgentRuntimeServiceOptions = {},
): AgentRuntimeService {
  const workspace =
    options.workspace ??
    createWorkspaceAdapter(
      options.repoRoot ? { repoRoot: options.repoRoot } : {},
    );
  const promptLoader =
    options.promptLoader ??
    createPromptLoader({ repoRoot: workspace.repoPaths.repoRoot });
  let cachedProviderState: CachedProviderState | undefined;
  let cachedProviderPromise: Promise<CachedProviderState> | undefined;
  let disposed = false;

  function assertActive(): void {
    if (disposed) {
      throw new Error('Agent runtime service has already been disposed.');
    }
  }

  async function getConfigAndModule(): Promise<{
    config: AgentRuntimeConfig;
    moduleRef: OpenAIAccountModuleRef;
  }> {
    const providerOptions: {
      authModuleImportPath?: string;
      repoRoot?: string;
    } = {
      repoRoot: workspace.repoPaths.repoRoot,
    };

    if (options.authModuleImportPath !== undefined) {
      providerOptions.authModuleImportPath = options.authModuleImportPath;
    }

    const { defaults, moduleRef } = await getOpenAIAccountProviderDefaults(
      providerOptions,
    );

    return {
      config: readAgentRuntimeConfigFromEnv(defaults, options.env, {
        repoRoot: workspace.repoPaths.repoRoot,
      }),
      moduleRef,
    };
  }

  async function closeCachedProvider(): Promise<void> {
    const providerToClose = cachedProviderState?.provider;

    cachedProviderState = undefined;
    cachedProviderPromise = undefined;

    if (providerToClose) {
      await providerToClose.close();
    }
  }

  async function getConfiguredProvider(
    moduleRef: OpenAIAccountModuleRef,
    config: AgentRuntimeConfig,
  ): Promise<{
    model: string;
    provider: OpenAICodexModelProviderLike;
  }> {
    const providerKey = toProviderKey(moduleRef, config);

    if (cachedProviderState?.key === providerKey) {
      moduleRef.module.configureDefaultOpenAICodexModelProvider(
        cachedProviderState.provider,
      );
      return {
        model: moduleRef.module.normalizeOpenAICodexModelName(config.model),
        provider: cachedProviderState.provider,
      };
    }

    if (cachedProviderPromise) {
      if (cachedProviderState?.key === providerKey) {
        const pendingState = await cachedProviderPromise;
        moduleRef.module.configureDefaultOpenAICodexModelProvider(
          pendingState.provider,
        );
        return {
          model: moduleRef.module.normalizeOpenAICodexModelName(config.model),
          provider: pendingState.provider,
        };
      }

      await closeCachedProvider();
    }

    cachedProviderPromise = (async () => {
      const providerOptions: {
        authModuleImportPath?: string;
        moduleRef?: OpenAIAccountModuleRef;
        repoRoot?: string;
      } = {
        moduleRef,
        repoRoot: workspace.repoPaths.repoRoot,
      };

      if (options.authModuleImportPath !== undefined) {
        providerOptions.authModuleImportPath = options.authModuleImportPath;
      }

      const configured = await createConfiguredOpenAIAccountProvider(
        config,
        providerOptions,
      );

      cachedProviderState = {
        key: providerKey,
        provider: configured.provider,
      };

      return cachedProviderState;
    })().catch((error: unknown) => {
      cachedProviderPromise = undefined;
      cachedProviderState = undefined;
      throw error;
    });

    const cachedState = await cachedProviderPromise;
    return {
      model: moduleRef.module.normalizeOpenAICodexModelName(config.model),
      provider: cachedState.provider,
    };
  }

  return {
    async bootstrap(workflowInput: unknown): Promise<AgentRuntimeBootstrap> {
      assertActive();

      const startedAt = new Date().toISOString();
      const { config, moduleRef } = await getConfigAndModule();
      const authOptions: {
        authModuleImportPath?: string;
        moduleRef?: OpenAIAccountModuleRef;
        now?: number;
        repoRoot?: string;
      } = {
        moduleRef,
        repoRoot: workspace.repoPaths.repoRoot,
      };

      if (options.authModuleImportPath !== undefined) {
        authOptions.authModuleImportPath = options.authModuleImportPath;
      }

      if (options.now !== undefined) {
        authOptions.now = options.now;
      }

      const auth = await inspectOpenAIAccountReadiness(config, authOptions);

      if (auth.state !== 'ready') {
        throw new AgentRuntimeBootstrapError(auth.state, auth.message, { auth });
      }

      const readyAuth = auth as AgentRuntimeAuthReadiness & {
        state: 'ready';
      };

      const promptResult = await promptLoader.load(workflowInput);
      const { promptBundle, summary } = toPromptSummary(promptResult);

      if (summary.state === 'unsupported-workflow') {
        throw new AgentRuntimeBootstrapError(
          'unsupported-workflow',
          summary.message,
          {
            auth,
            prompt: summary,
          },
        );
      }

      if (summary.state === 'missing') {
        throw new AgentRuntimeBootstrapError('prompt-missing', summary.message, {
          auth,
          prompt: summary,
        });
      }

      if (summary.state === 'empty') {
        throw new AgentRuntimeBootstrapError('prompt-empty', summary.message, {
          auth,
          prompt: summary,
        });
      }

      const readyPrompt = summary as AgentRuntimePromptSummary & {
        modeRepoRelativePath: string;
        requestedWorkflow: string;
        state: 'ready';
        workflow: AgentRuntimeBootstrap['prompt']['workflow'];
      };

      try {
        const { model, provider } = await getConfiguredProvider(moduleRef, config);

        if (!promptBundle) {
          throw new Error('Prompt bundle was missing from a ready bootstrap.');
        }

        return {
          auth: readyAuth,
          config,
          model,
          prompt: readyPrompt,
          promptBundle,
          provider,
          startedAt,
          status: 'ready',
        };
      } catch (error) {
        throw new AgentRuntimeBootstrapError(
          'provider-bootstrap-failed',
          'Failed to bootstrap the OpenAI Codex provider.',
          {
            auth,
            cause: error,
            prompt: summary,
          },
        );
      }
    },
    async close(): Promise<void> {
      if (disposed) {
        return;
      }

      disposed = true;
      await closeCachedProvider();
    },
    async getReadiness(): Promise<AgentRuntimeReadinessSummary> {
      assertActive();

      const [{ config }, prompt, auth] = await Promise.all([
        getConfigAndModule(),
        inspectBaselinePromptReadiness(workspace),
        (async () => {
          const { config, moduleRef } = await getConfigAndModule();
          const authOptions: {
            authModuleImportPath?: string;
            moduleRef?: OpenAIAccountModuleRef;
            now?: number;
            repoRoot?: string;
          } = {
            moduleRef,
            repoRoot: workspace.repoPaths.repoRoot,
          };

          if (options.authModuleImportPath !== undefined) {
            authOptions.authModuleImportPath = options.authModuleImportPath;
          }

          if (options.now !== undefined) {
            authOptions.now = options.now;
          }

          return inspectOpenAIAccountReadiness(config, authOptions);
        })(),
      ]);
      const status = getReadinessStatus(auth, prompt);

      return {
        auth,
        config,
        message: getReadinessMessage(auth, prompt),
        prompt,
        status,
      };
    },
  };
}

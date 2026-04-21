import type { RepoPathOptions, RepoPaths } from '../config/repo-paths.js';
import {
  createApprovalRuntimeService,
  type ApprovalRuntimeService,
} from '../approval-runtime/index.js';
import {
  createAgentRuntimeService,
  type AgentRuntimeBootstrap,
  type AgentRuntimeReadinessSummary,
  type AgentRuntimeService,
} from '../agent-runtime/index.js';
import {
  createWorkflowJobExecutors,
  createDurableJobExecutorRegistry,
  createDurableJobRunnerService,
  type AnyDurableJobExecutorDefinition,
  type DurableJobExecutorRegistryInput,
  type DurableJobRunnerService,
} from '../job-runner/index.js';
import {
  createObservabilityService,
  type ObservabilityService,
} from '../observability/index.js';
import {
  createStartupDiagnosticsService,
  type StartupDiagnostics,
  type StartupDiagnosticsService,
} from '../index.js';
import {
  createDefaultToolSuite,
  createDefaultToolScripts,
  createToolExecutionService,
  type ScriptExecutionDefinition,
  type ToolExecutionService,
  type ToolRegistryInput,
} from '../tools/index.js';
import {
  createOperationalStore,
  inspectOperationalStoreStatus,
  type OperationalStore,
  type OperationalStoreStatus,
} from '../store/index.js';
import {
  createWorkspaceAdapter,
  type WorkspaceAdapter,
} from '../workspace/index.js';

export type ServiceCleanupTask = () => Promise<void> | void;

export type ApiServiceContainer = {
  addCleanupTask: (task: ServiceCleanupTask) => void;
  approvalRuntime: {
    getService: () => Promise<ApprovalRuntimeService>;
  };
  agentRuntime: {
    bootstrap: (workflowInput: unknown) => Promise<AgentRuntimeBootstrap>;
    getReadiness: () => Promise<AgentRuntimeReadinessSummary>;
  };
  dispose: () => Promise<void>;
  jobRunner: {
    getService: () => Promise<DurableJobRunnerService>;
  };
  operationalStore: {
    getStatus: () => Promise<OperationalStoreStatus>;
    getStore: () => Promise<OperationalStore>;
  };
  observability: {
    getService: () => Promise<ObservabilityService>;
  };
  repoPaths: RepoPaths;
  startupDiagnostics: StartupDiagnosticsService;
  tools: {
    getService: () => Promise<ToolExecutionService>;
  };
  workspace: WorkspaceAdapter;
};

export type ApiServiceContainerOptions = RepoPathOptions & {
  approvalRuntime?: ApprovalRuntimeService;
  agentRuntime?: AgentRuntimeService;
  jobRunner?: DurableJobRunnerService;
  jobRunnerExecutors?: DurableJobExecutorRegistryInput;
  observability?: ObservabilityService;
  startupDiagnostics?: StartupDiagnosticsService;
  toolDefinitions?: ToolRegistryInput;
  toolScripts?: readonly ScriptExecutionDefinition[];
  tools?: ToolExecutionService;
  workspace?: WorkspaceAdapter;
};

function mergeScriptDefinitions(
  defaults: readonly ScriptExecutionDefinition[],
  overrides: readonly ScriptExecutionDefinition[],
): readonly ScriptExecutionDefinition[] {
  const merged = new Map<string, ScriptExecutionDefinition>();

  for (const definition of defaults) {
    merged.set(definition.name, definition);
  }

  for (const definition of overrides) {
    merged.set(definition.name, definition);
  }

  return [...merged.values()];
}

function mergeDurableJobExecutors(
  defaults: readonly AnyDurableJobExecutorDefinition[],
  overrides: readonly AnyDurableJobExecutorDefinition[],
): readonly AnyDurableJobExecutorDefinition[] {
  const merged = new Map<string, AnyDurableJobExecutorDefinition>();

  for (const definition of defaults) {
    merged.set(definition.jobType, definition);
  }

  for (const definition of overrides) {
    merged.set(definition.jobType, definition);
  }

  return [...merged.values()];
}

export function createApiServiceContainer(
  options: ApiServiceContainerOptions = {},
): ApiServiceContainer {
  const cleanupTasks: ServiceCleanupTask[] = [];
  let approvalRuntimeService = options.approvalRuntime;
  let approvalRuntimePromise: Promise<ApprovalRuntimeService> | undefined;
  let operationalStore: OperationalStore | undefined;
  let operationalStorePromise: Promise<OperationalStore> | undefined;
  let agentRuntimeService = options.agentRuntime;
  let agentRuntimeCleanupRegistered = false;
  let jobRunnerService = options.jobRunner;
  let jobRunnerPromise: Promise<DurableJobRunnerService> | undefined;
  let observabilityService = options.observability;
  let observabilityPromise: Promise<ObservabilityService> | undefined;
  let startupDiagnosticsService = options.startupDiagnostics;
  let toolExecutionService = options.tools;
  let workspace = options.workspace;
  let disposed = false;

  function assertActive(): void {
    if (disposed) {
      throw new Error('API service container has already been disposed.');
    }
  }

  function getWorkspace(): WorkspaceAdapter {
    assertActive();

    if (!workspace) {
      workspace = createWorkspaceAdapter(options);
    }

    return workspace;
  }

  function getAgentRuntimeService(): AgentRuntimeService {
    assertActive();

    if (!agentRuntimeService) {
      agentRuntimeService = createAgentRuntimeService({
        repoRoot: getWorkspace().repoPaths.repoRoot,
        workspace: getWorkspace(),
      });
    }

    if (!agentRuntimeCleanupRegistered) {
      agentRuntimeCleanupRegistered = true;
      cleanupTasks.push(() => agentRuntimeService?.close());
    }

    return agentRuntimeService;
  }

  function getStartupDiagnosticsService(): StartupDiagnosticsService {
    assertActive();

    if (!startupDiagnosticsService) {
      startupDiagnosticsService = createStartupDiagnosticsService(
        {},
        {
          agentRuntime: getAgentRuntimeService(),
          operationalStoreStatus: getOperationalStoreStatus,
          workspace: getWorkspace(),
        },
      );
    }

    return startupDiagnosticsService;
  }

  async function getOperationalStoreStatus(): Promise<OperationalStoreStatus> {
    assertActive();

    if (operationalStore) {
      return operationalStore.getStatus();
    }

    return inspectOperationalStoreStatus(options);
  }

  async function getOperationalStore(): Promise<OperationalStore> {
    assertActive();

    if (operationalStore) {
      return operationalStore;
    }

    if (!operationalStorePromise) {
      operationalStorePromise = createOperationalStore(options).then(
        async (createdStore) => {
          if (disposed) {
            await createdStore.close();
            throw new Error(
              'API service container was disposed before the operational store finished initializing.',
            );
          }

          operationalStore = createdStore;
          cleanupTasks.push(() => createdStore.close());
          return createdStore;
        },
        (error: unknown) => {
          operationalStorePromise = undefined;
          throw error;
        },
      );
    }

    return operationalStorePromise;
  }

  async function getObservabilityService(): Promise<ObservabilityService> {
    assertActive();

    if (observabilityService) {
      return observabilityService;
    }

    if (!observabilityPromise) {
      observabilityPromise = Promise.resolve(
        createObservabilityService({
          getStore: getOperationalStore,
          getStoreStatus: getOperationalStoreStatus,
        }),
      ).then((createdService) => {
        observabilityService = createdService;
        return createdService;
      });
    }

    return observabilityPromise;
  }

  async function getApprovalRuntimeService(): Promise<ApprovalRuntimeService> {
    assertActive();

    if (approvalRuntimeService) {
      return approvalRuntimeService;
    }

    if (!approvalRuntimePromise) {
      approvalRuntimePromise = Promise.resolve(
        createApprovalRuntimeService({
          getStore: getOperationalStore,
          recordEvent: (input) =>
            getObservabilityService().then((service) =>
              service.recordEvent(input),
            ),
        }),
      ).then((createdService) => {
        approvalRuntimeService = createdService;
        return createdService;
      });
    }

    return approvalRuntimePromise;
  }

  async function getJobRunnerService(): Promise<DurableJobRunnerService> {
    assertActive();

    if (jobRunnerService) {
      return jobRunnerService;
    }

    if (!jobRunnerPromise) {
      jobRunnerPromise = (async () => {
        const defaultWorkflowExecutors = createWorkflowJobExecutors({
          getToolExecutionService: async () => getToolExecutionService(),
          repoRoot: getWorkspace().repoPaths.repoRoot,
        });
        const createdRunner = createDurableJobRunnerService({
          bootstrapWorkflow: (workflow) =>
            getAgentRuntimeService().bootstrap(workflow),
          executors: createDurableJobExecutorRegistry(
            mergeDurableJobExecutors(
              defaultWorkflowExecutors,
              options.jobRunnerExecutors ?? [],
            ),
          ),
          getApprovalRuntime: getApprovalRuntimeService,
          getObservability: getObservabilityService,
          getStore: getOperationalStore,
        });

        try {
          await createdRunner.start();
        } catch (error) {
          await createdRunner.close();
          throw error;
        }

        if (disposed) {
          await createdRunner.close();
          throw new Error(
            'API service container was disposed before the durable job runner finished initializing.',
          );
        }

        jobRunnerService = createdRunner;
        return createdRunner;
      })().catch((error: unknown) => {
        jobRunnerPromise = undefined;
        throw error;
      });
    }

    return jobRunnerPromise;
  }

  function getToolExecutionService(): ToolExecutionService {
    assertActive();

    if (!toolExecutionService) {
      const defaultToolDefinitions = createDefaultToolSuite({
        bootstrapWorkflow: (workflow) =>
          getAgentRuntimeService().bootstrap(workflow),
        startupDiagnostics: getStartupDiagnosticsService(),
        workspace: getWorkspace(),
      });
      const defaultToolScripts = createDefaultToolScripts();
      toolExecutionService = createToolExecutionService({
        getApprovalRuntime: getApprovalRuntimeService,
        getJobRunner: getJobRunnerService,
        getObservability: getObservabilityService,
        getStore: getOperationalStore,
        registryInput: [
          ...defaultToolDefinitions,
          ...(options.toolDefinitions ?? []),
        ],
        scriptAllowlist: mergeScriptDefinitions(
          defaultToolScripts,
          options.toolScripts ?? [],
        ),
        workspace: getWorkspace(),
      });
    }

    return toolExecutionService;
  }

  return {
    addCleanupTask(task: ServiceCleanupTask): void {
      assertActive();
      cleanupTasks.push(task);
    },
    approvalRuntime: {
      async getService(): Promise<ApprovalRuntimeService> {
        return getApprovalRuntimeService();
      },
    },
    agentRuntime: {
      async bootstrap(workflowInput: unknown): Promise<AgentRuntimeBootstrap> {
        return getAgentRuntimeService().bootstrap(workflowInput);
      },
      async getReadiness(): Promise<AgentRuntimeReadinessSummary> {
        return getAgentRuntimeService().getReadiness();
      },
    },
    async dispose(): Promise<void> {
      if (disposed) {
        return;
      }

      disposed = true;
      const cleanupErrors: Error[] = [];

      if (jobRunnerService) {
        try {
          await jobRunnerService.close();
        } catch (error) {
          cleanupErrors.push(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      }

      while (cleanupTasks.length > 0) {
        const cleanupTask = cleanupTasks.pop();

        if (!cleanupTask) {
          continue;
        }

        try {
          await cleanupTask();
        } catch (error) {
          cleanupErrors.push(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          cleanupErrors,
          'API service container cleanup failed.',
        );
      }
    },
    jobRunner: {
      async getService(): Promise<DurableJobRunnerService> {
        return getJobRunnerService();
      },
    },
    get repoPaths(): RepoPaths {
      return getWorkspace().repoPaths;
    },
    startupDiagnostics: {
      async getDiagnostics(): Promise<StartupDiagnostics> {
        return getStartupDiagnosticsService().getDiagnostics();
      },
    },
    operationalStore: {
      async getStatus(): Promise<OperationalStoreStatus> {
        return getOperationalStoreStatus();
      },
      async getStore(): Promise<OperationalStore> {
        return getOperationalStore();
      },
    },
    observability: {
      async getService(): Promise<ObservabilityService> {
        return getObservabilityService();
      },
    },
    tools: {
      async getService(): Promise<ToolExecutionService> {
        return getToolExecutionService();
      },
    },
    get workspace(): WorkspaceAdapter {
      return getWorkspace();
    },
  };
}

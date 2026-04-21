import type { RepoPathOptions, RepoPaths } from '../config/repo-paths.js';
import {
  createAgentRuntimeService,
  type AgentRuntimeBootstrap,
  type AgentRuntimeReadinessSummary,
  type AgentRuntimeService,
} from '../agent-runtime/index.js';
import {
  createStartupDiagnosticsService,
  type StartupDiagnostics,
  type StartupDiagnosticsService,
} from '../index.js';
import {
  createOperationalStore,
  inspectOperationalStoreStatus,
  type OperationalStore,
  type OperationalStoreStatus,
} from '../store/index.js';
import { createWorkspaceAdapter, type WorkspaceAdapter } from '../workspace/index.js';

export type ServiceCleanupTask = () => Promise<void> | void;

export type ApiServiceContainer = {
  addCleanupTask: (task: ServiceCleanupTask) => void;
  agentRuntime: {
    bootstrap: (workflowInput: unknown) => Promise<AgentRuntimeBootstrap>;
    getReadiness: () => Promise<AgentRuntimeReadinessSummary>;
  };
  dispose: () => Promise<void>;
  operationalStore: {
    getStatus: () => Promise<OperationalStoreStatus>;
    getStore: () => Promise<OperationalStore>;
  };
  repoPaths: RepoPaths;
  startupDiagnostics: StartupDiagnosticsService;
  workspace: WorkspaceAdapter;
};

export type ApiServiceContainerOptions = RepoPathOptions & {
  agentRuntime?: AgentRuntimeService;
  startupDiagnostics?: StartupDiagnosticsService;
  workspace?: WorkspaceAdapter;
};

export function createApiServiceContainer(
  options: ApiServiceContainerOptions = {},
): ApiServiceContainer {
  const cleanupTasks: ServiceCleanupTask[] = [];
  let operationalStore: OperationalStore | undefined;
  let operationalStorePromise: Promise<OperationalStore> | undefined;
  let agentRuntimeService = options.agentRuntime;
  let agentRuntimeCleanupRegistered = false;
  let startupDiagnosticsService = options.startupDiagnostics;
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

  return {
    addCleanupTask(task: ServiceCleanupTask): void {
      assertActive();
      cleanupTasks.push(task);
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
    get workspace(): WorkspaceAdapter {
      return getWorkspace();
    },
  };
}

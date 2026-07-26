import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RepoPathOptions } from './config/repo-paths.js';
import {
  createAgentRuntimeService,
  type AgentRuntimeReadinessSummary,
  type AgentRuntimeService,
} from './agent-runtime/index.js';
import {
  getPromptContractSummary,
  type PromptContractSummary,
} from './prompt/index.js';
import {
  DEFAULT_BOOT_HOST,
  DEFAULT_BOOT_PORT,
} from './runtime/runtime-config.js';
import {
  inspectOperationalStoreStatus,
  type OperationalStoreStatus,
} from './store/index.js';
import {
  createWorkspaceAdapter,
  type WorkspaceAdapter,
  type WorkspaceMissingSummary,
  type WorkspaceSummary,
} from './workspace/index.js';
import { captureLastError } from './logger.js';

export const STARTUP_SERVICE_NAME = 'jobhunt-api-scaffold' as const;
export const STARTUP_SESSION_ID =
  'phase01-session03-agent-runtime-bootstrap' as const;

export type CurrentSessionMetadata = {
  id: string;
  monorepo: boolean | null;
  packagePath: string | null;
  phase: number | null;
  source: 'fallback' | 'state-file';
  stateFilePath: string;
};

export type StartupDiagnostics = {
  agentRuntime: AgentRuntimeReadinessSummary;
  appStateRootPath: string;
  appStateRootExists: boolean;
  agentsGuidePath: string;
  bootSurface: {
    defaultHost: typeof DEFAULT_BOOT_HOST;
    defaultPort: typeof DEFAULT_BOOT_PORT;
    healthPath: '/health';
    startupPath: '/startup';
  };
  currentSession: CurrentSessionMetadata;
  dataContractPath: string;
  mutationPolicy: 'app-owned-only';
  onboardingMissing: WorkspaceMissingSummary[];
  optionalMissing: WorkspaceMissingSummary[];
  operationalStore: OperationalStoreStatus;
  promptContract: PromptContractSummary;
  repoRoot: string;
  runtimeMissing: WorkspaceMissingSummary[];
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  userLayerWrites: 'disabled';
  workspace: WorkspaceSummary;
};

export type StartupDiagnosticsService = {
  getDiagnostics: () => Promise<StartupDiagnostics>;
};

type StartupDiagnosticsDependencies = {
  agentRuntime?: AgentRuntimeService;
  currentSession?: () => Promise<CurrentSessionMetadata>;
  operationalStoreStatus?: () => Promise<OperationalStoreStatus>;
  workspace?: WorkspaceAdapter;
};

type SessionStateFile = {
  completed_sessions?: unknown;
  current_phase?: unknown;
  current_session?: unknown;
  monorepo?: unknown;
  next_session_history?: unknown;
};

function getSessionPackagePath(
  state: SessionStateFile,
  currentSessionId: string,
): string | null {
  const nextSessionHistory = Array.isArray(state.next_session_history)
    ? state.next_session_history
    : [];

  for (let index = nextSessionHistory.length - 1; index >= 0; index -= 1) {
    const entry = nextSessionHistory[index];

    if (
      typeof entry === 'object' &&
      entry !== null &&
      'session' in entry &&
      entry.session === currentSessionId &&
      'package' in entry &&
      (typeof entry.package === 'string' || entry.package === null)
    ) {
      return entry.package;
    }
  }

  const completedSessions = Array.isArray(state.completed_sessions)
    ? state.completed_sessions
    : [];

  for (const entry of completedSessions) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'id' in entry &&
      entry.id === currentSessionId &&
      'package' in entry &&
      (typeof entry.package === 'string' || entry.package === null)
    ) {
      return entry.package;
    }
  }

  return null;
}

async function readCurrentSessionMetadata(
  repoRoot: string,
): Promise<CurrentSessionMetadata> {
  const stateFilePath = join(repoRoot, '.spec_system', 'state.json');

  try {
    const content = await readFile(stateFilePath, 'utf8');
    const parsedState = JSON.parse(content) as SessionStateFile;
    const sessionId =
      typeof parsedState.current_session === 'string'
        ? parsedState.current_session
        : STARTUP_SESSION_ID;

    return {
      id: sessionId,
      monorepo:
        typeof parsedState.monorepo === 'boolean' ? parsedState.monorepo : null,
      packagePath: getSessionPackagePath(parsedState, sessionId),
      phase:
        typeof parsedState.current_phase === 'number'
          ? parsedState.current_phase
          : null,
      source: 'state-file',
      stateFilePath,
    };
  } catch {
    return {
      id: STARTUP_SESSION_ID,
      monorepo: null,
      packagePath: null,
      phase: null,
      source: 'fallback',
      stateFilePath,
    };
  }
}

async function buildStartupDiagnostics(
  agentRuntime: AgentRuntimeService,
  getCurrentSession: () => Promise<CurrentSessionMetadata>,
  workspace: WorkspaceAdapter,
  getOperationalStoreStatus: () => Promise<OperationalStoreStatus>,
): Promise<StartupDiagnostics> {
  const [summary, operationalStore, currentSession, agentRuntimeReadiness] =
    await Promise.all([
      workspace.getSummary(),
      getOperationalStoreStatus(),
      getCurrentSession(),
      agentRuntime.getReadiness(),
    ]);

  return {
    agentRuntime: agentRuntimeReadiness,
    appStateRootPath: summary.appStateRootPath,
    appStateRootExists: summary.appStateRootExists,
    agentsGuidePath: workspace.repoPaths.agentsGuidePath,
    bootSurface: {
      defaultHost: DEFAULT_BOOT_HOST,
      defaultPort: DEFAULT_BOOT_PORT,
      healthPath: '/health',
      startupPath: '/startup',
    },
    currentSession,
    dataContractPath: workspace.repoPaths.dataContractPath,
    mutationPolicy: 'app-owned-only',
    onboardingMissing: summary.onboardingMissing,
    optionalMissing: summary.optionalMissing,
    operationalStore,
    promptContract: getPromptContractSummary(),
    repoRoot: workspace.repoPaths.repoRoot,
    runtimeMissing: summary.runtimeMissing,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    userLayerWrites: 'disabled',
    workspace: summary,
  };
}

export function createStartupDiagnosticsService(
  options: RepoPathOptions = {},
  dependencies: StartupDiagnosticsDependencies = {},
): StartupDiagnosticsService {
  const workspace = dependencies.workspace ?? createWorkspaceAdapter(options);
  const agentRuntime =
    dependencies.agentRuntime ??
    createAgentRuntimeService({
      repoRoot: workspace.repoPaths.repoRoot,
      workspace,
    });
  const getCurrentSession =
    dependencies.currentSession ??
    (() => readCurrentSessionMetadata(workspace.repoPaths.repoRoot));
  const getOperationalStoreStatus =
    dependencies.operationalStoreStatus ??
    (() => inspectOperationalStoreStatus(options));

  return {
    async getDiagnostics(): Promise<StartupDiagnostics> {
      return buildStartupDiagnostics(
        agentRuntime,
        getCurrentSession,
        workspace,
        getOperationalStoreStatus,
      );
    },
  };
}

export async function getStartupDiagnostics(
  options: RepoPathOptions = {},
): Promise<StartupDiagnostics> {
  return createStartupDiagnosticsService(options).getDiagnostics();
}

async function main(): Promise<void> {
  const diagnostics = await getStartupDiagnostics();
  console.log(JSON.stringify(diagnostics, null, 2));
}

function isMainModule(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    void captureLastError({
      error,
      message: `${STARTUP_SERVICE_NAME} failed: ${message}`,
      repoRoot: process.cwd(),
    }).catch(() => undefined);
    console.error(`${STARTUP_SERVICE_NAME} failed: ${message}`);
    process.exitCode = 1;
  });
}

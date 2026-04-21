import { pathToFileURL } from 'node:url';
import { type RepoPathOptions } from './config/repo-paths.js';
import { getPromptContractSummary, type PromptContractSummary } from './prompt/index.js';
import { DEFAULT_BOOT_HOST, DEFAULT_BOOT_PORT } from './runtime/runtime-config.js';
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

export const STARTUP_SERVICE_NAME = 'jobhunt-api-scaffold' as const;
export const STARTUP_SESSION_ID =
  'phase01-session02-sqlite-operational-store' as const;

export type StartupDiagnostics = {
  appStateRootPath: string;
  appStateRootExists: boolean;
  agentsGuidePath: string;
  bootSurface: {
    defaultHost: typeof DEFAULT_BOOT_HOST;
    defaultPort: typeof DEFAULT_BOOT_PORT;
    healthPath: '/health';
    startupPath: '/startup';
  };
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
  operationalStoreStatus?: () => Promise<OperationalStoreStatus>;
  workspace?: WorkspaceAdapter;
};

async function buildStartupDiagnostics(
  workspace: WorkspaceAdapter,
  getOperationalStoreStatus: () => Promise<OperationalStoreStatus>,
): Promise<StartupDiagnostics> {
  const [summary, operationalStore] = await Promise.all([
    workspace.getSummary(),
    getOperationalStoreStatus(),
  ]);

  return {
    appStateRootPath: summary.appStateRootPath,
    appStateRootExists: summary.appStateRootExists,
    agentsGuidePath: workspace.repoPaths.agentsGuidePath,
    bootSurface: {
      defaultHost: DEFAULT_BOOT_HOST,
      defaultPort: DEFAULT_BOOT_PORT,
      healthPath: '/health',
      startupPath: '/startup',
    },
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
  const getOperationalStoreStatus =
    dependencies.operationalStoreStatus ??
    (() => inspectOperationalStoreStatus(options));

  return {
    async getDiagnostics(): Promise<StartupDiagnostics> {
      return buildStartupDiagnostics(workspace, getOperationalStoreStatus);
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
    console.error(`${STARTUP_SERVICE_NAME} failed: ${message}`);
    process.exitCode = 1;
  });
}

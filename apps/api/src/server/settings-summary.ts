import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  STARTUP_SERVICE_NAME,
  STARTUP_SESSION_ID,
  type CurrentSessionMetadata,
} from '../index.js';
import {
  getSpecialistDefinition,
  getWorkflowSpecialistRoute,
} from '../orchestration/index.js';
import { resolveRepoRelativePath } from '../config/repo-paths.js';
import type { WorkflowIntent } from '../prompt/index.js';
import type { ApiServiceContainer } from '../runtime/service-container.js';
import {
  createHealthPayload,
  getStartupMessage,
  getStartupStatus,
  type StartupHealthPayload,
  type StartupStatus,
} from './startup-status.js';
import {
  readSettingsUpdateCheck,
  type SettingsUpdateCheckPayload,
} from './settings-update-check.js';
import type { ToolCatalogEntry } from '../tools/index.js';

const DEFAULT_TOOL_LIMIT = 6;
const DEFAULT_WORKFLOW_LIMIT = 6;
const MAX_PREVIEW_LIMIT = 10;

export type SettingsMaintenanceCommandCategory =
  | 'auth'
  | 'backup'
  | 'diagnostics'
  | 'updates';

export type SettingsMaintenanceCommand = {
  category: SettingsMaintenanceCommandCategory;
  command: string;
  description: string;
  id:
    | 'auth-login'
    | 'auth-refresh'
    | 'auth-status'
    | 'backup-run'
    | 'doctor'
    | 'quick-regression'
    | 'update-apply'
    | 'update-check'
    | 'update-rollback';
  label: string;
};

export type SettingsAuthSummary = {
  auth: {
    accountId: string | null;
    authPath: string;
    expiresAt: number | null;
    message: string;
    nextSteps: string[];
    state: 'auth-required' | 'expired-auth' | 'invalid-auth' | 'ready';
    updatedAt: string | null;
  };
  config: {
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
  message: string;
  status:
    | 'auth-required'
    | 'expired-auth'
    | 'invalid-auth'
    | 'prompt-failure'
    | 'ready';
};

export type SettingsToolPreview = ToolCatalogEntry;

export type SettingsWorkflowSupportItem = {
  description: string;
  intent: string;
  message: string;
  missingCapabilities: string[];
  modeExists: boolean;
  modeRepoRelativePath: string;
  specialist: {
    description: string;
    id: string;
    label: string;
  } | null;
  status: 'missing-route' | 'ready' | 'tooling-gap';
  toolPreview: string[];
};

export type SettingsSupportSummary = {
  prompt: {
    cacheMode: string;
    sourceOrder: string[];
    sources: Array<{
      key: string;
      label: string;
      optional: boolean;
      precedence: number;
      role: string;
    }>;
    supportedWorkflowCount: number;
  };
  tools: {
    hasMore: boolean;
    previewLimit: number;
    totalCount: number;
    tools: SettingsToolPreview[];
  };
  workflows: {
    hasMore: boolean;
    previewLimit: number;
    totalCount: number;
    workflows: SettingsWorkflowSupportItem[];
  };
};

export type SettingsWorkspaceSummary = {
  agentsGuidePath: string;
  apiPackagePath: string;
  appStateRootPath: string;
  currentSession: CurrentSessionMetadata & {
    packageAbsolutePath: string | null;
    specDirectoryPath: string;
  };
  dataContractPath: string;
  protectedOwners: Array<'system' | 'user'>;
  repoRoot: string;
  specSystemPath: string;
  webPackagePath: string;
  writableRoots: string[];
};

export type SettingsSummaryPayload = {
  auth: SettingsAuthSummary;
  currentSession: CurrentSessionMetadata;
  generatedAt: string;
  health: StartupHealthPayload;
  maintenance: {
    commands: SettingsMaintenanceCommand[];
    updateCheck: SettingsUpdateCheckPayload;
  };
  message: string;
  ok: true;
  operationalStore: {
    databasePath: string;
    message: string;
    reason: string | null;
    rootExists: boolean;
    rootPath: string;
    status: 'absent' | 'corrupt' | 'ready';
  };
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: StartupStatus;
  support: SettingsSupportSummary;
  workspace: SettingsWorkspaceSummary;
};

export type SettingsSummaryOptions = {
  readUpdateCheck?: (input: {
    repoRoot: string;
  }) => Promise<SettingsUpdateCheckPayload>;
  toolLimit?: number;
  workflowLimit?: number;
};

function clampPreviewLimit(
  value: number | undefined,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  return Math.max(1, Math.min(value, MAX_PREVIEW_LIMIT));
}

function createMaintenanceCommands(): SettingsMaintenanceCommand[] {
  return [
    {
      category: 'diagnostics',
      command: 'npm run doctor',
      description:
        'Validate repo prerequisites, auth readiness, and required user-layer files.',
      id: 'doctor',
      label: 'Run doctor',
    },
    {
      category: 'diagnostics',
      command: 'node scripts/test-all.mjs --quick',
      description:
        'Run the repo quick regression suite after maintenance changes.',
      id: 'quick-regression',
      label: 'Quick regression',
    },
    {
      category: 'auth',
      command: 'npm run auth:openai -- status',
      description:
        'Inspect the stored OpenAI account auth state and the next recommended command.',
      id: 'auth-status',
      label: 'Auth status',
    },
    {
      category: 'auth',
      command: 'npm run auth:openai -- login',
      description:
        'Create the first stored OpenAI account auth state for this repo.',
      id: 'auth-login',
      label: 'Auth login',
    },
    {
      category: 'auth',
      command: 'npm run auth:openai -- refresh',
      description: 'Refresh an expired stored OpenAI account auth session.',
      id: 'auth-refresh',
      label: 'Auth refresh',
    },
    {
      category: 'backup',
      command: 'npm run backup:run',
      description:
        'Write a timestamped backup of the operational store under `.jobhunt-app/backups/`.',
      id: 'backup-run',
      label: 'Run backup',
    },
    {
      category: 'updates',
      command: 'node scripts/update-system.mjs check',
      description:
        'Check for upstream repo-managed updates without mutating local files.',
      id: 'update-check',
      label: 'Check updates',
    },
    {
      category: 'updates',
      command: 'node scripts/update-system.mjs apply',
      description:
        'Apply the latest repo-managed update after confirming the scope in the terminal.',
      id: 'update-apply',
      label: 'Apply update',
    },
    {
      category: 'updates',
      command: 'node scripts/update-system.mjs rollback',
      description:
        'Rollback the most recent repo-managed update from the terminal.',
      id: 'update-rollback',
      label: 'Rollback update',
    },
  ];
}

function createWorkspaceSummary(
  services: ApiServiceContainer,
  currentSession: CurrentSessionMetadata,
  input: {
    protectedOwners: Array<'system' | 'user'>;
    writableRoots: string[];
  },
): SettingsWorkspaceSummary {
  const { repoPaths } = services.workspace;
  let packageAbsolutePath: string | null = null;

  if (currentSession.packagePath) {
    try {
      packageAbsolutePath = resolveRepoRelativePath(
        currentSession.packagePath,
        {
          repoRoot: repoPaths.repoRoot,
        },
      );
    } catch {
      packageAbsolutePath = null;
    }
  }

  return {
    agentsGuidePath: repoPaths.agentsGuidePath,
    apiPackagePath: repoPaths.directories.apiPackagePath,
    appStateRootPath: repoPaths.appStateRootPath,
    currentSession: {
      ...currentSession,
      packageAbsolutePath,
      specDirectoryPath: join(
        repoPaths.directories.specSystemPath,
        'specs',
        currentSession.id,
      ),
    },
    dataContractPath: repoPaths.dataContractPath,
    protectedOwners: [...input.protectedOwners].sort(),
    repoRoot: repoPaths.repoRoot,
    specSystemPath: repoPaths.directories.specSystemPath,
    webPackagePath: repoPaths.directories.webPackagePath,
    writableRoots: [...input.writableRoots].sort(),
  };
}

function createWorkflowSupportItem(input: {
  description: string;
  intent: WorkflowIntent;
  modeRepoRelativePath: string;
  repoRoot: string;
}): SettingsWorkflowSupportItem {
  const route = getWorkflowSpecialistRoute(input.intent);
  let modeExists = false;

  try {
    modeExists = existsSync(
      resolveRepoRelativePath(input.modeRepoRelativePath, {
        repoRoot: input.repoRoot,
      }),
    );
  } catch {
    modeExists = false;
  }

  if (!route) {
    return {
      description: input.description,
      intent: input.intent,
      message: 'No specialist route is registered for this workflow.',
      missingCapabilities: ['specialist-route'],
      modeExists,
      modeRepoRelativePath: input.modeRepoRelativePath,
      specialist: null,
      status: 'missing-route',
      toolPreview: [],
    };
  }

  const specialist = getSpecialistDefinition(route.specialistId);
  const toolNames = [
    ...route.toolPolicy.allowedToolNames,
    ...(route.toolPolicy.fallbackToolNames ?? []),
  ]
    .filter(
      (toolName, index, toolNames) => toolNames.indexOf(toolName) === index,
    )
    .sort()
    .slice(0, 5);

  return {
    description: input.description,
    intent: input.intent,
    message: route.message,
    missingCapabilities: [...route.missingCapabilities],
    modeExists,
    modeRepoRelativePath: input.modeRepoRelativePath,
    specialist: {
      description: specialist.description,
      id: specialist.id,
      label: specialist.label,
    },
    status: route.status,
    toolPreview: toolNames,
  };
}

function createSupportSummary(input: {
  prompt: SettingsSupportSummary['prompt'];
  toolCatalog: ToolCatalogEntry[];
  toolLimit: number;
  totalToolCount: number;
  workflowLimit: number;
  workflows: SettingsWorkflowSupportItem[];
}): SettingsSupportSummary {
  return {
    prompt: input.prompt,
    tools: {
      hasMore: input.totalToolCount > input.toolLimit,
      previewLimit: input.toolLimit,
      totalCount: input.totalToolCount,
      tools: input.toolCatalog,
    },
    workflows: {
      hasMore: input.workflows.length > input.workflowLimit,
      previewLimit: input.workflowLimit,
      totalCount: input.workflows.length,
      workflows: input.workflows.slice(0, input.workflowLimit),
    },
  };
}

export async function createSettingsSummary(
  services: ApiServiceContainer,
  options: SettingsSummaryOptions = {},
): Promise<SettingsSummaryPayload> {
  const toolLimit = clampPreviewLimit(options.toolLimit, DEFAULT_TOOL_LIMIT);
  const workflowLimit = clampPreviewLimit(
    options.workflowLimit,
    DEFAULT_WORKFLOW_LIMIT,
  );
  const readUpdateCheck =
    options.readUpdateCheck ??
    ((input: { repoRoot: string }) =>
      readSettingsUpdateCheck({
        repoRoot: input.repoRoot,
      }));
  const [diagnostics, toolService, updateCheck] = await Promise.all([
    services.startupDiagnostics.getDiagnostics(),
    services.tools.getService(),
    readUpdateCheck({
      repoRoot: services.workspace.repoPaths.repoRoot,
    }),
  ]);
  const status = getStartupStatus(diagnostics);
  const health = createHealthPayload(diagnostics);
  const generatedAt = new Date().toISOString();
  const registry = toolService.getRegistry();
  const toolCatalog = registry.listCatalog({
    limit: toolLimit,
  });
  const workflows = diagnostics.promptContract.workflowRoutes
    .map((route) =>
      createWorkflowSupportItem({
        description: route.description,
        intent: route.intent,
        modeRepoRelativePath: route.modeRepoRelativePath,
        repoRoot: services.workspace.repoPaths.repoRoot,
      }),
    )
    .sort((left, right) => left.intent.localeCompare(right.intent));
  const workspace = createWorkspaceSummary(
    services,
    diagnostics.currentSession,
    {
      protectedOwners: diagnostics.workspace.protectedOwners,
      writableRoots: diagnostics.workspace.writableRoots,
    },
  );
  const support = createSupportSummary({
    prompt: {
      cacheMode: diagnostics.promptContract.cacheMode,
      sourceOrder: [...diagnostics.promptContract.sourceOrder],
      sources: diagnostics.promptContract.sources
        .map((source) => ({
          key: source.key,
          label: source.label,
          optional: source.optional,
          precedence: source.precedence,
          role: source.role,
        }))
        .sort((left, right) => left.precedence - right.precedence),
      supportedWorkflowCount:
        diagnostics.promptContract.supportedWorkflows.length,
    },
    toolCatalog,
    toolLimit,
    totalToolCount: registry.listNames().length,
    workflowLimit,
    workflows,
  });

  return {
    auth: {
      auth: {
        accountId: diagnostics.agentRuntime.auth.accountId,
        authPath: diagnostics.agentRuntime.auth.authPath,
        expiresAt: diagnostics.agentRuntime.auth.expiresAt,
        message: diagnostics.agentRuntime.auth.message,
        nextSteps: [...diagnostics.agentRuntime.auth.nextSteps],
        state: diagnostics.agentRuntime.auth.state,
        updatedAt: diagnostics.agentRuntime.auth.updatedAt,
      },
      config: {
        authPath: diagnostics.agentRuntime.config.authPath,
        baseUrl: diagnostics.agentRuntime.config.baseUrl,
        model: diagnostics.agentRuntime.config.model,
        originator: diagnostics.agentRuntime.config.originator,
        overrides: {
          ...diagnostics.agentRuntime.config.overrides,
        },
      },
      message: diagnostics.agentRuntime.message,
      status: diagnostics.agentRuntime.status,
    },
    currentSession: diagnostics.currentSession,
    generatedAt,
    health,
    maintenance: {
      commands: createMaintenanceCommands(),
      updateCheck,
    },
    message:
      status === 'ready'
        ? 'Settings summary is ready.'
        : getStartupMessage(diagnostics),
    ok: true,
    operationalStore: diagnostics.operationalStore,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status,
    support,
    workspace,
  };
}

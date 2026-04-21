import { randomUUID } from 'node:crypto';
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID, type StartupDiagnostics } from '../index.js';
import type { ApiServiceContainer } from '../runtime/service-container.js';
import { createOnboardingRepairTools } from '../tools/onboarding-repair-tools.js';
import { ToolExecutionError } from '../tools/tool-errors.js';
import { createWorkspaceMutationAdapter } from '../tools/workspace-mutation-adapter.js';
import type { ToolWorkspaceMutationRequest } from '../tools/tool-contract.js';
import { WorkspaceWriteConflictError } from '../workspace/workspace-errors.js';
import type { WorkspaceMissingSummary } from '../workspace/index.js';
import {
  ONBOARDING_REPAIRABLE_SURFACE_KEYS,
  type JsonValue,
  type OnboardingRepairableSurfaceKey,
} from '../workspace/workspace-types.js';
import {
  createHealthPayload,
  getStartupMessage,
  getStartupStatus,
  type StartupHealthPayload,
  type StartupStatus,
} from './startup-status.js';

const inFlightRepairKeys = new Set<string>();

export type OnboardingRepairPreviewItem = {
  description: string;
  destination: {
    canonicalRepoRelativePath: string;
    matchedRepoRelativePath: string | null;
    status: 'found' | 'missing';
    surfaceKey: OnboardingRepairableSurfaceKey;
  };
  ready: boolean;
  reason: 'already-present' | 'ready' | 'template-missing';
  source: {
    repoRelativePath: string | null;
    status: 'found' | 'missing';
    surfaceKey: string;
  };
};

export type OnboardingSummaryPayload = {
  checklist: {
    optional: WorkspaceMissingSummary[];
    required: WorkspaceMissingSummary[];
    runtime: WorkspaceMissingSummary[];
  };
  currentSession: StartupDiagnostics['currentSession'];
  generatedAt: string;
  health: StartupHealthPayload;
  message: string;
  ok: true;
  repairPreview: {
    items: OnboardingRepairPreviewItem[];
    readyTargets: OnboardingRepairableSurfaceKey[];
    repairableCount: number;
    targetCount: number;
    targets: OnboardingRepairableSurfaceKey[];
  };
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: StartupStatus;
};

export type OnboardingRepairPayload = {
  created: Array<{
    repoRelativePath: string;
    target: string;
  }>;
  generatedAt: string;
  health: StartupHealthPayload;
  message: string;
  ok: true;
  repairedCount: number;
  requestedTargets: OnboardingRepairableSurfaceKey[];
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: StartupStatus;
};

type RepairPreviewOutput = {
  items: OnboardingRepairPreviewItem[];
  repairableCount: number;
  targetCount: number;
};

type RepairExecutionOutput = {
  created: Array<{
    repoRelativePath: string;
    target: string;
  }>;
  repairedCount: number;
};

export class OnboardingRepairInFlightError extends Error {
  readonly repairKey: string;

  constructor(repairKey: string) {
    super(
      `An onboarding repair is already running for target set ${repairKey}.`,
    );
    this.name = 'OnboardingRepairInFlightError';
    this.repairKey = repairKey;
  }
}

function compareMissingSummary(
  left: WorkspaceMissingSummary,
  right: WorkspaceMissingSummary,
): number {
  return left.canonicalRepoRelativePath.localeCompare(
    right.canonicalRepoRelativePath,
  );
}

function sortMissingItems(
  items: readonly WorkspaceMissingSummary[],
): WorkspaceMissingSummary[] {
  return [...items].sort(compareMissingSummary);
}

function dedupeTargets(
  targets: readonly OnboardingRepairableSurfaceKey[],
): OnboardingRepairableSurfaceKey[] {
  return [...new Set(targets)].sort((left, right) => left.localeCompare(right));
}

function resolveRequestedTargets(
  targets: readonly OnboardingRepairableSurfaceKey[] | null | undefined,
  services: ApiServiceContainer,
): OnboardingRepairableSurfaceKey[] {
  if (!targets || targets.length === 0) {
    return services.workspace
      .listOnboardingRepairs()
      .map((definition) => definition.destinationSurfaceKey);
  }

  return dedupeTargets(targets);
}

function getPreviewTool(services: ApiServiceContainer) {
  const tool = createOnboardingRepairTools({
    workspace: services.workspace,
  }).find((candidate) => candidate.name === 'preview-onboarding-repair');

  if (!tool) {
    throw new Error('Missing preview-onboarding-repair tool definition.');
  }

  return tool;
}

function getRepairTool(services: ApiServiceContainer) {
  const tool = createOnboardingRepairTools({
    workspace: services.workspace,
  }).find((candidate) => candidate.name === 'repair-onboarding-files');

  if (!tool) {
    throw new Error('Missing repair-onboarding-files tool definition.');
  }

  return tool;
}

function createRouteOwnedToolContext(
  services: ApiServiceContainer,
  input: JsonValue,
  toolName: string,
) {
  const mutationAdapter = createWorkspaceMutationAdapter({
    repoRoot: services.workspace.repoPaths.repoRoot,
  });
  const correlation = {
    approvalId: null,
    jobId: `onboarding-route-${randomUUID()}`,
    requestId: `onboarding-request-${randomUUID()}`,
    sessionId: services.startupDiagnostics
      ? STARTUP_SESSION_ID
      : 'onboarding-route-session',
    traceId: `onboarding-trace-${randomUUID()}`,
  };

  return {
    correlation,
    enqueueJob: async () => {
      throw new Error(`${toolName} cannot enqueue durable jobs from the route.`);
    },
    input,
    mutateWorkspace: (request: ToolWorkspaceMutationRequest) =>
      mutationAdapter.applyMutation(request),
    now: () => Date.now(),
    observe: async () => {},
    request: {
      correlation,
      input,
      toolName,
    },
    runScript: async () => {
      throw new Error(`${toolName} cannot dispatch scripts from the route.`);
    },
    workspace: services.workspace,
  };
}

async function getRepairPreview(
  services: ApiServiceContainer,
  targets: readonly OnboardingRepairableSurfaceKey[],
): Promise<RepairPreviewOutput> {
  const tool = getPreviewTool(services);
  const parsedInput = tool.inputSchema.parse({
    targets,
  });
  const result = await tool.execute(
    parsedInput,
    createRouteOwnedToolContext(
      services,
      parsedInput as JsonValue,
      'preview-onboarding-repair',
    ),
  );
  const output = result.output as RepairPreviewOutput;

  if (!Array.isArray(output.items)) {
    throw new Error('Preview tool returned an invalid items payload.');
  }

  return output;
}

function buildRepairReservationKey(
  repoRoot: string,
  targets: readonly OnboardingRepairableSurfaceKey[],
): string {
  return `${repoRoot}:${targets.join(',')}`;
}

function createSummaryMessage(
  diagnostics: StartupDiagnostics,
  preview: RepairPreviewOutput,
): string {
  const requiredCount = diagnostics.onboardingMissing.length;

  if (requiredCount === 0) {
    return 'Workspace onboarding prerequisites are complete.';
  }

  if (preview.repairableCount === 0) {
    return `${requiredCount} onboarding prerequisites are missing and require manual follow-up.`;
  }

  return `${requiredCount} onboarding prerequisites are missing. ${preview.repairableCount} can be repaired from checked-in templates.`;
}

function buildRepairMessage(diagnostics: StartupDiagnostics, repairedCount: number): string {
  const startupMessage = getStartupMessage(diagnostics);

  if (repairedCount === 0) {
    return startupMessage;
  }

  return `${repairedCount} onboarding file${repairedCount === 1 ? '' : 's'} repaired. ${startupMessage}`;
}

export async function createOnboardingSummary(
  services: ApiServiceContainer,
  options: {
    targets?: readonly OnboardingRepairableSurfaceKey[] | null;
  } = {},
): Promise<OnboardingSummaryPayload> {
  const diagnostics = await services.startupDiagnostics.getDiagnostics();
  const requestedTargets = resolveRequestedTargets(options.targets, services);
  const preview = await getRepairPreview(services, requestedTargets);
  const health = createHealthPayload(diagnostics);
  const status = getStartupStatus(diagnostics);

  return {
    checklist: {
      optional: sortMissingItems(diagnostics.optionalMissing),
      required: sortMissingItems(diagnostics.onboardingMissing),
      runtime: sortMissingItems(diagnostics.runtimeMissing),
    },
    currentSession: diagnostics.currentSession,
    generatedAt: new Date().toISOString(),
    health,
    message: createSummaryMessage(diagnostics, preview),
    ok: true,
    repairPreview: {
      items: preview.items,
      readyTargets: preview.items
        .filter((item) => item.ready)
        .map((item) => item.destination.surfaceKey),
      repairableCount: preview.repairableCount,
      targetCount: preview.targetCount,
      targets: requestedTargets,
    },
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status,
  };
}

export async function runOnboardingRepair(
  services: ApiServiceContainer,
  input: {
    targets: readonly OnboardingRepairableSurfaceKey[];
  },
): Promise<OnboardingRepairPayload> {
  const requestedTargets = dedupeTargets(input.targets);
  const repairKey = buildRepairReservationKey(
    services.workspace.repoPaths.repoRoot,
    requestedTargets,
  );

  if (inFlightRepairKeys.has(repairKey)) {
    throw new OnboardingRepairInFlightError(repairKey);
  }

  inFlightRepairKeys.add(repairKey);

  try {
    const tool = getRepairTool(services);
    const parsedInput = tool.inputSchema.parse({
      targets: requestedTargets,
    });
    const result = await tool.execute(
      parsedInput,
      createRouteOwnedToolContext(
        services,
        parsedInput as JsonValue,
        'repair-onboarding-files',
      ),
    );
    const output = result.output as RepairExecutionOutput;
    const diagnostics = await services.startupDiagnostics.getDiagnostics();
    const health = createHealthPayload(diagnostics);
    const status = getStartupStatus(diagnostics);

    return {
      created: Array.isArray(output.created) ? output.created : [],
      generatedAt: new Date().toISOString(),
      health,
      message: buildRepairMessage(diagnostics, output.repairedCount ?? 0),
      ok: true,
      repairedCount: output.repairedCount ?? 0,
      requestedTargets,
      service: STARTUP_SERVICE_NAME,
      sessionId: STARTUP_SESSION_ID,
      status,
    };
  } finally {
    inFlightRepairKeys.delete(repairKey);
  }
}

export function isOnboardingRepairableTarget(
  value: string,
): value is OnboardingRepairableSurfaceKey {
  return (
    ONBOARDING_REPAIRABLE_SURFACE_KEYS as readonly string[]
  ).includes(value);
}

export function isOnboardingRepairConflict(
  error: unknown,
): error is OnboardingRepairInFlightError | WorkspaceWriteConflictError {
  return (
    error instanceof OnboardingRepairInFlightError ||
    error instanceof WorkspaceWriteConflictError
  );
}

export function isOnboardingRepairToolError(
  error: unknown,
): error is ToolExecutionError {
  return error instanceof ToolExecutionError;
}

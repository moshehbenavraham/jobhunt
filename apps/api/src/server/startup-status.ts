import type { AgentRuntimePromptState } from '../agent-runtime/index.js';
import { RepoRootResolutionError } from '../config/repo-paths.js';
import type { StartupDiagnostics } from '../index.js';
import type { PromptContractSummary } from '../prompt/index.js';
import type { WorkspaceMissingSummary } from '../workspace/index.js';

export type StartupHealthStatus = 'degraded' | 'error' | 'ok';
export type StartupStatus =
  | 'auth-required'
  | 'expired-auth'
  | 'invalid-auth'
  | 'missing-prerequisites'
  | 'prompt-failure'
  | 'ready'
  | 'runtime-error';
export type StartupErrorCode =
  | 'repo-root-resolution-failed'
  | 'startup-diagnostics-failed'
  | 'startup-diagnostics-timeout';

export type StartupHealthPayload = {
  message: string;
  missing: {
    onboarding: number;
    optional: number;
    runtime: number;
  };
  agentRuntime: {
    authPath: string;
    message: string;
    promptState: AgentRuntimePromptState | null;
    status: StartupDiagnostics['agentRuntime']['status'];
  };
  ok: boolean;
  operationalStore: {
    message: string;
    status: StartupDiagnostics['operationalStore']['status'];
  };
  service: StartupDiagnostics['service'];
  sessionId: StartupDiagnostics['sessionId'];
  startupStatus: StartupStatus;
  status: StartupHealthStatus;
};

export type StartupPayload = {
  appStateRoot: {
    exists: boolean;
    path: string;
  };
  bootSurface: StartupDiagnostics['bootSurface'];
  diagnostics: {
    agentRuntime: StartupDiagnostics['agentRuntime'];
    currentSession: StartupDiagnostics['currentSession'];
    onboardingMissing: WorkspaceMissingSummary[];
    optionalMissing: WorkspaceMissingSummary[];
    promptContract: PromptContractSummary;
    runtimeMissing: WorkspaceMissingSummary[];
    workspace: {
      protectedOwners: StartupDiagnostics['workspace']['protectedOwners'];
      writableRoots: string[];
    };
  };
  health: StartupHealthPayload;
  message: string;
  mutationPolicy: StartupDiagnostics['mutationPolicy'];
  operationalStore: StartupDiagnostics['operationalStore'];
  repoRoot: string;
  service: StartupDiagnostics['service'];
  sessionId: StartupDiagnostics['sessionId'];
  status: StartupStatus;
  userLayerWrites: StartupDiagnostics['userLayerWrites'];
};

export type StartupErrorPayload = {
  error: {
    code: StartupErrorCode;
    message: string;
  };
  ok: false;
  service: StartupDiagnostics['service'];
  sessionId: StartupDiagnostics['sessionId'];
  status: 'error';
};

function getMissingCounts(diagnostics: StartupDiagnostics): StartupHealthPayload['missing'] {
  return {
    onboarding: diagnostics.onboardingMissing.length,
    optional: diagnostics.optionalMissing.length,
    runtime: diagnostics.runtimeMissing.length,
  };
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

export function getStartupStatus(diagnostics: StartupDiagnostics): StartupStatus {
  if (diagnostics.operationalStore.status === 'corrupt') {
    return 'runtime-error';
  }

  if (diagnostics.runtimeMissing.length > 0) {
    return 'runtime-error';
  }

  if (diagnostics.onboardingMissing.length > 0) {
    return 'missing-prerequisites';
  }

  if (diagnostics.agentRuntime.status !== 'ready') {
    return diagnostics.agentRuntime.status;
  }

  return 'ready';
}

export function getStartupMessage(diagnostics: StartupDiagnostics): string {
  const status = getStartupStatus(diagnostics);

  switch (status) {
    case 'ready':
      return diagnostics.operationalStore.status === 'absent'
        ? 'Bootstrap diagnostics are ready. Operational store initialization is still pending.'
        : 'Bootstrap diagnostics are ready.';
    case 'missing-prerequisites':
      return 'Bootstrap is live, but onboarding files are still missing.';
    case 'auth-required':
    case 'expired-auth':
    case 'invalid-auth':
    case 'prompt-failure':
      return diagnostics.agentRuntime.message;
    case 'runtime-error':
      return diagnostics.operationalStore.status === 'corrupt'
        ? 'Bootstrap is live, but the operational store is corrupt.'
        : 'Bootstrap is live, but required system files are missing.';
  }
}

export function getHealthStatus(status: StartupStatus): StartupHealthStatus {
  switch (status) {
    case 'ready':
      return 'ok';
    case 'auth-required':
    case 'expired-auth':
    case 'invalid-auth':
    case 'missing-prerequisites':
    case 'prompt-failure':
      return 'degraded';
    case 'runtime-error':
      return 'error';
  }
}

export function getStartupHttpStatus(status: StartupStatus): number {
  return status === 'runtime-error' ? 503 : 200;
}

export function getHealthHttpStatus(status: StartupHealthStatus): number {
  return status === 'error' ? 503 : 200;
}

export function createHealthPayload(
  diagnostics: StartupDiagnostics,
): StartupHealthPayload {
  const startupStatus = getStartupStatus(diagnostics);
  const healthStatus = getHealthStatus(startupStatus);

  return {
    agentRuntime: {
      authPath: diagnostics.agentRuntime.auth.authPath,
      message: diagnostics.agentRuntime.message,
      promptState: diagnostics.agentRuntime.prompt?.state ?? null,
      status: diagnostics.agentRuntime.status,
    },
    message: getStartupMessage(diagnostics),
    missing: getMissingCounts(diagnostics),
    ok: healthStatus !== 'error',
    operationalStore: {
      message: diagnostics.operationalStore.message,
      status: diagnostics.operationalStore.status,
    },
    service: diagnostics.service,
    sessionId: diagnostics.sessionId,
    startupStatus,
    status: healthStatus,
  };
}

export function createStartupPayload(
  diagnostics: StartupDiagnostics,
): StartupPayload {
  const status = getStartupStatus(diagnostics);

  return {
    appStateRoot: {
      exists: diagnostics.appStateRootExists,
      path: diagnostics.appStateRootPath,
    },
    bootSurface: diagnostics.bootSurface,
    diagnostics: {
      agentRuntime: diagnostics.agentRuntime,
      currentSession: diagnostics.currentSession,
      onboardingMissing: sortMissingItems(diagnostics.onboardingMissing),
      optionalMissing: sortMissingItems(diagnostics.optionalMissing),
      promptContract: diagnostics.promptContract,
      runtimeMissing: sortMissingItems(diagnostics.runtimeMissing),
      workspace: {
        protectedOwners: diagnostics.workspace.protectedOwners,
        writableRoots: [...diagnostics.workspace.writableRoots].sort(),
      },
    },
    health: createHealthPayload(diagnostics),
    message: getStartupMessage(diagnostics),
    mutationPolicy: diagnostics.mutationPolicy,
    operationalStore: diagnostics.operationalStore,
    repoRoot: diagnostics.repoRoot,
    service: diagnostics.service,
    sessionId: diagnostics.sessionId,
    status,
    userLayerWrites: diagnostics.userLayerWrites,
  };
}

export function createStartupErrorPayload(
  error: unknown,
  diagnostics: Pick<StartupDiagnostics, 'service' | 'sessionId'>,
): StartupErrorPayload {
  if (error instanceof RepoRootResolutionError) {
    return {
      error: {
        code: 'repo-root-resolution-failed',
        message: error.message,
      },
      ok: false,
      service: diagnostics.service,
      sessionId: diagnostics.sessionId,
      status: 'error',
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  const code = /timed out/i.test(message)
    ? 'startup-diagnostics-timeout'
    : 'startup-diagnostics-failed';

  return {
    error: {
      code,
      message,
    },
    ok: false,
    service: diagnostics.service,
    sessionId: diagnostics.sessionId,
    status: 'error',
  };
}

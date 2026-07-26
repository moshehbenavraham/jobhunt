import type { CurrentSessionMetadata } from '../index.js';
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../index.js';
import type { ApiServiceContainer } from '../runtime/service-container.js';
import type {
  OperationalStore,
  RuntimeApprovalRecord,
  RuntimeJobRecord,
  RuntimeSessionRecord,
  RuntimeSessionStatus,
} from '../store/store-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import {
  createHealthPayload,
  type StartupHealthPayload,
  type StartupStatus,
} from './startup-status.js';

const DEFAULT_PREVIEW_LIMIT = 5;
const MAX_PREVIEW_LIMIT = 10;
const MAX_COUNT_LIMIT = 100;

export type OperatorShellActivityState =
  | 'active'
  | 'attention-required'
  | 'idle'
  | 'unavailable';

export type OperatorShellApprovalSummary = {
  action: string;
  approvalId: string;
  jobId: string | null;
  requestedAt: string;
  sessionId: string;
  title: string;
  traceId: string | null;
};

export type OperatorShellFailureSummary = {
  failedAt: string;
  jobId: string;
  message: string;
  runId: string;
  sessionId: string;
  traceId: string | null;
};

export type OperatorShellActiveJobSummary = {
  jobId: string;
  status: string;
  updatedAt: string;
  waitReason: string | null;
};

export type OperatorShellActiveSessionSummary = {
  activeJob: OperatorShellActiveJobSummary | null;
  activeJobId: string | null;
  lastHeartbeatAt: string | null;
  pendingApprovalCount: number;
  sessionId: string;
  status: RuntimeSessionStatus;
  updatedAt: string;
  workflow: string;
};

export type OperatorShellSummaryPayload = {
  activity: {
    activeSession: OperatorShellActiveSessionSummary | null;
    activeSessionCount: number;
    latestPendingApprovals: OperatorShellApprovalSummary[];
    pendingApprovalCount: number;
    recentFailureCount: number;
    recentFailures: OperatorShellFailureSummary[];
    state: OperatorShellActivityState;
  };
  currentSession: CurrentSessionMetadata;
  generatedAt: string;
  health: StartupHealthPayload;
  message: string;
  ok: true;
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: StartupStatus;
};

export type OperatorShellSummaryOptions = {
  approvalLimit?: number;
  failureLimit?: number;
  sessionId?: string;
};

function clampPreviewLimit(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_PREVIEW_LIMIT;
  }

  return Math.max(1, Math.min(value, MAX_PREVIEW_LIMIT));
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequestString(
  request: JsonValue,
  key: 'action' | 'title',
): string {
  if (!isJsonObject(request)) {
    return '';
  }

  const candidate = request[key];
  return typeof candidate === 'string' ? candidate : '';
}

function toApprovalSummary(
  record: RuntimeApprovalRecord,
): OperatorShellApprovalSummary {
  return {
    action: readRequestString(record.request, 'action'),
    approvalId: record.approvalId,
    jobId: record.jobId,
    requestedAt: record.requestedAt,
    sessionId: record.sessionId,
    title: readRequestString(record.request, 'title'),
    traceId: record.traceId,
  };
}

function toActiveJobSummary(
  record: RuntimeJobRecord | null,
): OperatorShellActiveJobSummary | null {
  if (!record) {
    return null;
  }

  return {
    jobId: record.jobId,
    status: record.status,
    updatedAt: record.updatedAt,
    waitReason: record.waitReason,
  };
}

function toFailureSummary(input: {
  failedAt: string;
  jobId: string;
  message: string;
  runId: string;
  sessionId: string;
  traceId: string | null;
}): OperatorShellFailureSummary {
  return {
    failedAt: input.failedAt,
    jobId: input.jobId,
    message: input.message,
    runId: input.runId,
    sessionId: input.sessionId,
    traceId: input.traceId,
  };
}

function getActivityState(input: {
  activeSessionCount: number;
  pendingApprovalCount: number;
  recentFailureCount: number;
  storeReady: boolean;
}): OperatorShellActivityState {
  if (!input.storeReady) {
    return 'unavailable';
  }

  if (input.pendingApprovalCount > 0 || input.recentFailureCount > 0) {
    return 'attention-required';
  }

  if (input.activeSessionCount > 0) {
    return 'active';
  }

  return 'idle';
}

async function listPendingApprovals(
  store: OperationalStore,
  sessionId: string | undefined,
): Promise<RuntimeApprovalRecord[]> {
  return store.approvals.listPending({
    limit: MAX_COUNT_LIMIT,
    ...(sessionId ? { sessionId } : {}),
  });
}

async function buildActiveSessionSummary(
  store: OperationalStore,
  session: RuntimeSessionRecord,
): Promise<OperatorShellActiveSessionSummary> {
  const [activeJob, pendingApprovals] = await Promise.all([
    session.activeJobId ? store.jobs.getById(session.activeJobId) : null,
    listPendingApprovals(store, session.sessionId),
  ]);

  return {
    activeJob: toActiveJobSummary(activeJob),
    activeJobId: session.activeJobId,
    lastHeartbeatAt: session.lastHeartbeatAt,
    pendingApprovalCount: pendingApprovals.length,
    sessionId: session.sessionId,
    status: session.status,
    updatedAt: session.updatedAt,
    workflow: session.workflow,
  };
}

export async function createOperatorShellSummary(
  services: ApiServiceContainer,
  options: OperatorShellSummaryOptions = {},
): Promise<OperatorShellSummaryPayload> {
  const diagnostics = await services.startupDiagnostics.getDiagnostics();
  const health = createHealthPayload(diagnostics);
  const generatedAt = new Date().toISOString();

  if (diagnostics.operationalStore.status !== 'ready') {
    return {
      activity: {
        activeSession: null,
        activeSessionCount: 0,
        latestPendingApprovals: [],
        pendingApprovalCount: 0,
        recentFailureCount: 0,
        recentFailures: [],
        state: 'unavailable',
      },
      currentSession: diagnostics.currentSession,
      generatedAt,
      health,
      message: health.message,
      ok: true,
      service: STARTUP_SERVICE_NAME,
      sessionId: STARTUP_SESSION_ID,
      status: health.startupStatus,
    };
  }

  const store = await services.operationalStore.getStore();
  const activeSessions = await store.sessions.listActive();
  const previewApprovalLimit = clampPreviewLimit(options.approvalLimit);
  const previewFailureLimit = clampPreviewLimit(options.failureLimit);
  const focusSessionId = options.sessionId?.trim() || null;
  const pendingApprovals = await listPendingApprovals(
    store,
    focusSessionId ?? undefined,
  );
  const observability = await services.observability.getService();
  const diagnosticsSummary = await observability.getDiagnosticsSummary({
    limit: MAX_COUNT_LIMIT,
    ...(focusSessionId ? { sessionId: focusSessionId } : {}),
  });
  const activeSessionRecord =
    (focusSessionId
      ? activeSessions.find((session) => session.sessionId === focusSessionId)
      : activeSessions[0]) ?? null;
  const activeSession = activeSessionRecord
    ? await buildActiveSessionSummary(store, activeSessionRecord)
    : null;

  return {
    activity: {
      activeSession,
      activeSessionCount: focusSessionId
        ? activeSessions.filter(
            (session) => session.sessionId === focusSessionId,
          ).length
        : activeSessions.length,
      latestPendingApprovals: pendingApprovals
        .slice(0, previewApprovalLimit)
        .map((approval) => toApprovalSummary(approval)),
      pendingApprovalCount: pendingApprovals.length,
      recentFailureCount: diagnosticsSummary.failedJobs.length,
      recentFailures: diagnosticsSummary.failedJobs
        .slice(0, previewFailureLimit)
        .map((failure) => toFailureSummary(failure)),
      state: getActivityState({
        activeSessionCount: focusSessionId
          ? activeSessions.filter(
              (session) => session.sessionId === focusSessionId,
            ).length
          : activeSessions.length,
        pendingApprovalCount: pendingApprovals.length,
        recentFailureCount: diagnosticsSummary.failedJobs.length,
        storeReady: true,
      }),
    },
    currentSession: diagnostics.currentSession,
    generatedAt,
    health,
    message: health.message,
    ok: true,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status: health.startupStatus,
  };
}

import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../index.js';
import type { ApiServiceContainer } from '../runtime/service-container.js';
import type {
  OperationalStore,
  RuntimeApprovalRecord,
  RuntimeApprovalStatus,
  RuntimeEventRecord,
  RuntimeJobRecord,
  RuntimeSessionRecord,
  RuntimeSessionStatus,
} from '../store/store-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import type { OrchestrationRouteStatus } from '../orchestration/orchestration-contract.js';
import { getStartupMessage, getStartupStatus, type StartupStatus } from './startup-status.js';

const DEFAULT_QUEUE_LIMIT = 8;
const DEFAULT_TIMELINE_LIMIT = 12;
const MAX_PENDING_COUNT_LIMIT = 100;

export type ApprovalInboxSelectionState =
  | 'active'
  | 'approved'
  | 'missing'
  | 'rejected';

export type ApprovalInboxInterruptedRunState =
  | 'blocked'
  | 'completed'
  | 'missing'
  | 'resume-ready'
  | 'running'
  | 'waiting-for-approval';

export type ApprovalInboxQueueItem = {
  action: string;
  approvalId: string;
  jobId: string | null;
  requestedAt: string;
  sessionId: string;
  sessionStatus: RuntimeSessionStatus | null;
  title: string;
  traceId: string | null;
  workflow: string | null;
};

export type ApprovalInboxApprovalDetail = {
  action: string;
  approvalId: string;
  details: JsonValue | null;
  jobId: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  response: JsonValue | null;
  sessionId: string;
  status: RuntimeApprovalStatus;
  title: string;
  traceId: string | null;
};

export type ApprovalInboxJobSummary = {
  attempt: number;
  completedAt: string | null;
  currentRunId: string;
  jobId: string;
  jobType: string;
  startedAt: string | null;
  status: string;
  updatedAt: string;
  waitReason: string | null;
};

export type ApprovalInboxFailureSummary = {
  failedAt: string;
  jobId: string;
  message: string;
  runId: string;
  sessionId: string;
  traceId: string | null;
};

export type ApprovalInboxTimelineItem = {
  approvalId: string | null;
  eventId: string;
  eventType: string;
  jobId: string | null;
  level: 'error' | 'info' | 'warn';
  occurredAt: string;
  requestId: string | null;
  sessionId: string | null;
  summary: string;
  traceId: string | null;
};

export type ApprovalInboxSessionSummary = {
  activeJobId: string | null;
  lastHeartbeatAt: string | null;
  pendingApprovalCount: number;
  sessionId: string;
  status: string;
  updatedAt: string;
  workflow: string;
};

export type ApprovalInboxRouteSummary = {
  message: string;
  missingCapabilities: string[];
  specialistId: string | null;
  status: OrchestrationRouteStatus | null;
};

export type ApprovalInboxInterruptedRun = {
  message: string;
  resumeAllowed: boolean;
  sessionId: string | null;
  state: ApprovalInboxInterruptedRunState;
};

export type ApprovalInboxSelectedDetail = {
  approval: ApprovalInboxApprovalDetail | null;
  failure: ApprovalInboxFailureSummary | null;
  interruptedRun: ApprovalInboxInterruptedRun;
  job: ApprovalInboxJobSummary | null;
  route: ApprovalInboxRouteSummary;
  selectionMessage: string;
  selectionState: ApprovalInboxSelectionState;
  session: ApprovalInboxSessionSummary | null;
  timeline: ApprovalInboxTimelineItem[];
};

export type ApprovalInboxSummaryPayload = {
  filters: {
    approvalId: string | null;
    limit: number;
    sessionId: string | null;
  };
  generatedAt: string;
  message: string;
  ok: true;
  pendingApprovalCount: number;
  queue: ApprovalInboxQueueItem[];
  selected: ApprovalInboxSelectedDetail | null;
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: StartupStatus;
};

export type ApprovalInboxSummaryOptions = {
  approvalId?: string;
  limit?: number;
  sessionId?: string;
};

type StoredSessionRoute = {
  missingCapabilities: string[];
  specialistId: string | null;
  status: OrchestrationRouteStatus | null;
};

function clampQueueLimit(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_QUEUE_LIMIT;
  }

  return Math.max(1, Math.min(value, 25));
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractApprovalString(
  request: JsonValue,
  key: 'action' | 'title',
): string {
  if (!isJsonObject(request)) {
    return '';
  }

  const candidate = request[key];
  return typeof candidate === 'string' ? candidate : '';
}

function extractApprovalDetails(request: JsonValue): JsonValue | null {
  if (!isJsonObject(request) || !('details' in request)) {
    return null;
  }

  return request.details ?? null;
}

function extractStoredRoute(value: JsonValue): StoredSessionRoute {
  if (
    !isJsonObject(value) ||
    !('orchestration' in value) ||
    !isJsonObject(value.orchestration)
  ) {
    return {
      missingCapabilities: [],
      specialistId: null,
      status: null,
    };
  }

  const orchestration = value.orchestration;
  const status =
    typeof orchestration.lastRouteStatus === 'string' &&
    (orchestration.lastRouteStatus === 'ready' ||
      orchestration.lastRouteStatus === 'session-not-found' ||
      orchestration.lastRouteStatus === 'tooling-gap' ||
      orchestration.lastRouteStatus === 'unsupported-workflow')
      ? orchestration.lastRouteStatus
      : null;
  const specialistId =
    typeof orchestration.specialistId === 'string'
      ? orchestration.specialistId
      : null;
  const missingCapabilities =
    Array.isArray(orchestration.missingCapabilities) &&
    orchestration.missingCapabilities.every(
      (entry) => typeof entry === 'string',
    )
      ? [...orchestration.missingCapabilities]
      : [];

  return {
    missingCapabilities,
    specialistId,
    status,
  };
}

function toApprovalDetail(
  approval: RuntimeApprovalRecord,
): ApprovalInboxApprovalDetail {
  return {
    action: extractApprovalString(approval.request, 'action'),
    approvalId: approval.approvalId,
    details: extractApprovalDetails(approval.request),
    jobId: approval.jobId,
    requestedAt: approval.requestedAt,
    resolvedAt: approval.resolvedAt,
    response: approval.response,
    sessionId: approval.sessionId,
    status: approval.status,
    title: extractApprovalString(approval.request, 'title'),
    traceId: approval.traceId,
  };
}

function toQueueItem(
  approval: RuntimeApprovalRecord,
  session: RuntimeSessionRecord | null,
): ApprovalInboxQueueItem {
  return {
    action: extractApprovalString(approval.request, 'action'),
    approvalId: approval.approvalId,
    jobId: approval.jobId,
    requestedAt: approval.requestedAt,
    sessionId: approval.sessionId,
    sessionStatus: session?.status ?? null,
    title: extractApprovalString(approval.request, 'title'),
    traceId: approval.traceId,
    workflow: session?.workflow ?? null,
  };
}

function toJobSummary(job: RuntimeJobRecord): ApprovalInboxJobSummary {
  return {
    attempt: job.attempt,
    completedAt: job.completedAt,
    currentRunId: job.currentRunId,
    jobId: job.jobId,
    jobType: job.jobType,
    startedAt: job.startedAt,
    status: job.status,
    updatedAt: job.updatedAt,
    waitReason: job.waitReason,
  };
}

function toTimelineItem(record: RuntimeEventRecord): ApprovalInboxTimelineItem {
  return {
    approvalId: record.approvalId,
    eventId: record.eventId,
    eventType: record.eventType,
    jobId: record.jobId,
    level: record.level,
    occurredAt: record.occurredAt,
    requestId: record.requestId,
    sessionId: record.sessionId,
    summary: record.summary,
    traceId: record.traceId,
  };
}

function toFailureSummary(
  record: RuntimeEventRecord,
): ApprovalInboxFailureSummary | null {
  if (!record.jobId || !record.sessionId) {
    return null;
  }

  const metadata = isJsonObject(record.metadata) ? record.metadata : {};
  const message =
    typeof metadata.message === 'string' ? metadata.message : record.summary;
  const runId =
    typeof metadata.runId === 'string'
      ? metadata.runId
      : (record.traceId ?? record.eventId);

  return {
    failedAt: record.occurredAt,
    jobId: record.jobId,
    message,
    runId,
    sessionId: record.sessionId,
    traceId: record.traceId,
  };
}

function toSessionSummary(
  session: RuntimeSessionRecord,
  approvals: RuntimeApprovalRecord[],
): ApprovalInboxSessionSummary {
  return {
    activeJobId: session.activeJobId,
    lastHeartbeatAt: session.lastHeartbeatAt,
    pendingApprovalCount: approvals.filter((approval) => approval.status === 'pending')
      .length,
    sessionId: session.sessionId,
    status: session.status,
    updatedAt: session.updatedAt,
    workflow: session.workflow,
  };
}

function selectJob(jobs: RuntimeJobRecord[]): RuntimeJobRecord | null {
  if (jobs.length === 0) {
    return null;
  }

  const priority = new Map<string, number>([
    ['running', 0],
    ['waiting', 1],
    ['pending', 2],
    ['queued', 3],
    ['completed', 4],
    ['failed', 5],
    ['cancelled', 6],
  ]);

  const [job] = [...jobs].sort((left, right) => {
    const leftPriority = priority.get(left.status) ?? 99;
    const rightPriority = priority.get(right.status) ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });

  return job ?? null;
}

function resolveSelectionState(
  approval: RuntimeApprovalRecord | null,
  requestedApprovalId: string | null,
): ApprovalInboxSelectionState {
  if (!approval) {
    return requestedApprovalId ? 'missing' : 'active';
  }

  switch (approval.status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'pending':
      return 'active';
  }
}

function resolveSelectionMessage(input: {
  approval: RuntimeApprovalRecord | null;
  requestedApprovalId: string | null;
}): string {
  if (!input.approval) {
    return input.requestedApprovalId
      ? `Approval ${input.requestedApprovalId} is no longer available.`
      : 'Select a pending approval to inspect its review context.';
  }

  const title =
    extractApprovalString(input.approval.request, 'title') ||
    input.approval.approvalId;

  switch (input.approval.status) {
    case 'approved':
      return `${title} has already been approved. Refresh the live runtime state before taking the next action.`;
    case 'rejected':
      return `${title} has already been rejected. Review the interrupted run state before resuming.`;
    case 'pending':
      return `${title} is ready for review. Resolve it from the shared approval runtime path.`;
  }
}

function resolveRouteMessage(input: {
  failure: ApprovalInboxFailureSummary | null;
  route: StoredSessionRoute;
}): string {
  if (input.failure) {
    return input.failure.message;
  }

  if (input.route.status === 'tooling-gap') {
    return 'This session is blocked by a tooling gap.';
  }

  if (input.route.status === 'session-not-found') {
    return 'Runtime session does not exist anymore.';
  }

  return 'Route details are available from the stored orchestration context.';
}

function resolveInterruptedRun(input: {
  pendingApprovalCount: number;
  selectedJob: RuntimeJobRecord | null;
  session: RuntimeSessionRecord | null;
}): ApprovalInboxInterruptedRun {
  if (!input.session) {
    return {
      message: 'No runtime session is attached to this approval anymore.',
      resumeAllowed: false,
      sessionId: null,
      state: 'missing',
    };
  }

  if (
    input.pendingApprovalCount > 0 ||
    (input.selectedJob?.status === 'waiting' &&
      input.selectedJob.waitReason === 'approval')
  ) {
    return {
      message: 'Resolve the pending approval before attempting a resume handoff.',
      resumeAllowed: false,
      sessionId: input.session.sessionId,
      state: 'waiting-for-approval',
    };
  }

  if (
    input.session.status === 'failed' ||
    input.selectedJob?.status === 'failed' ||
    (input.session.status === 'waiting' &&
      input.selectedJob?.waitReason !== 'approval')
  ) {
    return {
      message: 'This session can be handed back to the shared orchestration resume path.',
      resumeAllowed: true,
      sessionId: input.session.sessionId,
      state: 'resume-ready',
    };
  }

  if (
    input.session.status === 'pending' ||
    input.session.status === 'running' ||
    input.selectedJob?.status === 'pending' ||
    input.selectedJob?.status === 'queued' ||
    input.selectedJob?.status === 'running'
  ) {
    return {
      message: 'Runtime work is already active for this session.',
      resumeAllowed: false,
      sessionId: input.session.sessionId,
      state: 'running',
    };
  }

  if (input.session.status === 'completed') {
    return {
      message: 'This session has already completed.',
      resumeAllowed: false,
      sessionId: input.session.sessionId,
      state: 'completed',
    };
  }

  return {
    message: 'This session is not currently resumable from the approval inbox.',
    resumeAllowed: false,
    sessionId: input.session.sessionId,
    state: 'blocked',
  };
}

async function resolveSelectedApproval(
  store: OperationalStore,
  options: Required<ApprovalInboxSummaryPayload['filters']>,
  pendingApprovals: readonly RuntimeApprovalRecord[],
): Promise<RuntimeApprovalRecord | null> {
  if (options.approvalId) {
    return store.approvals.getById(options.approvalId);
  }

  if (pendingApprovals.length > 0) {
    return pendingApprovals[0] ?? null;
  }

  if (options.sessionId) {
    const approvals = await store.approvals.listBySessionId(options.sessionId);
    return approvals[0] ?? null;
  }

  return null;
}

async function buildSelectedDetail(
  store: OperationalStore,
  selectedApproval: RuntimeApprovalRecord | null,
  options: Required<ApprovalInboxSummaryPayload['filters']>,
): Promise<ApprovalInboxSelectedDetail | null> {
  if (!selectedApproval && !options.approvalId) {
    return null;
  }

  const sessionId = selectedApproval?.sessionId ?? options.sessionId ?? null;
  const session = sessionId ? await store.sessions.getById(sessionId) : null;
  const approvals = sessionId
    ? await store.approvals.listBySessionId(sessionId)
    : [];
  const jobs = sessionId ? await store.jobs.listBySessionId(sessionId) : [];
  const selectedJob = selectJob(jobs);
  const route = session ? extractStoredRoute(session.context) : {
    missingCapabilities: [],
    specialistId: null,
    status: null,
  };
  const failureEvents =
    sessionId === null
      ? []
      : await store.events.list({
          eventTypes: ['job-failed'],
          limit: 1,
          sessionId,
        });
  const timeline =
    sessionId === null
      ? selectedApproval
        ? await store.events.list({
            approvalId: selectedApproval.approvalId,
            limit: DEFAULT_TIMELINE_LIMIT,
          })
        : []
      : await store.events.list({
          limit: DEFAULT_TIMELINE_LIMIT,
          sessionId,
        });
  const failure = failureEvents[0] ? toFailureSummary(failureEvents[0]) : null;
  const selectionState = resolveSelectionState(
    selectedApproval,
    options.approvalId,
  );
  const pendingApprovalCount = approvals.filter(
    (approval) => approval.status === 'pending',
  ).length;

  return {
    approval: selectedApproval ? toApprovalDetail(selectedApproval) : null,
    failure,
    interruptedRun: resolveInterruptedRun({
      pendingApprovalCount,
      selectedJob,
      session,
    }),
    job: selectedJob ? toJobSummary(selectedJob) : null,
    route: {
      message: resolveRouteMessage({
        failure,
        route,
      }),
      missingCapabilities: [...route.missingCapabilities],
      specialistId: route.specialistId,
      status: route.status,
    },
    selectionMessage: resolveSelectionMessage({
      approval: selectedApproval,
      requestedApprovalId: options.approvalId,
    }),
    selectionState,
    session: session ? toSessionSummary(session, approvals) : null,
    timeline: timeline.map((event) => toTimelineItem(event)),
  };
}

export async function createApprovalInboxSummary(
  services: ApiServiceContainer,
  options: ApprovalInboxSummaryOptions = {},
): Promise<ApprovalInboxSummaryPayload> {
  const diagnostics = await services.startupDiagnostics.getDiagnostics();
  const status = getStartupStatus(diagnostics);
  const generatedAt = new Date().toISOString();
  const normalizedFilters = {
    approvalId: options.approvalId?.trim() || null,
    limit: clampQueueLimit(options.limit),
    sessionId: options.sessionId?.trim() || null,
  };

  if (diagnostics.operationalStore.status !== 'ready') {
    return {
      filters: normalizedFilters,
      generatedAt,
      message: getStartupMessage(diagnostics),
      ok: true,
      pendingApprovalCount: 0,
      queue: [],
      selected: null,
      service: STARTUP_SERVICE_NAME,
      sessionId: STARTUP_SESSION_ID,
      status,
    };
  }

  const store = await services.operationalStore.getStore();
  const pendingApprovals = await store.approvals.listPending({
    limit: MAX_PENDING_COUNT_LIMIT,
    ...(normalizedFilters.sessionId
      ? { sessionId: normalizedFilters.sessionId }
      : {}),
  });
  const queueApprovals = pendingApprovals.slice(0, normalizedFilters.limit);
  const queue = await Promise.all(
    queueApprovals.map(async (approval) =>
      toQueueItem(
        approval,
        await store.sessions.getById(approval.sessionId),
      ),
    ),
  );
  const selectedApproval = await resolveSelectedApproval(
    store,
    normalizedFilters,
    queueApprovals,
  );
  const selected = await buildSelectedDetail(
    store,
    selectedApproval,
    normalizedFilters,
  );

  return {
    filters: normalizedFilters,
    generatedAt,
    message:
      status === 'ready'
        ? pendingApprovals.length > 0
          ? 'Approval inbox summary is ready.'
          : 'Approval inbox is ready. No pending approvals are waiting right now.'
        : getStartupMessage(diagnostics),
    ok: true,
    pendingApprovalCount: pendingApprovals.length,
    queue,
    selected,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status,
  };
}

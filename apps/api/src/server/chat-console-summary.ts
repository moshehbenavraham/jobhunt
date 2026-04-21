import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../index.js';
import {
  getStartupMessage,
  getStartupStatus,
  type StartupStatus,
} from './startup-status.js';
import type { ApiServiceContainer } from '../runtime/service-container.js';
import type {
  OperationalStore,
  RuntimeApprovalRecord,
  RuntimeEventRecord,
  RuntimeJobRecord,
  RuntimeSessionRecord,
  RuntimeSessionStatus,
} from '../store/store-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import {
  getSpecialistDefinition,
  getWorkflowSpecialistRoute,
} from '../orchestration/specialist-catalog.js';
import type {
  OrchestrationHandoffEnvelope,
  OrchestrationRouteStatus,
  OrchestrationRuntimeState,
} from '../orchestration/orchestration-contract.js';
import { WORKFLOW_INTENTS, type WorkflowIntent } from '../prompt/index.js';

const DEFAULT_RECENT_SESSION_LIMIT = 8;
const MAX_RECENT_SESSION_LIMIT = 12;
const DEFAULT_TIMELINE_LIMIT = 12;
const DEFAULT_SESSION_STATUSES: RuntimeSessionStatus[] = [
  'completed',
  'failed',
  'pending',
  'running',
  'waiting',
] as const;

export type ChatConsoleRunState =
  | 'auth-required'
  | 'failed'
  | 'ready'
  | 'running'
  | 'tooling-gap'
  | 'waiting-for-approval';

export type ChatConsoleWorkflowOption = {
  description: string;
  intent: WorkflowIntent;
  label: string;
  message: string;
  missingCapabilities: string[];
  modeRepoRelativePath: string;
  specialist: {
    description: string;
    id: string;
    label: string;
  } | null;
  status: 'ready' | 'tooling-gap';
};

export type ChatConsoleJobSummary = {
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

export type ChatConsoleApprovalSummary = {
  action: string;
  approvalId: string;
  jobId: string | null;
  requestedAt: string;
  title: string;
  traceId: string | null;
};

export type ChatConsoleFailureSummary = {
  failedAt: string;
  jobId: string;
  message: string;
  runId: string;
  sessionId: string;
  traceId: string | null;
};

export type ChatConsoleTimelineItem = {
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

export type ChatConsoleSessionSummary = {
  activeJobId: string | null;
  job: ChatConsoleJobSummary | null;
  latestFailure: ChatConsoleFailureSummary | null;
  lastHeartbeatAt: string | null;
  pendingApproval: ChatConsoleApprovalSummary | null;
  pendingApprovalCount: number;
  resumeAllowed: boolean;
  sessionId: string;
  state: ChatConsoleRunState;
  status: string;
  updatedAt: string;
  workflow: string;
};

export type ChatConsoleSessionDetail = {
  approvals: ChatConsoleApprovalSummary[];
  failure: ChatConsoleFailureSummary | null;
  jobs: ChatConsoleJobSummary[];
  route: {
    message: string;
    missingCapabilities: string[];
    specialistId: string | null;
    status: OrchestrationRouteStatus | null;
  };
  session: ChatConsoleSessionSummary;
  timeline: ChatConsoleTimelineItem[];
};

export type ChatConsoleSummaryPayload = {
  generatedAt: string;
  message: string;
  ok: true;
  recentSessions: ChatConsoleSessionSummary[];
  selectedSession: ChatConsoleSessionDetail | null;
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: StartupStatus;
  workflows: ChatConsoleWorkflowOption[];
};

export type ChatConsoleCommandPayload = {
  generatedAt: string;
  handoff: {
    job: ChatConsoleJobSummary | null;
    message: string;
    pendingApproval: ChatConsoleApprovalSummary | null;
    requestedAt: string;
    route: OrchestrationHandoffEnvelope['route'];
    runtime: {
      message: string;
      modeRepoRelativePath: string | null;
      model: string | null;
      promptState: string | null;
      startedAt: string | null;
      status: OrchestrationRuntimeState['status'];
      workflow: WorkflowIntent | null;
    };
    selectedSession: ChatConsoleSessionDetail | null;
    session: ChatConsoleSessionSummary | null;
    specialist: {
      description: string;
      id: string;
      label: string;
    } | null;
    state: ChatConsoleRunState;
    toolingGap: OrchestrationHandoffEnvelope['toolingGap'];
  };
  ok: true;
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: StartupStatus;
};

export type ChatConsoleSummaryOptions = {
  cursorSessionId?: string;
  cursorUpdatedAt?: string;
  limit?: number;
  sessionId?: string;
  statuses?: RuntimeSessionStatus[];
  workflow?: string;
};

type StoredSessionRoute = {
  missingCapabilities: string[];
  specialistId: string | null;
  status: OrchestrationRouteStatus | null;
};

function isWorkflowIntent(candidate: unknown): candidate is WorkflowIntent {
  return (
    typeof candidate === 'string' &&
    (WORKFLOW_INTENTS as readonly string[]).includes(candidate)
  );
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function humanizeWorkflowLabel(intent: WorkflowIntent): string {
  const segmentMap = new Map([
    ['ats', 'ATS'],
    ['linkedin', 'LinkedIn'],
    ['pdf', 'PDF'],
  ]);

  return intent
    .split('-')
    .map((segment) => {
      const mapped = segmentMap.get(segment);

      if (mapped) {
        return mapped;
      }

      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(' ');
}

function clampRecentSessionLimit(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_RECENT_SESSION_LIMIT;
  }

  return Math.max(1, Math.min(value, MAX_RECENT_SESSION_LIMIT));
}

function extractRequestString(
  request: JsonValue,
  key: 'action' | 'title',
): string {
  if (!isJsonObject(request)) {
    return '';
  }

  const candidate = request[key];
  return typeof candidate === 'string' ? candidate : '';
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

function toWorkflowOption(
  input: {
    description: string;
    intent: WorkflowIntent;
    modeRepoRelativePath: string;
  },
): ChatConsoleWorkflowOption {
  const route = getWorkflowSpecialistRoute(input.intent);
  const specialist = route ? getSpecialistDefinition(route.specialistId) : null;

  return {
    description: input.description,
    intent: input.intent,
    label: humanizeWorkflowLabel(input.intent),
    message:
      route?.message ??
      `Workflow ${input.intent} is not routed to a specialist yet.`,
    missingCapabilities: route ? [...route.missingCapabilities] : [],
    modeRepoRelativePath: input.modeRepoRelativePath,
    specialist: specialist
      ? {
          description: specialist.description,
          id: specialist.id,
          label: specialist.label,
        }
      : null,
    status: route?.status ?? 'tooling-gap',
  };
}

function toJobSummary(record: RuntimeJobRecord): ChatConsoleJobSummary {
  return {
    attempt: record.attempt,
    completedAt: record.completedAt,
    currentRunId: record.currentRunId,
    jobId: record.jobId,
    jobType: record.jobType,
    startedAt: record.startedAt,
    status: record.status,
    updatedAt: record.updatedAt,
    waitReason: record.waitReason,
  };
}

function toApprovalSummary(
  record: RuntimeApprovalRecord,
): ChatConsoleApprovalSummary {
  return {
    action: extractRequestString(record.request, 'action'),
    approvalId: record.approvalId,
    jobId: record.jobId,
    requestedAt: record.requestedAt,
    title: extractRequestString(record.request, 'title'),
    traceId: record.traceId,
  };
}

function toTimelineItem(record: RuntimeEventRecord): ChatConsoleTimelineItem {
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
): ChatConsoleFailureSummary | null {
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

function resolveSessionState(input: {
  job: RuntimeJobRecord | null;
  pendingApprovalCount: number;
  routeStatus: OrchestrationRouteStatus | null;
  session: RuntimeSessionRecord;
}): ChatConsoleRunState {
  if (
    input.pendingApprovalCount > 0 ||
    (input.job?.status === 'waiting' && input.job.waitReason === 'approval')
  ) {
    return 'waiting-for-approval';
  }

  if (input.routeStatus === 'tooling-gap') {
    return 'tooling-gap';
  }

  if (input.session.status === 'failed' || input.job?.status === 'failed') {
    return 'failed';
  }

  if (
    input.session.status === 'pending' ||
    input.session.status === 'running' ||
    input.session.status === 'waiting' ||
    input.job?.status === 'pending' ||
    input.job?.status === 'queued' ||
    input.job?.status === 'running' ||
    input.job?.status === 'waiting'
  ) {
    return 'running';
  }

  return 'ready';
}

function resolveResumeAllowed(session: RuntimeSessionRecord): boolean {
  return session.status !== 'cancelled';
}

function resolveSessionRouteMessage(input: {
  failure: ChatConsoleFailureSummary | null;
  route: StoredSessionRoute;
  workflow: string;
}): string {
  if (input.failure) {
    return input.failure.message;
  }

  if (isWorkflowIntent(input.workflow)) {
    const specialistRoute = getWorkflowSpecialistRoute(input.workflow);

    if (specialistRoute) {
      return specialistRoute.message;
    }
  }

  if (input.route.status === 'session-not-found') {
    return 'Runtime session does not exist anymore.';
  }

  return 'Route details are not available for this session yet.';
}

async function loadSessionContext(
  store: OperationalStore,
  session: RuntimeSessionRecord,
): Promise<{
  approvals: RuntimeApprovalRecord[];
  failure: ChatConsoleFailureSummary | null;
  jobs: RuntimeJobRecord[];
  route: StoredSessionRoute;
  selectedJob: RuntimeJobRecord | null;
  timeline: RuntimeEventRecord[];
}> {
  const [approvals, jobs, failureEvents, timeline] = await Promise.all([
    store.approvals.listBySessionId(session.sessionId),
    store.jobs.listBySessionId(session.sessionId),
    store.events.list({
      eventTypes: ['job-failed'],
      limit: 1,
      sessionId: session.sessionId,
    }),
    store.events.list({
      limit: DEFAULT_TIMELINE_LIMIT,
      sessionId: session.sessionId,
    }),
  ]);
  const route = extractStoredRoute(session.context);
  const failure = failureEvents[0] ? toFailureSummary(failureEvents[0]) : null;
  const selectedJob = selectJob(jobs);

  return {
    approvals,
    failure,
    jobs,
    route,
    selectedJob,
    timeline,
  };
}

async function buildSessionSummary(
  store: OperationalStore,
  session: RuntimeSessionRecord,
): Promise<ChatConsoleSessionSummary> {
  const context = await loadSessionContext(store, session);
  const pendingApprovals = context.approvals.filter(
    (approval) => approval.status === 'pending',
  );

  return {
    activeJobId: session.activeJobId,
    job: context.selectedJob ? toJobSummary(context.selectedJob) : null,
    latestFailure: context.failure,
    lastHeartbeatAt: session.lastHeartbeatAt,
    pendingApproval: pendingApprovals[0]
      ? toApprovalSummary(pendingApprovals[0])
      : null,
    pendingApprovalCount: pendingApprovals.length,
    resumeAllowed: resolveResumeAllowed(session),
    sessionId: session.sessionId,
    state: resolveSessionState({
      job: context.selectedJob,
      pendingApprovalCount: pendingApprovals.length,
      routeStatus: context.route.status,
      session,
    }),
    status: session.status,
    updatedAt: session.updatedAt,
    workflow: session.workflow,
  };
}

async function buildSessionDetail(
  store: OperationalStore,
  session: RuntimeSessionRecord,
): Promise<ChatConsoleSessionDetail> {
  const [summary, context] = await Promise.all([
    buildSessionSummary(store, session),
    loadSessionContext(store, session),
  ]);

  return {
    approvals: context.approvals.map((approval) => toApprovalSummary(approval)),
    failure: context.failure,
    jobs: context.jobs.map((job) => toJobSummary(job)),
    route: {
      message: resolveSessionRouteMessage({
        failure: context.failure,
        route: context.route,
        workflow: session.workflow,
      }),
      missingCapabilities: [...context.route.missingCapabilities],
      specialistId: context.route.specialistId,
      status: context.route.status,
    },
    session: summary,
    timeline: context.timeline.map((event) => toTimelineItem(event)),
  };
}

function createRuntimeSummary(
  runtime: OrchestrationRuntimeState,
): ChatConsoleCommandPayload['handoff']['runtime'] {
  if (runtime.status === 'blocked') {
    return {
      message: runtime.message,
      modeRepoRelativePath: null,
      model: null,
      promptState: runtime.prompt?.state ?? null,
      startedAt: null,
      status: runtime.status,
      workflow: null,
    };
  }

  if (runtime.status === 'ready') {
    return {
      message: `Runtime is ready for workflow ${runtime.prompt.workflow}.`,
      modeRepoRelativePath: runtime.prompt.modeRepoRelativePath,
      model: runtime.model,
      promptState: runtime.prompt.state,
      startedAt: runtime.startedAt,
      status: runtime.status,
      workflow: runtime.prompt.workflow,
    };
  }

  return {
    message: runtime.message,
    modeRepoRelativePath: null,
    model: null,
    promptState: null,
    startedAt: null,
    status: runtime.status,
    workflow: null,
  };
}

function resolveHandoffState(
  handoff: OrchestrationHandoffEnvelope,
): ChatConsoleRunState {
  if (
    handoff.pendingApproval ||
    (handoff.job?.status === 'waiting' &&
      handoff.job.waitReason === 'approval')
  ) {
    return 'waiting-for-approval';
  }

  if (handoff.runtime.status === 'blocked') {
    return 'auth-required';
  }

  if (handoff.route.status === 'tooling-gap') {
    return 'tooling-gap';
  }

  if (
    handoff.route.status === 'session-not-found' ||
    handoff.route.status === 'unsupported-workflow' ||
    handoff.job?.status === 'failed' ||
    handoff.session?.status === 'failed'
  ) {
    return 'failed';
  }

  if (
    handoff.job?.status === 'pending' ||
    handoff.job?.status === 'queued' ||
    handoff.job?.status === 'running' ||
    handoff.session?.status === 'pending' ||
    handoff.session?.status === 'running' ||
    handoff.session?.status === 'waiting'
  ) {
    return 'running';
  }

  return 'ready';
}

function resolveHandoffMessage(
  handoff: OrchestrationHandoffEnvelope,
  state: ChatConsoleRunState,
): string {
  switch (state) {
    case 'auth-required':
      return handoff.runtime.status === 'blocked'
        ? handoff.runtime.message
        : handoff.route.message;
    case 'failed':
      return handoff.route.message;
    case 'tooling-gap':
      return handoff.toolingGap?.message ?? handoff.route.message;
    case 'waiting-for-approval':
      return handoff.pendingApproval
        ? `Run is waiting for approval: ${handoff.pendingApproval.title || handoff.pendingApproval.approvalId}.`
        : 'Run is waiting for approval.';
    case 'running':
      return 'Run handoff is active.';
    case 'ready':
      return handoff.route.message;
  }
}

async function buildSelectedSessionDetail(
  services: ApiServiceContainer,
  sessionId: string | null,
): Promise<ChatConsoleSessionDetail | null> {
  if (!sessionId) {
    return null;
  }

  const status = await services.operationalStore.getStatus();

  if (status.status !== 'ready') {
    return null;
  }

  const store = await services.operationalStore.getStore();
  const session = await store.sessions.getById(sessionId);

  if (!session) {
    return null;
  }

  return buildSessionDetail(store, session);
}

export async function createChatConsoleSummary(
  services: ApiServiceContainer,
  options: ChatConsoleSummaryOptions = {},
): Promise<ChatConsoleSummaryPayload> {
  const diagnostics = await services.startupDiagnostics.getDiagnostics();
  const status = getStartupStatus(diagnostics);
  const message = getStartupMessage(diagnostics);
  const workflows = diagnostics.promptContract.workflowRoutes.map((route) =>
    toWorkflowOption(route),
  );
  const generatedAt = new Date().toISOString();

  if (diagnostics.operationalStore.status !== 'ready') {
    return {
      generatedAt,
      message,
      ok: true,
      recentSessions: [],
      selectedSession: null,
      service: STARTUP_SERVICE_NAME,
      sessionId: STARTUP_SESSION_ID,
      status,
      workflows,
    };
  }

  const store = await services.operationalStore.getStore();
  const recentSessions = await store.sessions.listRecent({
    ...(options.cursorSessionId && options.cursorUpdatedAt
      ? {
          cursor: {
            sessionId: options.cursorSessionId,
            updatedAt: options.cursorUpdatedAt,
          },
        }
      : {}),
    limit: clampRecentSessionLimit(options.limit),
    statuses: options.statuses ?? DEFAULT_SESSION_STATUSES,
    ...(options.workflow ? { workflow: options.workflow } : {}),
  });
  const recentSessionSummaries = await Promise.all(
    recentSessions.map((session) => buildSessionSummary(store, session)),
  );
  const focusSessionId = options.sessionId ?? recentSessions[0]?.sessionId ?? null;
  const selectedSession = focusSessionId
    ? await buildSelectedSessionDetail(services, focusSessionId)
    : null;

  return {
    generatedAt,
    message:
      status === 'ready'
        ? 'Chat console summary is ready.'
        : message,
    ok: true,
    recentSessions: recentSessionSummaries,
    selectedSession,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status,
    workflows,
  };
}

export async function createChatConsoleCommandPayload(
  services: ApiServiceContainer,
  handoff: OrchestrationHandoffEnvelope,
): Promise<ChatConsoleCommandPayload> {
  const diagnostics = await services.startupDiagnostics.getDiagnostics();
  const status = getStartupStatus(diagnostics);
  const state = resolveHandoffState(handoff);
  const generatedAt = new Date().toISOString();
  const selectedSession = await buildSelectedSessionDetail(
    services,
    handoff.session?.sessionId ?? null,
  );
  const session = selectedSession?.session ?? null;
  const specialist = handoff.specialist
    ? {
        description: handoff.specialist.description,
        id: handoff.specialist.id,
        label: getSpecialistDefinition(handoff.specialist.id).label,
      }
    : null;

  return {
    generatedAt,
    handoff: {
      job: handoff.job
        ? {
            attempt: handoff.job.attempt,
            completedAt: handoff.job.completedAt,
            currentRunId: handoff.job.currentRunId,
            jobId: handoff.job.jobId,
            jobType: handoff.job.jobType,
            startedAt: handoff.job.startedAt,
            status: handoff.job.status,
            updatedAt: handoff.job.updatedAt,
            waitReason: handoff.job.waitReason,
          }
        : null,
      message: resolveHandoffMessage(handoff, state),
      pendingApproval: handoff.pendingApproval
        ? {
            action: handoff.pendingApproval.action,
            approvalId: handoff.pendingApproval.approvalId,
            jobId: handoff.pendingApproval.jobId,
            requestedAt: handoff.pendingApproval.requestedAt,
            title: handoff.pendingApproval.title,
            traceId: handoff.pendingApproval.traceId,
          }
        : null,
      requestedAt: handoff.requestedAt,
      route: handoff.route,
      runtime: createRuntimeSummary(handoff.runtime),
      selectedSession,
      session,
      specialist,
      state,
      toolingGap: handoff.toolingGap,
    },
    ok: true,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status,
  };
}

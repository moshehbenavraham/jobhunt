export const CHAT_CONSOLE_WORKFLOW_INTENTS = [
  'application-help',
  'auto-pipeline',
  'batch-evaluation',
  'compare-offers',
  'deep-company-research',
  'follow-up-cadence',
  'generate-ats-pdf',
  'interview-prep',
  'linkedin-outreach',
  'process-pipeline',
  'project-review',
  'rejection-patterns',
  'scan-portals',
  'single-evaluation',
  'tracker-status',
  'training-review',
] as const;

export type ChatConsoleWorkflowIntent =
  (typeof CHAT_CONSOLE_WORKFLOW_INTENTS)[number];

export type ChatConsoleStartupStatus =
  | 'auth-required'
  | 'expired-auth'
  | 'invalid-auth'
  | 'missing-prerequisites'
  | 'prompt-failure'
  | 'ready'
  | 'runtime-error';

export type ChatConsoleRunState =
  | 'auth-required'
  | 'failed'
  | 'ready'
  | 'running'
  | 'tooling-gap'
  | 'waiting-for-approval';

export type ChatConsoleRouteStatus =
  | 'ready'
  | 'session-not-found'
  | 'tooling-gap'
  | 'unsupported-workflow';

export type ChatConsoleApiErrorStatus =
  | 'bad-request'
  | 'error'
  | 'method-not-allowed'
  | 'not-found'
  | 'rate-limited';

export type ChatConsoleRuntimeState =
  | {
      message: string;
      promptState: string | null;
      status: 'blocked';
    }
  | {
      message: string;
      model: string;
      modeRepoRelativePath: string;
      startedAt: string;
      status: 'ready';
      workflow: ChatConsoleWorkflowIntent;
    }
  | {
      message: string;
      status: 'skipped';
    };

export type ChatConsoleSpecialistSummary = {
  description: string;
  id: string;
  label: string;
};

export type ChatConsoleWorkflowOption = {
  description: string;
  intent: ChatConsoleWorkflowIntent;
  label: string;
  message: string;
  missingCapabilities: string[];
  modeRepoRelativePath: string;
  specialist: ChatConsoleSpecialistSummary | null;
  status: Exclude<
    ChatConsoleRouteStatus,
    'session-not-found' | 'unsupported-workflow'
  >;
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

export type ChatConsoleSessionRoute = {
  message: string;
  missingCapabilities: string[];
  specialistId: string | null;
  status: ChatConsoleRouteStatus | null;
};

export type ChatConsoleSessionDetail = {
  approvals: ChatConsoleApprovalSummary[];
  failure: ChatConsoleFailureSummary | null;
  jobs: ChatConsoleJobSummary[];
  route: ChatConsoleSessionRoute;
  session: ChatConsoleSessionSummary;
  timeline: ChatConsoleTimelineItem[];
};

export type ChatConsoleSummaryPayload = {
  generatedAt: string;
  message: string;
  ok: true;
  recentSessions: ChatConsoleSessionSummary[];
  selectedSession: ChatConsoleSessionDetail | null;
  service: string;
  sessionId: string;
  status: ChatConsoleStartupStatus;
  workflows: ChatConsoleWorkflowOption[];
};

export type ChatConsoleRouteDecision = {
  message: string;
  missingCapabilities: string[];
  requestKind: 'launch' | 'resume';
  sessionId: string | null;
  specialistId: string | null;
  status: ChatConsoleRouteStatus;
  workflow: ChatConsoleWorkflowIntent | null;
};

export type ChatConsoleCommandHandoff = {
  job: ChatConsoleJobSummary | null;
  message: string;
  pendingApproval: ChatConsoleApprovalSummary | null;
  requestedAt: string;
  route: ChatConsoleRouteDecision;
  runtime: ChatConsoleRuntimeState;
  selectedSession: ChatConsoleSessionDetail | null;
  session: ChatConsoleSessionSummary | null;
  specialist: ChatConsoleSpecialistSummary | null;
  state: ChatConsoleRunState;
  toolingGap: {
    message: string;
    missingCapabilities: string[];
  } | null;
};

export type ChatConsoleCommandPayload = {
  generatedAt: string;
  handoff: ChatConsoleCommandHandoff;
  ok: true;
  service: string;
  sessionId: string;
  status: ChatConsoleStartupStatus;
};

export type ChatConsoleErrorPayload = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
  service: string;
  sessionId: string;
  status: ChatConsoleApiErrorStatus;
};

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object.`);
  }

  return value as JsonRecord;
}

function readBoolean(record: JsonRecord, key: string): boolean {
  const value = record[key];

  if (typeof value !== 'boolean') {
    throw new Error(`Expected ${key} to be a boolean.`);
  }

  return value;
}

function readNumber(record: JsonRecord, key: string): number {
  const value = record[key];

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected ${key} to be a number.`);
  }

  return value;
}

function readString(record: JsonRecord, key: string): string {
  const value = record[key];

  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string.`);
  }

  return value;
}

function readNullableString(record: JsonRecord, key: string): string | null {
  const value = record[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string or null.`);
  }

  return value;
}

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Expected ${key} to be a string array.`);
  }

  return [...value];
}

function readStartupStatus(
  record: JsonRecord,
  key: string,
): ChatConsoleStartupStatus {
  const value = readString(record, key);

  if (
    value !== 'auth-required' &&
    value !== 'expired-auth' &&
    value !== 'invalid-auth' &&
    value !== 'missing-prerequisites' &&
    value !== 'prompt-failure' &&
    value !== 'ready' &&
    value !== 'runtime-error'
  ) {
    throw new Error(`Unsupported chat-console startup status: ${value}`);
  }

  return value;
}

function readRunState(record: JsonRecord, key: string): ChatConsoleRunState {
  const value = readString(record, key);

  if (
    value !== 'auth-required' &&
    value !== 'failed' &&
    value !== 'ready' &&
    value !== 'running' &&
    value !== 'tooling-gap' &&
    value !== 'waiting-for-approval'
  ) {
    throw new Error(`Unsupported chat-console run state: ${value}`);
  }

  return value;
}

function readRouteStatus(
  record: JsonRecord,
  key: string,
): ChatConsoleRouteStatus {
  const value = readString(record, key);

  if (
    value !== 'ready' &&
    value !== 'session-not-found' &&
    value !== 'tooling-gap' &&
    value !== 'unsupported-workflow'
  ) {
    throw new Error(`Unsupported chat-console route status: ${value}`);
  }

  return value;
}

function readApiErrorStatus(
  record: JsonRecord,
  key: string,
): ChatConsoleApiErrorStatus {
  const value = readString(record, key);

  if (
    value !== 'bad-request' &&
    value !== 'error' &&
    value !== 'method-not-allowed' &&
    value !== 'not-found' &&
    value !== 'rate-limited'
  ) {
    throw new Error(`Unsupported chat-console API error status: ${value}`);
  }

  return value;
}

function readWorkflowIntent(
  record: JsonRecord,
  key: string,
): ChatConsoleWorkflowIntent {
  const value = readString(record, key);

  if (
    !(CHAT_CONSOLE_WORKFLOW_INTENTS as readonly string[]).includes(value)
  ) {
    throw new Error(`Unsupported workflow intent: ${value}`);
  }

  return value as ChatConsoleWorkflowIntent;
}

function parseSpecialistSummary(
  value: unknown,
): ChatConsoleSpecialistSummary | null {
  if (value === null) {
    return null;
  }

  const record = assertRecord(value, 'specialist summary');

  return {
    description: readString(record, 'description'),
    id: readString(record, 'id'),
    label: readString(record, 'label'),
  };
}

function parseWorkflowOption(value: unknown): ChatConsoleWorkflowOption {
  const record = assertRecord(value, 'workflow option');

  return {
    description: readString(record, 'description'),
    intent: readWorkflowIntent(record, 'intent'),
    label: readString(record, 'label'),
    message: readString(record, 'message'),
    missingCapabilities: readStringArray(record, 'missingCapabilities'),
    modeRepoRelativePath: readString(record, 'modeRepoRelativePath'),
    specialist: parseSpecialistSummary(record.specialist ?? null),
    status: readRouteStatus(record, 'status') as Exclude<
      ChatConsoleRouteStatus,
      'session-not-found' | 'unsupported-workflow'
    >,
  };
}

function parseJobSummary(value: unknown): ChatConsoleJobSummary {
  const record = assertRecord(value, 'job summary');

  return {
    attempt: readNumber(record, 'attempt'),
    completedAt: readNullableString(record, 'completedAt'),
    currentRunId: readString(record, 'currentRunId'),
    jobId: readString(record, 'jobId'),
    jobType: readString(record, 'jobType'),
    startedAt: readNullableString(record, 'startedAt'),
    status: readString(record, 'status'),
    updatedAt: readString(record, 'updatedAt'),
    waitReason: readNullableString(record, 'waitReason'),
  };
}

function parseApprovalSummary(value: unknown): ChatConsoleApprovalSummary {
  const record = assertRecord(value, 'approval summary');

  return {
    action: readString(record, 'action'),
    approvalId: readString(record, 'approvalId'),
    jobId: readNullableString(record, 'jobId'),
    requestedAt: readString(record, 'requestedAt'),
    title: readString(record, 'title'),
    traceId: readNullableString(record, 'traceId'),
  };
}

function parseFailureSummary(value: unknown): ChatConsoleFailureSummary {
  const record = assertRecord(value, 'failure summary');

  return {
    failedAt: readString(record, 'failedAt'),
    jobId: readString(record, 'jobId'),
    message: readString(record, 'message'),
    runId: readString(record, 'runId'),
    sessionId: readString(record, 'sessionId'),
    traceId: readNullableString(record, 'traceId'),
  };
}

function parseTimelineItem(value: unknown): ChatConsoleTimelineItem {
  const record = assertRecord(value, 'timeline item');
  const level = readString(record, 'level');

  if (level !== 'error' && level !== 'info' && level !== 'warn') {
    throw new Error(`Unsupported timeline level: ${level}`);
  }

  return {
    approvalId: readNullableString(record, 'approvalId'),
    eventId: readString(record, 'eventId'),
    eventType: readString(record, 'eventType'),
    jobId: readNullableString(record, 'jobId'),
    level,
    occurredAt: readString(record, 'occurredAt'),
    requestId: readNullableString(record, 'requestId'),
    sessionId: readNullableString(record, 'sessionId'),
    summary: readString(record, 'summary'),
    traceId: readNullableString(record, 'traceId'),
  };
}

function parseSessionSummary(value: unknown): ChatConsoleSessionSummary {
  const record = assertRecord(value, 'session summary');

  return {
    activeJobId: readNullableString(record, 'activeJobId'),
    job:
      record.job === null || record.job === undefined
        ? null
        : parseJobSummary(record.job),
    latestFailure:
      record.latestFailure === null || record.latestFailure === undefined
        ? null
        : parseFailureSummary(record.latestFailure),
    lastHeartbeatAt: readNullableString(record, 'lastHeartbeatAt'),
    pendingApproval:
      record.pendingApproval === null || record.pendingApproval === undefined
        ? null
        : parseApprovalSummary(record.pendingApproval),
    pendingApprovalCount: readNumber(record, 'pendingApprovalCount'),
    resumeAllowed: readBoolean(record, 'resumeAllowed'),
    sessionId: readString(record, 'sessionId'),
    state: readRunState(record, 'state'),
    status: readString(record, 'status'),
    updatedAt: readString(record, 'updatedAt'),
    workflow: readString(record, 'workflow'),
  };
}

function parseSessionRoute(value: unknown): ChatConsoleSessionRoute {
  const record = assertRecord(value, 'session route');

  return {
    message: readString(record, 'message'),
    missingCapabilities: readStringArray(record, 'missingCapabilities'),
    specialistId: readNullableString(record, 'specialistId'),
    status:
      record.status === null ? null : readRouteStatus(record, 'status'),
  };
}

function parseSessionDetail(value: unknown): ChatConsoleSessionDetail {
  const record = assertRecord(value, 'session detail');
  const approvals = record.approvals;
  const jobs = record.jobs;
  const timeline = record.timeline;

  if (!Array.isArray(approvals) || !Array.isArray(jobs) || !Array.isArray(timeline)) {
    throw new Error('Session detail arrays are missing.');
  }

  return {
    approvals: approvals.map((entry) => parseApprovalSummary(entry)),
    failure:
      record.failure === null || record.failure === undefined
        ? null
        : parseFailureSummary(record.failure),
    jobs: jobs.map((entry) => parseJobSummary(entry)),
    route: parseSessionRoute(record.route),
    session: parseSessionSummary(record.session),
    timeline: timeline.map((entry) => parseTimelineItem(entry)),
  };
}

function parseRuntimeState(value: unknown): ChatConsoleRuntimeState {
  const record = assertRecord(value, 'runtime state');
  const status = readString(record, 'status');

  if (status === 'blocked') {
    return {
      message: readString(record, 'message'),
      promptState: readNullableString(record, 'promptState'),
      status,
    };
  }

  if (status === 'ready') {
    return {
      message: readString(record, 'message'),
      model: readString(record, 'model'),
      modeRepoRelativePath: readString(record, 'modeRepoRelativePath'),
      startedAt: readString(record, 'startedAt'),
      status,
      workflow: readWorkflowIntent(record, 'workflow'),
    };
  }

  if (status === 'skipped') {
    return {
      message: readString(record, 'message'),
      status,
    };
  }

  throw new Error(`Unsupported chat-console runtime status: ${status}`);
}

function parseRouteDecision(value: unknown): ChatConsoleRouteDecision {
  const record = assertRecord(value, 'route decision');
  const requestKind = readString(record, 'requestKind');

  if (requestKind !== 'launch' && requestKind !== 'resume') {
    throw new Error(`Unsupported request kind: ${requestKind}`);
  }

  return {
    message: readString(record, 'message'),
    missingCapabilities: readStringArray(record, 'missingCapabilities'),
    requestKind,
    sessionId: readNullableString(record, 'sessionId'),
    specialistId: readNullableString(record, 'specialistId'),
    status: readRouteStatus(record, 'status'),
    workflow:
      record.workflow === null ? null : readWorkflowIntent(record, 'workflow'),
  };
}

function parseCommandHandoff(value: unknown): ChatConsoleCommandHandoff {
  const record = assertRecord(value, 'command handoff');

  return {
    job:
      record.job === null || record.job === undefined
        ? null
        : parseJobSummary(record.job),
    message: readString(record, 'message'),
    pendingApproval:
      record.pendingApproval === null || record.pendingApproval === undefined
        ? null
        : parseApprovalSummary(record.pendingApproval),
    requestedAt: readString(record, 'requestedAt'),
    route: parseRouteDecision(record.route),
    runtime: parseRuntimeState(record.runtime),
    selectedSession:
      record.selectedSession === null || record.selectedSession === undefined
        ? null
        : parseSessionDetail(record.selectedSession),
    session:
      record.session === null || record.session === undefined
        ? null
        : parseSessionSummary(record.session),
    specialist: parseSpecialistSummary(record.specialist ?? null),
    state: readRunState(record, 'state'),
    toolingGap:
      record.toolingGap && typeof record.toolingGap === 'object'
        ? {
            message: readString(
              record.toolingGap as JsonRecord,
              'message',
            ),
            missingCapabilities: readStringArray(
              record.toolingGap as JsonRecord,
              'missingCapabilities',
            ),
          }
        : null,
  };
}

export function parseChatConsoleSummaryPayload(
  value: unknown,
): ChatConsoleSummaryPayload {
  const record = assertRecord(value, 'chat-console summary payload');
  const workflows = record.workflows;
  const recentSessions = record.recentSessions;

  if (!Array.isArray(workflows) || !Array.isArray(recentSessions)) {
    throw new Error('Chat-console arrays are missing.');
  }

  if (!readBoolean(record, 'ok')) {
    throw new Error('Chat-console summary payload must set ok=true.');
  }

  return {
    generatedAt: readString(record, 'generatedAt'),
    message: readString(record, 'message'),
    ok: true,
    recentSessions: recentSessions.map((entry) => parseSessionSummary(entry)),
    selectedSession:
      record.selectedSession === null || record.selectedSession === undefined
        ? null
        : parseSessionDetail(record.selectedSession),
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readStartupStatus(record, 'status'),
    workflows: workflows.map((entry) => parseWorkflowOption(entry)),
  };
}

export function parseChatConsoleCommandPayload(
  value: unknown,
): ChatConsoleCommandPayload {
  const record = assertRecord(value, 'chat-console command payload');

  if (!readBoolean(record, 'ok')) {
    throw new Error('Chat-console command payload must set ok=true.');
  }

  return {
    generatedAt: readString(record, 'generatedAt'),
    handoff: parseCommandHandoff(record.handoff),
    ok: true,
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readStartupStatus(record, 'status'),
  };
}

export function parseChatConsoleErrorPayload(
  value: unknown,
): ChatConsoleErrorPayload {
  const record = assertRecord(value, 'chat-console error payload');
  const error = assertRecord(record.error, 'chat-console error');

  if (readBoolean(record, 'ok')) {
    throw new Error('Chat-console error payload must set ok=false.');
  }

  return {
    error: {
      code: readString(error, 'code'),
      message: readString(error, 'message'),
    },
    ok: false,
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readApiErrorStatus(record, 'status'),
  };
}

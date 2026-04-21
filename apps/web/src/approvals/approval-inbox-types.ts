export const APPROVAL_INBOX_SELECTION_STATES = [
  'active',
  'approved',
  'missing',
  'rejected',
] as const;

export type ApprovalInboxSelectionState =
  (typeof APPROVAL_INBOX_SELECTION_STATES)[number];

export const APPROVAL_INBOX_INTERRUPTED_RUN_STATES = [
  'blocked',
  'completed',
  'missing',
  'resume-ready',
  'running',
  'waiting-for-approval',
] as const;

export type ApprovalInboxInterruptedRunState =
  (typeof APPROVAL_INBOX_INTERRUPTED_RUN_STATES)[number];

export type ApprovalInboxStartupStatus =
  | 'auth-required'
  | 'expired-auth'
  | 'invalid-auth'
  | 'missing-prerequisites'
  | 'prompt-failure'
  | 'ready'
  | 'runtime-error';

export type ApprovalInboxApiErrorStatus =
  | 'bad-request'
  | 'error'
  | 'method-not-allowed'
  | 'not-found'
  | 'rate-limited';

export type ApprovalInboxQueueItem = {
  action: string;
  approvalId: string;
  jobId: string | null;
  requestedAt: string;
  sessionId: string;
  sessionStatus: string | null;
  title: string;
  traceId: string | null;
  workflow: string | null;
};

export type ApprovalInboxApprovalDetail = {
  action: string;
  approvalId: string;
  details: unknown | null;
  jobId: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  response: unknown | null;
  sessionId: string;
  status: 'approved' | 'pending' | 'rejected';
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
  status: 'ready' | 'session-not-found' | 'tooling-gap' | 'unsupported-workflow' | null;
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
  service: string;
  sessionId: string;
  status: ApprovalInboxStartupStatus;
};

export type ApprovalResolutionPayload = {
  generatedAt: string;
  message: string;
  ok: true;
  resolution: {
    applied: boolean;
    approval: ApprovalInboxApprovalDetail;
    job: ApprovalInboxJobSummary | null;
    outcome:
      | 'already-approved'
      | 'already-rejected'
      | 'approved'
      | 'rejected';
  };
  service: string;
  sessionId: string;
  status: ApprovalInboxStartupStatus;
};

export type ApprovalInboxErrorPayload = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
  service: string;
  sessionId: string;
  status: ApprovalInboxApiErrorStatus;
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

function readNullableObject<TValue>(
  record: JsonRecord,
  key: string,
  parser: (value: unknown) => TValue,
): TValue | null {
  const value = record[key];
  return value === null ? null : parser(value);
}

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Expected ${key} to be a string array.`);
  }

  return [...value];
}

function readTimelineLevel(
  value: unknown,
): ApprovalInboxTimelineItem['level'] {
  if (value === 'error' || value === 'info' || value === 'warn') {
    return value;
  }

  throw new Error('Expected timeline level to be error, info, or warn.');
}

function readSelectionState(value: unknown): ApprovalInboxSelectionState {
  if (
    typeof value === 'string' &&
    (APPROVAL_INBOX_SELECTION_STATES as readonly string[]).includes(value)
  ) {
    return value as ApprovalInboxSelectionState;
  }

  throw new Error('Expected selectionState to be a supported approval inbox state.');
}

function readInterruptedRunState(
  value: unknown,
): ApprovalInboxInterruptedRunState {
  if (
    typeof value === 'string' &&
    (APPROVAL_INBOX_INTERRUPTED_RUN_STATES as readonly string[]).includes(value)
  ) {
    return value as ApprovalInboxInterruptedRunState;
  }

  throw new Error('Expected interrupted run state to be supported.');
}

function readStartupStatus(value: unknown): ApprovalInboxStartupStatus {
  if (
    value === 'auth-required' ||
    value === 'expired-auth' ||
    value === 'invalid-auth' ||
    value === 'missing-prerequisites' ||
    value === 'prompt-failure' ||
    value === 'ready' ||
    value === 'runtime-error'
  ) {
    return value;
  }

  throw new Error('Expected status to be a supported startup status.');
}

function parseQueueItem(value: unknown): ApprovalInboxQueueItem {
  const record = assertRecord(value, 'queue item');

  return {
    action: readString(record, 'action'),
    approvalId: readString(record, 'approvalId'),
    jobId: readNullableString(record, 'jobId'),
    requestedAt: readString(record, 'requestedAt'),
    sessionId: readString(record, 'sessionId'),
    sessionStatus: readNullableString(record, 'sessionStatus'),
    title: readString(record, 'title'),
    traceId: readNullableString(record, 'traceId'),
    workflow: readNullableString(record, 'workflow'),
  };
}

function parseApprovalDetail(value: unknown): ApprovalInboxApprovalDetail {
  const record = assertRecord(value, 'approval detail');
  const status = readString(record, 'status');

  if (status !== 'approved' && status !== 'pending' && status !== 'rejected') {
    throw new Error('Expected approval status to be approved, pending, or rejected.');
  }

  return {
    action: readString(record, 'action'),
    approvalId: readString(record, 'approvalId'),
    details: record.details ?? null,
    jobId: readNullableString(record, 'jobId'),
    requestedAt: readString(record, 'requestedAt'),
    resolvedAt: readNullableString(record, 'resolvedAt'),
    response: record.response ?? null,
    sessionId: readString(record, 'sessionId'),
    status,
    title: readString(record, 'title'),
    traceId: readNullableString(record, 'traceId'),
  };
}

function parseJobSummary(value: unknown): ApprovalInboxJobSummary {
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

function parseFailureSummary(value: unknown): ApprovalInboxFailureSummary {
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

function parseTimelineItem(value: unknown): ApprovalInboxTimelineItem {
  const record = assertRecord(value, 'timeline item');

  return {
    approvalId: readNullableString(record, 'approvalId'),
    eventId: readString(record, 'eventId'),
    eventType: readString(record, 'eventType'),
    jobId: readNullableString(record, 'jobId'),
    level: readTimelineLevel(record.level),
    occurredAt: readString(record, 'occurredAt'),
    requestId: readNullableString(record, 'requestId'),
    sessionId: readNullableString(record, 'sessionId'),
    summary: readString(record, 'summary'),
    traceId: readNullableString(record, 'traceId'),
  };
}

function parseSessionSummary(value: unknown): ApprovalInboxSessionSummary {
  const record = assertRecord(value, 'session summary');

  return {
    activeJobId: readNullableString(record, 'activeJobId'),
    lastHeartbeatAt: readNullableString(record, 'lastHeartbeatAt'),
    pendingApprovalCount: readNumber(record, 'pendingApprovalCount'),
    sessionId: readString(record, 'sessionId'),
    status: readString(record, 'status'),
    updatedAt: readString(record, 'updatedAt'),
    workflow: readString(record, 'workflow'),
  };
}

function parseRouteSummary(value: unknown): ApprovalInboxRouteSummary {
  const record = assertRecord(value, 'route summary');
  const statusValue = record.status;

  if (
    statusValue !== null &&
    statusValue !== 'ready' &&
    statusValue !== 'session-not-found' &&
    statusValue !== 'tooling-gap' &&
    statusValue !== 'unsupported-workflow'
  ) {
    throw new Error('Expected route status to be supported or null.');
  }

  return {
    message: readString(record, 'message'),
    missingCapabilities: readStringArray(record, 'missingCapabilities'),
    specialistId: readNullableString(record, 'specialistId'),
    status: statusValue,
  };
}

function parseInterruptedRun(value: unknown): ApprovalInboxInterruptedRun {
  const record = assertRecord(value, 'interrupted run');

  return {
    message: readString(record, 'message'),
    resumeAllowed: readBoolean(record, 'resumeAllowed'),
    sessionId: readNullableString(record, 'sessionId'),
    state: readInterruptedRunState(record.state),
  };
}

function parseSelectedDetail(value: unknown): ApprovalInboxSelectedDetail {
  const record = assertRecord(value, 'selected detail');
  const timelineValue = record.timeline;

  if (!Array.isArray(timelineValue)) {
    throw new Error('Expected selected.timeline to be an array.');
  }

  return {
    approval: readNullableObject(record, 'approval', parseApprovalDetail),
    failure: readNullableObject(record, 'failure', parseFailureSummary),
    interruptedRun: parseInterruptedRun(record.interruptedRun),
    job: readNullableObject(record, 'job', parseJobSummary),
    route: parseRouteSummary(record.route),
    selectionMessage: readString(record, 'selectionMessage'),
    selectionState: readSelectionState(record.selectionState),
    session: readNullableObject(record, 'session', parseSessionSummary),
    timeline: timelineValue.map((entry) => parseTimelineItem(entry)),
  };
}

export function parseApprovalInboxSummaryPayload(
  value: unknown,
): ApprovalInboxSummaryPayload {
  const record = assertRecord(value, 'approval inbox summary payload');
  const filters = assertRecord(record.filters, 'filters');
  const queue = record.queue;

  if (!Array.isArray(queue)) {
    throw new Error('Expected queue to be an array.');
  }

  return {
    filters: {
      approvalId: readNullableString(filters, 'approvalId'),
      limit: readNumber(filters, 'limit'),
      sessionId: readNullableString(filters, 'sessionId'),
    },
    generatedAt: readString(record, 'generatedAt'),
    message: readString(record, 'message'),
    ok: readBoolean(record, 'ok') as true,
    pendingApprovalCount: readNumber(record, 'pendingApprovalCount'),
    queue: queue.map((entry) => parseQueueItem(entry)),
    selected: readNullableObject(record, 'selected', parseSelectedDetail),
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readStartupStatus(record.status),
  };
}

export function parseApprovalResolutionPayload(
  value: unknown,
): ApprovalResolutionPayload {
  const record = assertRecord(value, 'approval resolution payload');
  const resolution = assertRecord(record.resolution, 'resolution');
  const outcome = readString(resolution, 'outcome');

  if (
    outcome !== 'already-approved' &&
    outcome !== 'already-rejected' &&
    outcome !== 'approved' &&
    outcome !== 'rejected'
  ) {
    throw new Error('Expected approval resolution outcome to be supported.');
  }

  return {
    generatedAt: readString(record, 'generatedAt'),
    message: readString(record, 'message'),
    ok: readBoolean(record, 'ok') as true,
    resolution: {
      applied: readBoolean(resolution, 'applied'),
      approval: parseApprovalDetail(resolution.approval),
      job: readNullableObject(resolution, 'job', parseJobSummary),
      outcome,
    },
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status: readStartupStatus(record.status),
  };
}

export function parseApprovalInboxErrorPayload(
  value: unknown,
): ApprovalInboxErrorPayload {
  const record = assertRecord(value, 'approval inbox error payload');
  const error = assertRecord(record.error, 'error');
  const status = readString(record, 'status');

  if (
    status !== 'bad-request' &&
    status !== 'error' &&
    status !== 'method-not-allowed' &&
    status !== 'not-found' &&
    status !== 'rate-limited'
  ) {
    throw new Error('Expected approval inbox error status to be supported.');
  }

  return {
    error: {
      code: readString(error, 'code'),
      message: readString(error, 'message'),
    },
    ok: readBoolean(record, 'ok') as false,
    service: readString(record, 'service'),
    sessionId: readString(record, 'sessionId'),
    status,
  };
}

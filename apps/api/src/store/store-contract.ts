import type { JsonValue } from '../workspace/workspace-types.js';

export type OperationalStoreStatusState = 'absent' | 'corrupt' | 'ready';

export type OperationalStoreStatusReason =
  | 'database-corrupt'
  | 'database-locked'
  | 'database-missing'
  | 'database-open-failed'
  | 'path-not-file'
  | 'root-missing'
  | 'schema-missing';

export type OperationalStoreStatus = {
  databasePath: string;
  message: string;
  reason: OperationalStoreStatusReason | null;
  rootExists: boolean;
  rootPath: string;
  status: OperationalStoreStatusState;
};

export type OperationalStoreErrorCode =
  | 'operational-store-closed'
  | 'operational-store-corrupt'
  | 'operational-store-init-failed'
  | 'operational-store-invalid-input'
  | 'operational-store-locked';

export type RuntimeSessionStatus =
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'pending'
  | 'running'
  | 'waiting';

export type RuntimeSessionRecord = {
  activeJobId: string | null;
  context: JsonValue;
  createdAt: string;
  lastHeartbeatAt: string | null;
  runnerId: string | null;
  sessionId: string;
  status: RuntimeSessionStatus;
  updatedAt: string;
  workflow: string;
};

export type RuntimeJobStatus =
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'pending'
  | 'queued'
  | 'running'
  | 'waiting';

export type RuntimeJobWaitReason = 'approval' | 'retry';

export type RuntimeJobRecord = {
  attempt: number;
  claimOwnerId: string | null;
  claimToken: string | null;
  completedAt: string | null;
  createdAt: string;
  currentRunId: string;
  error: JsonValue | null;
  jobId: string;
  jobType: string;
  lastHeartbeatAt: string | null;
  leaseExpiresAt: string | null;
  maxAttempts: number;
  nextAttemptAt: string | null;
  payload: JsonValue;
  retryBackoffMs: number;
  result: JsonValue | null;
  sessionId: string;
  startedAt: string | null;
  status: RuntimeJobStatus;
  updatedAt: string;
  waitApprovalId: string | null;
  waitReason: RuntimeJobWaitReason | null;
};

export type RuntimeApprovalStatus = 'approved' | 'pending' | 'rejected';
export type RuntimeApprovalDecisionStatus = Extract<
  RuntimeApprovalStatus,
  'approved' | 'rejected'
>;

export type RuntimeApprovalRecord = {
  approvalId: string;
  jobId: string | null;
  request: JsonValue;
  requestedAt: string;
  resolvedAt: string | null;
  response: JsonValue | null;
  sessionId: string;
  status: RuntimeApprovalStatus;
  traceId: string | null;
  updatedAt: string;
};

export type RuntimeRunMetadataRecord = {
  createdAt: string;
  jobId: string | null;
  metadata: JsonValue;
  runId: string;
  sessionId: string;
  updatedAt: string;
};

export type RuntimeRunCheckpointRecord = {
  completedSteps: string[];
  cursor: string | null;
  updatedAt: string;
  value: JsonValue | null;
};

export type RuntimeSessionHeartbeatInput = {
  activeJobId: string | null;
  runnerId: string | null;
  sessionId: string;
  status: RuntimeSessionStatus;
  timestamp: string;
};

export type RuntimeJobClaimInput = {
  claimOwnerId: string;
  claimToken: string;
  leaseExpiresAt: string;
  timestamp: string;
};

export type RuntimeJobHeartbeatInput = {
  claimToken: string;
  jobId: string;
  leaseExpiresAt: string;
  timestamp: string;
};

export type RuntimeJobTerminalStateInput = {
  claimToken: string;
  error: JsonValue | null;
  jobId: string;
  result: JsonValue | null;
  status: Extract<RuntimeJobStatus, 'cancelled' | 'completed' | 'failed'>;
  timestamp: string;
};

export type RuntimeJobWaitingStateInput = {
  approvalId: string | null;
  claimToken: string;
  error: JsonValue | null;
  jobId: string;
  nextAttemptAt: string | null;
  result: JsonValue | null;
  timestamp: string;
  waitReason: RuntimeJobWaitReason;
};

export type RuntimeRunCheckpointSaveInput = {
  checkpoint: RuntimeRunCheckpointRecord;
  jobId: string | null;
  runId: string;
  sessionId: string;
};

export type RuntimeApprovalPendingListInput = {
  limit?: number;
  sessionId?: string;
};

export type RuntimeApprovalResolutionInput = {
  approvalId: string;
  response: JsonValue | null;
  resolvedAt: string;
  status: RuntimeApprovalDecisionStatus;
  updatedAt: string;
};

export type RuntimeApprovalResolutionResult = {
  approval: RuntimeApprovalRecord;
  applied: boolean;
};

export type RuntimeJobApprovalTransitionInput = {
  approvalId: string;
  jobId: string;
  timestamp: string;
};

export type RuntimeJobApprovalRejectionInput =
  RuntimeJobApprovalTransitionInput & {
    error: JsonValue;
  };

export const RUNTIME_EVENT_LEVELS = ['error', 'info', 'warn'] as const;
export type RuntimeEventLevel = (typeof RUNTIME_EVENT_LEVELS)[number];

export const RUNTIME_EVENT_TYPES = [
  'approval-approved',
  'approval-requested',
  'approval-rejected',
  'http-request-completed',
  'http-request-received',
  'job-claimed',
  'job-completed',
  'job-failed',
  'job-waiting-approval',
  'job-waiting-retry',
  'tool-approval-required',
  'tool-execution-completed',
  'tool-execution-failed',
  'tool-execution-started',
] as const;

export type RuntimeEventType = (typeof RUNTIME_EVENT_TYPES)[number];

export type RuntimeEventRecord = {
  approvalId: string | null;
  eventId: string;
  eventType: RuntimeEventType;
  jobId: string | null;
  level: RuntimeEventLevel;
  metadata: JsonValue | null;
  occurredAt: string;
  requestId: string | null;
  sessionId: string | null;
  summary: string;
  traceId: string | null;
};

export type RuntimeEventListInput = {
  approvalId?: string;
  eventTypes?: RuntimeEventType[];
  jobId?: string;
  level?: RuntimeEventLevel;
  limit?: number;
  requestId?: string;
  sessionId?: string;
  traceId?: string;
};

export type SessionRepository = {
  getById: (sessionId: string) => Promise<RuntimeSessionRecord | null>;
  listActive: () => Promise<RuntimeSessionRecord[]>;
  listByStatus: (
    status: RuntimeSessionStatus,
  ) => Promise<RuntimeSessionRecord[]>;
  save: (record: RuntimeSessionRecord) => Promise<RuntimeSessionRecord>;
  touchHeartbeat: (
    input: RuntimeSessionHeartbeatInput,
  ) => Promise<RuntimeSessionRecord>;
};

export type JobRepository = {
  approveWaiting: (
    input: RuntimeJobApprovalTransitionInput,
  ) => Promise<RuntimeJobRecord>;
  cancel: (input: RuntimeJobTerminalStateInput) => Promise<RuntimeJobRecord>;
  claimNext: (input: RuntimeJobClaimInput) => Promise<RuntimeJobRecord | null>;
  complete: (input: RuntimeJobTerminalStateInput) => Promise<RuntimeJobRecord>;
  fail: (input: RuntimeJobTerminalStateInput) => Promise<RuntimeJobRecord>;
  getById: (jobId: string) => Promise<RuntimeJobRecord | null>;
  listClaimable: (now: string) => Promise<RuntimeJobRecord[]>;
  listRecoverable: (now: string) => Promise<RuntimeJobRecord[]>;
  listBySessionId: (sessionId: string) => Promise<RuntimeJobRecord[]>;
  rejectWaiting: (
    input: RuntimeJobApprovalRejectionInput,
  ) => Promise<RuntimeJobRecord>;
  save: (record: RuntimeJobRecord) => Promise<RuntimeJobRecord>;
  touchHeartbeat: (
    input: RuntimeJobHeartbeatInput,
  ) => Promise<RuntimeJobRecord>;
  wait: (input: RuntimeJobWaitingStateInput) => Promise<RuntimeJobRecord>;
};

export type ApprovalRepository = {
  getById: (approvalId: string) => Promise<RuntimeApprovalRecord | null>;
  listByJobId: (jobId: string) => Promise<RuntimeApprovalRecord[]>;
  listBySessionId: (sessionId: string) => Promise<RuntimeApprovalRecord[]>;
  listPending: (
    input?: RuntimeApprovalPendingListInput,
  ) => Promise<RuntimeApprovalRecord[]>;
  resolve: (
    input: RuntimeApprovalResolutionInput,
  ) => Promise<RuntimeApprovalResolutionResult>;
  save: (record: RuntimeApprovalRecord) => Promise<RuntimeApprovalRecord>;
};

export type RunMetadataRepository = {
  getByRunId: (runId: string) => Promise<RuntimeRunMetadataRecord | null>;
  getLatestByJobId: (jobId: string) => Promise<RuntimeRunMetadataRecord | null>;
  listBySessionId: (sessionId: string) => Promise<RuntimeRunMetadataRecord[]>;
  loadCheckpoint: (runId: string) => Promise<RuntimeRunCheckpointRecord | null>;
  save: (record: RuntimeRunMetadataRecord) => Promise<RuntimeRunMetadataRecord>;
  saveCheckpoint: (
    input: RuntimeRunCheckpointSaveInput,
  ) => Promise<RuntimeRunMetadataRecord>;
};

export type RuntimeEventRepository = {
  getById: (eventId: string) => Promise<RuntimeEventRecord | null>;
  list: (input?: RuntimeEventListInput) => Promise<RuntimeEventRecord[]>;
  save: (record: RuntimeEventRecord) => Promise<RuntimeEventRecord>;
};

export type OperationalStoreRepositories = {
  approvals: ApprovalRepository;
  events: RuntimeEventRepository;
  jobs: JobRepository;
  runMetadata: RunMetadataRepository;
  sessions: SessionRepository;
};

export type OperationalStore = OperationalStoreRepositories & {
  close: () => Promise<void>;
  databasePath: string;
  getStatus: () => Promise<OperationalStoreStatus>;
};

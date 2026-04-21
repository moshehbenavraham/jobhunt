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
  context: JsonValue;
  createdAt: string;
  lastHeartbeatAt: string | null;
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

export type RuntimeJobRecord = {
  attempt: number;
  completedAt: string | null;
  createdAt: string;
  error: JsonValue | null;
  jobId: string;
  jobType: string;
  payload: JsonValue;
  result: JsonValue | null;
  sessionId: string;
  startedAt: string | null;
  status: RuntimeJobStatus;
  updatedAt: string;
};

export type RuntimeApprovalStatus = 'approved' | 'pending' | 'rejected';

export type RuntimeApprovalRecord = {
  approvalId: string;
  jobId: string | null;
  request: JsonValue;
  requestedAt: string;
  resolvedAt: string | null;
  response: JsonValue | null;
  sessionId: string;
  status: RuntimeApprovalStatus;
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

export type SessionRepository = {
  getById: (sessionId: string) => Promise<RuntimeSessionRecord | null>;
  listByStatus: (
    status: RuntimeSessionStatus,
  ) => Promise<RuntimeSessionRecord[]>;
  save: (
    record: RuntimeSessionRecord,
  ) => Promise<RuntimeSessionRecord>;
};

export type JobRepository = {
  getById: (jobId: string) => Promise<RuntimeJobRecord | null>;
  listBySessionId: (sessionId: string) => Promise<RuntimeJobRecord[]>;
  save: (record: RuntimeJobRecord) => Promise<RuntimeJobRecord>;
};

export type ApprovalRepository = {
  getById: (approvalId: string) => Promise<RuntimeApprovalRecord | null>;
  listBySessionId: (
    sessionId: string,
  ) => Promise<RuntimeApprovalRecord[]>;
  save: (
    record: RuntimeApprovalRecord,
  ) => Promise<RuntimeApprovalRecord>;
};

export type RunMetadataRepository = {
  getByRunId: (runId: string) => Promise<RuntimeRunMetadataRecord | null>;
  listBySessionId: (
    sessionId: string,
  ) => Promise<RuntimeRunMetadataRecord[]>;
  save: (
    record: RuntimeRunMetadataRecord,
  ) => Promise<RuntimeRunMetadataRecord>;
};

export type OperationalStoreRepositories = {
  approvals: ApprovalRepository;
  jobs: JobRepository;
  runMetadata: RunMetadataRepository;
  sessions: SessionRepository;
};

export type OperationalStore = OperationalStoreRepositories & {
  close: () => Promise<void>;
  databasePath: string;
  getStatus: () => Promise<OperationalStoreStatus>;
};

import type {
  ApprovalRuntimeRequest,
  ApprovalRuntimeService,
} from '../approval-runtime/index.js';
import type { AgentRuntimeBootstrap } from '../agent-runtime/index.js';
import type { ObservabilityService } from '../observability/index.js';
import type { WorkflowIntent } from '../prompt/index.js';
import type {
  OperationalStore,
  RuntimeJobRecord,
  RuntimeRunMetadataRecord,
  RuntimeSessionRecord,
} from '../store/store-contract.js';
import type {
  JsonValue,
} from '../workspace/workspace-types.js';
import type { ZodType } from 'zod';

export const DURABLE_JOB_TERMINAL_STATUSES = [
  'cancelled',
  'completed',
  'failed',
] as const;

export type DurableJobTerminalStatus =
  (typeof DURABLE_JOB_TERMINAL_STATUSES)[number];

export const DURABLE_JOB_EXECUTION_EVENTS = [
  'approval-waiting',
  'checkpoint-saved',
  'claimed',
  'completed',
  'failed',
  'heartbeat',
  'waiting',
] as const;

export type DurableJobExecutionEvent =
  (typeof DURABLE_JOB_EXECUTION_EVENTS)[number];

export const DURABLE_JOB_RUNNER_ERROR_CODES = [
  'job-runner-invalid-config',
  'job-runner-invalid-payload',
  'job-runner-job-not-found',
  'job-runner-stale-claim',
  'job-runner-unsupported-job-type',
] as const;

export type DurableJobRunnerErrorCode =
  (typeof DURABLE_JOB_RUNNER_ERROR_CODES)[number];

export type DurableJobRetryPolicy = {
  backoffMs: number;
  maxAttempts: number;
};

export type DurableJobCheckpoint = {
  completedSteps: string[];
  cursor: string | null;
  value: JsonValue | null;
};

export type DurableJobExecutionHistoryEntry = {
  at: string;
  attempt: number;
  detail: string | null;
  event: DurableJobExecutionEvent;
};

export type DurableJobRecoverySummary = {
  recoveredJobIds: string[];
  runnerId: string;
  scannedAt: string;
};

export type DurableJobEnqueueSession = {
  context: JsonValue;
  sessionId: string;
  workflow: WorkflowIntent;
};

export type DurableJobEnqueueRequest = {
  currentRunId?: string | null;
  jobId: string;
  jobType: string;
  payload: JsonValue;
  retryPolicy?: Partial<DurableJobRetryPolicy>;
  session: DurableJobEnqueueSession;
};

export type DurableJobEnqueueResult = {
  job: RuntimeJobRecord;
  runMetadata: RuntimeRunMetadataRecord;
};

export type DurableJobDrainSummary = {
  claimedJobIds: string[];
  completedJobIds: string[];
  recoveredJobIds: string[];
  scannedAt: string;
  waitingJobIds: string[];
};

export type DurableJobApprovalWaitResult = {
  approval: Pick<ApprovalRuntimeRequest, 'action' | 'details' | 'title'> & {
    traceId?: string | null;
  };
  result: JsonValue | null;
  status: 'waiting';
  waitReason: 'approval';
};

export type DurableJobRetryWaitResult = {
  delayMs: number;
  result: JsonValue | null;
  status: 'waiting';
  waitReason: 'retry';
};

export type DurableJobExecutorResult =
  | {
      result: JsonValue | null;
      status: 'completed';
    }
  | DurableJobApprovalWaitResult
  | DurableJobRetryWaitResult;

export type DurableJobExecutorContext = {
  attempt: number;
  bootstrapWorkflow: (
    workflow: WorkflowIntent,
  ) => Promise<AgentRuntimeBootstrap>;
  checkpoint: DurableJobCheckpoint | null;
  currentRunId: string;
  job: RuntimeJobRecord;
  saveCheckpoint: (
    checkpoint: DurableJobCheckpoint,
  ) => Promise<RuntimeRunMetadataRecord>;
  session: RuntimeSessionRecord;
  signal: AbortSignal;
  store: OperationalStore;
  touchHeartbeat: () => Promise<void>;
};

export type DurableJobExecutorDefinition<
  TPayload extends JsonValue = JsonValue,
> = {
  description: string;
  execute: (
    payload: TPayload,
    context: DurableJobExecutorContext,
  ) => Promise<DurableJobExecutorResult>;
  jobType: string;
  payloadSchema: ZodType<TPayload>;
};

export type AnyDurableJobExecutorDefinition =
  DurableJobExecutorDefinition<any>;

export type DurableJobExecutorRegistry = {
  definitions: ReadonlyMap<string, AnyDurableJobExecutorDefinition>;
  get: (jobType: string) => AnyDurableJobExecutorDefinition | null;
  listJobTypes: () => string[];
};

export type DurableJobRunnerService = {
  close: () => Promise<void>;
  drainOnce: () => Promise<DurableJobDrainSummary>;
  enqueue: (request: DurableJobEnqueueRequest) => Promise<DurableJobEnqueueResult>;
  getRecoverySummary: () => DurableJobRecoverySummary | null;
  start: () => Promise<void>;
};

export type DurableJobRunnerServiceOptions = {
  bootstrapWorkflow: (
    workflow: WorkflowIntent,
  ) => Promise<AgentRuntimeBootstrap>;
  executors: DurableJobExecutorRegistry;
  getApprovalRuntime?: () => Promise<ApprovalRuntimeService>;
  getObservability?: () => Promise<ObservabilityService>;
  getStore: () => Promise<OperationalStore>;
  heartbeatIntervalMs?: number;
  leaseDurationMs?: number;
  now?: () => number;
  pollIntervalMs?: number;
  runnerId?: string;
};

export type DurableJobExecutorRegistryInput =
  readonly AnyDurableJobExecutorDefinition[];

export type DurableJobFailureDetails = {
  [key: string]: JsonValue;
  message: string;
  retryable: boolean;
};

export class DurableJobRunnerError extends Error {
  readonly code: DurableJobRunnerErrorCode;
  readonly detail: JsonValue | null;

  constructor(
    code: DurableJobRunnerErrorCode,
    message: string,
    options: {
      cause?: unknown;
      detail?: JsonValue;
    } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.code = code;
    this.detail = options.detail ?? null;
    this.name = 'DurableJobRunnerError';
  }
}

export class DurableJobExecutionError extends Error {
  readonly delayMs: number | null;
  readonly detail: JsonValue | null;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      delayMs?: number | null;
      detail?: JsonValue;
      retryable?: boolean;
    } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.delayMs = options.delayMs ?? null;
    this.detail = options.detail ?? null;
    this.retryable = options.retryable ?? false;
    this.name = 'DurableJobExecutionError';
  }
}

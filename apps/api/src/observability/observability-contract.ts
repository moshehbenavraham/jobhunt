import type {
  RuntimeEventLevel,
  RuntimeEventRecord,
  RuntimeEventType,
} from '../store/store-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';

export type RuntimeCorrelationIds = {
  approvalId: string | null;
  jobId: string | null;
  requestId: string | null;
  sessionId: string | null;
  traceId: string | null;
};

export type RuntimeEventWriteInput = {
  correlation: Partial<RuntimeCorrelationIds>;
  eventType: RuntimeEventType;
  level?: RuntimeEventLevel;
  metadata: JsonValue | null;
  occurredAt: string;
  summary: string;
};

export type RuntimeDiagnosticsFilter = {
  jobId?: string;
  limit?: number;
  requestId?: string;
  sessionId?: string;
  traceId?: string;
};

export type RuntimeFailedJobSummary = {
  failedAt: string;
  jobId: string;
  message: string;
  runId: string;
  sessionId: string;
  traceId: string | null;
};

export type RuntimeDiagnosticsSummary = {
  failedJobs: RuntimeFailedJobSummary[];
  recentEvents: RuntimeEventRecord[];
};

export type ObservabilityService = {
  getDiagnosticsSummary: (
    filter?: RuntimeDiagnosticsFilter,
  ) => Promise<RuntimeDiagnosticsSummary>;
  recordEvent: (
    input: RuntimeEventWriteInput,
  ) => Promise<RuntimeEventRecord | null>;
};

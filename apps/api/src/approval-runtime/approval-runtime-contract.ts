import type {
  RuntimeApprovalRecord,
  RuntimeApprovalResolutionResult,
  RuntimeJobRecord,
} from '../store/store-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';

export type ApprovalRuntimeDecision = 'approved' | 'rejected';

export type ApprovalRuntimeCorrelation = {
  jobId: string;
  requestId: string | null;
  sessionId: string;
  traceId: string | null;
};

export type ApprovalRuntimeRequest = {
  action: string;
  correlation: ApprovalRuntimeCorrelation;
  details: JsonValue | null;
  title: string;
};

export type ApprovalRuntimeCreateInput = {
  requestedAt: string;
  request: ApprovalRuntimeRequest;
};

export type ApprovalRuntimeResolutionInput = {
  approvalId: string;
  decision: ApprovalRuntimeDecision;
  reason: string | null;
  resolvedAt: string;
  responseMetadata: JsonValue | null;
};

export type ApprovalRuntimePendingFilter = {
  limit?: number;
  sessionId?: string;
};

export type ApprovalRuntimePendingSummary = {
  action: string;
  approvalId: string;
  jobId: string;
  requestedAt: string;
  sessionId: string;
  title: string;
  traceId: string | null;
};

export type ApprovalRuntimeCreateResult = {
  approval: RuntimeApprovalRecord;
};

export type ApprovalRuntimeResolution = {
  applied: boolean;
  approval: RuntimeApprovalRecord;
  job: RuntimeJobRecord | null;
  repository: RuntimeApprovalResolutionResult;
};

export type ApprovalRuntimeService = {
  createApproval: (
    input: ApprovalRuntimeCreateInput,
  ) => Promise<ApprovalRuntimeCreateResult>;
  getApproval: (approvalId: string) => Promise<RuntimeApprovalRecord | null>;
  listPendingApprovals: (
    filter?: ApprovalRuntimePendingFilter,
  ) => Promise<ApprovalRuntimePendingSummary[]>;
  resolveApproval: (
    input: ApprovalRuntimeResolutionInput,
  ) => Promise<ApprovalRuntimeResolution>;
};

import { randomUUID } from 'node:crypto';
import type {
  ApprovalRuntimeCreateInput,
  ApprovalRuntimeCreateResult,
  ApprovalRuntimePendingFilter,
  ApprovalRuntimePendingSummary,
  ApprovalRuntimeRequest,
  ApprovalRuntimeResolution,
  ApprovalRuntimeResolutionInput,
  ApprovalRuntimeService,
} from './approval-runtime-contract.js';
import type { RuntimeEventWriteInput } from '../observability/observability-contract.js';
import type {
  OperationalStore,
  RuntimeApprovalRecord,
  RuntimeJobRecord,
  RuntimeSessionRecord,
  RuntimeSessionStatus,
} from '../store/store-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';

type ApprovalRuntimeServiceOptions = {
  getStore: () => Promise<OperationalStore>;
  now?: () => number;
  recordEvent?: (input: RuntimeEventWriteInput) => Promise<unknown>;
};

function toIsoTimestamp(now: number): string {
  return new Date(now).toISOString();
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

async function synchronizeSessionState(
  store: OperationalStore,
  sessionId: string,
  timestamp: string,
): Promise<RuntimeSessionRecord> {
  const session = await store.sessions.getById(sessionId);

  if (!session) {
    throw new Error(`Runtime session does not exist: ${sessionId}`);
  }

  const jobs = await store.jobs.listBySessionId(sessionId);
  const runningJob = jobs.find((job) => job.status === 'running');
  const waitingJob = jobs.find((job) => job.status === 'waiting');
  const pendingJob = jobs.find(
    (job) => job.status === 'pending' || job.status === 'queued',
  );
  let status: RuntimeSessionStatus = 'pending';
  let activeJobId: string | null = null;
  let runnerId: string | null = null;

  if (runningJob) {
    status = 'running';
    activeJobId = runningJob.jobId;
    runnerId = runningJob.claimOwnerId;
  } else if (waitingJob) {
    status = 'waiting';
  } else if (pendingJob) {
    status = 'pending';
  } else if (
    jobs.length > 0 &&
    jobs.every((job) => job.status === 'completed')
  ) {
    status = 'completed';
  } else if (jobs.some((job) => job.status === 'failed')) {
    status = 'failed';
  } else if (
    jobs.length > 0 &&
    jobs.every((job) => job.status === 'cancelled')
  ) {
    status = 'cancelled';
  }

  return store.sessions.save({
    ...session,
    activeJobId,
    lastHeartbeatAt: timestamp,
    runnerId,
    status,
    updatedAt: timestamp,
  });
}

function toPendingSummary(
  record: RuntimeApprovalRecord,
): ApprovalRuntimePendingSummary {
  return {
    action: extractRequestString(record.request, 'action'),
    approvalId: record.approvalId,
    jobId: record.jobId ?? '',
    requestedAt: record.requestedAt,
    sessionId: record.sessionId,
    title: extractRequestString(record.request, 'title'),
    traceId: record.traceId,
  };
}

function buildResolutionResponse(
  input: ApprovalRuntimeResolutionInput,
): JsonValue {
  return {
    decision: input.decision,
    metadata: input.responseMetadata,
    reason: input.reason,
  };
}

function buildRejectionError(
  approval: RuntimeApprovalRecord,
  input: ApprovalRuntimeResolutionInput,
): JsonValue {
  return {
    approvalId: approval.approvalId,
    code: 'approval-rejected',
    decision: input.decision,
    message:
      input.reason ??
      `Approval rejected for ${extractRequestString(approval.request, 'title') || approval.approvalId}.`,
    retryable: false,
  };
}

function extractJobErrorMessage(job: RuntimeJobRecord): string {
  if (
    job.error &&
    typeof job.error === 'object' &&
    !Array.isArray(job.error) &&
    'message' in job.error &&
    typeof job.error.message === 'string'
  ) {
    return job.error.message;
  }

  return `Job ${job.jobId} failed.`;
}

export function createApprovalRuntimeService(
  options: ApprovalRuntimeServiceOptions,
): ApprovalRuntimeService {
  async function recordEvent(input: RuntimeEventWriteInput): Promise<void> {
    if (!options.recordEvent) {
      return;
    }

    await options.recordEvent(input);
  }

  async function resolveApprovalJob(
    store: OperationalStore,
    approval: RuntimeApprovalRecord,
    input: ApprovalRuntimeResolutionInput,
  ): Promise<RuntimeJobRecord | null> {
    if (!approval.jobId) {
      return null;
    }

    let job = await store.jobs.getById(approval.jobId);

    if (!job) {
      return null;
    }

    if (
      job.status === 'waiting' &&
      job.waitReason === 'approval' &&
      job.waitApprovalId === approval.approvalId
    ) {
      if (approval.status === 'approved') {
        job = await store.jobs.approveWaiting({
          approvalId: approval.approvalId,
          jobId: approval.jobId,
          timestamp: input.resolvedAt,
        });
      } else {
        job = await store.jobs.rejectWaiting({
          approvalId: approval.approvalId,
          error: buildRejectionError(approval, input),
          jobId: approval.jobId,
          timestamp: input.resolvedAt,
        });
      }
    }

    await synchronizeSessionState(store, approval.sessionId, input.resolvedAt);
    return job;
  }

  return {
    async createApproval(
      input: ApprovalRuntimeCreateInput,
    ): Promise<ApprovalRuntimeCreateResult> {
      const store = await options.getStore();
      const existingPending = (
        await store.approvals.listByJobId(input.request.correlation.jobId)
      ).find((approval) => approval.status === 'pending');

      if (existingPending) {
        return {
          approval: existingPending,
        };
      }

      const approval = await store.approvals.save({
        approvalId: randomUUID(),
        jobId: input.request.correlation.jobId,
        request: input.request as unknown as JsonValue,
        requestedAt: input.requestedAt,
        resolvedAt: null,
        response: null,
        sessionId: input.request.correlation.sessionId,
        status: 'pending',
        traceId:
          input.request.correlation.traceId ??
          `${input.request.correlation.sessionId}:${input.request.correlation.jobId}`,
        updatedAt: input.requestedAt,
      });

      await recordEvent({
        correlation: {
          approvalId: approval.approvalId,
          jobId: approval.jobId,
          requestId: input.request.correlation.requestId,
          sessionId: approval.sessionId,
          traceId: approval.traceId,
        },
        eventType: 'approval-requested',
        metadata: {
          action: input.request.action,
          title: input.request.title,
        },
        occurredAt: input.requestedAt,
        summary: `Approval requested for ${input.request.title}.`,
      });

      return {
        approval,
      };
    },
    async getApproval(
      approvalId: string,
    ): Promise<RuntimeApprovalRecord | null> {
      const store = await options.getStore();
      return store.approvals.getById(approvalId);
    },
    async listPendingApprovals(
      filter: ApprovalRuntimePendingFilter = {},
    ): Promise<ApprovalRuntimePendingSummary[]> {
      const store = await options.getStore();
      const approvals = await store.approvals.listPending(filter);

      return approvals.map((approval) => toPendingSummary(approval));
    },
    async resolveApproval(
      input: ApprovalRuntimeResolutionInput,
    ): Promise<ApprovalRuntimeResolution> {
      const store = await options.getStore();
      const resolution = await store.approvals.resolve({
        approvalId: input.approvalId,
        response: buildResolutionResponse(input),
        resolvedAt: input.resolvedAt,
        status: input.decision,
        updatedAt: input.resolvedAt,
      });
      const approval = resolution.approval;
      const job = await resolveApprovalJob(store, approval, input);

      if (resolution.applied) {
        await recordEvent({
          correlation: {
            approvalId: approval.approvalId,
            jobId: approval.jobId,
            requestId: null,
            sessionId: approval.sessionId,
            traceId: approval.traceId,
          },
          eventType:
            approval.status === 'approved'
              ? 'approval-approved'
              : 'approval-rejected',
          metadata: {
            action: extractRequestString(approval.request, 'action'),
            reason: input.reason,
            title: extractRequestString(approval.request, 'title'),
          },
          occurredAt: input.resolvedAt,
          summary:
            approval.status === 'approved'
              ? `Approval ${approval.approvalId} approved.`
              : `Approval ${approval.approvalId} rejected.`,
        });
      }

      if (job?.status === 'failed') {
        await recordEvent({
          correlation: {
            approvalId: approval.approvalId,
            jobId: job.jobId,
            requestId: null,
            sessionId: approval.sessionId,
            traceId: approval.traceId ?? job.currentRunId,
          },
          eventType: 'job-failed',
          level: 'error',
          metadata: {
            message: extractJobErrorMessage(job),
            runId: job.currentRunId,
          },
          occurredAt: input.resolvedAt,
          summary: `Job ${job.jobId} failed after approval rejection.`,
        });
      }

      return {
        applied: resolution.applied,
        approval,
        job,
        repository: resolution,
      };
    },
  };
}

export function createApprovalRequestedAt(
  now: () => number = Date.now,
): string {
  return toIsoTimestamp(now());
}

export function createApprovalRequest(
  request: ApprovalRuntimeRequest,
): ApprovalRuntimeRequest {
  return request;
}

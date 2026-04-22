import { z } from 'zod';
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../../index.js';
import { OperationalStoreError } from '../../store/sqlite-store.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createErrorPayload,
  createJsonRouteResponse,
  defineApiRoute,
  readJsonRequestBody,
  type ApiRouteDefinition,
} from '../route-contract.js';
import { getStartupStatus, type StartupStatus } from '../startup-status.js';
import type {
  RuntimeApprovalRecord,
  RuntimeJobRecord,
} from '../../store/store-contract.js';
import type { JsonValue } from '../../workspace/workspace-types.js';

const approvalResolutionBodySchema = z.object({
  approvalId: z.string().trim().min(1),
  decision: z.enum(['approved', 'rejected']),
});

type ApprovalResolutionOutcome =
  | 'already-approved'
  | 'already-rejected'
  | 'approved'
  | 'rejected';

type ApprovalResolutionPayload = {
  generatedAt: string;
  message: string;
  ok: true;
  resolution: {
    applied: boolean;
    approval: {
      action: string;
      approvalId: string;
      details: JsonValue | null;
      jobId: string | null;
      requestedAt: string;
      resolvedAt: string | null;
      response: JsonValue | null;
      sessionId: string;
      status: string;
      title: string;
      traceId: string | null;
    };
    job: {
      attempt: number;
      completedAt: string | null;
      currentRunId: string;
      jobId: string;
      jobType: string;
      startedAt: string | null;
      status: string;
      updatedAt: string;
      waitReason: string | null;
    } | null;
    outcome: ApprovalResolutionOutcome;
  };
  service: typeof STARTUP_SERVICE_NAME;
  sessionId: typeof STARTUP_SESSION_ID;
  status: StartupStatus;
};

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

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-approval-resolution-request',
  );
}

function toApprovalPayload(approval: RuntimeApprovalRecord) {
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

function toJobPayload(job: RuntimeJobRecord | null) {
  if (!job) {
    return null;
  }

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

function toOutcome(
  approval: RuntimeApprovalRecord,
  applied: boolean,
): ApprovalResolutionOutcome {
  if (applied) {
    return approval.status === 'approved' ? 'approved' : 'rejected';
  }

  return approval.status === 'approved'
    ? 'already-approved'
    : 'already-rejected';
}

function toMessage(outcome: ApprovalResolutionOutcome): string {
  switch (outcome) {
    case 'approved':
      return 'Approval resolved as approved.';
    case 'rejected':
      return 'Approval resolved as rejected.';
    case 'already-approved':
      return 'Approval was already approved before this request.';
    case 'already-rejected':
      return 'Approval was already rejected before this request.';
  }
}

function createResolutionPayload(input: {
  approval: RuntimeApprovalRecord;
  applied: boolean;
  job: RuntimeJobRecord | null;
  status: StartupStatus;
}): ApprovalResolutionPayload {
  const outcome = toOutcome(input.approval, input.applied);

  return {
    generatedAt: new Date().toISOString(),
    message: toMessage(outcome),
    ok: true,
    resolution: {
      applied: input.applied,
      approval: toApprovalPayload(input.approval),
      job: toJobPayload(input.job),
      outcome,
    },
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status: input.status,
  };
}

function createOperationalStoreErrorResponse(
  error: OperationalStoreError,
): ReturnType<typeof createJsonRouteResponse> {
  if (error.code === 'operational-store-invalid-input') {
    return createBadRequestResponse(
      new ApiRequestValidationError(
        error.message,
        'invalid-approval-resolution-request',
      ),
    );
  }

  if (error.code === 'operational-store-locked') {
    return createJsonRouteResponse(
      503,
      createErrorPayload(
        'error',
        'approval-resolution-unavailable',
        error.message,
      ),
    );
  }

  return createJsonRouteResponse(
    500,
    createErrorPayload('error', 'approval-resolution-failed', error.message),
  );
}

export function createApprovalResolutionRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ request, services }) {
      let rawBody: unknown;

      try {
        rawBody = await readJsonRequestBody(request);
      } catch (error) {
        return createBadRequestResponse(
          error instanceof ApiRequestValidationError
            ? error
            : new ApiRequestValidationError(
                error instanceof Error ? error.message : String(error),
                'invalid-approval-resolution-request',
              ),
        );
      }

      const parsedBody = approvalResolutionBodySchema.safeParse(rawBody);

      if (!parsedBody.success) {
        return createBadRequestResponse(toValidationError(parsedBody.error));
      }

      try {
        const diagnostics = await services.startupDiagnostics.getDiagnostics();
        const startupStatus = getStartupStatus(diagnostics);
        const approvalRuntime = await services.approvalRuntime.getService();
        const store = await services.operationalStore.getStore();
        const approval = await approvalRuntime.getApproval(
          parsedBody.data.approvalId,
        );

        if (!approval) {
          return createJsonRouteResponse(
            404,
            createErrorPayload(
              'not-found',
              'approval-not-found',
              `Runtime approval does not exist: ${parsedBody.data.approvalId}`,
            ),
          );
        }

        const existingJob = approval.jobId
          ? await store.jobs.getById(approval.jobId)
          : null;

        if (approval.status !== 'pending') {
          return createJsonRouteResponse(
            200,
            createResolutionPayload({
              approval,
              applied: false,
              job: existingJob,
              status: startupStatus,
            }),
          );
        }

        const existingSession = await store.sessions.getById(
          approval.sessionId,
        );

        if (!existingSession) {
          return createJsonRouteResponse(
            409,
            createErrorPayload(
              'error',
              'approval-resolution-session-missing',
              `Runtime session does not exist for approval ${approval.approvalId}: ${approval.sessionId}`,
            ),
          );
        }

        if (approval.jobId && !existingJob) {
          return createJsonRouteResponse(
            409,
            createErrorPayload(
              'error',
              'approval-resolution-job-missing',
              `Runtime job does not exist for approval ${approval.approvalId}: ${approval.jobId}`,
            ),
          );
        }

        const resolution = await approvalRuntime.resolveApproval({
          approvalId: parsedBody.data.approvalId,
          decision: parsedBody.data.decision,
          reason: null,
          resolvedAt: new Date().toISOString(),
          responseMetadata: null,
        });

        return createJsonRouteResponse(
          200,
          createResolutionPayload({
            approval: resolution.approval,
            applied: resolution.applied,
            job: resolution.job,
            status: startupStatus,
          }),
        );
      } catch (error) {
        if (error instanceof OperationalStoreError) {
          return createOperationalStoreErrorResponse(error);
        }

        throw error;
      }
    },
    methods: ['POST'],
    path: '/approval-resolution',
  });
}

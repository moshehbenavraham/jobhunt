import { z } from 'zod';
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../../index.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';

const runtimeDiagnosticsQuerySchema = z.object({
  jobId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  requestId: z.string().trim().min(1).optional(),
  sessionId: z.string().trim().min(1).optional(),
  traceId: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-runtime-diagnostics-query',
  );
}

export function createRuntimeDiagnosticsRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = runtimeDiagnosticsQuerySchema.safeParse({
        jobId: requestInput.searchParams.get('jobId') ?? undefined,
        limit: requestInput.searchParams.get('limit') ?? undefined,
        requestId: requestInput.searchParams.get('requestId') ?? undefined,
        sessionId: requestInput.searchParams.get('sessionId') ?? undefined,
        traceId: requestInput.searchParams.get('traceId') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      const observability = await services.observability.getService();
      const diagnostics = await observability.getDiagnosticsSummary({
        ...(parsedQuery.data.jobId ? { jobId: parsedQuery.data.jobId } : {}),
        ...(parsedQuery.data.limit !== undefined
          ? { limit: parsedQuery.data.limit }
          : {}),
        ...(parsedQuery.data.requestId
          ? { requestId: parsedQuery.data.requestId }
          : {}),
        ...(parsedQuery.data.sessionId
          ? { sessionId: parsedQuery.data.sessionId }
          : {}),
        ...(parsedQuery.data.traceId
          ? { traceId: parsedQuery.data.traceId }
          : {}),
      });

      return createJsonRouteResponse(200, {
        count: {
          failedJobs: diagnostics.failedJobs.length,
          recentEvents: diagnostics.recentEvents.length,
        },
        diagnostics,
        ok: true,
        service: STARTUP_SERVICE_NAME,
        sessionId: STARTUP_SESSION_ID,
        status: 'ok',
      });
    },
    methods: ['GET', 'HEAD'],
    path: '/runtime/diagnostics',
  });
}

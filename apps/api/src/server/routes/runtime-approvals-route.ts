import { z } from 'zod';
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../../index.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';

const runtimeApprovalsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sessionId: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-runtime-approvals-query',
  );
}

export function createRuntimeApprovalsRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = runtimeApprovalsQuerySchema.safeParse({
        limit: requestInput.searchParams.get('limit') ?? undefined,
        sessionId: requestInput.searchParams.get('sessionId') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      const approvalRuntime = await services.approvalRuntime.getService();
      const approvals = await approvalRuntime.listPendingApprovals({
        ...(parsedQuery.data.limit !== undefined
          ? { limit: parsedQuery.data.limit }
          : {}),
        ...(parsedQuery.data.sessionId
          ? { sessionId: parsedQuery.data.sessionId }
          : {}),
      });

      return createJsonRouteResponse(200, {
        approvals,
        count: approvals.length,
        ok: true,
        service: STARTUP_SERVICE_NAME,
        sessionId: STARTUP_SESSION_ID,
        status: 'ok',
      });
    },
    methods: ['GET', 'HEAD'],
    path: '/runtime/approvals',
  });
}

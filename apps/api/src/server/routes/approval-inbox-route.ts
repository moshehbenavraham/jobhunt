import { z } from 'zod';
import {
  createApprovalInboxSummary,
  type ApprovalInboxSummaryOptions,
} from '../approval-inbox-summary.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';
import { getStartupHttpStatus } from '../startup-status.js';

const approvalInboxQuerySchema = z.object({
  approvalId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
  sessionId: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-approval-inbox-query',
  );
}

function toSummaryOptions(
  input: z.output<typeof approvalInboxQuerySchema>,
): ApprovalInboxSummaryOptions {
  return {
    ...(input.approvalId ? { approvalId: input.approvalId } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
  };
}

export function createApprovalInboxRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = approvalInboxQuerySchema.safeParse({
        approvalId: requestInput.searchParams.get('approvalId') ?? undefined,
        limit: requestInput.searchParams.get('limit') ?? undefined,
        sessionId: requestInput.searchParams.get('sessionId') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      const payload = await createApprovalInboxSummary(
        services,
        toSummaryOptions(parsedQuery.data),
      );

      return createJsonRouteResponse(
        getStartupHttpStatus(payload.status),
        payload,
      );
    },
    methods: ['GET', 'HEAD'],
    path: '/approval-inbox',
  });
}

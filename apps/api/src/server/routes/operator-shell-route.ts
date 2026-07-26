import { z } from 'zod';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';
import { createOperatorShellSummary } from '../operator-shell-summary.js';
import { getStartupHttpStatus } from '../startup-status.js';

const operatorShellQuerySchema = z.object({
  approvalLimit: z.coerce.number().int().min(1).max(10).optional(),
  failureLimit: z.coerce.number().int().min(1).max(10).optional(),
  sessionId: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-operator-shell-query',
  );
}

export function createOperatorShellRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = operatorShellQuerySchema.safeParse({
        approvalLimit:
          requestInput.searchParams.get('approvalLimit') ?? undefined,
        failureLimit:
          requestInput.searchParams.get('failureLimit') ?? undefined,
        sessionId: requestInput.searchParams.get('sessionId') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      const payload = await createOperatorShellSummary(services, {
        ...(parsedQuery.data.approvalLimit !== undefined
          ? { approvalLimit: parsedQuery.data.approvalLimit }
          : {}),
        ...(parsedQuery.data.failureLimit !== undefined
          ? { failureLimit: parsedQuery.data.failureLimit }
          : {}),
        ...(parsedQuery.data.sessionId
          ? { sessionId: parsedQuery.data.sessionId }
          : {}),
      });

      return createJsonRouteResponse(
        getStartupHttpStatus(payload.status),
        payload,
      );
    },
    methods: ['GET', 'HEAD'],
    path: '/operator-shell',
  });
}

import { z } from 'zod';
import type { EvaluationResultSummaryOptions } from '../evaluation-result-contract.js';
import { createEvaluationResultSummary } from '../evaluation-result-summary.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';
import { getStartupHttpStatus } from '../startup-status.js';

const evaluationResultQuerySchema = z.object({
  previewLimit: z.coerce.number().int().min(1).max(8).optional(),
  sessionId: z.string().trim().min(1).optional(),
  workflow: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-evaluation-result-query',
  );
}

function toSummaryOptions(
  input: z.output<typeof evaluationResultQuerySchema>,
): EvaluationResultSummaryOptions {
  return {
    ...(input.previewLimit !== undefined
      ? { previewLimit: input.previewLimit }
      : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.workflow ? { workflow: input.workflow } : {}),
  };
}

export function createEvaluationResultRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = evaluationResultQuerySchema.safeParse({
        previewLimit: requestInput.searchParams.get('previewLimit') ?? undefined,
        sessionId: requestInput.searchParams.get('sessionId') ?? undefined,
        workflow: requestInput.searchParams.get('workflow') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      const payload = await createEvaluationResultSummary(
        services,
        toSummaryOptions(parsedQuery.data),
      );

      return createJsonRouteResponse(
        getStartupHttpStatus(payload.status),
        payload,
      );
    },
    methods: ['GET', 'HEAD'],
    path: '/evaluation-result',
  });
}

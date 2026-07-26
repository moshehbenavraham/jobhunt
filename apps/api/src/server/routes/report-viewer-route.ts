import { z } from 'zod';
import type { ReportViewerSummaryOptions } from '../report-viewer-contract.js';
import {
  createReportViewerSummary,
  ReportViewerInputError,
} from '../report-viewer-summary.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';

const reportViewerQuerySchema = z.object({
  group: z.enum(['all', 'output', 'reports']).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
  offset: z.coerce.number().int().min(0).max(500).optional(),
  reportPath: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-report-viewer-query',
  );
}

function toSummaryOptions(
  input: z.output<typeof reportViewerQuerySchema>,
): ReportViewerSummaryOptions {
  return {
    ...(input.group ? { group: input.group } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
    ...(input.reportPath ? { reportPath: input.reportPath } : {}),
  };
}

export function createReportViewerRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = reportViewerQuerySchema.safeParse({
        group: requestInput.searchParams.get('group') ?? undefined,
        limit: requestInput.searchParams.get('limit') ?? undefined,
        offset: requestInput.searchParams.get('offset') ?? undefined,
        reportPath: requestInput.searchParams.get('reportPath') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      try {
        const payload = await createReportViewerSummary(
          services,
          toSummaryOptions(parsedQuery.data),
        );

        return createJsonRouteResponse(200, payload);
      } catch (error) {
        if (error instanceof ReportViewerInputError) {
          return createBadRequestResponse(
            new ApiRequestValidationError(error.message, error.code),
          );
        }

        throw error;
      }
    },
    methods: ['GET', 'HEAD'],
    path: '/report-viewer',
  });
}

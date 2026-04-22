import { z } from 'zod';
import type { PipelineReviewSummaryOptions } from '../pipeline-review-contract.js';
import {
  createPipelineReviewSummary,
  PipelineReviewInputError,
} from '../pipeline-review-summary.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';

const pipelineReviewQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).optional(),
    offset: z.coerce.number().int().min(0).max(500).optional(),
    reportNumber: z
      .string()
      .trim()
      .regex(/^\d{3}$/)
      .optional(),
    section: z.enum(['all', 'pending', 'processed']).optional(),
    sort: z.enum(['company', 'queue', 'score']).optional(),
    url: z
      .string()
      .trim()
      .url()
      .refine(
        (value) => value.startsWith('http://') || value.startsWith('https://'),
        'URL focus must use http or https.',
      )
      .optional(),
  })
  .refine(
    (value) => !(value.reportNumber && value.url),
    'Select a pipeline row by report number or URL, not both at once.',
  );

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-pipeline-review-query',
  );
}

function toSummaryOptions(
  input: z.output<typeof pipelineReviewQuerySchema>,
): PipelineReviewSummaryOptions {
  return {
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
    ...(input.reportNumber ? { reportNumber: input.reportNumber } : {}),
    ...(input.section ? { section: input.section } : {}),
    ...(input.sort ? { sort: input.sort } : {}),
    ...(input.url ? { url: input.url } : {}),
  };
}

export function createPipelineReviewRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = pipelineReviewQuerySchema.safeParse({
        limit: requestInput.searchParams.get('limit') ?? undefined,
        offset: requestInput.searchParams.get('offset') ?? undefined,
        reportNumber: requestInput.searchParams.get('reportNumber') ?? undefined,
        section: requestInput.searchParams.get('section') ?? undefined,
        sort: requestInput.searchParams.get('sort') ?? undefined,
        url: requestInput.searchParams.get('url') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      try {
        const payload = await createPipelineReviewSummary(
          services,
          toSummaryOptions(parsedQuery.data),
        );

        return createJsonRouteResponse(200, payload);
      } catch (error) {
        if (error instanceof PipelineReviewInputError) {
          return createBadRequestResponse(
            new ApiRequestValidationError(error.message, error.code),
          );
        }

        throw error;
      }
    },
    methods: ['GET', 'HEAD'],
    path: '/pipeline-review',
  });
}

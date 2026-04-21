import { z } from 'zod';
import { OrchestrationError } from '../../orchestration/orchestration-contract.js';
import { createChatConsoleCommandPayload } from '../chat-console-summary.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createErrorPayload,
  createJsonRouteResponse,
  defineApiRoute,
  readJsonRequestBody,
  type ApiRouteDefinition,
} from '../route-contract.js';

const orchestrationRouteBodySchema = z.discriminatedUnion('kind', [
  z.object({
    context: z.unknown().nullable().default(null),
    kind: z.literal('launch'),
    sessionId: z.string().trim().min(1).nullable().optional(),
    workflow: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal('resume'),
    sessionId: z.string().trim().min(1),
  }),
]);

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-orchestration-request',
  );
}

function createOrchestrationErrorResponse(
  error: OrchestrationError,
): ReturnType<typeof createJsonRouteResponse> {
  if (error.code === 'orchestration-invalid-request') {
    return createJsonRouteResponse(
      400,
      createErrorPayload('bad-request', error.code, error.message),
    );
  }

  return createJsonRouteResponse(
    500,
    createErrorPayload('error', error.code, error.message),
  );
}

export function createOrchestrationRoute(): ApiRouteDefinition {
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
                'invalid-orchestration-request',
              ),
        );
      }

      const parsedBody = orchestrationRouteBodySchema.safeParse(rawBody);

      if (!parsedBody.success) {
        return createBadRequestResponse(toValidationError(parsedBody.error));
      }

      try {
        const orchestration = await services.orchestration.getService();
        const handoff = await orchestration.orchestrate(parsedBody.data);
        const payload = await createChatConsoleCommandPayload(
          services,
          handoff,
        );

        return createJsonRouteResponse(200, payload);
      } catch (error) {
        if (error instanceof OrchestrationError) {
          return createOrchestrationErrorResponse(error);
        }

        throw error;
      }
    },
    methods: ['POST'],
    path: '/orchestration',
  });
}

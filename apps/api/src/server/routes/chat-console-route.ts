import { z } from 'zod';
import {
  createChatConsoleSummary,
  type ChatConsoleSummaryOptions,
} from '../chat-console-summary.js';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';
import { getStartupHttpStatus } from '../startup-status.js';
import type { RuntimeSessionStatus } from '../../store/store-contract.js';

const SESSION_STATUSES = [
  'cancelled',
  'completed',
  'failed',
  'pending',
  'running',
  'waiting',
] as const satisfies readonly RuntimeSessionStatus[];

const chatConsoleQuerySchema = z.object({
  cursorSessionId: z.string().trim().min(1).optional(),
  cursorUpdatedAt: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(12).optional(),
  sessionId: z.string().trim().min(1).optional(),
  statuses: z.string().trim().optional(),
  workflow: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-chat-console-query',
  );
}

function parseStatuses(
  value: string | undefined,
): RuntimeSessionStatus[] | undefined {
  if (!value) {
    return undefined;
  }

  const statuses = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (statuses.length === 0) {
    return undefined;
  }

  for (const status of statuses) {
    if (!(SESSION_STATUSES as readonly string[]).includes(status)) {
      throw new ApiRequestValidationError(
        `Unsupported session status filter: ${status}.`,
        'invalid-chat-console-status',
      );
    }
  }

  return [...new Set(statuses)] as RuntimeSessionStatus[];
}

function toSummaryOptions(
  input: z.output<typeof chatConsoleQuerySchema>,
): ChatConsoleSummaryOptions {
  if (
    (input.cursorSessionId && !input.cursorUpdatedAt) ||
    (!input.cursorSessionId && input.cursorUpdatedAt)
  ) {
    throw new ApiRequestValidationError(
      'Cursor pagination requires both cursorSessionId and cursorUpdatedAt.',
      'invalid-chat-console-cursor',
    );
  }

  const statuses = parseStatuses(input.statuses);

  return {
    ...(input.cursorSessionId && input.cursorUpdatedAt
      ? {
          cursorSessionId: input.cursorSessionId,
          cursorUpdatedAt: input.cursorUpdatedAt,
        }
      : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.workflow ? { workflow: input.workflow } : {}),
    ...(statuses ? { statuses } : {}),
  };
}

export function createChatConsoleRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = chatConsoleQuerySchema.safeParse({
        cursorSessionId:
          requestInput.searchParams.get('cursorSessionId') ?? undefined,
        cursorUpdatedAt:
          requestInput.searchParams.get('cursorUpdatedAt') ?? undefined,
        limit: requestInput.searchParams.get('limit') ?? undefined,
        sessionId: requestInput.searchParams.get('sessionId') ?? undefined,
        statuses: requestInput.searchParams.get('statuses') ?? undefined,
        workflow: requestInput.searchParams.get('workflow') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      let options: ChatConsoleSummaryOptions;

      try {
        options = toSummaryOptions(parsedQuery.data);
      } catch (error) {
        return createBadRequestResponse(
          error instanceof ApiRequestValidationError
            ? error
            : new ApiRequestValidationError(
                error instanceof Error ? error.message : String(error),
                'invalid-chat-console-query',
              ),
        );
      }

      const payload = await createChatConsoleSummary(services, options);

      return createJsonRouteResponse(
        getStartupHttpStatus(payload.status),
        payload,
      );
    },
    methods: ['GET', 'HEAD'],
    path: '/chat-console',
  });
}

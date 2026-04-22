import { z } from 'zod';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';
import { createSettingsSummary } from '../settings-summary.js';
import { getStartupHttpStatus } from '../startup-status.js';
import type { SettingsUpdateCheckPayload } from '../settings-update-check.js';

const settingsQuerySchema = z.object({
  toolLimit: z.coerce.number().int().min(1).max(10).optional(),
  workflowLimit: z.coerce.number().int().min(1).max(10).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-settings-query',
  );
}

export function createSettingsRoute(options: {
  readUpdateCheck?: (input: {
    repoRoot: string;
  }) => Promise<SettingsUpdateCheckPayload>;
} = {}): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = settingsQuerySchema.safeParse({
        toolLimit: requestInput.searchParams.get('toolLimit') ?? undefined,
        workflowLimit:
          requestInput.searchParams.get('workflowLimit') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      const payload = await createSettingsSummary(services, {
        ...(options.readUpdateCheck
          ? {
              readUpdateCheck: options.readUpdateCheck,
            }
          : {}),
        ...(parsedQuery.data.toolLimit !== undefined
          ? {
              toolLimit: parsedQuery.data.toolLimit,
            }
          : {}),
        ...(parsedQuery.data.workflowLimit !== undefined
          ? {
              workflowLimit: parsedQuery.data.workflowLimit,
            }
          : {}),
      });

      return createJsonRouteResponse(
        getStartupHttpStatus(payload.status),
        payload,
      );
    },
    methods: ['GET', 'HEAD'],
    path: '/settings',
  });
}

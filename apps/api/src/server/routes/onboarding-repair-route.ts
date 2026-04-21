import { z } from 'zod';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createErrorPayload,
  createJsonRouteResponse,
  defineApiRoute,
  readJsonRequestBody,
  type ApiRouteDefinition,
} from '../route-contract.js';
import {
  isOnboardingRepairConflict,
  isOnboardingRepairToolError,
  runOnboardingRepair,
} from '../onboarding-summary.js';
import { ONBOARDING_REPAIRABLE_SURFACE_KEYS } from '../../workspace/workspace-types.js';

const onboardingRepairBodySchema = z.object({
  confirm: z.literal(true),
  targets: z.array(z.enum(ONBOARDING_REPAIRABLE_SURFACE_KEYS)).min(1).max(5),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-onboarding-repair-request',
  );
}

function createRepairErrorResponse(error: unknown) {
  if (isOnboardingRepairConflict(error)) {
    return createJsonRouteResponse(
      409,
      createErrorPayload(
        'error',
        error.name === 'OnboardingRepairInFlightError'
          ? 'onboarding-repair-in-flight'
          : 'onboarding-target-already-present',
        error.message,
      ),
    );
  }

  if (isOnboardingRepairToolError(error)) {
    if (error.code === 'tool-invalid-config') {
      return createJsonRouteResponse(
        500,
        createErrorPayload('error', 'onboarding-template-missing', error.message),
      );
    }

    if (error.code === 'tool-invalid-input') {
      return createJsonRouteResponse(
        400,
        createErrorPayload(
          'bad-request',
          'invalid-onboarding-repair-request',
          error.message,
        ),
      );
    }

    return createJsonRouteResponse(
      500,
      createErrorPayload('error', 'onboarding-repair-failed', error.message),
    );
  }

  return createJsonRouteResponse(
    500,
    createErrorPayload(
      'error',
      'onboarding-repair-failed',
      error instanceof Error ? error.message : String(error),
    ),
  );
}

export function createOnboardingRepairRoute(): ApiRouteDefinition {
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
                'invalid-onboarding-repair-request',
              ),
        );
      }

      const parsedBody = onboardingRepairBodySchema.safeParse(rawBody);

      if (!parsedBody.success) {
        return createBadRequestResponse(toValidationError(parsedBody.error));
      }

      try {
        const payload = await runOnboardingRepair(services, {
          targets: parsedBody.data.targets,
        });

        return createJsonRouteResponse(200, payload);
      } catch (error) {
        return createRepairErrorResponse(error);
      }
    },
    methods: ['POST'],
    path: '/onboarding/repair',
  });
}

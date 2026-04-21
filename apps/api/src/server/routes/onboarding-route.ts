import { z } from 'zod';
import {
  ApiRequestValidationError,
  createBadRequestResponse,
  createJsonRouteResponse,
  defineApiRoute,
  type ApiRouteDefinition,
} from '../route-contract.js';
import {
  createOnboardingSummary,
  isOnboardingRepairableTarget,
} from '../onboarding-summary.js';
import type { OnboardingRepairableSurfaceKey } from '../../workspace/workspace-types.js';

const onboardingQuerySchema = z.object({
  targets: z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((value, context) => {
      if (!value) {
        return undefined;
      }

      const parsedTargets = value
        .split(',')
        .map((target) => target.trim())
        .filter((target) => target.length > 0);

      if (parsedTargets.length === 0 || parsedTargets.length > 5) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'targets must contain between 1 and 5 surface keys.',
        });
        return z.NEVER;
      }

      for (const target of parsedTargets) {
        if (!isOnboardingRepairableTarget(target)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unsupported onboarding target: ${target}`,
          });
          return z.NEVER;
        }
      }

      return parsedTargets;
    }),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
  return new ApiRequestValidationError(
    error.issues.map((issue) => issue.message).join('; '),
    'invalid-onboarding-query',
  );
}

function toTargets(
  targets: string[] | undefined,
): OnboardingRepairableSurfaceKey[] | undefined {
  if (!targets) {
    return undefined;
  }

  return targets.filter((target): target is OnboardingRepairableSurfaceKey =>
    isOnboardingRepairableTarget(target),
  );
}

export function createOnboardingRoute(): ApiRouteDefinition {
  return defineApiRoute({
    async handle({ requestInput, services }) {
      const parsedQuery = onboardingQuerySchema.safeParse({
        targets: requestInput.searchParams.get('targets') ?? undefined,
      });

      if (!parsedQuery.success) {
        return createBadRequestResponse(toValidationError(parsedQuery.error));
      }

      const targets = toTargets(parsedQuery.data.targets);
      const payload = targets
        ? await createOnboardingSummary(services, {
            targets,
          })
        : await createOnboardingSummary(services);

      return createJsonRouteResponse(200, payload);
    },
    methods: ['GET', 'HEAD'],
    path: '/onboarding',
  });
}

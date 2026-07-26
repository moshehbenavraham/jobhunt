import { z } from "zod";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createJsonRouteResponse,
	defineApiRoute,
} from "../route-contract.js";
import { getStartupHttpStatus } from "../startup-status.js";
import {
	createTrackerSpecialistSummary,
	TrackerSpecialistInputError,
} from "../tracker-specialist-summary.js";

const trackerSpecialistQuerySchema = z.object({
	mode: z
		.enum(["compare-offers", "follow-up-cadence", "rejection-patterns"])
		.optional(),
	sessionId: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-tracker-specialist-query",
	);
}

export function createTrackerSpecialistRoute(): ApiRouteDefinition {
	return defineApiRoute({
		async handle({ requestInput, services }) {
			const parsedQuery = trackerSpecialistQuerySchema.safeParse({
				mode: requestInput.searchParams.get("mode") ?? undefined,
				sessionId: requestInput.searchParams.get("sessionId") ?? undefined,
			});

			if (!parsedQuery.success) {
				return createBadRequestResponse(toValidationError(parsedQuery.error));
			}

			try {
				const payload = await createTrackerSpecialistSummary(services, {
					...(parsedQuery.data.mode ? { mode: parsedQuery.data.mode } : {}),
					...(parsedQuery.data.sessionId
						? { sessionId: parsedQuery.data.sessionId }
						: {}),
				});

				return createJsonRouteResponse(
					getStartupHttpStatus(payload.status),
					payload,
				);
			} catch (error) {
				if (error instanceof TrackerSpecialistInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(error.message, error.code),
					);
				}

				throw error;
			}
		},
		methods: ["GET", "HEAD"],
		path: "/tracker-specialist",
	});
}

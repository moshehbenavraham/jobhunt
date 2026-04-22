import { z } from "zod";
import {
	createResearchSpecialistSummary,
	ResearchSpecialistInputError,
} from "../research-specialist-summary.js";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createJsonRouteResponse,
	defineApiRoute,
} from "../route-contract.js";
import { getStartupHttpStatus } from "../startup-status.js";

const researchSpecialistQuerySchema = z.object({
	mode: z
		.enum([
			"deep-company-research",
			"linkedin-outreach",
			"interview-prep",
			"training-review",
			"project-review",
		])
		.optional(),
	sessionId: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-research-specialist-query",
	);
}

export function createResearchSpecialistRoute(): ApiRouteDefinition {
	return defineApiRoute({
		async handle({ requestInput, services }) {
			const parsedQuery = researchSpecialistQuerySchema.safeParse({
				mode: requestInput.searchParams.get("mode") ?? undefined,
				sessionId: requestInput.searchParams.get("sessionId") ?? undefined,
			});

			if (!parsedQuery.success) {
				return createBadRequestResponse(toValidationError(parsedQuery.error));
			}

			try {
				const payload = await createResearchSpecialistSummary(services, {
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
				if (error instanceof ResearchSpecialistInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(error.message, error.code),
					);
				}

				throw error;
			}
		},
		methods: ["GET", "HEAD"],
		path: "/research-specialist",
	});
}

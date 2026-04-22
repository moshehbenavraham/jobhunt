import { z } from "zod";
import {
	ApplicationHelpInputError,
	createApplicationHelpSummary,
} from "../application-help-summary.js";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createJsonRouteResponse,
	defineApiRoute,
} from "../route-contract.js";
import { getStartupHttpStatus } from "../startup-status.js";

const applicationHelpQuerySchema = z.object({
	sessionId: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-application-help-query",
	);
}

export function createApplicationHelpRoute(): ApiRouteDefinition {
	return defineApiRoute({
		async handle({ requestInput, services }) {
			const parsedQuery = applicationHelpQuerySchema.safeParse({
				sessionId: requestInput.searchParams.get("sessionId") ?? undefined,
			});

			if (!parsedQuery.success) {
				return createBadRequestResponse(toValidationError(parsedQuery.error));
			}

			try {
				const payload = await createApplicationHelpSummary(services, {
					...(parsedQuery.data.sessionId !== undefined
						? {
								sessionId: parsedQuery.data.sessionId,
							}
						: {}),
				});

				return createJsonRouteResponse(
					getStartupHttpStatus(payload.status),
					payload,
				);
			} catch (error) {
				if (error instanceof ApplicationHelpInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(error.message, error.code),
					);
				}

				throw error;
			}
		},
		methods: ["GET", "HEAD"],
		path: "/application-help",
	});
}

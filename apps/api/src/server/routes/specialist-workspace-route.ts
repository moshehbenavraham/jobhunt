import { z } from "zod";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createJsonRouteResponse,
	defineApiRoute,
} from "../route-contract.js";
import { specialistWorkspaceModeValues } from "../specialist-workspace-contract.js";
import {
	createSpecialistWorkspaceSummary,
	SpecialistWorkspaceInputError,
} from "../specialist-workspace-summary.js";
import { getStartupHttpStatus } from "../startup-status.js";

const specialistWorkspaceQuerySchema = z.object({
	mode: z.enum(specialistWorkspaceModeValues).optional(),
	sessionId: z.string().trim().min(1).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-specialist-workspace-query",
	);
}

export function createSpecialistWorkspaceRoute(): ApiRouteDefinition {
	return defineApiRoute({
		async handle({ requestInput, services }) {
			const parsedQuery = specialistWorkspaceQuerySchema.safeParse({
				mode: requestInput.searchParams.get("mode") ?? undefined,
				sessionId: requestInput.searchParams.get("sessionId") ?? undefined,
			});

			if (!parsedQuery.success) {
				return createBadRequestResponse(toValidationError(parsedQuery.error));
			}

			try {
				const payload = await createSpecialistWorkspaceSummary(services, {
					...(parsedQuery.data.mode !== undefined
						? {
								mode: parsedQuery.data.mode,
							}
						: {}),
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
				if (error instanceof SpecialistWorkspaceInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(error.message, error.code),
					);
				}

				throw error;
			}
		},
		methods: ["GET", "HEAD"],
		path: "/specialist-workspace",
	});
}

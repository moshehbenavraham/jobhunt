import { z } from "zod";
import { createOperatorHomeSummary } from "../operator-home-summary.js";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createJsonRouteResponse,
	defineApiRoute,
} from "../route-contract.js";
import { getStartupHttpStatus } from "../startup-status.js";

const operatorHomeQuerySchema = z.object({
	approvalLimit: z.coerce.number().int().min(1).max(6).optional(),
	artifactLimit: z.coerce.number().int().min(1).max(6).optional(),
	closeoutLimit: z.coerce.number().int().min(1).max(6).optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-operator-home-query",
	);
}

export function createOperatorHomeRoute(
	options: { createSummary?: typeof createOperatorHomeSummary } = {},
): ApiRouteDefinition {
	const createSummary = options.createSummary ?? createOperatorHomeSummary;

	return defineApiRoute({
		async handle({ requestInput, services }) {
			const parsedQuery = operatorHomeQuerySchema.safeParse({
				approvalLimit:
					requestInput.searchParams.get("approvalLimit") ?? undefined,
				artifactLimit:
					requestInput.searchParams.get("artifactLimit") ?? undefined,
				closeoutLimit:
					requestInput.searchParams.get("closeoutLimit") ?? undefined,
			});

			if (!parsedQuery.success) {
				return createBadRequestResponse(toValidationError(parsedQuery.error));
			}

			const payload = await createSummary(services, {
				...(parsedQuery.data.approvalLimit !== undefined
					? { approvalLimit: parsedQuery.data.approvalLimit }
					: {}),
				...(parsedQuery.data.artifactLimit !== undefined
					? { artifactLimit: parsedQuery.data.artifactLimit }
					: {}),
				...(parsedQuery.data.closeoutLimit !== undefined
					? { closeoutLimit: parsedQuery.data.closeoutLimit }
					: {}),
			});

			return createJsonRouteResponse(
				getStartupHttpStatus(payload.status),
				payload,
			);
		},
		methods: ["GET", "HEAD"],
		path: "/operator-home",
	});
}

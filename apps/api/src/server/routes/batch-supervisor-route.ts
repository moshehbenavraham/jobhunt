import { z } from "zod";
import type { BatchSupervisorSummaryOptions } from "../batch-supervisor-contract.js";
import {
	BatchSupervisorInputError,
	createBatchSupervisorSummary,
} from "../batch-supervisor-summary.js";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createJsonRouteResponse,
	defineApiRoute,
} from "../route-contract.js";
import { getStartupHttpStatus } from "../startup-status.js";

const batchSupervisorQuerySchema = z.object({
	itemId: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().min(1).max(20).optional(),
	offset: z.coerce.number().int().min(0).max(500).optional(),
	status: z
		.enum([
			"all",
			"completed",
			"failed",
			"pending",
			"partial",
			"processing",
			"retryable-failed",
			"skipped",
		])
		.optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-batch-supervisor-query",
	);
}

function toSummaryOptions(
	input: z.output<typeof batchSupervisorQuerySchema>,
): BatchSupervisorSummaryOptions {
	return {
		...(input.itemId !== undefined ? { itemId: input.itemId } : {}),
		...(input.limit !== undefined ? { limit: input.limit } : {}),
		...(input.offset !== undefined ? { offset: input.offset } : {}),
		...(input.status !== undefined ? { status: input.status } : {}),
	};
}

export function createBatchSupervisorRoute(): ApiRouteDefinition {
	return defineApiRoute({
		async handle({ requestInput, services }) {
			const parsedQuery = batchSupervisorQuerySchema.safeParse({
				itemId: requestInput.searchParams.get("itemId") ?? undefined,
				limit: requestInput.searchParams.get("limit") ?? undefined,
				offset: requestInput.searchParams.get("offset") ?? undefined,
				status: requestInput.searchParams.get("status") ?? undefined,
			});

			if (!parsedQuery.success) {
				return createBadRequestResponse(toValidationError(parsedQuery.error));
			}

			try {
				const payload = await createBatchSupervisorSummary(
					services,
					toSummaryOptions(parsedQuery.data),
				);

				return createJsonRouteResponse(
					getStartupHttpStatus(payload.status),
					payload,
				);
			} catch (error) {
				if (error instanceof BatchSupervisorInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(error.message, error.code),
					);
				}

				throw error;
			}
		},
		methods: ["GET", "HEAD"],
		path: "/batch-supervisor",
	});
}

import { z } from "zod";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createErrorPayload,
	createJsonRouteResponse,
	defineApiRoute,
} from "../route-contract.js";
import { getStartupHttpStatus } from "../startup-status.js";
import { TrackerTableError } from "../tracker-table.js";
import {
	createTrackerWorkspaceSummary,
	TrackerWorkspaceInputError,
} from "../tracker-workspace-summary.js";

const trackerWorkspaceQuerySchema = z
	.object({
		entryNumber: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().min(1).max(20).optional(),
		offset: z.coerce.number().int().min(0).max(500).optional(),
		reportNumber: z
			.string()
			.trim()
			.regex(/^\d{3}$/)
			.optional(),
		search: z.string().trim().max(120).optional(),
		sort: z.enum(["company", "date", "score", "status"]).optional(),
		status: z.string().trim().min(1).max(80).optional(),
	})
	.refine(
		(value) => !(value.entryNumber && value.reportNumber),
		"Select a tracker row by entry number or report number, not both at once.",
	);

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-tracker-workspace-query",
	);
}

export function createTrackerWorkspaceRoute(): ApiRouteDefinition {
	return defineApiRoute({
		async handle({ requestInput, services }) {
			const parsedQuery = trackerWorkspaceQuerySchema.safeParse({
				entryNumber: requestInput.searchParams.get("entryNumber") ?? undefined,
				limit: requestInput.searchParams.get("limit") ?? undefined,
				offset: requestInput.searchParams.get("offset") ?? undefined,
				reportNumber:
					requestInput.searchParams.get("reportNumber") ?? undefined,
				search: requestInput.searchParams.get("search") ?? undefined,
				sort: requestInput.searchParams.get("sort") ?? undefined,
				status: requestInput.searchParams.get("status") ?? undefined,
			});

			if (!parsedQuery.success) {
				return createBadRequestResponse(toValidationError(parsedQuery.error));
			}

			try {
				const payload = await createTrackerWorkspaceSummary(services, {
					...(parsedQuery.data.entryNumber !== undefined
						? { entryNumber: parsedQuery.data.entryNumber }
						: {}),
					...(parsedQuery.data.limit !== undefined
						? { limit: parsedQuery.data.limit }
						: {}),
					...(parsedQuery.data.offset !== undefined
						? { offset: parsedQuery.data.offset }
						: {}),
					...(parsedQuery.data.reportNumber
						? { reportNumber: parsedQuery.data.reportNumber }
						: {}),
					...(parsedQuery.data.search
						? { search: parsedQuery.data.search }
						: {}),
					...(parsedQuery.data.sort ? { sort: parsedQuery.data.sort } : {}),
					...(parsedQuery.data.status
						? { status: parsedQuery.data.status }
						: {}),
				});

				return createJsonRouteResponse(
					getStartupHttpStatus(payload.status),
					payload,
				);
			} catch (error) {
				if (error instanceof TrackerWorkspaceInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(error.message, error.code),
					);
				}

				if (error instanceof TrackerTableError) {
					return createJsonRouteResponse(
						500,
						createErrorPayload("error", error.code, error.message),
					);
				}

				throw error;
			}
		},
		methods: ["GET", "HEAD"],
		path: "/tracker-workspace",
	});
}

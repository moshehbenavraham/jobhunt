import { z } from "zod";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createJsonRouteResponse,
	defineApiRoute,
} from "../route-contract.js";
import type { ScanReviewSummaryOptions } from "../scan-review-contract.js";
import {
	createScanReviewSummary,
	ScanReviewInputError,
} from "../scan-review-summary.js";
import { getStartupHttpStatus } from "../startup-status.js";

const includeIgnoredQuerySchema = z
	.enum(["false", "true"])
	.transform((value) => value === "true")
	.optional();

const scanReviewQuerySchema = z.object({
	bucket: z
		.enum(["all", "strongest-fit", "possible-fit", "adjacent-or-noisy"])
		.optional(),
	includeIgnored: includeIgnoredQuerySchema,
	limit: z.coerce.number().int().min(1).max(20).optional(),
	offset: z.coerce.number().int().min(0).max(500).optional(),
	sessionId: z.string().trim().min(1).optional(),
	url: z
		.string()
		.trim()
		.url()
		.refine(
			(value) => value.startsWith("http://") || value.startsWith("https://"),
			"URL focus must use http or https.",
		)
		.optional(),
});

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-scan-review-query",
	);
}

function toSummaryOptions(
	input: z.output<typeof scanReviewQuerySchema>,
): ScanReviewSummaryOptions {
	return {
		...(input.bucket ? { bucket: input.bucket } : {}),
		...(input.includeIgnored !== undefined
			? { includeIgnored: input.includeIgnored }
			: {}),
		...(input.limit !== undefined ? { limit: input.limit } : {}),
		...(input.offset !== undefined ? { offset: input.offset } : {}),
		...(input.sessionId ? { sessionId: input.sessionId } : {}),
		...(input.url ? { url: input.url } : {}),
	};
}

export function createScanReviewRoute(): ApiRouteDefinition {
	return defineApiRoute({
		async handle({ requestInput, services }) {
			const parsedQuery = scanReviewQuerySchema.safeParse({
				bucket: requestInput.searchParams.get("bucket") ?? undefined,
				includeIgnored:
					requestInput.searchParams.get("includeIgnored") ?? undefined,
				limit: requestInput.searchParams.get("limit") ?? undefined,
				offset: requestInput.searchParams.get("offset") ?? undefined,
				sessionId: requestInput.searchParams.get("sessionId") ?? undefined,
				url: requestInput.searchParams.get("url") ?? undefined,
			});

			if (!parsedQuery.success) {
				return createBadRequestResponse(toValidationError(parsedQuery.error));
			}

			try {
				const payload = await createScanReviewSummary(
					services,
					toSummaryOptions(parsedQuery.data),
				);

				return createJsonRouteResponse(
					getStartupHttpStatus(payload.status),
					payload,
				);
			} catch (error) {
				if (error instanceof ScanReviewInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(error.message, error.code),
					);
				}

				throw error;
			}
		},
		methods: ["GET", "HEAD"],
		path: "/scan-review",
	});
}

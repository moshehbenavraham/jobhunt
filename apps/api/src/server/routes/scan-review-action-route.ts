import { z } from "zod";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../../index.js";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createErrorPayload,
	createJsonRouteResponse,
	defineApiRoute,
	readJsonRequestBody,
} from "../route-contract.js";
import type {
	ScanReviewActionPayload,
	ScanReviewActionRequest,
} from "../scan-review-contract.js";
import {
	createScanReviewSummary,
	readScanReviewIgnoredUrls,
	ScanReviewInputError,
	writeScanReviewIgnoredUrls,
} from "../scan-review-summary.js";
import { getStartupStatus } from "../startup-status.js";

const scanReviewActionSchema = z.object({
	action: z.enum(["ignore", "restore"]),
	sessionId: z.string().trim().min(1),
	url: z
		.string()
		.trim()
		.url()
		.refine(
			(value) => value.startsWith("http://") || value.startsWith("https://"),
			"Scan review actions require an http or https URL.",
		),
});

const inFlightScanReviewActionKeys = new Set<string>();

class ScanReviewActionInFlightError extends Error {
	readonly actionKey: string;

	constructor(actionKey: string) {
		super(
			`Scan review action ${actionKey} is already running. Wait for it to finish before retrying.`,
		);
		this.actionKey = actionKey;
		this.name = "ScanReviewActionInFlightError";
	}
}

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-scan-review-action",
	);
}

function buildActionKey(
	input: z.output<typeof scanReviewActionSchema>,
): string {
	return `${input.sessionId}:${input.url}`;
}

function createActionPayload(input: {
	message: string;
	request: ScanReviewActionRequest;
	startupStatus: ReturnType<typeof getStartupStatus>;
	visibility: "hidden" | "visible";
}): ScanReviewActionPayload {
	return {
		actionResult: {
			action: input.request.action,
			message: input.message,
			sessionId: input.request.sessionId,
			url: input.request.url,
			visibility: input.visibility,
		},
		generatedAt: new Date().toISOString(),
		message: input.message,
		ok: true,
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		status: input.startupStatus,
	};
}

export function createScanReviewActionRoute(): ApiRouteDefinition {
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
								"invalid-scan-review-action",
							),
				);
			}

			const parsedBody = scanReviewActionSchema.safeParse(rawBody);

			if (!parsedBody.success) {
				return createBadRequestResponse(toValidationError(parsedBody.error));
			}

			const actionKey = buildActionKey(parsedBody.data);

			if (inFlightScanReviewActionKeys.has(actionKey)) {
				const error = new ScanReviewActionInFlightError(actionKey);

				return createJsonRouteResponse(
					409,
					createErrorPayload(
						"error",
						"scan-review-action-in-flight",
						error.message,
					),
				);
			}

			inFlightScanReviewActionKeys.add(actionKey);

			try {
				const summary = await createScanReviewSummary(services, {
					includeIgnored: true,
					sessionId: parsedBody.data.sessionId,
					url: parsedBody.data.url,
				});

				if (!summary.selectedDetail.row) {
					throw new ScanReviewInputError(
						`Shortlist candidate is not available for scan session ${parsedBody.data.sessionId}.`,
						"invalid-scan-review-action",
					);
				}

				const store = await services.operationalStore.getStore();
				const session = await store.sessions.getById(parsedBody.data.sessionId);

				if (!session || session.workflow !== "scan-portals") {
					throw new ScanReviewInputError(
						`Scan session does not exist: ${parsedBody.data.sessionId}.`,
						"invalid-scan-review-action",
					);
				}

				const nextIgnoredUrls = readScanReviewIgnoredUrls(session.context);
				let message: string;
				let visibility: "hidden" | "visible";

				if (parsedBody.data.action === "ignore") {
					if (nextIgnoredUrls.has(parsedBody.data.url)) {
						message = `Shortlist candidate is already ignored for scan session ${parsedBody.data.sessionId}.`;
					} else {
						nextIgnoredUrls.add(parsedBody.data.url);
						message = `Shortlist candidate ignored for scan session ${parsedBody.data.sessionId}.`;
					}

					visibility = "hidden";
				} else {
					if (nextIgnoredUrls.has(parsedBody.data.url)) {
						nextIgnoredUrls.delete(parsedBody.data.url);
						message = `Shortlist candidate restored for scan session ${parsedBody.data.sessionId}.`;
					} else {
						message = `Shortlist candidate is already visible for scan session ${parsedBody.data.sessionId}.`;
					}

					visibility = "visible";
				}

				const timestamp = new Date().toISOString();

				await store.sessions.save({
					...session,
					context: writeScanReviewIgnoredUrls(session.context, nextIgnoredUrls),
					updatedAt: timestamp,
				});

				const diagnostics = await services.startupDiagnostics.getDiagnostics();

				return createJsonRouteResponse(
					200,
					createActionPayload({
						message,
						request: parsedBody.data,
						startupStatus: getStartupStatus(diagnostics),
						visibility,
					}),
				);
			} catch (error) {
				if (error instanceof ScanReviewInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(
							error.message,
							"invalid-scan-review-action",
						),
					);
				}

				throw error;
			} finally {
				inFlightScanReviewActionKeys.delete(actionKey);
			}
		},
		methods: ["POST"],
		path: "/scan-review/action",
	});
}

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../../index.js";
import type { ToolExecutionEnvelope } from "../../tools/tool-contract.js";
import type { JsonValue } from "../../workspace/workspace-types.js";
import {
	ApiRequestValidationError,
	type ApiRouteDefinition,
	createBadRequestResponse,
	createErrorPayload,
	createJsonRouteResponse,
	defineApiRoute,
	readJsonRequestBody,
} from "../route-contract.js";
import { getStartupHttpStatus, getStartupStatus } from "../startup-status.js";
import { TrackerTableError } from "../tracker-table.js";
import type {
	TrackerWorkspaceAction,
	TrackerWorkspaceActionPayload,
} from "../tracker-workspace-contract.js";
import { TrackerWorkspaceInputError } from "../tracker-workspace-summary.js";

type TrackerWorkspaceActionToolRequest = {
	action: TrackerWorkspaceAction;
	input: JsonValue;
	toolName: string;
};

type TrackerStatusUpdateOutput = {
	entryNumber: number;
	nextStatus: string;
	previousStatus: string;
	repoRelativePath: string;
	status: "unchanged" | "updated";
};

type TrackerMaintenanceOutput = {
	attempts: number;
	dryRun: boolean;
	durationMs: number;
	exitCode: number;
	scriptName: string;
	status: "completed";
};

const trackerWorkspaceActionSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("update-status"),
		entryNumber: z.number().int().positive(),
		status: z.string().trim().min(1),
	}),
	z.object({
		action: z.literal("merge-tracker-additions"),
	}),
	z.object({
		action: z.literal("verify-tracker-pipeline"),
	}),
	z.object({
		action: z.literal("normalize-tracker-statuses"),
		dryRun: z.boolean().default(false),
	}),
	z.object({
		action: z.literal("dedup-tracker-entries"),
		dryRun: z.boolean().default(false),
	}),
]);

const inFlightTrackerActionKeys = new Set<string>();

class TrackerWorkspaceActionInFlightError extends Error {
	readonly actionKey: string;

	constructor(actionKey: string) {
		super(
			`Tracker action ${actionKey} is already running. Wait for it to finish before retrying.`,
		);
		this.actionKey = actionKey;
		this.name = "TrackerWorkspaceActionInFlightError";
	}
}

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-tracker-workspace-action",
	);
}

function buildActionKey(
	input: z.output<typeof trackerWorkspaceActionSchema>,
): string {
	switch (input.action) {
		case "update-status":
			return `${input.action}:${input.entryNumber}`;
		case "normalize-tracker-statuses":
		case "dedup-tracker-entries":
			return `${input.action}:${input.dryRun ? "dry-run" : "apply"}`;
		case "merge-tracker-additions":
		case "verify-tracker-pipeline":
			return input.action;
	}
}

function toToolRequest(
	input: z.output<typeof trackerWorkspaceActionSchema>,
): TrackerWorkspaceActionToolRequest {
	switch (input.action) {
		case "update-status":
			return {
				action: input.action,
				input: {
					entryNumber: input.entryNumber,
					status: input.status,
				},
				toolName: "update-tracker-status",
			};
		case "merge-tracker-additions":
			return {
				action: input.action,
				input: {},
				toolName: "merge-tracker-additions",
			};
		case "verify-tracker-pipeline":
			return {
				action: input.action,
				input: {},
				toolName: "verify-tracker-pipeline",
			};
		case "normalize-tracker-statuses":
			return {
				action: input.action,
				input: {
					dryRun: input.dryRun,
				},
				toolName: "normalize-tracker-statuses",
			};
		case "dedup-tracker-entries":
			return {
				action: input.action,
				input: {
					dryRun: input.dryRun,
				},
				toolName: "dedup-tracker-entries",
			};
	}
}

function createActionMessage(
	action: TrackerWorkspaceAction,
	output: TrackerMaintenanceOutput | TrackerStatusUpdateOutput | null,
	warningCount: number,
): string {
	if (action === "update-status") {
		const statusOutput = output as TrackerStatusUpdateOutput | null;

		if (!statusOutput) {
			return "Tracker status update completed.";
		}

		if (statusOutput.status === "unchanged") {
			return `Tracker row #${statusOutput.entryNumber} already uses status ${statusOutput.nextStatus}.`;
		}

		return `Tracker row #${statusOutput.entryNumber} updated from ${statusOutput.previousStatus} to ${statusOutput.nextStatus}.`;
	}

	const warningSuffix =
		warningCount === 0
			? ""
			: ` Completed with ${warningCount} warning${warningCount === 1 ? "" : "s"}.`;

	switch (action) {
		case "merge-tracker-additions":
			return `Tracker additions merge completed.${warningSuffix}`;
		case "verify-tracker-pipeline":
			return `Tracker verification completed.${warningSuffix}`;
		case "normalize-tracker-statuses":
			return `Tracker status normalization completed.${warningSuffix}`;
		case "dedup-tracker-entries":
			return `Tracker dedup completed.${warningSuffix}`;
	}
}

function createActionPayload(input: {
	action: TrackerWorkspaceAction;
	dryRun: boolean;
	entryNumber: number | null;
	message: string;
	startupStatus: ReturnType<typeof getStartupStatus>;
	warnings: Array<{
		code: string;
		message: string;
	}>;
}): TrackerWorkspaceActionPayload {
	return {
		actionResult: {
			action: input.action,
			dryRun: input.dryRun,
			entryNumber: input.entryNumber,
			message: input.message,
			warnings: input.warnings,
		},
		generatedAt: new Date().toISOString(),
		message: input.message,
		ok: true,
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		status: input.startupStatus,
	};
}

function createToolFailureResponse(
	envelope: Extract<ToolExecutionEnvelope, { status: "failed" }>,
) {
	switch (envelope.error.code) {
		case "tool-invalid-input":
			return createBadRequestResponse(
				new ApiRequestValidationError(
					envelope.error.message,
					envelope.error.code,
				),
			);
		case "tool-duplicate-invocation":
		case "tool-workspace-conflict":
			return createJsonRouteResponse(
				409,
				createErrorPayload(
					"error",
					envelope.error.code,
					envelope.error.message,
				),
			);
		case "tool-script-timeout":
			return createJsonRouteResponse(
				503,
				createErrorPayload(
					"error",
					envelope.error.code,
					envelope.error.message,
				),
			);
		default:
			return createJsonRouteResponse(
				500,
				createErrorPayload(
					"error",
					envelope.error.code,
					envelope.error.message,
				),
			);
	}
}

export function createTrackerWorkspaceActionRoute(): ApiRouteDefinition {
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
								"invalid-tracker-workspace-action",
							),
				);
			}

			const parsedBody = trackerWorkspaceActionSchema.safeParse(rawBody);

			if (!parsedBody.success) {
				return createBadRequestResponse(toValidationError(parsedBody.error));
			}

			const actionKey = buildActionKey(parsedBody.data);

			if (inFlightTrackerActionKeys.has(actionKey)) {
				return createJsonRouteResponse(
					409,
					createErrorPayload(
						"error",
						"tracker-action-in-flight",
						new TrackerWorkspaceActionInFlightError(actionKey).message,
					),
				);
			}

			inFlightTrackerActionKeys.add(actionKey);

			try {
				const diagnostics = await services.startupDiagnostics.getDiagnostics();
				const startupStatus = getStartupStatus(diagnostics);
				const toolRequest = toToolRequest(parsedBody.data);
				const toolService = await services.tools.getService();
				const correlation = {
					approvalId: null,
					jobId: `tracker-route-${actionKey}`,
					requestId: `tracker-request-${randomUUID()}`,
					sessionId: STARTUP_SESSION_ID,
					traceId: `tracker-trace-${randomUUID()}`,
				};
				const envelope = await toolService.execute({
					correlation,
					input: toolRequest.input,
					toolName: toolRequest.toolName,
				});

				if (envelope.status === "failed") {
					return createToolFailureResponse(envelope);
				}

				if (envelope.status === "approval-required") {
					return createJsonRouteResponse(
						500,
						createErrorPayload(
							"error",
							"tracker-action-approval-unexpected",
							`Tracker action ${toolRequest.action} unexpectedly required approval.`,
						),
					);
				}

				const warnings = envelope.warnings.map((warning) => ({
					code: warning.code,
					message: warning.message,
				}));
				const output = envelope.output as
					| TrackerMaintenanceOutput
					| TrackerStatusUpdateOutput
					| null;
				const dryRun =
					"dryRun" in parsedBody.data &&
					typeof parsedBody.data.dryRun === "boolean"
						? parsedBody.data.dryRun
						: false;
				const entryNumber =
					parsedBody.data.action === "update-status"
						? parsedBody.data.entryNumber
						: null;
				const message = createActionMessage(
					toolRequest.action,
					output,
					warnings.length,
				);

				return createJsonRouteResponse(
					getStartupHttpStatus(startupStatus),
					createActionPayload({
						action: toolRequest.action,
						dryRun,
						entryNumber,
						message,
						startupStatus,
						warnings,
					}),
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
			} finally {
				inFlightTrackerActionKeys.delete(actionKey);
			}
		},
		methods: ["POST"],
		path: "/tracker-workspace/action",
	});
}

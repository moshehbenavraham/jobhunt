import { randomUUID } from "node:crypto";
import { z } from "zod";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../../index.js";
import type { ToolExecutionEnvelope } from "../../tools/tool-contract.js";
import type { JsonValue } from "../../workspace/workspace-types.js";
import type {
	BatchSupervisorAction,
	BatchSupervisorActionPayload,
	BatchSupervisorStatusFilter,
} from "../batch-supervisor-contract.js";
import {
	BatchSupervisorInputError,
	createBatchSupervisorSummary,
} from "../batch-supervisor-summary.js";
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

type BatchWorkflowToolOutput = {
	dryRun: boolean;
	jobId: string;
	jobStatus: string;
	mode: "retry-failed" | "run-pending";
	parallel: number;
	requestStatus: "accepted" | "already-queued";
	runId: string;
	startFromId: number;
	workflow: "batch-evaluation";
};

type TrackerMaintenanceOutput = {
	attempts: number;
	dryRun: boolean;
	durationMs: number;
	exitCode: number;
	scriptName: string;
	status: "completed";
};

type BatchSupervisorActionToolRequest = {
	action: BatchSupervisorAction;
	input: JsonValue;
	toolName: string;
};

const BATCH_SUPERVISOR_RUNTIME_SESSION_ID = "batch-supervisor-session";
const DEFAULT_BATCH_POLL_MS = 2_000;

const batchSupervisorActionSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("resume-run-pending"),
		itemId: z.number().int().positive().optional(),
		maxRetries: z.number().int().min(0).max(10).default(2),
		minScore: z.number().min(0).max(5).default(0),
		parallel: z.number().int().min(1).max(4).default(1),
		startFromId: z.number().int().min(0).default(0),
	}),
	z.object({
		action: z.literal("retry-failed"),
		itemId: z.number().int().positive().optional(),
		maxRetries: z.number().int().min(0).max(10).default(2),
		minScore: z.number().min(0).max(5).default(0),
		parallel: z.number().int().min(1).max(4).default(1),
		startFromId: z.number().int().min(0).default(0),
	}),
	z.object({
		action: z.literal("merge-tracker-additions"),
		itemId: z.number().int().positive().optional(),
	}),
	z.object({
		action: z.literal("verify-tracker-pipeline"),
		itemId: z.number().int().positive().optional(),
	}),
]);

const inFlightBatchSupervisorActionKeys = new Set<string>();

class BatchSupervisorActionInFlightError extends Error {
	readonly actionKey: string;

	constructor(actionKey: string) {
		super(
			`Batch supervisor action ${actionKey} is already running. Wait for it to finish before retrying.`,
		);
		this.actionKey = actionKey;
		this.name = "BatchSupervisorActionInFlightError";
	}
}

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-batch-supervisor-action",
	);
}

function buildActionKey(
	input: z.output<typeof batchSupervisorActionSchema>,
): string {
	switch (input.action) {
		case "resume-run-pending":
		case "retry-failed":
			return `${input.action}:${input.startFromId}:${input.parallel}:${input.maxRetries}:${input.minScore}`;
		case "merge-tracker-additions":
		case "verify-tracker-pipeline":
			return input.action;
	}
}

function toToolRequest(
	input: z.output<typeof batchSupervisorActionSchema>,
): BatchSupervisorActionToolRequest {
	switch (input.action) {
		case "resume-run-pending":
			return {
				action: input.action,
				input: {
					maxRetries: input.maxRetries,
					minScore: input.minScore,
					parallel: input.parallel,
					startFromId: input.startFromId,
				},
				toolName: "start-batch-evaluation",
			};
		case "retry-failed":
			return {
				action: input.action,
				input: {
					maxRetries: input.maxRetries,
					minScore: input.minScore,
					parallel: input.parallel,
					startFromId: input.startFromId,
				},
				toolName: "retry-batch-evaluation-failures",
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
	}
}

function createActionMessage(input: {
	action: BatchSupervisorAction;
	output: BatchWorkflowToolOutput | TrackerMaintenanceOutput | null;
	warningCount: number;
}): string {
	if (
		input.action === "resume-run-pending" ||
		input.action === "retry-failed"
	) {
		const output = input.output as BatchWorkflowToolOutput | null;

		if (!output) {
			return input.action === "resume-run-pending"
				? "Batch run request completed."
				: "Batch retry request completed.";
		}

		if (output.requestStatus === "already-queued") {
			return input.action === "resume-run-pending"
				? "A matching run-pending batch job is already queued."
				: "A matching retry-only batch job is already queued.";
		}

		return input.action === "resume-run-pending"
			? "Batch run accepted for pending rows."
			: "Batch retry accepted for retryable failures.";
	}

	const warningSuffix =
		input.warningCount === 0
			? ""
			: ` Completed with ${input.warningCount} warning${input.warningCount === 1 ? "" : "s"}.`;

	return input.action === "merge-tracker-additions"
		? `Tracker additions merge completed.${warningSuffix}`
		: `Tracker verification completed.${warningSuffix}`;
}

function createActionPayload(input: {
	action: BatchSupervisorAction;
	itemId: number | null;
	jobId: string | null;
	message: string;
	nextPollMs: number | null;
	requestStatus: "accepted" | "already-queued" | "completed";
	runId: string | null;
	startupStatus: ReturnType<typeof getStartupStatus>;
	statusFilter: BatchSupervisorStatusFilter | null;
	warnings: Array<{
		code: string;
		message: string;
	}>;
}): BatchSupervisorActionPayload {
	return {
		actionResult: {
			action: input.action,
			itemId: input.itemId,
			jobId: input.jobId,
			message: input.message,
			revalidation: {
				itemId: input.itemId,
				nextPollMs: input.nextPollMs,
				status: input.statusFilter,
			},
			requestStatus: input.requestStatus,
			runId: input.runId,
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

function createConflictResponse(code: string, message: string) {
	return createJsonRouteResponse(
		409,
		createErrorPayload("error", code, message),
	);
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
			return createConflictResponse(
				envelope.error.code,
				envelope.error.message,
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

export function createBatchSupervisorActionRoute(): ApiRouteDefinition {
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
								"invalid-batch-supervisor-action",
							),
				);
			}

			const parsedBody = batchSupervisorActionSchema.safeParse(rawBody);

			if (!parsedBody.success) {
				return createBadRequestResponse(toValidationError(parsedBody.error));
			}

			const actionKey = buildActionKey(parsedBody.data);

			if (inFlightBatchSupervisorActionKeys.has(actionKey)) {
				return createConflictResponse(
					"batch-supervisor-action-in-flight",
					new BatchSupervisorActionInFlightError(actionKey).message,
				);
			}

			inFlightBatchSupervisorActionKeys.add(actionKey);

			try {
				const summary = await createBatchSupervisorSummary(services, {
					...(parsedBody.data.itemId !== undefined
						? { itemId: parsedBody.data.itemId }
						: {}),
				});
				const actionAvailability = summary.actions.find(
					(action) => action.action === parsedBody.data.action,
				);

				if (!actionAvailability?.available) {
					return createConflictResponse(
						"batch-supervisor-action-conflict",
						actionAvailability?.message ??
							`Batch action ${parsedBody.data.action} is not available.`,
					);
				}

				const diagnostics = await services.startupDiagnostics.getDiagnostics();
				const startupStatus = getStartupStatus(diagnostics);
				const toolRequest = toToolRequest(parsedBody.data);
				const toolService = await services.tools.getService();
				const workflowSessionId =
					summary.run.sessionId ?? BATCH_SUPERVISOR_RUNTIME_SESSION_ID;
				const correlation = {
					approvalId: null,
					jobId: `batch-supervisor-route-${actionKey}`,
					requestId: `batch-supervisor-request-${randomUUID()}`,
					sessionId: workflowSessionId,
					traceId: `batch-supervisor-trace-${randomUUID()}`,
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
							"batch-supervisor-action-approval-unexpected",
							`Batch action ${toolRequest.action} unexpectedly required approval.`,
						),
					);
				}

				const warnings = envelope.warnings.map((warning) => ({
					code: warning.code,
					message: warning.message,
				}));
				const output = envelope.output as
					| BatchWorkflowToolOutput
					| TrackerMaintenanceOutput
					| null;
				const message = createActionMessage({
					action: toolRequest.action,
					output,
					warningCount: warnings.length,
				});
				const requestStatus =
					toolRequest.action === "resume-run-pending" ||
					toolRequest.action === "retry-failed"
						? ((output as BatchWorkflowToolOutput | null)?.requestStatus ??
							"accepted")
						: "completed";
				const nextPollMs =
					requestStatus === "completed" ? null : DEFAULT_BATCH_POLL_MS;
				const itemId =
					parsedBody.data.itemId ?? summary.selectedDetail.row?.id ?? null;
				const jobId =
					toolRequest.action === "resume-run-pending" ||
					toolRequest.action === "retry-failed"
						? ((output as BatchWorkflowToolOutput | null)?.jobId ?? null)
						: null;
				const runId =
					toolRequest.action === "resume-run-pending" ||
					toolRequest.action === "retry-failed"
						? ((output as BatchWorkflowToolOutput | null)?.runId ?? null)
						: null;

				return createJsonRouteResponse(
					getStartupHttpStatus(startupStatus),
					createActionPayload({
						action: toolRequest.action,
						itemId,
						jobId,
						message,
						nextPollMs,
						requestStatus,
						runId,
						startupStatus,
						statusFilter: summary.filters.status,
						warnings,
					}),
				);
			} catch (error) {
				if (error instanceof BatchSupervisorInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(
							error.message,
							"invalid-batch-supervisor-action",
						),
					);
				}

				throw error;
			} finally {
				inFlightBatchSupervisorActionKeys.delete(actionKey);
			}
		},
		methods: ["POST"],
		path: "/batch-supervisor/action",
	});
}

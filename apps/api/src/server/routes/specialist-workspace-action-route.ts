import { z } from "zod";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../../index.js";
import {
	OrchestrationError,
	type OrchestrationHandoffEnvelope,
} from "../../orchestration/orchestration-contract.js";
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
import {
	isSpecialistWorkspaceMode,
	type SpecialistWorkspaceActionPayload,
	type SpecialistWorkspaceActionState,
	specialistWorkspaceModeValues,
} from "../specialist-workspace-contract.js";
import {
	createSpecialistWorkspaceSummary,
	SpecialistWorkspaceInputError,
} from "../specialist-workspace-summary.js";
import { getStartupHttpStatus } from "../startup-status.js";

const DEFAULT_SPECIALIST_WORKSPACE_POLL_MS = 2_000;

const inFlightSpecialistWorkspaceActionKeys = new Set<string>();

function isJsonValue(value: unknown): value is JsonValue {
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		return true;
	}

	if (Array.isArray(value)) {
		return value.every((entry) => isJsonValue(entry));
	}

	if (typeof value === "object") {
		return Object.values(value as Record<string, unknown>).every((entry) =>
			isJsonValue(entry),
		);
	}

	return false;
}

const specialistWorkspaceActionSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("launch"),
		context: z
			.custom<JsonValue>((value) => isJsonValue(value))
			.nullable()
			.optional(),
		mode: z.enum(specialistWorkspaceModeValues),
		sessionId: z.string().trim().min(1).optional(),
	}),
	z.object({
		action: z.literal("resume"),
		sessionId: z.string().trim().min(1),
	}),
]);

class SpecialistWorkspaceActionInFlightError extends Error {
	readonly actionKey: string;

	constructor(actionKey: string) {
		super(
			`Specialist workspace action ${actionKey} is already running. Wait for it to finish before retrying.`,
		);
		this.actionKey = actionKey;
		this.name = "SpecialistWorkspaceActionInFlightError";
	}
}

function toValidationError(error: z.ZodError): ApiRequestValidationError {
	return new ApiRequestValidationError(
		error.issues.map((issue) => issue.message).join("; "),
		"invalid-specialist-workspace-action",
	);
}

function buildActionKey(
	input: z.output<typeof specialistWorkspaceActionSchema>,
): string {
	switch (input.action) {
		case "launch":
			return `launch:${input.mode}:${input.sessionId ?? "new"}`;
		case "resume":
			return `resume:${input.sessionId}`;
	}
}

function createActionPayload(input: {
	handoff: SpecialistWorkspaceActionPayload["actionResult"]["handoff"];
	message: string;
	mode: SpecialistWorkspaceActionPayload["actionResult"]["mode"];
	nextPollMs: number | null;
	sessionId: string | null;
	startupStatus: SpecialistWorkspaceActionPayload["status"];
	state: SpecialistWorkspaceActionState;
	warnings: SpecialistWorkspaceActionPayload["actionResult"]["warnings"];
	action: SpecialistWorkspaceActionPayload["actionResult"]["action"];
}): SpecialistWorkspaceActionPayload {
	return {
		actionResult: {
			action: input.action,
			handoff: input.handoff,
			message: input.message,
			mode: input.mode,
			nextPollMs: input.nextPollMs,
			sessionId: input.sessionId,
			state: input.state,
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

function createOrchestrationErrorResponse(
	error: OrchestrationError,
): ReturnType<typeof createJsonRouteResponse> {
	if (error.code === "orchestration-invalid-request") {
		return createBadRequestResponse(
			new ApiRequestValidationError(error.message, error.code),
		);
	}

	return createJsonRouteResponse(
		500,
		createErrorPayload("error", error.code, error.message),
	);
}

function resolveActionState(
	handoff: OrchestrationHandoffEnvelope,
): SpecialistWorkspaceActionState {
	if (handoff.route.status === "tooling-gap") {
		return "blocked";
	}

	if (handoff.runtime.status === "blocked") {
		return "degraded";
	}

	if (handoff.session?.status === "completed") {
		return "completed";
	}

	return "ready";
}

function createActionMessage(input: {
	handoff: SpecialistWorkspaceActionPayload["actionResult"]["handoff"];
	state: SpecialistWorkspaceActionState;
	orchestration: OrchestrationHandoffEnvelope | null;
	sessionId: string | null;
}): string {
	const label = input.handoff?.label ?? "Specialist workflow";

	switch (input.state) {
		case "blocked":
			return (
				input.orchestration?.route.message ??
				`${label} is still blocked on typed specialist tooling.`
			);
		case "completed":
			return input.sessionId
				? `${label} session ${input.sessionId} is already completed.`
				: `${label} is already completed.`;
		case "degraded":
			return input.orchestration?.runtime.status === "blocked"
				? input.orchestration.runtime.message
				: `${label} is available, but runtime bootstrap is currently degraded.`;
		case "missing-session":
			return input.sessionId
				? `Specialist session ${input.sessionId} was not found.`
				: "Specialist session was not found.";
		case "ready":
			return input.sessionId
				? `${label} is ready in session ${input.sessionId}.`
				: `${label} is ready.`;
	}
}

export function createSpecialistWorkspaceActionRoute(): ApiRouteDefinition {
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
								"invalid-specialist-workspace-action",
							),
				);
			}

			const parsedBody = specialistWorkspaceActionSchema.safeParse(rawBody);

			if (!parsedBody.success) {
				return createBadRequestResponse(toValidationError(parsedBody.error));
			}

			const actionKey = buildActionKey(parsedBody.data);

			if (inFlightSpecialistWorkspaceActionKeys.has(actionKey)) {
				return createConflictResponse(
					"specialist-workspace-action-in-flight",
					new SpecialistWorkspaceActionInFlightError(actionKey).message,
				);
			}

			inFlightSpecialistWorkspaceActionKeys.add(actionKey);

			try {
				if (parsedBody.data.action === "resume") {
					const store = await services.operationalStore.getStore();
					const session = await store.sessions.getById(
						parsedBody.data.sessionId,
					);

					if (!session || !isSpecialistWorkspaceMode(session.workflow)) {
						const summary = await createSpecialistWorkspaceSummary(services);

						return createJsonRouteResponse(
							getStartupHttpStatus(summary.status),
							createActionPayload({
								action: "resume",
								handoff: null,
								message: createActionMessage({
									handoff: null,
									orchestration: null,
									sessionId: parsedBody.data.sessionId,
									state: "missing-session",
								}),
								mode: null,
								nextPollMs: null,
								sessionId: parsedBody.data.sessionId,
								startupStatus: summary.status,
								state: "missing-session",
								warnings: [
									{
										code: "stale-selection",
										message: `Specialist session ${parsedBody.data.sessionId} was not found.`,
									},
								],
							}),
						);
					}
				}

				const preflightSummary = await createSpecialistWorkspaceSummary(
					services,
					parsedBody.data.action === "launch"
						? {
								mode: parsedBody.data.mode,
								...(parsedBody.data.sessionId
									? {
											sessionId: parsedBody.data.sessionId,
										}
									: {}),
							}
						: {
								sessionId: parsedBody.data.sessionId,
							},
				);
				const selectedSummary = preflightSummary.selected.summary;

				if (!selectedSummary) {
					return createJsonRouteResponse(
						getStartupHttpStatus(preflightSummary.status),
						createActionPayload({
							action: parsedBody.data.action,
							handoff: null,
							message: preflightSummary.selected.message,
							mode: null,
							nextPollMs: null,
							sessionId:
								parsedBody.data.action === "resume"
									? parsedBody.data.sessionId
									: (parsedBody.data.sessionId ?? null),
							startupStatus: preflightSummary.status,
							state: "missing-session",
							warnings: [
								{
									code: "stale-selection",
									message: preflightSummary.selected.message,
								},
							],
						}),
					);
				}

				const selectedSessionId = selectedSummary.session?.sessionId ?? null;
				const handoff = selectedSummary.handoff;

				if (selectedSummary.supportState === "tooling-gap") {
					return createJsonRouteResponse(
						getStartupHttpStatus(preflightSummary.status),
						createActionPayload({
							action: parsedBody.data.action,
							handoff,
							message: createActionMessage({
								handoff,
								orchestration: null,
								sessionId: selectedSessionId,
								state: "blocked",
							}),
							mode: handoff.mode,
							nextPollMs: null,
							sessionId:
								parsedBody.data.action === "resume"
									? parsedBody.data.sessionId
									: selectedSessionId,
							startupStatus: preflightSummary.status,
							state: "blocked",
							warnings: selectedSummary.warnings,
						}),
					);
				}

				if (
					parsedBody.data.action === "resume" &&
					selectedSummary.session?.status === "completed"
				) {
					return createJsonRouteResponse(
						getStartupHttpStatus(preflightSummary.status),
						createActionPayload({
							action: "resume",
							handoff,
							message: createActionMessage({
								handoff,
								orchestration: null,
								sessionId: parsedBody.data.sessionId,
								state: "completed",
							}),
							mode: handoff.mode,
							nextPollMs: null,
							sessionId: parsedBody.data.sessionId,
							startupStatus: preflightSummary.status,
							state: "completed",
							warnings: selectedSummary.warnings,
						}),
					);
				}

				if (
					parsedBody.data.action === "launch" &&
					parsedBody.data.sessionId &&
					selectedSummary.session?.sessionId === parsedBody.data.sessionId &&
					selectedSummary.session.status === "completed"
				) {
					return createJsonRouteResponse(
						getStartupHttpStatus(preflightSummary.status),
						createActionPayload({
							action: "launch",
							handoff,
							message: createActionMessage({
								handoff,
								orchestration: null,
								sessionId: parsedBody.data.sessionId,
								state: "completed",
							}),
							mode: handoff.mode,
							nextPollMs: null,
							sessionId: parsedBody.data.sessionId,
							startupStatus: preflightSummary.status,
							state: "completed",
							warnings: selectedSummary.warnings,
						}),
					);
				}

				const orchestration = await services.orchestration.getService();
				const orchestrationResult = await orchestration.orchestrate(
					parsedBody.data.action === "launch"
						? {
								context: parsedBody.data.context ?? null,
								kind: "launch",
								sessionId: parsedBody.data.sessionId ?? null,
								workflow: parsedBody.data.mode,
							}
						: {
								kind: "resume",
								sessionId: parsedBody.data.sessionId,
							},
				);
				const state = resolveActionState(orchestrationResult);
				const sessionId =
					orchestrationResult.session?.sessionId ??
					(parsedBody.data.action === "resume"
						? parsedBody.data.sessionId
						: (parsedBody.data.sessionId ?? null));

				return createJsonRouteResponse(
					getStartupHttpStatus(preflightSummary.status),
					createActionPayload({
						action: parsedBody.data.action,
						handoff,
						message: createActionMessage({
							handoff,
							orchestration: orchestrationResult,
							sessionId,
							state,
						}),
						mode: handoff.mode,
						nextPollMs:
							state === "ready" ? DEFAULT_SPECIALIST_WORKSPACE_POLL_MS : null,
						sessionId,
						startupStatus: preflightSummary.status,
						state,
						warnings: selectedSummary.warnings,
					}),
				);
			} catch (error) {
				if (error instanceof SpecialistWorkspaceInputError) {
					return createBadRequestResponse(
						new ApiRequestValidationError(error.message, error.code),
					);
				}

				if (error instanceof OrchestrationError) {
					return createOrchestrationErrorResponse(error);
				}

				throw error;
			} finally {
				inFlightSpecialistWorkspaceActionKeys.delete(actionKey);
			}
		},
		methods: ["POST"],
		path: "/specialist-workspace/action",
	});
}

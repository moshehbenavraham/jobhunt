import { z } from "zod";
import {
	AGENT_RUNTIME_BOOTSTRAP_ERROR_CODES,
	type AgentRuntimeAuthReadiness,
	type AgentRuntimeBootstrapErrorCode,
	type AgentRuntimeConfig,
	type AgentRuntimePromptSummary,
} from "../agent-runtime/index.js";
import {
	type PromptCacheMode,
	type PromptSourceKey,
	WORKFLOW_INTENTS,
	type WorkflowIntent,
} from "../prompt/index.js";
import type { ToolCatalogEntry } from "../tools/index.js";
import type { JsonValue } from "../workspace/index.js";

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

const jsonValueSchema = z.custom<JsonValue>((value) => isJsonValue(value), {
	message: "Expected a JSON-serializable value.",
});

const nonEmptyStringSchema = z.string().trim().min(1);

export const SPECIALIST_IDS = [
	"batch-supervisor",
	"evaluation-specialist",
	"research-specialist",
	"scan-specialist",
	"tracker-specialist",
] as const;

export type SpecialistId = (typeof SPECIALIST_IDS)[number];

export const ORCHESTRATION_REQUEST_KINDS = ["launch", "resume"] as const;

export type OrchestrationRequestKind =
	(typeof ORCHESTRATION_REQUEST_KINDS)[number];

const workflowIntentSchema = z.enum(WORKFLOW_INTENTS);

export const evaluationLaunchInputKindValues = ["job-url", "raw-jd"] as const;

export type EvaluationLaunchInputKind =
	(typeof evaluationLaunchInputKindValues)[number];

export type EvaluationLaunchContextMetadata =
	| {
			canonicalUrl: string;
			host: string;
			kind: "job-url";
			promptRedacted: true;
	  }
	| {
			canonicalUrl: null;
			host: null;
			kind: "raw-jd";
			promptRedacted: true;
	  };

export const orchestrationLaunchRequestSchema = z.object({
	context: jsonValueSchema.nullable().default(null),
	kind: z.literal("launch"),
	sessionId: nonEmptyStringSchema.nullable().default(null),
	workflow: workflowIntentSchema,
});

export type OrchestrationLaunchRequest = z.output<
	typeof orchestrationLaunchRequestSchema
>;

export const orchestrationResumeRequestSchema = z.object({
	kind: z.literal("resume"),
	sessionId: nonEmptyStringSchema,
});

export type OrchestrationResumeRequest = z.output<
	typeof orchestrationResumeRequestSchema
>;

export const orchestrationRequestSchema = z.discriminatedUnion("kind", [
	orchestrationLaunchRequestSchema,
	orchestrationResumeRequestSchema,
]);

export type OrchestrationRequest = z.output<typeof orchestrationRequestSchema>;

export function parseOrchestrationRequest(
	input: unknown,
): OrchestrationRequest {
	return orchestrationRequestSchema.parse(input);
}

export const ORCHESTRATION_ROUTE_STATUSES = [
	"ready",
	"session-not-found",
	"tooling-gap",
	"unsupported-workflow",
] as const;

export type OrchestrationRouteStatus =
	(typeof ORCHESTRATION_ROUTE_STATUSES)[number];

export const SPECIALIST_TOOL_ACCESS = ["allowed", "restricted"] as const;

export type SpecialistToolAccess = (typeof SPECIALIST_TOOL_ACCESS)[number];

export type SpecialistToolCatalogEntry = ToolCatalogEntry & {
	access: SpecialistToolAccess;
};

export type OrchestrationPromptBundleSummary = {
	cacheMode: PromptCacheMode;
	loadedAt: string;
	modeRepoRelativePath: string;
	sourceCount: number;
	sourceOrder: PromptSourceKey[];
};

export type OrchestrationRuntimeReadyState = {
	auth: AgentRuntimeAuthReadiness & {
		state: "ready";
	};
	config: AgentRuntimeConfig;
	model: string;
	prompt: AgentRuntimePromptSummary & {
		modeRepoRelativePath: string;
		requestedWorkflow: string;
		state: "ready";
		workflow: WorkflowIntent;
	};
	promptBundle: OrchestrationPromptBundleSummary;
	startedAt: string;
	status: "ready";
};

export type OrchestrationRuntimeBlockedState = {
	auth: AgentRuntimeAuthReadiness | null;
	code: AgentRuntimeBootstrapErrorCode;
	message: string;
	prompt: AgentRuntimePromptSummary | null;
	status: "blocked";
};

export type OrchestrationRuntimeSkippedState = {
	message: string;
	status: "skipped";
};

export type OrchestrationRuntimeState =
	| OrchestrationRuntimeBlockedState
	| OrchestrationRuntimeReadyState
	| OrchestrationRuntimeSkippedState;

export type OrchestrationToolingGap = {
	message: string;
	missingCapabilities: readonly string[];
};

export type WorkflowRouteDecision = {
	message: string;
	missingCapabilities: readonly string[];
	requestKind: OrchestrationRequestKind;
	sessionId: string | null;
	specialistId: SpecialistId | null;
	status: OrchestrationRouteStatus;
	workflow: WorkflowIntent | null;
};

export type OrchestrationSessionSummary = {
	activeJobId: string | null;
	createdAt: string;
	reused: boolean;
	runnerId: string | null;
	sessionId: string;
	status: string;
	updatedAt: string;
	workflow: WorkflowIntent;
};

export type OrchestrationJobSummary = {
	attempt: number;
	completedAt: string | null;
	currentRunId: string;
	jobId: string;
	jobType: string;
	startedAt: string | null;
	status: string;
	updatedAt: string;
	waitReason: string | null;
};

export type OrchestrationApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	title: string;
	traceId: string | null;
};

export type OrchestrationSpecialistHandoff = {
	description: string;
	id: SpecialistId;
	toolCatalog: readonly SpecialistToolCatalogEntry[];
	workflow: WorkflowIntent;
};

export type OrchestrationHandoffEnvelope = {
	job: OrchestrationJobSummary | null;
	pendingApproval: OrchestrationApprovalSummary | null;
	requestedAt: string;
	route: WorkflowRouteDecision;
	runtime: OrchestrationRuntimeState;
	session: OrchestrationSessionSummary | null;
	specialist: OrchestrationSpecialistHandoff | null;
	toolingGap: OrchestrationToolingGap | null;
};

export const ORCHESTRATION_ERROR_CODES = [
	"orchestration-bootstrap-failed",
	"orchestration-bootstrap-timeout",
	"orchestration-invalid-request",
] as const;

export type OrchestrationErrorCode = (typeof ORCHESTRATION_ERROR_CODES)[number];

export class OrchestrationError extends Error {
	readonly code: OrchestrationErrorCode;
	readonly detail: JsonValue | null;

	constructor(
		code: OrchestrationErrorCode,
		message: string,
		options: {
			cause?: unknown;
			detail?: JsonValue;
		} = {},
	) {
		super(message, options.cause ? { cause: options.cause } : undefined);
		this.code = code;
		this.detail = options.detail ?? null;
		this.name = "OrchestrationError";
	}
}

export function isBootstrapErrorCode(
	candidate: string,
): candidate is AgentRuntimeBootstrapErrorCode {
	return (AGENT_RUNTIME_BOOTSTRAP_ERROR_CODES as readonly string[]).includes(
		candidate,
	);
}

import type { StartupStatus } from "../boot/startup-types";

export const SPECIALIST_WORKSPACE_MODE_QUERY_PARAM = "workflowsMode";
export const SPECIALIST_WORKSPACE_SESSION_QUERY_PARAM = "workflowsSessionId";

export const SPECIALIST_WORKSPACE_MODE_VALUES = [
	"application-help",
	"compare-offers",
	"deep-company-research",
	"follow-up-cadence",
	"interview-prep",
	"linkedin-outreach",
	"project-review",
	"rejection-patterns",
	"training-review",
] as const;

export type SpecialistWorkspaceMode =
	(typeof SPECIALIST_WORKSPACE_MODE_VALUES)[number];

export const SPECIALIST_WORKSPACE_FAMILY_VALUES = [
	"application-history",
	"research-and-narrative",
] as const;

export type SpecialistWorkspaceFamily =
	(typeof SPECIALIST_WORKSPACE_FAMILY_VALUES)[number];

export const SPECIALIST_WORKSPACE_INLINE_REVIEW_FAMILY_VALUES = [
	"research-specialist",
	"tracker-specialist",
] as const;

export type SpecialistWorkspaceInlineReviewFamily =
	(typeof SPECIALIST_WORKSPACE_INLINE_REVIEW_FAMILY_VALUES)[number];

export const SPECIALIST_WORKSPACE_INTAKE_KIND_VALUES = [
	"company-role",
	"offer-set",
	"project-idea",
	"report-context",
	"tracker-history",
	"training-topic",
] as const;

export type SpecialistWorkspaceIntakeKind =
	(typeof SPECIALIST_WORKSPACE_INTAKE_KIND_VALUES)[number];

export const SPECIALIST_WORKSPACE_SELECTION_ORIGIN_VALUES = [
	"catalog",
	"latest-session",
	"mode",
	"none",
	"session-id",
] as const;

export type SpecialistWorkspaceSelectionOrigin =
	(typeof SPECIALIST_WORKSPACE_SELECTION_ORIGIN_VALUES)[number];

export const SPECIALIST_WORKSPACE_SELECTION_STATE_VALUES = [
	"empty",
	"missing",
	"ready",
] as const;

export type SpecialistWorkspaceSelectionState =
	(typeof SPECIALIST_WORKSPACE_SELECTION_STATE_VALUES)[number];

export const SPECIALIST_WORKSPACE_RUN_STATE_VALUES = [
	"completed",
	"degraded",
	"idle",
	"running",
	"waiting",
] as const;

export type SpecialistWorkspaceRunState =
	(typeof SPECIALIST_WORKSPACE_RUN_STATE_VALUES)[number];

export const SPECIALIST_WORKSPACE_RESULT_STATE_VALUES = [
	"active-session",
	"blocked",
	"dedicated-detail",
	"pending-session",
	"summary-pending",
] as const;

export type SpecialistWorkspaceResultState =
	(typeof SPECIALIST_WORKSPACE_RESULT_STATE_VALUES)[number];

export const SPECIALIST_WORKSPACE_WARNING_CODE_VALUES = [
	"approval-paused",
	"dedicated-detail-surface",
	"recent-failure",
	"stale-selection",
	"tooling-gap",
] as const;

export type SpecialistWorkspaceWarningCode =
	(typeof SPECIALIST_WORKSPACE_WARNING_CODE_VALUES)[number];

export const SPECIALIST_WORKSPACE_NEXT_ACTION_VALUES = [
	"launch",
	"open-detail-surface",
	"resolve-approval",
	"resume",
	"wait",
] as const;

export type SpecialistWorkspaceNextAction =
	(typeof SPECIALIST_WORKSPACE_NEXT_ACTION_VALUES)[number];

export const SPECIALIST_WORKSPACE_TOOL_ACCESS_VALUES = [
	"allowed",
	"restricted",
] as const;

export type SpecialistWorkspaceToolAccess =
	(typeof SPECIALIST_WORKSPACE_TOOL_ACCESS_VALUES)[number];

export const SPECIALIST_WORKSPACE_SUPPORT_STATE_VALUES = [
	"ready",
	"tooling-gap",
] as const;

export type SpecialistWorkspaceSupportState =
	(typeof SPECIALIST_WORKSPACE_SUPPORT_STATE_VALUES)[number];

export const SPECIALIST_WORKSPACE_SUMMARY_AVAILABILITY_VALUES = [
	"dedicated-detail",
	"pending",
] as const;

export type SpecialistWorkspaceSummaryAvailability =
	(typeof SPECIALIST_WORKSPACE_SUMMARY_AVAILABILITY_VALUES)[number];

export const SPECIALIST_WORKSPACE_ACTION_STATE_VALUES = [
	"blocked",
	"completed",
	"degraded",
	"missing-session",
	"ready",
] as const;

export type SpecialistWorkspaceActionState =
	(typeof SPECIALIST_WORKSPACE_ACTION_STATE_VALUES)[number];

export const SPECIALIST_WORKSPACE_RUNTIME_SESSION_STATUS_VALUES = [
	"cancelled",
	"completed",
	"failed",
	"pending",
	"running",
	"waiting",
] as const;

export type SpecialistWorkspaceRuntimeSessionStatus =
	(typeof SPECIALIST_WORKSPACE_RUNTIME_SESSION_STATUS_VALUES)[number];

export const SPECIALIST_WORKSPACE_RUNTIME_JOB_STATUS_VALUES = [
	"cancelled",
	"completed",
	"failed",
	"pending",
	"queued",
	"running",
	"waiting",
] as const;

export type SpecialistWorkspaceRuntimeJobStatus =
	(typeof SPECIALIST_WORKSPACE_RUNTIME_JOB_STATUS_VALUES)[number];

export const SPECIALIST_WORKSPACE_RUNTIME_JOB_WAIT_REASON_VALUES = [
	"approval",
	"retry",
] as const;

export type SpecialistWorkspaceRuntimeJobWaitReason =
	(typeof SPECIALIST_WORKSPACE_RUNTIME_JOB_WAIT_REASON_VALUES)[number];

export const SPECIALIST_WORKSPACE_RUNTIME_APPROVAL_STATUS_VALUES = [
	"approved",
	"pending",
	"rejected",
] as const;

export type SpecialistWorkspaceRuntimeApprovalStatus =
	(typeof SPECIALIST_WORKSPACE_RUNTIME_APPROVAL_STATUS_VALUES)[number];

export type SpecialistWorkspaceIntakeHint = {
	kind: SpecialistWorkspaceIntakeKind;
	message: string;
	requiresSavedState: boolean;
};

export type SpecialistWorkspaceDetailSurface = {
	label: string;
	path: string;
};

export type SpecialistWorkspaceToolPreviewItem = {
	access: SpecialistWorkspaceToolAccess;
	name: string;
};

export type SpecialistWorkspaceToolPreview = {
	fallbackApplied: boolean;
	hiddenToolCount: number;
	items: SpecialistWorkspaceToolPreviewItem[];
};

export type SpecialistWorkspaceHandoffMetadata = {
	detailSurface: SpecialistWorkspaceDetailSurface | null;
	family: SpecialistWorkspaceFamily;
	label: string;
	mode: SpecialistWorkspaceMode;
	modeDescription: string;
	modeRepoRelativePath: string;
	specialistId: string;
	specialistLabel: string;
	toolPreview: SpecialistWorkspaceToolPreview;
	workspacePath: string;
};

export type SpecialistWorkspaceWorkflowDescriptor = {
	handoff: SpecialistWorkspaceHandoffMetadata;
	intake: SpecialistWorkspaceIntakeHint;
	message: string;
	missingCapabilities: string[];
	selected: boolean;
	summaryAvailability: SpecialistWorkspaceSummaryAvailability;
	supportState: SpecialistWorkspaceSupportState;
};

export type SpecialistWorkspaceWarningItem = {
	code: SpecialistWorkspaceWarningCode;
	message: string;
};

export type SpecialistWorkspaceSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	resumeAllowed: boolean;
	sessionId: string;
	status: SpecialistWorkspaceRuntimeSessionStatus;
	updatedAt: string;
	workflow: SpecialistWorkspaceMode;
};

export type SpecialistWorkspaceJobSummary = {
	attempt: number;
	completedAt: string | null;
	currentRunId: string;
	jobId: string;
	jobType: string;
	startedAt: string | null;
	status: SpecialistWorkspaceRuntimeJobStatus;
	updatedAt: string;
	waitReason: SpecialistWorkspaceRuntimeJobWaitReason | null;
};

export type SpecialistWorkspaceApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: SpecialistWorkspaceRuntimeApprovalStatus;
	title: string;
	traceId: string | null;
};

export type SpecialistWorkspaceFailureSummary = {
	failedAt: string;
	jobId: string | null;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type SpecialistWorkspaceRunSummary = {
	message: string;
	resumeAllowed: boolean;
	state: SpecialistWorkspaceRunState;
};

export type SpecialistWorkspaceResultSummary = {
	detailSurface: SpecialistWorkspaceDetailSurface | null;
	message: string;
	state: SpecialistWorkspaceResultState;
};

export type SpecialistWorkspaceNextActionSummary = {
	action: SpecialistWorkspaceNextAction;
	message: string;
	mode: SpecialistWorkspaceMode;
	sessionId: string | null;
};

export type SpecialistWorkspaceSelectedSummary = {
	approval: SpecialistWorkspaceApprovalSummary | null;
	failure: SpecialistWorkspaceFailureSummary | null;
	handoff: SpecialistWorkspaceHandoffMetadata;
	job: SpecialistWorkspaceJobSummary | null;
	message: string;
	nextAction: SpecialistWorkspaceNextActionSummary;
	result: SpecialistWorkspaceResultSummary;
	run: SpecialistWorkspaceRunSummary;
	session: SpecialistWorkspaceSessionSummary | null;
	supportState: SpecialistWorkspaceSupportState;
	summaryAvailability: SpecialistWorkspaceSummaryAvailability;
	warnings: SpecialistWorkspaceWarningItem[];
};

export type SpecialistWorkspaceSelectedDetail = {
	message: string;
	origin: SpecialistWorkspaceSelectionOrigin;
	requestedMode: SpecialistWorkspaceMode | null;
	requestedSessionId: string | null;
	state: SpecialistWorkspaceSelectionState;
	summary: SpecialistWorkspaceSelectedSummary | null;
};

export type SpecialistWorkspaceSummaryPayload = {
	filters: {
		mode: SpecialistWorkspaceMode | null;
		sessionId: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	selected: SpecialistWorkspaceSelectedDetail;
	service: string;
	sessionId: string;
	status: StartupStatus;
	workflows: SpecialistWorkspaceWorkflowDescriptor[];
};

export function resolveSpecialistWorkspaceInlineReviewFamily(
	mode: SpecialistWorkspaceMode | null,
): SpecialistWorkspaceInlineReviewFamily | null {
	switch (mode) {
		case "application-help":
			return null;
		case "compare-offers":
		case "follow-up-cadence":
		case "rejection-patterns":
			return "tracker-specialist";
		case "deep-company-research":
		case "interview-prep":
		case "linkedin-outreach":
		case "project-review":
		case "training-review":
			return "research-specialist";
		case null:
			return null;
	}
}

export function isSpecialistWorkspaceInlineReviewMode(
	mode: SpecialistWorkspaceMode | null,
): boolean {
	return resolveSpecialistWorkspaceInlineReviewFamily(mode) !== null;
}

export function resolveSpecialistWorkspaceDetailRoute(
	mode: SpecialistWorkspaceMode | null,
): string | null {
	switch (mode) {
		case "application-help":
			return "/application-help";
		case "compare-offers":
		case "follow-up-cadence":
		case "rejection-patterns":
			return "/tracker-specialist";
		case "deep-company-research":
		case "interview-prep":
		case "linkedin-outreach":
		case "project-review":
		case "training-review":
			return "/research-specialist";
		case null:
			return null;
	}
}

export type SpecialistWorkspaceActionRequest =
	| {
			action: "launch";
			context?: unknown | null;
			mode: SpecialistWorkspaceMode;
			sessionId?: string;
	  }
	| {
			action: "resume";
			sessionId: string;
	  };

export type SpecialistWorkspaceActionPayload = {
	actionResult: {
		action: SpecialistWorkspaceActionRequest["action"];
		handoff: SpecialistWorkspaceHandoffMetadata | null;
		message: string;
		mode: SpecialistWorkspaceMode | null;
		nextPollMs: number | null;
		sessionId: string | null;
		state: SpecialistWorkspaceActionState;
		warnings: SpecialistWorkspaceWarningItem[];
	};
	generatedAt: string;
	message: string;
	ok: true;
	service: string;
	sessionId: string;
	status: StartupStatus;
};

export type SpecialistWorkspaceApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";

export type SpecialistWorkspaceErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: SpecialistWorkspaceApiErrorStatus;
};

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value as JsonRecord;
}

function readArray<TValue>(
	record: JsonRecord,
	key: string,
	parser: (value: unknown) => TValue,
): TValue[] {
	const value = record[key];

	if (!Array.isArray(value)) {
		throw new Error(`Expected ${key} to be an array.`);
	}

	return value.map((entry) => parser(entry));
}

function readBoolean(record: JsonRecord, key: string): boolean {
	const value = record[key];

	if (typeof value !== "boolean") {
		throw new Error(`Expected ${key} to be a boolean.`);
	}

	return value;
}

function readExactBoolean<TExpected extends boolean>(
	record: JsonRecord,
	key: string,
	expected: TExpected,
): TExpected {
	const value = readBoolean(record, key);

	if (value !== expected) {
		throw new Error(`Expected ${key} to be ${String(expected)}.`);
	}

	return expected;
}

function readNumber(record: JsonRecord, key: string): number {
	const value = record[key];

	if (typeof value !== "number" || Number.isNaN(value)) {
		throw new Error(`Expected ${key} to be a number.`);
	}

	return value;
}

function readString(record: JsonRecord, key: string): string {
	const value = record[key];

	if (typeof value !== "string") {
		throw new Error(`Expected ${key} to be a string.`);
	}

	return value;
}

function readNullableString(record: JsonRecord, key: string): string | null {
	const value = record[key];

	if (value === null) {
		return null;
	}

	if (typeof value !== "string") {
		throw new Error(`Expected ${key} to be a string or null.`);
	}

	return value;
}

function readNullableNumber(record: JsonRecord, key: string): number | null {
	const value = record[key];

	if (value === null) {
		return null;
	}

	if (typeof value !== "number" || Number.isNaN(value)) {
		throw new Error(`Expected ${key} to be a number or null.`);
	}

	return value;
}

function readNullableObject<TValue>(
	record: JsonRecord,
	key: string,
	parser: (value: unknown) => TValue,
): TValue | null {
	const value = record[key];
	return value === null ? null : parser(value);
}

function readStringArray(record: JsonRecord, key: string): string[] {
	const value = record[key];

	if (
		!Array.isArray(value) ||
		value.some((entry) => typeof entry !== "string")
	) {
		throw new Error(`Expected ${key} to be a string array.`);
	}

	return [...value];
}

function readEnum<TValue extends string>(
	record: JsonRecord,
	key: string,
	values: readonly TValue[],
	label: string,
): TValue {
	const value = readString(record, key);

	if (!(values as readonly string[]).includes(value)) {
		throw new Error(`Unsupported ${label}: ${value}`);
	}

	return value as TValue;
}

function readStartupStatus(record: JsonRecord, key: string): StartupStatus {
	return readEnum(
		record,
		key,
		[
			"auth-required",
			"expired-auth",
			"invalid-auth",
			"missing-prerequisites",
			"prompt-failure",
			"ready",
			"runtime-error",
		] as const,
		"specialist-workspace startup status",
	);
}

function parseIntakeHint(value: unknown): SpecialistWorkspaceIntakeHint {
	const record = assertRecord(value, "specialist-workspace intake hint");

	return {
		kind: readEnum(
			record,
			"kind",
			SPECIALIST_WORKSPACE_INTAKE_KIND_VALUES,
			"specialist-workspace intake kind",
		),
		message: readString(record, "message"),
		requiresSavedState: readBoolean(record, "requiresSavedState"),
	};
}

function parseDetailSurface(value: unknown): SpecialistWorkspaceDetailSurface {
	const record = assertRecord(value, "specialist-workspace detail surface");

	return {
		label: readString(record, "label"),
		path: readString(record, "path"),
	};
}

function parseToolPreviewItem(
	value: unknown,
): SpecialistWorkspaceToolPreviewItem {
	const record = assertRecord(value, "specialist-workspace tool preview item");

	return {
		access: readEnum(
			record,
			"access",
			SPECIALIST_WORKSPACE_TOOL_ACCESS_VALUES,
			"specialist-workspace tool access",
		),
		name: readString(record, "name"),
	};
}

function parseToolPreview(value: unknown): SpecialistWorkspaceToolPreview {
	const record = assertRecord(value, "specialist-workspace tool preview");

	return {
		fallbackApplied: readBoolean(record, "fallbackApplied"),
		hiddenToolCount: readNumber(record, "hiddenToolCount"),
		items: readArray(record, "items", parseToolPreviewItem),
	};
}

function parseHandoffMetadata(
	value: unknown,
): SpecialistWorkspaceHandoffMetadata {
	const record = assertRecord(value, "specialist-workspace handoff metadata");

	return {
		detailSurface: readNullableObject(
			record,
			"detailSurface",
			parseDetailSurface,
		),
		family: readEnum(
			record,
			"family",
			SPECIALIST_WORKSPACE_FAMILY_VALUES,
			"specialist-workspace family",
		),
		label: readString(record, "label"),
		mode: readEnum(
			record,
			"mode",
			SPECIALIST_WORKSPACE_MODE_VALUES,
			"specialist-workspace mode",
		),
		modeDescription: readString(record, "modeDescription"),
		modeRepoRelativePath: readString(record, "modeRepoRelativePath"),
		specialistId: readString(record, "specialistId"),
		specialistLabel: readString(record, "specialistLabel"),
		toolPreview: parseToolPreview(record.toolPreview),
		workspacePath: readString(record, "workspacePath"),
	};
}

function parseWorkflowDescriptor(
	value: unknown,
): SpecialistWorkspaceWorkflowDescriptor {
	const record = assertRecord(value, "specialist-workspace workflow");

	return {
		handoff: parseHandoffMetadata(record.handoff),
		intake: parseIntakeHint(record.intake),
		message: readString(record, "message"),
		missingCapabilities: readStringArray(record, "missingCapabilities"),
		selected: readBoolean(record, "selected"),
		summaryAvailability: readEnum(
			record,
			"summaryAvailability",
			SPECIALIST_WORKSPACE_SUMMARY_AVAILABILITY_VALUES,
			"specialist-workspace summary availability",
		),
		supportState: readEnum(
			record,
			"supportState",
			SPECIALIST_WORKSPACE_SUPPORT_STATE_VALUES,
			"specialist-workspace support state",
		),
	};
}

function parseWarningItem(value: unknown): SpecialistWorkspaceWarningItem {
	const record = assertRecord(value, "specialist-workspace warning");

	return {
		code: readEnum(
			record,
			"code",
			SPECIALIST_WORKSPACE_WARNING_CODE_VALUES,
			"specialist-workspace warning code",
		),
		message: readString(record, "message"),
	};
}

function parseSessionSummary(
	value: unknown,
): SpecialistWorkspaceSessionSummary {
	const record = assertRecord(value, "specialist-workspace session summary");

	return {
		activeJobId: readNullableString(record, "activeJobId"),
		lastHeartbeatAt: readNullableString(record, "lastHeartbeatAt"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		sessionId: readString(record, "sessionId"),
		status: readEnum(
			record,
			"status",
			SPECIALIST_WORKSPACE_RUNTIME_SESSION_STATUS_VALUES,
			"specialist-workspace session status",
		),
		updatedAt: readString(record, "updatedAt"),
		workflow: readEnum(
			record,
			"workflow",
			SPECIALIST_WORKSPACE_MODE_VALUES,
			"specialist-workspace session workflow",
		),
	};
}

function parseJobSummary(value: unknown): SpecialistWorkspaceJobSummary {
	const record = assertRecord(value, "specialist-workspace job summary");

	return {
		attempt: readNumber(record, "attempt"),
		completedAt: readNullableString(record, "completedAt"),
		currentRunId: readString(record, "currentRunId"),
		jobId: readString(record, "jobId"),
		jobType: readString(record, "jobType"),
		startedAt: readNullableString(record, "startedAt"),
		status: readEnum(
			record,
			"status",
			SPECIALIST_WORKSPACE_RUNTIME_JOB_STATUS_VALUES,
			"specialist-workspace job status",
		),
		updatedAt: readString(record, "updatedAt"),
		waitReason: readNullableObject(record, "waitReason", (entry) =>
			readEnum(
				{ waitReason: entry },
				"waitReason",
				SPECIALIST_WORKSPACE_RUNTIME_JOB_WAIT_REASON_VALUES,
				"specialist-workspace job wait reason",
			),
		),
	};
}

function parseApprovalSummary(
	value: unknown,
): SpecialistWorkspaceApprovalSummary {
	const record = assertRecord(value, "specialist-workspace approval summary");

	return {
		action: readString(record, "action"),
		approvalId: readString(record, "approvalId"),
		jobId: readNullableString(record, "jobId"),
		requestedAt: readString(record, "requestedAt"),
		resolvedAt: readNullableString(record, "resolvedAt"),
		status: readEnum(
			record,
			"status",
			SPECIALIST_WORKSPACE_RUNTIME_APPROVAL_STATUS_VALUES,
			"specialist-workspace approval status",
		),
		title: readString(record, "title"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseFailureSummary(
	value: unknown,
): SpecialistWorkspaceFailureSummary {
	const record = assertRecord(value, "specialist-workspace failure summary");

	return {
		failedAt: readString(record, "failedAt"),
		jobId: readNullableString(record, "jobId"),
		message: readString(record, "message"),
		runId: readString(record, "runId"),
		sessionId: readString(record, "sessionId"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseRunSummary(value: unknown): SpecialistWorkspaceRunSummary {
	const record = assertRecord(value, "specialist-workspace run summary");

	return {
		message: readString(record, "message"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		state: readEnum(
			record,
			"state",
			SPECIALIST_WORKSPACE_RUN_STATE_VALUES,
			"specialist-workspace run state",
		),
	};
}

function parseResultSummary(value: unknown): SpecialistWorkspaceResultSummary {
	const record = assertRecord(value, "specialist-workspace result summary");

	return {
		detailSurface: readNullableObject(
			record,
			"detailSurface",
			parseDetailSurface,
		),
		message: readString(record, "message"),
		state: readEnum(
			record,
			"state",
			SPECIALIST_WORKSPACE_RESULT_STATE_VALUES,
			"specialist-workspace result state",
		),
	};
}

function parseNextActionSummary(
	value: unknown,
): SpecialistWorkspaceNextActionSummary {
	const record = assertRecord(value, "specialist-workspace next action");

	return {
		action: readEnum(
			record,
			"action",
			SPECIALIST_WORKSPACE_NEXT_ACTION_VALUES,
			"specialist-workspace next action",
		),
		message: readString(record, "message"),
		mode: readEnum(
			record,
			"mode",
			SPECIALIST_WORKSPACE_MODE_VALUES,
			"specialist-workspace next action mode",
		),
		sessionId: readNullableString(record, "sessionId"),
	};
}

function parseSelectedSummary(
	value: unknown,
): SpecialistWorkspaceSelectedSummary {
	const record = assertRecord(value, "specialist-workspace selected summary");

	return {
		approval: readNullableObject(record, "approval", parseApprovalSummary),
		failure: readNullableObject(record, "failure", parseFailureSummary),
		handoff: parseHandoffMetadata(record.handoff),
		job: readNullableObject(record, "job", parseJobSummary),
		message: readString(record, "message"),
		nextAction: parseNextActionSummary(record.nextAction),
		result: parseResultSummary(record.result),
		run: parseRunSummary(record.run),
		session: readNullableObject(record, "session", parseSessionSummary),
		supportState: readEnum(
			record,
			"supportState",
			SPECIALIST_WORKSPACE_SUPPORT_STATE_VALUES,
			"specialist-workspace selected support state",
		),
		summaryAvailability: readEnum(
			record,
			"summaryAvailability",
			SPECIALIST_WORKSPACE_SUMMARY_AVAILABILITY_VALUES,
			"specialist-workspace selected summary availability",
		),
		warnings: readArray(record, "warnings", parseWarningItem),
	};
}

function parseSelectedDetail(
	value: unknown,
): SpecialistWorkspaceSelectedDetail {
	const record = assertRecord(value, "specialist-workspace selected detail");

	return {
		message: readString(record, "message"),
		origin: readEnum(
			record,
			"origin",
			SPECIALIST_WORKSPACE_SELECTION_ORIGIN_VALUES,
			"specialist-workspace selection origin",
		),
		requestedMode: readNullableObject(record, "requestedMode", (entry) =>
			readEnum(
				{ requestedMode: entry },
				"requestedMode",
				SPECIALIST_WORKSPACE_MODE_VALUES,
				"specialist-workspace requested mode",
			),
		),
		requestedSessionId: readNullableString(record, "requestedSessionId"),
		state: readEnum(
			record,
			"state",
			SPECIALIST_WORKSPACE_SELECTION_STATE_VALUES,
			"specialist-workspace selection state",
		),
		summary: readNullableObject(record, "summary", parseSelectedSummary),
	};
}

export function normalizeSpecialistWorkspaceMode(
	value: string | null | undefined,
): SpecialistWorkspaceMode | null {
	const trimmed = value?.trim() ?? "";

	if (
		trimmed.length === 0 ||
		!(SPECIALIST_WORKSPACE_MODE_VALUES as readonly string[]).includes(trimmed)
	) {
		return null;
	}

	return trimmed as SpecialistWorkspaceMode;
}

export function normalizeSpecialistWorkspaceSessionId(
	value: string | null | undefined,
): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

export function parseSpecialistWorkspaceSummaryPayload(
	value: unknown,
): SpecialistWorkspaceSummaryPayload {
	const record = assertRecord(value, "specialist-workspace summary payload");
	const filters = assertRecord(record.filters, "specialist-workspace filters");

	return {
		filters: {
			mode: readNullableObject(filters, "mode", (entry) =>
				readEnum(
					{ mode: entry },
					"mode",
					SPECIALIST_WORKSPACE_MODE_VALUES,
					"specialist-workspace filter mode",
				),
			),
			sessionId: readNullableString(filters, "sessionId"),
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		selected: parseSelectedDetail(record.selected),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
		workflows: readArray(record, "workflows", parseWorkflowDescriptor),
	};
}

export function parseSpecialistWorkspaceActionPayload(
	value: unknown,
): SpecialistWorkspaceActionPayload {
	const record = assertRecord(value, "specialist-workspace action payload");
	const actionResult = assertRecord(
		record.actionResult,
		"specialist-workspace action result",
	);

	return {
		actionResult: {
			action: readEnum(
				actionResult,
				"action",
				["launch", "resume"] as const,
				"specialist-workspace action request kind",
			),
			handoff: readNullableObject(
				actionResult,
				"handoff",
				parseHandoffMetadata,
			),
			message: readString(actionResult, "message"),
			mode: readNullableObject(actionResult, "mode", (entry) =>
				readEnum(
					{ mode: entry },
					"mode",
					SPECIALIST_WORKSPACE_MODE_VALUES,
					"specialist-workspace action mode",
				),
			),
			nextPollMs: readNullableNumber(actionResult, "nextPollMs"),
			sessionId: readNullableString(actionResult, "sessionId"),
			state: readEnum(
				actionResult,
				"state",
				SPECIALIST_WORKSPACE_ACTION_STATE_VALUES,
				"specialist-workspace action state",
			),
			warnings: readArray(actionResult, "warnings", parseWarningItem),
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
	};
}

export function parseSpecialistWorkspaceErrorPayload(
	value: unknown,
): SpecialistWorkspaceErrorPayload {
	const record = assertRecord(value, "specialist-workspace error payload");
	const error = assertRecord(record.error, "specialist-workspace error");

	return {
		error: {
			code: readString(error, "code"),
			message: readString(error, "message"),
		},
		ok: readExactBoolean(record, "ok", false),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readEnum(
			record,
			"status",
			[
				"bad-request",
				"error",
				"method-not-allowed",
				"not-found",
				"rate-limited",
			] as const,
			"specialist-workspace error status",
		),
	};
}

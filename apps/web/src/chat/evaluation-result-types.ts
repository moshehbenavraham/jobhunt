import type { StartupStatus } from "../boot/startup-types";

export const EVALUATION_RESULT_WORKFLOWS = [
	"auto-pipeline",
	"single-evaluation",
] as const;

export type EvaluationResultWorkflow =
	(typeof EVALUATION_RESULT_WORKFLOWS)[number];

export const EVALUATION_RESULT_STATES = [
	"approval-paused",
	"completed",
	"degraded",
	"empty",
	"failed",
	"missing-session",
	"pending",
	"running",
	"unsupported-workflow",
] as const;

export type EvaluationResultState = (typeof EVALUATION_RESULT_STATES)[number];

export const EVALUATION_RESULT_ARTIFACT_KINDS = [
	"pdf",
	"report",
	"tracker",
] as const;

export type EvaluationResultArtifactKind =
	(typeof EVALUATION_RESULT_ARTIFACT_KINDS)[number];

export const EVALUATION_RESULT_ARTIFACT_STATES = [
	"missing",
	"pending",
	"ready",
] as const;

export type EvaluationResultArtifactState =
	(typeof EVALUATION_RESULT_ARTIFACT_STATES)[number];

export const EVALUATION_RESULT_CLOSEOUT_STATES = [
	"attention-required",
	"in-progress",
	"not-ready",
	"review-ready",
] as const;

export type EvaluationResultCloseoutState =
	(typeof EVALUATION_RESULT_CLOSEOUT_STATES)[number];

export const EVALUATION_RESULT_HANDOFF_STATES = [
	"none",
	"resume-ready",
	"waiting-for-approval",
] as const;

export type EvaluationResultHandoffState =
	(typeof EVALUATION_RESULT_HANDOFF_STATES)[number];

export const EVALUATION_RESULT_LEGITIMACY_VALUES = [
	"High Confidence",
	"Proceed with Caution",
	"Suspicious",
] as const;

export type EvaluationResultLegitimacy =
	(typeof EVALUATION_RESULT_LEGITIMACY_VALUES)[number];

export const EVALUATION_RESULT_INPUT_KINDS = [
	"job-url",
	"raw-jd",
	"unknown",
] as const;

export type EvaluationResultInputKind =
	(typeof EVALUATION_RESULT_INPUT_KINDS)[number];

export const EVALUATION_RESULT_VERIFICATION_STATUSES = [
	"needs-review",
	"not-applicable",
	"pending",
	"unconfirmed",
	"verified",
] as const;

export type EvaluationResultVerificationStatus =
	(typeof EVALUATION_RESULT_VERIFICATION_STATUSES)[number];

export const EVALUATION_RESULT_VERIFICATION_SOURCES = [
	"liveness",
	"none",
	"report-header",
] as const;

export type EvaluationResultVerificationSource =
	(typeof EVALUATION_RESULT_VERIFICATION_SOURCES)[number];

export const EVALUATION_RESULT_VERIFICATION_RESULTS = [
	"active",
	"error",
	"expired",
	"none",
	"offline",
	"uncertain",
] as const;

export type EvaluationResultVerificationResult =
	(typeof EVALUATION_RESULT_VERIFICATION_RESULTS)[number];

export const EVALUATION_RESULT_REVIEW_FOCUS_AVAILABILITY = [
	"ready",
	"unavailable",
] as const;

export type EvaluationResultReviewFocusAvailability =
	(typeof EVALUATION_RESULT_REVIEW_FOCUS_AVAILABILITY)[number];

export const EVALUATION_RESULT_REVIEW_TARGETS = [
	"none",
	"pipeline-review",
	"report-viewer",
	"tracker-workspace",
] as const;

export type EvaluationResultReviewTarget =
	(typeof EVALUATION_RESULT_REVIEW_TARGETS)[number];

export const EVALUATION_RESULT_PIPELINE_SECTIONS = [
	"all",
	"processed",
] as const;

export type EvaluationResultPipelineSection =
	(typeof EVALUATION_RESULT_PIPELINE_SECTIONS)[number];

export const EVALUATION_RESULT_SESSION_STATUSES = [
	"cancelled",
	"completed",
	"failed",
	"pending",
	"running",
	"waiting",
] as const;

export type EvaluationResultSessionStatus =
	(typeof EVALUATION_RESULT_SESSION_STATUSES)[number];

export const EVALUATION_RESULT_JOB_STATUSES = [
	"cancelled",
	"completed",
	"failed",
	"pending",
	"queued",
	"running",
	"waiting",
] as const;

export type EvaluationResultJobStatus =
	(typeof EVALUATION_RESULT_JOB_STATUSES)[number];

export const EVALUATION_RESULT_JOB_WAIT_REASONS = [
	"approval",
	"retry",
] as const;

export type EvaluationResultJobWaitReason =
	(typeof EVALUATION_RESULT_JOB_WAIT_REASONS)[number];

export const EVALUATION_RESULT_APPROVAL_STATUSES = [
	"approved",
	"pending",
	"rejected",
] as const;

export type EvaluationResultApprovalStatus =
	(typeof EVALUATION_RESULT_APPROVAL_STATUSES)[number];

export const EVALUATION_ARTIFACT_HANDOFF_KINDS = [
	"approval-review",
	"pdf-review",
	"pipeline-review",
	"report-viewer",
	"tracker-review",
] as const;

export type EvaluationArtifactHandoffKind =
	(typeof EVALUATION_ARTIFACT_HANDOFF_KINDS)[number];

export const EVALUATION_ARTIFACT_HANDOFF_AVAILABILITY = [
	"deferred",
	"ready",
	"unavailable",
] as const;

export type EvaluationArtifactHandoffAvailability =
	(typeof EVALUATION_ARTIFACT_HANDOFF_AVAILABILITY)[number];

export type EvaluationArtifactHandoffIntent = {
	approvalId: string | null;
	availability: EvaluationArtifactHandoffAvailability;
	description: string;
	kind: EvaluationArtifactHandoffKind;
	label: string;
	reportNumber: string | null;
	repoRelativePath: string | null;
	section: EvaluationResultPipelineSection | null;
	sessionId: string | null;
	url: string | null;
};

export type EvaluationResultArtifactSummary = {
	exists: boolean;
	kind: EvaluationResultArtifactKind;
	message: string;
	repoRelativePath: string | null;
	state: EvaluationResultArtifactState;
};

export type EvaluationResultApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: EvaluationResultApprovalStatus;
	title: string;
	traceId: string | null;
};

export type EvaluationResultCheckpointPreview = {
	completedStepCount: number;
	completedSteps: string[];
	cursor: string | null;
	hasMore: boolean;
	updatedAt: string | null;
};

export type EvaluationResultCloseoutSummary = {
	message: string;
	readyForReview: boolean;
	state: EvaluationResultCloseoutState;
};

export type EvaluationResultFailureSummary = {
	failedAt: string;
	jobId: string;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type EvaluationResultInputProvenance = {
	canonicalUrl: string | null;
	host: string | null;
	kind: EvaluationResultInputKind;
	message: string;
};

export type EvaluationResultHandoffSummary = {
	approval: EvaluationResultApprovalSummary | null;
	approvalStatus: EvaluationResultApprovalStatus | "none";
	message: string;
	resumeAllowed: boolean;
	state: EvaluationResultHandoffState;
};

export type EvaluationResultVerificationSummary = {
	message: string;
	result: EvaluationResultVerificationResult;
	source: EvaluationResultVerificationSource;
	status: EvaluationResultVerificationStatus;
	url: string | null;
};

export type EvaluationResultReportViewerFocus = {
	availability: EvaluationResultReviewFocusAvailability;
	message: string;
	reportNumber: string | null;
	reportPath: string | null;
};

export type EvaluationResultPipelineReviewFocus = {
	availability: EvaluationResultReviewFocusAvailability;
	message: string;
	reportNumber: string | null;
	section: EvaluationResultPipelineSection;
	url: string | null;
};

export type EvaluationResultTrackerWorkspaceFocus = {
	availability: EvaluationResultReviewFocusAvailability;
	message: string;
	reportNumber: string | null;
};

export type EvaluationResultReviewFocus = {
	pipelineReview: EvaluationResultPipelineReviewFocus;
	primaryTarget: EvaluationResultReviewTarget;
	reportViewer: EvaluationResultReportViewerFocus;
	trackerWorkspace: EvaluationResultTrackerWorkspaceFocus;
};

export type EvaluationResultJobSummary = {
	attempt: number;
	completedAt: string | null;
	currentRunId: string;
	jobId: string;
	jobType: string;
	startedAt: string | null;
	status: EvaluationResultJobStatus;
	updatedAt: string;
	waitReason: EvaluationResultJobWaitReason | null;
};

export type EvaluationResultSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	sessionId: string;
	status: EvaluationResultSessionStatus;
	updatedAt: string;
	workflow: string;
};

export type EvaluationResultSessionPreview = {
	sessionId: string;
	state: EvaluationResultState;
	status: EvaluationResultSessionStatus;
	updatedAt: string;
	workflow: EvaluationResultWorkflow;
};

export type EvaluationResultWarningItem = {
	code: string | null;
	message: string;
};

export type EvaluationResultWarningPreview = {
	hasMore: boolean;
	items: EvaluationResultWarningItem[];
	totalCount: number;
};

export type EvaluationResultSummary = {
	artifacts: {
		pdf: EvaluationResultArtifactSummary;
		report: EvaluationResultArtifactSummary;
		tracker: EvaluationResultArtifactSummary;
	};
	checkpoint: EvaluationResultCheckpointPreview;
	closeout: EvaluationResultCloseoutSummary;
	failure: EvaluationResultFailureSummary | null;
	handoff: EvaluationResultHandoffSummary;
	inputProvenance: EvaluationResultInputProvenance;
	job: EvaluationResultJobSummary | null;
	legitimacy: EvaluationResultLegitimacy | null;
	message: string;
	reportNumber: string | null;
	reviewFocus: EvaluationResultReviewFocus;
	score: number | null;
	session: EvaluationResultSessionSummary | null;
	state: EvaluationResultState;
	verification: EvaluationResultVerificationSummary;
	workflow: EvaluationResultWorkflow | null;
	warnings: EvaluationResultWarningPreview;
};

export type EvaluationResultSummaryPayload = {
	filters: {
		previewLimit: number;
		sessionId: string | null;
		workflow: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	recentSessions: EvaluationResultSessionPreview[];
	service: string;
	sessionId: string;
	status: StartupStatus;
	summary: EvaluationResultSummary | null;
};

export type EvaluationResultApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";

export type EvaluationResultErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: EvaluationResultApiErrorStatus;
};

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value as JsonRecord;
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

	if (!values.includes(value as TValue)) {
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
		"evaluation-result startup status",
	);
}

function parseArtifactSummary(value: unknown): EvaluationResultArtifactSummary {
	const record = assertRecord(value, "evaluation artifact summary");

	return {
		exists: readBoolean(record, "exists"),
		kind: readEnum(
			record,
			"kind",
			EVALUATION_RESULT_ARTIFACT_KINDS,
			"evaluation artifact kind",
		),
		message: readString(record, "message"),
		repoRelativePath: readNullableString(record, "repoRelativePath"),
		state: readEnum(
			record,
			"state",
			EVALUATION_RESULT_ARTIFACT_STATES,
			"evaluation artifact state",
		),
	};
}

function parseApprovalSummary(value: unknown): EvaluationResultApprovalSummary {
	const record = assertRecord(value, "evaluation approval summary");

	return {
		action: readString(record, "action"),
		approvalId: readString(record, "approvalId"),
		jobId: readNullableString(record, "jobId"),
		requestedAt: readString(record, "requestedAt"),
		resolvedAt: readNullableString(record, "resolvedAt"),
		status: readEnum(
			record,
			"status",
			EVALUATION_RESULT_APPROVAL_STATUSES,
			"evaluation approval status",
		),
		title: readString(record, "title"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseCheckpointPreview(
	value: unknown,
): EvaluationResultCheckpointPreview {
	const record = assertRecord(value, "evaluation checkpoint preview");

	return {
		completedStepCount: readNumber(record, "completedStepCount"),
		completedSteps: readStringArray(record, "completedSteps"),
		cursor: readNullableString(record, "cursor"),
		hasMore: readBoolean(record, "hasMore"),
		updatedAt: readNullableString(record, "updatedAt"),
	};
}

function parseCloseoutSummary(value: unknown): EvaluationResultCloseoutSummary {
	const record = assertRecord(value, "evaluation closeout summary");

	return {
		message: readString(record, "message"),
		readyForReview: readBoolean(record, "readyForReview"),
		state: readEnum(
			record,
			"state",
			EVALUATION_RESULT_CLOSEOUT_STATES,
			"evaluation closeout state",
		),
	};
}

function parseFailureSummary(value: unknown): EvaluationResultFailureSummary {
	const record = assertRecord(value, "evaluation failure summary");

	return {
		failedAt: readString(record, "failedAt"),
		jobId: readString(record, "jobId"),
		message: readString(record, "message"),
		runId: readString(record, "runId"),
		sessionId: readString(record, "sessionId"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseInputProvenance(value: unknown): EvaluationResultInputProvenance {
	const record = assertRecord(value, "evaluation input provenance");

	return {
		canonicalUrl: readNullableString(record, "canonicalUrl"),
		host: readNullableString(record, "host"),
		kind: readEnum(
			record,
			"kind",
			EVALUATION_RESULT_INPUT_KINDS,
			"evaluation input provenance kind",
		),
		message: readString(record, "message"),
	};
}

function parseHandoffSummary(value: unknown): EvaluationResultHandoffSummary {
	const record = assertRecord(value, "evaluation handoff summary");
	const approvalStatus = readString(record, "approvalStatus");

	if (
		approvalStatus !== "none" &&
		!EVALUATION_RESULT_APPROVAL_STATUSES.includes(
			approvalStatus as EvaluationResultApprovalStatus,
		)
	) {
		throw new Error(
			`Unsupported evaluation approval handoff status: ${approvalStatus}`,
		);
	}

	return {
		approval: readNullableObject(record, "approval", parseApprovalSummary),
		approvalStatus:
			approvalStatus === "none"
				? "none"
				: (approvalStatus as EvaluationResultApprovalStatus),
		message: readString(record, "message"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		state: readEnum(
			record,
			"state",
			EVALUATION_RESULT_HANDOFF_STATES,
			"evaluation handoff state",
		),
	};
}

function parseVerificationSummary(
	value: unknown,
): EvaluationResultVerificationSummary {
	const record = assertRecord(value, "evaluation verification summary");

	return {
		message: readString(record, "message"),
		result: readEnum(
			record,
			"result",
			EVALUATION_RESULT_VERIFICATION_RESULTS,
			"evaluation verification result",
		),
		source: readEnum(
			record,
			"source",
			EVALUATION_RESULT_VERIFICATION_SOURCES,
			"evaluation verification source",
		),
		status: readEnum(
			record,
			"status",
			EVALUATION_RESULT_VERIFICATION_STATUSES,
			"evaluation verification status",
		),
		url: readNullableString(record, "url"),
	};
}

function parseReportViewerFocus(
	value: unknown,
): EvaluationResultReportViewerFocus {
	const record = assertRecord(value, "evaluation report-viewer focus");

	return {
		availability: readEnum(
			record,
			"availability",
			EVALUATION_RESULT_REVIEW_FOCUS_AVAILABILITY,
			"evaluation report-viewer availability",
		),
		message: readString(record, "message"),
		reportNumber: readNullableString(record, "reportNumber"),
		reportPath: readNullableString(record, "reportPath"),
	};
}

function parsePipelineReviewFocus(
	value: unknown,
): EvaluationResultPipelineReviewFocus {
	const record = assertRecord(value, "evaluation pipeline-review focus");

	return {
		availability: readEnum(
			record,
			"availability",
			EVALUATION_RESULT_REVIEW_FOCUS_AVAILABILITY,
			"evaluation pipeline-review availability",
		),
		message: readString(record, "message"),
		reportNumber: readNullableString(record, "reportNumber"),
		section: readEnum(
			record,
			"section",
			EVALUATION_RESULT_PIPELINE_SECTIONS,
			"evaluation pipeline-review section",
		),
		url: readNullableString(record, "url"),
	};
}

function parseTrackerWorkspaceFocus(
	value: unknown,
): EvaluationResultTrackerWorkspaceFocus {
	const record = assertRecord(value, "evaluation tracker-workspace focus");

	return {
		availability: readEnum(
			record,
			"availability",
			EVALUATION_RESULT_REVIEW_FOCUS_AVAILABILITY,
			"evaluation tracker-workspace availability",
		),
		message: readString(record, "message"),
		reportNumber: readNullableString(record, "reportNumber"),
	};
}

function parseReviewFocus(value: unknown): EvaluationResultReviewFocus {
	const record = assertRecord(value, "evaluation review focus");

	return {
		pipelineReview: parsePipelineReviewFocus(record.pipelineReview),
		primaryTarget: readEnum(
			record,
			"primaryTarget",
			EVALUATION_RESULT_REVIEW_TARGETS,
			"evaluation review target",
		),
		reportViewer: parseReportViewerFocus(record.reportViewer),
		trackerWorkspace: parseTrackerWorkspaceFocus(record.trackerWorkspace),
	};
}

function parseJobSummary(value: unknown): EvaluationResultJobSummary {
	const record = assertRecord(value, "evaluation job summary");
	const waitReason = record.waitReason;

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
			EVALUATION_RESULT_JOB_STATUSES,
			"evaluation job status",
		),
		updatedAt: readString(record, "updatedAt"),
		waitReason:
			waitReason === null
				? null
				: readEnum(
						record,
						"waitReason",
						EVALUATION_RESULT_JOB_WAIT_REASONS,
						"evaluation job wait reason",
					),
	};
}

function parseSessionSummary(value: unknown): EvaluationResultSessionSummary {
	const record = assertRecord(value, "evaluation run summary");

	return {
		activeJobId: readNullableString(record, "activeJobId"),
		lastHeartbeatAt: readNullableString(record, "lastHeartbeatAt"),
		sessionId: readString(record, "sessionId"),
		status: readEnum(
			record,
			"status",
			EVALUATION_RESULT_SESSION_STATUSES,
			"evaluation run status",
		),
		updatedAt: readString(record, "updatedAt"),
		workflow: readString(record, "workflow"),
	};
}

function parseSessionPreview(value: unknown): EvaluationResultSessionPreview {
	const record = assertRecord(value, "evaluation run preview");

	return {
		sessionId: readString(record, "sessionId"),
		state: readEnum(
			record,
			"state",
			EVALUATION_RESULT_STATES,
			"evaluation run state",
		),
		status: readEnum(
			record,
			"status",
			EVALUATION_RESULT_SESSION_STATUSES,
			"evaluation run status",
		),
		updatedAt: readString(record, "updatedAt"),
		workflow: readEnum(
			record,
			"workflow",
			EVALUATION_RESULT_WORKFLOWS,
			"evaluation workflow",
		),
	};
}

function parseWarningItem(value: unknown): EvaluationResultWarningItem {
	const record = assertRecord(value, "evaluation warning item");

	return {
		code: readNullableString(record, "code"),
		message: readString(record, "message"),
	};
}

function parseWarningPreview(value: unknown): EvaluationResultWarningPreview {
	const record = assertRecord(value, "evaluation warning preview");
	const items = record.items;

	if (!Array.isArray(items)) {
		throw new Error("Expected evaluation warnings to be an array.");
	}

	return {
		hasMore: readBoolean(record, "hasMore"),
		items: items.map((entry) => parseWarningItem(entry)),
		totalCount: readNumber(record, "totalCount"),
	};
}

function parseSummary(value: unknown): EvaluationResultSummary {
	const record = assertRecord(value, "evaluation result summary");
	const artifacts = assertRecord(record.artifacts, "evaluation artifacts");
	const legitimacy = record.legitimacy;
	const workflow = record.workflow;

	if (
		legitimacy !== null &&
		!EVALUATION_RESULT_LEGITIMACY_VALUES.includes(
			legitimacy as EvaluationResultLegitimacy,
		)
	) {
		throw new Error(`Unsupported evaluation legitimacy value: ${legitimacy}`);
	}

	if (
		workflow !== null &&
		!EVALUATION_RESULT_WORKFLOWS.includes(workflow as EvaluationResultWorkflow)
	) {
		throw new Error(`Unsupported evaluation workflow value: ${workflow}`);
	}

	return {
		artifacts: {
			pdf: parseArtifactSummary(artifacts.pdf),
			report: parseArtifactSummary(artifacts.report),
			tracker: parseArtifactSummary(artifacts.tracker),
		},
		checkpoint: parseCheckpointPreview(record.checkpoint),
		closeout: parseCloseoutSummary(record.closeout),
		failure: readNullableObject(record, "failure", parseFailureSummary),
		handoff: parseHandoffSummary(record.handoff),
		inputProvenance: parseInputProvenance(record.inputProvenance),
		job: readNullableObject(record, "job", parseJobSummary),
		legitimacy:
			legitimacy === null ? null : (legitimacy as EvaluationResultLegitimacy),
		message: readString(record, "message"),
		reportNumber: readNullableString(record, "reportNumber"),
		reviewFocus: parseReviewFocus(record.reviewFocus),
		score: record.score === null ? null : readNumber(record, "score"),
		session: readNullableObject(record, "session", parseSessionSummary),
		state: readEnum(
			record,
			"state",
			EVALUATION_RESULT_STATES,
			"evaluation result state",
		),
		verification: parseVerificationSummary(record.verification),
		workflow: workflow === null ? null : (workflow as EvaluationResultWorkflow),
		warnings: parseWarningPreview(record.warnings),
	};
}

export function parseEvaluationResultSummaryPayload(
	value: unknown,
): EvaluationResultSummaryPayload {
	const record = assertRecord(value, "evaluation result response");
	const filters = assertRecord(record.filters, "evaluation result filters");
	const recentSessions = record.recentSessions;

	if (!Array.isArray(recentSessions)) {
		throw new Error("Expected recent runs to be an array.");
	}

	return {
		filters: {
			previewLimit: readNumber(filters, "previewLimit"),
			sessionId: readNullableString(filters, "sessionId"),
			workflow: readNullableString(filters, "workflow"),
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		recentSessions: recentSessions.map((entry) => parseSessionPreview(entry)),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
		summary: readNullableObject(record, "summary", parseSummary),
	};
}

export function parseEvaluationResultErrorPayload(
	value: unknown,
): EvaluationResultErrorPayload {
	const record = assertRecord(value, "evaluation result error response");
	const error = assertRecord(record.error, "evaluation result error");

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
			"evaluation-result API error status",
		),
	};
}

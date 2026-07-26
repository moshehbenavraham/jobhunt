import type { StartupStatus } from "../boot/startup-types";
import {
	REPORT_VIEWER_LEGITIMACY_VALUES,
	type ReportViewerLegitimacy,
} from "../reports/report-viewer-types";

export const APPLICATION_HELP_SESSION_QUERY_PARAM = "applicationHelpSessionId";

export const APPLICATION_HELP_SELECTION_ORIGIN_VALUES = [
	"latest",
	"none",
	"session-id",
] as const;

export type ApplicationHelpSelectionOrigin =
	(typeof APPLICATION_HELP_SELECTION_ORIGIN_VALUES)[number];

export const APPLICATION_HELP_SELECTION_STATE_VALUES = [
	"empty",
	"missing",
	"ready",
] as const;

export type ApplicationHelpSelectionState =
	(typeof APPLICATION_HELP_SELECTION_STATE_VALUES)[number];

export const APPLICATION_HELP_REVIEW_STATE_VALUES = [
	"approval-paused",
	"completed",
	"draft-ready",
	"missing-context",
	"no-draft-yet",
	"rejected",
	"resumed",
] as const;

export type ApplicationHelpReviewState =
	(typeof APPLICATION_HELP_REVIEW_STATE_VALUES)[number];

export const APPLICATION_HELP_CONTEXT_MATCH_STATE_VALUES = [
	"exact",
	"fuzzy",
	"missing",
] as const;

export type ApplicationHelpContextMatchState =
	(typeof APPLICATION_HELP_CONTEXT_MATCH_STATE_VALUES)[number];

export const APPLICATION_HELP_COVER_LETTER_STATE_VALUES = [
	"manual-follow-up",
	"not-requested",
] as const;

export type ApplicationHelpCoverLetterState =
	(typeof APPLICATION_HELP_COVER_LETTER_STATE_VALUES)[number];

export const APPLICATION_HELP_NEXT_ACTION_VALUES = [
	"generate-draft",
	"match-report",
	"resolve-approval",
	"resume-session",
	"review-draft",
	"revise-draft",
] as const;

export type ApplicationHelpNextAction =
	(typeof APPLICATION_HELP_NEXT_ACTION_VALUES)[number];

export const APPLICATION_HELP_WARNING_CODE_VALUES = [
	"ambiguous-report-match",
	"approval-paused",
	"cover-letter-manual-follow-up",
	"draft-warning",
	"missing-context",
	"missing-draft-packet",
	"missing-pdf-artifact",
	"rejected",
	"resumable-session",
] as const;

export type ApplicationHelpWarningCode =
	(typeof APPLICATION_HELP_WARNING_CODE_VALUES)[number];

export type ApplicationHelpFocus = {
	sessionId: string | null;
};

export type ApplicationHelpWarningItem = {
	code: ApplicationHelpWarningCode;
	message: string;
};

export type ApplicationHelpDraftItem = {
	answer: string;
	question: string;
};

export type ApplicationHelpCoverLetterSummary = {
	message: string;
	state: ApplicationHelpCoverLetterState;
};

export type ApplicationHelpMatchedReportContext = {
	company: string | null;
	coverLetter: ApplicationHelpCoverLetterSummary;
	existingDraft: {
		itemCount: number;
		items: ApplicationHelpDraftItem[];
		sectionPresent: boolean;
		sectionText: string | null;
	};
	fileName: string;
	legitimacy: ReportViewerLegitimacy | null;
	matchReasons: string[];
	matchState: ApplicationHelpContextMatchState;
	pdf: {
		exists: boolean;
		repoRelativePath: string | null;
	};
	reportNumber: string | null;
	reportRepoRelativePath: string;
	role: string | null;
	score: number | null;
	title: string | null;
	url: string | null;
};

export type ApplicationHelpDraftPacketSummary = {
	company: string | null;
	createdAt: string;
	fingerprint: string;
	itemCount: number;
	items: ApplicationHelpDraftItem[];
	matchedContext: ApplicationHelpMatchedReportContext | null;
	packetId: string;
	repoRelativePath: string;
	reviewNotes: string | null;
	reviewRequired: true;
	revision: number;
	role: string | null;
	sessionId: string;
	updatedAt: string;
	warnings: string[];
};

export type ApplicationHelpSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	resumeAllowed: boolean;
	sessionId: string;
	status: string;
	updatedAt: string;
	workflow: string;
};

export type ApplicationHelpJobSummary = {
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

export type ApplicationHelpApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: string;
	title: string;
	traceId: string | null;
};

export type ApplicationHelpFailureSummary = {
	failedAt: string;
	jobId: string | null;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type ApplicationHelpNextReviewGuidance = {
	action: ApplicationHelpNextAction;
	message: string;
	resumeAllowed: boolean;
	sessionId: string | null;
};

export type ApplicationHelpReviewBoundary = {
	message: string;
	reviewRequired: true;
	submissionAllowed: false;
};

export type ApplicationHelpSelectedSummary = {
	approval: ApplicationHelpApprovalSummary | null;
	draftPacket: ApplicationHelpDraftPacketSummary | null;
	failure: ApplicationHelpFailureSummary | null;
	job: ApplicationHelpJobSummary | null;
	message: string;
	nextReview: ApplicationHelpNextReviewGuidance;
	reportContext: ApplicationHelpMatchedReportContext | null;
	reviewBoundary: ApplicationHelpReviewBoundary;
	session: ApplicationHelpSessionSummary;
	state: ApplicationHelpReviewState;
	warnings: ApplicationHelpWarningItem[];
};

export type ApplicationHelpSelectedDetail = {
	message: string;
	origin: ApplicationHelpSelectionOrigin;
	requestedSessionId: string | null;
	state: ApplicationHelpSelectionState;
	summary: ApplicationHelpSelectedSummary | null;
};

export type ApplicationHelpSummaryPayload = {
	filters: {
		sessionId: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	selected: ApplicationHelpSelectedDetail;
	service: string;
	sessionId: string;
	status: StartupStatus;
};

export type ApplicationHelpApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";

export type ApplicationHelpErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: ApplicationHelpApiErrorStatus;
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

function readStringArray(record: JsonRecord, key: string): string[] {
	const value = record[key];

	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		throw new Error(`Expected ${key} to be a string array.`);
	}

	return [...value];
}

function readNullableObject<TValue>(
	record: JsonRecord,
	key: string,
	parser: (value: unknown) => TValue,
): TValue | null {
	const value = record[key];
	return value === null ? null : parser(value);
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
		"application-help startup status",
	);
}

function parseLegitimacy(value: unknown): ReportViewerLegitimacy | null {
	if (value === null) {
		return null;
	}

	if (
		typeof value !== "string" ||
		!REPORT_VIEWER_LEGITIMACY_VALUES.includes(value as ReportViewerLegitimacy)
	) {
		throw new Error(`Unsupported application-help legitimacy value: ${value}`);
	}

	return value as ReportViewerLegitimacy;
}

function parseWarningItem(value: unknown): ApplicationHelpWarningItem {
	const record = assertRecord(value, "application-help warning");

	return {
		code: readEnum(
			record,
			"code",
			APPLICATION_HELP_WARNING_CODE_VALUES,
			"application-help warning code",
		),
		message: readString(record, "message"),
	};
}

function parseDraftItem(value: unknown): ApplicationHelpDraftItem {
	const record = assertRecord(value, "application-help draft item");

	return {
		answer: readString(record, "answer"),
		question: readString(record, "question"),
	};
}

function parseCoverLetterSummary(
	value: unknown,
): ApplicationHelpCoverLetterSummary {
	const record = assertRecord(value, "application-help cover-letter summary");

	return {
		message: readString(record, "message"),
		state: readEnum(
			record,
			"state",
			APPLICATION_HELP_COVER_LETTER_STATE_VALUES,
			"application-help cover-letter state",
		),
	};
}

function parseMatchedReportContext(
	value: unknown,
): ApplicationHelpMatchedReportContext {
	const record = assertRecord(value, "application-help matched report context");
	const existingDraft = assertRecord(
		record.existingDraft,
		"application-help existing draft",
	);
	const pdf = assertRecord(record.pdf, "application-help matched pdf");

	return {
		company: readNullableString(record, "company"),
		coverLetter: parseCoverLetterSummary(record.coverLetter),
		existingDraft: {
			itemCount: readNumber(existingDraft, "itemCount"),
			items: readArray(existingDraft, "items", parseDraftItem),
			sectionPresent: readBoolean(existingDraft, "sectionPresent"),
			sectionText: readNullableString(existingDraft, "sectionText"),
		},
		fileName: readString(record, "fileName"),
		legitimacy: parseLegitimacy(record.legitimacy),
		matchReasons: readStringArray(record, "matchReasons"),
		matchState: readEnum(
			record,
			"matchState",
			APPLICATION_HELP_CONTEXT_MATCH_STATE_VALUES,
			"application-help match state",
		),
		pdf: {
			exists: readBoolean(pdf, "exists"),
			repoRelativePath: readNullableString(pdf, "repoRelativePath"),
		},
		reportNumber: readNullableString(record, "reportNumber"),
		reportRepoRelativePath: readString(record, "reportRepoRelativePath"),
		role: readNullableString(record, "role"),
		score: readNullableNumber(record, "score"),
		title: readNullableString(record, "title"),
		url: readNullableString(record, "url"),
	};
}

function parseDraftPacketSummary(
	value: unknown,
): ApplicationHelpDraftPacketSummary {
	const record = assertRecord(value, "application-help draft packet");

	return {
		company: readNullableString(record, "company"),
		createdAt: readString(record, "createdAt"),
		fingerprint: readString(record, "fingerprint"),
		itemCount: readNumber(record, "itemCount"),
		items: readArray(record, "items", parseDraftItem),
		matchedContext: readNullableObject(
			record,
			"matchedContext",
			parseMatchedReportContext,
		),
		packetId: readString(record, "packetId"),
		repoRelativePath: readString(record, "repoRelativePath"),
		reviewNotes: readNullableString(record, "reviewNotes"),
		reviewRequired: readExactBoolean(record, "reviewRequired", true),
		revision: readNumber(record, "revision"),
		role: readNullableString(record, "role"),
		sessionId: readString(record, "sessionId"),
		updatedAt: readString(record, "updatedAt"),
		warnings: readStringArray(record, "warnings"),
	};
}

function parseSessionSummary(value: unknown): ApplicationHelpSessionSummary {
	const record = assertRecord(value, "application-help session summary");

	return {
		activeJobId: readNullableString(record, "activeJobId"),
		lastHeartbeatAt: readNullableString(record, "lastHeartbeatAt"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		sessionId: readString(record, "sessionId"),
		status: readString(record, "status"),
		updatedAt: readString(record, "updatedAt"),
		workflow: readString(record, "workflow"),
	};
}

function parseJobSummary(value: unknown): ApplicationHelpJobSummary {
	const record = assertRecord(value, "application-help job summary");

	return {
		attempt: readNumber(record, "attempt"),
		completedAt: readNullableString(record, "completedAt"),
		currentRunId: readString(record, "currentRunId"),
		jobId: readString(record, "jobId"),
		jobType: readString(record, "jobType"),
		startedAt: readNullableString(record, "startedAt"),
		status: readString(record, "status"),
		updatedAt: readString(record, "updatedAt"),
		waitReason: readNullableString(record, "waitReason"),
	};
}

function parseApprovalSummary(value: unknown): ApplicationHelpApprovalSummary {
	const record = assertRecord(value, "application-help approval summary");

	return {
		action: readString(record, "action"),
		approvalId: readString(record, "approvalId"),
		jobId: readNullableString(record, "jobId"),
		requestedAt: readString(record, "requestedAt"),
		resolvedAt: readNullableString(record, "resolvedAt"),
		status: readString(record, "status"),
		title: readString(record, "title"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseFailureSummary(value: unknown): ApplicationHelpFailureSummary {
	const record = assertRecord(value, "application-help failure summary");

	return {
		failedAt: readString(record, "failedAt"),
		jobId: readNullableString(record, "jobId"),
		message: readString(record, "message"),
		runId: readString(record, "runId"),
		sessionId: readString(record, "sessionId"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseNextReviewGuidance(
	value: unknown,
): ApplicationHelpNextReviewGuidance {
	const record = assertRecord(value, "application-help next review");

	return {
		action: readEnum(
			record,
			"action",
			APPLICATION_HELP_NEXT_ACTION_VALUES,
			"application-help next action",
		),
		message: readString(record, "message"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		sessionId: readNullableString(record, "sessionId"),
	};
}

function parseReviewBoundary(value: unknown): ApplicationHelpReviewBoundary {
	const record = assertRecord(value, "application-help review boundary");

	return {
		message: readString(record, "message"),
		reviewRequired: readExactBoolean(record, "reviewRequired", true),
		submissionAllowed: readExactBoolean(record, "submissionAllowed", false),
	};
}

function parseSelectedSummary(value: unknown): ApplicationHelpSelectedSummary {
	const record = assertRecord(value, "application-help selected summary");

	return {
		approval: readNullableObject(record, "approval", parseApprovalSummary),
		draftPacket: readNullableObject(
			record,
			"draftPacket",
			parseDraftPacketSummary,
		),
		failure: readNullableObject(record, "failure", parseFailureSummary),
		job: readNullableObject(record, "job", parseJobSummary),
		message: readString(record, "message"),
		nextReview: parseNextReviewGuidance(record.nextReview),
		reportContext: readNullableObject(
			record,
			"reportContext",
			parseMatchedReportContext,
		),
		reviewBoundary: parseReviewBoundary(record.reviewBoundary),
		session: parseSessionSummary(record.session),
		state: readEnum(
			record,
			"state",
			APPLICATION_HELP_REVIEW_STATE_VALUES,
			"application-help review state",
		),
		warnings: readArray(record, "warnings", parseWarningItem),
	};
}

function parseSelectedDetail(value: unknown): ApplicationHelpSelectedDetail {
	const record = assertRecord(value, "application-help selected detail");

	return {
		message: readString(record, "message"),
		origin: readEnum(
			record,
			"origin",
			APPLICATION_HELP_SELECTION_ORIGIN_VALUES,
			"application-help selection origin",
		),
		requestedSessionId: readNullableString(record, "requestedSessionId"),
		state: readEnum(
			record,
			"state",
			APPLICATION_HELP_SELECTION_STATE_VALUES,
			"application-help selection state",
		),
		summary: readNullableObject(record, "summary", parseSelectedSummary),
	};
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

	return value.map((item) => parser(item));
}

export function normalizeApplicationHelpSessionId(
	value: string | null | undefined,
): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

export function parseApplicationHelpSummaryPayload(
	value: unknown,
): ApplicationHelpSummaryPayload {
	const record = assertRecord(value, "application-help summary payload");
	const filters = assertRecord(record.filters, "application-help filters");

	return {
		filters: {
			sessionId: readNullableString(filters, "sessionId"),
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		selected: parseSelectedDetail(record.selected),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
	};
}

export function parseApplicationHelpErrorPayload(
	value: unknown,
): ApplicationHelpErrorPayload {
	const record = assertRecord(value, "application-help error payload");
	const error = assertRecord(record.error, "application-help error");

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
			"application-help error status",
		),
	};
}

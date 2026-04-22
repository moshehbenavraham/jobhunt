import type { StartupStatus } from "../boot/startup-types";

export const SCAN_REVIEW_BUCKET_VALUES = [
	"strongest-fit",
	"possible-fit",
	"adjacent-or-noisy",
] as const;

export type ScanReviewBucket = (typeof SCAN_REVIEW_BUCKET_VALUES)[number];

export const SCAN_REVIEW_BUCKET_FILTER_VALUES = [
	"all",
	...SCAN_REVIEW_BUCKET_VALUES,
] as const;

export type ScanReviewBucketFilter =
	(typeof SCAN_REVIEW_BUCKET_FILTER_VALUES)[number];

export const SCAN_REVIEW_SELECTION_ORIGIN_VALUES = ["none", "url"] as const;

export type ScanReviewSelectionOrigin =
	(typeof SCAN_REVIEW_SELECTION_ORIGIN_VALUES)[number];

export const SCAN_REVIEW_SELECTION_STATE_VALUES = [
	"empty",
	"missing",
	"ready",
] as const;

export type ScanReviewSelectionState =
	(typeof SCAN_REVIEW_SELECTION_STATE_VALUES)[number];

export const SCAN_REVIEW_RUN_STATE_VALUES = [
	"idle",
	"queued",
	"running",
	"approval-paused",
	"completed",
	"degraded",
] as const;

export type ScanReviewRunState = (typeof SCAN_REVIEW_RUN_STATE_VALUES)[number];

export const SCAN_REVIEW_FRESHNESS_VALUES = [
	"new",
	"recent",
	"stale",
	"unknown",
] as const;

export type ScanReviewFreshness = (typeof SCAN_REVIEW_FRESHNESS_VALUES)[number];

export const SCAN_REVIEW_WARNING_CODE_VALUES = [
	"already-ignored",
	"already-pending",
	"approval-paused",
	"degraded-result",
	"duplicate-heavy",
	"stale-selection",
] as const;

export type ScanReviewWarningCode =
	(typeof SCAN_REVIEW_WARNING_CODE_VALUES)[number];

export const SCAN_REVIEW_ACTION_VALUES = ["ignore", "restore"] as const;

export type ScanReviewAction = (typeof SCAN_REVIEW_ACTION_VALUES)[number];

export type ScanReviewWarningItem = {
	code: ScanReviewWarningCode;
	message: string;
};

export type ScanReviewRunWarningItem = {
	code: string;
	message: string;
};

export type ScanReviewLauncherState = {
	available: boolean;
	canStart: boolean;
	message: string;
	workflow: "scan-portals";
};

export type ScanReviewRunFilter = {
	company: string | null;
	compareClean: boolean;
	dryRun: boolean;
};

export type ScanReviewRunCounts = {
	companiesConfigured: number | null;
	companiesScanned: number | null;
	companiesSkipped: number | null;
	duplicatesSkipped: number | null;
	filteredByLocation: number | null;
	filteredByTitle: number | null;
	newOffersAdded: number | null;
	totalJobsFound: number | null;
};

export type ScanReviewRunSummary = {
	activeJobId: string | null;
	approvalId: string | null;
	completedAt: string | null;
	filter: ScanReviewRunFilter;
	message: string;
	runId: string | null;
	sessionId: string | null;
	startedAt: string | null;
	state: ScanReviewRunState;
	summary: ScanReviewRunCounts;
	updatedAt: string | null;
	warnings: ScanReviewRunWarningItem[];
};

export type ScanReviewDuplicateHint = {
	firstSeen: string | null;
	freshness: ScanReviewFreshness;
	historyCount: number;
	otherShortlistCount: number;
	pendingOverlap: boolean;
	portal: string | null;
	status: string | null;
	title: string | null;
};

export type ScanReviewEvaluateHandoff = {
	context: {
		promptText: string;
	};
	message: string;
	workflow: "single-evaluation";
};

export type ScanReviewBatchSeedHandoff = {
	item: {
		bucket: ScanReviewBucket;
		company: string | null;
		reasonSummary: string | null;
		role: string;
		url: string;
	};
	message: string;
	selection: {
		limit: 1;
		mode: "selected-urls";
		urls: string[];
	};
	target: "batch-composer";
};

export type ScanReviewIgnoreAction = {
	action: ScanReviewAction;
	message: string;
	sessionId: string | null;
	url: string;
};

export type ScanReviewCandidatePreview = {
	batchSeed: ScanReviewBatchSeedHandoff;
	bucket: ScanReviewBucket;
	company: string | null;
	duplicateHint: ScanReviewDuplicateHint;
	evaluate: ScanReviewEvaluateHandoff;
	ignoreAction: ScanReviewIgnoreAction;
	ignored: boolean;
	rank: number;
	reasonSummary: string | null;
	role: string;
	selected: boolean;
	url: string;
	warningCount: number;
	warnings: ScanReviewWarningItem[];
};

export type ScanReviewSelectedCandidate = ScanReviewCandidatePreview & {
	sourceLine: string;
};

export type ScanReviewSelectedDetail = {
	message: string;
	origin: ScanReviewSelectionOrigin;
	requestedUrl: string | null;
	row: ScanReviewSelectedCandidate | null;
	state: ScanReviewSelectionState;
};

export type ScanReviewSummaryPayload = {
	filters: {
		bucket: ScanReviewBucketFilter;
		includeIgnored: boolean;
		limit: number;
		offset: number;
		sessionId: string | null;
		url: string | null;
	};
	generatedAt: string;
	launcher: ScanReviewLauncherState;
	message: string;
	ok: true;
	run: ScanReviewRunSummary;
	selectedDetail: ScanReviewSelectedDetail;
	service: string;
	sessionId: string;
	shortlist: {
		available: boolean;
		campaignGuidance: string | null;
		counts: {
			adjacentOrNoisy: number | null;
			duplicateHeavy: number;
			ignored: number;
			pendingOverlap: number;
			possibleFit: number | null;
			strongestFit: number | null;
			total: number;
		};
		filteredCount: number;
		hasMore: boolean;
		items: ScanReviewCandidatePreview[];
		lastRefreshed: string | null;
		limit: number;
		message: string;
		offset: number;
		totalCount: number;
	};
	status: StartupStatus;
};

export type ScanReviewActionPayload = {
	actionResult: {
		action: ScanReviewAction;
		message: string;
		sessionId: string;
		url: string;
		visibility: "hidden" | "visible";
	};
	generatedAt: string;
	message: string;
	ok: true;
	service: string;
	sessionId: string;
	status: StartupStatus;
};

export type ScanReviewApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";

export type ScanReviewErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: ScanReviewApiErrorStatus;
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

function readEnumValue<TValue extends string>(
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
	return readEnumValue(
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
		],
		"scan-review startup status",
	);
}

function parseWarningItem(value: unknown): ScanReviewWarningItem {
	const record = assertRecord(value, "scan-review warning item");

	return {
		code: readEnumValue(
			record,
			"code",
			SCAN_REVIEW_WARNING_CODE_VALUES,
			"scan-review warning code",
		),
		message: readString(record, "message"),
	};
}

function parseRunWarningItem(value: unknown): ScanReviewRunWarningItem {
	const record = assertRecord(value, "scan-review run warning item");

	return {
		code: readString(record, "code"),
		message: readString(record, "message"),
	};
}

function parseLauncherState(value: unknown): ScanReviewLauncherState {
	const record = assertRecord(value, "scan-review launcher");
	const workflow = readString(record, "workflow");

	if (workflow !== "scan-portals") {
		throw new Error(`Unsupported scan-review launcher workflow: ${workflow}`);
	}

	return {
		available: readBoolean(record, "available"),
		canStart: readBoolean(record, "canStart"),
		message: readString(record, "message"),
		workflow,
	};
}

function parseRunFilter(value: unknown): ScanReviewRunFilter {
	const record = assertRecord(value, "scan-review run filter");

	return {
		company: readNullableString(record, "company"),
		compareClean: readBoolean(record, "compareClean"),
		dryRun: readBoolean(record, "dryRun"),
	};
}

function parseRunCounts(value: unknown): ScanReviewRunCounts {
	const record = assertRecord(value, "scan-review run counts");

	return {
		companiesConfigured: readNullableNumber(record, "companiesConfigured"),
		companiesScanned: readNullableNumber(record, "companiesScanned"),
		companiesSkipped: readNullableNumber(record, "companiesSkipped"),
		duplicatesSkipped: readNullableNumber(record, "duplicatesSkipped"),
		filteredByLocation: readNullableNumber(record, "filteredByLocation"),
		filteredByTitle: readNullableNumber(record, "filteredByTitle"),
		newOffersAdded: readNullableNumber(record, "newOffersAdded"),
		totalJobsFound: readNullableNumber(record, "totalJobsFound"),
	};
}

function parseRunSummary(value: unknown): ScanReviewRunSummary {
	const record = assertRecord(value, "scan-review run");
	const warnings = record.warnings;

	if (!Array.isArray(warnings)) {
		throw new Error("Expected scan-review run warnings to be an array.");
	}

	return {
		activeJobId: readNullableString(record, "activeJobId"),
		approvalId: readNullableString(record, "approvalId"),
		completedAt: readNullableString(record, "completedAt"),
		filter: parseRunFilter(record.filter),
		message: readString(record, "message"),
		runId: readNullableString(record, "runId"),
		sessionId: readNullableString(record, "sessionId"),
		startedAt: readNullableString(record, "startedAt"),
		state: readEnumValue(
			record,
			"state",
			SCAN_REVIEW_RUN_STATE_VALUES,
			"scan-review run state",
		),
		summary: parseRunCounts(record.summary),
		updatedAt: readNullableString(record, "updatedAt"),
		warnings: warnings.map(parseRunWarningItem),
	};
}

function parseDuplicateHint(value: unknown): ScanReviewDuplicateHint {
	const record = assertRecord(value, "scan-review duplicate hint");

	return {
		firstSeen: readNullableString(record, "firstSeen"),
		freshness: readEnumValue(
			record,
			"freshness",
			SCAN_REVIEW_FRESHNESS_VALUES,
			"scan-review freshness",
		),
		historyCount: readNumber(record, "historyCount"),
		otherShortlistCount: readNumber(record, "otherShortlistCount"),
		pendingOverlap: readBoolean(record, "pendingOverlap"),
		portal: readNullableString(record, "portal"),
		status: readNullableString(record, "status"),
		title: readNullableString(record, "title"),
	};
}

function parseEvaluateHandoff(value: unknown): ScanReviewEvaluateHandoff {
	const record = assertRecord(value, "scan-review evaluate handoff");
	const context = assertRecord(record.context, "scan-review evaluate context");
	const workflow = readString(record, "workflow");

	if (workflow !== "single-evaluation") {
		throw new Error(`Unsupported scan-review evaluate workflow: ${workflow}`);
	}

	return {
		context: {
			promptText: readString(context, "promptText"),
		},
		message: readString(record, "message"),
		workflow,
	};
}

function parseBatchSeedHandoff(value: unknown): ScanReviewBatchSeedHandoff {
	const record = assertRecord(value, "scan-review batch seed handoff");
	const item = assertRecord(record.item, "scan-review batch seed item");
	const selection = assertRecord(
		record.selection,
		"scan-review batch seed selection",
	);
	const mode = readString(selection, "mode");
	const target = readString(record, "target");

	if (mode !== "selected-urls") {
		throw new Error(`Unsupported scan-review batch mode: ${mode}`);
	}

	if (target !== "batch-composer") {
		throw new Error(`Unsupported scan-review batch target: ${target}`);
	}

	return {
		item: {
			bucket: readEnumValue(
				item,
				"bucket",
				SCAN_REVIEW_BUCKET_VALUES,
				"scan-review bucket",
			),
			company: readNullableString(item, "company"),
			reasonSummary: readNullableString(item, "reasonSummary"),
			role: readString(item, "role"),
			url: readString(item, "url"),
		},
		message: readString(record, "message"),
		selection: {
			limit: readNumber(selection, "limit") as 1,
			mode,
			urls: readStringArray(selection, "urls"),
		},
		target,
	};
}

function parseIgnoreAction(value: unknown): ScanReviewIgnoreAction {
	const record = assertRecord(value, "scan-review ignore action");

	return {
		action: readEnumValue(
			record,
			"action",
			SCAN_REVIEW_ACTION_VALUES,
			"scan-review action",
		),
		message: readString(record, "message"),
		sessionId: readNullableString(record, "sessionId"),
		url: readString(record, "url"),
	};
}

function parseCandidatePreview(value: unknown): ScanReviewCandidatePreview {
	const record = assertRecord(value, "scan-review candidate preview");
	const warnings = record.warnings;

	if (!Array.isArray(warnings)) {
		throw new Error("Expected scan-review candidate warnings to be an array.");
	}

	return {
		batchSeed: parseBatchSeedHandoff(record.batchSeed),
		bucket: readEnumValue(
			record,
			"bucket",
			SCAN_REVIEW_BUCKET_VALUES,
			"scan-review bucket",
		),
		company: readNullableString(record, "company"),
		duplicateHint: parseDuplicateHint(record.duplicateHint),
		evaluate: parseEvaluateHandoff(record.evaluate),
		ignoreAction: parseIgnoreAction(record.ignoreAction),
		ignored: readBoolean(record, "ignored"),
		rank: readNumber(record, "rank"),
		reasonSummary: readNullableString(record, "reasonSummary"),
		role: readString(record, "role"),
		selected: readBoolean(record, "selected"),
		url: readString(record, "url"),
		warningCount: readNumber(record, "warningCount"),
		warnings: warnings.map(parseWarningItem),
	};
}

function parseSelectedCandidate(value: unknown): ScanReviewSelectedCandidate {
	const record = assertRecord(value, "scan-review selected candidate");
	const preview = parseCandidatePreview(value);

	return {
		...preview,
		sourceLine: readString(record, "sourceLine"),
	};
}

function parseSelectedDetail(value: unknown): ScanReviewSelectedDetail {
	const record = assertRecord(value, "scan-review selected detail");

	return {
		message: readString(record, "message"),
		origin: readEnumValue(
			record,
			"origin",
			SCAN_REVIEW_SELECTION_ORIGIN_VALUES,
			"scan-review selection origin",
		),
		requestedUrl: readNullableString(record, "requestedUrl"),
		row: record.row === null ? null : parseSelectedCandidate(record.row),
		state: readEnumValue(
			record,
			"state",
			SCAN_REVIEW_SELECTION_STATE_VALUES,
			"scan-review selection state",
		),
	};
}

export function parseScanReviewSummaryPayload(
	value: unknown,
): ScanReviewSummaryPayload {
	const record = assertRecord(value, "scan-review summary payload");
	const filters = assertRecord(record.filters, "scan-review filters");
	const shortlist = assertRecord(record.shortlist, "scan-review shortlist");
	const shortlistCounts = assertRecord(
		shortlist.counts,
		"scan-review shortlist counts",
	);
	const shortlistItems = shortlist.items;

	if (!Array.isArray(shortlistItems)) {
		throw new Error("Expected scan-review shortlist items to be an array.");
	}

	return {
		filters: {
			bucket: readEnumValue(
				filters,
				"bucket",
				SCAN_REVIEW_BUCKET_FILTER_VALUES,
				"scan-review bucket filter",
			),
			includeIgnored: readBoolean(filters, "includeIgnored"),
			limit: readNumber(filters, "limit"),
			offset: readNumber(filters, "offset"),
			sessionId: readNullableString(filters, "sessionId"),
			url: readNullableString(filters, "url"),
		},
		generatedAt: readString(record, "generatedAt"),
		launcher: parseLauncherState(record.launcher),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		run: parseRunSummary(record.run),
		selectedDetail: parseSelectedDetail(record.selectedDetail),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		shortlist: {
			available: readBoolean(shortlist, "available"),
			campaignGuidance: readNullableString(shortlist, "campaignGuidance"),
			counts: {
				adjacentOrNoisy: readNullableNumber(shortlistCounts, "adjacentOrNoisy"),
				duplicateHeavy: readNumber(shortlistCounts, "duplicateHeavy"),
				ignored: readNumber(shortlistCounts, "ignored"),
				pendingOverlap: readNumber(shortlistCounts, "pendingOverlap"),
				possibleFit: readNullableNumber(shortlistCounts, "possibleFit"),
				strongestFit: readNullableNumber(shortlistCounts, "strongestFit"),
				total: readNumber(shortlistCounts, "total"),
			},
			filteredCount: readNumber(shortlist, "filteredCount"),
			hasMore: readBoolean(shortlist, "hasMore"),
			items: shortlistItems.map(parseCandidatePreview),
			lastRefreshed: readNullableString(shortlist, "lastRefreshed"),
			limit: readNumber(shortlist, "limit"),
			message: readString(shortlist, "message"),
			offset: readNumber(shortlist, "offset"),
			totalCount: readNumber(shortlist, "totalCount"),
		},
		status: readStartupStatus(record, "status"),
	};
}

export function parseScanReviewActionPayload(
	value: unknown,
): ScanReviewActionPayload {
	const record = assertRecord(value, "scan-review action payload");
	const actionResult = assertRecord(
		record.actionResult,
		"scan-review action result",
	);
	const visibility = readString(actionResult, "visibility");

	if (visibility !== "hidden" && visibility !== "visible") {
		throw new Error(`Unsupported scan-review visibility: ${visibility}`);
	}

	return {
		actionResult: {
			action: readEnumValue(
				actionResult,
				"action",
				SCAN_REVIEW_ACTION_VALUES,
				"scan-review action",
			),
			message: readString(actionResult, "message"),
			sessionId: readString(actionResult, "sessionId"),
			url: readString(actionResult, "url"),
			visibility,
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
	};
}

export function parseScanReviewErrorPayload(
	value: unknown,
): ScanReviewErrorPayload {
	const record = assertRecord(value, "scan-review error payload");
	const error = assertRecord(record.error, "scan-review error");

	return {
		error: {
			code: readString(error, "code"),
			message: readString(error, "message"),
		},
		ok: readExactBoolean(record, "ok", false),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readEnumValue(
			record,
			"status",
			[
				"bad-request",
				"error",
				"method-not-allowed",
				"not-found",
				"rate-limited",
			],
			"scan-review API error status",
		),
	};
}

import type { StartupStatus } from "../boot/startup-types";

export const PIPELINE_REVIEW_QUEUE_SECTIONS = [
	"all",
	"pending",
	"processed",
] as const;

export type PipelineReviewQueueSection =
	(typeof PIPELINE_REVIEW_QUEUE_SECTIONS)[number];

export const PIPELINE_REVIEW_SORT_VALUES = [
	"company",
	"queue",
	"score",
] as const;

export type PipelineReviewSort = (typeof PIPELINE_REVIEW_SORT_VALUES)[number];

export const PIPELINE_REVIEW_SELECTION_ORIGINS = [
	"none",
	"report-number",
	"url",
] as const;

export type PipelineReviewSelectionOrigin =
	(typeof PIPELINE_REVIEW_SELECTION_ORIGINS)[number];

export const PIPELINE_REVIEW_SELECTION_STATES = [
	"empty",
	"missing",
	"ready",
] as const;

export type PipelineReviewSelectionState =
	(typeof PIPELINE_REVIEW_SELECTION_STATES)[number];

export const PIPELINE_REVIEW_ROW_KINDS = ["pending", "processed"] as const;

export type PipelineReviewRowKind = (typeof PIPELINE_REVIEW_ROW_KINDS)[number];

export const PIPELINE_REVIEW_LEGITIMACY_VALUES = [
	"High Confidence",
	"Proceed with Caution",
	"Suspicious",
] as const;

export type PipelineReviewLegitimacy =
	(typeof PIPELINE_REVIEW_LEGITIMACY_VALUES)[number];

export const PIPELINE_REVIEW_WARNING_CODES = [
	"caution-legitimacy",
	"low-score",
	"missing-pdf",
	"missing-report",
	"stale-selection",
	"suspicious-legitimacy",
] as const;

export type PipelineReviewWarningCode =
	(typeof PIPELINE_REVIEW_WARNING_CODES)[number];

export type PipelineReviewArtifactLink = {
	exists: boolean;
	message: string;
	repoRelativePath: string | null;
};

export type PipelineReviewReportHeader = {
	archetype: string | null;
	date: string | null;
	legitimacy: PipelineReviewLegitimacy | null;
	pdf: PipelineReviewArtifactLink;
	score: number | null;
	title: string | null;
	url: string | null;
	verification: string | null;
};

export type PipelineReviewWarningItem = {
	code: PipelineReviewWarningCode;
	message: string;
};

export type PipelineReviewRowPreview = {
	company: string | null;
	kind: PipelineReviewRowKind;
	legitimacy: PipelineReviewLegitimacy | null;
	pdf: PipelineReviewArtifactLink;
	report: PipelineReviewArtifactLink;
	reportNumber: string | null;
	role: string | null;
	score: number | null;
	selected: boolean;
	url: string;
	verification: string | null;
	warningCount: number;
	warnings: PipelineReviewWarningItem[];
};

export type PipelineReviewSelectedRow = PipelineReviewRowPreview & {
	header: PipelineReviewReportHeader | null;
	sourceLine: string;
};

export type PipelineReviewSelectedDetail = {
	message: string;
	origin: PipelineReviewSelectionOrigin;
	requestedReportNumber: string | null;
	requestedUrl: string | null;
	row: PipelineReviewSelectedRow | null;
	state: PipelineReviewSelectionState;
};

export type PipelineReviewShortlistBucketCounts = {
	adjacentOrNoisy: number | null;
	possibleFit: number | null;
	strongestFit: number | null;
};

export type PipelineReviewShortlistEntry = {
	bucketLabel: string;
	company: string | null;
	reasonSummary: string | null;
	role: string;
	url: string;
};

export type PipelineReviewShortlistSummary = {
	available: boolean;
	bucketCounts: PipelineReviewShortlistBucketCounts;
	campaignGuidance: string | null;
	generatedBy: string | null;
	lastRefreshed: string | null;
	message: string;
	topRoles: PipelineReviewShortlistEntry[];
};

export type PipelineReviewSummaryPayload = {
	filters: {
		limit: number;
		offset: number;
		reportNumber: string | null;
		section: PipelineReviewQueueSection;
		sort: PipelineReviewSort;
		url: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	queue: {
		counts: {
			malformed: number;
			pending: number;
			processed: number;
		};
		hasMore: boolean;
		items: PipelineReviewRowPreview[];
		limit: number;
		offset: number;
		section: PipelineReviewQueueSection;
		sort: PipelineReviewSort;
		totalCount: number;
	};
	selectedDetail: PipelineReviewSelectedDetail;
	service: string;
	sessionId: string;
	shortlist: PipelineReviewShortlistSummary;
	status: StartupStatus;
};

export type PipelineReviewApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";

export type PipelineReviewErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: PipelineReviewApiErrorStatus;
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
		"pipeline-review startup status",
	);
}

function parseArtifactLink(value: unknown): PipelineReviewArtifactLink {
	const record = assertRecord(value, "pipeline-review artifact link");

	return {
		exists: readBoolean(record, "exists"),
		message: readString(record, "message"),
		repoRelativePath: readNullableString(record, "repoRelativePath"),
	};
}

function parseReportHeader(value: unknown): PipelineReviewReportHeader {
	const record = assertRecord(value, "pipeline-review report header");
	const legitimacy = record.legitimacy;

	if (legitimacy !== null && typeof legitimacy !== "string") {
		throw new Error(
			"Expected report-header legitimacy to be a string or null.",
		);
	}

	if (
		legitimacy !== null &&
		!PIPELINE_REVIEW_LEGITIMACY_VALUES.includes(
			legitimacy as PipelineReviewLegitimacy,
		)
	) {
		throw new Error(`Unsupported report-header legitimacy: ${legitimacy}`);
	}

	return {
		archetype: readNullableString(record, "archetype"),
		date: readNullableString(record, "date"),
		legitimacy: legitimacy as PipelineReviewLegitimacy | null,
		pdf: parseArtifactLink(record.pdf),
		score: readNullableNumber(record, "score"),
		title: readNullableString(record, "title"),
		url: readNullableString(record, "url"),
		verification: readNullableString(record, "verification"),
	};
}

function parseWarningItem(value: unknown): PipelineReviewWarningItem {
	const record = assertRecord(value, "pipeline-review warning item");

	return {
		code: readEnum(
			record,
			"code",
			PIPELINE_REVIEW_WARNING_CODES,
			"pipeline-review warning code",
		),
		message: readString(record, "message"),
	};
}

function parseRowPreview(value: unknown): PipelineReviewRowPreview {
	const record = assertRecord(value, "pipeline-review row preview");
	const warnings = record.warnings;
	const legitimacy = record.legitimacy;

	if (!Array.isArray(warnings)) {
		throw new Error("Expected pipeline-review row warnings to be an array.");
	}

	if (legitimacy !== null && typeof legitimacy !== "string") {
		throw new Error(
			"Expected pipeline-review row legitimacy to be a string or null.",
		);
	}

	if (
		legitimacy !== null &&
		!PIPELINE_REVIEW_LEGITIMACY_VALUES.includes(
			legitimacy as PipelineReviewLegitimacy,
		)
	) {
		throw new Error(`Unsupported pipeline-review legitimacy: ${legitimacy}`);
	}

	return {
		company: readNullableString(record, "company"),
		kind: readEnum(
			record,
			"kind",
			PIPELINE_REVIEW_ROW_KINDS,
			"pipeline-review row kind",
		),
		legitimacy: legitimacy as PipelineReviewLegitimacy | null,
		pdf: parseArtifactLink(record.pdf),
		report: parseArtifactLink(record.report),
		reportNumber: readNullableString(record, "reportNumber"),
		role: readNullableString(record, "role"),
		score: readNullableNumber(record, "score"),
		selected: readBoolean(record, "selected"),
		url: readString(record, "url"),
		verification: readNullableString(record, "verification"),
		warningCount: readNumber(record, "warningCount"),
		warnings: warnings.map((warning) => parseWarningItem(warning)),
	};
}

function parseSelectedRow(value: unknown): PipelineReviewSelectedRow {
	const record = assertRecord(value, "pipeline-review selected row");
	const preview = parseRowPreview(value);

	return {
		...preview,
		header: readNullableObject(record, "header", parseReportHeader),
		sourceLine: readString(record, "sourceLine"),
	};
}

function parseSelectedDetail(value: unknown): PipelineReviewSelectedDetail {
	const record = assertRecord(value, "pipeline-review selected detail");

	return {
		message: readString(record, "message"),
		origin: readEnum(
			record,
			"origin",
			PIPELINE_REVIEW_SELECTION_ORIGINS,
			"pipeline-review selection origin",
		),
		requestedReportNumber: readNullableString(record, "requestedReportNumber"),
		requestedUrl: readNullableString(record, "requestedUrl"),
		row: readNullableObject(record, "row", parseSelectedRow),
		state: readEnum(
			record,
			"state",
			PIPELINE_REVIEW_SELECTION_STATES,
			"pipeline-review selection state",
		),
	};
}

function parseShortlistBucketCounts(
	value: unknown,
): PipelineReviewShortlistBucketCounts {
	const record = assertRecord(value, "pipeline-review shortlist bucket counts");

	return {
		adjacentOrNoisy: readNullableNumber(record, "adjacentOrNoisy"),
		possibleFit: readNullableNumber(record, "possibleFit"),
		strongestFit: readNullableNumber(record, "strongestFit"),
	};
}

function parseShortlistEntry(value: unknown): PipelineReviewShortlistEntry {
	const record = assertRecord(value, "pipeline-review shortlist entry");

	return {
		bucketLabel: readString(record, "bucketLabel"),
		company: readNullableString(record, "company"),
		reasonSummary: readNullableString(record, "reasonSummary"),
		role: readString(record, "role"),
		url: readString(record, "url"),
	};
}

function parseShortlistSummary(value: unknown): PipelineReviewShortlistSummary {
	const record = assertRecord(value, "pipeline-review shortlist summary");
	const topRoles = record.topRoles;

	if (!Array.isArray(topRoles)) {
		throw new Error("Expected shortlist topRoles to be an array.");
	}

	return {
		available: readBoolean(record, "available"),
		bucketCounts: parseShortlistBucketCounts(record.bucketCounts),
		campaignGuidance: readNullableString(record, "campaignGuidance"),
		generatedBy: readNullableString(record, "generatedBy"),
		lastRefreshed: readNullableString(record, "lastRefreshed"),
		message: readString(record, "message"),
		topRoles: topRoles.map((entry) => parseShortlistEntry(entry)),
	};
}

export function parsePipelineReviewSummaryPayload(
	value: unknown,
): PipelineReviewSummaryPayload {
	const record = assertRecord(value, "pipeline-review payload");
	const filters = assertRecord(record.filters, "pipeline-review filters");
	const queue = assertRecord(record.queue, "pipeline-review queue");
	const counts = assertRecord(queue.counts, "pipeline-review queue counts");
	const items = queue.items;

	if (!Array.isArray(items)) {
		throw new Error("Expected pipeline-review queue items to be an array.");
	}

	return {
		filters: {
			limit: readNumber(filters, "limit"),
			offset: readNumber(filters, "offset"),
			reportNumber: readNullableString(filters, "reportNumber"),
			section: readEnum(
				filters,
				"section",
				PIPELINE_REVIEW_QUEUE_SECTIONS,
				"pipeline-review queue section",
			),
			sort: readEnum(
				filters,
				"sort",
				PIPELINE_REVIEW_SORT_VALUES,
				"pipeline-review sort",
			),
			url: readNullableString(filters, "url"),
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		queue: {
			counts: {
				malformed: readNumber(counts, "malformed"),
				pending: readNumber(counts, "pending"),
				processed: readNumber(counts, "processed"),
			},
			hasMore: readBoolean(queue, "hasMore"),
			items: items.map((entry) => parseRowPreview(entry)),
			limit: readNumber(queue, "limit"),
			offset: readNumber(queue, "offset"),
			section: readEnum(
				queue,
				"section",
				PIPELINE_REVIEW_QUEUE_SECTIONS,
				"pipeline-review queue section",
			),
			sort: readEnum(
				queue,
				"sort",
				PIPELINE_REVIEW_SORT_VALUES,
				"pipeline-review queue sort",
			),
			totalCount: readNumber(queue, "totalCount"),
		},
		selectedDetail: parseSelectedDetail(record.selectedDetail),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		shortlist: parseShortlistSummary(record.shortlist),
		status: readStartupStatus(record, "status"),
	};
}

export function parsePipelineReviewErrorPayload(
	value: unknown,
): PipelineReviewErrorPayload {
	const record = assertRecord(value, "pipeline-review error payload");
	const error = assertRecord(record.error, "pipeline-review error");

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
			"pipeline-review error status",
		),
	};
}

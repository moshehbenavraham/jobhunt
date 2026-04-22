import type { StartupStatus } from "../boot/startup-types";

export const TRACKER_WORKSPACE_SORT_VALUES = [
	"company",
	"date",
	"score",
	"status",
] as const;

export type TrackerWorkspaceSort =
	(typeof TRACKER_WORKSPACE_SORT_VALUES)[number];

export const TRACKER_WORKSPACE_SELECTION_ORIGINS = [
	"entry-number",
	"none",
] as const;

export type TrackerWorkspaceSelectionOrigin =
	(typeof TRACKER_WORKSPACE_SELECTION_ORIGINS)[number];

export const TRACKER_WORKSPACE_SELECTION_STATES = [
	"empty",
	"missing",
	"ready",
] as const;

export type TrackerWorkspaceSelectionState =
	(typeof TRACKER_WORKSPACE_SELECTION_STATES)[number];

export const TRACKER_WORKSPACE_WARNING_CODES = [
	"missing-pdf",
	"missing-report",
	"non-canonical-status",
	"stale-selection",
] as const;

export type TrackerWorkspaceWarningCode =
	(typeof TRACKER_WORKSPACE_WARNING_CODES)[number];

export const TRACKER_WORKSPACE_LEGITIMACY_VALUES = [
	"High Confidence",
	"Proceed with Caution",
	"Suspicious",
] as const;

export type TrackerWorkspaceLegitimacy =
	(typeof TRACKER_WORKSPACE_LEGITIMACY_VALUES)[number];

export const TRACKER_WORKSPACE_ACTION_VALUES = [
	"dedup-tracker-entries",
	"merge-tracker-additions",
	"normalize-tracker-statuses",
	"update-status",
	"verify-tracker-pipeline",
] as const;

export type TrackerWorkspaceAction =
	(typeof TRACKER_WORKSPACE_ACTION_VALUES)[number];

export type TrackerWorkspaceStatusOption = {
	count: number;
	id: string;
	label: string;
};

export type TrackerWorkspaceArtifactLink = {
	exists: boolean;
	message: string;
	repoRelativePath: string | null;
};

export type TrackerWorkspaceReportHeader = {
	date: string | null;
	legitimacy: TrackerWorkspaceLegitimacy | null;
	pdf: TrackerWorkspaceArtifactLink;
	score: number | null;
	title: string | null;
	url: string | null;
	verification: string | null;
};

export type TrackerWorkspaceWarningItem = {
	code: TrackerWorkspaceWarningCode;
	message: string;
};

export type TrackerWorkspaceRowPreview = {
	company: string;
	date: string;
	entryNumber: number;
	pdf: TrackerWorkspaceArtifactLink;
	report: TrackerWorkspaceArtifactLink;
	role: string;
	score: number | null;
	scoreLabel: string;
	selected: boolean;
	status: string;
	warningCount: number;
	warnings: TrackerWorkspaceWarningItem[];
};

export type TrackerWorkspaceSelectedRow = TrackerWorkspaceRowPreview & {
	header: TrackerWorkspaceReportHeader | null;
	notes: string;
	sourceLine: string;
};

export type TrackerWorkspaceSelectedDetail = {
	message: string;
	origin: TrackerWorkspaceSelectionOrigin;
	requestedEntryNumber: number | null;
	row: TrackerWorkspaceSelectedRow | null;
	state: TrackerWorkspaceSelectionState;
};

export type TrackerWorkspacePendingAdditionItem = {
	entryNumber: number;
	fileName: string;
	repoRelativePath: string;
};

export type TrackerWorkspacePendingAdditionSummary = {
	count: number;
	items: TrackerWorkspacePendingAdditionItem[];
	message: string;
};

export type TrackerWorkspaceSummaryPayload = {
	filters: {
		entryNumber: number | null;
		limit: number;
		offset: number;
		search: string | null;
		sort: TrackerWorkspaceSort;
		status: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	pendingAdditions: TrackerWorkspacePendingAdditionSummary;
	rows: {
		filteredCount: number;
		hasMore: boolean;
		items: TrackerWorkspaceRowPreview[];
		limit: number;
		offset: number;
		sort: TrackerWorkspaceSort;
		totalCount: number;
	};
	selectedDetail: TrackerWorkspaceSelectedDetail;
	service: string;
	sessionId: string;
	status: StartupStatus;
	statusOptions: TrackerWorkspaceStatusOption[];
};

export type TrackerWorkspaceActionPayload = {
	actionResult: {
		action: TrackerWorkspaceAction;
		dryRun: boolean;
		entryNumber: number | null;
		message: string;
		warnings: Array<{
			code: string;
			message: string;
		}>;
	};
	generatedAt: string;
	message: string;
	ok: true;
	service: string;
	sessionId: string;
	status: StartupStatus;
};

export type TrackerWorkspaceApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";

export type TrackerWorkspaceErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: TrackerWorkspaceApiErrorStatus;
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
		"tracker-workspace startup status",
	);
}

function parseArtifactLink(value: unknown): TrackerWorkspaceArtifactLink {
	const record = assertRecord(value, "tracker-workspace artifact link");

	return {
		exists: readBoolean(record, "exists"),
		message: readString(record, "message"),
		repoRelativePath: readNullableString(record, "repoRelativePath"),
	};
}

function parseWarningItem(value: unknown): TrackerWorkspaceWarningItem {
	const record = assertRecord(value, "tracker-workspace warning");

	return {
		code: readEnum(
			record,
			"code",
			TRACKER_WORKSPACE_WARNING_CODES,
			"tracker-workspace warning code",
		),
		message: readString(record, "message"),
	};
}

function parseReportHeader(value: unknown): TrackerWorkspaceReportHeader {
	const record = assertRecord(value, "tracker-workspace report header");
	const legitimacy = record.legitimacy;

	if (
		legitimacy !== null &&
		!TRACKER_WORKSPACE_LEGITIMACY_VALUES.includes(
			legitimacy as TrackerWorkspaceLegitimacy,
		)
	) {
		throw new Error(
			`Unsupported tracker-workspace legitimacy value: ${legitimacy}`,
		);
	}

	return {
		date: readNullableString(record, "date"),
		legitimacy:
			legitimacy === null ? null : (legitimacy as TrackerWorkspaceLegitimacy),
		pdf: parseArtifactLink(record.pdf),
		score: readNullableNumber(record, "score"),
		title: readNullableString(record, "title"),
		url: readNullableString(record, "url"),
		verification: readNullableString(record, "verification"),
	};
}

function parseRowPreview(value: unknown): TrackerWorkspaceRowPreview {
	const record = assertRecord(value, "tracker-workspace row preview");
	const warnings = record.warnings;

	if (!Array.isArray(warnings)) {
		throw new Error("Tracker-workspace row warnings must be an array.");
	}

	return {
		company: readString(record, "company"),
		date: readString(record, "date"),
		entryNumber: readNumber(record, "entryNumber"),
		pdf: parseArtifactLink(record.pdf),
		report: parseArtifactLink(record.report),
		role: readString(record, "role"),
		score: readNullableNumber(record, "score"),
		scoreLabel: readString(record, "scoreLabel"),
		selected: readBoolean(record, "selected"),
		status: readString(record, "status"),
		warningCount: readNumber(record, "warningCount"),
		warnings: warnings.map((warning) => parseWarningItem(warning)),
	};
}

function parseSelectedRow(value: unknown): TrackerWorkspaceSelectedRow {
	const record = assertRecord(value, "tracker-workspace selected row");

	return {
		...parseRowPreview(record),
		header: readNullableObject(record, "header", parseReportHeader),
		notes: readString(record, "notes"),
		sourceLine: readString(record, "sourceLine"),
	};
}

function parseSelectedDetail(value: unknown): TrackerWorkspaceSelectedDetail {
	const record = assertRecord(value, "tracker-workspace selected detail");

	return {
		message: readString(record, "message"),
		origin: readEnum(
			record,
			"origin",
			TRACKER_WORKSPACE_SELECTION_ORIGINS,
			"tracker-workspace selection origin",
		),
		requestedEntryNumber: readNullableNumber(record, "requestedEntryNumber"),
		row: readNullableObject(record, "row", parseSelectedRow),
		state: readEnum(
			record,
			"state",
			TRACKER_WORKSPACE_SELECTION_STATES,
			"tracker-workspace selection state",
		),
	};
}

function parsePendingAdditionItem(
	value: unknown,
): TrackerWorkspacePendingAdditionItem {
	const record = assertRecord(value, "tracker-workspace pending addition");

	return {
		entryNumber: readNumber(record, "entryNumber"),
		fileName: readString(record, "fileName"),
		repoRelativePath: readString(record, "repoRelativePath"),
	};
}

function parsePendingAdditionSummary(
	value: unknown,
): TrackerWorkspacePendingAdditionSummary {
	const record = assertRecord(
		value,
		"tracker-workspace pending addition summary",
	);
	const items = record.items;

	if (!Array.isArray(items)) {
		throw new Error("Tracker-workspace pending additions must be an array.");
	}

	return {
		count: readNumber(record, "count"),
		items: items.map((item) => parsePendingAdditionItem(item)),
		message: readString(record, "message"),
	};
}

function parseStatusOption(value: unknown): TrackerWorkspaceStatusOption {
	const record = assertRecord(value, "tracker-workspace status option");

	return {
		count: readNumber(record, "count"),
		id: readString(record, "id"),
		label: readString(record, "label"),
	};
}

export function parseTrackerWorkspaceSummaryPayload(
	value: unknown,
): TrackerWorkspaceSummaryPayload {
	const record = assertRecord(value, "tracker-workspace payload");
	const filters = assertRecord(record.filters, "tracker-workspace filters");
	const rows = assertRecord(record.rows, "tracker-workspace rows");
	const items = rows.items;
	const statusOptions = record.statusOptions;

	if (!Array.isArray(items) || !Array.isArray(statusOptions)) {
		throw new Error("Tracker-workspace arrays are missing.");
	}

	return {
		filters: {
			entryNumber: readNullableNumber(filters, "entryNumber"),
			limit: readNumber(filters, "limit"),
			offset: readNumber(filters, "offset"),
			search: readNullableString(filters, "search"),
			sort: readEnum(
				filters,
				"sort",
				TRACKER_WORKSPACE_SORT_VALUES,
				"tracker-workspace sort",
			),
			status: readNullableString(filters, "status"),
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		pendingAdditions: parsePendingAdditionSummary(record.pendingAdditions),
		rows: {
			filteredCount: readNumber(rows, "filteredCount"),
			hasMore: readBoolean(rows, "hasMore"),
			items: items.map((item) => parseRowPreview(item)),
			limit: readNumber(rows, "limit"),
			offset: readNumber(rows, "offset"),
			sort: readEnum(
				rows,
				"sort",
				TRACKER_WORKSPACE_SORT_VALUES,
				"tracker-workspace sort",
			),
			totalCount: readNumber(rows, "totalCount"),
		},
		selectedDetail: parseSelectedDetail(record.selectedDetail),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
		statusOptions: statusOptions.map((entry) => parseStatusOption(entry)),
	};
}

export function parseTrackerWorkspaceActionPayload(
	value: unknown,
): TrackerWorkspaceActionPayload {
	const record = assertRecord(value, "tracker-workspace action payload");
	const actionResult = assertRecord(
		record.actionResult,
		"tracker-workspace action result",
	);
	const warnings = actionResult.warnings;

	if (!Array.isArray(warnings)) {
		throw new Error("Tracker-workspace action warnings must be an array.");
	}

	return {
		actionResult: {
			action: readEnum(
				actionResult,
				"action",
				TRACKER_WORKSPACE_ACTION_VALUES,
				"tracker-workspace action",
			),
			dryRun: readBoolean(actionResult, "dryRun"),
			entryNumber: readNullableNumber(actionResult, "entryNumber"),
			message: readString(actionResult, "message"),
			warnings: warnings.map((warning) => {
				const warningRecord = assertRecord(
					warning,
					"tracker-workspace action warning",
				);

				return {
					code: readString(warningRecord, "code"),
					message: readString(warningRecord, "message"),
				};
			}),
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
	};
}

export function parseTrackerWorkspaceErrorPayload(
	value: unknown,
): TrackerWorkspaceErrorPayload {
	const record = assertRecord(value, "tracker-workspace error payload");
	const error = assertRecord(record.error, "tracker-workspace error");

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
			"tracker-workspace error status",
		),
	};
}

import type { StartupStatus } from "../boot/startup-types";
import {
	TRACKER_WORKSPACE_LEGITIMACY_VALUES,
	type TrackerWorkspaceLegitimacy,
} from "../tracker/tracker-workspace-types";

export const BATCH_WORKSPACE_RUN_STATE_VALUES = [
	"idle",
	"queued",
	"running",
	"approval-paused",
	"failed",
	"completed",
] as const;

export type BatchWorkspaceRunState =
	(typeof BATCH_WORKSPACE_RUN_STATE_VALUES)[number];

export const BATCH_WORKSPACE_ITEM_STATUS_VALUES = [
	"completed",
	"failed",
	"pending",
	"partial",
	"processing",
	"retryable-failed",
	"skipped",
] as const;

export type BatchWorkspaceItemStatus =
	(typeof BATCH_WORKSPACE_ITEM_STATUS_VALUES)[number];

export const BATCH_WORKSPACE_STATUS_FILTER_VALUES = [
	"all",
	...BATCH_WORKSPACE_ITEM_STATUS_VALUES,
] as const;

export type BatchWorkspaceStatusFilter =
	(typeof BATCH_WORKSPACE_STATUS_FILTER_VALUES)[number];

export const BATCH_WORKSPACE_SELECTION_ORIGIN_VALUES = [
	"item-id",
	"none",
] as const;

export type BatchWorkspaceSelectionOrigin =
	(typeof BATCH_WORKSPACE_SELECTION_ORIGIN_VALUES)[number];

export const BATCH_WORKSPACE_SELECTION_STATE_VALUES = [
	"empty",
	"missing",
	"ready",
] as const;

export type BatchWorkspaceSelectionState =
	(typeof BATCH_WORKSPACE_SELECTION_STATE_VALUES)[number];

export const BATCH_WORKSPACE_WARNING_CODES = [
	"approval-paused",
	"closeout-warning",
	"merge-blocked",
	"missing-pdf-artifact",
	"missing-report-artifact",
	"missing-result",
	"missing-tracker-artifact",
	"partial-result",
	"result-parse-failed",
	"retryable-failed",
	"stale-selection",
] as const;

export type BatchWorkspaceWarningCode =
	(typeof BATCH_WORKSPACE_WARNING_CODES)[number];

export const BATCH_WORKSPACE_ACTION_VALUES = [
	"merge-tracker-additions",
	"resume-run-pending",
	"retry-failed",
	"verify-tracker-pipeline",
] as const;

export type BatchWorkspaceAction =
	(typeof BATCH_WORKSPACE_ACTION_VALUES)[number];

export const BATCH_WORKSPACE_ACTION_REQUEST_STATUS_VALUES = [
	"accepted",
	"already-queued",
	"completed",
] as const;

export type BatchWorkspaceActionRequestStatus =
	(typeof BATCH_WORKSPACE_ACTION_REQUEST_STATUS_VALUES)[number];

export const BATCH_WORKSPACE_MODE_VALUES = [
	"retry-failed",
	"run-pending",
] as const;

export type BatchWorkspaceMode = (typeof BATCH_WORKSPACE_MODE_VALUES)[number];

export type BatchWorkspaceStatusOption = {
	count: number;
	id: BatchWorkspaceStatusFilter;
	label: string;
};

export type BatchWorkspaceArtifactLink = {
	exists: boolean;
	message: string;
	repoRelativePath: string | null;
};

export type BatchWorkspaceItemArtifacts = {
	pdf: BatchWorkspaceArtifactLink;
	report: BatchWorkspaceArtifactLink;
	tracker: BatchWorkspaceArtifactLink;
};

export type BatchWorkspaceWarningItem = {
	code: BatchWorkspaceWarningCode;
	message: string;
};

export type BatchWorkspaceRunCheckpoint = {
	completedItemCount: number;
	cursor: number | null;
	lastProcessedItemId: number | null;
	updatedAt: string | null;
};

export type BatchWorkspaceCounts = {
	completed: number;
	failed: number;
	partial: number;
	pending: number;
	processing: number;
	retryableFailed: number;
	skipped: number;
	total: number;
};

export type BatchWorkspaceRunSummary = {
	approvalId: string | null;
	checkpoint: BatchWorkspaceRunCheckpoint;
	completedAt: string | null;
	counts: BatchWorkspaceCounts;
	dryRun: boolean;
	jobId: string | null;
	message: string;
	mode: BatchWorkspaceMode | null;
	runId: string | null;
	sessionId: string | null;
	startedAt: string | null;
	state: BatchWorkspaceRunState;
	updatedAt: string | null;
	warnings: BatchWorkspaceWarningItem[];
};

export type BatchWorkspaceDraftSummary = {
	available: boolean;
	counts: BatchWorkspaceCounts;
	firstRunnableItemId: number | null;
	message: string;
	pendingTrackerAdditionCount: number;
	totalCount: number;
};

export type BatchWorkspaceActionAvailability = {
	action: BatchWorkspaceAction;
	available: boolean;
	message: string;
};

export type BatchWorkspaceCloseoutSummary = {
	mergeBlocked: boolean;
	message: string;
	pendingTrackerAdditionCount: number;
	warnings: BatchWorkspaceWarningItem[];
};

export type BatchWorkspaceItemPreview = {
	artifacts: BatchWorkspaceItemArtifacts;
	company: string | null;
	completedAt: string | null;
	error: string | null;
	id: number;
	legitimacy: TrackerWorkspaceLegitimacy | null;
	reportNumber: string | null;
	retries: number;
	role: string | null;
	score: number | null;
	selected: boolean;
	startedAt: string | null;
	status: BatchWorkspaceItemStatus;
	url: string;
	warningCount: number;
	warnings: BatchWorkspaceWarningItem[];
};

export type BatchWorkspaceSelectedItem = BatchWorkspaceItemPreview & {
	notes: string | null;
	rawStateError: string | null;
	resultWarnings: string[];
	source: string | null;
};

export type BatchWorkspaceSelectedDetail = {
	message: string;
	origin: BatchWorkspaceSelectionOrigin;
	requestedItemId: number | null;
	row: BatchWorkspaceSelectedItem | null;
	state: BatchWorkspaceSelectionState;
};

export type BatchWorkspaceSummaryPayload = {
	actions: BatchWorkspaceActionAvailability[];
	closeout: BatchWorkspaceCloseoutSummary;
	draft: BatchWorkspaceDraftSummary;
	filters: {
		itemId: number | null;
		limit: number;
		offset: number;
		status: BatchWorkspaceStatusFilter;
	};
	generatedAt: string;
	items: {
		filteredCount: number;
		hasMore: boolean;
		items: BatchWorkspaceItemPreview[];
		limit: number;
		offset: number;
		totalCount: number;
	};
	message: string;
	ok: true;
	run: BatchWorkspaceRunSummary;
	selectedDetail: BatchWorkspaceSelectedDetail;
	service: string;
	sessionId: string;
	status: StartupStatus;
	statusOptions: BatchWorkspaceStatusOption[];
};

export type BatchWorkspaceActionWarning = {
	code: string;
	message: string;
};

export type BatchWorkspaceActionPayload = {
	actionResult: {
		action: BatchWorkspaceAction;
		itemId: number | null;
		jobId: string | null;
		message: string;
		revalidation: {
			itemId: number | null;
			nextPollMs: number | null;
			status: BatchWorkspaceStatusFilter | null;
		};
		requestStatus: BatchWorkspaceActionRequestStatus;
		runId: string | null;
		warnings: BatchWorkspaceActionWarning[];
	};
	generatedAt: string;
	message: string;
	ok: true;
	service: string;
	sessionId: string;
	status: StartupStatus;
};

export type BatchWorkspaceApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";

export type BatchWorkspaceErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: BatchWorkspaceApiErrorStatus;
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
		"batch-workspace startup status",
	);
}

function parseArtifactLink(value: unknown): BatchWorkspaceArtifactLink {
	const record = assertRecord(value, "batch-workspace artifact link");

	return {
		exists: readBoolean(record, "exists"),
		message: readString(record, "message"),
		repoRelativePath: readNullableString(record, "repoRelativePath"),
	};
}

function parseItemArtifacts(value: unknown): BatchWorkspaceItemArtifacts {
	const record = assertRecord(value, "batch-workspace item artifacts");

	return {
		pdf: parseArtifactLink(record.pdf),
		report: parseArtifactLink(record.report),
		tracker: parseArtifactLink(record.tracker),
	};
}

function parseWarningItem(value: unknown): BatchWorkspaceWarningItem {
	const record = assertRecord(value, "batch-workspace warning");

	return {
		code: readEnum(
			record,
			"code",
			BATCH_WORKSPACE_WARNING_CODES,
			"batch-workspace warning code",
		),
		message: readString(record, "message"),
	};
}

function parseCounts(value: unknown): BatchWorkspaceCounts {
	const record = assertRecord(value, "batch-workspace counts");

	return {
		completed: readNumber(record, "completed"),
		failed: readNumber(record, "failed"),
		partial: readNumber(record, "partial"),
		pending: readNumber(record, "pending"),
		processing: readNumber(record, "processing"),
		retryableFailed: readNumber(record, "retryableFailed"),
		skipped: readNumber(record, "skipped"),
		total: readNumber(record, "total"),
	};
}

function parseRunCheckpoint(value: unknown): BatchWorkspaceRunCheckpoint {
	const record = assertRecord(value, "batch-workspace run checkpoint");

	return {
		completedItemCount: readNumber(record, "completedItemCount"),
		cursor: readNullableNumber(record, "cursor"),
		lastProcessedItemId: readNullableNumber(record, "lastProcessedItemId"),
		updatedAt: readNullableString(record, "updatedAt"),
	};
}

function parseRunSummary(value: unknown): BatchWorkspaceRunSummary {
	const record = assertRecord(value, "batch-workspace run summary");
	const warnings = record.warnings;

	if (!Array.isArray(warnings)) {
		throw new Error("Batch-workspace run warnings must be an array.");
	}

	return {
		approvalId: readNullableString(record, "approvalId"),
		checkpoint: parseRunCheckpoint(record.checkpoint),
		completedAt: readNullableString(record, "completedAt"),
		counts: parseCounts(record.counts),
		dryRun: readBoolean(record, "dryRun"),
		jobId: readNullableString(record, "jobId"),
		message: readString(record, "message"),
		mode: readNullableObject(record, "mode", (modeValue) =>
			readEnum(
				{ mode: modeValue },
				"mode",
				BATCH_WORKSPACE_MODE_VALUES,
				"batch-workspace mode",
			),
		),
		runId: readNullableString(record, "runId"),
		sessionId: readNullableString(record, "sessionId"),
		startedAt: readNullableString(record, "startedAt"),
		state: readEnum(
			record,
			"state",
			BATCH_WORKSPACE_RUN_STATE_VALUES,
			"batch-workspace run state",
		),
		updatedAt: readNullableString(record, "updatedAt"),
		warnings: warnings.map((warning) => parseWarningItem(warning)),
	};
}

function parseDraftSummary(value: unknown): BatchWorkspaceDraftSummary {
	const record = assertRecord(value, "batch-workspace draft summary");

	return {
		available: readBoolean(record, "available"),
		counts: parseCounts(record.counts),
		firstRunnableItemId: readNullableNumber(record, "firstRunnableItemId"),
		message: readString(record, "message"),
		pendingTrackerAdditionCount: readNumber(
			record,
			"pendingTrackerAdditionCount",
		),
		totalCount: readNumber(record, "totalCount"),
	};
}

function parseActionAvailability(
	value: unknown,
): BatchWorkspaceActionAvailability {
	const record = assertRecord(value, "batch-workspace action availability");

	return {
		action: readEnum(
			record,
			"action",
			BATCH_WORKSPACE_ACTION_VALUES,
			"batch-workspace action",
		),
		available: readBoolean(record, "available"),
		message: readString(record, "message"),
	};
}

function parseCloseoutSummary(value: unknown): BatchWorkspaceCloseoutSummary {
	const record = assertRecord(value, "batch-workspace closeout summary");
	const warnings = record.warnings;

	if (!Array.isArray(warnings)) {
		throw new Error("Batch-workspace closeout warnings must be an array.");
	}

	return {
		mergeBlocked: readBoolean(record, "mergeBlocked"),
		message: readString(record, "message"),
		pendingTrackerAdditionCount: readNumber(
			record,
			"pendingTrackerAdditionCount",
		),
		warnings: warnings.map((warning) => parseWarningItem(warning)),
	};
}

function parseLegitimacy(value: unknown): TrackerWorkspaceLegitimacy | null {
	if (value === null) {
		return null;
	}

	if (
		typeof value !== "string" ||
		!TRACKER_WORKSPACE_LEGITIMACY_VALUES.includes(
			value as TrackerWorkspaceLegitimacy,
		)
	) {
		throw new Error(`Unsupported batch-workspace legitimacy value: ${value}`);
	}

	return value as TrackerWorkspaceLegitimacy;
}

function parseItemPreview(value: unknown): BatchWorkspaceItemPreview {
	const record = assertRecord(value, "batch-workspace item preview");
	const warnings = record.warnings;

	if (!Array.isArray(warnings)) {
		throw new Error("Batch-workspace item warnings must be an array.");
	}

	return {
		artifacts: parseItemArtifacts(record.artifacts),
		company: readNullableString(record, "company"),
		completedAt: readNullableString(record, "completedAt"),
		error: readNullableString(record, "error"),
		id: readNumber(record, "id"),
		legitimacy: parseLegitimacy(record.legitimacy),
		reportNumber: readNullableString(record, "reportNumber"),
		retries: readNumber(record, "retries"),
		role: readNullableString(record, "role"),
		score: readNullableNumber(record, "score"),
		selected: readBoolean(record, "selected"),
		startedAt: readNullableString(record, "startedAt"),
		status: readEnum(
			record,
			"status",
			BATCH_WORKSPACE_ITEM_STATUS_VALUES,
			"batch-workspace item status",
		),
		url: readString(record, "url"),
		warningCount: readNumber(record, "warningCount"),
		warnings: warnings.map((warning) => parseWarningItem(warning)),
	};
}

function parseSelectedItem(value: unknown): BatchWorkspaceSelectedItem {
	const record = assertRecord(value, "batch-workspace selected item");
	const resultWarnings = record.resultWarnings;

	if (!Array.isArray(resultWarnings)) {
		throw new Error("Batch-workspace result warnings must be an array.");
	}

	return {
		...parseItemPreview(record),
		notes: readNullableString(record, "notes"),
		rawStateError: readNullableString(record, "rawStateError"),
		resultWarnings: resultWarnings.map((entry) => {
			if (typeof entry !== "string") {
				throw new Error(
					"Batch-workspace selected item result warnings must be strings.",
				);
			}

			return entry;
		}),
		source: readNullableString(record, "source"),
	};
}

function parseSelectedDetail(value: unknown): BatchWorkspaceSelectedDetail {
	const record = assertRecord(value, "batch-workspace selected detail");

	return {
		message: readString(record, "message"),
		origin: readEnum(
			record,
			"origin",
			BATCH_WORKSPACE_SELECTION_ORIGIN_VALUES,
			"batch-workspace selection origin",
		),
		requestedItemId: readNullableNumber(record, "requestedItemId"),
		row: readNullableObject(record, "row", parseSelectedItem),
		state: readEnum(
			record,
			"state",
			BATCH_WORKSPACE_SELECTION_STATE_VALUES,
			"batch-workspace selection state",
		),
	};
}

function parseStatusOption(value: unknown): BatchWorkspaceStatusOption {
	const record = assertRecord(value, "batch-workspace status option");

	return {
		count: readNumber(record, "count"),
		id: readEnum(
			record,
			"id",
			BATCH_WORKSPACE_STATUS_FILTER_VALUES,
			"batch-workspace status option",
		),
		label: readString(record, "label"),
	};
}

export function parseBatchWorkspaceSummaryPayload(
	value: unknown,
): BatchWorkspaceSummaryPayload {
	const record = assertRecord(value, "batch-workspace summary payload");
	const filters = assertRecord(record.filters, "batch-workspace filters");
	const items = assertRecord(record.items, "batch-workspace items");
	const actions = record.actions;
	const statusOptions = record.statusOptions;
	const itemRows = items.items;

	if (!Array.isArray(actions) || !Array.isArray(statusOptions)) {
		throw new Error("Batch-workspace arrays are missing.");
	}

	if (!Array.isArray(itemRows)) {
		throw new Error("Batch-workspace item rows must be an array.");
	}

	return {
		actions: actions.map((entry) => parseActionAvailability(entry)),
		closeout: parseCloseoutSummary(record.closeout),
		draft: parseDraftSummary(record.draft),
		filters: {
			itemId: readNullableNumber(filters, "itemId"),
			limit: readNumber(filters, "limit"),
			offset: readNumber(filters, "offset"),
			status: readEnum(
				filters,
				"status",
				BATCH_WORKSPACE_STATUS_FILTER_VALUES,
				"batch-workspace filter status",
			),
		},
		generatedAt: readString(record, "generatedAt"),
		items: {
			filteredCount: readNumber(items, "filteredCount"),
			hasMore: readBoolean(items, "hasMore"),
			items: itemRows.map((entry) => parseItemPreview(entry)),
			limit: readNumber(items, "limit"),
			offset: readNumber(items, "offset"),
			totalCount: readNumber(items, "totalCount"),
		},
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		run: parseRunSummary(record.run),
		selectedDetail: parseSelectedDetail(record.selectedDetail),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
		statusOptions: statusOptions.map((entry) => parseStatusOption(entry)),
	};
}

export function parseBatchWorkspaceActionPayload(
	value: unknown,
): BatchWorkspaceActionPayload {
	const record = assertRecord(value, "batch-workspace action payload");
	const actionResult = assertRecord(
		record.actionResult,
		"batch-workspace action result",
	);
	const revalidation = assertRecord(
		actionResult.revalidation,
		"batch-workspace action revalidation",
	);
	const warnings = actionResult.warnings;

	if (!Array.isArray(warnings)) {
		throw new Error("Batch-workspace action warnings must be an array.");
	}

	return {
		actionResult: {
			action: readEnum(
				actionResult,
				"action",
				BATCH_WORKSPACE_ACTION_VALUES,
				"batch-workspace action result",
			),
			itemId: readNullableNumber(actionResult, "itemId"),
			jobId: readNullableString(actionResult, "jobId"),
			message: readString(actionResult, "message"),
			revalidation: {
				itemId: readNullableNumber(revalidation, "itemId"),
				nextPollMs: readNullableNumber(revalidation, "nextPollMs"),
				status: readNullableObject(revalidation, "status", (statusValue) =>
					readEnum(
						{ status: statusValue },
						"status",
						BATCH_WORKSPACE_STATUS_FILTER_VALUES,
						"batch-workspace revalidation status",
					),
				),
			},
			requestStatus: readEnum(
				actionResult,
				"requestStatus",
				BATCH_WORKSPACE_ACTION_REQUEST_STATUS_VALUES,
				"batch-workspace request status",
			),
			runId: readNullableString(actionResult, "runId"),
			warnings: warnings.map((warning) => {
				const warningRecord = assertRecord(
					warning,
					"batch-workspace action warning",
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

export function parseBatchWorkspaceErrorPayload(
	value: unknown,
): BatchWorkspaceErrorPayload {
	const record = assertRecord(value, "batch-workspace error payload");
	const error = assertRecord(record.error, "batch-workspace error");

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
			"batch-workspace error status",
		),
	};
}

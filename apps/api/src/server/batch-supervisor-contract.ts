import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { BatchExecutionMode } from "../job-runner/workflow-job-contract.js";
import type { StartupStatus } from "./startup-status.js";
import type { TrackerWorkspaceLegitimacy } from "./tracker-workspace-contract.js";

export const batchSupervisorRunStateValues = [
	"idle",
	"queued",
	"running",
	"approval-paused",
	"failed",
	"completed",
] as const;

export type BatchSupervisorRunState =
	(typeof batchSupervisorRunStateValues)[number];

export const batchSupervisorItemStatusValues = [
	"completed",
	"failed",
	"pending",
	"partial",
	"processing",
	"retryable-failed",
	"skipped",
] as const;

export type BatchSupervisorItemStatus =
	(typeof batchSupervisorItemStatusValues)[number];

export const batchSupervisorStatusFilterValues = [
	"all",
	...batchSupervisorItemStatusValues,
] as const;

export type BatchSupervisorStatusFilter =
	(typeof batchSupervisorStatusFilterValues)[number];

export const batchSupervisorSelectionOriginValues = [
	"item-id",
	"none",
] as const;

export type BatchSupervisorSelectionOrigin =
	(typeof batchSupervisorSelectionOriginValues)[number];

export const batchSupervisorSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type BatchSupervisorSelectionState =
	(typeof batchSupervisorSelectionStateValues)[number];

export const batchSupervisorWarningCodeValues = [
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

export type BatchSupervisorWarningCode =
	(typeof batchSupervisorWarningCodeValues)[number];

export const batchSupervisorActionValues = [
	"merge-tracker-additions",
	"resume-run-pending",
	"retry-failed",
	"verify-tracker-pipeline",
] as const;

export type BatchSupervisorAction =
	(typeof batchSupervisorActionValues)[number];

export const batchSupervisorActionRequestStatusValues = [
	"accepted",
	"already-queued",
	"completed",
] as const;

export type BatchSupervisorActionRequestStatus =
	(typeof batchSupervisorActionRequestStatusValues)[number];

export const DEFAULT_BATCH_SUPERVISOR_LIMIT = 12;
export const MAX_BATCH_SUPERVISOR_LIMIT = 20;

export type BatchSupervisorStatusOption = {
	count: number;
	id: BatchSupervisorStatusFilter;
	label: string;
};

export type BatchSupervisorArtifactLink = {
	exists: boolean;
	message: string;
	repoRelativePath: string | null;
};

export type BatchSupervisorItemArtifacts = {
	pdf: BatchSupervisorArtifactLink;
	report: BatchSupervisorArtifactLink;
	tracker: BatchSupervisorArtifactLink;
};

export type BatchSupervisorWarningItem = {
	code: BatchSupervisorWarningCode;
	message: string;
};

export type BatchSupervisorRunCheckpoint = {
	completedItemCount: number;
	cursor: number | null;
	lastProcessedItemId: number | null;
	updatedAt: string | null;
};

export type BatchSupervisorCounts = {
	completed: number;
	failed: number;
	partial: number;
	pending: number;
	processing: number;
	retryableFailed: number;
	skipped: number;
	total: number;
};

export type BatchSupervisorRunSummary = {
	approvalId: string | null;
	checkpoint: BatchSupervisorRunCheckpoint;
	completedAt: string | null;
	counts: BatchSupervisorCounts;
	dryRun: boolean;
	jobId: string | null;
	message: string;
	mode: BatchExecutionMode | null;
	runId: string | null;
	sessionId: string | null;
	startedAt: string | null;
	state: BatchSupervisorRunState;
	updatedAt: string | null;
	warnings: BatchSupervisorWarningItem[];
};

export type BatchSupervisorDraftSummary = {
	available: boolean;
	counts: BatchSupervisorCounts;
	firstRunnableItemId: number | null;
	message: string;
	pendingTrackerAdditionCount: number;
	totalCount: number;
};

export type BatchSupervisorActionAvailability = {
	action: BatchSupervisorAction;
	available: boolean;
	message: string;
};

export type BatchSupervisorCloseoutSummary = {
	mergeBlocked: boolean;
	message: string;
	pendingTrackerAdditionCount: number;
	warnings: BatchSupervisorWarningItem[];
};

export type BatchSupervisorItemPreview = {
	artifacts: BatchSupervisorItemArtifacts;
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
	status: BatchSupervisorItemStatus;
	url: string;
	warningCount: number;
	warnings: BatchSupervisorWarningItem[];
};

export type BatchSupervisorSelectedItem = BatchSupervisorItemPreview & {
	notes: string | null;
	rawStateError: string | null;
	resultWarnings: string[];
	source: string | null;
};

export type BatchSupervisorSelectedDetail = {
	message: string;
	origin: BatchSupervisorSelectionOrigin;
	requestedItemId: number | null;
	row: BatchSupervisorSelectedItem | null;
	state: BatchSupervisorSelectionState;
};

export type BatchSupervisorSummaryOptions = {
	itemId?: number;
	limit?: number;
	offset?: number;
	status?: BatchSupervisorStatusFilter;
};

export type BatchSupervisorSummaryPayload = {
	actions: BatchSupervisorActionAvailability[];
	closeout: BatchSupervisorCloseoutSummary;
	draft: BatchSupervisorDraftSummary;
	filters: {
		itemId: number | null;
		limit: number;
		offset: number;
		status: BatchSupervisorStatusFilter;
	};
	generatedAt: string;
	items: {
		filteredCount: number;
		hasMore: boolean;
		items: BatchSupervisorItemPreview[];
		limit: number;
		offset: number;
		totalCount: number;
	};
	message: string;
	ok: true;
	run: BatchSupervisorRunSummary;
	selectedDetail: BatchSupervisorSelectedDetail;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
	statusOptions: BatchSupervisorStatusOption[];
};

export type BatchSupervisorActionRequest = {
	action: BatchSupervisorAction;
	itemId?: number;
	maxRetries?: number;
	minScore?: number;
	parallel?: number;
	startFromId?: number;
};

export type BatchSupervisorActionWarning = {
	code: string;
	message: string;
};

export type BatchSupervisorActionPayload = {
	actionResult: {
		action: BatchSupervisorAction;
		itemId: number | null;
		jobId: string | null;
		message: string;
		revalidation: {
			itemId: number | null;
			nextPollMs: number | null;
			status: BatchSupervisorStatusFilter | null;
		};
		requestStatus: BatchSupervisorActionRequestStatus;
		runId: string | null;
		warnings: BatchSupervisorActionWarning[];
	};
	generatedAt: string;
	message: string;
	ok: true;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
};

export function isBatchSupervisorStatusFilter(
	candidate: unknown,
): candidate is BatchSupervisorStatusFilter {
	return (
		typeof candidate === "string" &&
		(batchSupervisorStatusFilterValues as readonly string[]).includes(candidate)
	);
}

export function isBatchSupervisorAction(
	candidate: unknown,
): candidate is BatchSupervisorAction {
	return (
		typeof candidate === "string" &&
		(batchSupervisorActionValues as readonly string[]).includes(candidate)
	);
}

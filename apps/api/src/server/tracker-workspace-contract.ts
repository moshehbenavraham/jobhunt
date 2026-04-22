import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { StartupStatus } from "./startup-status.js";

export const trackerWorkspaceSortValues = [
	"company",
	"date",
	"score",
	"status",
] as const;

export type TrackerWorkspaceSort = (typeof trackerWorkspaceSortValues)[number];

export const trackerWorkspaceSelectionOriginValues = [
	"entry-number",
	"none",
] as const;

export type TrackerWorkspaceSelectionOrigin =
	(typeof trackerWorkspaceSelectionOriginValues)[number];

export const trackerWorkspaceSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type TrackerWorkspaceSelectionState =
	(typeof trackerWorkspaceSelectionStateValues)[number];

export const trackerWorkspaceWarningCodeValues = [
	"missing-pdf",
	"missing-report",
	"non-canonical-status",
	"stale-selection",
] as const;

export type TrackerWorkspaceWarningCode =
	(typeof trackerWorkspaceWarningCodeValues)[number];

export const trackerWorkspaceLegitimacyValues = [
	"High Confidence",
	"Proceed with Caution",
	"Suspicious",
] as const;

export type TrackerWorkspaceLegitimacy =
	(typeof trackerWorkspaceLegitimacyValues)[number];

export const trackerWorkspaceActionValues = [
	"dedup-tracker-entries",
	"merge-tracker-additions",
	"normalize-tracker-statuses",
	"update-status",
	"verify-tracker-pipeline",
] as const;

export type TrackerWorkspaceAction =
	(typeof trackerWorkspaceActionValues)[number];

export const DEFAULT_TRACKER_WORKSPACE_LIMIT = 12;
export const MAX_TRACKER_WORKSPACE_LIMIT = 20;
export const MAX_TRACKER_PENDING_ADDITIONS = 8;

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

export type TrackerWorkspaceSummaryOptions = {
	entryNumber?: number;
	limit?: number;
	offset?: number;
	search?: string;
	sort?: TrackerWorkspaceSort;
	status?: string;
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
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
	statusOptions: TrackerWorkspaceStatusOption[];
};

export type TrackerWorkspaceActionRequest = {
	action: TrackerWorkspaceAction;
	dryRun?: boolean;
	entryNumber?: number;
	status?: string;
};

export type TrackerWorkspaceActionWarning = {
	code: string;
	message: string;
};

export type TrackerWorkspaceActionPayload = {
	actionResult: {
		action: TrackerWorkspaceAction;
		dryRun: boolean;
		entryNumber: number | null;
		message: string;
		warnings: TrackerWorkspaceActionWarning[];
	};
	generatedAt: string;
	message: string;
	ok: true;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
};

export function isTrackerWorkspaceSort(
	candidate: unknown,
): candidate is TrackerWorkspaceSort {
	return (
		typeof candidate === "string" &&
		(trackerWorkspaceSortValues as readonly string[]).includes(candidate)
	);
}

export function isTrackerWorkspaceAction(
	candidate: unknown,
): candidate is TrackerWorkspaceAction {
	return (
		typeof candidate === "string" &&
		(trackerWorkspaceActionValues as readonly string[]).includes(candidate)
	);
}

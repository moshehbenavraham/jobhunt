import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { StartupStatus } from "./startup-status.js";

export const pipelineReviewQueueSectionValues = [
	"all",
	"pending",
	"processed",
] as const;

export type PipelineReviewQueueSection =
	(typeof pipelineReviewQueueSectionValues)[number];

export const pipelineReviewSortValues = ["company", "queue", "score"] as const;

export type PipelineReviewSort = (typeof pipelineReviewSortValues)[number];

export const pipelineReviewSelectionOriginValues = [
	"none",
	"report-number",
	"url",
] as const;

export type PipelineReviewSelectionOrigin =
	(typeof pipelineReviewSelectionOriginValues)[number];

export const pipelineReviewSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type PipelineReviewSelectionState =
	(typeof pipelineReviewSelectionStateValues)[number];

export const pipelineReviewRowKindValues = ["pending", "processed"] as const;

export type PipelineReviewRowKind =
	(typeof pipelineReviewRowKindValues)[number];

export const pipelineReviewLegitimacyValues = [
	"High Confidence",
	"Proceed with Caution",
	"Suspicious",
] as const;

export type PipelineReviewLegitimacy =
	(typeof pipelineReviewLegitimacyValues)[number];

export const pipelineReviewWarningCodeValues = [
	"caution-legitimacy",
	"low-score",
	"missing-pdf",
	"missing-report",
	"stale-selection",
	"suspicious-legitimacy",
] as const;

export type PipelineReviewWarningCode =
	(typeof pipelineReviewWarningCodeValues)[number];

export const DEFAULT_PIPELINE_REVIEW_LIMIT = 12;
export const MAX_PIPELINE_REVIEW_LIMIT = 20;

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

export type PipelineReviewSummaryOptions = {
	limit?: number;
	offset?: number;
	reportNumber?: string;
	section?: PipelineReviewQueueSection;
	sort?: PipelineReviewSort;
	url?: string;
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
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	shortlist: PipelineReviewShortlistSummary;
	status: StartupStatus;
};

export function isPipelineReviewQueueSection(
	candidate: unknown,
): candidate is PipelineReviewQueueSection {
	return (
		typeof candidate === "string" &&
		(pipelineReviewQueueSectionValues as readonly string[]).includes(candidate)
	);
}

export function isPipelineReviewSort(
	candidate: unknown,
): candidate is PipelineReviewSort {
	return (
		typeof candidate === "string" &&
		(pipelineReviewSortValues as readonly string[]).includes(candidate)
	);
}

import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { StartupStatus } from "./startup-status.js";

export const scanReviewBucketValues = [
	"strongest-fit",
	"possible-fit",
	"adjacent-or-noisy",
] as const;

export type ScanReviewBucket = (typeof scanReviewBucketValues)[number];

export const scanReviewBucketFilterValues = [
	"all",
	...scanReviewBucketValues,
] as const;

export type ScanReviewBucketFilter =
	(typeof scanReviewBucketFilterValues)[number];

export const scanReviewSelectionOriginValues = ["none", "url"] as const;

export type ScanReviewSelectionOrigin =
	(typeof scanReviewSelectionOriginValues)[number];

export const scanReviewSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type ScanReviewSelectionState =
	(typeof scanReviewSelectionStateValues)[number];

export const scanReviewRunStateValues = [
	"idle",
	"queued",
	"running",
	"approval-paused",
	"completed",
	"degraded",
] as const;

export type ScanReviewRunState = (typeof scanReviewRunStateValues)[number];

export const scanReviewFreshnessValues = [
	"new",
	"recent",
	"stale",
	"unknown",
] as const;

export type ScanReviewFreshness = (typeof scanReviewFreshnessValues)[number];

export const scanReviewWarningCodeValues = [
	"already-ignored",
	"already-pending",
	"approval-paused",
	"degraded-result",
	"duplicate-heavy",
	"stale-selection",
] as const;

export type ScanReviewWarningCode =
	(typeof scanReviewWarningCodeValues)[number];

export const scanReviewActionValues = ["ignore", "restore"] as const;

export type ScanReviewAction = (typeof scanReviewActionValues)[number];

export const DEFAULT_SCAN_REVIEW_LIMIT = 12;
export const MAX_SCAN_REVIEW_LIMIT = 20;

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

export type ScanReviewSummaryOptions = {
	bucket?: ScanReviewBucketFilter;
	includeIgnored?: boolean;
	limit?: number;
	offset?: number;
	sessionId?: string;
	url?: string;
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
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
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

export type ScanReviewActionRequest = {
	action: ScanReviewAction;
	sessionId: string;
	url: string;
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
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
};

export function isScanReviewBucketFilter(
	candidate: unknown,
): candidate is ScanReviewBucketFilter {
	return (
		typeof candidate === "string" &&
		(scanReviewBucketFilterValues as readonly string[]).includes(candidate)
	);
}

export function isScanReviewAction(
	candidate: unknown,
): candidate is ScanReviewAction {
	return (
		typeof candidate === "string" &&
		(scanReviewActionValues as readonly string[]).includes(candidate)
	);
}

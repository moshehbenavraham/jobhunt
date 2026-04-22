import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type {
	RuntimeApprovalStatus,
	RuntimeJobStatus,
	RuntimeJobWaitReason,
	RuntimeSessionStatus,
} from "../store/store-contract.js";
import type { ReportViewerLegitimacy } from "./report-viewer-contract.js";
import type { StartupStatus } from "./startup-status.js";

export const trackerSpecialistModeValues = [
	"compare-offers",
	"follow-up-cadence",
	"rejection-patterns",
] as const;

export type TrackerSpecialistMode =
	(typeof trackerSpecialistModeValues)[number];

export const trackerSpecialistSelectionOriginValues = [
	"catalog",
	"latest-session",
	"mode",
	"none",
	"session-id",
] as const;

export type TrackerSpecialistSelectionOrigin =
	(typeof trackerSpecialistSelectionOriginValues)[number];

export const trackerSpecialistSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type TrackerSpecialistSelectionState =
	(typeof trackerSpecialistSelectionStateValues)[number];

export const trackerSpecialistRunStateValues = [
	"completed",
	"degraded",
	"idle",
	"running",
	"waiting",
] as const;

export type TrackerSpecialistRunState =
	(typeof trackerSpecialistRunStateValues)[number];

export const trackerSpecialistReviewStateValues = [
	"completed",
	"degraded",
	"empty-history",
	"missing-input",
	"resumable",
	"resumed",
	"running",
	"summary-pending",
	"waiting",
] as const;

export type TrackerSpecialistReviewState =
	(typeof trackerSpecialistReviewStateValues)[number];

export const trackerSpecialistResultStatusValues = [
	"degraded",
	"empty-history",
	"missing-input",
	"ready",
] as const;

export type TrackerSpecialistResultStatus =
	(typeof trackerSpecialistResultStatusValues)[number];

export const trackerSpecialistMatchStateValues = [
	"exact",
	"fuzzy",
	"missing",
] as const;

export type TrackerSpecialistMatchState =
	(typeof trackerSpecialistMatchStateValues)[number];

export const trackerSpecialistWarningCodeValues = [
	"ambiguous-offer-match",
	"approval-paused",
	"degraded-analysis",
	"empty-history",
	"missing-input",
	"missing-pdf-artifact",
	"recent-failure",
	"resumable-session",
	"stale-selection",
	"unmatched-offer-reference",
] as const;

export type TrackerSpecialistWarningCode =
	(typeof trackerSpecialistWarningCodeValues)[number];

export const trackerSpecialistNextActionValues = [
	"launch-workflow",
	"resolve-approval",
	"resume-session",
	"review-result",
	"wait",
] as const;

export type TrackerSpecialistNextAction =
	(typeof trackerSpecialistNextActionValues)[number];

export type TrackerSpecialistWorkflowDescriptor = {
	detailPath: string;
	label: string;
	message: string;
	mode: TrackerSpecialistMode;
	selected: boolean;
};

export type TrackerSpecialistWarningItem = {
	code: TrackerSpecialistWarningCode;
	message: string;
};

export type TrackerSpecialistArtifactLink = {
	exists: boolean;
	repoRelativePath: string | null;
};

export type TrackerSpecialistOfferReference = {
	company: string | null;
	entryNumber: number | null;
	label: string | null;
	reportNumber: string | null;
	reportPath: string | null;
	role: string | null;
};

export type TrackerSpecialistResolvedOffer = {
	company: string | null;
	fileName: string;
	label: string | null;
	legitimacy: ReportViewerLegitimacy | null;
	matchReasons: string[];
	matchState: TrackerSpecialistMatchState;
	pdf: TrackerSpecialistArtifactLink;
	reportNumber: string | null;
	reportRepoRelativePath: string;
	role: string | null;
	score: number | null;
	title: string | null;
	trackerEntryNumber: number | null;
	url: string | null;
};

export type TrackerSpecialistFollowUpEntry = {
	company: string;
	contacts: Array<{
		email: string;
		name: string | null;
	}>;
	date: string;
	daysSinceApplication: number;
	daysSinceLastFollowup: number | null;
	daysUntilNext: number | null;
	followupCount: number;
	nextFollowupDate: string | null;
	num: number;
	reportPath: string | null;
	role: string;
	score: string;
	status: string;
	urgency: "cold" | "overdue" | "urgent" | "waiting";
};

export type TrackerSpecialistPatternFunnelItem = {
	count: number;
	stage: string;
};

export type TrackerSpecialistPatternBlocker = {
	blocker: string;
	frequency: number;
	percentage: number;
};

export type TrackerSpecialistPatternRecommendation = {
	action: string;
	impact: string;
	reasoning: string;
};

export type TrackerSpecialistPatternScoreThreshold = {
	positiveRange: string;
	reasoning: string;
	recommended: number;
};

export type TrackerSpecialistPatternGap = {
	frequency: number;
	skill: string;
};

export type TrackerSpecialistPatternRemotePolicy = {
	conversionRate: number;
	negative: number;
	pending: number;
	policy: string;
	positive: number;
	selfFiltered: number;
	total: number;
};

export type TrackerSpecialistPatternArchetype = {
	archetype: string;
	conversionRate: number;
	negative: number;
	pending: number;
	positive: number;
	selfFiltered: number;
	total: number;
};

export type TrackerSpecialistPatternCompanySize = {
	conversionRate: number;
	negative: number;
	pending: number;
	positive: number;
	selfFiltered: number;
	size: string;
	total: number;
};

type TrackerSpecialistPacketBase = {
	fingerprint: string;
	generatedAt: string;
	message: string;
	mode: TrackerSpecialistMode;
	resultStatus: TrackerSpecialistResultStatus;
	revision: number;
	sessionId: string;
	updatedAt: string;
	warnings: TrackerSpecialistWarningItem[];
};

export type CompareOffersResultPacket = TrackerSpecialistPacketBase & {
	mode: "compare-offers";
	offers: TrackerSpecialistResolvedOffer[];
	references: TrackerSpecialistOfferReference[];
	unmatchedReferences: TrackerSpecialistOfferReference[];
};

export type FollowUpCadenceResultPacket = TrackerSpecialistPacketBase & {
	cadenceConfig: {
		appliedFirst: number;
		appliedMaxFollowups: number;
		appliedSubsequent: number;
		interviewThankyou: number;
		respondedInitial: number;
		respondedSubsequent: number;
	};
	entries: TrackerSpecialistFollowUpEntry[];
	metadata: {
		actionable: number;
		analysisDate: string;
		cold: number;
		overdue: number;
		totalTracked: number;
		urgent: number;
		waiting: number;
	};
	mode: "follow-up-cadence";
};

export type RejectionPatternsResultPacket = TrackerSpecialistPacketBase & {
	archetypeBreakdown: TrackerSpecialistPatternArchetype[];
	companySizeBreakdown: TrackerSpecialistPatternCompanySize[];
	funnel: TrackerSpecialistPatternFunnelItem[];
	metadata: {
		analysisDate: string;
		byOutcome: {
			negative: number;
			pending: number;
			positive: number;
			selfFiltered: number;
		};
		total: number;
	};
	mode: "rejection-patterns";
	recommendations: TrackerSpecialistPatternRecommendation[];
	remotePolicy: TrackerSpecialistPatternRemotePolicy[];
	scoreThreshold: TrackerSpecialistPatternScoreThreshold;
	topBlockers: TrackerSpecialistPatternBlocker[];
	techStackGaps: TrackerSpecialistPatternGap[];
};

export type TrackerSpecialistResultPacket =
	| CompareOffersResultPacket
	| FollowUpCadenceResultPacket
	| RejectionPatternsResultPacket;

export type TrackerSpecialistSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	resumeAllowed: boolean;
	sessionId: string;
	status: RuntimeSessionStatus;
	updatedAt: string;
	workflow: TrackerSpecialistMode;
};

export type TrackerSpecialistJobSummary = {
	attempt: number;
	completedAt: string | null;
	currentRunId: string;
	jobId: string;
	jobType: string;
	startedAt: string | null;
	status: RuntimeJobStatus;
	updatedAt: string;
	waitReason: RuntimeJobWaitReason | null;
};

export type TrackerSpecialistApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: RuntimeApprovalStatus;
	title: string;
	traceId: string | null;
};

export type TrackerSpecialistFailureSummary = {
	failedAt: string;
	jobId: string | null;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type TrackerSpecialistRunSummary = {
	message: string;
	resumeAllowed: boolean;
	state: TrackerSpecialistRunState;
};

export type TrackerSpecialistNextActionSummary = {
	action: TrackerSpecialistNextAction;
	message: string;
	resumeAllowed: boolean;
	sessionId: string | null;
};

export type TrackerSpecialistSelectedSummary = {
	approval: TrackerSpecialistApprovalSummary | null;
	failure: TrackerSpecialistFailureSummary | null;
	job: TrackerSpecialistJobSummary | null;
	message: string;
	nextAction: TrackerSpecialistNextActionSummary;
	packet: TrackerSpecialistResultPacket | null;
	run: TrackerSpecialistRunSummary;
	session: TrackerSpecialistSessionSummary | null;
	state: TrackerSpecialistReviewState;
	warnings: TrackerSpecialistWarningItem[];
	workflow: TrackerSpecialistWorkflowDescriptor;
};

export type TrackerSpecialistSelectedDetail = {
	message: string;
	origin: TrackerSpecialistSelectionOrigin;
	requestedMode: TrackerSpecialistMode | null;
	requestedSessionId: string | null;
	state: TrackerSpecialistSelectionState;
	summary: TrackerSpecialistSelectedSummary | null;
};

export type TrackerSpecialistSummaryOptions = {
	mode?: TrackerSpecialistMode;
	sessionId?: string;
};

export type TrackerSpecialistSummaryPayload = {
	filters: {
		mode: TrackerSpecialistMode | null;
		sessionId: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	selected: TrackerSpecialistSelectedDetail;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
	workflows: TrackerSpecialistWorkflowDescriptor[];
};

export function isTrackerSpecialistMode(
	candidate: unknown,
): candidate is TrackerSpecialistMode {
	return (
		typeof candidate === "string" &&
		(trackerSpecialistModeValues as readonly string[]).includes(candidate)
	);
}

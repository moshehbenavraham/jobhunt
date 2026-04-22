import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { ReportViewerLegitimacy } from "./report-viewer-contract.js";
import type { StartupStatus } from "./startup-status.js";

export const applicationHelpSelectionOriginValues = [
	"latest",
	"none",
	"session-id",
] as const;

export type ApplicationHelpSelectionOrigin =
	(typeof applicationHelpSelectionOriginValues)[number];

export const applicationHelpSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type ApplicationHelpSelectionState =
	(typeof applicationHelpSelectionStateValues)[number];

export const applicationHelpReviewStateValues = [
	"approval-paused",
	"completed",
	"draft-ready",
	"missing-context",
	"no-draft-yet",
	"rejected",
	"resumed",
] as const;

export type ApplicationHelpReviewState =
	(typeof applicationHelpReviewStateValues)[number];

export const applicationHelpContextMatchStateValues = [
	"exact",
	"fuzzy",
	"missing",
] as const;

export type ApplicationHelpContextMatchState =
	(typeof applicationHelpContextMatchStateValues)[number];

export const applicationHelpCoverLetterStateValues = [
	"manual-follow-up",
	"not-requested",
] as const;

export type ApplicationHelpCoverLetterState =
	(typeof applicationHelpCoverLetterStateValues)[number];

export const applicationHelpNextActionValues = [
	"generate-draft",
	"match-report",
	"resolve-approval",
	"resume-session",
	"review-draft",
	"revise-draft",
] as const;

export type ApplicationHelpNextAction =
	(typeof applicationHelpNextActionValues)[number];

export const applicationHelpWarningCodeValues = [
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
	(typeof applicationHelpWarningCodeValues)[number];

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

export type ApplicationHelpSummaryOptions = {
	sessionId?: string;
};

export type ApplicationHelpSummaryPayload = {
	filters: {
		sessionId: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	selected: ApplicationHelpSelectedDetail;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
};

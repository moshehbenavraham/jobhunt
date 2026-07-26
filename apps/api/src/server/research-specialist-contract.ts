import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type {
	RuntimeApprovalStatus,
	RuntimeJobStatus,
	RuntimeJobWaitReason,
	RuntimeSessionStatus,
} from "../store/store-contract.js";
import type { ApplicationHelpMatchedReportContext } from "./application-help-contract.js";
import type { StartupStatus } from "./startup-status.js";

export const researchSpecialistModeValues = [
	"deep-company-research",
	"linkedin-outreach",
	"interview-prep",
	"training-review",
	"project-review",
] as const;

export type ResearchSpecialistMode =
	(typeof researchSpecialistModeValues)[number];

export function isResearchSpecialistMode(
	candidate: unknown,
): candidate is ResearchSpecialistMode {
	return (
		typeof candidate === "string" &&
		researchSpecialistModeValues.includes(candidate as ResearchSpecialistMode)
	);
}

export const researchSpecialistSelectionOriginValues = [
	"catalog",
	"latest-session",
	"mode",
	"none",
	"session-id",
] as const;

export type ResearchSpecialistSelectionOrigin =
	(typeof researchSpecialistSelectionOriginValues)[number];

export const researchSpecialistSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type ResearchSpecialistSelectionState =
	(typeof researchSpecialistSelectionStateValues)[number];

export const researchSpecialistRunStateValues = [
	"completed",
	"degraded",
	"idle",
	"running",
	"waiting",
] as const;

export type ResearchSpecialistRunState =
	(typeof researchSpecialistRunStateValues)[number];

export const researchSpecialistReviewStateValues = [
	"approval-paused",
	"completed",
	"degraded",
	"missing-input",
	"no-packet-yet",
	"rejected",
	"resumed",
	"running",
	"waiting",
] as const;

export type ResearchSpecialistReviewState =
	(typeof researchSpecialistReviewStateValues)[number];

export const researchSpecialistResultStatusValues = [
	"degraded",
	"missing-input",
	"ready",
] as const;

export type ResearchSpecialistResultStatus =
	(typeof researchSpecialistResultStatusValues)[number];

export const researchSpecialistWarningCodeValues = [
	"ambiguous-report-match",
	"approval-paused",
	"degraded-packet",
	"manual-send-required",
	"missing-context",
	"missing-packet",
	"missing-pdf-artifact",
	"recent-failure",
	"rejected",
	"resumable-session",
	"stale-selection",
	"story-bank-missing",
] as const;

export type ResearchSpecialistWarningCode =
	(typeof researchSpecialistWarningCodeValues)[number];

export const researchSpecialistNextActionValues = [
	"launch-workflow",
	"resolve-approval",
	"resume-session",
	"review-packet",
	"stage-packet",
	"wait",
] as const;

export type ResearchSpecialistNextAction =
	(typeof researchSpecialistNextActionValues)[number];

export const researchSpecialistStoryBankSourceValues = [
	"missing",
	"story-bank",
	"story-bank-example",
] as const;

export type ResearchSpecialistStoryBankSource =
	(typeof researchSpecialistStoryBankSourceValues)[number];

export const researchSpecialistOutreachTargetTypeValues = [
	"hiring-manager",
	"interviewer",
	"peer",
	"recruiter",
	"unknown",
] as const;

export type ResearchSpecialistOutreachTargetType =
	(typeof researchSpecialistOutreachTargetTypeValues)[number];

export const trainingReviewVerdictValues = [
	"do-it",
	"do-not-do-it",
	"timebox",
] as const;

export type TrainingReviewVerdict =
	(typeof trainingReviewVerdictValues)[number];

export const projectReviewVerdictValues = ["build", "pivot", "skip"] as const;

export type ProjectReviewVerdict = (typeof projectReviewVerdictValues)[number];

export type ResearchSpecialistWorkflowDescriptor = {
	detailPath: string;
	label: string;
	message: string;
	mode: ResearchSpecialistMode;
	selected: boolean;
};

export type ResearchSpecialistWarningItem = {
	code: ResearchSpecialistWarningCode;
	message: string;
};

export type ResearchSpecialistStoryBankSummary = {
	exists: boolean;
	repoRelativePath: string | null;
	source: ResearchSpecialistStoryBankSource;
};

export type ResearchSpecialistContextSummary = {
	artifactName: string | null;
	company: string | null;
	mode: ResearchSpecialistMode;
	modeDescription: string;
	modeRepoRelativePath: string;
	reportContext: ApplicationHelpMatchedReportContext | null;
	role: string | null;
	storyBank: ResearchSpecialistStoryBankSummary | null;
	subject: string | null;
};

export type ResearchSpecialistExistingPacketSummary = {
	createdAt: string;
	generatedAt: string;
	packetId: string;
	repoRelativePath: string;
	resultStatus: ResearchSpecialistResultStatus;
	revision: number;
	sessionId: string;
	updatedAt: string;
};

export type ResearchSpecialistResolvedContext = {
	context: ResearchSpecialistContextSummary;
	existingPacket: ResearchSpecialistExistingPacketSummary | null;
	message: string;
	warnings: ResearchSpecialistWarningItem[];
};

export type ResearchSpecialistSourceItem = {
	label: string;
	note: string;
	url: string | null;
};

export type ResearchSpecialistOutreachTarget = {
	name: string | null;
	profileUrl: string | null;
	title: string | null;
	type: ResearchSpecialistOutreachTargetType;
};

export type ResearchSpecialistInterviewRound = {
	conductedBy: string | null;
	duration: string | null;
	evaluates: string[];
	name: string;
	preparation: string[];
	questions: string[];
};

export type ResearchSpecialistDimensionScore = {
	dimension: string;
	rationale: string;
	score: number;
};

export type ResearchSpecialistPlanItem = {
	deliverable: string;
	label: string;
};

type ResearchSpecialistPacketBase = {
	context: ResearchSpecialistContextSummary;
	createdAt: string;
	fingerprint: string;
	generatedAt: string;
	message: string;
	mode: ResearchSpecialistMode;
	packetId: string;
	resultStatus: ResearchSpecialistResultStatus;
	revision: number;
	sessionId: string;
	updatedAt: string;
	warnings: ResearchSpecialistWarningItem[];
};

export type DeepCompanyResearchPacket = ResearchSpecialistPacketBase & {
	mode: "deep-company-research";
	sections: {
		aiStrategy: string[];
		candidateAngle: string[];
		competitors: string[];
		engineeringCulture: string[];
		likelyChallenges: string[];
		recentMoves: string[];
	};
	sources: ResearchSpecialistSourceItem[];
};

export type LinkedinOutreachPacket = ResearchSpecialistPacketBase & {
	alternativeTargets: ResearchSpecialistOutreachTarget[];
	characterCount: number;
	language: string;
	messageDraft: string;
	mode: "linkedin-outreach";
	primaryTarget: ResearchSpecialistOutreachTarget;
};

export type InterviewPrepPacket = ResearchSpecialistPacketBase & {
	mode: "interview-prep";
	outputRepoRelativePath: string | null;
	processOverview: {
		difficulty: string | null;
		format: string | null;
		knownQuirks: string[];
		positiveExperienceRate: string | null;
		rounds: string | null;
		sources: string[];
	};
	rounds: ResearchSpecialistInterviewRound[];
	storyBankGaps: string[];
	technicalChecklist: Array<{
		reason: string;
		topic: string;
	}>;
};

export type TrainingReviewPacket = ResearchSpecialistPacketBase & {
	betterAlternative: string | null;
	dimensions: ResearchSpecialistDimensionScore[];
	mode: "training-review";
	plan: ResearchSpecialistPlanItem[];
	trainingTitle: string;
	verdict: TrainingReviewVerdict;
};

export type ProjectReviewPacket = ResearchSpecialistPacketBase & {
	betterAlternative: string | null;
	dimensions: ResearchSpecialistDimensionScore[];
	milestones: ResearchSpecialistPlanItem[];
	mode: "project-review";
	projectTitle: string;
	verdict: ProjectReviewVerdict;
};

export type ResearchSpecialistPacket =
	| DeepCompanyResearchPacket
	| InterviewPrepPacket
	| LinkedinOutreachPacket
	| ProjectReviewPacket
	| TrainingReviewPacket;

export type ResearchSpecialistSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	resumeAllowed: boolean;
	sessionId: string;
	status: RuntimeSessionStatus;
	updatedAt: string;
	workflow: ResearchSpecialistMode;
};

export type ResearchSpecialistJobSummary = {
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

export type ResearchSpecialistApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: RuntimeApprovalStatus;
	title: string;
	traceId: string | null;
};

export type ResearchSpecialistFailureSummary = {
	failedAt: string;
	jobId: string | null;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type ResearchSpecialistReviewBoundary = {
	automationAllowed: false;
	manualSendRequired: boolean;
	message: string;
	reviewRequired: true;
};

export type ResearchSpecialistRunSummary = {
	message: string;
	resumeAllowed: boolean;
	state: ResearchSpecialistRunState;
};

export type ResearchSpecialistNextActionSummary = {
	action: ResearchSpecialistNextAction;
	message: string;
	resumeAllowed: boolean;
	sessionId: string | null;
};

export type ResearchSpecialistSelectedSummary = {
	approval: ResearchSpecialistApprovalSummary | null;
	context: ResearchSpecialistContextSummary | null;
	failure: ResearchSpecialistFailureSummary | null;
	job: ResearchSpecialistJobSummary | null;
	message: string;
	nextAction: ResearchSpecialistNextActionSummary;
	packet: ResearchSpecialistPacket | null;
	reviewBoundary: ResearchSpecialistReviewBoundary;
	run: ResearchSpecialistRunSummary;
	session: ResearchSpecialistSessionSummary | null;
	state: ResearchSpecialistReviewState;
	warnings: ResearchSpecialistWarningItem[];
	workflow: ResearchSpecialistWorkflowDescriptor;
};

export type ResearchSpecialistSelectedDetail = {
	message: string;
	origin: ResearchSpecialistSelectionOrigin;
	requestedMode: ResearchSpecialistMode | null;
	requestedSessionId: string | null;
	state: ResearchSpecialistSelectionState;
	summary: ResearchSpecialistSelectedSummary | null;
};

export type ResearchSpecialistSummaryOptions = {
	mode?: ResearchSpecialistMode;
	sessionId?: string;
};

export type ResearchSpecialistSummaryPayload = {
	filters: {
		mode: ResearchSpecialistMode | null;
		sessionId: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	selected: ResearchSpecialistSelectedDetail;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
	workflows: ResearchSpecialistWorkflowDescriptor[];
};

import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { WorkflowIntent } from "../prompt/index.js";
import type {
	RuntimeApprovalStatus,
	RuntimeJobStatus,
	RuntimeJobWaitReason,
	RuntimeSessionStatus,
} from "../store/store-contract.js";
import type { StartupStatus } from "./startup-status.js";

export const evaluationResultWorkflowValues = [
	"auto-pipeline",
	"single-evaluation",
] as const satisfies readonly WorkflowIntent[];

export type EvaluationResultWorkflow =
	(typeof evaluationResultWorkflowValues)[number];

export const evaluationResultStateValues = [
	"approval-paused",
	"completed",
	"degraded",
	"empty",
	"failed",
	"missing-session",
	"pending",
	"running",
	"unsupported-workflow",
] as const;

export type EvaluationResultState =
	(typeof evaluationResultStateValues)[number];

export const evaluationResultArtifactKindValues = [
	"pdf",
	"report",
	"tracker",
] as const;

export type EvaluationResultArtifactKind =
	(typeof evaluationResultArtifactKindValues)[number];

export const evaluationResultArtifactStateValues = [
	"missing",
	"pending",
	"ready",
] as const;

export type EvaluationResultArtifactState =
	(typeof evaluationResultArtifactStateValues)[number];

export const evaluationResultCloseoutStateValues = [
	"attention-required",
	"in-progress",
	"not-ready",
	"review-ready",
] as const;

export type EvaluationResultCloseoutState =
	(typeof evaluationResultCloseoutStateValues)[number];

export const evaluationResultHandoffStateValues = [
	"none",
	"resume-ready",
	"waiting-for-approval",
] as const;

export type EvaluationResultHandoffState =
	(typeof evaluationResultHandoffStateValues)[number];

export const evaluationResultLegitimacyValues = [
	"High Confidence",
	"Proceed with Caution",
	"Suspicious",
] as const;

export type EvaluationResultLegitimacy =
	(typeof evaluationResultLegitimacyValues)[number];

export const evaluationResultInputKindValues = [
	"job-url",
	"raw-jd",
	"unknown",
] as const;

export type EvaluationResultInputKind =
	(typeof evaluationResultInputKindValues)[number];

export const evaluationResultVerificationStatusValues = [
	"needs-review",
	"not-applicable",
	"pending",
	"unconfirmed",
	"verified",
] as const;

export type EvaluationResultVerificationStatus =
	(typeof evaluationResultVerificationStatusValues)[number];

export const evaluationResultVerificationSourceValues = [
	"liveness",
	"none",
	"report-header",
] as const;

export type EvaluationResultVerificationSource =
	(typeof evaluationResultVerificationSourceValues)[number];

export const evaluationResultVerificationResultValues = [
	"active",
	"error",
	"expired",
	"none",
	"offline",
	"uncertain",
] as const;

export type EvaluationResultVerificationResult =
	(typeof evaluationResultVerificationResultValues)[number];

export const evaluationResultReviewFocusAvailabilityValues = [
	"ready",
	"unavailable",
] as const;

export type EvaluationResultReviewFocusAvailability =
	(typeof evaluationResultReviewFocusAvailabilityValues)[number];

export const evaluationResultReviewTargetValues = [
	"none",
	"pipeline-review",
	"report-viewer",
	"tracker-workspace",
] as const;

export type EvaluationResultReviewTarget =
	(typeof evaluationResultReviewTargetValues)[number];

export const evaluationResultPipelineSectionValues = [
	"all",
	"processed",
] as const;

export type EvaluationResultPipelineSection =
	(typeof evaluationResultPipelineSectionValues)[number];

export const DEFAULT_EVALUATION_RESULT_PREVIEW_LIMIT = 4;
export const MAX_EVALUATION_RESULT_PREVIEW_LIMIT = 8;

export type EvaluationResultArtifactSummary = {
	exists: boolean;
	kind: EvaluationResultArtifactKind;
	message: string;
	repoRelativePath: string | null;
	state: EvaluationResultArtifactState;
};

export type EvaluationResultApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: RuntimeApprovalStatus;
	title: string;
	traceId: string | null;
};

export type EvaluationResultCheckpointPreview = {
	completedStepCount: number;
	completedSteps: string[];
	cursor: string | null;
	hasMore: boolean;
	updatedAt: string | null;
};

export type EvaluationResultCloseoutSummary = {
	message: string;
	readyForReview: boolean;
	state: EvaluationResultCloseoutState;
};

export type EvaluationResultFailureSummary = {
	failedAt: string;
	jobId: string;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type EvaluationResultInputProvenance = {
	canonicalUrl: string | null;
	host: string | null;
	kind: EvaluationResultInputKind;
	message: string;
};

export type EvaluationResultHandoffSummary = {
	approval: EvaluationResultApprovalSummary | null;
	approvalStatus: RuntimeApprovalStatus | "none";
	message: string;
	resumeAllowed: boolean;
	state: EvaluationResultHandoffState;
};

export type EvaluationResultVerificationSummary = {
	message: string;
	result: EvaluationResultVerificationResult;
	source: EvaluationResultVerificationSource;
	status: EvaluationResultVerificationStatus;
	url: string | null;
};

export type EvaluationResultReportViewerFocus = {
	availability: EvaluationResultReviewFocusAvailability;
	message: string;
	reportNumber: string | null;
	reportPath: string | null;
};

export type EvaluationResultPipelineReviewFocus = {
	availability: EvaluationResultReviewFocusAvailability;
	message: string;
	reportNumber: string | null;
	section: EvaluationResultPipelineSection;
	url: string | null;
};

export type EvaluationResultTrackerWorkspaceFocus = {
	availability: EvaluationResultReviewFocusAvailability;
	message: string;
	reportNumber: string | null;
};

export type EvaluationResultReviewFocus = {
	pipelineReview: EvaluationResultPipelineReviewFocus;
	primaryTarget: EvaluationResultReviewTarget;
	reportViewer: EvaluationResultReportViewerFocus;
	trackerWorkspace: EvaluationResultTrackerWorkspaceFocus;
};

export type EvaluationResultJobSummary = {
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

export type EvaluationResultSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	sessionId: string;
	status: RuntimeSessionStatus;
	updatedAt: string;
	workflow: string;
};

export type EvaluationResultSessionPreview = {
	sessionId: string;
	state: EvaluationResultState;
	status: RuntimeSessionStatus;
	updatedAt: string;
	workflow: EvaluationResultWorkflow;
};

export type EvaluationResultWarningItem = {
	code: string | null;
	message: string;
};

export type EvaluationResultWarningPreview = {
	hasMore: boolean;
	items: EvaluationResultWarningItem[];
	totalCount: number;
};

export type EvaluationResultSummary = {
	artifacts: {
		pdf: EvaluationResultArtifactSummary;
		report: EvaluationResultArtifactSummary;
		tracker: EvaluationResultArtifactSummary;
	};
	checkpoint: EvaluationResultCheckpointPreview;
	closeout: EvaluationResultCloseoutSummary;
	failure: EvaluationResultFailureSummary | null;
	handoff: EvaluationResultHandoffSummary;
	inputProvenance: EvaluationResultInputProvenance;
	job: EvaluationResultJobSummary | null;
	legitimacy: EvaluationResultLegitimacy | null;
	message: string;
	reportNumber: string | null;
	reviewFocus: EvaluationResultReviewFocus;
	score: number | null;
	session: EvaluationResultSessionSummary | null;
	state: EvaluationResultState;
	verification: EvaluationResultVerificationSummary;
	workflow: EvaluationResultWorkflow | null;
	warnings: EvaluationResultWarningPreview;
};

export type EvaluationResultSummaryOptions = {
	previewLimit?: number;
	sessionId?: string;
	workflow?: string;
};

export type EvaluationResultSummaryPayload = {
	filters: {
		previewLimit: number;
		sessionId: string | null;
		workflow: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	recentSessions: EvaluationResultSessionPreview[];
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
	summary: EvaluationResultSummary | null;
};

export function isEvaluationResultWorkflow(
	candidate: unknown,
): candidate is EvaluationResultWorkflow {
	return (
		typeof candidate === "string" &&
		(evaluationResultWorkflowValues as readonly string[]).includes(candidate)
	);
}

import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { WorkflowIntent } from "../prompt/index.js";
import type {
	RuntimeApprovalStatus,
	RuntimeJobStatus,
	RuntimeJobWaitReason,
	RuntimeSessionStatus,
} from "../store/store-contract.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import type { StartupStatus } from "./startup-status.js";

export const specialistWorkspaceModeValues = [
	"application-help",
	"compare-offers",
	"deep-company-research",
	"follow-up-cadence",
	"interview-prep",
	"linkedin-outreach",
	"project-review",
	"rejection-patterns",
	"training-review",
] as const satisfies readonly WorkflowIntent[];

export type SpecialistWorkspaceMode =
	(typeof specialistWorkspaceModeValues)[number];

export const specialistWorkspaceFamilyValues = [
	"application-history",
	"research-and-narrative",
] as const;

export type SpecialistWorkspaceFamily =
	(typeof specialistWorkspaceFamilyValues)[number];

export const specialistWorkspaceIntakeKindValues = [
	"company-role",
	"offer-set",
	"project-idea",
	"report-context",
	"tracker-history",
	"training-topic",
] as const;

export type SpecialistWorkspaceIntakeKind =
	(typeof specialistWorkspaceIntakeKindValues)[number];

export const specialistWorkspaceSelectionOriginValues = [
	"catalog",
	"latest-session",
	"mode",
	"none",
	"session-id",
] as const;

export type SpecialistWorkspaceSelectionOrigin =
	(typeof specialistWorkspaceSelectionOriginValues)[number];

export const specialistWorkspaceSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type SpecialistWorkspaceSelectionState =
	(typeof specialistWorkspaceSelectionStateValues)[number];

export const specialistWorkspaceRunStateValues = [
	"completed",
	"degraded",
	"idle",
	"running",
	"waiting",
] as const;

export type SpecialistWorkspaceRunState =
	(typeof specialistWorkspaceRunStateValues)[number];

export const specialistWorkspaceResultStateValues = [
	"active-session",
	"blocked",
	"dedicated-detail",
	"pending-session",
	"summary-pending",
] as const;

export type SpecialistWorkspaceResultState =
	(typeof specialistWorkspaceResultStateValues)[number];

export const specialistWorkspaceWarningCodeValues = [
	"approval-paused",
	"dedicated-detail-surface",
	"recent-failure",
	"stale-selection",
	"tooling-gap",
] as const;

export type SpecialistWorkspaceWarningCode =
	(typeof specialistWorkspaceWarningCodeValues)[number];

export const specialistWorkspaceNextActionValues = [
	"launch",
	"open-detail-surface",
	"resolve-approval",
	"resume",
	"wait",
] as const;

export type SpecialistWorkspaceNextAction =
	(typeof specialistWorkspaceNextActionValues)[number];

export const specialistWorkspaceToolAccessValues = [
	"allowed",
	"restricted",
] as const;

export type SpecialistWorkspaceToolAccess =
	(typeof specialistWorkspaceToolAccessValues)[number];

export const specialistWorkspaceSupportStateValues = [
	"ready",
	"tooling-gap",
] as const;

export type SpecialistWorkspaceSupportState =
	(typeof specialistWorkspaceSupportStateValues)[number];

export const specialistWorkspaceSummaryAvailabilityValues = [
	"dedicated-detail",
	"pending",
] as const;

export type SpecialistWorkspaceSummaryAvailability =
	(typeof specialistWorkspaceSummaryAvailabilityValues)[number];

export const specialistWorkspaceActionStateValues = [
	"blocked",
	"completed",
	"degraded",
	"missing-session",
	"ready",
] as const;

export type SpecialistWorkspaceActionState =
	(typeof specialistWorkspaceActionStateValues)[number];

export type SpecialistWorkspaceIntakeHint = {
	kind: SpecialistWorkspaceIntakeKind;
	message: string;
	requiresSavedState: boolean;
};

export type SpecialistWorkspaceDetailSurface = {
	label: string;
	path: string;
};

export type SpecialistWorkspaceToolPreviewItem = {
	access: SpecialistWorkspaceToolAccess;
	name: string;
};

export type SpecialistWorkspaceToolPreview = {
	fallbackApplied: boolean;
	hiddenToolCount: number;
	items: SpecialistWorkspaceToolPreviewItem[];
};

export type SpecialistWorkspaceHandoffMetadata = {
	detailSurface: SpecialistWorkspaceDetailSurface | null;
	family: SpecialistWorkspaceFamily;
	label: string;
	mode: SpecialistWorkspaceMode;
	modeDescription: string;
	modeRepoRelativePath: string;
	specialistId: string;
	specialistLabel: string;
	toolPreview: SpecialistWorkspaceToolPreview;
	workspacePath: string;
};

export type SpecialistWorkspaceWorkflowDescriptor = {
	handoff: SpecialistWorkspaceHandoffMetadata;
	intake: SpecialistWorkspaceIntakeHint;
	message: string;
	missingCapabilities: string[];
	selected: boolean;
	summaryAvailability: SpecialistWorkspaceSummaryAvailability;
	supportState: SpecialistWorkspaceSupportState;
};

export type SpecialistWorkspaceWarningItem = {
	code: SpecialistWorkspaceWarningCode;
	message: string;
};

export type SpecialistWorkspaceSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	resumeAllowed: boolean;
	sessionId: string;
	status: RuntimeSessionStatus;
	updatedAt: string;
	workflow: SpecialistWorkspaceMode;
};

export type SpecialistWorkspaceJobSummary = {
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

export type SpecialistWorkspaceApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: RuntimeApprovalStatus;
	title: string;
	traceId: string | null;
};

export type SpecialistWorkspaceFailureSummary = {
	failedAt: string;
	jobId: string | null;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type SpecialistWorkspaceRunSummary = {
	message: string;
	resumeAllowed: boolean;
	state: SpecialistWorkspaceRunState;
};

export type SpecialistWorkspaceResultSummary = {
	detailSurface: SpecialistWorkspaceDetailSurface | null;
	message: string;
	state: SpecialistWorkspaceResultState;
};

export type SpecialistWorkspaceNextActionSummary = {
	action: SpecialistWorkspaceNextAction;
	message: string;
	mode: SpecialistWorkspaceMode;
	sessionId: string | null;
};

export type SpecialistWorkspaceSelectedSummary = {
	approval: SpecialistWorkspaceApprovalSummary | null;
	failure: SpecialistWorkspaceFailureSummary | null;
	handoff: SpecialistWorkspaceHandoffMetadata;
	job: SpecialistWorkspaceJobSummary | null;
	message: string;
	nextAction: SpecialistWorkspaceNextActionSummary;
	result: SpecialistWorkspaceResultSummary;
	run: SpecialistWorkspaceRunSummary;
	session: SpecialistWorkspaceSessionSummary | null;
	supportState: SpecialistWorkspaceSupportState;
	summaryAvailability: SpecialistWorkspaceSummaryAvailability;
	warnings: SpecialistWorkspaceWarningItem[];
};

export type SpecialistWorkspaceSelectedDetail = {
	message: string;
	origin: SpecialistWorkspaceSelectionOrigin;
	requestedMode: SpecialistWorkspaceMode | null;
	requestedSessionId: string | null;
	state: SpecialistWorkspaceSelectionState;
	summary: SpecialistWorkspaceSelectedSummary | null;
};

export type SpecialistWorkspaceSummaryOptions = {
	mode?: SpecialistWorkspaceMode;
	sessionId?: string;
};

export type SpecialistWorkspaceSummaryPayload = {
	filters: {
		mode: SpecialistWorkspaceMode | null;
		sessionId: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	selected: SpecialistWorkspaceSelectedDetail;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
	workflows: SpecialistWorkspaceWorkflowDescriptor[];
};

export type SpecialistWorkspaceLaunchActionRequest = {
	action: "launch";
	context?: JsonValue | null;
	mode: SpecialistWorkspaceMode;
	sessionId?: string;
};

export type SpecialistWorkspaceResumeActionRequest = {
	action: "resume";
	sessionId: string;
};

export type SpecialistWorkspaceActionRequest =
	| SpecialistWorkspaceLaunchActionRequest
	| SpecialistWorkspaceResumeActionRequest;

export type SpecialistWorkspaceActionPayload = {
	actionResult: {
		action: SpecialistWorkspaceActionRequest["action"];
		handoff: SpecialistWorkspaceHandoffMetadata | null;
		message: string;
		mode: SpecialistWorkspaceMode | null;
		nextPollMs: number | null;
		sessionId: string | null;
		state: SpecialistWorkspaceActionState;
		warnings: SpecialistWorkspaceWarningItem[];
	};
	generatedAt: string;
	message: string;
	ok: true;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
};

export function isSpecialistWorkspaceMode(
	candidate: unknown,
): candidate is SpecialistWorkspaceMode {
	return (
		typeof candidate === "string" &&
		(specialistWorkspaceModeValues as readonly string[]).includes(candidate)
	);
}

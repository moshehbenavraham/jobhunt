import { setTimeout as delay } from "node:timers/promises";
import type { CurrentSessionMetadata } from "../index.js";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import {
	createOperatorShellSummary,
	type OperatorShellActiveSessionSummary,
	type OperatorShellApprovalSummary,
	type OperatorShellFailureSummary,
	type OperatorShellSummaryPayload,
} from "./operator-shell-summary.js";
import type {
	PipelineReviewRowPreview,
	PipelineReviewSummaryPayload,
} from "./pipeline-review-contract.js";
import { createPipelineReviewSummary } from "./pipeline-review-summary.js";
import type { ReportViewerSummaryPayload } from "./report-viewer-contract.js";
import { createReportViewerSummary } from "./report-viewer-summary.js";
import {
	createSettingsSummary,
	type SettingsMaintenanceCommand,
	type SettingsSummaryPayload,
} from "./settings-summary.js";
import type { SettingsUpdateCheckPayload } from "./settings-update-check.js";
import { isSpecialistWorkspaceMode } from "./specialist-workspace-contract.js";
import {
	createHealthPayload,
	type StartupHealthPayload,
	type StartupStatus,
} from "./startup-status.js";
import type {
	TrackerWorkspacePendingAdditionItem,
	TrackerWorkspaceSummaryPayload,
} from "./tracker-workspace-contract.js";
import { createTrackerWorkspaceSummary } from "./tracker-workspace-summary.js";

const DEFAULT_APPROVAL_LIMIT = 3;
const DEFAULT_ARTIFACT_LIMIT = 4;
const DEFAULT_CLOSEOUT_LIMIT = 4;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_BACKOFF_MS = 150;
const DEFAULT_SECTION_TIMEOUT_MS = 2_500;
const MAX_PREVIEW_LIMIT = 6;

export type OperatorHomeCardState =
	| "attention-required"
	| "degraded"
	| "idle"
	| "ready";

export type OperatorHomeActionSurface =
	| "application-help"
	| "approvals"
	| "artifacts"
	| "batch"
	| "chat"
	| "onboarding"
	| "pipeline"
	| "scan"
	| "settings"
	| "startup"
	| "tracker"
	| "workflows";

export type OperatorHomeActionId =
	| "open-application-help"
	| "open-approvals"
	| "open-artifacts"
	| "open-batch"
	| "open-chat"
	| "open-onboarding"
	| "open-pipeline"
	| "open-scan"
	| "open-settings"
	| "open-startup"
	| "open-tracker"
	| "open-workflows";

export type OperatorHomeActionFocus = {
	approvalId: string | null;
	entryNumber: number | null;
	mode: string | null;
	reportPath: string | null;
	reportNumber: string | null;
	section: "all" | "processed" | null;
	sessionId: string | null;
	url: string | null;
};

export type OperatorHomeAction = {
	description: string;
	focus: OperatorHomeActionFocus;
	id: OperatorHomeActionId;
	label: string;
	surface: OperatorHomeActionSurface;
};

export type OperatorHomeReadinessCard = {
	actions: OperatorHomeAction[];
	currentSession: CurrentSessionMetadata;
	healthStatus: StartupHealthPayload["status"];
	message: string;
	missing: StartupHealthPayload["missing"];
	startupStatus: StartupStatus;
	state: OperatorHomeCardState;
};

export type OperatorHomeLiveWorkCard = {
	actions: OperatorHomeAction[];
	activeSession: OperatorShellActiveSessionSummary | null;
	activeSessionCount: number;
	message: string;
	pendingApprovalCount: number;
	recentFailureCount: number;
	recentFailures: OperatorShellFailureSummary[];
	state: OperatorHomeCardState;
};

export type OperatorHomeApprovalsCard = {
	actions: OperatorHomeAction[];
	latestPendingApprovals: OperatorShellApprovalSummary[];
	message: string;
	pendingApprovalCount: number;
	recentFailureCount: number;
	state: OperatorHomeCardState;
};

export type OperatorHomePipelinePreview = {
	company: string | null;
	kind: PipelineReviewRowPreview["kind"];
	reportNumber: string | null;
	role: string | null;
	score: number | null;
	url: string;
	warningCount: number;
};

export type OperatorHomeTrackerAdditionPreview = {
	company: string | null;
	entryNumber: number;
	reportNumber: string | null;
	role: string | null;
	status: string | null;
};

export type OperatorHomeCloseoutCard = {
	actions: OperatorHomeAction[];
	message: string;
	pipeline: {
		malformedCount: number;
		pendingCount: number;
		preview: OperatorHomePipelinePreview[];
		processedCount: number;
	};
	state: OperatorHomeCardState;
	tracker: {
		pendingAdditionCount: number;
		preview: OperatorHomeTrackerAdditionPreview[];
		rowCount: number;
	};
};

export type OperatorHomeArtifactPreview = {
	artifactDate: string | null;
	fileName: string;
	kind: "pdf" | "report";
	repoRelativePath: string;
	reportNumber: string | null;
};

export type OperatorHomeArtifactsCard = {
	actions: OperatorHomeAction[];
	items: OperatorHomeArtifactPreview[];
	message: string;
	state: OperatorHomeCardState;
	totalCount: number;
};

export type OperatorHomeMaintenanceCard = {
	actions: OperatorHomeAction[];
	authState: SettingsSummaryPayload["auth"]["status"] | "unavailable";
	commands: SettingsMaintenanceCommand[];
	message: string;
	operationalStoreStatus: SettingsSummaryPayload["operationalStore"]["status"];
	state: OperatorHomeCardState;
	updateCheck: SettingsUpdateCheckPayload;
};

export type OperatorHomeSummaryPayload = {
	cards: {
		approvals: OperatorHomeApprovalsCard;
		artifacts: OperatorHomeArtifactsCard;
		closeout: OperatorHomeCloseoutCard;
		liveWork: OperatorHomeLiveWorkCard;
		maintenance: OperatorHomeMaintenanceCard;
		readiness: OperatorHomeReadinessCard;
	};
	currentSession: CurrentSessionMetadata;
	generatedAt: string;
	health: StartupHealthPayload;
	message: string;
	ok: true;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
};

type OperatorHomeDependencies = {
	createOperatorShellSummary: typeof createOperatorShellSummary;
	createPipelineReviewSummary: typeof createPipelineReviewSummary;
	createReportViewerSummary: typeof createReportViewerSummary;
	createSettingsSummary: typeof createSettingsSummary;
	createTrackerWorkspaceSummary: typeof createTrackerWorkspaceSummary;
};

type LoadedSection<TValue> = {
	error: string | null;
	value: TValue | null;
};

export type OperatorHomeSummaryOptions = {
	approvalLimit?: number;
	artifactLimit?: number;
	closeoutLimit?: number;
	dependencies?: Partial<OperatorHomeDependencies>;
	retryAttempts?: number;
	retryBackoffMs?: number;
	sectionTimeoutMs?: number;
};

function clampPreviewLimit(
	value: number | undefined,
	defaultValue: number,
): number {
	if (value === undefined) {
		return defaultValue;
	}

	return Math.max(1, Math.min(value, MAX_PREVIEW_LIMIT));
}

function formatWorkflowLabel(workflow: string): string {
	return workflow
		.split(/[-_]/g)
		.filter((part) => part.length > 0)
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(" ");
}

function createAction(
	input: {
		description: string;
		id: OperatorHomeActionId;
		label: string;
		surface: OperatorHomeActionSurface;
	},
	focus: Partial<OperatorHomeActionFocus> = {},
): OperatorHomeAction {
	return {
		description: input.description,
		focus: {
			approvalId: focus.approvalId ?? null,
			entryNumber: focus.entryNumber ?? null,
			mode: focus.mode ?? null,
			reportPath: focus.reportPath ?? null,
			reportNumber: focus.reportNumber ?? null,
			section: focus.section ?? null,
			sessionId: focus.sessionId ?? null,
			url: focus.url ?? null,
		},
		id: input.id,
		label: input.label,
		surface: input.surface,
	};
}

function createHomeReadinessState(
	status: StartupStatus,
): OperatorHomeCardState {
	switch (status) {
		case "ready":
			return "ready";
		case "auth-required":
		case "expired-auth":
		case "invalid-auth":
		case "missing-prerequisites":
			return "attention-required";
		case "prompt-failure":
		case "runtime-error":
			return "degraded";
	}
}

function createReadinessActions(input: {
	health: StartupHealthPayload;
}): OperatorHomeAction[] {
	switch (input.health.startupStatus) {
		case "missing-prerequisites":
			return [
				createAction({
					description:
						"Open onboarding to repair the missing user-layer files before work begins.",
					id: "open-onboarding",
					label: "Open Onboarding",
					surface: "onboarding",
				}),
				createAction({
					description:
						"Review the canonical startup diagnostics and the exact missing paths.",
					id: "open-startup",
					label: "Review Startup",
					surface: "startup",
				}),
			];
		case "auth-required":
		case "expired-auth":
		case "invalid-auth":
			return [
				createAction({
					description:
						"Open Settings to review the explicit auth commands and app runtime guidance.",
					id: "open-settings",
					label: "Open Settings",
					surface: "settings",
				}),
				createAction({
					description:
						"Review the canonical startup diagnostics before retrying the runtime.",
					id: "open-startup",
					label: "Review Startup",
					surface: "startup",
				}),
			];
		case "prompt-failure":
		case "runtime-error":
			return [
				createAction({
					description:
						"Review startup blockers before using the app-owned runtime.",
					id: "open-startup",
					label: "Review Startup",
					surface: "startup",
				}),
				createAction({
					description:
						"Open Settings for maintenance commands and operational-store guidance.",
					id: "open-settings",
					label: "Open Settings",
					surface: "settings",
				}),
			];
		case "ready":
			return [
				createAction({
					description:
						"Open Chat to start a new evaluation, pipeline run, or resume work.",
					id: "open-chat",
					label: "Open Chat",
					surface: "chat",
				}),
			];
	}
}

function selectLiveWorkSurface(
	session: OperatorShellActiveSessionSummary,
): OperatorHomeAction {
	if (
		session.activeJob?.waitReason === "approval" ||
		session.status === "waiting"
	) {
		return createAction(
			{
				description:
					"Open Approvals to review the approval pause before resuming the active run.",
				id: "open-approvals",
				label: "Review Approval",
				surface: "approvals",
			},
			{
				sessionId: session.sessionId,
			},
		);
	}

	if (session.workflow === "scan-portals") {
		return createAction(
			{
				description:
					"Open the Scan surface and keep the live shortlist workflow in view.",
				id: "open-scan",
				label: "Open Scan",
				surface: "scan",
			},
			{
				sessionId: session.sessionId,
			},
		);
	}

	if (session.workflow === "batch-evaluation") {
		return createAction(
			{
				description:
					"Open Batch to supervise the current evaluation run and any retries.",
				id: "open-batch",
				label: "Open Batch",
				surface: "batch",
			},
			{
				sessionId: session.sessionId,
			},
		);
	}

	if (session.workflow === "application-help") {
		return createAction(
			{
				description:
					"Open Application Help to review the current draft packet and approvals.",
				id: "open-application-help",
				label: "Open Draft Review",
				surface: "application-help",
			},
			{
				sessionId: session.sessionId,
			},
		);
	}

	if (isSpecialistWorkspaceMode(session.workflow)) {
		return createAction(
			{
				description:
					"Open Workflows to review the active specialist run without rebuilding the route in the browser.",
				id: "open-workflows",
				label: "Open Workflows",
				surface: "workflows",
			},
			{
				mode: session.workflow,
				sessionId: session.sessionId,
			},
		);
	}

	return createAction(
		{
			description:
				"Open Chat to resume the active run and inspect the live timeline.",
			id: "open-chat",
			label: "Open Chat",
			surface: "chat",
		},
		{
			sessionId: session.sessionId,
		},
	);
}

function createLiveWorkActions(input: {
	activity: OperatorShellSummaryPayload | null;
	health: StartupHealthPayload;
}): OperatorHomeAction[] {
	if (input.health.startupStatus !== "ready") {
		return createReadinessActions({
			health: input.health,
		});
	}

	if (input.activity?.activity.activeSession) {
		return [selectLiveWorkSurface(input.activity.activity.activeSession)];
	}

	return [
		createAction({
			description:
				"Open Chat and start the next evaluation or workflow from the app-owned runtime.",
			id: "open-chat",
			label: "Start Work",
			surface: "chat",
		}),
	];
}

function createApprovalsActions(input: {
	activity: OperatorShellSummaryPayload | null;
}): OperatorHomeAction[] {
	const latestApproval =
		input.activity?.activity.latestPendingApprovals[0] ?? null;
	const latestFailure = input.activity?.activity.recentFailures[0] ?? null;
	const focus =
		latestApproval !== null
			? {
					approvalId: latestApproval.approvalId,
					sessionId: latestApproval.sessionId,
				}
			: latestFailure !== null
				? {
						sessionId: latestFailure.sessionId,
					}
				: input.activity?.activity.activeSession
					? {
							sessionId: input.activity.activity.activeSession.sessionId,
						}
					: {};

	return [
		createAction(
			{
				description:
					"Open the approval inbox and resolve pending approvals or interrupted runs.",
				id: "open-approvals",
				label: "Open Approvals",
				surface: "approvals",
			},
			focus,
		),
	];
}

function createCloseoutActions(input: {
	pipeline: PipelineReviewSummaryPayload | null;
	tracker: TrackerWorkspaceSummaryPayload | null;
}): OperatorHomeAction[] {
	const firstPipeline = input.pipeline?.queue.items[0] ?? null;
	const firstAddition = input.tracker?.pendingAdditions.items[0] ?? null;

	return [
		createAction(
			{
				description:
					"Open Pipeline and review pending or recently processed queue items.",
				id: "open-pipeline",
				label: "Open Pipeline",
				surface: "pipeline",
			},
			firstPipeline
				? {
						reportNumber: firstPipeline.reportNumber,
						section: firstPipeline.kind === "processed" ? "processed" : "all",
						url: firstPipeline.url,
					}
				: {
						section: "all",
					},
		),
		createAction(
			{
				description:
					"Open Tracker to merge pending additions and close out canonical tracker rows.",
				id: "open-tracker",
				label: "Open Tracker",
				surface: "tracker",
			},
			firstAddition
				? {
						entryNumber: firstAddition.entryNumber,
						reportNumber: firstAddition.reportNumber,
					}
				: {},
		),
	];
}

function createArtifactsActions(input: {
	reportViewer: ReportViewerSummaryPayload | null;
}): OperatorHomeAction[] {
	const latestArtifact = input.reportViewer?.recentArtifacts.items[0] ?? null;

	return [
		createAction(
			{
				description:
					"Open Artifacts and inspect the latest checked-in reports or PDFs.",
				id: "open-artifacts",
				label: "Open Artifacts",
				surface: "artifacts",
			},
			latestArtifact?.kind === "report"
				? {
						reportPath: latestArtifact.repoRelativePath,
					}
				: {},
		),
	];
}

function createMaintenanceActions(input: {
	health: StartupHealthPayload;
}): OperatorHomeAction[] {
	if (input.health.startupStatus === "missing-prerequisites") {
		return [
			createAction({
				description:
					"Open Onboarding and finish the missing user-layer setup before maintenance closeout.",
				id: "open-onboarding",
				label: "Open Onboarding",
				surface: "onboarding",
			}),
			createAction({
				description:
					"Open Settings for updater, auth, backup, and doctor guidance.",
				id: "open-settings",
				label: "Open Settings",
				surface: "settings",
			}),
		];
	}

	return [
		createAction({
			description:
				"Open Settings for updater checks and explicit terminal maintenance actions.",
			id: "open-settings",
			label: "Open Settings",
			surface: "settings",
		}),
	];
}

function createReadinessCard(input: {
	currentSession: CurrentSessionMetadata;
	health: StartupHealthPayload;
}): OperatorHomeReadinessCard {
	return {
		actions: createReadinessActions({
			health: input.health,
		}),
		currentSession: input.currentSession,
		healthStatus: input.health.status,
		message:
			input.health.startupStatus === "ready"
				? "The app-owned runtime is ready. Use Chat for new work and keep the home surface for daily queue review."
				: input.health.message,
		missing: input.health.missing,
		startupStatus: input.health.startupStatus,
		state: createHomeReadinessState(input.health.startupStatus),
	};
}

function createLiveWorkCard(input: {
	activity: LoadedSection<OperatorShellSummaryPayload>;
	health: StartupHealthPayload;
}): OperatorHomeLiveWorkCard {
	if (input.activity.value === null) {
		return {
			actions: createReadinessActions({
				health: input.health,
			}),
			activeSession: null,
			activeSessionCount: 0,
			message:
				input.activity.error ??
				"Live activity is unavailable. Refresh the home surface or inspect Startup.",
			pendingApprovalCount: 0,
			recentFailureCount: 0,
			recentFailures: [],
			state: "degraded",
		};
	}

	const activity = input.activity.value.activity;

	return {
		actions: createLiveWorkActions({
			activity: input.activity.value,
			health: input.health,
		}),
		activeSession: activity.activeSession,
		activeSessionCount: activity.activeSessionCount,
		message:
			activity.activeSession !== null
				? activity.activeSession.activeJob?.waitReason === "approval" ||
					activity.activeSession.status === "waiting"
					? `${formatWorkflowLabel(activity.activeSession.workflow)} is paused for approval review.`
					: `${formatWorkflowLabel(activity.activeSession.workflow)} is active in the app-owned runtime.`
				: activity.recentFailureCount > 0
					? "No run is active right now, but interrupted work is waiting in Approvals."
					: "No live workflow is currently running.",
		pendingApprovalCount: activity.pendingApprovalCount,
		recentFailureCount: activity.recentFailureCount,
		recentFailures: activity.recentFailures,
		state:
			activity.pendingApprovalCount > 0 || activity.recentFailureCount > 0
				? "attention-required"
				: activity.activeSessionCount > 0
					? "ready"
					: "idle",
	};
}

function createApprovalsCard(input: {
	activity: LoadedSection<OperatorShellSummaryPayload>;
}): OperatorHomeApprovalsCard {
	if (input.activity.value === null) {
		return {
			actions: createApprovalsActions({
				activity: null,
			}),
			latestPendingApprovals: [],
			message:
				input.activity.error ??
				"Approval state is unavailable. Open the inbox after the API recovers.",
			pendingApprovalCount: 0,
			recentFailureCount: 0,
			state: "degraded",
		};
	}

	const activity = input.activity.value.activity;
	const pendingApproval = activity.latestPendingApprovals[0] ?? null;

	return {
		actions: createApprovalsActions({
			activity: input.activity.value,
		}),
		latestPendingApprovals: activity.latestPendingApprovals,
		message:
			activity.pendingApprovalCount > 0
				? pendingApproval?.title
					? `${activity.pendingApprovalCount} approval item(s) are waiting. Latest: ${pendingApproval.title}.`
					: `${activity.pendingApprovalCount} approval item(s) are waiting in the inbox.`
				: activity.recentFailureCount > 0
					? `${activity.recentFailureCount} interrupted run(s) need review in Approvals.`
					: "No approvals or interrupted runs are waiting right now.",
		pendingApprovalCount: activity.pendingApprovalCount,
		recentFailureCount: activity.recentFailureCount,
		state:
			activity.pendingApprovalCount > 0 || activity.recentFailureCount > 0
				? "attention-required"
				: "idle",
	};
}

function toPipelinePreview(
	item: PipelineReviewRowPreview,
): OperatorHomePipelinePreview {
	return {
		company: item.company,
		kind: item.kind,
		reportNumber: item.reportNumber,
		role: item.role,
		score: item.score,
		url: item.url,
		warningCount: item.warningCount,
	};
}

function parseReportNumber(value: string | null): string | null {
	if (!value) {
		return null;
	}

	const match = value.match(/(?:^|\/)(\d{3})-/);
	return match?.[1] ?? null;
}

function toTrackerAdditionPreview(
	item: TrackerWorkspacePendingAdditionItem,
): OperatorHomeTrackerAdditionPreview {
	return {
		company: item.company,
		entryNumber: item.entryNumber,
		reportNumber:
			item.reportNumber ?? parseReportNumber(item.reportRepoRelativePath),
		role: item.role,
		status: item.status,
	};
}

function createCloseoutCard(input: {
	closeoutLimit: number;
	pipeline: LoadedSection<PipelineReviewSummaryPayload>;
	tracker: LoadedSection<TrackerWorkspaceSummaryPayload>;
}): OperatorHomeCloseoutCard {
	const pipeline = input.pipeline.value;
	const tracker = input.tracker.value;

	if (pipeline === null && tracker === null) {
		return {
			actions: createCloseoutActions({
				pipeline: null,
				tracker: null,
			}),
			message:
				input.pipeline.error ??
				input.tracker.error ??
				"Queue closeout is unavailable until the local summaries recover.",
			pipeline: {
				malformedCount: 0,
				pendingCount: 0,
				preview: [],
				processedCount: 0,
			},
			state: "degraded",
			tracker: {
				pendingAdditionCount: 0,
				preview: [],
				rowCount: 0,
			},
		};
	}

	const pipelineCounts = pipeline?.queue.counts ?? {
		malformed: 0,
		pending: 0,
		processed: 0,
	};
	const trackerPendingAdditionCount = tracker?.pendingAdditions.count ?? 0;
	const trackerRowCount =
		tracker?.rows.filteredCount ?? tracker?.rows.totalCount ?? 0;
	const hasAttention =
		pipelineCounts.pending > 0 ||
		pipelineCounts.malformed > 0 ||
		trackerPendingAdditionCount > 0;
	const hasReviewableContent =
		pipelineCounts.processed > 0 ||
		trackerRowCount > 0 ||
		pipelineCounts.pending > 0;
	const degradedMessageParts = [
		input.pipeline.error,
		input.tracker.error,
	].filter((part): part is string => part !== null);

	return {
		actions: createCloseoutActions({
			pipeline,
			tracker,
		}),
		message:
			degradedMessageParts.length > 0
				? degradedMessageParts.join(" ")
				: hasAttention
					? `Queue closeout needs attention: ${pipelineCounts.pending} pipeline item(s), ${trackerPendingAdditionCount} tracker addition(s), and ${pipelineCounts.malformed} malformed row(s).`
					: hasReviewableContent
						? "Queue closeout is clear enough to review processed reports and tracker history."
						: "No queue or tracker closeout work is waiting.",
		pipeline: {
			malformedCount: pipelineCounts.malformed,
			pendingCount: pipelineCounts.pending,
			preview:
				pipeline?.queue.items
					.slice(0, input.closeoutLimit)
					.map((item) => toPipelinePreview(item)) ?? [],
			processedCount: pipelineCounts.processed,
		},
		state:
			degradedMessageParts.length > 0 && !hasAttention && !hasReviewableContent
				? "degraded"
				: hasAttention
					? "attention-required"
					: hasReviewableContent
						? "ready"
						: "idle",
		tracker: {
			pendingAdditionCount: trackerPendingAdditionCount,
			preview:
				tracker?.pendingAdditions.items
					.slice(0, input.closeoutLimit)
					.map((item) => toTrackerAdditionPreview(item)) ?? [],
			rowCount: trackerRowCount,
		},
	};
}

function createArtifactsCard(input: {
	reportViewer: LoadedSection<ReportViewerSummaryPayload>;
}): OperatorHomeArtifactsCard {
	if (input.reportViewer.value === null) {
		return {
			actions: createArtifactsActions({
				reportViewer: null,
			}),
			items: [],
			message:
				input.reportViewer.error ??
				"Artifacts are unavailable until the report viewer summary recovers.",
			state: "degraded",
			totalCount: 0,
		};
	}

	const recentArtifacts = input.reportViewer.value.recentArtifacts;

	return {
		actions: createArtifactsActions({
			reportViewer: input.reportViewer.value,
		}),
		items: recentArtifacts.items.map((item) => ({
			artifactDate: item.artifactDate,
			fileName: item.fileName,
			kind: item.kind,
			repoRelativePath: item.repoRelativePath,
			reportNumber: item.reportNumber,
		})),
		message:
			recentArtifacts.totalCount > 0
				? `Recent artifacts are ready for review. Showing the latest ${recentArtifacts.items.length} checked-in report or PDF item(s).`
				: "No checked-in report or PDF artifacts are available yet.",
		state: recentArtifacts.totalCount > 0 ? "ready" : "idle",
		totalCount: recentArtifacts.totalCount,
	};
}

function createMaintenanceCard(input: {
	health: StartupHealthPayload;
	settings: LoadedSection<SettingsSummaryPayload>;
}): OperatorHomeMaintenanceCard {
	if (input.settings.value === null) {
		return {
			actions: createMaintenanceActions({
				health: input.health,
			}),
			authState: "unavailable",
			commands: [],
			message:
				input.settings.error ??
				"Maintenance guidance is unavailable. Open Settings after the API recovers.",
			operationalStoreStatus: input.health.operationalStore.status,
			state: "degraded",
			updateCheck: {
				changelogExcerpt: null,
				checkedAt: new Date().toISOString(),
				command: "node scripts/update-system.mjs check",
				localVersion: null,
				message:
					"Update status is unavailable because the settings summary failed.",
				remoteVersion: null,
				state: "error",
			},
		};
	}

	const settings = input.settings.value;
	const needsAttention =
		settings.auth.status !== "ready" ||
		settings.maintenance.updateCheck.state === "update-available" ||
		settings.maintenance.updateCheck.state === "error" ||
		settings.operationalStore.status !== "ready" ||
		settings.status !== "ready";

	return {
		actions: createMaintenanceActions({
			health: input.health,
		}),
		authState: settings.auth.status,
		commands: settings.maintenance.commands.slice(0, 4),
		message:
			settings.maintenance.updateCheck.state === "update-available"
				? `${settings.maintenance.updateCheck.message} Use Settings to review the explicit terminal update path.`
				: settings.auth.status !== "ready"
					? settings.auth.message
					: "Updater, auth, backup, and validation commands are available in Settings while the browser stays read-only.",
		operationalStoreStatus: settings.operationalStore.status,
		state: needsAttention ? "attention-required" : "ready",
		updateCheck: settings.maintenance.updateCheck,
	};
}

function createHomeMessage(input: {
	cards: OperatorHomeSummaryPayload["cards"];
	health: StartupHealthPayload;
}): string {
	if (input.health.startupStatus !== "ready") {
		return input.cards.readiness.message;
	}

	if (input.cards.approvals.state === "attention-required") {
		return input.cards.approvals.message;
	}

	if (input.cards.liveWork.activeSession !== null) {
		return input.cards.liveWork.message;
	}

	if (input.cards.closeout.state === "attention-required") {
		return input.cards.closeout.message;
	}

	if (input.cards.maintenance.state === "attention-required") {
		return input.cards.maintenance.message;
	}

	return "Operator home is ready. Launch work from Chat or use the cards below to close out approvals, queues, artifacts, and maintenance.";
}

async function withTimeout<TValue>(
	label: string,
	timeoutMs: number,
	operation: Promise<TValue>,
): Promise<TValue> {
	return new Promise<TValue>((resolve, reject) => {
		const timerId = globalThis.setTimeout(() => {
			reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
		}, timeoutMs);

		operation.then(
			(value) => {
				globalThis.clearTimeout(timerId);
				resolve(value);
			},
			(error) => {
				globalThis.clearTimeout(timerId);
				reject(error);
			},
		);
	});
}

async function loadSection<TValue>(
	label: string,
	operation: () => Promise<TValue>,
	options: {
		retryAttempts: number;
		retryBackoffMs: number;
		timeoutMs: number;
	},
): Promise<LoadedSection<TValue>> {
	let lastError: unknown = null;

	for (let attempt = 1; attempt <= options.retryAttempts; attempt += 1) {
		try {
			return {
				error: null,
				value: await withTimeout(label, options.timeoutMs, operation()),
			};
		} catch (error) {
			lastError = error;

			if (attempt < options.retryAttempts) {
				await delay(options.retryBackoffMs * attempt);
			}
		}
	}

	const message =
		lastError instanceof Error ? lastError.message : `${label} failed to load.`;

	return {
		error: `${label} is degraded: ${message}`,
		value: null,
	};
}

export async function createOperatorHomeSummary(
	services: ApiServiceContainer,
	options: OperatorHomeSummaryOptions = {},
): Promise<OperatorHomeSummaryPayload> {
	const diagnostics = await services.startupDiagnostics.getDiagnostics();
	const health = createHealthPayload(diagnostics);
	const dependencies: OperatorHomeDependencies = {
		createOperatorShellSummary,
		createPipelineReviewSummary,
		createReportViewerSummary,
		createSettingsSummary,
		createTrackerWorkspaceSummary,
		...options.dependencies,
	};
	const approvalLimit = clampPreviewLimit(
		options.approvalLimit,
		DEFAULT_APPROVAL_LIMIT,
	);
	const artifactLimit = clampPreviewLimit(
		options.artifactLimit,
		DEFAULT_ARTIFACT_LIMIT,
	);
	const closeoutLimit = clampPreviewLimit(
		options.closeoutLimit,
		DEFAULT_CLOSEOUT_LIMIT,
	);
	const retryAttempts = Math.max(
		1,
		options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS,
	);
	const retryBackoffMs = Math.max(
		0,
		options.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS,
	);
	const sectionTimeoutMs = Math.max(
		250,
		options.sectionTimeoutMs ?? DEFAULT_SECTION_TIMEOUT_MS,
	);
	const generatedAt = new Date().toISOString();

	const [activity, pipeline, tracker, reportViewer, settings] =
		await Promise.all([
			loadSection(
				"operator-home activity summary",
				() =>
					dependencies.createOperatorShellSummary(services, {
						approvalLimit,
						failureLimit: approvalLimit,
					}),
				{
					retryAttempts,
					retryBackoffMs,
					timeoutMs: sectionTimeoutMs,
				},
			),
			loadSection(
				"operator-home pipeline summary",
				() =>
					dependencies.createPipelineReviewSummary(services, {
						limit: closeoutLimit,
						section: "all",
						sort: "queue",
					}),
				{
					retryAttempts,
					retryBackoffMs,
					timeoutMs: sectionTimeoutMs,
				},
			),
			loadSection(
				"operator-home tracker summary",
				() =>
					dependencies.createTrackerWorkspaceSummary(services, {
						limit: closeoutLimit,
						sort: "date",
					}),
				{
					retryAttempts,
					retryBackoffMs,
					timeoutMs: sectionTimeoutMs,
				},
			),
			loadSection(
				"operator-home artifacts summary",
				() =>
					dependencies.createReportViewerSummary(services, {
						group: "all",
						limit: artifactLimit,
					}),
				{
					retryAttempts,
					retryBackoffMs,
					timeoutMs: sectionTimeoutMs,
				},
			),
			loadSection(
				"operator-home maintenance summary",
				() => dependencies.createSettingsSummary(services),
				{
					retryAttempts,
					retryBackoffMs,
					timeoutMs: sectionTimeoutMs,
				},
			),
		]);

	const cards = {
		approvals: createApprovalsCard({
			activity,
		}),
		artifacts: createArtifactsCard({
			reportViewer,
		}),
		closeout: createCloseoutCard({
			closeoutLimit,
			pipeline,
			tracker,
		}),
		liveWork: createLiveWorkCard({
			activity,
			health,
		}),
		maintenance: createMaintenanceCard({
			health,
			settings,
		}),
		readiness: createReadinessCard({
			currentSession: diagnostics.currentSession,
			health,
		}),
	};

	return {
		cards,
		currentSession: diagnostics.currentSession,
		generatedAt,
		health,
		message: createHomeMessage({
			cards,
			health,
		}),
		ok: true,
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		status: health.startupStatus,
	};
}

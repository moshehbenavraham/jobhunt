import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import {
	getSpecialistDefinition,
	listSpecialistWorkspaceRoutes,
	type WorkflowSpecialistRoute,
} from "../orchestration/specialist-catalog.js";
import { resolveSpecialistToolScope } from "../orchestration/tool-scope.js";
import { getWorkflowModeRoute } from "../prompt/index.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import type {
	RuntimeApprovalRecord,
	RuntimeEventRecord,
	RuntimeJobRecord,
	RuntimeSessionRecord,
} from "../store/store-contract.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import {
	isSpecialistWorkspaceMode,
	type SpecialistWorkspaceApprovalSummary,
	type SpecialistWorkspaceDetailSurface,
	type SpecialistWorkspaceFailureSummary,
	type SpecialistWorkspaceHandoffMetadata,
	type SpecialistWorkspaceIntakeHint,
	type SpecialistWorkspaceJobSummary,
	type SpecialistWorkspaceMode,
	type SpecialistWorkspaceNextAction,
	type SpecialistWorkspaceNextActionSummary,
	type SpecialistWorkspaceResultSummary,
	type SpecialistWorkspaceRunState,
	type SpecialistWorkspaceRunSummary,
	type SpecialistWorkspaceSelectedSummary,
	type SpecialistWorkspaceSelectionOrigin,
	type SpecialistWorkspaceSelectionState,
	type SpecialistWorkspaceSessionSummary,
	type SpecialistWorkspaceSummaryOptions,
	type SpecialistWorkspaceSummaryPayload,
	type SpecialistWorkspaceToolPreview,
	type SpecialistWorkspaceToolPreviewItem,
	type SpecialistWorkspaceWarningCode,
	type SpecialistWorkspaceWarningItem,
	type SpecialistWorkspaceWorkflowDescriptor,
} from "./specialist-workspace-contract.js";
import { getStartupMessage, getStartupStatus } from "./startup-status.js";

const SPECIALIST_WORKSPACE_SESSION_LIMIT = 12;
const SPECIALIST_WORKSPACE_TOOL_PREVIEW_LIMIT = 4;

type WorkspaceSelection = {
	message: string;
	mode: SpecialistWorkspaceMode | null;
	origin: SpecialistWorkspaceSelectionOrigin;
	session: RuntimeSessionRecord | null;
	state: SpecialistWorkspaceSelectionState;
	warnings: SpecialistWorkspaceWarningItem[];
};

export class SpecialistWorkspaceInputError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-specialist-workspace-query") {
		super(message);
		this.code = code;
		this.name = "SpecialistWorkspaceInputError";
	}
}

function assertWorkspaceMode(
	workflow: WorkflowSpecialistRoute["workflow"] | string,
): SpecialistWorkspaceMode {
	if (!isSpecialistWorkspaceMode(workflow)) {
		throw new Error(
			`Workflow ${workflow} is not a supported specialist workspace mode.`,
		);
	}

	return workflow;
}

function compareSessions(
	left: RuntimeSessionRecord,
	right: RuntimeSessionRecord,
): number {
	const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);

	if (updatedComparison !== 0) {
		return updatedComparison;
	}

	return left.sessionId.localeCompare(right.sessionId);
}

function compareJobs(left: RuntimeJobRecord, right: RuntimeJobRecord): number {
	const statusPriority = new Map<string, number>([
		["running", 0],
		["waiting", 1],
		["pending", 2],
		["queued", 3],
		["completed", 4],
		["failed", 5],
		["cancelled", 6],
	]);
	const leftPriority = statusPriority.get(left.status) ?? 99;
	const rightPriority = statusPriority.get(right.status) ?? 99;

	if (leftPriority !== rightPriority) {
		return leftPriority - rightPriority;
	}

	const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);

	if (updatedComparison !== 0) {
		return updatedComparison;
	}

	return left.jobId.localeCompare(right.jobId);
}

function compareApprovals(
	left: RuntimeApprovalRecord,
	right: RuntimeApprovalRecord,
): number {
	const leftPending = left.status === "pending" ? 0 : 1;
	const rightPending = right.status === "pending" ? 0 : 1;

	if (leftPending !== rightPending) {
		return leftPending - rightPending;
	}

	const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);

	if (updatedComparison !== 0) {
		return updatedComparison;
	}

	return left.approvalId.localeCompare(right.approvalId);
}

function isJsonObject(
	value: JsonValue | null | undefined,
): value is Record<string, JsonValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
	value: Record<string, JsonValue>,
	key: string,
): string | null {
	const candidate = value[key];
	return typeof candidate === "string" && candidate.trim().length > 0
		? candidate.trim()
		: null;
}

function extractApprovalField(
	approval: RuntimeApprovalRecord,
	key: "action" | "title",
): string {
	if (!isJsonObject(approval.request)) {
		return "";
	}

	return readString(approval.request, key) ?? "";
}

function extractFailureMessage(event: RuntimeEventRecord): string {
	if (!isJsonObject(event.metadata)) {
		return event.summary;
	}

	return readString(event.metadata, "message") ?? event.summary;
}

function extractJobErrorMessage(job: RuntimeJobRecord | null): string | null {
	if (!job || !isJsonObject(job.error)) {
		return null;
	}

	return readString(job.error, "message");
}

function getWorkspaceMetadata(route: WorkflowSpecialistRoute): {
	detailSurface: SpecialistWorkspaceDetailSurface | null;
	intake: SpecialistWorkspaceIntakeHint;
	summaryAvailability: SpecialistWorkspaceWorkflowDescriptor["summaryAvailability"];
	workspaceLabel: string;
	workspacePath: string;
} | null {
	if (
		!route.workspace.enabled ||
		!route.workspace.family ||
		!route.workspace.intake ||
		!route.workspace.summaryAvailability ||
		!route.workspace.workspaceLabel ||
		!route.workspace.workspacePath
	) {
		return null;
	}

	return {
		detailSurface: route.workspace.detailSurface
			? {
					...route.workspace.detailSurface,
				}
			: null,
		intake: {
			...route.workspace.intake,
		},
		summaryAvailability: route.workspace.summaryAvailability,
		workspaceLabel: route.workspace.workspaceLabel,
		workspacePath: route.workspace.workspacePath,
	};
}

function createWarning(
	code: SpecialistWorkspaceWarningCode,
	message: string,
): SpecialistWorkspaceWarningItem {
	return {
		code,
		message,
	};
}

function dedupeWarnings(
	warnings: readonly SpecialistWorkspaceWarningItem[],
): SpecialistWorkspaceWarningItem[] {
	const seen = new Set<SpecialistWorkspaceWarningCode>();
	const deduped: SpecialistWorkspaceWarningItem[] = [];

	for (const warning of warnings) {
		if (seen.has(warning.code)) {
			continue;
		}

		seen.add(warning.code);
		deduped.push(warning);
	}

	return deduped;
}

function selectCatalogFallbackRoute(
	routes: readonly WorkflowSpecialistRoute[],
): WorkflowSpecialistRoute | null {
	return routes.find((route) => route.status === "ready") ?? routes[0] ?? null;
}

function toSessionSummary(
	session: RuntimeSessionRecord,
): SpecialistWorkspaceSessionSummary {
	if (!isSpecialistWorkspaceMode(session.workflow)) {
		throw new Error(
			`Specialist workspace session ${session.sessionId} uses unsupported workflow ${session.workflow}.`,
		);
	}

	return {
		activeJobId: session.activeJobId,
		lastHeartbeatAt: session.lastHeartbeatAt,
		resumeAllowed: !["cancelled", "completed"].includes(session.status),
		sessionId: session.sessionId,
		status: session.status,
		updatedAt: session.updatedAt,
		workflow: session.workflow,
	};
}

function toJobSummary(job: RuntimeJobRecord): SpecialistWorkspaceJobSummary {
	return {
		attempt: job.attempt,
		completedAt: job.completedAt,
		currentRunId: job.currentRunId,
		jobId: job.jobId,
		jobType: job.jobType,
		startedAt: job.startedAt,
		status: job.status,
		updatedAt: job.updatedAt,
		waitReason: job.waitReason,
	};
}

function toApprovalSummary(
	approval: RuntimeApprovalRecord,
): SpecialistWorkspaceApprovalSummary {
	return {
		action: extractApprovalField(approval, "action"),
		approvalId: approval.approvalId,
		jobId: approval.jobId,
		requestedAt: approval.requestedAt,
		resolvedAt: approval.resolvedAt,
		status: approval.status,
		title: extractApprovalField(approval, "title"),
		traceId: approval.traceId,
	};
}

function createFailureSummaryFromEvent(
	event: RuntimeEventRecord,
): SpecialistWorkspaceFailureSummary | null {
	if (!event.sessionId) {
		return null;
	}

	const metadata = isJsonObject(event.metadata) ? event.metadata : null;

	return {
		failedAt: event.occurredAt,
		jobId: event.jobId,
		message: extractFailureMessage(event),
		runId:
			(metadata ? readString(metadata, "runId") : null) ??
			event.jobId ??
			event.eventId,
		sessionId: event.sessionId,
		traceId: event.traceId,
	};
}

function createFallbackFailureSummary(input: {
	job: RuntimeJobRecord | null;
	session: RuntimeSessionRecord | null;
}): SpecialistWorkspaceFailureSummary | null {
	if (
		!input.session ||
		(input.session.status !== "failed" && input.session.status !== "cancelled")
	) {
		return null;
	}

	return {
		failedAt: input.job?.completedAt ?? input.session.updatedAt,
		jobId: input.job?.jobId ?? null,
		message:
			extractJobErrorMessage(input.job) ??
			`The latest specialist session for ${input.session.workflow} needs attention.`,
		runId: input.job?.currentRunId ?? input.session.sessionId,
		sessionId: input.session.sessionId,
		traceId: null,
	};
}

function selectJob(
	session: RuntimeSessionRecord | null,
	jobs: readonly RuntimeJobRecord[],
): RuntimeJobRecord | null {
	if (jobs.length === 0) {
		return null;
	}

	if (session?.activeJobId) {
		const activeJob = jobs.find((job) => job.jobId === session.activeJobId);

		if (activeJob) {
			return activeJob;
		}
	}

	return [...jobs].sort(compareJobs)[0] ?? null;
}

function selectApproval(
	approvals: readonly RuntimeApprovalRecord[],
	job: RuntimeJobRecord | null,
): RuntimeApprovalRecord | null {
	if (approvals.length === 0) {
		return null;
	}

	const scopedApprovals =
		job === null
			? approvals
			: approvals.filter(
					(approval) =>
						approval.jobId === job.jobId ||
						approval.sessionId === job.sessionId,
				);

	return (
		[...(scopedApprovals.length > 0 ? scopedApprovals : approvals)].sort(
			compareApprovals,
		)[0] ?? null
	);
}

async function findLatestSessionForMode(
	services: ApiServiceContainer,
	mode: SpecialistWorkspaceMode,
): Promise<RuntimeSessionRecord | null> {
	const store = await services.operationalStore.getStore();
	const sessions = await store.sessions.listRecent({
		limit: SPECIALIST_WORKSPACE_SESSION_LIMIT,
		workflow: mode,
	});

	return [...sessions].sort(compareSessions)[0] ?? null;
}

async function listRecentWorkspaceSessions(
	services: ApiServiceContainer,
): Promise<RuntimeSessionRecord[]> {
	const store = await services.operationalStore.getStore();
	const sessions = await store.sessions.listRecent({
		limit: SPECIALIST_WORKSPACE_SESSION_LIMIT,
	});

	return sessions
		.filter(
			(
				session,
			): session is RuntimeSessionRecord & {
				workflow: SpecialistWorkspaceMode;
			} => isSpecialistWorkspaceMode(session.workflow),
		)
		.sort(compareSessions);
}

async function resolveSelection(
	services: ApiServiceContainer,
	options: {
		requestedMode: SpecialistWorkspaceMode | null;
		requestedSessionId: string | null;
	},
): Promise<WorkspaceSelection> {
	const workspaceRoutes = listSpecialistWorkspaceRoutes();

	if (workspaceRoutes.length === 0) {
		return {
			message: "No specialist workspace workflows are configured yet.",
			mode: null,
			origin: "none",
			session: null,
			state: "empty",
			warnings: [],
		};
	}

	const store = await services.operationalStore.getStore();
	const requestedSession = options.requestedSessionId
		? await store.sessions.getById(options.requestedSessionId)
		: null;
	const staleSelectionWarning = options.requestedSessionId
		? requestedSession === null
			? createWarning(
					"stale-selection",
					`Specialist session ${options.requestedSessionId} was not found.`,
				)
			: !isSpecialistWorkspaceMode(requestedSession.workflow)
				? createWarning(
						"stale-selection",
						`Session ${options.requestedSessionId} is not a supported specialist workflow session.`,
					)
				: null
		: null;
	let mode = options.requestedMode;
	let origin: SpecialistWorkspaceSelectionOrigin = "catalog";
	let session: RuntimeSessionRecord | null = null;
	let state: SpecialistWorkspaceSelectionState = "ready";
	let message = "";
	const warnings: SpecialistWorkspaceWarningItem[] = [];

	if (staleSelectionWarning) {
		warnings.push(staleSelectionWarning);
		state = "missing";
	}

	if (options.requestedMode) {
		origin = "mode";

		if (
			requestedSession &&
			isSpecialistWorkspaceMode(requestedSession.workflow) &&
			requestedSession.workflow === options.requestedMode
		) {
			session = requestedSession;
			message = `Loaded specialist session ${requestedSession.sessionId} for ${options.requestedMode}.`;
		} else {
			session = await findLatestSessionForMode(services, options.requestedMode);
			message = session
				? `Loaded the latest ${options.requestedMode} specialist session ${session.sessionId}.`
				: `Loaded ${options.requestedMode} specialist workspace metadata.`;

			if (
				options.requestedSessionId &&
				requestedSession &&
				isSpecialistWorkspaceMode(requestedSession.workflow) &&
				requestedSession.workflow !== options.requestedMode
			) {
				warnings.push(
					createWarning(
						"stale-selection",
						`Session ${options.requestedSessionId} does not match ${options.requestedMode}.`,
					),
				);
				state = "missing";
			}
		}

		return {
			message,
			mode,
			origin,
			session,
			state,
			warnings: dedupeWarnings(warnings),
		};
	}

	if (
		requestedSession &&
		isSpecialistWorkspaceMode(requestedSession.workflow)
	) {
		mode = requestedSession.workflow;
		origin = "session-id";
		session = requestedSession;
		message = `Loaded specialist session ${requestedSession.sessionId}.`;

		return {
			message,
			mode,
			origin,
			session,
			state,
			warnings: dedupeWarnings(warnings),
		};
	}

	const latestSession =
		(await listRecentWorkspaceSessions(services))[0] ?? null;

	if (latestSession) {
		mode = assertWorkspaceMode(latestSession.workflow);
		origin = "latest-session";
		session = latestSession;
		message = `Loaded the latest specialist session ${latestSession.sessionId}.`;

		return {
			message,
			mode,
			origin,
			session,
			state,
			warnings: dedupeWarnings(warnings),
		};
	}

	const fallbackRoute = selectCatalogFallbackRoute(workspaceRoutes);

	mode = fallbackRoute ? assertWorkspaceMode(fallbackRoute.workflow) : null;
	message =
		"No specialist sessions have been created yet. Showing the shared specialist workspace catalog.";

	return {
		message,
		mode,
		origin,
		session: null,
		state,
		warnings: dedupeWarnings(warnings),
	};
}

function createToolPreview(
	route: WorkflowSpecialistRoute,
	services: ApiServiceContainer,
): Promise<SpecialistWorkspaceToolPreview> {
	return services.tools.getService().then((toolService) => {
		const scope = resolveSpecialistToolScope(
			toolService.getRegistry(),
			route.toolPolicy,
		);
		const items = scope.catalog
			.slice(0, SPECIALIST_WORKSPACE_TOOL_PREVIEW_LIMIT)
			.map(
				(entry): SpecialistWorkspaceToolPreviewItem => ({
					access: entry.access,
					name: entry.name,
				}),
			);

		return {
			fallbackApplied: scope.fallbackApplied,
			hiddenToolCount: Math.max(0, scope.catalog.length - items.length),
			items,
		};
	});
}

async function createHandoffMetadata(
	route: WorkflowSpecialistRoute,
	services: ApiServiceContainer,
): Promise<SpecialistWorkspaceHandoffMetadata> {
	const metadata = getWorkspaceMetadata(route);

	if (!metadata || !route.workspace.family) {
		throw new Error(
			`Workflow ${route.workflow} is missing specialist workspace metadata.`,
		);
	}

	const specialist = getSpecialistDefinition(route.specialistId);
	const workflowModeRoute = getWorkflowModeRoute(route.workflow);

	return {
		detailSurface: metadata.detailSurface,
		family: route.workspace.family,
		label: metadata.workspaceLabel,
		mode: assertWorkspaceMode(route.workflow),
		modeDescription: workflowModeRoute.description,
		modeRepoRelativePath: workflowModeRoute.modeRepoRelativePath,
		specialistId: specialist.id,
		specialistLabel: specialist.label,
		toolPreview: await createToolPreview(route, services),
		workspacePath: metadata.workspacePath,
	};
}

async function createWorkflowDescriptors(
	services: ApiServiceContainer,
	selectedMode: SpecialistWorkspaceMode | null,
): Promise<{
	descriptors: SpecialistWorkspaceWorkflowDescriptor[];
	handoffByMode: Map<
		SpecialistWorkspaceMode,
		SpecialistWorkspaceHandoffMetadata
	>;
	routeByMode: Map<SpecialistWorkspaceMode, WorkflowSpecialistRoute>;
}> {
	const routes = listSpecialistWorkspaceRoutes();
	const handoffs = await Promise.all(
		routes.map((route) => createHandoffMetadata(route, services)),
	);
	const handoffByMode = new Map<
		SpecialistWorkspaceMode,
		SpecialistWorkspaceHandoffMetadata
	>();
	const routeByMode = new Map<
		SpecialistWorkspaceMode,
		WorkflowSpecialistRoute
	>();
	const descriptors: SpecialistWorkspaceWorkflowDescriptor[] = [];

	for (const [index, route] of routes.entries()) {
		const handoff = handoffs[index];
		const metadata = getWorkspaceMetadata(route);
		const workflow = assertWorkspaceMode(route.workflow);

		if (!handoff || !metadata) {
			throw new Error(
				`Workflow ${route.workflow} is missing specialist workspace metadata.`,
			);
		}

		handoffByMode.set(workflow, handoff);
		routeByMode.set(workflow, route);
		descriptors.push({
			handoff,
			intake: metadata.intake,
			message: route.message,
			missingCapabilities: [...route.missingCapabilities],
			selected: workflow === selectedMode,
			summaryAvailability: metadata.summaryAvailability,
			supportState: route.status,
		});
	}

	return {
		descriptors,
		handoffByMode,
		routeByMode,
	};
}

function determineRunState(input: {
	approval: RuntimeApprovalRecord | null;
	failure: SpecialistWorkspaceFailureSummary | null;
	route: WorkflowSpecialistRoute;
	session: RuntimeSessionRecord | null;
}): SpecialistWorkspaceRunState {
	if (!input.session) {
		return input.route.status === "tooling-gap" ? "degraded" : "idle";
	}

	if (
		input.approval?.status === "pending" ||
		input.session.status === "waiting"
	) {
		return "waiting";
	}

	if (
		input.session.status === "failed" ||
		input.session.status === "cancelled" ||
		input.failure
	) {
		return "degraded";
	}

	if (input.session.status === "completed") {
		return "completed";
	}

	return "running";
}

function createRunSummary(input: {
	approval: RuntimeApprovalRecord | null;
	failure: SpecialistWorkspaceFailureSummary | null;
	handoff: SpecialistWorkspaceHandoffMetadata;
	route: WorkflowSpecialistRoute;
	session: RuntimeSessionRecord | null;
}): SpecialistWorkspaceRunSummary {
	const state = determineRunState(input);
	const resumeAllowed =
		input.route.status === "ready" &&
		!!input.session &&
		!["cancelled", "completed"].includes(input.session.status);
	let message: string;

	switch (state) {
		case "idle":
			message = `No ${input.handoff.label} session is active right now.`;
			break;
		case "running":
			message = `A ${input.handoff.label} specialist session is currently running.`;
			break;
		case "waiting":
			message =
				input.approval?.status === "pending"
					? `A ${input.handoff.label} specialist session is waiting on approval.`
					: `A ${input.handoff.label} specialist session is paused and can be resumed.`;
			break;
		case "completed":
			message = `The latest ${input.handoff.label} specialist session is completed.`;
			break;
		case "degraded":
			message =
				input.route.status === "tooling-gap"
					? input.route.message
					: (input.failure?.message ??
						`The latest ${input.handoff.label} specialist session needs attention before it can continue.`);
			break;
	}

	return {
		message,
		resumeAllowed,
		state,
	};
}

function createResultSummary(input: {
	handoff: SpecialistWorkspaceHandoffMetadata;
	route: WorkflowSpecialistRoute;
	run: SpecialistWorkspaceRunSummary;
	session: RuntimeSessionRecord | null;
}): SpecialistWorkspaceResultSummary {
	if (input.route.status === "tooling-gap") {
		return {
			detailSurface: null,
			message: input.route.message,
			state: "blocked",
		};
	}

	if (input.handoff.detailSurface) {
		return {
			detailSurface: input.handoff.detailSurface,
			message: `Open ${input.handoff.detailSurface.label} for detailed specialist review.`,
			state: "dedicated-detail",
		};
	}

	if (!input.session) {
		return {
			detailSurface: null,
			message: `Launch ${input.handoff.label} to capture shared specialist runtime state.`,
			state: "pending-session",
		};
	}

	if (input.run.state === "running" || input.run.state === "waiting") {
		return {
			detailSurface: null,
			message:
				"Detailed specialist results are not ready yet. Keep polling the shared workspace.",
			state: "active-session",
		};
	}

	return {
		detailSurface: null,
		message:
			"Workflow-specific specialist result summaries land in later Phase 06 sessions.",
		state: "summary-pending",
	};
}

function createNextAction(input: {
	approval: RuntimeApprovalRecord | null;
	handoff: SpecialistWorkspaceHandoffMetadata;
	route: WorkflowSpecialistRoute;
	run: SpecialistWorkspaceRunSummary;
	session: RuntimeSessionRecord | null;
}): SpecialistWorkspaceNextActionSummary {
	let action: SpecialistWorkspaceNextAction;
	let message: string;

	if (input.route.status === "tooling-gap") {
		action = "wait";
		message = input.route.message;
	} else if (input.approval?.status === "pending") {
		action = "resolve-approval";
		message =
			"Resolve the pending approval before attempting to resume this specialist workflow.";
	} else if (input.handoff.detailSurface) {
		action = "open-detail-surface";
		message = `Use ${input.handoff.detailSurface.label} for launch, review, and resume actions.`;
	} else if (!input.session || input.run.state === "idle") {
		action = "launch";
		message = `Launch ${input.handoff.label} through the shared specialist workspace.`;
	} else if (input.run.state === "degraded" && input.run.resumeAllowed) {
		action = "resume";
		message = `Resume the latest ${input.handoff.label} specialist session once the blocking issue is resolved.`;
	} else {
		action = "wait";
		message =
			input.run.state === "completed"
				? "Shared runtime state is available now; workflow-specific detail contracts land in later Phase 06 sessions."
				: "Wait for the active specialist session to produce fresh shared runtime state.";
	}

	return {
		action,
		message,
		mode: input.handoff.mode,
		sessionId: input.session?.sessionId ?? null,
	};
}

function buildWarnings(input: {
	approval: RuntimeApprovalRecord | null;
	failure: SpecialistWorkspaceFailureSummary | null;
	handoff: SpecialistWorkspaceHandoffMetadata;
	route: WorkflowSpecialistRoute;
	selectionWarnings: readonly SpecialistWorkspaceWarningItem[];
}): SpecialistWorkspaceWarningItem[] {
	const warnings = [...input.selectionWarnings];

	if (input.route.status === "tooling-gap") {
		warnings.push(
			createWarning(
				"tooling-gap",
				`${input.handoff.label} is still blocked on typed specialist tooling.`,
			),
		);
	}

	if (input.approval?.status === "pending") {
		warnings.push(
			createWarning(
				"approval-paused",
				`${input.handoff.label} is currently paused for approval review.`,
			),
		);
	}

	if (input.failure) {
		warnings.push(
			createWarning(
				"recent-failure",
				`The latest ${input.handoff.label} session reported a failure event.`,
			),
		);
	}

	if (input.handoff.detailSurface) {
		warnings.push(
			createWarning(
				"dedicated-detail-surface",
				`${input.handoff.label} uses ${input.handoff.detailSurface.label} as its dedicated detail surface.`,
			),
		);
	}

	return dedupeWarnings(warnings);
}

async function buildSelectedSummary(input: {
	handoff: SpecialistWorkspaceHandoffMetadata;
	route: WorkflowSpecialistRoute;
	selectionWarnings: readonly SpecialistWorkspaceWarningItem[];
	services: ApiServiceContainer;
	session: RuntimeSessionRecord | null;
}): Promise<SpecialistWorkspaceSelectedSummary> {
	const store = await input.services.operationalStore.getStore();
	const [jobs, approvals, events] = input.session
		? await Promise.all([
				store.jobs.listBySessionId(input.session.sessionId),
				store.approvals.listBySessionId(input.session.sessionId),
				store.events.list({
					eventTypes: ["job-failed"],
					limit: 8,
					sessionId: input.session.sessionId,
				}),
			])
		: [[], [], []];
	const job = selectJob(input.session, jobs);
	const approval = selectApproval(approvals, job);
	const failureFromEvents = [...events]
		.map(createFailureSummaryFromEvent)
		.filter(
			(failure): failure is SpecialistWorkspaceFailureSummary =>
				failure !== null,
		)
		.sort((left, right) => right.failedAt.localeCompare(left.failedAt))[0];
	const failure =
		failureFromEvents ??
		createFallbackFailureSummary({
			job,
			session: input.session,
		});
	const run = createRunSummary({
		approval,
		failure,
		handoff: input.handoff,
		route: input.route,
		session: input.session,
	});
	const result = createResultSummary({
		handoff: input.handoff,
		route: input.route,
		run,
		session: input.session,
	});
	const nextAction = createNextAction({
		approval,
		handoff: input.handoff,
		route: input.route,
		run,
		session: input.session,
	});
	const warnings = buildWarnings({
		approval,
		failure,
		handoff: input.handoff,
		route: input.route,
		selectionWarnings: input.selectionWarnings,
	});
	const message =
		result.state === "blocked" || result.state === "dedicated-detail"
			? result.message
			: run.message;

	return {
		approval: approval ? toApprovalSummary(approval) : null,
		failure,
		handoff: input.handoff,
		job: job ? toJobSummary(job) : null,
		message,
		nextAction,
		result,
		run,
		session: input.session ? toSessionSummary(input.session) : null,
		supportState: input.route.status,
		summaryAvailability:
			getWorkspaceMetadata(input.route)?.summaryAvailability ?? "pending",
		warnings,
	};
}

function createEmptySelectedDetail(input: {
	message: string;
	origin: SpecialistWorkspaceSelectionOrigin;
	requestedMode: SpecialistWorkspaceMode | null;
	requestedSessionId: string | null;
	state: SpecialistWorkspaceSelectionState;
}): SpecialistWorkspaceSummaryPayload["selected"] {
	return {
		message: input.message,
		origin: input.origin,
		requestedMode: input.requestedMode,
		requestedSessionId: input.requestedSessionId,
		state: input.state,
		summary: null,
	};
}

export async function createSpecialistWorkspaceSummary(
	services: ApiServiceContainer,
	options: SpecialistWorkspaceSummaryOptions = {},
): Promise<SpecialistWorkspaceSummaryPayload> {
	if (
		options.sessionId !== undefined &&
		options.sessionId.trim().length === 0
	) {
		throw new SpecialistWorkspaceInputError(
			"Specialist workspace sessionId must not be empty.",
		);
	}

	if (options.mode !== undefined && !isSpecialistWorkspaceMode(options.mode)) {
		throw new SpecialistWorkspaceInputError(
			`Unsupported specialist workspace mode: ${String(options.mode)}.`,
			"invalid-specialist-workspace-mode",
		);
	}

	const diagnostics = await services.startupDiagnostics.getDiagnostics();
	const startupStatus = getStartupStatus(diagnostics);
	const startupMessage = getStartupMessage(diagnostics);
	const generatedAt = new Date().toISOString();
	const requestedMode = options.mode ?? null;
	const requestedSessionId = options.sessionId?.trim() ?? null;
	const selection = await resolveSelection(services, {
		requestedMode,
		requestedSessionId,
	});
	const { descriptors, handoffByMode, routeByMode } =
		await createWorkflowDescriptors(services, selection.mode);

	if (!selection.mode) {
		return {
			filters: {
				mode: requestedMode,
				sessionId: requestedSessionId,
			},
			generatedAt,
			message: startupStatus === "ready" ? selection.message : startupMessage,
			ok: true,
			selected: createEmptySelectedDetail({
				message: selection.message,
				origin: selection.origin,
				requestedMode,
				requestedSessionId,
				state: selection.state,
			}),
			service: STARTUP_SERVICE_NAME,
			sessionId: STARTUP_SESSION_ID,
			status: startupStatus,
			workflows: descriptors,
		};
	}

	const selectedHandoff = handoffByMode.get(selection.mode);
	const selectedRoute = routeByMode.get(selection.mode);

	if (!selectedHandoff || !selectedRoute) {
		throw new Error(
			`Missing specialist workspace descriptor for ${selection.mode}.`,
		);
	}

	const summary = await buildSelectedSummary({
		handoff: selectedHandoff,
		route: selectedRoute,
		selectionWarnings: selection.warnings,
		services,
		session: selection.session,
	});

	return {
		filters: {
			mode: requestedMode,
			sessionId: requestedSessionId,
		},
		generatedAt,
		message: startupStatus === "ready" ? summary.message : startupMessage,
		ok: true,
		selected: {
			message: selection.message,
			origin: selection.origin,
			requestedMode,
			requestedSessionId,
			state: selection.state,
			summary,
		},
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		status: startupStatus,
		workflows: descriptors,
	};
}

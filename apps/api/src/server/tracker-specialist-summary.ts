import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import { getWorkflowSpecialistRoute } from "../orchestration/specialist-catalog.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import type {
	RuntimeApprovalRecord,
	RuntimeEventRecord,
	RuntimeJobRecord,
	RuntimeSessionRecord,
} from "../store/store-contract.js";
import { loadTrackerSpecialistPacket } from "../tools/tracker-specialist-tools.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import { getStartupMessage, getStartupStatus } from "./startup-status.js";
import type {
	TrackerSpecialistApprovalSummary,
	TrackerSpecialistFailureSummary,
	TrackerSpecialistJobSummary,
	TrackerSpecialistMode,
	TrackerSpecialistNextActionSummary,
	TrackerSpecialistReviewState,
	TrackerSpecialistRunState,
	TrackerSpecialistSelectedSummary,
	TrackerSpecialistSelectionOrigin,
	TrackerSpecialistSelectionState,
	TrackerSpecialistSessionSummary,
	TrackerSpecialistSummaryOptions,
	TrackerSpecialistSummaryPayload,
	TrackerSpecialistWarningCode,
	TrackerSpecialistWarningItem,
	TrackerSpecialistWorkflowDescriptor,
} from "./tracker-specialist-contract.js";
import {
	isTrackerSpecialistMode,
	trackerSpecialistModeValues,
} from "./tracker-specialist-contract.js";

const TRACKER_SPECIALIST_SESSION_LIMIT = 12;

type TrackerSpecialistSelection = {
	message: string;
	mode: TrackerSpecialistMode;
	origin: TrackerSpecialistSelectionOrigin;
	session: RuntimeSessionRecord | null;
	state: TrackerSpecialistSelectionState;
	warnings: TrackerSpecialistWarningItem[];
};

export class TrackerSpecialistInputError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-tracker-specialist-query") {
		super(message);
		this.code = code;
		this.name = "TrackerSpecialistInputError";
	}
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

function createWarning(
	code: TrackerSpecialistWarningCode,
	message: string,
): TrackerSpecialistWarningItem {
	return {
		code,
		message,
	};
}

function dedupeWarnings(
	warnings: readonly TrackerSpecialistWarningItem[],
): TrackerSpecialistWarningItem[] {
	const seen = new Set<string>();
	const deduped: TrackerSpecialistWarningItem[] = [];

	for (const warning of warnings) {
		const key = `${warning.code}:${warning.message}`;

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		deduped.push({
			code: warning.code,
			message: warning.message,
		});
	}

	return deduped;
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

function getWorkflowLabel(mode: TrackerSpecialistMode): string {
	switch (mode) {
		case "compare-offers":
			return "Compare Offers";
		case "follow-up-cadence":
			return "Follow-Up Cadence";
		case "rejection-patterns":
			return "Rejection Patterns";
	}
}

function buildWorkflowDescriptor(
	mode: TrackerSpecialistMode,
	selected: boolean,
): TrackerSpecialistWorkflowDescriptor {
	const route = getWorkflowSpecialistRoute(mode);

	return {
		detailPath: route?.workspace.detailSurface?.path ?? "/tracker-specialist",
		label: route?.workspace.workspaceLabel ?? getWorkflowLabel(mode),
		message: route?.message ?? `${getWorkflowLabel(mode)} is available.`,
		mode,
		selected,
	};
}

function toSessionSummary(
	session: RuntimeSessionRecord,
): TrackerSpecialistSessionSummary {
	if (!isTrackerSpecialistMode(session.workflow)) {
		throw new Error(
			`Tracker-specialist session ${session.sessionId} uses unsupported workflow ${session.workflow}.`,
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

function toJobSummary(job: RuntimeJobRecord): TrackerSpecialistJobSummary {
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

function extractApprovalField(
	approval: RuntimeApprovalRecord,
	key: "action" | "title",
): string {
	if (!isJsonObject(approval.request)) {
		return "";
	}

	return readString(approval.request, key) ?? "";
}

function toApprovalSummary(
	approval: RuntimeApprovalRecord,
): TrackerSpecialistApprovalSummary {
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

function extractFailureMessage(event: RuntimeEventRecord): string {
	if (!isJsonObject(event.metadata)) {
		return event.summary;
	}

	return readString(event.metadata, "message") ?? event.summary;
}

function createFailureSummaryFromEvent(
	event: RuntimeEventRecord,
): TrackerSpecialistFailureSummary | null {
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
}): TrackerSpecialistFailureSummary | null {
	if (
		!input.session ||
		(input.session.status !== "failed" && input.session.status !== "cancelled")
	) {
		return null;
	}

	const errorMessage =
		input.job && isJsonObject(input.job.error)
			? readString(input.job.error, "message")
			: null;

	return {
		failedAt: input.job?.completedAt ?? input.session.updatedAt,
		jobId: input.job?.jobId ?? null,
		message:
			errorMessage ??
			`The latest tracker-specialist run for ${input.session.workflow} needs attention.`,
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
	mode: TrackerSpecialistMode,
): Promise<RuntimeSessionRecord | null> {
	const store = await services.operationalStore.getStore();
	const sessions = await store.sessions.listRecent({
		limit: TRACKER_SPECIALIST_SESSION_LIMIT,
		workflow: mode,
	});

	return [...sessions].sort(compareSessions)[0] ?? null;
}

async function listRecentTrackerSpecialistSessions(
	services: ApiServiceContainer,
): Promise<Array<RuntimeSessionRecord & { workflow: TrackerSpecialistMode }>> {
	const store = await services.operationalStore.getStore();
	const sessions = await store.sessions.listRecent({
		limit: TRACKER_SPECIALIST_SESSION_LIMIT,
	});

	return sessions
		.filter(
			(
				session,
			): session is RuntimeSessionRecord & {
				workflow: TrackerSpecialistMode;
			} => isTrackerSpecialistMode(session.workflow),
		)
		.sort(compareSessions);
}

async function resolveSelection(
	services: ApiServiceContainer,
	options: {
		requestedMode: TrackerSpecialistMode | null;
		requestedSessionId: string | null;
	},
): Promise<TrackerSpecialistSelection> {
	const store = await services.operationalStore.getStore();
	const requestedSession = options.requestedSessionId
		? await store.sessions.getById(options.requestedSessionId)
		: null;
	const warnings: TrackerSpecialistWarningItem[] = [];
	let mode = options.requestedMode;
	let origin: TrackerSpecialistSelectionOrigin = "catalog";
	let session: RuntimeSessionRecord | null = null;
	let state: TrackerSpecialistSelectionState = "ready";
	let message = "";

	if (options.requestedMode) {
		origin = "mode";

		if (
			requestedSession &&
			isTrackerSpecialistMode(requestedSession.workflow) &&
			requestedSession.workflow === options.requestedMode
		) {
			session = requestedSession;
			message = `Loaded tracker-specialist session ${requestedSession.sessionId} for ${options.requestedMode}.`;
		} else {
			session = await findLatestSessionForMode(services, options.requestedMode);
			message = session
				? `Loaded the latest ${options.requestedMode} tracker-specialist session ${session.sessionId}.`
				: `Loaded ${options.requestedMode} tracker-specialist metadata.`;

			if (options.requestedSessionId) {
				if (!requestedSession) {
					warnings.push(
						createWarning(
							"stale-selection",
							`Tracker-specialist session ${options.requestedSessionId} was not found.`,
						),
					);
					state = "missing";
				} else if (
					!isTrackerSpecialistMode(requestedSession.workflow) ||
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
		}

		return {
			message,
			mode: options.requestedMode,
			origin,
			session,
			state,
			warnings: dedupeWarnings(warnings),
		};
	}

	if (options.requestedSessionId) {
		if (
			requestedSession &&
			isTrackerSpecialistMode(requestedSession.workflow)
		) {
			return {
				message: `Loaded tracker-specialist session ${requestedSession.sessionId}.`,
				mode: requestedSession.workflow,
				origin: "session-id",
				session: requestedSession,
				state,
				warnings,
			};
		}

		warnings.push(
			createWarning(
				"stale-selection",
				`Tracker-specialist session ${options.requestedSessionId} was not found.`,
			),
		);
		state = "missing";
	}

	const recentSessions = await listRecentTrackerSpecialistSessions(services);
	const latestSession = recentSessions[0] ?? null;

	if (latestSession) {
		return {
			message: `Loaded the latest tracker-specialist session ${latestSession.sessionId}.`,
			mode: latestSession.workflow,
			origin: "latest-session",
			session: latestSession,
			state,
			warnings: dedupeWarnings(warnings),
		};
	}

	mode = "compare-offers";

	return {
		message: "Loaded tracker-specialist catalog metadata.",
		mode,
		origin,
		session: null,
		state,
		warnings: dedupeWarnings(warnings),
	};
}

function resolveRunState(input: {
	job: RuntimeJobRecord | null;
	packetResultStatus: TrackerSpecialistSelectedSummary["packet"] extends infer P
		? P extends { resultStatus: infer T }
			? T | null
			: null
		: null;
	session: RuntimeSessionRecord | null;
}): TrackerSpecialistRunState {
	if (input.job?.status === "waiting" || input.session?.status === "waiting") {
		return "waiting";
	}

	if (
		input.job?.status === "running" ||
		input.job?.status === "pending" ||
		input.job?.status === "queued" ||
		input.session?.status === "running" ||
		input.session?.status === "pending"
	) {
		return "running";
	}

	if (
		input.packetResultStatus === "degraded" ||
		input.job?.status === "failed" ||
		input.job?.status === "cancelled" ||
		input.session?.status === "failed" ||
		input.session?.status === "cancelled"
	) {
		return "degraded";
	}

	if (
		input.packetResultStatus !== null ||
		input.job?.status === "completed" ||
		input.session?.status === "completed"
	) {
		return "completed";
	}

	return "idle";
}

function buildRunMessage(input: {
	mode: TrackerSpecialistMode;
	runState: TrackerSpecialistRunState;
	session: RuntimeSessionRecord | null;
}): string {
	const label = getWorkflowLabel(input.mode);

	switch (input.runState) {
		case "waiting":
			return input.session
				? `${label} session ${input.session.sessionId} is waiting for the next backend step.`
				: `${label} is waiting for the next backend step.`;
		case "running":
			return input.session
				? `${label} session ${input.session.sessionId} is currently running.`
				: `${label} is currently running.`;
		case "degraded":
			return input.session
				? `${label} session ${input.session.sessionId} needs attention before it can continue.`
				: `${label} needs attention before it can continue.`;
		case "completed":
			return input.session
				? `${label} session ${input.session.sessionId} has reviewable output.`
				: `${label} has reviewable output.`;
		case "idle":
			return `${label} has not staged a review packet yet.`;
	}
}

function buildSummaryState(input: {
	mode: TrackerSpecialistMode;
	packet: TrackerSpecialistSelectedSummary["packet"];
	runState: TrackerSpecialistRunState;
	session: RuntimeSessionRecord | null;
}): TrackerSpecialistReviewState {
	if (input.runState === "waiting") {
		return "waiting";
	}

	if (input.runState === "running") {
		return input.packet ? "resumed" : "running";
	}

	if (input.runState === "degraded" && input.session?.status !== "completed") {
		return input.session?.status === "failed" ? "resumable" : "degraded";
	}

	switch (input.packet?.resultStatus ?? null) {
		case "degraded":
			return "degraded";
		case "empty-history":
			return "empty-history";
		case "missing-input":
			return "missing-input";
		case "ready":
			return "completed";
		default:
			return input.mode === "compare-offers"
				? "missing-input"
				: "summary-pending";
	}
}

function buildSummaryMessage(input: {
	mode: TrackerSpecialistMode;
	packet: TrackerSpecialistSelectedSummary["packet"];
	reviewState: TrackerSpecialistReviewState;
	runState: TrackerSpecialistRunState;
	session: RuntimeSessionRecord | null;
}): string {
	if (input.packet) {
		return input.packet.message;
	}

	if (input.runState === "running" || input.runState === "waiting") {
		return buildRunMessage({
			mode: input.mode,
			runState: input.runState,
			session: input.session,
		});
	}

	if (input.reviewState === "missing-input") {
		return "Provide at least two saved offers or explicit report references before compare-offers can produce a bounded review packet.";
	}

	return `Run ${getWorkflowLabel(input.mode)} to stage the first bounded tracker-specialist packet.`;
}

function buildNextAction(input: {
	mode: TrackerSpecialistMode;
	reviewState: TrackerSpecialistReviewState;
	session: RuntimeSessionRecord | null;
}): TrackerSpecialistNextActionSummary {
	switch (input.reviewState) {
		case "waiting":
			return {
				action: "wait",
				message: "Wait for the current tracker-specialist run to advance.",
				resumeAllowed: input.session?.status === "failed",
				sessionId: input.session?.sessionId ?? null,
			};
		case "running":
		case "resumed":
			return {
				action: "wait",
				message:
					"Wait for the current tracker-specialist run to finish staging output.",
				resumeAllowed: false,
				sessionId: input.session?.sessionId ?? null,
			};
		case "resumable":
			return {
				action: "resume-session",
				message:
					"Resume the existing tracker-specialist session and continue from the latest staged state.",
				resumeAllowed: true,
				sessionId: input.session?.sessionId ?? null,
			};
		case "summary-pending":
		case "missing-input":
			return {
				action: "launch-workflow",
				message:
					input.mode === "compare-offers"
						? "Launch compare-offers with at least two saved offer references."
						: `Launch ${input.mode} to stage the first normalized analysis packet.`,
				resumeAllowed: false,
				sessionId: input.session?.sessionId ?? null,
			};
		case "degraded":
		case "empty-history":
		case "completed":
			return {
				action: "review-result",
				message:
					"Review the current bounded tracker-specialist result and warnings.",
				resumeAllowed: input.session?.status === "failed",
				sessionId: input.session?.sessionId ?? null,
			};
	}
}

async function createSelectedSummary(
	services: ApiServiceContainer,
	selection: TrackerSpecialistSelection,
): Promise<TrackerSpecialistSelectedSummary> {
	const workflow = buildWorkflowDescriptor(selection.mode, true);
	const store = await services.operationalStore.getStore();
	const jobs = selection.session
		? await store.jobs.listBySessionId(selection.session.sessionId)
		: [];
	const approvals = selection.session
		? await store.approvals.listBySessionId(selection.session.sessionId)
		: [];
	const failureEvents = selection.session
		? await store.events.list({
				eventTypes: ["job-failed"],
				limit: 4,
				sessionId: selection.session.sessionId,
			})
		: [];
	const job = selectJob(selection.session, jobs);
	const approval = selectApproval(approvals, job);
	const failure =
		[...failureEvents]
			.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
			.map(createFailureSummaryFromEvent)
			.find((candidate) => candidate !== null) ??
		createFallbackFailureSummary({
			job,
			session: selection.session,
		});
	const warnings = [...selection.warnings];
	let packet: TrackerSpecialistSelectedSummary["packet"] = null;

	if (selection.session) {
		try {
			packet = await loadTrackerSpecialistPacket(
				{
					mode: selection.mode,
					sessionId: selection.session.sessionId,
				},
				{
					repoRoot: services.repoPaths.repoRoot,
				},
			);
		} catch (error) {
			warnings.push(
				createWarning(
					"degraded-analysis",
					error instanceof Error
						? error.message
						: "Tracker-specialist packet could not be read.",
				),
			);
		}
	}

	if (approval?.status === "pending") {
		warnings.push(
			createWarning(
				"approval-paused",
				"The current tracker-specialist run is waiting on a pending approval.",
			),
		);
	}

	if (failure) {
		warnings.push(createWarning("recent-failure", failure.message));

		if (selection.session?.status === "failed") {
			warnings.push(
				createWarning(
					"resumable-session",
					`Session ${selection.session.sessionId} can be resumed after addressing the latest failure.`,
				),
			);
		}
	}

	const runState = resolveRunState({
		job,
		packetResultStatus: packet?.resultStatus ?? null,
		session: selection.session,
	});
	const reviewState = buildSummaryState({
		mode: selection.mode,
		packet,
		runState,
		session: selection.session,
	});
	const message = buildSummaryMessage({
		mode: selection.mode,
		packet,
		reviewState,
		runState,
		session: selection.session,
	});
	const nextAction = buildNextAction({
		mode: selection.mode,
		reviewState,
		session: selection.session,
	});

	return {
		approval: approval ? toApprovalSummary(approval) : null,
		failure,
		job: job ? toJobSummary(job) : null,
		message,
		nextAction:
			approval?.status === "pending"
				? {
						action: "resolve-approval",
						message:
							"Resolve the pending approval before the tracker-specialist run can continue.",
						resumeAllowed: selection.session?.status === "failed",
						sessionId: selection.session?.sessionId ?? null,
					}
				: nextAction,
		packet,
		run: {
			message: buildRunMessage({
				mode: selection.mode,
				runState,
				session: selection.session,
			}),
			resumeAllowed: selection.session?.status === "failed",
			state: runState,
		},
		session: selection.session ? toSessionSummary(selection.session) : null,
		state: reviewState,
		warnings: dedupeWarnings([...warnings, ...(packet?.warnings ?? [])]),
		workflow,
	};
}

export async function createTrackerSpecialistSummary(
	services: ApiServiceContainer,
	options: TrackerSpecialistSummaryOptions = {},
): Promise<TrackerSpecialistSummaryPayload> {
	const diagnostics = await services.startupDiagnostics.getDiagnostics();
	const status = getStartupStatus(diagnostics);
	const selection = await resolveSelection(services, {
		requestedMode: options.mode ?? null,
		requestedSessionId: options.sessionId ?? null,
	});
	const selectedSummary = await createSelectedSummary(services, selection);

	return {
		filters: {
			mode: options.mode ?? null,
			sessionId: options.sessionId ?? null,
		},
		generatedAt: new Date().toISOString(),
		message: getStartupMessage(diagnostics),
		ok: true,
		selected: {
			message: selection.message,
			origin: selection.origin,
			requestedMode: options.mode ?? null,
			requestedSessionId: options.sessionId ?? null,
			state: selection.state,
			summary: selectedSummary,
		},
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		status,
		workflows: trackerSpecialistModeValues.map((mode) =>
			buildWorkflowDescriptor(mode, mode === selection.mode),
		),
	};
}

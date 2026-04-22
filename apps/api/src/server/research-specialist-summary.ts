import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import { getWorkflowSpecialistRoute } from "../orchestration/specialist-catalog.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import type {
	RuntimeApprovalRecord,
	RuntimeEventRecord,
	RuntimeJobRecord,
	RuntimeSessionRecord,
} from "../store/store-contract.js";
import {
	loadResearchSpecialistPacket,
	resolveResearchSpecialistContextFromHints,
} from "../tools/research-specialist-tools.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import type {
	ResearchSpecialistApprovalSummary,
	ResearchSpecialistContextSummary,
	ResearchSpecialistFailureSummary,
	ResearchSpecialistJobSummary,
	ResearchSpecialistMode,
	ResearchSpecialistNextActionSummary,
	ResearchSpecialistPacket,
	ResearchSpecialistReviewBoundary,
	ResearchSpecialistReviewState,
	ResearchSpecialistRunState,
	ResearchSpecialistSelectedSummary,
	ResearchSpecialistSelectionOrigin,
	ResearchSpecialistSelectionState,
	ResearchSpecialistSessionSummary,
	ResearchSpecialistSummaryOptions,
	ResearchSpecialistSummaryPayload,
	ResearchSpecialistWarningCode,
	ResearchSpecialistWarningItem,
	ResearchSpecialistWorkflowDescriptor,
} from "./research-specialist-contract.js";
import {
	isResearchSpecialistMode,
	researchSpecialistModeValues,
} from "./research-specialist-contract.js";
import { getStartupMessage, getStartupStatus } from "./startup-status.js";

const RESEARCH_SPECIALIST_SESSION_LIMIT = 12;

type ResearchSpecialistSelection = {
	message: string;
	mode: ResearchSpecialistMode;
	origin: ResearchSpecialistSelectionOrigin;
	session: RuntimeSessionRecord | null;
	state: ResearchSpecialistSelectionState;
	warnings: ResearchSpecialistWarningItem[];
};

type ResearchSpecialistContextHints = {
	artifactName: string | null;
	company: string | null;
	mode: ResearchSpecialistMode;
	pdfPath: string | null;
	reportNumber: string | null;
	reportPath: string | null;
	role: string | null;
	sessionId: string | null;
	subject: string | null;
};

export class ResearchSpecialistInputError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-research-specialist-query") {
		super(message);
		this.code = code;
		this.name = "ResearchSpecialistInputError";
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

function selectStringFromSources(
	sources: readonly Record<string, JsonValue>[],
	keys: readonly string[],
): string | null {
	for (const source of sources) {
		for (const key of keys) {
			const candidate = readString(source, key);

			if (candidate) {
				return candidate;
			}
		}
	}

	return null;
}

function createWarning(
	code: ResearchSpecialistWarningCode,
	message: string,
): ResearchSpecialistWarningItem {
	return {
		code,
		message,
	};
}

function dedupeWarnings(
	warnings: readonly ResearchSpecialistWarningItem[],
): ResearchSpecialistWarningItem[] {
	const seen = new Set<string>();
	const deduped: ResearchSpecialistWarningItem[] = [];

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

function extractContextHints(
	context: JsonValue,
	mode: ResearchSpecialistMode,
	sessionId: string | null,
): ResearchSpecialistContextHints {
	if (!isJsonObject(context)) {
		return {
			artifactName: null,
			company: null,
			mode,
			pdfPath: null,
			reportNumber: null,
			reportPath: null,
			role: null,
			sessionId,
			subject: null,
		};
	}

	const sources = [context];

	for (const key of [
		"artifacts",
		"input",
		"report",
		"researchSpecialist",
		"selection",
	]) {
		const nested = context[key] ?? null;

		if (isJsonObject(nested)) {
			sources.push(nested);
		}
	}

	const reportPath = selectStringFromSources(sources, [
		"reportPath",
		"reportRepoRelativePath",
	]);
	const pdfPath = selectStringFromSources(sources, [
		"pdfPath",
		"pdfRepoRelativePath",
	]);

	return {
		artifactName:
			selectStringFromSources(sources, ["artifactName", "artifactFileName"]) ??
			reportPath?.split("/").pop() ??
			pdfPath?.split("/").pop() ??
			null,
		company: selectStringFromSources(sources, ["company"]),
		mode,
		pdfPath,
		reportNumber: selectStringFromSources(sources, ["reportNumber"]),
		reportPath,
		role: selectStringFromSources(sources, ["jobTitle", "role", "title"]),
		sessionId,
		subject: selectStringFromSources(sources, [
			"projectTitle",
			"subject",
			"topic",
			"trainingTitle",
		]),
	};
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

function getWorkflowLabel(mode: ResearchSpecialistMode): string {
	switch (mode) {
		case "deep-company-research":
			return "Deep Research";
		case "linkedin-outreach":
			return "LinkedIn Outreach";
		case "interview-prep":
			return "Interview Prep";
		case "training-review":
			return "Training Review";
		case "project-review":
			return "Project Review";
	}
}

function buildWorkflowDescriptor(
	mode: ResearchSpecialistMode,
	selected: boolean,
): ResearchSpecialistWorkflowDescriptor {
	const route = getWorkflowSpecialistRoute(mode);

	return {
		detailPath: route?.workspace.detailSurface?.path ?? "/research-specialist",
		label: route?.workspace.workspaceLabel ?? getWorkflowLabel(mode),
		message: route?.message ?? `${getWorkflowLabel(mode)} is available.`,
		mode,
		selected,
	};
}

function toSessionSummary(
	session: RuntimeSessionRecord,
): ResearchSpecialistSessionSummary {
	if (!isResearchSpecialistMode(session.workflow)) {
		throw new Error(
			`Research-specialist session ${session.sessionId} uses unsupported workflow ${session.workflow}.`,
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

function toJobSummary(job: RuntimeJobRecord): ResearchSpecialistJobSummary {
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
): ResearchSpecialistApprovalSummary {
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
): ResearchSpecialistFailureSummary | null {
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
	approval: RuntimeApprovalRecord | null;
	job: RuntimeJobRecord | null;
	session: RuntimeSessionRecord | null;
}): ResearchSpecialistFailureSummary | null {
	if (input.approval?.status === "rejected" && input.session) {
		return {
			failedAt: input.approval.resolvedAt ?? input.approval.updatedAt,
			jobId: input.approval.jobId,
			message: "The latest research-specialist approval was rejected.",
			runId: input.approval.traceId ?? input.approval.approvalId,
			sessionId: input.session.sessionId,
			traceId: input.approval.traceId,
		};
	}

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
			`The latest research-specialist run for ${input.session.workflow} needs attention.`,
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
	mode: ResearchSpecialistMode,
): Promise<RuntimeSessionRecord | null> {
	const store = await services.operationalStore.getStore();
	const sessions = await store.sessions.listRecent({
		limit: RESEARCH_SPECIALIST_SESSION_LIMIT,
		workflow: mode,
	});

	return [...sessions].sort(compareSessions)[0] ?? null;
}

async function listRecentResearchSpecialistSessions(
	services: ApiServiceContainer,
): Promise<Array<RuntimeSessionRecord & { workflow: ResearchSpecialistMode }>> {
	const store = await services.operationalStore.getStore();
	const sessions = await store.sessions.listRecent({
		limit: RESEARCH_SPECIALIST_SESSION_LIMIT,
	});

	return sessions
		.filter(
			(
				session,
			): session is RuntimeSessionRecord & {
				workflow: ResearchSpecialistMode;
			} => isResearchSpecialistMode(session.workflow),
		)
		.sort(compareSessions);
}

async function resolveSelection(
	services: ApiServiceContainer,
	options: {
		requestedMode: ResearchSpecialistMode | null;
		requestedSessionId: string | null;
	},
): Promise<ResearchSpecialistSelection> {
	const store = await services.operationalStore.getStore();
	const requestedSession = options.requestedSessionId
		? await store.sessions.getById(options.requestedSessionId)
		: null;
	const warnings: ResearchSpecialistWarningItem[] = [];
	let mode = options.requestedMode;
	let origin: ResearchSpecialistSelectionOrigin = "catalog";
	let session: RuntimeSessionRecord | null = null;
	let state: ResearchSpecialistSelectionState = "ready";
	let message = "";

	if (options.requestedMode) {
		origin = "mode";

		if (
			requestedSession &&
			isResearchSpecialistMode(requestedSession.workflow) &&
			requestedSession.workflow === options.requestedMode
		) {
			session = requestedSession;
			message = `Loaded research-specialist session ${requestedSession.sessionId} for ${options.requestedMode}.`;
		} else {
			session = await findLatestSessionForMode(services, options.requestedMode);
			message = session
				? `Loaded the latest ${options.requestedMode} research-specialist session ${session.sessionId}.`
				: `Loaded ${options.requestedMode} research-specialist metadata.`;

			if (options.requestedSessionId) {
				if (!requestedSession) {
					warnings.push(
						createWarning(
							"stale-selection",
							`Research-specialist session ${options.requestedSessionId} was not found.`,
						),
					);
					state = "missing";
				} else if (
					!isResearchSpecialistMode(requestedSession.workflow) ||
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
			isResearchSpecialistMode(requestedSession.workflow)
		) {
			return {
				message: `Loaded research-specialist session ${requestedSession.sessionId}.`,
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
				`Research-specialist session ${options.requestedSessionId} was not found.`,
			),
		);
		state = "missing";
	}

	const recentSessions = await listRecentResearchSpecialistSessions(services);
	const latestSession = recentSessions[0] ?? null;

	if (latestSession) {
		return {
			message: `Loaded the latest research-specialist session ${latestSession.sessionId}.`,
			mode: latestSession.workflow,
			origin: "latest-session",
			session: latestSession,
			state,
			warnings: dedupeWarnings(warnings),
		};
	}

	mode = "deep-company-research";

	return {
		message: "Loaded research-specialist catalog metadata.",
		mode,
		origin,
		session: null,
		state,
		warnings: dedupeWarnings(warnings),
	};
}

function hasRequiredContext(
	mode: ResearchSpecialistMode,
	context: ResearchSpecialistContextSummary | null,
): boolean {
	if (!context) {
		return false;
	}

	switch (mode) {
		case "deep-company-research":
		case "linkedin-outreach":
		case "interview-prep":
			return (
				context.reportContext !== null ||
				context.company !== null ||
				context.role !== null
			);
		case "training-review":
		case "project-review":
			return (
				context.subject !== null ||
				context.reportContext !== null ||
				context.company !== null ||
				context.role !== null
			);
	}
}

function buildMissingInputMessage(mode: ResearchSpecialistMode): string {
	switch (mode) {
		case "deep-company-research":
			return "Provide a company, role, or saved report hint before deep research can stage a bounded packet.";
		case "linkedin-outreach":
			return "Provide a company, role, contact, or saved report hint before LinkedIn outreach can stage a bounded draft.";
		case "interview-prep":
			return "Provide a company, role, or saved report hint before interview prep can build a bounded prep packet.";
		case "training-review":
			return "Provide a training topic, certification, or related report context before training review can continue.";
		case "project-review":
			return "Provide a project idea or related report context before project review can continue.";
	}
}

function resolveRunState(input: {
	job: RuntimeJobRecord | null;
	packetResultStatus: ResearchSpecialistPacket["resultStatus"] | null;
	session: RuntimeSessionRecord | null;
}): ResearchSpecialistRunState {
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
	mode: ResearchSpecialistMode;
	runState: ResearchSpecialistRunState;
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
	approval: RuntimeApprovalRecord | null;
	context: ResearchSpecialistContextSummary | null;
	mode: ResearchSpecialistMode;
	packet: ResearchSpecialistPacket | null;
	runState: ResearchSpecialistRunState;
	session: RuntimeSessionRecord | null;
}): ResearchSpecialistReviewState {
	if (input.approval?.status === "pending") {
		return "approval-paused";
	}

	if (input.approval?.status === "rejected") {
		return "rejected";
	}

	if (input.runState === "waiting") {
		return "waiting";
	}

	if (input.runState === "running") {
		return input.packet ? "resumed" : "running";
	}

	if (input.packet?.resultStatus === "degraded") {
		return "degraded";
	}

	if (input.packet?.resultStatus === "missing-input") {
		return "missing-input";
	}

	if (input.packet?.resultStatus === "ready") {
		return "completed";
	}

	if (!hasRequiredContext(input.mode, input.context)) {
		return "missing-input";
	}

	if (!input.packet) {
		return "no-packet-yet";
	}

	if (input.session?.status === "completed") {
		return "completed";
	}

	return "completed";
}

function buildSummaryMessage(input: {
	context: ResearchSpecialistContextSummary | null;
	mode: ResearchSpecialistMode;
	packet: ResearchSpecialistPacket | null;
	reviewState: ResearchSpecialistReviewState;
	runState: ResearchSpecialistRunState;
	session: RuntimeSessionRecord | null;
}): string {
	if (input.packet) {
		return input.packet.message;
	}

	if (input.reviewState === "missing-input") {
		return buildMissingInputMessage(input.mode);
	}

	if (input.reviewState === "no-packet-yet" && input.context) {
		return `Research-specialist context is ready for ${getWorkflowLabel(input.mode)}, but no packet has been staged yet.`;
	}

	if (input.reviewState === "rejected") {
		return `The latest ${getWorkflowLabel(input.mode)} review was rejected and needs a revised packet.`;
	}

	return buildRunMessage({
		mode: input.mode,
		runState: input.runState,
		session: input.session,
	});
}

function buildNextAction(input: {
	mode: ResearchSpecialistMode;
	reviewState: ResearchSpecialistReviewState;
	session: RuntimeSessionRecord | null;
}): ResearchSpecialistNextActionSummary {
	switch (input.reviewState) {
		case "approval-paused":
			return {
				action: "resolve-approval",
				message:
					"Resolve the pending approval before the research-specialist run can continue.",
				resumeAllowed: input.session?.status === "failed",
				sessionId: input.session?.sessionId ?? null,
			};
		case "rejected":
			return {
				action: "resume-session",
				message:
					"Revise the packet to address the rejection feedback, then resume the existing session.",
				resumeAllowed: true,
				sessionId: input.session?.sessionId ?? null,
			};
		case "waiting":
		case "running":
		case "resumed":
			return {
				action: "wait",
				message:
					"Wait for the current research-specialist run to finish staging output.",
				resumeAllowed: false,
				sessionId: input.session?.sessionId ?? null,
			};
		case "missing-input":
			return {
				action: "launch-workflow",
				message: buildMissingInputMessage(input.mode),
				resumeAllowed: false,
				sessionId: input.session?.sessionId ?? null,
			};
		case "no-packet-yet":
			return {
				action: "stage-packet",
				message:
					"Stage the first normalized research-specialist packet for dedicated review.",
				resumeAllowed: false,
				sessionId: input.session?.sessionId ?? null,
			};
		case "completed":
		case "degraded":
			return {
				action: "review-packet",
				message:
					"Review the current bounded research-specialist packet and warnings.",
				resumeAllowed: input.session?.status === "failed",
				sessionId: input.session?.sessionId ?? null,
			};
	}
}

function createReviewBoundary(
	mode: ResearchSpecialistMode,
): ResearchSpecialistReviewBoundary {
	if (mode === "linkedin-outreach") {
		return {
			automationAllowed: false,
			manualSendRequired: true,
			message:
				"Draft only. Review and personalize every outreach message before you send it. The app never sends LinkedIn or email outreach for you.",
			reviewRequired: true,
		};
	}

	return {
		automationAllowed: false,
		manualSendRequired: false,
		message:
			"Review required. Treat this packet as bounded preparation material, not an automatically executed action.",
		reviewRequired: true,
	};
}

async function createSelectedSummary(
	services: ApiServiceContainer,
	selection: ResearchSpecialistSelection,
): Promise<ResearchSpecialistSelectedSummary> {
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
			approval,
			job,
			session: selection.session,
		});
	const contextResolution = await resolveResearchSpecialistContextFromHints(
		extractContextHints(
			selection.session?.context ?? null,
			selection.mode,
			selection.session?.sessionId ?? null,
		),
		{
			repoRoot: services.repoPaths.repoRoot,
		},
	);
	const warnings = [...selection.warnings, ...contextResolution.warnings];
	let packet: ResearchSpecialistPacket | null = null;

	if (selection.session) {
		try {
			packet = await loadResearchSpecialistPacket(
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
					"degraded-packet",
					error instanceof Error
						? error.message
						: "Research-specialist packet could not be read.",
				),
			);
		}
	}

	const resolvedContext = packet?.context ?? contextResolution.context;

	if (packet === null) {
		warnings.push(
			createWarning(
				"missing-packet",
				"No research-specialist packet has been staged for this session yet.",
			),
		);
	}

	if (approval?.status === "pending") {
		warnings.push(
			createWarning(
				"approval-paused",
				"The current research-specialist run is waiting on a pending approval.",
			),
		);
	}

	if (approval?.status === "rejected") {
		warnings.push(
			createWarning(
				"rejected",
				"The latest research-specialist review was rejected and requires a revised packet.",
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

	if (packet?.resultStatus === "degraded") {
		warnings.push(
			createWarning(
				"degraded-packet",
				"The latest research-specialist packet is degraded and should be reviewed carefully.",
			),
		);
	}

	if (selection.mode === "linkedin-outreach") {
		warnings.push(
			createWarning(
				"manual-send-required",
				"LinkedIn outreach remains manual-send only, even when a draft packet is ready.",
			),
		);
	}

	if (
		packet !== null &&
		(selection.session?.status === "running" ||
			selection.session?.status === "waiting" ||
			selection.session?.status === "pending")
	) {
		warnings.push(
			createWarning(
				"resumable-session",
				"This research-specialist session has resumable runtime state and can continue from the latest packet.",
			),
		);
	}

	const runState = resolveRunState({
		job,
		packetResultStatus: packet?.resultStatus ?? null,
		session: selection.session,
	});
	const reviewState = buildSummaryState({
		approval,
		context: resolvedContext,
		mode: selection.mode,
		packet,
		runState,
		session: selection.session,
	});
	const message = buildSummaryMessage({
		context: resolvedContext,
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
		context: resolvedContext,
		failure,
		job: job ? toJobSummary(job) : null,
		message,
		nextAction,
		packet,
		reviewBoundary: createReviewBoundary(selection.mode),
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

export async function createResearchSpecialistSummary(
	services: ApiServiceContainer,
	options: ResearchSpecialistSummaryOptions = {},
): Promise<ResearchSpecialistSummaryPayload> {
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
		workflows: researchSpecialistModeValues.map((mode) =>
			buildWorkflowDescriptor(mode, mode === selection.mode),
		),
	};
}

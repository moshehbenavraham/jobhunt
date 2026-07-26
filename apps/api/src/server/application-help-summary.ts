import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import type {
	RuntimeApprovalRecord,
	RuntimeEventRecord,
	RuntimeJobRecord,
	RuntimeSessionRecord,
} from "../store/store-contract.js";
import {
	APPLICATION_HELP_NO_SUBMIT_MESSAGE,
	loadLatestApplicationHelpDraftPacket,
	resolveApplicationHelpContextFromHints,
} from "../tools/application-help-tools.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import type {
	ApplicationHelpApprovalSummary,
	ApplicationHelpDraftPacketSummary,
	ApplicationHelpFailureSummary,
	ApplicationHelpJobSummary,
	ApplicationHelpMatchedReportContext,
	ApplicationHelpNextAction,
	ApplicationHelpNextReviewGuidance,
	ApplicationHelpReviewBoundary,
	ApplicationHelpReviewState,
	ApplicationHelpSelectedDetail,
	ApplicationHelpSelectedSummary,
	ApplicationHelpSelectionOrigin,
	ApplicationHelpSelectionState,
	ApplicationHelpSessionSummary,
	ApplicationHelpSummaryOptions,
	ApplicationHelpSummaryPayload,
	ApplicationHelpWarningCode,
	ApplicationHelpWarningItem,
} from "./application-help-contract.js";
import { getStartupMessage, getStartupStatus } from "./startup-status.js";

const APPLICATION_HELP_SESSION_LIMIT = 12;

type ApplicationHelpContextHints = {
	artifactName: string | null;
	company: string | null;
	pdfPath: string | null;
	reportNumber: string | null;
	reportPath: string | null;
	role: string | null;
};

type SelectedSessionResult = {
	message: string;
	origin: ApplicationHelpSelectionOrigin;
	session: RuntimeSessionRecord | null;
	state: ApplicationHelpSelectionState;
};

export class ApplicationHelpInputError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-application-help-query") {
		super(message);
		this.code = code;
		this.name = "ApplicationHelpInputError";
	}
}

function isJsonObject(
	value: JsonValue | null,
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

function extractContextHints(context: JsonValue): ApplicationHelpContextHints {
	if (!isJsonObject(context)) {
		return {
			artifactName: null,
			company: null,
			pdfPath: null,
			reportNumber: null,
			reportPath: null,
			role: null,
		};
	}

	const sources = [context];

	for (const key of ["applicationHelp", "artifacts", "report", "selection"]) {
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
		pdfPath,
		reportNumber: selectStringFromSources(sources, ["reportNumber"]),
		reportPath,
		role: selectStringFromSources(sources, ["role", "jobTitle", "title"]),
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

function selectJob(
	session: RuntimeSessionRecord,
	jobs: readonly RuntimeJobRecord[],
): RuntimeJobRecord | null {
	if (jobs.length === 0) {
		return null;
	}

	if (session.activeJobId) {
		const activeJob = jobs.find((job) => job.jobId === session.activeJobId);

		if (activeJob) {
			return activeJob;
		}
	}

	return [...jobs].sort(compareJobs)[0] ?? null;
}

function extractApprovalString(
	approval: RuntimeApprovalRecord,
	key: "action" | "title",
): string {
	if (!isJsonObject(approval.request)) {
		return "";
	}

	return readString(approval.request, key) ?? "";
}

function compareApprovals(
	left: RuntimeApprovalRecord,
	right: RuntimeApprovalRecord,
): number {
	const pendingPriority = left.status === "pending" ? 0 : 1;
	const rightPendingPriority = right.status === "pending" ? 0 : 1;

	if (pendingPriority !== rightPendingPriority) {
		return pendingPriority - rightPendingPriority;
	}

	const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);

	if (updatedComparison !== 0) {
		return updatedComparison;
	}

	return left.approvalId.localeCompare(right.approvalId);
}

function selectApproval(
	approvals: readonly RuntimeApprovalRecord[],
): RuntimeApprovalRecord | null {
	return [...approvals].sort(compareApprovals)[0] ?? null;
}

function extractFailureMessage(event: RuntimeEventRecord): string {
	if (!isJsonObject(event.metadata)) {
		return event.summary;
	}

	return readString(event.metadata, "message") ?? event.summary;
}

function createFailureSummaryFromEvent(
	event: RuntimeEventRecord,
): ApplicationHelpFailureSummary | null {
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
			event.traceId ??
			event.eventId,
		sessionId: event.sessionId,
		traceId: event.traceId,
	};
}

function extractRejectedApprovalMessage(
	approval: RuntimeApprovalRecord,
): string | null {
	if (!isJsonObject(approval.response)) {
		return null;
	}

	return (
		readString(approval.response, "message") ??
		readString(approval.response, "reason")
	);
}

function extractJobErrorMessage(error: JsonValue | null): string | null {
	if (!isJsonObject(error)) {
		return null;
	}

	return readString(error, "message");
}

function createFallbackFailureSummary(input: {
	approval: RuntimeApprovalRecord | null;
	job: RuntimeJobRecord | null;
	session: RuntimeSessionRecord;
}): ApplicationHelpFailureSummary | null {
	if (input.approval?.status === "rejected") {
		return {
			failedAt: input.approval.resolvedAt ?? input.approval.updatedAt,
			jobId: input.approval.jobId,
			message:
				extractRejectedApprovalMessage(input.approval) ??
				"Application-help approval was rejected and requires a revised draft.",
			runId: input.approval.traceId ?? input.approval.approvalId,
			sessionId: input.session.sessionId,
			traceId: input.approval.traceId,
		};
	}

	if (input.job?.status === "failed" || input.session.status === "failed") {
		return {
			failedAt:
				input.job?.completedAt ??
				input.job?.updatedAt ??
				input.session.updatedAt,
			jobId: input.job?.jobId ?? null,
			message:
				(input.job ? extractJobErrorMessage(input.job.error) : null) ??
				`Application-help session ${input.session.sessionId} failed.`,
			runId: input.job?.currentRunId ?? input.session.sessionId,
			sessionId: input.session.sessionId,
			traceId: null,
		};
	}

	return null;
}

function toSessionSummary(
	session: RuntimeSessionRecord,
): ApplicationHelpSessionSummary {
	return {
		activeJobId: session.activeJobId,
		lastHeartbeatAt: session.lastHeartbeatAt,
		resumeAllowed: session.status !== "completed",
		sessionId: session.sessionId,
		status: session.status,
		updatedAt: session.updatedAt,
		workflow: session.workflow,
	};
}

function toJobSummary(job: RuntimeJobRecord): ApplicationHelpJobSummary {
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
): ApplicationHelpApprovalSummary {
	return {
		action: extractApprovalString(approval, "action"),
		approvalId: approval.approvalId,
		jobId: approval.jobId,
		requestedAt: approval.requestedAt,
		resolvedAt: approval.resolvedAt,
		status: approval.status,
		title: extractApprovalString(approval, "title"),
		traceId: approval.traceId,
	};
}

function createReviewBoundary(): ApplicationHelpReviewBoundary {
	return {
		message: APPLICATION_HELP_NO_SUBMIT_MESSAGE,
		reviewRequired: true,
		submissionAllowed: false,
	};
}

function appendWarning(
	items: ApplicationHelpWarningItem[],
	seen: Set<string>,
	code: ApplicationHelpWarningCode,
	message: string,
): void {
	const key = `${code}:${message}`;

	if (seen.has(key)) {
		return;
	}

	seen.add(key);
	items.push({
		code,
		message,
	});
}

function buildWarnings(input: {
	approval: RuntimeApprovalRecord | null;
	draftPacket: ApplicationHelpDraftPacketSummary | null;
	reportContext: ApplicationHelpMatchedReportContext | null;
	session: RuntimeSessionRecord;
}): ApplicationHelpWarningItem[] {
	const warnings: ApplicationHelpWarningItem[] = [];
	const seen = new Set<string>();

	if (input.reportContext === null) {
		appendWarning(
			warnings,
			seen,
			"missing-context",
			"Report-backed context is still missing for this application-help session.",
		);
	} else {
		if (input.reportContext.coverLetter.state === "manual-follow-up") {
			appendWarning(
				warnings,
				seen,
				"cover-letter-manual-follow-up",
				input.reportContext.coverLetter.message,
			);
		}

		if (
			input.reportContext.pdf.repoRelativePath !== null &&
			!input.reportContext.pdf.exists
		) {
			appendWarning(
				warnings,
				seen,
				"missing-pdf-artifact",
				`Saved PDF ${input.reportContext.pdf.repoRelativePath} is missing from output/.`,
			);
		}

		if (input.reportContext.matchState === "fuzzy") {
			appendWarning(
				warnings,
				seen,
				"ambiguous-report-match",
				`Report context was resolved fuzzily from ${input.reportContext.reportRepoRelativePath}. Review the match before reusing draft answers.`,
			);
		}
	}

	if (input.draftPacket === null) {
		appendWarning(
			warnings,
			seen,
			"missing-draft-packet",
			"No structured draft packet has been staged for this application-help session yet.",
		);
	} else {
		for (const warning of input.draftPacket.warnings) {
			appendWarning(warnings, seen, "draft-warning", warning);
		}
	}

	if (input.approval?.status === "pending") {
		appendWarning(
			warnings,
			seen,
			"approval-paused",
			"This application-help session is waiting on human approval before it can continue.",
		);
	}

	if (input.approval?.status === "rejected") {
		appendWarning(
			warnings,
			seen,
			"rejected",
			"The latest application-help review was rejected and needs a revised draft.",
		);
	}

	if (
		input.draftPacket !== null &&
		(input.session.status === "pending" || input.session.status === "running")
	) {
		appendWarning(
			warnings,
			seen,
			"resumable-session",
			"This application-help session has resumable runtime state and can continue from its current draft.",
		);
	}

	return warnings;
}

function determineReviewState(input: {
	approval: RuntimeApprovalRecord | null;
	draftPacket: ApplicationHelpDraftPacketSummary | null;
	reportContext: ApplicationHelpMatchedReportContext | null;
	session: RuntimeSessionRecord;
}): ApplicationHelpReviewState {
	if (input.reportContext === null && input.draftPacket === null) {
		return "missing-context";
	}

	if (input.approval?.status === "pending") {
		return "approval-paused";
	}

	if (input.approval?.status === "rejected") {
		return "rejected";
	}

	if (input.session.status === "completed") {
		return "completed";
	}

	if (input.draftPacket === null) {
		return "no-draft-yet";
	}

	if (
		input.session.status === "pending" ||
		input.session.status === "running"
	) {
		return "resumed";
	}

	return "draft-ready";
}

function createNextReviewGuidance(input: {
	sessionId: string;
	state: ApplicationHelpReviewState;
}): ApplicationHelpNextReviewGuidance {
	const resumeAllowed =
		input.state === "approval-paused" ||
		input.state === "rejected" ||
		input.state === "resumed";

	const actionMap: Record<
		ApplicationHelpReviewState,
		{ action: ApplicationHelpNextAction; message: string }
	> = {
		"approval-paused": {
			action: "resolve-approval",
			message:
				"Resolve the pending approval, then resume the application-help run with the current draft packet.",
		},
		completed: {
			action: "review-draft",
			message:
				"Review the completed draft packet, personalize the answers, and keep submission manual.",
		},
		"draft-ready": {
			action: "review-draft",
			message:
				"Review the latest draft packet and refine any answers before continuing the application flow.",
		},
		"missing-context": {
			action: "match-report",
			message:
				"Attach a saved report or provide report hints before drafting new application-help answers.",
		},
		"no-draft-yet": {
			action: "generate-draft",
			message:
				"Generate and stage the first structured draft packet for this application-help session.",
		},
		rejected: {
			action: "revise-draft",
			message:
				"Revise the staged draft packet to address the rejection feedback, then resume the run.",
		},
		resumed: {
			action: "resume-session",
			message:
				"Resume the existing application-help session and continue from the latest staged draft packet.",
		},
	};

	const selected = actionMap[input.state];

	return {
		action: selected.action,
		message: selected.message,
		resumeAllowed,
		sessionId: input.sessionId,
	};
}

async function selectSession(
	services: ApiServiceContainer,
	options: ApplicationHelpSummaryOptions,
): Promise<SelectedSessionResult> {
	const store = await services.operationalStore.getStore();

	if (options.sessionId) {
		const session = await store.sessions.getById(options.sessionId);

		if (!session || session.workflow !== "application-help") {
			return {
				message: `Application-help session ${options.sessionId} was not found.`,
				origin: "session-id",
				session: null,
				state: "missing",
			};
		}

		return {
			message: `Loaded application-help session ${options.sessionId}.`,
			origin: "session-id",
			session,
			state: "ready",
		};
	}

	const sessions = (
		await store.sessions.listRecent({
			limit: APPLICATION_HELP_SESSION_LIMIT,
			workflow: "application-help",
		})
	).sort(compareSessions);
	const latestSession = sessions[0] ?? null;

	if (!latestSession) {
		return {
			message: "No application-help sessions have been created yet.",
			origin: "none",
			session: null,
			state: "empty",
		};
	}

	return {
		message: `Loaded the latest application-help session ${latestSession.sessionId}.`,
		origin: "latest",
		session: latestSession,
		state: "ready",
	};
}

async function resolveReportContext(input: {
	draftPacket: ApplicationHelpDraftPacketSummary | null;
	services: ApiServiceContainer;
	session: RuntimeSessionRecord;
}): Promise<{
	message: string;
	reportContext: ApplicationHelpMatchedReportContext | null;
}> {
	if (input.draftPacket?.matchedContext) {
		return {
			message: `Loaded staged report context from ${input.draftPacket.matchedContext.reportRepoRelativePath}.`,
			reportContext: input.draftPacket.matchedContext,
		};
	}

	const resolved = await resolveApplicationHelpContextFromHints(
		extractContextHints(input.session.context),
		{
			repoRoot: input.services.workspace.repoPaths.repoRoot,
		},
	);

	return {
		message: resolved.message,
		reportContext: resolved.matchedContext,
	};
}

async function buildSelectedSummary(
	services: ApiServiceContainer,
	session: RuntimeSessionRecord,
): Promise<ApplicationHelpSelectedSummary> {
	const store = await services.operationalStore.getStore();
	const [jobs, approvals, events, draftPacket] = await Promise.all([
		store.jobs.listBySessionId(session.sessionId),
		store.approvals.listBySessionId(session.sessionId),
		store.events.list({
			eventTypes: ["job-failed"],
			limit: 8,
			sessionId: session.sessionId,
		}),
		loadLatestApplicationHelpDraftPacket(
			{
				sessionId: session.sessionId,
			},
			{
				repoRoot: services.workspace.repoPaths.repoRoot,
			},
		),
	]);
	const job = selectJob(session, jobs);
	const approval = selectApproval(approvals);
	const reportContextResolution = await resolveReportContext({
		draftPacket,
		services,
		session,
	});
	const latestFailureEvent = [...events]
		.map(createFailureSummaryFromEvent)
		.filter(
			(failure): failure is ApplicationHelpFailureSummary => failure !== null,
		)
		.sort((left, right) => right.failedAt.localeCompare(left.failedAt))[0];
	const failure =
		latestFailureEvent ??
		createFallbackFailureSummary({
			approval,
			job,
			session,
		});
	const state = determineReviewState({
		approval,
		draftPacket,
		reportContext: reportContextResolution.reportContext,
		session,
	});
	const warnings = buildWarnings({
		approval,
		draftPacket,
		reportContext: reportContextResolution.reportContext,
		session,
	});
	const nextReview = createNextReviewGuidance({
		sessionId: session.sessionId,
		state,
	});

	return {
		approval: approval ? toApprovalSummary(approval) : null,
		draftPacket,
		failure,
		job: job ? toJobSummary(job) : null,
		message: reportContextResolution.message,
		nextReview,
		reportContext: reportContextResolution.reportContext,
		reviewBoundary: createReviewBoundary(),
		session: toSessionSummary(session),
		state,
		warnings,
	};
}

function createEmptySelectedDetail(input: {
	message: string;
	origin: ApplicationHelpSelectionOrigin;
	requestedSessionId: string | null;
	state: ApplicationHelpSelectionState;
}): ApplicationHelpSelectedDetail {
	return {
		message: input.message,
		origin: input.origin,
		requestedSessionId: input.requestedSessionId,
		state: input.state,
		summary: null,
	};
}

export async function createApplicationHelpSummary(
	services: ApiServiceContainer,
	options: ApplicationHelpSummaryOptions = {},
): Promise<ApplicationHelpSummaryPayload> {
	if (
		options.sessionId !== undefined &&
		options.sessionId.trim().length === 0
	) {
		throw new ApplicationHelpInputError(
			"Application-help sessionId must not be empty.",
		);
	}

	const diagnostics = await services.startupDiagnostics.getDiagnostics();
	const startupStatus = getStartupStatus(diagnostics);
	const startupMessage = getStartupMessage(diagnostics);
	const generatedAt = new Date().toISOString();
	const requestedSessionId = options.sessionId?.trim() ?? null;
	const selectedSession = await selectSession(services, {
		...(requestedSessionId ? { sessionId: requestedSessionId } : {}),
	});

	if (!selectedSession.session) {
		return {
			filters: {
				sessionId: requestedSessionId,
			},
			generatedAt,
			message:
				startupStatus === "ready" ? selectedSession.message : startupMessage,
			ok: true,
			selected: createEmptySelectedDetail({
				message: selectedSession.message,
				origin: selectedSession.origin,
				requestedSessionId,
				state: selectedSession.state,
			}),
			service: STARTUP_SERVICE_NAME,
			sessionId: STARTUP_SESSION_ID,
			status: startupStatus,
		};
	}

	const summary = await buildSelectedSummary(services, selectedSession.session);

	return {
		filters: {
			sessionId: requestedSessionId,
		},
		generatedAt,
		message: startupStatus === "ready" ? summary.message : startupMessage,
		ok: true,
		selected: {
			message: summary.message,
			origin: selectedSession.origin,
			requestedSessionId,
			state: selectedSession.state,
			summary,
		},
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		status: startupStatus,
	};
}

#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");

function createReadyStartupPayload() {
	return {
		appStateRoot: {
			exists: true,
			path: `${ROOT}/.jobhunt-app`,
		},
		bootSurface: {
			defaultHost: "127.0.0.1",
			defaultPort: 4174,
			healthPath: "/health",
			startupPath: "/startup",
		},
		diagnostics: {
			onboardingMissing: [],
			optionalMissing: [],
			promptContract: {
				cacheMode: "fresh",
				sourceOrder: ["agents-guide", "mode-file"],
				sources: [
					{
						key: "agents-guide",
						label: "AGENTS guide",
						notes: [],
						optional: false,
						precedence: 1,
						role: "system",
					},
				],
				supportedWorkflows: ["single-evaluation"],
				workflowRoutes: [
					{
						description: "Single evaluation route",
						intent: "single-evaluation",
						modeRepoRelativePath: "modes/oferta.md",
					},
				],
			},
			runtimeMissing: [],
			workspace: {
				protectedOwners: ["system", "user"],
				writableRoots: ["config", "data", "output", "profile", "reports"],
			},
		},
		health: {
			message: "Bootstrap diagnostics are ready.",
			missing: {
				onboarding: 0,
				optional: 0,
				runtime: 0,
			},
			ok: true,
			operationalStore: {
				message: "Operational store ready.",
				status: "ready",
			},
			service: "jobhunt-api-scaffold",
			sessionId: "phase01-session03-agent-runtime-bootstrap",
			startupStatus: "ready",
			status: "ok",
		},
		message: "Bootstrap diagnostics are ready.",
		mutationPolicy: "app-owned-only",
		operationalStore: {
			databasePath: `${ROOT}/.jobhunt-app/app.db`,
			message: "Operational store ready.",
			reason: null,
			rootExists: true,
			rootPath: `${ROOT}/.jobhunt-app`,
			status: "ready",
		},
		repoRoot: ROOT,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		userLayerWrites: "disabled",
	};
}

function createReadyShellSummary() {
	return {
		activity: {
			activeSession: {
				activeJob: {
					jobId: "job-live",
					status: "running",
					updatedAt: "2026-04-21T22:50:00.000Z",
					waitReason: null,
				},
				activeJobId: "job-live",
				lastHeartbeatAt: "2026-04-21T22:50:00.000Z",
				pendingApprovalCount: 2,
				sessionId: "session-live",
				status: "running",
				updatedAt: "2026-04-21T22:50:00.000Z",
				workflow: "single-evaluation",
			},
			activeSessionCount: 1,
			latestPendingApprovals: [
				{
					action: "approve-email",
					approvalId: "approval-1",
					jobId: "job-live",
					requestedAt: "2026-04-21T22:49:00.000Z",
					sessionId: "session-live",
					title: "Review application email",
					traceId: "trace-approval-1",
				},
				{
					action: "approve-pdf",
					approvalId: "approval-2",
					jobId: "job-live",
					requestedAt: "2026-04-21T22:49:30.000Z",
					sessionId: "session-live",
					title: "Publish tailored PDF",
					traceId: "trace-approval-2",
				},
			],
			pendingApprovalCount: 2,
			recentFailureCount: 1,
			recentFailures: [
				{
					failedAt: "2026-04-21T22:48:00.000Z",
					jobId: "job-failed",
					message: "Recent shell failure",
					runId: "run-failed",
					sessionId: "session-failed",
					traceId: "trace-failed",
				},
			],
			state: "attention-required",
		},
		currentSession: {
			id: "phase04-session04-pipeline-review-workspace",
			monorepo: true,
			packagePath: "apps/web",
			phase: 4,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-21T22:50:00.000Z",
		health: {
			agentRuntime: {
				authPath: `${ROOT}/data/openai-account-auth.json`,
				message: "Agent runtime ready.",
				promptState: "ready",
				status: "ready",
			},
			message: "Bootstrap diagnostics are ready.",
			missing: {
				onboarding: 0,
				optional: 0,
				runtime: 0,
			},
			ok: true,
			operationalStore: {
				message: "Operational store ready.",
				status: "ready",
			},
			service: "jobhunt-api-scaffold",
			sessionId: "phase01-session03-agent-runtime-bootstrap",
			startupStatus: "ready",
			status: "ok",
		},
		message: "Bootstrap diagnostics are ready.",
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
	};
}

function createRuntimeErrorShellSummary() {
	return {
		activity: {
			activeSession: null,
			activeSessionCount: 0,
			latestPendingApprovals: [],
			pendingApprovalCount: 0,
			recentFailureCount: 0,
			recentFailures: [],
			state: "unavailable",
		},
		currentSession: {
			id: "phase04-session04-pipeline-review-workspace",
			monorepo: true,
			packagePath: "apps/web",
			phase: 4,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-21T22:55:00.000Z",
		health: {
			agentRuntime: {
				authPath: `${ROOT}/data/openai-account-auth.json`,
				message: "Agent runtime ready.",
				promptState: "ready",
				status: "ready",
			},
			message: "Bootstrap is live, but required system files are missing.",
			missing: {
				onboarding: 0,
				optional: 0,
				runtime: 1,
			},
			ok: false,
			operationalStore: {
				message: "Operational store is corrupt.",
				status: "corrupt",
			},
			service: "jobhunt-api-scaffold",
			sessionId: "phase01-session03-agent-runtime-bootstrap",
			startupStatus: "runtime-error",
			status: "error",
		},
		message: "Bootstrap is live, but required system files are missing.",
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "runtime-error",
	};
}

function createWorkflowOptions() {
	return [
		{
			description: "Single evaluation route",
			intent: "single-evaluation",
			label: "Single Evaluation",
			message:
				"Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.",
			missingCapabilities: [],
			modeRepoRelativePath: "modes/oferta.md",
			specialist: {
				description:
					"Owns job-description intake and evaluation follow-through.",
				id: "evaluation-specialist",
				label: "Evaluation Specialist",
			},
			status: "ready",
		},
	];
}

function createSessionSummary(overrides = {}) {
	return {
		activeJobId: `${overrides.sessionId}-job`,
		job: {
			attempt: 1,
			completedAt: null,
			currentRunId: `${overrides.sessionId}-run`,
			jobId: `${overrides.sessionId}-job`,
			jobType: overrides.workflow,
			startedAt: "2026-04-21T22:56:30.000Z",
			status: "running",
			updatedAt: "2026-04-21T22:56:30.000Z",
			waitReason: null,
		},
		latestFailure: null,
		lastHeartbeatAt: "2026-04-21T22:56:30.000Z",
		pendingApproval: null,
		pendingApprovalCount: 0,
		resumeAllowed: true,
		sessionId: overrides.sessionId,
		state: "running",
		status: "running",
		updatedAt: "2026-04-21T22:56:30.000Z",
		workflow: overrides.workflow,
	};
}

function createSessionDetail(summary, message) {
	return {
		approvals: [],
		failure: null,
		jobs: [summary.job],
		route: {
			message,
			missingCapabilities: [],
			specialistId: "evaluation-specialist",
			status: "ready",
		},
		session: summary,
		timeline: [
			{
				approvalId: null,
				eventId: `${summary.sessionId}-event`,
				eventType: "job-execution-started",
				jobId: summary.job.jobId,
				level: "info",
				occurredAt: summary.updatedAt,
				requestId: `${summary.sessionId}-request`,
				sessionId: summary.sessionId,
				summary: message,
				traceId: `${summary.sessionId}-trace`,
			},
		],
	};
}

function createChatConsoleSummaryPayload(state, selectedSessionId = null) {
	const sessions = [...state.sessionDetails.values()].map(
		(detail) => detail.session,
	);
	const selectedDetail =
		(selectedSessionId && state.sessionDetails.get(selectedSessionId)) ||
		(state.lastChatSessionId &&
			state.sessionDetails.get(state.lastChatSessionId)) ||
		null;

	return {
		generatedAt: "2026-04-21T22:56:00.000Z",
		message: "Chat console summary is ready.",
		ok: true,
		recentSessions: sessions,
		selectedSession: selectedDetail,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		workflows: createWorkflowOptions(),
	};
}

function createEvaluationResultPayload(requestUrl = "/evaluation-result") {
	const url = new URL(requestUrl, "http://127.0.0.1");

	return {
		filters: {
			previewLimit: 4,
			sessionId: url.searchParams.get("sessionId"),
			workflow: null,
		},
		generatedAt: "2026-04-21T22:56:00.000Z",
		message: "Evaluation result summary is ready.",
		ok: true,
		recentSessions: [],
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		summary: null,
	};
}

function createCommandPayload(input) {
	return {
		generatedAt: "2026-04-21T22:56:30.000Z",
		handoff: {
			job: input.detail.session.job,
			message: input.message,
			pendingApproval: null,
			requestedAt: "2026-04-21T22:56:30.000Z",
			route: {
				message: input.message,
				missingCapabilities: [],
				requestKind: "launch",
				sessionId: input.detail.session.sessionId,
				specialistId: "evaluation-specialist",
				status: "ready",
				workflow: "single-evaluation",
			},
			runtime: {
				message: "Agent runtime ready.",
				model: "gpt-5.4-mini",
				modeRepoRelativePath: "modes/oferta.md",
				startedAt: "2026-04-21T22:56:30.000Z",
				status: "ready",
				workflow: "single-evaluation",
			},
			selectedSession: input.detail,
			session: input.detail.session,
			specialist: {
				description:
					"Owns job-description intake and evaluation follow-through.",
				id: "evaluation-specialist",
				label: "Evaluation Specialist",
			},
			state: "running",
			toolingGap: null,
		},
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
	};
}

function createScanReviewPayload(requestUrl = "/scan-review") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedUrl = url.searchParams.get("url");
	const row = {
		batchSeed: {
			item: {
				bucket: "strongest-fit",
				company: "Cohere",
				reasonSummary: "Strongest current agentic-workflows fit.",
				role: "Applied AI Engineer",
				url: "https://example.com/jobs/cohere-applied-ai",
			},
			message:
				"Seed batch review with https://example.com/jobs/cohere-applied-ai.",
			selection: {
				limit: 1,
				mode: "selected-urls",
				urls: ["https://example.com/jobs/cohere-applied-ai"],
			},
			target: "batch-composer",
		},
		bucket: "strongest-fit",
		company: "Cohere",
		duplicateHint: {
			firstSeen: "2026-04-20",
			freshness: "recent",
			historyCount: 2,
			otherShortlistCount: 1,
			pendingOverlap: true,
			portal: "Greenhouse",
			status: "queued",
			title: "Applied AI Engineer",
		},
		evaluate: {
			context: {
				promptText: "https://example.com/jobs/cohere-applied-ai",
			},
			message:
				"Launch a single evaluation for https://example.com/jobs/cohere-applied-ai.",
			workflow: "single-evaluation",
		},
		ignoreAction: {
			action: "ignore",
			message: "Hide this role from the current scan review session.",
			sessionId: "scan-session-01",
			url: "https://example.com/jobs/cohere-applied-ai",
		},
		ignored: false,
		rank: 1,
		reasonSummary: "Strongest current agentic-workflows fit.",
		role: "Applied AI Engineer",
		selected: requestedUrl === "https://example.com/jobs/cohere-applied-ai",
		url: "https://example.com/jobs/cohere-applied-ai",
		warningCount: 2,
		warnings: [
			{
				code: "duplicate-heavy",
				message:
					"Similar shortlist candidates already exist for this company, so this item needs duplicate review.",
			},
			{
				code: "already-pending",
				message: "This role already exists in the pending pipeline queue.",
			},
		],
	};

	return {
		filters: {
			bucket: "all",
			includeIgnored: false,
			limit: 12,
			offset: 0,
			sessionId: null,
			url: requestedUrl,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		launcher: {
			available: true,
			canStart: true,
			message: "Scan launcher is ready.",
			workflow: "scan-portals",
		},
		message: "Showing 1 shortlist candidate.",
		ok: true,
		run: {
			activeJobId: "job-scan-live",
			approvalId: null,
			completedAt: "2026-04-22T00:00:00.000Z",
			filter: {
				company: null,
				compareClean: false,
				dryRun: false,
			},
			message: "The latest scan run completed with 1 new offer added.",
			runId: "run-scan-live",
			sessionId: "scan-session-01",
			startedAt: "2026-04-22T00:00:00.000Z",
			state: "completed",
			summary: {
				companiesConfigured: 4,
				companiesScanned: 4,
				companiesSkipped: 0,
				duplicatesSkipped: 1,
				filteredByLocation: 0,
				filteredByTitle: 0,
				newOffersAdded: 1,
				totalJobsFound: 5,
			},
			updatedAt: "2026-04-22T00:00:00.000Z",
			warnings: [],
		},
		selectedDetail: requestedUrl
			? {
					message: `Showing shortlist candidate ${requestedUrl}.`,
					origin: "url",
					requestedUrl,
					row: {
						...row,
						sourceLine:
							"1. Strongest fit | https://example.com/jobs/cohere-applied-ai | Cohere | Applied AI Engineer",
					},
					state: "ready",
				}
			: {
					message:
						"Select a shortlist candidate to inspect dedup context and follow-through metadata.",
					origin: "none",
					requestedUrl: null,
					row: null,
					state: "empty",
				},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		shortlist: {
			available: true,
			campaignGuidance: "Current strongest lane: Applied AI.",
			counts: {
				adjacentOrNoisy: 0,
				duplicateHeavy: 1,
				ignored: 0,
				pendingOverlap: 1,
				possibleFit: 0,
				strongestFit: 1,
				total: 1,
			},
			filteredCount: 1,
			hasMore: false,
			items: [row],
			lastRefreshed: "2026-04-22",
			limit: 12,
			message: "Shortlist candidates are ready for review.",
			offset: 0,
			totalCount: 1,
		},
		status: "ready",
	};
}

function createBatchWorkspacePayload(requestUrl = "/batch-supervisor") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedItemId = Number.parseInt(
		url.searchParams.get("itemId") ?? "",
		10,
	);
	const selectedItemId = Number.isInteger(requestedItemId)
		? requestedItemId
		: null;
	const rows = [
		{
			artifacts: {
				pdf: {
					exists: false,
					message: "No PDF artifact is linked to batch item #1 yet.",
					repoRelativePath: null,
				},
				report: {
					exists: false,
					message: "No report artifact is linked to batch item #1 yet.",
					repoRelativePath: null,
				},
				tracker: {
					exists: false,
					message: "No tracker artifact is linked to batch item #1 yet.",
					repoRelativePath: null,
				},
			},
			company: "Acme",
			completedAt: "2026-04-22T00:04:00.000Z",
			error: "worker timeout",
			id: 1,
			legitimacy: null,
			notes: "Retryable failure from the last batch run.",
			rawStateError: null,
			reportNumber: null,
			resultWarnings: [],
			retries: 1,
			role: "Platform Engineer",
			score: null,
			source: "scan",
			startedAt: "2026-04-22T00:01:00.000Z",
			status: "retryable-failed",
			url: "https://example.com/jobs/acme-platform",
			warnings: [
				{
					code: "retryable-failed",
					message:
						"Item #1 failed with a retryable error and can be re-queued.",
				},
			],
		},
		{
			artifacts: {
				pdf: {
					exists: false,
					message: "No PDF artifact is linked to batch item #2 yet.",
					repoRelativePath: null,
				},
				report: {
					exists: true,
					message:
						"Report artifact reports/002-beta-solutions-architect.md is available.",
					repoRelativePath: "reports/002-beta-solutions-architect.md",
				},
				tracker: {
					exists: false,
					message: "Tracker artifact is still pending for batch item #2.",
					repoRelativePath: null,
				},
			},
			company: "Beta",
			completedAt: "2026-04-22T00:06:00.000Z",
			error: null,
			id: 2,
			legitimacy: "Proceed with Caution",
			notes: "Partial result waiting on tracker closeout.",
			rawStateError: null,
			reportNumber: "002",
			resultWarnings: ["tracker-not-written"],
			retries: 0,
			role: "Solutions Architect",
			score: 4.1,
			source: "scan",
			startedAt: "2026-04-22T00:03:00.000Z",
			status: "partial",
			url: "https://example.com/jobs/beta-solutions",
			warnings: [
				{
					code: "partial-result",
					message:
						"Batch item #2 produced a partial result and still needs tracker closeout.",
				},
				{
					code: "missing-tracker-artifact",
					message: "Tracker artifact is still pending for batch item #2.",
				},
			],
		},
	];
	const visibleRows = rows.map((row) => ({
		artifacts: row.artifacts,
		company: row.company,
		completedAt: row.completedAt,
		error: row.error,
		id: row.id,
		legitimacy: row.legitimacy,
		reportNumber: row.reportNumber,
		retries: row.retries,
		role: row.role,
		score: row.score,
		selected: row.id === selectedItemId,
		startedAt: row.startedAt,
		status: row.status,
		url: row.url,
		warningCount: row.warnings.length,
		warnings: row.warnings,
	}));
	const selectedRow =
		selectedItemId === null
			? null
			: (rows.find((row) => row.id === selectedItemId) ?? null);

	return {
		actions: [
			{
				action: "resume-run-pending",
				available: true,
				message: "Resume a batch run for pending rows.",
			},
			{
				action: "retry-failed",
				available: true,
				message: "Retry batch items that failed with retryable errors.",
			},
			{
				action: "merge-tracker-additions",
				available: true,
				message: "Merge pending tracker additions into the canonical tracker.",
			},
			{
				action: "verify-tracker-pipeline",
				available: true,
				message: "Run tracker verification against the current closeout state.",
			},
		],
		closeout: {
			mergeBlocked: false,
			message: "Tracker closeout is ready for review.",
			pendingTrackerAdditionCount: 1,
			warnings: [],
		},
		draft: {
			available: true,
			counts: {
				completed: 0,
				failed: 0,
				partial: 1,
				pending: 0,
				processing: 0,
				retryableFailed: 1,
				skipped: 0,
				total: 2,
			},
			firstRunnableItemId: 1,
			message: "Batch draft is ready for supervision.",
			pendingTrackerAdditionCount: 1,
			totalCount: 2,
		},
		filters: {
			itemId: selectedItemId,
			limit: 12,
			offset: 0,
			status: "all",
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		items: {
			filteredCount: 2,
			hasMore: false,
			items: visibleRows,
			limit: 12,
			offset: 0,
			totalCount: 2,
		},
		message: "Showing 2 of 2 batch rows.",
		ok: true,
		run: {
			approvalId: "approval-batch-shell-01",
			checkpoint: {
				completedItemCount: 1,
				cursor: 1,
				lastProcessedItemId: 1,
				updatedAt: "2026-04-22T00:06:00.000Z",
			},
			completedAt: null,
			counts: {
				completed: 0,
				failed: 0,
				partial: 1,
				pending: 0,
				processing: 0,
				retryableFailed: 1,
				skipped: 0,
				total: 2,
			},
			dryRun: false,
			jobId: "job-batch-shell-01",
			message: "Batch run is waiting on approval before it can continue.",
			mode: "retry-failed",
			runId: "run-batch-shell-01",
			sessionId: "session-batch-shell-01",
			startedAt: "2026-04-22T00:00:00.000Z",
			state: "approval-paused",
			updatedAt: "2026-04-22T00:08:00.000Z",
			warnings: [
				{
					code: "approval-paused",
					message: "Batch run paused because approval is required to continue.",
				},
			],
		},
		selectedDetail:
			selectedRow === null
				? {
						message:
							"Select a batch row to inspect warnings, artifacts, and next actions.",
						origin: "none",
						requestedItemId: null,
						row: null,
						state: "empty",
					}
				: {
						message: `Showing batch item #${selectedRow.id}.`,
						origin: "item-id",
						requestedItemId: selectedRow.id,
						row: {
							artifacts: selectedRow.artifacts,
							company: selectedRow.company,
							completedAt: selectedRow.completedAt,
							error: selectedRow.error,
							id: selectedRow.id,
							legitimacy: selectedRow.legitimacy,
							notes: selectedRow.notes,
							rawStateError: selectedRow.rawStateError,
							reportNumber: selectedRow.reportNumber,
							resultWarnings: selectedRow.resultWarnings,
							retries: selectedRow.retries,
							role: selectedRow.role,
							score: selectedRow.score,
							selected: true,
							source: selectedRow.source,
							startedAt: selectedRow.startedAt,
							status: selectedRow.status,
							url: selectedRow.url,
							warningCount: selectedRow.warnings.length,
							warnings: selectedRow.warnings,
						},
						state: "ready",
					},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		statusOptions: [
			{
				count: 2,
				id: "all",
				label: "All",
			},
			{
				count: 1,
				id: "retryable-failed",
				label: "Retryable failed",
			},
			{
				count: 1,
				id: "partial",
				label: "Partial",
			},
		],
	};
}

function createPipelineReviewPayload() {
	return {
		filters: {
			limit: 12,
			offset: 0,
			reportNumber: null,
			section: "all",
			sort: "queue",
			url: null,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: "Showing 1 queue row for review.",
		ok: true,
		queue: {
			counts: {
				malformed: 0,
				pending: 1,
				processed: 0,
			},
			hasMore: false,
			items: [
				{
					company: "Acme",
					kind: "pending",
					legitimacy: null,
					pdf: {
						exists: false,
						message:
							"Pending queue rows do not have checked-in PDF artifacts yet.",
						repoRelativePath: null,
					},
					report: {
						exists: false,
						message:
							"Pending queue rows do not have checked-in report artifacts yet.",
						repoRelativePath: null,
					},
					reportNumber: null,
					role: "Forward Deployed Engineer",
					score: null,
					selected: false,
					url: "https://example.com/jobs/pending-fde",
					verification: null,
					warningCount: 0,
					warnings: [],
				},
			],
			limit: 12,
			offset: 0,
			section: "all",
			sort: "queue",
			totalCount: 1,
		},
		selectedDetail: {
			message: "Select a queue row to inspect its review detail.",
			origin: "none",
			requestedReportNumber: null,
			requestedUrl: null,
			row: null,
			state: "empty",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		shortlist: {
			available: true,
			bucketCounts: {
				adjacentOrNoisy: 0,
				possibleFit: 0,
				strongestFit: 1,
			},
			campaignGuidance: "Current strongest lane: Forward Deployed.",
			generatedBy: "npm run scan",
			lastRefreshed: "2026-04-22",
			message: "Shortlist guidance is available for queue review.",
			topRoles: [
				{
					bucketLabel: "Strongest fit",
					company: "Acme",
					reasonSummary: "direct forward-deployed title",
					role: "Forward Deployed Engineer",
					url: "https://example.com/jobs/pending-fde",
				},
			],
		},
		status: "ready",
	};
}

function createTrackerWorkspacePayload(requestUrl = "/tracker-workspace") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedReportNumber =
		url.searchParams.get("reportNumber")?.trim() || null;
	const focusedPendingAddition =
		requestedReportNumber === "020"
			? {
					company: "Future Company",
					entryNumber: 20,
					fileName: "20-future-company.tsv",
					notes: "Pending add",
					reportNumber: "020",
					reportRepoRelativePath: "reports/020-future-company-2026-04-22.md",
					repoRelativePath: "batch/tracker-additions/20-future-company.tsv",
					role: "Forward Deployed Engineer",
					status: "Evaluated",
				}
			: null;
	const selectedEntryNumber = requestedReportNumber ? null : 19;
	const selectedRow =
		requestedReportNumber === "019" || requestedReportNumber === null
			? {
					company: "Cohere",
					date: "2026-04-22",
					entryNumber: 19,
					header: {
						date: "2026-04-22",
						legitimacy: "High Confidence",
						pdf: {
							exists: true,
							message:
								"Checked-in PDF artifact output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf is available.",
							repoRelativePath:
								"output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf",
						},
						score: 4.4,
						title:
							"Evaluation: Cohere -- Applied AI Engineer - Agentic Workflows",
						url: "https://example.com/jobs/cohere-agentic",
						verification: "active via browser review",
					},
					notes:
						"Strongest current agentic-workflows fit in the queue; remote-flexible and worth prioritizing.",
					pdf: {
						exists: true,
						message:
							"Checked-in PDF artifact output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf is available.",
						repoRelativePath:
							"output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf",
					},
					report: {
						exists: true,
						message:
							"Checked-in report artifact reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md is available.",
						repoRelativePath:
							"reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
					},
					role: "Applied AI Engineer - Agentic Workflows",
					score: 4.4,
					scoreLabel: "4.4/5",
					sourceLine:
						"| 19 | 2026-04-22 | Cohere | Applied AI Engineer - Agentic Workflows | 4.4/5 | Evaluated | Y | [019](reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md) | Strongest current agentic-workflows fit in the queue; remote-flexible and worth prioritizing. |",
					status: "Evaluated",
					warnings: [],
				}
			: null;

	return {
		filters: {
			entryNumber: selectedEntryNumber,
			limit: 12,
			offset: 0,
			reportNumber: requestedReportNumber,
			search: null,
			sort: "date",
			status: null,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message:
			"Showing 2 of 2 tracker rows. 1 pending tracker TSV addition is waiting to merge.",
		ok: true,
		pendingAdditions: {
			count: 1,
			items: [
				{
					company: "Future Company",
					entryNumber: 20,
					fileName: "20-future-company.tsv",
					notes: "Pending add",
					reportNumber: "020",
					reportRepoRelativePath: "reports/020-future-company-2026-04-22.md",
					repoRelativePath: "batch/tracker-additions/20-future-company.tsv",
					role: "Forward Deployed Engineer",
					status: "Evaluated",
				},
			],
			message: "1 pending tracker TSV addition is waiting to merge.",
		},
		rows: {
			filteredCount: 2,
			hasMore: false,
			items: [
				{
					company: "Cohere",
					date: "2026-04-22",
					entryNumber: 19,
					pdf: {
						exists: true,
						message:
							"Checked-in PDF artifact output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf is available.",
						repoRelativePath:
							"output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf",
					},
					report: {
						exists: true,
						message:
							"Checked-in report artifact reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md is available.",
						repoRelativePath:
							"reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
					},
					role: "Applied AI Engineer - Agentic Workflows",
					score: 4.4,
					scoreLabel: "4.4/5",
					selected:
						requestedReportNumber === null || requestedReportNumber === "019",
					status: "Evaluated",
					warningCount: 0,
					warnings: [],
				},
				{
					company: "Anthropic",
					date: "2026-04-21",
					entryNumber: 16,
					pdf: {
						exists: true,
						message:
							"Checked-in PDF artifact output/cv-anthropic-solutions-architect-startups-2026-04-21.pdf is available.",
						repoRelativePath:
							"output/cv-anthropic-solutions-architect-startups-2026-04-21.pdf",
					},
					report: {
						exists: true,
						message:
							"Checked-in report artifact reports/016-anthropic-solutions-architect-startups-2026-04-21.md is available.",
						repoRelativePath:
							"reports/016-anthropic-solutions-architect-startups-2026-04-21.md",
					},
					role: "Solutions Architect, Applied AI (Startups)",
					score: 4.4,
					scoreLabel: "4.4/5",
					selected: false,
					status: "Evaluated",
					warningCount: 0,
					warnings: [],
				},
			],
			limit: 12,
			offset: 0,
			sort: "date",
			totalCount: 2,
		},
		selectedDetail: {
			message: focusedPendingAddition
				? "Showing staged tracker addition for report #020. Merge tracker additions to create the canonical row."
				: requestedReportNumber === "019"
					? "Showing tracker row for report #019."
					: "Showing selected tracker row #19.",
			origin: requestedReportNumber === null ? "entry-number" : "report-number",
			pendingAddition: focusedPendingAddition,
			requestedEntryNumber: selectedRow?.entryNumber ?? null,
			requestedReportNumber,
			row: selectedRow
				? {
						...selectedRow,
						selected: true,
						warningCount: selectedRow.warnings.length,
					}
				: null,
			state: focusedPendingAddition || selectedRow ? "ready" : "empty",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		statusOptions: [
			{
				count: 2,
				id: "evaluated",
				label: "Evaluated",
			},
			{
				count: 0,
				id: "applied",
				label: "Applied",
			},
			{
				count: 0,
				id: "interview",
				label: "Interview",
			},
		],
	};
}

function createReportViewerPayload(requestUrl = "/report-viewer") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const reportPath =
		url.searchParams.get("reportPath") ??
		"reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md";
	const isPendingFocus =
		reportPath === "reports/020-future-company-2026-04-22.md";

	return {
		filters: {
			group: "reports",
			limit: 8,
			offset: 0,
			reportPath,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: "Showing the selected report artifact.",
		ok: true,
		recentArtifacts: {
			group: "reports",
			hasMore: false,
			items: [
				{
					artifactDate: "2026-04-22",
					fileName:
						"019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
					kind: "report",
					repoRelativePath:
						"reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
					reportNumber: "019",
					selected:
						!isPendingFocus &&
						reportPath ===
							"reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
				},
				{
					artifactDate: "2026-04-22",
					fileName: "020-future-company-2026-04-22.md",
					kind: "report",
					repoRelativePath: "reports/020-future-company-2026-04-22.md",
					reportNumber: "020",
					selected: isPendingFocus,
				},
			],
			limit: 8,
			offset: 0,
			totalCount: 2,
		},
		selectedReport: {
			body: isPendingFocus
				? [
						"# Evaluation: Future Company -- Forward Deployed Engineer",
						"",
						"Pending tracker report body.",
					].join("\n")
				: [
						"# Evaluation: Cohere -- Applied AI Engineer - Agentic Workflows",
						"",
						"Tracker handoff report body.",
					].join("\n"),
			header: {
				archetype: isPendingFocus ? "Forward Deployed" : "Applied AI",
				date: "2026-04-22",
				legitimacy: "High Confidence",
				pdf: {
					exists: !isPendingFocus,
					repoRelativePath: isPendingFocus
						? null
						: "output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf",
				},
				score: isPendingFocus ? 4.1 : 4.4,
				title: isPendingFocus
					? "Evaluation: Future Company -- Forward Deployed Engineer"
					: "Evaluation: Cohere -- Applied AI Engineer - Agentic Workflows",
				url: isPendingFocus
					? "https://example.com/jobs/future-company"
					: "https://example.com/jobs/cohere-agentic",
				verification: "active via browser review",
			},
			message: `Showing selected report ${reportPath}.`,
			origin: "selected",
			repoRelativePath: reportPath,
			reportNumber: isPendingFocus ? "020" : "019",
			requestedRepoRelativePath: reportPath,
			state: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
	};
}

function createUpdateCheck(updateState) {
	if (updateState === "update-available") {
		return {
			changelogExcerpt: "New settings surface shipped.",
			checkedAt: "2026-04-22T00:00:00.000Z",
			command: "node scripts/update-system.mjs check",
			localVersion: "1.5.38",
			message: "Job-Hunt update available (1.5.38 -> 1.6.0).",
			remoteVersion: "1.6.0",
			state: "update-available",
		};
	}

	return {
		changelogExcerpt: null,
		checkedAt: "2026-04-22T00:00:00.000Z",
		command: "node scripts/update-system.mjs check",
		localVersion: "1.5.38",
		message: "Job-Hunt is up to date (1.5.38).",
		remoteVersion: "1.5.38",
		state: "up-to-date",
	};
}

function createSettingsSummary(updateState) {
	return {
		auth: {
			auth: {
				accountId: "acct-settings-ready",
				authPath: `${ROOT}/data/openai-account-auth.json`,
				expiresAt: 1778777777000,
				message: "OpenAI account auth is ready.",
				nextSteps: ["Run `npm run doctor` after auth changes."],
				state: "ready",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			config: {
				authPath: `${ROOT}/data/openai-account-auth.json`,
				baseUrl: "https://chatgpt.com/backend-api",
				model: "gpt-5.4-mini",
				originator: "jobhunt-web-shell-smoke",
				overrides: {
					authPath: false,
					baseUrl: false,
					model: false,
					originator: true,
				},
			},
			message: "Agent runtime ready.",
			status: "ready",
		},
		currentSession: {
			id: "phase03-session05-settings-and-maintenance-surface",
			monorepo: true,
			packagePath: "apps/web",
			phase: 3,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		health: {
			agentRuntime: {
				authPath: `${ROOT}/data/openai-account-auth.json`,
				message: "Agent runtime ready.",
				promptState: "ready",
				status: "ready",
			},
			message: "Bootstrap diagnostics are ready.",
			missing: {
				onboarding: 0,
				optional: 0,
				runtime: 0,
			},
			ok: true,
			operationalStore: {
				message: "Operational store ready.",
				status: "ready",
			},
			service: "jobhunt-api-scaffold",
			sessionId: "phase01-session03-agent-runtime-bootstrap",
			startupStatus: "ready",
			status: "ok",
		},
		maintenance: {
			commands: [
				{
					category: "diagnostics",
					command: "npm run doctor",
					description: "Validate repo prerequisites.",
					id: "doctor",
					label: "Run doctor",
				},
			],
			updateCheck: createUpdateCheck(updateState),
		},
		message: "Settings summary is ready.",
		ok: true,
		operationalStore: {
			databasePath: `${ROOT}/.jobhunt-app/app.db`,
			message: "Operational store ready.",
			reason: null,
			rootExists: true,
			rootPath: `${ROOT}/.jobhunt-app`,
			status: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		support: {
			prompt: {
				cacheMode: "read-through-mtime",
				sourceOrder: ["agents-guide", "shared-mode"],
				sources: [
					{
						key: "agents-guide",
						label: "AGENTS guide",
						optional: false,
						precedence: 1,
						role: "system",
					},
				],
				supportedWorkflowCount: 2,
			},
			tools: {
				hasMore: false,
				previewLimit: 2,
				tools: [
					{
						description: "Summarize prompt-routed workflow support.",
						jobTypes: [],
						mutationTargets: [],
						name: "summarize-workflow-support",
						requiresApproval: false,
						scripts: [],
					},
				],
				totalCount: 1,
			},
			workflows: {
				hasMore: false,
				previewLimit: 2,
				totalCount: 1,
				workflows: [
					{
						description: "Single evaluation route",
						intent: "single-evaluation",
						message:
							"Single evaluation can launch with the evaluation specialist.",
						missingCapabilities: [],
						modeExists: true,
						modeRepoRelativePath: "modes/oferta.md",
						specialist: {
							description: "Owns evaluation follow-through.",
							id: "evaluation-specialist",
							label: "Evaluation Specialist",
						},
						status: "ready",
						toolPreview: ["bootstrap-single-evaluation"],
					},
				],
			},
		},
		workspace: {
			agentsGuidePath: `${ROOT}/AGENTS.md`,
			apiPackagePath: `${ROOT}/apps/api`,
			appStateRootPath: `${ROOT}/.jobhunt-app`,
			currentSession: {
				id: "phase03-session05-settings-and-maintenance-surface",
				monorepo: true,
				packageAbsolutePath: `${ROOT}/apps/web`,
				packagePath: "apps/web",
				phase: 3,
				source: "state-file",
				specDirectoryPath: `${ROOT}/.spec_system/specs/phase03-session05-settings-and-maintenance-surface`,
				stateFilePath: `${ROOT}/.spec_system/state.json`,
			},
			dataContractPath: `${ROOT}/docs/DATA_CONTRACT.md`,
			protectedOwners: ["system", "user"],
			repoRoot: ROOT,
			specSystemPath: `${ROOT}/.spec_system`,
			webPackagePath: `${ROOT}/apps/web`,
			writableRoots: ["config", "data", "output", "profile", "reports"],
		},
	};
}

function getFreePort() {
	return new Promise((resolvePort, reject) => {
		const server = createServer();

		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();

			if (typeof address !== "object" || address === null) {
				reject(new Error("Failed to allocate a free local port."));
				return;
			}

			server.close((error) => {
				if (error) {
					reject(error);
					return;
				}

				resolvePort(address.port);
			});
		});
	});
}

async function stopChild(child) {
	if (child.exitCode !== null) {
		return;
	}

	child.kill("SIGTERM");

	for (let attempt = 0; attempt < 30; attempt += 1) {
		if (child.exitCode !== null) {
			return;
		}

		await delay(100);
	}

	child.kill("SIGKILL");
}

async function waitForHttpOk(url, child, stderrLog) {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		if (child.exitCode !== null) {
			throw new Error(
				`Web server exited before becoming ready. stderr:\n${stderrLog.join("")}`,
			);
		}

		try {
			const response = await fetch(url);

			if (response.ok) {
				return;
			}
		} catch (_error) {
			// Keep polling until the dev server responds or exits.
		}

		await delay(100);
	}

	throw new Error(
		`Timed out waiting for ${url}. stderr:\n${stderrLog.join("")}`,
	);
}

async function startFakeApiServer() {
	const state = {
		lastChatSessionId: null,
		sessionDetails: new Map(),
		shellMode: "ready",
		settingsUpdateState: "update-available",
	};
	const readyStartupPayload = createReadyStartupPayload();
	const readyShellSummary = createReadyShellSummary();
	const runtimeErrorSummary = createRuntimeErrorShellSummary();

	const server = createHttpServer(async (request, response) => {
		if (request.url === "/startup") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(readyStartupPayload, null, 2));
			return;
		}

		if (request.url === "/operator-shell") {
			const payload =
				state.shellMode === "runtime-error"
					? runtimeErrorSummary
					: readyShellSummary;
			const statusCode = state.shellMode === "runtime-error" ? 503 : 200;

			response.writeHead(statusCode, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(payload, null, 2));
			return;
		}

		if ((request.url ?? "").startsWith("/chat-console")) {
			const requestedSessionId = new URL(
				request.url,
				"http://127.0.0.1",
			).searchParams.get("sessionId");

			if (
				requestedSessionId === "session-batch-shell-01" &&
				!state.sessionDetails.has("session-batch-shell-01")
			) {
				const batchSessionSummary = createSessionSummary({
					sessionId: "session-batch-shell-01",
					workflow: "batch-evaluation",
				});
				const batchSessionDetail = createSessionDetail(
					batchSessionSummary,
					"Batch review resumed from the batch workspace.",
				);
				state.sessionDetails.set(
					batchSessionSummary.sessionId,
					batchSessionDetail,
				);
			}

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createChatConsoleSummaryPayload(state, requestedSessionId),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/evaluation-result")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createEvaluationResultPayload(request.url ?? "/evaluation-result"),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/scan-review")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createScanReviewPayload(request.url ?? "/scan-review"),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/batch-supervisor")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createBatchWorkspacePayload(request.url ?? "/batch-supervisor"),
					null,
					2,
				),
			);
			return;
		}

		if (request.url === "/orchestration" && request.method === "POST") {
			const rawBody = await new Promise((resolveBody) => {
				const chunks = [];
				request.on("data", (chunk) => {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
				});
				request.on("end", () => {
					resolveBody(Buffer.concat(chunks).toString("utf8"));
				});
			});
			const body = rawBody ? JSON.parse(rawBody) : {};
			const summary = createSessionSummary({
				sessionId: "session-scan-eval-01",
				workflow: body.workflow ?? "single-evaluation",
			});
			const detail = createSessionDetail(
				summary,
				"Single evaluation launched from scan review.",
			);
			state.lastChatSessionId = summary.sessionId;
			state.sessionDetails.set(summary.sessionId, detail);

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createCommandPayload({
						detail,
						message: "Single evaluation launched from scan review.",
					}),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/pipeline-review")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(createPipelineReviewPayload(), null, 2));
			return;
		}

		if ((request.url ?? "").startsWith("/tracker-workspace")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createTrackerWorkspacePayload(request.url ?? "/tracker-workspace"),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/report-viewer")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createReportViewerPayload(request.url ?? "/report-viewer"),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/settings")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createSettingsSummary(state.settingsUpdateState),
					null,
					2,
				),
			);
			return;
		}

		response.writeHead(404, {
			"content-type": "application/json; charset=utf-8",
		});
		response.end(
			JSON.stringify(
				{
					error: {
						code: "route-not-found",
						message: `Unknown route ${request.url ?? "/"}.`,
					},
					ok: false,
					service: "jobhunt-api-scaffold",
					sessionId: "phase01-session03-agent-runtime-bootstrap",
					status: "not-found",
				},
				null,
				2,
			),
		);
	});

	await new Promise((resolvePromise) => {
		server.listen(0, "127.0.0.1", resolvePromise);
	});

	const address = server.address();

	if (typeof address !== "object" || address === null) {
		throw new Error("Failed to start the fake app-shell API.");
	}

	return {
		close: () =>
			new Promise((resolvePromise, reject) => {
				server.close((error) => {
					if (error) {
						reject(error);
						return;
					}

					resolvePromise();
				});
			}),
		setShellMode(mode) {
			state.shellMode = mode;
		},
		setSettingsUpdateState(mode) {
			state.settingsUpdateState = mode;
		},
		url: `http://127.0.0.1:${address.port}`,
	};
}

const fakeApi = await startFakeApiServer();
const webPort = await getFreePort();
const webUrl = `http://127.0.0.1:${webPort}`;
const stderrLog = [];
const webChild = spawn(
	"node",
	[
		join(ROOT, "node_modules", "vite", "bin", "vite.js"),
		"--host",
		"127.0.0.1",
		"--port",
		String(webPort),
	],
	{
		cwd: join(ROOT, "apps", "web"),
		env: {
			...process.env,
			JOBHUNT_API_ORIGIN: fakeApi.url,
		},
		stdio: ["ignore", "ignore", "pipe"],
	},
);

webChild.stderr.setEncoding("utf-8");
webChild.stderr.on("data", (chunk) => {
	stderrLog.push(chunk);
});

try {
	await waitForHttpOk(webUrl, webChild, stderrLog);

	const browser = await chromium.launch({ headless: true });

	try {
		const page = await browser.newPage();
		await page.goto(webUrl, { waitUntil: "networkidle" });

		await page
			.getByRole("heading", { name: "Job-Hunt control surface" })
			.waitFor();
		await page.getByRole("link", { name: /Startup/ }).waitFor();
		await page.getByRole("link", { name: /Approvals/ }).waitFor();
		await page.getByRole("link", { name: /Tracker/ }).waitFor();
		await page.getByText("Review application email").waitFor();
		await page.getByText("Job-Hunt startup diagnostics").waitFor();

		await page.getByRole("link", { name: /Chat/ }).click();
		await page
			.getByRole("heading", { name: "Launch a supported workflow" })
			.waitFor();
		await page
			.getByRole("heading", { name: "No recent sessions yet" })
			.waitFor();
		await page.getByRole("link", { name: /Scan/ }).click();
		await page
			.getByRole("heading", { name: "Scan review workspace" })
			.waitFor();
		await page.getByText("Applied AI Engineer").waitFor();
		await page.getByRole("button", { name: /Applied AI Engineer/ }).click();
		await page
			.getByRole("button", { name: "Launch single evaluation" })
			.click();
		await page
			.getByRole("heading", { name: "Evaluation console and artifact handoff" })
			.waitFor();
		assert.match(page.url(), /session=session-scan-eval-01/);
		assert.match(page.url(), /#chat$/);
		await page.getByRole("link", { name: /Batch/ }).click();
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /Select batch item 2/ }).click();
		await page.getByText("Showing batch item #2.").waitFor();
		await page.getByRole("button", { name: /Open report viewer/ }).click();
		await page
			.getByRole("heading", { name: "Artifact review surface" })
			.waitFor();
		await page.getByText("Tracker handoff report body.").waitFor();
		assert.match(
			page.url(),
			/report=reports%2F002-beta-solutions-architect\.md/,
		);
		await page.goto(`${webUrl}?batchItemId=2#batch`, {
			waitUntil: "networkidle",
		});
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /Open tracker workspace/ }).click();
		await page
			.getByRole("heading", {
				name: "Tracker workspace and integrity actions",
			})
			.waitFor();
		assert.match(page.url(), /trackerReportNumber=002/);
		await page.goto(`${webUrl}?batchItemId=2#batch`, {
			waitUntil: "networkidle",
		});
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /^Open chat$/ }).click();
		await page
			.getByRole("heading", { name: "Evaluation console and artifact handoff" })
			.waitFor();
		assert.match(page.url(), /session=session-batch-shell-01/);
		assert.match(page.url(), /#chat$/);
		await page.goto(`${webUrl}?batchItemId=2#batch`, {
			waitUntil: "networkidle",
		});
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /^Open approvals$/ }).click();
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();
		assert.match(page.url(), /approval=approval-batch-shell-01/);
		assert.match(page.url(), /reviewSession=session-batch-shell-01/);
		assert.match(page.url(), /#approvals$/);
		await page.getByRole("link", { name: /Pipeline/ }).click();
		await page
			.getByRole("heading", { name: "Pipeline review workspace" })
			.waitFor();
		await page.getByText("Current strongest lane: Forward Deployed.").waitFor();
		await page.getByRole("link", { name: /Tracker/ }).click();
		await page
			.getByRole("heading", {
				name: "Tracker workspace and integrity actions",
			})
			.waitFor();
		await page
			.getByText("1 pending tracker TSV addition is waiting to merge.", {
				exact: true,
			})
			.waitFor();
		await page.getByRole("button", { name: /Open report viewer/ }).click();
		await page
			.getByRole("heading", { name: "Artifact review surface" })
			.waitFor();
		await page.getByText("Tracker handoff report body.").waitFor();
		assert.match(page.url(), /#artifacts$/);
		await page.goto(`${webUrl}?trackerReportNumber=020#tracker`, {
			waitUntil: "networkidle",
		});
		await page
			.getByRole("heading", {
				name: "Tracker workspace and integrity actions",
			})
			.waitFor();
		await page.getByText("Auto-pipeline closeout focus").waitFor();
		await page
			.getByText(
				"Showing staged tracker addition for report #020. Merge tracker additions to create the canonical row.",
			)
			.waitFor();
		await page.getByText("Pending TSV 20-future-company.tsv").waitFor();
		await page.getByText("This closeout has not been merged into").waitFor();
		await page.getByRole("button", { name: /Open report viewer/ }).click();
		await page
			.getByRole("heading", { name: "Artifact review surface" })
			.waitFor();
		assert.match(
			page.url(),
			/report=reports%2F020-future-company-2026-04-22\.md/,
		);
		await page.getByRole("link", { name: /Approvals/ }).click();
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();
		assert.match(page.url(), /#approvals$/);

		await page.reload({ waitUntil: "networkidle" });
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();

		fakeApi.setShellMode("runtime-error");
		await page
			.getByRole("button", { name: /Refresh operator shell summary/ })
			.click();
		await page.getByRole("heading", { name: "Runtime blocked" }).waitFor();
		await page
			.getByText("Bootstrap is live, but required system files are missing.", {
				exact: true,
			})
			.first()
			.waitFor();

		fakeApi.setShellMode("ready");
		await page
			.getByRole("button", { name: /Refresh operator shell summary/ })
			.click();
		await page
			.getByText("Bootstrap diagnostics are ready.", { exact: true })
			.first()
			.waitFor();

		await page.getByRole("link", { name: /Settings/ }).click();
		await page
			.getByRole("heading", { name: "Settings and maintenance surface" })
			.waitFor();
		await page.getByText("Run doctor", { exact: true }).waitFor();
		assert.match(page.url(), /#settings$/);

		fakeApi.setSettingsUpdateState("up-to-date");
		await page
			.getByRole("button", { name: /Refresh settings summary/ })
			.click();
		await page.getByText("Updater is current").waitFor();

		await page.getByRole("link", { name: /Startup/ }).click();
		await page.getByText("Job-Hunt startup diagnostics").waitFor();
		await page.getByRole("link", { name: /Settings/ }).click();
		await page
			.getByRole("heading", { name: "Settings and maintenance surface" })
			.waitFor();
		await page.getByText("Updater is current").waitFor();

		await page.route("**/api/operator-shell", async (route) => {
			await route.abort("failed");
		});
		await page
			.getByRole("button", { name: /Refresh operator shell summary/ })
			.click();
		await page.getByText("Offline after the last good summary").waitFor();
	} finally {
		await browser.close();
	}
} finally {
	await stopChild(webChild);
	await fakeApi.close();
}

console.log("App shell smoke checks passed.");

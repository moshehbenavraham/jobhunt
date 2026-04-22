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
			defaultPort: 5172,
			healthPath: "/health",
			startupPath: "/startup",
		},
		diagnostics: {
			onboardingMissing: [],
			optionalMissing: [],
			promptContract: {
				cacheMode: "read-through-mtime",
				sourceOrder: ["agents-guide", "workflow-mode"],
				sources: [],
				supportedWorkflows: ["auto-pipeline", "single-evaluation"],
				workflowRoutes: [
					{
						description: "Single evaluation route",
						intent: "single-evaluation",
						modeRepoRelativePath: "modes/oferta.md",
					},
					{
						description: "Auto-pipeline route",
						intent: "auto-pipeline",
						modeRepoRelativePath: "modes/auto-pipeline.md",
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
			activeSession: null,
			activeSessionCount: 0,
			latestPendingApprovals: [],
			pendingApprovalCount: 0,
			recentFailureCount: 0,
			recentFailures: [],
			state: "idle",
		},
		currentSession: {
			id: "phase04-session06-auto-pipeline-parity-and-regression",
			monorepo: true,
			packagePath: "apps/web",
			phase: 4,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T00:30:00.000Z",
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

function createReadyOperatorHomeSummary() {
	return {
		cards: {
			approvals: {
				actions: [],
				latestPendingApprovals: [],
				message: "No approvals are waiting.",
				pendingApprovalCount: 0,
				recentFailureCount: 0,
				state: "idle",
			},
			artifacts: {
				actions: [],
				items: [],
				message:
					"Recent auto-pipeline artifacts appear in the shared review surfaces.",
				state: "ready",
				totalCount: 2,
			},
			closeout: {
				actions: [],
				message:
					"Auto-pipeline closeout remains available from the app-owned daily path.",
				pipeline: {
					malformedCount: 0,
					pendingCount: 1,
					preview: [
						{
							company: "Live URL Company",
							kind: "processed",
							reportNumber: "302",
							role: "Live URL Role",
							score: 4.8,
							url: "https://example.com/jobs/live-url-role",
							warningCount: 0,
						},
					],
					processedCount: 2,
				},
				state: "ready",
				tracker: {
					pendingAdditionCount: 1,
					preview: [
						{
							company: "Live URL Company",
							entryNumber: 302,
							reportNumber: "302",
							role: "Live URL Role",
							status: "needs-review",
						},
					],
					rowCount: 2,
				},
			},
			liveWork: {
				actions: [],
				activeSession: null,
				activeSessionCount: 0,
				message: "No live workflow is active.",
				pendingApprovalCount: 0,
				recentFailureCount: 0,
				recentFailures: [],
				state: "idle",
			},
			maintenance: {
				actions: [],
				authState: "ready",
				commands: [
					{
						category: "diagnostics",
						command: "npm run doctor",
						description: "Validate repo prerequisites.",
						id: "doctor",
						label: "Run doctor",
					},
				],
				message:
					"Auto-pipeline parity now lives under the same app-first home surface as the rest of the operator flow.",
				operationalStoreStatus: "ready",
				state: "ready",
				updateCheck: {
					changelogExcerpt: null,
					checkedAt: "2026-04-22T00:30:00.000Z",
					command: "node scripts/update-system.mjs check",
					localVersion: "1.5.38",
					message: "Job-Hunt is up to date (1.5.38).",
					remoteVersion: "1.5.38",
					state: "up-to-date",
				},
			},
			readiness: {
				actions: [],
				currentSession: {
					id: "phase06-session06-dashboard-replacement-maintenance-and-cutover",
					monorepo: true,
					packagePath: null,
					phase: 6,
					source: "state-file",
					stateFilePath: `${ROOT}/.spec_system/state.json`,
				},
				healthStatus: "ok",
				message:
					"Bootstrap diagnostics are ready. The operator home is the default daily landing path.",
				missing: {
					onboarding: 0,
					optional: 0,
					runtime: 0,
				},
				startupStatus: "ready",
				state: "ready",
			},
		},
		currentSession: {
			id: "phase06-session06-dashboard-replacement-maintenance-and-cutover",
			monorepo: true,
			packagePath: null,
			phase: 6,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T00:30:00.000Z",
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
		{
			description: "Auto-pipeline route",
			intent: "auto-pipeline",
			label: "Auto Pipeline",
			message:
				"Auto-pipeline can launch with the evaluation specialist and the current typed evaluation toolset.",
			missingCapabilities: [],
			modeRepoRelativePath: "modes/auto-pipeline.md",
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

function createSessionSummary(input) {
	return {
		activeJobId: input.jobId,
		job: {
			attempt: 1,
			completedAt: input.updatedAt,
			currentRunId: `${input.jobId}-run`,
			jobId: input.jobId,
			jobType: "evaluate-job",
			startedAt: input.startedAt ?? input.updatedAt,
			status: "completed",
			updatedAt: input.updatedAt,
			waitReason: null,
		},
		latestFailure: null,
		lastHeartbeatAt: input.updatedAt,
		pendingApproval: null,
		pendingApprovalCount: 0,
		resumeAllowed: true,
		sessionId: input.sessionId,
		state: "ready",
		status: "completed",
		updatedAt: input.updatedAt,
		workflow: input.workflow,
	};
}

function createSessionDetail(summary, timelineSummary) {
	return {
		approvals: [],
		failure: null,
		jobs: [summary.job],
		route: {
			message:
				"Evaluation workflows can launch with the evaluation specialist and the current typed evaluation toolset.",
			missingCapabilities: [],
			specialistId: "evaluation-specialist",
			status: "ready",
		},
		session: summary,
		timeline: [
			{
				approvalId: null,
				eventId: `${summary.sessionId}-event`,
				eventType: "job-execution-completed",
				jobId: summary.job.jobId,
				level: "info",
				occurredAt: summary.updatedAt,
				requestId: `${summary.sessionId}-request`,
				sessionId: summary.sessionId,
				summary: timelineSummary,
				traceId: `${summary.sessionId}-trace`,
			},
		],
	};
}

function createArtifact(kind, repoRelativePath) {
	return {
		exists: true,
		kind,
		message: `${kind} artifact is ready.`,
		repoRelativePath,
		state: "ready",
	};
}

function createEvaluationResultSummary(input) {
	const reportNumber = input.reportNumber;
	const reportPath = `reports/${reportNumber}-${input.slug}.md`;
	const pdfPath =
		input.kind === "raw-jd" ? `output/${reportNumber}-${input.slug}.pdf` : null;

	return {
		artifacts: {
			pdf:
				pdfPath === null
					? {
							exists: false,
							kind: "pdf",
							message: "PDF generation is still pending.",
							repoRelativePath: null,
							state: "pending",
						}
					: createArtifact("pdf", pdfPath),
			report: createArtifact("report", reportPath),
			tracker: createArtifact(
				"tracker",
				`batch/tracker-additions/${reportNumber}-${input.slug}.tsv`,
			),
		},
		checkpoint: {
			completedStepCount: 4,
			completedSteps: [
				"validated-input",
				"captured-job-description",
				"scored-fit",
				"prepared-report",
			],
			cursor: "prepared-report",
			hasMore: false,
			updatedAt: input.updatedAt,
		},
		closeout: {
			message: "All evaluation artifacts are ready for review.",
			readyForReview: true,
			state: "review-ready",
		},
		failure: null,
		handoff: {
			approval: null,
			approvalStatus: "none",
			message: "No approval handoff is attached to this result.",
			resumeAllowed: false,
			state: "none",
		},
		inputProvenance:
			input.kind === "raw-jd"
				? {
						canonicalUrl: null,
						host: null,
						kind: "raw-jd",
						message:
							"Launched from raw job-description text. Prompt text is redacted from stored session context.",
					}
				: {
						canonicalUrl: "https://example.com/jobs/live-url-role",
						host: "example.com",
						kind: "job-url",
						message:
							"Launched from live job URL https://example.com/jobs/live-url-role.",
					},
		job: {
			attempt: 1,
			completedAt: input.updatedAt,
			currentRunId: `${input.jobId}-run`,
			jobId: input.jobId,
			jobType: "evaluate-job",
			startedAt: input.updatedAt,
			status: "completed",
			updatedAt: input.updatedAt,
			waitReason: null,
		},
		legitimacy: input.legitimacy,
		message: "Evaluation result summary is ready.",
		reportNumber,
		reviewFocus: {
			pipelineReview: {
				availability: "ready",
				message: `Pipeline review can focus processed row #${reportNumber}.`,
				reportNumber,
				section: "processed",
				url: null,
			},
			primaryTarget: "report-viewer",
			reportViewer: {
				availability: "ready",
				message: "Report artifact is ready for in-app review.",
				reportNumber,
				reportPath,
			},
			trackerWorkspace: {
				availability: "ready",
				message: `Tracker review can focus report #${reportNumber} across merged rows and pending TSV additions.`,
				reportNumber,
			},
		},
		score: input.score,
		session: {
			activeJobId: input.jobId,
			lastHeartbeatAt: input.updatedAt,
			sessionId: input.sessionId,
			status: "completed",
			updatedAt: input.updatedAt,
			workflow: input.workflow,
		},
		state: "completed",
		verification:
			input.kind === "raw-jd"
				? {
						message:
							"Verification is not applicable for raw job-description launches.",
						result: "none",
						source: "none",
						status: "not-applicable",
						url: null,
					}
				: {
						message: "active via browser review",
						result: "active",
						source: "report-header",
						status: "verified",
						url: "https://example.com/jobs/live-url-role",
					},
		workflow: input.workflow,
		warnings: {
			hasMore: false,
			items: [],
			totalCount: 0,
		},
	};
}

function createChatConsoleSummaryPayload(state, requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedSessionId = url.searchParams.get("sessionId");
	const sessions =
		state.phase === "ready"
			? [...state.sessionDetails.values()]
					.map((detail) => detail.session)
					.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
			: [];
	const selectedDetail =
		(requestedSessionId && state.sessionDetails.get(requestedSessionId)) ||
		state.sessionDetails.get(sessions[0]?.sessionId) ||
		null;

	return {
		generatedAt: "2026-04-22T00:30:00.000Z",
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

function createEmptyEvaluationResultPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");

	return {
		filters: {
			previewLimit: 4,
			sessionId: url.searchParams.get("sessionId"),
			workflow: url.searchParams.get("workflow"),
		},
		generatedAt: "2026-04-22T00:30:00.000Z",
		message: "No evaluation sessions have been recorded yet.",
		ok: true,
		recentSessions: [],
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		summary: {
			artifacts: {
				pdf: {
					exists: false,
					kind: "pdf",
					message: "pdf artifact is missing.",
					repoRelativePath: null,
					state: "missing",
				},
				report: {
					exists: false,
					kind: "report",
					message: "report artifact is missing.",
					repoRelativePath: null,
					state: "missing",
				},
				tracker: {
					exists: false,
					kind: "tracker",
					message: "tracker artifact is missing.",
					repoRelativePath: null,
					state: "missing",
				},
			},
			checkpoint: {
				completedStepCount: 0,
				completedSteps: [],
				cursor: null,
				hasMore: false,
				updatedAt: null,
			},
			closeout: {
				message: "No review-ready evaluation closeout is available yet.",
				readyForReview: false,
				state: "not-ready",
			},
			failure: null,
			handoff: {
				approval: null,
				approvalStatus: "none",
				message: "No approval handoff is attached to this result.",
				resumeAllowed: false,
				state: "none",
			},
			inputProvenance: {
				canonicalUrl: null,
				host: null,
				kind: "unknown",
				message: "Evaluation input provenance is unavailable.",
			},
			job: null,
			legitimacy: null,
			message: "No evaluation sessions have been recorded yet.",
			reportNumber: null,
			reviewFocus: {
				pipelineReview: {
					availability: "unavailable",
					message:
						"Pipeline review unlocks after the evaluation closeout reaches a review-ready state.",
					reportNumber: null,
					section: "all",
					url: null,
				},
				primaryTarget: "none",
				reportViewer: {
					availability: "unavailable",
					message: "Report review is unavailable.",
					reportNumber: null,
					reportPath: null,
				},
				trackerWorkspace: {
					availability: "unavailable",
					message:
						"Tracker review unlocks after the evaluation closeout records a report number.",
					reportNumber: null,
				},
			},
			score: null,
			session: null,
			state: "empty",
			verification: {
				message: "Verification is unavailable.",
				result: "none",
				source: "none",
				status: "unconfirmed",
				url: null,
			},
			workflow: null,
			warnings: {
				hasMore: false,
				items: [],
				totalCount: 0,
			},
		},
	};
}

function createEvaluationResultPayload(state, requestUrl) {
	if (state.phase !== "ready") {
		return createEmptyEvaluationResultPayload(requestUrl);
	}

	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedSessionId = url.searchParams.get("sessionId");
	const summary =
		(requestedSessionId && state.evaluationResults.get(requestedSessionId)) ||
		state.evaluationResults.values().next().value ||
		createEmptyEvaluationResultPayload(requestUrl).summary;
	const recentSessions = [...state.evaluationResults.values()]
		.map((item) => ({
			sessionId: item.session.sessionId,
			state: item.state,
			status: item.session.status,
			updatedAt: item.session.updatedAt,
			workflow: item.workflow,
		}))
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

	return {
		filters: {
			previewLimit: 4,
			sessionId: requestedSessionId,
			workflow: url.searchParams.get("workflow"),
		},
		generatedAt: "2026-04-22T00:30:00.000Z",
		message: summary.message,
		ok: true,
		recentSessions,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		summary,
	};
}

function createReportViewerPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const reportPath =
		url.searchParams.get("reportPath") ?? "reports/301-raw-jd-role.md";
	const reportNumber = reportPath.includes("302-") ? "302" : "301";
	const isLive = reportNumber === "302";

	return {
		filters: {
			group: "reports",
			limit: 8,
			offset: 0,
			reportPath,
		},
		generatedAt: "2026-04-22T00:30:00.000Z",
		message: `Showing selected report ${reportPath}.`,
		ok: true,
		recentArtifacts: {
			group: "reports",
			hasMore: false,
			items: [
				{
					artifactDate: "2026-04-22",
					fileName: "301-raw-jd-role.md",
					kind: "report",
					repoRelativePath: "reports/301-raw-jd-role.md",
					reportNumber: "301",
					selected: reportNumber === "301",
				},
				{
					artifactDate: "2026-04-22",
					fileName: "302-live-url-role.md",
					kind: "report",
					repoRelativePath: "reports/302-live-url-role.md",
					reportNumber: "302",
					selected: reportNumber === "302",
				},
			],
			limit: 8,
			offset: 0,
			totalCount: 2,
		},
		selectedReport: {
			body: isLive
				? "# Evaluation: Live URL Co -- Applied AI Engineer\n\nLive URL report body.\n"
				: "# Evaluation: Raw JD Co -- Applied AI Engineer\n\nRaw JD report body.\n",
			header: {
				archetype: "Applied AI",
				date: "2026-04-22",
				legitimacy: isLive ? "High Confidence" : "High Confidence",
				pdf: {
					exists: !isLive,
					repoRelativePath: isLive ? null : "output/301-raw-jd-role.pdf",
				},
				score: isLive ? 4.8 : 4.7,
				title: isLive
					? "Evaluation: Live URL Co -- Applied AI Engineer"
					: "Evaluation: Raw JD Co -- Applied AI Engineer",
				url: isLive ? "https://example.com/jobs/live-url-role" : null,
				verification: isLive ? "active via browser review" : "not applicable",
			},
			message: `Showing selected report ${reportPath}.`,
			origin: "selected",
			repoRelativePath: reportPath,
			reportNumber,
			requestedRepoRelativePath: reportPath,
			state: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
	};
}

function createPipelineReviewPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const reportNumber = url.searchParams.get("reportNumber") ?? "301";
	const isLive = reportNumber === "302";
	const row = {
		company: isLive ? "Live URL Co" : "Raw JD Co",
		kind: "processed",
		legitimacy: "High Confidence",
		pdf: {
			exists: !isLive,
			message: isLive
				? "PDF generation is still pending."
				: "Checked-in PDF artifact output/301-raw-jd-role.pdf is available.",
			repoRelativePath: isLive ? null : "output/301-raw-jd-role.pdf",
		},
		report: {
			exists: true,
			message: `Checked-in report reports/${reportNumber}-${isLive ? "live-url-role" : "raw-jd-role"}.md is available.`,
			repoRelativePath: `reports/${reportNumber}-${isLive ? "live-url-role" : "raw-jd-role"}.md`,
		},
		reportNumber,
		role: "Applied AI Engineer",
		score: isLive ? 4.8 : 4.7,
		selected: true,
		sourceLine: `- [x] #${reportNumber} | https://example.com/jobs/${isLive ? "live-url-role" : "raw-jd-role"} | ${isLive ? "Live URL Co" : "Raw JD Co"} | Applied AI Engineer | ${(isLive ? 4.8 : 4.7).toFixed(1)}/5 | PDF ${isLive ? "No" : "Yes"}`,
		url: `https://example.com/jobs/${isLive ? "live-url-role" : "raw-jd-role"}`,
		verification: isLive ? "active via browser review" : null,
		warningCount: isLive ? 1 : 0,
		warnings: isLive
			? [
					{
						code: "pending-pdf",
						message: "PDF generation is still pending for this live URL flow.",
					},
				]
			: [],
	};

	return {
		filters: {
			limit: 12,
			offset: 0,
			reportNumber,
			section: "processed",
			sort: "queue",
			url: null,
		},
		generatedAt: "2026-04-22T00:30:00.000Z",
		message: `Showing queue detail for processed row #${reportNumber}.`,
		ok: true,
		queue: {
			counts: {
				malformed: 0,
				pending: 0,
				processed: 1,
			},
			hasMore: false,
			items: [row],
			limit: 12,
			offset: 0,
			section: "processed",
			sort: "queue",
			totalCount: 1,
		},
		selectedDetail: {
			message: `Showing queue detail for processed row #${reportNumber}.`,
			origin: "report-number",
			requestedReportNumber: reportNumber,
			requestedUrl: null,
			row: {
				...row,
				header: createReportViewerPayload(
					`http://127.0.0.1/report-viewer?reportPath=reports/${reportNumber}-${isLive ? "live-url-role" : "raw-jd-role"}.md`,
				).selectedReport.header,
			},
			state: "ready",
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
			campaignGuidance: "Current strongest lane: Applied AI.",
			generatedBy: "npm run scan",
			lastRefreshed: "2026-04-22",
			message: "Shortlist guidance is available for queue review.",
			topRoles: [
				{
					bucketLabel: "Strongest fit",
					company: row.company,
					reasonSummary: "focused from evaluation handoff",
					role: row.role,
					url: row.url,
				},
			],
		},
		status: "ready",
	};
}

function createTrackerWorkspacePayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const reportNumber = url.searchParams.get("reportNumber") ?? "301";

	if (reportNumber === "302") {
		return {
			filters: {
				entryNumber: null,
				limit: 12,
				offset: 0,
				reportNumber: "302",
				search: null,
				sort: "date",
				status: null,
			},
			generatedAt: "2026-04-22T00:30:00.000Z",
			message:
				"Showing 0 of 1 tracker rows. 1 pending tracker TSV addition is waiting to merge.",
			ok: true,
			pendingAdditions: {
				count: 1,
				items: [
					{
						company: "Live URL Co",
						entryNumber: 302,
						fileName: "302-live-url-role.tsv",
						notes: "Pending add from live URL closeout.",
						reportNumber: "302",
						reportRepoRelativePath: "reports/302-live-url-role.md",
						repoRelativePath: "batch/tracker-additions/302-live-url-role.tsv",
						role: "Applied AI Engineer",
						status: "Evaluated",
					},
				],
				message: "1 pending tracker TSV addition is waiting to merge.",
			},
			rows: {
				filteredCount: 0,
				hasMore: false,
				items: [],
				limit: 12,
				offset: 0,
				sort: "date",
				totalCount: 1,
			},
			selectedDetail: {
				message:
					"Showing staged tracker addition for report #302. Merge tracker additions to create the canonical row.",
				origin: "report-number",
				pendingAddition: {
					company: "Live URL Co",
					entryNumber: 302,
					fileName: "302-live-url-role.tsv",
					notes: "Pending add from live URL closeout.",
					reportNumber: "302",
					reportRepoRelativePath: "reports/302-live-url-role.md",
					repoRelativePath: "batch/tracker-additions/302-live-url-role.tsv",
					role: "Applied AI Engineer",
					status: "Evaluated",
				},
				requestedEntryNumber: null,
				requestedReportNumber: "302",
				row: null,
				state: "ready",
			},
			service: "jobhunt-api-scaffold",
			sessionId: "phase01-session03-agent-runtime-bootstrap",
			status: "ready",
			statusOptions: [
				{
					count: 1,
					id: "evaluated",
					label: "Evaluated",
				},
			],
		};
	}

	return {
		filters: {
			entryNumber: null,
			limit: 12,
			offset: 0,
			reportNumber: "301",
			search: null,
			sort: "date",
			status: null,
		},
		generatedAt: "2026-04-22T00:30:00.000Z",
		message: "Showing 1 of 1 tracker rows.",
		ok: true,
		pendingAdditions: {
			count: 0,
			items: [],
			message: "No pending tracker TSV additions are waiting to merge.",
		},
		rows: {
			filteredCount: 1,
			hasMore: false,
			items: [
				{
					company: "Raw JD Co",
					date: "2026-04-22",
					entryNumber: 301,
					pdf: {
						exists: true,
						message:
							"Checked-in PDF artifact output/301-raw-jd-role.pdf is available.",
						repoRelativePath: "output/301-raw-jd-role.pdf",
					},
					report: {
						exists: true,
						message:
							"Checked-in report artifact reports/301-raw-jd-role.md is available.",
						repoRelativePath: "reports/301-raw-jd-role.md",
					},
					role: "Applied AI Engineer",
					score: 4.7,
					scoreLabel: "4.7/5",
					selected: true,
					status: "Evaluated",
					warningCount: 0,
					warnings: [],
				},
			],
			limit: 12,
			offset: 0,
			sort: "date",
			totalCount: 1,
		},
		selectedDetail: {
			message: "Showing tracker row for report #301.",
			origin: "report-number",
			pendingAddition: null,
			requestedEntryNumber: 301,
			requestedReportNumber: "301",
			row: {
				company: "Raw JD Co",
				date: "2026-04-22",
				entryNumber: 301,
				header: {
					date: "2026-04-22",
					legitimacy: "High Confidence",
					pdf: {
						exists: true,
						message:
							"Checked-in PDF artifact output/301-raw-jd-role.pdf is available.",
						repoRelativePath: "output/301-raw-jd-role.pdf",
					},
					score: 4.7,
					title: "Evaluation: Raw JD Co -- Applied AI Engineer",
					url: null,
					verification: null,
				},
				notes: "Raw JD closeout is ready for tracker review.",
				pdf: {
					exists: true,
					message:
						"Checked-in PDF artifact output/301-raw-jd-role.pdf is available.",
					repoRelativePath: "output/301-raw-jd-role.pdf",
				},
				report: {
					exists: true,
					message:
						"Checked-in report artifact reports/301-raw-jd-role.md is available.",
					repoRelativePath: "reports/301-raw-jd-role.md",
				},
				role: "Applied AI Engineer",
				score: 4.7,
				scoreLabel: "4.7/5",
				selected: true,
				sourceLine:
					"| 301 | 2026-04-22 | Raw JD Co | Applied AI Engineer | 4.7/5 | Evaluated | Y | [301](reports/301-raw-jd-role.md) | Raw JD closeout is ready for tracker review. |",
				status: "Evaluated",
				warningCount: 0,
				warnings: [],
			},
			state: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		statusOptions: [
			{
				count: 1,
				id: "evaluated",
				label: "Evaluated",
			},
		],
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
			// Keep polling.
		}

		await delay(100);
	}

	throw new Error(
		`Timed out waiting for ${url}. stderr:\n${stderrLog.join("")}`,
	);
}

async function startFakeApiServer() {
	const state = {
		evaluationResultDelayMs: 0,
		evaluationResultMode: "ready",
		evaluationResults: new Map(),
		phase: "empty",
		sessionDetails: new Map(),
		summaryDelayMs: 0,
	};
	const readyStartupPayload = createReadyStartupPayload();
	const readyShellSummary = createReadyShellSummary();
	const readyOperatorHomeSummary = createReadyOperatorHomeSummary();

	const server = createHttpServer(async (request, response) => {
		if (request.url === "/startup") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(readyStartupPayload, null, 2));
			return;
		}

		if (request.url === "/operator-shell") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(readyShellSummary, null, 2));
			return;
		}

		if ((request.url ?? "").startsWith("/operator-home")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(readyOperatorHomeSummary, null, 2));
			return;
		}

		if ((request.url ?? "").startsWith("/chat-console")) {
			if (state.summaryDelayMs > 0) {
				await delay(state.summaryDelayMs);
			}

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createChatConsoleSummaryPayload(
						state,
						request.url ?? "/chat-console",
					),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/evaluation-result")) {
			if (state.evaluationResultDelayMs > 0) {
				await delay(state.evaluationResultDelayMs);
			}

			if (state.evaluationResultMode === "invalid-payload") {
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(JSON.stringify({ ok: true, message: "broken" }, null, 2));
				return;
			}

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createEvaluationResultPayload(
						state,
						request.url ?? "/evaluation-result",
					),
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

		if ((request.url ?? "").startsWith("/pipeline-review")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createPipelineReviewPayload(request.url ?? "/pipeline-review"),
					null,
					2,
				),
			);
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
		throw new Error("Failed to start the fake parity API.");
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
		setEvaluationResultDelayMs(delayMs) {
			state.evaluationResultDelayMs = delayMs;
		},
		setEvaluationResultMode(mode) {
			state.evaluationResultMode = mode;
		},
		setPhase(phase) {
			state.phase = phase;
		},
		setSummaryDelayMs(delayMs) {
			state.summaryDelayMs = delayMs;
		},
		upsertEvaluationResult(summary) {
			state.evaluationResults.set(summary.session.sessionId, summary);
		},
		upsertSessionDetail(detail) {
			state.sessionDetails.set(detail.session.sessionId, detail);
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

	const rawSummary = createSessionSummary({
		jobId: "job-raw-jd",
		sessionId: "session-raw-jd",
		updatedAt: "2026-04-22T00:31:00.000Z",
		workflow: "single-evaluation",
	});
	const liveSummary = createSessionSummary({
		jobId: "job-live-url",
		sessionId: "session-live-url",
		updatedAt: "2026-04-22T00:32:00.000Z",
		workflow: "auto-pipeline",
	});

	fakeApi.upsertSessionDetail(
		createSessionDetail(rawSummary, "Raw JD evaluation completed."),
	);
	fakeApi.upsertSessionDetail(
		createSessionDetail(liveSummary, "Live URL auto-pipeline completed."),
	);
	fakeApi.upsertEvaluationResult(
		createEvaluationResultSummary({
			jobId: "job-raw-jd",
			kind: "raw-jd",
			legitimacy: "High Confidence",
			reportNumber: "301",
			score: 4.7,
			sessionId: "session-raw-jd",
			slug: "raw-jd-role",
			updatedAt: "2026-04-22T00:31:00.000Z",
			workflow: "single-evaluation",
		}),
	);
	fakeApi.upsertEvaluationResult(
		createEvaluationResultSummary({
			jobId: "job-live-url",
			kind: "job-url",
			legitimacy: "High Confidence",
			reportNumber: "302",
			score: 4.8,
			sessionId: "session-live-url",
			slug: "live-url-role",
			updatedAt: "2026-04-22T00:32:00.000Z",
			workflow: "auto-pipeline",
		}),
	);

	const browser = await chromium.launch({ headless: true });

	try {
		fakeApi.setSummaryDelayMs(700);
		fakeApi.setEvaluationResultDelayMs(700);
		const page = await browser.newPage();
		await page.goto(`${webUrl}#chat`, { waitUntil: "domcontentloaded" });

		await page
			.getByRole("heading", { name: "Loading recent sessions" })
			.waitFor();
		await page
			.getByRole("heading", { name: "Loading evaluation handoff" })
			.waitFor();

		fakeApi.setSummaryDelayMs(0);
		fakeApi.setEvaluationResultDelayMs(0);
		await page.waitForLoadState("networkidle");
		await page
			.getByRole("heading", { name: "No recent sessions yet" })
			.waitFor();
		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByRole("heading", { name: "No evaluation handoff yet" })
			.waitFor();

		fakeApi.setPhase("ready");

		await page.goto(`${webUrl}?session=session-raw-jd#chat`, {
			waitUntil: "networkidle",
		});
		await page.getByText("session-live-url").first().waitFor();
		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByText(
				"Launched from raw job-description text. Prompt text is redacted from stored session context.",
			)
			.waitFor();
		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByText("not-applicable")
			.first()
			.waitFor();

		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByRole("button", { name: "Open report viewer" })
			.click();
		await page
			.getByRole("heading", { name: "Artifact review surface" })
			.waitFor();
		await page.getByText("Raw JD report body.").waitFor();
		assert.match(page.url(), /report=reports%2F301-raw-jd-role\.md/);

		await page.getByRole("link", { name: /Chat/ }).click();
		const rawPipelineResponse = page.waitForResponse(
			(response) =>
				response.url().includes("/pipeline-review?") &&
				response.url().includes("reportNumber=301") &&
				response.url().includes("section=processed"),
		);
		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByRole("button", { name: "Open pipeline review" })
			.click();
		const rawPipelinePayload = await rawPipelineResponse;
		assert.equal(rawPipelinePayload.ok(), true);
		await page
			.getByRole("heading", { name: "Pipeline review workspace" })
			.waitFor();
		assert.match(page.url(), /pipelineReportNumber=301/);

		await page.getByRole("link", { name: /Chat/ }).click();
		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByRole("button", { name: "Open tracker review" })
			.click();
		await page
			.getByRole("heading", {
				name: "Tracker workspace and integrity actions",
			})
			.waitFor();
		await page.getByText("Auto-pipeline closeout focus").waitFor();
		await page.getByText("Showing tracker row for report #301.").waitFor();
		assert.match(page.url(), /trackerReportNumber=301/);

		await page.goto(`${webUrl}?session=session-live-url#chat`, {
			waitUntil: "networkidle",
		});
		const liveRail = page.locator(
			'section[aria-labelledby="evaluation-artifact-rail-title"]',
		);
		await liveRail
			.getByText(
				"Launched from live job URL https://example.com/jobs/live-url-role.",
			)
			.waitFor();
		await liveRail
			.getByText("https://example.com/jobs/live-url-role")
			.first()
			.waitFor();
		await liveRail.getByText("verified").first().waitFor();
		await liveRail.getByText("active via browser review").first().waitFor();

		await liveRail.getByRole("button", { name: "Open report viewer" }).click();
		await page
			.getByRole("heading", { name: "Artifact review surface" })
			.waitFor();
		await page.getByText("Live URL report body.").waitFor();
		assert.match(page.url(), /report=reports%2F302-live-url-role\.md/);

		await page.getByRole("link", { name: /Chat/ }).click();
		const livePipelineResponse = page.waitForResponse(
			(response) =>
				response.url().includes("/pipeline-review?") &&
				response.url().includes("reportNumber=302") &&
				response.url().includes("section=processed"),
		);
		await liveRail
			.getByRole("button", { name: "Open pipeline review" })
			.click();
		const livePipelinePayload = await livePipelineResponse;
		assert.equal(livePipelinePayload.ok(), true);
		await page
			.getByRole("heading", { name: "Pipeline review workspace" })
			.waitFor();
		assert.match(page.url(), /pipelineReportNumber=302/);

		await page.getByRole("link", { name: /Chat/ }).click();
		await liveRail.getByRole("button", { name: "Open tracker review" }).click();
		await page
			.getByRole("heading", {
				name: "Tracker workspace and integrity actions",
			})
			.waitFor();
		await page.getByText("Auto-pipeline closeout focus").waitFor();
		await page
			.getByText(
				"Showing staged tracker addition for report #302. Merge tracker additions to create the canonical row.",
			)
			.waitFor();
		await page.getByText("Pending TSV 302-live-url-role.tsv").waitFor();
		assert.match(page.url(), /trackerReportNumber=302/);

		await page.getByRole("link", { name: /Home/ }).click();
		await page
			.getByRole("heading", { name: "App-owned daily landing path" })
			.waitFor();
		await page
			.getByText(
				"Auto-pipeline parity now lives under the same app-first home surface as the rest of the operator flow.",
			)
			.waitFor();
		assert.match(page.url(), /#home$/);

		fakeApi.setEvaluationResultMode("invalid-payload");
		const errorPage = await browser.newPage();
		await errorPage.goto(`${webUrl}?session=session-live-url#chat`, {
			waitUntil: "networkidle",
		});
		await errorPage
			.getByRole("heading", { name: "Evaluation handoff unavailable" })
			.waitFor();
		await errorPage.close();
		fakeApi.setEvaluationResultMode("ready");

		const offlinePage = await browser.newPage();
		await offlinePage.goto(`${webUrl}?session=session-live-url#chat`, {
			waitUntil: "networkidle",
		});
		await offlinePage
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByText(
				"Launched from live job URL https://example.com/jobs/live-url-role.",
			)
			.waitFor();
		await offlinePage.route("**/api/evaluation-result*", async (route) => {
			await route.abort("failed");
		});
		await offlinePage
			.getByRole("button", { name: "Refresh chat console" })
			.click();
		await offlinePage
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByText("Showing the last handoff snapshot")
			.waitFor();
		await offlinePage.close();
		await page.close();
	} finally {
		await browser.close();
	}
} finally {
	await stopChild(webChild);
	await fakeApi.close();
}

console.log("Auto-pipeline parity smoke checks passed.");

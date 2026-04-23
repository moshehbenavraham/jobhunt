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

function createDeferred() {
	let resolvePromise;
	const promise = new Promise((resolve) => {
		resolvePromise = resolve;
	});

	return {
		promise,
		resolve: resolvePromise,
	};
}

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
				supportedWorkflows: ["single-evaluation", "tracker-status"],
				workflowRoutes: [
					{
						description: "Single evaluation route",
						intent: "single-evaluation",
						modeRepoRelativePath: "modes/oferta.md",
					},
					{
						description: "Tracker status route",
						intent: "tracker-status",
						modeRepoRelativePath: "modes/tracker.md",
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
			id: "phase03-session02-chat-console-and-session-resume",
			monorepo: true,
			packagePath: "apps/web",
			phase: 3,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-21T23:55:00.000Z",
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
			description: "Tracker status route",
			intent: "tracker-status",
			label: "Tracker Status",
			message:
				"Tracker status remains blocked until a typed tracker-summary tool is implemented.",
			missingCapabilities: ["typed-tracker-summary"],
			modeRepoRelativePath: "modes/tracker.md",
			specialist: {
				description: "Owns tracker review workflows.",
				id: "tracker-specialist",
				label: "Tracker Specialist",
			},
			status: "tooling-gap",
		},
	];
}

function createSessionSummary(overrides = {}) {
	return {
		activeJobId: overrides.activeJobId ?? "job-live",
		job: overrides.job ?? {
			attempt: 1,
			completedAt: null,
			currentRunId: "run-live",
			jobId: "job-live",
			jobType: "evaluate-job",
			startedAt: "2026-04-21T23:57:00.000Z",
			status: overrides.jobStatus ?? "running",
			updatedAt: overrides.updatedAt ?? "2026-04-21T23:57:00.000Z",
			waitReason: overrides.waitReason ?? null,
		},
		latestFailure: overrides.latestFailure ?? null,
		lastHeartbeatAt: overrides.updatedAt ?? "2026-04-21T23:57:00.000Z",
		pendingApproval: overrides.pendingApproval ?? null,
		pendingApprovalCount: overrides.pendingApprovalCount ?? 0,
		resumeAllowed: true,
		sessionId: overrides.sessionId ?? "session-live",
		state: overrides.state ?? "running",
		status: overrides.status ?? "running",
		updatedAt: overrides.updatedAt ?? "2026-04-21T23:57:00.000Z",
		workflow: overrides.workflow ?? "single-evaluation",
	};
}

function createSessionDetail(summary, overrides = {}) {
	return {
		approvals: overrides.approvals ?? [],
		failure: overrides.failure ?? null,
		jobs: overrides.jobs ?? (summary.job ? [summary.job] : []),
		route: overrides.route ?? {
			message:
				"Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.",
			missingCapabilities: [],
			specialistId: "evaluation-specialist",
			status: "ready",
		},
		session: summary,
		timeline: overrides.timeline ?? [
			{
				approvalId: null,
				eventId: "event-live",
				eventType: "job-execution-started",
				jobId: summary.job?.jobId ?? null,
				level: "info",
				occurredAt: summary.updatedAt,
				requestId: "request-live",
				sessionId: summary.sessionId,
				summary: overrides.timelineSummary ?? "Launch accepted.",
				traceId: "trace-live",
			},
		],
	};
}

function createChatConsoleSummaryPayload(state, selectedSessionId = null) {
	const sessions = [...state.sessionDetails.values()]
		.map((detail) => detail.session)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	const selectedDetail =
		(selectedSessionId && state.sessionDetails.get(selectedSessionId)) ||
		state.sessionDetails.get(state.selectedSessionId) ||
		state.sessionDetails.get(sessions[0]?.sessionId) ||
		null;

	return {
		generatedAt: "2026-04-21T23:58:00.000Z",
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

function createEvaluationArtifactSummary(kind, overrides = {}) {
	const artifactState = overrides.state ?? "pending";

	return {
		exists: overrides.exists ?? artifactState === "ready",
		kind,
		message:
			overrides.message ??
			(artifactState === "ready"
				? `${kind} artifact is ready.`
				: artifactState === "pending"
					? `${kind} artifact is still pending.`
					: `${kind} artifact is missing.`),
		repoRelativePath: overrides.repoRelativePath ?? null,
		state: artifactState,
	};
}

function createInputProvenance(overrides = {}) {
	return {
		canonicalUrl: overrides.canonicalUrl ?? null,
		host: overrides.host ?? null,
		kind: overrides.kind ?? "unknown",
		message: overrides.message ?? "Evaluation input provenance is unavailable.",
	};
}

function createVerificationSummary(overrides = {}) {
	return {
		message: overrides.message ?? "Verification is unavailable.",
		result: overrides.result ?? "none",
		source: overrides.source ?? "none",
		status: overrides.status ?? "unconfirmed",
		url: overrides.url ?? null,
	};
}

function createReviewFocus(overrides = {}) {
	return {
		pipelineReview: {
			availability: overrides.pipelineAvailability ?? "unavailable",
			message:
				overrides.pipelineMessage ??
				"Pipeline review unlocks after the evaluation closeout reaches a review-ready state.",
			reportNumber: overrides.pipelineReportNumber ?? null,
			section: overrides.pipelineSection ?? "all",
			url: overrides.pipelineUrl ?? null,
		},
		primaryTarget: overrides.primaryTarget ?? "none",
		reportViewer: {
			availability: overrides.reportAvailability ?? "unavailable",
			message: overrides.reportMessage ?? "Report review is unavailable.",
			reportNumber: overrides.reportFocusNumber ?? null,
			reportPath: overrides.reportPath ?? null,
		},
		trackerWorkspace: {
			availability: overrides.trackerAvailability ?? "unavailable",
			message: overrides.trackerMessage ?? "Tracker review is unavailable.",
			reportNumber: overrides.trackerReportNumber ?? null,
		},
	};
}

function createEvaluationResultSummary(overrides = {}) {
	const summaryState = overrides.state ?? "running";
	const sessionId = overrides.sessionId ?? "session-live";
	const workflow = overrides.workflow ?? "single-evaluation";
	const updatedAt = overrides.updatedAt ?? "2026-04-22T00:00:00.000Z";
	const sessionStatus =
		overrides.sessionStatus ??
		(summaryState === "approval-paused"
			? "waiting"
			: summaryState === "pending"
				? "pending"
				: summaryState === "running"
					? "running"
					: summaryState === "failed"
						? "failed"
						: "completed");
	const jobStatus =
		overrides.jobStatus ??
		(summaryState === "approval-paused"
			? "waiting"
			: summaryState === "pending"
				? "queued"
				: summaryState === "running"
					? "running"
					: summaryState === "failed"
						? "failed"
						: "completed");

	if (summaryState === "empty") {
		return {
			artifacts: {
				pdf: createEvaluationArtifactSummary("pdf", {
					message: "pdf artifact is missing.",
					state: "missing",
				}),
				report: createEvaluationArtifactSummary("report", {
					message: "report artifact is missing.",
					state: "missing",
				}),
				tracker: createEvaluationArtifactSummary("tracker", {
					message: "tracker artifact is missing.",
					state: "missing",
				}),
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
			inputProvenance: createInputProvenance(),
			job: null,
			legitimacy: null,
			message:
				overrides.message ?? "No evaluation sessions have been recorded yet.",
			reportNumber: null,
			reviewFocus: createReviewFocus(),
			score: null,
			session: null,
			state: "empty",
			verification: createVerificationSummary(),
			workflow: null,
			warnings: {
				hasMore: false,
				items: [],
				totalCount: 0,
			},
		};
	}

	if (
		summaryState === "missing-session" ||
		summaryState === "unsupported-workflow"
	) {
		return {
			...createEvaluationResultSummary({
				message:
					summaryState === "missing-session"
						? `Evaluation session ${sessionId} was not found.`
						: `Workflow ${workflow} is not supported by the evaluation-result route.`,
				state: "empty",
			}),
			message:
				overrides.message ??
				(summaryState === "missing-session"
					? `Evaluation session ${sessionId} was not found.`
					: `Workflow ${workflow} is not supported by the evaluation-result route.`),
			state: summaryState,
		};
	}

	const approval =
		summaryState === "approval-paused"
			? {
					action: "approve-run",
					approvalId: overrides.approvalId ?? "approval-resume",
					jobId: overrides.jobId ?? "job-live",
					requestedAt: updatedAt,
					resolvedAt: null,
					status: "pending",
					title: overrides.approvalTitle ?? "Review resumed run",
					traceId: "trace-resume",
				}
			: (overrides.approval ?? null);
	const warnings =
		summaryState === "degraded"
			? (overrides.warnings ?? [
					{
						code: null,
						message: "Manual legitimacy review required.",
					},
					{
						code: null,
						message: "PDF generation is incomplete.",
					},
				])
			: (overrides.warnings ?? []);

	return {
		artifacts: overrides.artifacts ?? {
			pdf: createEvaluationArtifactSummary("pdf", {
				repoRelativePath:
					summaryState === "completed"
						? "output/101-ready.pdf"
						: summaryState === "degraded"
							? "output/102-missing.pdf"
							: null,
				state:
					summaryState === "completed"
						? "ready"
						: summaryState === "degraded"
							? "missing"
							: "pending",
			}),
			report: createEvaluationArtifactSummary("report", {
				repoRelativePath:
					summaryState === "completed"
						? "reports/101-ready.md"
						: summaryState === "degraded"
							? "reports/102-degraded.md"
							: null,
				state:
					summaryState === "completed" || summaryState === "degraded"
						? "ready"
						: "pending",
			}),
			tracker: createEvaluationArtifactSummary("tracker", {
				repoRelativePath:
					summaryState === "completed"
						? "batch/tracker-additions/101-ready.tsv"
						: summaryState === "degraded"
							? "batch/tracker-additions/102-degraded.tsv"
							: null,
				state:
					summaryState === "completed" || summaryState === "degraded"
						? "ready"
						: "pending",
			}),
		},
		checkpoint: overrides.checkpoint ?? {
			completedStepCount: summaryState === "running" ? 4 : 0,
			completedSteps:
				summaryState === "running"
					? [
							"validated-input",
							"captured-job-description",
							"scored-fit",
							"prepared-report",
						]
					: [],
			cursor: summaryState === "running" ? "prepared-report" : null,
			hasMore: false,
			updatedAt: summaryState === "running" ? updatedAt : null,
		},
		closeout: overrides.closeout ?? {
			message:
				summaryState === "completed"
					? "All evaluation artifacts are ready for review."
					: summaryState === "degraded"
						? "Evaluation completed with warnings or missing artifacts that need attention."
						: summaryState === "failed"
							? "Evaluation failed before a clean artifact handoff completed."
							: "Evaluation closeout is still in progress.",
			readyForReview:
				summaryState === "completed" || summaryState === "degraded",
			state:
				summaryState === "completed"
					? "review-ready"
					: summaryState === "degraded" || summaryState === "failed"
						? "attention-required"
						: "in-progress",
		},
		failure:
			summaryState === "failed"
				? {
						failedAt: updatedAt,
						jobId: overrides.jobId ?? "job-live",
						message: overrides.failureMessage ?? "JD extraction failed.",
						runId: "run-live",
						sessionId,
						traceId: "trace-live",
					}
				: null,
		handoff:
			summaryState === "approval-paused"
				? {
						approval,
						approvalStatus: "pending",
						message: `Evaluation session is waiting for approval: ${approval.title}.`,
						resumeAllowed: false,
						state: "waiting-for-approval",
					}
				: summaryState === "failed"
					? {
							approval: null,
							approvalStatus: "none",
							message:
								"The shared resume path can inspect this failed session.",
							resumeAllowed: true,
							state: "resume-ready",
						}
					: {
							approval: null,
							approvalStatus: "none",
							message: "No approval handoff is attached to this result.",
							resumeAllowed: false,
							state: "none",
						},
		inputProvenance:
			overrides.inputProvenance ??
			(workflow === "auto-pipeline"
				? createInputProvenance({
						canonicalUrl: "https://example.com/jobs/degraded",
						host: "example.com",
						kind: "job-url",
						message:
							"Launched from live job URL https://example.com/jobs/degraded.",
					})
				: createInputProvenance({
						kind: "raw-jd",
						message:
							"Launched from raw job-description text. Prompt text is redacted from stored session context.",
					})),
		job: overrides.job ?? {
			attempt: 1,
			completedAt:
				jobStatus === "completed" || jobStatus === "failed" ? updatedAt : null,
			currentRunId: "run-live",
			jobId: overrides.jobId ?? "job-live",
			jobType: "evaluate-job",
			startedAt:
				jobStatus === "queued" || jobStatus === "pending" ? null : updatedAt,
			status: jobStatus,
			updatedAt,
			waitReason: summaryState === "approval-paused" ? "approval" : null,
		},
		legitimacy:
			overrides.legitimacy ??
			(summaryState === "completed"
				? "High Confidence"
				: summaryState === "degraded"
					? "Proceed with Caution"
					: null),
		message:
			overrides.message ??
			(summaryState === "pending"
				? "Evaluation session is queued and has not started yet."
				: summaryState === "running"
					? "Evaluation session is still running."
					: summaryState === "approval-paused"
						? `Evaluation session is waiting for approval: ${approval.title}.`
						: summaryState === "failed"
							? "JD extraction failed."
							: summaryState === "completed"
								? "Evaluation result summary is ready."
								: "Evaluation result summary is ready with warnings or missing artifacts."),
		reportNumber:
			overrides.reportNumber ??
			(summaryState === "completed"
				? "101"
				: summaryState === "degraded"
					? "102"
					: null),
		reviewFocus:
			overrides.reviewFocus ??
			createReviewFocus({
				pipelineAvailability:
					summaryState === "completed" || summaryState === "degraded"
						? "ready"
						: "unavailable",
				pipelineMessage:
					summaryState === "completed"
						? "Pipeline review can focus processed row #101."
						: summaryState === "degraded"
							? "Pipeline review can focus processed row #102."
							: "Pipeline review unlocks after the evaluation closeout reaches a review-ready state.",
				pipelineReportNumber:
					summaryState === "completed"
						? "101"
						: summaryState === "degraded"
							? "102"
							: null,
				pipelineSection:
					summaryState === "completed" || summaryState === "degraded"
						? "processed"
						: "all",
				primaryTarget:
					summaryState === "completed" || summaryState === "degraded"
						? "report-viewer"
						: "none",
				reportAvailability:
					summaryState === "completed" || summaryState === "degraded"
						? "ready"
						: "unavailable",
				reportFocusNumber:
					summaryState === "completed"
						? "101"
						: summaryState === "degraded"
							? "102"
							: null,
				reportMessage:
					summaryState === "completed" || summaryState === "degraded"
						? "Report artifact is ready for in-app review."
						: "Report review is unavailable.",
				reportPath:
					summaryState === "completed"
						? "reports/101-ready.md"
						: summaryState === "degraded"
							? "reports/102-degraded.md"
							: null,
				trackerAvailability:
					summaryState === "completed" || summaryState === "degraded"
						? "ready"
						: "unavailable",
				trackerMessage:
					summaryState === "completed"
						? "Tracker review can focus report #101 across merged rows and pending TSV additions."
						: summaryState === "degraded"
							? "Tracker review can focus report #102 across merged rows and pending TSV additions."
							: "Tracker review unlocks after the evaluation closeout records a report number.",
				trackerReportNumber:
					summaryState === "completed"
						? "101"
						: summaryState === "degraded"
							? "102"
							: null,
			}),
		score:
			overrides.score ??
			(summaryState === "completed"
				? 4.9
				: summaryState === "degraded"
					? 3.8
					: null),
		session: overrides.session ?? {
			activeJobId: overrides.jobId ?? "job-live",
			lastHeartbeatAt: updatedAt,
			sessionId,
			status: sessionStatus,
			updatedAt,
			workflow,
		},
		state: summaryState,
		verification:
			overrides.verification ??
			(workflow === "auto-pipeline"
				? createVerificationSummary({
						message:
							summaryState === "degraded"
								? "manual review"
								: "active via browser review",
						result: summaryState === "degraded" ? "uncertain" : "active",
						source: "report-header",
						status: summaryState === "degraded" ? "needs-review" : "verified",
						url: "https://example.com/jobs/degraded",
					})
				: createVerificationSummary({
						message:
							"Verification is not applicable for raw job-description launches.",
						result: "none",
						source: "none",
						status: "not-applicable",
						url: null,
					})),
		workflow,
		warnings: {
			hasMore: false,
			items: warnings,
			totalCount: warnings.length,
		},
	};
}

function isEvaluationWorkflow(workflow) {
	return workflow === "auto-pipeline" || workflow === "single-evaluation";
}

function toEvaluationSessionPreview(summary) {
	return {
		sessionId: summary.session.sessionId,
		state: summary.state,
		status: summary.session.status,
		updatedAt: summary.session.updatedAt,
		workflow: summary.workflow,
	};
}

function createEvaluationResultPayload(state, requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedSessionId = url.searchParams.get("sessionId");
	const requestedWorkflow = url.searchParams.get("workflow");
	const previewLimit = Number.parseInt(
		url.searchParams.get("previewLimit") ?? "4",
		10,
	);
	const recentEntries = [...state.evaluationResults.values()]
		.filter((summary) =>
			requestedWorkflow ? summary.workflow === requestedWorkflow : true,
		)
		.sort((left, right) =>
			right.session.updatedAt.localeCompare(left.session.updatedAt),
		);
	let summary;

	if (requestedSessionId) {
		summary = state.evaluationResults.get(requestedSessionId) ?? null;

		if (!summary) {
			const selectedDetail =
				state.sessionDetails.get(requestedSessionId) ?? null;
			summary = selectedDetail
				? createEvaluationResultSummary({
						message: `Workflow ${selectedDetail.session.workflow} is not supported by the evaluation-result route.`,
						sessionId: requestedSessionId,
						state: isEvaluationWorkflow(selectedDetail.session.workflow)
							? "missing-session"
							: "unsupported-workflow",
						workflow: selectedDetail.session.workflow,
					})
				: createEvaluationResultSummary({
						message: `Evaluation session ${requestedSessionId} was not found.`,
						sessionId: requestedSessionId,
						state: "missing-session",
					});
		}
	} else if (requestedWorkflow && !isEvaluationWorkflow(requestedWorkflow)) {
		summary = createEvaluationResultSummary({
			message: `Workflow ${requestedWorkflow} is not supported by the evaluation-result route.`,
			state: "unsupported-workflow",
			workflow: requestedWorkflow,
		});
	} else {
		summary =
			recentEntries[0] ?? createEvaluationResultSummary({ state: "empty" });
	}

	return {
		filters: {
			previewLimit: Number.isNaN(previewLimit) ? 4 : previewLimit,
			sessionId: requestedSessionId,
			workflow: requestedWorkflow,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: summary.message,
		ok: true,
		recentSessions: recentEntries.map((entry) =>
			toEvaluationSessionPreview(entry),
		),
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		summary,
	};
}

function createPipelineReviewPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const reportNumber = url.searchParams.get("reportNumber");
	const selectedRow =
		reportNumber === "102"
			? {
					company: "Degraded Co",
					kind: "processed",
					legitimacy: "Proceed with Caution",
					pdf: {
						exists: false,
						message: "PDF generation is incomplete.",
						repoRelativePath: null,
					},
					report: {
						exists: true,
						message: "Checked-in report reports/102-degraded.md is available.",
						repoRelativePath: "reports/102-degraded.md",
					},
					reportNumber: "102",
					role: "Degraded Role",
					score: 3.8,
					selected: true,
					sourceLine:
						"- [x] #102 | https://example.com/jobs/degraded | Degraded Co | Degraded Role | 3.8/5 | PDF No",
					url: "https://example.com/jobs/degraded",
					verification: "manual review",
					warningCount: 2,
					warnings: [
						{
							code: "caution-legitimacy",
							message: "Legitimacy is marked Proceed with Caution.",
						},
						{
							code: "missing-pdf",
							message: "PDF generation is incomplete.",
						},
					],
				}
			: {
					company: "Ready Co",
					kind: "processed",
					legitimacy: "High Confidence",
					pdf: {
						exists: true,
						message:
							"Checked-in PDF artifact output/cv-ready.pdf is available.",
						repoRelativePath: "output/cv-ready.pdf",
					},
					report: {
						exists: true,
						message: "Checked-in report reports/101-ready.md is available.",
						repoRelativePath: "reports/101-ready.md",
					},
					reportNumber: "101",
					role: "Ready Role",
					score: 4.9,
					selected: true,
					sourceLine:
						"- [x] #101 | https://example.com/jobs/ready | Ready Co | Ready Role | 4.9/5 | PDF Yes",
					url: "https://example.com/jobs/ready",
					verification: "active via browser review",
					warningCount: 0,
					warnings: [],
				};

	return {
		filters: {
			limit: 12,
			offset: 0,
			reportNumber: selectedRow.reportNumber,
			section: "processed",
			sort: "queue",
			url: null,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: `Showing queue detail for processed row #${selectedRow.reportNumber}.`,
		ok: true,
		queue: {
			counts: {
				malformed: 0,
				pending: 0,
				processed: 1,
			},
			hasMore: false,
			items: [selectedRow],
			limit: 12,
			offset: 0,
			section: "processed",
			sort: "queue",
			totalCount: 1,
		},
		selectedDetail: {
			message: `Showing queue detail for processed row #${selectedRow.reportNumber}.`,
			origin: "report-number",
			requestedReportNumber: selectedRow.reportNumber,
			requestedUrl: null,
			row: {
				...selectedRow,
				header: {
					archetype: "Applied AI",
					date: "2026-04-22",
					legitimacy: selectedRow.legitimacy,
					pdf: selectedRow.pdf,
					score: selectedRow.score,
					title: `Evaluation: ${selectedRow.company} -- ${selectedRow.role}`,
					url: selectedRow.url,
					verification: selectedRow.verification,
				},
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
			campaignGuidance: "Current strongest lane: Forward Deployed.",
			generatedBy: "npm run scan",
			lastRefreshed: "2026-04-22",
			message: "Shortlist guidance is available for queue review.",
			topRoles: [
				{
					bucketLabel: "Strongest fit",
					company: selectedRow.company,
					reasonSummary: "focus from evaluation handoff",
					role: selectedRow.role,
					url: selectedRow.url,
				},
			],
		},
		status: "ready",
	};
}

function createReportViewerPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const reportPath =
		url.searchParams.get("reportPath") ?? "reports/101-ready.md";
	const reportNumber = reportPath.includes("102-") ? "102" : "101";
	const company = reportNumber === "102" ? "Degraded Co" : "Ready Co";
	const role = reportNumber === "102" ? "Degraded Role" : "Ready Role";
	const verification =
		reportNumber === "102" ? "manual review" : "active via browser review";
	const pdf =
		reportNumber === "102"
			? {
					exists: false,
					repoRelativePath: null,
				}
			: {
					exists: true,
					repoRelativePath: "output/101-ready.pdf",
				};

	return {
		filters: {
			group: "reports",
			limit: 8,
			offset: 0,
			reportPath,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: `Showing selected report ${reportPath}.`,
		ok: true,
		recentArtifacts: {
			group: "reports",
			hasMore: false,
			items: [
				{
					artifactDate: "2026-04-22",
					fileName: "101-ready.md",
					kind: "report",
					repoRelativePath: "reports/101-ready.md",
					reportNumber: "101",
					selected: reportNumber === "101",
				},
				{
					artifactDate: "2026-04-22",
					fileName: "102-degraded.md",
					kind: "report",
					repoRelativePath: "reports/102-degraded.md",
					reportNumber: "102",
					selected: reportNumber === "102",
				},
			],
			limit: 8,
			offset: 0,
			totalCount: 2,
		},
		selectedReport: {
			body: [
				`# Evaluation: ${company} -- ${role}`,
				"",
				"Artifact handoff report body.",
			].join("\n"),
			header: {
				archetype: "Applied AI",
				date: "2026-04-22",
				legitimacy:
					reportNumber === "102" ? "Proceed with Caution" : "High Confidence",
				pdf,
				score: reportNumber === "102" ? 3.8 : 4.9,
				title: `Evaluation: ${company} -- ${role}`,
				url:
					reportNumber === "102"
						? "https://example.com/jobs/degraded"
						: "https://example.com/jobs/ready",
				verification,
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

function createTrackerWorkspacePayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const reportNumber = url.searchParams.get("reportNumber");
	const selectedRow =
		reportNumber === "102"
			? {
					company: "Degraded Co",
					date: "2026-04-22",
					entryNumber: 102,
					header: {
						date: "2026-04-22",
						legitimacy: "Proceed with Caution",
						pdf: {
							exists: false,
							message: "PDF generation is incomplete.",
							repoRelativePath: null,
						},
						score: 3.8,
						title: "Evaluation: Degraded Co -- Degraded Role",
						url: "https://example.com/jobs/degraded",
						verification: "manual review",
					},
					notes: "Closeout needs manual legitimacy review before apply.",
					pdf: {
						exists: false,
						message: "PDF generation is incomplete.",
						repoRelativePath: null,
					},
					report: {
						exists: true,
						message:
							"Checked-in report artifact reports/102-degraded.md is available.",
						repoRelativePath: "reports/102-degraded.md",
					},
					role: "Degraded Role",
					score: 3.8,
					scoreLabel: "3.8/5",
					sourceLine:
						"| 102 | 2026-04-22 | Degraded Co | Degraded Role | 3.8/5 | Evaluated | N | [102](reports/102-degraded.md) | Closeout needs manual legitimacy review before apply. |",
					status: "Evaluated",
					warnings: [
						{
							code: "manual-review",
							message: "Legitimacy and verification still need manual review.",
						},
					],
				}
			: {
					company: "Ready Co",
					date: "2026-04-22",
					entryNumber: 101,
					header: {
						date: "2026-04-22",
						legitimacy: "High Confidence",
						pdf: {
							exists: true,
							message:
								"Checked-in PDF artifact output/101-ready.pdf is available.",
							repoRelativePath: "output/101-ready.pdf",
						},
						score: 4.9,
						title: "Evaluation: Ready Co -- Ready Role",
						url: "https://example.com/jobs/ready",
						verification: "active via browser review",
					},
					notes: "Ready for tracker closeout review.",
					pdf: {
						exists: true,
						message:
							"Checked-in PDF artifact output/101-ready.pdf is available.",
						repoRelativePath: "output/101-ready.pdf",
					},
					report: {
						exists: true,
						message:
							"Checked-in report artifact reports/101-ready.md is available.",
						repoRelativePath: "reports/101-ready.md",
					},
					role: "Ready Role",
					score: 4.9,
					scoreLabel: "4.9/5",
					sourceLine:
						"| 101 | 2026-04-22 | Ready Co | Ready Role | 4.9/5 | Evaluated | Y | [101](reports/101-ready.md) | Ready for tracker closeout review. |",
					status: "Evaluated",
					warnings: [],
				};

	return {
		filters: {
			entryNumber: null,
			limit: 12,
			offset: 0,
			reportNumber: reportNumber ?? null,
			search: null,
			sort: "date",
			status: null,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: "Showing tracker row detail from the evaluation handoff.",
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
					company: selectedRow.company,
					date: selectedRow.date,
					entryNumber: selectedRow.entryNumber,
					pdf: selectedRow.pdf,
					report: selectedRow.report,
					role: selectedRow.role,
					score: selectedRow.score,
					scoreLabel: selectedRow.scoreLabel,
					selected: true,
					status: selectedRow.status,
					warningCount: selectedRow.warnings.length,
					warnings: selectedRow.warnings,
				},
			],
			limit: 12,
			offset: 0,
			sort: "date",
			totalCount: 1,
		},
		selectedDetail: {
			message: `Showing tracker row for report #${reportNumber ?? "101"}.`,
			origin: "report-number",
			pendingAddition: null,
			requestedEntryNumber: selectedRow.entryNumber,
			requestedReportNumber: reportNumber ?? "101",
			row: {
				...selectedRow,
				selected: true,
				warningCount: selectedRow.warnings.length,
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

function createCommandPayload(input) {
	return {
		generatedAt: "2026-04-21T23:58:30.000Z",
		handoff: {
			job: input.detail?.session.job ?? null,
			message: input.message,
			pendingApproval: input.detail?.session.pendingApproval ?? null,
			requestedAt: "2026-04-21T23:58:30.000Z",
			route: {
				message: input.routeMessage,
				missingCapabilities: input.missingCapabilities ?? [],
				requestKind: input.requestKind,
				sessionId: input.detail?.session.sessionId ?? input.sessionId ?? null,
				specialistId: input.specialistId ?? null,
				status: input.routeStatus,
				workflow: input.workflow ?? null,
			},
			runtime: input.runtime,
			selectedSession: input.detail ?? null,
			session: input.detail?.session ?? null,
			specialist:
				input.specialistId === null
					? null
					: {
							description: input.specialistLabel ?? "Specialist handoff",
							id: input.specialistId,
							label: input.specialistLabel ?? "Specialist handoff",
						},
			state: input.state,
			toolingGap:
				input.state === "tooling-gap"
					? {
							message: input.message,
							missingCapabilities: input.missingCapabilities ?? [],
						}
					: null,
		},
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: input.status ?? "ready",
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
		chatConsoleMode: "empty",
		evaluationResultDelayMs: 0,
		evaluationResultMode: "ready",
		evaluationResults: new Map(),
		launchCount: 0,
		launchMode: "running",
		nextLaunchGate: null,
		resumeCount: 0,
		selectedSessionId: null,
		sessionDetails: new Map(),
		summaryDelayMs: 0,
	};
	const readyStartupPayload = createReadyStartupPayload();
	const readyShellSummary = createReadyShellSummary();

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

		if ((request.url ?? "").startsWith("/chat-console")) {
			if (state.summaryDelayMs > 0) {
				await delay(state.summaryDelayMs);
			}

			if (state.chatConsoleMode === "invalid-payload") {
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(JSON.stringify({ ok: true, message: "broken" }, null, 2));
				return;
			}

			const url = new URL(request.url, "http://127.0.0.1");
			const selectedSessionId = url.searchParams.get("sessionId");
			const payload = createChatConsoleSummaryPayload(state, selectedSessionId);

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(payload, null, 2));
			return;
		}

		if (request.url === "/orchestration" && request.method === "POST") {
			const chunks = [];

			for await (const chunk of request) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			}

			const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));

			if (body.kind === "launch") {
				state.launchCount += 1;

				if (state.nextLaunchGate) {
					await state.nextLaunchGate.promise;
					state.nextLaunchGate = null;
				}

				if (
					body.workflow === "tracker-status" ||
					state.launchMode === "tooling-gap"
				) {
					const detail = createSessionDetail(
						createSessionSummary({
							sessionId: "session-gap",
							state: "tooling-gap",
							status: "pending",
							updatedAt: "2026-04-21T23:59:20.000Z",
							workflow: "tracker-status",
						}),
						{
							route: {
								message:
									"Tracker status remains blocked until a typed tracker-summary tool is implemented.",
								missingCapabilities: ["typed-tracker-summary"],
								specialistId: "tracker-specialist",
								status: "tooling-gap",
							},
							timelineSummary: "Tracker launch is blocked by missing tooling.",
						},
					);
					state.sessionDetails.set(detail.session.sessionId, detail);
					state.selectedSessionId = detail.session.sessionId;
					state.evaluationResults.delete(detail.session.sessionId);

					response.writeHead(200, {
						"content-type": "application/json; charset=utf-8",
					});
					response.end(
						JSON.stringify(
							createCommandPayload({
								detail,
								message:
									"Tracker status remains blocked until a typed tracker-summary tool is implemented.",
								missingCapabilities: ["typed-tracker-summary"],
								requestKind: "launch",
								routeMessage:
									"Tracker status remains blocked until a typed tracker-summary tool is implemented.",
								routeStatus: "tooling-gap",
								runtime: {
									message:
										"Tracker status remains blocked until a typed tracker-summary tool is implemented.",
									modeRepoRelativePath: null,
									model: null,
									promptState: null,
									startedAt: null,
									status: "skipped",
									workflow: null,
								},
								specialistId: "tracker-specialist",
								specialistLabel: "Tracker Specialist",
								state: "tooling-gap",
								workflow: "tracker-status",
							}),
							null,
							2,
						),
					);
					return;
				}

				if (state.launchMode === "auth-blocked") {
					const detail = createSessionDetail(
						createSessionSummary({
							sessionId: "session-auth",
							state: "ready",
							status: "pending",
							updatedAt: "2026-04-21T23:59:10.000Z",
						}),
						{
							timelineSummary: "Launch created a blocked session.",
						},
					);
					state.sessionDetails.set(detail.session.sessionId, detail);
					state.selectedSessionId = detail.session.sessionId;
					state.evaluationResults.set(
						detail.session.sessionId,
						createEvaluationResultSummary({
							message: "Evaluation session is queued and has not started yet.",
							sessionId: detail.session.sessionId,
							state: "pending",
							updatedAt: detail.session.updatedAt,
						}),
					);

					response.writeHead(200, {
						"content-type": "application/json; charset=utf-8",
					});
					response.end(
						JSON.stringify(
							createCommandPayload({
								detail,
								message: "Stored OpenAI account credentials are required.",
								requestKind: "launch",
								routeMessage:
									"Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.",
								routeStatus: "ready",
								runtime: {
									message: "Stored OpenAI account credentials are required.",
									modeRepoRelativePath: null,
									model: null,
									promptState: "ready",
									startedAt: null,
									status: "blocked",
									workflow: null,
								},
								specialistId: "evaluation-specialist",
								specialistLabel: "Evaluation Specialist",
								state: "auth-required",
								status: "auth-required",
								workflow: "single-evaluation",
							}),
							null,
							2,
						),
					);
					return;
				}

				const detail = createSessionDetail(
					createSessionSummary({
						sessionId: "session-live",
						state: "running",
						status: "running",
						updatedAt: "2026-04-21T23:59:00.000Z",
						workflow: "single-evaluation",
					}),
					{
						timelineSummary: "Launch accepted.",
					},
				);
				state.sessionDetails.set(detail.session.sessionId, detail);
				state.selectedSessionId = detail.session.sessionId;
				state.evaluationResults.set(
					detail.session.sessionId,
					createEvaluationResultSummary({
						sessionId: detail.session.sessionId,
						state: "running",
						updatedAt: detail.session.updatedAt,
						workflow: detail.session.workflow,
					}),
				);

				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createCommandPayload({
							detail,
							message: "Run handoff is active.",
							requestKind: "launch",
							routeMessage:
								"Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.",
							routeStatus: "ready",
							runtime: {
								message: "Runtime is ready for workflow single-evaluation.",
								modeRepoRelativePath: "modes/oferta.md",
								model: "gpt-5.4-mini",
								promptState: "ready",
								startedAt: "2026-04-21T23:59:00.000Z",
								status: "ready",
								workflow: "single-evaluation",
							},
							specialistId: "evaluation-specialist",
							specialistLabel: "Evaluation Specialist",
							state: "running",
							workflow: "single-evaluation",
						}),
						null,
						2,
					),
				);
				return;
			}

			state.resumeCount += 1;
			const existingDetail = state.sessionDetails.get(body.sessionId);

			if (!existingDetail) {
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createCommandPayload({
							detail: null,
							message: `Runtime session does not exist: ${body.sessionId}.`,
							requestKind: "resume",
							routeMessage: `Runtime session does not exist: ${body.sessionId}.`,
							routeStatus: "session-not-found",
							runtime: {
								message: `Runtime session does not exist: ${body.sessionId}.`,
								modeRepoRelativePath: null,
								model: null,
								promptState: null,
								startedAt: null,
								status: "skipped",
								workflow: null,
							},
							specialistId: null,
							state: "failed",
							workflow: null,
						}),
						null,
						2,
					),
				);
				return;
			}

			const resumedDetail = createSessionDetail(
				createSessionSummary({
					pendingApproval: {
						action: "approve-run",
						approvalId: "approval-resume",
						jobId: "job-live",
						requestedAt: "2026-04-22T00:00:00.000Z",
						title: "Review resumed run",
						traceId: "trace-resume",
					},
					pendingApprovalCount: 1,
					sessionId: existingDetail.session.sessionId,
					state: "waiting-for-approval",
					status: "waiting",
					updatedAt: "2026-04-22T00:00:00.000Z",
					waitReason: "approval",
					workflow: existingDetail.session.workflow,
				}),
				{
					approvals: [
						{
							action: "approve-run",
							approvalId: "approval-resume",
							jobId: "job-live",
							requestedAt: "2026-04-22T00:00:00.000Z",
							title: "Review resumed run",
							traceId: "trace-resume",
						},
					],
					route: existingDetail.route,
					timelineSummary: "Run is waiting for approval.",
				},
			);
			state.sessionDetails.set(resumedDetail.session.sessionId, resumedDetail);
			state.selectedSessionId = resumedDetail.session.sessionId;
			state.evaluationResults.set(
				resumedDetail.session.sessionId,
				createEvaluationResultSummary({
					approvalId: "approval-resume",
					approvalTitle: "Review resumed run",
					sessionId: resumedDetail.session.sessionId,
					state: "approval-paused",
					updatedAt: resumedDetail.session.updatedAt,
					workflow: resumedDetail.session.workflow,
				}),
			);

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createCommandPayload({
						detail: resumedDetail,
						message: "Run is waiting for approval: Review resumed run.",
						requestKind: "resume",
						routeMessage: existingDetail.route.message,
						routeStatus: "ready",
						runtime: {
							message: "Runtime is ready for workflow single-evaluation.",
							modeRepoRelativePath: "modes/oferta.md",
							model: "gpt-5.4-mini",
							promptState: "ready",
							startedAt: "2026-04-22T00:00:00.000Z",
							status: "ready",
							workflow: "single-evaluation",
						},
						specialistId: "evaluation-specialist",
						specialistLabel: "Evaluation Specialist",
						state: "waiting-for-approval",
						workflow: "single-evaluation",
					}),
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
		throw new Error("Failed to start the fake chat-console API.");
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
		holdNextLaunch() {
			state.nextLaunchGate = createDeferred();
			return state.nextLaunchGate;
		},
		setChatConsoleMode(mode) {
			state.chatConsoleMode = mode;
		},
		setEvaluationResultMode(mode) {
			state.evaluationResultMode = mode;
		},
		setEvaluationResultDelayMs(delayMs) {
			state.evaluationResultDelayMs = delayMs;
		},
		setLaunchMode(mode) {
			state.launchMode = mode;
		},
		setSummaryDelayMs(delayMs) {
			state.summaryDelayMs = delayMs;
		},
		upsertEvaluationResult(summary) {
			if (summary.session?.sessionId) {
				state.evaluationResults.set(summary.session.sessionId, summary);
			}
		},
		upsertSessionDetail(detail) {
			state.sessionDetails.set(detail.session.sessionId, detail);
		},
		state,
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
		fakeApi.setSummaryDelayMs(800);
		fakeApi.setEvaluationResultDelayMs(800);
		const page = await browser.newPage();
		await page.goto(`${webUrl}/evaluate`, { waitUntil: "domcontentloaded" });

		await page
			.getByRole("heading", { name: "App-first operator home" })
			.waitFor();
		await page
			.getByRole("heading", { name: "Launch a supported workflow" })
			.waitFor();
		await page.getByRole("heading", { name: "Loading recent runs" }).waitFor();
		await page.getByRole("heading", { name: "Loading results" }).waitFor();

		await page.waitForLoadState("networkidle");
		fakeApi.setSummaryDelayMs(0);
		fakeApi.setEvaluationResultDelayMs(0);
		await page.getByRole("heading", { name: "No recent runs" }).waitFor();
		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByRole("heading", { name: "No results yet" })
			.waitFor();

		const launchGate = fakeApi.holdNextLaunch();
		const launchButton = page.getByRole("button", {
			name: "Launch Single Evaluation",
		});
		await launchButton.click();
		await page.getByText("Launching...").waitFor();
		assert.equal(await launchButton.isDisabled(), true);
		await delay(200);
		assert.equal(fakeApi.state.launchCount, 1);
		launchGate.resolve();

		await page
			.getByRole("heading", { name: "Evaluation is running" })
			.waitFor();
		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByText("Evaluation closeout is still in progress.")
			.waitFor();
		await page.getByText("session-live").first().waitFor();

		await page.getByRole("button", { name: "Resume" }).first().click();
		await page
			.getByRole("heading", { name: "Evaluation is waiting for approval" })
			.waitFor();
		assert.equal(fakeApi.state.resumeCount, 1);

		fakeApi.setSummaryDelayMs(600);
		fakeApi.setEvaluationResultDelayMs(600);
		await page.getByRole("button", { name: "Refresh chat console" }).click();
		await page.getByText("Refreshing...").waitFor();
		assert.equal(
			await page
				.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
				.getByRole("button", { name: "Open approval review" })
				.isDisabled(),
			true,
		);
		fakeApi.setSummaryDelayMs(0);
		fakeApi.setEvaluationResultDelayMs(0);
		await page
			.getByRole("heading", { name: "Evaluation is waiting for approval" })
			.waitFor();

		await page
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByRole("button", { name: "Open approval review" })
			.click();
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();
		assert.equal(page.url().includes("/approvals"), true);

		const completedDetail = createSessionDetail(
			createSessionSummary({
				job: {
					attempt: 1,
					completedAt: "2026-04-22T00:10:00.000Z",
					currentRunId: "run-completed",
					jobId: "job-completed",
					jobType: "evaluate-job",
					startedAt: "2026-04-22T00:09:00.000Z",
					status: "completed",
					updatedAt: "2026-04-22T00:10:00.000Z",
					waitReason: null,
				},
				sessionId: "session-completed",
				state: "ready",
				status: "completed",
				updatedAt: "2026-04-22T00:10:00.000Z",
				workflow: "single-evaluation",
			}),
			{
				timelineSummary: "Evaluation completed successfully.",
			},
		);
		const degradedDetail = createSessionDetail(
			createSessionSummary({
				job: {
					attempt: 1,
					completedAt: "2026-04-22T00:11:00.000Z",
					currentRunId: "run-degraded",
					jobId: "job-degraded",
					jobType: "evaluate-job",
					startedAt: "2026-04-22T00:10:00.000Z",
					status: "completed",
					updatedAt: "2026-04-22T00:11:00.000Z",
					waitReason: null,
				},
				sessionId: "session-degraded",
				state: "ready",
				status: "completed",
				updatedAt: "2026-04-22T00:11:00.000Z",
				workflow: "auto-pipeline",
			}),
			{
				timelineSummary: "Evaluation completed with warnings.",
			},
		);
		const failedDetail = createSessionDetail(
			createSessionSummary({
				job: {
					attempt: 1,
					completedAt: "2026-04-22T00:12:00.000Z",
					currentRunId: "run-failed",
					jobId: "job-failed",
					jobType: "evaluate-job",
					startedAt: "2026-04-22T00:11:00.000Z",
					status: "failed",
					updatedAt: "2026-04-22T00:12:00.000Z",
					waitReason: null,
				},
				latestFailure: {
					failedAt: "2026-04-22T00:12:00.000Z",
					jobId: "job-failed",
					message: "JD extraction failed.",
					runId: "run-failed",
					sessionId: "session-failed",
					traceId: "trace-failed",
				},
				sessionId: "session-failed",
				state: "failed",
				status: "failed",
				updatedAt: "2026-04-22T00:12:00.000Z",
				workflow: "single-evaluation",
			}),
			{
				failure: {
					failedAt: "2026-04-22T00:12:00.000Z",
					jobId: "job-failed",
					message: "JD extraction failed.",
					runId: "run-failed",
					sessionId: "session-failed",
					traceId: "trace-failed",
				},
				timelineSummary: "Evaluation failed.",
			},
		);

		fakeApi.upsertSessionDetail(completedDetail);
		fakeApi.upsertSessionDetail(degradedDetail);
		fakeApi.upsertSessionDetail(failedDetail);
		fakeApi.upsertEvaluationResult(
			createEvaluationResultSummary({
				jobId: "job-completed",
				sessionId: "session-completed",
				state: "completed",
				updatedAt: "2026-04-22T00:10:00.000Z",
				workflow: "single-evaluation",
			}),
		);
		fakeApi.upsertEvaluationResult(
			createEvaluationResultSummary({
				jobId: "job-degraded",
				sessionId: "session-degraded",
				state: "degraded",
				updatedAt: "2026-04-22T00:11:00.000Z",
				workflow: "auto-pipeline",
			}),
		);
		fakeApi.upsertEvaluationResult(
			createEvaluationResultSummary({
				failureMessage: "JD extraction failed.",
				jobId: "job-failed",
				sessionId: "session-failed",
				state: "failed",
				updatedAt: "2026-04-22T00:12:00.000Z",
				workflow: "single-evaluation",
			}),
		);

		await page.goto(`${webUrl}/evaluate?session=session-live`, {
			waitUntil: "networkidle",
		});
		await page.getByText("session-completed").first().waitFor();

		const recentSessions = page.locator(
			'section[aria-labelledby="chat-console-recent-title"]',
		);

		await recentSessions
			.locator("article")
			.filter({ hasText: "session-completed" })
			.getByRole("button", { name: "Select" })
			.click();
		await page
			.getByRole("heading", { name: "Artifacts are ready for review" })
			.waitFor();
		const completedRail = page.locator(
			'section[aria-labelledby="evaluation-artifact-rail-title"]',
		);
		await completedRail.getByText("#101").first().waitFor();
		await completedRail.getByText("Raw JD text").first().waitFor();
		await completedRail.getByText("not-applicable").first().waitFor();
		assert.equal(
			await completedRail
				.getByRole("button", { name: "Open report viewer" })
				.isDisabled(),
			false,
		);
		assert.equal(
			await completedRail
				.getByRole("button", { name: "PDF handoff deferred" })
				.isDisabled(),
			true,
		);
		assert.equal(
			await completedRail
				.getByRole("button", { name: "Open pipeline review" })
				.isDisabled(),
			false,
		);
		await completedRail
			.getByRole("button", { name: "Open report viewer" })
			.click();
		await page.getByRole("heading", { name: "Reports", exact: true }).waitFor();
		await page.getByText("Artifact handoff report body.").waitFor();
		assert.match(page.url(), /\/artifacts/);
		await page.goto(`${webUrl}/evaluate?session=session-completed`, {
			waitUntil: "networkidle",
		});
		await page
			.getByRole("heading", { name: "Launch a supported workflow" })
			.waitFor();
		await page
			.getByRole("heading", { name: "Artifacts are ready for review" })
			.waitFor();

		await completedRail
			.getByRole("button", { name: "Open pipeline review" })
			.click();
		await page.getByRole("heading", { name: "Queue triage" }).waitFor();
		assert.match(page.url(), /\/pipeline/);
		await page.goto(`${webUrl}/evaluate?session=session-completed`, {
			waitUntil: "networkidle",
		});
		await page
			.getByRole("heading", { name: "Launch a supported workflow" })
			.waitFor();
		await page
			.getByRole("heading", { name: "Artifacts are ready for review" })
			.waitFor();
		await completedRail
			.getByRole("button", { name: "Open tracker review" })
			.click();
		await page
			.getByRole("heading", {
				name: "Applications",
			})
			.waitFor();
		await page.getByText("Auto-focused from report #101").waitFor();
		assert.match(page.url(), /\/tracker/);
		await page.goto(`${webUrl}/evaluate?session=session-completed`, {
			waitUntil: "networkidle",
		});
		await page
			.getByRole("heading", { name: "Launch a supported workflow" })
			.waitFor();

		await recentSessions
			.locator("article")
			.filter({ hasText: "session-degraded" })
			.getByRole("button", { name: "Select" })
			.click();
		await page
			.getByRole("heading", { name: "Evaluation needs review attention" })
			.waitFor();
		await completedRail
			.getByText("Manual legitimacy review required.")
			.waitFor();
		await completedRail.getByText("PDF generation is incomplete.").waitFor();
		await completedRail.getByText("Live job URL").waitFor();
		await completedRail
			.getByText("https://example.com/jobs/degraded")
			.waitFor();
		await completedRail.getByText("needs-review").first().waitFor();
		await completedRail.getByText("manual review").first().waitFor();

		await recentSessions
			.locator("article")
			.filter({ hasText: "session-failed" })
			.getByRole("button", { name: "Select" })
			.click();
		await page.getByRole("heading", { name: "Evaluation failed" }).waitFor();
		await page
			.locator('section[aria-labelledby="chat-console-status-title"]')
			.getByRole("button", { name: "Open interrupted run" })
			.waitFor();

		fakeApi.setEvaluationResultMode("invalid-payload");
		const errorPage = await browser.newPage();
		await errorPage.goto(`${webUrl}/evaluate?session=session-completed`, {
			waitUntil: "networkidle",
		});
		await errorPage
			.getByRole("heading", { name: "Results unavailable" })
			.waitFor();
		await errorPage.close();
		fakeApi.setEvaluationResultMode("ready");

		const offlinePage = await browser.newPage();
		await offlinePage.goto(`${webUrl}/evaluate?session=session-completed`, {
			waitUntil: "networkidle",
		});
		await offlinePage
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByText("#101")
			.first()
			.waitFor();
		await offlinePage.route("**/api/evaluation-result*", async (route) => {
			await route.abort("failed");
		});
		await offlinePage
			.getByRole("button", { name: "Refresh chat console" })
			.click();
		await offlinePage
			.locator('section[aria-labelledby="evaluation-artifact-rail-title"]')
			.getByText("Showing last snapshot")
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

console.log("App chat console smoke checks passed.");

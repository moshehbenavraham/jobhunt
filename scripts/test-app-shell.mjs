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
const STARTUP_SESSION_ID = "phase01-session03-agent-runtime-bootstrap";

function createChecklistItem(input) {
	return {
		candidates: input.candidates,
		canonicalRepoRelativePath: input.path,
		description: input.description,
		missingBehavior: input.missingBehavior,
		owner: "user",
		surfaceKey: input.surfaceKey,
	};
}

function createRepairPreviewItem(input) {
	return {
		description: input.description,
		destination: {
			canonicalRepoRelativePath: input.path,
			matchedRepoRelativePath: null,
			status: "missing",
			surfaceKey: input.surfaceKey,
		},
		ready: true,
		reason: "ready",
		source: {
			repoRelativePath: input.templatePath,
			status: "found",
			surfaceKey: input.templateSurfaceKey,
		},
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

function createMissingOnboardingHealth() {
	return {
		agentRuntime: {
			authPath: `${ROOT}/data/openai-account-auth.json`,
			message: "Agent runtime ready.",
			promptState: "ready",
			status: "ready",
		},
		message: "Bootstrap is live, but onboarding files are still missing.",
		missing: {
			onboarding: 2,
			optional: 0,
			runtime: 0,
		},
		ok: false,
		operationalStore: {
			message: "Operational store ready.",
			status: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		startupStatus: "missing-prerequisites",
		status: "degraded",
	};
}

function createMissingPrerequisitesStartupPayload() {
	const base = createReadyStartupPayload();

	return {
		...base,
		diagnostics: {
			...base.diagnostics,
			onboardingMissing: [
				createChecklistItem({
					candidates: ["config/profile.yml"],
					description: "Profile configuration is missing.",
					missingBehavior: "onboarding-required",
					path: "config/profile.yml",
					surfaceKey: "profileConfig",
				}),
				createChecklistItem({
					candidates: ["profile/cv.md", "cv.md"],
					description: "Profile CV markdown is missing.",
					missingBehavior: "onboarding-required",
					path: "profile/cv.md",
					surfaceKey: "profileCv",
				}),
			],
		},
		health: createMissingOnboardingHealth(),
		message: "Bootstrap is live, but onboarding files are still missing.",
		status: "missing-prerequisites",
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

function createMissingPrerequisitesShellSummary() {
	const base = createReadyShellSummary();

	return {
		...base,
		health: createMissingOnboardingHealth(),
		message: "Bootstrap is live, but onboarding files are still missing.",
		status: "missing-prerequisites",
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

function createOperatorHomeAction(input, focus = {}) {
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

function createReadyOperatorHomeSummary() {
	return {
		cards: {
			approvals: {
				actions: [
					createOperatorHomeAction(
						{
							description: "Open the next approval in the inbox.",
							id: "open-approvals",
							label: "Review Approval",
							surface: "approvals",
						},
						{
							approvalId: "approval-1",
							sessionId: "session-live",
						},
					),
				],
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
				],
				message: "2 approvals need explicit operator review.",
				pendingApprovalCount: 2,
				recentFailureCount: 1,
				state: "attention-required",
			},
			artifacts: {
				actions: [
					createOperatorHomeAction(
						{
							description: "Open the latest checked-in report artifact.",
							id: "open-artifacts",
							label: "Open Artifacts",
							surface: "artifacts",
						},
						{
							reportPath: "reports/002-beta-solutions-architect-2026-04-22.md",
						},
					),
				],
				items: [
					{
						artifactDate: "2026-04-22T00:00:00.000Z",
						fileName: "002-beta-solutions-architect-2026-04-22.md",
						kind: "report",
						repoRelativePath:
							"reports/002-beta-solutions-architect-2026-04-22.md",
						reportNumber: "002",
					},
				],
				message: "Recent checked-in reports and PDFs are ready to review.",
				state: "ready",
				totalCount: 3,
			},
			closeout: {
				actions: [
					createOperatorHomeAction(
						{
							description: "Review the next queue item that needs closeout.",
							id: "open-pipeline",
							label: "Open Pipeline",
							surface: "pipeline",
						},
						{
							reportNumber: "020",
							section: "processed",
						},
					),
					createOperatorHomeAction(
						{
							description:
								"Open the tracker row or staged addition tied to closeout.",
							id: "open-tracker",
							label: "Open Tracker",
							surface: "tracker",
						},
						{
							reportNumber: "020",
						},
					),
				],
				message:
					"Close out the strongest queued items before starting new intake.",
				pipeline: {
					malformedCount: 1,
					pendingCount: 2,
					preview: [
						{
							company: "Acme",
							kind: "pending",
							reportNumber: null,
							role: "Staff Engineer",
							score: null,
							url: "https://example.com/jobs/acme-staff",
							warningCount: 0,
						},
					],
					processedCount: 4,
				},
				state: "attention-required",
				tracker: {
					pendingAdditionCount: 1,
					preview: [
						{
							company: "Future Company",
							entryNumber: 20,
							reportNumber: "020",
							role: "Forward Deployed Engineer",
							status: "needs-review",
						},
					],
					rowCount: 12,
				},
			},
			liveWork: {
				actions: [
					createOperatorHomeAction(
						{
							description: "Resume the active workflow in the chat console.",
							id: "open-chat",
							label: "Open Chat",
							surface: "chat",
						},
						{
							sessionId: "session-live",
						},
					),
				],
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
				message: "1 live workflow is active and 2 approvals are waiting.",
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
			maintenance: {
				actions: [
					createOperatorHomeAction({
						description:
							"Open the settings surface for explicit maintenance guidance.",
						id: "open-settings",
						label: "Open Settings",
						surface: "settings",
					}),
				],
				authState: "ready",
				commands: [
					{
						category: "diagnostics",
						command: "npm run doctor",
						description: "Validate repo prerequisites.",
						id: "doctor",
						label: "Run doctor",
					},
					{
						category: "updates",
						command: "node scripts/update-system.mjs check",
						description: "Check for repo-managed updates.",
						id: "update-check",
						label: "Check updates",
					},
				],
				message:
					"App-first runtime status is visible here, while update and auth changes stay explicit in the terminal.",
				operationalStoreStatus: "ready",
				state: "ready",
				updateCheck: {
					changelogExcerpt: "New settings surface shipped.",
					checkedAt: "2026-04-22T00:00:00.000Z",
					command: "node scripts/update-system.mjs check",
					localVersion: "1.5.38",
					message: "Job-Hunt update available (1.5.38 -> 1.6.0).",
					remoteVersion: "1.6.0",
					state: "update-available",
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
			sessionId: STARTUP_SESSION_ID,
			startupStatus: "ready",
			status: "ok",
		},
		message: "Bootstrap diagnostics are ready.",
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
	};
}

function createOnboardingSummary() {
	const requiredItems = [
		createChecklistItem({
			candidates: ["config/profile.yml"],
			description: "Profile configuration is missing.",
			missingBehavior: "onboarding-required",
			path: "config/profile.yml",
			surfaceKey: "profileConfig",
		}),
		createChecklistItem({
			candidates: ["profile/cv.md", "cv.md"],
			description: "Profile CV markdown is missing.",
			missingBehavior: "onboarding-required",
			path: "profile/cv.md",
			surfaceKey: "profileCv",
		}),
	];
	const repairItems = [
		createRepairPreviewItem({
			description: "Create the starter profile configuration.",
			path: "config/profile.yml",
			surfaceKey: "profileConfig",
			templatePath: "config/profile.example.yml",
			templateSurfaceKey: "profileConfigTemplate",
		}),
		createRepairPreviewItem({
			description: "Create the starter CV markdown file.",
			path: "profile/cv.md",
			surfaceKey: "profileCv",
			templatePath: "profile/cv.example.md",
			templateSurfaceKey: "profileCvTemplate",
		}),
	];

	return {
		checklist: {
			optional: [],
			required: requiredItems,
			runtime: [],
		},
		currentSession: {
			id: "phase03-session03-startup-checklist-and-onboarding-wizard",
			monorepo: true,
			packagePath: "apps/web",
			phase: 3,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		health: createMissingOnboardingHealth(),
		message:
			"2 onboarding prerequisite(s) are missing. 2 can be repaired from checked-in templates before returning to the operator home.",
		ok: true,
		repairPreview: {
			items: repairItems,
			readyTargets: repairItems.map((item) => item.destination.surfaceKey),
			repairableCount: repairItems.length,
			targetCount: repairItems.length,
			targets: repairItems.map((item) => item.destination.surfaceKey),
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "missing-prerequisites",
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

function createApplicationHelpPayload(requestUrl = "/application-help") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedSessionId = url.searchParams.get("sessionId")?.trim() || null;
	const sessions = {
		"app-help-completed-shell": {
			approval: null,
			draftPacket: {
				company: "Cohere",
				createdAt: "2026-04-22T00:10:00.000Z",
				fingerprint: "fingerprint-app-help-completed-shell",
				itemCount: 1,
				items: [
					{
						answer:
							"I build operator-facing AI workflows and durable review paths.",
						question: "Why this role?",
					},
				],
				matchedContext: null,
				packetId: "packet-app-help-completed-shell",
				repoRelativePath:
					".jobhunt-app/application-help/app-help-completed-shell/packet.json",
				reviewNotes: "Completed application-help review.",
				reviewRequired: true,
				revision: 1,
				role: "Applied AI Engineer - Agentic Workflows",
				sessionId: "app-help-completed-shell",
				updatedAt: "2026-04-22T00:12:00.000Z",
				warnings: [],
			},
			failure: null,
			job: {
				attempt: 1,
				completedAt: "2026-04-22T00:12:00.000Z",
				currentRunId: "run-app-help-completed-shell",
				jobId: "job-app-help-completed-shell",
				jobType: "application-help",
				startedAt: "2026-04-22T00:08:00.000Z",
				status: "completed",
				updatedAt: "2026-04-22T00:12:00.000Z",
				waitReason: null,
			},
			message:
				"The application-help run completed and the draft is ready for manual review.",
			nextReview: {
				action: "review-draft",
				message:
					"Review the completed draft packet, personalize the answers, and keep submission manual.",
				resumeAllowed: false,
				sessionId: "app-help-completed-shell",
			},
			reportContext: {
				company: "Cohere",
				coverLetter: {
					message:
						"No cover-letter field was detected on the application page.",
					state: "manual-follow-up",
				},
				existingDraft: {
					itemCount: 1,
					items: [
						{
							answer:
								"I build operator-facing AI workflows and durable review paths.",
							question: "Why this role?",
						},
					],
					sectionPresent: true,
					sectionText:
						"I build operator-facing AI workflows and durable review paths.",
				},
				fileName:
					"019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
				legitimacy: "High Confidence",
				matchReasons: [
					"Matched the selected report artifact from the saved evaluation set.",
				],
				matchState: "exact",
				pdf: {
					exists: true,
					repoRelativePath:
						"output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf",
				},
				reportNumber: "019",
				reportRepoRelativePath:
					"reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
				role: "Applied AI Engineer - Agentic Workflows",
				score: 4.4,
				title: "Evaluation: Cohere -- Applied AI Engineer - Agentic Workflows",
				url: "https://example.com/jobs/cohere-agentic",
			},
			reviewBoundary: {
				message:
					"Review is required and submission stays manual outside the browser workspace.",
				reviewRequired: true,
				submissionAllowed: false,
			},
			session: {
				activeJobId: "job-app-help-completed-shell",
				lastHeartbeatAt: "2026-04-22T00:12:00.000Z",
				resumeAllowed: false,
				sessionId: "app-help-completed-shell",
				status: "completed",
				updatedAt: "2026-04-22T00:12:00.000Z",
				workflow: "application-help",
			},
			state: "completed",
			warnings: [],
		},
		"app-help-paused-shell": {
			approval: {
				action: "review-application-help-draft",
				approvalId: "approval-app-help-shell-01",
				jobId: "job-app-help-paused-shell",
				requestedAt: "2026-04-22T00:11:00.000Z",
				resolvedAt: null,
				status: "pending",
				title: "Review application-help draft",
				traceId: "trace-app-help-shell-01",
			},
			draftPacket: {
				company: "Cohere",
				createdAt: "2026-04-22T00:10:00.000Z",
				fingerprint: "fingerprint-app-help-paused-shell",
				itemCount: 1,
				items: [
					{
						answer:
							"I build operator-facing AI workflows and durable review paths.",
						question: "Why this role?",
					},
				],
				matchedContext: null,
				packetId: "packet-app-help-paused-shell",
				repoRelativePath:
					".jobhunt-app/application-help/app-help-paused-shell/packet.json",
				reviewNotes: "Waiting on approval.",
				reviewRequired: true,
				revision: 1,
				role: "Applied AI Engineer - Agentic Workflows",
				sessionId: "app-help-paused-shell",
				updatedAt: "2026-04-22T00:11:00.000Z",
				warnings: [],
			},
			failure: null,
			job: {
				attempt: 1,
				completedAt: null,
				currentRunId: "run-app-help-paused-shell",
				jobId: "job-app-help-paused-shell",
				jobType: "application-help",
				startedAt: "2026-04-22T00:09:00.000Z",
				status: "waiting",
				updatedAt: "2026-04-22T00:11:00.000Z",
				waitReason: "approval",
			},
			message:
				"This application-help session is waiting on human approval before it can continue.",
			nextReview: {
				action: "resolve-approval",
				message:
					"Resolve the pending approval, then resume the application-help run with the current draft packet.",
				resumeAllowed: true,
				sessionId: "app-help-paused-shell",
			},
			reportContext: null,
			reviewBoundary: {
				message:
					"Review is required and submission stays manual outside the browser workspace.",
				reviewRequired: true,
				submissionAllowed: false,
			},
			session: {
				activeJobId: "job-app-help-paused-shell",
				lastHeartbeatAt: "2026-04-22T00:11:00.000Z",
				resumeAllowed: true,
				sessionId: "app-help-paused-shell",
				status: "waiting",
				updatedAt: "2026-04-22T00:11:00.000Z",
				workflow: "application-help",
			},
			state: "approval-paused",
			warnings: [
				{
					code: "approval-paused",
					message:
						"This application-help session is waiting on human approval before it can continue.",
				},
			],
		},
	};
	sessions["app-help-paused-shell"].reportContext =
		sessions["app-help-completed-shell"].reportContext;

	const selectedSessionId = requestedSessionId || "app-help-completed-shell";
	const selectedSummary = sessions[selectedSessionId] ?? null;

	return {
		filters: {
			sessionId: requestedSessionId,
		},
		generatedAt: "2026-04-22T00:12:00.000Z",
		message: selectedSummary
			? requestedSessionId
				? `Loaded application-help session ${selectedSessionId}.`
				: `Loaded the latest application-help session ${selectedSessionId}.`
			: `Application-help session ${selectedSessionId} was not found.`,
		ok: true,
		selected: selectedSummary
			? {
					message: requestedSessionId
						? `Loaded application-help session ${selectedSessionId}.`
						: `Loaded the latest application-help session ${selectedSessionId}.`,
					origin: requestedSessionId ? "session-id" : "latest",
					requestedSessionId,
					state: "ready",
					summary: selectedSummary,
				}
			: {
					message: `Application-help session ${selectedSessionId} was not found.`,
					origin: "session-id",
					requestedSessionId,
					state: "missing",
					summary: null,
				},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
	};
}

function createSpecialistWorkspacePayload(
	requestUrl = "/specialist-workspace",
) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedMode = url.searchParams.get("mode")?.trim() || null;
	const requestedSessionId = url.searchParams.get("sessionId")?.trim() || null;
	const applicationHelpSummary = {
		approval: null,
		failure: null,
		handoff: {
			detailSurface: {
				label: "Application Help",
				path: "/application-help",
			},
			family: "research-and-narrative",
			label: "Application Help",
			mode: "application-help",
			modeDescription:
				"Review staged application-help context and route into the dedicated draft surface.",
			modeRepoRelativePath: "modes/apply.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			toolPreview: {
				fallbackApplied: false,
				hiddenToolCount: 0,
				items: [
					{
						access: "allowed",
						name: "resolve-application-help-context",
					},
					{
						access: "allowed",
						name: "stage-application-help-draft",
					},
				],
			},
			workspacePath: "/workflows/application-help",
		},
		job: {
			attempt: 1,
			completedAt: "2026-04-22T00:12:00.000Z",
			currentRunId: "run-app-help-completed-shell",
			jobId: "job-app-help-completed-shell",
			jobType: "application-help",
			startedAt: "2026-04-22T00:10:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T00:12:00.000Z",
			waitReason: null,
		},
		message:
			"Application-help context is ready and the dedicated review surface owns the next detail step.",
		nextAction: {
			action: "open-detail-surface",
			message:
				"Open the application-help detail surface to review the staged draft packet.",
			mode: "application-help",
			sessionId: "app-help-completed-shell",
		},
		result: {
			detailSurface: {
				label: "Application Help",
				path: "/application-help",
			},
			message:
				"Application Help has a dedicated detail surface for draft review and approvals.",
			state: "dedicated-detail",
		},
		run: {
			message: "Application Help is ready for dedicated review.",
			resumeAllowed: false,
			state: "completed",
		},
		session: {
			activeJobId: "job-app-help-completed-shell",
			lastHeartbeatAt: "2026-04-22T00:12:00.000Z",
			resumeAllowed: false,
			sessionId: "app-help-completed-shell",
			status: "completed",
			updatedAt: "2026-04-22T00:12:00.000Z",
			workflow: "application-help",
		},
		supportState: "ready",
		summaryAvailability: "dedicated-detail",
		warnings: [
			{
				code: "dedicated-detail-surface",
				message:
					"Application Help already has a dedicated review surface for the next step.",
			},
		],
	};
	const compareOffersSummary = {
		approval: null,
		failure: null,
		handoff: {
			detailSurface: {
				label: "Compare Offers",
				path: "/tracker-specialist",
			},
			family: "application-history",
			label: "Compare Offers",
			mode: "compare-offers",
			modeDescription:
				"Compare saved offers and role references in one bounded summary.",
			modeRepoRelativePath: "modes/ofertas.md",
			specialistId: "tracker-specialist",
			specialistLabel: "Tracker Specialist",
			toolPreview: {
				fallbackApplied: false,
				hiddenToolCount: 0,
				items: [
					{
						access: "allowed",
						name: "resolve-compare-offers-context",
					},
					{
						access: "allowed",
						name: "load-tracker-specialist-packet",
					},
				],
			},
			workspacePath: "/workflows/compare-offers",
		},
		job: {
			attempt: 1,
			completedAt: "2026-04-22T00:13:00.000Z",
			currentRunId: "run-compare-review-shell",
			jobId: "job-compare-review-shell",
			jobType: "compare-offers",
			startedAt: "2026-04-22T00:11:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T00:13:00.000Z",
			waitReason: null,
		},
		message: "Compare-offers review is ready in the workflows surface.",
		nextAction: {
			action: "wait",
			message:
				"Review the typed comparison packet in the workflows surface and use explicit tracker or report handoffs as needed.",
			mode: "compare-offers",
			sessionId: "compare-review-shell",
		},
		result: {
			detailSurface: {
				label: "Compare Offers",
				path: "/tracker-specialist",
			},
			message: "Compare Offers review is available in the workflows surface.",
			state: "dedicated-detail",
		},
		run: {
			message: "Compare offers is ready for review.",
			resumeAllowed: false,
			state: "completed",
		},
		session: {
			activeJobId: "job-compare-review-shell",
			lastHeartbeatAt: "2026-04-22T00:13:00.000Z",
			resumeAllowed: false,
			sessionId: "compare-review-shell",
			status: "completed",
			updatedAt: "2026-04-22T00:13:00.000Z",
			workflow: "compare-offers",
		},
		supportState: "ready",
		summaryAvailability: "dedicated-detail",
		warnings: [
			{
				code: "dedicated-detail-surface",
				message:
					"Compare Offers review is now rendered inside the workflows surface.",
			},
		],
	};
	const selectedSummary =
		requestedMode === "compare-offers" ||
		requestedSessionId === "compare-review-shell"
			? compareOffersSummary
			: applicationHelpSummary;

	return {
		filters: {
			mode: requestedMode,
			sessionId: requestedSessionId,
		},
		generatedAt: "2026-04-22T00:12:00.000Z",
		message: requestedSessionId
			? `Loaded specialist session ${requestedSessionId}.`
			: selectedSummary.handoff.mode === "compare-offers"
				? "Loaded the latest compare-offers specialist session compare-review-shell."
				: "Loaded the latest application-help specialist session app-help-completed-shell.",
		ok: true,
		selected: {
			message: requestedSessionId
				? `Loaded specialist session ${requestedSessionId}.`
				: selectedSummary.handoff.mode === "compare-offers"
					? "Loaded the latest compare-offers specialist session compare-review-shell."
					: "Loaded the latest application-help specialist session app-help-completed-shell.",
			origin: requestedSessionId
				? "session-id"
				: requestedMode
					? "mode"
					: "latest-session",
			requestedMode,
			requestedSessionId,
			state: "ready",
			summary: selectedSummary,
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
		workflows: [
			{
				handoff: applicationHelpSummary.handoff,
				intake: {
					kind: "report-context",
					message:
						"Application help launches from saved report context, application questions, or staged draft hints.",
					requiresSavedState: true,
				},
				message:
					"Application help can launch with the research specialist using report-backed context lookup and draft staging while keeping submission manual.",
				missingCapabilities: [],
				selected: selectedSummary.handoff.mode === "application-help",
				summaryAvailability: "dedicated-detail",
				supportState: "ready",
			},
			{
				handoff: compareOffersSummary.handoff,
				intake: {
					kind: "offer-set",
					message:
						"Compare-offers expects two or more offer descriptions, saved evaluations, or role references.",
					requiresSavedState: false,
				},
				message:
					"Compare offers can launch with the tracker specialist using typed offer matching and inline planning review.",
				missingCapabilities: [],
				selected: selectedSummary.handoff.mode === "compare-offers",
				summaryAvailability: "dedicated-detail",
				supportState: "ready",
			},
		],
	};
}

function _createTrackerSpecialistPayload(requestUrl = "/tracker-specialist") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedMode = url.searchParams.get("mode")?.trim() || null;
	const requestedSessionId = url.searchParams.get("sessionId")?.trim() || null;

	return {
		filters: {
			mode: requestedMode,
			sessionId: requestedSessionId,
		},
		generatedAt: "2026-04-22T00:13:00.000Z",
		message: "Loaded tracker-specialist compare-offers review.",
		ok: true,
		selected: {
			message: "Loaded tracker-specialist compare-offers review.",
			origin: requestedSessionId ? "session-id" : "mode",
			requestedMode,
			requestedSessionId,
			state: "ready",
			summary: {
				approval: null,
				failure: null,
				job: {
					attempt: 1,
					completedAt: "2026-04-22T00:13:00.000Z",
					currentRunId: "run-compare-review-shell",
					jobId: "job-compare-review-shell",
					jobType: "compare-offers",
					startedAt: "2026-04-22T00:11:00.000Z",
					status: "completed",
					updatedAt: "2026-04-22T00:13:00.000Z",
					waitReason: null,
				},
				message: "The compare-offers packet is ready for planning review.",
				nextAction: {
					action: "review-result",
					message:
						"Review the bounded comparison packet, then use explicit tracker or report handoffs if you want to inspect linked artifacts.",
					resumeAllowed: false,
					sessionId: "compare-review-shell",
				},
				packet: {
					fingerprint: "compare-review-shell:fingerprint",
					generatedAt: "2026-04-22T00:13:00.000Z",
					message:
						"Compared the top two saved offers with explicit report links.",
					mode: "compare-offers",
					offers: [
						{
							company: "Context Co",
							fileName:
								"019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
							label: "Context Co offer",
							legitimacy: "High Confidence",
							matchReasons: ["Matched report 019 by company and role."],
							matchState: "exact",
							pdf: {
								exists: true,
								repoRelativePath:
									"output/cv-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.pdf",
							},
							reportNumber: "019",
							reportRepoRelativePath:
								"reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
							role: "Applied AI Engineer - Agentic Workflows",
							score: 4.4,
							title:
								"Evaluation: Cohere -- Applied AI Engineer - Agentic Workflows",
							trackerEntryNumber: 19,
							url: "https://example.com/jobs/cohere-agentic",
						},
					],
					references: [
						{
							company: "Context Co",
							entryNumber: 19,
							label: "Context Co offer",
							reportNumber: "019",
							reportPath:
								"reports/019-cohere-applied-ai-engineer-agentic-workflows-2026-04-22.md",
							role: "Applied AI Engineer - Agentic Workflows",
						},
					],
					resultStatus: "ready",
					revision: 2,
					sessionId: "compare-review-shell",
					unmatchedReferences: [],
					updatedAt: "2026-04-22T00:13:00.000Z",
					warnings: [],
				},
				run: {
					message: "Compare-offers review is ready.",
					resumeAllowed: false,
					state: "completed",
				},
				session: {
					activeJobId: "job-compare-review-shell",
					lastHeartbeatAt: "2026-04-22T00:13:00.000Z",
					resumeAllowed: false,
					sessionId: "compare-review-shell",
					status: "completed",
					updatedAt: "2026-04-22T00:13:00.000Z",
					workflow: "compare-offers",
				},
				state: "completed",
				warnings: [],
				workflow: {
					detailPath: "/tracker-specialist",
					label: "Compare Offers",
					message:
						"Compare offers can launch with the tracker specialist using typed offer matching and inline planning review.",
					mode: "compare-offers",
					selected: true,
				},
			},
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
		workflows: [
			{
				detailPath: "/tracker-specialist",
				label: "Compare Offers",
				message:
					"Compare offers can launch with the tracker specialist using typed offer matching and inline planning review.",
				mode: "compare-offers",
				selected: true,
			},
		],
	};
}

function createApprovalInboxPayload(requestUrl = "/approval-inbox") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const approvalId = url.searchParams.get("approvalId")?.trim() || null;
	const sessionId = url.searchParams.get("sessionId")?.trim() || null;
	const useApplicationHelpSelection =
		approvalId === "approval-app-help-shell-01" ||
		sessionId === "app-help-paused-shell";
	const selectedApproval = useApplicationHelpSelection
		? {
				action: "review-application-help-draft",
				approvalId: "approval-app-help-shell-01",
				details: {
					sessionId: "app-help-paused-shell",
					workflow: "application-help",
				},
				jobId: "job-app-help-paused-shell",
				requestedAt: "2026-04-22T00:11:00.000Z",
				resolvedAt: null,
				response: null,
				sessionId: "app-help-paused-shell",
				status: "pending",
				title: "Review application-help draft",
				traceId: "trace-app-help-shell-01",
			}
		: {
				action: "review-batch-closeout",
				approvalId: "approval-batch-shell-01",
				details: null,
				jobId: "job-batch-shell-01",
				requestedAt: "2026-04-22T00:08:00.000Z",
				resolvedAt: null,
				response: null,
				sessionId: "session-batch-shell-01",
				status: "pending",
				title: "Review batch follow-up",
				traceId: "trace-batch-shell-01",
			};
	const selectedSession = useApplicationHelpSelection
		? {
				activeJobId: "job-app-help-paused-shell",
				lastHeartbeatAt: "2026-04-22T00:11:00.000Z",
				pendingApprovalCount: 1,
				sessionId: "app-help-paused-shell",
				status: "waiting",
				updatedAt: "2026-04-22T00:11:00.000Z",
				workflow: "application-help",
			}
		: {
				activeJobId: "job-batch-shell-01",
				lastHeartbeatAt: "2026-04-22T00:08:00.000Z",
				pendingApprovalCount: 1,
				sessionId: "session-batch-shell-01",
				status: "waiting",
				updatedAt: "2026-04-22T00:08:00.000Z",
				workflow: "batch-evaluation",
			};
	const interruptedRun = useApplicationHelpSelection
		? {
				message:
					"Resolve the pending approval before attempting a resume handoff.",
				resumeAllowed: false,
				sessionId: "app-help-paused-shell",
				state: "waiting-for-approval",
			}
		: {
				message:
					"This session can be handed back to the shared orchestration resume path.",
				resumeAllowed: true,
				sessionId: "session-batch-shell-01",
				state: "resume-ready",
			};

	return {
		filters: {
			approvalId,
			limit: 8,
			sessionId,
		},
		generatedAt: "2026-04-22T00:12:00.000Z",
		message: "Approval inbox summary is ready.",
		ok: true,
		pendingApprovalCount: 2,
		queue: [
			{
				action: "review-batch-closeout",
				approvalId: "approval-batch-shell-01",
				jobId: "job-batch-shell-01",
				requestedAt: "2026-04-22T00:08:00.000Z",
				sessionId: "session-batch-shell-01",
				sessionStatus: "waiting",
				title: "Review batch follow-up",
				traceId: "trace-batch-shell-01",
				workflow: "batch-evaluation",
			},
			{
				action: "review-application-help-draft",
				approvalId: "approval-app-help-shell-01",
				jobId: "job-app-help-paused-shell",
				requestedAt: "2026-04-22T00:11:00.000Z",
				sessionId: "app-help-paused-shell",
				sessionStatus: "waiting",
				title: "Review application-help draft",
				traceId: "trace-app-help-shell-01",
				workflow: "application-help",
			},
		],
		selected: {
			approval: selectedApproval,
			failure: null,
			interruptedRun,
			job: {
				attempt: 1,
				completedAt: null,
				currentRunId: useApplicationHelpSelection
					? "run-app-help-paused-shell"
					: "run-batch-shell-01",
				jobId: selectedApproval.jobId,
				jobType: useApplicationHelpSelection
					? "application-help"
					: "batch-evaluation",
				startedAt: "2026-04-22T00:08:00.000Z",
				status: "waiting",
				updatedAt: "2026-04-22T00:12:00.000Z",
				waitReason: "approval",
			},
			route: {
				message: "Shared orchestration resume path is available.",
				missingCapabilities: [],
				specialistId: useApplicationHelpSelection
					? "research-specialist"
					: "batch-specialist",
				status: "ready",
			},
			selectionMessage: `${selectedApproval.title} is ready for review.`,
			selectionState: "active",
			session: selectedSession,
			timeline: [],
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
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
		startupMode: "ready",
	};
	const readyStartupPayload = createReadyStartupPayload();
	const missingStartupPayload = createMissingPrerequisitesStartupPayload();
	const readyShellSummary = createReadyShellSummary();
	const missingShellSummary = createMissingPrerequisitesShellSummary();
	const runtimeErrorSummary = createRuntimeErrorShellSummary();
	const operatorHomeSummary = createReadyOperatorHomeSummary();
	const onboardingSummary = createOnboardingSummary();

	const server = createHttpServer(async (request, response) => {
		if (request.url === "/startup") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					state.startupMode === "missing-prerequisites"
						? missingStartupPayload
						: readyStartupPayload,
					null,
					2,
				),
			);
			return;
		}

		if (request.url === "/operator-shell") {
			const payload =
				state.shellMode === "runtime-error"
					? runtimeErrorSummary
					: state.shellMode === "missing-prerequisites"
						? missingShellSummary
						: readyShellSummary;
			const statusCode = state.shellMode === "runtime-error" ? 503 : 200;

			response.writeHead(statusCode, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(payload, null, 2));
			return;
		}

		if ((request.url ?? "").startsWith("/operator-home")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(operatorHomeSummary, null, 2));
			return;
		}

		if ((request.url ?? "").startsWith("/onboarding")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(onboardingSummary, null, 2));
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

			if (
				(requestedSessionId === "app-help-completed-shell" ||
					requestedSessionId === "app-help-paused-shell") &&
				!state.sessionDetails.has(requestedSessionId)
			) {
				const applicationHelpSessionSummary = createSessionSummary({
					sessionId: requestedSessionId,
					workflow: "application-help",
				});
				const applicationHelpSessionDetail = createSessionDetail(
					applicationHelpSessionSummary,
					"Application-help review opened from the workspace.",
				);
				state.sessionDetails.set(
					applicationHelpSessionSummary.sessionId,
					applicationHelpSessionDetail,
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

		if ((request.url ?? "").startsWith("/application-help")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createApplicationHelpPayload(request.url ?? "/application-help"),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/specialist-workspace")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createSpecialistWorkspacePayload(
						request.url ?? "/specialist-workspace",
					),
					null,
					2,
				),
			);
			return;
		}

		if ((request.url ?? "").startsWith("/approval-inbox")) {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createApprovalInboxPayload(request.url ?? "/approval-inbox"),
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
		setStartupMode(mode) {
			state.startupMode = mode;
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
			.getByRole("heading", { name: "Daily overview" })
			.waitFor({ timeout: 15000 });
		await page.getByRole("link", { name: /Home/ }).first().waitFor();
		await page
			.getByRole("link", { name: /Startup/ })
			.first()
			.waitFor();
		await page.getByRole("link", { name: /Apply/ }).first().waitFor();
		await page
			.getByRole("link", { name: /Approvals/ })
			.first()
			.waitFor();
		await page
			.getByRole("link", { name: /Tracker/ })
			.first()
			.waitFor();
		await page.getByText("Review application email").first().waitFor();
		await page.getByText("Acme - Staff Engineer").waitFor();
		await page.getByRole("button", { name: "Review Approval" }).click();
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();
		assert.match(page.url(), /approvals/);

		fakeApi.setShellMode("missing-prerequisites");
		fakeApi.setStartupMode("missing-prerequisites");
		await page.goto(`${webUrl}/onboarding`, { waitUntil: "networkidle" });
		await page
			.getByRole("heading", { name: "Startup checklist and onboarding wizard" })
			.waitFor();
		await page
			.getByText("config/profile.yml", { exact: true })
			.first()
			.waitFor();
		assert.match(page.url(), /\/onboarding/);

		fakeApi.setShellMode("ready");
		fakeApi.setStartupMode("ready");
		await page.goto(webUrl, { waitUntil: "networkidle" });
		await page.getByRole("heading", { name: "Daily overview" }).waitFor();
		await page.getByRole("button", { name: "Open Pipeline" }).click();
		await page
			.getByRole("heading", { name: "Pipeline review workspace" })
			.waitFor();
		assert.match(page.url(), /pipeline/);

		await page.getByRole("link", { name: /Chat/ }).first().click();
		await page
			.getByRole("heading", { name: "Launch a supported workflow" })
			.waitFor();
		await page
			.getByRole("heading", { name: "No recent sessions yet" })
			.waitFor();
		await page.getByRole("link", { name: /Scan/ }).first().click();
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
		assert.match(page.url(), /\/evaluate/);
		await page.getByRole("link", { name: /Batch/ }).first().click();
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /Select batch item 2/ }).click();
		await page.getByText("Showing batch item #2.").waitFor();
		await page.getByRole("button", { name: /Open report viewer/ }).click();
		await page
			.getByRole("heading", { name: "Artifact review surface" })
			.waitFor();
		await page.getByText("Tracker handoff report body.").waitFor();
		assert.match(page.url(), /\/artifacts/);
		await page.goto(`${webUrl}/batch?batchItemId=2`, {
			waitUntil: "networkidle",
		});
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /Open tracker workspace/ }).click();
		await page
			.getByRole("heading", {
				name: "Tracker workspace and integrity actions",
			})
			.waitFor();
		assert.match(page.url(), /\/tracker/);
		await page.goto(`${webUrl}/batch?batchItemId=2`, {
			waitUntil: "networkidle",
		});
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /^Open chat$/ }).click();
		await page
			.getByRole("heading", { name: "Evaluation console and artifact handoff" })
			.waitFor();
		assert.match(page.url(), /\/evaluate/);
		await page.goto(`${webUrl}/batch?batchItemId=2`, {
			waitUntil: "networkidle",
		});
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /^Open approvals$/ }).click();
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();
		assert.match(page.url(), /\/approvals/);
		await page.goto(
			`${webUrl}/apply?applicationHelpSessionId=app-help-completed-shell`,
			{
				waitUntil: "networkidle",
			},
		);
		await page
			.getByRole("heading", {
				name: "Application-help workspace",
				exact: true,
			})
			.waitFor();
		await page
			.getByText("The application-help run completed and the draft is ready")
			.first()
			.waitFor();
		await page.getByRole("button", { name: /Open report viewer/ }).click();
		await page
			.getByRole("heading", { name: "Artifact review surface" })
			.waitFor();
		assert.match(page.url(), /\/artifacts/);
		await page.goto(
			`${webUrl}/apply?applicationHelpSessionId=app-help-completed-shell`,
			{
				waitUntil: "networkidle",
			},
		);
		await page.getByRole("button", { name: /Open chat/ }).click();
		await page
			.getByRole("heading", { name: "Evaluation console and artifact handoff" })
			.waitFor();
		assert.match(page.url(), /\/evaluate/);
		await page.goto(
			`${webUrl}/apply?applicationHelpSessionId=app-help-paused-shell`,
			{
				waitUntil: "networkidle",
			},
		);
		await page
			.getByRole("heading", {
				name: "Application-help workspace",
				exact: true,
			})
			.waitFor();
		await page.getByRole("button", { name: /Open approvals/ }).click();
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();
		assert.match(page.url(), /\/approvals/);
		await page
			.getByRole("button", {
				name: /Review approval Review application-help draft/,
			})
			.click();
		await page
			.getByRole("button", { name: /Open application-help review/ })
			.click();
		await page
			.getByRole("heading", {
				name: "Application-help workspace",
				exact: true,
			})
			.waitFor();
		assert.match(page.url(), /\/apply/);
		await page
			.getByRole("link", { name: /Workflows/ })
			.first()
			.click();
		await page
			.getByRole("heading", { name: "Specialist workflows workspace" })
			.waitFor();
		await page
			.getByText("Application Help has a dedicated detail surface")
			.first()
			.waitFor();
		await page.goto(
			`${webUrl}/workflows?workflowsMode=application-help&workflowsSessionId=app-help-completed-shell`,
			{
				waitUntil: "networkidle",
			},
		);
		await page
			.getByText("Loaded specialist session app-help-completed-shell.")
			.first()
			.waitFor();
		await page.goto(
			`${webUrl}/workflows?workflowsMode=application-help&workflowsSessionId=app-help-completed-shell`,
			{
				waitUntil: "networkidle",
			},
		);
		await page
			.locator("section")
			.filter({
				has: page.getByRole("heading", { name: "Detail and handoffs" }),
			})
			.getByRole("button", {
				name: /Open the dedicated detail surface for the selected specialist workflow/,
			})
			.click();
		await page
			.getByRole("heading", { name: "Application-help workspace" })
			.waitFor();
		assert.match(page.url(), /\/apply/);
		await page
			.getByRole("link", { name: /Pipeline/ })
			.first()
			.click();
		await page
			.getByRole("heading", { name: "Pipeline review workspace" })
			.waitFor();
		await page.getByText("Current strongest lane: Forward Deployed.").waitFor();
		await page
			.getByRole("link", { name: /Tracker/ })
			.first()
			.click();
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
		assert.match(page.url(), /\/artifacts/);
		await page.goto(`${webUrl}/tracker?trackerReportNumber=020`, {
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
		assert.match(page.url(), /\/artifacts/);
		await page
			.getByRole("link", { name: /Approvals/ })
			.first()
			.click();
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();
		assert.match(page.url(), /\/approvals/);

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

		await page
			.getByRole("link", { name: /Settings/ })
			.first()
			.click();
		await page
			.getByRole("heading", { name: "Settings and maintenance surface" })
			.waitFor();
		await page.getByText("Run doctor", { exact: true }).waitFor();
		assert.match(page.url(), /\/settings/);

		fakeApi.setSettingsUpdateState("up-to-date");
		await page
			.getByRole("button", { name: /Refresh settings summary/ })
			.click();
		await page.getByText("Updater is current").waitFor();

		await page
			.getByRole("link", { name: /Startup/ })
			.first()
			.click();
		await page.getByText("Job-Hunt startup diagnostics").waitFor();
		await page
			.getByRole("link", { name: /Settings/ })
			.first()
			.click();
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

		await page.getByRole("link", { name: /Home/ }).first().click();
		await page.getByRole("heading", { name: "Daily overview" }).waitFor();
		await page.route("**/api/operator-home**", async (route) => {
			await route.abort("failed");
		});
		await page.getByRole("button", { name: /Refresh home/ }).click();
		await page.getByText("Showing the last known snapshot.").waitFor();
	} finally {
		await browser.close();
	}
} finally {
	await stopChild(webChild);
	await fakeApi.close();
}

console.log("App shell smoke checks passed.");

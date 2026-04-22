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
				sourceOrder: ["agents-guide", "workflow-mode"],
				sources: [],
				supportedWorkflows: [
					"application-help",
					"compare-offers",
					"deep-company-research",
					"interview-prep",
				],
				workflowRoutes: [
					{
						description: "Application-help route",
						intent: "application-help",
						modeRepoRelativePath: "modes/apply.md",
					},
					{
						description: "Interview-prep route",
						intent: "interview-prep",
						modeRepoRelativePath: "modes/interview-prep.md",
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
			sessionId: STARTUP_SESSION_ID,
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
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
		userLayerWrites: "disabled",
	};
}

function createReadyShellSummary() {
	return {
		activity: {
			activeSession: {
				activeJob: {
					jobId: "job-interview-waiting-01",
					status: "waiting",
					updatedAt: "2026-04-22T02:00:00.000Z",
					waitReason: "approval",
				},
				activeJobId: "job-interview-waiting-01",
				lastHeartbeatAt: "2026-04-22T02:00:00.000Z",
				pendingApprovalCount: 1,
				sessionId: "interview-waiting-01",
				status: "waiting",
				updatedAt: "2026-04-22T02:00:00.000Z",
				workflow: "interview-prep",
			},
			activeSessionCount: 1,
			latestPendingApprovals: [
				{
					action: "specialist-review",
					approvalId: "approval-interview-workflow-01",
					jobId: "job-interview-waiting-01",
					requestedAt: "2026-04-22T02:00:00.000Z",
					sessionId: "interview-waiting-01",
					title: "Review interview prep scope",
					traceId: "trace-interview-workflow-01",
				},
			],
			pendingApprovalCount: 1,
			recentFailureCount: 0,
			recentFailures: [],
			state: "attention-required",
		},
		currentSession: {
			id: "phase06-session02-specialist-workspace-foundation",
			monorepo: true,
			packagePath: "apps/web",
			phase: 6,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T02:00:00.000Z",
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

function createApplicationHelpSummary(sessionId) {
	return {
		approval: null,
		draftPacket: {
			company: "Context Co",
			createdAt: "2026-04-22T02:05:00.000Z",
			fingerprint: `fingerprint-${sessionId}`,
			itemCount: 2,
			items: [
				{
					answer: "I build production AI systems and operator workflows.",
					question: "Why this role?",
				},
				{
					answer: "I have shipped durable review paths for AI-assisted work.",
					question: "What makes you a strong fit?",
				},
			],
			matchedContext: {
				company: "Context Co",
				coverLetter: {
					message:
						"No cover-letter field was detected on the application page.",
					state: "manual-follow-up",
				},
				existingDraft: {
					itemCount: 1,
					items: [
						{
							answer: "Because it fits my production AI delivery work.",
							question: "Why this role?",
						},
					],
					sectionPresent: true,
					sectionText: "Because it fits my production AI delivery work.",
				},
				fileName: "021-context-co-2026-04-22.md",
				legitimacy: "High Confidence",
				matchReasons: [
					"Matched report number 021 from saved evaluation artifacts.",
					"Company and role match the saved application-help context.",
				],
				matchState: "exact",
				pdf: {
					exists: true,
					repoRelativePath: "output/cv-context-co-2026-04-22.pdf",
				},
				reportNumber: "021",
				reportRepoRelativePath: "reports/021-context-co-2026-04-22.md",
				role: "Applied AI Engineer",
				score: 4.4,
				title: "Evaluation: Context Co -- Applied AI Engineer",
				url: "https://example.com/jobs/context-co",
			},
			packetId: `packet-${sessionId}`,
			repoRelativePath: `.jobhunt-app/application-help/${sessionId}/packet.json`,
			reviewNotes: "Completed application-help review.",
			reviewRequired: true,
			revision: 2,
			role: "Applied AI Engineer",
			sessionId,
			updatedAt: "2026-04-22T02:07:00.000Z",
			warnings: [],
		},
		failure: null,
		job: {
			attempt: 1,
			completedAt: "2026-04-22T02:08:00.000Z",
			currentRunId: `run-${sessionId}`,
			jobId: `job-${sessionId}`,
			jobType: "application-help",
			startedAt: "2026-04-22T02:05:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T02:08:00.000Z",
			waitReason: null,
		},
		message:
			"The application-help run completed and the draft is ready for manual review.",
		nextReview: {
			action: "review-draft",
			message:
				"Review the completed draft packet, personalize the answers, and keep submission manual.",
			resumeAllowed: false,
			sessionId,
		},
		reportContext: {
			company: "Context Co",
			coverLetter: {
				message: "No cover-letter field was detected on the application page.",
				state: "manual-follow-up",
			},
			existingDraft: {
				itemCount: 1,
				items: [
					{
						answer: "Because it fits my production AI delivery work.",
						question: "Why this role?",
					},
				],
				sectionPresent: true,
				sectionText: "Because it fits my production AI delivery work.",
			},
			fileName: "021-context-co-2026-04-22.md",
			legitimacy: "High Confidence",
			matchReasons: [
				"Matched report number 021 from saved evaluation artifacts.",
			],
			matchState: "exact",
			pdf: {
				exists: true,
				repoRelativePath: "output/cv-context-co-2026-04-22.pdf",
			},
			reportNumber: "021",
			reportRepoRelativePath: "reports/021-context-co-2026-04-22.md",
			role: "Applied AI Engineer",
			score: 4.4,
			title: "Evaluation: Context Co -- Applied AI Engineer",
			url: "https://example.com/jobs/context-co",
		},
		reviewBoundary: {
			message:
				"Review is required and submission stays manual outside the browser workspace.",
			reviewRequired: true,
			submissionAllowed: false,
		},
		session: {
			activeJobId: `job-${sessionId}`,
			lastHeartbeatAt: "2026-04-22T02:08:00.000Z",
			resumeAllowed: false,
			sessionId,
			status: "completed",
			updatedAt: "2026-04-22T02:08:00.000Z",
			workflow: "application-help",
		},
		state: "completed",
		warnings: [],
	};
}

function createApplicationHelpPayload(requestUrl = "/application-help") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedSessionId = url.searchParams.get("sessionId")?.trim() || null;
	const selectedSessionId = requestedSessionId || "app-help-detail-01";
	const selectionMessage = requestedSessionId
		? `Loaded application-help session ${selectedSessionId}.`
		: `Loaded the latest application-help session ${selectedSessionId}.`;

	return {
		filters: {
			sessionId: requestedSessionId,
		},
		generatedAt: "2026-04-22T02:08:00.000Z",
		message: selectionMessage,
		ok: true,
		selected: {
			message: selectionMessage,
			origin: requestedSessionId ? "session-id" : "latest",
			requestedSessionId,
			state: "ready",
			summary: createApplicationHelpSummary(selectedSessionId),
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
	};
}

function createApprovalInboxPayload(requestUrl = "/approval-inbox") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const approvalId = url.searchParams.get("approval")?.trim() || null;
	const sessionId = url.searchParams.get("reviewSession")?.trim() || null;

	return {
		filters: {
			approvalId,
			limit: 8,
			sessionId,
		},
		generatedAt: "2026-04-22T02:10:00.000Z",
		message: "Approval inbox summary is ready.",
		ok: true,
		pendingApprovalCount: 1,
		queue: [
			{
				action: "specialist-review",
				approvalId: "approval-interview-workflow-01",
				jobId: "job-interview-waiting-01",
				requestedAt: "2026-04-22T02:00:00.000Z",
				sessionId: "interview-waiting-01",
				sessionStatus: "waiting",
				title: "Review interview prep scope",
				traceId: "trace-interview-workflow-01",
				workflow: "interview-prep",
			},
		],
		selected: {
			approval: {
				action: "specialist-review",
				approvalId: "approval-interview-workflow-01",
				details: {
					sessionId: "interview-waiting-01",
					workflow: "interview-prep",
				},
				jobId: "job-interview-waiting-01",
				requestedAt: "2026-04-22T02:00:00.000Z",
				resolvedAt: null,
				response: null,
				sessionId: "interview-waiting-01",
				status: "pending",
				title: "Review interview prep scope",
				traceId: "trace-interview-workflow-01",
			},
			failure: null,
			interruptedRun: {
				message:
					"Resolve the pending approval before attempting a resume handoff.",
				resumeAllowed: false,
				sessionId: "interview-waiting-01",
				state: "waiting-for-approval",
			},
			job: {
				attempt: 1,
				completedAt: null,
				currentRunId: "run-interview-waiting-01",
				jobId: "job-interview-waiting-01",
				jobType: "interview-prep",
				startedAt: "2026-04-22T02:00:00.000Z",
				status: "waiting",
				updatedAt: "2026-04-22T02:10:00.000Z",
				waitReason: "approval",
			},
			route: {
				message: "Shared orchestration resume path is available.",
				missingCapabilities: [],
				specialistId: "research-specialist",
				status: "ready",
			},
			selectionMessage: "Review interview prep scope is ready for review.",
			selectionState: "active",
			session: {
				activeJobId: "job-interview-waiting-01",
				lastHeartbeatAt: "2026-04-22T02:00:00.000Z",
				pendingApprovalCount: 1,
				sessionId: "interview-waiting-01",
				status: "waiting",
				updatedAt: "2026-04-22T02:00:00.000Z",
				workflow: "interview-prep",
			},
			timeline: [],
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
	};
}

function createWorkflowDescriptor(input) {
	return {
		handoff: {
			detailSurface: input.detailSurface ?? null,
			family: input.family,
			label: input.label,
			mode: input.mode,
			modeDescription: input.modeDescription,
			modeRepoRelativePath: input.modeRepoRelativePath,
			specialistId: input.specialistId,
			specialistLabel: input.specialistLabel,
			toolPreview: {
				fallbackApplied: input.supportState !== "ready",
				hiddenToolCount: input.hiddenToolCount ?? 0,
				items: input.toolItems ?? [],
			},
			workspacePath: `/workflows/${input.mode}`,
		},
		intake: input.intake,
		message: input.message,
		missingCapabilities: input.missingCapabilities ?? [],
		selected: false,
		summaryAvailability: input.summaryAvailability,
		supportState: input.supportState,
	};
}

function createInterviewWaitingSummary() {
	return {
		approval: {
			action: "specialist-review",
			approvalId: "approval-interview-workflow-01",
			jobId: "job-interview-waiting-01",
			requestedAt: "2026-04-22T02:00:00.000Z",
			resolvedAt: null,
			status: "pending",
			title: "Review interview prep scope",
			traceId: "trace-interview-workflow-01",
		},
		failure: null,
		handoff: createWorkflowDescriptor({
			detailSurface: {
				label: "Interview Prep",
				path: "/research-specialist",
			},
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"Interview prep expects a company and role target, with saved report context when available.",
				requiresSavedState: false,
			},
			label: "Interview Prep",
			message:
				"Interview prep can launch with the research specialist using typed context resolution, story-bank awareness, packet staging, and dedicated-detail review.",
			mode: "interview-prep",
			modeDescription:
				"Prepare a bounded interview brief with saved company and role context.",
			modeRepoRelativePath: "modes/interview-prep.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-research-specialist-context" },
				{ access: "allowed", name: "stage-research-specialist-packet" },
				{ access: "allowed", name: "load-research-specialist-packet" },
				{ access: "allowed", name: "list-workspace-artifacts" },
			],
		}).handoff,
		job: {
			attempt: 1,
			completedAt: null,
			currentRunId: "run-interview-waiting-01",
			jobId: "job-interview-waiting-01",
			jobType: "interview-prep",
			startedAt: "2026-04-22T01:58:00.000Z",
			status: "waiting",
			updatedAt: "2026-04-22T02:00:00.000Z",
			waitReason: "approval",
		},
		message: "Interview prep is waiting on approval review.",
		nextAction: {
			action: "resolve-approval",
			message:
				"Resolve the pending approval, then re-enter the interview-prep session.",
			mode: "interview-prep",
			sessionId: "interview-waiting-01",
		},
		result: {
			detailSurface: {
				label: "Interview Prep",
				path: "/research-specialist",
			},
			message: "Open Interview Prep for detailed specialist review.",
			state: "dedicated-detail",
		},
		run: {
			message: "Interview prep is paused for approval.",
			resumeAllowed: true,
			state: "waiting",
		},
		session: {
			activeJobId: "job-interview-waiting-01",
			lastHeartbeatAt: "2026-04-22T02:00:00.000Z",
			resumeAllowed: true,
			sessionId: "interview-waiting-01",
			status: "waiting",
			updatedAt: "2026-04-22T02:00:00.000Z",
			workflow: "interview-prep",
		},
		supportState: "ready",
		summaryAvailability: "dedicated-detail",
		warnings: [
			{
				code: "approval-paused",
				message:
					"Interview prep is waiting on human approval before it can continue.",
			},
			{
				code: "dedicated-detail-surface",
				message:
					"Interview Prep uses Interview Prep as its dedicated detail surface.",
			},
		],
	};
}

function createDeepRunningSummary() {
	return {
		approval: null,
		failure: null,
		handoff: createWorkflowDescriptor({
			detailSurface: {
				label: "Deep Research",
				path: "/research-specialist",
			},
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"Deep research expects a company and role target, with saved evaluation context when available.",
				requiresSavedState: false,
			},
			label: "Deep Research",
			message:
				"Deep company research can launch with the research specialist using typed context resolution, packet staging, and dedicated-detail review state.",
			mode: "deep-company-research",
			modeDescription:
				"Build a bounded company research brief from saved role context.",
			modeRepoRelativePath: "modes/deep.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-research-specialist-context" },
				{ access: "allowed", name: "stage-research-specialist-packet" },
				{ access: "allowed", name: "load-research-specialist-packet" },
				{ access: "allowed", name: "list-workspace-artifacts" },
			],
		}).handoff,
		job: {
			attempt: 1,
			completedAt: null,
			currentRunId: "run-deep-running-01",
			jobId: "job-deep-running-01",
			jobType: "deep-company-research",
			startedAt: "2026-04-22T02:02:00.000Z",
			status: "running",
			updatedAt: "2026-04-22T02:03:00.000Z",
			waitReason: null,
		},
		message: "Deep research is actively collecting bounded context.",
		nextAction: {
			action: "wait",
			message:
				"Wait for the current deep-research run to produce its next summary.",
			mode: "deep-company-research",
			sessionId: "deep-running-01",
		},
		result: {
			detailSurface: {
				label: "Deep Research",
				path: "/research-specialist",
			},
			message: "Open Deep Research for detailed specialist review.",
			state: "dedicated-detail",
		},
		run: {
			message: "Deep research is currently running.",
			resumeAllowed: false,
			state: "running",
		},
		session: {
			activeJobId: "job-deep-running-01",
			lastHeartbeatAt: "2026-04-22T02:03:00.000Z",
			resumeAllowed: false,
			sessionId: "deep-running-01",
			status: "running",
			updatedAt: "2026-04-22T02:03:00.000Z",
			workflow: "deep-company-research",
		},
		supportState: "ready",
		summaryAvailability: "dedicated-detail",
		warnings: [
			{
				code: "dedicated-detail-surface",
				message:
					"Deep Research uses Deep Research as its dedicated detail surface.",
			},
		],
	};
}

function createApplicationHelpSpecialistSummary() {
	return {
		approval: null,
		failure: null,
		handoff: createWorkflowDescriptor({
			detailSurface: {
				label: "Application Help",
				path: "/application-help",
			},
			family: "research-and-narrative",
			intake: {
				kind: "report-context",
				message:
					"Application help launches from saved report context, application questions, or staged draft hints.",
				requiresSavedState: true,
			},
			label: "Application Help",
			message:
				"Application help can launch with the research specialist using report-backed context lookup and draft staging while keeping submission manual.",
			mode: "application-help",
			modeDescription:
				"Review staged application-help context and route into the dedicated draft surface.",
			modeRepoRelativePath: "modes/apply.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-application-help-context" },
				{ access: "allowed", name: "stage-application-help-draft" },
			],
		}).handoff,
		job: {
			attempt: 1,
			completedAt: "2026-04-22T02:04:00.000Z",
			currentRunId: "run-app-help-detail-01",
			jobId: "job-app-help-detail-01",
			jobType: "application-help",
			startedAt: "2026-04-22T02:01:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T02:04:00.000Z",
			waitReason: null,
		},
		message:
			"Application-help context is ready and the dedicated review surface owns the next detail step.",
		nextAction: {
			action: "open-detail-surface",
			message:
				"Open the application-help detail surface to review the staged draft packet.",
			mode: "application-help",
			sessionId: "app-help-detail-01",
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
			activeJobId: "job-app-help-detail-01",
			lastHeartbeatAt: "2026-04-22T02:04:00.000Z",
			resumeAllowed: false,
			sessionId: "app-help-detail-01",
			status: "completed",
			updatedAt: "2026-04-22T02:04:00.000Z",
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
}

function createCompareOffersSummary() {
	return {
		approval: null,
		failure: null,
		handoff: createWorkflowDescriptor({
			detailSurface: {
				label: "Compare Offers",
				path: "/tracker-specialist",
			},
			family: "application-history",
			intake: {
				kind: "offer-set",
				message:
					"Compare-offers expects two or more offer descriptions, saved evaluations, or role references.",
				requiresSavedState: false,
			},
			label: "Compare Offers",
			message:
				"Compare offers can launch with the tracker specialist using typed offer matching and inline planning review.",
			mode: "compare-offers",
			modeDescription:
				"Compare saved offers and role references in one bounded summary.",
			modeRepoRelativePath: "modes/ofertas.md",
			specialistId: "tracker-specialist",
			specialistLabel: "Tracker Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-compare-offers-context" },
				{ access: "allowed", name: "load-tracker-specialist-packet" },
			],
		}).handoff,
		job: {
			attempt: 1,
			completedAt: "2026-04-22T02:06:00.000Z",
			currentRunId: "run-compare-review-01",
			jobId: "job-compare-review-01",
			jobType: "compare-offers",
			startedAt: "2026-04-22T02:04:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T02:06:00.000Z",
			waitReason: null,
		},
		message: "Compare-offers review is ready in the workflows surface.",
		nextAction: {
			action: "wait",
			message:
				"Review the typed comparison packet in the workflows surface and use explicit tracker or report handoffs as needed.",
			mode: "compare-offers",
			sessionId: "compare-review-01",
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
			activeJobId: "job-compare-review-01",
			lastHeartbeatAt: "2026-04-22T02:06:00.000Z",
			resumeAllowed: false,
			sessionId: "compare-review-01",
			status: "completed",
			updatedAt: "2026-04-22T02:06:00.000Z",
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
}

function createLinkedinOutreachSummary() {
	return {
		approval: null,
		failure: null,
		handoff: createWorkflowDescriptor({
			detailSurface: {
				label: "LinkedIn Outreach",
				path: "/research-specialist",
			},
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"LinkedIn outreach expects saved company and role context plus a contact target when available.",
				requiresSavedState: false,
			},
			label: "LinkedIn Outreach",
			message:
				"LinkedIn outreach can launch with the research specialist using typed context resolution and manual-send review boundaries.",
			mode: "linkedin-outreach",
			modeDescription:
				"Draft a bounded outreach note while keeping send behavior manual.",
			modeRepoRelativePath: "modes/contacto.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-research-specialist-context" },
				{ access: "allowed", name: "stage-research-specialist-packet" },
				{ access: "allowed", name: "load-research-specialist-packet" },
			],
		}).handoff,
		job: {
			attempt: 1,
			completedAt: "2026-04-22T02:09:00.000Z",
			currentRunId: "run-outreach-review-01",
			jobId: "job-outreach-review-01",
			jobType: "linkedin-outreach",
			startedAt: "2026-04-22T02:07:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T02:09:00.000Z",
			waitReason: null,
		},
		message: "LinkedIn outreach is ready for manual-send review.",
		nextAction: {
			action: "wait",
			message:
				"Review the bounded outreach packet in the workflows surface before sending anything manually.",
			mode: "linkedin-outreach",
			sessionId: "outreach-review-01",
		},
		result: {
			detailSurface: {
				label: "LinkedIn Outreach",
				path: "/research-specialist",
			},
			message:
				"LinkedIn Outreach review is available in the workflows surface.",
			state: "dedicated-detail",
		},
		run: {
			message: "LinkedIn outreach is ready for review.",
			resumeAllowed: false,
			state: "completed",
		},
		session: {
			activeJobId: "job-outreach-review-01",
			lastHeartbeatAt: "2026-04-22T02:09:00.000Z",
			resumeAllowed: false,
			sessionId: "outreach-review-01",
			status: "completed",
			updatedAt: "2026-04-22T02:09:00.000Z",
			workflow: "linkedin-outreach",
		},
		supportState: "ready",
		summaryAvailability: "dedicated-detail",
		warnings: [
			{
				code: "dedicated-detail-surface",
				message:
					"LinkedIn Outreach review is now rendered inside the workflows surface.",
			},
		],
	};
}

function createWorkflowDescriptors(selectedMode) {
	const descriptors = [
		createWorkflowDescriptor({
			detailSurface: {
				label: "Application Help",
				path: "/application-help",
			},
			family: "research-and-narrative",
			intake: {
				kind: "report-context",
				message:
					"Application help launches from saved report context, application questions, or staged draft hints.",
				requiresSavedState: true,
			},
			label: "Application Help",
			message:
				"Application help can launch with the research specialist using report-backed context lookup and draft staging while keeping submission manual.",
			mode: "application-help",
			modeDescription:
				"Review staged application-help context and route into the dedicated draft surface.",
			modeRepoRelativePath: "modes/apply.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-application-help-context" },
				{ access: "allowed", name: "stage-application-help-draft" },
			],
		}),
		createWorkflowDescriptor({
			detailSurface: {
				label: "Compare Offers",
				path: "/tracker-specialist",
			},
			family: "application-history",
			intake: {
				kind: "offer-set",
				message:
					"Compare-offers expects two or more offer descriptions, saved evaluations, or role references.",
				requiresSavedState: false,
			},
			label: "Compare Offers",
			message:
				"Compare offers can launch with the tracker specialist using typed offer matching and inline planning review.",
			mode: "compare-offers",
			modeDescription:
				"Compare saved offers and role references in one bounded summary.",
			modeRepoRelativePath: "modes/ofertas.md",
			specialistId: "tracker-specialist",
			specialistLabel: "Tracker Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-compare-offers-context" },
				{ access: "allowed", name: "load-tracker-specialist-packet" },
			],
		}),
		createWorkflowDescriptor({
			detailSurface: {
				label: "Interview Prep",
				path: "/research-specialist",
			},
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"Interview prep expects a company and role target, with saved report context when available.",
				requiresSavedState: false,
			},
			label: "Interview Prep",
			message:
				"Interview prep can launch with the research specialist using typed context resolution, story-bank awareness, packet staging, and dedicated-detail review.",
			mode: "interview-prep",
			modeDescription:
				"Prepare a bounded interview brief with saved company and role context.",
			modeRepoRelativePath: "modes/interview-prep.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-research-specialist-context" },
				{ access: "allowed", name: "stage-research-specialist-packet" },
				{ access: "allowed", name: "load-research-specialist-packet" },
				{ access: "allowed", name: "list-workspace-artifacts" },
			],
		}),
		createWorkflowDescriptor({
			detailSurface: {
				label: "Deep Research",
				path: "/research-specialist",
			},
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"Deep research expects a company and role target, with saved evaluation context when available.",
				requiresSavedState: false,
			},
			label: "Deep Research",
			message:
				"Deep company research can launch with the research specialist using typed context resolution, packet staging, and dedicated-detail review state.",
			mode: "deep-company-research",
			modeDescription:
				"Build a bounded company research brief from saved role context.",
			modeRepoRelativePath: "modes/deep.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-research-specialist-context" },
				{ access: "allowed", name: "stage-research-specialist-packet" },
				{ access: "allowed", name: "load-research-specialist-packet" },
				{ access: "allowed", name: "list-workspace-artifacts" },
			],
		}),
		createWorkflowDescriptor({
			detailSurface: {
				label: "LinkedIn Outreach",
				path: "/research-specialist",
			},
			family: "research-and-narrative",
			intake: {
				kind: "company-role",
				message:
					"LinkedIn outreach expects saved company and role context plus a contact target when available.",
				requiresSavedState: false,
			},
			label: "LinkedIn Outreach",
			message:
				"LinkedIn outreach can launch with the research specialist using typed context resolution and manual-send review boundaries.",
			mode: "linkedin-outreach",
			modeDescription:
				"Draft a bounded outreach note while keeping send behavior manual.",
			modeRepoRelativePath: "modes/contacto.md",
			specialistId: "research-specialist",
			specialistLabel: "Research Specialist",
			summaryAvailability: "dedicated-detail",
			supportState: "ready",
			toolItems: [
				{ access: "allowed", name: "resolve-research-specialist-context" },
				{ access: "allowed", name: "stage-research-specialist-packet" },
				{ access: "allowed", name: "load-research-specialist-packet" },
			],
		}),
	];

	return descriptors.map((descriptor) => ({
		...descriptor,
		selected: descriptor.handoff.mode === selectedMode,
	}));
}

function createSpecialistWorkspaceSummary(
	state,
	requestUrl = "/specialist-workspace",
) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedMode = url.searchParams.get("mode")?.trim() || null;
	const requestedSessionId = url.searchParams.get("sessionId")?.trim() || null;

	if (state.mode === "empty") {
		return {
			filters: {
				mode: requestedMode,
				sessionId: requestedSessionId,
			},
			generatedAt: "2026-04-22T02:12:00.000Z",
			message: "No specialist workspace workflows are configured yet.",
			ok: true,
			selected: {
				message: "No specialist workspace workflows are configured yet.",
				origin: "none",
				requestedMode,
				requestedSessionId,
				state: "empty",
				summary: null,
			},
			service: "jobhunt-api-scaffold",
			sessionId: STARTUP_SESSION_ID,
			status: "ready",
			workflows: [],
		};
	}

	const interviewWaiting = createInterviewWaitingSummary();
	const deepRunning = createDeepRunningSummary();
	const appHelpDetail = createApplicationHelpSpecialistSummary();
	const compareReview = createCompareOffersSummary();
	const outreachReview = createLinkedinOutreachSummary();
	const sessionMap = new Map([
		["compare-review-01", compareReview],
		["interview-waiting-01", interviewWaiting],
		["deep-running-01", deepRunning],
		["outreach-review-01", outreachReview],
		["app-help-detail-01", appHelpDetail],
	]);
	const modeMap = new Map([
		["compare-offers", compareReview],
		["interview-prep", interviewWaiting],
		["deep-company-research", deepRunning],
		["linkedin-outreach", outreachReview],
		["application-help", appHelpDetail],
	]);

	let selectedSummary = null;
	let selectionState = "ready";
	let origin = "latest-session";
	let message = "";

	if (requestedSessionId === "missing-specialist-session") {
		selectedSummary = {
			...interviewWaiting,
			warnings: [
				...interviewWaiting.warnings,
				{
					code: "stale-selection",
					message:
						"Specialist session missing-specialist-session was not found.",
				},
			],
		};
		selectionState = "missing";
		origin = requestedMode ? "mode" : "session-id";
		message = "Specialist session missing-specialist-session was not found.";
	} else if (requestedSessionId && sessionMap.has(requestedSessionId)) {
		selectedSummary = sessionMap.get(requestedSessionId);
		origin = requestedMode ? "mode" : "session-id";
		message = `Loaded specialist session ${requestedSessionId}.`;
	} else if (requestedMode && modeMap.has(requestedMode)) {
		selectedSummary = modeMap.get(requestedMode);
		origin = "mode";
		switch (requestedMode) {
			case "application-help":
				message =
					"Loaded the latest application-help specialist session app-help-detail-01.";
				break;
			case "compare-offers":
				message =
					"Loaded the latest compare-offers specialist session compare-review-01.";
				break;
			case "deep-company-research":
				message =
					"Loaded the latest deep-company-research specialist session deep-running-01.";
				break;
			case "linkedin-outreach":
				message =
					"Loaded the latest linkedin-outreach specialist session outreach-review-01.";
				break;
			case "interview-prep":
			default:
				message =
					"Loaded the latest interview-prep specialist session interview-waiting-01.";
				break;
		}
	} else {
		selectedSummary = interviewWaiting;
		origin = "latest-session";
		message =
			"Loaded the latest interview-prep specialist session interview-waiting-01.";
	}

	const selectedMode = selectedSummary?.handoff.mode ?? requestedMode;

	return {
		filters: {
			mode: requestedMode,
			sessionId: requestedSessionId,
		},
		generatedAt: "2026-04-22T02:12:00.000Z",
		message,
		ok: true,
		selected: {
			message,
			origin,
			requestedMode,
			requestedSessionId,
			state: selectionState,
			summary: selectedSummary,
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
		workflows: createWorkflowDescriptors(selectedMode),
	};
}

function createSpecialistWorkspaceErrorPayload(message) {
	return {
		error: {
			code: "specialist-workspace-failed",
			message,
		},
		ok: false,
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "error",
	};
}

function createSpecialistWorkspaceActionPayload(input) {
	return {
		actionResult: input,
		generatedAt: "2026-04-22T02:13:00.000Z",
		message: input.message,
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
	};
}

function createMatchedReportContext() {
	return {
		company: "Context Co",
		coverLetter: {
			message: "No cover-letter field was detected on the application page.",
			state: "manual-follow-up",
		},
		existingDraft: {
			itemCount: 1,
			items: [
				{
					answer: "Because it fits my production AI delivery work.",
					question: "Why this role?",
				},
			],
			sectionPresent: true,
			sectionText: "Because it fits my production AI delivery work.",
		},
		fileName: "019-context-co-2026-04-22.md",
		legitimacy: "High Confidence",
		matchReasons: [
			"Matched report number 019 from saved evaluation artifacts.",
			"Company and role match the saved specialist context.",
		],
		matchState: "exact",
		pdf: {
			exists: true,
			repoRelativePath: "output/cv-context-co-2026-04-22.pdf",
		},
		reportNumber: "019",
		reportRepoRelativePath: "reports/019-context-co-2026-04-22.md",
		role: "Applied AI Engineer",
		score: 4.4,
		title: "Evaluation: Context Co -- Applied AI Engineer",
		url: "https://example.com/jobs/context-co",
	};
}

function createTrackerSpecialistPayload(requestUrl = "/tracker-specialist") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedMode = url.searchParams.get("mode")?.trim() || null;
	const requestedSessionId = url.searchParams.get("sessionId")?.trim() || null;
	const selectedSummary = {
		approval: null,
		failure: null,
		job: {
			attempt: 1,
			completedAt: "2026-04-22T02:06:00.000Z",
			currentRunId: "run-compare-review-01",
			jobId: "job-compare-review-01",
			jobType: "compare-offers",
			startedAt: "2026-04-22T02:04:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T02:06:00.000Z",
			waitReason: null,
		},
		message: "The compare-offers packet is ready for planning review.",
		nextAction: {
			action: "review-result",
			message:
				"Review the bounded comparison packet, then use explicit tracker or report handoffs if you want to inspect linked artifacts.",
			resumeAllowed: false,
			sessionId: "compare-review-01",
		},
		packet: {
			fingerprint: "compare-review-01:fingerprint",
			generatedAt: "2026-04-22T02:06:00.000Z",
			message: "Compared the top two saved offers with explicit report links.",
			mode: "compare-offers",
			offers: [
				{
					company: "North Systems",
					fileName: "019-context-co-2026-04-22.md",
					label: "North systems offer",
					legitimacy: "High Confidence",
					matchReasons: [
						"Matched report 019 by company and role.",
						"Tracker row 19 carries the same role title.",
					],
					matchState: "exact",
					pdf: {
						exists: true,
						repoRelativePath: "output/cv-context-co-2026-04-22.pdf",
					},
					reportNumber: "019",
					reportRepoRelativePath: "reports/019-context-co-2026-04-22.md",
					role: "Applied AI Engineer",
					score: 4.6,
					title: "Evaluation: Context Co -- Applied AI Engineer",
					trackerEntryNumber: 19,
					url: "https://example.com/jobs/context-co",
				},
				{
					company: "South Labs",
					fileName: "020-future-company-2026-04-22.md",
					label: "South labs offer",
					legitimacy: "Proceed with Caution",
					matchReasons: ["Matched saved report 020 by company name."],
					matchState: "fuzzy",
					pdf: {
						exists: false,
						repoRelativePath: null,
					},
					reportNumber: "020",
					reportRepoRelativePath: "reports/020-future-company-2026-04-22.md",
					role: "Forward Deployed Engineer",
					score: 4.1,
					title: "Evaluation: Future Company -- Forward Deployed Engineer",
					trackerEntryNumber: 20,
					url: "https://example.com/jobs/future-company",
				},
			],
			references: [
				{
					company: "North Systems",
					entryNumber: 19,
					label: "North systems offer",
					reportNumber: "019",
					reportPath: "reports/019-context-co-2026-04-22.md",
					role: "Applied AI Engineer",
				},
				{
					company: "South Labs",
					entryNumber: 20,
					label: "South labs offer",
					reportNumber: "020",
					reportPath: "reports/020-future-company-2026-04-22.md",
					role: "Forward Deployed Engineer",
				},
			],
			resultStatus: "ready",
			revision: 2,
			sessionId: "compare-review-01",
			unmatchedReferences: [],
			updatedAt: "2026-04-22T02:06:00.000Z",
			warnings: [],
		},
		run: {
			message: "Compare-offers review is ready.",
			resumeAllowed: false,
			state: "completed",
		},
		session: {
			activeJobId: "job-compare-review-01",
			lastHeartbeatAt: "2026-04-22T02:06:00.000Z",
			resumeAllowed: false,
			sessionId: "compare-review-01",
			status: "completed",
			updatedAt: "2026-04-22T02:06:00.000Z",
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
	};

	return {
		filters: {
			mode: requestedMode,
			sessionId: requestedSessionId,
		},
		generatedAt: "2026-04-22T02:06:00.000Z",
		message: requestedSessionId
			? `Loaded tracker-specialist session ${requestedSessionId}.`
			: "Loaded the latest compare-offers session compare-review-01.",
		ok: true,
		selected: {
			message: requestedSessionId
				? `Loaded tracker-specialist session ${requestedSessionId}.`
				: "Loaded the latest compare-offers session compare-review-01.",
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
				detailPath: "/tracker-specialist",
				label: "Compare Offers",
				message:
					"Compare offers can launch with the tracker specialist using typed offer matching and inline planning review.",
				mode: "compare-offers",
				selected: true,
			},
			{
				detailPath: "/tracker-specialist",
				label: "Follow-up Cadence",
				message:
					"Follow-up cadence review is available when a saved history exists.",
				mode: "follow-up-cadence",
				selected: false,
			},
			{
				detailPath: "/tracker-specialist",
				label: "Rejection Patterns",
				message:
					"Rejection patterns review is available when saved history exists.",
				mode: "rejection-patterns",
				selected: false,
			},
		],
	};
}

function createResearchSpecialistPayload(requestUrl = "/research-specialist") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedMode = url.searchParams.get("mode")?.trim() || null;
	const requestedSessionId = url.searchParams.get("sessionId")?.trim() || null;
	const matchedReportContext = createMatchedReportContext();
	const interviewSummary = {
		approval: {
			action: "specialist-review",
			approvalId: "approval-interview-workflow-01",
			jobId: "job-interview-waiting-01",
			requestedAt: "2026-04-22T02:00:00.000Z",
			resolvedAt: null,
			status: "pending",
			title: "Review interview prep scope",
			traceId: "trace-interview-workflow-01",
		},
		context: {
			artifactName: null,
			company: "Context Co",
			mode: "interview-prep",
			modeDescription:
				"Prepare a bounded interview brief with saved company and role context.",
			modeRepoRelativePath: "modes/interview-prep.md",
			reportContext: matchedReportContext,
			role: "Applied AI Engineer",
			storyBank: {
				exists: true,
				repoRelativePath: "interview-prep/story-bank.example.md",
				source: "story-bank-example",
			},
			subject: null,
		},
		failure: null,
		job: {
			attempt: 1,
			completedAt: null,
			currentRunId: "run-interview-waiting-01",
			jobId: "job-interview-waiting-01",
			jobType: "interview-prep",
			startedAt: "2026-04-22T02:00:00.000Z",
			status: "waiting",
			updatedAt: "2026-04-22T02:00:00.000Z",
			waitReason: "approval",
		},
		message: "Interview prep is paused on approval review.",
		nextAction: {
			action: "resolve-approval",
			message: "Resolve approval before resuming the interview packet.",
			resumeAllowed: true,
			sessionId: "interview-waiting-01",
		},
		packet: null,
		reviewBoundary: {
			automationAllowed: false,
			manualSendRequired: false,
			message:
				"Review is required. Treat this packet as bounded preparation material, not an automatically executed action.",
			reviewRequired: true,
		},
		run: {
			message: "Interview prep is paused for approval.",
			resumeAllowed: true,
			state: "waiting",
		},
		session: {
			activeJobId: "job-interview-waiting-01",
			lastHeartbeatAt: "2026-04-22T02:00:00.000Z",
			resumeAllowed: true,
			sessionId: "interview-waiting-01",
			status: "waiting",
			updatedAt: "2026-04-22T02:00:00.000Z",
			workflow: "interview-prep",
		},
		state: "approval-paused",
		warnings: [
			{
				code: "approval-paused",
				message:
					"Interview prep is waiting on human approval before it can continue.",
			},
		],
		workflow: {
			detailPath: "/research-specialist",
			label: "Interview Prep",
			message:
				"Interview prep can launch with the research specialist using typed context resolution, story-bank awareness, and packet staging.",
			mode: "interview-prep",
			selected: true,
		},
	};
	const deepSummary = {
		approval: null,
		context: {
			artifactName: null,
			company: "Context Co",
			mode: "deep-company-research",
			modeDescription:
				"Build a bounded company research brief from saved role context.",
			modeRepoRelativePath: "modes/deep.md",
			reportContext: matchedReportContext,
			role: "Applied AI Engineer",
			storyBank: null,
			subject: null,
		},
		failure: null,
		job: {
			attempt: 1,
			completedAt: "2026-04-22T02:08:00.000Z",
			currentRunId: "run-deep-running-01",
			jobId: "job-deep-running-01",
			jobType: "deep-company-research",
			startedAt: "2026-04-22T02:03:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T02:08:00.000Z",
			waitReason: null,
		},
		message: "Deep research packet is ready for review.",
		nextAction: {
			action: "review-packet",
			message: "Review the bounded research packet in the workflows surface.",
			resumeAllowed: false,
			sessionId: "deep-running-01",
		},
		packet: {
			context: {
				artifactName: null,
				company: "Context Co",
				mode: "deep-company-research",
				modeDescription:
					"Build a bounded company research brief from saved role context.",
				modeRepoRelativePath: "modes/deep.md",
				reportContext: matchedReportContext,
				role: "Applied AI Engineer",
				storyBank: null,
				subject: null,
			},
			createdAt: "2026-04-22T02:08:00.000Z",
			fingerprint: "deep-running-01:fingerprint",
			generatedAt: "2026-04-22T02:08:00.000Z",
			message: "Deep company research packet is ready for review.",
			mode: "deep-company-research",
			packetId: "packet-deep-running-01",
			resultStatus: "ready",
			revision: 2,
			sections: {
				aiStrategy: ["Context Co is pushing operator-owned AI delivery."],
				candidateAngle: ["Operator-facing workflow delivery is a strong fit."],
				competitors: ["Competitor X is hiring for adjacent platform work."],
				engineeringCulture: ["Pair product intuition with production rigor."],
				likelyChallenges: ["Tight iteration loops with explicit approvals."],
				recentMoves: ["Recent launch of a workflow review surface."],
			},
			sessionId: "deep-running-01",
			sources: [
				{
					label: "Company blog",
					note: "Recent launch announcement for workflow tooling.",
					url: "https://example.com/blog/context-co",
				},
			],
			updatedAt: "2026-04-22T02:08:00.000Z",
			warnings: [],
		},
		reviewBoundary: {
			automationAllowed: false,
			manualSendRequired: false,
			message:
				"Review is required. Treat this packet as bounded preparation material, not an automatically executed action.",
			reviewRequired: true,
		},
		run: {
			message: "Deep research is ready for review.",
			resumeAllowed: false,
			state: "completed",
		},
		session: {
			activeJobId: "job-deep-running-01",
			lastHeartbeatAt: "2026-04-22T02:08:00.000Z",
			resumeAllowed: false,
			sessionId: "deep-running-01",
			status: "completed",
			updatedAt: "2026-04-22T02:08:00.000Z",
			workflow: "deep-company-research",
		},
		state: "completed",
		warnings: [],
		workflow: {
			detailPath: "/research-specialist",
			label: "Deep Research",
			message:
				"Deep company research can launch with the research specialist using typed context resolution and packet staging.",
			mode: "deep-company-research",
			selected: true,
		},
	};
	const outreachSummary = {
		approval: null,
		context: {
			artifactName: null,
			company: "Context Co",
			mode: "linkedin-outreach",
			modeDescription:
				"Draft a bounded outreach note while keeping send behavior manual.",
			modeRepoRelativePath: "modes/contacto.md",
			reportContext: matchedReportContext,
			role: "Applied AI Engineer",
			storyBank: null,
			subject: "Hiring manager outreach",
		},
		failure: null,
		job: {
			attempt: 1,
			completedAt: "2026-04-22T02:09:00.000Z",
			currentRunId: "run-outreach-review-01",
			jobId: "job-outreach-review-01",
			jobType: "linkedin-outreach",
			startedAt: "2026-04-22T02:07:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T02:09:00.000Z",
			waitReason: null,
		},
		message: "LinkedIn outreach packet is ready for manual-send review.",
		nextAction: {
			action: "review-packet",
			message: "Review the outreach draft, then send manually outside the app.",
			resumeAllowed: false,
			sessionId: "outreach-review-01",
		},
		packet: {
			alternativeTargets: [
				{
					name: "A. Recruiter",
					profileUrl: "https://linkedin.com/in/a-recruiter",
					title: "Recruiter",
					type: "recruiter",
				},
			],
			characterCount: 281,
			context: {
				artifactName: null,
				company: "Context Co",
				mode: "linkedin-outreach",
				modeDescription:
					"Draft a bounded outreach note while keeping send behavior manual.",
				modeRepoRelativePath: "modes/contacto.md",
				reportContext: matchedReportContext,
				role: "Applied AI Engineer",
				storyBank: null,
				subject: "Hiring manager outreach",
			},
			createdAt: "2026-04-22T02:09:00.000Z",
			fingerprint: "outreach-review-01:fingerprint",
			generatedAt: "2026-04-22T02:09:00.000Z",
			language: "English",
			message: "LinkedIn outreach packet is ready for manual-send review.",
			messageDraft:
				"Hi there - I just wrapped a review-surface rollout for bounded AI workflows and would value a quick conversation about the Applied AI Engineer opening at Context Co.",
			mode: "linkedin-outreach",
			packetId: "packet-outreach-review-01",
			primaryTarget: {
				name: "Hiring Manager",
				profileUrl: "https://linkedin.com/in/hiring-manager",
				title: "Hiring Manager",
				type: "hiring-manager",
			},
			resultStatus: "ready",
			revision: 2,
			sessionId: "outreach-review-01",
			updatedAt: "2026-04-22T02:09:00.000Z",
			warnings: [
				{
					code: "manual-send-required",
					message:
						"LinkedIn outreach remains manual-send only, even when a draft packet is ready.",
				},
			],
		},
		reviewBoundary: {
			automationAllowed: false,
			manualSendRequired: true,
			message:
				"Review required. Treat this packet as bounded preparation material, not an automatically executed action.",
			reviewRequired: true,
		},
		run: {
			message: "LinkedIn outreach is ready for review.",
			resumeAllowed: false,
			state: "completed",
		},
		session: {
			activeJobId: "job-outreach-review-01",
			lastHeartbeatAt: "2026-04-22T02:09:00.000Z",
			resumeAllowed: false,
			sessionId: "outreach-review-01",
			status: "completed",
			updatedAt: "2026-04-22T02:09:00.000Z",
			workflow: "linkedin-outreach",
		},
		state: "completed",
		warnings: [
			{
				code: "manual-send-required",
				message:
					"LinkedIn outreach remains manual-send only, even when a draft packet is ready.",
			},
		],
		workflow: {
			detailPath: "/research-specialist",
			label: "LinkedIn Outreach",
			message:
				"LinkedIn outreach can launch with the research specialist using typed context resolution and manual-send review boundaries.",
			mode: "linkedin-outreach",
			selected: true,
		},
	};

	let selectedSummary = deepSummary;

	if (
		requestedSessionId === "interview-waiting-01" ||
		requestedMode === "interview-prep"
	) {
		selectedSummary = interviewSummary;
	} else if (
		requestedSessionId === "outreach-review-01" ||
		requestedMode === "linkedin-outreach"
	) {
		selectedSummary = outreachSummary;
	}

	return {
		filters: {
			mode: requestedMode,
			sessionId: requestedSessionId,
		},
		generatedAt: "2026-04-22T02:09:00.000Z",
		message:
			requestedSessionId && requestedSessionId === "interview-waiting-01"
				? `Loaded research-specialist session ${requestedSessionId}.`
				: requestedMode === "linkedin-outreach"
					? "Loaded the latest linkedin-outreach session outreach-review-01."
					: requestedMode === "interview-prep"
						? "Loaded the latest interview-prep session interview-waiting-01."
						: "Loaded the latest deep-company-research session deep-running-01.",
		ok: true,
		selected: {
			message:
				requestedSessionId && requestedSessionId === "interview-waiting-01"
					? `Loaded research-specialist session ${requestedSessionId}.`
					: requestedMode === "linkedin-outreach"
						? "Loaded the latest linkedin-outreach session outreach-review-01."
						: requestedMode === "interview-prep"
							? "Loaded the latest interview-prep session interview-waiting-01."
							: "Loaded the latest deep-company-research session deep-running-01.",
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
				detailPath: "/research-specialist",
				label: "Deep Research",
				message:
					"Deep company research can launch with the research specialist using typed context resolution and packet staging.",
				mode: "deep-company-research",
				selected: selectedSummary.workflow.mode === "deep-company-research",
			},
			{
				detailPath: "/research-specialist",
				label: "Interview Prep",
				message:
					"Interview prep can launch with the research specialist using typed context resolution, story-bank awareness, and packet staging.",
				mode: "interview-prep",
				selected: selectedSummary.workflow.mode === "interview-prep",
			},
			{
				detailPath: "/research-specialist",
				label: "LinkedIn Outreach",
				message:
					"LinkedIn outreach can launch with the research specialist using typed context resolution and manual-send review boundaries.",
				mode: "linkedin-outreach",
				selected: selectedSummary.workflow.mode === "linkedin-outreach",
			},
		],
	};
}

function createTrackerWorkspacePayload() {
	return {
		filters: {
			entryNumber: 19,
			limit: 12,
			offset: 0,
			reportNumber: null,
			search: null,
			sort: "date",
			status: null,
		},
		generatedAt: "2026-04-22T02:06:00.000Z",
		message: "Showing selected tracker row #19.",
		ok: true,
		pendingAdditions: {
			count: 0,
			items: [],
			message: "No pending tracker additions.",
		},
		rows: {
			filteredCount: 1,
			hasMore: false,
			items: [
				{
					company: "Context Co",
					date: "2026-04-22",
					entryNumber: 19,
					pdf: {
						exists: true,
						message: "Tracked PDF is available.",
						repoRelativePath: "output/cv-context-co-2026-04-22.pdf",
					},
					report: {
						exists: true,
						message: "Tracked report is available.",
						repoRelativePath: "reports/019-context-co-2026-04-22.md",
					},
					role: "Applied AI Engineer",
					score: 4.6,
					scoreLabel: "4.6/5",
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
			message: "Showing selected tracker row #19.",
			origin: "entry-number",
			pendingAddition: null,
			requestedEntryNumber: 19,
			requestedReportNumber: null,
			row: {
				company: "Context Co",
				date: "2026-04-22",
				entryNumber: 19,
				header: {
					date: "2026-04-22",
					legitimacy: "High Confidence",
					pdf: {
						exists: true,
						message: "Tracked PDF is available.",
						repoRelativePath: "output/cv-context-co-2026-04-22.pdf",
					},
					score: 4.6,
					title: "Evaluation: Context Co -- Applied AI Engineer",
					url: "https://example.com/jobs/context-co",
					verification: "active via browser review",
				},
				notes: "Tracker handoff row for compare-offers review.",
				pdf: {
					exists: true,
					message: "Tracked PDF is available.",
					repoRelativePath: "output/cv-context-co-2026-04-22.pdf",
				},
				report: {
					exists: true,
					message: "Tracked report is available.",
					repoRelativePath: "reports/019-context-co-2026-04-22.md",
				},
				role: "Applied AI Engineer",
				score: 4.6,
				scoreLabel: "4.6/5",
				selected: true,
				sourceLine:
					"| 19 | 2026-04-22 | Context Co | Applied AI Engineer | 4.6/5 | Evaluated | Y | [019](reports/019-context-co-2026-04-22.md) | Tracker handoff row for compare-offers review. |",
				status: "Evaluated",
				warningCount: 0,
				warnings: [],
			},
			state: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
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
		mode: "ready",
	};
	const readyStartupPayload = createReadyStartupPayload();
	const readyShellSummary = createReadyShellSummary();

	const server = createHttpServer(async (request, response) => {
		const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

		if (requestUrl.pathname === "/startup") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(readyStartupPayload, null, 2));
			return;
		}

		if (requestUrl.pathname === "/operator-shell") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(readyShellSummary, null, 2));
			return;
		}

		if (requestUrl.pathname === "/specialist-workspace") {
			if (state.mode === "slow") {
				await delay(900);
			}

			if (state.mode === "error") {
				response.writeHead(500, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createSpecialistWorkspaceErrorPayload(
							"Specialist workspace failed before the summary could load.",
						),
						null,
						2,
					),
				);
				return;
			}

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createSpecialistWorkspaceSummary(
						state,
						request.url ?? "/specialist-workspace",
					),
					null,
					2,
				),
			);
			return;
		}

		if (requestUrl.pathname === "/tracker-specialist") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createTrackerSpecialistPayload(request.url ?? "/tracker-specialist"),
					null,
					2,
				),
			);
			return;
		}

		if (requestUrl.pathname === "/research-specialist") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createResearchSpecialistPayload(
						request.url ?? "/research-specialist",
					),
					null,
					2,
				),
			);
			return;
		}

		if (
			requestUrl.pathname === "/specialist-workspace/action" &&
			request.method === "POST"
		) {
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

			if (body.action === "resume") {
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createSpecialistWorkspaceActionPayload({
							action: "resume",
							handoff: createDeepRunningSummary().handoff,
							message: `Deep Research is ready in session ${body.sessionId}.`,
							mode: "deep-company-research",
							nextPollMs: 200,
							sessionId: body.sessionId,
							state: "ready",
							warnings: [],
						}),
						null,
						2,
					),
				);
				return;
			}

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createSpecialistWorkspaceActionPayload({
						action: "launch",
						handoff: createApplicationHelpSpecialistSummary().handoff,
						message: "Application Help is ready in session app-help-detail-01.",
						mode: "application-help",
						nextPollMs: 200,
						sessionId: "app-help-detail-01",
						state: "ready",
						warnings: [],
					}),
					null,
					2,
				),
			);
			return;
		}

		if (requestUrl.pathname === "/tracker-workspace") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(createTrackerWorkspacePayload(), null, 2));
			return;
		}

		if (requestUrl.pathname === "/application-help") {
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

		if (requestUrl.pathname === "/approval-inbox") {
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
					sessionId: STARTUP_SESSION_ID,
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
		throw new Error("Failed to start the fake specialist-workspace API.");
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
		reset() {
			state.mode = "ready";
		},
		setMode(mode) {
			state.mode = mode;
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
		await page.goto(`${webUrl}#workflows`, {
			waitUntil: "load",
		});

		await page
			.getByRole("heading", { name: "Specialist workflows workspace" })
			.waitFor();
		await page.getByText("Interview Prep").first().waitFor();
		await page.getByText("Compare Offers").first().waitFor();
		await page.getByText("LinkedIn Outreach").first().waitFor();
		await page.getByText("Interview prep is paused for approval.").waitFor();

		const applicationHelpCard = page
			.locator("article")
			.filter({
				has: page.getByRole("heading", { name: "Application Help" }),
			})
			.first();
		await applicationHelpCard.getByRole("button", { name: "Launch" }).click();
		await page
			.getByText("Application Help is ready in session app-help-detail-01.")
			.waitFor();
		assert.match(page.url(), /workflowsMode=application-help/);
		assert.match(page.url(), /workflowsSessionId=app-help-detail-01/);

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
			.getByRole("heading", {
				name: "Application-help workspace",
				exact: true,
			})
			.waitFor();
		assert.match(page.url(), /applicationHelpSessionId=app-help-detail-01/);
		assert.match(page.url(), /#application-help$/);

		await page.goto(`${webUrl}?workflowsMode=compare-offers#workflows`, {
			waitUntil: "load",
		});
		await page.getByText("Resolved offers").waitFor();
		await page.getByText("North Systems").waitFor();
		await page.getByRole("button", { name: "Open tracker" }).click();
		await page
			.getByRole("heading", {
				name: "Tracker workspace and integrity actions",
			})
			.waitFor();
		await page.getByText("Showing selected tracker row #19.").first().waitFor();

		await page.goto(`${webUrl}?workflowsMode=linkedin-outreach#workflows`, {
			waitUntil: "load",
		});
		await page.getByText("Message draft").waitFor();
		await page.getByText("Manual send required: yes").waitFor();
		await page
			.getByText("Hi there - I just wrapped a review-surface rollout", {
				exact: false,
			})
			.waitFor();

		await page.goto(`${webUrl}?workflowsMode=interview-prep#workflows`, {
			waitUntil: "load",
		});
		await page.getByRole("button", { name: "Open approvals" }).click();
		await page
			.getByRole("heading", { name: "Approval inbox and human review flow" })
			.waitFor();
		assert.match(page.url(), /approval=approval-interview-workflow-01/);
		assert.match(page.url(), /reviewSession=interview-waiting-01/);
		assert.match(page.url(), /#approvals$/);

		await page.goto(`${webUrl}?workflowsMode=deep-company-research#workflows`, {
			waitUntil: "load",
		});
		await page.getByText("Research sections").waitFor();
		await page
			.getByText("Context Co is pushing operator-owned AI delivery.")
			.waitFor();

		await page.goto(
			`${webUrl}?workflowsMode=interview-prep&workflowsSessionId=missing-specialist-session#workflows`,
			{
				waitUntil: "load",
			},
		);
		await page
			.getByText("Specialist session missing-specialist-session was not found.")
			.first()
			.waitFor();
		await page.waitForFunction(
			() =>
				!new URL(window.location.href).searchParams.has("workflowsSessionId"),
		);

		fakeApi.setMode("slow");
		const loadingPage = await browser.newPage();
		await loadingPage.goto(`${webUrl}#workflows`);
		await loadingPage.getByText("Loading workflows workspace").waitFor();
		await loadingPage.close();

		fakeApi.setMode("empty");
		const emptyPage = await browser.newPage();
		await emptyPage.goto(`${webUrl}#workflows`, {
			waitUntil: "load",
		});
		await emptyPage
			.getByText("No specialist workspace workflows are configured yet.")
			.first()
			.waitFor();
		await emptyPage.close();

		fakeApi.setMode("error");
		const errorPage = await browser.newPage();
		await errorPage.goto(`${webUrl}#workflows`, {
			waitUntil: "load",
		});
		await errorPage.getByText("Workflows workspace warning").waitFor();
		await errorPage
			.getByText("Specialist workspace failed before the summary could load.")
			.waitFor();
		await errorPage.close();

		fakeApi.reset();
		await page.goto(`${webUrl}#workflows`, {
			waitUntil: "load",
		});
		await page.route("**/specialist-workspace*", async (route) => {
			await route.abort("failed");
		});
		await page
			.getByRole("button", { name: /Refresh workflows workspace/ })
			.click();
		await page.getByText("Showing the last workflows snapshot").waitFor();
		await page
			.getByText(
				"Could not reach the specialist workspace summary endpoint right now.",
			)
			.waitFor();
	} finally {
		await browser.close();
	}
} finally {
	await stopChild(webChild);
	await fakeApi.close();
}

console.log("Specialist workspace smoke checks passed.");

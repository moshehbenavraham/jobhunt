import assert from "node:assert/strict";
import test from "node:test";
import type {
	AgentRuntimeBootstrap,
	AgentRuntimeService,
} from "../agent-runtime/index.js";
import { WORKFLOW_INTENTS } from "../prompt/prompt-types.js";
import { createApiServiceContainer } from "../runtime/service-container.js";
import type {
	OperationalStore,
	RuntimeJobStatus,
	RuntimeJobWaitReason,
	RuntimeSessionStatus,
} from "../store/index.js";
import { createWorkspaceFixture } from "../workspace/test-utils.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import { createTrackerSpecialistSummary } from "./tracker-specialist-summary.js";

function createReadyAgentRuntime(repoRoot: string): AgentRuntimeService {
	return {
		async bootstrap(): Promise<AgentRuntimeBootstrap> {
			throw new Error(
				"bootstrap is not used by tracker-specialist summary tests",
			);
		},
		async close() {},
		async getReadiness() {
			return {
				auth: {
					accountId: "acct-tracker-specialist-test",
					authPath: `${repoRoot}/data/openai-account-auth.json`,
					expiresAt: null,
					message: "Agent runtime ready.",
					nextSteps: [],
					state: "ready" as const,
					updatedAt: "2026-04-22T00:00:00.000Z",
				},
				config: {
					authPath: `${repoRoot}/data/openai-account-auth.json`,
					baseUrl: "https://chatgpt.com/backend-api",
					model: "gpt-5.4-mini",
					originator: "tracker-specialist-summary-test",
					overrides: {
						authPath: false,
						baseUrl: false,
						model: false,
						originator: false,
					},
				},
				message: "Agent runtime ready.",
				prompt: {
					emptySources: [],
					issues: [],
					message: "Prompt bundle is ready.",
					missingSources: [],
					modeRepoRelativePath: "modes/ofertas.md",
					requestedWorkflow: "compare-offers",
					state: "ready" as const,
					supportedWorkflows: WORKFLOW_INTENTS,
					workflow: "compare-offers" as const,
				},
				status: "ready" as const,
			};
		},
	};
}

async function createReadyFixture(extraFiles: Record<string, string> = {}) {
	return createWorkspaceFixture({
		directories: ["output", "reports"],
		files: {
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"config/profile.yml": "full_name: Test User\n",
			"modes/_profile.md": "# Profile\n",
			"profile/cv.md": "# CV\n",
			...extraFiles,
		},
	});
}

async function saveTrackerSpecialistSession(
	store: OperationalStore,
	input: {
		activeJobId?: string | null;
		context?: JsonValue;
		sessionId: string;
		status: RuntimeSessionStatus;
		timestamp: string;
		workflow: "compare-offers" | "follow-up-cadence" | "rejection-patterns";
	},
): Promise<void> {
	await store.sessions.save({
		activeJobId: input.activeJobId ?? null,
		context: input.context ?? {
			workflow: input.workflow,
		},
		createdAt: input.timestamp,
		lastHeartbeatAt: input.timestamp,
		runnerId:
			input.status === "pending" || input.activeJobId === null
				? null
				: "runner-tracker-specialist-summary-test",
		sessionId: input.sessionId,
		status: input.status,
		updatedAt: input.timestamp,
		workflow: input.workflow,
	});
}

async function saveTrackerSpecialistJob(
	store: OperationalStore,
	input: {
		error?: JsonValue | null;
		jobId: string;
		sessionId: string;
		status: RuntimeJobStatus;
		timestamp: string;
		waitApprovalId?: string | null;
		waitReason?: RuntimeJobWaitReason | null;
		workflow: "compare-offers" | "follow-up-cadence" | "rejection-patterns";
	},
): Promise<void> {
	const isActive = input.status === "running" || input.status === "waiting";

	await store.jobs.save({
		attempt: 1,
		claimOwnerId: isActive ? "runner-tracker-specialist-summary-test" : null,
		claimToken: isActive ? `claim-${input.jobId}` : null,
		completedAt:
			input.status === "completed" ||
			input.status === "failed" ||
			input.status === "cancelled"
				? input.timestamp
				: null,
		createdAt: input.timestamp,
		currentRunId: `${input.jobId}-run`,
		error: input.error ?? null,
		jobId: input.jobId,
		jobType: input.workflow,
		lastHeartbeatAt: isActive ? input.timestamp : null,
		leaseExpiresAt: input.status === "running" ? input.timestamp : null,
		maxAttempts: 3,
		nextAttemptAt: null,
		payload: {
			workflow: input.workflow,
		},
		result: null,
		retryBackoffMs: 1_000,
		sessionId: input.sessionId,
		startedAt:
			input.status === "pending" || input.status === "queued"
				? null
				: input.timestamp,
		status: input.status,
		updatedAt: input.timestamp,
		waitApprovalId: input.waitApprovalId ?? null,
		waitReason: input.waitReason ?? null,
	});
}

async function saveApproval(
	store: OperationalStore,
	input: {
		approvalId: string;
		jobId: string;
		sessionId: string;
		status: "approved" | "pending" | "rejected";
		timestamp: string;
		title: string;
	},
): Promise<void> {
	await store.approvals.save({
		approvalId: input.approvalId,
		jobId: input.jobId,
		request: {
			action: "review-tracker-specialist",
			title: input.title,
		},
		requestedAt: input.timestamp,
		resolvedAt: input.status === "pending" ? null : input.timestamp,
		response: input.status === "pending" ? null : { message: "Resolved" },
		sessionId: input.sessionId,
		status: input.status,
		traceId: `${input.approvalId}-trace`,
		updatedAt: input.timestamp,
	});
}

async function saveFailureEvent(
	store: OperationalStore,
	input: {
		jobId: string;
		message: string;
		sessionId: string;
		timestamp: string;
	},
): Promise<void> {
	await store.events.save({
		approvalId: null,
		eventId: `${input.jobId}-failed`,
		eventType: "job-failed",
		jobId: input.jobId,
		level: "error",
		metadata: {
			message: input.message,
			runId: `${input.jobId}-run`,
		},
		occurredAt: input.timestamp,
		requestId: null,
		sessionId: input.sessionId,
		summary: input.message,
		traceId: `${input.jobId}-trace`,
	});
}

async function stageCompareOffersPacket(
	services: ReturnType<typeof createApiServiceContainer>,
	sessionId: string,
): Promise<void> {
	const toolService = await services.tools.getService();

	await toolService.execute({
		correlation: {
			jobId: `tool-job-${sessionId}`,
			requestId: `tool-request-${sessionId}`,
			sessionId,
			traceId: `tool-trace-${sessionId}`,
		},
		input: {
			limit: 4,
			offers: [
				{
					company: null,
					entryNumber: 1,
					label: "North",
					reportNumber: null,
					reportPath: null,
					role: null,
				},
				{
					company: null,
					entryNumber: 2,
					label: "South",
					reportNumber: null,
					reportPath: null,
					role: null,
				},
			],
		},
		toolName: "resolve-compare-offers-context",
	});
}

async function stageFollowUpPacket(
	services: ReturnType<typeof createApiServiceContainer>,
	sessionId: string,
): Promise<void> {
	const toolService = await services.tools.getService();

	await toolService.execute({
		correlation: {
			jobId: `tool-job-${sessionId}`,
			requestId: `tool-request-${sessionId}`,
			sessionId,
			traceId: `tool-trace-${sessionId}`,
		},
		input: {
			appliedDays: 7,
			overdueOnly: false,
		},
		toolName: "analyze-follow-up-cadence",
	});
}

async function stagePatternPacket(
	services: ReturnType<typeof createApiServiceContainer>,
	sessionId: string,
): Promise<void> {
	const toolService = await services.tools.getService();

	await toolService.execute({
		correlation: {
			jobId: `tool-job-${sessionId}`,
			requestId: `tool-request-${sessionId}`,
			sessionId,
			traceId: `tool-trace-${sessionId}`,
		},
		input: {
			minThreshold: 5,
		},
		toolName: "analyze-rejection-patterns",
	});
}

test("tracker-specialist summary falls back to compare-offers with a missing-input state when no sessions exist", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});

	try {
		const payload = await createTrackerSpecialistSummary(services);

		assert.equal(payload.status, "ready");
		assert.equal(payload.selected.origin, "catalog");
		assert.equal(payload.selected.summary?.workflow.mode, "compare-offers");
		assert.equal(payload.selected.summary?.state, "missing-input");
		assert.equal(
			payload.selected.summary?.nextAction.action,
			"launch-workflow",
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("tracker-specialist summary applies waiting approval overlays and stale-selection recovery", async () => {
	const fixture = await createReadyFixture({
		"scripts/followup-cadence.mjs": [
			"process.stdout.write(JSON.stringify({",
			"  metadata: { analysisDate: '2026-04-22', totalTracked: 3, actionable: 1, overdue: 1, urgent: 0, cold: 0, waiting: 0 },",
			"  entries: [",
			"    {",
			"      num: 11,",
			"      date: '2026-04-10',",
			"      company: 'Cadence Co',",
			"      role: 'Applied Engineer',",
			"      status: 'applied',",
			"      score: '4.3/5',",
			"      reportPath: null,",
			"      contacts: [],",
			"      daysSinceApplication: 12,",
			"      daysSinceLastFollowup: null,",
			"      followupCount: 0,",
			"      urgency: 'overdue',",
			"      nextFollowupDate: '2026-04-17',",
			"      daysUntilNext: -5",
			"    }",
			"  ],",
			"  cadenceConfig: { applied_first: 7, applied_subsequent: 7, applied_max_followups: 2, responded_initial: 1, responded_subsequent: 3, interview_thankyou: 1 }",
			"}, null, 2));",
		].join("\n"),
	});
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveTrackerSpecialistSession(store, {
		activeJobId: "job-follow-up-waiting",
		sessionId: "follow-up-waiting",
		status: "waiting",
		timestamp: "2026-04-22T09:10:00.000Z",
		workflow: "follow-up-cadence",
	});
	await saveTrackerSpecialistJob(store, {
		jobId: "job-follow-up-waiting",
		sessionId: "follow-up-waiting",
		status: "waiting",
		timestamp: "2026-04-22T09:10:00.000Z",
		waitApprovalId: "approval-follow-up-waiting",
		waitReason: "approval",
		workflow: "follow-up-cadence",
	});
	await saveApproval(store, {
		approvalId: "approval-follow-up-waiting",
		jobId: "job-follow-up-waiting",
		sessionId: "follow-up-waiting",
		status: "pending",
		timestamp: "2026-04-22T09:10:00.000Z",
		title: "Review follow-up scope",
	});
	await stageFollowUpPacket(services, "follow-up-waiting");

	try {
		const waitingPayload = await createTrackerSpecialistSummary(services, {
			mode: "follow-up-cadence",
		});

		assert.equal(waitingPayload.selected.origin, "mode");
		assert.equal(waitingPayload.selected.summary?.state, "waiting");
		assert.equal(waitingPayload.selected.summary?.approval?.status, "pending");
		assert.equal(
			waitingPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "approval-paused",
			),
			true,
		);

		const stalePayload = await createTrackerSpecialistSummary(services, {
			mode: "rejection-patterns",
			sessionId: "follow-up-waiting",
		});
		assert.equal(stalePayload.selected.state, "missing");
		assert.equal(
			stalePayload.selected.summary?.workflow.mode,
			"rejection-patterns",
		);
		assert.equal(
			stalePayload.selected.summary?.warnings.some(
				(warning) => warning.code === "stale-selection",
			),
			true,
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("tracker-specialist summary covers completed, degraded, and resumed outcomes", async () => {
	const fixture = await createReadyFixture({
		"data/applications.md": [
			"# Applications Tracker",
			"",
			"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
			"| 1 | 2026-04-20 | North Co | Staff AI Engineer | 4.7/5 | Offer | output/north.pdf | [051](reports/051-north-co-2026-04-20.md) | notes |",
			"| 2 | 2026-04-21 | South Co | Principal Platform Engineer | 4.5/5 | Offer | output/south.pdf | [052](reports/052-south-co-2026-04-21.md) | notes |",
			"",
		].join("\n"),
		"output/north.pdf": "pdf\n",
		"output/south.pdf": "pdf\n",
		"reports/051-north-co-2026-04-20.md": [
			"# Evaluation: North Co -- Staff AI Engineer",
			"",
			"**Date:** 2026-04-20",
			"**URL:** https://example.com/north",
			"**Score:** 4.7/5",
			"**Legitimacy:** High Confidence",
			"**PDF:** output/north.pdf",
			"",
			"---",
			"",
		].join("\n"),
		"reports/052-south-co-2026-04-21.md": [
			"# Evaluation: South Co -- Principal Platform Engineer",
			"",
			"**Date:** 2026-04-21",
			"**URL:** https://example.com/south",
			"**Score:** 4.5/5",
			"**Legitimacy:** Proceed with Caution",
			"**PDF:** output/south.pdf",
			"",
			"---",
			"",
		].join("\n"),
		"scripts/followup-cadence.mjs": [
			"process.stdout.write(JSON.stringify({",
			"  metadata: { analysisDate: '2026-04-22', totalTracked: 4, actionable: 1, overdue: 1, urgent: 0, cold: 0, waiting: 0 },",
			"  entries: [",
			"    {",
			"      num: 5,",
			"      date: '2026-04-11',",
			"      company: 'Resume Co',",
			"      role: 'Applied Engineer',",
			"      status: 'applied',",
			"      score: '4.0/5',",
			"      reportPath: null,",
			"      contacts: [],",
			"      daysSinceApplication: 11,",
			"      daysSinceLastFollowup: null,",
			"      followupCount: 0,",
			"      urgency: 'overdue',",
			"      nextFollowupDate: '2026-04-18',",
			"      daysUntilNext: -4",
			"    }",
			"  ],",
			"  cadenceConfig: { applied_first: 7, applied_subsequent: 7, applied_max_followups: 2, responded_initial: 1, responded_subsequent: 3, interview_thankyou: 1 }",
			"}, null, 2));",
		].join("\n"),
		"scripts/analyze-patterns.mjs": "process.stdout.write('not-json\\n');\n",
	});
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveTrackerSpecialistSession(store, {
		activeJobId: "job-compare-completed",
		sessionId: "compare-completed",
		status: "completed",
		timestamp: "2026-04-22T10:00:00.000Z",
		workflow: "compare-offers",
	});
	await saveTrackerSpecialistJob(store, {
		jobId: "job-compare-completed",
		sessionId: "compare-completed",
		status: "completed",
		timestamp: "2026-04-22T10:00:00.000Z",
		workflow: "compare-offers",
	});
	await stageCompareOffersPacket(services, "compare-completed");

	await saveTrackerSpecialistSession(store, {
		activeJobId: "job-patterns-completed",
		sessionId: "patterns-completed",
		status: "completed",
		timestamp: "2026-04-22T10:05:00.000Z",
		workflow: "rejection-patterns",
	});
	await saveTrackerSpecialistJob(store, {
		jobId: "job-patterns-completed",
		sessionId: "patterns-completed",
		status: "completed",
		timestamp: "2026-04-22T10:05:00.000Z",
		workflow: "rejection-patterns",
	});
	await stagePatternPacket(services, "patterns-completed");

	await saveTrackerSpecialistSession(store, {
		activeJobId: "job-follow-up-resumed",
		sessionId: "follow-up-resumed",
		status: "running",
		timestamp: "2026-04-22T10:10:00.000Z",
		workflow: "follow-up-cadence",
	});
	await saveTrackerSpecialistJob(store, {
		jobId: "job-follow-up-resumed",
		sessionId: "follow-up-resumed",
		status: "running",
		timestamp: "2026-04-22T10:10:00.000Z",
		workflow: "follow-up-cadence",
	});
	await stageFollowUpPacket(services, "follow-up-resumed");
	await saveFailureEvent(store, {
		jobId: "job-follow-up-resumed",
		message: "Earlier run timed out before retry.",
		sessionId: "follow-up-resumed",
		timestamp: "2026-04-22T10:09:00.000Z",
	});

	try {
		const completedPayload = await createTrackerSpecialistSummary(services, {
			sessionId: "compare-completed",
		});
		assert.equal(completedPayload.selected.summary?.state, "completed");
		assert.equal(
			completedPayload.selected.summary?.packet?.resultStatus,
			"ready",
		);

		const degradedPayload = await createTrackerSpecialistSummary(services, {
			sessionId: "patterns-completed",
		});
		assert.equal(degradedPayload.selected.summary?.state, "degraded");
		assert.equal(
			degradedPayload.selected.summary?.packet?.resultStatus,
			"degraded",
		);

		const resumedPayload = await createTrackerSpecialistSummary(services, {
			sessionId: "follow-up-resumed",
		});
		assert.equal(resumedPayload.selected.summary?.state, "resumed");
		assert.equal(resumedPayload.selected.summary?.run.state, "running");
		assert.equal(
			resumedPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "recent-failure",
			),
			true,
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

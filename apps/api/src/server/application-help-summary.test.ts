import assert from "node:assert/strict";
import test from "node:test";
import type { AgentRuntimeService } from "../agent-runtime/index.js";
import { WORKFLOW_INTENTS } from "../prompt/prompt-types.js";
import { createApiServiceContainer } from "../runtime/service-container.js";
import type {
	OperationalStore,
	RuntimeJobStatus,
	RuntimeSessionStatus,
} from "../store/index.js";
import { createWorkspaceFixture } from "../workspace/test-utils.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import { createApplicationHelpSummary } from "./application-help-summary.js";

function createReadyAgentRuntime(repoRoot: string): AgentRuntimeService {
	return {
		async bootstrap() {
			throw new Error(
				"bootstrap is not used by application-help summary tests",
			);
		},
		async close() {},
		async getReadiness() {
			return {
				auth: {
					accountId: "acct-application-help-test",
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
					originator: "application-help-summary-test",
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
					modeRepoRelativePath: "modes/apply.md",
					requestedWorkflow: "application-help",
					state: "ready" as const,
					supportedWorkflows: WORKFLOW_INTENTS,
					workflow: "application-help" as const,
				},
				status: "ready" as const,
			};
		},
	};
}

async function createReadyFixture() {
	return createWorkspaceFixture({
		directories: ["output", "reports"],
		files: {
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"config/profile.yml": "full_name: Test User\n",
			"modes/_profile.md": "# Profile\n",
			"output/cv-context-co-2026-04-22.pdf": "pdf\n",
			"profile/cv.md": "# CV\n",
			"reports/021-context-co-2026-04-22.md": [
				"# Evaluation: Context Co -- Applied AI Engineer",
				"",
				"**Date:** 2026-04-22",
				"**URL:** https://example.com/jobs/context-co",
				"**Archetype:** Applied AI",
				"**Score:** 4.4/5",
				"**Legitimacy:** High Confidence",
				"**PDF:** output/cv-context-co-2026-04-22.pdf",
				"",
				"---",
				"",
				"## H) Draft Application Answers",
				"",
				"No cover-letter field was detected on the application page.",
				"",
				"### 1. Why this role?",
				"",
				"Because it fits my production AI delivery work.",
				"",
			].join("\n"),
		},
	});
}

async function saveApplicationHelpSession(
	store: OperationalStore,
	input: {
		activeJobId?: string | null;
		context?: JsonValue;
		sessionId: string;
		status: RuntimeSessionStatus;
		timestamp: string;
	},
): Promise<void> {
	await store.sessions.save({
		activeJobId: input.activeJobId ?? null,
		context: input.context ?? {
			applicationHelp: {
				company: "Context Co",
				reportNumber: "021",
				role: "Applied AI Engineer",
			},
		},
		createdAt: input.timestamp,
		lastHeartbeatAt: input.timestamp,
		runnerId:
			input.status === "pending" || input.activeJobId === null
				? null
				: "runner-application-help-summary-test",
		sessionId: input.sessionId,
		status: input.status,
		updatedAt: input.timestamp,
		workflow: "application-help",
	});
}

async function saveApplicationHelpJob(
	store: OperationalStore,
	input: {
		error?: JsonValue | null;
		jobId: string;
		sessionId: string;
		status: RuntimeJobStatus;
		timestamp: string;
		waitApprovalId?: string | null;
		waitReason?: "approval" | "retry" | null;
	},
): Promise<void> {
	const isActive = input.status === "running" || input.status === "waiting";

	await store.jobs.save({
		attempt: 1,
		claimOwnerId: isActive ? "runner-application-help-summary-test" : null,
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
		jobType: "application-help",
		lastHeartbeatAt: isActive ? input.timestamp : null,
		leaseExpiresAt: input.status === "running" ? input.timestamp : null,
		maxAttempts: 3,
		nextAttemptAt: null,
		payload: {
			reportNumber: "021",
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
		message?: string | null;
		sessionId: string;
		status: "approved" | "pending" | "rejected";
		timestamp: string;
	},
): Promise<void> {
	await store.approvals.save({
		approvalId: input.approvalId,
		jobId: input.jobId,
		request: {
			action: "review-application-help-draft",
			title: "Review application-help draft",
		},
		requestedAt: input.timestamp,
		resolvedAt: input.status === "pending" ? null : input.timestamp,
		response:
			input.status === "pending"
				? null
				: {
						message:
							input.message ??
							(input.status === "approved"
								? "Approved"
								: "Draft needs revision"),
					},
		sessionId: input.sessionId,
		status: input.status,
		traceId: `${input.approvalId}-trace`,
		updatedAt: input.timestamp,
	});
}

async function stageDraftPacket(input: {
	reviewNotes: string;
	services: ReturnType<typeof createApiServiceContainer>;
	sessionId: string;
	warning?: string;
}): Promise<void> {
	const toolService = await input.services.tools.getService();

	await toolService.execute({
		correlation: {
			jobId: `tool-job-${input.sessionId}`,
			requestId: `tool-request-${input.sessionId}`,
			sessionId: `tool-session-${input.sessionId}`,
			traceId: `tool-trace-${input.sessionId}`,
		},
		input: {
			company: "Context Co",
			items: [
				{
					answer: "Draft answer for the application form.",
					question: "Why this role?",
				},
			],
			matchedContext: null,
			reviewNotes: input.reviewNotes,
			role: "Applied AI Engineer",
			sessionId: input.sessionId,
			warnings: input.warning ? [input.warning] : [],
		},
		toolName: "stage-application-help-draft",
	});
}

test("application-help summary returns an empty selection when no sessions exist", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});

	try {
		const payload = await createApplicationHelpSummary(services);

		assert.equal(payload.status, "ready");
		assert.equal(payload.selected.state, "empty");
		assert.equal(payload.selected.summary, null);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("application-help summary covers missing-context, no-draft-yet, approval-paused, rejected, resumed, and completed states", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveApplicationHelpSession(store, {
		context: {},
		sessionId: "app-help-missing",
		status: "pending",
		timestamp: "2026-04-22T09:00:00.000Z",
	});

	await saveApplicationHelpSession(store, {
		sessionId: "app-help-no-draft",
		status: "pending",
		timestamp: "2026-04-22T09:05:00.000Z",
	});

	await saveApplicationHelpSession(store, {
		activeJobId: "job-app-help-paused",
		sessionId: "app-help-paused",
		status: "waiting",
		timestamp: "2026-04-22T09:10:00.000Z",
	});
	await saveApplicationHelpJob(store, {
		jobId: "job-app-help-paused",
		sessionId: "app-help-paused",
		status: "waiting",
		timestamp: "2026-04-22T09:10:00.000Z",
		waitApprovalId: "approval-app-help-paused",
		waitReason: "approval",
	});
	await saveApproval(store, {
		approvalId: "approval-app-help-paused",
		jobId: "job-app-help-paused",
		sessionId: "app-help-paused",
		status: "pending",
		timestamp: "2026-04-22T09:10:00.000Z",
	});

	await saveApplicationHelpSession(store, {
		activeJobId: "job-app-help-rejected",
		sessionId: "app-help-rejected",
		status: "failed",
		timestamp: "2026-04-22T09:15:00.000Z",
	});
	await saveApplicationHelpJob(store, {
		error: {
			message: "Draft rejected during review.",
		},
		jobId: "job-app-help-rejected",
		sessionId: "app-help-rejected",
		status: "failed",
		timestamp: "2026-04-22T09:15:00.000Z",
	});
	await saveApproval(store, {
		approvalId: "approval-app-help-rejected",
		jobId: "job-app-help-rejected",
		message: "Please revise the proof points.",
		sessionId: "app-help-rejected",
		status: "rejected",
		timestamp: "2026-04-22T09:15:00.000Z",
	});

	await saveApplicationHelpSession(store, {
		activeJobId: "job-app-help-resumed",
		sessionId: "app-help-resumed",
		status: "running",
		timestamp: "2026-04-22T09:20:00.000Z",
	});
	await saveApplicationHelpJob(store, {
		jobId: "job-app-help-resumed",
		sessionId: "app-help-resumed",
		status: "running",
		timestamp: "2026-04-22T09:20:00.000Z",
	});

	await saveApplicationHelpSession(store, {
		sessionId: "app-help-completed",
		status: "completed",
		timestamp: "2026-04-22T09:25:00.000Z",
	});
	await saveApplicationHelpJob(store, {
		jobId: "job-app-help-completed",
		sessionId: "app-help-completed",
		status: "completed",
		timestamp: "2026-04-22T09:25:00.000Z",
	});

	await stageDraftPacket({
		reviewNotes: "Waiting on approval.",
		services,
		sessionId: "app-help-paused",
		warning: "Double-check the leadership example.",
	});
	await stageDraftPacket({
		reviewNotes: "Rejected revision.",
		services,
		sessionId: "app-help-rejected",
	});
	await stageDraftPacket({
		reviewNotes: "Resumed run.",
		services,
		sessionId: "app-help-resumed",
	});
	await stageDraftPacket({
		reviewNotes: "Completed run.",
		services,
		sessionId: "app-help-completed",
	});

	try {
		const missingPayload = await createApplicationHelpSummary(services, {
			sessionId: "app-help-missing",
		});
		assert.equal(missingPayload.selected.summary?.state, "missing-context");
		assert.equal(missingPayload.selected.summary?.reportContext, null);

		const noDraftPayload = await createApplicationHelpSummary(services, {
			sessionId: "app-help-no-draft",
		});
		assert.equal(noDraftPayload.selected.summary?.state, "no-draft-yet");
		assert.equal(
			noDraftPayload.selected.summary?.reportContext?.reportRepoRelativePath,
			"reports/021-context-co-2026-04-22.md",
		);

		const pausedPayload = await createApplicationHelpSummary(services, {
			sessionId: "app-help-paused",
		});
		assert.equal(pausedPayload.selected.summary?.state, "approval-paused");
		assert.equal(pausedPayload.selected.summary?.approval?.status, "pending");
		assert.equal(
			pausedPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "approval-paused",
			),
			true,
		);

		const rejectedPayload = await createApplicationHelpSummary(services, {
			sessionId: "app-help-rejected",
		});
		assert.equal(rejectedPayload.selected.summary?.state, "rejected");
		assert.equal(
			rejectedPayload.selected.summary?.failure?.message,
			"Please revise the proof points.",
		);

		const resumedPayload = await createApplicationHelpSummary(services, {
			sessionId: "app-help-resumed",
		});
		assert.equal(resumedPayload.selected.summary?.state, "resumed");
		assert.equal(resumedPayload.selected.summary?.job?.status, "running");
		assert.equal(
			resumedPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "resumable-session",
			),
			true,
		);

		const completedPayload = await createApplicationHelpSummary(services, {
			sessionId: "app-help-completed",
		});
		assert.equal(completedPayload.selected.summary?.state, "completed");
		assert.equal(completedPayload.selected.summary?.job?.status, "completed");
		assert.equal(
			completedPayload.selected.summary?.draftPacket?.reviewNotes,
			"Completed run.",
		);

		const latestPayload = await createApplicationHelpSummary(services);
		assert.equal(latestPayload.selected.origin, "latest");
		assert.equal(
			latestPayload.selected.summary?.session.sessionId,
			"app-help-completed",
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

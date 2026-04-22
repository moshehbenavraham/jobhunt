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
	RuntimeSessionStatus,
} from "../store/index.js";
import { createWorkspaceFixture } from "../workspace/test-utils.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import { createSpecialistWorkspaceSummary } from "./specialist-workspace-summary.js";

function createReadyAgentRuntime(repoRoot: string): AgentRuntimeService {
	return {
		async bootstrap(): Promise<AgentRuntimeBootstrap> {
			throw new Error(
				"bootstrap is not used by specialist workspace summary tests",
			);
		},
		async close() {},
		async getReadiness() {
			return {
				auth: {
					accountId: "acct-specialist-workspace-test",
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
					originator: "specialist-workspace-summary-test",
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
		files: {
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"config/profile.yml": "full_name: Test User\n",
			"modes/_profile.md": "# Profile\n",
			"profile/cv.md": "# CV\n",
		},
	});
}

async function saveSpecialistSession(
	store: OperationalStore,
	input: {
		activeJobId?: string | null;
		context?: JsonValue;
		sessionId: string;
		status: RuntimeSessionStatus;
		timestamp: string;
		workflow:
			| "application-help"
			| "compare-offers"
			| "deep-company-research"
			| "follow-up-cadence"
			| "interview-prep"
			| "linkedin-outreach"
			| "project-review"
			| "rejection-patterns"
			| "training-review";
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
				: "runner-specialist-summary-test",
		sessionId: input.sessionId,
		status: input.status,
		updatedAt: input.timestamp,
		workflow: input.workflow,
	});
}

async function saveSpecialistJob(
	store: OperationalStore,
	input: {
		error?: JsonValue | null;
		jobId: string;
		sessionId: string;
		status: RuntimeJobStatus;
		timestamp: string;
		waitApprovalId?: string | null;
		waitReason?: "approval" | "retry" | null;
		workflow:
			| "application-help"
			| "deep-company-research"
			| "interview-prep"
			| "project-review";
	},
): Promise<void> {
	const isActive = input.status === "running" || input.status === "waiting";

	await store.jobs.save({
		attempt: 1,
		claimOwnerId: isActive ? "runner-specialist-summary-test" : null,
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
			action: "specialist-review",
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

test("specialist workspace summary returns the inventory and falls back to the first ready workflow when no sessions exist", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});

	try {
		const payload = await createSpecialistWorkspaceSummary(services);

		assert.equal(payload.status, "ready");
		assert.equal(payload.workflows.length, 9);
		assert.deepEqual(
			payload.workflows.slice(0, 4).map((workflow) => workflow.handoff.mode),
			[
				"compare-offers",
				"follow-up-cadence",
				"rejection-patterns",
				"application-help",
			],
		);
		assert.equal(payload.selected.origin, "catalog");
		assert.equal(payload.selected.summary?.handoff.mode, "compare-offers");
		assert.equal(payload.selected.summary?.run.state, "idle");
		assert.equal(payload.selected.summary?.result.state, "dedicated-detail");
		assert.equal(
			payload.selected.summary?.nextAction.action,
			"open-detail-surface",
		);
		assert.equal(
			payload.selected.summary?.handoff.detailSurface?.path,
			"/tracker-specialist",
		);
		assert.equal(
			payload.workflows.find(
				(workflow) => workflow.handoff.mode === "compare-offers",
			)?.supportState,
			"ready",
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("specialist workspace summary applies latest-session selection, stale-session recovery, and shared running or waiting overlays", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveSpecialistSession(store, {
		activeJobId: "job-deep-running",
		sessionId: "deep-running",
		status: "running",
		timestamp: "2026-04-22T09:10:00.000Z",
		workflow: "deep-company-research",
	});
	await saveSpecialistJob(store, {
		jobId: "job-deep-running",
		sessionId: "deep-running",
		status: "running",
		timestamp: "2026-04-22T09:10:00.000Z",
		workflow: "deep-company-research",
	});

	await saveSpecialistSession(store, {
		activeJobId: "job-interview-waiting",
		sessionId: "interview-waiting",
		status: "waiting",
		timestamp: "2026-04-22T09:20:00.000Z",
		workflow: "interview-prep",
	});
	await saveSpecialistJob(store, {
		jobId: "job-interview-waiting",
		sessionId: "interview-waiting",
		status: "waiting",
		timestamp: "2026-04-22T09:20:00.000Z",
		waitApprovalId: "approval-interview-waiting",
		waitReason: "approval",
		workflow: "interview-prep",
	});
	await saveApproval(store, {
		approvalId: "approval-interview-waiting",
		jobId: "job-interview-waiting",
		sessionId: "interview-waiting",
		status: "pending",
		timestamp: "2026-04-22T09:20:00.000Z",
		title: "Review interview prep scope",
	});

	try {
		const latestPayload = await createSpecialistWorkspaceSummary(services);
		assert.equal(latestPayload.selected.origin, "latest-session");
		assert.equal(
			latestPayload.selected.summary?.handoff.mode,
			"interview-prep",
		);
		assert.equal(
			latestPayload.selected.summary?.handoff.detailSurface?.path,
			"/research-specialist",
		);
		assert.equal(latestPayload.selected.summary?.run.state, "waiting");
		assert.equal(latestPayload.selected.summary?.approval?.status, "pending");
		assert.equal(
			latestPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "approval-paused",
			),
			true,
		);

		const stalePayload = await createSpecialistWorkspaceSummary(services, {
			mode: "interview-prep",
			sessionId: "deep-running",
		});
		assert.equal(stalePayload.selected.origin, "mode");
		assert.equal(stalePayload.selected.state, "missing");
		assert.equal(stalePayload.selected.summary?.handoff.mode, "interview-prep");
		assert.equal(stalePayload.selected.summary?.run.state, "waiting");
		assert.equal(
			stalePayload.selected.summary?.warnings.some(
				(warning) => warning.code === "stale-selection",
			),
			true,
		);

		const runningPayload = await createSpecialistWorkspaceSummary(services, {
			mode: "deep-company-research",
		});
		assert.equal(runningPayload.selected.summary?.run.state, "running");
		assert.equal(runningPayload.selected.summary?.job?.status, "running");
		assert.equal(
			runningPayload.selected.summary?.handoff.detailSurface?.path,
			"/research-specialist",
		);
		assert.equal(
			runningPayload.selected.summary?.result.state,
			"dedicated-detail",
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("specialist workspace summary covers completed dedicated-detail and degraded failure states", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveSpecialistSession(store, {
		activeJobId: "job-app-help-completed",
		sessionId: "app-help-completed",
		status: "completed",
		timestamp: "2026-04-22T09:30:00.000Z",
		workflow: "application-help",
	});
	await saveSpecialistJob(store, {
		jobId: "job-app-help-completed",
		sessionId: "app-help-completed",
		status: "completed",
		timestamp: "2026-04-22T09:30:00.000Z",
		workflow: "application-help",
	});

	await saveSpecialistSession(store, {
		activeJobId: "job-project-failed",
		sessionId: "project-failed",
		status: "failed",
		timestamp: "2026-04-22T09:25:00.000Z",
		workflow: "project-review",
	});
	await saveSpecialistJob(store, {
		error: {
			message: "Project review worker failed.",
		},
		jobId: "job-project-failed",
		sessionId: "project-failed",
		status: "failed",
		timestamp: "2026-04-22T09:25:00.000Z",
		workflow: "project-review",
	});
	await saveFailureEvent(store, {
		jobId: "job-project-failed",
		message: "Project review worker failed.",
		sessionId: "project-failed",
		timestamp: "2026-04-22T09:25:00.000Z",
	});

	try {
		const completedPayload = await createSpecialistWorkspaceSummary(services, {
			sessionId: "app-help-completed",
		});
		assert.equal(completedPayload.selected.origin, "session-id");
		assert.equal(completedPayload.selected.summary?.run.state, "completed");
		assert.equal(
			completedPayload.selected.summary?.result.state,
			"dedicated-detail",
		);
		assert.equal(
			completedPayload.selected.summary?.nextAction.action,
			"open-detail-surface",
		);

		const degradedPayload = await createSpecialistWorkspaceSummary(services, {
			sessionId: "project-failed",
		});
		assert.equal(degradedPayload.selected.origin, "session-id");
		assert.equal(degradedPayload.selected.summary?.run.state, "degraded");
		assert.equal(
			degradedPayload.selected.summary?.failure?.message,
			"Project review worker failed.",
		);
		assert.equal(
			degradedPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "recent-failure",
			),
			true,
		);
		assert.equal(
			degradedPayload.selected.summary?.result.state,
			"dedicated-detail",
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

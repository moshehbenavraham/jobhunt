import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
	type AgentRuntimeBootstrap,
	AgentRuntimeBootstrapError,
} from "../agent-runtime/index.js";
import {
	getWorkflowModeRoute,
	type PromptSourceKey,
	WORKFLOW_INTENTS,
	type WorkflowIntent,
} from "../prompt/index.js";
import { createOperationalStore } from "../store/index.js";
import { createToolRegistry } from "../tools/index.js";
import { createWorkspaceFixture } from "../workspace/test-utils.js";
import { OrchestrationError } from "./orchestration-contract.js";
import { createOrchestrationService } from "./orchestration-service.js";
import { getWorkflowSpecialistRoute } from "./specialist-catalog.js";

function createTestTool(name: string) {
	return {
		description: `Tool ${name}`,
		async execute() {
			return {
				output: {
					ok: true,
				},
			};
		},
		inputSchema: z.object({}),
		name,
	};
}

function createRegistryForWorkflow(workflow: WorkflowIntent) {
	const route = getWorkflowSpecialistRoute(workflow);

	if (!route) {
		throw new Error(`Missing specialist route for ${workflow}.`);
	}

	const toolNames = new Set<string>([
		...route.toolPolicy.allowedToolNames,
		...(route.toolPolicy.restrictedToolNames ?? []),
		...(route.toolPolicy.fallbackToolNames ?? []),
	]);

	return createToolRegistry(
		[...toolNames].sort().map((toolName) => createTestTool(toolName)),
	);
}

function createReadyBootstrap(
	workflow: WorkflowIntent,
	closeState: { count: number },
): AgentRuntimeBootstrap {
	const sourceOrder: PromptSourceKey[] = [
		"agents-guide",
		"shared-mode",
		"profile-mode",
		"workflow-mode",
		"profile-config",
		"profile-cv",
	];

	return {
		auth: {
			accountId: "account-test",
			authPath: "/tmp/openai-account-auth.json",
			expiresAt: null,
			message: "Runtime ready.",
			nextSteps: [],
			state: "ready",
			updatedAt: "2026-04-21T12:00:00.000Z",
		},
		config: {
			authPath: "/tmp/openai-account-auth.json",
			baseUrl: "https://chatgpt.com/backend-api",
			model: "gpt-5.4-mini",
			originator: "pi",
			overrides: {
				authPath: false,
				baseUrl: false,
				model: false,
				originator: false,
			},
		},
		model: "gpt-5.4-mini",
		prompt: {
			emptySources: [],
			issues: [],
			message: `Prompt bundle for workflow ${workflow} is ready.`,
			missingSources: [],
			modeRepoRelativePath: getWorkflowModeRoute(workflow).modeRepoRelativePath,
			requestedWorkflow: workflow,
			state: "ready",
			supportedWorkflows: WORKFLOW_INTENTS,
			workflow,
		},
		promptBundle: {
			cacheMode: "read-through-mtime",
			composedText: `Prompt bundle for ${workflow}`,
			loadedAt: "2026-04-21T12:00:00.000Z",
			sourceOrder,
			sources: [],
			workflow: getWorkflowModeRoute(workflow),
		},
		provider: {
			async close() {
				closeState.count += 1;
			},
			getModel() {
				return {
					id: "gpt-5.4-mini",
				};
			},
		},
		startedAt: "2026-04-21T12:00:01.000Z",
		status: "ready",
	};
}

function createAuthRequiredError() {
	return new AgentRuntimeBootstrapError(
		"auth-required",
		"Stored OpenAI account credentials are required.",
		{
			auth: {
				accountId: null,
				authPath: "/tmp/openai-account-auth.json",
				expiresAt: null,
				message: "Stored OpenAI account credentials are required.",
				nextSteps: ["npm run auth:openai -- login"],
				state: "auth-required",
				updatedAt: null,
			},
		},
	);
}

async function createServiceHarness(workflow: WorkflowIntent) {
	const fixture = await createWorkspaceFixture();
	const store = await createOperationalStore({
		repoRoot: fixture.repoRoot,
	});

	return {
		async cleanup() {
			await store.close();
			await fixture.cleanup();
		},
		fixture,
		store,
		workflow,
	};
}

test("orchestration service creates a ready launch handoff and closes the bootstrap provider", async () => {
	const harness = await createServiceHarness("single-evaluation");
	const closeState = {
		count: 0,
	};
	const service = createOrchestrationService({
		bootstrapWorkflow: async (workflow) =>
			createReadyBootstrap(workflow, closeState),
		getStore: async () => harness.store,
		getToolRegistry: () => createRegistryForWorkflow("single-evaluation"),
		now: () => Date.parse("2026-04-21T12:00:00.000Z"),
	});

	try {
		const result = await service.orchestrate({
			context: {
				origin: "test",
			},
			kind: "launch",
			sessionId: "session-ready",
			workflow: "single-evaluation",
		});

		assert.equal(result.route.status, "ready");
		assert.equal(result.runtime.status, "ready");
		assert.equal(result.specialist?.id, "evaluation-specialist");
		assert.equal(result.session?.sessionId, "session-ready");
		assert.equal(result.session?.reused, false);
		assert.equal(closeState.count, 1);
		assert.deepEqual(
			result.specialist?.toolCatalog.map((entry) => entry.name),
			[
				"bootstrap-single-evaluation",
				"check-job-liveness",
				"check-job-liveness-batch",
				"extract-ats-job",
				"generate-ats-pdf",
				"list-evaluation-artifacts",
				"merge-tracker-additions",
				"normalize-raw-job-description",
				"reserve-report-artifact",
				"stage-tracker-addition",
				"verify-tracker-pipeline",
				"write-report-artifact",
			],
		);
	} finally {
		await harness.cleanup();
	}
});

test("orchestration service sanitizes evaluation launch context before persisting the session", async () => {
	const harness = await createServiceHarness("auto-pipeline");
	const closeState = {
		count: 0,
	};
	const service = createOrchestrationService({
		bootstrapWorkflow: async (workflow) =>
			createReadyBootstrap(workflow, closeState),
		getStore: async () => harness.store,
		getToolRegistry: () => createRegistryForWorkflow("auto-pipeline"),
		now: () => Date.parse("2026-04-21T12:30:00.000Z"),
	});

	try {
		await service.orchestrate({
			context: {
				promptText:
					"Lead platform engineer role with distributed systems ownership.",
			},
			kind: "launch",
			sessionId: "session-sanitized-auto",
			workflow: "auto-pipeline",
		});
		const storedSession = await harness.store.sessions.getById(
			"session-sanitized-auto",
		);
		const storedContext = storedSession?.context as Record<string, unknown>;

		assert.equal(storedContext.promptText, undefined);
		assert.deepEqual(storedContext.evaluationLaunch, {
			canonicalUrl: null,
			host: null,
			kind: "raw-jd",
			promptRedacted: true,
		});
	} finally {
		await harness.cleanup();
	}
});

test("orchestration service leaves non-evaluation launch context unchanged", async () => {
	const harness = await createServiceHarness("scan-portals");
	const closeState = {
		count: 0,
	};
	const service = createOrchestrationService({
		bootstrapWorkflow: async (workflow) =>
			createReadyBootstrap(workflow, closeState),
		getStore: async () => harness.store,
		getToolRegistry: () => createRegistryForWorkflow("scan-portals"),
		now: () => Date.parse("2026-04-21T12:35:00.000Z"),
	});

	try {
		await service.orchestrate({
			context: {
				query: "staff platform engineer remote",
			},
			kind: "launch",
			sessionId: "session-scan-context",
			workflow: "scan-portals",
		});
		const storedSession = await harness.store.sessions.getById(
			"session-scan-context",
		);
		const storedContext = storedSession?.context as Record<string, unknown>;

		assert.equal(storedContext.query, "staff platform engineer remote");
		assert.equal(storedContext.evaluationLaunch, undefined);
	} finally {
		await harness.cleanup();
	}
});

test("orchestration service reuses sessions and surfaces active approval state on resume", async () => {
	const harness = await createServiceHarness("scan-portals");
	const closeState = {
		count: 0,
	};
	const service = createOrchestrationService({
		bootstrapWorkflow: async (workflow) =>
			createReadyBootstrap(workflow, closeState),
		getStore: async () => harness.store,
		getToolRegistry: () => createRegistryForWorkflow("scan-portals"),
		now: () => Date.parse("2026-04-21T12:00:00.000Z"),
	});

	try {
		await harness.store.sessions.save({
			activeJobId: "job-resume",
			context: {},
			createdAt: "2026-04-21T12:00:00.000Z",
			lastHeartbeatAt: null,
			runnerId: null,
			sessionId: "session-resume",
			status: "waiting",
			updatedAt: "2026-04-21T12:00:00.000Z",
			workflow: "scan-portals",
		});
		await harness.store.jobs.save({
			attempt: 1,
			claimOwnerId: null,
			claimToken: null,
			completedAt: null,
			createdAt: "2026-04-21T12:00:00.000Z",
			currentRunId: "job-resume-run",
			error: null,
			jobId: "job-resume",
			jobType: "scan-portals",
			lastHeartbeatAt: null,
			leaseExpiresAt: null,
			maxAttempts: 3,
			nextAttemptAt: null,
			payload: {},
			result: null,
			retryBackoffMs: 1_000,
			sessionId: "session-resume",
			startedAt: "2026-04-21T12:01:00.000Z",
			status: "waiting",
			updatedAt: "2026-04-21T12:02:00.000Z",
			waitApprovalId: "approval-resume",
			waitReason: "approval",
		});
		await harness.store.approvals.save({
			approvalId: "approval-resume",
			jobId: "job-resume",
			request: {
				action: "approve-scan",
				title: "Approve scan resume",
			},
			requestedAt: "2026-04-21T12:03:00.000Z",
			resolvedAt: null,
			response: null,
			sessionId: "session-resume",
			status: "pending",
			traceId: "trace-approval-resume",
			updatedAt: "2026-04-21T12:03:00.000Z",
		});

		const result = await service.orchestrate({
			kind: "resume",
			sessionId: "session-resume",
		});

		assert.equal(result.session?.reused, true);
		assert.equal(result.job?.jobId, "job-resume");
		assert.equal(result.pendingApproval?.approvalId, "approval-resume");
		assert.equal(result.pendingApproval?.action, "approve-scan");
		assert.equal(closeState.count, 1);
	} finally {
		await harness.cleanup();
	}
});

test("orchestration service returns deterministic tooling-gap handoffs with restricted tools", async () => {
	const harness = await createServiceHarness("tracker-status");
	const closeState = {
		count: 0,
	};
	const service = createOrchestrationService({
		bootstrapWorkflow: async (workflow) =>
			createReadyBootstrap(workflow, closeState),
		getStore: async () => harness.store,
		getToolRegistry: () => createRegistryForWorkflow("tracker-status"),
		now: () => Date.parse("2026-04-21T12:00:00.000Z"),
	});

	try {
		const result = await service.orchestrate({
			kind: "launch",
			sessionId: "session-gap",
			workflow: "tracker-status",
		});

		assert.equal(result.route.status, "tooling-gap");
		assert.ok(result.toolingGap);
		assert.ok((result.toolingGap?.missingCapabilities.length ?? 0) > 0);
		assert.ok(
			result.specialist?.toolCatalog.every(
				(entry) => entry.access === "restricted",
			),
		);
		assert.equal(closeState.count, 1);
	} finally {
		await harness.cleanup();
	}
});

test("orchestration service returns blocked runtime readiness without failing the session for expected bootstrap errors", async () => {
	const harness = await createServiceHarness("single-evaluation");
	const service = createOrchestrationService({
		bootstrapWorkflow: async () => {
			throw createAuthRequiredError();
		},
		getStore: async () => harness.store,
		getToolRegistry: () => createRegistryForWorkflow("single-evaluation"),
		now: () => Date.parse("2026-04-21T12:00:00.000Z"),
	});

	try {
		const result = await service.orchestrate({
			kind: "launch",
			sessionId: "session-auth",
			workflow: "single-evaluation",
		});
		const storedSession = await harness.store.sessions.getById("session-auth");

		assert.equal(result.runtime.status, "blocked");
		if (result.runtime.status === "blocked") {
			assert.equal(result.runtime.code, "auth-required");
		}
		assert.equal(storedSession?.status, "pending");
	} finally {
		await harness.cleanup();
	}
});

test("orchestration service compensates by marking the session failed on unexpected bootstrap errors", async () => {
	const harness = await createServiceHarness("single-evaluation");
	const service = createOrchestrationService({
		bootstrapWorkflow: async () => {
			throw new Error("bootstrap exploded");
		},
		getStore: async () => harness.store,
		getToolRegistry: () => createRegistryForWorkflow("single-evaluation"),
		now: () => Date.parse("2026-04-21T12:00:00.000Z"),
	});

	try {
		await assert.rejects(
			() =>
				service.orchestrate({
					kind: "launch",
					sessionId: "session-failure",
					workflow: "single-evaluation",
				}),
			(error: unknown) => {
				assert.ok(error instanceof OrchestrationError);
				assert.equal(error.code, "orchestration-bootstrap-failed");
				assert.equal(
					error.cause instanceof Error ? error.cause.message : null,
					"bootstrap exploded",
				);
				return true;
			},
		);

		const storedSession =
			await harness.store.sessions.getById("session-failure");

		assert.equal(storedSession?.status, "failed");
		assert.deepEqual(
			(storedSession?.context as Record<string, Record<string, unknown>>)
				.orchestrationFailure,
			{
				code: "orchestration-bootstrap-failed",
				failedAt: "2026-04-21T12:00:00.000Z",
				message:
					"Workflow bootstrap failed after retry attempts were exhausted.",
			},
		);
	} finally {
		await harness.cleanup();
	}
});

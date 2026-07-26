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
import { createBatchSupervisorSummary } from "./batch-supervisor-summary.js";

function createReadyAgentRuntime(repoRoot: string): AgentRuntimeService {
	return {
		async bootstrap() {
			throw new Error(
				"bootstrap is not used by batch-supervisor summary tests",
			);
		},
		async close() {},
		async getReadiness() {
			return {
				auth: {
					accountId: "acct-batch-supervisor-test",
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
					originator: "batch-supervisor-summary-test",
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
					modeRepoRelativePath: "modes/batch.md",
					requestedWorkflow: "batch-evaluation",
					state: "ready" as const,
					supportedWorkflows: WORKFLOW_INTENTS,
					workflow: "batch-evaluation" as const,
				},
				status: "ready" as const,
			};
		},
	};
}

async function createReadyFixture() {
	return createWorkspaceFixture({
		directories: ["batch/logs", "batch/tracker-additions", "output", "reports"],
		files: {
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"config/profile.yml": "full_name: Test User\n",
			"modes/_profile.md": "# Profile\n",
			"profile/cv.md": "# CV\n",
		},
	});
}

async function saveBatchSession(
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
		context: input.context ?? { workflow: "batch-evaluation" },
		createdAt: input.timestamp,
		lastHeartbeatAt: input.timestamp,
		runnerId:
			input.status === "pending" || input.activeJobId === null
				? null
				: "runner-batch-summary-test",
		sessionId: input.sessionId,
		status: input.status,
		updatedAt: input.timestamp,
		workflow: "batch-evaluation",
	});
}

async function saveBatchJob(
	store: OperationalStore,
	input: {
		error?: JsonValue | null;
		jobId: string;
		payload?: JsonValue;
		result?: JsonValue | null;
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
		claimOwnerId: isActive ? "runner-batch-summary-test" : null,
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
		jobType: "batch-evaluation",
		lastHeartbeatAt: isActive ? input.timestamp : null,
		leaseExpiresAt: input.status === "running" ? input.timestamp : null,
		maxAttempts: 3,
		nextAttemptAt: null,
		payload: input.payload ?? {
			dryRun: false,
			maxRetries: 2,
			minScore: 0,
			mode: "run-pending",
			parallel: 1,
			startFromId: 0,
		},
		result: input.result ?? null,
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

test("batch-supervisor summary handles the empty draft and idle runtime state", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});

	try {
		const payload = await createBatchSupervisorSummary(services);

		assert.equal(payload.status, "ready");
		assert.equal(payload.draft.available, false);
		assert.equal(payload.items.totalCount, 0);
		assert.equal(payload.run.state, "idle");
		assert.equal(payload.selectedDetail.state, "empty");
		assert.equal(
			payload.actions.find((action) => action.action === "resume-run-pending")
				?.available,
			false,
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("batch-supervisor summary joins draft rows, state overlays, sidecar detail, and action availability", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});

	await fixture.writeText(
		"batch/batch-input.tsv",
		[
			"id\turl\tsource\tnotes",
			"1\thttps://example.com/jobs/acme\tmanual\tretry this infrastructure miss",
			"2\thttps://example.com/jobs/beta\tmanual\tpartial result needs follow-up",
			"3\thttps://example.com/jobs/gamma\tmanual\tfresh pending row",
			"",
		].join("\n"),
	);
	await fixture.writeText(
		"batch/batch-state.tsv",
		[
			"id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries",
			"1\thttps://example.com/jobs/acme\tfailed\t2026-04-22T09:00:00.000Z\t2026-04-22T09:02:00.000Z\t001\t-\tinfrastructure: worker timeout\t1",
			"2\thttps://example.com/jobs/beta\tpartial\t2026-04-22T09:03:00.000Z\t2026-04-22T09:06:00.000Z\t002\t4.1\twarnings: tracker-not-written\t0",
			"",
		].join("\n"),
	);
	await fixture.writeText(
		"batch/logs/002-2.result.json",
		JSON.stringify(
			{
				company: "Beta",
				error: null,
				id: "2",
				legitimacy: "Proceed with Caution",
				pdf: null,
				report: "reports/002-beta-solutions-architect.md",
				report_num: "002",
				role: "Solutions Architect",
				score: 4.1,
				status: "partial",
				tracker: null,
				warnings: ["tracker-not-written"],
			},
			null,
			2,
		),
	);
	await fixture.writeText(
		"reports/002-beta-solutions-architect.md",
		"# Beta report\n",
	);
	await fixture.writeText(
		"batch/tracker-additions/9-ready.tsv",
		"9\t2026-04-22\tReady Co\tPlatform Engineer\tEvaluated\t4.5/5\t\t[009](reports/009-ready.md)\tready\n",
	);

	try {
		const payload = await createBatchSupervisorSummary(services, {
			itemId: 2,
		});

		assert.equal(payload.draft.available, true);
		assert.equal(payload.draft.totalCount, 3);
		assert.equal(payload.draft.counts.pending, 1);
		assert.equal(payload.draft.counts.retryableFailed, 1);
		assert.equal(payload.draft.firstRunnableItemId, 3);
		assert.equal(payload.items.totalCount, 3);
		assert.equal(payload.run.state, "idle");
		assert.equal(payload.selectedDetail.state, "ready");
		assert.equal(payload.selectedDetail.row?.status, "partial");
		assert.equal(payload.selectedDetail.row?.company, "Beta");
		assert.equal(
			payload.selectedDetail.row?.artifacts.report.repoRelativePath,
			"reports/002-beta-solutions-architect.md",
		);
		assert.equal(payload.selectedDetail.row?.artifacts.report.exists, true);
		assert.ok(
			payload.selectedDetail.row?.warnings.some(
				(warning) => warning.code === "partial-result",
			),
		);
		assert.equal(
			payload.statusOptions.find((option) => option.id === "retryable-failed")
				?.count,
			1,
		);
		assert.equal(
			payload.actions.find((action) => action.action === "resume-run-pending")
				?.available,
			true,
		);
		assert.equal(
			payload.actions.find((action) => action.action === "retry-failed")
				?.available,
			true,
		);
		assert.equal(
			payload.actions.find(
				(action) => action.action === "merge-tracker-additions",
			)?.available,
			true,
		);
		assert.equal(
			payload.actions.find(
				(action) => action.action === "verify-tracker-pipeline",
			)?.available,
			true,
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("batch-supervisor summary surfaces approval-paused runs, checkpoint overlays, and stale item focus", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await fixture.writeText(
		"batch/batch-input.tsv",
		[
			"id\turl\tsource\tnotes",
			"1\thttps://example.com/jobs/acme\tmanual\tapproval-held row",
			"2\thttps://example.com/jobs/beta\tmanual\tpending row",
			"",
		].join("\n"),
	);
	await fixture.writeText(
		"batch/batch-state.tsv",
		[
			"id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries",
			"1\thttps://example.com/jobs/acme\tprocessing\t2026-04-22T10:00:00.000Z\t-\t005\t-\t-\t0",
			"",
		].join("\n"),
	);
	await saveBatchSession(store, {
		activeJobId: "batch-job-paused",
		sessionId: "batch-session-paused",
		status: "waiting",
		timestamp: "2026-04-22T10:00:00.000Z",
	});
	await saveBatchJob(store, {
		jobId: "batch-job-paused",
		payload: {
			dryRun: false,
			maxRetries: 3,
			minScore: 0,
			mode: "run-pending",
			parallel: 1,
			startFromId: 0,
		},
		sessionId: "batch-session-paused",
		status: "waiting",
		timestamp: "2026-04-22T10:00:00.000Z",
		waitApprovalId: "approval-batch-1",
		waitReason: "approval",
	});
	await store.approvals.save({
		approvalId: "approval-batch-1",
		jobId: "batch-job-paused",
		request: {
			action: "approval-review",
		},
		requestedAt: "2026-04-22T10:00:00.000Z",
		resolvedAt: null,
		response: null,
		sessionId: "batch-session-paused",
		status: "pending",
		traceId: "trace-batch-1",
		updatedAt: "2026-04-22T10:00:00.000Z",
	});
	await store.runMetadata.saveCheckpoint({
		checkpoint: {
			completedSteps: ["batch-item-1"],
			cursor: "1",
			updatedAt: "2026-04-22T10:02:00.000Z",
			value: {
				items: [
					{
						id: 1,
						reportNumber: "005",
						status: "completed",
					},
				],
			},
		},
		jobId: "batch-job-paused",
		runId: "batch-job-paused-run",
		sessionId: "batch-session-paused",
	});

	try {
		const payload = await createBatchSupervisorSummary(services, {
			itemId: 1,
			status: "pending",
		});

		assert.equal(payload.run.state, "approval-paused");
		assert.equal(payload.run.approvalId, "approval-batch-1");
		assert.equal(payload.run.checkpoint.completedItemCount, 1);
		assert.equal(payload.run.checkpoint.cursor, 1);
		assert.equal(payload.closeout.mergeBlocked, true);
		assert.equal(
			payload.actions.find((action) => action.action === "resume-run-pending")
				?.available,
			false,
		);
		assert.equal(payload.selectedDetail.state, "ready");
		assert.ok(
			payload.selectedDetail.row?.warnings.some(
				(warning) => warning.code === "stale-selection",
			),
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

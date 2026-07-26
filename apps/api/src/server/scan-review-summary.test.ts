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
import { createScanReviewSummary } from "./scan-review-summary.js";

function createReadyAgentRuntime(repoRoot: string): AgentRuntimeService {
	return {
		async bootstrap() {
			throw new Error("bootstrap is not used by scan-review summary tests");
		},
		async close() {},
		async getReadiness() {
			return {
				auth: {
					accountId: "acct-scan-review-test",
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
					originator: "scan-review-summary-test",
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
					modeRepoRelativePath: "modes/scan.md",
					requestedWorkflow: "scan-portals",
					state: "ready" as const,
					supportedWorkflows: WORKFLOW_INTENTS,
					workflow: "scan-portals" as const,
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

async function saveScanSession(
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
		context: input.context ?? { workflow: "scan-portals" },
		createdAt: input.timestamp,
		lastHeartbeatAt: input.timestamp,
		runnerId:
			input.status === "pending" || input.activeJobId === null
				? null
				: "runner-scan-review-test",
		sessionId: input.sessionId,
		status: input.status,
		updatedAt: input.timestamp,
		workflow: "scan-portals",
	});
}

async function saveScanJob(
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
		claimOwnerId: isActive ? "runner-scan-review-test" : null,
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
		jobType: "scan-portals",
		lastHeartbeatAt: isActive ? input.timestamp : null,
		leaseExpiresAt: input.status === "running" ? input.timestamp : null,
		maxAttempts: 2,
		nextAttemptAt: null,
		payload: input.payload ?? {
			company: null,
			compareClean: false,
			dryRun: false,
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

test("scan-review summary handles missing shortlist data and idle runtime state", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});

	try {
		const payload = await createScanReviewSummary(services);

		assert.equal(payload.status, "ready");
		assert.equal(payload.launcher.canStart, true);
		assert.equal(payload.run.state, "idle");
		assert.equal(payload.shortlist.available, false);
		assert.equal(payload.shortlist.totalCount, 0);
		assert.equal(payload.selectedDetail.state, "empty");
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("scan-review summary joins shortlist, history, ignored visibility, and selected detail state", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await fixture.writeText(
		"data/pipeline.md",
		[
			"# Pipeline",
			"",
			"## Shortlist",
			"",
			"Last refreshed: 2026-04-22 by npm run scan.",
			"",
			"Campaign guidance: Focus the forward deployed lane first.",
			"",
			"Bucket counts:",
			"- Strongest fit: 2",
			"- Possible fit: 1",
			"- Adjacent or noisy: 0",
			"",
			"Top 10 to evaluate first:",
			"1. Strongest fit | https://example.com/jobs/acme-fde | Acme | Forward Deployed Engineer | direct title match",
			"2. Strongest fit | https://example.com/jobs/acme-platform | Acme | Forward Deployed Platform Engineer | adjacent deployment lane",
			"3. Possible fit | https://example.com/jobs/beta-sa | Beta | Solutions Architect | geo aligned",
			"",
			"## Pending",
			"",
			"- [ ] https://example.com/jobs/acme-fde | Acme | Forward Deployed Engineer",
			"",
		].join("\n"),
	);
	await fixture.writeText(
		"data/scan-history.tsv",
		[
			"url\tfirst_seen\tportal\ttitle\tcompany\tstatus",
			"https://example.com/jobs/acme-fde\t2026-04-20\tgreenhouse\tForward Deployed Engineer\tAcme\tadded",
			"https://example.com/jobs/acme-platform\t2026-04-19\tgreenhouse\tForward Deployed Platform Engineer\tAcme\tadded",
			"https://example.com/jobs/acme-third\t2026-04-18\tgreenhouse\tDeployment Engineer\tAcme\tadded",
			"https://example.com/jobs/beta-sa\t2026-04-22\tashby\tSolutions Architect\tBeta\tadded",
			"",
		].join("\n"),
	);
	await saveScanSession(store, {
		activeJobId: "scan-job-complete",
		context: {
			scanReview: {
				ignoredUrls: ["https://example.com/jobs/beta-sa"],
			},
			workflow: "scan-portals",
		},
		sessionId: "scan-session-complete",
		status: "completed",
		timestamp: "2026-04-22T09:00:00.000Z",
	});
	await saveScanJob(store, {
		jobId: "scan-job-complete",
		result: {
			company: null,
			dryRun: false,
			summary: {
				companiesConfigured: 5,
				companiesScanned: 5,
				companiesSkipped: 0,
				duplicatesSkipped: 2,
				filteredByLocation: 1,
				filteredByTitle: 3,
				newOffersAdded: 4,
				totalJobsFound: 11,
			},
			warnings: [],
			workflow: "scan-portals",
		},
		sessionId: "scan-session-complete",
		status: "completed",
		timestamp: "2026-04-22T09:00:00.000Z",
	});

	try {
		const payload = await createScanReviewSummary(services, {
			sessionId: "scan-session-complete",
			url: "https://example.com/jobs/beta-sa",
		});

		assert.equal(payload.run.state, "completed");
		assert.equal(
			payload.shortlist.campaignGuidance,
			"Focus the forward deployed lane first.",
		);
		assert.equal(
			payload.shortlist.lastRefreshed,
			"2026-04-22 by npm run scan.",
		);
		assert.equal(payload.shortlist.filteredCount, 2);
		assert.equal(payload.shortlist.counts.total, 3);
		assert.equal(payload.shortlist.counts.ignored, 1);
		assert.equal(payload.shortlist.counts.pendingOverlap, 1);
		assert.equal(payload.shortlist.counts.duplicateHeavy, 2);
		assert.equal(
			payload.shortlist.items[0]?.url,
			"https://example.com/jobs/acme-fde",
		);
		assert.ok(
			payload.shortlist.items[0]?.warnings.some(
				(warning) => warning.code === "duplicate-heavy",
			),
		);
		assert.ok(
			payload.shortlist.items[0]?.warnings.some(
				(warning) => warning.code === "already-pending",
			),
		);
		assert.equal(payload.selectedDetail.state, "ready");
		assert.match(payload.selectedDetail.message, /active filters/i);
		assert.equal(payload.selectedDetail.row?.ignored, true);
		assert.ok(
			payload.selectedDetail.row?.warnings.some(
				(warning) => warning.code === "already-ignored",
			),
		);
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

test("scan-review summary surfaces approval-paused and degraded scan states", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveScanSession(store, {
		activeJobId: "scan-job-paused",
		sessionId: "scan-session-paused",
		status: "waiting",
		timestamp: "2026-04-22T10:00:00.000Z",
	});
	await saveScanJob(store, {
		jobId: "scan-job-paused",
		sessionId: "scan-session-paused",
		status: "waiting",
		timestamp: "2026-04-22T10:00:00.000Z",
		waitApprovalId: "approval-scan-1",
		waitReason: "approval",
	});
	await saveScanSession(store, {
		activeJobId: "scan-job-degraded",
		sessionId: "scan-session-degraded",
		status: "completed",
		timestamp: "2026-04-22T08:30:00.000Z",
	});
	await saveScanJob(store, {
		jobId: "scan-job-degraded",
		result: {
			invalid: true,
		},
		sessionId: "scan-session-degraded",
		status: "completed",
		timestamp: "2026-04-22T08:30:00.000Z",
	});

	try {
		const pausedPayload = await createScanReviewSummary(services);
		const degradedPayload = await createScanReviewSummary(services, {
			sessionId: "scan-session-degraded",
		});

		assert.equal(pausedPayload.run.state, "approval-paused");
		assert.equal(pausedPayload.run.approvalId, "approval-scan-1");
		assert.equal(pausedPayload.launcher.canStart, false);
		assert.ok(
			pausedPayload.run.warnings.some(
				(warning) => warning.code === "approval-paused",
			),
		);

		assert.equal(degradedPayload.run.state, "degraded");
		assert.ok(
			degradedPayload.run.warnings.some(
				(warning) => warning.code === "degraded-result",
			),
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

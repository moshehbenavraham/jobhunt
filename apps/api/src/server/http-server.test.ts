import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import {
	type AgentRuntimeBootstrap,
	type AgentRuntimeService,
	createAgentRuntimeService,
} from "../agent-runtime/index.js";
import {
	createAgentRuntimeAuthFixture,
	getRepoOpenAIAccountModuleImportPath,
	startFakeCodexBackend,
} from "../agent-runtime/test-utils.js";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import {
	getWorkflowModeRoute,
	type PromptSourceKey,
	WORKFLOW_INTENTS,
	type WorkflowIntent,
} from "../prompt/index.js";
import {
	type ApiServiceContainer,
	createApiServiceContainer,
} from "../runtime/service-container.js";
import { createOperationalStore } from "../store/index.js";
import type {
	RuntimeJobStatus,
	RuntimeJobWaitReason,
	RuntimeSessionStatus,
} from "../store/store-contract.js";
import { createWorkspaceFixture } from "../workspace/test-utils.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import { startStartupHttpServer } from "./http-server.js";
import { createOperatorHomeRoute } from "./routes/operator-home-route.js";
import { createSettingsRoute } from "./routes/settings-route.js";

async function readJsonResponse(
	url: string,
	init: RequestInit = {},
): Promise<{
	payload: unknown;
	response: Response;
}> {
	const response = await fetch(url, init);
	const payload = await response.json();

	return {
		payload,
		response,
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

function createDelayedReadyAgentRuntime(
	repoRoot: string,
	bootstrapDelayMs: number,
): AgentRuntimeService {
	return {
		async bootstrap(workflowInput: unknown): Promise<AgentRuntimeBootstrap> {
			const workflow: WorkflowIntent =
				typeof workflowInput === "string" &&
				(WORKFLOW_INTENTS as readonly string[]).includes(workflowInput)
					? (workflowInput as WorkflowIntent)
					: "application-help";
			const sourceOrder: PromptSourceKey[] = [
				"agents-guide",
				"shared-mode",
				"profile-mode",
				"workflow-mode",
				"profile-config",
				"profile-cv",
			];

			await delay(bootstrapDelayMs);

			return {
				auth: {
					accountId: "acct-specialist-http",
					authPath: `${repoRoot}/data/openai-account-auth.json`,
					expiresAt: null,
					message: "Runtime ready.",
					nextSteps: [],
					state: "ready",
					updatedAt: "2026-04-22T00:00:00.000Z",
				},
				config: {
					authPath: `${repoRoot}/data/openai-account-auth.json`,
					baseUrl: "https://chatgpt.com/backend-api",
					model: "gpt-5.4-mini",
					originator: "specialist-workspace-http-test",
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
					modeRepoRelativePath:
						getWorkflowModeRoute(workflow).modeRepoRelativePath,
					requestedWorkflow: workflow,
					state: "ready",
					supportedWorkflows: WORKFLOW_INTENTS,
					workflow,
				},
				promptBundle: {
					cacheMode: "read-through-mtime",
					composedText: `Prompt bundle for ${workflow}`,
					loadedAt: "2026-04-22T00:00:00.000Z",
					sourceOrder,
					sources: [],
					workflow: getWorkflowModeRoute(workflow),
				},
				provider: {
					async close() {},
					getModel() {
						return {
							id: "gpt-5.4-mini",
						};
					},
				},
				startedAt: "2026-04-22T00:00:01.000Z",
				status: "ready",
			};
		},
		async close() {},
		async getReadiness() {
			return {
				auth: {
					accountId: "acct-specialist-http",
					authPath: `${repoRoot}/data/openai-account-auth.json`,
					expiresAt: null,
					message: "Runtime ready.",
					nextSteps: [],
					state: "ready" as const,
					updatedAt: "2026-04-22T00:00:00.000Z",
				},
				config: {
					authPath: `${repoRoot}/data/openai-account-auth.json`,
					baseUrl: "https://chatgpt.com/backend-api",
					model: "gpt-5.4-mini",
					originator: "specialist-workspace-http-test",
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

const ONBOARDING_TEMPLATE_FIXTURE_FILES = {
	"config/portals.example.yml":
		"title_filter:\n  positive:\n    - AI Engineer\n",
	"config/profile.example.yml": "candidate:\n  full_name: Template User\n",
	"data/applications.example.md": [
		"# Applications Tracker",
		"",
		"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
		"| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |",
		"",
	].join("\n"),
	"modes/_profile.template.md": "# Profile Template\n",
	"profile/cv.example.md": "# Template CV\n",
};

async function createOnboardingFixture(files: Record<string, string> = {}) {
	return createWorkspaceFixture({
		files: {
			...ONBOARDING_TEMPLATE_FIXTURE_FILES,
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"modes/_profile.md": "# Profile\n",
			...files,
		},
	});
}

function createSettingsUpdateCheckFixture(
	state: "dismissed" | "offline" | "up-to-date" | "update-available",
) {
	switch (state) {
		case "dismissed":
			return {
				changelogExcerpt: null,
				checkedAt: "2026-04-22T00:00:00.000Z",
				command: "node scripts/update-system.mjs check",
				localVersion: null,
				message: "Update checks are currently dismissed.",
				remoteVersion: null,
				state,
			} as const;
		case "offline":
			return {
				changelogExcerpt: null,
				checkedAt: "2026-04-22T00:00:00.000Z",
				command: "node scripts/update-system.mjs check",
				localVersion: "1.5.38",
				message: "Update check could not reach the upstream release source.",
				remoteVersion: null,
				state,
			} as const;
		case "up-to-date":
			return {
				changelogExcerpt: null,
				checkedAt: "2026-04-22T00:00:00.000Z",
				command: "node scripts/update-system.mjs check",
				localVersion: "1.5.38",
				message: "Job-Hunt is up to date (1.5.38).",
				remoteVersion: "1.5.38",
				state,
			} as const;
		case "update-available":
			return {
				changelogExcerpt: "New settings surface shipped.",
				checkedAt: "2026-04-22T00:00:00.000Z",
				command: "node scripts/update-system.mjs check",
				localVersion: "1.5.38",
				message: "Job-Hunt update available (1.5.38 -> 1.6.0).",
				remoteVersion: "1.6.0",
				state,
			} as const;
	}
}

async function seedRuntimeContext(
	store: Awaited<ReturnType<typeof createOperationalStore>>,
	input: {
		jobId: string;
		sessionId: string;
	},
): Promise<void> {
	await store.sessions.save({
		activeJobId: input.jobId,
		context: {
			workflow: "single-evaluation",
		},
		createdAt: "2026-04-21T07:24:00.000Z",
		lastHeartbeatAt: "2026-04-21T07:24:00.000Z",
		runnerId: "runner-http",
		sessionId: input.sessionId,
		status: "running",
		updatedAt: "2026-04-21T07:24:00.000Z",
		workflow: "single-evaluation",
	});
	await store.jobs.save({
		attempt: 1,
		claimOwnerId: "runner-http",
		claimToken: "claim-http",
		completedAt: null,
		createdAt: "2026-04-21T07:24:00.000Z",
		currentRunId: `${input.jobId}-run`,
		error: null,
		jobId: input.jobId,
		jobType: "evaluate-job",
		lastHeartbeatAt: "2026-04-21T07:24:00.000Z",
		leaseExpiresAt: "2026-04-21T07:25:00.000Z",
		maxAttempts: 3,
		nextAttemptAt: null,
		payload: {
			company: "HTTP Co",
		},
		result: null,
		retryBackoffMs: 1_000,
		sessionId: input.sessionId,
		startedAt: "2026-04-21T07:24:00.000Z",
		status: "running",
		updatedAt: "2026-04-21T07:24:00.000Z",
		waitApprovalId: null,
		waitReason: null,
	});
}

async function seedWaitingApprovalContext(input: {
	approvalRuntime: Awaited<
		ReturnType<ApiServiceContainer["approvalRuntime"]["getService"]>
	>;
	observability: Awaited<
		ReturnType<ApiServiceContainer["observability"]["getService"]>
	>;
	store: Awaited<ReturnType<typeof createOperationalStore>>;
	title: string;
	jobId: string;
	requestId: string;
	sessionId: string;
	timestamp: string;
	traceId: string;
	workflow: string;
}) {
	await input.store.sessions.save({
		activeJobId: input.jobId,
		context: {
			workflow: input.workflow,
		},
		createdAt: input.timestamp,
		lastHeartbeatAt: input.timestamp,
		runnerId: "runner-approval-http",
		sessionId: input.sessionId,
		status: "waiting",
		updatedAt: input.timestamp,
		workflow: input.workflow,
	});

	await input.store.jobs.save({
		attempt: 1,
		claimOwnerId: "runner-approval-http",
		claimToken: "claim-approval-http",
		completedAt: null,
		createdAt: input.timestamp,
		currentRunId: `${input.jobId}-run`,
		error: null,
		jobId: input.jobId,
		jobType: "evaluate-job",
		lastHeartbeatAt: input.timestamp,
		leaseExpiresAt: null,
		maxAttempts: 3,
		nextAttemptAt: null,
		payload: {
			company: input.title,
		},
		result: null,
		retryBackoffMs: 1_000,
		sessionId: input.sessionId,
		startedAt: input.timestamp,
		status: "running",
		updatedAt: input.timestamp,
		waitApprovalId: null,
		waitReason: null,
	});

	const approval = await input.approvalRuntime.createApproval({
		requestedAt: input.timestamp,
		request: {
			action: "approval-review",
			correlation: {
				jobId: input.jobId,
				requestId: input.requestId,
				sessionId: input.sessionId,
				traceId: input.traceId,
			},
			details: {
				label: input.title,
			},
			title: input.title,
		},
	});

	await input.store.jobs.save({
		attempt: 1,
		claimOwnerId: "runner-approval-http",
		claimToken: "claim-approval-http",
		completedAt: null,
		createdAt: input.timestamp,
		currentRunId: `${input.jobId}-run`,
		error: null,
		jobId: input.jobId,
		jobType: "evaluate-job",
		lastHeartbeatAt: input.timestamp,
		leaseExpiresAt: null,
		maxAttempts: 3,
		nextAttemptAt: null,
		payload: {
			company: input.title,
		},
		result: null,
		retryBackoffMs: 1_000,
		sessionId: input.sessionId,
		startedAt: input.timestamp,
		status: "waiting",
		updatedAt: input.timestamp,
		waitApprovalId: approval.approval.approvalId,
		waitReason: "approval",
	});

	await input.observability.recordEvent({
		correlation: {
			approvalId: approval.approval.approvalId,
			jobId: input.jobId,
			requestId: input.requestId,
			sessionId: input.sessionId,
			traceId: input.traceId,
		},
		eventType: "job-waiting-approval",
		metadata: {
			waitReason: "approval",
		},
		occurredAt: input.timestamp,
		summary: `${input.title} is waiting for approval.`,
	});

	return approval.approval;
}

async function writeRepoArtifact(
	repoRoot: string,
	repoRelativePath: string,
	content = "artifact\n",
): Promise<void> {
	const absolutePath = join(repoRoot, repoRelativePath);
	await mkdir(dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, content, "utf8");
}

async function saveEvaluationSession(
	store: Awaited<ReturnType<typeof createOperationalStore>>,
	input: {
		activeJobId?: string | null;
		context?: JsonValue | null;
		createdAt?: string;
		lastHeartbeatAt?: string | null;
		sessionId: string;
		status: RuntimeSessionStatus;
		updatedAt: string;
		workflow: string;
	},
): Promise<void> {
	await store.sessions.save({
		activeJobId: input.activeJobId ?? null,
		context:
			input.context === undefined
				? {
						workflow: input.workflow,
					}
				: input.context,
		createdAt: input.createdAt ?? input.updatedAt,
		lastHeartbeatAt: input.lastHeartbeatAt ?? input.updatedAt,
		runnerId:
			input.status === "pending" || input.activeJobId === null
				? null
				: "runner-evaluation-http",
		sessionId: input.sessionId,
		status: input.status,
		updatedAt: input.updatedAt,
		workflow: input.workflow,
	});
}

async function saveEvaluationJob(
	store: Awaited<ReturnType<typeof createOperationalStore>>,
	input: {
		completedAt?: string | null;
		createdAt?: string;
		error?: JsonValue | null;
		jobId: string;
		result?: JsonValue | null;
		sessionId: string;
		startedAt?: string | null;
		status: RuntimeJobStatus;
		updatedAt: string;
		waitApprovalId?: string | null;
		waitReason?: RuntimeJobWaitReason | null;
	},
): Promise<void> {
	const isActive = input.status === "running" || input.status === "waiting";
	await store.jobs.save({
		attempt: 1,
		claimOwnerId: isActive ? "runner-evaluation-http" : null,
		claimToken: isActive ? `claim-${input.jobId}` : null,
		completedAt:
			input.completedAt ??
			(input.status === "completed" || input.status === "failed"
				? input.updatedAt
				: null),
		createdAt: input.createdAt ?? input.updatedAt,
		currentRunId: `${input.jobId}-run`,
		error: input.error ?? null,
		jobId: input.jobId,
		jobType: "evaluate-job",
		lastHeartbeatAt: isActive ? input.updatedAt : null,
		leaseExpiresAt: input.status === "running" ? input.updatedAt : null,
		maxAttempts: 3,
		nextAttemptAt: null,
		payload: {
			company: input.jobId,
		},
		result: input.result ?? null,
		retryBackoffMs: 1_000,
		sessionId: input.sessionId,
		startedAt:
			input.startedAt ??
			(input.status === "pending" || input.status === "queued"
				? null
				: (input.createdAt ?? input.updatedAt)),
		status: input.status,
		updatedAt: input.updatedAt,
		waitApprovalId: input.waitApprovalId ?? null,
		waitReason: input.waitReason ?? null,
	});
}

async function saveScanJob(
	store: Awaited<ReturnType<typeof createOperationalStore>>,
	input: {
		completedAt?: string | null;
		createdAt?: string;
		error?: JsonValue | null;
		jobId: string;
		payload?: JsonValue;
		result?: JsonValue | null;
		sessionId: string;
		startedAt?: string | null;
		status: RuntimeJobStatus;
		updatedAt: string;
		waitApprovalId?: string | null;
		waitReason?: RuntimeJobWaitReason | null;
	},
): Promise<void> {
	const isActive = input.status === "running" || input.status === "waiting";

	await store.jobs.save({
		attempt: 1,
		claimOwnerId: isActive ? "runner-scan-http" : null,
		claimToken: isActive ? `claim-${input.jobId}` : null,
		completedAt:
			input.completedAt ??
			(input.status === "completed" || input.status === "failed"
				? input.updatedAt
				: null),
		createdAt: input.createdAt ?? input.updatedAt,
		currentRunId: `${input.jobId}-run`,
		error: input.error ?? null,
		jobId: input.jobId,
		jobType: "scan-portals",
		lastHeartbeatAt: isActive ? input.updatedAt : null,
		leaseExpiresAt: input.status === "running" ? input.updatedAt : null,
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
			input.startedAt ??
			(input.status === "pending" || input.status === "queued"
				? null
				: (input.createdAt ?? input.updatedAt)),
		status: input.status,
		updatedAt: input.updatedAt,
		waitApprovalId: input.waitApprovalId ?? null,
		waitReason: input.waitReason ?? null,
	});
}

async function saveBatchJob(
	store: Awaited<ReturnType<typeof createOperationalStore>>,
	input: {
		completedAt?: string | null;
		createdAt?: string;
		error?: JsonValue | null;
		jobId: string;
		payload?: JsonValue;
		result?: JsonValue | null;
		sessionId: string;
		startedAt?: string | null;
		status: RuntimeJobStatus;
		updatedAt: string;
		waitApprovalId?: string | null;
		waitReason?: RuntimeJobWaitReason | null;
	},
): Promise<void> {
	const isActive = input.status === "running" || input.status === "waiting";

	await store.jobs.save({
		attempt: 1,
		claimOwnerId: isActive ? "runner-batch-http" : null,
		claimToken: isActive ? `claim-${input.jobId}` : null,
		completedAt:
			input.completedAt ??
			(input.status === "completed" || input.status === "failed"
				? input.updatedAt
				: null),
		createdAt: input.createdAt ?? input.updatedAt,
		currentRunId: `${input.jobId}-run`,
		error: input.error ?? null,
		jobId: input.jobId,
		jobType: "batch-evaluation",
		lastHeartbeatAt: isActive ? input.updatedAt : null,
		leaseExpiresAt: input.status === "running" ? input.updatedAt : null,
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
			input.startedAt ??
			(input.status === "pending" || input.status === "queued"
				? null
				: (input.createdAt ?? input.updatedAt)),
		status: input.status,
		updatedAt: input.updatedAt,
		waitApprovalId: input.waitApprovalId ?? null,
		waitReason: input.waitReason ?? null,
	});
}

async function saveEvaluationCheckpoint(
	store: Awaited<ReturnType<typeof createOperationalStore>>,
	input: {
		completedSteps: string[];
		cursor: string | null;
		jobId: string;
		sessionId: string;
		updatedAt: string;
		value: JsonValue | null;
	},
): Promise<void> {
	await store.runMetadata.saveCheckpoint({
		checkpoint: {
			completedSteps: input.completedSteps,
			cursor: input.cursor,
			updatedAt: input.updatedAt,
			value: input.value,
		},
		jobId: input.jobId,
		runId: `${input.jobId}-run`,
		sessionId: input.sessionId,
	});
}

test("health and startup routes report ready diagnostics after explicit store initialization", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-ready" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: healthPayload, response: healthResponse } =
			await readJsonResponse(`${handle.url}/health`);
		const { payload: startupPayload, response: startupResponse } =
			await readJsonResponse(`${handle.url}/startup`);

		assert.equal(healthResponse.status, 200);
		assert.equal(startupResponse.status, 200);

		assert.equal(
			(healthPayload as { service: string }).service,
			STARTUP_SERVICE_NAME,
		);
		assert.equal(
			(healthPayload as { sessionId: string }).sessionId,
			STARTUP_SESSION_ID,
		);
		assert.equal((healthPayload as { status: string }).status, "ok");
		assert.equal(
			(
				healthPayload as {
					agentRuntime: { status: string };
				}
			).agentRuntime.status,
			"ready",
		);
		assert.equal(
			(healthPayload as { operationalStore: { status: string } })
				.operationalStore.status,
			"ready",
		);

		assert.equal((startupPayload as { status: string }).status, "ready");
		assert.equal(
			(
				startupPayload as {
					diagnostics: { agentRuntime: { status: string } };
				}
			).diagnostics.agentRuntime.status,
			"ready",
		);
		assert.equal(
			(startupPayload as { operationalStore: { status: string } })
				.operationalStore.status,
			"ready",
		);
		assert.equal(
			(
				startupPayload as {
					diagnostics: { onboardingMissing: unknown[] };
				}
			).diagnostics.onboardingMissing.length,
			0,
		);
		assert.equal(
			(
				startupPayload as {
					diagnostics: { runtimeMissing: unknown[] };
				}
			).diagnostics.runtimeMissing.length,
			0,
		);
		assert.equal(
			(
				startupPayload as {
					diagnostics: { currentSession: { id: string } };
				}
			).diagnostics.currentSession.id,
			STARTUP_SESSION_ID,
		);
		assert.equal(
			(
				startupPayload as {
					bootSurface: { startupPath: string };
				}
			).bootSurface.startupPath,
			"/startup",
		);

		const persistedStore = await createOperationalStore({
			repoRoot: fixture.repoRoot,
		});
		try {
			const requestEvents = await persistedStore.events.list({ limit: 10 });
			assert.equal(
				requestEvents.some(
					(event) =>
						event.eventType === "http-request-completed" ||
						event.eventType === "http-request-received",
				),
				false,
			);
		} finally {
			await persistedStore.close();
		}
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("startup route reports onboarding gaps without mutating user-layer files", async () => {
	const fixture = await createWorkspaceFixture({
		files: {
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"modes/_profile.md": "# Profile\n",
		},
	});
	const beforeSnapshot = await fixture.snapshotUserLayer();
	const appStateRoot = join(fixture.repoRoot, ".jobhunt-app");
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: healthPayload, response: healthResponse } =
			await readJsonResponse(`${handle.url}/health`);
		const { payload: startupPayload, response: startupResponse } =
			await readJsonResponse(`${handle.url}/startup`);
		const afterSnapshot = await fixture.snapshotUserLayer();

		assert.equal(healthResponse.status, 200);
		assert.equal(startupResponse.status, 200);
		assert.equal((healthPayload as { status: string }).status, "degraded");
		assert.equal(
			(healthPayload as { operationalStore: { status: string } })
				.operationalStore.status,
			"absent",
		);
		assert.equal(
			(startupPayload as { status: string }).status,
			"missing-prerequisites",
		);
		assert.equal(
			(
				startupPayload as {
					diagnostics: { agentRuntime: { status: string } };
				}
			).diagnostics.agentRuntime.status,
			"auth-required",
		);
		assert.equal(
			(startupPayload as { operationalStore: { status: string } })
				.operationalStore.status,
			"absent",
		);
		assert.deepEqual(afterSnapshot, beforeSnapshot);
		assert.equal(existsSync(appStateRoot), false);
		assert.deepEqual(
			(
				startupPayload as {
					diagnostics: {
						onboardingMissing: Array<{ surfaceKey: string }>;
					};
				}
			).diagnostics.onboardingMissing.map((item) => item.surfaceKey),
			["profileConfig", "profileCv"],
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("startup routes surface agent runtime auth-required status without mutating user-layer files", async () => {
	const fixture = await createReadyFixture();
	const beforeSnapshot = await fixture.snapshotUserLayer();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: healthPayload, response: healthResponse } =
			await readJsonResponse(`${handle.url}/health`);
		const { payload: startupPayload, response: startupResponse } =
			await readJsonResponse(`${handle.url}/startup`);
		const afterSnapshot = await fixture.snapshotUserLayer();

		assert.equal(healthResponse.status, 200);
		assert.equal(startupResponse.status, 200);
		assert.equal((healthPayload as { status: string }).status, "degraded");
		assert.equal(
			(startupPayload as { status: string }).status,
			"auth-required",
		);
		assert.equal(
			(
				startupPayload as {
					diagnostics: { agentRuntime: { auth: { authPath: string } } };
				}
			).diagnostics.agentRuntime.auth.authPath,
			join(fixture.repoRoot, "data", "openai-account-auth.json"),
		);
		assert.deepEqual(afterSnapshot, beforeSnapshot);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("operator-shell route reports missing prerequisites without creating runtime activity state", async () => {
	const fixture = await createWorkspaceFixture({
		files: {
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"modes/_profile.md": "# Profile\n",
		},
	});
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/operator-shell`,
		);

		assert.equal(response.status, 200);
		assert.equal(
			(payload as { status: string }).status,
			"missing-prerequisites",
		);
		assert.equal(
			(
				payload as {
					activity: { state: string };
				}
			).activity.state,
			"unavailable",
		);
		assert.equal(
			(
				payload as {
					health: { missing: { onboarding: number } };
				}
			).health.missing.onboarding,
			2,
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("operator-shell route reports ready shell state without leaking raw runtime records", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-shell-ready" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-shell-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/operator-shell`,
		);

		assert.equal(response.status, 200);
		assert.equal((payload as { status: string }).status, "ready");
		assert.equal(
			(
				payload as {
					activity: {
						activeSession: null;
						pendingApprovalCount: number;
						recentFailureCount: number;
						state: string;
					};
				}
			).activity.state,
			"idle",
		);
		assert.equal(
			(
				payload as {
					activity: {
						activeSession: null;
						pendingApprovalCount: number;
						recentFailureCount: number;
					};
				}
			).activity.pendingApprovalCount,
			0,
		);
		assert.equal(
			(
				payload as {
					activity: {
						activeSession: null;
						pendingApprovalCount: number;
						recentFailureCount: number;
					};
				}
			).activity.recentFailureCount,
			0,
		);
		assert.equal(
			(
				payload as {
					activity: { activeSession: null };
				}
			).activity.activeSession,
			null,
		);
		assert.equal(
			(
				payload as {
					currentSession: { id: string };
				}
			).currentSession.id,
			STARTUP_SESSION_ID,
		);
		assert.equal("diagnostics" in (payload as Record<string, unknown>), false);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("startup routes surface corrupt operational-store state as a runtime error", async () => {
	const fixture = await createReadyFixture();
	const corruptStorePath = join(fixture.repoRoot, ".jobhunt-app", "app.db");
	await mkdir(join(fixture.repoRoot, ".jobhunt-app"), { recursive: true });
	await writeFile(corruptStorePath, "not sqlite\n", "utf8");
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: healthPayload, response: healthResponse } =
			await readJsonResponse(`${handle.url}/health`);
		const { payload: startupPayload, response: startupResponse } =
			await readJsonResponse(`${handle.url}/startup`);

		assert.equal(healthResponse.status, 503);
		assert.equal(startupResponse.status, 503);
		assert.equal((healthPayload as { status: string }).status, "error");
		assert.equal(
			(healthPayload as { startupStatus: string }).startupStatus,
			"runtime-error",
		);
		assert.equal(
			(startupPayload as { status: string }).status,
			"runtime-error",
		);
		assert.equal(
			(
				startupPayload as {
					operationalStore: { status: string };
				}
			).operationalStore.status,
			"corrupt",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("startup route maps repo-root resolution failures to explicit error payloads", async () => {
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		repoRoot: join(process.cwd(), "not-a-valid-repo-root"),
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/startup`,
		);

		assert.equal(response.status, 500);
		assert.equal(
			(payload as { error: { code: string } }).error.code,
			"repo-root-resolution-failed",
		);
		assert.equal((payload as { status: string }).status, "error");
	} finally {
		await handle.close();
	}
});

test("operator-shell route exposes active-work badges and validates bounded query params", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();
	await seedRuntimeContext(store, {
		jobId: "job-shell-route",
		sessionId: "session-shell-route",
	});
	const approvalRuntime = await services.approvalRuntime.getService();
	const observability = await services.observability.getService();
	const approval = await approvalRuntime.createApproval({
		requestedAt: "2026-04-21T08:10:00.000Z",
		request: {
			action: "apply-with-review",
			correlation: {
				jobId: "job-shell-route",
				requestId: "request-shell-route",
				sessionId: "session-shell-route",
				traceId: "trace-shell-route",
			},
			details: null,
			title: "Review shell approval",
		},
	});
	await observability.recordEvent({
		correlation: {
			jobId: "job-shell-route",
			requestId: "request-shell-route",
			sessionId: "session-shell-route",
			traceId: "trace-shell-route",
		},
		eventType: "job-failed",
		level: "error",
		metadata: {
			message: "Shell route failure",
			runId: "job-shell-route-run",
		},
		occurredAt: "2026-04-21T08:11:00.000Z",
		summary: "Shell job failed.",
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/operator-shell?approvalLimit=1&failureLimit=1`,
		);

		assert.equal(response.status, 200);
		assert.equal(
			(
				payload as {
					activity: { state: string };
				}
			).activity.state,
			"attention-required",
		);
		assert.equal(
			(
				payload as {
					activity: {
						activeSession: { sessionId: string; activeJobId: string | null };
					};
				}
			).activity.activeSession.sessionId,
			"session-shell-route",
		);
		assert.equal(
			(
				payload as {
					activity: {
						activeSession: { sessionId: string; activeJobId: string | null };
					};
				}
			).activity.activeSession.activeJobId,
			"job-shell-route",
		);
		assert.equal(
			(
				payload as {
					activity: { pendingApprovalCount: number };
				}
			).activity.pendingApprovalCount,
			1,
		);
		assert.equal(
			(
				payload as {
					activity: { recentFailureCount: number };
				}
			).activity.recentFailureCount,
			1,
		);
		assert.equal(
			(
				payload as {
					activity: { latestPendingApprovals: Array<{ approvalId: string }> };
				}
			).activity.latestPendingApprovals[0]?.approvalId,
			approval.approval.approvalId,
		);
		assert.equal(
			(
				payload as {
					activity: { recentFailures: Array<{ jobId: string }> };
				}
			).activity.recentFailures[0]?.jobId,
			"job-shell-route",
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(`${handle.url}/operator-shell?approvalLimit=0`);

		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-operator-shell-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("operator-home route forwards bounded preview limits and validates query input", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	let capturedOptions: {
		approvalLimit?: number;
		artifactLimit?: number;
		closeoutLimit?: number;
	} | null = null;
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		routes: [
			createOperatorHomeRoute({
				createSummary: async (_services, options = {}) => {
					capturedOptions = options;

					return {
						cards: {
							approvals: {
								actions: [],
								latestPendingApprovals: [],
								message: "No approvals waiting.",
								pendingApprovalCount: 0,
								recentFailureCount: 0,
								state: "idle",
							},
							artifacts: {
								actions: [],
								items: [],
								message: "No artifacts yet.",
								state: "idle",
								totalCount: 0,
							},
							closeout: {
								actions: [],
								message: "No closeout work waiting.",
								pipeline: {
									malformedCount: 0,
									pendingCount: 0,
									preview: [],
									processedCount: 0,
								},
								state: "idle",
								tracker: {
									pendingAdditionCount: 0,
									preview: [],
									rowCount: 0,
								},
							},
							liveWork: {
								actions: [],
								activeSession: null,
								activeSessionCount: 0,
								message: "No live workflow is running.",
								pendingApprovalCount: 0,
								recentFailureCount: 0,
								recentFailures: [],
								state: "idle",
							},
							maintenance: {
								actions: [],
								authState: "ready",
								commands: [],
								message: "Maintenance is stable.",
								operationalStoreStatus: "ready",
								state: "ready",
								updateCheck: {
									changelogExcerpt: null,
									checkedAt: "2026-04-22T00:00:00.000Z",
									command: "node scripts/update-system.mjs check",
									localVersion: "1.5.42",
									message: "Job-Hunt is up to date (1.5.42).",
									remoteVersion: "1.5.42",
									state: "up-to-date",
								},
							},
							readiness: {
								actions: [],
								currentSession: {
									id: STARTUP_SESSION_ID,
									monorepo: null,
									packagePath: null,
									phase: null,
									source: "fallback",
									stateFilePath: `${fixture.repoRoot}/.spec_system/state.json`,
								},
								healthStatus: "ok",
								message: "Ready.",
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
							id: STARTUP_SESSION_ID,
							monorepo: null,
							packagePath: null,
							phase: null,
							source: "fallback",
							stateFilePath: `${fixture.repoRoot}/.spec_system/state.json`,
						},
						generatedAt: "2026-04-22T00:00:00.000Z",
						health: {
							agentRuntime: {
								authPath: `${fixture.repoRoot}/data/openai-account-auth.json`,
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
							service: STARTUP_SERVICE_NAME,
							sessionId: STARTUP_SESSION_ID,
							startupStatus: "ready",
							status: "ok",
						},
						message: "Operator home ready.",
						ok: true,
						service: STARTUP_SERVICE_NAME,
						sessionId: STARTUP_SESSION_ID,
						status: "ready",
					};
				},
			}),
		],
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/operator-home?approvalLimit=1&artifactLimit=2&closeoutLimit=3`,
		);

		assert.equal(response.status, 200);
		assert.equal((payload as { status: string }).status, "ready");
		assert.deepEqual(capturedOptions, {
			approvalLimit: 1,
			artifactLimit: 2,
			closeoutLimit: 3,
		});
		assert.equal(
			(
				payload as {
					cards: { readiness: { state: string } };
				}
			).cards.readiness.state,
			"ready",
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(`${handle.url}/operator-home?approvalLimit=0`);

		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-operator-home-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("operator-home route returns degraded card payloads without failing the whole route", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		routes: [
			createOperatorHomeRoute({
				createSummary: async () => ({
					cards: {
						approvals: {
							actions: [],
							latestPendingApprovals: [],
							message: "Approval summary degraded.",
							pendingApprovalCount: 0,
							recentFailureCount: 0,
							state: "degraded",
						},
						artifacts: {
							actions: [],
							items: [],
							message: "Artifact summary degraded.",
							state: "degraded",
							totalCount: 0,
						},
						closeout: {
							actions: [],
							message: "Closeout summary degraded.",
							pipeline: {
								malformedCount: 0,
								pendingCount: 0,
								preview: [],
								processedCount: 0,
							},
							state: "degraded",
							tracker: {
								pendingAdditionCount: 0,
								preview: [],
								rowCount: 0,
							},
						},
						liveWork: {
							actions: [],
							activeSession: null,
							activeSessionCount: 0,
							message: "Live work degraded.",
							pendingApprovalCount: 0,
							recentFailureCount: 0,
							recentFailures: [],
							state: "degraded",
						},
						maintenance: {
							actions: [],
							authState: "unavailable",
							commands: [],
							message: "Maintenance summary degraded.",
							operationalStoreStatus: "ready",
							state: "degraded",
							updateCheck: {
								changelogExcerpt: null,
								checkedAt: "2026-04-22T00:00:00.000Z",
								command: "node scripts/update-system.mjs check",
								localVersion: null,
								message: "Update state unavailable.",
								remoteVersion: null,
								state: "error",
							},
						},
						readiness: {
							actions: [],
							currentSession: {
								id: STARTUP_SESSION_ID,
								monorepo: null,
								packagePath: null,
								phase: null,
								source: "fallback",
								stateFilePath: `${fixture.repoRoot}/.spec_system/state.json`,
							},
							healthStatus: "ok",
							message: "Ready.",
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
						id: STARTUP_SESSION_ID,
						monorepo: null,
						packagePath: null,
						phase: null,
						source: "fallback",
						stateFilePath: `${fixture.repoRoot}/.spec_system/state.json`,
					},
					generatedAt: "2026-04-22T00:00:00.000Z",
					health: {
						agentRuntime: {
							authPath: `${fixture.repoRoot}/data/openai-account-auth.json`,
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
						service: STARTUP_SERVICE_NAME,
						sessionId: STARTUP_SESSION_ID,
						startupStatus: "ready",
						status: "ok",
					},
					message: "Operator home degraded.",
					ok: true,
					service: STARTUP_SERVICE_NAME,
					sessionId: STARTUP_SESSION_ID,
					status: "ready",
				}),
			}),
		],
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/operator-home`,
		);

		assert.equal(response.status, 200);
		assert.equal(
			(
				payload as {
					cards: { closeout: { state: string } };
				}
			).cards.closeout.state,
			"degraded",
		);
		assert.equal(
			(
				payload as {
					cards: { maintenance: { state: string; authState: string } };
				}
			).cards.maintenance.authState,
			"unavailable",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("settings route reports missing prerequisites without mutating workspace state", async () => {
	const fixture = await createWorkspaceFixture({
		files: {
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"modes/_profile.md": "# Profile\n",
		},
	});
	const beforeSnapshot = await fixture.snapshotUserLayer();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		routes: [
			createSettingsRoute({
				readUpdateCheck: async () =>
					createSettingsUpdateCheckFixture("offline"),
			}),
		],
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/settings`,
		);
		const afterSnapshot = await fixture.snapshotUserLayer();

		assert.equal(response.status, 200);
		assert.equal(
			(payload as { status: string }).status,
			"missing-prerequisites",
		);
		assert.equal(
			(
				payload as {
					health: { missing: { onboarding: number } };
				}
			).health.missing.onboarding,
			2,
		);
		assert.equal(
			(
				payload as {
					maintenance: { updateCheck: { state: string } };
				}
			).maintenance.updateCheck.state,
			"offline",
		);
		assert.deepEqual(afterSnapshot, beforeSnapshot);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("settings route exposes bounded preview data, updater states, and query validation", async () => {
	const fixture = await createReadyFixture();
	const beforeSnapshot = await fixture.snapshotUserLayer();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-settings" });
	let updateState: "dismissed" | "offline" | "up-to-date" | "update-available" =
		"update-available";
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-settings-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		routes: [
			createSettingsRoute({
				readUpdateCheck: async () =>
					createSettingsUpdateCheckFixture(updateState),
			}),
		],
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/settings?toolLimit=1&workflowLimit=2`,
		);

		assert.equal(response.status, 200);
		assert.equal((payload as { status: string }).status, "ready");
		assert.equal(
			(
				payload as {
					currentSession: { id: string };
				}
			).currentSession.id,
			STARTUP_SESSION_ID,
		);
		assert.equal(
			(
				payload as {
					support: {
						tools: {
							hasMore: boolean;
							previewLimit: number;
							tools: unknown[];
							totalCount: number;
						};
					};
				}
			).support.tools.previewLimit,
			1,
		);
		assert.equal(
			(
				payload as {
					support: {
						tools: {
							hasMore: boolean;
							previewLimit: number;
							tools: unknown[];
							totalCount: number;
						};
					};
				}
			).support.tools.tools.length,
			1,
		);
		assert.equal(
			(
				payload as {
					support: {
						tools: {
							hasMore: boolean;
							previewLimit: number;
							tools: unknown[];
							totalCount: number;
						};
					};
				}
			).support.tools.hasMore,
			true,
		);
		assert.equal(
			(
				payload as {
					support: {
						workflows: {
							hasMore: boolean;
							previewLimit: number;
							workflows: unknown[];
						};
					};
				}
			).support.workflows.previewLimit,
			2,
		);
		assert.equal(
			(
				payload as {
					support: {
						workflows: {
							hasMore: boolean;
							previewLimit: number;
							workflows: unknown[];
						};
					};
				}
			).support.workflows.workflows.length,
			2,
		);
		assert.equal(
			(
				payload as {
					support: {
						workflows: {
							hasMore: boolean;
						};
					};
				}
			).support.workflows.hasMore,
			true,
		);
		assert.equal(
			(
				payload as {
					maintenance: {
						updateCheck: { state: string; remoteVersion: string };
					};
				}
			).maintenance.updateCheck.state,
			"update-available",
		);
		assert.equal(
			(
				payload as {
					maintenance: {
						updateCheck: { state: string; remoteVersion: string };
					};
				}
			).maintenance.updateCheck.remoteVersion,
			"1.6.0",
		);

		updateState = "up-to-date";
		const { payload: upToDatePayload } = await readJsonResponse(
			`${handle.url}/settings`,
		);
		assert.equal(
			(
				upToDatePayload as {
					maintenance: { updateCheck: { state: string } };
				}
			).maintenance.updateCheck.state,
			"up-to-date",
		);

		updateState = "dismissed";
		const { payload: dismissedPayload } = await readJsonResponse(
			`${handle.url}/settings`,
		);
		assert.equal(
			(
				dismissedPayload as {
					maintenance: { updateCheck: { state: string } };
				}
			).maintenance.updateCheck.state,
			"dismissed",
		);

		updateState = "offline";
		const { payload: offlinePayload } = await readJsonResponse(
			`${handle.url}/settings`,
		);
		assert.equal(
			(
				offlinePayload as {
					maintenance: { updateCheck: { state: string } };
				}
			).maintenance.updateCheck.state,
			"offline",
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(`${handle.url}/settings?toolLimit=0`);

		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-settings-query",
		);
		assert.deepEqual(await fixture.snapshotUserLayer(), beforeSnapshot);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("chat-console route reports workflow support and selected-session detail without leaking store internals", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-chat-console" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-chat-console-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const runtimeStore = await services.operationalStore.getStore();
	await seedRuntimeContext(runtimeStore, {
		jobId: "job-chat-console",
		sessionId: "session-chat-console",
	});
	const approvalRuntime = await services.approvalRuntime.getService();
	const observability = await services.observability.getService();
	await approvalRuntime.createApproval({
		requestedAt: "2026-04-21T08:15:00.000Z",
		request: {
			action: "approve-chat-console",
			correlation: {
				jobId: "job-chat-console",
				requestId: "request-chat-console",
				sessionId: "session-chat-console",
				traceId: "trace-chat-console",
			},
			details: null,
			title: "Approve chat console run",
		},
	});
	await observability.recordEvent({
		correlation: {
			jobId: "job-chat-console",
			requestId: "request-chat-console",
			sessionId: "session-chat-console",
			traceId: "trace-chat-console",
		},
		eventType: "job-waiting-approval",
		metadata: {
			waitReason: "approval",
		},
		occurredAt: "2026-04-21T08:16:00.000Z",
		summary: "Chat console run is waiting for approval.",
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/chat-console?sessionId=session-chat-console`,
		);

		assert.equal(response.status, 200);
		assert.equal((payload as { status: string }).status, "ready");
		assert.equal(
			(
				payload as {
					workflows: Array<{ intent: string; status: string }>;
				}
			).workflows.some(
				(workflow) =>
					workflow.intent === "single-evaluation" &&
					workflow.status === "ready",
			),
			true,
		);
		assert.equal(
			(
				payload as {
					recentSessions: Array<{ sessionId: string }>;
				}
			).recentSessions[0]?.sessionId,
			"session-chat-console",
		);
		assert.equal(
			(
				payload as {
					selectedSession: { session: { state: string } };
				}
			).selectedSession.session.state,
			"waiting-for-approval",
		);
		assert.equal(
			(
				payload as {
					selectedSession: { timeline: Array<{ summary: string }> };
				}
			).selectedSession.timeline[0]?.summary,
			"Chat console run is waiting for approval.",
		);
		assert.equal(
			"context" in
				(
					payload as {
						selectedSession: { session: Record<string, unknown> };
					}
				).selectedSession.session,
			false,
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("evaluation-result route reports pending, running, approval-paused, failed, completed, and degraded states across supported evaluation workflows", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-evaluation-result" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-evaluation-result-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const runtimeStore = await services.operationalStore.getStore();
	const approvalRuntime = await services.approvalRuntime.getService();
	const observability = await services.observability.getService();

	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/001-ready-http.md",
		[
			"# Ready report",
			"",
			"**Date:** 2026-04-21",
			"**URL:** https://example.com/jobs/ready-http",
			"**Legitimacy:** High Confidence",
			"**Verification:** active via browser review",
			"",
			"---",
			"",
			"Ready report body.",
			"",
		].join("\n"),
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"output/001-ready-http.pdf",
		"ready pdf\n",
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"batch/tracker-additions/1-ready-http.tsv",
		"1\t2026-04-21\tReady Co\tRole\tApplied\t4.9/5\toutput/001-ready-http.pdf\t[001](reports/001-ready-http.md)\tReady\n",
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/002-degraded-http.md",
		[
			"# Degraded report",
			"",
			"**Date:** 2026-04-21",
			"**URL:** https://example.com/jobs/degraded-http",
			"**Legitimacy:** Proceed with Caution",
			"**Verification:** manual review",
			"",
			"---",
			"",
			"Degraded report body.",
			"",
		].join("\n"),
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"batch/tracker-additions/2-degraded-http.tsv",
		"2\t2026-04-21\tDegraded Co\tRole\tApplied\t3.8/5\t\t[002](reports/002-degraded-http.md)\tNeeds review\n",
	);

	await saveEvaluationSession(runtimeStore, {
		sessionId: "session-eval-pending",
		status: "pending",
		updatedAt: "2026-04-21T09:00:00.000Z",
		workflow: "single-evaluation",
	});
	await saveEvaluationJob(runtimeStore, {
		jobId: "job-eval-pending",
		sessionId: "session-eval-pending",
		status: "queued",
		updatedAt: "2026-04-21T09:00:00.000Z",
	});

	await saveEvaluationSession(runtimeStore, {
		activeJobId: "job-eval-running",
		sessionId: "session-eval-running",
		status: "running",
		updatedAt: "2026-04-21T09:10:00.000Z",
		workflow: "single-evaluation",
	});
	await saveEvaluationJob(runtimeStore, {
		jobId: "job-eval-running",
		sessionId: "session-eval-running",
		status: "running",
		updatedAt: "2026-04-21T09:10:00.000Z",
	});
	await saveEvaluationCheckpoint(runtimeStore, {
		completedSteps: [
			"validated-input",
			"captured-job-description",
			"scored-fit",
			"prepared-report",
		],
		cursor: "prepared-report",
		jobId: "job-eval-running",
		sessionId: "session-eval-running",
		updatedAt: "2026-04-21T09:10:00.000Z",
		value: {
			stage: "report-draft",
		},
	});

	const pausedApproval = await seedWaitingApprovalContext({
		approvalRuntime,
		jobId: "job-eval-approval",
		observability,
		requestId: "request-eval-approval",
		sessionId: "session-eval-approval",
		store: runtimeStore,
		timestamp: "2026-04-21T09:20:00.000Z",
		title: "Review evaluation approval",
		traceId: "trace-eval-approval",
		workflow: "auto-pipeline",
	});

	await saveEvaluationSession(runtimeStore, {
		activeJobId: "job-eval-failed",
		sessionId: "session-eval-failed",
		status: "failed",
		updatedAt: "2026-04-21T09:30:00.000Z",
		workflow: "single-evaluation",
	});
	await saveEvaluationJob(runtimeStore, {
		error: {
			message: "JD extraction failed.",
		},
		jobId: "job-eval-failed",
		sessionId: "session-eval-failed",
		status: "failed",
		updatedAt: "2026-04-21T09:30:00.000Z",
	});
	await observability.recordEvent({
		correlation: {
			jobId: "job-eval-failed",
			requestId: "request-eval-failed",
			sessionId: "session-eval-failed",
			traceId: "trace-eval-failed",
		},
		eventType: "job-failed",
		level: "error",
		metadata: {
			message: "JD extraction failed.",
			runId: "job-eval-failed-run",
		},
		occurredAt: "2026-04-21T09:30:00.000Z",
		summary: "JD extraction failed.",
	});

	await saveEvaluationSession(runtimeStore, {
		sessionId: "session-eval-completed",
		status: "completed",
		updatedAt: "2026-04-21T09:40:00.000Z",
		context: {
			evaluationLaunch: {
				canonicalUrl: null,
				host: null,
				kind: "raw-jd",
				promptRedacted: true,
			},
			workflow: "single-evaluation",
		},
		workflow: "single-evaluation",
	});
	await saveEvaluationJob(runtimeStore, {
		jobId: "job-eval-completed",
		result: {
			legitimacy: "High Confidence",
			pdf: "output/001-ready-http.pdf",
			report: "reports/001-ready-http.md",
			report_num: "001",
			score: 4.9,
			tracker: "batch/tracker-additions/1-ready-http.tsv",
			warnings: [],
		},
		sessionId: "session-eval-completed",
		status: "completed",
		updatedAt: "2026-04-21T09:40:00.000Z",
	});

	await saveEvaluationSession(runtimeStore, {
		sessionId: "session-eval-degraded",
		status: "completed",
		updatedAt: "2026-04-21T09:50:00.000Z",
		context: {
			evaluationLaunch: {
				canonicalUrl: "https://example.com/jobs/degraded-http",
				host: "example.com",
				kind: "job-url",
				promptRedacted: true,
			},
			workflow: "auto-pipeline",
		},
		workflow: "auto-pipeline",
	});
	await saveEvaluationJob(runtimeStore, {
		jobId: "job-eval-degraded",
		result: {
			legitimacy: "Proceed with Caution",
			pdf: "output/002-missing-http.pdf",
			report: "reports/002-degraded-http.md",
			report_num: "002",
			score: 3.8,
			tracker: "batch/tracker-additions/2-degraded-http.tsv",
			warnings: [
				"Manual legitimacy review required.",
				"PDF generation is incomplete.",
			],
		},
		sessionId: "session-eval-degraded",
		status: "completed",
		updatedAt: "2026-04-21T09:50:00.000Z",
	});

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: pendingPayload, response: pendingResponse } =
			await readJsonResponse(
				`${handle.url}/evaluation-result?sessionId=session-eval-pending`,
			);

		assert.equal(pendingResponse.status, 200);
		assert.equal((pendingPayload as { status: string }).status, "ready");
		assert.equal(
			(
				pendingPayload as {
					summary: { state: string; job: { status: string } };
				}
			).summary.state,
			"pending",
		);
		assert.equal(
			(
				pendingPayload as {
					summary: { state: string; job: { status: string } };
				}
			).summary.job.status,
			"queued",
		);

		const { payload: runningPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?sessionId=session-eval-running&previewLimit=2`,
		);

		assert.equal(
			(
				runningPayload as {
					summary: {
						state: string;
						checkpoint: { completedSteps: string[]; hasMore: boolean };
					};
				}
			).summary.state,
			"running",
		);
		assert.deepEqual(
			(
				runningPayload as {
					summary: {
						checkpoint: { completedSteps: string[]; hasMore: boolean };
					};
				}
			).summary.checkpoint.completedSteps,
			["validated-input", "captured-job-description"],
		);
		assert.equal(
			(
				runningPayload as {
					summary: {
						checkpoint: { completedSteps: string[]; hasMore: boolean };
					};
				}
			).summary.checkpoint.hasMore,
			true,
		);

		const { payload: approvalPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?sessionId=session-eval-approval`,
		);

		assert.equal(
			(
				approvalPayload as {
					summary: {
						state: string;
						handoff: {
							state: string;
							approval: { approvalId: string; status: string };
						};
					};
				}
			).summary.state,
			"approval-paused",
		);
		assert.equal(
			(
				approvalPayload as {
					summary: {
						handoff: {
							state: string;
							approval: { approvalId: string; status: string };
						};
					};
				}
			).summary.handoff.state,
			"waiting-for-approval",
		);
		assert.equal(
			(
				approvalPayload as {
					summary: {
						handoff: {
							state: string;
							approval: { approvalId: string; status: string };
						};
					};
				}
			).summary.handoff.approval.approvalId,
			pausedApproval.approvalId,
		);

		const { payload: failedPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?sessionId=session-eval-failed`,
		);

		assert.equal(
			(
				failedPayload as {
					summary: {
						state: string;
						failure: { message: string };
						handoff: { state: string; resumeAllowed: boolean };
					};
				}
			).summary.state,
			"failed",
		);
		assert.equal(
			(
				failedPayload as {
					summary: {
						state: string;
						failure: { message: string };
						handoff: { state: string; resumeAllowed: boolean };
					};
				}
			).summary.failure.message,
			"JD extraction failed.",
		);
		assert.equal(
			(
				failedPayload as {
					summary: {
						state: string;
						failure: { message: string };
						handoff: { state: string; resumeAllowed: boolean };
					};
				}
			).summary.handoff.state,
			"resume-ready",
		);

		const { payload: completedPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?sessionId=session-eval-completed`,
		);

		assert.equal(
			(
				completedPayload as {
					summary: {
						inputProvenance: {
							kind: string;
							canonicalUrl: string | null;
						};
						reviewFocus: {
							pipelineReview: {
								availability: string;
								reportNumber: string | null;
								section: string;
								url: string | null;
							};
							reportViewer: {
								availability: string;
								reportPath: string | null;
							};
							trackerWorkspace: {
								availability: string;
								reportNumber: string | null;
							};
						};
						state: string;
						closeout: { state: string };
						score: number;
						artifacts: {
							report: { state: string };
							pdf: { state: string };
							tracker: { state: string };
						};
					};
				}
			).summary.state,
			"completed",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						state: string;
						closeout: { state: string };
						score: number;
						artifacts: {
							report: { state: string };
							pdf: { state: string };
							tracker: { state: string };
						};
					};
				}
			).summary.closeout.state,
			"review-ready",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						state: string;
						closeout: { state: string };
						score: number;
						artifacts: {
							report: { state: string };
							pdf: { state: string };
							tracker: { state: string };
						};
					};
				}
			).summary.score,
			4.9,
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						artifacts: {
							report: { state: string };
							pdf: { state: string };
							tracker: { state: string };
						};
					};
				}
			).summary.artifacts.report.state,
			"ready",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						artifacts: {
							report: { state: string };
							pdf: { state: string };
							tracker: { state: string };
						};
					};
				}
			).summary.artifacts.pdf.state,
			"ready",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						artifacts: {
							report: { state: string };
							pdf: { state: string };
							tracker: { state: string };
						};
					};
				}
			).summary.artifacts.tracker.state,
			"ready",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						inputProvenance: {
							kind: string;
							canonicalUrl: string | null;
						};
					};
				}
			).summary.inputProvenance.kind,
			"raw-jd",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						verification: {
							status: string;
							source: string;
							url: string | null;
						};
					};
				}
			).summary.verification.status,
			"not-applicable",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						verification: {
							status: string;
							source: string;
							url: string | null;
						};
					};
				}
			).summary.verification.source,
			"none",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						reviewFocus: {
							reportViewer: {
								availability: string;
								reportPath: string | null;
							};
							pipelineReview: {
								availability: string;
								reportNumber: string | null;
								section: string;
							};
							trackerWorkspace: {
								availability: string;
								reportNumber: string | null;
							};
						};
					};
				}
			).summary.reviewFocus.reportViewer.availability,
			"ready",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						reviewFocus: {
							reportViewer: {
								availability: string;
								reportPath: string | null;
							};
						};
					};
				}
			).summary.reviewFocus.reportViewer.reportPath,
			"reports/001-ready-http.md",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						reviewFocus: {
							pipelineReview: {
								availability: string;
								reportNumber: string | null;
								section: string;
							};
						};
					};
				}
			).summary.reviewFocus.pipelineReview.reportNumber,
			"001",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						reviewFocus: {
							pipelineReview: {
								availability: string;
								reportNumber: string | null;
								section: string;
							};
						};
					};
				}
			).summary.reviewFocus.pipelineReview.section,
			"processed",
		);
		assert.equal(
			(
				completedPayload as {
					summary: {
						reviewFocus: {
							trackerWorkspace: {
								availability: string;
								reportNumber: string | null;
							};
						};
					};
				}
			).summary.reviewFocus.trackerWorkspace.reportNumber,
			"001",
		);

		const { payload: degradedPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?sessionId=session-eval-degraded&previewLimit=1`,
		);

		assert.equal(
			(
				degradedPayload as {
					summary: {
						state: string;
						closeout: { state: string };
						artifacts: { pdf: { state: string } };
						inputProvenance: {
							kind: string;
							canonicalUrl: string | null;
							host: string | null;
						};
						reviewFocus: {
							pipelineReview: {
								availability: string;
								reportNumber: string | null;
								section: string;
								url: string | null;
							};
							trackerWorkspace: {
								availability: string;
								reportNumber: string | null;
							};
						};
						verification: {
							message: string;
							result: string;
							source: string;
							status: string;
							url: string | null;
						};
						warnings: { items: Array<{ message: string }>; hasMore: boolean };
						workflow: string;
					};
				}
			).summary.state,
			"degraded",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						state: string;
						closeout: { state: string };
						artifacts: { pdf: { state: string } };
						warnings: { items: Array<{ message: string }>; hasMore: boolean };
						workflow: string;
					};
				}
			).summary.closeout.state,
			"attention-required",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						state: string;
						closeout: { state: string };
						artifacts: { pdf: { state: string } };
						warnings: { items: Array<{ message: string }>; hasMore: boolean };
						workflow: string;
					};
				}
			).summary.artifacts.pdf.state,
			"missing",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						state: string;
						closeout: { state: string };
						artifacts: { pdf: { state: string } };
						warnings: { items: Array<{ message: string }>; hasMore: boolean };
						workflow: string;
					};
				}
			).summary.warnings.items.length,
			1,
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						state: string;
						closeout: { state: string };
						artifacts: { pdf: { state: string } };
						inputProvenance: {
							kind: string;
							canonicalUrl: string | null;
							host: string | null;
						};
						reviewFocus: {
							pipelineReview: {
								availability: string;
								reportNumber: string | null;
								section: string;
								url: string | null;
							};
							trackerWorkspace: {
								availability: string;
								reportNumber: string | null;
							};
						};
						verification: {
							message: string;
							result: string;
							source: string;
							status: string;
							url: string | null;
						};
						warnings: { items: Array<{ message: string }>; hasMore: boolean };
						workflow: string;
					};
				}
			).summary.warnings.hasMore,
			true,
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						state: string;
						closeout: { state: string };
						artifacts: { pdf: { state: string } };
						warnings: { items: Array<{ message: string }>; hasMore: boolean };
						workflow: string;
					};
				}
			).summary.workflow,
			"auto-pipeline",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						inputProvenance: {
							kind: string;
							canonicalUrl: string | null;
							host: string | null;
						};
					};
				}
			).summary.inputProvenance.kind,
			"job-url",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						inputProvenance: {
							kind: string;
							canonicalUrl: string | null;
							host: string | null;
						};
					};
				}
			).summary.inputProvenance.canonicalUrl,
			"https://example.com/jobs/degraded-http",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						inputProvenance: {
							kind: string;
							canonicalUrl: string | null;
							host: string | null;
						};
					};
				}
			).summary.inputProvenance.host,
			"example.com",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						verification: {
							message: string;
							result: string;
							source: string;
							status: string;
							url: string | null;
						};
					};
				}
			).summary.verification.source,
			"report-header",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						verification: {
							message: string;
							result: string;
							source: string;
							status: string;
							url: string | null;
						};
					};
				}
			).summary.verification.status,
			"needs-review",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						verification: {
							message: string;
							result: string;
							source: string;
							status: string;
							url: string | null;
						};
					};
				}
			).summary.verification.result,
			"uncertain",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						verification: {
							message: string;
							result: string;
							source: string;
							status: string;
							url: string | null;
						};
					};
				}
			).summary.verification.url,
			"https://example.com/jobs/degraded-http",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						reviewFocus: {
							pipelineReview: {
								availability: string;
								reportNumber: string | null;
								section: string;
								url: string | null;
							};
						};
					};
				}
			).summary.reviewFocus.pipelineReview.availability,
			"ready",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						reviewFocus: {
							pipelineReview: {
								availability: string;
								reportNumber: string | null;
								section: string;
								url: string | null;
							};
						};
					};
				}
			).summary.reviewFocus.pipelineReview.reportNumber,
			"002",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						reviewFocus: {
							trackerWorkspace: {
								availability: string;
								reportNumber: string | null;
							};
						};
					};
				}
			).summary.reviewFocus.trackerWorkspace.availability,
			"ready",
		);
		assert.equal(
			(
				degradedPayload as {
					summary: {
						reviewFocus: {
							trackerWorkspace: {
								availability: string;
								reportNumber: string | null;
							};
						};
					};
				}
			).summary.reviewFocus.trackerWorkspace.reportNumber,
			"002",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("evaluation-result route supports latest-session fallback, workflow filters, unsupported workflows, and invalid input handling", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({
		accountId: "acct-http-evaluation-result-fallback",
	});
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR:
					"jobhunt-http-evaluation-result-fallback-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const runtimeStore = await services.operationalStore.getStore();

	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/010-single-http.md",
		"# Single evaluation report\n",
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"output/010-single-http.pdf",
		"single pdf\n",
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"batch/tracker-additions/10-single-http.tsv",
		"10\t2026-04-21\tSingle Co\tRole\tApplied\t4.4/5\toutput/010-single-http.pdf\t[010](reports/010-single-http.md)\tSingle\n",
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/011-auto-http.md",
		"# Auto pipeline report\n",
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"output/011-auto-http.pdf",
		"auto pdf\n",
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"batch/tracker-additions/11-auto-http.tsv",
		"11\t2026-04-21\tAuto Co\tRole\tApplied\t4.7/5\toutput/011-auto-http.pdf\t[011](reports/011-auto-http.md)\tAuto\n",
	);

	await saveEvaluationSession(runtimeStore, {
		sessionId: "session-fallback-single",
		status: "completed",
		updatedAt: "2026-04-21T10:00:00.000Z",
		workflow: "single-evaluation",
	});
	await saveEvaluationJob(runtimeStore, {
		jobId: "job-fallback-single",
		result: {
			legitimacy: "High Confidence",
			pdf: "output/010-single-http.pdf",
			report: "reports/010-single-http.md",
			report_num: "010",
			score: 4.4,
			tracker: "batch/tracker-additions/10-single-http.tsv",
			warnings: [],
		},
		sessionId: "session-fallback-single",
		status: "completed",
		updatedAt: "2026-04-21T10:00:00.000Z",
	});

	await saveEvaluationSession(runtimeStore, {
		sessionId: "session-fallback-auto",
		status: "completed",
		updatedAt: "2026-04-21T10:05:00.000Z",
		workflow: "auto-pipeline",
	});
	await saveEvaluationJob(runtimeStore, {
		jobId: "job-fallback-auto",
		result: {
			legitimacy: "High Confidence",
			pdf: "output/011-auto-http.pdf",
			report: "reports/011-auto-http.md",
			report_num: "011",
			score: 4.7,
			tracker: "batch/tracker-additions/11-auto-http.tsv",
			warnings: [],
		},
		sessionId: "session-fallback-auto",
		status: "completed",
		updatedAt: "2026-04-21T10:05:00.000Z",
	});

	await saveEvaluationSession(runtimeStore, {
		sessionId: "session-unsupported-workflow",
		status: "completed",
		updatedAt: "2026-04-21T10:10:00.000Z",
		workflow: "tracker-status",
	});
	await saveEvaluationJob(runtimeStore, {
		jobId: "job-unsupported-workflow",
		sessionId: "session-unsupported-workflow",
		status: "completed",
		updatedAt: "2026-04-21T10:10:00.000Z",
	});

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: fallbackPayload, response: fallbackResponse } =
			await readJsonResponse(`${handle.url}/evaluation-result?previewLimit=2`);

		assert.equal(fallbackResponse.status, 200);
		assert.equal(
			(
				fallbackPayload as {
					summary: { session: { sessionId: string } };
					recentSessions: Array<{ sessionId: string }>;
				}
			).summary.session.sessionId,
			"session-fallback-auto",
		);
		assert.deepEqual(
			(
				fallbackPayload as {
					summary: { session: { sessionId: string } };
					recentSessions: Array<{ sessionId: string }>;
				}
			).recentSessions.map((session) => session.sessionId),
			["session-fallback-auto", "session-fallback-single"],
		);

		const { payload: singleWorkflowPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?workflow=single-evaluation&previewLimit=1`,
		);

		assert.equal(
			(
				singleWorkflowPayload as {
					summary: { session: { sessionId: string } };
					recentSessions: Array<{ sessionId: string; workflow: string }>;
				}
			).summary.session.sessionId,
			"session-fallback-single",
		);
		assert.equal(
			(
				singleWorkflowPayload as {
					summary: { session: { sessionId: string } };
					recentSessions: Array<{ sessionId: string; workflow: string }>;
				}
			).recentSessions[0]?.workflow,
			"single-evaluation",
		);

		const { payload: unsupportedFilterPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?workflow=tracker-status`,
		);

		assert.equal(
			(
				unsupportedFilterPayload as {
					summary: { state: string };
					recentSessions: Array<{ sessionId: string }>;
				}
			).summary.state,
			"unsupported-workflow",
		);
		assert.equal(
			(
				unsupportedFilterPayload as {
					summary: { state: string };
					recentSessions: Array<{ sessionId: string }>;
				}
			).recentSessions.length,
			0,
		);

		const { payload: unsupportedSessionPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?sessionId=session-unsupported-workflow`,
		);

		assert.equal(
			(
				unsupportedSessionPayload as {
					summary: { state: string };
				}
			).summary.state,
			"unsupported-workflow",
		);

		const { payload: missingSessionPayload } = await readJsonResponse(
			`${handle.url}/evaluation-result?sessionId=missing-session`,
		);

		assert.equal(
			(
				missingSessionPayload as {
					summary: { state: string };
				}
			).summary.state,
			"missing-session",
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(`${handle.url}/evaluation-result?previewLimit=0`);

		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-evaluation-result-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("report-viewer route supports selected report reads, latest fallback, stale selections, invalid paths, and bounded artifact browsing", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-report-viewer" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-report-viewer-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});

	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/021-http-selected-2026-04-22.md",
		[
			"# Evaluation: HTTP Co -- Selected Role",
			"",
			"**Date:** 2026-04-22",
			"**URL:** https://example.com/jobs/selected-role",
			"**Archetype:** Platform Engineering",
			"**Score:** 4.2/5",
			"**Legitimacy:** High Confidence",
			"**Verification:** active via browser review",
			"**PDF:** output/cv-http-selected-2026-04-22.pdf",
			"",
			"---",
			"",
			"## Match",
			"",
			"Selected report body.",
			"",
		].join("\n"),
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/022-http-latest-2026-04-23.md",
		[
			"# Evaluation: HTTP Co -- Latest Role",
			"",
			"**Date:** 2026-04-23",
			"**URL:** https://example.com/jobs/latest-role",
			"**Archetype:** Applied AI",
			"**Score:** 4.8/5",
			"**Legitimacy:** Proceed with Caution",
			"**Verification:** active via browser review",
			"**PDF:** output/cv-http-latest-2026-04-23.pdf",
			"",
			"---",
			"",
			"## Summary",
			"",
			"Latest report body.",
			"",
		].join("\n"),
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"output/cv-http-selected-2026-04-22.pdf",
		"selected pdf\n",
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"output/cv-http-latest-2026-04-23.pdf",
		"latest pdf\n",
	);

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: selectedPayload, response: selectedResponse } =
			await readJsonResponse(
				`${handle.url}/report-viewer?group=reports&limit=2&reportPath=reports/021-http-selected-2026-04-22.md`,
			);

		assert.equal(selectedResponse.status, 200);
		assert.equal((selectedPayload as { status: string }).status, "ready");
		assert.equal(
			(
				selectedPayload as {
					selectedReport: {
						state: string;
						origin: string;
						repoRelativePath: string;
					};
				}
			).selectedReport.state,
			"ready",
		);
		assert.equal(
			(
				selectedPayload as {
					selectedReport: {
						state: string;
						origin: string;
						repoRelativePath: string;
					};
				}
			).selectedReport.origin,
			"selected",
		);
		assert.equal(
			(
				selectedPayload as {
					selectedReport: {
						header: {
							title: string;
							legitimacy: string;
							pdf: { exists: boolean; repoRelativePath: string };
						};
					};
				}
			).selectedReport.header.title,
			"Evaluation: HTTP Co -- Selected Role",
		);
		assert.equal(
			(
				selectedPayload as {
					selectedReport: {
						header: {
							title: string;
							legitimacy: string;
							pdf: { exists: boolean; repoRelativePath: string };
						};
					};
				}
			).selectedReport.header.legitimacy,
			"High Confidence",
		);
		assert.equal(
			(
				selectedPayload as {
					selectedReport: {
						header: {
							title: string;
							legitimacy: string;
							pdf: { exists: boolean; repoRelativePath: string };
						};
					};
				}
			).selectedReport.header.pdf.repoRelativePath,
			"output/cv-http-selected-2026-04-22.pdf",
		);
		assert.equal(
			(
				selectedPayload as {
					selectedReport: {
						header: {
							title: string;
							legitimacy: string;
							pdf: { exists: boolean; repoRelativePath: string };
						};
					};
				}
			).selectedReport.header.pdf.exists,
			true,
		);
		assert.match(
			(
				selectedPayload as {
					selectedReport: { body: string };
				}
			).selectedReport.body,
			/Selected report body\./,
		);
		assert.equal(
			(
				selectedPayload as {
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{
							kind: string;
							repoRelativePath: string;
							selected: boolean;
						}>;
						totalCount: number;
					};
				}
			).recentArtifacts.totalCount,
			2,
		);
		assert.equal(
			(
				selectedPayload as {
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{
							kind: string;
							repoRelativePath: string;
							selected: boolean;
						}>;
						totalCount: number;
					};
				}
			).recentArtifacts.hasMore,
			false,
		);
		assert.equal(
			(
				selectedPayload as {
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{
							kind: string;
							repoRelativePath: string;
							selected: boolean;
						}>;
						totalCount: number;
					};
				}
			).recentArtifacts.items.some(
				(item) =>
					item.repoRelativePath === "reports/021-http-selected-2026-04-22.md" &&
					item.selected,
			),
			true,
		);

		const { payload: allArtifactsPayload } = await readJsonResponse(
			`${handle.url}/report-viewer?group=all&limit=3`,
		);

		assert.equal(
			(
				allArtifactsPayload as {
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{
							kind: string;
							repoRelativePath: string;
							selected: boolean;
						}>;
						totalCount: number;
					};
				}
			).recentArtifacts.totalCount,
			4,
		);
		assert.equal(
			(
				allArtifactsPayload as {
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{
							kind: string;
							repoRelativePath: string;
							selected: boolean;
						}>;
						totalCount: number;
					};
				}
			).recentArtifacts.hasMore,
			true,
		);
		assert.equal(
			(
				allArtifactsPayload as {
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{
							kind: string;
							repoRelativePath: string;
							selected: boolean;
						}>;
						totalCount: number;
					};
				}
			).recentArtifacts.items.some((item) => item.kind === "pdf"),
			true,
		);

		const { payload: fallbackPayload } = await readJsonResponse(
			`${handle.url}/report-viewer?group=reports&limit=1`,
		);

		assert.equal(
			(
				fallbackPayload as {
					selectedReport: { origin: string; repoRelativePath: string };
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{ repoRelativePath: string }>;
						totalCount: number;
					};
				}
			).selectedReport.origin,
			"latest",
		);
		assert.equal(
			(
				fallbackPayload as {
					selectedReport: { origin: string; repoRelativePath: string };
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{ repoRelativePath: string }>;
						totalCount: number;
					};
				}
			).selectedReport.repoRelativePath,
			"reports/022-http-latest-2026-04-23.md",
		);
		assert.equal(
			(
				fallbackPayload as {
					selectedReport: { origin: string; repoRelativePath: string };
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{ repoRelativePath: string }>;
						totalCount: number;
					};
				}
			).recentArtifacts.items[0]?.repoRelativePath,
			"reports/022-http-latest-2026-04-23.md",
		);
		assert.equal(
			(
				fallbackPayload as {
					selectedReport: { origin: string; repoRelativePath: string };
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{ repoRelativePath: string }>;
						totalCount: number;
					};
				}
			).recentArtifacts.totalCount,
			2,
		);
		assert.equal(
			(
				fallbackPayload as {
					selectedReport: { origin: string; repoRelativePath: string };
					recentArtifacts: {
						hasMore: boolean;
						items: Array<{ repoRelativePath: string }>;
						totalCount: number;
					};
				}
			).recentArtifacts.hasMore,
			true,
		);

		const { payload: missingPayload } = await readJsonResponse(
			`${handle.url}/report-viewer?reportPath=reports/099-http-missing-2026-04-22.md`,
		);

		assert.equal(
			(
				missingPayload as {
					selectedReport: {
						message: string;
						origin: string;
						requestedRepoRelativePath: string;
						state: string;
					};
				}
			).selectedReport.state,
			"missing",
		);
		assert.equal(
			(
				missingPayload as {
					selectedReport: {
						message: string;
						origin: string;
						requestedRepoRelativePath: string;
						state: string;
					};
				}
			).selectedReport.origin,
			"selected",
		);
		assert.equal(
			(
				missingPayload as {
					selectedReport: {
						message: string;
						origin: string;
						requestedRepoRelativePath: string;
						state: string;
					};
				}
			).selectedReport.requestedRepoRelativePath,
			"reports/099-http-missing-2026-04-22.md",
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(
				`${handle.url}/report-viewer?reportPath=../profile/cv.md`,
			);

		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-report-viewer-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("pipeline-review route reports missing pipeline data, parsed queue rows, warning classification, stale selections, and invalid query handling", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-pipeline-review" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-pipeline-review-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: emptyPayload, response: emptyResponse } =
			await readJsonResponse(`${handle.url}/pipeline-review`);

		assert.equal(emptyResponse.status, 200);
		assert.equal((emptyPayload as { status: string }).status, "ready");
		assert.equal(
			(
				emptyPayload as {
					queue: { totalCount: number };
					shortlist: { available: boolean };
					selectedDetail: { state: string };
				}
			).queue.totalCount,
			0,
		);
		assert.equal(
			(
				emptyPayload as {
					queue: { totalCount: number };
					shortlist: { available: boolean };
					selectedDetail: { state: string };
				}
			).shortlist.available,
			false,
		);
		assert.equal(
			(
				emptyPayload as {
					queue: { totalCount: number };
					shortlist: { available: boolean };
					selectedDetail: { state: string };
				}
			).selectedDetail.state,
			"empty",
		);

		await writeRepoArtifact(
			fixture.repoRoot,
			"data/pipeline.md",
			[
				"# Pipeline",
				"",
				"## Shortlist",
				"",
				"Last refreshed: 2026-04-22 by npm run scan.",
				"",
				"Campaign guidance: Current strongest lane: Forward Deployed.",
				"",
				"Bucket counts:",
				"- Strongest fit: 2",
				"- Possible fit: 1",
				"- Adjacent or noisy: 4",
				"",
				"Top 10 to evaluate first:",
				"1. Strongest fit | https://example.com/jobs/pending-fde | Acme | Forward Deployed Engineer | direct forward-deployed title",
				"2. Possible fit | https://example.com/jobs/processed-caution | Beta | Solutions Architect | aligned geography",
				"",
				"## Pending",
				"",
				"- [ ] https://example.com/jobs/pending-fde | Acme | Forward Deployed Engineer",
				"- [ ] https://example.com/jobs/pending-architect | Beta | Solutions Architect",
				"",
				"## Processed",
				"",
				"- [x] #021 | https://example.com/jobs/processed-caution | Beta | Solutions Architect | 4.2/5 | PDF Yes",
				"- [x] #022 | https://example.com/jobs/processed-low-score | Gamma | Sales Engineer | 3.1/5 | PDF No",
				"- [x] #023 | https://example.com/jobs/processed-suspicious | Delta | AI Deployment Lead | 2.5/5 | PDF Yes",
				"- [!] https://example.com/jobs/bad-row -- Error: parse me later",
				"",
			].join("\n"),
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"reports/021-beta-solutions-architect-2026-04-22.md",
			[
				"# Evaluation: Beta -- Solutions Architect",
				"",
				"**Date:** 2026-04-22",
				"**URL:** https://example.com/jobs/processed-caution",
				"**Archetype:** Solutions Architect",
				"**Score:** 4.2/5",
				"**Legitimacy:** Proceed with Caution",
				"**Verification:** active via browser review",
				"**PDF:** output/cv-beta-solutions-architect-2026-04-22.pdf",
				"",
				"---",
				"",
				"Processed caution report body.",
				"",
			].join("\n"),
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"reports/023-delta-ai-deployment-lead-2026-04-22.md",
			[
				"# Evaluation: Delta -- AI Deployment Lead",
				"",
				"**Date:** 2026-04-22",
				"**URL:** https://example.com/jobs/processed-suspicious",
				"**Archetype:** AI Deployment",
				"**Score:** 2.5/5",
				"**Legitimacy:** Suspicious",
				"**Verification:** unconfirmed",
				"**PDF:** output/cv-delta-ai-deployment-lead-2026-04-22.pdf",
				"",
				"---",
				"",
				"Processed suspicious report body.",
				"",
			].join("\n"),
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"output/cv-beta-solutions-architect-2026-04-22.pdf",
			"beta pdf\n",
		);

		const { payload: selectedPayload, response: selectedResponse } =
			await readJsonResponse(
				`${handle.url}/pipeline-review?section=processed&sort=score&limit=3&reportNumber=023`,
			);

		assert.equal(selectedResponse.status, 200);
		assert.equal(
			(
				selectedPayload as {
					shortlist: {
						available: boolean;
						topRoles: Array<{ role: string }>;
					};
				}
			).shortlist.available,
			true,
		);
		assert.equal(
			(
				selectedPayload as {
					shortlist: {
						available: boolean;
						topRoles: Array<{ role: string }>;
					};
				}
			).shortlist.topRoles[0]?.role,
			"Forward Deployed Engineer",
		);
		assert.deepEqual(
			(
				selectedPayload as {
					queue: {
						counts: { malformed: number; pending: number; processed: number };
					};
				}
			).queue.counts,
			{
				malformed: 1,
				pending: 2,
				processed: 3,
			},
		);
		assert.equal(
			(
				selectedPayload as {
					queue: {
						items: Array<{
							reportNumber: string | null;
							warnings: Array<{ code: string }>;
						}>;
					};
				}
			).queue.items[0]?.reportNumber,
			"021",
		);
		assert.ok(
			(
				selectedPayload as {
					queue: {
						items: Array<{
							reportNumber: string | null;
							warnings: Array<{ code: string }>;
						}>;
					};
				}
			).queue.items[0]?.warnings.some(
				(warning) => warning.code === "caution-legitimacy",
			),
		);
		assert.ok(
			(
				selectedPayload as {
					queue: {
						items: Array<{
							reportNumber: string | null;
							warnings: Array<{ code: string }>;
						}>;
					};
				}
			).queue.items[1]?.warnings.some(
				(warning) => warning.code === "missing-report",
			),
		);
		assert.equal(
			(
				selectedPayload as {
					selectedDetail: {
						origin: string;
						row: {
							legitimacy: string | null;
							pdf: { exists: boolean };
							report: { exists: boolean };
							warnings: Array<{ code: string }>;
						} | null;
						state: string;
					};
				}
			).selectedDetail.state,
			"ready",
		);
		assert.equal(
			(
				selectedPayload as {
					selectedDetail: {
						origin: string;
						row: {
							legitimacy: string | null;
							pdf: { exists: boolean };
							report: { exists: boolean };
							warnings: Array<{ code: string }>;
						} | null;
						state: string;
					};
				}
			).selectedDetail.origin,
			"report-number",
		);
		assert.equal(
			(
				selectedPayload as {
					selectedDetail: {
						origin: string;
						row: {
							legitimacy: string | null;
							pdf: { exists: boolean };
							report: { exists: boolean };
							warnings: Array<{ code: string }>;
						} | null;
						state: string;
					};
				}
			).selectedDetail.row?.legitimacy,
			"Suspicious",
		);
		assert.equal(
			(
				selectedPayload as {
					selectedDetail: {
						origin: string;
						row: {
							legitimacy: string | null;
							pdf: { exists: boolean };
							report: { exists: boolean };
							warnings: Array<{ code: string }>;
						} | null;
						state: string;
					};
				}
			).selectedDetail.row?.report.exists,
			true,
		);
		assert.equal(
			(
				selectedPayload as {
					selectedDetail: {
						origin: string;
						row: {
							legitimacy: string | null;
							pdf: { exists: boolean };
							report: { exists: boolean };
							warnings: Array<{ code: string }>;
						} | null;
						state: string;
					};
				}
			).selectedDetail.row?.pdf.exists,
			false,
		);
		assert.ok(
			(
				selectedPayload as {
					selectedDetail: {
						row: {
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.warnings.some(
				(warning) => warning.code === "suspicious-legitimacy",
			),
		);
		assert.ok(
			(
				selectedPayload as {
					selectedDetail: {
						row: {
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.warnings.some(
				(warning) => warning.code === "missing-pdf",
			),
		);

		const { payload: stalePayload } = await readJsonResponse(
			`${handle.url}/pipeline-review?section=pending&reportNumber=023`,
		);

		assert.equal(
			(
				stalePayload as {
					selectedDetail: { message: string; state: string };
				}
			).selectedDetail.state,
			"missing",
		);
		assert.match(
			(
				stalePayload as {
					selectedDetail: { message: string; state: string };
				}
			).selectedDetail.message,
			/no longer present/i,
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(
				`${handle.url}/pipeline-review?reportNumber=023&url=https://example.com/jobs/processed-suspicious`,
			);

		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-pipeline-review-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("scan-review routes cover empty summaries, ignore or restore actions, approval-paused runs, degraded runs, and invalid input handling", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-scan-review" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-scan-review-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const runtimeStore = await services.operationalStore.getStore();
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: emptyPayload, response: emptyResponse } =
			await readJsonResponse(`${handle.url}/scan-review`);

		assert.equal(emptyResponse.status, 200);
		assert.equal((emptyPayload as { status: string }).status, "ready");
		assert.equal(
			(
				emptyPayload as {
					run: { state: string };
					shortlist: { totalCount: number };
					selectedDetail: { state: string };
				}
			).run.state,
			"idle",
		);
		assert.equal(
			(
				emptyPayload as {
					run: { state: string };
					shortlist: { totalCount: number };
					selectedDetail: { state: string };
				}
			).shortlist.totalCount,
			0,
		);
		assert.equal(
			(
				emptyPayload as {
					run: { state: string };
					shortlist: { totalCount: number };
					selectedDetail: { state: string };
				}
			).selectedDetail.state,
			"empty",
		);

		await writeRepoArtifact(
			fixture.repoRoot,
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
		await writeRepoArtifact(
			fixture.repoRoot,
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
		await saveEvaluationSession(runtimeStore, {
			activeJobId: "scan-job-ready",
			context: {
				scanReview: {
					ignoredUrls: ["https://example.com/jobs/beta-sa"],
				},
				workflow: "scan-portals",
			},
			sessionId: "scan-session-ready",
			status: "completed",
			updatedAt: "2026-04-22T09:00:00.000Z",
			workflow: "scan-portals",
		});
		await saveScanJob(runtimeStore, {
			jobId: "scan-job-ready",
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
				warnings: [
					{
						code: "scan-warning",
						detail: null,
						message: "One portal required manual review.",
					},
				],
				workflow: "scan-portals",
			},
			sessionId: "scan-session-ready",
			status: "completed",
			updatedAt: "2026-04-22T09:00:00.000Z",
		});

		const { payload: selectedPayload, response: selectedResponse } =
			await readJsonResponse(
				`${handle.url}/scan-review?sessionId=scan-session-ready&url=https://example.com/jobs/beta-sa`,
			);

		assert.equal(selectedResponse.status, 200);
		assert.equal(
			(
				selectedPayload as {
					run: {
						state: string;
						summary: { newOffersAdded: number | null };
						warnings: Array<{ code: string }>;
					};
					shortlist: {
						campaignGuidance: string | null;
						filteredCount: number;
						counts: {
							ignored: number;
							pendingOverlap: number;
							duplicateHeavy: number;
						};
						items: Array<{ warnings: Array<{ code: string }> }>;
						lastRefreshed: string | null;
					};
					selectedDetail: {
						message: string;
						row: {
							ignored: boolean;
							ignoreAction: { action: string };
							warnings: Array<{ code: string }>;
						} | null;
						state: string;
					};
				}
			).run.state,
			"completed",
		);
		assert.equal(
			(
				selectedPayload as {
					run: {
						state: string;
						summary: { newOffersAdded: number | null };
						warnings: Array<{ code: string }>;
					};
				}
			).run.summary.newOffersAdded,
			4,
		);
		assert.equal(
			(
				selectedPayload as {
					run: {
						warnings: Array<{ code: string }>;
					};
				}
			).run.warnings[0]?.code,
			"scan-warning",
		);
		assert.equal(
			(
				selectedPayload as {
					shortlist: {
						campaignGuidance: string | null;
						filteredCount: number;
						counts: {
							ignored: number;
							pendingOverlap: number;
							duplicateHeavy: number;
						};
						items: Array<{ warnings: Array<{ code: string }> }>;
						lastRefreshed: string | null;
					};
				}
			).shortlist.campaignGuidance,
			"Focus the forward deployed lane first.",
		);
		assert.equal(
			(
				selectedPayload as {
					shortlist: {
						campaignGuidance: string | null;
						filteredCount: number;
						counts: {
							ignored: number;
							pendingOverlap: number;
							duplicateHeavy: number;
						};
						items: Array<{ warnings: Array<{ code: string }> }>;
						lastRefreshed: string | null;
					};
				}
			).shortlist.lastRefreshed,
			"2026-04-22 by npm run scan.",
		);
		assert.equal(
			(
				selectedPayload as {
					shortlist: {
						filteredCount: number;
						counts: {
							ignored: number;
							pendingOverlap: number;
							duplicateHeavy: number;
						};
					};
				}
			).shortlist.filteredCount,
			2,
		);
		assert.deepEqual(
			(
				selectedPayload as {
					shortlist: {
						counts: {
							ignored: number;
							pendingOverlap: number;
							duplicateHeavy: number;
						};
					};
				}
			).shortlist.counts,
			{
				adjacentOrNoisy: 0,
				duplicateHeavy: 2,
				ignored: 1,
				pendingOverlap: 1,
				possibleFit: 1,
				strongestFit: 2,
				total: 3,
			},
		);
		assert.ok(
			(
				selectedPayload as {
					shortlist: {
						items: Array<{ warnings: Array<{ code: string }> }>;
					};
				}
			).shortlist.items[0]?.warnings.some(
				(warning) => warning.code === "duplicate-heavy",
			),
		);
		assert.ok(
			(
				selectedPayload as {
					shortlist: {
						items: Array<{ warnings: Array<{ code: string }> }>;
					};
				}
			).shortlist.items[0]?.warnings.some(
				(warning) => warning.code === "already-pending",
			),
		);
		assert.equal(
			(
				selectedPayload as {
					selectedDetail: {
						message: string;
						row: {
							ignored: boolean;
							ignoreAction: { action: string };
							warnings: Array<{ code: string }>;
						} | null;
						state: string;
					};
				}
			).selectedDetail.state,
			"ready",
		);
		assert.match(
			(
				selectedPayload as {
					selectedDetail: { message: string };
				}
			).selectedDetail.message,
			/active filters/i,
		);
		assert.equal(
			(
				selectedPayload as {
					selectedDetail: {
						row: {
							ignored: boolean;
							ignoreAction: { action: string };
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.ignored,
			true,
		);
		assert.equal(
			(
				selectedPayload as {
					selectedDetail: {
						row: {
							ignored: boolean;
							ignoreAction: { action: string };
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.ignoreAction.action,
			"restore",
		);
		assert.ok(
			(
				selectedPayload as {
					selectedDetail: {
						row: {
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.warnings.some(
				(warning) => warning.code === "already-ignored",
			),
		);
		assert.ok(
			(
				selectedPayload as {
					selectedDetail: {
						row: {
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.warnings.some(
				(warning) => warning.code === "stale-selection",
			),
		);

		const { payload: restorePayload, response: restoreResponse } =
			await readJsonResponse(`${handle.url}/scan-review/action`, {
				body: JSON.stringify({
					action: "restore",
					sessionId: "scan-session-ready",
					url: "https://example.com/jobs/beta-sa",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(restoreResponse.status, 200);
		assert.equal(
			(
				restorePayload as {
					actionResult: { action: string; visibility: string };
				}
			).actionResult.action,
			"restore",
		);
		assert.equal(
			(
				restorePayload as {
					actionResult: { action: string; visibility: string };
				}
			).actionResult.visibility,
			"visible",
		);

		const { payload: restoredSummary } = await readJsonResponse(
			`${handle.url}/scan-review?sessionId=scan-session-ready&url=https://example.com/jobs/beta-sa`,
		);

		assert.equal(
			(
				restoredSummary as {
					shortlist: { filteredCount: number };
					selectedDetail: { row: { ignored: boolean } | null };
				}
			).shortlist.filteredCount,
			3,
		);
		assert.equal(
			(
				restoredSummary as {
					shortlist: { filteredCount: number };
					selectedDetail: { row: { ignored: boolean } | null };
				}
			).selectedDetail.row?.ignored,
			false,
		);

		const { payload: ignorePayload, response: ignoreResponse } =
			await readJsonResponse(`${handle.url}/scan-review/action`, {
				body: JSON.stringify({
					action: "ignore",
					sessionId: "scan-session-ready",
					url: "https://example.com/jobs/beta-sa",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(ignoreResponse.status, 200);
		assert.equal(
			(
				ignorePayload as {
					actionResult: { action: string; visibility: string };
				}
			).actionResult.action,
			"ignore",
		);
		assert.equal(
			(
				ignorePayload as {
					actionResult: { action: string; visibility: string };
				}
			).actionResult.visibility,
			"hidden",
		);

		await saveEvaluationSession(runtimeStore, {
			activeJobId: "scan-job-paused",
			context: {
				workflow: "scan-portals",
			},
			sessionId: "scan-session-paused",
			status: "waiting",
			updatedAt: "2026-04-22T10:00:00.000Z",
			workflow: "scan-portals",
		});
		await saveScanJob(runtimeStore, {
			jobId: "scan-job-paused",
			sessionId: "scan-session-paused",
			status: "waiting",
			updatedAt: "2026-04-22T10:00:00.000Z",
			waitApprovalId: "approval-scan-1",
			waitReason: "approval",
		});
		await saveEvaluationSession(runtimeStore, {
			activeJobId: "scan-job-degraded",
			context: {
				workflow: "scan-portals",
			},
			sessionId: "scan-session-degraded",
			status: "completed",
			updatedAt: "2026-04-22T08:30:00.000Z",
			workflow: "scan-portals",
		});
		await saveScanJob(runtimeStore, {
			jobId: "scan-job-degraded",
			result: {
				invalid: true,
			},
			sessionId: "scan-session-degraded",
			status: "completed",
			updatedAt: "2026-04-22T08:30:00.000Z",
		});

		const { payload: pausedPayload } = await readJsonResponse(
			`${handle.url}/scan-review`,
		);
		const { payload: degradedPayload } = await readJsonResponse(
			`${handle.url}/scan-review?sessionId=scan-session-degraded`,
		);

		assert.equal(
			(
				pausedPayload as {
					launcher: { canStart: boolean };
					run: { approvalId: string | null; state: string };
				}
			).run.state,
			"approval-paused",
		);
		assert.equal(
			(
				pausedPayload as {
					launcher: { canStart: boolean };
					run: { approvalId: string | null; state: string };
				}
			).run.approvalId,
			"approval-scan-1",
		);
		assert.equal(
			(
				pausedPayload as {
					launcher: { canStart: boolean };
					run: { approvalId: string | null; state: string };
				}
			).launcher.canStart,
			false,
		);
		assert.equal(
			(
				degradedPayload as {
					run: { state: string; warnings: Array<{ code: string }> };
				}
			).run.state,
			"degraded",
		);
		assert.equal(
			(
				degradedPayload as {
					run: { state: string; warnings: Array<{ code: string }> };
				}
			).run.warnings[0]?.code,
			"degraded-result",
		);

		const { payload: invalidQueryPayload, response: invalidQueryResponse } =
			await readJsonResponse(`${handle.url}/scan-review?limit=0`);

		assert.equal(invalidQueryResponse.status, 400);
		assert.equal(
			(
				invalidQueryPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-scan-review-query",
		);

		const { payload: invalidActionPayload, response: invalidActionResponse } =
			await readJsonResponse(`${handle.url}/scan-review/action`, {
				body: JSON.stringify({
					action: "ignore",
					sessionId: "missing-scan-session",
					url: "https://example.com/jobs/beta-sa",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(invalidActionResponse.status, 400);
		assert.equal(
			(
				invalidActionPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-scan-review-action",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("tracker-workspace routes cover missing tracker data, report-number focus, canonical status updates, and maintenance warnings", async () => {
	const fixture = await createReadyFixture();
	await writeRepoArtifact(
		fixture.repoRoot,
		"templates/states.yml",
		[
			"states:",
			"  - id: evaluated",
			"    label: Evaluated",
			"  - id: applied",
			"    label: Applied",
			"  - id: interview",
			"    label: Interview",
			"",
		].join("\n"),
	);
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-tracker-workspace" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-tracker-workspace-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: emptyPayload, response: emptyResponse } =
			await readJsonResponse(`${handle.url}/tracker-workspace`);

		assert.equal(emptyResponse.status, 200);
		assert.equal((emptyPayload as { status: string }).status, "ready");
		assert.equal(
			(
				emptyPayload as {
					rows: { totalCount: number };
					pendingAdditions: { count: number };
					selectedDetail: { state: string };
				}
			).rows.totalCount,
			0,
		);
		assert.equal(
			(
				emptyPayload as {
					rows: { totalCount: number };
					pendingAdditions: { count: number };
					selectedDetail: { state: string };
				}
			).pendingAdditions.count,
			0,
		);
		assert.equal(
			(
				emptyPayload as {
					rows: { totalCount: number };
					pendingAdditions: { count: number };
					selectedDetail: { state: string };
				}
			).selectedDetail.state,
			"empty",
		);

		await writeRepoArtifact(
			fixture.repoRoot,
			"data/applications.md",
			[
				"# Applications Tracker",
				"",
				"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
				"| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |",
				"| 31 | 2026-04-22 | Acme | Platform Engineer | 4.6/5 | Evaluated | Y | [031](reports/031-acme-platform-engineer-2026-04-22.md) | Strongest fit in the batch |",
				"| 32 | 2026-04-21 | Beta | Solutions Architect | 3.8/5 | Applied | N | reports/032-beta-solutions-architect-2026-04-21.md | Needs confirmation on location |",
				"",
			].join("\n"),
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"reports/031-acme-platform-engineer-2026-04-22.md",
			[
				"# Evaluation: Acme -- Platform Engineer",
				"",
				"**Date:** 2026-04-22",
				"**URL:** https://example.com/jobs/acme-platform-engineer",
				"**Score:** 4.6/5",
				"**Legitimacy:** High Confidence",
				"**Verification:** active via browser review",
				"**PDF:** output/cv-acme-platform-engineer-2026-04-22.pdf",
				"",
				"---",
				"",
				"Tracker detail body.",
				"",
			].join("\n"),
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"output/cv-acme-platform-engineer-2026-04-22.pdf",
			"tracker pdf\n",
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"batch/tracker-additions/33-gamma.tsv",
			"33\t2026-04-22\tGamma\tAI Engineer\tEvaluated\t4.1/5\t\t[033](reports/033-gamma-ai-engineer-2026-04-22.md)\tPending add\n",
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"templates/states.yml",
			[
				"states:",
				"  - id: evaluated",
				"    label: Evaluated",
				"  - id: applied",
				"    label: Applied",
				"  - id: interview",
				"    label: Interview",
				"  - id: rejected",
				"    label: Rejected",
				"",
			].join("\n"),
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"scripts/verify-pipeline.mjs",
			"process.stdout.write('\\u26A0\\uFE0F pending TSVs remain\\n');\n",
		);

		const { payload: summaryPayload, response: summaryResponse } =
			await readJsonResponse(
				`${handle.url}/tracker-workspace?sort=score&limit=2&entryNumber=31`,
			);

		assert.equal(summaryResponse.status, 200);
		assert.equal(
			(
				summaryPayload as {
					pendingAdditions: { count: number };
					rows: {
						filteredCount: number;
						items: Array<{
							entryNumber: number;
							warnings: Array<{ code: string }>;
						}>;
					};
					selectedDetail: {
						origin: string;
						row: {
							header: { pdf: { exists: boolean; repoRelativePath: string } };
							report: { exists: boolean };
							status: string;
						} | null;
						state: string;
					};
					statusOptions: Array<{ label: string; count: number }>;
				}
			).pendingAdditions.count,
			1,
		);
		assert.equal(
			(
				summaryPayload as {
					rows: {
						filteredCount: number;
						items: Array<{
							entryNumber: number;
							warnings: Array<{ code: string }>;
						}>;
					};
				}
			).rows.filteredCount,
			2,
		);
		assert.equal(
			(
				summaryPayload as {
					rows: {
						filteredCount: number;
						items: Array<{
							entryNumber: number;
							warnings: Array<{ code: string }>;
						}>;
					};
				}
			).rows.items[0]?.entryNumber,
			31,
		);
		assert.ok(
			(
				summaryPayload as {
					rows: {
						filteredCount: number;
						items: Array<{
							entryNumber: number;
							warnings: Array<{ code: string }>;
						}>;
					};
				}
			).rows.items[1]?.warnings.some(
				(warning) => warning.code === "missing-report",
			),
		);
		assert.equal(
			(
				summaryPayload as {
					selectedDetail: {
						origin: string;
						row: {
							header: { pdf: { exists: boolean; repoRelativePath: string } };
							report: { exists: boolean };
							status: string;
						} | null;
						state: string;
					};
				}
			).selectedDetail.state,
			"ready",
		);
		assert.equal(
			(
				summaryPayload as {
					selectedDetail: {
						origin: string;
						row: {
							header: { pdf: { exists: boolean; repoRelativePath: string } };
							report: { exists: boolean };
							status: string;
						} | null;
						state: string;
					};
				}
			).selectedDetail.origin,
			"entry-number",
		);
		assert.equal(
			(
				summaryPayload as {
					selectedDetail: {
						origin: string;
						row: {
							header: { pdf: { exists: boolean; repoRelativePath: string } };
							report: { exists: boolean };
							status: string;
						} | null;
						state: string;
					};
				}
			).selectedDetail.row?.report.exists,
			true,
		);
		assert.equal(
			(
				summaryPayload as {
					selectedDetail: {
						origin: string;
						row: {
							header: { pdf: { exists: boolean; repoRelativePath: string } };
							report: { exists: boolean };
							status: string;
						} | null;
						state: string;
					};
				}
			).selectedDetail.row?.header?.pdf.exists,
			true,
		);
		assert.equal(
			(
				summaryPayload as {
					selectedDetail: {
						row: {
							header: { pdf: { exists: boolean; repoRelativePath: string } };
						} | null;
					};
				}
			).selectedDetail.row?.header?.pdf.repoRelativePath,
			"output/cv-acme-platform-engineer-2026-04-22.pdf",
		);
		assert.equal(
			(
				summaryPayload as {
					statusOptions: Array<{ label: string; count: number }>;
				}
			).statusOptions.find((option) => option.label === "Evaluated")?.count,
			1,
		);

		const { payload: reportFocusPayload } = await readJsonResponse(
			`${handle.url}/tracker-workspace?reportNumber=031`,
		);

		assert.equal(
			(
				reportFocusPayload as {
					filters: { reportNumber: string | null };
					selectedDetail: {
						origin: string;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).filters.reportNumber,
			"031",
		);
		assert.equal(
			(
				reportFocusPayload as {
					filters: { reportNumber: string | null };
					selectedDetail: {
						origin: string;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).selectedDetail.origin,
			"report-number",
		);
		assert.equal(
			(
				reportFocusPayload as {
					selectedDetail: {
						origin: string;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).selectedDetail.requestedReportNumber,
			"031",
		);
		assert.equal(
			(
				reportFocusPayload as {
					selectedDetail: {
						origin: string;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).selectedDetail.row?.entryNumber,
			31,
		);

		const { payload: pendingFocusPayload } = await readJsonResponse(
			`${handle.url}/tracker-workspace?reportNumber=033`,
		);

		assert.equal(
			(
				pendingFocusPayload as {
					filters: { reportNumber: string | null };
					selectedDetail: {
						origin: string;
						pendingAddition: {
							reportNumber: string | null;
							repoRelativePath: string;
						} | null;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).filters.reportNumber,
			"033",
		);
		assert.equal(
			(
				pendingFocusPayload as {
					selectedDetail: {
						origin: string;
						pendingAddition: {
							reportNumber: string | null;
							repoRelativePath: string;
						} | null;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).selectedDetail.origin,
			"report-number",
		);
		assert.equal(
			(
				pendingFocusPayload as {
					selectedDetail: {
						origin: string;
						pendingAddition: {
							reportNumber: string | null;
							repoRelativePath: string;
						} | null;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).selectedDetail.state,
			"ready",
		);
		assert.equal(
			(
				pendingFocusPayload as {
					selectedDetail: {
						origin: string;
						pendingAddition: {
							reportNumber: string | null;
							repoRelativePath: string;
						} | null;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).selectedDetail.requestedReportNumber,
			"033",
		);
		assert.equal(
			(
				pendingFocusPayload as {
					selectedDetail: {
						origin: string;
						pendingAddition: {
							reportNumber: string | null;
							repoRelativePath: string;
						} | null;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).selectedDetail.pendingAddition?.reportNumber,
			"033",
		);
		assert.equal(
			(
				pendingFocusPayload as {
					selectedDetail: {
						origin: string;
						pendingAddition: {
							reportNumber: string | null;
							repoRelativePath: string;
						} | null;
						requestedReportNumber: string | null;
						row: { entryNumber: number } | null;
						state: string;
					};
				}
			).selectedDetail.pendingAddition?.repoRelativePath,
			"batch/tracker-additions/33-gamma.tsv",
		);

		const { payload: stalePayload } = await readJsonResponse(
			`${handle.url}/tracker-workspace?status=Applied&entryNumber=31`,
		);

		assert.equal(
			(
				stalePayload as {
					selectedDetail: {
						message: string;
						row: { warnings: Array<{ code: string }> } | null;
						state: string;
					};
				}
			).selectedDetail.state,
			"ready",
		);
		assert.ok(
			(
				stalePayload as {
					selectedDetail: {
						message: string;
						row: { warnings: Array<{ code: string }> } | null;
						state: string;
					};
				}
			).selectedDetail.row?.warnings.some(
				(warning) => warning.code === "stale-selection",
			),
		);

		const { payload: updatePayload, response: updateResponse } =
			await readJsonResponse(`${handle.url}/tracker-workspace/action`, {
				body: JSON.stringify({
					action: "update-status",
					entryNumber: 31,
					status: "Interview",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(updateResponse.status, 200);
		assert.equal(
			(
				updatePayload as {
					actionResult: {
						action: string;
						entryNumber: number;
						warnings: Array<unknown>;
					};
					message: string;
				}
			).actionResult.action,
			"update-status",
		);
		assert.equal(
			(
				updatePayload as {
					actionResult: {
						action: string;
						entryNumber: number;
						warnings: Array<unknown>;
					};
					message: string;
				}
			).actionResult.entryNumber,
			31,
		);
		assert.match(
			(await fixture.readText("data/applications.md")) ?? "",
			/\| 31 \| 2026-04-22 \| Acme \| Platform Engineer \| 4\.6\/5 \| Interview \| Y \| \[031\]\(reports\/031-acme-platform-engineer-2026-04-22\.md\) \| Strongest fit in the batch \|/,
		);

		const { payload: verifyPayload, response: verifyResponse } =
			await readJsonResponse(`${handle.url}/tracker-workspace/action`, {
				body: JSON.stringify({
					action: "verify-tracker-pipeline",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(verifyResponse.status, 200);
		assert.equal(
			(
				verifyPayload as {
					actionResult: {
						action: string;
						warnings: Array<{ code: string }>;
					};
				}
			).actionResult.action,
			"verify-tracker-pipeline",
		);
		assert.equal(
			(
				verifyPayload as {
					actionResult: {
						action: string;
						warnings: Array<{ code: string }>;
					};
				}
			).actionResult.warnings[0]?.code,
			"tracker-verify-warning",
		);

		const { payload: invalidActionPayload, response: invalidActionResponse } =
			await readJsonResponse(`${handle.url}/tracker-workspace/action`, {
				body: JSON.stringify({
					action: "update-status",
					entryNumber: 31,
					status: "Monitor",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(invalidActionResponse.status, 400);
		assert.equal(
			(
				invalidActionPayload as {
					error: { code: string };
				}
			).error.code,
			"tool-invalid-input",
		);

		const { payload: invalidQueryPayload, response: invalidQueryResponse } =
			await readJsonResponse(`${handle.url}/tracker-workspace?limit=0`);

		assert.equal(invalidQueryResponse.status, 400);
		assert.equal(
			(
				invalidQueryPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-tracker-workspace-query",
		);

		const {
			payload: mutuallyExclusiveQueryPayload,
			response: mutuallyExclusiveQueryResponse,
		} = await readJsonResponse(
			`${handle.url}/tracker-workspace?entryNumber=31&reportNumber=031`,
		);

		assert.equal(mutuallyExclusiveQueryResponse.status, 400);
		assert.equal(
			(
				mutuallyExclusiveQueryPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-tracker-workspace-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("batch-supervisor routes cover draft summaries, retry enqueue, runtime overlays, verify warnings, and invalid input", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const storeProbe = await createOperationalStore({
		repoRoot: fixture.repoRoot,
	});
	await storeProbe.close();
	await authFixture.setReady({ accountId: "acct-http-batch-supervisor" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-batch-supervisor-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 30,
		services,
	});
	const store = await services.operationalStore.getStore();

	try {
		const { payload: emptyPayload, response: emptyResponse } =
			await readJsonResponse(`${handle.url}/batch-supervisor`);

		assert.equal(emptyResponse.status, 200);
		assert.equal(
			(
				emptyPayload as {
					draft: { available: boolean };
					run: { state: string };
					selectedDetail: { state: string };
				}
			).draft.available,
			false,
		);
		assert.equal(
			(
				emptyPayload as {
					draft: { available: boolean };
					run: { state: string };
					selectedDetail: { state: string };
				}
			).run.state,
			"idle",
		);
		assert.equal(
			(
				emptyPayload as {
					draft: { available: boolean };
					run: { state: string };
					selectedDetail: { state: string };
				}
			).selectedDetail.state,
			"empty",
		);

		await writeRepoArtifact(
			fixture.repoRoot,
			"batch/batch-input.tsv",
			[
				"id\turl\tsource\tnotes",
				"1\thttps://example.com/jobs/acme\tscan\tretryable infrastructure failure",
				"2\thttps://example.com/jobs/beta\tscan\tpartial result for review",
				"3\thttps://example.com/jobs/gamma\tscan\tpending candidate",
				"",
			].join("\n"),
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"batch/batch-state.tsv",
			[
				"id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries",
				"1\thttps://example.com/jobs/acme\tfailed\t2026-04-22T09:00:00.000Z\t2026-04-22T09:02:00.000Z\t001\t-\tinfrastructure: worker timeout\t1",
				"2\thttps://example.com/jobs/beta\tpartial\t2026-04-22T09:03:00.000Z\t2026-04-22T09:06:00.000Z\t002\t4.1\twarnings: tracker-not-written\t0",
				"",
			].join("\n"),
		);
		await writeRepoArtifact(
			fixture.repoRoot,
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
		await writeRepoArtifact(
			fixture.repoRoot,
			"reports/002-beta-solutions-architect.md",
			"# Beta report\n",
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"batch/tracker-additions/8-http-ready.tsv",
			"8\t2026-04-22\tReady Co\tPlatform Engineer\tEvaluated\t4.5/5\t\t[008](reports/008-ready.md)\tready\n",
		);
		await writeRepoArtifact(
			fixture.repoRoot,
			"scripts/verify-pipeline.mjs",
			"process.stdout.write('[WARN] pending TSVs remain\\n');\n",
		);

		const { payload: summaryPayload, response: summaryResponse } =
			await readJsonResponse(`${handle.url}/batch-supervisor?itemId=2`);

		assert.equal(summaryResponse.status, 200);
		assert.equal(
			(
				summaryPayload as {
					draft: { available: boolean; counts: { retryableFailed: number } };
					selectedDetail: {
						row: {
							artifacts: { report: { exists: boolean } };
							status: string;
							warnings: Array<{ code: string }>;
						} | null;
					};
					actions: Array<{ action: string; available: boolean }>;
				}
			).draft.available,
			true,
		);
		assert.equal(
			(
				summaryPayload as {
					draft: { available: boolean; counts: { retryableFailed: number } };
				}
			).draft.counts.retryableFailed,
			1,
		);
		assert.equal(
			(
				summaryPayload as {
					selectedDetail: {
						row: {
							artifacts: { report: { exists: boolean } };
							status: string;
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.status,
			"partial",
		);
		assert.equal(
			(
				summaryPayload as {
					selectedDetail: {
						row: {
							artifacts: { report: { exists: boolean } };
							status: string;
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.artifacts.report.exists,
			true,
		);
		assert.ok(
			(
				summaryPayload as {
					selectedDetail: {
						row: {
							artifacts: { report: { exists: boolean } };
							status: string;
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selectedDetail.row?.warnings.some(
				(warning) => warning.code === "partial-result",
			),
		);
		assert.equal(
			(
				summaryPayload as {
					actions: Array<{ action: string; available: boolean }>;
				}
			).actions.find((action) => action.action === "retry-failed")?.available,
			true,
		);

		const { payload: retryPayload, response: retryResponse } =
			await readJsonResponse(`${handle.url}/batch-supervisor/action`, {
				body: JSON.stringify({
					action: "retry-failed",
					itemId: 1,
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(retryResponse.status, 200);
		assert.equal(
			(
				retryPayload as {
					actionResult: {
						action: string;
						jobId: string | null;
						requestStatus: string;
						revalidation: { nextPollMs: number | null };
					};
				}
			).actionResult.action,
			"retry-failed",
		);
		assert.equal(
			(
				retryPayload as {
					actionResult: {
						action: string;
						jobId: string | null;
						requestStatus: string;
						revalidation: { nextPollMs: number | null };
					};
				}
			).actionResult.requestStatus,
			"accepted",
		);
		assert.equal(
			(
				retryPayload as {
					actionResult: {
						action: string;
						jobId: string | null;
						requestStatus: string;
						revalidation: { nextPollMs: number | null };
					};
				}
			).actionResult.revalidation.nextPollMs,
			2000,
		);

		const queuedJobId = (
			retryPayload as {
				actionResult: {
					jobId: string | null;
				};
			}
		).actionResult.jobId;
		assert.ok(queuedJobId);

		const { payload: queuedPayload } = await readJsonResponse(
			`${handle.url}/batch-supervisor`,
		);

		assert.equal(
			(
				queuedPayload as {
					run: { state: string };
				}
			).run.state,
			"queued",
		);

		await saveEvaluationSession(store, {
			activeJobId: queuedJobId,
			context: {
				workflow: "batch-evaluation",
			},
			sessionId: "batch-supervisor-session",
			status: "running",
			updatedAt: "2026-04-22T10:10:00.000Z",
			workflow: "batch-evaluation",
		});
		await saveBatchJob(store, {
			jobId: queuedJobId as string,
			payload: {
				dryRun: false,
				maxRetries: 2,
				minScore: 0,
				mode: "retry-failed",
				parallel: 1,
				startFromId: 0,
			},
			sessionId: "batch-supervisor-session",
			status: "running",
			updatedAt: "2026-04-22T10:10:00.000Z",
		});

		const { payload: runningPayload } = await readJsonResponse(
			`${handle.url}/batch-supervisor`,
		);

		assert.equal(
			(
				runningPayload as {
					run: { state: string };
				}
			).run.state,
			"running",
		);

		await saveEvaluationSession(store, {
			activeJobId: queuedJobId,
			context: {
				workflow: "batch-evaluation",
			},
			sessionId: "batch-supervisor-session",
			status: "waiting",
			updatedAt: "2026-04-22T10:12:00.000Z",
			workflow: "batch-evaluation",
		});
		await saveBatchJob(store, {
			jobId: queuedJobId as string,
			payload: {
				dryRun: false,
				maxRetries: 2,
				minScore: 0,
				mode: "retry-failed",
				parallel: 1,
				startFromId: 0,
			},
			sessionId: "batch-supervisor-session",
			status: "waiting",
			updatedAt: "2026-04-22T10:12:00.000Z",
			waitApprovalId: "approval-batch-http-1",
			waitReason: "approval",
		});
		await store.approvals.save({
			approvalId: "approval-batch-http-1",
			jobId: queuedJobId,
			request: {
				action: "approval-review",
			},
			requestedAt: "2026-04-22T10:12:00.000Z",
			resolvedAt: null,
			response: null,
			sessionId: "batch-supervisor-session",
			status: "pending",
			traceId: "trace-batch-http-1",
			updatedAt: "2026-04-22T10:12:00.000Z",
		});
		await store.runMetadata.saveCheckpoint({
			checkpoint: {
				completedSteps: ["batch-item-1"],
				cursor: "1",
				updatedAt: "2026-04-22T10:12:00.000Z",
				value: {
					items: [
						{
							id: 1,
							reportNumber: "001",
							status: "retryable-failed",
						},
					],
				},
			},
			jobId: queuedJobId,
			runId: `${queuedJobId}-run`,
			sessionId: "batch-supervisor-session",
		});

		const { payload: pausedPayload } = await readJsonResponse(
			`${handle.url}/batch-supervisor?itemId=2&status=pending`,
		);

		assert.equal(
			(
				pausedPayload as {
					run: { approvalId: string | null; state: string };
					selectedDetail: {
						row: { warnings: Array<{ code: string }> } | null;
					};
				}
			).run.state,
			"approval-paused",
		);
		assert.equal(
			(
				pausedPayload as {
					run: { approvalId: string | null; state: string };
					selectedDetail: {
						row: { warnings: Array<{ code: string }> } | null;
					};
				}
			).run.approvalId,
			"approval-batch-http-1",
		);
		assert.ok(
			(
				pausedPayload as {
					selectedDetail: {
						row: { warnings: Array<{ code: string }> } | null;
					};
				}
			).selectedDetail.row?.warnings.some(
				(warning) => warning.code === "stale-selection",
			),
		);

		await saveEvaluationSession(store, {
			activeJobId: null,
			context: {
				workflow: "batch-evaluation",
			},
			lastHeartbeatAt: "2026-04-22T10:15:00.000Z",
			sessionId: "batch-supervisor-session",
			status: "completed",
			updatedAt: "2026-04-22T10:15:00.000Z",
			workflow: "batch-evaluation",
		});
		await saveBatchJob(store, {
			jobId: queuedJobId as string,
			payload: {
				dryRun: false,
				maxRetries: 2,
				minScore: 0,
				mode: "retry-failed",
				parallel: 1,
				startFromId: 0,
			},
			result: {
				counts: {
					completed: 0,
					failed: 0,
					partial: 1,
					pending: 1,
					retryableFailed: 1,
					skipped: 0,
					total: 3,
				},
				dryRun: false,
				items: [],
				warnings: [],
				workflow: "batch-evaluation",
			},
			sessionId: "batch-supervisor-session",
			status: "completed",
			updatedAt: "2026-04-22T10:15:00.000Z",
		});

		const { payload: verifyPayload, response: verifyResponse } =
			await readJsonResponse(`${handle.url}/batch-supervisor/action`, {
				body: JSON.stringify({
					action: "verify-tracker-pipeline",
					itemId: 2,
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(verifyResponse.status, 200);
		assert.equal(
			(
				verifyPayload as {
					actionResult: {
						action: string;
						requestStatus: string;
						warnings: Array<{ code: string }>;
					};
				}
			).actionResult.action,
			"verify-tracker-pipeline",
		);
		assert.equal(
			(
				verifyPayload as {
					actionResult: {
						action: string;
						requestStatus: string;
						warnings: Array<{ code: string }>;
					};
				}
			).actionResult.requestStatus,
			"completed",
		);
		assert.equal(
			(
				verifyPayload as {
					actionResult: {
						action: string;
						requestStatus: string;
						warnings: Array<{ code: string }>;
					};
				}
			).actionResult.warnings[0]?.code,
			"tracker-verify-warning",
		);

		const { payload: invalidQueryPayload, response: invalidQueryResponse } =
			await readJsonResponse(`${handle.url}/batch-supervisor?limit=0`);

		assert.equal(invalidQueryResponse.status, 400);
		assert.equal(
			(
				invalidQueryPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-batch-supervisor-query",
		);

		const { payload: invalidActionPayload, response: invalidActionResponse } =
			await readJsonResponse(`${handle.url}/batch-supervisor/action`, {
				body: JSON.stringify({
					action: "retry-failed",
					startFromId: -1,
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(invalidActionResponse.status, 400);
		assert.equal(
			(
				invalidActionPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-batch-supervisor-action",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("application-help route covers draft-ready, approval-paused, rejected, resumed, completed, latest fallback, and invalid query states", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-application-help" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-application-help-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const runtimeStore = await services.operationalStore.getStore();

	const saveApplicationHelpSession = async (input: {
		activeJobId?: string | null;
		sessionId: string;
		status: RuntimeSessionStatus;
		timestamp: string;
	}) => {
		await runtimeStore.sessions.save({
			activeJobId: input.activeJobId ?? null,
			context: {
				applicationHelp: {
					company: "HTTP Context Co",
					reportNumber: "041",
					role: "Applied AI Engineer",
				},
			},
			createdAt: input.timestamp,
			lastHeartbeatAt: input.timestamp,
			runnerId:
				input.status === "pending" || input.activeJobId === null
					? null
					: "runner-http-application-help",
			sessionId: input.sessionId,
			status: input.status,
			updatedAt: input.timestamp,
			workflow: "application-help",
		});
	};

	const saveApplicationHelpJob = async (input: {
		error?: JsonValue | null;
		jobId: string;
		sessionId: string;
		status: RuntimeJobStatus;
		timestamp: string;
		waitApprovalId?: string | null;
		waitReason?: RuntimeJobWaitReason | null;
	}) => {
		const isActive = input.status === "running" || input.status === "waiting";

		await runtimeStore.jobs.save({
			attempt: 1,
			claimOwnerId: isActive ? "runner-http-application-help" : null,
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
				reportNumber: "041",
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
	};

	const saveApplicationHelpApproval = async (input: {
		approvalId: string;
		jobId: string;
		message?: string;
		sessionId: string;
		status: "approved" | "pending" | "rejected";
		timestamp: string;
	}) => {
		await runtimeStore.approvals.save({
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
									: "Revise the draft answers."),
						},
			sessionId: input.sessionId,
			status: input.status,
			traceId: `${input.approvalId}-trace`,
			updatedAt: input.timestamp,
		});
	};

	const stageDraftPacket = async (input: {
		reviewNotes: string;
		sessionId: string;
	}) => {
		const toolService = await services.tools.getService();

		await toolService.execute({
			correlation: {
				jobId: `tool-job-${input.sessionId}`,
				requestId: `tool-request-${input.sessionId}`,
				sessionId: `tool-session-${input.sessionId}`,
				traceId: `tool-trace-${input.sessionId}`,
			},
			input: {
				company: "HTTP Context Co",
				items: [
					{
						answer: "Draft answer for the HTTP route test.",
						question: "Why this role?",
					},
				],
				matchedContext: null,
				reviewNotes: input.reviewNotes,
				role: "Applied AI Engineer",
				sessionId: input.sessionId,
				warnings: [],
			},
			toolName: "stage-application-help-draft",
		});
	};

	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/041-http-context-co-2026-04-22.md",
		[
			"# Evaluation: HTTP Context Co -- Applied AI Engineer",
			"",
			"**Date:** 2026-04-22",
			"**URL:** https://example.com/jobs/http-context-co",
			"**Score:** 4.6/5",
			"**Legitimacy:** High Confidence",
			"**PDF:** output/cv-http-context-co-2026-04-22.pdf",
			"",
			"---",
			"",
			"## H) Draft Application Answers",
			"",
			"No cover-letter field was detected on the application page.",
			"",
			"### 1. Why this role?",
			"",
			"Because it matches agentic delivery work.",
			"",
		].join("\n"),
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"output/cv-http-context-co-2026-04-22.pdf",
		"pdf\n",
	);

	await saveApplicationHelpSession({
		sessionId: "app-help-ready-http",
		status: "waiting",
		timestamp: "2026-04-22T10:00:00.000Z",
	});
	await saveApplicationHelpSession({
		activeJobId: "job-app-help-paused-http",
		sessionId: "app-help-paused-http",
		status: "waiting",
		timestamp: "2026-04-22T10:05:00.000Z",
	});
	await saveApplicationHelpJob({
		jobId: "job-app-help-paused-http",
		sessionId: "app-help-paused-http",
		status: "waiting",
		timestamp: "2026-04-22T10:05:00.000Z",
		waitApprovalId: "approval-app-help-paused-http",
		waitReason: "approval",
	});
	await saveApplicationHelpApproval({
		approvalId: "approval-app-help-paused-http",
		jobId: "job-app-help-paused-http",
		sessionId: "app-help-paused-http",
		status: "pending",
		timestamp: "2026-04-22T10:05:00.000Z",
	});

	await saveApplicationHelpSession({
		activeJobId: "job-app-help-rejected-http",
		sessionId: "app-help-rejected-http",
		status: "failed",
		timestamp: "2026-04-22T10:10:00.000Z",
	});
	await saveApplicationHelpJob({
		error: {
			message: "Draft rejected.",
		},
		jobId: "job-app-help-rejected-http",
		sessionId: "app-help-rejected-http",
		status: "failed",
		timestamp: "2026-04-22T10:10:00.000Z",
	});
	await saveApplicationHelpApproval({
		approvalId: "approval-app-help-rejected-http",
		jobId: "job-app-help-rejected-http",
		message: "Revise the proof points.",
		sessionId: "app-help-rejected-http",
		status: "rejected",
		timestamp: "2026-04-22T10:10:00.000Z",
	});

	await saveApplicationHelpSession({
		activeJobId: "job-app-help-resumed-http",
		sessionId: "app-help-resumed-http",
		status: "running",
		timestamp: "2026-04-22T10:15:00.000Z",
	});
	await saveApplicationHelpJob({
		jobId: "job-app-help-resumed-http",
		sessionId: "app-help-resumed-http",
		status: "running",
		timestamp: "2026-04-22T10:15:00.000Z",
	});

	await saveApplicationHelpSession({
		activeJobId: "job-app-help-completed-http",
		sessionId: "app-help-completed-http",
		status: "completed",
		timestamp: "2026-04-22T10:20:00.000Z",
	});
	await saveApplicationHelpJob({
		jobId: "job-app-help-completed-http",
		sessionId: "app-help-completed-http",
		status: "completed",
		timestamp: "2026-04-22T10:20:00.000Z",
	});

	await stageDraftPacket({
		reviewNotes: "Ready draft.",
		sessionId: "app-help-ready-http",
	});
	await stageDraftPacket({
		reviewNotes: "Waiting on approval.",
		sessionId: "app-help-paused-http",
	});
	await stageDraftPacket({
		reviewNotes: "Rejected revision.",
		sessionId: "app-help-rejected-http",
	});
	await stageDraftPacket({
		reviewNotes: "Resumed run.",
		sessionId: "app-help-resumed-http",
	});
	await stageDraftPacket({
		reviewNotes: "Completed run.",
		sessionId: "app-help-completed-http",
	});

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: readyPayload, response: readyResponse } =
			await readJsonResponse(
				`${handle.url}/application-help?sessionId=app-help-ready-http`,
			);

		assert.equal(readyResponse.status, 200);
		assert.equal((readyPayload as { status: string }).status, "ready");
		assert.equal(
			(
				readyPayload as {
					selected: {
						origin: string;
						state: string;
						summary: {
							state: string;
							reportContext: { reportRepoRelativePath: string };
						};
					};
				}
			).selected.origin,
			"session-id",
		);
		assert.equal(
			(
				readyPayload as {
					selected: {
						origin: string;
						state: string;
						summary: {
							state: string;
							reportContext: { reportRepoRelativePath: string };
						};
					};
				}
			).selected.summary.state,
			"draft-ready",
		);
		assert.equal(
			(
				readyPayload as {
					selected: {
						summary: {
							reportContext: { reportRepoRelativePath: string };
						};
					};
				}
			).selected.summary.reportContext.reportRepoRelativePath,
			"reports/041-http-context-co-2026-04-22.md",
		);

		const { payload: pausedPayload } = await readJsonResponse(
			`${handle.url}/application-help?sessionId=app-help-paused-http`,
		);
		assert.equal(
			(
				pausedPayload as {
					selected: {
						summary: {
							approval: { status: string };
							state: string;
						};
					};
				}
			).selected.summary.state,
			"approval-paused",
		);
		assert.equal(
			(
				pausedPayload as {
					selected: {
						summary: {
							approval: { status: string };
							state: string;
						};
					};
				}
			).selected.summary.approval.status,
			"pending",
		);

		const { payload: rejectedPayload } = await readJsonResponse(
			`${handle.url}/application-help?sessionId=app-help-rejected-http`,
		);
		assert.equal(
			(
				rejectedPayload as {
					selected: {
						summary: {
							failure: { message: string };
							state: string;
						};
					};
				}
			).selected.summary.state,
			"rejected",
		);
		assert.equal(
			(
				rejectedPayload as {
					selected: {
						summary: {
							failure: { message: string };
							state: string;
						};
					};
				}
			).selected.summary.failure.message,
			"Revise the proof points.",
		);

		const { payload: resumedPayload } = await readJsonResponse(
			`${handle.url}/application-help?sessionId=app-help-resumed-http`,
		);
		assert.equal(
			(
				resumedPayload as {
					selected: {
						summary: {
							job: { status: string };
							state: string;
						};
					};
				}
			).selected.summary.state,
			"resumed",
		);
		assert.equal(
			(
				resumedPayload as {
					selected: {
						summary: {
							job: { status: string };
							state: string;
						};
					};
				}
			).selected.summary.job.status,
			"running",
		);

		const { payload: completedPayload } = await readJsonResponse(
			`${handle.url}/application-help?sessionId=app-help-completed-http`,
		);
		assert.equal(
			(
				completedPayload as {
					selected: {
						summary: {
							draftPacket: { reviewNotes: string };
							state: string;
						};
					};
				}
			).selected.summary.state,
			"completed",
		);
		assert.equal(
			(
				completedPayload as {
					selected: {
						summary: {
							draftPacket: { reviewNotes: string };
							state: string;
						};
					};
				}
			).selected.summary.draftPacket.reviewNotes,
			"Completed run.",
		);

		const { payload: latestPayload } = await readJsonResponse(
			`${handle.url}/application-help`,
		);
		assert.equal(
			(
				latestPayload as {
					selected: {
						origin: string;
						summary: { session: { sessionId: string } };
					};
				}
			).selected.origin,
			"latest",
		);
		assert.equal(
			(
				latestPayload as {
					selected: {
						origin: string;
						summary: { session: { sessionId: string } };
					};
				}
			).selected.summary.session.sessionId,
			"app-help-completed-http",
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(`${handle.url}/application-help?sessionId=%20`);
		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-application-help-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("tracker-specialist route covers missing-input, degraded, resumed, completed, latest fallback, and invalid query states", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createDelayedReadyAgentRuntime(fixture.repoRoot, 0),
		repoRoot: fixture.repoRoot,
	});
	const runtimeStore = await services.operationalStore.getStore();

	const saveTrackerSpecialistSession = async (input: {
		activeJobId?: string | null;
		sessionId: string;
		status: RuntimeSessionStatus;
		timestamp: string;
		workflow: "compare-offers" | "follow-up-cadence" | "rejection-patterns";
	}) => {
		await runtimeStore.sessions.save({
			activeJobId: input.activeJobId ?? null,
			context: {
				workflow: input.workflow,
			},
			createdAt: input.timestamp,
			lastHeartbeatAt: input.timestamp,
			runnerId:
				input.status === "pending" || input.activeJobId === null
					? null
					: "runner-http-tracker-specialist",
			sessionId: input.sessionId,
			status: input.status,
			updatedAt: input.timestamp,
			workflow: input.workflow,
		});
	};

	const saveTrackerSpecialistJob = async (input: {
		error?: JsonValue | null;
		jobId: string;
		sessionId: string;
		status: RuntimeJobStatus;
		timestamp: string;
		waitReason?: RuntimeJobWaitReason | null;
		workflow: "compare-offers" | "follow-up-cadence" | "rejection-patterns";
	}) => {
		const isActive = input.status === "running" || input.status === "waiting";

		await runtimeStore.jobs.save({
			attempt: 1,
			claimOwnerId: isActive ? "runner-http-tracker-specialist" : null,
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
			waitApprovalId: null,
			waitReason: input.waitReason ?? null,
		});
	};

	const stageCompareOffersPacket = async (sessionId: string) => {
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
	};

	const stageFollowUpPacket = async (sessionId: string) => {
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
	};

	const stagePatternPacket = async (sessionId: string) => {
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
	};

	await writeRepoArtifact(
		fixture.repoRoot,
		"data/applications.md",
		[
			"# Applications Tracker",
			"",
			"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
			"| 1 | 2026-04-20 | North Co | Staff AI Engineer | 4.7/5 | Offer | output/north.pdf | [051](reports/051-north-co-2026-04-20.md) | notes |",
			"| 2 | 2026-04-21 | South Co | Principal Platform Engineer | 4.5/5 | Offer | output/south.pdf | [052](reports/052-south-co-2026-04-21.md) | notes |",
			"",
		].join("\n"),
	);
	await writeRepoArtifact(fixture.repoRoot, "output/north.pdf", "pdf\n");
	await writeRepoArtifact(fixture.repoRoot, "output/south.pdf", "pdf\n");
	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/051-north-co-2026-04-20.md",
		[
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
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"reports/052-south-co-2026-04-21.md",
		[
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
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"scripts/followup-cadence.mjs",
		[
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
	);
	await writeRepoArtifact(
		fixture.repoRoot,
		"scripts/analyze-patterns.mjs",
		"process.stdout.write('not-json\\n');\n",
	);

	await saveTrackerSpecialistSession({
		sessionId: "compare-missing-http",
		status: "completed",
		timestamp: "2026-04-22T09:55:00.000Z",
		workflow: "compare-offers",
	});

	await saveTrackerSpecialistSession({
		activeJobId: "job-compare-completed-http",
		sessionId: "compare-completed-http",
		status: "completed",
		timestamp: "2026-04-22T10:00:00.000Z",
		workflow: "compare-offers",
	});
	await saveTrackerSpecialistJob({
		jobId: "job-compare-completed-http",
		sessionId: "compare-completed-http",
		status: "completed",
		timestamp: "2026-04-22T10:00:00.000Z",
		workflow: "compare-offers",
	});
	await stageCompareOffersPacket("compare-completed-http");

	await saveTrackerSpecialistSession({
		activeJobId: "job-patterns-degraded-http",
		sessionId: "patterns-degraded-http",
		status: "completed",
		timestamp: "2026-04-22T10:05:00.000Z",
		workflow: "rejection-patterns",
	});
	await saveTrackerSpecialistJob({
		jobId: "job-patterns-degraded-http",
		sessionId: "patterns-degraded-http",
		status: "completed",
		timestamp: "2026-04-22T10:05:00.000Z",
		workflow: "rejection-patterns",
	});
	await stagePatternPacket("patterns-degraded-http");

	await saveTrackerSpecialistSession({
		activeJobId: "job-follow-up-resumed-http",
		sessionId: "follow-up-resumed-http",
		status: "running",
		timestamp: "2026-04-22T10:10:00.000Z",
		workflow: "follow-up-cadence",
	});
	await saveTrackerSpecialistJob({
		jobId: "job-follow-up-resumed-http",
		sessionId: "follow-up-resumed-http",
		status: "running",
		timestamp: "2026-04-22T10:10:00.000Z",
		workflow: "follow-up-cadence",
	});
	await stageFollowUpPacket("follow-up-resumed-http");

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: missingPayload, response: missingResponse } =
			await readJsonResponse(
				`${handle.url}/tracker-specialist?sessionId=compare-missing-http`,
			);
		assert.equal(missingResponse.status, 200);
		assert.equal(
			(
				missingPayload as {
					selected: { summary: { state: string } | null };
				}
			).selected.summary?.state,
			"missing-input",
		);

		const { payload: completedPayload } = await readJsonResponse(
			`${handle.url}/tracker-specialist?sessionId=compare-completed-http`,
		);
		assert.equal(
			(
				completedPayload as {
					selected: { summary: { state: string } | null };
				}
			).selected.summary?.state,
			"completed",
		);

		const { payload: degradedPayload } = await readJsonResponse(
			`${handle.url}/tracker-specialist?sessionId=patterns-degraded-http`,
		);
		assert.equal(
			(
				degradedPayload as {
					selected: {
						summary: {
							packet: { resultStatus: string };
							state: string;
						} | null;
					};
				}
			).selected.summary?.state,
			"degraded",
		);
		assert.equal(
			(
				degradedPayload as {
					selected: {
						summary: {
							packet: { resultStatus: string };
							state: string;
						} | null;
					};
				}
			).selected.summary?.packet.resultStatus,
			"degraded",
		);

		const { payload: resumedPayload } = await readJsonResponse(
			`${handle.url}/tracker-specialist?sessionId=follow-up-resumed-http`,
		);
		assert.equal(
			(
				resumedPayload as {
					selected: {
						summary: {
							run: { state: string };
							state: string;
						} | null;
					};
				}
			).selected.summary?.state,
			"resumed",
		);
		assert.equal(
			(
				resumedPayload as {
					selected: {
						summary: {
							run: { state: string };
							state: string;
						} | null;
					};
				}
			).selected.summary?.run.state,
			"running",
		);

		const { payload: latestPayload } = await readJsonResponse(
			`${handle.url}/tracker-specialist`,
		);
		assert.equal(
			(
				latestPayload as {
					selected: {
						origin: string;
						summary: { session: { sessionId: string } | null } | null;
					};
				}
			).selected.origin,
			"latest-session",
		);
		assert.equal(
			(
				latestPayload as {
					selected: {
						origin: string;
						summary: { session: { sessionId: string } | null } | null;
					};
				}
			).selected.summary?.session?.sessionId,
			"follow-up-resumed-http",
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(`${handle.url}/tracker-specialist?mode=bad`);
		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-tracker-specialist-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("research-specialist route covers missing-input, no-packet-yet, approval-paused, rejected, resumed, completed, latest fallback, and invalid query states", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createDelayedReadyAgentRuntime(fixture.repoRoot, 0),
		repoRoot: fixture.repoRoot,
	});
	const runtimeStore = await services.operationalStore.getStore();

	const saveResearchSpecialistSession = async (input: {
		activeJobId?: string | null;
		context?: JsonValue | null;
		sessionId: string;
		status: RuntimeSessionStatus;
		timestamp: string;
		workflow:
			| "deep-company-research"
			| "interview-prep"
			| "linkedin-outreach"
			| "project-review"
			| "training-review";
	}) => {
		await runtimeStore.sessions.save({
			activeJobId: input.activeJobId ?? null,
			context:
				input.context === undefined
					? {
							workflow: input.workflow,
						}
					: input.context,
			createdAt: input.timestamp,
			lastHeartbeatAt: input.timestamp,
			runnerId:
				input.status === "pending" || input.activeJobId === null
					? null
					: "runner-http-research-specialist",
			sessionId: input.sessionId,
			status: input.status,
			updatedAt: input.timestamp,
			workflow: input.workflow,
		});
	};

	const saveResearchSpecialistJob = async (input: {
		error?: JsonValue | null;
		jobId: string;
		sessionId: string;
		status: RuntimeJobStatus;
		timestamp: string;
		waitApprovalId?: string | null;
		waitReason?: RuntimeJobWaitReason | null;
		workflow:
			| "deep-company-research"
			| "interview-prep"
			| "linkedin-outreach"
			| "project-review"
			| "training-review";
	}) => {
		const isActive = input.status === "running" || input.status === "waiting";

		await runtimeStore.jobs.save({
			attempt: 1,
			claimOwnerId: isActive ? "runner-http-research-specialist" : null,
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
	};

	const saveResearchApproval = async (input: {
		approvalId: string;
		jobId: string;
		sessionId: string;
		status: "approved" | "pending" | "rejected";
		timestamp: string;
		title: string;
	}) => {
		await runtimeStore.approvals.save({
			approvalId: input.approvalId,
			jobId: input.jobId,
			request: {
				action: "review-research-specialist",
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
	};

	const saveResearchFailure = async (input: {
		jobId: string;
		message: string;
		sessionId: string;
		timestamp: string;
	}) => {
		await runtimeStore.events.save({
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
	};

	const stageResearchPacket = async (sessionId: string, input: JsonValue) => {
		const toolService = await services.tools.getService();

		await toolService.execute({
			correlation: {
				jobId: `tool-job-${sessionId}`,
				requestId: `tool-request-${sessionId}`,
				sessionId,
				traceId: `tool-trace-${sessionId}`,
			},
			input,
			toolName: "stage-research-specialist-packet",
		});
	};

	const createContext = (
		mode:
			| "deep-company-research"
			| "interview-prep"
			| "linkedin-outreach"
			| "project-review"
			| "training-review",
		input: Partial<{
			company: string | null;
			role: string | null;
			subject: string | null;
		}> = {},
	) => ({
		artifactName: null,
		company: input.company ?? null,
		mode,
		modeDescription: `Mode description for ${mode}`,
		modeRepoRelativePath:
			mode === "deep-company-research"
				? "modes/deep.md"
				: mode === "linkedin-outreach"
					? "modes/contacto.md"
					: mode === "interview-prep"
						? "modes/interview-prep.md"
						: mode === "training-review"
							? "modes/training.md"
							: "modes/project.md",
		reportContext: null,
		role: input.role ?? null,
		storyBank: null,
		subject: input.subject ?? null,
	});

	await saveResearchSpecialistSession({
		sessionId: "deep-missing-http",
		status: "completed",
		timestamp: "2026-04-22T09:55:00.000Z",
		workflow: "deep-company-research",
	});

	await saveResearchSpecialistSession({
		activeJobId: "job-deep-completed-http",
		context: {
			company: "Context Co",
			role: "Applied AI Engineer",
		},
		sessionId: "deep-completed-http",
		status: "completed",
		timestamp: "2026-04-22T10:00:00.000Z",
		workflow: "deep-company-research",
	});
	await saveResearchSpecialistJob({
		jobId: "job-deep-completed-http",
		sessionId: "deep-completed-http",
		status: "completed",
		timestamp: "2026-04-22T10:00:00.000Z",
		workflow: "deep-company-research",
	});
	await stageResearchPacket("deep-completed-http", {
		context: createContext("deep-company-research", {
			company: "Context Co",
			role: "Applied AI Engineer",
		}),
		message: "Deep research packet ready.",
		mode: "deep-company-research",
		resultStatus: "ready",
		sections: {
			aiStrategy: ["Production AI assistant"],
			candidateAngle: ["Applied delivery story"],
			competitors: ["Rival Co"],
			engineeringCulture: ["Remote-first"],
			likelyChallenges: ["Latency"],
			recentMoves: ["Recent AI launch"],
		},
		sessionId: "deep-completed-http",
		sources: [
			{
				label: "Company blog",
				note: "Mentions applied AI",
				url: "https://example.com/blog",
			},
		],
		warnings: [],
	});

	await saveResearchSpecialistSession({
		activeJobId: "job-interview-paused-http",
		context: {
			company: "Context Co",
			role: "Applied AI Engineer",
		},
		sessionId: "interview-paused-http",
		status: "waiting",
		timestamp: "2026-04-22T10:05:00.000Z",
		workflow: "interview-prep",
	});
	await saveResearchSpecialistJob({
		jobId: "job-interview-paused-http",
		sessionId: "interview-paused-http",
		status: "waiting",
		timestamp: "2026-04-22T10:05:00.000Z",
		waitApprovalId: "approval-interview-paused-http",
		waitReason: "approval",
		workflow: "interview-prep",
	});
	await saveResearchApproval({
		approvalId: "approval-interview-paused-http",
		jobId: "job-interview-paused-http",
		sessionId: "interview-paused-http",
		status: "pending",
		timestamp: "2026-04-22T10:05:00.000Z",
		title: "Review interview prep scope",
	});
	await stageResearchPacket("interview-paused-http", {
		context: createContext("interview-prep", {
			company: "Context Co",
			role: "Applied AI Engineer",
		}),
		message: "Interview prep packet ready.",
		mode: "interview-prep",
		outputRepoRelativePath: "interview-prep/context-co-applied-ai-engineer.md",
		processOverview: {
			difficulty: "4/5",
			format: "screen -> panel",
			knownQuirks: ["Practical discussion"],
			positiveExperienceRate: "60%",
			rounds: "3 rounds",
			sources: ["Glassdoor"],
		},
		resultStatus: "ready",
		rounds: [
			{
				conductedBy: "Hiring manager",
				duration: "45 min",
				evaluates: ["AI delivery"],
				name: "Technical Screen",
				preparation: ["Review recent launches"],
				questions: ["Tell me about a production AI system you shipped."],
			},
		],
		sessionId: "interview-paused-http",
		storyBankGaps: ["Need one conflict-resolution story"],
		technicalChecklist: [
			{
				reason: "Practical system design focus",
				topic: "Production LLM reliability",
			},
		],
		warnings: [],
	});

	await saveResearchSpecialistSession({
		activeJobId: "job-outreach-rejected-http",
		context: {
			company: "Context Co",
			role: "Applied AI Engineer",
		},
		sessionId: "outreach-rejected-http",
		status: "failed",
		timestamp: "2026-04-22T10:08:00.000Z",
		workflow: "linkedin-outreach",
	});
	await saveResearchSpecialistJob({
		error: {
			message: "Needs revised message.",
		},
		jobId: "job-outreach-rejected-http",
		sessionId: "outreach-rejected-http",
		status: "failed",
		timestamp: "2026-04-22T10:08:00.000Z",
		workflow: "linkedin-outreach",
	});
	await saveResearchApproval({
		approvalId: "approval-outreach-rejected-http",
		jobId: "job-outreach-rejected-http",
		sessionId: "outreach-rejected-http",
		status: "rejected",
		timestamp: "2026-04-22T10:08:00.000Z",
		title: "Review outreach draft",
	});
	await stageResearchPacket("outreach-rejected-http", {
		alternativeTargets: [],
		characterCount: 120,
		context: createContext("linkedin-outreach", {
			company: "Context Co",
			role: "Applied AI Engineer",
		}),
		language: "English",
		message: "LinkedIn outreach packet ready.",
		messageDraft: "Hi - reaching out because your team is scaling AI systems.",
		mode: "linkedin-outreach",
		primaryTarget: {
			name: "Hiring Manager",
			profileUrl: null,
			title: "Director of AI",
			type: "hiring-manager",
		},
		resultStatus: "ready",
		sessionId: "outreach-rejected-http",
		warnings: [],
	});

	await saveResearchSpecialistSession({
		activeJobId: "job-training-resumed-http",
		context: {
			subject: "LLM evals certification",
		},
		sessionId: "training-resumed-http",
		status: "running",
		timestamp: "2026-04-22T10:10:00.000Z",
		workflow: "training-review",
	});
	await saveResearchSpecialistJob({
		jobId: "job-training-resumed-http",
		sessionId: "training-resumed-http",
		status: "running",
		timestamp: "2026-04-22T10:10:00.000Z",
		workflow: "training-review",
	});
	await saveResearchFailure({
		jobId: "job-training-resumed-http",
		message: "Earlier run timed out before retry.",
		sessionId: "training-resumed-http",
		timestamp: "2026-04-22T10:09:00.000Z",
	});
	await stageResearchPacket("training-resumed-http", {
		betterAlternative: null,
		context: createContext("training-review", {
			subject: "LLM evals certification",
		}),
		dimensions: [
			{
				dimension: "North Star alignment",
				rationale: "Strong fit",
				score: 5,
			},
		],
		message: "Training review packet ready.",
		mode: "training-review",
		plan: [
			{
				deliverable: "Complete week-one labs",
				label: "Week 1",
			},
		],
		resultStatus: "ready",
		sessionId: "training-resumed-http",
		trainingTitle: "LLM evals certification",
		verdict: "do-it",
		warnings: [],
	});

	await saveResearchSpecialistSession({
		context: {
			subject: "AI portfolio project",
		},
		sessionId: "project-no-packet-http",
		status: "completed",
		timestamp: "2026-04-22T10:12:00.000Z",
		workflow: "project-review",
	});

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: missingPayload, response: missingResponse } =
			await readJsonResponse(
				`${handle.url}/research-specialist?sessionId=deep-missing-http`,
			);
		assert.equal(missingResponse.status, 200);
		assert.equal(
			(
				missingPayload as {
					selected: { summary: { state: string } | null };
				}
			).selected.summary?.state,
			"missing-input",
		);

		const { payload: noPacketPayload } = await readJsonResponse(
			`${handle.url}/research-specialist?sessionId=project-no-packet-http`,
		);
		assert.equal(
			(
				noPacketPayload as {
					selected: { summary: { state: string } | null };
				}
			).selected.summary?.state,
			"no-packet-yet",
		);

		const { payload: pausedPayload } = await readJsonResponse(
			`${handle.url}/research-specialist?mode=interview-prep`,
		);
		assert.equal(
			(
				pausedPayload as {
					selected: {
						summary: {
							approval: { status: string } | null;
							state: string;
						} | null;
					};
				}
			).selected.summary?.state,
			"approval-paused",
		);
		assert.equal(
			(
				pausedPayload as {
					selected: {
						summary: {
							approval: { status: string } | null;
							state: string;
						} | null;
					};
				}
			).selected.summary?.approval?.status,
			"pending",
		);

		const { payload: rejectedPayload } = await readJsonResponse(
			`${handle.url}/research-specialist?sessionId=outreach-rejected-http`,
		);
		assert.equal(
			(
				rejectedPayload as {
					selected: { summary: { state: string } | null };
				}
			).selected.summary?.state,
			"rejected",
		);

		const { payload: resumedPayload } = await readJsonResponse(
			`${handle.url}/research-specialist?sessionId=training-resumed-http`,
		);
		assert.equal(
			(
				resumedPayload as {
					selected: {
						summary: {
							run: { state: string };
							state: string;
						} | null;
					};
				}
			).selected.summary?.state,
			"resumed",
		);
		assert.equal(
			(
				resumedPayload as {
					selected: {
						summary: {
							run: { state: string };
							state: string;
						} | null;
					};
				}
			).selected.summary?.run.state,
			"running",
		);

		const { payload: completedPayload } = await readJsonResponse(
			`${handle.url}/research-specialist?sessionId=deep-completed-http`,
		);
		assert.equal(
			(
				completedPayload as {
					selected: { summary: { state: string } | null };
				}
			).selected.summary?.state,
			"completed",
		);

		const { payload: latestPayload } = await readJsonResponse(
			`${handle.url}/research-specialist`,
		);
		assert.equal(
			(
				latestPayload as {
					selected: {
						origin: string;
						summary: { session: { sessionId: string } | null } | null;
					};
				}
			).selected.origin,
			"latest-session",
		);
		assert.equal(
			(
				latestPayload as {
					selected: {
						origin: string;
						summary: { session: { sessionId: string } | null } | null;
					};
				}
			).selected.summary?.session?.sessionId,
			"training-resumed-http",
		);

		const { payload: invalidPayload, response: invalidResponse } =
			await readJsonResponse(`${handle.url}/research-specialist?mode=bad`);
		assert.equal(invalidResponse.status, 400);
		assert.equal(
			(
				invalidPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-research-specialist-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("specialist-workspace routes cover latest-session summaries, stale focus recovery, ready tracker launch, completed resume, missing-session resume, and duplicate launch guards", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createDelayedReadyAgentRuntime(fixture.repoRoot, 200),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveEvaluationSession(store, {
		activeJobId: "job-deep-running-http",
		sessionId: "deep-running-http",
		status: "running",
		updatedAt: "2026-04-22T10:00:00.000Z",
		workflow: "deep-company-research",
	});
	await saveEvaluationJob(store, {
		jobId: "job-deep-running-http",
		sessionId: "deep-running-http",
		status: "running",
		updatedAt: "2026-04-22T10:00:00.000Z",
	});

	await saveEvaluationSession(store, {
		activeJobId: "job-interview-waiting-http",
		sessionId: "interview-waiting-http",
		status: "waiting",
		updatedAt: "2026-04-22T10:10:00.000Z",
		workflow: "interview-prep",
	});
	await saveEvaluationJob(store, {
		jobId: "job-interview-waiting-http",
		sessionId: "interview-waiting-http",
		status: "waiting",
		updatedAt: "2026-04-22T10:10:00.000Z",
		waitApprovalId: "approval-interview-http",
		waitReason: "approval",
	});
	await store.approvals.save({
		approvalId: "approval-interview-http",
		jobId: "job-interview-waiting-http",
		request: {
			action: "specialist-review",
			title: "Review interview prep scope",
		},
		requestedAt: "2026-04-22T10:10:00.000Z",
		resolvedAt: null,
		response: null,
		sessionId: "interview-waiting-http",
		status: "pending",
		traceId: "trace-interview-http",
		updatedAt: "2026-04-22T10:10:00.000Z",
	});

	await saveEvaluationSession(store, {
		activeJobId: "job-app-help-completed-http",
		sessionId: "app-help-completed-http",
		status: "completed",
		updatedAt: "2026-04-22T10:05:00.000Z",
		workflow: "application-help",
	});
	await saveEvaluationJob(store, {
		jobId: "job-app-help-completed-http",
		sessionId: "app-help-completed-http",
		status: "completed",
		updatedAt: "2026-04-22T10:05:00.000Z",
	});

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 30,
		services,
	});

	try {
		const { payload: summaryPayload, response: summaryResponse } =
			await readJsonResponse(`${handle.url}/specialist-workspace`);

		assert.equal(summaryResponse.status, 200);
		assert.equal(
			(
				summaryPayload as {
					selected: {
						origin: string;
						summary: {
							handoff: { mode: string };
							run: { state: string };
						} | null;
					};
					workflows: Array<{
						handoff: { mode: string };
					}>;
				}
			).selected.origin,
			"latest-session",
		);
		assert.equal(
			(
				summaryPayload as {
					selected: {
						origin: string;
						summary: {
							handoff: { mode: string };
							run: { state: string };
						} | null;
					};
				}
			).selected.summary?.handoff.mode,
			"interview-prep",
		);
		assert.equal(
			(
				summaryPayload as {
					selected: {
						origin: string;
						summary: {
							handoff: { mode: string };
							run: { state: string };
						} | null;
					};
				}
			).selected.summary?.run.state,
			"waiting",
		);
		assert.equal(
			(
				summaryPayload as {
					workflows: Array<{
						handoff: { detailSurface: { path: string } | null; mode: string };
					}>;
				}
			).workflows.find(
				(workflow) => workflow.handoff.mode === "application-help",
			)?.handoff.detailSurface?.path,
			"/application-help",
		);

		const { payload: stalePayload, response: staleResponse } =
			await readJsonResponse(
				`${handle.url}/specialist-workspace?mode=interview-prep&sessionId=deep-running-http`,
			);

		assert.equal(staleResponse.status, 200);
		assert.equal(
			(
				stalePayload as {
					selected: {
						state: string;
						summary: {
							handoff: { mode: string };
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selected.state,
			"missing",
		);
		assert.equal(
			(
				stalePayload as {
					selected: {
						state: string;
						summary: {
							handoff: { mode: string };
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selected.summary?.handoff.mode,
			"interview-prep",
		);
		assert.equal(
			(
				stalePayload as {
					selected: {
						summary: {
							warnings: Array<{ code: string }>;
						} | null;
					};
				}
			).selected.summary?.warnings.some(
				(warning) => warning.code === "stale-selection",
			),
			true,
		);

		const { payload: readyComparePayload, response: readyCompareResponse } =
			await readJsonResponse(`${handle.url}/specialist-workspace/action`, {
				body: JSON.stringify({
					action: "launch",
					mode: "compare-offers",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(readyCompareResponse.status, 200);
		assert.equal(
			(
				readyComparePayload as {
					actionResult: {
						handoff: { detailSurface: { path: string } | null };
						mode: string | null;
						state: string;
					};
				}
			).actionResult.state,
			"ready",
		);
		assert.equal(
			(
				readyComparePayload as {
					actionResult: {
						handoff: { detailSurface: { path: string } | null };
						mode: string | null;
						state: string;
					};
				}
			).actionResult.mode,
			"compare-offers",
		);
		assert.equal(
			(
				readyComparePayload as {
					actionResult: {
						handoff: { detailSurface: { path: string } | null };
						mode: string | null;
						state: string;
					};
				}
			).actionResult.handoff.detailSurface?.path,
			"/tracker-specialist",
		);

		const { payload: missingResumePayload, response: missingResumeResponse } =
			await readJsonResponse(`${handle.url}/specialist-workspace/action`, {
				body: JSON.stringify({
					action: "resume",
					sessionId: "missing-specialist-http",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(missingResumeResponse.status, 200);
		assert.equal(
			(
				missingResumePayload as {
					actionResult: { state: string };
				}
			).actionResult.state,
			"missing-session",
		);

		const {
			payload: completedResumePayload,
			response: completedResumeResponse,
		} = await readJsonResponse(`${handle.url}/specialist-workspace/action`, {
			body: JSON.stringify({
				action: "resume",
				sessionId: "app-help-completed-http",
			}),
			headers: {
				"content-type": "application/json",
			},
			method: "POST",
		});

		assert.equal(completedResumeResponse.status, 200);
		assert.equal(
			(
				completedResumePayload as {
					actionResult: { state: string };
				}
			).actionResult.state,
			"completed",
		);

		const duplicateLaunchRequests = await Promise.all([
			readJsonResponse(`${handle.url}/specialist-workspace/action`, {
				body: JSON.stringify({
					action: "launch",
					mode: "application-help",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			}),
			readJsonResponse(`${handle.url}/specialist-workspace/action`, {
				body: JSON.stringify({
					action: "launch",
					mode: "application-help",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			}),
		]);

		assert.equal(
			duplicateLaunchRequests.some(
				({ payload, response }) =>
					response.status === 200 &&
					(
						payload as {
							actionResult: {
								handoff: { detailSurface: { path: string } | null };
								state: string;
							};
						}
					).actionResult.state === "ready" &&
					(
						payload as {
							actionResult: {
								handoff: { detailSurface: { path: string } | null };
								state: string;
							};
						}
					).actionResult.handoff.detailSurface?.path === "/application-help",
			),
			true,
		);
		assert.equal(
			duplicateLaunchRequests.some(
				({ payload, response }) =>
					response.status === 409 &&
					(
						payload as {
							error: { code: string };
						}
					).error.code === "specialist-workspace-action-in-flight",
			),
			true,
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("orchestration route returns auth-blocked launch handoffs and explicit missing-session resume envelopes", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload: launchPayload, response: launchResponse } =
			await readJsonResponse(`${handle.url}/orchestration`, {
				body: JSON.stringify({
					context: {
						promptText: "Evaluate this JD",
					},
					kind: "launch",
					workflow: "single-evaluation",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(launchResponse.status, 200);
		assert.equal(
			(
				launchPayload as {
					handoff: { route: { status: string } };
				}
			).handoff.route.status,
			"ready",
		);
		assert.equal(
			(
				launchPayload as {
					handoff: { runtime: { status: string } };
				}
			).handoff.runtime.status,
			"blocked",
		);
		assert.equal(
			(
				launchPayload as {
					handoff: { state: string };
				}
			).handoff.state,
			"auth-required",
		);
		assert.equal(
			(
				launchPayload as {
					handoff: { selectedSession: { session: { sessionId: string } } };
				}
			).handoff.selectedSession.session.sessionId.length > 0,
			true,
		);

		const { payload: resumePayload, response: resumeResponse } =
			await readJsonResponse(`${handle.url}/orchestration`, {
				body: JSON.stringify({
					kind: "resume",
					sessionId: "missing-session",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(resumeResponse.status, 200);
		assert.equal(
			(
				resumePayload as {
					handoff: { route: { status: string } };
				}
			).handoff.route.status,
			"session-not-found",
		);
		assert.equal(
			(
				resumePayload as {
					handoff: { state: string };
				}
			).handoff.state,
			"failed",
		);
		assert.equal(
			(
				resumePayload as {
					handoff: { selectedSession: unknown | null };
				}
			).handoff.selectedSession,
			null,
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("health route handles HEAD requests without emitting a response body", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const response = await fetch(`${handle.url}/health`, {
			method: "HEAD",
		});
		const body = await response.text();

		assert.equal(response.status, 200);
		assert.equal(body, "");
		assert.equal(
			response.headers.get("content-type"),
			"application/json; charset=utf-8",
		);
		assert.equal(
			Number(response.headers.get("content-length") ?? "0") > 0,
			true,
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("runtime approval and diagnostics routes expose pending approvals, failed diagnostics, and request correlation headers", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();
	await seedRuntimeContext(store, {
		jobId: "job-runtime-route",
		sessionId: "session-runtime-route",
	});
	const approvalRuntime = await services.approvalRuntime.getService();
	const observability = await services.observability.getService();
	const approval = await approvalRuntime.createApproval({
		requestedAt: "2026-04-21T07:24:30.000Z",
		request: {
			action: "send-email",
			correlation: {
				jobId: "job-runtime-route",
				requestId: "request-runtime-route",
				sessionId: "session-runtime-route",
				traceId: "trace-runtime-route",
			},
			details: null,
			title: "Send route email",
		},
	});
	await observability.recordEvent({
		correlation: {
			jobId: "job-runtime-route",
			requestId: "request-runtime-route",
			sessionId: "session-runtime-route",
			traceId: "trace-runtime-route",
		},
		eventType: "job-failed",
		level: "error",
		metadata: {
			message: "Route diagnostics failure",
			runId: "job-runtime-route-run",
		},
		occurredAt: "2026-04-21T07:25:00.000Z",
		summary: "Job failed.",
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload: approvalsPayload, response: approvalsResponse } =
			await readJsonResponse(
				`${handle.url}/runtime/approvals?sessionId=session-runtime-route`,
			);
		const approvalsRequestId = approvalsResponse.headers.get("x-request-id");
		const approvalsTraceId = approvalsResponse.headers.get("x-trace-id");
		const { payload: diagnosticsPayload, response: diagnosticsResponse } =
			await readJsonResponse(
				`${handle.url}/runtime/diagnostics?traceId=trace-runtime-route`,
			);

		assert.equal(approvalsResponse.status, 200);
		assert.equal(diagnosticsResponse.status, 200);
		assert.ok(approvalsRequestId);
		assert.ok(approvalsTraceId);
		assert.equal(
			(approvalsPayload as { approvals: Array<{ approvalId: string }> })
				.approvals[0]?.approvalId,
			approval.approval.approvalId,
		);
		assert.equal(
			(
				diagnosticsPayload as {
					diagnostics: { failedJobs: Array<{ jobId: string }> };
				}
			).diagnostics.failedJobs[0]?.jobId,
			"job-runtime-route",
		);

		const requestEvents = await store.events.list({
			requestId: approvalsRequestId ?? undefined,
		});

		assert.equal(
			requestEvents.some(
				(event) => event.eventType === "http-request-completed",
			),
			true,
		);
		assert.equal(
			requestEvents.some(
				(event) => event.eventType === "http-request-received",
			),
			true,
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("approval inbox and resolution routes cover filtered queue reads, stale states, rejected handoffs, and invalid input handling", async () => {
	const fixture = await createReadyFixture();
	const authFixture = await createAgentRuntimeAuthFixture();
	const backend = await startFakeCodexBackend();
	const store = await createOperationalStore({ repoRoot: fixture.repoRoot });
	await store.close();
	await authFixture.setReady({ accountId: "acct-http-approval-inbox" });
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			env: {
				JOBHUNT_API_OPENAI_AUTH_PATH: authFixture.authPath,
				JOBHUNT_API_OPENAI_BASE_URL: `${backend.url}/backend-api`,
				JOBHUNT_API_OPENAI_ORIGINATOR: "jobhunt-http-approval-inbox-test",
			},
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const runtimeStore = await services.operationalStore.getStore();
	const approvalRuntime = await services.approvalRuntime.getService();
	const observability = await services.observability.getService();
	const primaryApproval = await seedWaitingApprovalContext({
		approvalRuntime,
		jobId: "job-approval-primary",
		observability,
		requestId: "request-approval-primary",
		sessionId: "session-approval-primary",
		store: runtimeStore,
		timestamp: "2026-04-21T09:00:00.000Z",
		title: "Review primary approval",
		traceId: "trace-approval-primary",
		workflow: "single-evaluation",
	});
	const rejectedApproval = await seedWaitingApprovalContext({
		approvalRuntime,
		jobId: "job-approval-rejected",
		observability,
		requestId: "request-approval-rejected",
		sessionId: "session-approval-rejected",
		store: runtimeStore,
		timestamp: "2026-04-21T09:01:00.000Z",
		title: "Review rejected approval",
		traceId: "trace-approval-rejected",
		workflow: "single-evaluation",
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		rateLimitMaxRequests: 20,
		services,
	});

	try {
		const { payload: filteredPayload, response: filteredResponse } =
			await readJsonResponse(
				`${handle.url}/approval-inbox?sessionId=session-approval-primary&approvalId=${primaryApproval.approvalId}&limit=1`,
			);

		assert.equal(filteredResponse.status, 200);
		assert.equal((filteredPayload as { status: string }).status, "ready");
		assert.equal(
			(
				filteredPayload as {
					pendingApprovalCount: number;
				}
			).pendingApprovalCount,
			1,
		);
		assert.equal(
			(
				filteredPayload as {
					queue: Array<{ approvalId: string }>;
				}
			).queue[0]?.approvalId,
			primaryApproval.approvalId,
		);
		assert.equal(
			(
				filteredPayload as {
					selected: {
						selectionState: string;
						approval: { approvalId: string; status: string };
						interruptedRun: { state: string };
						route: { message: string };
						session: { pendingApprovalCount: number };
						timeline: Array<{ summary: string }>;
					};
				}
			).selected.selectionState,
			"active",
		);
		assert.equal(
			(
				filteredPayload as {
					selected: {
						approval: { approvalId: string; status: string };
					};
				}
			).selected.approval.approvalId,
			primaryApproval.approvalId,
		);
		assert.equal(
			(
				filteredPayload as {
					selected: {
						approval: { approvalId: string; status: string };
					};
				}
			).selected.approval.status,
			"pending",
		);
		assert.equal(
			(
				filteredPayload as {
					selected: {
						interruptedRun: { state: string };
					};
				}
			).selected.interruptedRun.state,
			"waiting-for-approval",
		);
		assert.equal(
			(
				filteredPayload as {
					selected: {
						session: { pendingApprovalCount: number };
					};
				}
			).selected.session.pendingApprovalCount,
			1,
		);
		assert.equal(
			(
				filteredPayload as {
					selected: {
						timeline: Array<{ summary: string }>;
					};
				}
			).selected.timeline.some(
				(item) =>
					item.summary === "Review primary approval is waiting for approval.",
			),
			true,
		);
		assert.equal(
			"request" in
				(
					filteredPayload as {
						selected: { approval: Record<string, unknown> };
					}
				).selected.approval,
			false,
		);

		const { payload: approvePayload, response: approveResponse } =
			await readJsonResponse(`${handle.url}/approval-resolution`, {
				body: JSON.stringify({
					approvalId: primaryApproval.approvalId,
					decision: "approved",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(approveResponse.status, 200);
		assert.equal(
			(
				approvePayload as {
					resolution: {
						outcome: string;
						applied: boolean;
						job: { status: string };
					};
				}
			).resolution.outcome,
			"approved",
		);
		assert.equal(
			(
				approvePayload as {
					resolution: {
						outcome: string;
						applied: boolean;
						job: { status: string };
					};
				}
			).resolution.applied,
			true,
		);
		assert.equal(
			(
				approvePayload as {
					resolution: {
						outcome: string;
						applied: boolean;
						job: { status: string };
					};
				}
			).resolution.job.status,
			"queued",
		);

		const { payload: staleApprovePayload, response: staleApproveResponse } =
			await readJsonResponse(`${handle.url}/approval-resolution`, {
				body: JSON.stringify({
					approvalId: primaryApproval.approvalId,
					decision: "approved",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(staleApproveResponse.status, 200);
		assert.equal(
			(
				staleApprovePayload as {
					resolution: { outcome: string; applied: boolean };
				}
			).resolution.outcome,
			"already-approved",
		);
		assert.equal(
			(
				staleApprovePayload as {
					resolution: { outcome: string; applied: boolean };
				}
			).resolution.applied,
			false,
		);

		const {
			payload: approvedSummaryPayload,
			response: approvedSummaryResponse,
		} = await readJsonResponse(
			`${handle.url}/approval-inbox?approvalId=${primaryApproval.approvalId}`,
		);

		assert.equal(approvedSummaryResponse.status, 200);
		assert.equal(
			(
				approvedSummaryPayload as {
					selected: { selectionState: string };
				}
			).selected.selectionState,
			"approved",
		);

		const { payload: rejectedPayload, response: rejectedResponse } =
			await readJsonResponse(`${handle.url}/approval-resolution`, {
				body: JSON.stringify({
					approvalId: rejectedApproval.approvalId,
					decision: "rejected",
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

		assert.equal(rejectedResponse.status, 200);
		assert.equal(
			(
				rejectedPayload as {
					resolution: {
						outcome: string;
						applied: boolean;
						job: { status: string };
					};
				}
			).resolution.outcome,
			"rejected",
		);
		assert.equal(
			(
				rejectedPayload as {
					resolution: {
						outcome: string;
						applied: boolean;
						job: { status: string };
					};
				}
			).resolution.job.status,
			"failed",
		);

		const {
			payload: rejectedSummaryPayload,
			response: rejectedSummaryResponse,
		} = await readJsonResponse(
			`${handle.url}/approval-inbox?approvalId=${rejectedApproval.approvalId}`,
		);

		assert.equal(rejectedSummaryResponse.status, 200);
		assert.equal(
			(
				rejectedSummaryPayload as {
					selected: {
						selectionState: string;
						interruptedRun: { state: string };
					};
				}
			).selected.selectionState,
			"rejected",
		);
		assert.equal(
			(
				rejectedSummaryPayload as {
					selected: {
						selectionState: string;
						interruptedRun: { state: string };
					};
				}
			).selected.interruptedRun.state,
			"resume-ready",
		);

		const { payload: invalidSummaryPayload, response: invalidSummaryResponse } =
			await readJsonResponse(`${handle.url}/approval-inbox?limit=0`);

		assert.equal(invalidSummaryResponse.status, 400);
		assert.equal(
			(
				invalidSummaryPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-approval-inbox-query",
		);

		const {
			payload: invalidResolutionPayload,
			response: invalidResolutionResponse,
		} = await readJsonResponse(`${handle.url}/approval-resolution`, {
			body: JSON.stringify({
				approvalId: rejectedApproval.approvalId,
				decision: "maybe",
			}),
			headers: {
				"content-type": "application/json",
			},
			method: "POST",
		});

		assert.equal(invalidResolutionResponse.status, 400);
		assert.equal(
			(
				invalidResolutionPayload as {
					error: { code: string };
				}
			).error.code,
			"invalid-approval-resolution-request",
		);

		const {
			payload: missingResolutionPayload,
			response: missingResolutionResponse,
		} = await readJsonResponse(`${handle.url}/approval-resolution`, {
			body: JSON.stringify({
				approvalId: "missing-approval",
				decision: "approved",
			}),
			headers: {
				"content-type": "application/json",
			},
			method: "POST",
		});

		assert.equal(missingResolutionResponse.status, 404);
		assert.equal(
			(
				missingResolutionPayload as {
					error: { code: string };
				}
			).error.code,
			"approval-not-found",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await backend.close();
		await authFixture.cleanup();
		await fixture.cleanup();
	}
});

test("onboarding summary route composes startup checklist state with bounded repair preview data", async () => {
	const fixture = await createOnboardingFixture();
	const beforeSnapshot = await fixture.snapshotUserLayer();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/onboarding?targets=applicationsTracker,profileConfig,profileCv`,
		);
		const afterSnapshot = await fixture.snapshotUserLayer();

		assert.equal(response.status, 200);
		assert.equal(
			(payload as { status: string }).status,
			"missing-prerequisites",
		);
		assert.equal(
			(
				payload as {
					checklist: { required: Array<{ surfaceKey: string }> };
				}
			).checklist.required.length,
			2,
		);
		assert.deepEqual(
			(
				payload as {
					repairPreview: { targets: string[] };
				}
			).repairPreview.targets,
			["applicationsTracker", "profileConfig", "profileCv"],
		);
		assert.equal(
			(
				payload as {
					repairPreview: { repairableCount: number; targetCount: number };
				}
			).repairPreview.repairableCount,
			3,
		);
		assert.equal(
			(
				payload as {
					repairPreview: { repairableCount: number; targetCount: number };
				}
			).repairPreview.targetCount,
			3,
		);
		assert.deepEqual(afterSnapshot, beforeSnapshot);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("onboarding summary route rejects unsupported target filters", async () => {
	const fixture = await createOnboardingFixture();
	const services = createApiServiceContainer({
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/onboarding?targets=profileConfig,unknownTarget`,
		);

		assert.equal(response.status, 400);
		assert.equal((payload as { status: string }).status, "bad-request");
		assert.equal(
			(payload as { error: { code: string } }).error.code,
			"invalid-onboarding-query",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("onboarding repair route creates requested files and revalidates startup state from the live repo", async () => {
	const fixture = await createOnboardingFixture();
	const beforeSnapshot = await fixture.snapshotUserLayer();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/onboarding/repair`,
			{
				body: JSON.stringify({
					confirm: true,
					targets: ["profileConfig", "profileCv"],
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			},
		);
		const afterSnapshot = await fixture.snapshotUserLayer();

		assert.equal(response.status, 200);
		assert.equal((payload as { repairedCount: number }).repairedCount, 2);
		assert.equal((payload as { status: string }).status, "auth-required");
		assert.equal(
			(
				payload as {
					health: { missing: { onboarding: number } };
				}
			).health.missing.onboarding,
			0,
		);
		assert.equal(
			await fixture.readText("config/profile.yml"),
			"candidate:\n  full_name: Template User\n",
		);
		assert.equal(await fixture.readText("profile/cv.md"), "# Template CV\n");
		assert.notDeepEqual(afterSnapshot, beforeSnapshot);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("onboarding repair route rejects already-present requested targets", async () => {
	const fixture = await createOnboardingFixture({
		"config/profile.yml": "full_name: Existing User\n",
	});
	const services = createApiServiceContainer({
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/onboarding/repair`,
			{
				body: JSON.stringify({
					confirm: true,
					targets: ["profileConfig"],
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			},
		);

		assert.equal(response.status, 409);
		assert.equal((payload as { status: string }).status, "error");
		assert.equal(
			(payload as { error: { code: string } }).error.code,
			"onboarding-target-already-present",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("onboarding repair route rejects invalid target input", async () => {
	const fixture = await createOnboardingFixture();
	const services = createApiServiceContainer({
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/onboarding/repair`,
			{
				body: JSON.stringify({
					confirm: true,
					targets: ["profileConfig", "not-real-target"],
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			},
		);

		assert.equal(response.status, 400);
		assert.equal((payload as { status: string }).status, "bad-request");
		assert.equal(
			(payload as { error: { code: string } }).error.code,
			"invalid-onboarding-repair-request",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("onboarding repair route maps missing template sources to explicit server errors", async () => {
	const fixture = await createWorkspaceFixture({
		files: {
			"config/portals.example.yml": "title_filter:\n  positive: []\n",
			"data/applications.example.md": "# Applications Tracker\n",
			"modes/_profile.template.md": "# Profile Template\n",
			"profile/cv.example.md": "# Template CV\n",
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"modes/_profile.md": "# Profile\n",
		},
	});
	const services = createApiServiceContainer({
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload, response } = await readJsonResponse(
			`${handle.url}/onboarding/repair`,
			{
				body: JSON.stringify({
					confirm: true,
					targets: ["profileConfig"],
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			},
		);

		assert.equal(response.status, 500);
		assert.equal((payload as { status: string }).status, "error");
		assert.equal(
			(payload as { error: { code: string } }).error.code,
			"onboarding-template-missing",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("dispatcher returns explicit 404 and 405 error contracts", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createAgentRuntimeService({
			authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
			repoRoot: fixture.repoRoot,
		}),
		repoRoot: fixture.repoRoot,
	});
	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		services,
	});

	try {
		const { payload: methodPayload, response: methodResponse } =
			await readJsonResponse(`${handle.url}/health`, {
				method: "POST",
			});
		const { payload: missingPayload, response: missingResponse } =
			await readJsonResponse(`${handle.url}/missing-route`);

		assert.equal(methodResponse.status, 405);
		assert.equal(methodResponse.headers.get("allow"), "GET, HEAD");
		assert.equal(
			(methodPayload as { status: string }).status,
			"method-not-allowed",
		);
		assert.equal(
			(methodPayload as { error: { code: string } }).error.code,
			"method-not-allowed",
		);

		assert.equal(missingResponse.status, 404);
		assert.equal((missingPayload as { status: string }).status, "not-found");
		assert.equal(
			(missingPayload as { error: { code: string } }).error.code,
			"route-not-found",
		);
	} finally {
		await handle.close();
		await services.dispose();
		await fixture.cleanup();
	}
});

test("startup server rate limits burst traffic per client", async () => {
	const fixture = await createReadyFixture();

	const handle = await startStartupHttpServer({
		host: "127.0.0.1",
		port: 0,
		repoRoot: fixture.repoRoot,
	});

	try {
		let lastResponse: Response | undefined;
		let lastPayload: unknown;

		for (let requestIndex = 0; requestIndex < 6; requestIndex += 1) {
			const response = await fetch(`${handle.url}/health`);
			lastResponse = response;
			lastPayload = await response.json();
		}

		assert.ok(lastResponse);
		assert.equal(lastResponse.status, 429);
		assert.equal((lastPayload as { status: string }).status, "rate-limited");
		assert.match(
			String(
				lastPayload &&
					(lastPayload as { error?: { message?: string } }).error?.message,
			),
			/Too many requests/i,
		);
		assert.equal(lastResponse.headers.get("retry-after") !== null, true);
		assert.equal(lastResponse.headers.get("x-ratelimit-limit"), "5");
		assert.equal(lastResponse.headers.get("x-ratelimit-remaining"), "0");
	} finally {
		await handle.close();
		await fixture.cleanup();
	}
});

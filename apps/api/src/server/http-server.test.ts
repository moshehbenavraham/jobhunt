import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { createAgentRuntimeService } from "../agent-runtime/index.js";
import {
	createAgentRuntimeAuthFixture,
	getRepoOpenAIAccountModuleImportPath,
	startFakeCodexBackend,
} from "../agent-runtime/test-utils.js";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
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

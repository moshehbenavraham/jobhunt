import assert from "node:assert/strict";
import test from "node:test";
import type {
	AgentRuntimeBootstrap,
	AgentRuntimeService,
} from "../agent-runtime/index.js";
import { WORKFLOW_INTENTS } from "../prompt/prompt-types.js";
import { createApiServiceContainer } from "../runtime/service-container.js";
import { createWorkspaceFixture } from "../workspace/test-utils.js";
import { createOperatorHomeSummary } from "./operator-home-summary.js";

function createReadyAgentRuntime(repoRoot: string): AgentRuntimeService {
	return {
		async bootstrap(): Promise<AgentRuntimeBootstrap> {
			throw new Error("bootstrap is not used by operator-home summary tests");
		},
		async close() {},
		async getReadiness() {
			return {
				auth: {
					accountId: "acct-operator-home-test",
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
					originator: "operator-home-summary-test",
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
					modeRepoRelativePath: "modes/oferta.md",
					requestedWorkflow: "single-evaluation",
					state: "ready" as const,
					supportedWorkflows: WORKFLOW_INTENTS,
					workflow: "single-evaluation" as const,
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

test("operator-home summary composes bounded previews and app-primary maintenance copy", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const captured = {
		approvalLimit: -1,
		artifactLimit: -1,
		closeoutLimit: -1,
	};

	try {
		const payload = await createOperatorHomeSummary(services, {
			approvalLimit: 1,
			artifactLimit: 2,
			closeoutLimit: 1,
			dependencies: {
				async createOperatorShellSummary(_services, options = {}) {
					captured.approvalLimit = options.approvalLimit ?? -1;

					return {
						activity: {
							activeSession: {
								activeJob: {
									jobId: "job-home-live",
									status: "running",
									updatedAt: "2026-04-22T10:00:00.000Z",
									waitReason: null,
								},
								activeJobId: "job-home-live",
								lastHeartbeatAt: "2026-04-22T10:00:00.000Z",
								pendingApprovalCount: 2,
								sessionId: "session-home-live",
								status: "running",
								updatedAt: "2026-04-22T10:00:00.000Z",
								workflow: "application-help",
							},
							activeSessionCount: 1,
							latestPendingApprovals: [
								{
									action: "approve-email",
									approvalId: "approval-home-1",
									jobId: "job-home-live",
									requestedAt: "2026-04-22T09:59:00.000Z",
									sessionId: "session-home-live",
									title: "Review email draft",
									traceId: "trace-home-1",
								},
							],
							pendingApprovalCount: 2,
							recentFailureCount: 1,
							recentFailures: [
								{
									failedAt: "2026-04-22T09:58:00.000Z",
									jobId: "job-home-failed",
									message: "Recent home failure",
									runId: "run-home-failed",
									sessionId: "session-home-failed",
									traceId: "trace-home-failed",
								},
							],
							state: "attention-required",
						},
						currentSession: {
							id: "phase06-session06-dashboard-replacement-maintenance-and-cutover",
							monorepo: true,
							packagePath: null,
							phase: 6,
							source: "state-file",
							stateFilePath: `${fixture.repoRoot}/.spec_system/state.json`,
						},
						generatedAt: "2026-04-22T10:00:00.000Z",
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
				},
				async createPipelineReviewSummary(_services, options = {}) {
					captured.closeoutLimit = options.limit ?? -1;

					return {
						filters: {
							limit: options.limit ?? 1,
							offset: 0,
							reportNumber: null,
							section: "all",
							sort: "queue",
							url: null,
						},
						generatedAt: "2026-04-22T10:00:00.000Z",
						message: "Pipeline ready.",
						ok: true,
						queue: {
							counts: {
								malformed: 1,
								pending: 2,
								processed: 4,
							},
							hasMore: false,
							items: [
								{
									company: "Acme",
									kind: "pending",
									legitimacy: "High Confidence",
									pdf: {
										exists: false,
										message: "No PDF yet.",
										repoRelativePath: null,
									},
									report: {
										exists: false,
										message: "No report yet.",
										repoRelativePath: null,
									},
									reportNumber: null,
									role: "Staff Engineer",
									score: null,
									selected: false,
									url: "https://example.com/jobs/acme-staff",
									verification: null,
									warningCount: 0,
									warnings: [],
								},
							],
							limit: options.limit ?? 1,
							offset: 0,
							section: "all",
							sort: "queue",
							totalCount: 6,
						},
						selectedDetail: {
							message: "Nothing selected.",
							origin: "none",
							requestedReportNumber: null,
							requestedUrl: null,
							row: null,
							state: "empty",
						},
						service: "jobhunt-api-scaffold",
						sessionId: "phase01-session03-agent-runtime-bootstrap",
						shortlist: {
							available: false,
							bucketCounts: {
								adjacentOrNoisy: null,
								possibleFit: null,
								strongestFit: null,
							},
							campaignGuidance: null,
							generatedBy: null,
							lastRefreshed: null,
							message: "No shortlist.",
							topRoles: [],
						},
						status: "ready",
					};
				},
				async createTrackerWorkspaceSummary(_services, options = {}) {
					return {
						filters: {
							entryNumber: null,
							limit: options.limit ?? 1,
							offset: 0,
							reportNumber: null,
							search: null,
							sort: "date",
							status: null,
						},
						generatedAt: "2026-04-22T10:00:00.000Z",
						message: "Tracker ready.",
						ok: true,
						pendingAdditions: {
							count: 1,
							items: [
								{
									company: "Acme",
									entryNumber: 11,
									fileName: "011-acme.tsv",
									notes: null,
									reportNumber: "011",
									reportRepoRelativePath: "reports/011-acme-2026-04-22.md",
									repoRelativePath: "batch/tracker-additions/011-acme.tsv",
									role: "Staff Engineer",
									status: "new",
								},
							],
							message: "Pending additions present.",
						},
						rows: {
							filteredCount: 14,
							hasMore: false,
							items: [],
							limit: options.limit ?? 1,
							offset: 0,
							sort: "date",
							totalCount: 14,
						},
						selectedDetail: {
							message: "Nothing selected.",
							origin: "none",
							pendingAddition: null,
							requestedEntryNumber: null,
							requestedReportNumber: null,
							row: null,
							state: "empty",
						},
						service: "jobhunt-api-scaffold",
						sessionId: "phase01-session03-agent-runtime-bootstrap",
						status: "ready",
						statusOptions: [],
					};
				},
				async createReportViewerSummary(_services, options = {}) {
					captured.artifactLimit = options.limit ?? -1;
					const recentArtifacts = [
						{
							artifactDate: "2026-04-22",
							fileName: "011-acme-2026-04-22.md",
							kind: "report" as const,
							repoRelativePath: "reports/011-acme-2026-04-22.md",
							reportNumber: "011",
							selected: false,
						},
						{
							artifactDate: "2026-04-22",
							fileName: "011-acme.pdf",
							kind: "pdf" as const,
							repoRelativePath: "output/011-acme.pdf",
							reportNumber: "011",
							selected: false,
						},
					];

					return {
						filters: {
							group: "all",
							limit: options.limit ?? 2,
							offset: 0,
							reportPath: null,
						},
						generatedAt: "2026-04-22T10:00:00.000Z",
						message: "Artifacts ready.",
						ok: true,
						recentArtifacts: {
							group: "all",
							hasMore: false,
							items: recentArtifacts.slice(0, options.limit ?? 2),
							limit: options.limit ?? 2,
							offset: 0,
							totalCount: 2,
						},
						selectedReport: {
							body: null,
							header: null,
							message: "Nothing selected.",
							origin: "none",
							repoRelativePath: null,
							reportNumber: null,
							requestedRepoRelativePath: null,
							state: "empty",
						},
						service: "jobhunt-api-scaffold",
						sessionId: "phase01-session03-agent-runtime-bootstrap",
						status: "ready",
					};
				},
				async createSettingsSummary() {
					return {
						auth: {
							auth: {
								accountId: "acct-operator-home-test",
								authPath: `${fixture.repoRoot}/data/openai-account-auth.json`,
								expiresAt: null,
								message: "Auth ready.",
								nextSteps: [],
								state: "ready",
								updatedAt: "2026-04-22T10:00:00.000Z",
							},
							config: {
								authPath: `${fixture.repoRoot}/data/openai-account-auth.json`,
								baseUrl: "https://chatgpt.com/backend-api",
								model: "gpt-5.4-mini",
								originator: "operator-home-summary-test",
								overrides: {
									authPath: false,
									baseUrl: false,
									model: false,
									originator: false,
								},
							},
							message: "Auth ready.",
							status: "ready",
						},
						currentSession: {
							id: "phase06-session06-dashboard-replacement-maintenance-and-cutover",
							monorepo: true,
							packagePath: null,
							phase: 6,
							source: "state-file",
							stateFilePath: `${fixture.repoRoot}/.spec_system/state.json`,
						},
						generatedAt: "2026-04-22T10:00:00.000Z",
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
									description: "Validate the app-first runtime prerequisites.",
									id: "doctor",
									label: "Run doctor",
								},
							],
							updateCheck: {
								changelogExcerpt: "Operator home landed.",
								checkedAt: "2026-04-22T10:00:00.000Z",
								command: "node scripts/update-system.mjs check",
								localVersion: "1.5.42",
								message:
									"Job-Hunt update available (1.5.42 -> 1.6.0). Use Settings to review the terminal update path.",
								remoteVersion: "1.6.0",
								state: "update-available",
							},
						},
						message:
							"Settings summary is ready. The operator home and app shell are the primary local runtime.",
						ok: true,
						operationalStore: {
							databasePath: `${fixture.repoRoot}/.jobhunt-app/app.db`,
							message: "Operational store ready.",
							reason: null,
							rootExists: true,
							rootPath: `${fixture.repoRoot}/.jobhunt-app`,
							status: "ready",
						},
						service: "jobhunt-api-scaffold",
						sessionId: "phase01-session03-agent-runtime-bootstrap",
						status: "ready",
						support: {
							prompt: {
								cacheMode: "fresh",
								sourceOrder: ["agents-guide"],
								sources: [],
								supportedWorkflowCount: 1,
							},
							tools: {
								hasMore: false,
								previewLimit: 1,
								totalCount: 1,
								tools: [],
							},
							workflows: {
								hasMore: false,
								previewLimit: 1,
								totalCount: 1,
								workflows: [],
							},
						},
						workspace: {
							agentsGuidePath: `${fixture.repoRoot}/AGENTS.md`,
							apiPackagePath: `${fixture.repoRoot}/apps/api`,
							appStateRootPath: `${fixture.repoRoot}/.jobhunt-app`,
							currentSession: {
								id: "phase06-session06-dashboard-replacement-maintenance-and-cutover",
								monorepo: true,
								packageAbsolutePath: null,
								packagePath: null,
								phase: 6,
								source: "state-file",
								specDirectoryPath: `${fixture.repoRoot}/.spec_system/specs/phase06-session06-dashboard-replacement-maintenance-and-cutover`,
								stateFilePath: `${fixture.repoRoot}/.spec_system/state.json`,
							},
							dataContractPath: `${fixture.repoRoot}/docs/DATA_CONTRACT.md`,
							protectedOwners: ["system", "user"],
							repoRoot: fixture.repoRoot,
							specSystemPath: `${fixture.repoRoot}/.spec_system`,
							webPackagePath: `${fixture.repoRoot}/apps/web`,
							writableRoots: ["config", "data", "output", "profile", "reports"],
						},
					};
				},
			},
		});

		assert.equal(payload.status, "ready");
		assert.equal(captured.approvalLimit, 1);
		assert.equal(captured.artifactLimit, 2);
		assert.equal(captured.closeoutLimit, 1);
		assert.equal(payload.cards.readiness.state, "ready");
		assert.equal(
			payload.cards.liveWork.actions[0]?.surface,
			"application-help",
		);
		assert.equal(payload.cards.closeout.pipeline.preview.length, 1);
		assert.equal(payload.cards.artifacts.items.length, 2);
		assert.equal(
			payload.cards.maintenance.updateCheck.state,
			"update-available",
		);
		assert.match(payload.cards.maintenance.message, /Settings/);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("operator-home summary retries section loaders before succeeding", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	let attempts = 0;

	try {
		const payload = await createOperatorHomeSummary(services, {
			retryAttempts: 2,
			retryBackoffMs: 0,
			dependencies: {
				async createOperatorShellSummary() {
					attempts += 1;

					if (attempts === 1) {
						throw new Error("transient shell failure");
					}

					return {
						activity: {
							activeSession: null,
							activeSessionCount: 0,
							latestPendingApprovals: [],
							pendingApprovalCount: 0,
							recentFailureCount: 0,
							recentFailures: [],
							state: "idle",
						},
						currentSession: {
							id: "phase06-session06-dashboard-replacement-maintenance-and-cutover",
							monorepo: true,
							packagePath: null,
							phase: 6,
							source: "state-file",
							stateFilePath: `${fixture.repoRoot}/.spec_system/state.json`,
						},
						generatedAt: "2026-04-22T10:05:00.000Z",
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
				},
				async createPipelineReviewSummary() {
					throw new Error("skip pipeline");
				},
				async createTrackerWorkspaceSummary() {
					throw new Error("skip tracker");
				},
				async createReportViewerSummary() {
					throw new Error("skip artifacts");
				},
				async createSettingsSummary() {
					throw new Error("skip settings");
				},
			},
		});

		assert.equal(attempts, 2);
		assert.equal(payload.cards.liveWork.state, "idle");
		assert.equal(payload.cards.approvals.state, "idle");
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("operator-home summary degrades timed-out sections without breaking the root payload", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});

	try {
		const payload = await createOperatorHomeSummary(services, {
			retryAttempts: 1,
			retryBackoffMs: 0,
			sectionTimeoutMs: 5,
			dependencies: {
				async createOperatorShellSummary() {
					await new Promise((resolve) => setTimeout(resolve, 20));
					throw new Error("should timeout first");
				},
				async createPipelineReviewSummary() {
					await new Promise((resolve) => setTimeout(resolve, 20));
					throw new Error("should timeout first");
				},
				async createTrackerWorkspaceSummary() {
					await new Promise((resolve) => setTimeout(resolve, 20));
					throw new Error("should timeout first");
				},
				async createReportViewerSummary() {
					await new Promise((resolve) => setTimeout(resolve, 20));
					throw new Error("should timeout first");
				},
				async createSettingsSummary() {
					await new Promise((resolve) => setTimeout(resolve, 20));
					throw new Error("should timeout first");
				},
			},
		});

		assert.equal(payload.ok, true);
		assert.equal(payload.cards.readiness.state, "ready");
		assert.equal(payload.cards.liveWork.state, "degraded");
		assert.equal(payload.cards.approvals.state, "degraded");
		assert.equal(payload.cards.closeout.state, "degraded");
		assert.equal(payload.cards.artifacts.state, "degraded");
		assert.equal(payload.cards.maintenance.state, "degraded");
		assert.match(
			payload.cards.liveWork.message,
			/operator-home activity summary is degraded/,
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");

function createReadyStartupPayload() {
	return {
		appStateRoot: {
			exists: true,
			path: `${ROOT}/.jobhunt-app`,
		},
		bootSurface: {
			defaultHost: "127.0.0.1",
			defaultPort: 5172,
			healthPath: "/health",
			startupPath: "/startup",
		},
		diagnostics: {
			onboardingMissing: [],
			optionalMissing: [],
			promptContract: {
				cacheMode: "fresh",
				sourceOrder: ["agents-guide", "mode-file"],
				sources: [],
				supportedWorkflows: ["single-evaluation"],
				workflowRoutes: [
					{
						description: "Single evaluation route",
						intent: "single-evaluation",
						modeRepoRelativePath: "modes/oferta.md",
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
			sessionId: "phase01-session03-agent-runtime-bootstrap",
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
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		userLayerWrites: "disabled",
	};
}

function createReadyShellSummary() {
	return {
		activity: {
			activeSession: {
				activeJob: {
					jobId: "job-batch-live",
					status: "waiting",
					updatedAt: "2026-04-22T00:00:00.000Z",
					waitReason: "approval",
				},
				activeJobId: "job-batch-live",
				lastHeartbeatAt: "2026-04-22T00:00:00.000Z",
				pendingApprovalCount: 1,
				sessionId: "session-batch-01",
				status: "waiting",
				updatedAt: "2026-04-22T00:00:00.000Z",
				workflow: "batch-evaluation",
			},
			activeSessionCount: 1,
			latestPendingApprovals: [
				{
					action: "approval-review",
					approvalId: "approval-batch-01",
					jobId: "job-batch-live",
					requestedAt: "2026-04-22T00:00:00.000Z",
					sessionId: "session-batch-01",
					title: "Review batch follow-up",
					traceId: "trace-batch-approval",
				},
			],
			pendingApprovalCount: 1,
			recentFailureCount: 0,
			recentFailures: [],
			state: "attention-required",
		},
		currentSession: {
			id: "phase05-session04-batch-jobs-workspace-and-run-detail",
			monorepo: true,
			packagePath: "apps/web",
			phase: 5,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
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
}

function getBaseItems() {
	return [
		{
			artifacts: {
				pdf: {
					exists: false,
					message: "No PDF artifact is available for batch item #1 yet.",
					repoRelativePath: null,
				},
				report: {
					exists: false,
					message: "No report artifact is available for batch item #1 yet.",
					repoRelativePath: null,
				},
				tracker: {
					exists: false,
					message: "No tracker artifact is available for batch item #1 yet.",
					repoRelativePath: null,
				},
			},
			company: "Acme",
			completedAt: "2026-04-22T00:04:00.000Z",
			error: "worker timeout",
			id: 1,
			legitimacy: null,
			notes: "Retryable failure from the last batch run.",
			rawStateError: null,
			reportNumber: null,
			resultWarnings: [],
			retries: 1,
			role: "Platform Engineer",
			score: null,
			source: "scan",
			startedAt: "2026-04-22T00:01:00.000Z",
			status: "retryable-failed",
			url: "https://example.com/jobs/acme-platform",
			warnings: [
				{
					code: "retryable-failed",
					message:
						"Item #1 failed with a retryable error and can be re-queued.",
				},
			],
		},
		{
			artifacts: {
				pdf: {
					exists: false,
					message: "No PDF artifact is available for batch item #2 yet.",
					repoRelativePath: null,
				},
				report: {
					exists: true,
					message:
						"Report artifact reports/002-beta-solutions-architect.md is available.",
					repoRelativePath: "reports/002-beta-solutions-architect.md",
				},
				tracker: {
					exists: false,
					message:
						"Tracker artifact has not been written for batch item #2 yet.",
					repoRelativePath: null,
				},
			},
			company: "Beta",
			completedAt: "2026-04-22T00:06:00.000Z",
			error: null,
			id: 2,
			legitimacy: "Proceed with Caution",
			notes: "Partial result waiting on tracker closeout.",
			rawStateError: null,
			reportNumber: "002",
			resultWarnings: ["tracker-not-written"],
			retries: 0,
			role: "Solutions Architect",
			score: 4.1,
			source: "scan",
			startedAt: "2026-04-22T00:03:00.000Z",
			status: "partial",
			url: "https://example.com/jobs/beta-solutions",
			warnings: [
				{
					code: "partial-result",
					message:
						"Batch item #2 produced a partial result and still needs tracker closeout.",
				},
				{
					code: "missing-tracker-artifact",
					message:
						"Tracker artifact has not been written for batch item #2 yet.",
				},
			],
		},
		{
			artifacts: {
				pdf: {
					exists: true,
					message:
						"PDF artifact output/cv-gamma-forward-deployed.pdf is available.",
					repoRelativePath: "output/cv-gamma-forward-deployed.pdf",
				},
				report: {
					exists: true,
					message:
						"Report artifact reports/003-gamma-forward-deployed.md is available.",
					repoRelativePath: "reports/003-gamma-forward-deployed.md",
				},
				tracker: {
					exists: true,
					message:
						"Tracker artifact batch/tracker-additions/3-gamma.tsv is available.",
					repoRelativePath: "batch/tracker-additions/3-gamma.tsv",
				},
			},
			company: "Gamma",
			completedAt: "2026-04-22T00:08:00.000Z",
			error: null,
			id: 3,
			legitimacy: "High Confidence",
			notes: "Completed batch item with report and tracker artifacts.",
			rawStateError: null,
			reportNumber: "003",
			resultWarnings: [],
			retries: 0,
			role: "Forward Deployed Engineer",
			score: 4.8,
			source: "scan",
			startedAt: "2026-04-22T00:05:00.000Z",
			status: "completed",
			url: "https://example.com/jobs/gamma-forward-deployed",
			warnings: [],
		},
	];
}

function countStatuses(items) {
	return items.reduce(
		(counts, item) => {
			switch (item.status) {
				case "completed":
					counts.completed += 1;
					break;
				case "failed":
					counts.failed += 1;
					break;
				case "partial":
					counts.partial += 1;
					break;
				case "pending":
					counts.pending += 1;
					break;
				case "processing":
					counts.processing += 1;
					break;
				case "retryable-failed":
					counts.retryableFailed += 1;
					break;
				case "skipped":
					counts.skipped += 1;
					break;
			}

			counts.total += 1;
			return counts;
		},
		{
			completed: 0,
			failed: 0,
			partial: 0,
			pending: 0,
			processing: 0,
			retryableFailed: 0,
			skipped: 0,
			total: 0,
		},
	);
}

function createBatchWorkspacePayload(state, requestUrl = "/batch-supervisor") {
	const url = new URL(requestUrl, "http://127.0.0.1");

	if (state.batchMode === "empty") {
		return {
			actions: [
				{
					action: "resume-run-pending",
					available: false,
					message: "Batch draft is not available yet.",
				},
				{
					action: "retry-failed",
					available: false,
					message: "No retryable failures are available yet.",
				},
				{
					action: "merge-tracker-additions",
					available: false,
					message: "No tracker additions are ready to merge.",
				},
				{
					action: "verify-tracker-pipeline",
					available: false,
					message: "Tracker verification is not ready yet.",
				},
			],
			closeout: {
				mergeBlocked: false,
				message:
					"Batch closeout is not available until the first run completes.",
				pendingTrackerAdditionCount: 0,
				warnings: [],
			},
			draft: {
				available: false,
				counts: {
					completed: 0,
					failed: 0,
					partial: 0,
					pending: 0,
					processing: 0,
					retryableFailed: 0,
					skipped: 0,
					total: 0,
				},
				firstRunnableItemId: null,
				message: "Batch draft has not been created yet.",
				pendingTrackerAdditionCount: 0,
				totalCount: 0,
			},
			filters: {
				itemId: null,
				limit: 12,
				offset: 0,
				status: "all",
			},
			generatedAt: "2026-04-22T00:00:00.000Z",
			items: {
				filteredCount: 0,
				hasMore: false,
				items: [],
				limit: 12,
				offset: 0,
				totalCount: 0,
			},
			message: "Batch draft is not available yet.",
			ok: true,
			run: {
				approvalId: null,
				checkpoint: {
					completedItemCount: 0,
					cursor: null,
					lastProcessedItemId: null,
					updatedAt: null,
				},
				completedAt: null,
				counts: {
					completed: 0,
					failed: 0,
					partial: 0,
					pending: 0,
					processing: 0,
					retryableFailed: 0,
					skipped: 0,
					total: 0,
				},
				dryRun: false,
				jobId: null,
				message: "No batch run has started yet.",
				mode: null,
				runId: null,
				sessionId: null,
				startedAt: null,
				state: "idle",
				updatedAt: null,
				warnings: [],
			},
			selectedDetail: {
				message: "Select a batch row once draft items are available.",
				origin: "none",
				requestedItemId: null,
				row: null,
				state: "empty",
			},
			service: "jobhunt-api-scaffold",
			sessionId: "phase01-session03-agent-runtime-bootstrap",
			status: "ready",
			statusOptions: [
				{
					count: 0,
					id: "all",
					label: "All",
				},
			],
		};
	}

	const items = getBaseItems();
	const requestedItemId = Number.parseInt(
		url.searchParams.get("itemId") ?? "",
		10,
	);
	const selectedItemId = Number.isInteger(requestedItemId)
		? requestedItemId
		: null;
	const statusFilter = url.searchParams.get("status")?.trim() || "all";
	const filteredItems =
		statusFilter === "all"
			? items
			: items.filter((item) => item.status === statusFilter);
	const selectedItem =
		selectedItemId === null
			? null
			: (items.find((item) => item.id === selectedItemId) ?? null);
	const selectedIsStale =
		selectedItem !== null &&
		!filteredItems.some((item) => item.id === selectedItem.id);
	const counts = countStatuses(items);
	const visibleItems = filteredItems.map((item) => ({
		artifacts: item.artifacts,
		company: item.company,
		completedAt: item.completedAt,
		error: item.error,
		id: item.id,
		legitimacy: item.legitimacy,
		reportNumber: item.reportNumber,
		retries: item.retries,
		role: item.role,
		score: item.score,
		selected: selectedItemId === item.id,
		startedAt: item.startedAt,
		status: item.status,
		url: item.url,
		warningCount: item.warnings.length,
		warnings: item.warnings,
	}));
	const runState =
		state.batchMode === "approval-paused"
			? "approval-paused"
			: state.batchMode === "completed"
				? "completed"
				: "running";
	const approvalId =
		state.batchMode === "approval-paused" ? "approval-batch-01" : null;
	const mergeBlocked = state.batchMode === "merge-blocked";
	const selectedWarnings =
		selectedItem === null
			? []
			: selectedIsStale
				? [
						...selectedItem.warnings,
						{
							code: "stale-selection",
							message:
								"The selected batch item is outside the current filtered page.",
						},
					]
				: selectedItem.warnings;

	return {
		actions: [
			{
				action: "resume-run-pending",
				available: true,
				message: "Resume a batch run for pending rows.",
			},
			{
				action: "retry-failed",
				available: counts.retryableFailed > 0,
				message: "Retry batch items that failed with retryable errors.",
			},
			{
				action: "merge-tracker-additions",
				available: !mergeBlocked,
				message: mergeBlocked
					? "Tracker merge is blocked until pending additions are reviewed."
					: "Merge pending tracker additions into the canonical tracker.",
			},
			{
				action: "verify-tracker-pipeline",
				available: true,
				message: "Run tracker verification against the current closeout state.",
			},
		],
		closeout: {
			mergeBlocked,
			message: mergeBlocked
				? "Tracker merge is blocked until pending additions are reviewed."
				: "Tracker closeout is ready for review.",
			pendingTrackerAdditionCount: 1,
			warnings: mergeBlocked
				? [
						{
							code: "merge-blocked",
							message:
								"Tracker merge is blocked until pending additions are reviewed.",
						},
					]
				: [],
		},
		draft: {
			available: true,
			counts,
			firstRunnableItemId: 1,
			message: "Batch draft is ready for supervision.",
			pendingTrackerAdditionCount: 1,
			totalCount: items.length,
		},
		filters: {
			itemId: selectedItemId,
			limit: 12,
			offset: 0,
			status: statusFilter,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		items: {
			filteredCount: filteredItems.length,
			hasMore: false,
			items: visibleItems,
			limit: 12,
			offset: 0,
			totalCount: items.length,
		},
		message: `Showing ${filteredItems.length} of ${items.length} batch rows.`,
		ok: true,
		run: {
			approvalId,
			checkpoint: {
				completedItemCount: 2,
				cursor: 2,
				lastProcessedItemId: 2,
				updatedAt: "2026-04-22T00:06:00.000Z",
			},
			completedAt: runState === "completed" ? "2026-04-22T00:09:00.000Z" : null,
			counts,
			dryRun: false,
			jobId: "job-batch-live",
			message:
				runState === "approval-paused"
					? "Batch run is waiting on approval before it can continue."
					: runState === "completed"
						? "Batch run completed and closeout is ready."
						: "Batch run is active and still supervising draft items.",
			mode: "retry-failed",
			runId: "run-batch-live",
			sessionId: "session-batch-01",
			startedAt: "2026-04-22T00:00:00.000Z",
			state: runState,
			updatedAt: "2026-04-22T00:08:00.000Z",
			warnings:
				runState === "approval-paused"
					? [
							{
								code: "approval-paused",
								message:
									"Batch run paused because approval is required to continue.",
							},
						]
					: [],
		},
		selectedDetail:
			selectedItem === null
				? {
						message:
							"Select a batch row to inspect warnings, artifacts, and next actions.",
						origin: "none",
						requestedItemId: null,
						row: null,
						state: "empty",
					}
				: {
						message: `Showing batch item #${selectedItem.id}.`,
						origin: "item-id",
						requestedItemId: selectedItem.id,
						row: {
							artifacts: selectedItem.artifacts,
							company: selectedItem.company,
							completedAt: selectedItem.completedAt,
							error: selectedItem.error,
							id: selectedItem.id,
							legitimacy: selectedItem.legitimacy,
							notes: selectedItem.notes,
							rawStateError: selectedItem.rawStateError,
							reportNumber: selectedItem.reportNumber,
							resultWarnings: selectedItem.resultWarnings,
							retries: selectedItem.retries,
							role: selectedItem.role,
							score: selectedItem.score,
							selected: true,
							source: selectedItem.source,
							startedAt: selectedItem.startedAt,
							status: selectedItem.status,
							url: selectedItem.url,
							warningCount: selectedWarnings.length,
							warnings: selectedWarnings,
						},
						state: "ready",
					},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		statusOptions: [
			{
				count: items.length,
				id: "all",
				label: "All",
			},
			{
				count: counts.retryableFailed,
				id: "retryable-failed",
				label: "Retryable failed",
			},
			{
				count: counts.partial,
				id: "partial",
				label: "Partial",
			},
			{
				count: counts.completed,
				id: "completed",
				label: "Completed",
			},
		],
	};
}

function createBatchErrorPayload(message) {
	return {
		error: {
			code: "batch-workspace-failed",
			message,
		},
		ok: false,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "error",
	};
}

function createBatchActionPayload(input) {
	return {
		actionResult: {
			action: input.action,
			itemId: input.itemId ?? null,
			jobId: input.jobId ?? null,
			message: input.message,
			revalidation: {
				itemId: input.itemId ?? null,
				nextPollMs: input.nextPollMs ?? null,
				status: input.status ?? null,
			},
			requestStatus: input.requestStatus,
			runId: input.runId ?? null,
			warnings: input.warnings ?? [],
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: input.message,
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
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
		batchMode: "ready",
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

		if (requestUrl.pathname === "/batch-supervisor") {
			if (state.batchMode === "slow") {
				await delay(900);
			}

			if (state.batchMode === "error") {
				response.writeHead(500, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createBatchErrorPayload(
							"Batch workspace failed before a summary could load.",
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
					createBatchWorkspacePayload(
						state,
						request.url ?? "/batch-supervisor",
					),
					null,
					2,
				),
			);
			return;
		}

		if (requestUrl.pathname === "/batch-supervisor/action") {
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

			if (body.action === "retry-failed") {
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createBatchActionPayload({
							action: "retry-failed",
							itemId: body.itemId ?? null,
							jobId: "job-batch-live",
							message: "Batch retry accepted for retryable failures.",
							nextPollMs: 50,
							requestStatus: "accepted",
							runId: "run-batch-live",
						}),
						null,
						2,
					),
				);
				return;
			}

			if (body.action === "verify-tracker-pipeline") {
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createBatchActionPayload({
							action: "verify-tracker-pipeline",
							itemId: body.itemId ?? null,
							jobId: null,
							message:
								"Tracker verification completed. Completed with 1 warning.",
							requestStatus: "completed",
							runId: "run-batch-live",
							warnings: [
								{
									code: "tracker-verify-warning",
									message: "pending TSVs remain",
								},
							],
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
					createBatchActionPayload({
						action: body.action ?? "resume-run-pending",
						itemId: body.itemId ?? null,
						jobId: "job-batch-live",
						message: "Batch action completed.",
						requestStatus: "completed",
						runId: "run-batch-live",
					}),
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
					sessionId: "phase01-session03-agent-runtime-bootstrap",
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
		throw new Error("Failed to start the fake batch-workspace API.");
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
			state.batchMode = "ready";
		},
		setBatchMode(mode) {
			state.batchMode = mode;
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
		await page.goto(`${webUrl}#batch`, { waitUntil: "networkidle" });

		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.getByRole("button", { name: /Select batch item 1/ }).click();
		await page.getByText("Showing batch item #1.").waitFor();
		await page
			.getByText("Retryable failure from the last batch run.")
			.waitFor();

		await page.getByRole("button", { name: /^Retry failed$/ }).click();
		await page.getByText("Batch action feedback").waitFor();
		await page
			.getByText("Batch retry accepted for retryable failures.")
			.waitFor();

		await page.getByRole("button", { name: /^Verify tracker$/ }).click();
		await page
			.getByText("Tracker verification completed. Completed with 1 warning.")
			.waitFor();

		fakeApi.setBatchMode("approval-paused");
		const pausedPage = await browser.newPage();
		await pausedPage.goto(`${webUrl}?batchItemId=2#batch`, {
			waitUntil: "networkidle",
		});
		await pausedPage
			.getByRole("heading", { name: "Batch jobs workspace" })
			.waitFor();
		await pausedPage.getByText("Approval paused").first().waitFor();
		await pausedPage.getByText("Approval ID: approval-batch-01").waitFor();
		await pausedPage.close();

		fakeApi.setBatchMode("merge-blocked");
		const blockedPage = await browser.newPage();
		await blockedPage.goto(`${webUrl}#batch`, { waitUntil: "networkidle" });
		await blockedPage
			.getByText(
				"Tracker merge is blocked until pending additions are reviewed.",
			)
			.first()
			.waitFor();
		await blockedPage.getByText("Merge blocked: Yes").waitFor();
		await blockedPage.close();

		fakeApi.setBatchMode("completed");
		const completedPage = await browser.newPage();
		await completedPage.goto(`${webUrl}#batch`, { waitUntil: "networkidle" });
		await completedPage
			.getByText("Batch run completed and closeout is ready.")
			.first()
			.waitFor();
		await completedPage.close();

		fakeApi.setBatchMode("slow");
		const loadingPage = await browser.newPage();
		await loadingPage.goto(`${webUrl}#batch`);
		await loadingPage.getByText("Loading batch workspace").waitFor();
		await loadingPage.close();

		fakeApi.setBatchMode("empty");
		const emptyPage = await browser.newPage();
		await emptyPage.goto(`${webUrl}#batch`, { waitUntil: "networkidle" });
		await emptyPage
			.getByText("Batch draft is not available yet.")
			.first()
			.waitFor();
		await emptyPage.close();

		fakeApi.setBatchMode("error");
		const errorPage = await browser.newPage();
		await errorPage.goto(`${webUrl}#batch`, { waitUntil: "networkidle" });
		await errorPage.getByText("Batch workspace warning").waitFor();
		await errorPage
			.getByText("Batch workspace failed before a summary could load.")
			.waitFor();
		await errorPage.close();

		fakeApi.reset();
		await page.getByRole("link", { name: /Batch/ }).first().click();
		await page.getByRole("heading", { name: "Batch jobs workspace" }).waitFor();
		await page.route("**/batch-supervisor*", async (route) => {
			await route.abort("failed");
		});
		await page.getByLabel("Refresh batch workspace").click();
		await page.getByText("Showing the last batch snapshot").waitFor();
		await page
			.getByText(
				"Batch-workspace summary endpoint is unavailable. Start the local API server and try again.",
				{ exact: true },
			)
			.waitFor();
	} finally {
		await browser.close();
	}
} finally {
	await stopChild(webChild);
	await fakeApi.close();
}

console.log("Batch workspace smoke checks passed.");

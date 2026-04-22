#!/usr/bin/env node

import assert from "node:assert/strict";
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
			defaultPort: 4174,
			healthPath: "/health",
			startupPath: "/startup",
		},
		diagnostics: {
			onboardingMissing: [],
			optionalMissing: [],
			promptContract: {
				cacheMode: "fresh",
				sourceOrder: ["agents-guide", "mode-file"],
				sources: [
					{
						key: "agents-guide",
						label: "AGENTS guide",
						notes: [],
						optional: false,
						precedence: 1,
						role: "system",
					},
				],
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
			activeSession: null,
			activeSessionCount: 0,
			latestPendingApprovals: [],
			pendingApprovalCount: 0,
			recentFailureCount: 0,
			recentFailures: [],
			state: "idle",
		},
		currentSession: {
			id: "phase03-session05-settings-and-maintenance-surface",
			monorepo: true,
			packagePath: "apps/web",
			phase: 3,
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

function createSettingsHealth(settingsStatus) {
	const ready = settingsStatus === "ready";
	const authRequired = settingsStatus === "auth-required";

	return {
		agentRuntime: {
			authPath: `${ROOT}/data/openai-account-auth.json`,
			message: ready
				? "Agent runtime ready."
				: "Authentication is still required.",
			promptState: ready ? "ready" : null,
			status: ready ? "ready" : "auth-required",
		},
		message: ready
			? "Bootstrap diagnostics are ready."
			: "Authentication is still required.",
		missing: {
			onboarding: 0,
			optional: 0,
			runtime: 0,
		},
		ok: !authRequired,
		operationalStore: {
			message: "Operational store ready.",
			status: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		startupStatus: settingsStatus,
		status: ready ? "ok" : "degraded",
	};
}

function createAuthSummary(settingsStatus) {
	const ready = settingsStatus === "ready";

	return {
		auth: {
			accountId: ready ? "acct-settings-ready" : null,
			authPath: `${ROOT}/data/openai-account-auth.json`,
			expiresAt: ready ? 1_778_777_777_000 : null,
			message: ready
				? "OpenAI account auth is ready."
				: "Run `npm run auth:openai -- login` to authenticate.",
			nextSteps: ready
				? ["Run `npm run doctor` after any auth or updater change."]
				: [
						"Run `npm run auth:openai -- login` to authenticate.",
						"Return to Startup after auth succeeds.",
					],
			state: ready ? "ready" : "auth-required",
			updatedAt: ready ? "2026-04-22T00:00:00.000Z" : null,
		},
		config: {
			authPath: `${ROOT}/data/openai-account-auth.json`,
			baseUrl: "https://chatgpt.com/backend-api",
			model: "gpt-5.4-mini",
			originator: "jobhunt-web-settings-smoke",
			overrides: {
				authPath: false,
				baseUrl: false,
				model: false,
				originator: true,
			},
		},
		message: ready
			? "Agent runtime ready."
			: "Authentication is still required.",
		status: ready ? "ready" : "auth-required",
	};
}

function createUpdateCheck(updateState) {
	switch (updateState) {
		case "update-available":
			return {
				changelogExcerpt: "New settings surface shipped.",
				checkedAt: "2026-04-22T00:00:00.000Z",
				command: "node scripts/update-system.mjs check",
				localVersion: "1.5.38",
				message: "Job-Hunt update available (1.5.38 -> 1.6.0).",
				remoteVersion: "1.6.0",
				state: "update-available",
			};
		case "up-to-date":
			return {
				changelogExcerpt: null,
				checkedAt: "2026-04-22T00:00:00.000Z",
				command: "node scripts/update-system.mjs check",
				localVersion: "1.5.38",
				message: "Job-Hunt is up to date (1.5.38).",
				remoteVersion: "1.5.38",
				state: "up-to-date",
			};
		case "dismissed":
			return {
				changelogExcerpt: null,
				checkedAt: "2026-04-22T00:00:00.000Z",
				command: "node scripts/update-system.mjs check",
				localVersion: null,
				message: "Update checks are currently dismissed.",
				remoteVersion: null,
				state: "dismissed",
			};
		case "offline":
			return {
				changelogExcerpt: null,
				checkedAt: "2026-04-22T00:00:00.000Z",
				command: "node scripts/update-system.mjs check",
				localVersion: "1.5.38",
				message: "Update check could not reach the upstream release source.",
				remoteVersion: null,
				state: "offline",
			};
		default:
			throw new Error(`Unsupported update state ${updateState}.`);
	}
}

function createSettingsSummary(input) {
	const health = createSettingsHealth(input.settingsStatus);

	return {
		auth: createAuthSummary(input.settingsStatus),
		currentSession: {
			id: "phase03-session05-settings-and-maintenance-surface",
			monorepo: true,
			packagePath: "apps/web",
			phase: 3,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		health,
		maintenance: {
			commands: [
				{
					category: "diagnostics",
					command: "npm run doctor",
					description: "Validate repo prerequisites.",
					id: "doctor",
					label: "Run doctor",
				},
				{
					category: "auth",
					command: "npm run auth:openai -- login",
					description: "Create the first stored OpenAI account auth state.",
					id: "auth-login",
					label: "Auth login",
				},
				{
					category: "updates",
					command: "node scripts/update-system.mjs check",
					description: "Check for upstream updates.",
					id: "update-check",
					label: "Check updates",
				},
				{
					category: "updates",
					command: "node scripts/update-system.mjs apply",
					description: "Apply the latest repo-managed update.",
					id: "update-apply",
					label: "Apply update",
				},
				{
					category: "updates",
					command: "node scripts/update-system.mjs rollback",
					description: "Rollback the latest repo-managed update.",
					id: "update-rollback",
					label: "Rollback update",
				},
			],
			updateCheck: createUpdateCheck(input.updateState),
		},
		message:
			input.settingsStatus === "ready"
				? "Settings summary is ready."
				: "Authentication is still required.",
		ok: true,
		operationalStore: {
			databasePath: `${ROOT}/.jobhunt-app/app.db`,
			message: "Operational store ready.",
			reason: null,
			rootExists: true,
			rootPath: `${ROOT}/.jobhunt-app`,
			status: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: input.settingsStatus,
		support: {
			prompt: {
				cacheMode: "read-through-mtime",
				sourceOrder: ["agents-guide", "shared-mode", "profile-mode"],
				sources: [
					{
						key: "agents-guide",
						label: "AGENTS guide",
						optional: false,
						precedence: 1,
						role: "system",
					},
					{
						key: "shared-mode",
						label: "Shared mode",
						optional: false,
						precedence: 2,
						role: "system",
					},
				],
				supportedWorkflowCount: 2,
			},
			tools: {
				hasMore: true,
				previewLimit: 2,
				tools: [
					{
						description: "Summarize prompt-routed workflow support.",
						jobTypes: [],
						mutationTargets: [],
						name: "summarize-workflow-support",
						requiresApproval: false,
						scripts: [],
					},
					{
						description: "Inspect required workspace files.",
						jobTypes: [],
						mutationTargets: [],
						name: "inspect-required-workspace-files",
						requiresApproval: false,
						scripts: [],
					},
				],
				totalCount: 5,
			},
			workflows: {
				hasMore: true,
				previewLimit: 2,
				totalCount: 3,
				workflows: [
					{
						description: "Single evaluation route",
						intent: "single-evaluation",
						message:
							"Single evaluation can launch with the evaluation specialist.",
						missingCapabilities: [],
						modeExists: true,
						modeRepoRelativePath: "modes/oferta.md",
						specialist: {
							description: "Owns evaluation follow-through.",
							id: "evaluation-specialist",
							label: "Evaluation Specialist",
						},
						status: "ready",
						toolPreview: ["bootstrap-single-evaluation", "generate-ats-pdf"],
					},
					{
						description: "Tracker status route",
						intent: "tracker-status",
						message:
							"Tracker status remains blocked until typed tracker summary exists.",
						missingCapabilities: ["typed-tracker-summary"],
						modeExists: true,
						modeRepoRelativePath: "modes/tracker.md",
						specialist: {
							description: "Owns tracker workflows.",
							id: "tracker-specialist",
							label: "Tracker Specialist",
						},
						status: "tooling-gap",
						toolPreview: ["summarize-workflow-support"],
					},
				],
			},
		},
		workspace: {
			agentsGuidePath: `${ROOT}/AGENTS.md`,
			apiPackagePath: `${ROOT}/apps/api`,
			appStateRootPath: `${ROOT}/.jobhunt-app`,
			currentSession: {
				id: "phase03-session05-settings-and-maintenance-surface",
				monorepo: true,
				packageAbsolutePath: `${ROOT}/apps/web`,
				packagePath: "apps/web",
				phase: 3,
				source: "state-file",
				specDirectoryPath: `${ROOT}/.spec_system/specs/phase03-session05-settings-and-maintenance-surface`,
				stateFilePath: `${ROOT}/.spec_system/state.json`,
			},
			dataContractPath: `${ROOT}/docs/DATA_CONTRACT.md`,
			protectedOwners: ["system", "user"],
			repoRoot: ROOT,
			specSystemPath: `${ROOT}/.spec_system`,
			webPackagePath: `${ROOT}/apps/web`,
			writableRoots: ["config", "data", "output", "profile", "reports"],
		},
	};
}

function createSettingsErrorPayload() {
	return {
		error: {
			code: "settings-summary-failed",
			message: "Settings summary failed upstream.",
		},
		ok: false,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "error",
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
		delayMs: 350,
		failMode: "none",
		settingsStatus: "ready",
		updateState: "update-available",
	};
	const readyStartupPayload = createReadyStartupPayload();
	const readyShellSummary = createReadyShellSummary();

	const server = createHttpServer((request, response) => {
		const writeJson = (statusCode, payload) => {
			response.writeHead(statusCode, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(payload, null, 2));
		};

		if (request.url === "/startup") {
			writeJson(200, readyStartupPayload);
			return;
		}

		if (request.url === "/operator-shell") {
			writeJson(200, readyShellSummary);
			return;
		}

		if ((request.url ?? "").startsWith("/settings")) {
			if (state.failMode === "server-error") {
				writeJson(503, createSettingsErrorPayload());
				return;
			}

			setTimeout(() => {
				writeJson(
					200,
					createSettingsSummary({
						settingsStatus: state.settingsStatus,
						updateState: state.updateState,
					}),
				);
			}, state.delayMs);
			return;
		}

		writeJson(404, {
			error: {
				code: "route-not-found",
				message: `Unknown route ${request.url ?? "/"}.`,
			},
			ok: false,
			service: "jobhunt-api-scaffold",
			sessionId: "phase01-session03-agent-runtime-bootstrap",
			status: "not-found",
		});
	});

	await new Promise((resolvePromise) => {
		server.listen(0, "127.0.0.1", resolvePromise);
	});

	const address = server.address();

	if (typeof address !== "object" || address === null) {
		throw new Error("Failed to start the fake app-settings API.");
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
		setDelayMs(delayMs) {
			state.delayMs = delayMs;
		},
		setFailMode(failMode) {
			state.failMode = failMode;
		},
		setSettingsStatus(settingsStatus) {
			state.settingsStatus = settingsStatus;
		},
		setUpdateState(updateState) {
			state.updateState = updateState;
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
		await page.goto(`${webUrl}#settings`, { waitUntil: "domcontentloaded" });

		await page
			.getByText(
				"Reading startup, operational-store, and closeout readiness from the API.",
			)
			.waitFor();
		fakeApi.setDelayMs(0);
		await page
			.getByRole("heading", { name: "Settings and maintenance surface" })
			.waitFor();
		await page.getByText("Update available", { exact: true }).waitFor();
		await page.getByText("Run doctor", { exact: true }).waitFor();
		await page.getByText("Check updates", { exact: true }).waitFor();
		await page
			.getByText("The app-owned home surface is the primary runtime.")
			.waitFor();
		await page
			.getByText(
				"Phase 03 is ready for the operator home and app shell to stay primary",
			)
			.waitFor();

		fakeApi.setUpdateState("up-to-date");
		await page
			.getByRole("button", { name: /Refresh settings summary/ })
			.click();
		await page.getByText("Updater is current", { exact: true }).waitFor();
		assert.equal(
			await page.evaluate(() => document.activeElement?.id ?? ""),
			"settings-maintenance-title",
		);

		fakeApi.setUpdateState("dismissed");
		await page
			.getByRole("button", { name: /Refresh settings summary/ })
			.click();
		await page.getByText("Update checks dismissed", { exact: true }).waitFor();

		fakeApi.setSettingsStatus("auth-required");
		fakeApi.setUpdateState("offline");
		await page
			.getByRole("button", { name: /Refresh settings summary/ })
			.click();
		await page.getByText("First-run login required", { exact: true }).waitFor();
		await page.getByText("Update source offline", { exact: true }).waitFor();
		await page
			.getByText("Run `npm run auth:openai -- login` to authenticate.", {
				exact: true,
			})
			.first()
			.waitFor();
		await page
			.getByText(
				"Phase 03 still depends on runtime or onboarding follow-up before the operator home can stay primary.",
			)
			.waitFor();

		fakeApi.setFailMode("server-error");
		await page
			.getByRole("button", { name: /Refresh settings summary/ })
			.click();
		await page.getByText("Settings summary error", { exact: true }).waitFor();

		fakeApi.setFailMode("none");
		fakeApi.setSettingsStatus("ready");
		fakeApi.setUpdateState("up-to-date");
		await page
			.getByRole("button", { name: /Refresh settings summary/ })
			.click();
		await page.getByText("Updater is current", { exact: true }).waitFor();

		await page.route("**/api/settings**", async (route) => {
			await route.abort("failed");
		});
		await page
			.getByRole("button", { name: /Refresh settings summary/ })
			.click();
		await page
			.getByText("Offline after the last good settings summary")
			.waitFor();
	} finally {
		await browser.close();
	}
} finally {
	await stopChild(webChild);
	await fakeApi.close();
}

console.log("App settings smoke checks passed.");

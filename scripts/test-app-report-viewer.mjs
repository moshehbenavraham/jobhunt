#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");

const REPORT_ITEMS = [
	{
		artifactDate: "2026-04-23",
		fileName: "022-http-latest-2026-04-23.md",
		kind: "report",
		repoRelativePath: "reports/022-http-latest-2026-04-23.md",
		reportNumber: "022",
	},
	{
		artifactDate: "2026-04-22",
		fileName: "021-http-selected-2026-04-22.md",
		kind: "report",
		repoRelativePath: "reports/021-http-selected-2026-04-22.md",
		reportNumber: "021",
	},
];

const PDF_ITEMS = [
	{
		artifactDate: "2026-04-23",
		fileName: "cv-http-latest-2026-04-23.pdf",
		kind: "pdf",
		repoRelativePath: "output/cv-http-latest-2026-04-23.pdf",
		reportNumber: null,
	},
	{
		artifactDate: "2026-04-22",
		fileName: "cv-http-selected-2026-04-22.pdf",
		kind: "pdf",
		repoRelativePath: "output/cv-http-selected-2026-04-22.pdf",
		reportNumber: null,
	},
];

const REPORT_DETAILS = new Map([
	[
		"reports/021-http-selected-2026-04-22.md",
		{
			body: [
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
			header: {
				archetype: "Platform Engineering",
				date: "2026-04-22",
				legitimacy: "High Confidence",
				pdf: {
					exists: true,
					repoRelativePath: "output/cv-http-selected-2026-04-22.pdf",
				},
				score: 4.2,
				title: "Evaluation: HTTP Co -- Selected Role",
				url: "https://example.com/jobs/selected-role",
				verification: "active via browser review",
			},
			reportNumber: "021",
		},
	],
	[
		"reports/022-http-latest-2026-04-23.md",
		{
			body: [
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
			header: {
				archetype: "Applied AI",
				date: "2026-04-23",
				legitimacy: "Proceed with Caution",
				pdf: {
					exists: true,
					repoRelativePath: "output/cv-http-latest-2026-04-23.pdf",
				},
				score: 4.8,
				title: "Evaluation: HTTP Co -- Latest Role",
				url: "https://example.com/jobs/latest-role",
				verification: "active via browser review",
			},
			reportNumber: "022",
		},
	],
]);

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
				cacheMode: "read-through-mtime",
				sourceOrder: ["agents-guide", "workflow-mode"],
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
			activeSession: null,
			activeSessionCount: 0,
			latestPendingApprovals: [],
			pendingApprovalCount: 0,
			recentFailureCount: 0,
			recentFailures: [],
			state: "idle",
		},
		currentSession: {
			id: "phase04-session03-report-viewer-and-artifact-browser",
			monorepo: true,
			packagePath: "apps/web",
			phase: 4,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T00:10:00.000Z",
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

function createWorkflowOptions() {
	return [
		{
			description: "Single evaluation route",
			intent: "single-evaluation",
			label: "Single Evaluation",
			message:
				"Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.",
			missingCapabilities: [],
			modeRepoRelativePath: "modes/oferta.md",
			specialist: {
				description:
					"Owns job-description intake and evaluation follow-through.",
				id: "evaluation-specialist",
				label: "Evaluation Specialist",
			},
			status: "ready",
		},
	];
}

function createSessionSummary() {
	return {
		activeJobId: "job-completed",
		job: {
			attempt: 1,
			completedAt: "2026-04-22T00:12:00.000Z",
			currentRunId: "job-completed-run",
			jobId: "job-completed",
			jobType: "evaluate-job",
			startedAt: "2026-04-22T00:05:00.000Z",
			status: "completed",
			updatedAt: "2026-04-22T00:12:00.000Z",
			waitReason: null,
		},
		latestFailure: null,
		lastHeartbeatAt: "2026-04-22T00:12:00.000Z",
		pendingApproval: null,
		pendingApprovalCount: 0,
		resumeAllowed: true,
		sessionId: "session-completed",
		state: "ready",
		status: "completed",
		updatedAt: "2026-04-22T00:12:00.000Z",
		workflow: "single-evaluation",
	};
}

function createSessionDetail() {
	const session = createSessionSummary();

	return {
		approvals: [],
		failure: null,
		jobs: [session.job],
		route: {
			message:
				"Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.",
			missingCapabilities: [],
			specialistId: "evaluation-specialist",
			status: "ready",
		},
		session,
		timeline: [
			{
				approvalId: null,
				eventId: "event-completed",
				eventType: "job-execution-finished",
				jobId: "job-completed",
				level: "info",
				occurredAt: "2026-04-22T00:12:00.000Z",
				requestId: "request-completed",
				sessionId: "session-completed",
				summary: "Evaluation completed and artifacts are ready.",
				traceId: "trace-completed",
			},
		],
	};
}

function createChatConsoleSummaryPayload() {
	const selectedSession = createSessionDetail();

	return {
		generatedAt: "2026-04-22T00:12:30.000Z",
		message: "Chat console summary is ready.",
		ok: true,
		recentSessions: [selectedSession.session],
		selectedSession,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		workflows: createWorkflowOptions(),
	};
}

function createEvaluationResultPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");

	return {
		filters: {
			previewLimit: Number.parseInt(
				url.searchParams.get("previewLimit") ?? "4",
				10,
			),
			sessionId: url.searchParams.get("sessionId"),
			workflow: url.searchParams.get("workflow"),
		},
		generatedAt: "2026-04-22T00:13:00.000Z",
		message: "Artifacts are ready for review.",
		ok: true,
		recentSessions: [
			{
				sessionId: "session-completed",
				state: "completed",
				status: "completed",
				updatedAt: "2026-04-22T00:12:00.000Z",
				workflow: "single-evaluation",
			},
		],
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		summary: {
			artifacts: {
				pdf: {
					exists: true,
					kind: "pdf",
					message: "PDF artifact is ready.",
					repoRelativePath: "output/cv-http-selected-2026-04-22.pdf",
					state: "ready",
				},
				report: {
					exists: true,
					kind: "report",
					message: "Report artifact is ready.",
					repoRelativePath: "reports/021-http-selected-2026-04-22.md",
					state: "ready",
				},
				tracker: {
					exists: true,
					kind: "tracker",
					message: "Tracker artifact is ready.",
					repoRelativePath: "batch/tracker-additions/21-http-selected.tsv",
					state: "ready",
				},
			},
			checkpoint: {
				completedStepCount: 4,
				completedSteps: [
					"validated-input",
					"captured-job-description",
					"scored-fit",
					"wrote-report",
				],
				cursor: "wrote-report",
				hasMore: false,
				updatedAt: "2026-04-22T00:12:00.000Z",
			},
			closeout: {
				message: "Artifacts are ready for review.",
				readyForReview: true,
				state: "review-ready",
			},
			failure: null,
			handoff: {
				approval: null,
				approvalStatus: "none",
				message: "No approval handoff is attached to this result.",
				resumeAllowed: false,
				state: "none",
			},
			inputProvenance: {
				canonicalUrl: null,
				host: null,
				kind: "raw-jd",
				message:
					"Launched from raw job-description text. Prompt text is redacted from stored session context.",
			},
			job: {
				attempt: 1,
				completedAt: "2026-04-22T00:12:00.000Z",
				currentRunId: "job-completed-run",
				jobId: "job-completed",
				jobType: "evaluate-job",
				startedAt: "2026-04-22T00:05:00.000Z",
				status: "completed",
				updatedAt: "2026-04-22T00:12:00.000Z",
				waitReason: null,
			},
			legitimacy: "High Confidence",
			message: "Artifacts are ready for review.",
			reportNumber: "021",
			reviewFocus: {
				pipelineReview: {
					availability: "ready",
					message: "Pipeline review can focus processed row #021.",
					reportNumber: "021",
					section: "processed",
					url: null,
				},
				primaryTarget: "report-viewer",
				reportViewer: {
					availability: "ready",
					message: "Report artifact is ready for in-app review.",
					reportNumber: "021",
					reportPath: "reports/021-http-selected-2026-04-22.md",
				},
				trackerWorkspace: {
					availability: "ready",
					message:
						"Tracker review can focus report #021 across merged rows and pending TSV additions.",
					reportNumber: "021",
				},
			},
			score: 4.2,
			session: {
				activeJobId: null,
				lastHeartbeatAt: "2026-04-22T00:12:00.000Z",
				sessionId: "session-completed",
				status: "completed",
				updatedAt: "2026-04-22T00:12:00.000Z",
				workflow: "single-evaluation",
			},
			state: "completed",
			verification: {
				message:
					"Verification is not applicable for raw job-description launches.",
				result: "none",
				source: "none",
				status: "not-applicable",
				url: null,
			},
			workflow: "single-evaluation",
			warnings: {
				hasMore: false,
				items: [],
				totalCount: 0,
			},
		},
	};
}

function createReportViewerPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const group = url.searchParams.get("group") ?? "all";
	const limit = Number.parseInt(url.searchParams.get("limit") ?? "8", 10);
	const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
	const requestedReportPath = url.searchParams.get("reportPath");
	const recentArtifacts =
		group === "reports"
			? [...REPORT_ITEMS]
			: group === "output"
				? [...PDF_ITEMS]
				: [...REPORT_ITEMS, ...PDF_ITEMS];
	const selectedReportPath =
		requestedReportPath ?? "reports/022-http-latest-2026-04-23.md";
	const selectedDetail = REPORT_DETAILS.get(selectedReportPath) ?? null;
	const pagedArtifacts = recentArtifacts.slice(offset, offset + limit);

	if (requestedReportPath === "reports/099-http-missing-2026-04-22.md") {
		return {
			filters: {
				group,
				limit,
				offset,
				reportPath: requestedReportPath,
			},
			generatedAt: "2026-04-22T00:14:00.000Z",
			message: `Selected report ${requestedReportPath} is no longer available.`,
			ok: true,
			recentArtifacts: {
				group,
				hasMore: offset + pagedArtifacts.length < recentArtifacts.length,
				items: pagedArtifacts.map((artifact) => ({
					...artifact,
					selected: false,
				})),
				limit,
				offset,
				totalCount: recentArtifacts.length,
			},
			selectedReport: {
				body: null,
				header: null,
				message: `Selected report ${requestedReportPath} is no longer available.`,
				origin: "selected",
				repoRelativePath: requestedReportPath,
				reportNumber: "099",
				requestedRepoRelativePath: requestedReportPath,
				state: "missing",
			},
			service: "jobhunt-api-scaffold",
			sessionId: "phase01-session03-agent-runtime-bootstrap",
			status: "ready",
		};
	}

	return {
		filters: {
			group,
			limit,
			offset,
			reportPath: requestedReportPath,
		},
		generatedAt: "2026-04-22T00:14:00.000Z",
		message: requestedReportPath
			? `Showing selected report ${requestedReportPath}.`
			: "Showing latest report reports/022-http-latest-2026-04-23.md.",
		ok: true,
		recentArtifacts: {
			group,
			hasMore: offset + pagedArtifacts.length < recentArtifacts.length,
			items: pagedArtifacts.map((artifact) => ({
				...artifact,
				selected:
					artifact.kind === "report" &&
					artifact.repoRelativePath === selectedReportPath,
			})),
			limit,
			offset,
			totalCount: recentArtifacts.length,
		},
		selectedReport: {
			body: selectedDetail.body,
			header: selectedDetail.header,
			message: requestedReportPath
				? `Showing selected report ${selectedReportPath}.`
				: `Showing latest report ${selectedReportPath}.`,
			origin: requestedReportPath ? "selected" : "latest",
			repoRelativePath: selectedReportPath,
			reportNumber: selectedDetail.reportNumber,
			requestedRepoRelativePath: requestedReportPath,
			state: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
	};
}

function createRateLimitedErrorPayload(message) {
	return {
		error: {
			code: "rate-limit-exceeded",
			message,
		},
		ok: false,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "rate-limited",
	};
}

function writeJson(response, statusCode, payload, headers = {}) {
	response.writeHead(statusCode, {
		"content-type": "application/json; charset=utf-8",
		...headers,
	});
	response.end(JSON.stringify(payload, null, 2));
}

function createFakeApi() {
	const state = {
		reportViewerMode: "ready",
	};

	const server = createHttpServer((request, response) => {
		const url = new URL(request.url ?? "/", "http://127.0.0.1");

		switch (url.pathname) {
			case "/startup":
				writeJson(response, 200, createReadyStartupPayload());
				return;
			case "/operator-shell":
				writeJson(response, 200, createReadyShellSummary());
				return;
			case "/chat-console":
				writeJson(response, 200, createChatConsoleSummaryPayload());
				return;
			case "/evaluation-result":
				writeJson(response, 200, createEvaluationResultPayload(url.toString()));
				return;
			case "/report-viewer":
				if (state.reportViewerMode === "offline") {
					writeJson(
						response,
						429,
						createRateLimitedErrorPayload(
							"Report-viewer refresh is temporarily unavailable.",
						),
						{
							"retry-after": "1",
						},
					);
					return;
				}

				writeJson(response, 200, createReportViewerPayload(url.toString()));
				return;
			default:
				writeJson(response, 404, {
					error: {
						code: "not-found",
						message: `Unknown route ${url.pathname}.`,
					},
					ok: false,
					service: "jobhunt-api-scaffold",
					sessionId: "phase01-session03-agent-runtime-bootstrap",
					status: "not-found",
				});
		}
	});

	return {
		close: () =>
			new Promise((resolveClose, rejectClose) => {
				server.close((error) => {
					if (error) {
						rejectClose(error);
						return;
					}

					resolveClose();
				});
			}),
		listen: (port) =>
			new Promise((resolveListen) => {
				server.listen(port, "127.0.0.1", () => {
					resolveListen(`http://127.0.0.1:${port}`);
				});
			}),
		setReportViewerMode(mode) {
			state.reportViewerMode = mode;
		},
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
		} catch {
			// Keep polling until the dev server responds or exits.
		}

		await delay(100);
	}

	throw new Error(
		`Timed out waiting for ${url}. stderr:\n${stderrLog.join("")}`,
	);
}

const fakeApi = createFakeApi();
const apiPort = await getFreePort();
const webPort = await getFreePort();
const apiOrigin = await fakeApi.listen(apiPort);
const webUrl = `http://127.0.0.1:${webPort}`;
const stderrLog = [];
const child = spawn(
	"node",
	[
		resolve(ROOT, "node_modules", "vite", "bin", "vite.js"),
		"--host",
		"127.0.0.1",
		"--port",
		String(webPort),
	],
	{
		cwd: resolve(ROOT, "apps", "web"),
		env: {
			...process.env,
			JOBHUNT_API_ORIGIN: apiOrigin,
		},
		stdio: ["ignore", "pipe", "pipe"],
	},
);

child.stderr.on("data", (chunk) => {
	stderrLog.push(chunk.toString());
});

try {
	await waitForHttpOk(webUrl, child, stderrLog);

	const browser = await chromium.launch({ headless: true });

	try {
		const page = await browser.newPage();

		await page.goto(`${webUrl}/evaluate?session=session-completed`, {
			waitUntil: "networkidle",
		});
		await page.getByRole("link", { name: /Chat/ }).first().waitFor();
		await page.getByRole("link", { name: /Chat/ }).first().click();
		await page.getByText("session-completed").first().waitFor();
		await page
			.locator('section[aria-labelledby="chat-console-recent-title"]')
			.locator("article")
			.filter({ hasText: "session-completed" })
			.getByRole("button", { name: /Select/ })
			.click();
		await page.getByRole("button", { name: "Open report viewer" }).waitFor();
		await page.getByRole("button", { name: "Open report viewer" }).click();
		await page.waitForURL(/\/artifacts/);
		await page.getByRole("heading", { name: "Reports", exact: true }).waitFor();
		await page
			.getByRole("heading", { name: "Evaluation: HTTP Co -- Latest Role" })
			.waitFor();
		await page.getByLabel("Selected report markdown").waitFor();
		await page.getByText("Latest report body.").waitFor();

		await page.getByRole("button", { name: "Show PDFs" }).click();
		await page
			.getByText("output/cv-http-latest-2026-04-23.pdf")
			.first()
			.waitFor();
		await page
			.getByText("PDF review stays read-only in the workspace for now.", {
				exact: false,
			})
			.first()
			.waitFor();

		await page.getByRole("button", { name: "Show Reports" }).click();
		await page
			.getByRole("button", {
				name: "Open report reports/022-http-latest-2026-04-23.md",
			})
			.click();
		await page
			.getByRole("heading", { name: "Evaluation: HTTP Co -- Latest Role" })
			.waitFor();
		assert.match(page.url(), /report=reports%2F022-http-latest-2026-04-23\.md/);

		const staleUrl = new URL(`${webUrl}/artifacts`);
		staleUrl.searchParams.set(
			"report",
			"reports/099-http-missing-2026-04-22.md",
		);
		await page.goto(staleUrl.toString(), {
			waitUntil: "networkidle",
		});
		await page.getByText("Selected report is stale").waitFor();
		await page
			.getByText("reports/099-http-missing-2026-04-22.md")
			.first()
			.waitFor();
		await page
			.getByRole("button", { name: "Follow the latest report" })
			.click();
		await page
			.getByRole("heading", { name: "Evaluation: HTTP Co -- Latest Role" })
			.waitFor();
		assert.equal(page.url().includes("report="), false);

		fakeApi.setReportViewerMode("offline");
		await page.getByRole("button", { name: "Refresh artifact review" }).click();
		await page.getByText("Showing the last artifact snapshot").waitFor();
		await page
			.getByText("Report-viewer refresh is temporarily unavailable.")
			.waitFor();
		await page.getByText("Latest report body.").waitFor();
	} finally {
		await browser.close();
	}
} finally {
	await stopChild(child);
	await fakeApi.close();
}

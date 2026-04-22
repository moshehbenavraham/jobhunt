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

const PIPELINE_ROWS = [
	{
		company: "Acme",
		kind: "pending",
		legitimacy: null,
		pdf: {
			exists: false,
			message: "Pending queue rows do not have checked-in PDF artifacts yet.",
			repoRelativePath: null,
		},
		report: {
			exists: false,
			message:
				"Pending queue rows do not have checked-in report artifacts yet.",
			repoRelativePath: null,
		},
		reportNumber: null,
		role: "Forward Deployed Engineer",
		score: null,
		sourceLine:
			"- [ ] https://example.com/jobs/pending-fde | Acme | Forward Deployed Engineer",
		url: "https://example.com/jobs/pending-fde",
		verification: null,
		warnings: [],
	},
	{
		company: "Beta",
		kind: "processed",
		legitimacy: "Proceed with Caution",
		pdf: {
			exists: true,
			message:
				"Checked-in PDF artifact output/cv-beta-solutions-architect-2026-04-22.pdf is available.",
			repoRelativePath: "output/cv-beta-solutions-architect-2026-04-22.pdf",
		},
		report: {
			exists: true,
			message:
				"Checked-in report reports/021-beta-solutions-architect-2026-04-22.md is available.",
			repoRelativePath: "reports/021-beta-solutions-architect-2026-04-22.md",
		},
		reportNumber: "021",
		role: "Solutions Architect",
		score: 4.2,
		sourceLine:
			"- [x] #021 | https://example.com/jobs/processed-caution | Beta | Solutions Architect | 4.2/5 | PDF Yes",
		url: "https://example.com/jobs/processed-caution",
		verification: "active via browser review",
		warnings: [
			{
				code: "caution-legitimacy",
				message: "Legitimacy is marked Proceed with Caution.",
			},
		],
	},
	{
		company: "Gamma",
		kind: "processed",
		legitimacy: null,
		pdf: {
			exists: false,
			message: "Pipeline row marks the PDF as unavailable.",
			repoRelativePath: null,
		},
		report: {
			exists: false,
			message: "Checked-in report #022 is not available.",
			repoRelativePath: null,
		},
		reportNumber: "022",
		role: "Sales Engineer",
		score: 3.1,
		sourceLine:
			"- [x] #022 | https://example.com/jobs/processed-low-score | Gamma | Sales Engineer | 3.1/5 | PDF No",
		url: "https://example.com/jobs/processed-low-score",
		verification: null,
		warnings: [
			{
				code: "missing-report",
				message: "Checked-in report #022 is not available.",
			},
			{
				code: "missing-pdf",
				message: "Pipeline row marks the PDF as unavailable.",
			},
			{
				code: "low-score",
				message:
					"Processed row score 3.1/5 is below the recommended apply threshold.",
			},
		],
	},
	{
		company: "Delta",
		kind: "processed",
		legitimacy: "Suspicious",
		pdf: {
			exists: false,
			message:
				"Report header points to missing PDF artifact output/cv-delta-ai-deployment-lead-2026-04-22.pdf.",
			repoRelativePath: "output/cv-delta-ai-deployment-lead-2026-04-22.pdf",
		},
		report: {
			exists: true,
			message:
				"Checked-in report reports/023-delta-ai-deployment-lead-2026-04-22.md is available.",
			repoRelativePath: "reports/023-delta-ai-deployment-lead-2026-04-22.md",
		},
		reportNumber: "023",
		role: "AI Deployment Lead",
		score: 2.5,
		sourceLine:
			"- [x] #023 | https://example.com/jobs/processed-suspicious | Delta | AI Deployment Lead | 2.5/5 | PDF Yes",
		url: "https://example.com/jobs/processed-suspicious",
		verification: "unconfirmed",
		warnings: [
			{
				code: "missing-pdf",
				message:
					"Report header points to missing PDF artifact output/cv-delta-ai-deployment-lead-2026-04-22.pdf.",
			},
			{
				code: "low-score",
				message:
					"Processed row score 2.5/5 is below the recommended apply threshold.",
			},
			{
				code: "suspicious-legitimacy",
				message: "Legitimacy is marked Suspicious.",
			},
		],
	},
];

const REPORT_ITEMS = [
	{
		artifactDate: "2026-04-22",
		fileName: "021-beta-solutions-architect-2026-04-22.md",
		kind: "report",
		repoRelativePath: "reports/021-beta-solutions-architect-2026-04-22.md",
		reportNumber: "021",
	},
	{
		artifactDate: "2026-04-22",
		fileName: "023-delta-ai-deployment-lead-2026-04-22.md",
		kind: "report",
		repoRelativePath: "reports/023-delta-ai-deployment-lead-2026-04-22.md",
		reportNumber: "023",
	},
];

const REPORT_DETAILS = new Map([
	[
		"reports/021-beta-solutions-architect-2026-04-22.md",
		{
			body: [
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
				"Report body.",
				"",
			].join("\n"),
			header: {
				archetype: "Solutions Architect",
				date: "2026-04-22",
				legitimacy: "Proceed with Caution",
				pdf: {
					exists: true,
					message:
						"Checked-in PDF artifact output/cv-beta-solutions-architect-2026-04-22.pdf is available.",
					repoRelativePath: "output/cv-beta-solutions-architect-2026-04-22.pdf",
				},
				score: 4.2,
				title: "Evaluation: Beta -- Solutions Architect",
				url: "https://example.com/jobs/processed-caution",
				verification: "active via browser review",
			},
			reportNumber: "021",
		},
	],
	[
		"reports/023-delta-ai-deployment-lead-2026-04-22.md",
		{
			body: [
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
				"Suspicious report body.",
				"",
			].join("\n"),
			header: {
				archetype: "AI Deployment",
				date: "2026-04-22",
				legitimacy: "Suspicious",
				pdf: {
					exists: false,
					message:
						"Report header points to missing PDF artifact output/cv-delta-ai-deployment-lead-2026-04-22.pdf.",
					repoRelativePath: "output/cv-delta-ai-deployment-lead-2026-04-22.pdf",
				},
				score: 2.5,
				title: "Evaluation: Delta -- AI Deployment Lead",
				url: "https://example.com/jobs/processed-suspicious",
				verification: "unconfirmed",
			},
			reportNumber: "023",
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
			defaultPort: 4174,
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
			id: "phase04-session04-pipeline-review-workspace",
			monorepo: true,
			packagePath: "apps/web",
			phase: 4,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T00:20:00.000Z",
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

function createChatConsoleSummaryPayload() {
	return {
		generatedAt: "2026-04-22T00:20:00.000Z",
		message: "Chat console summary is ready.",
		ok: true,
		recentSessions: [],
		selectedSession: null,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		workflows: [
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
		],
	};
}

function createEvaluationResultPayload() {
	return {
		filters: {
			previewLimit: 4,
			sessionId: null,
			workflow: null,
		},
		generatedAt: "2026-04-22T00:20:00.000Z",
		message: "Evaluation result summary is ready.",
		ok: true,
		recentSessions: [],
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		summary: null,
	};
}

function compareRows(left, right, sort) {
	if (sort === "company") {
		return (
			left.company.localeCompare(right.company) ||
			left.role.localeCompare(right.role)
		);
	}

	if (sort === "score") {
		const leftScore = left.score ?? -1;
		const rightScore = right.score ?? -1;
		return (
			rightScore - leftScore ||
			left.company.localeCompare(right.company) ||
			left.role.localeCompare(right.role)
		);
	}

	if (left.kind !== right.kind) {
		return left.kind === "pending" ? -1 : 1;
	}

	return 0;
}

function createPipelineReviewPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const section = url.searchParams.get("section") ?? "all";
	const sort = url.searchParams.get("sort") ?? "queue";
	const limit = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
	const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
	const reportNumber = url.searchParams.get("reportNumber");
	const requestedUrl = url.searchParams.get("url");
	const filteredRows = PIPELINE_ROWS.filter((row) =>
		section === "all" ? true : row.kind === section,
	).sort((left, right) => compareRows(left, right, sort));
	const selectedRow =
		filteredRows.find((row) =>
			reportNumber
				? row.reportNumber === reportNumber
				: row.url === requestedUrl,
		) ?? null;
	const pagedRows = filteredRows.slice(offset, offset + limit);

	return {
		filters: {
			limit,
			offset,
			reportNumber,
			section,
			sort,
			url: requestedUrl,
		},
		generatedAt: "2026-04-22T00:20:00.000Z",
		message: selectedRow?.reportNumber
			? `Showing queue detail for processed row #${selectedRow.reportNumber}.`
			: selectedRow
				? `Showing queue detail for ${selectedRow.url}.`
				: reportNumber || requestedUrl
					? "Focused queue row is no longer present in the current queue view."
					: "Showing 4 queue rows for review.",
		ok: true,
		queue: {
			counts: {
				malformed: 1,
				pending: 1,
				processed: 3,
			},
			hasMore: offset + pagedRows.length < filteredRows.length,
			items: pagedRows.map((row) => ({
				company: row.company,
				kind: row.kind,
				legitimacy: row.legitimacy,
				pdf: row.pdf,
				report: row.report,
				reportNumber: row.reportNumber,
				role: row.role,
				score: row.score,
				selected:
					selectedRow !== null &&
					row.kind === selectedRow.kind &&
					row.reportNumber === selectedRow.reportNumber &&
					row.url === selectedRow.url,
				url: row.url,
				verification: row.verification,
				warningCount: row.warnings.length,
				warnings: row.warnings,
			})),
			limit,
			offset,
			section,
			sort,
			totalCount: filteredRows.length,
		},
		selectedDetail: selectedRow
			? {
					message: selectedRow.reportNumber
						? `Showing queue detail for processed row #${selectedRow.reportNumber}.`
						: `Showing queue detail for ${selectedRow.url}.`,
					origin: selectedRow.reportNumber ? "report-number" : "url",
					requestedReportNumber: reportNumber,
					requestedUrl,
					row: {
						company: selectedRow.company,
						header: selectedRow.report.repoRelativePath
							? (REPORT_DETAILS.get(selectedRow.report.repoRelativePath)
									?.header ?? null)
							: null,
						kind: selectedRow.kind,
						legitimacy: selectedRow.legitimacy,
						pdf: selectedRow.pdf,
						report: selectedRow.report,
						reportNumber: selectedRow.reportNumber,
						role: selectedRow.role,
						score: selectedRow.score,
						selected: true,
						sourceLine: selectedRow.sourceLine,
						url: selectedRow.url,
						verification: selectedRow.verification,
						warningCount: selectedRow.warnings.length,
						warnings: selectedRow.warnings,
					},
					state: "ready",
				}
			: reportNumber || requestedUrl
				? {
						message:
							"Focused queue row is no longer present in the current queue view.",
						origin: reportNumber ? "report-number" : "url",
						requestedReportNumber: reportNumber,
						requestedUrl,
						row: null,
						state: "missing",
					}
				: {
						message: "Select a queue row to inspect its review detail.",
						origin: "none",
						requestedReportNumber: null,
						requestedUrl: null,
						row: null,
						state: "empty",
					},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		shortlist: {
			available: true,
			bucketCounts: {
				adjacentOrNoisy: 4,
				possibleFit: 1,
				strongestFit: 2,
			},
			campaignGuidance: "Current strongest lane: Forward Deployed.",
			generatedBy: "npm run scan",
			lastRefreshed: "2026-04-22",
			message: "Shortlist guidance is available for queue review.",
			topRoles: [
				{
					bucketLabel: "Strongest fit",
					company: "Acme",
					reasonSummary: "direct forward-deployed title",
					role: "Forward Deployed Engineer",
					url: "https://example.com/jobs/pending-fde",
				},
				{
					bucketLabel: "Possible fit",
					company: "Beta",
					reasonSummary: "aligned geography",
					role: "Solutions Architect",
					url: "https://example.com/jobs/processed-caution",
				},
			],
		},
		status: "ready",
	};
}

function createReportViewerPayload(requestUrl) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const group = url.searchParams.get("group") ?? "reports";
	const limit = Number.parseInt(url.searchParams.get("limit") ?? "8", 10);
	const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
	const requestedReportPath =
		url.searchParams.get("reportPath") ??
		"reports/021-beta-solutions-architect-2026-04-22.md";
	const selectedDetail = REPORT_DETAILS.get(requestedReportPath);

	return {
		filters: {
			group,
			limit,
			offset,
			reportPath: requestedReportPath,
		},
		generatedAt: "2026-04-22T00:20:00.000Z",
		message: `Showing selected report ${requestedReportPath}.`,
		ok: true,
		recentArtifacts: {
			group,
			hasMore: false,
			items: REPORT_ITEMS.map((item) => ({
				...item,
				selected: item.repoRelativePath === requestedReportPath,
			})),
			limit,
			offset,
			totalCount: REPORT_ITEMS.length,
		},
		selectedReport: {
			body: selectedDetail?.body ?? null,
			header: selectedDetail?.header ?? null,
			message: `Showing selected report ${requestedReportPath}.`,
			origin: "selected",
			repoRelativePath: requestedReportPath,
			reportNumber: selectedDetail?.reportNumber ?? null,
			requestedRepoRelativePath: requestedReportPath,
			state: selectedDetail ? "ready" : "missing",
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
		pipelineMode: "ready",
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
				writeJson(response, 200, createEvaluationResultPayload());
				return;
			case "/report-viewer":
				writeJson(response, 200, createReportViewerPayload(url.toString()));
				return;
			case "/pipeline-review":
				if (state.pipelineMode === "offline") {
					writeJson(
						response,
						429,
						createRateLimitedErrorPayload(
							"Pipeline-review refresh is temporarily unavailable.",
						),
						{
							"retry-after": "1",
						},
					);
					return;
				}

				writeJson(response, 200, createPipelineReviewPayload(url.toString()));
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
		setPipelineMode(mode) {
			state.pipelineMode = mode;
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
				`Vite exited early while waiting for ${url}.\n${stderrLog.join("")}`,
			);
		}

		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {}

		await delay(250);
	}

	throw new Error(`Timed out waiting for ${url}.\n${stderrLog.join("")}`);
}

const fakeApi = createFakeApi();
const apiPort = await getFreePort();
const apiUrl = await fakeApi.listen(apiPort);
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
			JOBHUNT_API_ORIGIN: apiUrl,
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
		await page.goto(`${webUrl}#pipeline`, { waitUntil: "networkidle" });

		await page
			.getByRole("heading", { name: "Pipeline review workspace" })
			.waitFor();
		await page.getByText("Current strongest lane: Forward Deployed.").waitFor();
		await page.getByText("Forward Deployed Engineer").first().waitFor();
		await page
			.getByText(
				"Select a pending or processed queue row to inspect its report, PDF, legitimacy, and warning context.",
			)
			.waitFor();

		await page.getByRole("button", { name: "Show Processed" }).click();
		await page.getByRole("button", { name: "Sort by Score" }).click();
		await page.getByText("AI Deployment Lead").waitFor();

		await page.getByRole("button", { name: "Review queue row 023" }).click();
		await page.getByText("Legitimacy is marked Suspicious.").waitFor();
		await page.getByText("Report header snapshot").waitFor();

		await page
			.getByRole("button", { name: "Open report viewer from pipeline detail" })
			.click();
		await page
			.getByRole("heading", { name: "Artifact review surface" })
			.waitFor();
		await page
			.getByRole("heading", { name: "Evaluation: Delta -- AI Deployment Lead" })
			.waitFor();
		assert.match(page.url(), /#artifacts$/);

		await page.goto(
			`${webUrl}?pipelineSection=pending&pipelineReportNumber=023#pipeline`,
			{
				waitUntil: "networkidle",
			},
		);
		await page.getByText("Clear stale selection").waitFor();

		fakeApi.setPipelineMode("offline");
		await page.getByRole("button", { name: "Refresh pipeline review" }).click();
		await page.getByText("Showing the last queue snapshot").waitFor();
	} finally {
		await browser.close();
	}

	console.log("App pipeline-review smoke checks passed.");
} finally {
	await stopChild(webChild);
	await fakeApi.close();
}

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
			activeSession: null,
			activeSessionCount: 0,
			latestPendingApprovals: [],
			pendingApprovalCount: 0,
			recentFailureCount: 0,
			recentFailures: [],
			state: "idle",
		},
		currentSession: {
			id: "phase04-session05-tracker-workspace-and-integrity-actions",
			monorepo: true,
			packagePath: "apps/web",
			phase: 4,
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

function createReportViewerPayload(requestUrl = "/report-viewer") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const reportPath =
		url.searchParams.get("reportPath") ??
		"reports/019-cohere-agentic-2026-04-22.md";
	const isPendingFocus =
		reportPath === "reports/020-future-company-2026-04-22.md";

	return {
		filters: {
			group: "reports",
			limit: 8,
			offset: 0,
			reportPath,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: "Showing the selected report artifact.",
		ok: true,
		recentArtifacts: {
			group: "reports",
			hasMore: false,
			items: [
				{
					artifactDate: "2026-04-22",
					fileName: "019-cohere-agentic-2026-04-22.md",
					kind: "report",
					repoRelativePath: "reports/019-cohere-agentic-2026-04-22.md",
					reportNumber: "019",
					selected:
						!isPendingFocus &&
						reportPath === "reports/019-cohere-agentic-2026-04-22.md",
				},
				{
					artifactDate: "2026-04-22",
					fileName: "020-future-company-2026-04-22.md",
					kind: "report",
					repoRelativePath: "reports/020-future-company-2026-04-22.md",
					reportNumber: "020",
					selected: isPendingFocus,
				},
			],
			limit: 8,
			offset: 0,
			totalCount: 2,
		},
		selectedReport: {
			body: isPendingFocus
				? [
						"# Evaluation: Future Company -- Forward Deployed Engineer",
						"",
						"Pending tracker handoff report body.",
					].join("\n")
				: [
						"# Evaluation: Cohere -- Applied AI Engineer - Agentic Workflows",
						"",
						"Tracker workspace smoke handoff report body.",
					].join("\n"),
			header: {
				archetype: isPendingFocus ? "Forward Deployed" : "Applied AI",
				date: "2026-04-22",
				legitimacy: "High Confidence",
				pdf: {
					exists: !isPendingFocus,
					repoRelativePath: isPendingFocus
						? null
						: "output/cv-cohere-agentic-2026-04-22.pdf",
				},
				score: isPendingFocus ? 4.1 : 4.4,
				title: isPendingFocus
					? "Evaluation: Future Company -- Forward Deployed Engineer"
					: "Evaluation: Cohere -- Applied AI Engineer - Agentic Workflows",
				url: isPendingFocus
					? "https://example.com/jobs/future-company"
					: "https://example.com/jobs/cohere-agentic",
				verification: "active via browser review",
			},
			message: `Showing selected report ${reportPath}.`,
			origin: "selected",
			repoRelativePath: reportPath,
			reportNumber: isPendingFocus ? "020" : "019",
			requestedRepoRelativePath: reportPath,
			state: "ready",
		},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
	};
}

function getBaseRows(primaryStatus) {
	return [
		{
			company: "Cohere",
			date: "2026-04-22",
			entryNumber: 19,
			header: {
				date: "2026-04-22",
				legitimacy: "High Confidence",
				pdf: {
					exists: true,
					message:
						"Checked-in PDF artifact output/cv-cohere-agentic-2026-04-22.pdf is available.",
					repoRelativePath: "output/cv-cohere-agentic-2026-04-22.pdf",
				},
				score: 4.4,
				title: "Evaluation: Cohere -- Applied AI Engineer - Agentic Workflows",
				url: "https://example.com/jobs/cohere-agentic",
				verification: "active via browser review",
			},
			notes:
				"Strongest current agentic-workflows fit in the queue; remote-flexible and worth prioritizing.",
			pdf: {
				exists: true,
				message:
					"Checked-in PDF artifact output/cv-cohere-agentic-2026-04-22.pdf is available.",
				repoRelativePath: "output/cv-cohere-agentic-2026-04-22.pdf",
			},
			report: {
				exists: true,
				message:
					"Checked-in report artifact reports/019-cohere-agentic-2026-04-22.md is available.",
				repoRelativePath: "reports/019-cohere-agentic-2026-04-22.md",
			},
			role: "Applied AI Engineer - Agentic Workflows",
			score: 4.4,
			scoreLabel: "4.4/5",
			sourceLine:
				"| 19 | 2026-04-22 | Cohere | Applied AI Engineer - Agentic Workflows | 4.4/5 | Evaluated | Y | [019](reports/019-cohere-agentic-2026-04-22.md) | Strongest current agentic-workflows fit in the queue; remote-flexible and worth prioritizing. |",
			status: primaryStatus,
			warnings: [],
		},
		{
			company: "Anthropic",
			date: "2026-04-21",
			entryNumber: 16,
			header: null,
			notes: "Needs confirmation on location and travel expectations.",
			pdf: {
				exists: false,
				message: "No checked-in PDF artifact is linked from the report header.",
				repoRelativePath: null,
			},
			report: {
				exists: false,
				message:
					"Tracker row points to missing report artifact reports/016-anthropic-startups-2026-04-21.md.",
				repoRelativePath: null,
			},
			role: "Solutions Architect, Applied AI (Startups)",
			score: 4.4,
			scoreLabel: "4.4/5",
			sourceLine:
				"| 16 | 2026-04-21 | Anthropic | Solutions Architect, Applied AI (Startups) | 4.4/5 | Evaluated | Y | [016](reports/016-anthropic-startups-2026-04-21.md) | Needs confirmation on location and travel expectations. |",
			status: "Evaluated",
			warnings: [
				{
					code: "missing-report",
					message:
						"Tracker row points to missing report artifact reports/016-anthropic-startups-2026-04-21.md.",
				},
				{
					code: "missing-pdf",
					message:
						"No checked-in PDF artifact is linked from the report header.",
				},
			],
		},
	];
}

function createTrackerPayload(state, requestUrl) {
	if (state.trackerMode === "empty") {
		return {
			filters: {
				entryNumber: null,
				limit: 12,
				offset: 0,
				reportNumber: null,
				search: null,
				sort: "date",
				status: null,
			},
			generatedAt: "2026-04-22T00:00:00.000Z",
			message:
				"Applications tracker is present but does not contain any rows yet.",
			ok: true,
			pendingAdditions: {
				count: 0,
				items: [],
				message: "No pending tracker TSV additions are waiting to merge.",
			},
			rows: {
				filteredCount: 0,
				hasMore: false,
				items: [],
				limit: 12,
				offset: 0,
				sort: "date",
				totalCount: 0,
			},
			selectedDetail: {
				message: "Select a tracker row once matching items are available.",
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
			statusOptions: [
				{
					count: 0,
					id: "evaluated",
					label: "Evaluated",
				},
				{
					count: 0,
					id: "interview",
					label: "Interview",
				},
			],
		};
	}

	const rows = getBaseRows(state.primaryStatus);
	const requestedEntryNumber = Number.parseInt(
		requestUrl.searchParams.get("entryNumber") ?? "",
		10,
	);
	const selectedEntryNumber = Number.isInteger(requestedEntryNumber)
		? requestedEntryNumber
		: null;
	const selectedReportNumber =
		requestUrl.searchParams.get("reportNumber")?.trim() || null;
	const statusFilter = requestUrl.searchParams.get("status")?.trim() || null;
	const filteredRows = statusFilter
		? rows.filter((row) => row.status === statusFilter)
		: rows;
	const rowReportNumber = (row) =>
		row.report.repoRelativePath?.match(/(?:^|\/)(\d{3})-/)?.[1] ?? null;
	const visibleRows = filteredRows.map((row) => ({
		company: row.company,
		date: row.date,
		entryNumber: row.entryNumber,
		pdf: row.pdf,
		report: row.report,
		role: row.role,
		score: row.score,
		scoreLabel: row.scoreLabel,
		selected:
			selectedEntryNumber !== null
				? row.entryNumber === selectedEntryNumber
				: selectedReportNumber !== null
					? rowReportNumber(row) === selectedReportNumber
					: false,
		status: row.status,
		warningCount: row.warnings.length,
		warnings: row.warnings,
	}));
	const selectedRow =
		selectedEntryNumber !== null
			? (rows.find((row) => row.entryNumber === selectedEntryNumber) ?? null)
			: selectedReportNumber !== null
				? (rows.find((row) => rowReportNumber(row) === selectedReportNumber) ??
					null)
				: null;
	const focusedPendingAddition =
		selectedRow === null && selectedReportNumber === "020"
			? {
					company: "Future Company",
					entryNumber: 20,
					fileName: "20-future-company.tsv",
					notes: "Pending add",
					reportNumber: "020",
					reportRepoRelativePath: "reports/020-future-company-2026-04-22.md",
					repoRelativePath: "batch/tracker-additions/20-future-company.tsv",
					role: "Forward Deployed Engineer",
					status: "Evaluated",
				}
			: null;
	const selectedIsStale =
		selectedRow !== null &&
		(selectedEntryNumber !== null
			? !filteredRows.some((row) => row.entryNumber === selectedEntryNumber)
			: !filteredRows.some(
					(row) => rowReportNumber(row) === selectedReportNumber,
				));

	return {
		filters: {
			entryNumber: selectedEntryNumber,
			limit: 12,
			offset: 0,
			reportNumber: selectedReportNumber,
			search: null,
			sort: "date",
			status: statusFilter,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		message: `Showing ${filteredRows.length} of ${rows.length} tracker rows. ${state.pendingAdditionsMessage}`,
		ok: true,
		pendingAdditions: {
			count: 1,
			items: [
				{
					company: "Future Company",
					entryNumber: 20,
					fileName: "20-future-company.tsv",
					notes: "Pending add",
					reportNumber: "020",
					reportRepoRelativePath: "reports/020-future-company-2026-04-22.md",
					repoRelativePath: "batch/tracker-additions/20-future-company.tsv",
					role: "Forward Deployed Engineer",
					status: "Evaluated",
				},
			],
			message: state.pendingAdditionsMessage,
		},
		rows: {
			filteredCount: filteredRows.length,
			hasMore: false,
			items: visibleRows,
			limit: 12,
			offset: 0,
			sort: "date",
			totalCount: rows.length,
		},
		selectedDetail:
			selectedRow === null && focusedPendingAddition === null
				? {
						message:
							"Select a tracker row to inspect report links, notes, and status.",
						origin: "none",
						pendingAddition: null,
						requestedEntryNumber: null,
						requestedReportNumber: selectedReportNumber,
						row: null,
						state: "empty",
					}
				: selectedRow === null && focusedPendingAddition !== null
					? {
							message:
								"Showing staged tracker addition for report #020. Merge tracker additions to create the canonical row.",
							origin: "report-number",
							pendingAddition: focusedPendingAddition,
							requestedEntryNumber: null,
							requestedReportNumber: "020",
							row: null,
							state: "ready",
						}
					: {
							message: selectedIsStale
								? selectedReportNumber
									? `Focused report #${selectedReportNumber} no longer matches the active filters.`
									: `Selected tracker row #${selectedRow.entryNumber} no longer matches the active filters.`
								: selectedReportNumber
									? `Showing tracker row for report #${selectedReportNumber}.`
									: `Showing selected tracker row #${selectedRow.entryNumber}.`,
							origin: selectedReportNumber ? "report-number" : "entry-number",
							pendingAddition: null,
							requestedEntryNumber: selectedRow.entryNumber,
							requestedReportNumber: selectedReportNumber,
							row: {
								company: selectedRow.company,
								date: selectedRow.date,
								entryNumber: selectedRow.entryNumber,
								header: selectedRow.header,
								notes: selectedRow.notes,
								pdf: selectedRow.pdf,
								report: selectedRow.report,
								role: selectedRow.role,
								score: selectedRow.score,
								scoreLabel: selectedRow.scoreLabel,
								selected: true,
								sourceLine: selectedRow.sourceLine,
								status: selectedRow.status,
								warningCount:
									selectedRow.warnings.length + (selectedIsStale ? 1 : 0),
								warnings: selectedIsStale
									? [
											...selectedRow.warnings,
											{
												code: "stale-selection",
												message:
													"The selected tracker row is outside the current filtered page, so detail is shown separately.",
											},
										]
									: selectedRow.warnings,
							},
							state: "ready",
						},
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		statusOptions: [
			{
				count: rows.filter((row) => row.status === "Evaluated").length,
				id: "evaluated",
				label: "Evaluated",
			},
			{
				count: rows.filter((row) => row.status === "Interview").length,
				id: "interview",
				label: "Interview",
			},
		],
	};
}

function createTrackerErrorPayload(message) {
	return {
		error: {
			code: "tracker-workspace-failed",
			message,
		},
		ok: false,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "error",
	};
}

function createActionPayload(input) {
	return {
		actionResult: {
			action: input.action,
			dryRun: input.dryRun,
			entryNumber: input.entryNumber,
			message: input.message,
			warnings: input.warnings,
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
		pendingAdditionsMessage:
			"1 pending tracker TSV addition is waiting to merge.",
		primaryStatus: "Evaluated",
		trackerMode: "ready",
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

		if (requestUrl.pathname === "/report-viewer") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createReportViewerPayload(request.url ?? "/report-viewer"),
					null,
					2,
				),
			);
			return;
		}

		if (requestUrl.pathname === "/tracker-workspace") {
			if (state.trackerMode === "slow") {
				await delay(900);
			}

			if (state.trackerMode === "error") {
				response.writeHead(500, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createTrackerErrorPayload(
							"Tracker workspace failed before a summary could load.",
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
				JSON.stringify(createTrackerPayload(state, requestUrl), null, 2),
			);
			return;
		}

		if (requestUrl.pathname === "/tracker-workspace/action") {
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

			if (body.action === "update-status") {
				state.primaryStatus = body.status;
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createActionPayload({
							action: "update-status",
							dryRun: false,
							entryNumber: body.entryNumber,
							message: `Tracker row #${body.entryNumber} updated to ${body.status}.`,
							warnings: [],
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
						createActionPayload({
							action: "verify-tracker-pipeline",
							dryRun: false,
							entryNumber: null,
							message:
								"Tracker verification completed. Completed with 1 warning.",
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

			if (body.action === "normalize-tracker-statuses") {
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createActionPayload({
							action: "normalize-tracker-statuses",
							dryRun: Boolean(body.dryRun),
							entryNumber: null,
							message: body.dryRun
								? "Tracker status normalization completed."
								: "Tracker status normalization completed.",
							warnings: [],
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
					createActionPayload({
						action: body.action,
						dryRun: Boolean(body.dryRun),
						entryNumber: null,
						message: `${body.action} completed.`,
						warnings: [],
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
		throw new Error("Failed to start the fake tracker-workspace API.");
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
			state.pendingAdditionsMessage =
				"1 pending tracker TSV addition is waiting to merge.";
			state.primaryStatus = "Evaluated";
			state.trackerMode = "ready";
		},
		setTrackerMode(mode) {
			state.trackerMode = mode;
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
		const selectedDetailPanel = page
			.locator("section")
			.filter({ has: page.getByRole("heading", { name: "Selected detail" }) })
			.last();
		await page.goto(`${webUrl}/tracker`, { waitUntil: "networkidle" });

		await page
			.getByRole("heading", {
				name: "Applications",
			})
			.waitFor();
		await page
			.getByText("1 pending tracker TSV addition is waiting to merge.", {
				exact: true,
			})
			.waitFor();
		await page.getByRole("button", { name: /Select tracker row 19/ }).click();
		await page.getByText("Showing selected tracker row #19.").waitFor();
		await page
			.getByText(
				"Strongest current agentic-workflows fit in the queue; remote-flexible and worth prioritizing.",
				{ exact: true },
			)
			.waitFor();

		await page.getByLabel("Select tracker status").selectOption("Interview");
		await page.getByRole("button", { name: /^Update status$/ }).click();
		await page.getByText("Tracker action feedback").waitFor();
		await page.getByText("updated to Interview").waitFor();
		await selectedDetailPanel
			.getByText("2026-04-22 | Interview | 4.4 / 5", { exact: true })
			.waitFor();

		await page.getByRole("button", { name: /^Verify$/ }).click();
		await page.getByText("Completed with 1 warning").waitFor();

		await page.getByRole("button", { name: /Normalize dry run/ }).click();
		await page.getByText("Tracker status normalization completed.").waitFor();

		await page.getByRole("button", { name: /Open report viewer/ }).click();
		await page.waitForURL(/\/artifacts/);
		await page.getByRole("heading", { name: "Reports", exact: true }).waitFor();
		await page
			.getByText("Tracker workspace smoke handoff report body.")
			.waitFor();
		await page.goto(`${webUrl}/tracker?trackerReportNumber=020`, {
			waitUntil: "networkidle",
		});
		await page
			.getByRole("heading", {
				name: "Applications",
			})
			.waitFor();
		await page.getByText("Auto-pipeline closeout focus").waitFor();
		await page
			.getByText(
				"Showing staged tracker addition for report #020. Merge tracker additions to create the canonical row.",
			)
			.waitFor();
		await page.getByText("Pending TSV 20-future-company.tsv").waitFor();
		await page.getByRole("button", { name: /Open report viewer/ }).click();
		await page.waitForURL(/\/artifacts/);
		await page.getByRole("heading", { name: "Reports", exact: true }).waitFor();

		fakeApi.setTrackerMode("slow");
		const loadingPage = await browser.newPage();
		await loadingPage.goto(`${webUrl}/tracker`);
		await loadingPage.getByText("Loading tracker workspace").waitFor();
		await loadingPage
			.getByRole("heading", {
				name: "Applications",
			})
			.waitFor();
		await loadingPage.close();

		fakeApi.setTrackerMode("empty");
		const emptyPage = await browser.newPage();
		await emptyPage.goto(`${webUrl}/tracker`, { waitUntil: "networkidle" });
		await emptyPage
			.getByText(
				"Applications tracker is present but does not contain any rows yet.",
			)
			.waitFor();
		await emptyPage.close();

		fakeApi.setTrackerMode("error");
		const errorPage = await browser.newPage();
		await errorPage.goto(`${webUrl}/tracker`, { waitUntil: "networkidle" });
		await errorPage.getByText("Tracker workspace unavailable").waitFor();
		await errorPage.close();

		fakeApi.reset();
		await page
			.getByRole("link", { name: /Tracker/ })
			.first()
			.click();
		await page
			.getByRole("heading", {
				name: "Applications",
			})
			.waitFor();
		await page.route("**/tracker-workspace*", async (route) => {
			await route.abort("failed");
		});
		await page.getByLabel("Refresh tracker workspace").click();
		await page.getByText("Showing the last tracker snapshot").waitFor();
		await page
			.getByText(
				"Tracker-workspace summary endpoint is unavailable. Start the local API server and try again.",
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

console.log("Tracker workspace smoke checks passed.");

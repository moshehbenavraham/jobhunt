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
const SCAN_SESSION_ID = "scan-session-01";

const SCAN_ROWS = [
	{
		bucket: "strongest-fit",
		company: "Cohere",
		duplicateHint: {
			firstSeen: "2026-04-20",
			freshness: "recent",
			historyCount: 3,
			otherShortlistCount: 1,
			pendingOverlap: true,
			portal: "Greenhouse",
			status: "queued",
			title: "Applied AI Engineer",
		},
		rank: 1,
		reasonSummary: "Strongest current agentic-workflows fit.",
		role: "Applied AI Engineer",
		sourceLine:
			"1. Strongest fit | https://example.com/jobs/cohere-applied-ai | Cohere | Applied AI Engineer | Strongest current agentic-workflows fit.",
		url: "https://example.com/jobs/cohere-applied-ai",
	},
	{
		bucket: "possible-fit",
		company: "Acme",
		duplicateHint: {
			firstSeen: "2026-04-22",
			freshness: "new",
			historyCount: 1,
			otherShortlistCount: 0,
			pendingOverlap: false,
			portal: "Workday",
			status: "new",
			title: "Forward Deployed Engineer",
		},
		rank: 2,
		reasonSummary: "Forward-deployed title with strong operator overlap.",
		role: "Forward Deployed Engineer",
		sourceLine:
			"2. Possible fit | https://example.com/jobs/acme-fde | Acme | Forward Deployed Engineer | Forward-deployed title with strong operator overlap.",
		url: "https://example.com/jobs/acme-fde",
	},
];

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
				supportedWorkflows: [
					"batch-evaluation",
					"scan-portals",
					"single-evaluation",
				],
				workflowRoutes: [
					{
						description: "Scan portals route",
						intent: "scan-portals",
						modeRepoRelativePath: "modes/scan.md",
					},
					{
						description: "Single evaluation route",
						intent: "single-evaluation",
						modeRepoRelativePath: "modes/oferta.md",
					},
					{
						description: "Batch evaluation route",
						intent: "batch-evaluation",
						modeRepoRelativePath: "modes/batch.md",
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
					jobId: "job-scan-live",
					status: "completed",
					updatedAt: "2026-04-22T00:00:00.000Z",
					waitReason: null,
				},
				activeJobId: "job-scan-live",
				lastHeartbeatAt: "2026-04-22T00:00:00.000Z",
				pendingApprovalCount: 0,
				sessionId: SCAN_SESSION_ID,
				status: "completed",
				updatedAt: "2026-04-22T00:00:00.000Z",
				workflow: "scan-portals",
			},
			activeSessionCount: 1,
			latestPendingApprovals: [],
			pendingApprovalCount: 0,
			recentFailureCount: 0,
			recentFailures: [],
			state: "active",
		},
		currentSession: {
			id: "phase05-session02-scan-review-workspace",
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
		{
			description: "Scan portals route",
			intent: "scan-portals",
			label: "Scan Portals",
			message: "Scan portals can launch with the current scan specialist.",
			missingCapabilities: [],
			modeRepoRelativePath: "modes/scan.md",
			specialist: {
				description: "Owns portal scan execution and shortlist review.",
				id: "scan-specialist",
				label: "Scan Specialist",
			},
			status: "ready",
		},
		{
			description: "Batch evaluation route",
			intent: "batch-evaluation",
			label: "Batch Evaluation",
			message: "Batch evaluation can launch with the batch specialist.",
			missingCapabilities: [],
			modeRepoRelativePath: "modes/batch.md",
			specialist: {
				description: "Owns batch evaluation launch and supervision.",
				id: "batch-specialist",
				label: "Batch Specialist",
			},
			status: "ready",
		},
	];
}

function createSessionSummary(overrides = {}) {
	return {
		activeJobId: overrides.activeJobId ?? `${overrides.sessionId}-job`,
		job: {
			attempt: 1,
			completedAt: null,
			currentRunId: `${overrides.sessionId}-run`,
			jobId: `${overrides.sessionId}-job`,
			jobType: overrides.workflow ?? "single-evaluation",
			startedAt: "2026-04-22T00:05:00.000Z",
			status: "running",
			updatedAt: "2026-04-22T00:05:00.000Z",
			waitReason: null,
		},
		latestFailure: null,
		lastHeartbeatAt: "2026-04-22T00:05:00.000Z",
		pendingApproval: null,
		pendingApprovalCount: 0,
		resumeAllowed: true,
		sessionId: overrides.sessionId,
		state: "running",
		status: "running",
		updatedAt: "2026-04-22T00:05:00.000Z",
		workflow: overrides.workflow,
	};
}

function createSessionDetail(summary, message) {
	return {
		approvals: [],
		failure: null,
		jobs: [summary.job],
		route: {
			message,
			missingCapabilities: [],
			specialistId:
				summary.workflow === "batch-evaluation"
					? "batch-specialist"
					: "evaluation-specialist",
			status: "ready",
		},
		session: summary,
		timeline: [
			{
				approvalId: null,
				eventId: `${summary.sessionId}-event`,
				eventType: "job-execution-started",
				jobId: summary.job.jobId,
				level: "info",
				occurredAt: summary.updatedAt,
				requestId: `${summary.sessionId}-request`,
				sessionId: summary.sessionId,
				summary: message,
				traceId: `${summary.sessionId}-trace`,
			},
		],
	};
}

function createChatConsoleSummaryPayload(state, selectedSessionId = null) {
	const sessions = [...state.sessionDetails.values()]
		.map((detail) => detail.session)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	const selectedDetail =
		(selectedSessionId && state.sessionDetails.get(selectedSessionId)) ||
		(state.lastChatSessionId &&
			state.sessionDetails.get(state.lastChatSessionId)) ||
		null;

	return {
		generatedAt: "2026-04-22T00:05:00.000Z",
		message: "Chat console summary is ready.",
		ok: true,
		recentSessions: sessions,
		selectedSession: selectedDetail,
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
			previewLimit: 4,
			sessionId: url.searchParams.get("sessionId"),
			workflow: null,
		},
		generatedAt: "2026-04-22T00:05:00.000Z",
		message: "Evaluation result summary is ready.",
		ok: true,
		recentSessions: [],
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
		summary: null,
	};
}

function createCommandPayload(input) {
	return {
		generatedAt: "2026-04-22T00:05:00.000Z",
		handoff: {
			job: input.detail.session.job,
			message: input.message,
			pendingApproval: null,
			requestedAt: "2026-04-22T00:05:00.000Z",
			route: {
				message: input.message,
				missingCapabilities: [],
				requestKind: "launch",
				sessionId: input.detail.session.sessionId,
				specialistId: input.specialistId,
				status: "ready",
				workflow: input.workflow,
			},
			runtime: {
				message: "Agent runtime ready.",
				model: "gpt-5.4-mini",
				modeRepoRelativePath:
					input.workflow === "batch-evaluation"
						? "modes/batch.md"
						: "modes/oferta.md",
				startedAt: "2026-04-22T00:05:00.000Z",
				status: "ready",
				workflow: input.workflow,
			},
			selectedSession: input.detail,
			session: input.detail.session,
			specialist: {
				description: input.specialistLabel,
				id: input.specialistId,
				label: input.specialistLabel,
			},
			state: "running",
			toolingGap: null,
		},
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status: "ready",
	};
}

function createScanReviewErrorPayload(message, status = "error") {
	return {
		error: {
			code: "scan-review-failed",
			message,
		},
		ok: false,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		status,
	};
}

function createCandidatePreview(row, input) {
	const warnings = [];

	if (
		row.duplicateHint.historyCount > 1 ||
		row.duplicateHint.otherShortlistCount > 0
	) {
		warnings.push({
			code: "duplicate-heavy",
			message:
				"Similar shortlist candidates already exist for this company, so this item needs duplicate review.",
		});
	}

	if (row.duplicateHint.pendingOverlap) {
		warnings.push({
			code: "already-pending",
			message: "This role already exists in the pending pipeline queue.",
		});
	}

	if (input.ignored) {
		warnings.push({
			code: "already-ignored",
			message: "This role is currently hidden for the selected scan session.",
		});
	}

	if (input.staleSelection) {
		warnings.push({
			code: "stale-selection",
			message:
				"The selected role is outside the current filtered page, so detail is shown separately.",
		});
	}

	return {
		batchSeed: {
			item: {
				bucket: row.bucket,
				company: row.company,
				reasonSummary: row.reasonSummary,
				role: row.role,
				url: row.url,
			},
			message: `Seed batch review with ${row.url}.`,
			selection: {
				limit: 1,
				mode: "selected-urls",
				urls: [row.url],
			},
			target: "batch-composer",
		},
		bucket: row.bucket,
		company: row.company,
		duplicateHint: row.duplicateHint,
		evaluate: {
			context: {
				promptText: row.url,
			},
			message: `Launch a single evaluation for ${row.url}.`,
			workflow: "single-evaluation",
		},
		ignoreAction: {
			action: input.ignored ? "restore" : "ignore",
			message: input.ignored
				? "Restore this role to the current scan review session."
				: "Hide this role from the current scan review session.",
			sessionId: SCAN_SESSION_ID,
			url: row.url,
		},
		ignored: input.ignored,
		rank: row.rank,
		reasonSummary: row.reasonSummary,
		role: row.role,
		selected: input.selected,
		url: row.url,
		warningCount: warnings.length,
		warnings,
	};
}

function createScanReviewPayload(requestUrl, state) {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const bucket = url.searchParams.get("bucket") ?? "all";
	const includeIgnored = url.searchParams.get("includeIgnored") === "true";
	const limit = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
	const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
	const sessionId = url.searchParams.get("sessionId");
	const requestedUrl = url.searchParams.get("url");

	if (state.scanMode === "error") {
		return createScanReviewErrorPayload(
			"Scan review failed before a summary could load.",
		);
	}

	const candidates =
		state.scanMode === "empty"
			? []
			: SCAN_ROWS.map((row) => ({
					...row,
					ignored: state.ignoredUrls.has(row.url),
				}));
	const bucketFiltered =
		bucket === "all"
			? candidates
			: candidates.filter((candidate) => candidate.bucket === bucket);
	const visibilityFiltered = includeIgnored
		? bucketFiltered
		: bucketFiltered.filter((candidate) => !candidate.ignored);
	const selectedSource =
		requestedUrl !== null
			? (candidates.find((candidate) => candidate.url === requestedUrl) ?? null)
			: null;
	const selectedVisible =
		requestedUrl !== null
			? (visibilityFiltered.find(
					(candidate) => candidate.url === requestedUrl,
				) ?? null)
			: null;
	const pagedCandidates = visibilityFiltered.slice(offset, offset + limit);
	const shortlistItems = pagedCandidates.map((candidate) =>
		createCandidatePreview(candidate, {
			ignored: candidate.ignored,
			selected: requestedUrl === candidate.url,
			staleSelection: false,
		}),
	);
	const selectedDetail =
		requestedUrl === null
			? {
					message:
						visibilityFiltered.length === 0
							? "Select a shortlist candidate once scan results are available."
							: "Select a shortlist candidate to inspect dedup context and follow-through metadata.",
					origin: "none",
					requestedUrl: null,
					row: null,
					state: "empty",
				}
			: selectedSource === null
				? {
						message: `Selected shortlist candidate is no longer available: ${requestedUrl}.`,
						origin: "url",
						requestedUrl,
						row: null,
						state: "missing",
					}
				: {
						message:
							selectedVisible === null
								? `Selected shortlist candidate ${requestedUrl} no longer matches the active filters.`
								: `Showing shortlist candidate ${requestedUrl}.`,
						origin: "url",
						requestedUrl,
						row: {
							...createCandidatePreview(selectedSource, {
								ignored: selectedSource.ignored,
								selected: true,
								staleSelection: selectedVisible === null,
							}),
							sourceLine: selectedSource.sourceLine,
						},
						state: "ready",
					};

	return {
		filters: {
			bucket,
			includeIgnored,
			limit,
			offset,
			sessionId,
			url: requestedUrl,
		},
		generatedAt: "2026-04-22T00:00:00.000Z",
		launcher: {
			available: true,
			canStart: true,
			message: "Scan launcher is ready.",
			workflow: "scan-portals",
		},
		message:
			visibilityFiltered.length === 0
				? "No shortlist candidates match the current scan filters."
				: `Showing ${visibilityFiltered.length} shortlist candidates.`,
		ok: true,
		run: {
			activeJobId: "job-scan-live",
			approvalId: null,
			completedAt: "2026-04-22T00:00:00.000Z",
			filter: {
				company: null,
				compareClean: false,
				dryRun: false,
			},
			message:
				state.runState === "queued"
					? "Scan run is queued and waiting to start."
					: "The latest scan run completed with 2 new offers added.",
			runId: "run-scan-live",
			sessionId: SCAN_SESSION_ID,
			startedAt: "2026-04-22T00:00:00.000Z",
			state: state.runState,
			summary: {
				companiesConfigured: 4,
				companiesScanned: 4,
				companiesSkipped: 0,
				duplicatesSkipped: 1,
				filteredByLocation: 0,
				filteredByTitle: 0,
				newOffersAdded: visibilityFiltered.length,
				totalJobsFound: 8,
			},
			updatedAt: "2026-04-22T00:00:00.000Z",
			warnings:
				state.scanMode === "warning"
					? [
							{
								code: "approval-paused",
								message: "A pending approval is blocking this scan run.",
							},
						]
					: [],
		},
		selectedDetail,
		service: "jobhunt-api-scaffold",
		sessionId: "phase01-session03-agent-runtime-bootstrap",
		shortlist: {
			available: true,
			campaignGuidance: "Current strongest lane: Applied AI and operator fit.",
			counts: {
				adjacentOrNoisy: 0,
				duplicateHeavy: 1,
				ignored: candidates.filter((candidate) => candidate.ignored).length,
				pendingOverlap: 1,
				possibleFit: 1,
				strongestFit: 1,
				total: candidates.length,
			},
			filteredCount: visibilityFiltered.length,
			hasMore: false,
			items: shortlistItems,
			lastRefreshed: "2026-04-22",
			limit,
			message:
				visibilityFiltered.length === 0
					? "No shortlist candidates remain after the current filters."
					: "Shortlist candidates are ready for review.",
			offset,
			totalCount: candidates.length,
		},
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
		ignoredUrls: new Set(),
		lastChatSessionId: null,
		runState: "completed",
		scanMode: "ready",
		sessionDetails: new Map(),
	};
	const server = createHttpServer(async (request, response) => {
		const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

		if (requestUrl.pathname === "/startup") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(createReadyStartupPayload(), null, 2));
			return;
		}

		if (requestUrl.pathname === "/operator-shell") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(JSON.stringify(createReadyShellSummary(), null, 2));
			return;
		}

		if (requestUrl.pathname === "/chat-console") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createChatConsoleSummaryPayload(
						state,
						requestUrl.searchParams.get("sessionId"),
					),
					null,
					2,
				),
			);
			return;
		}

		if (requestUrl.pathname === "/evaluation-result") {
			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(createEvaluationResultPayload(request.url), null, 2),
			);
			return;
		}

		if (requestUrl.pathname === "/scan-review") {
			if (state.scanMode === "slow") {
				await delay(900);
			}

			if (state.scanMode === "error") {
				response.writeHead(500, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createScanReviewErrorPayload(
							"Scan review failed before a summary could load.",
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
				JSON.stringify(createScanReviewPayload(request.url, state), null, 2),
			);
			return;
		}

		if (requestUrl.pathname === "/scan-review/action") {
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

			if (body.action === "ignore") {
				state.ignoredUrls.add(body.url);
			} else {
				state.ignoredUrls.delete(body.url);
			}

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					{
						actionResult: {
							action: body.action,
							message:
								body.action === "ignore"
									? `Shortlist candidate ignored for scan session ${SCAN_SESSION_ID}.`
									: `Shortlist candidate restored for scan session ${SCAN_SESSION_ID}.`,
							sessionId: SCAN_SESSION_ID,
							url: body.url,
							visibility: body.action === "ignore" ? "hidden" : "visible",
						},
						generatedAt: "2026-04-22T00:00:00.000Z",
						message:
							body.action === "ignore"
								? `Shortlist candidate ignored for scan session ${SCAN_SESSION_ID}.`
								: `Shortlist candidate restored for scan session ${SCAN_SESSION_ID}.`,
						ok: true,
						service: "jobhunt-api-scaffold",
						sessionId: "phase01-session03-agent-runtime-bootstrap",
						status: "ready",
					},
					null,
					2,
				),
			);
			return;
		}

		if (requestUrl.pathname === "/orchestration") {
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

			if (body.workflow === "scan-portals") {
				state.runState = "queued";
				const summary = createSessionSummary({
					sessionId: SCAN_SESSION_ID,
					workflow: "scan-portals",
				});
				const detail = createSessionDetail(
					summary,
					"Scan launch accepted for the current shortlist workspace.",
				);

				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createCommandPayload({
							detail,
							message:
								"Scan launch accepted for the current shortlist workspace.",
							specialistId: "scan-specialist",
							specialistLabel: "Scan Specialist",
							workflow: "scan-portals",
						}),
						null,
						2,
					),
				);
				return;
			}

			if (body.workflow === "single-evaluation") {
				const summary = createSessionSummary({
					sessionId: "session-eval-01",
					workflow: "single-evaluation",
				});
				const detail = createSessionDetail(
					summary,
					"Single evaluation launched from scan review.",
				);
				state.lastChatSessionId = summary.sessionId;
				state.sessionDetails.set(summary.sessionId, detail);

				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createCommandPayload({
							detail,
							message: "Single evaluation launched from scan review.",
							specialistId: "evaluation-specialist",
							specialistLabel: "Evaluation Specialist",
							workflow: "single-evaluation",
						}),
						null,
						2,
					),
				);
				return;
			}

			if (body.workflow === "batch-evaluation") {
				const summary = createSessionSummary({
					sessionId: "session-batch-01",
					workflow: "batch-evaluation",
				});
				const detail = createSessionDetail(
					summary,
					"Batch evaluation launched from scan review.",
				);
				state.lastChatSessionId = summary.sessionId;
				state.sessionDetails.set(summary.sessionId, detail);

				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createCommandPayload({
							detail,
							message: "Batch evaluation launched from scan review.",
							specialistId: "batch-specialist",
							specialistLabel: "Batch Specialist",
							workflow: "batch-evaluation",
						}),
						null,
						2,
					),
				);
				return;
			}
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

	const port = await getFreePort();
	await new Promise((resolveListen) => {
		server.listen(port, "127.0.0.1", resolveListen);
	});

	return {
		async close() {
			await new Promise((resolveClose, rejectClose) => {
				server.close((error) => {
					if (error) {
						rejectClose(error);
						return;
					}

					resolveClose();
				});
			});
		},
		setScanMode(mode) {
			state.scanMode = mode;
		},
		url: `http://127.0.0.1:${port}`,
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
		await page.goto(`${webUrl}#scan`, { waitUntil: "networkidle" });
		await page
			.getByRole("heading", { name: "Scan review workspace" })
			.waitFor();
		await page.getByText("Applied AI Engineer").waitFor();
		await page.getByText("duplicate-heavy").waitFor();
		await page.getByRole("button", { name: /Applied AI Engineer/ }).click();
		await page.getByRole("button", { name: "Ignore role" }).click();
		await page
			.getByText(
				`Shortlist candidate ignored for scan session ${SCAN_SESSION_ID}.`,
			)
			.waitFor();
		await page.getByRole("button", { name: "Show ignored" }).click();
		await page.getByRole("button", { name: /Applied AI Engineer/ }).click();
		await page.getByRole("button", { name: "Restore role" }).click();
		await page
			.getByText(
				`Shortlist candidate restored for scan session ${SCAN_SESSION_ID}.`,
			)
			.waitFor();
		await page
			.getByRole("button", { name: "Launch single evaluation" })
			.click();
		await page
			.getByRole("heading", { name: "Evaluation console and artifact handoff" })
			.waitFor();
		assert.match(page.url(), /session=session-eval-01/);
		assert.match(page.url(), /\/evaluate/);
		await page
			.getByRole("heading", { name: "session-eval-01", exact: true })
			.first()
			.waitFor();

		await page.goto(`${webUrl}#scan`, { waitUntil: "networkidle" });
		await page
			.getByRole("button", { name: /Forward Deployed Engineer/ })
			.click();
		await page.getByRole("button", { name: "Seed batch evaluation" }).click();
		await page
			.getByRole("heading", { name: "Evaluation console and artifact handoff" })
			.waitFor();
		assert.match(page.url(), /\/evaluate/);

		fakeApi.setScanMode("empty");
		await page.goto(`${webUrl}#scan`, { waitUntil: "networkidle" });
		await page.getByText("No candidates in this view").waitFor();

		fakeApi.setScanMode("slow");
		const loadingPage = await browser.newPage();
		await loadingPage.goto(`${webUrl}#scan`);
		await loadingPage.getByText("Loading scan workspace").waitFor();
		await loadingPage
			.getByRole("heading", { name: "Scan review workspace" })
			.waitFor();
		await loadingPage.getByText("Forward Deployed Engineer").waitFor();
		await loadingPage.close();

		fakeApi.setScanMode("ready");
		await page.goto(`${webUrl}#scan`, { waitUntil: "networkidle" });
		await page.route("**/api/scan-review*", async (route) => {
			await route.abort("failed");
		});
		await page.getByRole("button", { name: "Refresh scan review" }).click();
		await page.getByText("Showing the last scan snapshot").waitFor();
		await page.unroute("**/api/scan-review*");

		fakeApi.setScanMode("error");
		const errorPage = await browser.newPage();
		await errorPage.goto(`${webUrl}#scan`, { waitUntil: "networkidle" });
		await errorPage.getByText("Scan workspace warning").waitFor();
		await errorPage.getByText("Scan workspace unavailable").waitFor();
		await errorPage.close();
	} finally {
		await browser.close();
	}
} finally {
	await stopChild(webChild);
	await fakeApi.close();
}

console.log("App scan-review smoke checks passed.");

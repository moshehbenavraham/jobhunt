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
const STARTUP_SESSION_ID = "phase01-session03-agent-runtime-bootstrap";

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
				sourceOrder: ["agents-guide", "workflow-mode"],
				sources: [],
				supportedWorkflows: ["application-help"],
				workflowRoutes: [
					{
						description: "Application-help route",
						intent: "application-help",
						modeRepoRelativePath: "modes/apply.md",
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
			sessionId: STARTUP_SESSION_ID,
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
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
		userLayerWrites: "disabled",
	};
}

function createReadyShellSummary() {
	return {
		activity: {
			activeSession: {
				activeJob: {
					jobId: "job-app-help-live",
					status: "waiting",
					updatedAt: "2026-04-22T01:00:00.000Z",
					waitReason: "approval",
				},
				activeJobId: "job-app-help-live",
				lastHeartbeatAt: "2026-04-22T01:00:00.000Z",
				pendingApprovalCount: 1,
				sessionId: "app-help-paused",
				status: "waiting",
				updatedAt: "2026-04-22T01:00:00.000Z",
				workflow: "application-help",
			},
			activeSessionCount: 1,
			latestPendingApprovals: [
				{
					action: "review-application-help-draft",
					approvalId: "approval-app-help-paused",
					jobId: "job-app-help-paused",
					requestedAt: "2026-04-22T01:00:00.000Z",
					sessionId: "app-help-paused",
					title: "Review application-help draft",
					traceId: "trace-app-help-paused",
				},
			],
			pendingApprovalCount: 1,
			recentFailureCount: 1,
			recentFailures: [
				{
					failedAt: "2026-04-22T00:55:00.000Z",
					jobId: "job-app-help-rejected",
					message: "Application-help review was rejected.",
					runId: "run-app-help-rejected",
					sessionId: "app-help-rejected",
					traceId: "trace-app-help-rejected",
				},
			],
			state: "attention-required",
		},
		currentSession: {
			id: "phase05-session06-application-help-review-and-approvals",
			monorepo: true,
			packagePath: "apps/web",
			phase: 5,
			source: "state-file",
			stateFilePath: `${ROOT}/.spec_system/state.json`,
		},
		generatedAt: "2026-04-22T01:00:00.000Z",
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
			sessionId: STARTUP_SESSION_ID,
			startupStatus: "ready",
			status: "ok",
		},
		message: "Bootstrap diagnostics are ready.",
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
	};
}

function createReportContext({
	pdfExists = true,
	pdfPath = "output/cv-context-co-2026-04-22.pdf",
} = {}) {
	return {
		company: "Context Co",
		coverLetter: {
			message: "No cover-letter field was detected on the application page.",
			state: "manual-follow-up",
		},
		existingDraft: {
			itemCount: 1,
			items: [
				{
					answer: "Because it fits my production AI delivery work.",
					question: "Why this role?",
				},
			],
			sectionPresent: true,
			sectionText: "Because it fits my production AI delivery work.",
		},
		fileName: "021-context-co-2026-04-22.md",
		legitimacy: "High Confidence",
		matchReasons: [
			"Matched report number 021 from saved evaluation artifacts.",
			"Company and role match the saved application-help context.",
		],
		matchState: "exact",
		pdf: {
			exists: pdfExists,
			repoRelativePath: pdfPath,
		},
		reportNumber: "021",
		reportRepoRelativePath: "reports/021-context-co-2026-04-22.md",
		role: "Applied AI Engineer",
		score: 4.4,
		title: "Evaluation: Context Co -- Applied AI Engineer",
		url: "https://example.com/jobs/context-co",
	};
}

function createDraftPacket({ reviewNotes, sessionId, warnings = [] } = {}) {
	return {
		company: "Context Co",
		createdAt: "2026-04-22T01:00:00.000Z",
		fingerprint: `fingerprint-${sessionId}`,
		itemCount: 2,
		items: [
			{
				answer: "I build production AI systems and operator workflows.",
				question: "Why this role?",
			},
			{
				answer: "I have shipped durable automation with explicit review gates.",
				question: "What makes you a strong fit?",
			},
		],
		matchedContext: createReportContext(),
		packetId: `packet-${sessionId}`,
		repoRelativePath: `.jobhunt-app/application-help/${sessionId}/packet.json`,
		reviewNotes,
		reviewRequired: true,
		revision: 2,
		role: "Applied AI Engineer",
		sessionId,
		updatedAt: "2026-04-22T01:05:00.000Z",
		warnings,
	};
}

function createSelectedSummary(input) {
	return {
		approval: input.approval ?? null,
		draftPacket: input.draftPacket ?? null,
		failure: input.failure ?? null,
		job:
			input.job === null
				? null
				: {
						attempt: 1,
						completedAt:
							input.job.status === "completed"
								? "2026-04-22T01:10:00.000Z"
								: null,
						currentRunId: `run-${input.sessionId}`,
						jobId: `job-${input.sessionId}`,
						jobType: "application-help",
						startedAt: "2026-04-22T01:00:00.000Z",
						status: input.job.status,
						updatedAt: "2026-04-22T01:10:00.000Z",
						waitReason: input.job.waitReason ?? null,
					},
		message: input.message,
		nextReview: {
			action: input.nextReview.action,
			message: input.nextReview.message,
			resumeAllowed: input.nextReview.resumeAllowed,
			sessionId: input.sessionId,
		},
		reportContext: input.reportContext ?? null,
		reviewBoundary: {
			message:
				"Review is required and submission stays manual outside the browser workspace.",
			reviewRequired: true,
			submissionAllowed: false,
		},
		session: {
			activeJobId: input.job === null ? null : `job-${input.sessionId}`,
			lastHeartbeatAt: "2026-04-22T01:10:00.000Z",
			resumeAllowed: input.resumeAllowed,
			sessionId: input.sessionId,
			status: input.sessionStatus,
			updatedAt: "2026-04-22T01:10:00.000Z",
			workflow: "application-help",
		},
		state: input.state,
		warnings: input.warnings,
	};
}

function createDefaultFixtures() {
	return {
		"app-help-draft-ready": createSelectedSummary({
			draftPacket: createDraftPacket({
				reviewNotes: "Draft is ready for manual review.",
				sessionId: "app-help-draft-ready",
				warnings: ["Double-check the leadership example."],
			}),
			job: {
				status: "waiting",
				waitReason: null,
			},
			message: "A staged draft packet is ready for manual review.",
			nextReview: {
				action: "review-draft",
				message:
					"Review the latest draft packet and refine any answers before continuing the application flow.",
				resumeAllowed: false,
			},
			reportContext: createReportContext(),
			resumeAllowed: false,
			sessionId: "app-help-draft-ready",
			sessionStatus: "waiting",
			state: "draft-ready",
			warnings: [
				{
					code: "draft-warning",
					message: "Double-check the leadership example.",
				},
				{
					code: "cover-letter-manual-follow-up",
					message:
						"No cover-letter field was detected on the application page.",
				},
			],
		}),
		"app-help-paused": createSelectedSummary({
			approval: {
				action: "review-application-help-draft",
				approvalId: "approval-app-help-paused",
				jobId: "job-app-help-paused",
				requestedAt: "2026-04-22T01:00:00.000Z",
				resolvedAt: null,
				status: "pending",
				title: "Review application-help draft",
				traceId: "trace-app-help-paused",
			},
			draftPacket: createDraftPacket({
				reviewNotes: "Waiting on approval.",
				sessionId: "app-help-paused",
			}),
			job: {
				status: "waiting",
				waitReason: "approval",
			},
			message: "This application-help session is waiting on human approval.",
			nextReview: {
				action: "resolve-approval",
				message:
					"Resolve the pending approval, then resume the application-help run with the current draft packet.",
				resumeAllowed: true,
			},
			reportContext: createReportContext(),
			resumeAllowed: true,
			sessionId: "app-help-paused",
			sessionStatus: "waiting",
			state: "approval-paused",
			warnings: [
				{
					code: "approval-paused",
					message:
						"This application-help session is waiting on human approval before it can continue.",
				},
			],
		}),
		"app-help-rejected": createSelectedSummary({
			approval: {
				action: "review-application-help-draft",
				approvalId: "approval-app-help-rejected",
				jobId: "job-app-help-rejected",
				requestedAt: "2026-04-22T00:55:00.000Z",
				resolvedAt: "2026-04-22T01:00:00.000Z",
				status: "rejected",
				title: "Review application-help draft",
				traceId: "trace-app-help-rejected",
			},
			draftPacket: createDraftPacket({
				reviewNotes: "Rejected revision.",
				sessionId: "app-help-rejected",
			}),
			failure: {
				failedAt: "2026-04-22T01:00:00.000Z",
				jobId: "job-app-help-rejected",
				message: "Please revise the proof points.",
				runId: "run-app-help-rejected",
				sessionId: "app-help-rejected",
				traceId: "trace-app-help-rejected",
			},
			job: {
				status: "failed",
				waitReason: null,
			},
			message: "The latest application-help review was rejected.",
			nextReview: {
				action: "revise-draft",
				message:
					"Revise the staged draft packet to address the rejection feedback, then resume the run.",
				resumeAllowed: true,
			},
			reportContext: createReportContext(),
			resumeAllowed: true,
			sessionId: "app-help-rejected",
			sessionStatus: "failed",
			state: "rejected",
			warnings: [
				{
					code: "rejected",
					message:
						"The latest application-help review was rejected and needs a revised draft.",
				},
			],
		}),
		"app-help-resumed": createSelectedSummary({
			draftPacket: createDraftPacket({
				reviewNotes: "Resumed run.",
				sessionId: "app-help-resumed",
			}),
			job: {
				status: "running",
				waitReason: null,
			},
			message: "The application-help run has resumable state and can continue.",
			nextReview: {
				action: "resume-session",
				message:
					"Resume the existing application-help session and continue from the latest staged draft packet.",
				resumeAllowed: true,
			},
			reportContext: createReportContext(),
			resumeAllowed: true,
			sessionId: "app-help-resumed",
			sessionStatus: "running",
			state: "resumed",
			warnings: [
				{
					code: "resumable-session",
					message:
						"This application-help session has resumable runtime state and can continue from its current draft.",
				},
			],
		}),
		"app-help-completed": createSelectedSummary({
			draftPacket: createDraftPacket({
				reviewNotes: "Completed run.",
				sessionId: "app-help-completed",
			}),
			job: {
				status: "completed",
				waitReason: null,
			},
			message:
				"The application-help run completed and the draft is ready for manual review.",
			nextReview: {
				action: "review-draft",
				message:
					"Review the completed draft packet, personalize the answers, and keep submission manual.",
				resumeAllowed: false,
			},
			reportContext: createReportContext(),
			resumeAllowed: false,
			sessionId: "app-help-completed",
			sessionStatus: "completed",
			state: "completed",
			warnings: [],
		}),
		"app-help-launched": createSelectedSummary({
			draftPacket: null,
			job: {
				status: "pending",
				waitReason: null,
			},
			message:
				"The application-help run started and is waiting for the first staged draft packet.",
			nextReview: {
				action: "generate-draft",
				message:
					"Generate and stage the first structured draft packet for this application-help session.",
				resumeAllowed: false,
			},
			reportContext: createReportContext({
				pdfExists: false,
			}),
			resumeAllowed: false,
			sessionId: "app-help-launched",
			sessionStatus: "pending",
			state: "no-draft-yet",
			warnings: [
				{
					code: "missing-draft-packet",
					message:
						"No structured draft packet has been staged for this application-help session yet.",
				},
				{
					code: "missing-pdf-artifact",
					message:
						"Saved PDF output/cv-context-co-2026-04-22.pdf is missing from output/.",
				},
			],
		}),
	};
}

function createApplicationHelpPayload(state, requestUrl = "/application-help") {
	const url = new URL(requestUrl, "http://127.0.0.1");
	const requestedSessionId = url.searchParams.get("sessionId")?.trim() || null;

	if (state.mode === "empty") {
		return {
			filters: {
				sessionId: requestedSessionId,
			},
			generatedAt: "2026-04-22T01:10:00.000Z",
			message: "No application-help sessions have been created yet.",
			ok: true,
			selected: {
				message: "No application-help sessions have been created yet.",
				origin: "none",
				requestedSessionId,
				state: "empty",
				summary: null,
			},
			service: "jobhunt-api-scaffold",
			sessionId: STARTUP_SESSION_ID,
			status: "ready",
		};
	}

	const selectedSummary =
		(requestedSessionId && state.sessions[requestedSessionId]) ||
		state.sessions[state.latestSessionId] ||
		null;

	if (requestedSessionId && !selectedSummary) {
		return {
			filters: {
				sessionId: requestedSessionId,
			},
			generatedAt: "2026-04-22T01:10:00.000Z",
			message: `Application-help session ${requestedSessionId} was not found.`,
			ok: true,
			selected: {
				message: `Application-help session ${requestedSessionId} was not found.`,
				origin: "session-id",
				requestedSessionId,
				state: "missing",
				summary: null,
			},
			service: "jobhunt-api-scaffold",
			sessionId: STARTUP_SESSION_ID,
			status: "ready",
		};
	}

	const selectedSessionId =
		requestedSessionId ??
		state.latestSessionId ??
		selectedSummary?.session.sessionId;
	const selectionMessage = requestedSessionId
		? `Loaded application-help session ${selectedSessionId}.`
		: `Loaded the latest application-help session ${selectedSessionId}.`;

	return {
		filters: {
			sessionId: requestedSessionId,
		},
		generatedAt: "2026-04-22T01:10:00.000Z",
		message: selectionMessage,
		ok: true,
		selected: {
			message: selectionMessage,
			origin: requestedSessionId ? "session-id" : "latest",
			requestedSessionId,
			state: "ready",
			summary: selectedSummary,
		},
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "ready",
	};
}

function createApplicationHelpErrorPayload(message) {
	return {
		error: {
			code: "application-help-failed",
			message,
		},
		ok: false,
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
		status: "error",
	};
}

function toRunState(sessionStatus) {
	switch (sessionStatus) {
		case "completed":
			return "ready";
		case "failed":
			return "failed";
		case "waiting":
			return "waiting-for-approval";
		default:
			return "running";
	}
}

function toCommandSessionSummary(selectedSummary) {
	return {
		...selectedSummary.session,
		job: selectedSummary.job ?? null,
		latestFailure: selectedSummary.failure ?? null,
		pendingApproval: selectedSummary.approval ?? null,
		pendingApprovalCount: selectedSummary.approval ? 1 : 0,
		state: toRunState(selectedSummary.session.status),
	};
}

function createCommandPayload({ message, sessionId }) {
	const selectedSummary = createDefaultFixtures()[sessionId];
	const commandSession = toCommandSessionSummary(selectedSummary);

	return {
		generatedAt: "2026-04-22T01:12:00.000Z",
		handoff: {
			job: selectedSummary.job,
			message,
			pendingApproval: selectedSummary.approval,
			requestedAt: "2026-04-22T01:12:00.000Z",
			route: {
				message,
				missingCapabilities: [],
				requestKind: "launch",
				sessionId,
				specialistId: "research-specialist",
				status: "ready",
				workflow: "application-help",
			},
			runtime: {
				message: "Agent runtime ready.",
				model: "gpt-5.4-mini",
				modeRepoRelativePath: "modes/apply.md",
				startedAt: "2026-04-22T01:12:00.000Z",
				status: "ready",
				workflow: "application-help",
			},
			selectedSession: {
				approvals: selectedSummary.approval ? [selectedSummary.approval] : [],
				failure: selectedSummary.failure,
				jobs: selectedSummary.job ? [selectedSummary.job] : [],
				route: {
					message,
					missingCapabilities: [],
					specialistId: "research-specialist",
					status: "ready",
				},
				session: commandSession,
				timeline: [
					{
						approvalId: selectedSummary.approval?.approvalId ?? null,
						eventId: `event-${sessionId}`,
						eventType: "job-execution-started",
						jobId: selectedSummary.job?.jobId ?? null,
						level: "info",
						occurredAt: "2026-04-22T01:12:00.000Z",
						requestId: `request-${sessionId}`,
						sessionId,
						summary: message,
						traceId: `trace-${sessionId}`,
					},
				],
			},
			session: commandSession,
			specialist: {
				description:
					"Owns application-help drafting, review, and bounded context resolution.",
				id: "research-specialist",
				label: "Research Specialist",
			},
			state: selectedSummary.job?.status === "completed" ? "ready" : "running",
			toolingGap: null,
		},
		ok: true,
		service: "jobhunt-api-scaffold",
		sessionId: STARTUP_SESSION_ID,
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
		latestSessionId: "app-help-completed",
		mode: "ready",
		sessions: createDefaultFixtures(),
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

		if (requestUrl.pathname === "/application-help") {
			if (state.mode === "slow") {
				await delay(900);
			}

			if (state.mode === "error") {
				response.writeHead(500, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createApplicationHelpErrorPayload(
							"Application-help review failed before the summary could load.",
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
					createApplicationHelpPayload(
						state,
						request.url ?? "/application-help",
					),
					null,
					2,
				),
			);
			return;
		}

		if (requestUrl.pathname === "/orchestration" && request.method === "POST") {
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

			if (body.kind === "resume") {
				response.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
				});
				response.end(
					JSON.stringify(
						createCommandPayload({
							message: "Resumed application-help review from the workspace.",
							sessionId: body.sessionId,
						}),
						null,
						2,
					),
				);
				return;
			}

			state.sessions["app-help-launched"] =
				createDefaultFixtures()["app-help-launched"];
			state.latestSessionId = "app-help-launched";

			response.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
			});
			response.end(
				JSON.stringify(
					createCommandPayload({
						message: "Launched application-help review from the workspace.",
						sessionId: "app-help-launched",
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
					sessionId: STARTUP_SESSION_ID,
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
		throw new Error("Failed to start the fake application-help API.");
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
			state.latestSessionId = "app-help-completed";
			state.mode = "ready";
			state.sessions = createDefaultFixtures();
		},
		setMode(mode) {
			state.mode = mode;
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
		await page.goto(`${webUrl}/apply`, {
			waitUntil: "networkidle",
		});

		await page
			.getByRole("heading", { name: "Application-help workspace", exact: true })
			.waitFor();
		await page
			.getByText("The application-help run completed and the draft is ready")
			.first()
			.waitFor();
		assert.match(page.url(), /applicationHelpSessionId=app-help-completed/);

		await page.goto(
			`${webUrl}/apply?applicationHelpSessionId=app-help-draft-ready`,
			{
				waitUntil: "networkidle",
			},
		);
		await page.getByText("Draft ready").first().waitFor();
		await page.getByText("What makes you a strong fit?").waitFor();

		await page.goto(
			`${webUrl}/apply?applicationHelpSessionId=app-help-paused`,
			{
				waitUntil: "networkidle",
			},
		);
		await page.getByText("Approval paused").first().waitFor();
		await page
			.getByText("Approval approval-app-help-paused is pending.")
			.first()
			.waitFor();

		await page.goto(
			`${webUrl}/apply?applicationHelpSessionId=app-help-rejected`,
			{
				waitUntil: "networkidle",
			},
		);
		await page.getByText("Failure detail").waitFor();
		await page.getByText("Please revise the proof points.").first().waitFor();

		await page.goto(
			`${webUrl}/apply?applicationHelpSessionId=app-help-resumed`,
			{
				waitUntil: "networkidle",
			},
		);
		await page
			.getByText("Resume the existing application-help session")
			.first()
			.waitFor();

		fakeApi.setMode("slow");
		const loadingPage = await browser.newPage();
		await loadingPage.goto(`${webUrl}/apply`);
		await loadingPage.getByText("Loading application-help workspace").waitFor();
		await loadingPage.close();

		fakeApi.setMode("empty");
		const emptyPage = await browser.newPage();
		await emptyPage.goto(`${webUrl}/apply`, {
			waitUntil: "networkidle",
		});
		await emptyPage
			.getByText("No application-help sessions have been created yet.")
			.first()
			.waitFor();
		await emptyPage.close();

		fakeApi.setMode("error");
		const errorPage = await browser.newPage();
		await errorPage.goto(`${webUrl}/apply`, {
			waitUntil: "networkidle",
		});
		await errorPage.getByText("Application-help workspace warning").waitFor();
		await errorPage
			.getByText(
				"Application-help review failed before the summary could load.",
			)
			.waitFor();
		await errorPage.close();

		fakeApi.reset();
		await page.goto(
			`${webUrl}/apply?applicationHelpSessionId=app-help-completed`,
			{
				waitUntil: "networkidle",
			},
		);
		await page.route("**/application-help*", async (route) => {
			await route.abort("failed");
		});
		await page
			.getByRole("button", { name: "Refresh application-help workspace" })
			.click();
		await page
			.getByText("Showing the last application-help snapshot")
			.waitFor();
		await page
			.getByText(
				"Application-help summary endpoint is unavailable. Start the local API server and try again.",
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

console.log("Application-help workspace smoke checks passed.");

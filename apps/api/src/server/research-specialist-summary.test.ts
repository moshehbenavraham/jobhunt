import assert from "node:assert/strict";
import test from "node:test";
import type {
	AgentRuntimeBootstrap,
	AgentRuntimeService,
} from "../agent-runtime/index.js";
import { WORKFLOW_INTENTS } from "../prompt/prompt-types.js";
import { createApiServiceContainer } from "../runtime/service-container.js";
import type {
	OperationalStore,
	RuntimeJobStatus,
	RuntimeJobWaitReason,
	RuntimeSessionStatus,
} from "../store/index.js";
import { createWorkspaceFixture } from "../workspace/test-utils.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import { createResearchSpecialistSummary } from "./research-specialist-summary.js";

function createReadyAgentRuntime(repoRoot: string): AgentRuntimeService {
	return {
		async bootstrap(): Promise<AgentRuntimeBootstrap> {
			throw new Error(
				"bootstrap is not used by research-specialist summary tests",
			);
		},
		async close() {},
		async getReadiness() {
			return {
				auth: {
					accountId: "acct-research-specialist-test",
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
					originator: "research-specialist-summary-test",
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
					modeRepoRelativePath: "modes/deep.md",
					requestedWorkflow: "deep-company-research",
					state: "ready" as const,
					supportedWorkflows: WORKFLOW_INTENTS,
					workflow: "deep-company-research" as const,
				},
				status: "ready" as const,
			};
		},
	};
}

async function createReadyFixture(extraFiles: Record<string, string> = {}) {
	return createWorkspaceFixture({
		directories: ["output", "reports"],
		files: {
			"config/portals.yml": "title_filter:\n  positive: []\n",
			"config/profile.yml": "full_name: Test User\n",
			"interview-prep/story-bank.example.md": "# Story Bank Example\n",
			"modes/_profile.md": "# Profile\n",
			"profile/cv.md": "# CV\n",
			...extraFiles,
		},
	});
}

function createContext(
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
) {
	return {
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
		storyBank:
			mode === "interview-prep"
				? {
						exists: true,
						repoRelativePath: "interview-prep/story-bank.example.md",
						source: "story-bank-example" as const,
					}
				: null,
		subject: input.subject ?? null,
	};
}

async function saveResearchSpecialistSession(
	store: OperationalStore,
	input: {
		activeJobId?: string | null;
		context?: JsonValue;
		sessionId: string;
		status: RuntimeSessionStatus;
		timestamp: string;
		workflow:
			| "deep-company-research"
			| "interview-prep"
			| "linkedin-outreach"
			| "project-review"
			| "training-review";
	},
): Promise<void> {
	await store.sessions.save({
		activeJobId: input.activeJobId ?? null,
		context: input.context ?? {
			workflow: input.workflow,
		},
		createdAt: input.timestamp,
		lastHeartbeatAt: input.timestamp,
		runnerId:
			input.status === "pending" || input.activeJobId === null
				? null
				: "runner-research-specialist-summary-test",
		sessionId: input.sessionId,
		status: input.status,
		updatedAt: input.timestamp,
		workflow: input.workflow,
	});
}

async function saveResearchSpecialistJob(
	store: OperationalStore,
	input: {
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
	},
): Promise<void> {
	const isActive = input.status === "running" || input.status === "waiting";

	await store.jobs.save({
		attempt: 1,
		claimOwnerId: isActive ? "runner-research-specialist-summary-test" : null,
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
}

async function saveApproval(
	store: OperationalStore,
	input: {
		approvalId: string;
		jobId: string;
		sessionId: string;
		status: "approved" | "pending" | "rejected";
		timestamp: string;
		title: string;
	},
): Promise<void> {
	await store.approvals.save({
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
}

async function saveFailureEvent(
	store: OperationalStore,
	input: {
		jobId: string;
		message: string;
		sessionId: string;
		timestamp: string;
	},
): Promise<void> {
	await store.events.save({
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
}

async function stageResearchPacket(
	services: ReturnType<typeof createApiServiceContainer>,
	sessionId: string,
	input: JsonValue,
): Promise<void> {
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
}

test("research-specialist summary falls back to deep-company-research with a missing-input state when no sessions exist", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});

	try {
		const payload = await createResearchSpecialistSummary(services);

		assert.equal(payload.status, "ready");
		assert.equal(payload.selected.origin, "catalog");
		assert.equal(
			payload.selected.summary?.workflow.mode,
			"deep-company-research",
		);
		assert.equal(payload.selected.summary?.state, "missing-input");
		assert.equal(
			payload.selected.summary?.nextAction.action,
			"launch-workflow",
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("research-specialist summary applies waiting approval overlays and stale-selection recovery", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveResearchSpecialistSession(store, {
		activeJobId: "job-interview-waiting",
		context: {
			company: "Context Co",
			role: "Applied AI Engineer",
		},
		sessionId: "interview-waiting",
		status: "waiting",
		timestamp: "2026-04-22T09:10:00.000Z",
		workflow: "interview-prep",
	});
	await saveResearchSpecialistJob(store, {
		jobId: "job-interview-waiting",
		sessionId: "interview-waiting",
		status: "waiting",
		timestamp: "2026-04-22T09:10:00.000Z",
		waitApprovalId: "approval-interview-waiting",
		waitReason: "approval",
		workflow: "interview-prep",
	});
	await saveApproval(store, {
		approvalId: "approval-interview-waiting",
		jobId: "job-interview-waiting",
		sessionId: "interview-waiting",
		status: "pending",
		timestamp: "2026-04-22T09:10:00.000Z",
		title: "Review interview prep scope",
	});
	await stageResearchPacket(services, "interview-waiting", {
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
		sessionId: "interview-waiting",
		storyBankGaps: ["Need one conflict-resolution story"],
		technicalChecklist: [
			{
				reason: "Practical system design focus",
				topic: "Production LLM reliability",
			},
		],
		warnings: [],
	});

	try {
		const waitingPayload = await createResearchSpecialistSummary(services, {
			mode: "interview-prep",
		});

		assert.equal(waitingPayload.selected.origin, "mode");
		assert.equal(waitingPayload.selected.summary?.state, "approval-paused");
		assert.equal(waitingPayload.selected.summary?.approval?.status, "pending");
		assert.equal(
			waitingPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "approval-paused",
			),
			true,
		);

		const stalePayload = await createResearchSpecialistSummary(services, {
			mode: "training-review",
			sessionId: "interview-waiting",
		});
		assert.equal(stalePayload.selected.state, "missing");
		assert.equal(
			stalePayload.selected.summary?.workflow.mode,
			"training-review",
		);
		assert.equal(
			stalePayload.selected.summary?.warnings.some(
				(warning) => warning.code === "stale-selection",
			),
			true,
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

test("research-specialist summary covers completed, rejected, resumed, and no-packet-yet outcomes across the workflow family", async () => {
	const fixture = await createReadyFixture();
	const services = createApiServiceContainer({
		agentRuntime: createReadyAgentRuntime(fixture.repoRoot),
		repoRoot: fixture.repoRoot,
	});
	const store = await services.operationalStore.getStore();

	await saveResearchSpecialistSession(store, {
		activeJobId: "job-deep-completed",
		context: {
			company: "Context Co",
			role: "Applied AI Engineer",
		},
		sessionId: "deep-completed",
		status: "completed",
		timestamp: "2026-04-22T10:00:00.000Z",
		workflow: "deep-company-research",
	});
	await saveResearchSpecialistJob(store, {
		jobId: "job-deep-completed",
		sessionId: "deep-completed",
		status: "completed",
		timestamp: "2026-04-22T10:00:00.000Z",
		workflow: "deep-company-research",
	});
	await stageResearchPacket(services, "deep-completed", {
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
		sessionId: "deep-completed",
		sources: [
			{
				label: "Company blog",
				note: "Mentions applied AI",
				url: "https://example.com/blog",
			},
		],
		warnings: [],
	});

	await saveResearchSpecialistSession(store, {
		activeJobId: "job-outreach-rejected",
		context: {
			company: "Context Co",
			role: "Applied AI Engineer",
		},
		sessionId: "outreach-rejected",
		status: "failed",
		timestamp: "2026-04-22T10:05:00.000Z",
		workflow: "linkedin-outreach",
	});
	await saveResearchSpecialistJob(store, {
		error: {
			message: "Needs revised message.",
		},
		jobId: "job-outreach-rejected",
		sessionId: "outreach-rejected",
		status: "failed",
		timestamp: "2026-04-22T10:05:00.000Z",
		workflow: "linkedin-outreach",
	});
	await saveApproval(store, {
		approvalId: "approval-outreach-rejected",
		jobId: "job-outreach-rejected",
		sessionId: "outreach-rejected",
		status: "rejected",
		timestamp: "2026-04-22T10:05:00.000Z",
		title: "Review outreach draft",
	});
	await stageResearchPacket(services, "outreach-rejected", {
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
		sessionId: "outreach-rejected",
		warnings: [],
	});

	await saveResearchSpecialistSession(store, {
		activeJobId: "job-training-resumed",
		context: {
			subject: "LLM evals certification",
		},
		sessionId: "training-resumed",
		status: "running",
		timestamp: "2026-04-22T10:10:00.000Z",
		workflow: "training-review",
	});
	await saveResearchSpecialistJob(store, {
		jobId: "job-training-resumed",
		sessionId: "training-resumed",
		status: "running",
		timestamp: "2026-04-22T10:10:00.000Z",
		workflow: "training-review",
	});
	await saveFailureEvent(store, {
		jobId: "job-training-resumed",
		message: "Earlier run timed out before retry.",
		sessionId: "training-resumed",
		timestamp: "2026-04-22T10:09:00.000Z",
	});
	await stageResearchPacket(services, "training-resumed", {
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
		sessionId: "training-resumed",
		trainingTitle: "LLM evals certification",
		verdict: "do-it",
		warnings: [],
	});

	await saveResearchSpecialistSession(store, {
		context: {
			subject: "AI portfolio project",
		},
		sessionId: "project-no-packet",
		status: "completed",
		timestamp: "2026-04-22T10:12:00.000Z",
		workflow: "project-review",
	});

	try {
		const completedPayload = await createResearchSpecialistSummary(services, {
			sessionId: "deep-completed",
		});
		assert.equal(completedPayload.selected.summary?.state, "completed");

		const rejectedPayload = await createResearchSpecialistSummary(services, {
			sessionId: "outreach-rejected",
		});
		assert.equal(rejectedPayload.selected.summary?.state, "rejected");
		assert.equal(
			rejectedPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "manual-send-required",
			),
			true,
		);

		const resumedPayload = await createResearchSpecialistSummary(services, {
			sessionId: "training-resumed",
		});
		assert.equal(resumedPayload.selected.summary?.state, "resumed");
		assert.equal(resumedPayload.selected.summary?.run.state, "running");
		assert.equal(
			resumedPayload.selected.summary?.warnings.some(
				(warning) => warning.code === "recent-failure",
			),
			true,
		);

		const noPacketPayload = await createResearchSpecialistSummary(services, {
			sessionId: "project-no-packet",
		});
		assert.equal(noPacketPayload.selected.summary?.state, "no-packet-yet");
		assert.equal(
			noPacketPayload.selected.summary?.nextAction.action,
			"stage-packet",
		);
	} finally {
		await services.dispose();
		await fixture.cleanup();
	}
});

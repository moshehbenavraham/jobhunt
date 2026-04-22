import assert from "node:assert/strict";
import test from "node:test";
import { createResearchSpecialistTools } from "./research-specialist-tools.js";
import { createToolHarness } from "./test-utils.js";

function getOutput<T>(result: unknown): T {
	return (result as { output?: unknown }).output as T;
}

function getWarnings(
	result: unknown,
): Array<{ code: string; message: string }> {
	return ((result as { warnings?: Array<{ code: string; message: string }> })
		.warnings ?? []) as Array<{ code: string; message: string }>;
}

function createCorrelation(
	toolName: string,
	sessionId = `session-${toolName}`,
) {
	return {
		jobId: `job-${toolName}-${sessionId}`,
		requestId: `request-${toolName}-${sessionId}`,
		sessionId,
		traceId: `trace-${toolName}-${sessionId}`,
	};
}

function createContext(
	mode:
		| "deep-company-research"
		| "interview-prep"
		| "linkedin-outreach"
		| "project-review"
		| "training-review",
	input: Partial<{
		artifactName: string | null;
		company: string | null;
		role: string | null;
		subject: string | null;
	}> = {},
) {
	return {
		artifactName: input.artifactName ?? null,
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

test("research-specialist context resolution matches saved reports and detects story-bank fallback", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"interview-prep/story-bank.example.md": "# Story Bank Example\n",
			"output/cv-context-co-2026-04-22.pdf": "pdf\n",
			"reports/021-context-co-2026-04-22.md": [
				"# Evaluation: Context Co -- Applied AI Engineer",
				"",
				"**Date:** 2026-04-22",
				"**URL:** https://example.com/jobs/context-co",
				"**Score:** 4.4/5",
				"**Legitimacy:** High Confidence",
				"**PDF:** output/cv-context-co-2026-04-22.pdf",
				"",
				"---",
				"",
			].join("\n"),
		},
		tools: createResearchSpecialistTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation(
				"resolve-research-specialist-context",
				"interview-context",
			),
			input: {
				artifactName: null,
				company: null,
				mode: "interview-prep",
				pdfPath: null,
				reportNumber: "021",
				reportPath: null,
				role: null,
				sessionId: "interview-context",
				subject: null,
			},
			toolName: "resolve-research-specialist-context",
		});

		assert.equal(result.status, "completed");
		const output = getOutput<{
			context: {
				company: string | null;
				reportContext: {
					reportRepoRelativePath: string;
					reportNumber: string | null;
					role: string | null;
				} | null;
				role: string | null;
				storyBank: {
					repoRelativePath: string | null;
					source: string;
				} | null;
			};
			status: string;
		}>(result);

		assert.equal(output.status, "resolved");
		assert.equal(output.context.company, "Context Co");
		assert.equal(output.context.role, "Applied AI Engineer");
		assert.equal(
			output.context.reportContext?.reportRepoRelativePath,
			"reports/021-context-co-2026-04-22.md",
		);
		assert.equal(output.context.reportContext?.reportNumber, "021");
		assert.equal(output.context.storyBank?.source, "story-bank-example");
		assert.equal(
			output.context.storyBank?.repoRelativePath,
			"interview-prep/story-bank.example.md",
		);
		assert.equal(
			getWarnings(result).some(
				(warning) => warning.code === "story-bank-missing",
			),
			true,
		);
	} finally {
		await harness.cleanup();
	}
});

test("research-specialist context resolution reports missing-input when no training topic or saved context exists", async () => {
	const harness = await createToolHarness({
		tools: createResearchSpecialistTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation(
				"resolve-research-specialist-context",
				"training-missing",
			),
			input: {
				artifactName: null,
				company: null,
				mode: "training-review",
				pdfPath: null,
				reportNumber: null,
				reportPath: null,
				role: null,
				sessionId: "training-missing",
				subject: null,
			},
			toolName: "resolve-research-specialist-context",
		});

		assert.equal(result.status, "completed");
		const output = getOutput<{ status: string }>(result);

		assert.equal(output.status, "missing-input");
		assert.equal(
			getWarnings(result).some((warning) => warning.code === "missing-context"),
			true,
		);
	} finally {
		await harness.cleanup();
	}
});

test("research-specialist packet staging is idempotent and load returns the latest deep-research packet", async () => {
	const harness = await createToolHarness({
		tools: createResearchSpecialistTools(),
	});

	try {
		const sessionId = "deep-session";
		const stageInput = {
			context: createContext("deep-company-research", {
				company: "Context Co",
				role: "Applied AI Engineer",
			}),
			message: "Deep research packet ready.",
			mode: "deep-company-research" as const,
			resultStatus: "ready" as const,
			sections: {
				aiStrategy: ["Production AI assistant"],
				candidateAngle: ["Bring applied delivery experience"],
				competitors: ["Rival Co"],
				engineeringCulture: ["Fast shipping cadence"],
				likelyChallenges: ["Latency under load"],
				recentMoves: ["Recent platform launch"],
			},
			sessionId,
			sources: [
				{
					label: "Engineering Blog",
					note: "Mentions LLM product rollout.",
					url: "https://example.com/blog/ai-rollout",
				},
			],
			warnings: [],
		};

		const firstStage = await harness.service.execute({
			correlation: createCorrelation(
				"stage-research-specialist-packet",
				sessionId,
			),
			input: stageInput,
			toolName: "stage-research-specialist-packet",
		});
		assert.equal(firstStage.status, "completed");
		assert.equal(getOutput<{ status: string }>(firstStage).status, "staged");

		const secondStage = await harness.service.execute({
			correlation: createCorrelation(
				"stage-research-specialist-packet-repeat",
				sessionId,
			),
			input: stageInput,
			toolName: "stage-research-specialist-packet",
		});
		assert.equal(secondStage.status, "completed");
		assert.equal(
			getOutput<{ status: string }>(secondStage).status,
			"already-staged",
		);

		const loadResult = await harness.service.execute({
			correlation: createCorrelation(
				"load-research-specialist-packet",
				sessionId,
			),
			input: {
				mode: "deep-company-research",
				sessionId,
			},
			toolName: "load-research-specialist-packet",
		});

		assert.equal(loadResult.status, "completed");
		const output = getOutput<{
			packet: {
				mode: string;
				resultStatus: string;
				sections: {
					aiStrategy: string[];
				};
			} | null;
			status: string;
		}>(loadResult);

		assert.equal(output.status, "loaded");
		assert.equal(output.packet?.mode, "deep-company-research");
		assert.equal(output.packet?.resultStatus, "ready");
		assert.deepEqual(output.packet?.sections.aiStrategy, [
			"Production AI assistant",
		]);
	} finally {
		await harness.cleanup();
	}
});

test("research-specialist staging rejects mixed workflow packets for the same session", async () => {
	const harness = await createToolHarness({
		tools: createResearchSpecialistTools(),
	});

	try {
		const sessionId = "mixed-session";
		const firstStage = await harness.service.execute({
			correlation: createCorrelation(
				"stage-research-specialist-packet-first",
				sessionId,
			),
			input: {
				betterAlternative: null,
				context: createContext("project-review", {
					subject: "AI portfolio project",
				}),
				dimensions: [
					{
						dimension: "Signal",
						rationale: "Directly relevant",
						score: 5,
					},
				],
				message: "Project review packet ready.",
				milestones: [
					{
						deliverable: "Ship MVP demo",
						label: "Week 1",
					},
				],
				mode: "project-review" as const,
				projectTitle: "AI observability dashboard",
				resultStatus: "ready" as const,
				sessionId,
				verdict: "build" as const,
				warnings: [],
			},
			toolName: "stage-research-specialist-packet",
		});
		assert.equal(firstStage.status, "completed");

		const secondStage = await harness.service.execute({
			correlation: createCorrelation(
				"stage-research-specialist-packet-second",
				sessionId,
			),
			input: {
				alternativeTargets: [],
				characterCount: 120,
				context: createContext("linkedin-outreach", {
					company: "Context Co",
					role: "Applied AI Engineer",
				}),
				language: "English",
				message: "LinkedIn outreach packet ready.",
				messageDraft: "Hi there - reaching out about the role.",
				mode: "linkedin-outreach" as const,
				primaryTarget: {
					name: "Hiring Manager",
					profileUrl: null,
					title: "Director of AI",
					type: "hiring-manager" as const,
				},
				resultStatus: "ready" as const,
				sessionId,
				warnings: [],
			},
			toolName: "stage-research-specialist-packet",
		});

		assert.equal(secondStage.status, "failed");
		assert.equal(secondStage.error.code, "tool-invalid-input");
	} finally {
		await harness.cleanup();
	}
});

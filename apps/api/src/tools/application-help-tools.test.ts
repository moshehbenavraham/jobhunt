import assert from "node:assert/strict";
import test from "node:test";
import {
	createApplicationHelpTools,
	loadLatestApplicationHelpDraftPacket,
} from "./application-help-tools.js";
import { createToolHarness } from "./test-utils.js";

type ResolveApplicationHelpContextOutput = {
	matchedContext: {
		company: string | null;
		coverLetter: {
			state: string;
		};
		existingDraft: {
			itemCount: number;
			items: Array<{
				answer: string;
				question: string;
			}>;
		};
		matchState: string;
		pdf: {
			exists: boolean;
			repoRelativePath: string | null;
		};
		reportNumber: string | null;
		reportRepoRelativePath: string;
		role: string | null;
	} | null;
	status: string;
};

type StageApplicationHelpDraftOutput = {
	draftPacket: {
		fingerprint: string;
		itemCount: number;
		repoRelativePath: string;
		revision: number;
		sessionId: string;
	};
	status: string;
};

function getOutput<T>(result: unknown): T {
	return (result as { output?: unknown }).output as T;
}

function getWarnings(
	result: unknown,
): Array<{ code: string; message: string }> {
	return ((result as { warnings?: Array<{ code: string; message: string }> })
		.warnings ?? []) as Array<{ code: string; message: string }>;
}

function createCorrelation(toolName: string) {
	return {
		jobId: `job-${toolName}`,
		requestId: `request-${toolName}`,
		sessionId: `session-${toolName}`,
		traceId: `trace-${toolName}`,
	};
}

const BASE_REPORT_LINES = [
	"# Evaluation: Context Co -- Applied AI Engineer",
	"",
	"**Date:** 2026-04-22",
	"**URL:** https://example.com/jobs/context-co",
	"**Archetype:** Applied AI",
	"**Score:** 4.4/5",
	"**Legitimacy:** High Confidence",
	"**PDF:** output/cv-context-co-2026-04-22.pdf",
	"",
	"---",
	"",
];

test("application-help context resolution matches saved reports and extracts draft answers", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"output/cv-context-co-2026-04-22.pdf": "pdf\n",
			"reports/021-context-co-2026-04-22.md": [
				...BASE_REPORT_LINES,
				"## H) Draft Application Answers",
				"",
				"A cover-letter field is present in the application form. Keep it as a manual follow-up item until the cover-letter workflow exists.",
				"",
				"### 1. Why this role?",
				"",
				"Because it fits my production AI delivery work.",
				"",
				"### 2. Most relevant project?",
				"",
				"Shipping customer-facing automation systems end to end.",
				"",
			].join("\n"),
		},
		tools: createApplicationHelpTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("resolve-application-help-context"),
			input: {
				artifactName: null,
				company: null,
				pdfPath: null,
				reportNumber: "021",
				reportPath: null,
				role: null,
			},
			toolName: "resolve-application-help-context",
		});

		assert.equal(result.status, "completed");
		const output = getOutput<ResolveApplicationHelpContextOutput>(result);

		assert.equal(output.status, "resolved");
		assert.equal(output.matchedContext?.matchState, "exact");
		assert.equal(
			output.matchedContext?.reportRepoRelativePath,
			"reports/021-context-co-2026-04-22.md",
		);
		assert.equal(output.matchedContext?.reportNumber, "021");
		assert.equal(output.matchedContext?.company, "Context Co");
		assert.equal(output.matchedContext?.role, "Applied AI Engineer");
		assert.equal(
			output.matchedContext?.pdf.repoRelativePath,
			"output/cv-context-co-2026-04-22.pdf",
		);
		assert.equal(output.matchedContext?.pdf.exists, true);
		assert.equal(output.matchedContext?.existingDraft.itemCount, 2);
		assert.match(
			output.matchedContext?.existingDraft.items[0]?.answer ?? "",
			/production AI delivery work/i,
		);
		assert.equal(output.matchedContext?.coverLetter.state, "manual-follow-up");

		const warnings = getWarnings(result);
		assert.equal(
			warnings.some(
				(warning) => warning.code === "cover-letter-manual-follow-up",
			),
			true,
		);
	} finally {
		await harness.cleanup();
	}
});

test("application-help context resolution reports missing-context when no hints are provided", async () => {
	const harness = await createToolHarness({
		tools: createApplicationHelpTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("resolve-application-help-context"),
			input: {
				artifactName: null,
				company: null,
				pdfPath: null,
				reportNumber: null,
				reportPath: null,
				role: null,
			},
			toolName: "resolve-application-help-context",
		});

		assert.equal(result.status, "completed");
		const output = getOutput<ResolveApplicationHelpContextOutput>(result);

		assert.equal(output.status, "missing-context");
		assert.equal(output.matchedContext, null);
		assert.equal(
			getWarnings(result).some((warning) => warning.code === "missing-context"),
			true,
		);
	} finally {
		await harness.cleanup();
	}
});

test("application-help context resolution warns on ambiguous fuzzy matches and missing PDFs", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"reports/030-context-co-2026-04-21.md": [
				"# Evaluation: Context Co -- Platform Engineer",
				"",
				"**Date:** 2026-04-21",
				"**URL:** https://example.com/jobs/context-old",
				"**Score:** 4.1/5",
				"**Legitimacy:** Proceed with Caution",
				"**PDF:** output/cv-context-old-2026-04-21.pdf",
				"",
				"---",
				"",
			].join("\n"),
			"reports/031-context-co-2026-04-22.md": [
				"# Evaluation: Context Co -- Platform Engineer",
				"",
				"**Date:** 2026-04-22",
				"**URL:** https://example.com/jobs/context-new",
				"**Score:** 4.2/5",
				"**Legitimacy:** High Confidence",
				"**PDF:** output/cv-context-new-2026-04-22.pdf",
				"",
				"---",
				"",
			].join("\n"),
		},
		tools: createApplicationHelpTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("resolve-application-help-context"),
			input: {
				artifactName: null,
				company: "Context Co",
				pdfPath: null,
				reportNumber: null,
				reportPath: null,
				role: "Platform Engineer",
			},
			toolName: "resolve-application-help-context",
		});

		assert.equal(result.status, "completed");
		const output = getOutput<ResolveApplicationHelpContextOutput>(result);

		assert.equal(
			output.matchedContext?.reportRepoRelativePath,
			"reports/031-context-co-2026-04-22.md",
		);
		assert.equal(output.matchedContext?.matchState, "fuzzy");

		const warnings = getWarnings(result);
		assert.equal(
			warnings.some((warning) => warning.code === "ambiguous-report-match"),
			true,
		);
		assert.equal(
			warnings.some((warning) => warning.code === "missing-pdf-artifact"),
			true,
		);
	} finally {
		await harness.cleanup();
	}
});

test("application-help draft staging is idempotent on repeat input and latest-packet reads return the newest revision", async () => {
	const harness = await createToolHarness({
		tools: createApplicationHelpTools(),
	});

	try {
		const firstDraft = await harness.service.execute({
			correlation: createCorrelation("stage-application-help-draft"),
			input: {
				company: "Context Co",
				items: [
					{
						answer: "First draft answer.",
						question: "Why this role?",
					},
				],
				matchedContext: null,
				reviewNotes: "Needs polish.",
				role: "Applied AI Engineer",
				sessionId: "application-help-session",
				warnings: ["Use stronger proof points."],
			},
			toolName: "stage-application-help-draft",
		});

		assert.equal(firstDraft.status, "completed");
		const firstOutput = getOutput<StageApplicationHelpDraftOutput>(firstDraft);
		assert.equal(firstOutput.status, "staged");
		assert.equal(firstOutput.draftPacket.revision, 1);
		assert.equal(firstOutput.draftPacket.itemCount, 1);

		const repeatedDraft = await harness.service.execute({
			correlation: {
				...createCorrelation("stage-application-help-draft"),
				requestId: "request-stage-application-help-draft-repeat",
			},
			input: {
				company: "Context Co",
				items: [
					{
						answer: "First draft answer.",
						question: "Why this role?",
					},
				],
				matchedContext: null,
				reviewNotes: "Needs polish.",
				role: "Applied AI Engineer",
				sessionId: "application-help-session",
				warnings: ["Use stronger proof points."],
			},
			toolName: "stage-application-help-draft",
		});

		assert.equal(repeatedDraft.status, "completed");
		const repeatedOutput =
			getOutput<StageApplicationHelpDraftOutput>(repeatedDraft);
		assert.equal(repeatedOutput.status, "already-staged");
		assert.equal(
			repeatedOutput.draftPacket.repoRelativePath,
			firstOutput.draftPacket.repoRelativePath,
		);

		harness.clock.advanceMs(1_000);

		const revisedDraft = await harness.service.execute({
			correlation: {
				...createCorrelation("stage-application-help-draft"),
				requestId: "request-stage-application-help-draft-revised",
			},
			input: {
				company: "Context Co",
				items: [
					{
						answer: "Revised answer with stronger proof points.",
						question: "Why this role?",
					},
				],
				matchedContext: null,
				reviewNotes: "Sharper revision.",
				role: "Applied AI Engineer",
				sessionId: "application-help-session",
				warnings: [],
			},
			toolName: "stage-application-help-draft",
		});

		const revisedOutput =
			getOutput<StageApplicationHelpDraftOutput>(revisedDraft);
		assert.equal(revisedOutput.status, "staged");
		assert.equal(revisedOutput.draftPacket.revision, 2);

		const latestPacket = await loadLatestApplicationHelpDraftPacket(
			{
				sessionId: "application-help-session",
			},
			{
				repoRoot: harness.fixture.repoRoot,
			},
		);

		assert.equal(latestPacket?.revision, 2);
		assert.equal(latestPacket?.itemCount, 1);
		assert.match(
			latestPacket?.repoRelativePath ?? "",
			/\.jobhunt-app\/application-help\/application-help-session\//,
		);
	} finally {
		await harness.cleanup();
	}
});

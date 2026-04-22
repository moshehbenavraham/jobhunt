import assert from "node:assert/strict";
import test from "node:test";
import { createToolHarness } from "./test-utils.js";
import {
	createTrackerSpecialistTools,
	loadTrackerSpecialistPacket,
} from "./tracker-specialist-tools.js";

type TrackerSpecialistToolOutput = {
	message: string;
	packet: {
		message: string;
		mode: string;
		offers?: Array<{
			label: string | null;
			reportNumber: string | null;
			trackerEntryNumber: number | null;
		}>;
		resultStatus: string;
		warnings: Array<{
			code: string;
			message: string;
		}>;
	};
	status: string;
};

function createCorrelation(
	toolName: string,
	sessionId = `session-${toolName}`,
) {
	return {
		jobId: `job-${toolName}`,
		requestId: `request-${toolName}`,
		sessionId,
		traceId: `trace-${toolName}`,
	};
}

function getOutput(result: unknown): TrackerSpecialistToolOutput {
	return (result as { output: TrackerSpecialistToolOutput }).output;
}

test("compare-offers context resolution matches saved reports from tracker rows and explicit hints", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"data/applications.md": [
				"# Applications Tracker",
				"",
				"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
				"| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
				"| 3 | 2026-04-20 | Atlas Labs | Staff AI Engineer | 4.7/5 | Offer | output/atlas.pdf | [041](reports/041-atlas-labs-2026-04-20.md) | contact |",
				"| 7 | 2026-04-21 | Beacon AI | Principal Platform Engineer | 4.5/5 | Offer | output/beacon.pdf | [042](reports/042-beacon-ai-2026-04-21.md) | contact |",
				"",
			].join("\n"),
			"output/atlas.pdf": "pdf\n",
			"output/beacon.pdf": "pdf\n",
			"reports/041-atlas-labs-2026-04-20.md": [
				"# Evaluation: Atlas Labs -- Staff AI Engineer",
				"",
				"**Date:** 2026-04-20",
				"**URL:** https://example.com/atlas",
				"**Score:** 4.7/5",
				"**Legitimacy:** High Confidence",
				"**PDF:** output/atlas.pdf",
				"",
				"---",
				"",
			].join("\n"),
			"reports/042-beacon-ai-2026-04-21.md": [
				"# Evaluation: Beacon AI -- Principal Platform Engineer",
				"",
				"**Date:** 2026-04-21",
				"**URL:** https://example.com/beacon",
				"**Score:** 4.5/5",
				"**Legitimacy:** Proceed with Caution",
				"**PDF:** output/beacon.pdf",
				"",
				"---",
				"",
			].join("\n"),
		},
		tools: createTrackerSpecialistTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("resolve-compare-offers-context"),
			input: {
				limit: 4,
				offers: [
					{
						company: null,
						entryNumber: 3,
						label: "Atlas",
						reportNumber: null,
						reportPath: null,
						role: null,
					},
					{
						company: "Beacon AI",
						entryNumber: null,
						label: "Beacon",
						reportNumber: "042",
						reportPath: null,
						role: "Principal Platform Engineer",
					},
				],
			},
			toolName: "resolve-compare-offers-context",
		});

		assert.equal(result.status, "completed");
		const output = getOutput(result);

		assert.equal(output.status, "staged");
		assert.equal(output.packet.mode, "compare-offers");
		assert.equal(output.packet.resultStatus, "ready");
		assert.equal(output.packet.offers?.length, 2);
		assert.equal(output.packet.offers?.[0]?.label, "Atlas");
		assert.equal(output.packet.offers?.[0]?.trackerEntryNumber, 3);
		assert.equal(output.packet.offers?.[1]?.reportNumber, "042");

		const stored = await loadTrackerSpecialistPacket(
			{
				mode: "compare-offers",
				sessionId: "session-resolve-compare-offers-context",
			},
			{
				repoRoot: harness.fixture.repoRoot,
			},
		);

		assert.equal(stored?.mode, "compare-offers");
		assert.equal(stored?.resultStatus, "ready");
	} finally {
		await harness.cleanup();
	}
});

test("follow-up cadence normalization stages a bounded ready packet", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/followup-cadence.mjs": [
				"process.stdout.write(JSON.stringify({",
				"  metadata: {",
				"    analysisDate: '2026-04-22',",
				"    totalTracked: 6,",
				"    actionable: 3,",
				"    overdue: 1,",
				"    urgent: 1,",
				"    cold: 0,",
				"    waiting: 1",
				"  },",
				"  entries: [",
				"    {",
				"      num: 8,",
				"      date: '2026-04-10',",
				"      company: 'Cadence Co',",
				"      role: 'Applied Engineer',",
				"      status: 'applied',",
				"      score: '4.3/5',",
				"      reportPath: 'reports/099-cadence-co-2026-04-10.md',",
				"      contacts: [{ email: 'recruiter@example.com', name: 'Recruiter' }],",
				"      daysSinceApplication: 12,",
				"      daysSinceLastFollowup: null,",
				"      followupCount: 0,",
				"      urgency: 'overdue',",
				"      nextFollowupDate: '2026-04-17',",
				"      daysUntilNext: -5",
				"    }",
				"  ],",
				"  cadenceConfig: {",
				"    applied_first: 7,",
				"    applied_subsequent: 7,",
				"    applied_max_followups: 2,",
				"    responded_initial: 1,",
				"    responded_subsequent: 3,",
				"    interview_thankyou: 1",
				"  }",
				"}, null, 2));",
			].join("\n"),
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Follow-up cadence fixture",
				name: "followup-cadence",
			},
		],
		tools: createTrackerSpecialistTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("analyze-follow-up-cadence"),
			input: {
				appliedDays: 7,
				overdueOnly: false,
			},
			toolName: "analyze-follow-up-cadence",
		});

		assert.equal(result.status, "completed");
		const output = getOutput(result);

		assert.equal(output.packet.mode, "follow-up-cadence");
		assert.equal(output.packet.resultStatus, "ready");
		assert.equal(output.packet.message.includes("Normalized"), true);
	} finally {
		await harness.cleanup();
	}
});

test("rejection-pattern normalization stages a bounded ready packet", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/analyze-patterns.mjs": [
				"process.stdout.write(JSON.stringify({",
				"  metadata: {",
				"    total: 9,",
				"    analysisDate: '2026-04-22',",
				"    byOutcome: { positive: 3, negative: 4, self_filtered: 1, pending: 1 }",
				"  },",
				"  funnel: { applied: 4, interview: 2, offer: 1, rejected: 2 },",
				"  archetypeBreakdown: [",
				"    { archetype: 'Applied AI', total: 4, positive: 2, negative: 1, self_filtered: 0, pending: 1, conversionRate: 50 }",
				"  ],",
				"  blockerAnalysis: [",
				"    { blocker: 'geo-restriction', frequency: 2, percentage: 22 }",
				"  ],",
				"  remotePolicy: [",
				"    { policy: 'global remote', total: 4, positive: 2, negative: 1, self_filtered: 0, pending: 1, conversionRate: 50 }",
				"  ],",
				"  companySizeBreakdown: [",
				"    { size: 'startup', total: 3, positive: 1, negative: 1, self_filtered: 0, pending: 1, conversionRate: 33 }",
				"  ],",
				"  scoreThreshold: { recommended: 4.2, reasoning: 'No positive outcomes below 4.2.', positiveRange: '4.2 - 4.8' },",
				"  techStackGaps: [",
				"    { skill: 'TypeScript', frequency: 2 }",
				"  ],",
				"  recommendations: [",
				"    { action: 'Tighten location filters', reasoning: 'Geo blockers are frequent.', impact: 'high' }",
				"  ]",
				"}, null, 2));",
			].join("\n"),
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Rejection-pattern fixture",
				name: "analyze-patterns",
			},
		],
		tools: createTrackerSpecialistTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("analyze-rejection-patterns"),
			input: {
				minThreshold: 5,
			},
			toolName: "analyze-rejection-patterns",
		});

		assert.equal(result.status, "completed");
		const output = getOutput(result);

		assert.equal(output.packet.mode, "rejection-patterns");
		assert.equal(output.packet.resultStatus, "ready");
		assert.equal(output.packet.message.includes("Normalized"), true);
	} finally {
		await harness.cleanup();
	}
});

test("tracker-specialist tools preserve degraded script output as a packet instead of failing the caller", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/followup-cadence.mjs": "process.stdout.write('not-json\\n');\n",
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Broken follow-up cadence fixture",
				name: "followup-cadence",
			},
		],
		tools: createTrackerSpecialistTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation(
				"analyze-follow-up-cadence",
				"degraded-session",
			),
			input: {
				appliedDays: null,
				overdueOnly: false,
			},
			toolName: "analyze-follow-up-cadence",
		});

		assert.equal(result.status, "completed");
		const output = getOutput(result);

		assert.equal(output.packet.mode, "follow-up-cadence");
		assert.equal(output.packet.resultStatus, "degraded");
		assert.equal(
			output.packet.warnings.some(
				(warning) => warning.code === "degraded-analysis",
			),
			true,
		);
	} finally {
		await harness.cleanup();
	}
});

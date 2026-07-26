import assert from "node:assert/strict";
import test from "node:test";
import { createToolHarness } from "./test-utils.js";
import { createTrackerIntegrityTools } from "./tracker-integrity-tools.js";

type TrackerToolOutput = {
	status: string;
};

function getOutput<T>(result: unknown): T {
	return (result as { output?: unknown }).output as T;
}

function createCorrelation(toolName: string) {
	return {
		jobId: `job-${toolName}`,
		requestId: `request-${toolName}`,
		sessionId: `session-${toolName}`,
		traceId: `trace-${toolName}`,
	};
}

const TRACKER_STATE_FIXTURE = [
	"states:",
	"  - id: evaluated",
	"    label: Evaluated",
	"  - id: applied",
	"    label: Applied",
	"  - id: interview",
	"    label: Interview",
	"  - id: rejected",
	"    label: Rejected",
	"  - id: skip",
	"    label: SKIP",
	"",
].join("\n");

const APPLICATIONS_TRACKER_FIXTURE = [
	"# Applications Tracker",
	"",
	"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
	"| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |",
	"| 1 | 2026-04-21 | Acme | Platform Engineer | 4.5/5 | Evaluated | Y | [001](reports/001-acme-2026-04-21.md) | Strong fit |",
	"| 2 | 2026-04-20 | Beta | AI Engineer | 4.1/5 | Applied | N | reports/002-beta-2026-04-20.md | Submitted |",
	"",
].join("\n");

test("tracker staging formats TSV content and becomes idempotent on repeat input", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"templates/states.yml": TRACKER_STATE_FIXTURE,
		},
		tools: createTrackerIntegrityTools(),
	});

	try {
		const input = {
			company: "Acme",
			companySlug: null,
			date: "2026-04-21",
			entryNumber: 7,
			notes: "one line note",
			pdf: "",
			report: "[007](reports/007-acme-2026-04-21.md)",
			role: "Platform Engineer",
			score: "4.5/5",
			status: "Evaluated",
		};
		const firstResult = await harness.service.execute({
			correlation: createCorrelation("stage-tracker-addition"),
			input,
			toolName: "stage-tracker-addition",
		});
		const secondResult = await harness.service.execute({
			correlation: {
				...createCorrelation("stage-tracker-addition"),
				requestId: "request-stage-tracker-addition-repeat",
			},
			input,
			toolName: "stage-tracker-addition",
		});

		assert.equal(firstResult.status, "completed");
		assert.equal(getOutput<TrackerToolOutput>(firstResult).status, "staged");
		assert.equal(
			await harness.fixture.readText("batch/tracker-additions/7-acme.tsv"),
			"7\t2026-04-21\tAcme\tPlatform Engineer\tEvaluated\t4.5/5\t\t[007](reports/007-acme-2026-04-21.md)\tone line note\n",
		);
		assert.equal(secondResult.status, "completed");
		assert.equal(
			getOutput<TrackerToolOutput>(secondResult).status,
			"already-staged",
		);
	} finally {
		await harness.cleanup();
	}
});

test("tracker maintenance tools surface script warnings as structured warnings", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/merge-tracker.mjs":
				"process.stdout.write('\\u26A0\\uFE0F duplicate row skipped\\n');\n",
			"scripts/verify-pipeline.mjs":
				"process.stdout.write('\\u26A0\\uFE0F pending TSVs remain\\n');\n",
			"templates/states.yml": TRACKER_STATE_FIXTURE,
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Merge tracker additions",
				name: "merge-tracker",
				timeoutMs: 5_000,
			},
			{
				command: process.execPath,
				description: "Verify tracker pipeline",
				name: "verify-pipeline",
				timeoutMs: 5_000,
			},
		],
		tools: createTrackerIntegrityTools(),
	});

	try {
		const mergeResult = await harness.service.execute({
			correlation: createCorrelation("merge-tracker-additions"),
			input: {},
			toolName: "merge-tracker-additions",
		});
		const verifyResult = await harness.service.execute({
			correlation: createCorrelation("verify-tracker-pipeline"),
			input: {},
			toolName: "verify-tracker-pipeline",
		});

		assert.equal(mergeResult.status, "completed");
		assert.equal(mergeResult.warnings.length, 1);
		assert.equal(mergeResult.warnings[0]?.code, "tracker-merge-warning");
		assert.equal(verifyResult.status, "completed");
		assert.equal(verifyResult.warnings.length, 1);
		assert.equal(verifyResult.warnings[0]?.code, "tracker-verify-warning");
	} finally {
		await harness.cleanup();
	}
});

test("tracker status updates rewrite only the target row and become idempotent", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"data/applications.md": APPLICATIONS_TRACKER_FIXTURE,
			"templates/states.yml": TRACKER_STATE_FIXTURE,
		},
		tools: createTrackerIntegrityTools(),
	});

	try {
		const firstResult = await harness.service.execute({
			correlation: createCorrelation("update-tracker-status"),
			input: {
				entryNumber: 1,
				status: "Interview",
			},
			toolName: "update-tracker-status",
		});
		const secondResult = await harness.service.execute({
			correlation: {
				...createCorrelation("update-tracker-status"),
				requestId: "request-update-tracker-status-repeat",
			},
			input: {
				entryNumber: 1,
				status: "interview",
			},
			toolName: "update-tracker-status",
		});

		assert.equal(firstResult.status, "completed");
		assert.equal(getOutput<TrackerToolOutput>(firstResult).status, "updated");
		assert.match(
			(await harness.fixture.readText("data/applications.md")) ?? "",
			/\| 1 \| 2026-04-21 \| Acme \| Platform Engineer \| 4\.5\/5 \| Interview \| Y \| \[001\]\(reports\/001-acme-2026-04-21\.md\) \| Strong fit \|/,
		);
		assert.equal(secondResult.status, "completed");
		assert.equal(
			getOutput<TrackerToolOutput>(secondResult).status,
			"unchanged",
		);
	} finally {
		await harness.cleanup();
	}
});

test("normalize and dedup tracker tools pass through dry-run flags", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/dedup-tracker.mjs": [
				"import { mkdir, writeFile } from 'node:fs/promises';",
				"await mkdir('.jobhunt-app', { recursive: true });",
				"await writeFile('.jobhunt-app/dedup-args.txt', process.argv.slice(2).join(' '), 'utf8');",
			].join("\n"),
			"scripts/normalize-statuses.mjs": [
				"import { mkdir, writeFile } from 'node:fs/promises';",
				"await mkdir('.jobhunt-app', { recursive: true });",
				"await writeFile('.jobhunt-app/normalize-args.txt', process.argv.slice(2).join(' '), 'utf8');",
			].join("\n"),
			"templates/states.yml": TRACKER_STATE_FIXTURE,
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Dedup tracker",
				name: "dedup-tracker",
				timeoutMs: 5_000,
			},
			{
				command: process.execPath,
				description: "Normalize statuses",
				name: "normalize-statuses",
				timeoutMs: 5_000,
			},
		],
		tools: createTrackerIntegrityTools(),
	});

	try {
		const normalizeResult = await harness.service.execute({
			correlation: createCorrelation("normalize-tracker-statuses"),
			input: {
				dryRun: true,
			},
			toolName: "normalize-tracker-statuses",
		});
		const dedupResult = await harness.service.execute({
			correlation: createCorrelation("dedup-tracker-entries"),
			input: {
				dryRun: true,
			},
			toolName: "dedup-tracker-entries",
		});

		assert.equal(normalizeResult.status, "completed");
		assert.equal(dedupResult.status, "completed");
		assert.equal(
			await harness.fixture.readText(".jobhunt-app/normalize-args.txt"),
			"--dry-run",
		);
		assert.equal(
			await harness.fixture.readText(".jobhunt-app/dedup-args.txt"),
			"--dry-run",
		);
	} finally {
		await harness.cleanup();
	}
});

test("tracker status updates fail cleanly when the target row is missing", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"data/applications.md": APPLICATIONS_TRACKER_FIXTURE,
			"templates/states.yml": TRACKER_STATE_FIXTURE,
		},
		tools: createTrackerIntegrityTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("update-tracker-status"),
			input: {
				entryNumber: 99,
				status: "Interview",
			},
			toolName: "update-tracker-status",
		});

		assert.equal(result.status, "failed");
		assert.equal(result.error.code, "tool-workspace-conflict");
	} finally {
		await harness.cleanup();
	}
});

test("tracker staging rejects non-canonical statuses explicitly", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"templates/states.yml": TRACKER_STATE_FIXTURE,
		},
		tools: createTrackerIntegrityTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("stage-tracker-addition"),
			input: {
				company: "Acme",
				companySlug: null,
				date: "2026-04-21",
				entryNumber: 8,
				notes: "",
				pdf: "",
				report: "[008](reports/008-acme-2026-04-21.md)",
				role: "Platform Engineer",
				score: "4.5/5",
				status: "Monitor",
			},
			toolName: "stage-tracker-addition",
		});

		assert.equal(result.status, "failed");
		assert.equal(result.error.code, "tool-invalid-input");
	} finally {
		await harness.cleanup();
	}
});

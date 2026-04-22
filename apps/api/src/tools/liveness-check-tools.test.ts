import assert from "node:assert/strict";
import test from "node:test";
import { createLivenessCheckTools } from "./liveness-check-tools.js";
import { createToolHarness } from "./test-utils.js";

function createCorrelation(toolName: string) {
	return {
		jobId: `job-${toolName}`,
		requestId: `request-${toolName}`,
		sessionId: `session-${toolName}`,
		traceId: `trace-${toolName}`,
	};
}

test("liveness tool returns a typed ready state for active URLs", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/check-liveness.mjs": [
				"process.stdout.write('Checking 1 URL(s)...\\n\\n');",
				"process.stdout.write('OK active     https://example.com/job\\n');",
				"process.stdout.write('\\nResults: 1 active  0 expired  0 uncertain\\n');",
				"",
			].join("\n"),
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Check job liveness.",
				name: "check-liveness",
				successExitCodes: [0, 1],
			},
		],
		tools: createLivenessCheckTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("check-job-liveness"),
			input: {
				url: "https://example.com/job",
			},
			toolName: "check-job-liveness",
		});

		assert.equal(result.status, "completed");
		const output = result.output as Record<string, unknown>;
		const liveness = output.liveness as Record<string, unknown>;

		assert.equal(output.state, "ready");
		assert.equal(liveness.result, "active");
		assert.equal(liveness.url, "https://example.com/job");
	} finally {
		await harness.cleanup();
	}
});

test("liveness tool maps non-zero success exits onto expired results", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/check-liveness.mjs": [
				"process.stdout.write('Checking 1 URL(s)...\\n\\n');",
				"process.stdout.write('WARN expired  https://example.com/job\\n');",
				"process.stdout.write('           job posting returned 410\\n');",
				"process.stdout.write('\\nResults: 0 active  1 expired  0 uncertain\\n');",
				"process.exit(1);",
				"",
			].join("\n"),
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Check job liveness.",
				name: "check-liveness",
				successExitCodes: [0, 1],
			},
		],
		tools: createLivenessCheckTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("check-job-liveness"),
			input: {
				url: "https://example.com/job",
			},
			toolName: "check-job-liveness",
		});

		assert.equal(result.status, "completed");
		const output = result.output as Record<string, unknown>;
		const liveness = output.liveness as Record<string, unknown>;

		assert.equal(output.state, "ready");
		assert.equal(liveness.exitCode, 1);
		assert.equal(liveness.reason, "job posting returned 410");
		assert.equal(liveness.result, "expired");
	} finally {
		await harness.cleanup();
	}
});

test("liveness tool preserves uncertain results for manual-review follow-up", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/check-liveness.mjs": [
				"process.stdout.write('Checking 1 URL(s)...\\n\\n');",
				"process.stdout.write('WARN uncertain  https://example.com/job\\n');",
				"process.stdout.write('           requires manual review\\n');",
				"process.stdout.write('\\nResults: 0 active  0 expired  1 uncertain\\n');",
				"",
			].join("\n"),
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Check job liveness.",
				name: "check-liveness",
				successExitCodes: [0, 1],
			},
		],
		tools: createLivenessCheckTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("check-job-liveness"),
			input: {
				url: "https://example.com/job",
			},
			toolName: "check-job-liveness",
		});

		assert.equal(result.status, "completed");
		const output = result.output as Record<string, unknown>;
		const liveness = output.liveness as Record<string, unknown>;

		assert.equal(output.state, "ready");
		assert.equal(liveness.result, "uncertain");
		assert.equal(liveness.reason, "requires manual review");
	} finally {
		await harness.cleanup();
	}
});

test("liveness batch tool returns the empty state without running scripts", async () => {
	const harness = await createToolHarness({
		tools: createLivenessCheckTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("check-job-liveness-batch"),
			input: {
				urls: [],
			},
			toolName: "check-job-liveness-batch",
		});

		assert.equal(result.status, "completed");
		const output = result.output as Record<string, unknown>;

		assert.equal(output.state, "empty");
		assert.deepEqual(output.summary, {
			active: 0,
			error: 0,
			expired: 0,
			offline: 0,
			uncertain: 0,
		});
	} finally {
		await harness.cleanup();
	}
});

test("liveness tool maps timeouts onto the offline state", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/check-liveness.mjs":
				"await new Promise((resolve) => setTimeout(resolve, 200));\n",
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Check job liveness.",
				name: "check-liveness",
				successExitCodes: [0, 1],
				timeoutMs: 50,
			},
		],
		tools: createLivenessCheckTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("check-job-liveness"),
			input: {
				url: "https://example.com/job",
			},
			toolName: "check-job-liveness",
		});

		assert.equal(result.status, "completed");
		const output = result.output as Record<string, unknown>;

		assert.equal(output.state, "offline");
		assert.match(String(output.message), /timed out/i);
	} finally {
		await harness.cleanup();
	}
});

test("liveness tool returns the error state when output cannot be parsed", async () => {
	const harness = await createToolHarness({
		fixtureFiles: {
			"scripts/check-liveness.mjs":
				"process.stdout.write('garbage output\\n');\n",
		},
		scriptDefinitions: [
			{
				command: process.execPath,
				description: "Check job liveness.",
				name: "check-liveness",
				successExitCodes: [0, 1],
			},
		],
		tools: createLivenessCheckTools(),
	});

	try {
		const result = await harness.service.execute({
			correlation: createCorrelation("check-job-liveness"),
			input: {
				url: "https://example.com/job",
			},
			toolName: "check-job-liveness",
		});

		assert.equal(result.status, "completed");
		const output = result.output as Record<string, unknown>;

		assert.equal(output.state, "error");
		assert.match(String(output.message), /did not include a result/i);
	} finally {
		await harness.cleanup();
	}
});

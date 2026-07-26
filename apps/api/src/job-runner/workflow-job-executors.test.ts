import assert from "node:assert/strict";
import test from "node:test";
import type { ToolExecutionService } from "../tools/index.js";
import {
	createDurableJobRunnerHarness,
	seedCheckpointedRunningJob,
} from "./test-utils.js";
import { createWorkflowJobExecutors } from "./workflow-job-executors.js";

function createToolServiceStub(calls: string[]): ToolExecutionService {
	return {
		async execute(request) {
			calls.push(request.toolName);
			return {
				output: {
					ok: true,
					toolName: request.toolName,
				},
				status: "completed",
				toolName: request.toolName,
				warnings: [],
			};
		},
		getRegistry() {
			return {
				definitions: new Map(),
				get() {
					return null;
				},
				listCatalog() {
					return [];
				},
				listNames() {
					return [];
				},
			};
		},
	};
}

test("scan workflow executor returns the checkpointed result without rerunning the script", async () => {
	const harness = await createDurableJobRunnerHarness({
		createExecutors: (repoRoot) => createWorkflowJobExecutors({ repoRoot }),
		fixtureFiles: {
			"scripts/scan.mjs":
				"throw new Error('scan script should not run on resume');\n",
		},
	});
	const checkpointedResult = {
		company: "Example Co",
		dryRun: false,
		summary: {
			companiesConfigured: 1,
			companiesScanned: 1,
			companiesSkipped: 0,
			duplicatesSkipped: 0,
			filteredByLocation: 0,
			filteredByTitle: 0,
			newOffersAdded: 1,
			totalJobsFound: 1,
		},
		warnings: [],
		workflow: "scan-portals" as const,
	};

	try {
		await seedCheckpointedRunningJob(harness, {
			checkpoint: {
				completedSteps: ["scan-complete"],
				cursor: null,
				value: {
					items: [checkpointedResult],
				},
			},
			jobId: "scan-resume-job",
			jobType: "scan-portals",
			payload: {
				company: "Example Co",
				compareClean: false,
				dryRun: false,
			},
			sessionId: "scan-resume-session",
			workflow: "scan-portals",
		});

		await harness.runner.drainOnce();

		const job = await harness.store.jobs.getById("scan-resume-job");

		assert.equal(job?.status, "completed");
		assert.deepEqual(job?.result, checkpointedResult);
	} finally {
		await harness.cleanup();
	}
});

test("evaluation workflow executor runs a raw JD launch through the batch worker and closeout tools", async () => {
	const toolCalls: string[] = [];
	const workerCalls: Array<{
		id: string;
		jdText: string | null | undefined;
		reportNumber: string;
		url: string;
	}> = [];
	const toolService = createToolServiceStub(toolCalls);
	const harness = await createDurableJobRunnerHarness({
		createExecutors: (repoRoot) =>
			createWorkflowJobExecutors({
				getToolExecutionService: async () => toolService,
				repoRoot,
				runBatchWorker: async (input) => {
					workerCalls.push({
						id: input.id,
						jdText: input.jdText,
						reportNumber: input.reportNumber,
						url: input.url,
					});

					return {
						workerResult: {
							company: "Raw JD Co",
							error: null,
							id: input.id,
							legitimacy: "High Confidence",
							pdf: "output/001-raw-jd-co.pdf",
							report: "reports/001-raw-jd-co.md",
							report_num: input.reportNumber,
							role: "AI Platform Lead",
							score: 4.6,
							status: "completed",
							tracker: "batch/tracker-additions/001-raw-jd-co.tsv",
							warnings: [],
						},
					};
				},
			}),
	});

	try {
		await seedCheckpointedRunningJob(harness, {
			checkpoint: {
				completedSteps: [],
				cursor: null,
				value: null,
			},
			jobId: "evaluation-raw-jd-job",
			jobType: "single-evaluation",
			payload: {
				input: {
					kind: "raw-jd",
					text: "Senior AI platform lead role with agent workflow ownership.",
				},
				workflow: "single-evaluation",
			},
			sessionId: "evaluation-raw-jd-session",
			workflow: "single-evaluation",
		});

		await harness.runner.drainOnce();

		const job = await harness.store.jobs.getById("evaluation-raw-jd-job");
		const result = job?.result as {
			input?: { kind: string; promptRedacted: boolean };
			report_num?: string;
			score?: number;
			workflow?: string;
		} | null;

		assert.equal(job?.status, "completed");
		assert.equal(result?.workflow, "single-evaluation");
		assert.equal(result?.input?.kind, "raw-jd");
		assert.equal(result?.input?.promptRedacted, true);
		assert.equal(result?.report_num, "001");
		assert.equal(result?.score, 4.6);
		assert.deepEqual(toolCalls, [
			"merge-tracker-additions",
			"verify-tracker-pipeline",
		]);
		assert.equal(workerCalls.length, 1);
		assert.equal(workerCalls[0]?.reportNumber, "001");
		assert.equal(
			workerCalls[0]?.jdText,
			"Senior AI platform lead role with agent workflow ownership.",
		);
		assert.match(workerCalls[0]?.id ?? "", /^eval-[a-f0-9]{12}$/);
		assert.match(
			workerCalls[0]?.url ?? "",
			/^raw-jd:\/\/chat-console\/evaluation-raw-jd-session\/eval-[a-f0-9]{12}$/,
		);
	} finally {
		await harness.cleanup();
	}
});

test("pipeline workflow executor resumes the remaining queue and runs closeout tools once", async () => {
	const batchWorkerCalls: string[] = [];
	const toolCalls: string[] = [];
	const toolService = createToolServiceStub(toolCalls);
	const harness = await createDurableJobRunnerHarness({
		createExecutors: (repoRoot) =>
			createWorkflowJobExecutors({
				getToolExecutionService: async () => toolService,
				repoRoot,
				runBatchWorker: async (input) => {
					batchWorkerCalls.push(input.url);
					return {
						workerResult: {
							company: "Second Co",
							error: null,
							id: input.id,
							legitimacy: "High Confidence",
							pdf: "output/002-second-co.pdf",
							report: "reports/002-second-co.md",
							report_num: input.reportNumber,
							role: "Platform Engineer",
							score: 4.7,
							status: "completed",
							tracker: "batch/tracker-additions/002-second-co.tsv",
							warnings: [],
						},
					};
				},
				runSyncCheck: async () => [
					{
						code: "cv-sync-warning",
						detail: null,
						message: "CV and profile summary are out of sync.",
					},
				],
			}),
		fixtureFiles: {
			"data/pipeline.md": [
				"# Pipeline",
				"",
				"## Pending",
				"",
				"- [ ] https://example.com/jobs/second | Second Co | Platform Engineer",
				"",
				"## Processed",
				"",
				"- [x] #001 | https://example.com/jobs/first | Staff Engineer | 4.30/5 | PDF Yes",
				"",
			].join("\n"),
			"reports/001-first-co.md": "# Existing report\n",
		},
	});
	const firstItem = {
		error: null,
		pdf: "output/001-first-co.pdf",
		report: "reports/001-first-co.md",
		reportNumber: "001",
		role: "Staff Engineer",
		score: 4.3,
		status: "completed" as const,
		tracker: "batch/tracker-additions/001-first-co.tsv",
		url: "https://example.com/jobs/first",
		warnings: [],
	};

	try {
		await seedCheckpointedRunningJob(harness, {
			checkpoint: {
				completedSteps: ["pipeline-item-1"],
				cursor: "1",
				value: {
					items: [firstItem],
					trackerMerged: false,
					trackerVerified: false,
				},
			},
			jobId: "pipeline-resume-job",
			jobType: "process-pipeline",
			payload: {
				dryRun: false,
				queueSelection: {
					limit: 2,
					mode: "all-pending",
					urls: [],
				},
			},
			sessionId: "pipeline-resume-session",
			workflow: "process-pipeline",
		});

		await harness.runner.drainOnce();

		const job = await harness.store.jobs.getById("pipeline-resume-job");
		const result = job?.result as {
			items?: Array<{ url: string; reportNumber: string | null }>;
			selectedCount?: number;
			trackerMerged?: boolean;
			trackerVerified?: boolean;
			warnings?: Array<{ code: string }>;
			workflow?: string;
		} | null;
		const pipelineText = await harness.fixture.readText("data/pipeline.md");
		const pipelineContent = pipelineText ?? "";

		assert.equal(job?.status, "completed");
		assert.notEqual(pipelineText, null);
		assert.deepEqual(batchWorkerCalls, ["https://example.com/jobs/second"]);
		assert.deepEqual(toolCalls, [
			"merge-tracker-additions",
			"verify-tracker-pipeline",
		]);
		assert.equal(result?.workflow, "process-pipeline");
		assert.equal(result?.selectedCount, 2);
		assert.equal(result?.trackerMerged, true);
		assert.equal(result?.trackerVerified, true);
		assert.deepEqual(
			result?.warnings?.map((warning) => warning.code),
			["cv-sync-warning"],
		);
		assert.deepEqual(
			result?.items?.map((item) => item.url),
			["https://example.com/jobs/first", "https://example.com/jobs/second"],
		);
		assert.equal(result?.items?.[1]?.reportNumber, "002");
		assert.match(
			pipelineContent,
			/\[x\] #002 \| https:\/\/example\.com\/jobs\/second/,
		);
		assert.doesNotMatch(
			pipelineContent,
			/\[ \] https:\/\/example\.com\/jobs\/second/,
		);
	} finally {
		await harness.cleanup();
	}
});

test("batch workflow executor resumes remaining rows and preserves retryable plus partial semantics", async () => {
	const toolCalls: string[] = [];
	const workerCalls: Array<{ reportNumber: string; url: string }> = [];
	const toolService = createToolServiceStub(toolCalls);
	const harness = await createDurableJobRunnerHarness({
		createExecutors: (repoRoot) =>
			createWorkflowJobExecutors({
				getToolExecutionService: async () => toolService,
				repoRoot,
				runBatchWorker: async (input) => {
					workerCalls.push({
						reportNumber: input.reportNumber,
						url: input.url,
					});

					if (input.url === "https://example.com/jobs/second") {
						return {
							error: "infrastructure: exit 1; worker timeout",
							retryable: true,
						};
					}

					return {
						workerResult: {
							company: "Third Co",
							error: null,
							id: input.id,
							legitimacy: "Proceed with Caution",
							pdf: null,
							report: "reports/003-third-co.md",
							report_num: input.reportNumber,
							role: "Principal Engineer",
							score: 4.1,
							status: "partial",
							tracker: null,
							warnings: ["manual PDF follow-up required"],
						},
					};
				},
			}),
		fixtureFiles: {
			"batch/batch-input.tsv": [
				"id\turl\tsource\tnotes",
				"1\thttps://example.com/jobs/first\tmanual\t",
				"2\thttps://example.com/jobs/second\tmanual\t",
				"3\thttps://example.com/jobs/third\tmanual\t",
				"",
			].join("\n"),
			"batch/batch-state.tsv": [
				"id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries",
				"1\thttps://example.com/jobs/first\tcompleted\t2026-04-21T08:00:00.000Z\t2026-04-21T08:05:00.000Z\t001\t4.8\t-\t0",
				"",
			].join("\n"),
			"reports/001-first-co.md": "# Existing report\n",
		},
	});
	const firstItem = {
		error: null,
		id: 1,
		reportNumber: "001",
		retries: 0,
		score: 4.8,
		status: "completed" as const,
		url: "https://example.com/jobs/first",
	};

	try {
		await seedCheckpointedRunningJob(harness, {
			checkpoint: {
				completedSteps: ["batch-item-1"],
				cursor: "1",
				value: {
					items: [firstItem],
				},
			},
			jobId: "batch-resume-job",
			jobType: "batch-evaluation",
			payload: {
				dryRun: false,
				maxRetries: 3,
				minScore: 0,
				mode: "run-pending",
				parallel: 1,
				startFromId: 0,
			},
			sessionId: "batch-resume-session",
			workflow: "batch-evaluation",
		});

		await harness.runner.drainOnce();

		const job = await harness.store.jobs.getById("batch-resume-job");
		const result = job?.result as {
			counts?: {
				completed: number;
				failed: number;
				partial: number;
				pending: number;
				retryableFailed: number;
				skipped: number;
				total: number;
			};
			items?: Array<{
				id: number;
				reportNumber: string | null;
				status: string;
			}>;
			workflow?: string;
		} | null;
		const batchState = await harness.fixture.readText("batch/batch-state.tsv");
		const batchStateText = batchState ?? "";

		assert.equal(job?.status, "completed");
		assert.notEqual(batchState, null);
		assert.deepEqual(workerCalls, [
			{
				reportNumber: "002",
				url: "https://example.com/jobs/second",
			},
			{
				reportNumber: "003",
				url: "https://example.com/jobs/third",
			},
		]);
		assert.deepEqual(toolCalls, [
			"merge-tracker-additions",
			"verify-tracker-pipeline",
		]);
		assert.equal(result?.workflow, "batch-evaluation");
		assert.deepEqual(result?.counts, {
			completed: 1,
			failed: 0,
			partial: 1,
			pending: 0,
			retryableFailed: 1,
			skipped: 0,
			total: 3,
		});
		assert.deepEqual(
			result?.items?.map((item) => [item.id, item.status, item.reportNumber]),
			[
				[1, "completed", "001"],
				[2, "retryable-failed", "002"],
				[3, "partial", "003"],
			],
		);
		assert.match(
			batchStateText,
			/2\thttps:\/\/example\.com\/jobs\/second\tfailed\t.*\t002\t-\tinfrastructure: exit 1; worker timeout\t1/,
		);
		assert.match(
			batchStateText,
			/3\thttps:\/\/example\.com\/jobs\/third\tpartial\t.*\t003\t4\.1\twarnings: manual PDF follow-up required\t0/,
		);
	} finally {
		await harness.cleanup();
	}
});

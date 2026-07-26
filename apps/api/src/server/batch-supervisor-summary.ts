import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import {
	normalizeRepoRelativePath,
	type RepoPathOptions,
	RepoRelativePathError,
	resolveRepoRelativePath,
} from "../config/repo-paths.js";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import {
	type BatchEvaluationPayload,
	type BatchWorkerResult,
	batchEvaluationPayloadSchema,
	batchEvaluationResultSchema,
	batchWorkerResultSchema,
} from "../job-runner/workflow-job-contract.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import type {
	RuntimeApprovalRecord,
	RuntimeJobRecord,
	RuntimeRunCheckpointRecord,
	RuntimeSessionRecord,
} from "../store/store-contract.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import {
	type BatchSupervisorActionAvailability,
	type BatchSupervisorArtifactLink,
	type BatchSupervisorCloseoutSummary,
	type BatchSupervisorCounts,
	type BatchSupervisorDraftSummary,
	type BatchSupervisorItemArtifacts,
	type BatchSupervisorItemPreview,
	type BatchSupervisorItemStatus,
	type BatchSupervisorRunCheckpoint,
	type BatchSupervisorRunSummary,
	type BatchSupervisorSelectedDetail,
	type BatchSupervisorSelectedItem,
	type BatchSupervisorStatusFilter,
	type BatchSupervisorStatusOption,
	type BatchSupervisorSummaryOptions,
	type BatchSupervisorSummaryPayload,
	type BatchSupervisorWarningCode,
	type BatchSupervisorWarningItem,
	DEFAULT_BATCH_SUPERVISOR_LIMIT,
	MAX_BATCH_SUPERVISOR_LIMIT,
} from "./batch-supervisor-contract.js";
import { getStartupMessage, getStartupStatus } from "./startup-status.js";

type JsonRecord = Record<string, JsonValue>;

type BatchInputRow = {
	id: number;
	notes: string | null;
	source: string | null;
	url: string;
};

type BatchStateRow = {
	completedAt: string | null;
	error: string | null;
	id: number;
	reportNumber: string | null;
	retries: number;
	score: number | null;
	startedAt: string | null;
	status: string;
	url: string;
};

type ParsedBatchResultRecord = {
	fileName: string;
	id: number;
	parseError: string | null;
	reportNumber: string;
	result: BatchWorkerResult | null;
};

type BatchResultIndex = {
	byExactKey: Map<string, ParsedBatchResultRecord>;
	latestById: Map<number, ParsedBatchResultRecord>;
};

type BatchItemRecord = {
	artifacts: BatchSupervisorItemArtifacts;
	company: string | null;
	completedAt: string | null;
	error: string | null;
	id: number;
	legitimacy: BatchSupervisorSelectedItem["legitimacy"];
	notes: string | null;
	rawStateError: string | null;
	reportNumber: string | null;
	resultWarnings: string[];
	retries: number;
	role: string | null;
	score: number | null;
	source: string | null;
	startedAt: string | null;
	status: BatchSupervisorItemStatus;
	url: string;
	warnings: BatchSupervisorWarningItem[];
};

type DraftCounts = BatchSupervisorCounts;

const DEFAULT_BATCH_PAYLOAD = batchEvaluationPayloadSchema.parse({});

const itemStatusLabels: Record<BatchSupervisorStatusFilter, string> = {
	all: "All",
	completed: "Completed",
	failed: "Failed",
	pending: "Pending",
	partial: "Partial",
	processing: "Processing",
	"retryable-failed": "Retryable Failed",
	skipped: "Skipped",
};

export class BatchSupervisorInputError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-batch-supervisor-query") {
		super(message);
		this.code = code;
		this.name = "BatchSupervisorInputError";
	}
}

function isJsonRecord(
	value: JsonValue | null | undefined,
): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampLimit(value: number | undefined): number {
	if (value === undefined) {
		return DEFAULT_BATCH_SUPERVISOR_LIMIT;
	}

	return Math.max(1, Math.min(value, MAX_BATCH_SUPERVISOR_LIMIT));
}

function clampOffset(value: number | undefined): number {
	if (value === undefined) {
		return 0;
	}

	return Math.max(0, value);
}

function compareSessions(
	left: RuntimeSessionRecord,
	right: RuntimeSessionRecord,
): number {
	const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);

	if (updatedComparison !== 0) {
		return updatedComparison;
	}

	return left.sessionId.localeCompare(right.sessionId);
}

function compareJobs(left: RuntimeJobRecord, right: RuntimeJobRecord): number {
	const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);

	if (updatedComparison !== 0) {
		return updatedComparison;
	}

	return left.jobId.localeCompare(right.jobId);
}

function compareItems(left: BatchItemRecord, right: BatchItemRecord): number {
	return left.id - right.id;
}

function normalizeText(value: string | undefined): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

function normalizeTimestamp(value: string | undefined): string | null {
	const trimmed = value?.trim() ?? "";

	if (trimmed.length === 0 || trimmed === "-") {
		return null;
	}

	return trimmed;
}

function normalizeStringScore(value: string | undefined): number | null {
	const trimmed = value?.trim() ?? "";

	if (trimmed.length === 0 || trimmed === "-") {
		return null;
	}

	const parsed = Number.parseFloat(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function createEmptyCounts(): BatchSupervisorCounts {
	return {
		completed: 0,
		failed: 0,
		partial: 0,
		pending: 0,
		processing: 0,
		retryableFailed: 0,
		skipped: 0,
		total: 0,
	};
}

function accumulateCounts(
	counts: BatchSupervisorCounts,
	status: BatchSupervisorItemStatus,
): void {
	counts.total += 1;

	switch (status) {
		case "completed":
			counts.completed += 1;
			return;
		case "failed":
			counts.failed += 1;
			return;
		case "partial":
			counts.partial += 1;
			return;
		case "pending":
			counts.pending += 1;
			return;
		case "processing":
			counts.processing += 1;
			return;
		case "retryable-failed":
			counts.retryableFailed += 1;
			return;
		case "skipped":
			counts.skipped += 1;
			return;
	}
}

function createArtifactLink(
	exists: boolean,
	message: string,
	repoRelativePath: string | null,
): BatchSupervisorArtifactLink {
	return {
		exists,
		message,
		repoRelativePath,
	};
}

function normalizeArtifactPath(input: {
	candidate: string | null;
	missingMessage: string;
	options: RepoPathOptions;
	pathPrefix: string;
	pathSuffix: string;
}): BatchSupervisorArtifactLink {
	if (!input.candidate) {
		return createArtifactLink(false, input.missingMessage, null);
	}

	let normalizedPath: string;

	try {
		normalizedPath = normalizeRepoRelativePath(input.candidate);
	} catch (error) {
		const message =
			error instanceof RepoRelativePathError ? error.message : String(error);

		return createArtifactLink(
			false,
			`Batch artifact path is invalid: ${message}`,
			null,
		);
	}

	if (
		!normalizedPath.startsWith(input.pathPrefix) ||
		!normalizedPath.endsWith(input.pathSuffix)
	) {
		return createArtifactLink(
			false,
			`Batch artifact path does not match ${input.pathPrefix}*.${input.pathSuffix.slice(1)}: ${normalizedPath}`,
			null,
		);
	}

	const exists = existsSync(
		resolveRepoRelativePath(normalizedPath, input.options),
	);

	return createArtifactLink(
		exists,
		exists
			? `Checked-in artifact ${normalizedPath} is available.`
			: `Batch artifact ${normalizedPath} is missing from the repo.`,
		normalizedPath,
	);
}

function createMissingResultWarning(
	message: string,
): BatchSupervisorWarningItem {
	return {
		code: "missing-result",
		message,
	};
}

async function readTextIfExists(path: string): Promise<string | null> {
	try {
		return await readFile(path, "utf8");
	} catch {
		return null;
	}
}

async function readBatchInputRows(repoRoot: string): Promise<BatchInputRow[]> {
	const inputPath = resolveRepoRelativePath("batch/batch-input.tsv", {
		repoRoot,
	});
	const text = await readTextIfExists(inputPath);

	if (!text) {
		return [];
	}

	return text
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.slice(1)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			const [id, url, source = "", notes = ""] = line.split("\t");
			return {
				id: Number.parseInt(id ?? "0", 10),
				notes: normalizeText(notes),
				source: normalizeText(source),
				url: (url ?? "").trim(),
			} satisfies BatchInputRow;
		})
		.filter(
			(row) => Number.isInteger(row.id) && row.id > 0 && row.url.length > 0,
		)
		.sort((left, right) => left.id - right.id);
}

async function readBatchStateRows(
	repoRoot: string,
): Promise<Map<number, BatchStateRow>> {
	const statePath = resolveRepoRelativePath("batch/batch-state.tsv", {
		repoRoot,
	});
	const text = await readTextIfExists(statePath);

	if (!text) {
		return new Map<number, BatchStateRow>();
	}

	const rows = text
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.slice(1)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			const [
				id,
				url,
				status,
				startedAt,
				completedAt,
				reportNumber,
				score,
				error,
				retries,
			] = line.split("\t");

			return {
				completedAt: normalizeTimestamp(completedAt),
				error: normalizeText(error) === "-" ? null : normalizeText(error),
				id: Number.parseInt(id ?? "0", 10),
				reportNumber:
					normalizeText(reportNumber) === "-"
						? null
						: normalizeText(reportNumber),
				retries: Number.parseInt(retries ?? "0", 10),
				score: normalizeStringScore(score),
				startedAt: normalizeTimestamp(startedAt),
				status: normalizeText(status) ?? "pending",
				url: (url ?? "").trim(),
			} satisfies BatchStateRow;
		})
		.filter((row) => Number.isInteger(row.id) && row.id > 0);

	return new Map(rows.map((row) => [row.id, row]));
}

function compareResultRecords(
	left: ParsedBatchResultRecord,
	right: ParsedBatchResultRecord,
): number {
	const reportComparison = right.reportNumber.localeCompare(left.reportNumber);

	if (reportComparison !== 0) {
		return reportComparison;
	}

	return right.fileName.localeCompare(left.fileName);
}

async function readBatchResultIndex(
	repoRoot: string,
): Promise<BatchResultIndex> {
	const logsPath = resolveRepoRelativePath("batch/logs", {
		repoRoot,
	});
	let fileNames: string[];

	try {
		fileNames = await readdir(logsPath);
	} catch {
		return {
			byExactKey: new Map<string, ParsedBatchResultRecord>(),
			latestById: new Map<number, ParsedBatchResultRecord>(),
		};
	}

	const records = await Promise.all(
		fileNames
			.filter((fileName) => fileName.endsWith(".result.json"))
			.map(async (fileName) => {
				const match = fileName.match(/^(\d{3})-(\d+)\.result\.json$/);

				if (!match?.[1] || !match[2]) {
					return null;
				}

				const reportNumber = match[1];
				const id = Number.parseInt(match[2], 10);

				if (!Number.isInteger(id) || id <= 0) {
					return null;
				}

				const raw = await readTextIfExists(
					resolveRepoRelativePath(`batch/logs/${fileName}`, {
						repoRoot,
					}),
				);

				if (!raw) {
					return {
						fileName,
						id,
						parseError: `Batch result sidecar is empty: ${fileName}.`,
						reportNumber,
						result: null,
					} satisfies ParsedBatchResultRecord;
				}

				try {
					const parsedJson = JSON.parse(raw) as JsonValue;
					const parsedResult = batchWorkerResultSchema.safeParse(parsedJson);

					if (!parsedResult.success) {
						return {
							fileName,
							id,
							parseError: `Batch result sidecar failed schema validation: ${fileName}.`,
							reportNumber,
							result: null,
						} satisfies ParsedBatchResultRecord;
					}

					const resultId = Number.parseInt(parsedResult.data.id, 10);

					if (!Number.isInteger(resultId) || resultId !== id) {
						return {
							fileName,
							id,
							parseError: `Batch result sidecar item ID does not match its file name: ${fileName}.`,
							reportNumber,
							result: null,
						} satisfies ParsedBatchResultRecord;
					}

					if (parsedResult.data.report_num !== reportNumber) {
						return {
							fileName,
							id,
							parseError: `Batch result sidecar report number does not match its file name: ${fileName}.`,
							reportNumber,
							result: null,
						} satisfies ParsedBatchResultRecord;
					}

					return {
						fileName,
						id,
						parseError: null,
						reportNumber,
						result: parsedResult.data,
					} satisfies ParsedBatchResultRecord;
				} catch (error) {
					return {
						fileName,
						id,
						parseError:
							error instanceof Error
								? `Batch result sidecar is not valid JSON: ${error.message}`
								: "Batch result sidecar is not valid JSON.",
						reportNumber,
						result: null,
					} satisfies ParsedBatchResultRecord;
				}
			}),
	);

	const byExactKey = new Map<string, ParsedBatchResultRecord>();
	const latestById = new Map<number, ParsedBatchResultRecord>();

	for (const record of records) {
		if (!record) {
			continue;
		}

		byExactKey.set(`${record.id}:${record.reportNumber}`, record);
		const existing = latestById.get(record.id);

		if (!existing || compareResultRecords(record, existing) < 0) {
			latestById.set(record.id, record);
		}
	}

	return {
		byExactKey,
		latestById,
	};
}

async function readPendingTrackerAdditionCount(
	services: ApiServiceContainer,
): Promise<number> {
	const result = await services.workspace.readSurface(
		"trackerAdditionsDirectory",
	);

	if (result.status !== "found") {
		return 0;
	}

	return (result.directoryEntries ?? []).filter((entry) =>
		entry.endsWith(".tsv"),
	).length;
}

function isRetryableFailure(input: {
	maxRetries: number;
	stateRow: BatchStateRow | undefined;
}): boolean {
	const error = input.stateRow?.error ?? "";

	return Boolean(
		input.stateRow &&
			input.stateRow.status === "failed" &&
			error.startsWith("infrastructure:") &&
			input.stateRow.retries < input.maxRetries,
	);
}

function deriveItemStatus(input: {
	maxRetries: number;
	stateRow: BatchStateRow | undefined;
}): BatchSupervisorItemStatus {
	const stateRow = input.stateRow;

	if (!stateRow) {
		return "pending";
	}

	if (stateRow.status === "processing") {
		return "processing";
	}

	if (stateRow.status === "completed") {
		return "completed";
	}

	if (stateRow.status === "partial") {
		return "partial";
	}

	if (stateRow.status === "skipped") {
		return "skipped";
	}

	if (stateRow.status === "failed") {
		return isRetryableFailure(input) ? "retryable-failed" : "failed";
	}

	return "pending";
}

function createResultArtifacts(
	options: RepoPathOptions,
	resultRecord: ParsedBatchResultRecord | null,
): BatchSupervisorItemArtifacts {
	return {
		pdf: normalizeArtifactPath({
			candidate: resultRecord?.result?.pdf ?? null,
			missingMessage:
				"No checked-in PDF artifact is linked for this batch item.",
			options,
			pathPrefix: "output/",
			pathSuffix: ".pdf",
		}),
		report: normalizeArtifactPath({
			candidate: resultRecord?.result?.report ?? null,
			missingMessage:
				"No checked-in report artifact is linked for this batch item.",
			options,
			pathPrefix: "reports/",
			pathSuffix: ".md",
		}),
		tracker: normalizeArtifactPath({
			candidate: resultRecord?.result?.tracker ?? null,
			missingMessage:
				"No pending tracker addition is linked for this batch item.",
			options,
			pathPrefix: "batch/tracker-additions/",
			pathSuffix: ".tsv",
		}),
	};
}

function createItemWarnings(input: {
	isSelected: boolean;
	isStaleSelection: boolean;
	resultArtifacts: BatchSupervisorItemArtifacts;
	resultRecord: ParsedBatchResultRecord | null;
	stateRow: BatchStateRow | undefined;
	status: BatchSupervisorItemStatus;
}): BatchSupervisorWarningItem[] {
	const warnings: BatchSupervisorWarningItem[] = [];
	const resultStatus = input.resultRecord?.result?.status ?? null;

	if (input.status === "retryable-failed") {
		warnings.push({
			code: "retryable-failed",
			message:
				"This batch item failed with a retryable infrastructure error and can be retried.",
		});
	}

	if (resultStatus === "partial") {
		warnings.push({
			code: "partial-result",
			message:
				"This batch item completed with a partial result and needs operator follow-up.",
		});
	}

	if (input.resultRecord?.parseError) {
		warnings.push({
			code: "result-parse-failed",
			message: input.resultRecord.parseError,
		});
	}

	const stateError = input.stateRow?.error ?? "";
	const expectsResult =
		input.stateRow?.status === "completed" ||
		input.stateRow?.status === "partial" ||
		input.stateRow?.status === "skipped" ||
		(input.stateRow?.status === "failed" &&
			!stateError.startsWith("infrastructure:"));

	if (expectsResult && !input.resultRecord) {
		warnings.push(
			createMissingResultWarning(
				`Batch item #${input.stateRow?.id ?? "?"} is missing its result sidecar.`,
			),
		);
	}

	if (
		input.resultRecord?.result?.status === "completed" &&
		!input.resultArtifacts.report.exists
	) {
		warnings.push({
			code: "missing-report-artifact",
			message: input.resultArtifacts.report.message,
		});
	}

	if (
		input.resultRecord?.result?.status === "completed" &&
		!input.resultArtifacts.pdf.exists
	) {
		warnings.push({
			code: "missing-pdf-artifact",
			message: input.resultArtifacts.pdf.message,
		});
	}

	if (
		input.resultRecord?.result?.status === "completed" &&
		!input.resultArtifacts.tracker.exists
	) {
		warnings.push({
			code: "missing-tracker-artifact",
			message: input.resultArtifacts.tracker.message,
		});
	}

	if (
		input.resultRecord?.result?.status === "partial" &&
		!input.resultArtifacts.report.exists
	) {
		warnings.push({
			code: "missing-report-artifact",
			message: input.resultArtifacts.report.message,
		});
	}

	if (input.isSelected && input.isStaleSelection) {
		warnings.push({
			code: "stale-selection",
			message:
				"The selected batch item is outside the current filtered page, so detail is shown separately.",
		});
	}

	return warnings;
}

function normalizeItemError(input: {
	resultRecord: ParsedBatchResultRecord | null;
	stateRow: BatchStateRow | undefined;
	status: BatchSupervisorItemStatus;
}): string | null {
	if (input.resultRecord?.result?.error) {
		return input.resultRecord.result.error;
	}

	const rawStateError = input.stateRow?.error ?? null;

	if (!rawStateError) {
		return null;
	}

	if (rawStateError.startsWith("warnings:")) {
		return null;
	}

	if (input.status === "partial") {
		return null;
	}

	return rawStateError;
}

function toPreview(input: {
	isSelected: boolean;
	record: BatchItemRecord;
}): BatchSupervisorItemPreview {
	return {
		artifacts: input.record.artifacts,
		company: input.record.company,
		completedAt: input.record.completedAt,
		error: input.record.error,
		id: input.record.id,
		legitimacy: input.record.legitimacy,
		reportNumber: input.record.reportNumber,
		retries: input.record.retries,
		role: input.record.role,
		score: input.record.score,
		selected: input.isSelected,
		startedAt: input.record.startedAt,
		status: input.record.status,
		url: input.record.url,
		warningCount: input.record.warnings.length,
		warnings: input.record.warnings,
	};
}

function toSelectedItem(input: {
	isSelected: boolean;
	record: BatchItemRecord;
}): BatchSupervisorSelectedItem {
	return {
		...toPreview(input),
		notes: input.record.notes,
		rawStateError: input.record.rawStateError,
		resultWarnings: [...input.record.resultWarnings],
		source: input.record.source,
	};
}

function createSelectionDetail(input: {
	allItems: readonly BatchItemRecord[];
	filteredItems: readonly BatchItemRecord[];
	requestedItemId: number | null;
}): BatchSupervisorSelectedDetail {
	const selectedRecord =
		input.requestedItemId !== null
			? (input.allItems.find((item) => item.id === input.requestedItemId) ??
				null)
			: (input.filteredItems[0] ?? input.allItems[0] ?? null);

	if (input.requestedItemId !== null && !selectedRecord) {
		return {
			message: `Batch item #${input.requestedItemId} does not exist.`,
			origin: "item-id",
			requestedItemId: input.requestedItemId,
			row: null,
			state: "missing",
		};
	}

	if (!selectedRecord) {
		return {
			message: "No batch draft or recent batch items are available yet.",
			origin: "none",
			requestedItemId: null,
			row: null,
			state: "empty",
		};
	}

	const isStaleSelection =
		input.requestedItemId !== null &&
		!input.filteredItems.some((item) => item.id === selectedRecord.id);
	const selectedWithWarnings =
		isStaleSelection &&
		!selectedRecord.warnings.some(
			(warning) => warning.code === "stale-selection",
		)
			? {
					...selectedRecord,
					warnings: [
						...selectedRecord.warnings,
						{
							code: "stale-selection" as const,
							message:
								"The selected batch item is outside the current filtered page, so detail is shown separately.",
						},
					],
				}
			: selectedRecord;

	return {
		message: isStaleSelection
			? `Batch item #${selectedRecord.id} is shown outside the current filtered page.`
			: `Batch item #${selectedRecord.id} is ready for detailed review.`,
		origin: input.requestedItemId !== null ? "item-id" : "none",
		requestedItemId: input.requestedItemId,
		row: toSelectedItem({
			isSelected: true,
			record: selectedWithWarnings,
		}),
		state: "ready",
	};
}

function createStatusOptions(
	items: readonly BatchItemRecord[],
): BatchSupervisorStatusOption[] {
	const counts = new Map<BatchSupervisorStatusFilter, number>();

	for (const item of items) {
		counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
	}

	return (
		[
			"all",
			"pending",
			"processing",
			"retryable-failed",
			"partial",
			"failed",
			"completed",
			"skipped",
		] as const
	).map((id) => ({
		count: id === "all" ? items.length : (counts.get(id) ?? 0),
		id,
		label: itemStatusLabels[id],
	}));
}

function selectBatchSession(
	sessions: readonly RuntimeSessionRecord[],
): RuntimeSessionRecord | null {
	const sortedSessions = [...sessions].sort(compareSessions);

	return (
		sortedSessions.find(
			(session) =>
				session.status === "pending" ||
				session.status === "running" ||
				session.status === "waiting",
		) ??
		sortedSessions[0] ??
		null
	);
}

function selectBatchJob(
	jobs: readonly RuntimeJobRecord[],
	session: RuntimeSessionRecord | null,
): RuntimeJobRecord | null {
	if (!session) {
		return null;
	}

	const batchJobs = jobs.filter((job) => job.jobType === "batch-evaluation");

	if (session.activeJobId) {
		const activeJob = batchJobs.find(
			(job) => job.jobId === session.activeJobId,
		);

		if (activeJob) {
			return activeJob;
		}
	}

	return [...batchJobs].sort(compareJobs)[0] ?? null;
}

function selectBatchApproval(
	approvals: readonly RuntimeApprovalRecord[],
	job: RuntimeJobRecord | null,
): RuntimeApprovalRecord | null {
	if (!job) {
		return approvals[0] ?? null;
	}

	if (job.waitApprovalId) {
		const waitedApproval = approvals.find(
			(approval) => approval.approvalId === job.waitApprovalId,
		);

		if (waitedApproval) {
			return waitedApproval;
		}
	}

	return (
		approvals.find((approval) => approval.jobId === job.jobId) ??
		approvals.find((approval) => approval.status === "pending") ??
		approvals[0] ??
		null
	);
}

function parseCheckpointCursor(
	checkpoint: RuntimeRunCheckpointRecord | null,
): number | null {
	if (!checkpoint?.cursor) {
		return null;
	}

	const parsed = Number.parseInt(checkpoint.cursor, 10);
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseCheckpointItems(
	checkpoint: RuntimeRunCheckpointRecord | null,
): readonly JsonRecord[] {
	const value = checkpoint?.value ?? null;

	if (!isJsonRecord(value)) {
		return [];
	}

	const items = value.items;
	return Array.isArray(items)
		? items.filter((item): item is JsonRecord => isJsonRecord(item))
		: [];
}

function createRunCheckpoint(
	checkpoint: RuntimeRunCheckpointRecord | null,
): BatchSupervisorRunCheckpoint {
	const items = parseCheckpointItems(checkpoint);
	const lastProcessed = items[items.length - 1];
	const lastProcessedItemId =
		typeof lastProcessed?.id === "number" && Number.isInteger(lastProcessed.id)
			? lastProcessed.id
			: null;

	return {
		completedItemCount: items.length,
		cursor: parseCheckpointCursor(checkpoint),
		lastProcessedItemId,
		updatedAt: checkpoint?.updatedAt ?? null,
	};
}

function toRunWarnings(input: {
	approval: RuntimeApprovalRecord | null;
	job: RuntimeJobRecord | null;
}): BatchSupervisorWarningItem[] {
	const parsedResult = batchEvaluationResultSchema.safeParse(
		input.job?.result ?? null,
	);
	const resultWarnings = parsedResult.success
		? parsedResult.data.warnings.map((warning) => ({
				code:
					warning.code === "batch-closeout-warning"
						? ("closeout-warning" as BatchSupervisorWarningCode)
						: ("closeout-warning" as BatchSupervisorWarningCode),
				message: warning.message,
			}))
		: [];

	if (input.job?.status === "waiting" && input.job.waitReason === "approval") {
		return [
			...resultWarnings,
			{
				code: "approval-paused",
				message:
					`Batch run is waiting for approval ${input.approval?.approvalId ?? input.job.waitApprovalId ?? ""}.`.trim(),
			},
		];
	}

	return resultWarnings;
}

function buildRunSummary(input: {
	approval: RuntimeApprovalRecord | null;
	checkpoint: RuntimeRunCheckpointRecord | null;
	counts: BatchSupervisorCounts;
	draft: BatchSupervisorDraftSummary;
	job: RuntimeJobRecord | null;
	session: RuntimeSessionRecord | null;
}): BatchSupervisorRunSummary {
	const parsedPayload = batchEvaluationPayloadSchema.safeParse(
		input.job?.payload ?? null,
	);
	const payload: BatchEvaluationPayload = parsedPayload.success
		? parsedPayload.data
		: DEFAULT_BATCH_PAYLOAD;
	const warnings = toRunWarnings({
		approval: input.approval,
		job: input.job,
	});
	const checkpoint = createRunCheckpoint(input.checkpoint);
	const base = {
		approvalId: input.approval?.approvalId ?? input.job?.waitApprovalId ?? null,
		checkpoint,
		completedAt: input.job?.completedAt ?? null,
		counts: input.counts,
		dryRun: payload.dryRun,
		jobId: input.job?.jobId ?? null,
		mode: payload.mode,
		runId: input.job?.currentRunId ?? null,
		sessionId: input.session?.sessionId ?? null,
		startedAt: input.job?.startedAt ?? null,
		updatedAt: input.job?.updatedAt ?? input.session?.updatedAt ?? null,
		warnings,
	};

	if (!input.session || !input.job) {
		return {
			...base,
			message:
				input.draft.totalCount > 0
					? "Batch draft is ready, but no batch run has been recorded yet."
					: "No batch run has been recorded yet.",
			state: "idle",
		};
	}

	if (input.job.status === "waiting" && input.job.waitReason === "approval") {
		return {
			...base,
			message: "Batch run is waiting for approval before it can continue.",
			state: "approval-paused",
		};
	}

	if (
		input.job.status === "pending" ||
		input.job.status === "queued" ||
		(input.job.status === "waiting" && input.job.waitReason === "retry") ||
		input.session.status === "pending"
	) {
		return {
			...base,
			message: "Batch run is queued and waiting to start.",
			state: "queued",
		};
	}

	if (input.job.status === "running" || input.session.status === "running") {
		return {
			...base,
			message: "Batch run is currently processing items.",
			state: "running",
		};
	}

	if (
		input.job.status === "failed" ||
		input.job.status === "cancelled" ||
		input.session.status === "failed" ||
		input.session.status === "cancelled"
	) {
		const errorMessage =
			typeof input.job.error === "string"
				? input.job.error
				: isJsonRecord(input.job.error) &&
						typeof input.job.error.message === "string"
					? input.job.error.message
					: "The latest batch run ended in a failed state.";

		return {
			...base,
			message: errorMessage,
			state: "failed",
		};
	}

	const parsedResult = batchEvaluationResultSchema.safeParse(
		input.job.result ?? null,
	);

	if (!parsedResult.success) {
		return {
			...base,
			message:
				"The latest batch run completed, but its result payload could not be parsed.",
			state: "failed",
			warnings: [
				...warnings,
				{
					code: "result-parse-failed",
					message:
						"The latest batch run completed, but its result payload could not be parsed.",
				},
			],
		};
	}

	return {
		...base,
		counts: {
			completed: parsedResult.data.counts.completed,
			failed: parsedResult.data.counts.failed,
			partial: parsedResult.data.counts.partial,
			pending: parsedResult.data.counts.pending,
			processing: input.counts.processing,
			retryableFailed: parsedResult.data.counts.retryableFailed,
			skipped: parsedResult.data.counts.skipped,
			total: parsedResult.data.counts.total,
		},
		message:
			parsedResult.data.counts.total === 1
				? "The latest batch run completed with 1 item."
				: `The latest batch run completed with ${parsedResult.data.counts.total} items.`,
		state: "completed",
	};
}

function createDraftSummary(input: {
	draftCounts: DraftCounts;
	firstRunnableItemId: number | null;
	pendingTrackerAdditionCount: number;
	totalDraftCount: number;
}): BatchSupervisorDraftSummary {
	if (input.totalDraftCount === 0) {
		return {
			available: false,
			counts: input.draftCounts,
			firstRunnableItemId: null,
			message: "No active batch draft is available in batch/batch-input.tsv.",
			pendingTrackerAdditionCount: input.pendingTrackerAdditionCount,
			totalCount: 0,
		};
	}

	if (input.firstRunnableItemId === null) {
		return {
			available: true,
			counts: input.draftCounts,
			firstRunnableItemId: null,
			message:
				"Batch draft is present, but no runnable pending rows remain in the current file set.",
			pendingTrackerAdditionCount: input.pendingTrackerAdditionCount,
			totalCount: input.totalDraftCount,
		};
	}

	return {
		available: true,
		counts: input.draftCounts,
		firstRunnableItemId: input.firstRunnableItemId,
		message:
			input.draftCounts.pending === 1
				? "Batch draft has 1 runnable pending row."
				: `Batch draft has ${input.draftCounts.pending} runnable pending rows.`,
		pendingTrackerAdditionCount: input.pendingTrackerAdditionCount,
		totalCount: input.totalDraftCount,
	};
}

function createCloseoutSummary(input: {
	pendingTrackerAdditionCount: number;
	run: BatchSupervisorRunSummary;
}): BatchSupervisorCloseoutSummary {
	const activeRun =
		input.run.state === "queued" ||
		input.run.state === "running" ||
		input.run.state === "approval-paused";

	if (activeRun) {
		return {
			mergeBlocked: true,
			message:
				"Closeout actions stay blocked until the active batch run finishes.",
			pendingTrackerAdditionCount: input.pendingTrackerAdditionCount,
			warnings: [
				{
					code: "merge-blocked",
					message:
						"Finish the active batch run before merging tracker additions or verifying closeout.",
				},
			],
		};
	}

	if (input.pendingTrackerAdditionCount > 0) {
		return {
			mergeBlocked: false,
			message:
				input.pendingTrackerAdditionCount === 1
					? "1 tracker addition is ready to merge."
					: `${input.pendingTrackerAdditionCount} tracker additions are ready to merge.`,
			pendingTrackerAdditionCount: input.pendingTrackerAdditionCount,
			warnings: [],
		};
	}

	return {
		mergeBlocked: false,
		message: "No pending tracker additions are waiting for closeout.",
		pendingTrackerAdditionCount: input.pendingTrackerAdditionCount,
		warnings: [],
	};
}

function createActionAvailability(input: {
	closeout: BatchSupervisorCloseoutSummary;
	draft: BatchSupervisorDraftSummary;
	run: BatchSupervisorRunSummary;
	startupMessage: string;
	startupStatus: ReturnType<typeof getStartupStatus>;
}): BatchSupervisorActionAvailability[] {
	const startupBlocked = input.startupStatus !== "ready";
	const activeRun =
		input.run.state === "queued" ||
		input.run.state === "running" ||
		input.run.state === "approval-paused";

	if (startupBlocked) {
		return [
			{
				action: "resume-run-pending",
				available: false,
				message: input.startupMessage,
			},
			{
				action: "retry-failed",
				available: false,
				message: input.startupMessage,
			},
			{
				action: "merge-tracker-additions",
				available: false,
				message: input.startupMessage,
			},
			{
				action: "verify-tracker-pipeline",
				available: false,
				message: input.startupMessage,
			},
		];
	}

	return [
		{
			action: "resume-run-pending",
			available: !activeRun && input.draft.counts.pending > 0,
			message: activeRun
				? "Wait for the active batch run to finish before starting another run."
				: input.draft.counts.pending > 0
					? "Resume batch evaluation for pending rows."
					: "No pending batch rows are available to resume.",
		},
		{
			action: "retry-failed",
			available: !activeRun && input.draft.counts.retryableFailed > 0,
			message: activeRun
				? "Wait for the active batch run to finish before retrying failures."
				: input.draft.counts.retryableFailed > 0
					? "Retry the batch items that failed with retryable infrastructure errors."
					: "No retryable batch failures are available.",
		},
		{
			action: "merge-tracker-additions",
			available:
				!input.closeout.mergeBlocked &&
				input.closeout.pendingTrackerAdditionCount > 0,
			message: input.closeout.mergeBlocked
				? input.closeout.message
				: input.closeout.pendingTrackerAdditionCount > 0
					? "Merge pending tracker additions into the applications tracker."
					: "No pending tracker additions are available to merge.",
		},
		{
			action: "verify-tracker-pipeline",
			available: !input.closeout.mergeBlocked,
			message: input.closeout.mergeBlocked
				? input.closeout.message
				: "Run the tracker verification pass for the current batch artifacts.",
		},
	];
}

function createSummaryMessage(input: {
	closeout: BatchSupervisorCloseoutSummary;
	draft: BatchSupervisorDraftSummary;
	filteredCount: number;
	selectedDetail: BatchSupervisorSelectedDetail;
	startupMessage: string;
	startupStatus: ReturnType<typeof getStartupStatus>;
}): string {
	if (input.startupStatus !== "ready") {
		return input.startupMessage;
	}

	if (input.selectedDetail.state === "missing") {
		return input.selectedDetail.message;
	}

	if (input.selectedDetail.state === "empty") {
		return input.draft.message;
	}

	if (input.closeout.warnings.length > 0) {
		return input.closeout.message;
	}

	if (input.filteredCount === 0) {
		return "No batch items match the current filters.";
	}

	return input.selectedDetail.message;
}

export function readBatchSupervisorSelection(
	context: JsonValue,
): number | null {
	if (!isJsonRecord(context)) {
		return null;
	}

	const batchSupervisor = context.batchSupervisor;

	if (!isJsonRecord(batchSupervisor)) {
		return null;
	}

	return typeof batchSupervisor.itemId === "number" &&
		Number.isInteger(batchSupervisor.itemId) &&
		batchSupervisor.itemId > 0
		? batchSupervisor.itemId
		: null;
}

export async function createBatchSupervisorSummary(
	services: ApiServiceContainer,
	options: BatchSupervisorSummaryOptions = {},
): Promise<BatchSupervisorSummaryPayload> {
	const diagnostics = await services.startupDiagnostics.getDiagnostics();
	const startupStatus = getStartupStatus(diagnostics);
	const startupMessage = getStartupMessage(diagnostics);
	const generatedAt = new Date().toISOString();
	const filters = {
		itemId: options.itemId ?? null,
		limit: clampLimit(options.limit),
		offset: clampOffset(options.offset),
		status: options.status ?? "all",
	} satisfies BatchSupervisorSummaryPayload["filters"];
	const repoRoot = services.workspace.repoPaths.repoRoot;
	const [
		inputRows,
		stateRows,
		resultIndex,
		pendingTrackerAdditionCount,
		store,
	] = await Promise.all([
		readBatchInputRows(repoRoot),
		readBatchStateRows(repoRoot),
		readBatchResultIndex(repoRoot),
		readPendingTrackerAdditionCount(services),
		services.operationalStore.getStore(),
	]);
	let batchSessions = await store.sessions.listRecent({
		limit: 8,
		workflow: "batch-evaluation",
	});

	if (batchSessions.length === 0) {
		const fallbackSessions = await store.sessions.listRecent({
			limit: 12,
		});
		const fallbackMatches = await Promise.all(
			fallbackSessions.map(async (session) => {
				const jobs = await store.jobs.listBySessionId(session.sessionId);
				return jobs.some((job) => job.jobType === "batch-evaluation")
					? session
					: null;
			}),
		);

		batchSessions = fallbackMatches.filter(
			(session): session is RuntimeSessionRecord => session !== null,
		);
	}
	const selectedSession = selectBatchSession(batchSessions);
	const selectedJobs = selectedSession
		? await store.jobs.listBySessionId(selectedSession.sessionId)
		: [];
	const selectedApprovals = selectedSession
		? await store.approvals.listBySessionId(selectedSession.sessionId)
		: [];
	const selectedJob = selectBatchJob(selectedJobs, selectedSession);
	const selectedApproval = selectBatchApproval(selectedApprovals, selectedJob);
	const selectedCheckpoint = selectedJob?.currentRunId
		? await store.runMetadata.loadCheckpoint(selectedJob.currentRunId)
		: null;
	const parsedPayload = batchEvaluationPayloadSchema.safeParse(
		selectedJob?.payload ?? null,
	);
	const payload = parsedPayload.success
		? parsedPayload.data
		: DEFAULT_BATCH_PAYLOAD;
	const allItemIds = new Set<number>();

	for (const row of inputRows) {
		allItemIds.add(row.id);
	}

	for (const id of stateRows.keys()) {
		allItemIds.add(id);
	}

	for (const id of resultIndex.latestById.keys()) {
		allItemIds.add(id);
	}

	const inputById = new Map(inputRows.map((row) => [row.id, row]));
	const allItems: BatchItemRecord[] = [];
	const allCounts = createEmptyCounts();
	const draftCounts = createEmptyCounts();
	let firstRunnableItemId: number | null = null;

	for (const id of [...allItemIds].sort((left, right) => left - right)) {
		const inputRow = inputById.get(id);
		const stateRow = stateRows.get(id);
		const status = deriveItemStatus({
			maxRetries: payload.maxRetries,
			stateRow,
		});
		const resultRecord = stateRow?.reportNumber
			? (resultIndex.byExactKey.get(`${id}:${stateRow.reportNumber}`) ?? null)
			: (resultIndex.latestById.get(id) ?? null);
		const artifacts = createResultArtifacts({ repoRoot }, resultRecord);
		const provisionalRecord: BatchItemRecord = {
			artifacts,
			company: resultRecord?.result?.company ?? null,
			completedAt: stateRow?.completedAt ?? null,
			error: null,
			id,
			legitimacy: resultRecord?.result?.legitimacy ?? null,
			notes: inputRow?.notes ?? null,
			rawStateError: stateRow?.error ?? null,
			reportNumber:
				stateRow?.reportNumber ?? resultRecord?.reportNumber ?? null,
			resultWarnings: resultRecord?.result?.warnings ?? [],
			retries: stateRow?.retries ?? 0,
			role: resultRecord?.result?.role ?? null,
			score: resultRecord?.result?.score ?? stateRow?.score ?? null,
			source: inputRow?.source ?? null,
			startedAt: stateRow?.startedAt ?? null,
			status,
			url: inputRow?.url ?? stateRow?.url ?? "",
			warnings: [],
		};
		const warnings = createItemWarnings({
			isSelected: filters.itemId === id,
			isStaleSelection: false,
			resultArtifacts: artifacts,
			resultRecord,
			stateRow,
			status,
		});
		const record = {
			...provisionalRecord,
			error: normalizeItemError({
				resultRecord,
				stateRow,
				status,
			}),
			warnings,
		};

		accumulateCounts(allCounts, record.status);
		allItems.push(record);

		if (inputRow) {
			accumulateCounts(draftCounts, record.status);

			if (record.status === "pending" && firstRunnableItemId === null) {
				firstRunnableItemId = record.id;
			}
		}
	}

	const filteredItems = allItems
		.filter(
			(item) => filters.status === "all" || item.status === filters.status,
		)
		.sort(compareItems);
	const pagedItems = filteredItems.slice(
		filters.offset,
		filters.offset + filters.limit,
	);

	if (
		filters.itemId !== null &&
		!allItems.some((item) => item.id === filters.itemId)
	) {
		throw new BatchSupervisorInputError(
			`Batch item #${filters.itemId} does not exist.`,
			"invalid-batch-supervisor-item",
		);
	}

	const draft = createDraftSummary({
		draftCounts,
		firstRunnableItemId,
		pendingTrackerAdditionCount,
		totalDraftCount: inputRows.length,
	});
	const run = buildRunSummary({
		approval: selectedApproval,
		checkpoint: selectedCheckpoint,
		counts: allCounts,
		draft,
		job: selectedJob,
		session: selectedSession,
	});
	const closeout = createCloseoutSummary({
		pendingTrackerAdditionCount,
		run,
	});
	const selectedDetail = createSelectionDetail({
		allItems,
		filteredItems,
		requestedItemId: filters.itemId,
	});
	const actions = createActionAvailability({
		closeout,
		draft,
		run,
		startupMessage,
		startupStatus,
	});

	return {
		actions,
		closeout,
		draft,
		filters,
		generatedAt,
		items: {
			filteredCount: filteredItems.length,
			hasMore: filters.offset + pagedItems.length < filteredItems.length,
			items: pagedItems.map((item) =>
				toPreview({
					isSelected: selectedDetail.row?.id === item.id,
					record: item,
				}),
			),
			limit: filters.limit,
			offset: filters.offset,
			totalCount: allItems.length,
		},
		message: createSummaryMessage({
			closeout,
			draft,
			filteredCount: filteredItems.length,
			selectedDetail,
			startupMessage,
			startupStatus,
		}),
		ok: true,
		run,
		selectedDetail,
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		status: startupStatus,
		statusOptions: createStatusOptions(allItems),
	};
}

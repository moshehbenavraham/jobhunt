import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import {
	scanWorkflowPayloadSchema,
	scanWorkflowResultSchema,
} from "../job-runner/workflow-job-contract.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import type {
	RuntimeApprovalRecord,
	RuntimeJobRecord,
	RuntimeSessionRecord,
} from "../store/store-contract.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import {
	DEFAULT_SCAN_REVIEW_LIMIT,
	MAX_SCAN_REVIEW_LIMIT,
	type ScanReviewAction,
	type ScanReviewBatchSeedHandoff,
	type ScanReviewBucket,
	type ScanReviewCandidatePreview,
	type ScanReviewDuplicateHint,
	type ScanReviewEvaluateHandoff,
	type ScanReviewFreshness,
	type ScanReviewIgnoreAction,
	type ScanReviewRunCounts,
	type ScanReviewRunSummary,
	type ScanReviewSelectedCandidate,
	type ScanReviewSelectedDetail,
	type ScanReviewSummaryOptions,
	type ScanReviewSummaryPayload,
	type ScanReviewWarningItem,
} from "./scan-review-contract.js";
import { getStartupMessage, getStartupStatus } from "./startup-status.js";

type JsonRecord = Record<string, JsonValue>;

type PendingPipelineEntry = {
	company: string | null;
	role: string;
	sourceLine: string;
	url: string;
};

type ShortlistCandidateSeed = {
	bucket: ScanReviewBucket;
	company: string | null;
	rank: number;
	reasonSummary: string | null;
	role: string;
	sourceLine: string;
	url: string;
};

type ParsedShortlist = {
	available: boolean;
	campaignGuidance: string | null;
	bucketCounts: {
		adjacentOrNoisy: number | null;
		possibleFit: number | null;
		strongestFit: number | null;
	};
	candidates: ShortlistCandidateSeed[];
	lastRefreshed: string | null;
	message: string;
	pendingEntries: PendingPipelineEntry[];
};

type ScanHistoryRow = {
	company: string | null;
	firstSeen: string | null;
	portal: string | null;
	status: string | null;
	title: string | null;
	url: string;
};

type ScanHistoryIndex = {
	byCompany: Map<string, ScanHistoryRow[]>;
	byUrl: Map<string, ScanHistoryRow>;
};

type ScanReviewCandidateRecord = {
	bucket: ScanReviewBucket;
	company: string | null;
	duplicateHint: ScanReviewDuplicateHint;
	ignored: boolean;
	rank: number;
	reasonSummary: string | null;
	role: string;
	sourceLine: string;
	url: string;
};

const SCAN_REVIEW_CONTEXT_KEY = "scanReview";

export class ScanReviewInputError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-scan-review-query") {
		super(message);
		this.code = code;
		this.name = "ScanReviewInputError";
	}
}

function isJsonRecord(
	value: JsonValue | null | undefined,
): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMarkdownDocument(content: string): string {
	return content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function clampLimit(value: number | undefined): number {
	if (value === undefined) {
		return DEFAULT_SCAN_REVIEW_LIMIT;
	}

	return Math.max(1, Math.min(value, MAX_SCAN_REVIEW_LIMIT));
}

function clampOffset(value: number | undefined): number {
	if (value === undefined) {
		return 0;
	}

	return Math.max(0, value);
}

function normalizeUrl(value: string | undefined): string | null {
	const trimmed = value?.trim() ?? "";

	if (trimmed.length === 0) {
		return null;
	}

	let parsedUrl: URL;

	try {
		parsedUrl = new URL(trimmed);
	} catch {
		throw new ScanReviewInputError(
			`Scan review URL focus is invalid: ${trimmed}.`,
			"invalid-scan-review-url",
		);
	}

	if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
		throw new ScanReviewInputError(
			"Scan review URL focus must use http or https.",
			"invalid-scan-review-url",
		);
	}

	parsedUrl.hash = "";
	return parsedUrl.toString();
}

function normalizeBucketFilter(
	value: ScanReviewSummaryOptions["bucket"],
): ScanReviewSummaryPayload["filters"]["bucket"] {
	return value ?? "all";
}

function normalizeCompanyKey(company: string | null): string | null {
	const normalized = company?.trim().toLowerCase() ?? "";
	return normalized.length > 0 ? normalized : null;
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

function getSectionRange(
	text: string,
	marker: "## Pending" | "## Shortlist",
): {
	end: number;
	start: number;
} | null {
	const start = text.indexOf(marker);

	if (start === -1) {
		return null;
	}

	const nextSection = text.indexOf("\n## ", start + marker.length);

	return {
		end: nextSection === -1 ? text.length : nextSection + 1,
		start,
	};
}

function parseBucket(rawBucket: string): ScanReviewBucket | null {
	const normalized = rawBucket.trim().toLowerCase();

	switch (normalized) {
		case "strongest fit":
			return "strongest-fit";
		case "possible fit":
			return "possible-fit";
		case "adjacent or noisy":
			return "adjacent-or-noisy";
		default:
			return null;
	}
}

function parseBucketCountLine(
	line: string,
): Partial<ParsedShortlist["bucketCounts"]> | null {
	const match = line.match(/^-+\s+([^:]+):\s*(\d+)\s*$/);

	if (!match) {
		return null;
	}

	const bucket = parseBucket(match[1] ?? "");
	const count = Number.parseInt(match[2] ?? "", 10);

	if (!bucket || Number.isNaN(count)) {
		return null;
	}

	switch (bucket) {
		case "strongest-fit":
			return {
				strongestFit: count,
			};
		case "possible-fit":
			return {
				possibleFit: count,
			};
		case "adjacent-or-noisy":
			return {
				adjacentOrNoisy: count,
			};
	}
}

function parseShortlistCandidateLine(
	line: string,
): ShortlistCandidateSeed | null {
	const rankMatch = line.match(/^(\d+)\.\s+(.+)$/);

	if (!rankMatch) {
		return null;
	}

	const rank = Number.parseInt(rankMatch[1] ?? "", 10);
	const body = rankMatch[2] ?? "";

	if (Number.isNaN(rank)) {
		return null;
	}

	const parts = body.split(/\s+\|\s+/).map((part) => part.trim());

	if (parts.length < 4) {
		return null;
	}

	const bucket = parseBucket(parts[0] ?? "");
	const url = normalizeUrl(parts[1]);
	const company = parts[2]?.trim() || null;
	const role = parts[3]?.trim() || "";
	const reasonSummary = parts.slice(4).join(" | ").trim() || null;

	if (!bucket || !url || role.length === 0) {
		return null;
	}

	return {
		bucket,
		company,
		rank,
		reasonSummary,
		role,
		sourceLine: line,
		url,
	};
}

function parsePendingEntry(line: string): PendingPipelineEntry | null {
	const match = line.match(/^-+\s+\[\s*\]\s+(.+)$/);

	if (!match) {
		return null;
	}

	const parts = (match[1] ?? "").split(/\s+\|\s+/).map((part) => part.trim());

	if (parts.length < 3) {
		return null;
	}

	const url = normalizeUrl(parts[0]);
	const role = parts[2]?.trim() || "";

	if (!url || role.length === 0) {
		return null;
	}

	return {
		company: parts[1]?.trim() || null,
		role,
		sourceLine: line,
		url,
	};
}

function createEmptyShortlist(message: string): ParsedShortlist {
	return {
		available: false,
		campaignGuidance: null,
		bucketCounts: {
			adjacentOrNoisy: null,
			possibleFit: null,
			strongestFit: null,
		},
		candidates: [],
		lastRefreshed: null,
		message,
		pendingEntries: [],
	};
}

function parsePipelineShortlist(content: string): ParsedShortlist {
	const normalized = normalizeMarkdownDocument(content);
	const shortlistRange = getSectionRange(normalized, "## Shortlist");
	const pendingRange = getSectionRange(normalized, "## Pending");
	const pendingEntries: PendingPipelineEntry[] = [];

	if (pendingRange) {
		const pendingText = normalized
			.slice(pendingRange.start + "## Pending".length, pendingRange.end)
			.trim();
		const pendingLines = pendingText.split("\n");

		for (const line of pendingLines) {
			const parsedEntry = parsePendingEntry(line);

			if (parsedEntry) {
				pendingEntries.push(parsedEntry);
			}
		}
	}

	if (!shortlistRange) {
		return {
			...createEmptyShortlist(
				"No shortlist guidance is available in data/pipeline.md.",
			),
			pendingEntries,
		};
	}

	const shortlistText = normalized
		.slice(shortlistRange.start + "## Shortlist".length, shortlistRange.end)
		.trim();
	const shortlistLines = shortlistText.split("\n");
	const bucketCounts = {
		adjacentOrNoisy: null,
		possibleFit: null,
		strongestFit: null,
	} satisfies ParsedShortlist["bucketCounts"];
	const candidates: ShortlistCandidateSeed[] = [];
	const seenUrls = new Set<string>();
	let campaignGuidance: string | null = null;
	let lastRefreshed: string | null = null;

	for (const line of shortlistLines) {
		const trimmed = line.trim();

		if (trimmed.length === 0) {
			continue;
		}

		if (trimmed.startsWith("Last refreshed:")) {
			const value = trimmed.slice("Last refreshed:".length).trim();
			lastRefreshed = value.length > 0 ? value : null;
			continue;
		}

		if (trimmed.startsWith("Campaign guidance:")) {
			const value = trimmed.slice("Campaign guidance:".length).trim();
			campaignGuidance = value.length > 0 ? value : null;
			continue;
		}

		const parsedBucketCount = parseBucketCountLine(trimmed);

		if (parsedBucketCount) {
			Object.assign(bucketCounts, parsedBucketCount);
			continue;
		}

		const parsedCandidate = parseShortlistCandidateLine(trimmed);

		if (!parsedCandidate || seenUrls.has(parsedCandidate.url)) {
			continue;
		}

		seenUrls.add(parsedCandidate.url);
		candidates.push(parsedCandidate);
	}

	if (candidates.length === 0) {
		return {
			available:
				lastRefreshed !== null ||
				campaignGuidance !== null ||
				bucketCounts.strongestFit !== null ||
				bucketCounts.possibleFit !== null ||
				bucketCounts.adjacentOrNoisy !== null,
			campaignGuidance,
			bucketCounts,
			candidates,
			lastRefreshed,
			message:
				"Shortlist guidance exists, but no ranked candidates were parsed from data/pipeline.md.",
			pendingEntries,
		};
	}

	return {
		available: true,
		campaignGuidance,
		bucketCounts,
		candidates,
		lastRefreshed,
		message: `Parsed ${candidates.length} shortlist candidate${candidates.length === 1 ? "" : "s"} from data/pipeline.md.`,
		pendingEntries,
	};
}

function addHistoryRow(
	map: Map<string, ScanHistoryRow[]>,
	company: string | null,
	row: ScanHistoryRow,
): void {
	const key = normalizeCompanyKey(company);

	if (!key) {
		return;
	}

	const existingRows = map.get(key) ?? [];
	existingRows.push(row);
	existingRows.sort((left, right) =>
		(left.firstSeen ?? "").localeCompare(right.firstSeen ?? ""),
	);
	map.set(key, existingRows);
}

function parseScanHistory(content: string): ScanHistoryIndex {
	const normalized = normalizeMarkdownDocument(content);
	const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
	const byCompany = new Map<string, ScanHistoryRow[]>();
	const byUrl = new Map<string, ScanHistoryRow>();
	let startIndex = 0;

	if ((lines[0] ?? "").startsWith("url\t")) {
		startIndex = 1;
	}

	for (let index = startIndex; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		const parts = line.split("\t");

		if (parts.length < 6) {
			continue;
		}

		const url = normalizeUrl(parts[0]);

		if (!url) {
			continue;
		}

		const row: ScanHistoryRow = {
			company: parts[4]?.trim() || null,
			firstSeen: parts[1]?.trim() || null,
			portal: parts[2]?.trim() || null,
			status: parts[5]?.trim() || null,
			title: parts[3]?.trim() || null,
			url,
		};

		addHistoryRow(byCompany, row.company, row);

		const existingRow = byUrl.get(row.url);

		if (!existingRow) {
			byUrl.set(row.url, row);
			continue;
		}

		const existingDate = existingRow.firstSeen ?? "9999-99-99";
		const nextDate = row.firstSeen ?? "9999-99-99";

		if (nextDate.localeCompare(existingDate) < 0) {
			byUrl.set(row.url, row);
		}
	}

	return {
		byCompany,
		byUrl,
	};
}

function computeFreshness(firstSeen: string | null): ScanReviewFreshness {
	if (!firstSeen) {
		return "unknown";
	}

	const parsedDate = Date.parse(`${firstSeen}T00:00:00.000Z`);

	if (Number.isNaN(parsedDate)) {
		return "unknown";
	}

	const ageMs = Date.now() - parsedDate;
	const ageDays = Math.floor(ageMs / 86_400_000);

	if (ageDays <= 1) {
		return "new";
	}

	if (ageDays <= 7) {
		return "recent";
	}

	return "stale";
}

function createDuplicateHint(input: {
	companyHistoryRows: readonly ScanHistoryRow[];
	companyShortlistCount: number;
	exactHistoryRow: ScanHistoryRow | null;
	pendingOverlap: boolean;
}): ScanReviewDuplicateHint {
	const firstSeen =
		input.exactHistoryRow?.firstSeen ??
		input.companyHistoryRows[0]?.firstSeen ??
		null;

	return {
		firstSeen,
		freshness: computeFreshness(firstSeen),
		historyCount: input.companyHistoryRows.length,
		otherShortlistCount: Math.max(0, input.companyShortlistCount - 1),
		pendingOverlap: input.pendingOverlap,
		portal:
			input.exactHistoryRow?.portal ??
			input.companyHistoryRows[0]?.portal ??
			null,
		status:
			input.exactHistoryRow?.status ??
			input.companyHistoryRows[0]?.status ??
			null,
		title:
			input.exactHistoryRow?.title ??
			input.companyHistoryRows[0]?.title ??
			null,
	};
}

function createCandidateWarnings(input: {
	duplicateHint: ScanReviewDuplicateHint;
	ignored: boolean;
	staleSelection: boolean;
}): ScanReviewWarningItem[] {
	const warnings: ScanReviewWarningItem[] = [];

	if (
		input.duplicateHint.otherShortlistCount > 0 ||
		input.duplicateHint.historyCount > 1
	) {
		warnings.push({
			code: "duplicate-heavy",
			message:
				"Similar shortlist candidates already exist for this company, so this item needs duplicate review.",
		});
	}

	if (input.duplicateHint.pendingOverlap) {
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

	return warnings;
}

function createEvaluateHandoff(url: string): ScanReviewEvaluateHandoff {
	return {
		context: {
			promptText: url,
		},
		message: `Launch a single evaluation for ${url}.`,
		workflow: "single-evaluation",
	};
}

function createBatchSeedHandoff(
	candidate: Pick<
		ScanReviewCandidateRecord,
		"bucket" | "company" | "reasonSummary" | "role" | "url"
	>,
): ScanReviewBatchSeedHandoff {
	return {
		item: {
			bucket: candidate.bucket,
			company: candidate.company,
			reasonSummary: candidate.reasonSummary,
			role: candidate.role,
			url: candidate.url,
		},
		message: `Seed batch review with ${candidate.url}.`,
		selection: {
			limit: 1,
			mode: "selected-urls",
			urls: [candidate.url],
		},
		target: "batch-composer",
	};
}

function createIgnoreAction(
	action: ScanReviewAction,
	sessionId: string | null,
	url: string,
): ScanReviewIgnoreAction {
	return {
		action,
		message:
			action === "ignore"
				? "Hide this role from the current scan review session."
				: "Restore this role to the current scan review session.",
		sessionId,
		url,
	};
}

function toCandidatePreview(input: {
	candidate: ScanReviewCandidateRecord;
	selected: boolean;
	sessionId: string | null;
	staleSelection: boolean;
}): ScanReviewCandidatePreview {
	const warnings = createCandidateWarnings({
		duplicateHint: input.candidate.duplicateHint,
		ignored: input.candidate.ignored,
		staleSelection: input.staleSelection,
	});

	return {
		batchSeed: createBatchSeedHandoff(input.candidate),
		bucket: input.candidate.bucket,
		company: input.candidate.company,
		duplicateHint: input.candidate.duplicateHint,
		evaluate: createEvaluateHandoff(input.candidate.url),
		ignoreAction: createIgnoreAction(
			input.candidate.ignored ? "restore" : "ignore",
			input.sessionId,
			input.candidate.url,
		),
		ignored: input.candidate.ignored,
		rank: input.candidate.rank,
		reasonSummary: input.candidate.reasonSummary,
		role: input.candidate.role,
		selected: input.selected,
		url: input.candidate.url,
		warningCount: warnings.length,
		warnings,
	};
}

function toSelectedCandidate(input: {
	candidate: ScanReviewCandidateRecord;
	sessionId: string | null;
	staleSelection: boolean;
}): ScanReviewSelectedCandidate {
	return {
		...toCandidatePreview({
			candidate: input.candidate,
			selected: true,
			sessionId: input.sessionId,
			staleSelection: input.staleSelection,
		}),
		sourceLine: input.candidate.sourceLine,
	};
}

function createEmptySelectedDetail(
	requestedUrl: string | null,
	message: string,
): ScanReviewSelectedDetail {
	return {
		message,
		origin: requestedUrl ? "url" : "none",
		requestedUrl,
		row: null,
		state: requestedUrl ? "missing" : "empty",
	};
}

function readErrorMessage(error: JsonValue | null): string | null {
	if (typeof error === "string" && error.trim().length > 0) {
		return error.trim();
	}

	if (isJsonRecord(error) && typeof error.message === "string") {
		return error.message.trim() || null;
	}

	return null;
}

function findSelectedSession(
	sessions: readonly RuntimeSessionRecord[],
	requestedSessionId: string | null,
): RuntimeSessionRecord | null {
	if (requestedSessionId) {
		return (
			sessions.find((session) => session.sessionId === requestedSessionId) ??
			null
		);
	}

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

function selectRelevantJob(
	jobs: readonly RuntimeJobRecord[],
	session: RuntimeSessionRecord | null,
): RuntimeJobRecord | null {
	if (!session) {
		return null;
	}

	if (session.activeJobId) {
		const activeJob = jobs.find((job) => job.jobId === session.activeJobId);

		if (activeJob) {
			return activeJob;
		}
	}

	return [...jobs].sort(compareJobs)[0] ?? null;
}

function selectRelevantApproval(
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

function createEmptyRunCounts(): ScanReviewRunCounts {
	return {
		companiesConfigured: null,
		companiesScanned: null,
		companiesSkipped: null,
		duplicatesSkipped: null,
		filteredByLocation: null,
		filteredByTitle: null,
		newOffersAdded: null,
		totalJobsFound: null,
	};
}

function buildRunSummary(input: {
	approval: RuntimeApprovalRecord | null;
	job: RuntimeJobRecord | null;
	session: RuntimeSessionRecord | null;
}): ScanReviewRunSummary {
	const parsedPayload = scanWorkflowPayloadSchema.safeParse(
		input.job?.payload ?? {},
	);
	const payload = parsedPayload.success
		? parsedPayload.data
		: scanWorkflowPayloadSchema.parse({});
	const parsedResult = scanWorkflowResultSchema.safeParse(
		input.job?.result ?? null,
	);
	const runWarnings = parsedResult.success
		? parsedResult.data.warnings.map((warning) => ({
				code: warning.code,
				message: warning.message,
			}))
		: [];
	const runCounts = parsedResult.success
		? {
				companiesConfigured: parsedResult.data.summary.companiesConfigured,
				companiesScanned: parsedResult.data.summary.companiesScanned,
				companiesSkipped: parsedResult.data.summary.companiesSkipped,
				duplicatesSkipped: parsedResult.data.summary.duplicatesSkipped,
				filteredByLocation: parsedResult.data.summary.filteredByLocation,
				filteredByTitle: parsedResult.data.summary.filteredByTitle,
				newOffersAdded: parsedResult.data.summary.newOffersAdded,
				totalJobsFound: parsedResult.data.summary.totalJobsFound,
			}
		: createEmptyRunCounts();

	if (!input.session || !input.job) {
		return {
			activeJobId: input.session?.activeJobId ?? null,
			approvalId: input.approval?.approvalId ?? null,
			completedAt: null,
			filter: {
				company: payload.company,
				compareClean: payload.compareClean,
				dryRun: payload.dryRun,
			},
			message: "No scan run has been recorded yet.",
			runId: null,
			sessionId: input.session?.sessionId ?? null,
			startedAt: null,
			state: "idle",
			summary: createEmptyRunCounts(),
			updatedAt: input.session?.updatedAt ?? null,
			warnings: [],
		};
	}

	const base = {
		activeJobId: input.session.activeJobId ?? input.job.jobId,
		approvalId: input.approval?.approvalId ?? input.job.waitApprovalId ?? null,
		completedAt: input.job.completedAt,
		filter: {
			company: payload.company,
			compareClean: payload.compareClean,
			dryRun: payload.dryRun,
		},
		runId: input.job.currentRunId,
		sessionId: input.session.sessionId,
		startedAt: input.job.startedAt,
		summary: runCounts,
		updatedAt: input.job.updatedAt,
	};

	if (input.job.status === "waiting" && input.job.waitReason === "approval") {
		return {
			...base,
			message: "Scan run is waiting for approval before it can continue.",
			state: "approval-paused",
			warnings: [
				...runWarnings,
				{
					code: "approval-paused",
					message: "A pending approval is blocking this scan run.",
				},
			],
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
			message: "Scan run is queued and waiting to start.",
			state: "queued",
			warnings: runWarnings,
		};
	}

	if (input.job.status === "running" || input.session.status === "running") {
		return {
			...base,
			message: "Scan run is currently in progress.",
			state: "running",
			warnings: runWarnings,
		};
	}

	if (
		input.job.status === "failed" ||
		input.job.status === "cancelled" ||
		input.session.status === "failed" ||
		input.session.status === "cancelled"
	) {
		const failureMessage =
			readErrorMessage(input.job.error) ??
			"The latest scan run ended in a degraded state.";

		return {
			...base,
			message: failureMessage,
			state: "degraded",
			warnings: [
				...runWarnings,
				{
					code: "degraded-result",
					message: failureMessage,
				},
			],
		};
	}

	if (!parsedResult.success) {
		return {
			...base,
			message:
				"The latest scan run completed, but its result payload could not be parsed.",
			state: "degraded",
			warnings: [
				{
					code: "degraded-result",
					message:
						"The latest scan run completed, but its result payload could not be parsed.",
				},
			],
		};
	}

	return {
		...base,
		message:
			parsedResult.data.summary.newOffersAdded === 1
				? "The latest scan run completed with 1 new offer added."
				: `The latest scan run completed with ${parsedResult.data.summary.newOffersAdded} new offers added.`,
		state: "completed",
		warnings: runWarnings,
	};
}

function createLauncherState(input: {
	run: ScanReviewRunSummary;
	status: ReturnType<typeof getStartupStatus>;
	diagnosticsMessage: string;
}): ScanReviewSummaryPayload["launcher"] {
	if (input.status !== "ready") {
		return {
			available: false,
			canStart: false,
			message: input.diagnosticsMessage,
			workflow: "scan-portals",
		};
	}

	if (
		input.run.state === "queued" ||
		input.run.state === "running" ||
		input.run.state === "approval-paused"
	) {
		return {
			available: true,
			canStart: false,
			message:
				"Wait for the active scan run to finish before starting another.",
			workflow: "scan-portals",
		};
	}

	return {
		available: true,
		canStart: true,
		message: "Scan launcher is ready.",
		workflow: "scan-portals",
	};
}

function createSummaryMessage(input: {
	diagnosticsMessage: string;
	filteredCount: number;
	selectedDetail: ScanReviewSelectedDetail;
	shortlist: ParsedShortlist;
	status: ReturnType<typeof getStartupStatus>;
}): string {
	if (input.status !== "ready") {
		return input.diagnosticsMessage;
	}

	if (input.selectedDetail.state !== "empty") {
		return input.selectedDetail.message;
	}

	if (input.shortlist.candidates.length === 0) {
		return input.shortlist.message;
	}

	if (input.filteredCount === 0) {
		return "No shortlist candidates match the current filters.";
	}

	return `Showing ${input.filteredCount} shortlist candidate${input.filteredCount === 1 ? "" : "s"} for review.`;
}

export function readScanReviewIgnoredUrls(context: JsonValue): Set<string> {
	if (!isJsonRecord(context)) {
		return new Set<string>();
	}

	const scanReviewContext = context[SCAN_REVIEW_CONTEXT_KEY];

	if (!isJsonRecord(scanReviewContext)) {
		return new Set<string>();
	}

	const ignoredUrls = scanReviewContext.ignoredUrls;

	if (!Array.isArray(ignoredUrls)) {
		return new Set<string>();
	}

	return new Set(
		ignoredUrls
			.filter((entry): entry is string => typeof entry === "string")
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0),
	);
}

export function writeScanReviewIgnoredUrls(
	context: JsonValue,
	ignoredUrls: Iterable<string>,
): JsonValue {
	const normalizedUrls = [...new Set([...ignoredUrls])]
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.sort((left, right) => left.localeCompare(right));
	const baseContext = isJsonRecord(context) ? { ...context } : {};
	const existingScanReviewContext = isJsonRecord(
		baseContext[SCAN_REVIEW_CONTEXT_KEY] ?? null,
	)
		? {
				...(baseContext[SCAN_REVIEW_CONTEXT_KEY] as JsonRecord),
			}
		: {};

	if (normalizedUrls.length === 0) {
		delete existingScanReviewContext.ignoredUrls;

		if (Object.keys(existingScanReviewContext).length === 0) {
			delete baseContext[SCAN_REVIEW_CONTEXT_KEY];
		} else {
			baseContext[SCAN_REVIEW_CONTEXT_KEY] = existingScanReviewContext;
		}

		return baseContext;
	}

	existingScanReviewContext.ignoredUrls = normalizedUrls;
	baseContext[SCAN_REVIEW_CONTEXT_KEY] = existingScanReviewContext;
	return baseContext;
}

export async function createScanReviewSummary(
	services: ApiServiceContainer,
	options: ScanReviewSummaryOptions = {},
): Promise<ScanReviewSummaryPayload> {
	const diagnostics = await services.startupDiagnostics.getDiagnostics();
	const startupStatus = getStartupStatus(diagnostics);
	const generatedAt = new Date().toISOString();
	const filters = {
		bucket: normalizeBucketFilter(options.bucket),
		includeIgnored: options.includeIgnored ?? false,
		limit: clampLimit(options.limit),
		offset: clampOffset(options.offset),
		sessionId: options.sessionId?.trim() || null,
		url: normalizeUrl(options.url),
	} satisfies ScanReviewSummaryPayload["filters"];
	const [pipelineSurface, scanHistorySurface, store] = await Promise.all([
		services.workspace.readSurface("pipelineInbox"),
		services.workspace.readSurface("scanHistory"),
		services.operationalStore.getStore(),
	]);
	const shortlist =
		pipelineSurface.status === "found"
			? parsePipelineShortlist(String(pipelineSurface.value ?? ""))
			: createEmptyShortlist(
					"No shortlist guidance is available in data/pipeline.md.",
				);
	const scanHistory =
		scanHistorySurface.status === "found"
			? parseScanHistory(String(scanHistorySurface.value ?? ""))
			: {
					byCompany: new Map<string, ScanHistoryRow[]>(),
					byUrl: new Map<string, ScanHistoryRow>(),
				};
	const scanSessions = await store.sessions.listRecent({
		limit: 8,
		workflow: "scan-portals",
	});
	const selectedSession = findSelectedSession(scanSessions, filters.sessionId);

	if (filters.sessionId && !selectedSession) {
		throw new ScanReviewInputError(
			`Scan session does not exist: ${filters.sessionId}.`,
			"invalid-scan-review-session",
		);
	}

	const selectedJobs = selectedSession
		? await store.jobs.listBySessionId(selectedSession.sessionId)
		: [];
	const selectedApprovals = selectedSession
		? await store.approvals.listBySessionId(selectedSession.sessionId)
		: [];
	const selectedJob = selectRelevantJob(selectedJobs, selectedSession);
	const selectedApproval = selectRelevantApproval(
		selectedApprovals,
		selectedJob,
	);
	const ignoredUrls = selectedSession
		? readScanReviewIgnoredUrls(selectedSession.context)
		: new Set<string>();
	const pendingUrlSet = new Set(
		shortlist.pendingEntries.map((entry) => entry.url),
	);
	const shortlistCompanyCounts = new Map<string, number>();

	for (const candidate of shortlist.candidates) {
		const key = normalizeCompanyKey(candidate.company);

		if (!key) {
			continue;
		}

		shortlistCompanyCounts.set(key, (shortlistCompanyCounts.get(key) ?? 0) + 1);
	}

	const candidateRecords = shortlist.candidates.map((candidate) => {
		const companyKey = normalizeCompanyKey(candidate.company);
		const companyHistoryRows = companyKey
			? (scanHistory.byCompany.get(companyKey) ?? [])
			: [];
		const exactHistoryRow = scanHistory.byUrl.get(candidate.url) ?? null;

		return {
			bucket: candidate.bucket,
			company: candidate.company,
			duplicateHint: createDuplicateHint({
				companyHistoryRows,
				companyShortlistCount: companyKey
					? (shortlistCompanyCounts.get(companyKey) ?? 1)
					: 1,
				exactHistoryRow,
				pendingOverlap: pendingUrlSet.has(candidate.url),
			}),
			ignored: ignoredUrls.has(candidate.url),
			rank: candidate.rank,
			reasonSummary: candidate.reasonSummary,
			role: candidate.role,
			sourceLine: candidate.sourceLine,
			url: candidate.url,
		} satisfies ScanReviewCandidateRecord;
	});
	const bucketFilteredCandidates =
		filters.bucket === "all"
			? candidateRecords
			: candidateRecords.filter(
					(candidate) => candidate.bucket === filters.bucket,
				);
	const visibilityFilteredCandidates = filters.includeIgnored
		? bucketFilteredCandidates
		: bucketFilteredCandidates.filter((candidate) => !candidate.ignored);
	const pagedCandidates = visibilityFilteredCandidates.slice(
		filters.offset,
		filters.offset + filters.limit,
	);
	const selectedSourceCandidate = filters.url
		? (candidateRecords.find((candidate) => candidate.url === filters.url) ??
			null)
		: null;
	const selectedFilteredCandidate = filters.url
		? (visibilityFilteredCandidates.find(
				(candidate) => candidate.url === filters.url,
			) ?? null)
		: null;
	const selectedVisibleCandidate = filters.url
		? (pagedCandidates.find((candidate) => candidate.url === filters.url) ??
			null)
		: null;
	const selectedIsStale =
		filters.url !== null &&
		selectedSourceCandidate !== null &&
		selectedVisibleCandidate === null;
	const run = buildRunSummary({
		approval: selectedApproval,
		job: selectedJob,
		session: selectedSession,
	});
	const launcher = createLauncherState({
		diagnosticsMessage: getStartupMessage(diagnostics),
		run,
		status: startupStatus,
	});
	const shortlistItems = pagedCandidates.map((candidate) =>
		toCandidatePreview({
			candidate,
			selected: filters.url === candidate.url,
			sessionId: selectedSession?.sessionId ?? null,
			staleSelection: false,
		}),
	);

	let selectedDetail: ScanReviewSelectedDetail;

	if (filters.url === null) {
		selectedDetail = createEmptySelectedDetail(
			null,
			visibilityFilteredCandidates.length === 0
				? "Select a shortlist candidate once scan results are available."
				: "Select a shortlist candidate to inspect dedup context and follow-through metadata.",
		);
	} else if (!selectedSourceCandidate) {
		selectedDetail = createEmptySelectedDetail(
			filters.url,
			`Selected shortlist candidate is no longer available: ${filters.url}.`,
		);
	} else {
		const message =
			selectedFilteredCandidate === null
				? `Selected shortlist candidate ${filters.url} no longer matches the active filters.`
				: selectedVisibleCandidate === null
					? `Selected shortlist candidate ${filters.url} is outside the current page.`
					: `Showing shortlist candidate ${filters.url}.`;

		selectedDetail = {
			message,
			origin: "url",
			requestedUrl: filters.url,
			row: toSelectedCandidate({
				candidate: selectedSourceCandidate,
				sessionId: selectedSession?.sessionId ?? null,
				staleSelection: selectedIsStale,
			}),
			state: "ready",
		};
	}

	const duplicateHeavyCount = candidateRecords.filter((candidate) =>
		createCandidateWarnings({
			duplicateHint: candidate.duplicateHint,
			ignored: candidate.ignored,
			staleSelection: false,
		}).some((warning) => warning.code === "duplicate-heavy"),
	).length;
	const pendingOverlapCount = candidateRecords.filter(
		(candidate) => candidate.duplicateHint.pendingOverlap,
	).length;

	return {
		filters,
		generatedAt,
		launcher,
		message: createSummaryMessage({
			diagnosticsMessage: getStartupMessage(diagnostics),
			filteredCount: visibilityFilteredCandidates.length,
			selectedDetail,
			shortlist,
			status: startupStatus,
		}),
		ok: true,
		run,
		selectedDetail,
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		shortlist: {
			available: shortlist.available,
			campaignGuidance: shortlist.campaignGuidance,
			counts: {
				adjacentOrNoisy: shortlist.bucketCounts.adjacentOrNoisy,
				duplicateHeavy: duplicateHeavyCount,
				ignored: candidateRecords.filter((candidate) => candidate.ignored)
					.length,
				pendingOverlap: pendingOverlapCount,
				possibleFit: shortlist.bucketCounts.possibleFit,
				strongestFit: shortlist.bucketCounts.strongestFit,
				total: candidateRecords.length,
			},
			filteredCount: visibilityFilteredCandidates.length,
			hasMore:
				filters.offset + pagedCandidates.length <
				visibilityFilteredCandidates.length,
			items: shortlistItems,
			lastRefreshed: shortlist.lastRefreshed,
			limit: filters.limit,
			message: shortlist.message,
			offset: filters.offset,
			totalCount: candidateRecords.length,
		},
		status: startupStatus,
	};
}

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
	normalizeRepoRelativePath,
	type RepoPathOptions,
	resolveRepoRelativePath,
} from "../config/repo-paths.js";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import {
	DEFAULT_PIPELINE_REVIEW_LIMIT,
	MAX_PIPELINE_REVIEW_LIMIT,
	type PipelineReviewArtifactLink,
	type PipelineReviewLegitimacy,
	type PipelineReviewQueueSection,
	type PipelineReviewReportHeader,
	type PipelineReviewRowKind,
	type PipelineReviewRowPreview,
	type PipelineReviewSelectedDetail,
	type PipelineReviewShortlistEntry,
	type PipelineReviewShortlistSummary,
	type PipelineReviewSort,
	type PipelineReviewSummaryOptions,
	type PipelineReviewSummaryPayload,
	type PipelineReviewWarningCode,
	type PipelineReviewWarningItem,
	pipelineReviewLegitimacyValues,
} from "./pipeline-review-contract.js";
import { getStartupMessage, getStartupStatus } from "./startup-status.js";

const REPORT_FILE_NAME_PATTERN =
	/^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-\d{2}-\d{2}\.md$/;

type PendingPipelineRow = {
	company: string | null;
	kind: "pending";
	role: string | null;
	sourceLine: string;
	sourceOrder: number;
	url: string;
};

type ProcessedPipelineRow = {
	company: string | null;
	kind: "processed";
	pdfMarker: boolean | null;
	reportNumber: string | null;
	role: string | null;
	scoreFromRow: number | null;
	sourceLine: string;
	sourceOrder: number;
	url: string;
};

type ParsedQueueSections = {
	malformedCount: number;
	pendingRows: PendingPipelineRow[];
	processedRows: ProcessedPipelineRow[];
	shortlist: PipelineReviewShortlistSummary;
};

type ReportArtifactSeed = {
	artifactDate: string | null;
	reportNumber: string;
	repoRelativePath: string;
};

type ReviewRow = {
	company: string | null;
	header: PipelineReviewReportHeader | null;
	kind: PipelineReviewRowKind;
	legitimacy: PipelineReviewLegitimacy | null;
	pdf: PipelineReviewArtifactLink;
	report: PipelineReviewArtifactLink;
	reportNumber: string | null;
	role: string | null;
	score: number | null;
	sourceLine: string;
	sourceOrder: number;
	url: string;
	verification: string | null;
	warnings: PipelineReviewWarningItem[];
};

export class PipelineReviewInputError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-pipeline-review-query") {
		super(message);
		this.code = code;
		this.name = "PipelineReviewInputError";
	}
}

function clampLimit(value: number | undefined): number {
	if (value === undefined) {
		return DEFAULT_PIPELINE_REVIEW_LIMIT;
	}

	return Math.max(1, Math.min(value, MAX_PIPELINE_REVIEW_LIMIT));
}

function clampOffset(value: number | undefined): number {
	if (value === undefined) {
		return 0;
	}

	return Math.max(0, value);
}

function normalizeMarkdownDocument(content: string): string {
	return content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function getSectionRange(
	text: string,
	marker: "## Pending" | "## Processed" | "## Shortlist",
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

function createArtifactLink(
	exists: boolean,
	message: string,
	repoRelativePath: string | null,
): PipelineReviewArtifactLink {
	return {
		exists,
		message,
		repoRelativePath,
	};
}

function parseReportNumber(candidate: string | null): string | null {
	if (!candidate) {
		return null;
	}

	const match = candidate.match(/(?:^|\/)(\d{3})-/);
	return match?.[1] ?? null;
}

function parseArtifactDate(candidate: string): string | null {
	const match = candidate.match(/(\d{4}-\d{2}-\d{2})(?=\.[^.]+$)/);
	return match?.[1] ?? null;
}

function parseScore(candidate: string | null): number | null {
	if (!candidate) {
		return null;
	}

	const match = candidate.match(/-?\d+(?:\.\d+)?/);
	return match ? Number.parseFloat(match[0]) : null;
}

function parsePdfMarker(candidate: string | null): boolean | null {
	if (!candidate) {
		return null;
	}

	if (/pdf\s*(?:yes|ready)|\byes\b|\btrue\b|\u2705/i.test(candidate)) {
		return true;
	}

	if (/pdf\s*(?:no|missing)|\bno\b|\bfalse\b|\u274c/i.test(candidate)) {
		return false;
	}

	return null;
}

function normalizeLegitimacy(
	candidate: string | null,
): PipelineReviewLegitimacy | null {
	if (
		candidate &&
		pipelineReviewLegitimacyValues.includes(
			candidate as PipelineReviewLegitimacy,
		)
	) {
		return candidate as PipelineReviewLegitimacy;
	}

	return null;
}

function unwrapMarkdownLink(candidate: string): string {
	const match = candidate.match(/^\[[^\]]+\]\(([^)]+)\)$/);
	return match?.[1]?.trim() ?? candidate;
}

function normalizePdfPath(
	candidate: string | null,
	options: RepoPathOptions,
): PipelineReviewArtifactLink {
	if (!candidate) {
		return createArtifactLink(
			false,
			"No checked-in PDF artifact is linked from the report header.",
			null,
		);
	}

	try {
		const normalizedPath = normalizeRepoRelativePath(
			unwrapMarkdownLink(candidate),
		);

		if (
			!normalizedPath.startsWith("output/") ||
			!normalizedPath.endsWith(".pdf")
		) {
			return createArtifactLink(
				false,
				`Report header points to a non-output PDF path: ${candidate}`,
				null,
			);
		}

		const exists = existsSync(resolveRepoRelativePath(normalizedPath, options));

		return createArtifactLink(
			exists,
			exists
				? `Checked-in PDF artifact ${normalizedPath} is available.`
				: `Report header points to missing PDF artifact ${normalizedPath}.`,
			normalizedPath,
		);
	} catch {
		return createArtifactLink(
			false,
			`Report header contains an invalid PDF path: ${candidate}`,
			null,
		);
	}
}

function readHeaderValue(
	lines: readonly string[],
	label: string,
): string | null {
	const prefix = `**${label}:**`;

	for (const line of lines) {
		if (!line.startsWith(prefix)) {
			continue;
		}

		const value = line.slice(prefix.length).trim();
		return value.length > 0 ? value : null;
	}

	return null;
}

function parseReportHeader(
	markdown: string,
	options: RepoPathOptions,
): PipelineReviewReportHeader {
	const lines = markdown.split("\n");
	const dividerIndex = lines.findIndex((line) => line.trim() === "---");
	const headerLines = dividerIndex >= 0 ? lines.slice(0, dividerIndex) : lines;
	const titleLine = headerLines.find((line) => line.startsWith("# ")) ?? null;

	return {
		archetype: readHeaderValue(headerLines, "Archetype"),
		date: readHeaderValue(headerLines, "Date"),
		legitimacy: normalizeLegitimacy(readHeaderValue(headerLines, "Legitimacy")),
		pdf: normalizePdfPath(readHeaderValue(headerLines, "PDF"), options),
		score: parseScore(readHeaderValue(headerLines, "Score")),
		title: titleLine ? titleLine.slice(2).trim() : null,
		url: readHeaderValue(headerLines, "URL"),
		verification: readHeaderValue(headerLines, "Verification"),
	};
}

function parseTitleMetadata(title: string | null): {
	company: string | null;
	role: string | null;
} {
	if (!title) {
		return {
			company: null,
			role: null,
		};
	}

	const match = title.match(/^Evaluation:\s+(.+?)\s+--\s+(.+)$/);

	return {
		company: match?.[1]?.trim() ?? null,
		role: match?.[2]?.trim() ?? null,
	};
}

function parseShortlistSummary(text: string): PipelineReviewShortlistSummary {
	const shortlistRange = getSectionRange(text, "## Shortlist");

	if (!shortlistRange) {
		return {
			available: false,
			bucketCounts: {
				adjacentOrNoisy: null,
				possibleFit: null,
				strongestFit: null,
			},
			campaignGuidance: null,
			generatedBy: null,
			lastRefreshed: null,
			message: "No shortlist guidance is available in data/pipeline.md.",
			topRoles: [],
		};
	}

	const shortlistText = text.slice(shortlistRange.start, shortlistRange.end);
	let campaignGuidance: string | null = null;
	let generatedBy: string | null = null;
	let lastRefreshed: string | null = null;
	const topRoles: PipelineReviewShortlistEntry[] = [];
	let strongestFit: number | null = null;
	let possibleFit: number | null = null;
	let adjacentOrNoisy: number | null = null;

	for (const line of shortlistText.split("\n")) {
		const trimmed = line.trim();

		if (trimmed.startsWith("Last refreshed:")) {
			const match = trimmed.match(
				/^Last refreshed:\s+(\d{4}-\d{2}-\d{2})(?:\s+by\s+(.+?))?\.$/,
			);
			lastRefreshed = match?.[1] ?? null;
			generatedBy = match?.[2]?.trim() ?? null;
			continue;
		}

		if (trimmed.startsWith("Campaign guidance:")) {
			campaignGuidance =
				trimmed.slice("Campaign guidance:".length).trim() || null;
			continue;
		}

		if (trimmed.startsWith("- Strongest fit:")) {
			strongestFit = parseScore(trimmed);
			continue;
		}

		if (trimmed.startsWith("- Possible fit:")) {
			possibleFit = parseScore(trimmed);
			continue;
		}

		if (trimmed.startsWith("- Adjacent or noisy:")) {
			adjacentOrNoisy = parseScore(trimmed);
			continue;
		}

		if (!/^\d+\.\s+/.test(trimmed)) {
			continue;
		}

		const tokens = trimmed.replace(/^\d+\.\s+/, "").split(" | ");

		if (tokens.length < 4) {
			continue;
		}

		topRoles.push({
			bucketLabel: tokens[0] ?? "Possible fit",
			company: tokens[2]?.trim() || null,
			reasonSummary: tokens[4]?.trim() || null,
			role: tokens[3]?.trim() || "",
			url: tokens[1]?.trim() || "",
		});
	}

	return {
		available: true,
		bucketCounts: {
			adjacentOrNoisy,
			possibleFit,
			strongestFit,
		},
		campaignGuidance,
		generatedBy,
		lastRefreshed,
		message:
			topRoles.length > 0
				? "Shortlist guidance is available for queue review."
				: "Shortlist section is present, but no ranked entries were parsed.",
		topRoles,
	};
}

function parsePendingRows(text: string): {
	malformedCount: number;
	rows: PendingPipelineRow[];
} {
	const pendingRange = getSectionRange(text, "## Pending");

	if (!pendingRange) {
		return {
			malformedCount: 0,
			rows: [],
		};
	}

	const pendingText = text.slice(pendingRange.start, pendingRange.end);
	const rows: PendingPipelineRow[] = [];
	let malformedCount = 0;

	for (const line of pendingText.split("\n")) {
		const trimmed = line.trim();

		if (!trimmed.startsWith("- [")) {
			continue;
		}

		const match = trimmed.match(
			/^- \[ \] (https?:\/\/\S+)(?: \| ([^|]+) \| (.+))?$/,
		);

		if (!match?.[1]) {
			malformedCount += 1;
			continue;
		}

		rows.push({
			company: match[2]?.trim() || null,
			kind: "pending",
			role: match[3]?.trim() || null,
			sourceLine: trimmed,
			sourceOrder: rows.length,
			url: match[1],
		});
	}

	return {
		malformedCount,
		rows,
	};
}

function parseProcessedRows(text: string): {
	malformedCount: number;
	rows: ProcessedPipelineRow[];
} {
	const processedRange = getSectionRange(text, "## Processed");

	if (!processedRange) {
		return {
			malformedCount: 0,
			rows: [],
		};
	}

	const processedText = text.slice(processedRange.start, processedRange.end);
	const rows: ProcessedPipelineRow[] = [];
	let malformedCount = 0;

	for (const line of processedText.split("\n")) {
		const trimmed = line.trim();

		if (!trimmed.startsWith("- [")) {
			continue;
		}

		const statusMatch = trimmed.match(/^- \[([xX])\] (.+)$/);

		if (!statusMatch?.[2]) {
			malformedCount += 1;
			continue;
		}

		const tokens = statusMatch[2].split(" | ").map((token) => token.trim());

		if (tokens.length < 5) {
			malformedCount += 1;
			continue;
		}

		const [numberToken, url, thirdToken, fourthToken, fifthToken, sixthToken] =
			tokens;

		if (!url?.startsWith("http")) {
			malformedCount += 1;
			continue;
		}

		const hasCompanyColumn = tokens.length >= 6;

		rows.push({
			company: hasCompanyColumn ? thirdToken || null : null,
			kind: "processed",
			pdfMarker: parsePdfMarker(
				hasCompanyColumn ? (sixthToken ?? null) : (fifthToken ?? null),
			),
			reportNumber:
				numberToken?.replace(/^#/, "").match(/^\d{3}$/)?.[0] ?? null,
			role: hasCompanyColumn ? fourthToken || null : thirdToken || null,
			scoreFromRow: parseScore(
				hasCompanyColumn ? (fifthToken ?? null) : (fourthToken ?? null),
			),
			sourceLine: trimmed,
			sourceOrder: rows.length,
			url,
		});
	}

	return {
		malformedCount,
		rows,
	};
}

function parsePipelineMarkdown(markdown: string): ParsedQueueSections {
	const normalizedMarkdown = normalizeMarkdownDocument(markdown);
	const pending = parsePendingRows(normalizedMarkdown);
	const processed = parseProcessedRows(normalizedMarkdown);

	return {
		malformedCount: pending.malformedCount + processed.malformedCount,
		pendingRows: pending.rows,
		processedRows: processed.rows,
		shortlist: parseShortlistSummary(normalizedMarkdown),
	};
}

function compareNullableDates(
	left: string | null,
	right: string | null,
): number {
	if (left && right && left !== right) {
		return right.localeCompare(left);
	}

	if (left) {
		return -1;
	}

	if (right) {
		return 1;
	}

	return 0;
}

function compareNullableNumbers(
	left: string | number | null,
	right: string | number | null,
): number {
	if (left !== null && right !== null && left !== right) {
		return Number(right) - Number(left);
	}

	if (left !== null) {
		return -1;
	}

	if (right !== null) {
		return 1;
	}

	return 0;
}

function compareReportArtifacts(
	left: ReportArtifactSeed,
	right: ReportArtifactSeed,
): number {
	const dateComparison = compareNullableDates(
		left.artifactDate,
		right.artifactDate,
	);

	if (dateComparison !== 0) {
		return dateComparison;
	}

	const numberComparison = compareNullableNumbers(
		left.reportNumber,
		right.reportNumber,
	);

	if (numberComparison !== 0) {
		return numberComparison;
	}

	return left.repoRelativePath.localeCompare(right.repoRelativePath);
}

async function listReportArtifacts(
	services: ApiServiceContainer,
): Promise<Map<string, ReportArtifactSeed>> {
	const result = await services.workspace.readSurface("reportsDirectory");

	if (result.status !== "found") {
		return new Map();
	}

	const rootRepoRelativePath =
		services.workspace.getSurface("reportsDirectory").candidates[0] ??
		"reports";
	const artifacts = (result.directoryEntries ?? [])
		.filter((entry) => REPORT_FILE_NAME_PATTERN.test(entry))
		.map((fileName) => {
			const repoRelativePath = `${rootRepoRelativePath}/${fileName}`;
			const reportNumber = parseReportNumber(repoRelativePath);

			return reportNumber
				? {
						artifactDate: parseArtifactDate(repoRelativePath),
						reportNumber,
						repoRelativePath,
					}
				: null;
		})
		.filter((artifact): artifact is ReportArtifactSeed => artifact !== null)
		.sort(compareReportArtifacts);

	const lookup = new Map<string, ReportArtifactSeed>();

	for (const artifact of artifacts) {
		if (!lookup.has(artifact.reportNumber)) {
			lookup.set(artifact.reportNumber, artifact);
		}
	}

	return lookup;
}

async function readReportHeaderFromArtifact(
	repoRelativePath: string,
	repoRoot: string,
): Promise<PipelineReviewReportHeader> {
	const markdown = normalizeMarkdownDocument(
		await readFile(
			resolveRepoRelativePath(repoRelativePath, { repoRoot }),
			"utf8",
		),
	);

	return parseReportHeader(markdown, { repoRoot });
}

function appendWarningItem(
	items: PipelineReviewWarningItem[],
	code: PipelineReviewWarningCode,
	message: string,
): void {
	const key = `${code}:${message}`;

	if (items.some((item) => `${item.code}:${item.message}` === key)) {
		return;
	}

	items.push({
		code,
		message,
	});
}

function buildPendingReviewRow(row: PendingPipelineRow): ReviewRow {
	return {
		company: row.company,
		header: null,
		kind: row.kind,
		legitimacy: null,
		pdf: createArtifactLink(
			false,
			"Pending queue rows do not have checked-in PDF artifacts yet.",
			null,
		),
		report: createArtifactLink(
			false,
			"Pending queue rows do not have checked-in report artifacts yet.",
			null,
		),
		reportNumber: null,
		role: row.role,
		score: null,
		sourceLine: row.sourceLine,
		sourceOrder: row.sourceOrder,
		url: row.url,
		verification: null,
		warnings: [],
	};
}

async function buildProcessedReviewRow(
	row: ProcessedPipelineRow,
	reportLookup: Map<string, ReportArtifactSeed>,
	repoRoot: string,
): Promise<ReviewRow> {
	const warnings: PipelineReviewWarningItem[] = [];
	const matchedReport = row.reportNumber
		? (reportLookup.get(row.reportNumber) ?? null)
		: null;
	let header: PipelineReviewReportHeader | null = null;

	if (matchedReport) {
		header = await readReportHeaderFromArtifact(
			matchedReport.repoRelativePath,
			repoRoot,
		);
	}

	const titleMetadata = parseTitleMetadata(header?.title ?? null);
	const company = row.company ?? titleMetadata.company;
	const role = row.role ?? titleMetadata.role;
	const report = matchedReport
		? createArtifactLink(
				true,
				`Checked-in report ${matchedReport.repoRelativePath} is available.`,
				matchedReport.repoRelativePath,
			)
		: createArtifactLink(
				false,
				row.reportNumber
					? `Checked-in report #${row.reportNumber} is not available.`
					: "No canonical report number is recorded for this processed queue row.",
				null,
			);
	const pdf =
		header?.pdf ??
		createArtifactLink(
			false,
			row.pdfMarker === true
				? "Pipeline row marks PDF ready, but no checked-in report header could confirm it."
				: row.pdfMarker === false
					? "Pipeline row marks the PDF as unavailable."
					: "PDF availability is unknown for this processed queue row.",
			null,
		);
	const score = header?.score ?? row.scoreFromRow;
	const legitimacy = header?.legitimacy ?? null;
	const verification = header?.verification ?? null;

	if (!report.exists) {
		appendWarningItem(warnings, "missing-report", report.message);
	}

	if (!pdf.exists) {
		appendWarningItem(warnings, "missing-pdf", pdf.message);
	}

	if (score !== null && score < 4.0) {
		appendWarningItem(
			warnings,
			"low-score",
			`Processed row score ${score.toFixed(1)}/5 is below the recommended apply threshold.`,
		);
	}

	if (legitimacy === "Proceed with Caution") {
		appendWarningItem(
			warnings,
			"caution-legitimacy",
			"Legitimacy is marked Proceed with Caution.",
		);
	}

	if (legitimacy === "Suspicious") {
		appendWarningItem(
			warnings,
			"suspicious-legitimacy",
			"Legitimacy is marked Suspicious.",
		);
	}

	return {
		company,
		header,
		kind: row.kind,
		legitimacy,
		pdf,
		report,
		reportNumber: row.reportNumber,
		role,
		score,
		sourceLine: row.sourceLine,
		sourceOrder: row.sourceOrder,
		url: row.url,
		verification,
		warnings,
	};
}

async function buildReviewRows(
	parsed: ParsedQueueSections,
	reportLookup: Map<string, ReportArtifactSeed>,
	repoRoot: string,
): Promise<ReviewRow[]> {
	const pendingRows = parsed.pendingRows.map((row) =>
		buildPendingReviewRow(row),
	);
	const processedRows = await Promise.all(
		parsed.processedRows.map((row) =>
			buildProcessedReviewRow(row, reportLookup, repoRoot),
		),
	);

	return [...pendingRows, ...processedRows];
}

function compareNullableText(
	left: string | null,
	right: string | null,
): number {
	if (left && right) {
		return left.localeCompare(right);
	}

	if (left) {
		return -1;
	}

	if (right) {
		return 1;
	}

	return 0;
}

function compareReviewRows(
	left: ReviewRow,
	right: ReviewRow,
	sort: PipelineReviewSort,
): number {
	if (sort === "company") {
		return (
			compareNullableText(left.company, right.company) ||
			compareNullableText(left.role, right.role) ||
			left.url.localeCompare(right.url) ||
			left.sourceOrder - right.sourceOrder
		);
	}

	if (sort === "score") {
		return (
			compareNullableNumbers(left.score, right.score) ||
			compareNullableText(left.company, right.company) ||
			compareNullableText(left.role, right.role) ||
			left.url.localeCompare(right.url) ||
			left.sourceOrder - right.sourceOrder
		);
	}

	if (left.kind !== right.kind) {
		return left.kind === "pending" ? -1 : 1;
	}

	return left.sourceOrder - right.sourceOrder;
}

function filterReviewRows(
	rows: readonly ReviewRow[],
	section: PipelineReviewQueueSection,
): ReviewRow[] {
	if (section === "all") {
		return [...rows];
	}

	return rows.filter((row) => row.kind === section);
}

function resolveSelectedDetail(
	rows: readonly ReviewRow[],
	focus: {
		reportNumber: string | null;
		url: string | null;
	},
): PipelineReviewSelectedDetail {
	const requestedReportNumber = focus.reportNumber;
	const requestedUrl = focus.url;

	if (!requestedReportNumber && !requestedUrl) {
		return {
			message: "Select a queue row to inspect its review detail.",
			origin: "none",
			requestedReportNumber: null,
			requestedUrl: null,
			row: null,
			state: "empty",
		};
	}

	const selectedRow = rows.find((row) =>
		requestedReportNumber
			? row.reportNumber === requestedReportNumber
			: row.url === requestedUrl,
	);

	if (!selectedRow) {
		const warning = requestedReportNumber
			? `Focused processed row #${requestedReportNumber} is no longer present in the current queue view.`
			: `Focused queue row for ${requestedUrl} is no longer present in the current queue view.`;

		return {
			message: warning,
			origin: requestedReportNumber ? "report-number" : "url",
			requestedReportNumber,
			requestedUrl,
			row: null,
			state: "missing",
		};
	}

	return {
		message: requestedReportNumber
			? `Showing queue detail for processed row #${requestedReportNumber}.`
			: `Showing queue detail for ${selectedRow.url}.`,
		origin: requestedReportNumber ? "report-number" : "url",
		requestedReportNumber,
		requestedUrl,
		row: {
			company: selectedRow.company,
			header: selectedRow.header,
			kind: selectedRow.kind,
			legitimacy: selectedRow.legitimacy,
			pdf: selectedRow.pdf,
			report: selectedRow.report,
			reportNumber: selectedRow.reportNumber,
			role: selectedRow.role,
			score: selectedRow.score,
			selected: true,
			sourceLine: selectedRow.sourceLine,
			url: selectedRow.url,
			verification: selectedRow.verification,
			warningCount: selectedRow.warnings.length,
			warnings: selectedRow.warnings,
		},
		state: "ready",
	};
}

function mapPreviewRows(
	rows: readonly ReviewRow[],
	selectedRow: ReviewRow | null,
): PipelineReviewRowPreview[] {
	return rows.map((row) => ({
		company: row.company,
		kind: row.kind,
		legitimacy: row.legitimacy,
		pdf: row.pdf,
		report: row.report,
		reportNumber: row.reportNumber,
		role: row.role,
		score: row.score,
		selected:
			selectedRow !== null &&
			row.kind === selectedRow.kind &&
			row.url === selectedRow.url &&
			row.reportNumber === selectedRow.reportNumber,
		url: row.url,
		verification: row.verification,
		warningCount: row.warnings.length,
		warnings: row.warnings,
	}));
}

function readPipelineText(value: string | null): string {
	return typeof value === "string" ? value : "";
}

function getPayloadMessage(input: {
	diagnosticsMessage: string;
	filteredCount: number;
	selectedDetail: PipelineReviewSelectedDetail;
	status: ReturnType<typeof getStartupStatus>;
	shortlist: PipelineReviewShortlistSummary;
}): string {
	if (input.status !== "ready") {
		return input.diagnosticsMessage;
	}

	if (input.selectedDetail.state !== "empty") {
		return input.selectedDetail.message;
	}

	if (input.filteredCount === 0) {
		return input.shortlist.available
			? "Pipeline queue is empty for the current filter."
			: "No pipeline inbox data is available yet.";
	}

	return `Showing ${input.filteredCount} queue row${input.filteredCount === 1 ? "" : "s"} for review.`;
}

export async function createPipelineReviewSummary(
	services: ApiServiceContainer,
	options: PipelineReviewSummaryOptions = {},
): Promise<PipelineReviewSummaryPayload> {
	if (options.reportNumber && options.url) {
		throw new PipelineReviewInputError(
			"Select a pipeline row by report number or URL, not both at once.",
		);
	}

	const diagnostics = await services.startupDiagnostics.getDiagnostics();
	const status = getStartupStatus(diagnostics);
	const generatedAt = new Date().toISOString();
	const filters = {
		limit: clampLimit(options.limit),
		offset: clampOffset(options.offset),
		reportNumber: options.reportNumber?.trim() || null,
		section: options.section ?? "all",
		sort: options.sort ?? "queue",
		url: options.url?.trim() || null,
	} satisfies PipelineReviewSummaryPayload["filters"];
	const [pipelineSurface, reportLookup] = await Promise.all([
		services.workspace.readSurface("pipelineInbox"),
		listReportArtifacts(services),
	]);
	const parsed =
		pipelineSurface.status === "found"
			? parsePipelineMarkdown(
					readPipelineText(pipelineSurface.value as string | null),
				)
			: {
					malformedCount: 0,
					pendingRows: [],
					processedRows: [],
					shortlist: {
						available: false,
						bucketCounts: {
							adjacentOrNoisy: null,
							possibleFit: null,
							strongestFit: null,
						},
						campaignGuidance: null,
						generatedBy: null,
						lastRefreshed: null,
						message: "No shortlist guidance is available in data/pipeline.md.",
						topRoles: [],
					} satisfies PipelineReviewShortlistSummary,
				};
	const reviewRows = await buildReviewRows(
		parsed,
		reportLookup,
		services.workspace.repoPaths.repoRoot,
	);
	const filteredRows = filterReviewRows(reviewRows, filters.section).sort(
		(left, right) => compareReviewRows(left, right, filters.sort),
	);
	const selectedDetail = resolveSelectedDetail(filteredRows, {
		reportNumber: filters.reportNumber,
		url: filters.url,
	});
	const selectedRow =
		selectedDetail.state === "ready" && selectedDetail.row
			? (filteredRows.find((row) =>
					selectedDetail.row
						? row.url === selectedDetail.row.url &&
							row.reportNumber === selectedDetail.row.reportNumber &&
							row.kind === selectedDetail.row.kind
						: false,
				) ?? null)
			: null;
	const pagedRows = filteredRows.slice(
		filters.offset,
		filters.offset + filters.limit,
	);

	return {
		filters,
		generatedAt,
		message: getPayloadMessage({
			diagnosticsMessage: getStartupMessage(diagnostics),
			filteredCount: filteredRows.length,
			selectedDetail,
			shortlist: parsed.shortlist,
			status,
		}),
		ok: true,
		queue: {
			counts: {
				malformed: parsed.malformedCount,
				pending: parsed.pendingRows.length,
				processed: parsed.processedRows.length,
			},
			hasMore: filters.offset + pagedRows.length < filteredRows.length,
			items: mapPreviewRows(pagedRows, selectedRow),
			limit: filters.limit,
			offset: filters.offset,
			section: filters.section,
			sort: filters.sort,
			totalCount: filteredRows.length,
		},
		selectedDetail,
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		shortlist: parsed.shortlist,
		status,
	};
}

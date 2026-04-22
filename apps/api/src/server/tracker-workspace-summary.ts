import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
	normalizeRepoRelativePath,
	type RepoPathOptions,
	RepoRelativePathError,
	resolveRepoRelativePath,
} from "../config/repo-paths.js";
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { ApiServiceContainer } from "../runtime/service-container.js";
import { getStartupStatus } from "./startup-status.js";
import {
	type ParsedTrackerRow,
	parseTrackerReportPath,
	parseTrackerScore,
	parseTrackerTable,
	TrackerTableError,
} from "./tracker-table.js";
import {
	DEFAULT_TRACKER_WORKSPACE_LIMIT,
	MAX_TRACKER_PENDING_ADDITIONS,
	MAX_TRACKER_WORKSPACE_LIMIT,
	type TrackerWorkspaceArtifactLink,
	type TrackerWorkspaceLegitimacy,
	type TrackerWorkspacePendingAdditionItem,
	type TrackerWorkspaceReportHeader,
	type TrackerWorkspaceRowPreview,
	type TrackerWorkspaceSelectedDetail,
	type TrackerWorkspaceSelectedRow,
	type TrackerWorkspaceSort,
	type TrackerWorkspaceStatusOption,
	type TrackerWorkspaceSummaryOptions,
	type TrackerWorkspaceSummaryPayload,
	type TrackerWorkspaceWarningItem,
	trackerWorkspaceLegitimacyValues,
} from "./tracker-workspace-contract.js";

type CanonicalStatusDefinition = {
	id: string;
	label: string;
};

type PendingAdditionSummary = {
	count: number;
	items: TrackerWorkspacePendingAdditionItem[];
};

type EnrichedTrackerRow = {
	header: TrackerWorkspaceReportHeader | null;
	pdf: TrackerWorkspaceArtifactLink;
	report: TrackerWorkspaceArtifactLink;
	row: ParsedTrackerRow;
};

const REPORT_FILE_NAME_PATTERN =
	/^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-\d{2}-\d{2}\.md$/;

export class TrackerWorkspaceInputError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-tracker-workspace-query") {
		super(message);
		this.code = code;
		this.name = "TrackerWorkspaceInputError";
	}
}

function clampLimit(value: number | undefined): number {
	if (value === undefined) {
		return DEFAULT_TRACKER_WORKSPACE_LIMIT;
	}

	return Math.max(1, Math.min(value, MAX_TRACKER_WORKSPACE_LIMIT));
}

function clampOffset(value: number | undefined): number {
	if (value === undefined) {
		return 0;
	}

	return Math.max(0, value);
}

function normalizeSearch(value: string | undefined): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

function unwrapYamlValue(value: string): string {
	return value.trim().replace(/^['"]|['"]$/g, "");
}

async function loadCanonicalStatuses(
	repoRoot: string,
): Promise<CanonicalStatusDefinition[]> {
	const statesPath = resolveRepoRelativePath("templates/states.yml", {
		repoRoot,
	});
	const statesText = await readFile(statesPath, "utf8");
	const lines = statesText.replace(/\r\n?/g, "\n").split("\n");
	const statuses: CanonicalStatusDefinition[] = [];
	let currentId: string | null = null;

	for (const line of lines) {
		const idMatch = line.match(/^\s*-\s+id:\s*(.+?)\s*$/);

		if (idMatch) {
			currentId = unwrapYamlValue(idMatch[1] ?? "");
			continue;
		}

		const labelMatch = line.match(/^\s*label:\s*(.+?)\s*$/);

		if (labelMatch && currentId) {
			statuses.push({
				id: currentId,
				label: unwrapYamlValue(labelMatch[1] ?? ""),
			});
			currentId = null;
		}
	}

	if (statuses.length === 0) {
		throw new TrackerWorkspaceInputError(
			"templates/states.yml does not define any canonical tracker statuses.",
			"invalid-tracker-status-config",
		);
	}

	return statuses;
}

function compareNullableDates(left: string, right: string): number {
	return right.localeCompare(left);
}

function compareRows(
	sort: TrackerWorkspaceSort,
	left: ParsedTrackerRow,
	right: ParsedTrackerRow,
): number {
	switch (sort) {
		case "company": {
			const companyComparison = left.company.localeCompare(right.company);

			if (companyComparison !== 0) {
				return companyComparison;
			}

			return right.entryNumber - left.entryNumber;
		}
		case "score": {
			if (
				left.score !== null &&
				right.score !== null &&
				left.score !== right.score
			) {
				return right.score - left.score;
			}

			if (left.score !== null) {
				return -1;
			}

			if (right.score !== null) {
				return 1;
			}

			return right.entryNumber - left.entryNumber;
		}
		case "status": {
			const statusComparison = left.status.localeCompare(right.status);

			if (statusComparison !== 0) {
				return statusComparison;
			}

			return compareNullableDates(left.date, right.date);
		}
		default: {
			const dateComparison = compareNullableDates(left.date, right.date);

			if (dateComparison !== 0) {
				return dateComparison;
			}

			return right.entryNumber - left.entryNumber;
		}
	}
}

function matchesSearch(row: ParsedTrackerRow, search: string | null): boolean {
	if (!search) {
		return true;
	}

	const haystack = [
		String(row.entryNumber),
		row.company,
		row.date,
		row.notes,
		row.role,
		row.scoreLabel,
		row.status,
	]
		.join("\n")
		.toLowerCase();

	return haystack.includes(search.toLowerCase());
}

function createArtifactLink(
	exists: boolean,
	message: string,
	repoRelativePath: string | null,
): TrackerWorkspaceArtifactLink {
	return {
		exists,
		message,
		repoRelativePath,
	};
}

function normalizeLegitimacy(
	candidate: string | null,
): TrackerWorkspaceLegitimacy | null {
	if (
		candidate &&
		trackerWorkspaceLegitimacyValues.includes(
			candidate as TrackerWorkspaceLegitimacy,
		)
	) {
		return candidate as TrackerWorkspaceLegitimacy;
	}

	return null;
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

function normalizePdfPath(
	candidate: string | null,
	options: RepoPathOptions,
): TrackerWorkspaceArtifactLink {
	if (!candidate) {
		return createArtifactLink(
			false,
			"No checked-in PDF artifact is linked from the report header.",
			null,
		);
	}

	try {
		const normalizedPath = normalizeRepoRelativePath(candidate);

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

function parseReportHeader(
	markdown: string,
	options: RepoPathOptions,
): TrackerWorkspaceReportHeader {
	const lines = markdown.split("\n");
	const dividerIndex = lines.findIndex((line) => line.trim() === "---");
	const headerLines = dividerIndex >= 0 ? lines.slice(0, dividerIndex) : lines;
	const titleLine = headerLines.find((line) => line.startsWith("# ")) ?? null;

	return {
		date: readHeaderValue(headerLines, "Date"),
		legitimacy: normalizeLegitimacy(readHeaderValue(headerLines, "Legitimacy")),
		pdf: normalizePdfPath(readHeaderValue(headerLines, "PDF"), options),
		score: parseTrackerScore(readHeaderValue(headerLines, "Score") ?? ""),
		title: titleLine ? titleLine.slice(2).trim() : null,
		url: readHeaderValue(headerLines, "URL"),
		verification: readHeaderValue(headerLines, "Verification"),
	};
}

function normalizeReportPath(
	row: ParsedTrackerRow,
	repoRoot: string,
): TrackerWorkspaceArtifactLink {
	const reportPath = parseTrackerReportPath(row.report);

	if (!reportPath) {
		return createArtifactLink(
			false,
			"Tracker row does not link to a checked-in report artifact.",
			null,
		);
	}

	let normalizedPath: string;

	try {
		normalizedPath = normalizeRepoRelativePath(reportPath);
	} catch (error) {
		const message =
			error instanceof RepoRelativePathError ? error.message : String(error);

		return createArtifactLink(
			false,
			`Tracker row contains an invalid report path: ${message}`,
			null,
		);
	}

	if (
		!normalizedPath.startsWith("reports/") ||
		!REPORT_FILE_NAME_PATTERN.test(normalizedPath.slice("reports/".length))
	) {
		return createArtifactLink(
			false,
			`Tracker row points to a non-canonical report artifact: ${reportPath}`,
			null,
		);
	}

	const exists = existsSync(
		resolveRepoRelativePath(normalizedPath, { repoRoot }),
	);

	return createArtifactLink(
		exists,
		exists
			? `Checked-in report artifact ${normalizedPath} is available.`
			: `Tracker row points to missing report artifact ${normalizedPath}.`,
		normalizedPath,
	);
}

async function createPendingAdditionSummary(
	services: ApiServiceContainer,
): Promise<PendingAdditionSummary> {
	const result = await services.workspace.readSurface(
		"trackerAdditionsDirectory",
	);

	if (result.status !== "found") {
		return {
			count: 0,
			items: [],
		};
	}

	const items = (result.directoryEntries ?? [])
		.filter((entry) => entry.endsWith(".tsv"))
		.sort((left, right) => left.localeCompare(right))
		.map((fileName) => {
			const match = fileName.match(/^(\d+)-/);

			return {
				entryNumber: match?.[1] ? Number.parseInt(match[1], 10) : 0,
				fileName,
				repoRelativePath: `batch/tracker-additions/${fileName}`,
			} satisfies TrackerWorkspacePendingAdditionItem;
		});

	return {
		count: items.length,
		items: items.slice(0, MAX_TRACKER_PENDING_ADDITIONS),
	};
}

async function enrichRow(
	row: ParsedTrackerRow,
	options: {
		headerCache: Map<string, TrackerWorkspaceReportHeader | null>;
		repoRoot: string;
	},
): Promise<EnrichedTrackerRow> {
	const report = normalizeReportPath(row, options.repoRoot);
	let header: TrackerWorkspaceReportHeader | null = null;

	if (report.exists && report.repoRelativePath) {
		const cachedHeader = options.headerCache.get(report.repoRelativePath);

		if (cachedHeader !== undefined) {
			header = cachedHeader;
		} else {
			const markdown = await readFile(
				resolveRepoRelativePath(report.repoRelativePath, {
					repoRoot: options.repoRoot,
				}),
				"utf8",
			);
			header = parseReportHeader(markdown.replace(/\r\n?/g, "\n"), {
				repoRoot: options.repoRoot,
			});
			options.headerCache.set(report.repoRelativePath, header);
		}
	}

	return {
		header,
		pdf:
			header?.pdf ??
			createArtifactLink(
				false,
				"PDF availability is unknown until a valid report artifact is present.",
				null,
			),
		report,
		row,
	};
}

function buildWarningItems(input: {
	canonicalStatuses: Set<string>;
	isStaleSelection: boolean;
	pendingAdditionCount: number;
	row: EnrichedTrackerRow;
}): TrackerWorkspaceWarningItem[] {
	const warnings: TrackerWorkspaceWarningItem[] = [];

	if (!input.canonicalStatuses.has(input.row.row.status)) {
		warnings.push({
			code: "non-canonical-status",
			message: `Tracker status ${input.row.row.status} does not match templates/states.yml.`,
		});
	}

	if (!input.row.report.exists) {
		warnings.push({
			code: "missing-report",
			message: input.row.report.message,
		});
	}

	if (!input.row.pdf.exists) {
		warnings.push({
			code: "missing-pdf",
			message: input.row.pdf.message,
		});
	}

	if (input.isStaleSelection) {
		warnings.push({
			code: "stale-selection",
			message:
				"The selected tracker row is outside the current filtered page, so detail is shown separately.",
		});
	}

	if (input.pendingAdditionCount > 0 && warnings.length === 0) {
		void input.pendingAdditionCount;
	}

	return warnings;
}

function toRowPreview(input: {
	canonicalStatuses: Set<string>;
	enrichedRow: EnrichedTrackerRow;
	isSelected: boolean;
	isStaleSelection: boolean;
	pendingAdditionCount: number;
}): TrackerWorkspaceRowPreview {
	const warnings = buildWarningItems({
		canonicalStatuses: input.canonicalStatuses,
		isStaleSelection: input.isStaleSelection,
		pendingAdditionCount: input.pendingAdditionCount,
		row: input.enrichedRow,
	});

	return {
		company: input.enrichedRow.row.company,
		date: input.enrichedRow.row.date,
		entryNumber: input.enrichedRow.row.entryNumber,
		pdf: input.enrichedRow.pdf,
		report: input.enrichedRow.report,
		role: input.enrichedRow.row.role,
		score: input.enrichedRow.header?.score ?? input.enrichedRow.row.score,
		scoreLabel: input.enrichedRow.row.scoreLabel,
		selected: input.isSelected,
		status: input.enrichedRow.row.status,
		warningCount: warnings.length,
		warnings,
	};
}

function toSelectedRow(input: {
	canonicalStatuses: Set<string>;
	enrichedRow: EnrichedTrackerRow;
	isStaleSelection: boolean;
	pendingAdditionCount: number;
}): TrackerWorkspaceSelectedRow {
	return {
		...toRowPreview({
			canonicalStatuses: input.canonicalStatuses,
			enrichedRow: input.enrichedRow,
			isSelected: true,
			isStaleSelection: input.isStaleSelection,
			pendingAdditionCount: input.pendingAdditionCount,
		}),
		header: input.enrichedRow.header,
		notes: input.enrichedRow.row.notes,
		sourceLine: input.enrichedRow.row.rawLine,
	};
}

function createEmptySelectedDetail(
	entryNumber: number | null,
	message: string,
): TrackerWorkspaceSelectedDetail {
	return {
		message,
		origin: entryNumber === null ? "none" : "entry-number",
		requestedEntryNumber: entryNumber,
		row: null,
		state: entryNumber === null ? "empty" : "missing",
	};
}

function createPendingAdditionsMessage(count: number): string {
	if (count === 0) {
		return "No pending tracker TSV additions are waiting to merge.";
	}

	if (count === 1) {
		return "1 pending tracker TSV addition is waiting to merge.";
	}

	return `${count} pending tracker TSV additions are waiting to merge.`;
}

function createSummaryMessage(input: {
	filteredCount: number;
	pendingAdditionCount: number;
	totalCount: number;
	trackerMissing: boolean;
}): string {
	if (input.trackerMissing) {
		return "Applications tracker is missing. Create data/applications.md before reviewing tracker rows.";
	}

	if (input.totalCount === 0) {
		return "Applications tracker is present but does not contain any rows yet.";
	}

	if (input.filteredCount === 0) {
		return "No tracker rows match the current filters.";
	}

	const pendingSuffix =
		input.pendingAdditionCount > 0
			? ` ${createPendingAdditionsMessage(input.pendingAdditionCount)}`
			: "";

	return `Showing ${input.filteredCount} of ${input.totalCount} tracker rows.${pendingSuffix}`;
}

export async function createTrackerWorkspaceSummary(
	services: ApiServiceContainer,
	options: TrackerWorkspaceSummaryOptions = {},
): Promise<TrackerWorkspaceSummaryPayload> {
	const diagnostics = await services.startupDiagnostics.getDiagnostics();
	const repoRoot = services.workspace.repoPaths.repoRoot;
	const startupStatus = getStartupStatus(diagnostics);
	const limit = clampLimit(options.limit);
	const offset = clampOffset(options.offset);
	const search = normalizeSearch(options.search);
	const canonicalStatuses = await loadCanonicalStatuses(repoRoot);
	const canonicalStatusLabels = new Set(
		canonicalStatuses.map((status) => status.label),
	);

	if (
		options.status !== undefined &&
		options.status !== null &&
		options.status.trim().length > 0 &&
		!canonicalStatusLabels.has(options.status.trim())
	) {
		throw new TrackerWorkspaceInputError(
			`Tracker status filter ${options.status} is not canonical.`,
			"invalid-tracker-status-filter",
		);
	}

	const trackerResult = await services.workspace.readSurface(
		"applicationsTracker",
	);
	const pendingAdditions = await createPendingAdditionSummary(services);
	const headerCache = new Map<string, TrackerWorkspaceReportHeader | null>();

	let rows: ParsedTrackerRow[] = [];

	if (trackerResult.status === "found") {
		const table = parseTrackerTable(String(trackerResult.value ?? ""));
		rows = table.rows;
	}

	const statusOptionCounts = new Map<string, number>();

	for (const row of rows) {
		statusOptionCounts.set(
			row.status,
			(statusOptionCounts.get(row.status) ?? 0) + 1,
		);
	}

	const statusFilter = options.status?.trim() || null;
	const filteredRows = rows
		.filter((row) => (statusFilter ? row.status === statusFilter : true))
		.filter((row) => matchesSearch(row, search))
		.sort((left, right) => compareRows(options.sort ?? "date", left, right));

	const pagedRows = filteredRows.slice(offset, offset + limit);
	const requestedEntryNumber = options.entryNumber ?? null;
	const selectedSourceRow =
		requestedEntryNumber === null
			? null
			: (rows.find((row) => row.entryNumber === requestedEntryNumber) ?? null);
	const selectedVisibleRow =
		requestedEntryNumber === null
			? null
			: (pagedRows.find((row) => row.entryNumber === requestedEntryNumber) ??
				null);
	const selectedFilteredRow =
		requestedEntryNumber === null
			? null
			: (filteredRows.find((row) => row.entryNumber === requestedEntryNumber) ??
				null);
	const selectedIsStale =
		requestedEntryNumber !== null &&
		selectedSourceRow !== null &&
		selectedVisibleRow === null;

	const enrichedPageRows = await Promise.all(
		pagedRows.map((row) =>
			enrichRow(row, {
				headerCache,
				repoRoot,
			}),
		),
	);

	const selectedEnrichedRow =
		selectedSourceRow === null
			? null
			: await enrichRow(selectedSourceRow, {
					headerCache,
					repoRoot,
				});

	const rowItems = enrichedPageRows.map((enrichedRow) =>
		toRowPreview({
			canonicalStatuses: canonicalStatusLabels,
			enrichedRow,
			isSelected:
				requestedEntryNumber !== null &&
				enrichedRow.row.entryNumber === requestedEntryNumber,
			isStaleSelection: false,
			pendingAdditionCount: pendingAdditions.count,
		}),
	);

	let selectedDetail: TrackerWorkspaceSelectedDetail;

	if (requestedEntryNumber === null) {
		selectedDetail = createEmptySelectedDetail(
			null,
			filteredRows.length === 0
				? "Select a tracker row once matching items are available."
				: "Select a tracker row to inspect report links, notes, and status.",
		);
	} else if (!selectedSourceRow || !selectedEnrichedRow) {
		selectedDetail = createEmptySelectedDetail(
			requestedEntryNumber,
			`Selected tracker row #${requestedEntryNumber} is no longer available.`,
		);
	} else {
		const message =
			selectedFilteredRow === null
				? `Selected tracker row #${requestedEntryNumber} no longer matches the active filters.`
				: selectedVisibleRow === null
					? `Selected tracker row #${requestedEntryNumber} is outside the current page.`
					: `Showing selected tracker row #${requestedEntryNumber}.`;

		selectedDetail = {
			message,
			origin: "entry-number",
			requestedEntryNumber,
			row: toSelectedRow({
				canonicalStatuses: canonicalStatusLabels,
				enrichedRow: selectedEnrichedRow,
				isStaleSelection: selectedIsStale,
				pendingAdditionCount: pendingAdditions.count,
			}),
			state: "ready",
		};
	}

	const statusOptions: TrackerWorkspaceStatusOption[] = canonicalStatuses.map(
		(status) => ({
			count: statusOptionCounts.get(status.label) ?? 0,
			id: status.id,
			label: status.label,
		}),
	);

	return {
		filters: {
			entryNumber: requestedEntryNumber,
			limit,
			offset,
			search,
			sort: options.sort ?? "date",
			status: statusFilter,
		},
		generatedAt: new Date().toISOString(),
		message: createSummaryMessage({
			filteredCount: filteredRows.length,
			pendingAdditionCount: pendingAdditions.count,
			totalCount: rows.length,
			trackerMissing: trackerResult.status !== "found",
		}),
		ok: true,
		pendingAdditions: {
			count: pendingAdditions.count,
			items: pendingAdditions.items,
			message: createPendingAdditionsMessage(pendingAdditions.count),
		},
		rows: {
			filteredCount: filteredRows.length,
			hasMore: offset + pagedRows.length < filteredRows.length,
			items: rowItems,
			limit,
			offset,
			sort: options.sort ?? "date",
			totalCount: rows.length,
		},
		selectedDetail,
		service: STARTUP_SERVICE_NAME,
		sessionId: STARTUP_SESSION_ID,
		status: startupStatus,
		statusOptions,
	};
}

export function mapTrackerWorkspaceError(input: {
	error: unknown;
	fallbackCode: string;
	fallbackMessage: string;
}): {
	code: string;
	message: string;
} {
	if (input.error instanceof TrackerWorkspaceInputError) {
		return {
			code: input.error.code,
			message: input.error.message,
		};
	}

	if (input.error instanceof TrackerTableError) {
		return {
			code: input.error.code,
			message: input.error.message,
		};
	}

	return {
		code: input.fallbackCode,
		message:
			input.error instanceof Error
				? input.error.message
				: input.fallbackMessage,
	};
}

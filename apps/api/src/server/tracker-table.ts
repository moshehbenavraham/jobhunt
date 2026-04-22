const trackerColumnKeys = [
	"entryNumber",
	"date",
	"company",
	"role",
	"score",
	"status",
	"pdf",
	"report",
	"notes",
] as const;

type TrackerColumnKey = (typeof trackerColumnKeys)[number];

type TrackerTableCell = {
	raw: string;
	value: string;
};

type TrackerTableCells = Record<TrackerColumnKey, TrackerTableCell>;

export type ParsedTrackerRow = {
	cells: TrackerTableCells;
	company: string;
	date: string;
	entryNumber: number;
	lineIndex: number;
	notes: string;
	pdf: string;
	rawLine: string;
	report: string;
	role: string;
	score: number | null;
	scoreLabel: string;
	status: string;
};

export type ParsedTrackerTable = {
	malformedLineCount: number;
	rows: ParsedTrackerRow[];
	sourceLines: string[];
};

export type TrackerStatusUpdateResult = {
	content: string;
	nextStatus: string;
	previousStatus: string;
	row: ParsedTrackerRow;
};

type ParsedLineCells = {
	cells: string[];
	rawCells: string[];
};

const expectedTrackerHeader = [
	"#",
	"Date",
	"Company",
	"Role",
	"Score",
	"Status",
	"PDF",
	"Report",
	"Notes",
] as const;

const trackerColumnKeyByHeader = new Map<string, TrackerColumnKey>([
	["#", "entryNumber"],
	["Date", "date"],
	["Company", "company"],
	["Role", "role"],
	["Score", "score"],
	["Status", "status"],
	["PDF", "pdf"],
	["Report", "report"],
	["Notes", "notes"],
]);

export class TrackerTableError extends Error {
	readonly code: string;

	constructor(message: string, code = "invalid-tracker-table") {
		super(message);
		this.code = code;
		this.name = "TrackerTableError";
	}
}

function parsePipeRow(line: string): ParsedLineCells | null {
	if (!line.startsWith("|")) {
		return null;
	}

	const rawCells = line
		.slice(1)
		.split("|")
		.map((cell) => cell.replace(/\r$/, ""));

	if (rawCells.length > 0 && rawCells.at(-1)?.trim() === "") {
		rawCells.pop();
	}

	return {
		cells: rawCells.map((cell) => cell.trim()),
		rawCells,
	};
}

function isDelimiterRow(cells: readonly string[]): boolean {
	return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function assertHeaderRow(cells: readonly string[]): void {
	if (cells.length !== expectedTrackerHeader.length) {
		throw new TrackerTableError(
			`Applications tracker header must define ${expectedTrackerHeader.length} columns.`,
			"invalid-tracker-header",
		);
	}

	for (const [index, value] of expectedTrackerHeader.entries()) {
		if (cells[index] !== value) {
			throw new TrackerTableError(
				`Applications tracker header column ${index + 1} must be ${value}.`,
				"invalid-tracker-header",
			);
		}
	}
}

function buildCells(cells: ParsedLineCells): TrackerTableCells {
	const result = {} as TrackerTableCells;

	for (const [index, value] of cells.cells.entries()) {
		const header = expectedTrackerHeader[index] ?? null;

		if (!header) {
			throw new TrackerTableError(
				`Applications tracker row defines an unexpected column at position ${index + 1}.`,
			);
		}

		const key = trackerColumnKeyByHeader.get(header);

		if (!key) {
			throw new TrackerTableError(
				`Applications tracker header is missing a mapping for ${header}.`,
			);
		}

		result[key] = {
			raw: cells.rawCells[index] ?? "",
			value,
		};
	}

	return result;
}

function parseEntryNumber(value: string, lineIndex: number): number {
	const parsed = Number.parseInt(value, 10);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new TrackerTableError(
			`Applications tracker row ${lineIndex + 1} has an invalid entry number: ${value}.`,
			"invalid-tracker-row",
		);
	}

	return parsed;
}

export function normalizeTrackerMarkdownDocument(content: string): string {
	return content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

export function parseTrackerScore(value: string): number | null {
	const match = value.match(/-?\d+(?:\.\d+)?/);
	return match ? Number.parseFloat(match[0]) : null;
}

export function parseTrackerReportPath(value: string): string | null {
	const trimmed = value.trim();

	if (trimmed.length === 0) {
		return null;
	}

	const markdownLinkMatch = trimmed.match(/^\[[^\]]+\]\(([^)]+)\)$/);
	return (markdownLinkMatch?.[1] ?? trimmed).trim() || null;
}

function findHeaderLineIndex(lines: readonly string[]): number {
	return lines.findIndex((line) => line.trim().startsWith("| # |"));
}

export function parseTrackerTable(markdown: string): ParsedTrackerTable {
	const sourceLines = normalizeTrackerMarkdownDocument(markdown).split("\n");
	const headerLineIndex = findHeaderLineIndex(sourceLines);

	if (headerLineIndex === -1) {
		throw new TrackerTableError(
			"Applications tracker header row is missing.",
			"missing-tracker-header",
		);
	}

	const headerCells = parsePipeRow(sourceLines[headerLineIndex] ?? "");
	const delimiterCells = parsePipeRow(sourceLines[headerLineIndex + 1] ?? "");

	if (!headerCells || !delimiterCells) {
		throw new TrackerTableError(
			"Applications tracker table is missing a delimiter row.",
			"missing-tracker-delimiter",
		);
	}

	assertHeaderRow(headerCells.cells);

	if (!isDelimiterRow(delimiterCells.cells)) {
		throw new TrackerTableError(
			"Applications tracker delimiter row is invalid.",
			"invalid-tracker-delimiter",
		);
	}

	const rows: ParsedTrackerRow[] = [];
	let malformedLineCount = 0;

	for (
		let lineIndex = headerLineIndex + 2;
		lineIndex < sourceLines.length;
		lineIndex += 1
	) {
		const line = sourceLines[lineIndex] ?? "";
		const trimmed = line.trim();

		if (trimmed.length === 0) {
			continue;
		}

		if (!trimmed.startsWith("|")) {
			continue;
		}

		const parsedCells = parsePipeRow(line);

		if (
			!parsedCells ||
			parsedCells.cells.length !== expectedTrackerHeader.length
		) {
			malformedLineCount += 1;
			continue;
		}

		const cells = buildCells(parsedCells);
		const entryNumber = parseEntryNumber(cells.entryNumber.value, lineIndex);

		rows.push({
			cells,
			company: cells.company.value,
			date: cells.date.value,
			entryNumber,
			lineIndex,
			notes: cells.notes.value,
			pdf: cells.pdf.value,
			rawLine: line,
			report: cells.report.value,
			role: cells.role.value,
			score: parseTrackerScore(cells.score.value),
			scoreLabel: cells.score.value,
			status: cells.status.value,
		});
	}

	return {
		malformedLineCount,
		rows,
		sourceLines,
	};
}

function replaceCellValue(rawCell: string, nextValue: string): string {
	const leadingWhitespace = rawCell.match(/^\s*/)?.[0] ?? "";
	const trailingWhitespace = rawCell.match(/\s*$/)?.[0] ?? "";
	return `${leadingWhitespace}${nextValue}${trailingWhitespace}`;
}

function rebuildRowLine(cells: TrackerTableCells): string {
	return `|${trackerColumnKeys
		.map((key) => replaceCellValue(cells[key].raw, cells[key].value))
		.join("|")}|`;
}

function cloneRowCells(cells: TrackerTableCells): TrackerTableCells {
	const cloned = {} as TrackerTableCells;

	for (const key of trackerColumnKeys) {
		cloned[key] = {
			raw: cells[key].raw,
			value: cells[key].value,
		};
	}

	return cloned;
}

export function updateTrackerStatus(
	markdown: string,
	input: {
		entryNumber: number;
		nextStatus: string;
	},
): TrackerStatusUpdateResult {
	const table = parseTrackerTable(markdown);
	const row = table.rows.find(
		(candidate) => candidate.entryNumber === input.entryNumber,
	);

	if (!row) {
		throw new TrackerTableError(
			`Applications tracker row ${input.entryNumber} does not exist.`,
			"tracker-row-missing",
		);
	}

	const previousStatus = row.status;

	if (previousStatus === input.nextStatus) {
		return {
			content: normalizeTrackerMarkdownDocument(markdown),
			nextStatus: input.nextStatus,
			previousStatus,
			row,
		};
	}

	const nextCells = cloneRowCells(row.cells);
	nextCells.status = {
		raw: row.cells.status.raw,
		value: input.nextStatus,
	};

	const nextSourceLines = [...table.sourceLines];
	nextSourceLines[row.lineIndex] = rebuildRowLine(nextCells);

	return {
		content: nextSourceLines.join("\n"),
		nextStatus: input.nextStatus,
		previousStatus,
		row,
	};
}

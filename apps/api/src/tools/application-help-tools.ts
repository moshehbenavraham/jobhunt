import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { z } from "zod";
import {
	normalizeRepoRelativePath,
	type RepoPathOptions,
	resolveRepoRelativePath,
} from "../config/repo-paths.js";
import {
	type ApplicationHelpContextMatchState,
	type ApplicationHelpCoverLetterSummary,
	type ApplicationHelpDraftItem,
	type ApplicationHelpDraftPacketSummary,
	type ApplicationHelpMatchedReportContext,
	type ApplicationHelpWarningCode,
	type ApplicationHelpWarningItem,
	applicationHelpContextMatchStateValues,
	applicationHelpCoverLetterStateValues,
} from "../server/application-help-contract.js";
import {
	type ReportViewerLegitimacy,
	reportViewerLegitimacyValues,
} from "../server/report-viewer-contract.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import type { AnyToolDefinition, ToolDefinition } from "./tool-contract.js";
import { ToolExecutionError } from "./tool-errors.js";

const REPORT_FILE_NAME_PATTERN =
	/^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-\d{2}-\d{2}\.md$/;
const APPLICATION_HELP_DRAFT_ROOT = ".jobhunt-app/application-help";
const NO_SUBMIT_MESSAGE =
	"Draft only. Review and personalize every answer before submission. The app never submits for you.";

type ApplicationHelpContextHints = {
	artifactName: string | null;
	company: string | null;
	pdfPath: string | null;
	reportNumber: string | null;
	reportPath: string | null;
	role: string | null;
};

type ApplicationHelpReportRecord = Omit<
	ApplicationHelpMatchedReportContext,
	"matchReasons" | "matchState"
> & {
	artifactDate: string | null;
};

type ApplicationHelpContextResolution = {
	matchedContext: ApplicationHelpMatchedReportContext | null;
	message: string;
	warnings: ApplicationHelpWarningItem[];
};

type ApplicationHelpDraftPacketRecord = {
	company: string | null;
	createdAt: string;
	fingerprint: string;
	items: ApplicationHelpDraftItem[];
	matchedContext: ApplicationHelpMatchedReportContext | null;
	packetId: string;
	reviewNotes: string | null;
	reviewRequired: true;
	revision: number;
	role: string | null;
	sessionId: string;
	updatedAt: string;
	warnings: string[];
};

type ApplicationHelpDraftPacketWithPath = ApplicationHelpDraftPacketRecord & {
	repoRelativePath: string;
};

type ReportCandidateScore = {
	reasons: string[];
	report: ApplicationHelpReportRecord;
	score: number;
};

const applicationHelpDraftItemSchema = z.object({
	answer: z.string().trim().min(1),
	question: z.string().trim().min(1),
});

const applicationHelpCoverLetterSummarySchema = z.object({
	message: z.string().trim().min(1),
	state: z.enum(applicationHelpCoverLetterStateValues),
});

const applicationHelpMatchedReportContextSchema = z.object({
	company: z.string().trim().min(1).nullable(),
	coverLetter: applicationHelpCoverLetterSummarySchema,
	existingDraft: z.object({
		itemCount: z.number().int().nonnegative(),
		items: z.array(applicationHelpDraftItemSchema),
		sectionPresent: z.boolean(),
		sectionText: z.string().nullable(),
	}),
	fileName: z.string().trim().min(1),
	legitimacy: z.enum(reportViewerLegitimacyValues).nullable(),
	matchReasons: z.array(z.string().trim().min(1)),
	matchState: z.enum(applicationHelpContextMatchStateValues),
	pdf: z.object({
		exists: z.boolean(),
		repoRelativePath: z.string().trim().min(1).nullable(),
	}),
	reportNumber: z
		.string()
		.regex(/^\d{3}$/)
		.nullable(),
	reportRepoRelativePath: z.string().trim().min(1),
	role: z.string().trim().min(1).nullable(),
	score: z.number().finite().nullable(),
	title: z.string().trim().min(1).nullable(),
	url: z.string().url().nullable(),
});

const resolveApplicationHelpContextInputSchema = z.object({
	artifactName: z.string().trim().min(1).nullable().default(null),
	company: z.string().trim().min(1).nullable().default(null),
	pdfPath: z.string().trim().min(1).nullable().default(null),
	reportNumber: z
		.string()
		.regex(/^\d{3}$/)
		.nullable()
		.default(null),
	reportPath: z.string().trim().min(1).nullable().default(null),
	role: z.string().trim().min(1).nullable().default(null),
});

const stageApplicationHelpDraftInputSchema = z.object({
	company: z.string().trim().min(1).nullable().default(null),
	items: z.array(applicationHelpDraftItemSchema).min(1),
	matchedContext: applicationHelpMatchedReportContextSchema
		.nullable()
		.default(null),
	reviewNotes: z.string().trim().min(1).nullable().default(null),
	role: z.string().trim().min(1).nullable().default(null),
	sessionId: z
		.string()
		.trim()
		.min(1)
		.regex(/^[A-Za-z0-9._:-]+$/),
	warnings: z.array(z.string().trim().min(1)).default([]),
});

const storedApplicationHelpDraftPacketSchema = z.object({
	company: z.string().trim().min(1).nullable(),
	createdAt: z.string().datetime(),
	fingerprint: z.string().trim().min(1),
	items: z.array(applicationHelpDraftItemSchema).min(1),
	matchedContext: applicationHelpMatchedReportContextSchema.nullable(),
	packetId: z.string().trim().min(1),
	reviewNotes: z.string().trim().min(1).nullable(),
	reviewRequired: z.literal(true),
	revision: z.number().int().positive(),
	role: z.string().trim().min(1).nullable(),
	sessionId: z
		.string()
		.trim()
		.min(1)
		.regex(/^[A-Za-z0-9._:-]+$/),
	updatedAt: z.string().datetime(),
	warnings: z.array(z.string().trim().min(1)),
});

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return typeof error === "object" && error !== null && "code" in error;
}

function normalizeText(value: string | null): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

function normalizeMatchText(value: string | null): string | null {
	const normalized = normalizeText(value)
		?.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return normalized && normalized.length > 0 ? normalized : null;
}

function readString(
	value: Record<string, JsonValue>,
	key: string,
): string | null {
	const candidate = value[key];
	return typeof candidate === "string" && candidate.trim().length > 0
		? candidate.trim()
		: null;
}

function isJsonObject(
	value: JsonValue | null,
): value is Record<string, JsonValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function splitTokens(value: string | null): string[] {
	return normalizeMatchText(value)?.split(" ") ?? [];
}

function computeTextMatchScore(
	left: string | null,
	right: string | null,
): number {
	const normalizedLeft = normalizeMatchText(left);
	const normalizedRight = normalizeMatchText(right);

	if (!normalizedLeft || !normalizedRight) {
		return 0;
	}

	if (normalizedLeft === normalizedRight) {
		return 260;
	}

	if (
		normalizedLeft.includes(normalizedRight) ||
		normalizedRight.includes(normalizedLeft)
	) {
		return 180;
	}

	const leftTokens = new Set(splitTokens(normalizedLeft));
	let sharedTokens = 0;

	for (const token of splitTokens(normalizedRight)) {
		if (leftTokens.has(token)) {
			sharedTokens += 1;
		}
	}

	if (sharedTokens === 0) {
		return 0;
	}

	return Math.min(150, sharedTokens * 45);
}

function parseArtifactDate(candidate: string): string | null {
	const match = candidate.match(/(\d{4}-\d{2}-\d{2})(?=\.[^.]+$)/);
	return match?.[1] ?? null;
}

function parseReportNumber(candidate: string): string | null {
	const match = candidate.match(/(?:^|\/)(\d{3})-/);
	return match?.[1] ?? null;
}

function parseScore(candidate: string | null): number | null {
	if (!candidate) {
		return null;
	}

	const match = candidate.match(/^(\d+(?:\.\d+)?)\/5$/);
	return match?.[1] ? Number.parseFloat(match[1]) : null;
}

function parseTitle(firstLine: string | null): {
	company: string | null;
	role: string | null;
	title: string | null;
} {
	const trimmed = firstLine?.trim() ?? "";

	if (!trimmed.startsWith("# ")) {
		return {
			company: null,
			role: null,
			title: trimmed.length > 0 ? trimmed : null,
		};
	}

	const title = trimmed.slice(2).trim();
	const match = title.match(/^Evaluation:\s*(.+?)\s+--\s+(.+)$/);

	return {
		company: normalizeText(match?.[1] ?? null),
		role: normalizeText(match?.[2] ?? null),
		title,
	};
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

function unwrapMarkdownLink(candidate: string): string {
	const match = candidate.match(/^\[[^\]]+\]\(([^)]+)\)$/);
	return match?.[1]?.trim() ?? candidate;
}

function normalizeOptionalRepoPath(input: {
	allowedPrefix: string;
	candidate: string | null;
	code: string;
	label: string;
	strict: boolean;
}): string | null {
	if (!input.candidate) {
		return null;
	}

	try {
		const normalizedPath = normalizeRepoRelativePath(
			unwrapMarkdownLink(input.candidate),
		);

		if (
			normalizedPath !== input.allowedPrefix &&
			!normalizedPath.startsWith(`${input.allowedPrefix}/`)
		) {
			if (!input.strict) {
				return null;
			}

			throw new ToolExecutionError(
				"tool-invalid-input",
				`${input.label} must stay under ${input.allowedPrefix}/.`,
				{
					detail: {
						[input.code]: input.candidate,
					},
				},
			);
		}

		return normalizedPath;
	} catch (error) {
		if (!input.strict) {
			return null;
		}

		throw new ToolExecutionError(
			"tool-invalid-input",
			`${input.label} is invalid.`,
			{
				cause: error,
				detail: {
					[input.code]: input.candidate,
				},
			},
		);
	}
}

function parseDraftSection(markdown: string): string | null {
	const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
	const sectionIndex = lines.findIndex(
		(line) => line.trim() === "## H) Draft Application Answers",
	);

	if (sectionIndex < 0) {
		return null;
	}

	let endIndex = lines.length;

	for (let index = sectionIndex + 1; index < lines.length; index += 1) {
		if (/^##\s+/.test(lines[index] ?? "")) {
			endIndex = index;
			break;
		}
	}

	const section = lines
		.slice(sectionIndex + 1, endIndex)
		.join("\n")
		.trim();
	return section.length > 0 ? section : "";
}

function stripAnswerLinePrefix(line: string): string {
	return line.replace(/^>\s?/, "").trimEnd();
}

function parseDraftItems(
	sectionText: string | null,
): ApplicationHelpDraftItem[] {
	if (sectionText === null) {
		return [];
	}

	const lines = sectionText.split("\n");
	const items: ApplicationHelpDraftItem[] = [];
	let currentQuestion: string | null = null;
	let currentAnswerLines: string[] = [];

	const flushCurrent = (): void => {
		if (!currentQuestion) {
			currentAnswerLines = [];
			return;
		}

		const answer = currentAnswerLines
			.map(stripAnswerLinePrefix)
			.join("\n")
			.trim();

		if (answer.length > 0) {
			items.push({
				answer,
				question: currentQuestion,
			});
		}

		currentQuestion = null;
		currentAnswerLines = [];
	};

	for (const line of lines) {
		const questionMatch = line.match(/^###\s+\d+\.\s+(.+)$/);

		if (questionMatch) {
			flushCurrent();
			currentQuestion = questionMatch[1]?.trim() ?? null;
			continue;
		}

		if (currentQuestion) {
			currentAnswerLines.push(line);
		}
	}

	flushCurrent();
	return items;
}

function summarizeCoverLetter(
	sectionText: string | null,
): ApplicationHelpCoverLetterSummary {
	if (sectionText === null) {
		return {
			message:
				"Cover-letter state is unavailable until report-backed context is resolved.",
			state: "not-requested",
		};
	}

	const normalizedSection = sectionText.toLowerCase();

	if (
		normalizedSection.includes("no cover-letter field was detected") ||
		normalizedSection.includes("no cover letter field was detected")
	) {
		return {
			message: "No cover-letter field was recorded in the saved report notes.",
			state: "not-requested",
		};
	}

	if (
		normalizedSection.includes("cover-letter") ||
		normalizedSection.includes("cover letter")
	) {
		return {
			message:
				"A cover letter remains a manual follow-up item until the checked-in cover-letter workflow exists.",
			state: "manual-follow-up",
		};
	}

	return {
		message:
			"No cover-letter follow-up was recorded in the saved report notes.",
		state: "not-requested",
	};
}

function normalizeLegitimacy(
	candidate: string | null,
): ReportViewerLegitimacy | null {
	if (
		candidate &&
		reportViewerLegitimacyValues.includes(candidate as ReportViewerLegitimacy)
	) {
		return candidate as ReportViewerLegitimacy;
	}

	return null;
}

async function readApplicationHelpReport(
	reportRepoRelativePath: string,
	options: RepoPathOptions,
): Promise<ApplicationHelpReportRecord> {
	const absolutePath = resolveRepoRelativePath(reportRepoRelativePath, options);
	const fileName =
		reportRepoRelativePath.split("/").pop() ?? reportRepoRelativePath;
	const reportText = await readFile(absolutePath, "utf8");
	const normalizedText = reportText.replace(/\r\n?/g, "\n");
	const lines = normalizedText.split("\n");
	const headerDividerIndex = lines.findIndex((line) => line.trim() === "---");
	const headerLines =
		headerDividerIndex >= 0 ? lines.slice(0, headerDividerIndex) : lines;
	const titleParts = parseTitle(lines[0] ?? null);
	const pdfRepoRelativePath = normalizeOptionalRepoPath({
		allowedPrefix: "output",
		candidate: readHeaderValue(headerLines, "PDF"),
		code: "pdfPath",
		label: "PDF path",
		strict: false,
	});
	const sectionText = parseDraftSection(normalizedText);
	const draftItems = parseDraftItems(sectionText);

	return {
		artifactDate: parseArtifactDate(fileName),
		company: titleParts.company,
		coverLetter: summarizeCoverLetter(sectionText),
		existingDraft: {
			itemCount: draftItems.length,
			items: draftItems,
			sectionPresent: sectionText !== null,
			sectionText,
		},
		fileName,
		legitimacy: normalizeLegitimacy(readHeaderValue(headerLines, "Legitimacy")),
		pdf: {
			exists:
				pdfRepoRelativePath !== null &&
				existsSync(resolveRepoRelativePath(pdfRepoRelativePath, options)),
			repoRelativePath: pdfRepoRelativePath,
		},
		reportNumber: parseReportNumber(reportRepoRelativePath),
		reportRepoRelativePath,
		role: titleParts.role,
		score: parseScore(readHeaderValue(headerLines, "Score")),
		title: titleParts.title,
		url: readHeaderValue(headerLines, "URL"),
	};
}

async function listApplicationHelpReports(
	options: RepoPathOptions,
): Promise<ApplicationHelpReportRecord[]> {
	const reportsDirectory = resolveRepoRelativePath("reports", options);
	let entries: string[];

	try {
		entries = await readdir(reportsDirectory);
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return [];
		}

		throw error;
	}

	const reports = await Promise.all(
		entries
			.filter((entry) => REPORT_FILE_NAME_PATTERN.test(entry))
			.sort((left, right) => left.localeCompare(right))
			.map((entry) => readApplicationHelpReport(`reports/${entry}`, options)),
	);

	return reports;
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
	left: string | null,
	right: string | null,
): number {
	if (left && right && left !== right) {
		return Number.parseInt(right, 10) - Number.parseInt(left, 10);
	}

	if (left) {
		return -1;
	}

	if (right) {
		return 1;
	}

	return 0;
}

function buildMatchScore(
	report: ApplicationHelpReportRecord,
	hints: ApplicationHelpContextHints,
): ReportCandidateScore {
	let score = 0;
	const reasons: string[] = [];

	if (hints.reportPath && report.reportRepoRelativePath === hints.reportPath) {
		score += 1_000;
		reasons.push("report-path");
	}

	if (hints.reportNumber && report.reportNumber === hints.reportNumber) {
		score += 900;
		reasons.push("report-number");
	}

	if (hints.pdfPath && report.pdf.repoRelativePath === hints.pdfPath) {
		score += 850;
		reasons.push("pdf-path");
	}

	const reportFileName = normalizeMatchText(report.fileName);
	const pdfFileName = normalizeMatchText(
		report.pdf.repoRelativePath?.split("/").pop() ?? null,
	);
	const artifactName = normalizeMatchText(hints.artifactName);

	if (artifactName) {
		if (reportFileName === artifactName || pdfFileName === artifactName) {
			score += 820;
			reasons.push("artifact-name");
		} else if (
			(reportFileName && reportFileName.includes(artifactName)) ||
			(pdfFileName && pdfFileName.includes(artifactName))
		) {
			score += 260;
			reasons.push("artifact-name");
		}
	}

	const companyScore = computeTextMatchScore(report.company, hints.company);
	if (companyScore > 0) {
		score += companyScore;
		reasons.push("company");
	}

	const roleScore = computeTextMatchScore(report.role, hints.role);
	if (roleScore > 0) {
		score += roleScore;
		reasons.push("role");
	}

	if (companyScore > 0 && roleScore > 0) {
		score += 80;
		reasons.push("company-role");
	}

	return {
		reasons,
		report,
		score,
	};
}

function compareReportCandidates(
	left: ReportCandidateScore,
	right: ReportCandidateScore,
): number {
	if (left.score !== right.score) {
		return right.score - left.score;
	}

	const dateComparison = compareNullableDates(
		left.report.artifactDate,
		right.report.artifactDate,
	);

	if (dateComparison !== 0) {
		return dateComparison;
	}

	const reportNumberComparison = compareNullableNumbers(
		left.report.reportNumber,
		right.report.reportNumber,
	);

	if (reportNumberComparison !== 0) {
		return reportNumberComparison;
	}

	return left.report.reportRepoRelativePath.localeCompare(
		right.report.reportRepoRelativePath,
	);
}

function hasExactReason(reasons: readonly string[]): boolean {
	return reasons.some((reason) =>
		["artifact-name", "pdf-path", "report-number", "report-path"].includes(
			reason,
		),
	);
}

function createWarning(
	code: ApplicationHelpWarningCode,
	message: string,
): ApplicationHelpWarningItem {
	return {
		code,
		message,
	};
}

function summarizeMatchState(
	reasons: readonly string[],
): ApplicationHelpContextMatchState {
	return hasExactReason(reasons) ? "exact" : "fuzzy";
}

export const APPLICATION_HELP_NO_SUBMIT_MESSAGE = NO_SUBMIT_MESSAGE;

export async function resolveApplicationHelpContextFromHints(
	input: ApplicationHelpContextHints,
	options: RepoPathOptions = {},
): Promise<ApplicationHelpContextResolution> {
	const hints: ApplicationHelpContextHints = {
		artifactName: normalizeText(input.artifactName),
		company: normalizeText(input.company),
		pdfPath: normalizeOptionalRepoPath({
			allowedPrefix: "output",
			candidate: input.pdfPath,
			code: "pdfPath",
			label: "PDF path",
			strict: false,
		}),
		reportNumber: normalizeText(input.reportNumber),
		reportPath: normalizeOptionalRepoPath({
			allowedPrefix: "reports",
			candidate: input.reportPath,
			code: "reportPath",
			label: "Report path",
			strict: false,
		}),
		role: normalizeText(input.role),
	};
	const hasHints = Object.values(hints).some((value) => value !== null);

	if (!hasHints) {
		return {
			matchedContext: null,
			message:
				"No application-help report hints were provided, so report-backed context is still missing.",
			warnings: [
				createWarning(
					"missing-context",
					"Provide a report number, company, role, or artifact hint to resolve saved application-help context.",
				),
			],
		};
	}

	const reports = await listApplicationHelpReports(options);

	if (reports.length === 0) {
		return {
			matchedContext: null,
			message:
				"No saved reports are available yet, so application-help context cannot be resolved.",
			warnings: [
				createWarning(
					"missing-context",
					"Saved reports are unavailable, so report-backed application-help context cannot be matched.",
				),
			],
		};
	}

	const candidates = reports
		.map((report) => buildMatchScore(report, hints))
		.filter((candidate) => candidate.score > 0)
		.sort(compareReportCandidates);

	if (candidates.length === 0) {
		return {
			matchedContext: null,
			message:
				"No saved report matched the provided application-help hints, so draft review stays in missing-context state.",
			warnings: [
				createWarning(
					"missing-context",
					"No saved report matched the provided company, role, report number, or artifact hint.",
				),
			],
		};
	}

	const selected = candidates[0];
	const nextCandidate = candidates[1];

	if (!selected) {
		return {
			matchedContext: null,
			message:
				"No saved report matched the provided application-help hints, so draft review stays in missing-context state.",
			warnings: [
				createWarning(
					"missing-context",
					"No saved report matched the provided company, role, report number, or artifact hint.",
				),
			],
		};
	}

	const warnings: ApplicationHelpWarningItem[] = [];

	if (
		nextCandidate &&
		nextCandidate.score === selected.score &&
		!hasExactReason(selected.reasons)
	) {
		warnings.push(
			createWarning(
				"ambiguous-report-match",
				`Multiple saved reports matched the same hints. Using ${selected.report.reportRepoRelativePath} by deterministic tie-break.`,
			),
		);
	}

	if (
		selected.report.pdf.repoRelativePath !== null &&
		!selected.report.pdf.exists
	) {
		warnings.push(
			createWarning(
				"missing-pdf-artifact",
				`Saved report ${selected.report.reportRepoRelativePath} references PDF ${selected.report.pdf.repoRelativePath}, but the file is missing.`,
			),
		);
	}

	if (selected.report.coverLetter.state === "manual-follow-up") {
		warnings.push(
			createWarning(
				"cover-letter-manual-follow-up",
				selected.report.coverLetter.message,
			),
		);
	}

	const matchedContext: ApplicationHelpMatchedReportContext = {
		...selected.report,
		matchReasons: [...selected.reasons],
		matchState: summarizeMatchState(selected.reasons),
	};

	const matchMessage =
		matchedContext.matchState === "exact"
			? `Resolved application-help context from ${matchedContext.reportRepoRelativePath}.`
			: `Resolved the best fuzzy application-help match from ${matchedContext.reportRepoRelativePath}.`;

	return {
		matchedContext,
		message:
			warnings.length > 0
				? `${matchMessage} Review the warnings before reusing the saved draft.`
				: matchMessage,
		warnings,
	};
}

function getDraftSessionDirectory(sessionId: string): string {
	return `${APPLICATION_HELP_DRAFT_ROOT}/${sessionId}`;
}

function buildDraftPacketFingerprint(input: {
	company: string | null;
	items: ApplicationHelpDraftItem[];
	matchedContext: ApplicationHelpMatchedReportContext | null;
	reviewNotes: string | null;
	role: string | null;
	sessionId: string;
	warnings: string[];
}): string {
	return createHash("sha1")
		.update(
			JSON.stringify({
				company: input.company,
				items: input.items,
				matchedContext: input.matchedContext,
				reviewNotes: input.reviewNotes,
				role: input.role,
				sessionId: input.sessionId,
				warnings: input.warnings,
			}),
		)
		.digest("hex");
}

function compareDraftPackets(
	left: ApplicationHelpDraftPacketWithPath,
	right: ApplicationHelpDraftPacketWithPath,
): number {
	if (left.createdAt !== right.createdAt) {
		return right.createdAt.localeCompare(left.createdAt);
	}

	if (left.revision !== right.revision) {
		return right.revision - left.revision;
	}

	return left.packetId.localeCompare(right.packetId);
}

async function listDraftPacketsForSession(
	sessionId: string,
	options: RepoPathOptions = {},
): Promise<ApplicationHelpDraftPacketWithPath[]> {
	const draftDirectory = resolveRepoRelativePath(
		getDraftSessionDirectory(sessionId),
		options,
	);
	let entries: string[];

	try {
		entries = await readdir(draftDirectory);
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return [];
		}

		throw error;
	}

	const packets = await Promise.all(
		entries
			.filter((entry) => entry.endsWith(".json"))
			.sort((left, right) => left.localeCompare(right))
			.map(async (entry) => {
				const repoRelativePath = `${getDraftSessionDirectory(sessionId)}/${entry}`;

				try {
					const parsed = storedApplicationHelpDraftPacketSchema.parse(
						JSON.parse(
							await readFile(
								resolveRepoRelativePath(repoRelativePath, options),
								"utf8",
							),
						),
					);

					return {
						...parsed,
						repoRelativePath,
					} satisfies ApplicationHelpDraftPacketWithPath;
				} catch {
					return null;
				}
			}),
	);

	return packets
		.filter(
			(packet): packet is ApplicationHelpDraftPacketWithPath => packet !== null,
		)
		.sort(compareDraftPackets);
}

function toDraftPacketSummary(
	packet: ApplicationHelpDraftPacketWithPath,
): ApplicationHelpDraftPacketSummary {
	return {
		company: packet.company,
		createdAt: packet.createdAt,
		fingerprint: packet.fingerprint,
		itemCount: packet.items.length,
		items: packet.items.map((item) => ({ ...item })),
		matchedContext: packet.matchedContext
			? {
					...packet.matchedContext,
					existingDraft: {
						...packet.matchedContext.existingDraft,
						items: packet.matchedContext.existingDraft.items.map((item) => ({
							...item,
						})),
					},
					matchReasons: [...packet.matchedContext.matchReasons],
				}
			: null,
		packetId: packet.packetId,
		repoRelativePath: packet.repoRelativePath,
		reviewNotes: packet.reviewNotes,
		reviewRequired: true,
		revision: packet.revision,
		role: packet.role,
		sessionId: packet.sessionId,
		updatedAt: packet.updatedAt,
		warnings: [...packet.warnings],
	};
}

export async function loadLatestApplicationHelpDraftPacket(
	input: {
		sessionId: string;
	},
	options: RepoPathOptions = {},
): Promise<ApplicationHelpDraftPacketSummary | null> {
	const [latestPacket] = await listDraftPacketsForSession(
		input.sessionId,
		options,
	);
	return latestPacket ? toDraftPacketSummary(latestPacket) : null;
}

function toToolWarnings(
	warnings: readonly ApplicationHelpWarningItem[],
): Array<{
	code: ApplicationHelpWarningCode;
	message: string;
}> {
	return warnings.map((warning) => ({
		code: warning.code,
		message: warning.message,
	}));
}

export function createApplicationHelpTools(): readonly AnyToolDefinition[] {
	return [
		{
			description:
				"Resolve the best saved report and PDF context for an application-help run, including any stored draft-answer section and no-submit reminders.",
			async execute(input, context) {
				const resolved = await resolveApplicationHelpContextFromHints(
					{
						artifactName: input.artifactName,
						company: input.company,
						pdfPath: normalizeOptionalRepoPath({
							allowedPrefix: "output",
							candidate: input.pdfPath,
							code: "pdfPath",
							label: "PDF path",
							strict: true,
						}),
						reportNumber: input.reportNumber,
						reportPath: normalizeOptionalRepoPath({
							allowedPrefix: "reports",
							candidate: input.reportPath,
							code: "reportPath",
							label: "Report path",
							strict: true,
						}),
						role: input.role,
					},
					{
						repoRoot: context.workspace.repoPaths.repoRoot,
					},
				);

				return {
					output: {
						matchedContext: resolved.matchedContext,
						message: resolved.message,
						noSubmitBoundary: {
							message: NO_SUBMIT_MESSAGE,
							reviewRequired: true,
							submissionAllowed: false,
						},
						status:
							resolved.matchedContext === null ? "missing-context" : "resolved",
					},
					warnings: toToolWarnings(resolved.warnings),
				};
			},
			inputSchema: resolveApplicationHelpContextInputSchema,
			name: "resolve-application-help-context",
		} satisfies ToolDefinition<
			z.output<typeof resolveApplicationHelpContextInputSchema>,
			JsonValue
		>,
		{
			description:
				"Persist one structured application-help draft packet under app-owned state so reviewable answers do not depend on chat transcript parsing.",
			async execute(input, context) {
				const existingPackets = await listDraftPacketsForSession(
					input.sessionId,
					{
						repoRoot: context.workspace.repoPaths.repoRoot,
					},
				);
				const latestPacket = existingPackets[0] ?? null;
				const fingerprint = buildDraftPacketFingerprint({
					company: input.company,
					items: input.items,
					matchedContext: input.matchedContext,
					reviewNotes: input.reviewNotes,
					role: input.role,
					sessionId: input.sessionId,
					warnings: input.warnings,
				});

				if (latestPacket && latestPacket.fingerprint === fingerprint) {
					return {
						output: {
							draftPacket: toDraftPacketSummary(latestPacket),
							message:
								"Application-help draft packet already matches the latest persisted revision.",
							noSubmitBoundary: {
								message: NO_SUBMIT_MESSAGE,
								reviewRequired: true,
								submissionAllowed: false,
							},
							status: "already-staged",
						},
					};
				}

				const createdAt = new Date(context.now()).toISOString();
				const revision = (latestPacket?.revision ?? 0) + 1;
				const packetId = `${createdAt.replace(/[:.]/g, "-")}-${String(revision).padStart(2, "0")}-${fingerprint.slice(0, 8)}`;
				const repoRelativePath = `${getDraftSessionDirectory(input.sessionId)}/${packetId}.json`;
				const packet: ApplicationHelpDraftPacketRecord = {
					company: input.company,
					createdAt,
					fingerprint,
					items: input.items.map((item) => ({ ...item })),
					matchedContext: input.matchedContext
						? {
								...input.matchedContext,
								existingDraft: {
									...input.matchedContext.existingDraft,
									items: input.matchedContext.existingDraft.items.map(
										(item) => ({
											...item,
										}),
									),
								},
								matchReasons: [...input.matchedContext.matchReasons],
							}
						: null,
					packetId,
					reviewNotes: input.reviewNotes,
					reviewRequired: true,
					revision,
					role: input.role,
					sessionId: input.sessionId,
					updatedAt: createdAt,
					warnings: [...input.warnings],
				};

				await context.mutateWorkspace({
					content: packet,
					repoRelativePath,
					target: "app-state",
				});

				return {
					output: {
						draftPacket: toDraftPacketSummary({
							...packet,
							repoRelativePath,
						}),
						message:
							"Application-help draft packet was persisted in app-owned state for review and resume flows.",
						noSubmitBoundary: {
							message: NO_SUBMIT_MESSAGE,
							reviewRequired: true,
							submissionAllowed: false,
						},
						status: "staged",
					},
				};
			},
			inputSchema: stageApplicationHelpDraftInputSchema,
			name: "stage-application-help-draft",
			policy: {
				permissions: {
					mutationTargets: ["app-state"],
				},
			},
		} satisfies ToolDefinition<
			z.output<typeof stageApplicationHelpDraftInputSchema>,
			JsonValue
		>,
	];
}

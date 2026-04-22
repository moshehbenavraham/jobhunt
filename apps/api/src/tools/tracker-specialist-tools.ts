import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
	normalizeRepoRelativePath,
	type RepoPathOptions,
	resolveRepoRelativePath,
} from "../config/repo-paths.js";
import {
	type CompareOffersResultPacket,
	type FollowUpCadenceResultPacket,
	type RejectionPatternsResultPacket,
	type TrackerSpecialistMode,
	type TrackerSpecialistOfferReference,
	type TrackerSpecialistResultPacket,
	type TrackerSpecialistWarningCode,
	type TrackerSpecialistWarningItem,
	trackerSpecialistMatchStateValues,
	trackerSpecialistWarningCodeValues,
} from "../server/tracker-specialist-contract.js";
import {
	type ParsedTrackerRow,
	parseTrackerReportPath,
	parseTrackerTable,
	TrackerTableError,
} from "../server/tracker-table.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import { resolveApplicationHelpContextFromHints } from "./application-help-tools.js";
import type {
	AnyToolDefinition,
	ToolDefinition,
	ToolWarning,
} from "./tool-contract.js";
import { ToolExecutionError } from "./tool-errors.js";

const TRACKER_SPECIALIST_ROOT = ".jobhunt-app/tracker-specialist";
const FOLLOW_UP_ENTRY_LIMIT = 8;
const PATTERN_ARCHETYPE_LIMIT = 8;
const PATTERN_COMPANY_SIZE_LIMIT = 5;
const PATTERN_GAP_LIMIT = 10;
const PATTERN_RECOMMENDATION_LIMIT = 5;
const PATTERN_REMOTE_POLICY_LIMIT = 6;
const PATTERN_TOP_BLOCKER_LIMIT = 5;
const REPORT_PATH_PREFIX = "reports";

type ScriptDispatchContext = Parameters<ToolDefinition["execute"]>[1];

type PacketPersistResult<TPacket extends TrackerSpecialistResultPacket> = {
	packet: TPacket;
	status: "already-staged" | "staged";
};

const trackerSpecialistWarningSchema = z.object({
	code: z.enum(trackerSpecialistWarningCodeValues),
	message: z.string().trim().min(1),
});

const trackerSpecialistArtifactLinkSchema = z.object({
	exists: z.boolean(),
	repoRelativePath: z.string().trim().min(1).nullable(),
});

const trackerSpecialistOfferReferenceSchema = z.object({
	company: z.string().trim().min(1).nullable().default(null),
	entryNumber: z.number().int().positive().nullable().default(null),
	label: z.string().trim().min(1).nullable().default(null),
	reportNumber: z
		.string()
		.regex(/^\d{3}$/)
		.nullable()
		.default(null),
	reportPath: z.string().trim().min(1).nullable().default(null),
	role: z.string().trim().min(1).nullable().default(null),
});

const trackerSpecialistResolvedOfferSchema = z.object({
	company: z.string().trim().min(1).nullable(),
	fileName: z.string().trim().min(1),
	label: z.string().trim().min(1).nullable(),
	legitimacy: z
		.enum(["High Confidence", "Proceed with Caution", "Suspicious"])
		.nullable(),
	matchReasons: z.array(z.string().trim().min(1)),
	matchState: z.enum(trackerSpecialistMatchStateValues),
	pdf: trackerSpecialistArtifactLinkSchema,
	reportNumber: z
		.string()
		.regex(/^\d{3}$/)
		.nullable(),
	reportRepoRelativePath: z.string().trim().min(1),
	role: z.string().trim().min(1).nullable(),
	score: z.number().finite().nullable(),
	title: z.string().trim().min(1).nullable(),
	trackerEntryNumber: z.number().int().positive().nullable(),
	url: z.string().url().nullable(),
});

const compareOffersResultPacketSchema = z.object({
	fingerprint: z.string().trim().min(1),
	generatedAt: z.string().datetime(),
	message: z.string().trim().min(1),
	mode: z.literal("compare-offers"),
	offers: z.array(trackerSpecialistResolvedOfferSchema),
	references: z.array(trackerSpecialistOfferReferenceSchema),
	resultStatus: z.enum(["degraded", "missing-input", "ready"] as const),
	revision: z.number().int().positive(),
	sessionId: z.string().trim().min(1),
	unmatchedReferences: z.array(trackerSpecialistOfferReferenceSchema),
	updatedAt: z.string().datetime(),
	warnings: z.array(trackerSpecialistWarningSchema),
});

const trackerSpecialistFollowUpEntrySchema = z.object({
	company: z.string().trim().min(1),
	contacts: z.array(
		z.object({
			email: z.string().trim().min(1),
			name: z.string().trim().min(1).nullable(),
		}),
	),
	date: z.string().trim().min(1),
	daysSinceApplication: z.number().int().nonnegative(),
	daysSinceLastFollowup: z.number().int().nonnegative().nullable(),
	daysUntilNext: z.number().int().nullable(),
	followupCount: z.number().int().nonnegative(),
	nextFollowupDate: z.string().trim().min(1).nullable(),
	num: z.number().int().positive(),
	reportPath: z.string().trim().min(1).nullable(),
	role: z.string().trim().min(1),
	score: z.string().trim().min(1),
	status: z.string().trim().min(1),
	urgency: z.enum(["cold", "overdue", "urgent", "waiting"]),
});

const followUpCadenceResultPacketSchema = z.object({
	cadenceConfig: z.object({
		appliedFirst: z.number().int().positive(),
		appliedMaxFollowups: z.number().int().positive(),
		appliedSubsequent: z.number().int().positive(),
		interviewThankyou: z.number().int().positive(),
		respondedInitial: z.number().int().positive(),
		respondedSubsequent: z.number().int().positive(),
	}),
	entries: z.array(trackerSpecialistFollowUpEntrySchema),
	fingerprint: z.string().trim().min(1),
	generatedAt: z.string().datetime(),
	message: z.string().trim().min(1),
	metadata: z.object({
		actionable: z.number().int().nonnegative(),
		analysisDate: z.string().trim().min(1),
		cold: z.number().int().nonnegative(),
		overdue: z.number().int().nonnegative(),
		totalTracked: z.number().int().nonnegative(),
		urgent: z.number().int().nonnegative(),
		waiting: z.number().int().nonnegative(),
	}),
	mode: z.literal("follow-up-cadence"),
	resultStatus: z.enum(["degraded", "empty-history", "ready"] as const),
	revision: z.number().int().positive(),
	sessionId: z.string().trim().min(1),
	updatedAt: z.string().datetime(),
	warnings: z.array(trackerSpecialistWarningSchema),
});

const trackerSpecialistPatternFunnelItemSchema = z.object({
	count: z.number().int().nonnegative(),
	stage: z.string().trim().min(1),
});

const trackerSpecialistPatternBlockerSchema = z.object({
	blocker: z.string().trim().min(1),
	frequency: z.number().int().nonnegative(),
	percentage: z.number().int().nonnegative(),
});

const trackerSpecialistPatternRecommendationSchema = z.object({
	action: z.string().trim().min(1),
	impact: z.string().trim().min(1),
	reasoning: z.string().trim().min(1),
});

const trackerSpecialistPatternScoreThresholdSchema = z.object({
	positiveRange: z.string().trim().min(1),
	reasoning: z.string().trim().min(1),
	recommended: z.number().finite(),
});

const trackerSpecialistPatternGapSchema = z.object({
	frequency: z.number().int().nonnegative(),
	skill: z.string().trim().min(1),
});

const trackerSpecialistPatternRemotePolicySchema = z.object({
	conversionRate: z.number().int().nonnegative(),
	negative: z.number().int().nonnegative(),
	pending: z.number().int().nonnegative(),
	policy: z.string().trim().min(1),
	positive: z.number().int().nonnegative(),
	selfFiltered: z.number().int().nonnegative(),
	total: z.number().int().nonnegative(),
});

const trackerSpecialistPatternArchetypeSchema = z.object({
	archetype: z.string().trim().min(1),
	conversionRate: z.number().int().nonnegative(),
	negative: z.number().int().nonnegative(),
	pending: z.number().int().nonnegative(),
	positive: z.number().int().nonnegative(),
	selfFiltered: z.number().int().nonnegative(),
	total: z.number().int().nonnegative(),
});

const trackerSpecialistPatternCompanySizeSchema = z.object({
	conversionRate: z.number().int().nonnegative(),
	negative: z.number().int().nonnegative(),
	pending: z.number().int().nonnegative(),
	positive: z.number().int().nonnegative(),
	selfFiltered: z.number().int().nonnegative(),
	size: z.string().trim().min(1),
	total: z.number().int().nonnegative(),
});

const rejectionPatternsResultPacketSchema = z.object({
	archetypeBreakdown: z.array(trackerSpecialistPatternArchetypeSchema),
	companySizeBreakdown: z.array(trackerSpecialistPatternCompanySizeSchema),
	fingerprint: z.string().trim().min(1),
	funnel: z.array(trackerSpecialistPatternFunnelItemSchema),
	generatedAt: z.string().datetime(),
	message: z.string().trim().min(1),
	metadata: z.object({
		analysisDate: z.string().trim().min(1),
		byOutcome: z.object({
			negative: z.number().int().nonnegative(),
			pending: z.number().int().nonnegative(),
			positive: z.number().int().nonnegative(),
			selfFiltered: z.number().int().nonnegative(),
		}),
		total: z.number().int().nonnegative(),
	}),
	mode: z.literal("rejection-patterns"),
	recommendations: z.array(trackerSpecialistPatternRecommendationSchema),
	remotePolicy: z.array(trackerSpecialistPatternRemotePolicySchema),
	resultStatus: z.enum(["degraded", "empty-history", "ready"] as const),
	revision: z.number().int().positive(),
	scoreThreshold: trackerSpecialistPatternScoreThresholdSchema,
	sessionId: z.string().trim().min(1),
	topBlockers: z.array(trackerSpecialistPatternBlockerSchema),
	techStackGaps: z.array(trackerSpecialistPatternGapSchema),
	updatedAt: z.string().datetime(),
	warnings: z.array(trackerSpecialistWarningSchema),
});

const trackerSpecialistPacketSchema = z.discriminatedUnion("mode", [
	compareOffersResultPacketSchema,
	followUpCadenceResultPacketSchema,
	rejectionPatternsResultPacketSchema,
]);

const resolveCompareOffersContextInputSchema = z.object({
	limit: z.number().int().min(2).max(12).default(6),
	offers: z.array(trackerSpecialistOfferReferenceSchema).max(12).default([]),
});

const analyzeFollowUpCadenceInputSchema = z.object({
	appliedDays: z.number().int().min(1).max(30).nullable().default(null),
	overdueOnly: z.boolean().default(false),
});

const analyzeRejectionPatternsInputSchema = z.object({
	minThreshold: z.number().int().min(1).max(50).nullable().default(null),
});

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return typeof error === "object" && error !== null && "code" in error;
}

function createWarning(
	code: TrackerSpecialistWarningCode,
	message: string,
): TrackerSpecialistWarningItem {
	return {
		code,
		message,
	};
}

function dedupeWarnings(
	warnings: readonly TrackerSpecialistWarningItem[],
): TrackerSpecialistWarningItem[] {
	const seen = new Set<string>();
	const deduped: TrackerSpecialistWarningItem[] = [];

	for (const warning of warnings) {
		const key = `${warning.code}:${warning.message}`;

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		deduped.push({
			code: warning.code,
			message: warning.message,
		});
	}

	return deduped;
}

function toToolWarnings(
	warnings: readonly TrackerSpecialistWarningItem[],
): ToolWarning[] {
	return warnings.map((warning) => ({
		code: warning.code,
		message: warning.message,
	}));
}

function buildFingerprint(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function tryParseScriptJson<T>(candidate: string): T | null {
	try {
		return JSON.parse(candidate) as T;
	} catch {
		return null;
	}
}

function extractScriptJsonFromError<T>(error: unknown): T | null {
	if (!(error instanceof ToolExecutionError) || error.detail === null) {
		return null;
	}

	const stdout =
		typeof error.detail === "object" &&
		error.detail !== null &&
		"stdout" in error.detail &&
		typeof error.detail.stdout === "string"
			? error.detail.stdout
			: null;

	return stdout ? tryParseScriptJson<T>(stdout) : null;
}

function getTrackerSpecialistPacketPath(
	sessionId: string,
	mode: TrackerSpecialistMode,
): string {
	return `${TRACKER_SPECIALIST_ROOT}/${sessionId}/${mode}.json`;
}

function normalizeStoredReportPath(candidate: string | null): string | null {
	if (!candidate) {
		return null;
	}

	try {
		const normalized = normalizeRepoRelativePath(candidate);

		if (
			normalized === REPORT_PATH_PREFIX ||
			!normalized.startsWith(`${REPORT_PATH_PREFIX}/`)
		) {
			return null;
		}

		return normalized;
	} catch {
		return null;
	}
}

async function readTextIfExists(path: string): Promise<string | null> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return null;
		}

		throw error;
	}
}

async function loadTrackerRows(
	repoRoot: string,
): Promise<ParsedTrackerRow[] | null> {
	try {
		const trackerPath = resolveRepoRelativePath("data/applications.md", {
			repoRoot,
		});
		const trackerText = await readTextIfExists(trackerPath);

		if (trackerText === null) {
			return null;
		}

		return parseTrackerTable(trackerText).rows;
	} catch (error) {
		if (error instanceof TrackerTableError) {
			return null;
		}

		throw error;
	}
}

function selectTrackerRow(
	rows: readonly ParsedTrackerRow[] | null,
	entryNumber: number | null,
): ParsedTrackerRow | null {
	if (entryNumber === null || rows === null) {
		return null;
	}

	return rows.find((row) => row.entryNumber === entryNumber) ?? null;
}

function copyOfferReference(
	reference: TrackerSpecialistOfferReference,
): TrackerSpecialistOfferReference {
	return {
		company: reference.company,
		entryNumber: reference.entryNumber,
		label: reference.label,
		reportNumber: reference.reportNumber,
		reportPath: reference.reportPath,
		role: reference.role,
	};
}

function mapOfferWarnings(
	reference: TrackerSpecialistOfferReference,
	warnings: ReadonlyArray<{ code: string; message: string }>,
): TrackerSpecialistWarningItem[] {
	const mapped: TrackerSpecialistWarningItem[] = [];
	const referenceLabel =
		reference.label ??
		reference.company ??
		reference.reportNumber ??
		reference.reportPath ??
		(reference.entryNumber ? `tracker row ${reference.entryNumber}` : "offer");

	for (const warning of warnings) {
		switch (warning.code) {
			case "ambiguous-report-match":
				mapped.push(
					createWarning(
						"ambiguous-offer-match",
						`${referenceLabel} matched multiple saved reports; the newest candidate was selected.`,
					),
				);
				break;
			case "missing-pdf-artifact":
				mapped.push(createWarning("missing-pdf-artifact", warning.message));
				break;
			default:
				break;
		}
	}

	return mapped;
}

function toResolvedOffer(input: {
	entryNumber: number | null;
	label: string | null;
	matchedContext: Awaited<
		ReturnType<typeof resolveApplicationHelpContextFromHints>
	>["matchedContext"];
}): CompareOffersResultPacket["offers"][number] {
	if (input.matchedContext === null) {
		throw new Error("Matched context is required to build a resolved offer.");
	}

	return {
		company: input.matchedContext.company,
		fileName: input.matchedContext.fileName,
		label: input.label,
		legitimacy: input.matchedContext.legitimacy,
		matchReasons: [...input.matchedContext.matchReasons],
		matchState: input.matchedContext.matchState,
		pdf: {
			exists: input.matchedContext.pdf.exists,
			repoRelativePath: input.matchedContext.pdf.repoRelativePath,
		},
		reportNumber: input.matchedContext.reportNumber,
		reportRepoRelativePath: input.matchedContext.reportRepoRelativePath,
		role: input.matchedContext.role,
		score: input.matchedContext.score,
		title: input.matchedContext.title,
		trackerEntryNumber: input.entryNumber,
		url: input.matchedContext.url,
	};
}

function dedupeOffers(
	offers: ReadonlyArray<CompareOffersResultPacket["offers"][number]>,
	limit: number,
): CompareOffersResultPacket["offers"] {
	const seen = new Set<string>();
	const deduped: CompareOffersResultPacket["offers"] = [];

	for (const offer of offers) {
		const key = `${offer.reportRepoRelativePath}:${offer.label ?? ""}`;

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		deduped.push({
			...offer,
			matchReasons: [...offer.matchReasons],
			pdf: {
				...offer.pdf,
			},
		});

		if (deduped.length >= limit) {
			break;
		}
	}

	return deduped;
}

function createCompareOffersMissingInputPacket(input: {
	message: string;
	nowIso: string;
	references: TrackerSpecialistOfferReference[];
	sessionId: string;
	unmatchedReferences: TrackerSpecialistOfferReference[];
	warnings: TrackerSpecialistWarningItem[];
}): Omit<CompareOffersResultPacket, "fingerprint" | "revision"> {
	return {
		generatedAt: input.nowIso,
		message: input.message,
		mode: "compare-offers",
		offers: [],
		references: input.references.map(copyOfferReference),
		resultStatus: "missing-input",
		sessionId: input.sessionId,
		unmatchedReferences: input.unmatchedReferences.map(copyOfferReference),
		updatedAt: input.nowIso,
		warnings: dedupeWarnings(input.warnings),
	};
}

function createFollowUpDegradedPacket(input: {
	message: string;
	nowIso: string;
	sessionId: string;
	warnings: TrackerSpecialistWarningItem[];
}): Omit<FollowUpCadenceResultPacket, "fingerprint" | "revision"> {
	return {
		cadenceConfig: {
			appliedFirst: 7,
			appliedMaxFollowups: 2,
			appliedSubsequent: 7,
			interviewThankyou: 1,
			respondedInitial: 1,
			respondedSubsequent: 3,
		},
		entries: [],
		generatedAt: input.nowIso,
		message: input.message,
		metadata: {
			actionable: 0,
			analysisDate: input.nowIso.slice(0, 10),
			cold: 0,
			overdue: 0,
			totalTracked: 0,
			urgent: 0,
			waiting: 0,
		},
		mode: "follow-up-cadence",
		resultStatus: "degraded",
		sessionId: input.sessionId,
		updatedAt: input.nowIso,
		warnings: dedupeWarnings(input.warnings),
	};
}

function createRejectionPatternsDegradedPacket(input: {
	message: string;
	nowIso: string;
	sessionId: string;
	warnings: TrackerSpecialistWarningItem[];
}): Omit<RejectionPatternsResultPacket, "fingerprint" | "revision"> {
	return {
		archetypeBreakdown: [],
		companySizeBreakdown: [],
		funnel: [],
		generatedAt: input.nowIso,
		message: input.message,
		metadata: {
			analysisDate: input.nowIso.slice(0, 10),
			byOutcome: {
				negative: 0,
				pending: 0,
				positive: 0,
				selfFiltered: 0,
			},
			total: 0,
		},
		mode: "rejection-patterns",
		recommendations: [],
		remotePolicy: [],
		resultStatus: "degraded",
		scoreThreshold: {
			positiveRange: "N/A",
			reasoning: "Pattern analysis did not complete successfully.",
			recommended: 0,
		},
		sessionId: input.sessionId,
		techStackGaps: [],
		topBlockers: [],
		updatedAt: input.nowIso,
		warnings: dedupeWarnings(input.warnings),
	};
}

async function persistTrackerSpecialistPacket<
	TPacket extends TrackerSpecialistResultPacket,
>(
	packetInput: Omit<TPacket, "fingerprint" | "revision">,
	context: ScriptDispatchContext,
): Promise<PacketPersistResult<TPacket>> {
	const repoRoot = context.workspace.repoPaths.repoRoot;
	const packetPath = getTrackerSpecialistPacketPath(
		packetInput.sessionId,
		packetInput.mode,
	);
	const existingPacket = await loadTrackerSpecialistPacket(
		{
			mode: packetInput.mode,
			sessionId: packetInput.sessionId,
		},
		{
			repoRoot,
		},
	);
	const fingerprint = buildFingerprint({
		...packetInput,
		warnings: packetInput.warnings.map((warning) => ({
			code: warning.code,
			message: warning.message,
		})),
	});

	if (existingPacket && existingPacket.fingerprint === fingerprint) {
		return {
			packet: existingPacket as TPacket,
			status: "already-staged",
		};
	}

	const revision = (existingPacket?.revision ?? 0) + 1;
	const packet = {
		...packetInput,
		fingerprint,
		revision,
	} as TPacket;

	await context.mutateWorkspace({
		content: packet,
		overwrite: existingPacket !== null,
		repoRelativePath: packetPath,
		target: "app-state",
	});

	return {
		packet,
		status: "staged",
	};
}

function toScriptFailureWarning(error: unknown): TrackerSpecialistWarningItem {
	if (error instanceof ToolExecutionError) {
		if (error.code === "tool-script-timeout") {
			return createWarning(
				"degraded-analysis",
				`The allowlisted analysis script timed out: ${error.message}`,
			);
		}

		if (error.code === "tool-script-failed") {
			return createWarning(
				"degraded-analysis",
				`The allowlisted analysis script failed: ${error.message}`,
			);
		}
	}

	return createWarning(
		"degraded-analysis",
		error instanceof Error ? error.message : String(error),
	);
}

export async function loadTrackerSpecialistPacket(
	input: {
		mode: TrackerSpecialistMode;
		sessionId: string;
	},
	options: RepoPathOptions = {},
): Promise<TrackerSpecialistResultPacket | null> {
	const packetPath = resolveRepoRelativePath(
		getTrackerSpecialistPacketPath(input.sessionId, input.mode),
		options,
	);
	const packetText = await readTextIfExists(packetPath);

	if (packetText === null) {
		return null;
	}

	const parsedJson = JSON.parse(packetText);
	return trackerSpecialistPacketSchema.parse(parsedJson);
}

async function executeResolveCompareOffersContext(
	input: z.output<typeof resolveCompareOffersContextInputSchema>,
	context: ScriptDispatchContext,
): Promise<PacketPersistResult<CompareOffersResultPacket>> {
	const nowIso = new Date(context.now()).toISOString();
	const sessionId = context.correlation.sessionId;
	const repoRoot = context.workspace.repoPaths.repoRoot;
	const trackerRows = await loadTrackerRows(repoRoot);
	const warnings: TrackerSpecialistWarningItem[] = [];
	const matchedOffers: CompareOffersResultPacket["offers"] = [];
	const unmatchedReferences: TrackerSpecialistOfferReference[] = [];

	if (input.offers.length === 0) {
		return persistTrackerSpecialistPacket(
			createCompareOffersMissingInputPacket({
				message:
					"Provide at least two saved offer references before compare-offers can stage a bounded review packet.",
				nowIso,
				references: [],
				sessionId,
				unmatchedReferences: [],
				warnings: [
					createWarning(
						"missing-input",
						"Compare-offers needs at least two report numbers, report paths, tracker rows, or company/role hints.",
					),
				],
			}),
			context,
		);
	}

	for (const rawReference of input.offers) {
		const reference = copyOfferReference(rawReference);
		const trackerRow = selectTrackerRow(trackerRows, reference.entryNumber);
		const normalizedReportPath = normalizeStoredReportPath(
			reference.reportPath ?? parseTrackerReportPath(trackerRow?.report ?? ""),
		);
		const resolved = await resolveApplicationHelpContextFromHints(
			{
				artifactName: reference.label,
				company: reference.company ?? trackerRow?.company ?? null,
				pdfPath: null,
				reportNumber:
					reference.reportNumber ??
					(normalizedReportPath
						? (normalizedReportPath.match(/(?:^|\/)(\d{3})-/)?.[1] ?? null)
						: null),
				reportPath: normalizedReportPath,
				role: reference.role ?? trackerRow?.role ?? null,
			},
			{
				repoRoot,
			},
		);

		if (resolved.matchedContext === null) {
			unmatchedReferences.push(reference);
			warnings.push(
				createWarning(
					"unmatched-offer-reference",
					`No saved report matched ${reference.label ?? reference.company ?? reference.reportNumber ?? reference.reportPath ?? "the provided offer reference"}.`,
				),
			);
			continue;
		}

		matchedOffers.push(
			toResolvedOffer({
				entryNumber: trackerRow?.entryNumber ?? null,
				label: reference.label,
				matchedContext: resolved.matchedContext,
			}),
		);
		warnings.push(...mapOfferWarnings(reference, resolved.warnings));
	}

	const offers = dedupeOffers(matchedOffers, input.limit);

	if (offers.length < 2) {
		return persistTrackerSpecialistPacket(
			createCompareOffersMissingInputPacket({
				message:
					offers.length === 1
						? "Only one saved offer could be resolved. Add one more offer reference before staging compare-offers review."
						: "No saved offers could be resolved from the provided references.",
				nowIso,
				references: input.offers,
				sessionId,
				unmatchedReferences,
				warnings: [
					...warnings,
					createWarning(
						"missing-input",
						"Compare-offers requires at least two resolved saved offers.",
					),
				],
			}),
			context,
		);
	}

	return persistTrackerSpecialistPacket(
		{
			generatedAt: nowIso,
			message: `Resolved ${offers.length} saved offers for bounded compare-offers review.`,
			mode: "compare-offers",
			offers,
			references: input.offers.map(copyOfferReference),
			resultStatus: "ready",
			sessionId,
			unmatchedReferences: unmatchedReferences.map(copyOfferReference),
			updatedAt: nowIso,
			warnings: dedupeWarnings(warnings),
		},
		context,
	);
}

type FollowUpCadenceScriptOutput = {
	cadenceConfig: {
		applied_first: number;
		applied_max_followups: number;
		applied_subsequent: number;
		interview_thankyou: number;
		responded_initial: number;
		responded_subsequent: number;
	};
	entries: Array<{
		company: string;
		contacts: Array<{
			email: string;
			name: string | null;
		}>;
		date: string;
		daysSinceApplication: number;
		daysSinceLastFollowup: number | null;
		daysUntilNext: number | null;
		followupCount: number;
		nextFollowupDate: string | null;
		num: number;
		reportPath: string | null;
		role: string;
		score: string;
		status: string;
		urgency: "cold" | "overdue" | "urgent" | "waiting";
	}>;
	error?: string;
	metadata: {
		actionable: number;
		analysisDate: string;
		cold: number;
		overdue: number;
		totalTracked: number;
		urgent: number;
		waiting: number;
	};
};

type RejectionPatternsScriptOutput = {
	archetypeBreakdown: Array<{
		archetype: string;
		conversionRate: number;
		negative: number;
		pending: number;
		positive: number;
		self_filtered: number;
		total: number;
	}>;
	blockerAnalysis: Array<{
		blocker: string;
		frequency: number;
		percentage: number;
	}>;
	companySizeBreakdown: Array<{
		conversionRate: number;
		negative: number;
		pending: number;
		positive: number;
		self_filtered: number;
		size: string;
		total: number;
	}>;
	error?: string;
	funnel: Record<string, number>;
	metadata: {
		analysisDate: string;
		byOutcome: {
			negative: number;
			pending: number;
			positive: number;
			self_filtered: number;
		};
		total: number;
	};
	recommendations: Array<{
		action: string;
		impact: string;
		reasoning: string;
	}>;
	remotePolicy: Array<{
		conversionRate: number;
		negative: number;
		pending: number;
		policy: string;
		positive: number;
		self_filtered: number;
		total: number;
	}>;
	scoreThreshold: {
		positiveRange: string;
		reasoning: string;
		recommended: number;
	};
	techStackGaps: Array<{
		frequency: number;
		skill: string;
	}>;
};

async function executeAnalyzeFollowUpCadence(
	input: z.output<typeof analyzeFollowUpCadenceInputSchema>,
	context: ScriptDispatchContext,
): Promise<PacketPersistResult<FollowUpCadenceResultPacket>> {
	const nowIso = new Date(context.now()).toISOString();
	const sessionId = context.correlation.sessionId;
	const args: string[] = [];

	if (input.overdueOnly) {
		args.push("--overdue-only");
	}

	if (input.appliedDays !== null) {
		args.push("--applied-days", String(input.appliedDays));
	}

	try {
		const result = await context.runScript({
			args,
			scriptName: "followup-cadence",
		});
		const parsed = JSON.parse(result.stdout) as FollowUpCadenceScriptOutput;

		if (typeof parsed.error === "string" || parsed.metadata.actionable === 0) {
			return persistTrackerSpecialistPacket(
				{
					cadenceConfig: {
						appliedFirst: parsed.cadenceConfig?.applied_first ?? 7,
						appliedMaxFollowups:
							parsed.cadenceConfig?.applied_max_followups ?? 2,
						appliedSubsequent: parsed.cadenceConfig?.applied_subsequent ?? 7,
						interviewThankyou: parsed.cadenceConfig?.interview_thankyou ?? 1,
						respondedInitial: parsed.cadenceConfig?.responded_initial ?? 1,
						respondedSubsequent:
							parsed.cadenceConfig?.responded_subsequent ?? 3,
					},
					entries: [],
					generatedAt: nowIso,
					message:
						parsed.error ??
						"No active applications are currently due for follow-up cadence review.",
					metadata: {
						actionable: parsed.metadata?.actionable ?? 0,
						analysisDate: parsed.metadata?.analysisDate ?? nowIso.slice(0, 10),
						cold: parsed.metadata?.cold ?? 0,
						overdue: parsed.metadata?.overdue ?? 0,
						totalTracked: parsed.metadata?.totalTracked ?? 0,
						urgent: parsed.metadata?.urgent ?? 0,
						waiting: parsed.metadata?.waiting ?? 0,
					},
					mode: "follow-up-cadence",
					resultStatus: "empty-history",
					sessionId,
					updatedAt: nowIso,
					warnings: [
						createWarning(
							"empty-history",
							parsed.error ??
								"No actionable follow-up entries were found in the tracker history.",
						),
					],
				},
				context,
			);
		}

		return persistTrackerSpecialistPacket(
			{
				cadenceConfig: {
					appliedFirst: parsed.cadenceConfig.applied_first,
					appliedMaxFollowups: parsed.cadenceConfig.applied_max_followups,
					appliedSubsequent: parsed.cadenceConfig.applied_subsequent,
					interviewThankyou: parsed.cadenceConfig.interview_thankyou,
					respondedInitial: parsed.cadenceConfig.responded_initial,
					respondedSubsequent: parsed.cadenceConfig.responded_subsequent,
				},
				entries: parsed.entries
					.slice(0, FOLLOW_UP_ENTRY_LIMIT)
					.map((entry) => ({
						company: entry.company,
						contacts: entry.contacts.map((contact) => ({
							email: contact.email,
							name: contact.name,
						})),
						date: entry.date,
						daysSinceApplication: entry.daysSinceApplication,
						daysSinceLastFollowup: entry.daysSinceLastFollowup,
						daysUntilNext: entry.daysUntilNext,
						followupCount: entry.followupCount,
						nextFollowupDate: entry.nextFollowupDate,
						num: entry.num,
						reportPath: entry.reportPath,
						role: entry.role,
						score: entry.score,
						status: entry.status,
						urgency: entry.urgency,
					})),
				generatedAt: nowIso,
				message: `Normalized follow-up cadence for ${parsed.metadata.actionable} actionable applications.`,
				metadata: {
					actionable: parsed.metadata.actionable,
					analysisDate: parsed.metadata.analysisDate,
					cold: parsed.metadata.cold,
					overdue: parsed.metadata.overdue,
					totalTracked: parsed.metadata.totalTracked,
					urgent: parsed.metadata.urgent,
					waiting: parsed.metadata.waiting,
				},
				mode: "follow-up-cadence",
				resultStatus: "ready",
				sessionId,
				updatedAt: nowIso,
				warnings: [],
			},
			context,
		);
	} catch (error) {
		const parsed =
			extractScriptJsonFromError<FollowUpCadenceScriptOutput>(error);

		if (parsed && typeof parsed.error === "string") {
			return persistTrackerSpecialistPacket(
				{
					cadenceConfig: {
						appliedFirst: parsed.cadenceConfig?.applied_first ?? 7,
						appliedMaxFollowups:
							parsed.cadenceConfig?.applied_max_followups ?? 2,
						appliedSubsequent: parsed.cadenceConfig?.applied_subsequent ?? 7,
						interviewThankyou: parsed.cadenceConfig?.interview_thankyou ?? 1,
						respondedInitial: parsed.cadenceConfig?.responded_initial ?? 1,
						respondedSubsequent:
							parsed.cadenceConfig?.responded_subsequent ?? 3,
					},
					entries: [],
					generatedAt: nowIso,
					message: parsed.error,
					metadata: {
						actionable: parsed.metadata?.actionable ?? 0,
						analysisDate: parsed.metadata?.analysisDate ?? nowIso.slice(0, 10),
						cold: parsed.metadata?.cold ?? 0,
						overdue: parsed.metadata?.overdue ?? 0,
						totalTracked: parsed.metadata?.totalTracked ?? 0,
						urgent: parsed.metadata?.urgent ?? 0,
						waiting: parsed.metadata?.waiting ?? 0,
					},
					mode: "follow-up-cadence",
					resultStatus: "empty-history",
					sessionId,
					updatedAt: nowIso,
					warnings: [createWarning("empty-history", parsed.error)],
				},
				context,
			);
		}

		return persistTrackerSpecialistPacket(
			createFollowUpDegradedPacket({
				message:
					"Follow-up cadence analysis could not be normalized. Review the degradation warning and retry when ready.",
				nowIso,
				sessionId,
				warnings: [toScriptFailureWarning(error)],
			}),
			context,
		);
	}
}

async function executeAnalyzeRejectionPatterns(
	input: z.output<typeof analyzeRejectionPatternsInputSchema>,
	context: ScriptDispatchContext,
): Promise<PacketPersistResult<RejectionPatternsResultPacket>> {
	const nowIso = new Date(context.now()).toISOString();
	const sessionId = context.correlation.sessionId;
	const args: string[] = [];
	const funnelOrder = [
		"evaluated",
		"applied",
		"responded",
		"interview",
		"offer",
		"rejected",
		"discarded",
		"skip",
	];

	if (input.minThreshold !== null) {
		args.push("--min-threshold", String(input.minThreshold));
	}

	try {
		const result = await context.runScript({
			args,
			scriptName: "analyze-patterns",
		});
		const parsed = JSON.parse(result.stdout) as RejectionPatternsScriptOutput;

		if (typeof parsed.error === "string") {
			return persistTrackerSpecialistPacket(
				{
					archetypeBreakdown: [],
					companySizeBreakdown: [],
					funnel: [],
					generatedAt: nowIso,
					message: parsed.error,
					metadata: {
						analysisDate: parsed.metadata?.analysisDate ?? nowIso.slice(0, 10),
						byOutcome: {
							negative: parsed.metadata?.byOutcome?.negative ?? 0,
							pending: parsed.metadata?.byOutcome?.pending ?? 0,
							positive: parsed.metadata?.byOutcome?.positive ?? 0,
							selfFiltered: parsed.metadata?.byOutcome?.self_filtered ?? 0,
						},
						total: parsed.metadata?.total ?? 0,
					},
					mode: "rejection-patterns",
					recommendations: [],
					remotePolicy: [],
					resultStatus: "empty-history",
					scoreThreshold: {
						positiveRange: "N/A",
						reasoning: parsed.error,
						recommended: 0,
					},
					sessionId,
					techStackGaps: [],
					topBlockers: [],
					updatedAt: nowIso,
					warnings: [createWarning("empty-history", parsed.error)],
				},
				context,
			);
		}

		const orderedFunnel = funnelOrder
			.map((stage) => ({
				count: parsed.funnel[stage] ?? 0,
				stage,
			}))
			.filter((item) => item.count > 0);

		return persistTrackerSpecialistPacket(
			{
				archetypeBreakdown: parsed.archetypeBreakdown
					.slice(0, PATTERN_ARCHETYPE_LIMIT)
					.map((item) => ({
						archetype: item.archetype,
						conversionRate: item.conversionRate,
						negative: item.negative,
						pending: item.pending,
						positive: item.positive,
						selfFiltered: item.self_filtered,
						total: item.total,
					})),
				companySizeBreakdown: parsed.companySizeBreakdown
					.slice(0, PATTERN_COMPANY_SIZE_LIMIT)
					.map((item) => ({
						conversionRate: item.conversionRate,
						negative: item.negative,
						pending: item.pending,
						positive: item.positive,
						selfFiltered: item.self_filtered,
						size: item.size,
						total: item.total,
					})),
				funnel: orderedFunnel,
				generatedAt: nowIso,
				message: `Normalized rejection-pattern analysis across ${parsed.metadata.total} tracked applications.`,
				metadata: {
					analysisDate: parsed.metadata.analysisDate,
					byOutcome: {
						negative: parsed.metadata.byOutcome.negative,
						pending: parsed.metadata.byOutcome.pending,
						positive: parsed.metadata.byOutcome.positive,
						selfFiltered: parsed.metadata.byOutcome.self_filtered,
					},
					total: parsed.metadata.total,
				},
				mode: "rejection-patterns",
				recommendations: parsed.recommendations
					.slice(0, PATTERN_RECOMMENDATION_LIMIT)
					.map((item) => ({
						action: item.action,
						impact: item.impact,
						reasoning: item.reasoning,
					})),
				remotePolicy: parsed.remotePolicy
					.slice(0, PATTERN_REMOTE_POLICY_LIMIT)
					.map((item) => ({
						conversionRate: item.conversionRate,
						negative: item.negative,
						pending: item.pending,
						policy: item.policy,
						positive: item.positive,
						selfFiltered: item.self_filtered,
						total: item.total,
					})),
				resultStatus: "ready",
				scoreThreshold: {
					positiveRange: parsed.scoreThreshold.positiveRange,
					reasoning: parsed.scoreThreshold.reasoning,
					recommended: parsed.scoreThreshold.recommended,
				},
				sessionId,
				techStackGaps: parsed.techStackGaps
					.slice(0, PATTERN_GAP_LIMIT)
					.map((item) => ({
						frequency: item.frequency,
						skill: item.skill,
					})),
				topBlockers: parsed.blockerAnalysis
					.slice(0, PATTERN_TOP_BLOCKER_LIMIT)
					.map((item) => ({
						blocker: item.blocker,
						frequency: item.frequency,
						percentage: item.percentage,
					})),
				updatedAt: nowIso,
				warnings: [],
			},
			context,
		);
	} catch (error) {
		const parsed =
			extractScriptJsonFromError<RejectionPatternsScriptOutput>(error);

		if (parsed && typeof parsed.error === "string") {
			return persistTrackerSpecialistPacket(
				{
					archetypeBreakdown: [],
					companySizeBreakdown: [],
					funnel: [],
					generatedAt: nowIso,
					message: parsed.error,
					metadata: {
						analysisDate: parsed.metadata?.analysisDate ?? nowIso.slice(0, 10),
						byOutcome: {
							negative: parsed.metadata?.byOutcome?.negative ?? 0,
							pending: parsed.metadata?.byOutcome?.pending ?? 0,
							positive: parsed.metadata?.byOutcome?.positive ?? 0,
							selfFiltered: parsed.metadata?.byOutcome?.self_filtered ?? 0,
						},
						total: parsed.metadata?.total ?? 0,
					},
					mode: "rejection-patterns",
					recommendations: [],
					remotePolicy: [],
					resultStatus: "empty-history",
					scoreThreshold: {
						positiveRange: "N/A",
						reasoning: parsed.error,
						recommended: 0,
					},
					sessionId,
					techStackGaps: [],
					topBlockers: [],
					updatedAt: nowIso,
					warnings: [createWarning("empty-history", parsed.error)],
				},
				context,
			);
		}

		return persistTrackerSpecialistPacket(
			createRejectionPatternsDegradedPacket({
				message:
					"Rejection-pattern analysis could not be normalized. Review the degradation warning and retry when ready.",
				nowIso,
				sessionId,
				warnings: [toScriptFailureWarning(error)],
			}),
			context,
		);
	}
}

export function createTrackerSpecialistTools(): readonly AnyToolDefinition[] {
	return [
		{
			description:
				"Resolve two or more saved tracker offers into one bounded compare-offers context packet backed by canonical report artifacts.",
			async execute(input, context) {
				const persisted = await executeResolveCompareOffersContext(
					input,
					context,
				);

				return {
					output: {
						message: persisted.packet.message,
						packet: persisted.packet,
						status: persisted.status,
					},
					warnings: toToolWarnings(persisted.packet.warnings),
				};
			},
			inputSchema: resolveCompareOffersContextInputSchema,
			name: "resolve-compare-offers-context",
			policy: {
				permissions: {
					mutationTargets: ["app-state"],
				},
			},
		} satisfies ToolDefinition<
			z.output<typeof resolveCompareOffersContextInputSchema>,
			JsonValue
		>,
		{
			description:
				"Run the allowlisted follow-up cadence script, normalize its JSON output, and persist one bounded tracker-specialist packet for review and resume flows.",
			async execute(input, context) {
				const persisted = await executeAnalyzeFollowUpCadence(input, context);

				return {
					output: {
						message: persisted.packet.message,
						packet: persisted.packet,
						status: persisted.status,
					},
					warnings: toToolWarnings(persisted.packet.warnings),
				};
			},
			inputSchema: analyzeFollowUpCadenceInputSchema,
			name: "analyze-follow-up-cadence",
			policy: {
				permissions: {
					mutationTargets: ["app-state"],
					scripts: ["followup-cadence"],
				},
			},
		} satisfies ToolDefinition<
			z.output<typeof analyzeFollowUpCadenceInputSchema>,
			JsonValue
		>,
		{
			description:
				"Run the allowlisted rejection-pattern analysis script, normalize its JSON output, and persist one bounded tracker-specialist packet for review and resume flows.",
			async execute(input, context) {
				const persisted = await executeAnalyzeRejectionPatterns(input, context);

				return {
					output: {
						message: persisted.packet.message,
						packet: persisted.packet,
						status: persisted.status,
					},
					warnings: toToolWarnings(persisted.packet.warnings),
				};
			},
			inputSchema: analyzeRejectionPatternsInputSchema,
			name: "analyze-rejection-patterns",
			policy: {
				permissions: {
					mutationTargets: ["app-state"],
					scripts: ["analyze-patterns"],
				},
			},
		} satisfies ToolDefinition<
			z.output<typeof analyzeRejectionPatternsInputSchema>,
			JsonValue
		>,
	];
}

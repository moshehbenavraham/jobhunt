import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { z } from "zod";
import {
	normalizeRepoRelativePath,
	type RepoPathOptions,
	resolveRepoRelativePath,
} from "../config/repo-paths.js";
import { getWorkflowModeRoute } from "../prompt/index.js";
import {
	type ApplicationHelpContextMatchState,
	type ApplicationHelpCoverLetterState,
	type ApplicationHelpDraftItem,
	type ApplicationHelpMatchedReportContext,
	applicationHelpContextMatchStateValues,
	applicationHelpCoverLetterStateValues,
} from "../server/application-help-contract.js";
import {
	type ReportViewerLegitimacy,
	reportViewerLegitimacyValues,
} from "../server/report-viewer-contract.js";
import {
	type DeepCompanyResearchPacket,
	type InterviewPrepPacket,
	type LinkedinOutreachPacket,
	type ProjectReviewPacket,
	projectReviewVerdictValues,
	type ResearchSpecialistContextSummary,
	type ResearchSpecialistExistingPacketSummary,
	type ResearchSpecialistMode,
	type ResearchSpecialistPacket,
	type ResearchSpecialistResolvedContext,
	type ResearchSpecialistResultStatus,
	type ResearchSpecialistStoryBankSummary,
	type ResearchSpecialistWarningCode,
	type ResearchSpecialistWarningItem,
	type ResearchSpecialistWorkflowDescriptor,
	researchSpecialistModeValues,
	researchSpecialistOutreachTargetTypeValues,
	researchSpecialistResultStatusValues,
	researchSpecialistStoryBankSourceValues,
	researchSpecialistWarningCodeValues,
	type TrainingReviewPacket,
	trainingReviewVerdictValues,
} from "../server/research-specialist-contract.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import { resolveApplicationHelpContextFromHints } from "./application-help-tools.js";
import type { AnyToolDefinition, ToolDefinition } from "./tool-contract.js";
import { ToolExecutionError } from "./tool-errors.js";

const RESEARCH_SPECIALIST_ROOT = ".jobhunt-app/research-specialist";
const SECTION_ITEM_LIMIT = 8;
const SOURCE_LIMIT = 12;
const OUTREACH_TARGET_LIMIT = 4;
const INTERVIEW_ROUND_LIMIT = 8;
const INTERVIEW_CHECKLIST_LIMIT = 10;
const PLAN_ITEM_LIMIT = 12;
const DIMENSION_ITEM_LIMIT = 8;

type ResearchSpecialistContextHints = {
	artifactName: string | null;
	company: string | null;
	mode: ResearchSpecialistMode;
	pdfPath: string | null;
	reportNumber: string | null;
	reportPath: string | null;
	role: string | null;
	sessionId: string | null;
	subject: string | null;
};

type ResearchSpecialistPacketWithPath = ResearchSpecialistPacket & {
	repoRelativePath: string;
};

const applicationHelpDraftItemSchema = z.object({
	answer: z.string().trim().min(1),
	question: z.string().trim().min(1),
});

const applicationHelpMatchedReportContextSchema = z.object({
	company: z.string().trim().min(1).nullable(),
	coverLetter: z.object({
		message: z.string().trim().min(1),
		state: z.enum(applicationHelpCoverLetterStateValues),
	}),
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

const researchSpecialistWarningSchema = z.object({
	code: z.enum(researchSpecialistWarningCodeValues),
	message: z.string().trim().min(1),
});

const researchSpecialistStoryBankSummarySchema = z.object({
	exists: z.boolean(),
	repoRelativePath: z.string().trim().min(1).nullable(),
	source: z.enum(researchSpecialistStoryBankSourceValues),
});

const researchSpecialistContextSchema = z.object({
	artifactName: z.string().trim().min(1).nullable(),
	company: z.string().trim().min(1).nullable(),
	mode: z.enum(researchSpecialistModeValues),
	modeDescription: z.string().trim().min(1),
	modeRepoRelativePath: z.string().trim().min(1),
	reportContext: applicationHelpMatchedReportContextSchema.nullable(),
	role: z.string().trim().min(1).nullable(),
	storyBank: researchSpecialistStoryBankSummarySchema.nullable(),
	subject: z.string().trim().min(1).nullable(),
});

const researchSpecialistOutreachTargetSchema = z.object({
	name: z.string().trim().min(1).nullable(),
	profileUrl: z.string().url().nullable().default(null),
	title: z.string().trim().min(1).nullable(),
	type: z.enum(researchSpecialistOutreachTargetTypeValues),
});

const researchSpecialistSourceItemSchema = z.object({
	label: z.string().trim().min(1),
	note: z.string().trim().min(1),
	url: z.string().url().nullable().default(null),
});

const researchSpecialistDimensionScoreSchema = z.object({
	dimension: z.string().trim().min(1),
	rationale: z.string().trim().min(1),
	score: z.number().int().min(1).max(5),
});

const researchSpecialistPlanItemSchema = z.object({
	deliverable: z.string().trim().min(1),
	label: z.string().trim().min(1),
});

const researchSpecialistInterviewRoundSchema = z.object({
	conductedBy: z.string().trim().min(1).nullable().default(null),
	duration: z.string().trim().min(1).nullable().default(null),
	evaluates: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
	name: z.string().trim().min(1),
	preparation: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
	questions: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
});

const researchSpecialistPacketBaseInputSchema = z.object({
	context: researchSpecialistContextSchema,
	message: z.string().trim().min(1),
	resultStatus: z.enum(researchSpecialistResultStatusValues),
	sessionId: z
		.string()
		.trim()
		.min(1)
		.regex(/^[A-Za-z0-9._:-]+$/),
	warnings: z.array(researchSpecialistWarningSchema).default([]),
});

const deepCompanyResearchPacketInputSchema =
	researchSpecialistPacketBaseInputSchema.extend({
		mode: z.literal("deep-company-research"),
		sections: z.object({
			aiStrategy: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
			candidateAngle: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
			competitors: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
			engineeringCulture: z
				.array(z.string().trim().min(1))
				.max(SECTION_ITEM_LIMIT),
			likelyChallenges: z
				.array(z.string().trim().min(1))
				.max(SECTION_ITEM_LIMIT),
			recentMoves: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
		}),
		sources: z.array(researchSpecialistSourceItemSchema).max(SOURCE_LIMIT),
	});

const linkedinOutreachPacketInputSchema =
	researchSpecialistPacketBaseInputSchema.extend({
		alternativeTargets: z
			.array(researchSpecialistOutreachTargetSchema)
			.max(OUTREACH_TARGET_LIMIT),
		characterCount: z.number().int().min(0).max(600),
		language: z.string().trim().min(1),
		messageDraft: z.string().trim().min(1).max(1_500),
		mode: z.literal("linkedin-outreach"),
		primaryTarget: researchSpecialistOutreachTargetSchema,
	});

const interviewPrepPacketInputSchema =
	researchSpecialistPacketBaseInputSchema.extend({
		mode: z.literal("interview-prep"),
		outputRepoRelativePath: z.string().trim().min(1).nullable().default(null),
		processOverview: z.object({
			difficulty: z.string().trim().min(1).nullable().default(null),
			format: z.string().trim().min(1).nullable().default(null),
			knownQuirks: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
			positiveExperienceRate: z.string().trim().min(1).nullable().default(null),
			rounds: z.string().trim().min(1).nullable().default(null),
			sources: z.array(z.string().trim().min(1)).max(SOURCE_LIMIT),
		}),
		rounds: z
			.array(researchSpecialistInterviewRoundSchema)
			.max(INTERVIEW_ROUND_LIMIT),
		storyBankGaps: z.array(z.string().trim().min(1)).max(SECTION_ITEM_LIMIT),
		technicalChecklist: z
			.array(
				z.object({
					reason: z.string().trim().min(1),
					topic: z.string().trim().min(1),
				}),
			)
			.max(INTERVIEW_CHECKLIST_LIMIT),
	});

const trainingReviewPacketInputSchema =
	researchSpecialistPacketBaseInputSchema.extend({
		betterAlternative: z.string().trim().min(1).nullable().default(null),
		dimensions: z
			.array(researchSpecialistDimensionScoreSchema)
			.min(1)
			.max(DIMENSION_ITEM_LIMIT),
		mode: z.literal("training-review"),
		plan: z.array(researchSpecialistPlanItemSchema).max(PLAN_ITEM_LIMIT),
		trainingTitle: z.string().trim().min(1),
		verdict: z.enum(trainingReviewVerdictValues),
	});

const projectReviewPacketInputSchema =
	researchSpecialistPacketBaseInputSchema.extend({
		betterAlternative: z.string().trim().min(1).nullable().default(null),
		dimensions: z
			.array(researchSpecialistDimensionScoreSchema)
			.min(1)
			.max(DIMENSION_ITEM_LIMIT),
		milestones: z.array(researchSpecialistPlanItemSchema).max(PLAN_ITEM_LIMIT),
		mode: z.literal("project-review"),
		projectTitle: z.string().trim().min(1),
		verdict: z.enum(projectReviewVerdictValues),
	});

const researchSpecialistPacketInputSchema = z.discriminatedUnion("mode", [
	deepCompanyResearchPacketInputSchema,
	interviewPrepPacketInputSchema,
	linkedinOutreachPacketInputSchema,
	projectReviewPacketInputSchema,
	trainingReviewPacketInputSchema,
]);

const storedResearchSpecialistPacketSchema = z.discriminatedUnion("mode", [
	deepCompanyResearchPacketInputSchema.extend({
		createdAt: z.string().datetime(),
		fingerprint: z.string().trim().min(1),
		generatedAt: z.string().datetime(),
		packetId: z.string().trim().min(1),
		revision: z.number().int().positive(),
		updatedAt: z.string().datetime(),
	}),
	interviewPrepPacketInputSchema.extend({
		createdAt: z.string().datetime(),
		fingerprint: z.string().trim().min(1),
		generatedAt: z.string().datetime(),
		packetId: z.string().trim().min(1),
		revision: z.number().int().positive(),
		updatedAt: z.string().datetime(),
	}),
	linkedinOutreachPacketInputSchema.extend({
		createdAt: z.string().datetime(),
		fingerprint: z.string().trim().min(1),
		generatedAt: z.string().datetime(),
		packetId: z.string().trim().min(1),
		revision: z.number().int().positive(),
		updatedAt: z.string().datetime(),
	}),
	projectReviewPacketInputSchema.extend({
		createdAt: z.string().datetime(),
		fingerprint: z.string().trim().min(1),
		generatedAt: z.string().datetime(),
		packetId: z.string().trim().min(1),
		revision: z.number().int().positive(),
		updatedAt: z.string().datetime(),
	}),
	trainingReviewPacketInputSchema.extend({
		createdAt: z.string().datetime(),
		fingerprint: z.string().trim().min(1),
		generatedAt: z.string().datetime(),
		packetId: z.string().trim().min(1),
		revision: z.number().int().positive(),
		updatedAt: z.string().datetime(),
	}),
]);

const resolveResearchSpecialistContextInputSchema = z.object({
	artifactName: z.string().trim().min(1).nullable().default(null),
	company: z.string().trim().min(1).nullable().default(null),
	mode: z.enum(researchSpecialistModeValues),
	pdfPath: z.string().trim().min(1).nullable().default(null),
	reportNumber: z
		.string()
		.regex(/^\d{3}$/)
		.nullable()
		.default(null),
	reportPath: z.string().trim().min(1).nullable().default(null),
	role: z.string().trim().min(1).nullable().default(null),
	sessionId: z
		.string()
		.trim()
		.min(1)
		.regex(/^[A-Za-z0-9._:-]+$/)
		.nullable()
		.default(null),
	subject: z.string().trim().min(1).nullable().default(null),
});

const loadResearchSpecialistPacketInputSchema = z.object({
	mode: z.enum(researchSpecialistModeValues),
	sessionId: z
		.string()
		.trim()
		.min(1)
		.regex(/^[A-Za-z0-9._:-]+$/),
});

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return typeof error === "object" && error !== null && "code" in error;
}

function normalizeText(value: string | null): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

function cloneDraftItems(
	items: ApplicationHelpDraftItem[],
): ApplicationHelpDraftItem[] {
	return items.map((item) => ({
		answer: item.answer,
		question: item.question,
	}));
}

function cloneMatchedReportContext(
	value: ApplicationHelpMatchedReportContext | null,
): ApplicationHelpMatchedReportContext | null {
	if (!value) {
		return null;
	}

	return {
		...value,
		coverLetter: {
			...value.coverLetter,
		},
		existingDraft: {
			...value.existingDraft,
			items: cloneDraftItems(value.existingDraft.items),
		},
		matchReasons: [...value.matchReasons],
		pdf: {
			...value.pdf,
		},
	};
}

function cloneStoryBankSummary(
	value: ResearchSpecialistStoryBankSummary | null,
): ResearchSpecialistStoryBankSummary | null {
	return value
		? {
				exists: value.exists,
				repoRelativePath: value.repoRelativePath,
				source: value.source,
			}
		: null;
}

function cloneContextSummary(
	value: ResearchSpecialistContextSummary,
): ResearchSpecialistContextSummary {
	return {
		artifactName: value.artifactName,
		company: value.company,
		mode: value.mode,
		modeDescription: value.modeDescription,
		modeRepoRelativePath: value.modeRepoRelativePath,
		reportContext: cloneMatchedReportContext(value.reportContext),
		role: value.role,
		storyBank: cloneStoryBankSummary(value.storyBank),
		subject: value.subject,
	};
}

function cloneWarning(
	value: ResearchSpecialistWarningItem,
): ResearchSpecialistWarningItem {
	return {
		code: value.code,
		message: value.message,
	};
}

function cloneWarnings(
	items: readonly ResearchSpecialistWarningItem[],
): ResearchSpecialistWarningItem[] {
	return items.map(cloneWarning);
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
		const normalizedPath = normalizeRepoRelativePath(input.candidate);

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

function getResearchSpecialistSessionDirectory(sessionId: string): string {
	return `${RESEARCH_SPECIALIST_ROOT}/${sessionId}`;
}

function comparePackets(
	left: ResearchSpecialistPacketWithPath,
	right: ResearchSpecialistPacketWithPath,
): number {
	if (left.createdAt !== right.createdAt) {
		return right.createdAt.localeCompare(left.createdAt);
	}

	if (left.revision !== right.revision) {
		return right.revision - left.revision;
	}

	return left.packetId.localeCompare(right.packetId);
}

function toExistingPacketSummary(
	packet: ResearchSpecialistPacketWithPath,
): ResearchSpecialistExistingPacketSummary {
	return {
		createdAt: packet.createdAt,
		generatedAt: packet.generatedAt,
		packetId: packet.packetId,
		repoRelativePath: packet.repoRelativePath,
		resultStatus: packet.resultStatus,
		revision: packet.revision,
		sessionId: packet.sessionId,
		updatedAt: packet.updatedAt,
	};
}

function clonePacketWithPath(
	packet: ResearchSpecialistPacketWithPath,
): ResearchSpecialistPacketWithPath {
	switch (packet.mode) {
		case "deep-company-research":
			return {
				...packet,
				context: cloneContextSummary(packet.context),
				sections: {
					aiStrategy: [...packet.sections.aiStrategy],
					candidateAngle: [...packet.sections.candidateAngle],
					competitors: [...packet.sections.competitors],
					engineeringCulture: [...packet.sections.engineeringCulture],
					likelyChallenges: [...packet.sections.likelyChallenges],
					recentMoves: [...packet.sections.recentMoves],
				},
				sources: packet.sources.map((source) => ({ ...source })),
				warnings: cloneWarnings(packet.warnings),
			};
		case "linkedin-outreach":
			return {
				...packet,
				alternativeTargets: packet.alternativeTargets.map((target) => ({
					...target,
				})),
				context: cloneContextSummary(packet.context),
				primaryTarget: {
					...packet.primaryTarget,
				},
				warnings: cloneWarnings(packet.warnings),
			};
		case "interview-prep":
			return {
				...packet,
				context: cloneContextSummary(packet.context),
				processOverview: {
					...packet.processOverview,
					knownQuirks: [...packet.processOverview.knownQuirks],
					sources: [...packet.processOverview.sources],
				},
				rounds: packet.rounds.map((round) => ({
					...round,
					evaluates: [...round.evaluates],
					preparation: [...round.preparation],
					questions: [...round.questions],
				})),
				storyBankGaps: [...packet.storyBankGaps],
				technicalChecklist: packet.technicalChecklist.map((item) => ({
					...item,
				})),
				warnings: cloneWarnings(packet.warnings),
			};
		case "training-review":
			return {
				...packet,
				context: cloneContextSummary(packet.context),
				dimensions: packet.dimensions.map((dimension) => ({
					...dimension,
				})),
				plan: packet.plan.map((item) => ({
					...item,
				})),
				warnings: cloneWarnings(packet.warnings),
			};
		case "project-review":
			return {
				...packet,
				context: cloneContextSummary(packet.context),
				dimensions: packet.dimensions.map((dimension) => ({
					...dimension,
				})),
				milestones: packet.milestones.map((item) => ({
					...item,
				})),
				warnings: cloneWarnings(packet.warnings),
			};
	}
}

function stripRepoPath(
	packet: ResearchSpecialistPacketWithPath,
): ResearchSpecialistPacket {
	const cloned = clonePacketWithPath(packet);
	const { repoRelativePath: _repoRelativePath, ...withoutPath } = cloned;
	return withoutPath;
}

function buildPacketFingerprint(
	input: z.output<typeof researchSpecialistPacketInputSchema>,
): string {
	return createHash("sha1")
		.update(
			JSON.stringify({
				...input,
				context: cloneContextSummary(input.context),
				warnings: cloneWarnings(input.warnings),
			}),
		)
		.digest("hex");
}

async function listPacketsForSession(
	sessionId: string,
	options: RepoPathOptions = {},
): Promise<ResearchSpecialistPacketWithPath[]> {
	const packetDirectory = resolveRepoRelativePath(
		getResearchSpecialistSessionDirectory(sessionId),
		options,
	);
	let entries: string[];

	try {
		entries = await readdir(packetDirectory);
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
				const repoRelativePath = `${getResearchSpecialistSessionDirectory(sessionId)}/${entry}`;

				try {
					const parsed = storedResearchSpecialistPacketSchema.parse(
						JSON.parse(
							await readFile(
								resolveRepoRelativePath(repoRelativePath, options),
								"utf8",
							),
						),
					);

					return {
						...parsed,
						context: cloneContextSummary(parsed.context),
						repoRelativePath,
						warnings: cloneWarnings(parsed.warnings),
					} satisfies ResearchSpecialistPacketWithPath;
				} catch {
					return null;
				}
			}),
	);

	return packets
		.filter(
			(packet): packet is ResearchSpecialistPacketWithPath => packet !== null,
		)
		.sort(comparePackets);
}

async function loadLatestPacketRecord(
	input: {
		mode: ResearchSpecialistMode;
		sessionId: string;
	},
	options: RepoPathOptions = {},
): Promise<ResearchSpecialistPacketWithPath | null> {
	const packets = await listPacketsForSession(input.sessionId, options);

	return packets.find((packet) => packet.mode === input.mode) ?? null;
}

export async function loadResearchSpecialistPacket(
	input: {
		mode: ResearchSpecialistMode;
		sessionId: string;
	},
	options: RepoPathOptions = {},
): Promise<ResearchSpecialistPacket | null> {
	const packet = await loadLatestPacketRecord(input, options);
	return packet ? stripRepoPath(packet) : null;
}

function createWarning(
	code: ResearchSpecialistWarningCode,
	message: string,
): ResearchSpecialistWarningItem {
	return {
		code,
		message,
	};
}

function dedupeWarnings(
	warnings: readonly ResearchSpecialistWarningItem[],
): ResearchSpecialistWarningItem[] {
	const seen = new Set<string>();
	const deduped: ResearchSpecialistWarningItem[] = [];

	for (const warning of warnings) {
		const key = `${warning.code}:${warning.message}`;

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		deduped.push(cloneWarning(warning));
	}

	return deduped;
}

function mapReportWarningCode(
	code: string,
): ResearchSpecialistWarningCode | null {
	switch (code) {
		case "ambiguous-report-match":
			return "ambiguous-report-match";
		case "missing-context":
			return "missing-context";
		case "missing-pdf-artifact":
			return "missing-pdf-artifact";
		default:
			return null;
	}
}

function getWorkflowDescriptor(
	mode: ResearchSpecialistMode,
): ResearchSpecialistWorkflowDescriptor {
	const route = getWorkflowModeRoute(mode);

	return {
		detailPath: "/research-specialist",
		label:
			mode === "deep-company-research"
				? "Deep Research"
				: mode === "linkedin-outreach"
					? "LinkedIn Outreach"
					: mode === "interview-prep"
						? "Interview Prep"
						: mode === "training-review"
							? "Training Review"
							: "Project Review",
		message: route.description,
		mode,
		selected: false,
	};
}

function resolveStoryBankSummary(
	mode: ResearchSpecialistMode,
	options: RepoPathOptions = {},
): ResearchSpecialistStoryBankSummary | null {
	if (mode !== "interview-prep") {
		return null;
	}

	const primaryPath = "interview-prep/story-bank.md";

	if (existsSync(resolveRepoRelativePath(primaryPath, options))) {
		return {
			exists: true,
			repoRelativePath: primaryPath,
			source: "story-bank",
		};
	}

	const examplePath = "interview-prep/story-bank.example.md";

	if (existsSync(resolveRepoRelativePath(examplePath, options))) {
		return {
			exists: true,
			repoRelativePath: examplePath,
			source: "story-bank-example",
		};
	}

	return {
		exists: false,
		repoRelativePath: null,
		source: "missing",
	};
}

function hasDirectReportHints(input: ResearchSpecialistContextHints): boolean {
	return [
		input.artifactName,
		input.company,
		input.pdfPath,
		input.reportNumber,
		input.reportPath,
		input.role,
	].some((value) => value !== null);
}

function hasRequiredContext(
	mode: ResearchSpecialistMode,
	context: ResearchSpecialistContextSummary,
): boolean {
	switch (mode) {
		case "deep-company-research":
		case "linkedin-outreach":
		case "interview-prep":
			return (
				context.reportContext !== null ||
				context.company !== null ||
				context.role !== null
			);
		case "training-review":
		case "project-review":
			return (
				context.subject !== null ||
				context.reportContext !== null ||
				context.company !== null ||
				context.role !== null
			);
	}
}

function buildMissingInputMessage(mode: ResearchSpecialistMode): string {
	switch (mode) {
		case "deep-company-research":
			return "Provide a company, role, or saved report hint before deep research can stage a bounded packet.";
		case "linkedin-outreach":
			return "Provide a company, role, contact, or saved report hint before LinkedIn outreach can stage a bounded draft.";
		case "interview-prep":
			return "Provide a company, role, or saved report hint before interview prep can build a bounded prep packet.";
		case "training-review":
			return "Provide a training topic, certification, or related report context before training review can continue.";
		case "project-review":
			return "Provide a project idea or related report context before project review can continue.";
	}
}

export async function resolveResearchSpecialistContextFromHints(
	input: ResearchSpecialistContextHints,
	options: RepoPathOptions = {},
): Promise<ResearchSpecialistResolvedContext> {
	const normalizedInput: ResearchSpecialistContextHints = {
		artifactName: normalizeText(input.artifactName),
		company: normalizeText(input.company),
		mode: input.mode,
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
		sessionId: normalizeText(input.sessionId),
		subject: normalizeText(input.subject),
	};
	const existingPacket = normalizedInput.sessionId
		? await loadLatestPacketRecord(
				{
					mode: normalizedInput.mode,
					sessionId: normalizedInput.sessionId,
				},
				options,
			)
		: null;
	const warnings: ResearchSpecialistWarningItem[] = [];
	let matchedReportContext: ApplicationHelpMatchedReportContext | null =
		existingPacket?.context.reportContext
			? cloneMatchedReportContext(existingPacket.context.reportContext)
			: null;

	if (hasDirectReportHints(normalizedInput)) {
		const resolvedReportContext = await resolveApplicationHelpContextFromHints(
			{
				artifactName: normalizedInput.artifactName,
				company: normalizedInput.company,
				pdfPath: normalizedInput.pdfPath,
				reportNumber: normalizedInput.reportNumber,
				reportPath: normalizedInput.reportPath,
				role: normalizedInput.role,
			},
			options,
		);

		if (resolvedReportContext.matchedContext) {
			matchedReportContext = cloneMatchedReportContext(
				resolvedReportContext.matchedContext,
			);
		}

		for (const warning of resolvedReportContext.warnings) {
			const code = mapReportWarningCode(warning.code);

			if (code) {
				warnings.push(createWarning(code, warning.message));
			}
		}
	}

	const storyBank =
		existingPacket?.context.storyBank ??
		resolveStoryBankSummary(input.mode, options);
	const descriptor = getWorkflowDescriptor(normalizedInput.mode);
	const context: ResearchSpecialistContextSummary = {
		artifactName:
			normalizedInput.artifactName ??
			existingPacket?.context.artifactName ??
			matchedReportContext?.fileName ??
			null,
		company:
			normalizedInput.company ??
			matchedReportContext?.company ??
			existingPacket?.context.company ??
			null,
		mode: normalizedInput.mode,
		modeDescription: descriptor.message,
		modeRepoRelativePath: getWorkflowModeRoute(normalizedInput.mode)
			.modeRepoRelativePath,
		reportContext: matchedReportContext,
		role:
			normalizedInput.role ??
			matchedReportContext?.role ??
			existingPacket?.context.role ??
			null,
		storyBank: cloneStoryBankSummary(storyBank),
		subject: normalizedInput.subject ?? existingPacket?.context.subject ?? null,
	};

	if (
		normalizedInput.mode === "interview-prep" &&
		context.storyBank?.source !== "story-bank"
	) {
		warnings.push(
			createWarning(
				"story-bank-missing",
				context.storyBank?.source === "story-bank-example"
					? "Interview prep is falling back to interview-prep/story-bank.example.md until a personalized story bank exists."
					: "Interview prep has no checked-in story bank yet. Add interview-prep/story-bank.md for personalized story mapping.",
			),
		);
	}

	const statusMessage = hasRequiredContext(normalizedInput.mode, context)
		? context.reportContext
			? `Resolved research-specialist context from ${context.reportContext.reportRepoRelativePath}.`
			: existingPacket
				? `Resolved research-specialist context from the latest staged ${normalizedInput.mode} packet.`
				: `Resolved research-specialist context for ${normalizedInput.mode}.`
		: buildMissingInputMessage(normalizedInput.mode);

	if (!hasRequiredContext(normalizedInput.mode, context)) {
		warnings.push(createWarning("missing-context", statusMessage));
	}

	return {
		context,
		existingPacket: existingPacket
			? toExistingPacketSummary(existingPacket)
			: null,
		message: statusMessage,
		warnings: dedupeWarnings(warnings),
	};
}

function toToolWarnings(
	warnings: readonly ResearchSpecialistWarningItem[],
): Array<{
	code: ResearchSpecialistWarningCode;
	message: string;
}> {
	return warnings.map((warning) => ({
		code: warning.code,
		message: warning.message,
	}));
}

function clonePacketInput(
	input: z.output<typeof researchSpecialistPacketInputSchema>,
): z.output<typeof researchSpecialistPacketInputSchema> {
	switch (input.mode) {
		case "deep-company-research":
			return {
				...input,
				context: cloneContextSummary(input.context),
				sections: {
					aiStrategy: [...input.sections.aiStrategy],
					candidateAngle: [...input.sections.candidateAngle],
					competitors: [...input.sections.competitors],
					engineeringCulture: [...input.sections.engineeringCulture],
					likelyChallenges: [...input.sections.likelyChallenges],
					recentMoves: [...input.sections.recentMoves],
				},
				sources: input.sources.map((source) => ({ ...source })),
				warnings: cloneWarnings(input.warnings),
			};
		case "linkedin-outreach":
			return {
				...input,
				alternativeTargets: input.alternativeTargets.map((target) => ({
					...target,
				})),
				context: cloneContextSummary(input.context),
				primaryTarget: {
					...input.primaryTarget,
				},
				warnings: cloneWarnings(input.warnings),
			};
		case "interview-prep":
			return {
				...input,
				context: cloneContextSummary(input.context),
				processOverview: {
					...input.processOverview,
					knownQuirks: [...input.processOverview.knownQuirks],
					sources: [...input.processOverview.sources],
				},
				rounds: input.rounds.map((round) => ({
					...round,
					evaluates: [...round.evaluates],
					preparation: [...round.preparation],
					questions: [...round.questions],
				})),
				storyBankGaps: [...input.storyBankGaps],
				technicalChecklist: input.technicalChecklist.map((item) => ({
					...item,
				})),
				warnings: cloneWarnings(input.warnings),
			};
		case "training-review":
			return {
				...input,
				context: cloneContextSummary(input.context),
				dimensions: input.dimensions.map((dimension) => ({
					...dimension,
				})),
				plan: input.plan.map((item) => ({
					...item,
				})),
				warnings: cloneWarnings(input.warnings),
			};
		case "project-review":
			return {
				...input,
				context: cloneContextSummary(input.context),
				dimensions: input.dimensions.map((dimension) => ({
					...dimension,
				})),
				milestones: input.milestones.map((item) => ({
					...item,
				})),
				warnings: cloneWarnings(input.warnings),
			};
	}
}

export function createResearchSpecialistTools(): readonly AnyToolDefinition[] {
	return [
		{
			description:
				"Resolve report-backed and narrative specialist context, including mode metadata, interview story-bank state, and any existing staged packet for the session.",
			async execute(input, context) {
				const resolved = await resolveResearchSpecialistContextFromHints(
					{
						artifactName: input.artifactName,
						company: input.company,
						mode: input.mode,
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
						sessionId: input.sessionId,
						subject: input.subject,
					},
					{
						repoRoot: context.workspace.repoPaths.repoRoot,
					},
				);

				return {
					output: {
						context: resolved.context,
						existingPacket: resolved.existingPacket,
						message: resolved.message,
						status: hasRequiredContext(input.mode, resolved.context)
							? "resolved"
							: "missing-input",
					},
					warnings: toToolWarnings(resolved.warnings),
				};
			},
			inputSchema: resolveResearchSpecialistContextInputSchema,
			name: "resolve-research-specialist-context",
		} satisfies ToolDefinition<
			z.output<typeof resolveResearchSpecialistContextInputSchema>,
			JsonValue
		>,
		{
			description:
				"Persist one normalized research-specialist packet under app-owned state so browser review does not depend on raw prompt transcripts.",
			async execute(input, context) {
				const existingPackets = await listPacketsForSession(input.sessionId, {
					repoRoot: context.workspace.repoPaths.repoRoot,
				});
				const mixedModePacket = existingPackets.find(
					(packet) => packet.mode !== input.mode,
				);

				if (mixedModePacket) {
					throw new ToolExecutionError(
						"tool-invalid-input",
						`Session ${input.sessionId} already contains ${mixedModePacket.mode} packets and cannot stage ${input.mode}.`,
						{
							detail: {
								existingMode: mixedModePacket.mode,
								sessionId: input.sessionId,
							},
						},
					);
				}

				const latestPacket = existingPackets[0] ?? null;
				const normalizedInput = clonePacketInput(input);
				const fingerprint = buildPacketFingerprint(normalizedInput);

				if (latestPacket && latestPacket.fingerprint === fingerprint) {
					return {
						output: {
							message:
								"Research-specialist packet already matches the latest persisted revision.",
							packet: stripRepoPath(latestPacket),
							repoRelativePath: latestPacket.repoRelativePath,
							status: "already-staged",
						},
					};
				}

				const createdAt = new Date(context.now()).toISOString();
				const revision = (latestPacket?.revision ?? 0) + 1;
				const packetId = `${createdAt.replace(/[:.]/g, "-")}-${String(revision).padStart(2, "0")}-${fingerprint.slice(0, 8)}`;
				const repoRelativePath = `${getResearchSpecialistSessionDirectory(input.sessionId)}/${packetId}.json`;
				const storedPacket = {
					...normalizedInput,
					createdAt,
					fingerprint,
					generatedAt: createdAt,
					packetId,
					revision,
					updatedAt: createdAt,
				} satisfies z.output<typeof storedResearchSpecialistPacketSchema>;

				await context.mutateWorkspace({
					content: storedPacket,
					repoRelativePath,
					target: "app-state",
				});

				return {
					output: {
						message:
							"Research-specialist packet was persisted in app-owned state for dedicated detail review.",
						packet: stripRepoPath({
							...storedPacket,
							repoRelativePath,
						}),
						repoRelativePath,
						status: "staged",
					},
				};
			},
			inputSchema: researchSpecialistPacketInputSchema,
			name: "stage-research-specialist-packet",
			policy: {
				permissions: {
					mutationTargets: ["app-state"],
				},
			},
		} satisfies ToolDefinition<
			z.output<typeof researchSpecialistPacketInputSchema>,
			JsonValue
		>,
		{
			description:
				"Load the latest normalized research-specialist packet for a session without exposing raw prompt transcripts.",
			async execute(input, context) {
				const latestPacket = await loadLatestPacketRecord(
					{
						mode: input.mode,
						sessionId: input.sessionId,
					},
					{
						repoRoot: context.workspace.repoPaths.repoRoot,
					},
				);

				return {
					output: {
						message: latestPacket
							? `Loaded the latest ${input.mode} research-specialist packet for ${input.sessionId}.`
							: `No ${input.mode} research-specialist packet has been staged for ${input.sessionId} yet.`,
						packet: latestPacket ? stripRepoPath(latestPacket) : null,
						repoRelativePath: latestPacket?.repoRelativePath ?? null,
						status: latestPacket ? "loaded" : "missing-packet",
					},
					warnings: latestPacket
						? []
						: [
								{
									code: "missing-packet",
									message:
										"No research-specialist packet has been staged for this session yet.",
								},
							],
				};
			},
			inputSchema: loadResearchSpecialistPacketInputSchema,
			name: "load-research-specialist-packet",
		} satisfies ToolDefinition<
			z.output<typeof loadResearchSpecialistPacketInputSchema>,
			JsonValue
		>,
	];
}

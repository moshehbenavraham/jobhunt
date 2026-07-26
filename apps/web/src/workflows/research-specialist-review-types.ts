import type { ApplicationHelpMatchedReportContext } from "../application-help/application-help-types";
import type { StartupStatus } from "../boot/startup-types";
import {
	REPORT_VIEWER_LEGITIMACY_VALUES,
	type ReportViewerLegitimacy,
} from "../reports/report-viewer-types";

export const RESEARCH_SPECIALIST_MODE_VALUES = [
	"deep-company-research",
	"linkedin-outreach",
	"interview-prep",
	"training-review",
	"project-review",
] as const;

export type ResearchSpecialistMode =
	(typeof RESEARCH_SPECIALIST_MODE_VALUES)[number];

export const RESEARCH_SPECIALIST_SELECTION_ORIGIN_VALUES = [
	"catalog",
	"latest-session",
	"mode",
	"none",
	"session-id",
] as const;

export type ResearchSpecialistSelectionOrigin =
	(typeof RESEARCH_SPECIALIST_SELECTION_ORIGIN_VALUES)[number];

export const RESEARCH_SPECIALIST_SELECTION_STATE_VALUES = [
	"empty",
	"missing",
	"ready",
] as const;

export type ResearchSpecialistSelectionState =
	(typeof RESEARCH_SPECIALIST_SELECTION_STATE_VALUES)[number];

export const RESEARCH_SPECIALIST_RUN_STATE_VALUES = [
	"completed",
	"degraded",
	"idle",
	"running",
	"waiting",
] as const;

export type ResearchSpecialistRunState =
	(typeof RESEARCH_SPECIALIST_RUN_STATE_VALUES)[number];

export const RESEARCH_SPECIALIST_REVIEW_STATE_VALUES = [
	"approval-paused",
	"completed",
	"degraded",
	"missing-input",
	"no-packet-yet",
	"rejected",
	"resumed",
	"running",
	"waiting",
] as const;

export type ResearchSpecialistReviewState =
	(typeof RESEARCH_SPECIALIST_REVIEW_STATE_VALUES)[number];

export const RESEARCH_SPECIALIST_RESULT_STATUS_VALUES = [
	"degraded",
	"missing-input",
	"ready",
] as const;

export type ResearchSpecialistResultStatus =
	(typeof RESEARCH_SPECIALIST_RESULT_STATUS_VALUES)[number];

export const RESEARCH_SPECIALIST_WARNING_CODE_VALUES = [
	"ambiguous-report-match",
	"approval-paused",
	"degraded-packet",
	"manual-send-required",
	"missing-context",
	"missing-packet",
	"missing-pdf-artifact",
	"recent-failure",
	"rejected",
	"resumable-session",
	"stale-selection",
	"story-bank-missing",
] as const;

export type ResearchSpecialistWarningCode =
	(typeof RESEARCH_SPECIALIST_WARNING_CODE_VALUES)[number];

export const RESEARCH_SPECIALIST_NEXT_ACTION_VALUES = [
	"launch-workflow",
	"resolve-approval",
	"resume-session",
	"review-packet",
	"stage-packet",
	"wait",
] as const;

export type ResearchSpecialistNextAction =
	(typeof RESEARCH_SPECIALIST_NEXT_ACTION_VALUES)[number];

export const RESEARCH_SPECIALIST_STORY_BANK_SOURCE_VALUES = [
	"missing",
	"story-bank",
	"story-bank-example",
] as const;

export type ResearchSpecialistStoryBankSource =
	(typeof RESEARCH_SPECIALIST_STORY_BANK_SOURCE_VALUES)[number];

export const RESEARCH_SPECIALIST_OUTREACH_TARGET_TYPE_VALUES = [
	"hiring-manager",
	"interviewer",
	"peer",
	"recruiter",
	"unknown",
] as const;

export type ResearchSpecialistOutreachTargetType =
	(typeof RESEARCH_SPECIALIST_OUTREACH_TARGET_TYPE_VALUES)[number];

export const TRAINING_REVIEW_VERDICT_VALUES = [
	"do-it",
	"do-not-do-it",
	"timebox",
] as const;

export type TrainingReviewVerdict =
	(typeof TRAINING_REVIEW_VERDICT_VALUES)[number];

export const PROJECT_REVIEW_VERDICT_VALUES = [
	"build",
	"pivot",
	"skip",
] as const;

export type ProjectReviewVerdict =
	(typeof PROJECT_REVIEW_VERDICT_VALUES)[number];

export const RESEARCH_SPECIALIST_RUNTIME_SESSION_STATUS_VALUES = [
	"cancelled",
	"completed",
	"failed",
	"pending",
	"running",
	"waiting",
] as const;

export type ResearchSpecialistRuntimeSessionStatus =
	(typeof RESEARCH_SPECIALIST_RUNTIME_SESSION_STATUS_VALUES)[number];

export const RESEARCH_SPECIALIST_RUNTIME_JOB_STATUS_VALUES = [
	"cancelled",
	"completed",
	"failed",
	"pending",
	"queued",
	"running",
	"waiting",
] as const;

export type ResearchSpecialistRuntimeJobStatus =
	(typeof RESEARCH_SPECIALIST_RUNTIME_JOB_STATUS_VALUES)[number];

export const RESEARCH_SPECIALIST_RUNTIME_JOB_WAIT_REASON_VALUES = [
	"approval",
	"retry",
] as const;

export type ResearchSpecialistRuntimeJobWaitReason =
	(typeof RESEARCH_SPECIALIST_RUNTIME_JOB_WAIT_REASON_VALUES)[number];

export const RESEARCH_SPECIALIST_RUNTIME_APPROVAL_STATUS_VALUES = [
	"approved",
	"pending",
	"rejected",
] as const;

export type ResearchSpecialistRuntimeApprovalStatus =
	(typeof RESEARCH_SPECIALIST_RUNTIME_APPROVAL_STATUS_VALUES)[number];

export type ResearchSpecialistWorkflowDescriptor = {
	detailPath: string;
	label: string;
	message: string;
	mode: ResearchSpecialistMode;
	selected: boolean;
};

export type ResearchSpecialistWarningItem = {
	code: ResearchSpecialistWarningCode;
	message: string;
};

export type ResearchSpecialistStoryBankSummary = {
	exists: boolean;
	repoRelativePath: string | null;
	source: ResearchSpecialistStoryBankSource;
};

export type ResearchSpecialistContextSummary = {
	artifactName: string | null;
	company: string | null;
	mode: ResearchSpecialistMode;
	modeDescription: string;
	modeRepoRelativePath: string;
	reportContext: ApplicationHelpMatchedReportContext | null;
	role: string | null;
	storyBank: ResearchSpecialistStoryBankSummary | null;
	subject: string | null;
};

export type ResearchSpecialistSourceItem = {
	label: string;
	note: string;
	url: string | null;
};

export type ResearchSpecialistOutreachTarget = {
	name: string | null;
	profileUrl: string | null;
	title: string | null;
	type: ResearchSpecialistOutreachTargetType;
};

export type ResearchSpecialistInterviewRound = {
	conductedBy: string | null;
	duration: string | null;
	evaluates: string[];
	name: string;
	preparation: string[];
	questions: string[];
};

export type ResearchSpecialistDimensionScore = {
	dimension: string;
	rationale: string;
	score: number;
};

export type ResearchSpecialistPlanItem = {
	deliverable: string;
	label: string;
};

type ResearchSpecialistPacketBase = {
	context: ResearchSpecialistContextSummary;
	createdAt: string;
	fingerprint: string;
	generatedAt: string;
	message: string;
	mode: ResearchSpecialistMode;
	packetId: string;
	resultStatus: ResearchSpecialistResultStatus;
	revision: number;
	sessionId: string;
	updatedAt: string;
	warnings: ResearchSpecialistWarningItem[];
};

export type DeepCompanyResearchPacket = ResearchSpecialistPacketBase & {
	mode: "deep-company-research";
	sections: {
		aiStrategy: string[];
		candidateAngle: string[];
		competitors: string[];
		engineeringCulture: string[];
		likelyChallenges: string[];
		recentMoves: string[];
	};
	sources: ResearchSpecialistSourceItem[];
};

export type LinkedinOutreachPacket = ResearchSpecialistPacketBase & {
	alternativeTargets: ResearchSpecialistOutreachTarget[];
	characterCount: number;
	language: string;
	messageDraft: string;
	mode: "linkedin-outreach";
	primaryTarget: ResearchSpecialistOutreachTarget;
};

export type InterviewPrepPacket = ResearchSpecialistPacketBase & {
	mode: "interview-prep";
	outputRepoRelativePath: string | null;
	processOverview: {
		difficulty: string | null;
		format: string | null;
		knownQuirks: string[];
		positiveExperienceRate: string | null;
		rounds: string | null;
		sources: string[];
	};
	rounds: ResearchSpecialistInterviewRound[];
	storyBankGaps: string[];
	technicalChecklist: Array<{
		reason: string;
		topic: string;
	}>;
};

export type TrainingReviewPacket = ResearchSpecialistPacketBase & {
	betterAlternative: string | null;
	dimensions: ResearchSpecialistDimensionScore[];
	mode: "training-review";
	plan: ResearchSpecialistPlanItem[];
	trainingTitle: string;
	verdict: TrainingReviewVerdict;
};

export type ProjectReviewPacket = ResearchSpecialistPacketBase & {
	betterAlternative: string | null;
	dimensions: ResearchSpecialistDimensionScore[];
	milestones: ResearchSpecialistPlanItem[];
	mode: "project-review";
	projectTitle: string;
	verdict: ProjectReviewVerdict;
};

export type ResearchSpecialistPacket =
	| DeepCompanyResearchPacket
	| InterviewPrepPacket
	| LinkedinOutreachPacket
	| ProjectReviewPacket
	| TrainingReviewPacket;

export type ResearchSpecialistSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	resumeAllowed: boolean;
	sessionId: string;
	status: ResearchSpecialistRuntimeSessionStatus;
	updatedAt: string;
	workflow: ResearchSpecialistMode;
};

export type ResearchSpecialistJobSummary = {
	attempt: number;
	completedAt: string | null;
	currentRunId: string;
	jobId: string;
	jobType: string;
	startedAt: string | null;
	status: ResearchSpecialistRuntimeJobStatus;
	updatedAt: string;
	waitReason: ResearchSpecialistRuntimeJobWaitReason | null;
};

export type ResearchSpecialistApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: ResearchSpecialistRuntimeApprovalStatus;
	title: string;
	traceId: string | null;
};

export type ResearchSpecialistFailureSummary = {
	failedAt: string;
	jobId: string | null;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type ResearchSpecialistReviewBoundary = {
	automationAllowed: false;
	manualSendRequired: boolean;
	message: string;
	reviewRequired: true;
};

export type ResearchSpecialistRunSummary = {
	message: string;
	resumeAllowed: boolean;
	state: ResearchSpecialistRunState;
};

export type ResearchSpecialistNextActionSummary = {
	action: ResearchSpecialistNextAction;
	message: string;
	resumeAllowed: boolean;
	sessionId: string | null;
};

export type ResearchSpecialistSelectedSummary = {
	approval: ResearchSpecialistApprovalSummary | null;
	context: ResearchSpecialistContextSummary | null;
	failure: ResearchSpecialistFailureSummary | null;
	job: ResearchSpecialistJobSummary | null;
	message: string;
	nextAction: ResearchSpecialistNextActionSummary;
	packet: ResearchSpecialistPacket | null;
	reviewBoundary: ResearchSpecialistReviewBoundary;
	run: ResearchSpecialistRunSummary;
	session: ResearchSpecialistSessionSummary | null;
	state: ResearchSpecialistReviewState;
	warnings: ResearchSpecialistWarningItem[];
	workflow: ResearchSpecialistWorkflowDescriptor;
};

export type ResearchSpecialistSelectedDetail = {
	message: string;
	origin: ResearchSpecialistSelectionOrigin;
	requestedMode: ResearchSpecialistMode | null;
	requestedSessionId: string | null;
	state: ResearchSpecialistSelectionState;
	summary: ResearchSpecialistSelectedSummary | null;
};

export type ResearchSpecialistSummaryPayload = {
	filters: {
		mode: ResearchSpecialistMode | null;
		sessionId: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	selected: ResearchSpecialistSelectedDetail;
	service: string;
	sessionId: string;
	status: StartupStatus;
	workflows: ResearchSpecialistWorkflowDescriptor[];
};

export type ResearchSpecialistErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status:
		| "bad-request"
		| "error"
		| "method-not-allowed"
		| "not-found"
		| "rate-limited";
};

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value as JsonRecord;
}

function readArray<TValue>(
	record: JsonRecord,
	key: string,
	parser: (value: unknown) => TValue,
): TValue[] {
	const value = record[key];

	if (!Array.isArray(value)) {
		throw new Error(`Expected ${key} to be an array.`);
	}

	return value.map((entry) => parser(entry));
}

function readBoolean(record: JsonRecord, key: string): boolean {
	const value = record[key];

	if (typeof value !== "boolean") {
		throw new Error(`Expected ${key} to be a boolean.`);
	}

	return value;
}

function readExactBoolean<TExpected extends boolean>(
	record: JsonRecord,
	key: string,
	expected: TExpected,
): TExpected {
	const value = readBoolean(record, key);

	if (value !== expected) {
		throw new Error(`Expected ${key} to be ${String(expected)}.`);
	}

	return expected;
}

function readNumber(record: JsonRecord, key: string): number {
	const value = record[key];

	if (typeof value !== "number" || Number.isNaN(value)) {
		throw new Error(`Expected ${key} to be a number.`);
	}

	return value;
}

function readString(record: JsonRecord, key: string): string {
	const value = record[key];

	if (typeof value !== "string") {
		throw new Error(`Expected ${key} to be a string.`);
	}

	return value;
}

function readNullableNumber(record: JsonRecord, key: string): number | null {
	const value = record[key];

	if (value === null) {
		return null;
	}

	if (typeof value !== "number" || Number.isNaN(value)) {
		throw new Error(`Expected ${key} to be a number or null.`);
	}

	return value;
}

function readNullableObject<TValue>(
	record: JsonRecord,
	key: string,
	parser: (value: unknown) => TValue,
): TValue | null {
	const value = record[key];
	return value === null ? null : parser(value);
}

function readNullableString(record: JsonRecord, key: string): string | null {
	const value = record[key];

	if (value === null) {
		return null;
	}

	if (typeof value !== "string") {
		throw new Error(`Expected ${key} to be a string or null.`);
	}

	return value;
}

function readStringArray(record: JsonRecord, key: string): string[] {
	const value = record[key];

	if (
		!Array.isArray(value) ||
		value.some((entry) => typeof entry !== "string")
	) {
		throw new Error(`Expected ${key} to be a string array.`);
	}

	return [...value];
}

function readEnum<TValue extends string>(
	record: JsonRecord,
	key: string,
	values: readonly TValue[],
	label: string,
): TValue {
	const value = readString(record, key);

	if (!(values as readonly string[]).includes(value)) {
		throw new Error(`Unsupported ${label}: ${value}`);
	}

	return value as TValue;
}

function readStartupStatus(record: JsonRecord, key: string): StartupStatus {
	return readEnum(
		record,
		key,
		[
			"auth-required",
			"expired-auth",
			"invalid-auth",
			"missing-prerequisites",
			"prompt-failure",
			"ready",
			"runtime-error",
		] as const,
		"research-specialist startup status",
	);
}

function parseLegitimacy(value: unknown): ReportViewerLegitimacy | null {
	if (value === null) {
		return null;
	}

	if (
		typeof value !== "string" ||
		!REPORT_VIEWER_LEGITIMACY_VALUES.includes(value as ReportViewerLegitimacy)
	) {
		throw new Error(`Unsupported research-specialist legitimacy: ${value}`);
	}

	return value as ReportViewerLegitimacy;
}

function parseMatchedReportContext(
	value: unknown,
): ApplicationHelpMatchedReportContext {
	const record = assertRecord(value, "research-specialist matched report");
	const coverLetter = assertRecord(
		record.coverLetter,
		"research-specialist cover letter",
	);
	const existingDraft = assertRecord(
		record.existingDraft,
		"research-specialist existing draft",
	);
	const pdf = assertRecord(record.pdf, "research-specialist matched pdf");

	return {
		company: readNullableString(record, "company"),
		coverLetter: {
			message: readString(coverLetter, "message"),
			state: readEnum(
				coverLetter,
				"state",
				["manual-follow-up", "not-requested"] as const,
				"research-specialist cover letter state",
			),
		},
		existingDraft: {
			itemCount: readNumber(existingDraft, "itemCount"),
			items: readArray(existingDraft, "items", (entry) => {
				const item = assertRecord(
					entry,
					"research-specialist existing draft item",
				);
				return {
					answer: readString(item, "answer"),
					question: readString(item, "question"),
				};
			}),
			sectionPresent: readBoolean(existingDraft, "sectionPresent"),
			sectionText: readNullableString(existingDraft, "sectionText"),
		},
		fileName: readString(record, "fileName"),
		legitimacy: parseLegitimacy(record.legitimacy),
		matchReasons: readStringArray(record, "matchReasons"),
		matchState: readEnum(
			record,
			"matchState",
			["exact", "fuzzy", "missing"] as const,
			"research-specialist report match state",
		),
		pdf: {
			exists: readBoolean(pdf, "exists"),
			repoRelativePath: readNullableString(pdf, "repoRelativePath"),
		},
		reportNumber: readNullableString(record, "reportNumber"),
		reportRepoRelativePath: readString(record, "reportRepoRelativePath"),
		role: readNullableString(record, "role"),
		score: readNullableNumber(record, "score"),
		title: readNullableString(record, "title"),
		url: readNullableString(record, "url"),
	};
}

function parseWorkflowDescriptor(
	value: unknown,
): ResearchSpecialistWorkflowDescriptor {
	const record = assertRecord(value, "research-specialist workflow");

	return {
		detailPath: readString(record, "detailPath"),
		label: readString(record, "label"),
		message: readString(record, "message"),
		mode: readEnum(
			record,
			"mode",
			RESEARCH_SPECIALIST_MODE_VALUES,
			"research-specialist workflow mode",
		),
		selected: readBoolean(record, "selected"),
	};
}

function parseWarningItem(value: unknown): ResearchSpecialistWarningItem {
	const record = assertRecord(value, "research-specialist warning");

	return {
		code: readEnum(
			record,
			"code",
			RESEARCH_SPECIALIST_WARNING_CODE_VALUES,
			"research-specialist warning code",
		),
		message: readString(record, "message"),
	};
}

function parseStoryBankSummary(
	value: unknown,
): ResearchSpecialistStoryBankSummary {
	const record = assertRecord(value, "research-specialist story bank");

	return {
		exists: readBoolean(record, "exists"),
		repoRelativePath: readNullableString(record, "repoRelativePath"),
		source: readEnum(
			record,
			"source",
			RESEARCH_SPECIALIST_STORY_BANK_SOURCE_VALUES,
			"research-specialist story bank source",
		),
	};
}

function parseContextSummary(value: unknown): ResearchSpecialistContextSummary {
	const record = assertRecord(value, "research-specialist context");

	return {
		artifactName: readNullableString(record, "artifactName"),
		company: readNullableString(record, "company"),
		mode: readEnum(
			record,
			"mode",
			RESEARCH_SPECIALIST_MODE_VALUES,
			"research-specialist context mode",
		),
		modeDescription: readString(record, "modeDescription"),
		modeRepoRelativePath: readString(record, "modeRepoRelativePath"),
		reportContext: readNullableObject(
			record,
			"reportContext",
			parseMatchedReportContext,
		),
		role: readNullableString(record, "role"),
		storyBank: readNullableObject(record, "storyBank", parseStoryBankSummary),
		subject: readNullableString(record, "subject"),
	};
}

function parsePacketBase(record: JsonRecord): ResearchSpecialistPacketBase {
	return {
		context: parseContextSummary(record.context),
		createdAt: readString(record, "createdAt"),
		fingerprint: readString(record, "fingerprint"),
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		mode: readEnum(
			record,
			"mode",
			RESEARCH_SPECIALIST_MODE_VALUES,
			"research-specialist packet mode",
		),
		packetId: readString(record, "packetId"),
		resultStatus: readEnum(
			record,
			"resultStatus",
			RESEARCH_SPECIALIST_RESULT_STATUS_VALUES,
			"research-specialist result status",
		),
		revision: readNumber(record, "revision"),
		sessionId: readString(record, "sessionId"),
		updatedAt: readString(record, "updatedAt"),
		warnings: readArray(record, "warnings", parseWarningItem),
	};
}

function parseOutreachTarget(value: unknown): ResearchSpecialistOutreachTarget {
	const record = assertRecord(value, "research-specialist outreach target");

	return {
		name: readNullableString(record, "name"),
		profileUrl: readNullableString(record, "profileUrl"),
		title: readNullableString(record, "title"),
		type: readEnum(
			record,
			"type",
			RESEARCH_SPECIALIST_OUTREACH_TARGET_TYPE_VALUES,
			"research-specialist outreach target type",
		),
	};
}

function parseResultPacket(value: unknown): ResearchSpecialistPacket {
	const record = assertRecord(value, "research-specialist packet");
	const base = parsePacketBase(record);

	switch (base.mode) {
		case "deep-company-research": {
			const sections = assertRecord(
				record.sections,
				"research-specialist deep research sections",
			);

			return {
				...base,
				mode: "deep-company-research",
				sections: {
					aiStrategy: readStringArray(sections, "aiStrategy"),
					candidateAngle: readStringArray(sections, "candidateAngle"),
					competitors: readStringArray(sections, "competitors"),
					engineeringCulture: readStringArray(sections, "engineeringCulture"),
					likelyChallenges: readStringArray(sections, "likelyChallenges"),
					recentMoves: readStringArray(sections, "recentMoves"),
				},
				sources: readArray(record, "sources", (entry) => {
					const item = assertRecord(entry, "research-specialist source");
					return {
						label: readString(item, "label"),
						note: readString(item, "note"),
						url: readNullableString(item, "url"),
					};
				}),
			};
		}
		case "linkedin-outreach":
			return {
				...base,
				alternativeTargets: readArray(
					record,
					"alternativeTargets",
					parseOutreachTarget,
				),
				characterCount: readNumber(record, "characterCount"),
				language: readString(record, "language"),
				messageDraft: readString(record, "messageDraft"),
				mode: "linkedin-outreach",
				primaryTarget: parseOutreachTarget(record.primaryTarget),
			};
		case "interview-prep": {
			const processOverview = assertRecord(
				record.processOverview,
				"research-specialist interview process overview",
			);

			return {
				...base,
				mode: "interview-prep",
				outputRepoRelativePath: readNullableString(
					record,
					"outputRepoRelativePath",
				),
				processOverview: {
					difficulty: readNullableString(processOverview, "difficulty"),
					format: readNullableString(processOverview, "format"),
					knownQuirks: readStringArray(processOverview, "knownQuirks"),
					positiveExperienceRate: readNullableString(
						processOverview,
						"positiveExperienceRate",
					),
					rounds: readNullableString(processOverview, "rounds"),
					sources: readStringArray(processOverview, "sources"),
				},
				rounds: readArray(record, "rounds", (entry) => {
					const item = assertRecord(
						entry,
						"research-specialist interview round",
					);
					return {
						conductedBy: readNullableString(item, "conductedBy"),
						duration: readNullableString(item, "duration"),
						evaluates: readStringArray(item, "evaluates"),
						name: readString(item, "name"),
						preparation: readStringArray(item, "preparation"),
						questions: readStringArray(item, "questions"),
					};
				}),
				storyBankGaps: readStringArray(record, "storyBankGaps"),
				technicalChecklist: readArray(record, "technicalChecklist", (entry) => {
					const item = assertRecord(
						entry,
						"research-specialist interview checklist item",
					);
					return {
						reason: readString(item, "reason"),
						topic: readString(item, "topic"),
					};
				}),
			};
		}
		case "training-review":
			return {
				...base,
				betterAlternative: readNullableString(record, "betterAlternative"),
				dimensions: readArray(record, "dimensions", (entry) => {
					const item = assertRecord(
						entry,
						"research-specialist dimension score",
					);
					return {
						dimension: readString(item, "dimension"),
						rationale: readString(item, "rationale"),
						score: readNumber(item, "score"),
					};
				}),
				mode: "training-review",
				plan: readArray(record, "plan", (entry) => {
					const item = assertRecord(entry, "research-specialist plan item");
					return {
						deliverable: readString(item, "deliverable"),
						label: readString(item, "label"),
					};
				}),
				trainingTitle: readString(record, "trainingTitle"),
				verdict: readEnum(
					record,
					"verdict",
					TRAINING_REVIEW_VERDICT_VALUES,
					"research-specialist training verdict",
				),
			};
		case "project-review":
			return {
				...base,
				betterAlternative: readNullableString(record, "betterAlternative"),
				dimensions: readArray(record, "dimensions", (entry) => {
					const item = assertRecord(
						entry,
						"research-specialist dimension score",
					);
					return {
						dimension: readString(item, "dimension"),
						rationale: readString(item, "rationale"),
						score: readNumber(item, "score"),
					};
				}),
				milestones: readArray(record, "milestones", (entry) => {
					const item = assertRecord(entry, "research-specialist milestone");
					return {
						deliverable: readString(item, "deliverable"),
						label: readString(item, "label"),
					};
				}),
				mode: "project-review",
				projectTitle: readString(record, "projectTitle"),
				verdict: readEnum(
					record,
					"verdict",
					PROJECT_REVIEW_VERDICT_VALUES,
					"research-specialist project verdict",
				),
			};
	}
}

function parseSessionSummary(value: unknown): ResearchSpecialistSessionSummary {
	const record = assertRecord(value, "research-specialist session summary");

	return {
		activeJobId: readNullableString(record, "activeJobId"),
		lastHeartbeatAt: readNullableString(record, "lastHeartbeatAt"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		sessionId: readString(record, "sessionId"),
		status: readEnum(
			record,
			"status",
			RESEARCH_SPECIALIST_RUNTIME_SESSION_STATUS_VALUES,
			"research-specialist session status",
		),
		updatedAt: readString(record, "updatedAt"),
		workflow: readEnum(
			record,
			"workflow",
			RESEARCH_SPECIALIST_MODE_VALUES,
			"research-specialist session workflow",
		),
	};
}

function parseJobSummary(value: unknown): ResearchSpecialistJobSummary {
	const record = assertRecord(value, "research-specialist job summary");

	return {
		attempt: readNumber(record, "attempt"),
		completedAt: readNullableString(record, "completedAt"),
		currentRunId: readString(record, "currentRunId"),
		jobId: readString(record, "jobId"),
		jobType: readString(record, "jobType"),
		startedAt: readNullableString(record, "startedAt"),
		status: readEnum(
			record,
			"status",
			RESEARCH_SPECIALIST_RUNTIME_JOB_STATUS_VALUES,
			"research-specialist job status",
		),
		updatedAt: readString(record, "updatedAt"),
		waitReason: readNullableObject(record, "waitReason", (entry) =>
			readEnum(
				{ waitReason: entry },
				"waitReason",
				RESEARCH_SPECIALIST_RUNTIME_JOB_WAIT_REASON_VALUES,
				"research-specialist job wait reason",
			),
		),
	};
}

function parseApprovalSummary(
	value: unknown,
): ResearchSpecialistApprovalSummary {
	const record = assertRecord(value, "research-specialist approval summary");

	return {
		action: readString(record, "action"),
		approvalId: readString(record, "approvalId"),
		jobId: readNullableString(record, "jobId"),
		requestedAt: readString(record, "requestedAt"),
		resolvedAt: readNullableString(record, "resolvedAt"),
		status: readEnum(
			record,
			"status",
			RESEARCH_SPECIALIST_RUNTIME_APPROVAL_STATUS_VALUES,
			"research-specialist approval status",
		),
		title: readString(record, "title"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseFailureSummary(value: unknown): ResearchSpecialistFailureSummary {
	const record = assertRecord(value, "research-specialist failure summary");

	return {
		failedAt: readString(record, "failedAt"),
		jobId: readNullableString(record, "jobId"),
		message: readString(record, "message"),
		runId: readString(record, "runId"),
		sessionId: readString(record, "sessionId"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseReviewBoundary(value: unknown): ResearchSpecialistReviewBoundary {
	const record = assertRecord(value, "research-specialist review boundary");

	return {
		automationAllowed: readExactBoolean(record, "automationAllowed", false),
		manualSendRequired: readBoolean(record, "manualSendRequired"),
		message: readString(record, "message"),
		reviewRequired: readExactBoolean(record, "reviewRequired", true),
	};
}

function parseRunSummary(value: unknown): ResearchSpecialistRunSummary {
	const record = assertRecord(value, "research-specialist run summary");

	return {
		message: readString(record, "message"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		state: readEnum(
			record,
			"state",
			RESEARCH_SPECIALIST_RUN_STATE_VALUES,
			"research-specialist run state",
		),
	};
}

function parseNextActionSummary(
	value: unknown,
): ResearchSpecialistNextActionSummary {
	const record = assertRecord(value, "research-specialist next action");

	return {
		action: readEnum(
			record,
			"action",
			RESEARCH_SPECIALIST_NEXT_ACTION_VALUES,
			"research-specialist next action",
		),
		message: readString(record, "message"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		sessionId: readNullableString(record, "sessionId"),
	};
}

function parseSelectedSummary(
	value: unknown,
): ResearchSpecialistSelectedSummary {
	const record = assertRecord(value, "research-specialist selected summary");

	return {
		approval: readNullableObject(record, "approval", parseApprovalSummary),
		context: readNullableObject(record, "context", parseContextSummary),
		failure: readNullableObject(record, "failure", parseFailureSummary),
		job: readNullableObject(record, "job", parseJobSummary),
		message: readString(record, "message"),
		nextAction: parseNextActionSummary(record.nextAction),
		packet: readNullableObject(record, "packet", parseResultPacket),
		reviewBoundary: parseReviewBoundary(record.reviewBoundary),
		run: parseRunSummary(record.run),
		session: readNullableObject(record, "session", parseSessionSummary),
		state: readEnum(
			record,
			"state",
			RESEARCH_SPECIALIST_REVIEW_STATE_VALUES,
			"research-specialist review state",
		),
		warnings: readArray(record, "warnings", parseWarningItem),
		workflow: parseWorkflowDescriptor(record.workflow),
	};
}

function parseSelectedDetail(value: unknown): ResearchSpecialistSelectedDetail {
	const record = assertRecord(value, "research-specialist selected detail");

	return {
		message: readString(record, "message"),
		origin: readEnum(
			record,
			"origin",
			RESEARCH_SPECIALIST_SELECTION_ORIGIN_VALUES,
			"research-specialist selection origin",
		),
		requestedMode: readNullableObject(record, "requestedMode", (entry) =>
			readEnum(
				{ requestedMode: entry },
				"requestedMode",
				RESEARCH_SPECIALIST_MODE_VALUES,
				"research-specialist requested mode",
			),
		),
		requestedSessionId: readNullableString(record, "requestedSessionId"),
		state: readEnum(
			record,
			"state",
			RESEARCH_SPECIALIST_SELECTION_STATE_VALUES,
			"research-specialist selection state",
		),
		summary: readNullableObject(record, "summary", parseSelectedSummary),
	};
}

export function isResearchSpecialistMode(
	candidate: unknown,
): candidate is ResearchSpecialistMode {
	return (
		typeof candidate === "string" &&
		(RESEARCH_SPECIALIST_MODE_VALUES as readonly string[]).includes(candidate)
	);
}

export function normalizeResearchSpecialistMode(
	value: string | null | undefined,
): ResearchSpecialistMode | null {
	const trimmed = value?.trim() ?? "";

	return isResearchSpecialistMode(trimmed) ? trimmed : null;
}

export function normalizeResearchSpecialistSessionId(
	value: string | null | undefined,
): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

export function parseResearchSpecialistSummaryPayload(
	value: unknown,
): ResearchSpecialistSummaryPayload {
	const record = assertRecord(value, "research-specialist summary payload");
	const filters = assertRecord(record.filters, "research-specialist filters");

	return {
		filters: {
			mode: readNullableObject(filters, "mode", (entry) =>
				readEnum(
					{ mode: entry },
					"mode",
					RESEARCH_SPECIALIST_MODE_VALUES,
					"research-specialist filter mode",
				),
			),
			sessionId: readNullableString(filters, "sessionId"),
		},
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		ok: readExactBoolean(record, "ok", true),
		selected: parseSelectedDetail(record.selected),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readStartupStatus(record, "status"),
		workflows: readArray(record, "workflows", parseWorkflowDescriptor),
	};
}

export function parseResearchSpecialistErrorPayload(
	value: unknown,
): ResearchSpecialistErrorPayload {
	const record = assertRecord(value, "research-specialist error payload");
	const error = assertRecord(record.error, "research-specialist error");

	return {
		error: {
			code: readString(error, "code"),
			message: readString(error, "message"),
		},
		ok: readExactBoolean(record, "ok", false),
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readEnum(
			record,
			"status",
			[
				"bad-request",
				"error",
				"method-not-allowed",
				"not-found",
				"rate-limited",
			] as const,
			"research-specialist error status",
		),
	};
}

export function resolveResearchSpecialistReportPath(
	payload: ResearchSpecialistSummaryPayload | null,
): string | null {
	const selected = payload?.selected.summary ?? null;
	const reportPath =
		selected?.context?.reportContext?.reportRepoRelativePath ?? null;

	if (reportPath) {
		return reportPath;
	}

	const packet = selected?.packet ?? null;

	if (packet && packet.mode === "interview-prep") {
		return packet.outputRepoRelativePath;
	}

	return null;
}

export function resolveResearchSpecialistReportNumber(
	payload: ResearchSpecialistSummaryPayload | null,
): string | null {
	return (
		payload?.selected.summary?.context?.reportContext?.reportNumber ?? null
	);
}

export function resolveResearchSpecialistPipelineUrl(
	payload: ResearchSpecialistSummaryPayload | null,
): string | null {
	return payload?.selected.summary?.context?.reportContext?.url ?? null;
}

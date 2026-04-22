import type { StartupStatus } from "../boot/startup-types";
import {
	REPORT_VIEWER_LEGITIMACY_VALUES,
	type ReportViewerLegitimacy,
} from "../reports/report-viewer-types";

export const TRACKER_SPECIALIST_MODE_VALUES = [
	"compare-offers",
	"follow-up-cadence",
	"rejection-patterns",
] as const;

export type TrackerSpecialistMode =
	(typeof TRACKER_SPECIALIST_MODE_VALUES)[number];

export const TRACKER_SPECIALIST_SELECTION_ORIGIN_VALUES = [
	"catalog",
	"latest-session",
	"mode",
	"none",
	"session-id",
] as const;

export type TrackerSpecialistSelectionOrigin =
	(typeof TRACKER_SPECIALIST_SELECTION_ORIGIN_VALUES)[number];

export const TRACKER_SPECIALIST_SELECTION_STATE_VALUES = [
	"empty",
	"missing",
	"ready",
] as const;

export type TrackerSpecialistSelectionState =
	(typeof TRACKER_SPECIALIST_SELECTION_STATE_VALUES)[number];

export const TRACKER_SPECIALIST_RUN_STATE_VALUES = [
	"completed",
	"degraded",
	"idle",
	"running",
	"waiting",
] as const;

export type TrackerSpecialistRunState =
	(typeof TRACKER_SPECIALIST_RUN_STATE_VALUES)[number];

export const TRACKER_SPECIALIST_REVIEW_STATE_VALUES = [
	"completed",
	"degraded",
	"empty-history",
	"missing-input",
	"resumable",
	"resumed",
	"running",
	"summary-pending",
	"waiting",
] as const;

export type TrackerSpecialistReviewState =
	(typeof TRACKER_SPECIALIST_REVIEW_STATE_VALUES)[number];

export const TRACKER_SPECIALIST_RESULT_STATUS_VALUES = [
	"degraded",
	"empty-history",
	"missing-input",
	"ready",
] as const;

export type TrackerSpecialistResultStatus =
	(typeof TRACKER_SPECIALIST_RESULT_STATUS_VALUES)[number];

export const TRACKER_SPECIALIST_MATCH_STATE_VALUES = [
	"exact",
	"fuzzy",
	"missing",
] as const;

export type TrackerSpecialistMatchState =
	(typeof TRACKER_SPECIALIST_MATCH_STATE_VALUES)[number];

export const TRACKER_SPECIALIST_WARNING_CODE_VALUES = [
	"ambiguous-offer-match",
	"approval-paused",
	"degraded-analysis",
	"empty-history",
	"missing-input",
	"missing-pdf-artifact",
	"recent-failure",
	"resumable-session",
	"stale-selection",
	"unmatched-offer-reference",
] as const;

export type TrackerSpecialistWarningCode =
	(typeof TRACKER_SPECIALIST_WARNING_CODE_VALUES)[number];

export const TRACKER_SPECIALIST_NEXT_ACTION_VALUES = [
	"launch-workflow",
	"resolve-approval",
	"resume-session",
	"review-result",
	"wait",
] as const;

export type TrackerSpecialistNextAction =
	(typeof TRACKER_SPECIALIST_NEXT_ACTION_VALUES)[number];

export const TRACKER_SPECIALIST_RUNTIME_SESSION_STATUS_VALUES = [
	"cancelled",
	"completed",
	"failed",
	"pending",
	"running",
	"waiting",
] as const;

export type TrackerSpecialistRuntimeSessionStatus =
	(typeof TRACKER_SPECIALIST_RUNTIME_SESSION_STATUS_VALUES)[number];

export const TRACKER_SPECIALIST_RUNTIME_JOB_STATUS_VALUES = [
	"cancelled",
	"completed",
	"failed",
	"pending",
	"queued",
	"running",
	"waiting",
] as const;

export type TrackerSpecialistRuntimeJobStatus =
	(typeof TRACKER_SPECIALIST_RUNTIME_JOB_STATUS_VALUES)[number];

export const TRACKER_SPECIALIST_RUNTIME_JOB_WAIT_REASON_VALUES = [
	"approval",
	"retry",
] as const;

export type TrackerSpecialistRuntimeJobWaitReason =
	(typeof TRACKER_SPECIALIST_RUNTIME_JOB_WAIT_REASON_VALUES)[number];

export const TRACKER_SPECIALIST_RUNTIME_APPROVAL_STATUS_VALUES = [
	"approved",
	"pending",
	"rejected",
] as const;

export type TrackerSpecialistRuntimeApprovalStatus =
	(typeof TRACKER_SPECIALIST_RUNTIME_APPROVAL_STATUS_VALUES)[number];

export type TrackerSpecialistWorkflowDescriptor = {
	detailPath: string;
	label: string;
	message: string;
	mode: TrackerSpecialistMode;
	selected: boolean;
};

export type TrackerSpecialistWarningItem = {
	code: TrackerSpecialistWarningCode;
	message: string;
};

export type TrackerSpecialistArtifactLink = {
	exists: boolean;
	repoRelativePath: string | null;
};

export type TrackerSpecialistOfferReference = {
	company: string | null;
	entryNumber: number | null;
	label: string | null;
	reportNumber: string | null;
	reportPath: string | null;
	role: string | null;
};

export type TrackerSpecialistResolvedOffer = {
	company: string | null;
	fileName: string;
	label: string | null;
	legitimacy: ReportViewerLegitimacy | null;
	matchReasons: string[];
	matchState: TrackerSpecialistMatchState;
	pdf: TrackerSpecialistArtifactLink;
	reportNumber: string | null;
	reportRepoRelativePath: string;
	role: string | null;
	score: number | null;
	title: string | null;
	trackerEntryNumber: number | null;
	url: string | null;
};

export type TrackerSpecialistFollowUpEntry = {
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
};

export type TrackerSpecialistPatternFunnelItem = {
	count: number;
	stage: string;
};

export type TrackerSpecialistPatternBlocker = {
	blocker: string;
	frequency: number;
	percentage: number;
};

export type TrackerSpecialistPatternRecommendation = {
	action: string;
	impact: string;
	reasoning: string;
};

export type TrackerSpecialistPatternScoreThreshold = {
	positiveRange: string;
	reasoning: string;
	recommended: number;
};

export type TrackerSpecialistPatternGap = {
	frequency: number;
	skill: string;
};

export type TrackerSpecialistPatternRemotePolicy = {
	conversionRate: number;
	negative: number;
	pending: number;
	policy: string;
	positive: number;
	selfFiltered: number;
	total: number;
};

export type TrackerSpecialistPatternArchetype = {
	archetype: string;
	conversionRate: number;
	negative: number;
	pending: number;
	positive: number;
	selfFiltered: number;
	total: number;
};

export type TrackerSpecialistPatternCompanySize = {
	conversionRate: number;
	negative: number;
	pending: number;
	positive: number;
	selfFiltered: number;
	size: string;
	total: number;
};

type TrackerSpecialistPacketBase = {
	fingerprint: string;
	generatedAt: string;
	message: string;
	mode: TrackerSpecialistMode;
	resultStatus: TrackerSpecialistResultStatus;
	revision: number;
	sessionId: string;
	updatedAt: string;
	warnings: TrackerSpecialistWarningItem[];
};

export type CompareOffersResultPacket = TrackerSpecialistPacketBase & {
	mode: "compare-offers";
	offers: TrackerSpecialistResolvedOffer[];
	references: TrackerSpecialistOfferReference[];
	unmatchedReferences: TrackerSpecialistOfferReference[];
};

export type FollowUpCadenceResultPacket = TrackerSpecialistPacketBase & {
	cadenceConfig: {
		appliedFirst: number;
		appliedMaxFollowups: number;
		appliedSubsequent: number;
		interviewThankyou: number;
		respondedInitial: number;
		respondedSubsequent: number;
	};
	entries: TrackerSpecialistFollowUpEntry[];
	metadata: {
		actionable: number;
		analysisDate: string;
		cold: number;
		overdue: number;
		totalTracked: number;
		urgent: number;
		waiting: number;
	};
	mode: "follow-up-cadence";
};

export type RejectionPatternsResultPacket = TrackerSpecialistPacketBase & {
	archetypeBreakdown: TrackerSpecialistPatternArchetype[];
	companySizeBreakdown: TrackerSpecialistPatternCompanySize[];
	funnel: TrackerSpecialistPatternFunnelItem[];
	metadata: {
		analysisDate: string;
		byOutcome: {
			negative: number;
			pending: number;
			positive: number;
			selfFiltered: number;
		};
		total: number;
	};
	mode: "rejection-patterns";
	recommendations: TrackerSpecialistPatternRecommendation[];
	remotePolicy: TrackerSpecialistPatternRemotePolicy[];
	scoreThreshold: TrackerSpecialistPatternScoreThreshold;
	topBlockers: TrackerSpecialistPatternBlocker[];
	techStackGaps: TrackerSpecialistPatternGap[];
};

export type TrackerSpecialistResultPacket =
	| CompareOffersResultPacket
	| FollowUpCadenceResultPacket
	| RejectionPatternsResultPacket;

export type TrackerSpecialistSessionSummary = {
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	resumeAllowed: boolean;
	sessionId: string;
	status: TrackerSpecialistRuntimeSessionStatus;
	updatedAt: string;
	workflow: TrackerSpecialistMode;
};

export type TrackerSpecialistJobSummary = {
	attempt: number;
	completedAt: string | null;
	currentRunId: string;
	jobId: string;
	jobType: string;
	startedAt: string | null;
	status: TrackerSpecialistRuntimeJobStatus;
	updatedAt: string;
	waitReason: TrackerSpecialistRuntimeJobWaitReason | null;
};

export type TrackerSpecialistApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	resolvedAt: string | null;
	status: TrackerSpecialistRuntimeApprovalStatus;
	title: string;
	traceId: string | null;
};

export type TrackerSpecialistFailureSummary = {
	failedAt: string;
	jobId: string | null;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type TrackerSpecialistRunSummary = {
	message: string;
	resumeAllowed: boolean;
	state: TrackerSpecialistRunState;
};

export type TrackerSpecialistNextActionSummary = {
	action: TrackerSpecialistNextAction;
	message: string;
	resumeAllowed: boolean;
	sessionId: string | null;
};

export type TrackerSpecialistSelectedSummary = {
	approval: TrackerSpecialistApprovalSummary | null;
	failure: TrackerSpecialistFailureSummary | null;
	job: TrackerSpecialistJobSummary | null;
	message: string;
	nextAction: TrackerSpecialistNextActionSummary;
	packet: TrackerSpecialistResultPacket | null;
	run: TrackerSpecialistRunSummary;
	session: TrackerSpecialistSessionSummary | null;
	state: TrackerSpecialistReviewState;
	warnings: TrackerSpecialistWarningItem[];
	workflow: TrackerSpecialistWorkflowDescriptor;
};

export type TrackerSpecialistSelectedDetail = {
	message: string;
	origin: TrackerSpecialistSelectionOrigin;
	requestedMode: TrackerSpecialistMode | null;
	requestedSessionId: string | null;
	state: TrackerSpecialistSelectionState;
	summary: TrackerSpecialistSelectedSummary | null;
};

export type TrackerSpecialistSummaryPayload = {
	filters: {
		mode: TrackerSpecialistMode | null;
		sessionId: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	selected: TrackerSpecialistSelectedDetail;
	service: string;
	sessionId: string;
	status: StartupStatus;
	workflows: TrackerSpecialistWorkflowDescriptor[];
};

export type TrackerSpecialistErrorPayload = {
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
		"tracker-specialist startup status",
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
		throw new Error(`Unsupported tracker-specialist legitimacy: ${value}`);
	}

	return value as ReportViewerLegitimacy;
}

function parseWarningItem(value: unknown): TrackerSpecialistWarningItem {
	const record = assertRecord(value, "tracker-specialist warning");

	return {
		code: readEnum(
			record,
			"code",
			TRACKER_SPECIALIST_WARNING_CODE_VALUES,
			"tracker-specialist warning code",
		),
		message: readString(record, "message"),
	};
}

function parseWorkflowDescriptor(
	value: unknown,
): TrackerSpecialistWorkflowDescriptor {
	const record = assertRecord(value, "tracker-specialist workflow");

	return {
		detailPath: readString(record, "detailPath"),
		label: readString(record, "label"),
		message: readString(record, "message"),
		mode: readEnum(
			record,
			"mode",
			TRACKER_SPECIALIST_MODE_VALUES,
			"tracker-specialist workflow mode",
		),
		selected: readBoolean(record, "selected"),
	};
}

function parseArtifactLink(value: unknown): TrackerSpecialistArtifactLink {
	const record = assertRecord(value, "tracker-specialist artifact link");

	return {
		exists: readBoolean(record, "exists"),
		repoRelativePath: readNullableString(record, "repoRelativePath"),
	};
}

function parseOfferReference(value: unknown): TrackerSpecialistOfferReference {
	const record = assertRecord(value, "tracker-specialist offer reference");

	return {
		company: readNullableString(record, "company"),
		entryNumber: readNullableNumber(record, "entryNumber"),
		label: readNullableString(record, "label"),
		reportNumber: readNullableString(record, "reportNumber"),
		reportPath: readNullableString(record, "reportPath"),
		role: readNullableString(record, "role"),
	};
}

function parseResolvedOffer(value: unknown): TrackerSpecialistResolvedOffer {
	const record = assertRecord(value, "tracker-specialist resolved offer");

	return {
		company: readNullableString(record, "company"),
		fileName: readString(record, "fileName"),
		label: readNullableString(record, "label"),
		legitimacy: parseLegitimacy(record.legitimacy),
		matchReasons: readStringArray(record, "matchReasons"),
		matchState: readEnum(
			record,
			"matchState",
			TRACKER_SPECIALIST_MATCH_STATE_VALUES,
			"tracker-specialist match state",
		),
		pdf: parseArtifactLink(record.pdf),
		reportNumber: readNullableString(record, "reportNumber"),
		reportRepoRelativePath: readString(record, "reportRepoRelativePath"),
		role: readNullableString(record, "role"),
		score: readNullableNumber(record, "score"),
		title: readNullableString(record, "title"),
		trackerEntryNumber: readNullableNumber(record, "trackerEntryNumber"),
		url: readNullableString(record, "url"),
	};
}

function parseFollowUpEntry(value: unknown): TrackerSpecialistFollowUpEntry {
	const record = assertRecord(value, "tracker-specialist follow-up entry");

	return {
		company: readString(record, "company"),
		contacts: readArray(record, "contacts", (entry) => {
			const contact = assertRecord(entry, "tracker-specialist contact");
			return {
				email: readString(contact, "email"),
				name: readNullableString(contact, "name"),
			};
		}),
		date: readString(record, "date"),
		daysSinceApplication: readNumber(record, "daysSinceApplication"),
		daysSinceLastFollowup: readNullableNumber(record, "daysSinceLastFollowup"),
		daysUntilNext: readNullableNumber(record, "daysUntilNext"),
		followupCount: readNumber(record, "followupCount"),
		nextFollowupDate: readNullableString(record, "nextFollowupDate"),
		num: readNumber(record, "num"),
		reportPath: readNullableString(record, "reportPath"),
		role: readString(record, "role"),
		score: readString(record, "score"),
		status: readString(record, "status"),
		urgency: readEnum(
			record,
			"urgency",
			["cold", "overdue", "urgent", "waiting"] as const,
			"tracker-specialist follow-up urgency",
		),
	};
}

function parsePacketBase(record: JsonRecord): TrackerSpecialistPacketBase {
	return {
		fingerprint: readString(record, "fingerprint"),
		generatedAt: readString(record, "generatedAt"),
		message: readString(record, "message"),
		mode: readEnum(
			record,
			"mode",
			TRACKER_SPECIALIST_MODE_VALUES,
			"tracker-specialist packet mode",
		),
		resultStatus: readEnum(
			record,
			"resultStatus",
			TRACKER_SPECIALIST_RESULT_STATUS_VALUES,
			"tracker-specialist result status",
		),
		revision: readNumber(record, "revision"),
		sessionId: readString(record, "sessionId"),
		updatedAt: readString(record, "updatedAt"),
		warnings: readArray(record, "warnings", parseWarningItem),
	};
}

function parseResultPacket(value: unknown): TrackerSpecialistResultPacket {
	const record = assertRecord(value, "tracker-specialist packet");
	const base = parsePacketBase(record);

	switch (base.mode) {
		case "compare-offers":
			return {
				...base,
				mode: "compare-offers",
				offers: readArray(record, "offers", parseResolvedOffer),
				references: readArray(record, "references", parseOfferReference),
				unmatchedReferences: readArray(
					record,
					"unmatchedReferences",
					parseOfferReference,
				),
			};
		case "follow-up-cadence": {
			const cadenceConfig = assertRecord(
				record.cadenceConfig,
				"tracker-specialist cadence config",
			);
			const metadata = assertRecord(
				record.metadata,
				"tracker-specialist cadence metadata",
			);

			return {
				...base,
				cadenceConfig: {
					appliedFirst: readNumber(cadenceConfig, "appliedFirst"),
					appliedMaxFollowups: readNumber(cadenceConfig, "appliedMaxFollowups"),
					appliedSubsequent: readNumber(cadenceConfig, "appliedSubsequent"),
					interviewThankyou: readNumber(cadenceConfig, "interviewThankyou"),
					respondedInitial: readNumber(cadenceConfig, "respondedInitial"),
					respondedSubsequent: readNumber(cadenceConfig, "respondedSubsequent"),
				},
				entries: readArray(record, "entries", parseFollowUpEntry),
				metadata: {
					actionable: readNumber(metadata, "actionable"),
					analysisDate: readString(metadata, "analysisDate"),
					cold: readNumber(metadata, "cold"),
					overdue: readNumber(metadata, "overdue"),
					totalTracked: readNumber(metadata, "totalTracked"),
					urgent: readNumber(metadata, "urgent"),
					waiting: readNumber(metadata, "waiting"),
				},
				mode: "follow-up-cadence",
			};
		}
		case "rejection-patterns": {
			const metadata = assertRecord(
				record.metadata,
				"tracker-specialist pattern metadata",
			);
			const byOutcome = assertRecord(
				metadata.byOutcome,
				"tracker-specialist pattern byOutcome",
			);
			const scoreThreshold = assertRecord(
				record.scoreThreshold,
				"tracker-specialist score threshold",
			);

			return {
				...base,
				archetypeBreakdown: readArray(record, "archetypeBreakdown", (entry) => {
					const item = assertRecord(entry, "tracker-specialist archetype");
					return {
						archetype: readString(item, "archetype"),
						conversionRate: readNumber(item, "conversionRate"),
						negative: readNumber(item, "negative"),
						pending: readNumber(item, "pending"),
						positive: readNumber(item, "positive"),
						selfFiltered: readNumber(item, "selfFiltered"),
						total: readNumber(item, "total"),
					};
				}),
				companySizeBreakdown: readArray(
					record,
					"companySizeBreakdown",
					(entry) => {
						const item = assertRecord(entry, "tracker-specialist company size");
						return {
							conversionRate: readNumber(item, "conversionRate"),
							negative: readNumber(item, "negative"),
							pending: readNumber(item, "pending"),
							positive: readNumber(item, "positive"),
							selfFiltered: readNumber(item, "selfFiltered"),
							size: readString(item, "size"),
							total: readNumber(item, "total"),
						};
					},
				),
				funnel: readArray(record, "funnel", (entry) => {
					const item = assertRecord(entry, "tracker-specialist funnel item");
					return {
						count: readNumber(item, "count"),
						stage: readString(item, "stage"),
					};
				}),
				metadata: {
					analysisDate: readString(metadata, "analysisDate"),
					byOutcome: {
						negative: readNumber(byOutcome, "negative"),
						pending: readNumber(byOutcome, "pending"),
						positive: readNumber(byOutcome, "positive"),
						selfFiltered: readNumber(byOutcome, "selfFiltered"),
					},
					total: readNumber(metadata, "total"),
				},
				mode: "rejection-patterns",
				recommendations: readArray(record, "recommendations", (entry) => {
					const item = assertRecord(entry, "tracker-specialist recommendation");
					return {
						action: readString(item, "action"),
						impact: readString(item, "impact"),
						reasoning: readString(item, "reasoning"),
					};
				}),
				remotePolicy: readArray(record, "remotePolicy", (entry) => {
					const item = assertRecord(entry, "tracker-specialist remote policy");
					return {
						conversionRate: readNumber(item, "conversionRate"),
						negative: readNumber(item, "negative"),
						pending: readNumber(item, "pending"),
						policy: readString(item, "policy"),
						positive: readNumber(item, "positive"),
						selfFiltered: readNumber(item, "selfFiltered"),
						total: readNumber(item, "total"),
					};
				}),
				scoreThreshold: {
					positiveRange: readString(scoreThreshold, "positiveRange"),
					reasoning: readString(scoreThreshold, "reasoning"),
					recommended: readNumber(scoreThreshold, "recommended"),
				},
				topBlockers: readArray(record, "topBlockers", (entry) => {
					const item = assertRecord(entry, "tracker-specialist blocker");
					return {
						blocker: readString(item, "blocker"),
						frequency: readNumber(item, "frequency"),
						percentage: readNumber(item, "percentage"),
					};
				}),
				techStackGaps: readArray(record, "techStackGaps", (entry) => {
					const item = assertRecord(entry, "tracker-specialist tech gap");
					return {
						frequency: readNumber(item, "frequency"),
						skill: readString(item, "skill"),
					};
				}),
			};
		}
	}
}

function parseSessionSummary(value: unknown): TrackerSpecialistSessionSummary {
	const record = assertRecord(value, "tracker-specialist session summary");

	return {
		activeJobId: readNullableString(record, "activeJobId"),
		lastHeartbeatAt: readNullableString(record, "lastHeartbeatAt"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		sessionId: readString(record, "sessionId"),
		status: readEnum(
			record,
			"status",
			TRACKER_SPECIALIST_RUNTIME_SESSION_STATUS_VALUES,
			"tracker-specialist session status",
		),
		updatedAt: readString(record, "updatedAt"),
		workflow: readEnum(
			record,
			"workflow",
			TRACKER_SPECIALIST_MODE_VALUES,
			"tracker-specialist session workflow",
		),
	};
}

function parseJobSummary(value: unknown): TrackerSpecialistJobSummary {
	const record = assertRecord(value, "tracker-specialist job summary");

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
			TRACKER_SPECIALIST_RUNTIME_JOB_STATUS_VALUES,
			"tracker-specialist job status",
		),
		updatedAt: readString(record, "updatedAt"),
		waitReason: readNullableObject(record, "waitReason", (entry) =>
			readEnum(
				{ waitReason: entry },
				"waitReason",
				TRACKER_SPECIALIST_RUNTIME_JOB_WAIT_REASON_VALUES,
				"tracker-specialist job wait reason",
			),
		),
	};
}

function parseApprovalSummary(
	value: unknown,
): TrackerSpecialistApprovalSummary {
	const record = assertRecord(value, "tracker-specialist approval summary");

	return {
		action: readString(record, "action"),
		approvalId: readString(record, "approvalId"),
		jobId: readNullableString(record, "jobId"),
		requestedAt: readString(record, "requestedAt"),
		resolvedAt: readNullableString(record, "resolvedAt"),
		status: readEnum(
			record,
			"status",
			TRACKER_SPECIALIST_RUNTIME_APPROVAL_STATUS_VALUES,
			"tracker-specialist approval status",
		),
		title: readString(record, "title"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseFailureSummary(value: unknown): TrackerSpecialistFailureSummary {
	const record = assertRecord(value, "tracker-specialist failure summary");

	return {
		failedAt: readString(record, "failedAt"),
		jobId: readNullableString(record, "jobId"),
		message: readString(record, "message"),
		runId: readString(record, "runId"),
		sessionId: readString(record, "sessionId"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseRunSummary(value: unknown): TrackerSpecialistRunSummary {
	const record = assertRecord(value, "tracker-specialist run summary");

	return {
		message: readString(record, "message"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		state: readEnum(
			record,
			"state",
			TRACKER_SPECIALIST_RUN_STATE_VALUES,
			"tracker-specialist run state",
		),
	};
}

function parseNextActionSummary(
	value: unknown,
): TrackerSpecialistNextActionSummary {
	const record = assertRecord(value, "tracker-specialist next action");

	return {
		action: readEnum(
			record,
			"action",
			TRACKER_SPECIALIST_NEXT_ACTION_VALUES,
			"tracker-specialist next action",
		),
		message: readString(record, "message"),
		resumeAllowed: readBoolean(record, "resumeAllowed"),
		sessionId: readNullableString(record, "sessionId"),
	};
}

function parseSelectedSummary(
	value: unknown,
): TrackerSpecialistSelectedSummary {
	const record = assertRecord(value, "tracker-specialist selected summary");

	return {
		approval: readNullableObject(record, "approval", parseApprovalSummary),
		failure: readNullableObject(record, "failure", parseFailureSummary),
		job: readNullableObject(record, "job", parseJobSummary),
		message: readString(record, "message"),
		nextAction: parseNextActionSummary(record.nextAction),
		packet: readNullableObject(record, "packet", parseResultPacket),
		run: parseRunSummary(record.run),
		session: readNullableObject(record, "session", parseSessionSummary),
		state: readEnum(
			record,
			"state",
			TRACKER_SPECIALIST_REVIEW_STATE_VALUES,
			"tracker-specialist review state",
		),
		warnings: readArray(record, "warnings", parseWarningItem),
		workflow: parseWorkflowDescriptor(record.workflow),
	};
}

function parseSelectedDetail(value: unknown): TrackerSpecialistSelectedDetail {
	const record = assertRecord(value, "tracker-specialist selected detail");

	return {
		message: readString(record, "message"),
		origin: readEnum(
			record,
			"origin",
			TRACKER_SPECIALIST_SELECTION_ORIGIN_VALUES,
			"tracker-specialist selection origin",
		),
		requestedMode: readNullableObject(record, "requestedMode", (entry) =>
			readEnum(
				{ requestedMode: entry },
				"requestedMode",
				TRACKER_SPECIALIST_MODE_VALUES,
				"tracker-specialist requested mode",
			),
		),
		requestedSessionId: readNullableString(record, "requestedSessionId"),
		state: readEnum(
			record,
			"state",
			TRACKER_SPECIALIST_SELECTION_STATE_VALUES,
			"tracker-specialist selection state",
		),
		summary: readNullableObject(record, "summary", parseSelectedSummary),
	};
}

export function isTrackerSpecialistMode(
	candidate: unknown,
): candidate is TrackerSpecialistMode {
	return (
		typeof candidate === "string" &&
		(TRACKER_SPECIALIST_MODE_VALUES as readonly string[]).includes(candidate)
	);
}

export function normalizeTrackerSpecialistMode(
	value: string | null | undefined,
): TrackerSpecialistMode | null {
	const trimmed = value?.trim() ?? "";

	return isTrackerSpecialistMode(trimmed) ? trimmed : null;
}

export function normalizeTrackerSpecialistSessionId(
	value: string | null | undefined,
): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

export function parseTrackerSpecialistSummaryPayload(
	value: unknown,
): TrackerSpecialistSummaryPayload {
	const record = assertRecord(value, "tracker-specialist summary payload");
	const filters = assertRecord(record.filters, "tracker-specialist filters");

	return {
		filters: {
			mode: readNullableObject(filters, "mode", (entry) =>
				readEnum(
					{ mode: entry },
					"mode",
					TRACKER_SPECIALIST_MODE_VALUES,
					"tracker-specialist filter mode",
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

export function parseTrackerSpecialistErrorPayload(
	value: unknown,
): TrackerSpecialistErrorPayload {
	const record = assertRecord(value, "tracker-specialist error payload");
	const error = assertRecord(record.error, "tracker-specialist error");

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
			"tracker-specialist error status",
		),
	};
}

function getSelectedPacket(
	payload: TrackerSpecialistSummaryPayload | null,
): TrackerSpecialistResultPacket | null {
	return payload?.selected.summary?.packet ?? null;
}

export function resolveTrackerSpecialistReportPath(
	payload: TrackerSpecialistSummaryPayload | null,
): string | null {
	const packet = getSelectedPacket(payload);

	if (!packet) {
		return null;
	}

	switch (packet.mode) {
		case "compare-offers":
			return (
				packet.offers.find((offer) => offer.reportRepoRelativePath.length > 0)
					?.reportRepoRelativePath ?? null
			);
		case "follow-up-cadence":
			return (
				packet.entries.find((entry) => entry.reportPath !== null)?.reportPath ??
				null
			);
		case "rejection-patterns":
			return null;
	}
}

export function resolveTrackerSpecialistReportNumber(
	payload: TrackerSpecialistSummaryPayload | null,
): string | null {
	const packet = getSelectedPacket(payload);

	if (!packet || packet.mode !== "compare-offers") {
		return null;
	}

	return (
		packet.offers.find((offer) => offer.reportNumber !== null)?.reportNumber ??
		null
	);
}

export function resolveTrackerSpecialistTrackerEntryNumber(
	payload: TrackerSpecialistSummaryPayload | null,
): number | null {
	const packet = getSelectedPacket(payload);

	if (!packet) {
		return null;
	}

	switch (packet.mode) {
		case "compare-offers":
			return (
				packet.offers.find((offer) => offer.trackerEntryNumber !== null)
					?.trackerEntryNumber ?? null
			);
		case "follow-up-cadence":
			return packet.entries[0]?.num ?? null;
		case "rejection-patterns":
			return null;
	}
}

export function resolveTrackerSpecialistPipelineUrl(
	payload: TrackerSpecialistSummaryPayload | null,
): string | null {
	const packet = getSelectedPacket(payload);

	if (!packet || packet.mode !== "compare-offers") {
		return null;
	}

	return packet.offers.find((offer) => offer.url !== null)?.url ?? null;
}

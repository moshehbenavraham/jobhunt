import type { StartupStatus } from "../boot/startup-types";

export const OPERATOR_HOME_CARD_STATE_VALUES = [
	"attention-required",
	"degraded",
	"idle",
	"ready",
] as const;

export type OperatorHomeCardState =
	(typeof OPERATOR_HOME_CARD_STATE_VALUES)[number];

export const OPERATOR_HOME_ACTION_SURFACE_VALUES = [
	"application-help",
	"approvals",
	"artifacts",
	"batch",
	"chat",
	"onboarding",
	"pipeline",
	"scan",
	"settings",
	"startup",
	"tracker",
	"workflows",
] as const;

export type OperatorHomeActionSurface =
	(typeof OPERATOR_HOME_ACTION_SURFACE_VALUES)[number];

export const OPERATOR_HOME_ACTION_ID_VALUES = [
	"open-application-help",
	"open-approvals",
	"open-artifacts",
	"open-batch",
	"open-chat",
	"open-onboarding",
	"open-pipeline",
	"open-scan",
	"open-settings",
	"open-startup",
	"open-tracker",
	"open-workflows",
] as const;

export type OperatorHomeActionId =
	(typeof OPERATOR_HOME_ACTION_ID_VALUES)[number];

export const OPERATOR_HOME_AUTH_STATE_VALUES = [
	"auth-required",
	"expired-auth",
	"invalid-auth",
	"prompt-failure",
	"ready",
	"unavailable",
] as const;

export type OperatorHomeAuthState =
	(typeof OPERATOR_HOME_AUTH_STATE_VALUES)[number];

export const OPERATOR_HOME_UPDATE_CHECK_STATE_VALUES = [
	"dismissed",
	"error",
	"offline",
	"up-to-date",
	"update-available",
] as const;

export type OperatorHomeUpdateCheckState =
	(typeof OPERATOR_HOME_UPDATE_CHECK_STATE_VALUES)[number];

export const OPERATOR_HOME_ARTIFACT_KIND_VALUES = ["pdf", "report"] as const;

export type OperatorHomeArtifactKind =
	(typeof OPERATOR_HOME_ARTIFACT_KIND_VALUES)[number];

export const OPERATOR_HOME_PIPELINE_KIND_VALUES = [
	"pending",
	"processed",
] as const;

export type OperatorHomePipelineKind =
	(typeof OPERATOR_HOME_PIPELINE_KIND_VALUES)[number];

export type OperatorHomeApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";

export type OperatorHomeHealthStatus = "degraded" | "error" | "ok";
export type OperatorHomeOperationalStoreStatus = "absent" | "corrupt" | "ready";

export type OperatorHomeCurrentSession = {
	id: string;
	monorepo: boolean | null;
	packagePath: string | null;
	phase: number | null;
	source: "fallback" | "state-file";
	stateFilePath: string;
};

export type OperatorHomeHealth = {
	agentRuntime: {
		authPath: string;
		message: string;
		promptState: string | null;
		status: string;
	};
	message: string;
	missing: {
		onboarding: number;
		optional: number;
		runtime: number;
	};
	ok: boolean;
	operationalStore: {
		message: string;
		status: OperatorHomeOperationalStoreStatus;
	};
	service: string;
	sessionId: string;
	startupStatus: StartupStatus;
	status: OperatorHomeHealthStatus;
};

export type OperatorHomeActionFocus = {
	approvalId: string | null;
	entryNumber: number | null;
	mode: string | null;
	reportPath: string | null;
	reportNumber: string | null;
	section: "all" | "processed" | null;
	sessionId: string | null;
	url: string | null;
};

export type OperatorHomeAction = {
	description: string;
	focus: OperatorHomeActionFocus;
	id: OperatorHomeActionId;
	label: string;
	surface: OperatorHomeActionSurface;
};

export type OperatorHomeActiveJobSummary = {
	jobId: string;
	status: string;
	updatedAt: string;
	waitReason: string | null;
};

export type OperatorHomeActiveSessionSummary = {
	activeJob: OperatorHomeActiveJobSummary | null;
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	pendingApprovalCount: number;
	sessionId: string;
	status: string;
	updatedAt: string;
	workflow: string;
};

export type OperatorHomeApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	sessionId: string;
	title: string;
	traceId: string | null;
};

export type OperatorHomeFailureSummary = {
	failedAt: string;
	jobId: string;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type OperatorHomeReadinessCard = {
	actions: OperatorHomeAction[];
	currentSession: OperatorHomeCurrentSession;
	healthStatus: OperatorHomeHealthStatus;
	message: string;
	missing: {
		onboarding: number;
		optional: number;
		runtime: number;
	};
	startupStatus: StartupStatus;
	state: OperatorHomeCardState;
};

export type OperatorHomeLiveWorkCard = {
	actions: OperatorHomeAction[];
	activeSession: OperatorHomeActiveSessionSummary | null;
	activeSessionCount: number;
	message: string;
	pendingApprovalCount: number;
	recentFailureCount: number;
	recentFailures: OperatorHomeFailureSummary[];
	state: OperatorHomeCardState;
};

export type OperatorHomeApprovalsCard = {
	actions: OperatorHomeAction[];
	latestPendingApprovals: OperatorHomeApprovalSummary[];
	message: string;
	pendingApprovalCount: number;
	recentFailureCount: number;
	state: OperatorHomeCardState;
};

export type OperatorHomePipelinePreview = {
	company: string | null;
	kind: OperatorHomePipelineKind;
	reportNumber: string | null;
	role: string | null;
	score: number | null;
	url: string;
	warningCount: number;
};

export type OperatorHomeTrackerAdditionPreview = {
	company: string | null;
	entryNumber: number;
	reportNumber: string | null;
	role: string | null;
	status: string | null;
};

export type OperatorHomeCloseoutCard = {
	actions: OperatorHomeAction[];
	message: string;
	pipeline: {
		malformedCount: number;
		pendingCount: number;
		preview: OperatorHomePipelinePreview[];
		processedCount: number;
	};
	state: OperatorHomeCardState;
	tracker: {
		pendingAdditionCount: number;
		preview: OperatorHomeTrackerAdditionPreview[];
		rowCount: number;
	};
};

export type OperatorHomeArtifactPreview = {
	artifactDate: string | null;
	fileName: string;
	kind: OperatorHomeArtifactKind;
	repoRelativePath: string;
	reportNumber: string | null;
};

export type OperatorHomeArtifactsCard = {
	actions: OperatorHomeAction[];
	items: OperatorHomeArtifactPreview[];
	message: string;
	state: OperatorHomeCardState;
	totalCount: number;
};

export type OperatorHomeMaintenanceCommandCategory =
	| "auth"
	| "backup"
	| "diagnostics"
	| "updates";

export type OperatorHomeMaintenanceCommand = {
	category: OperatorHomeMaintenanceCommandCategory;
	command: string;
	description: string;
	id:
		| "auth-login"
		| "auth-refresh"
		| "auth-status"
		| "backup-run"
		| "doctor"
		| "quick-regression"
		| "update-apply"
		| "update-check"
		| "update-rollback";
	label: string;
};

export type OperatorHomeUpdateCheck = {
	changelogExcerpt: string | null;
	checkedAt: string;
	command: "node scripts/update-system.mjs check";
	localVersion: string | null;
	message: string;
	remoteVersion: string | null;
	state: OperatorHomeUpdateCheckState;
};

export type OperatorHomeMaintenanceCard = {
	actions: OperatorHomeAction[];
	authState: OperatorHomeAuthState;
	commands: OperatorHomeMaintenanceCommand[];
	message: string;
	operationalStoreStatus: OperatorHomeOperationalStoreStatus;
	state: OperatorHomeCardState;
	updateCheck: OperatorHomeUpdateCheck;
};

export type OperatorHomeSummaryPayload = {
	cards: {
		approvals: OperatorHomeApprovalsCard;
		artifacts: OperatorHomeArtifactsCard;
		closeout: OperatorHomeCloseoutCard;
		liveWork: OperatorHomeLiveWorkCard;
		maintenance: OperatorHomeMaintenanceCard;
		readiness: OperatorHomeReadinessCard;
	};
	currentSession: OperatorHomeCurrentSession;
	generatedAt: string;
	health: OperatorHomeHealth;
	message: string;
	ok: true;
	service: string;
	sessionId: string;
	status: StartupStatus;
};

export type OperatorHomeErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: OperatorHomeApiErrorStatus;
};

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value as JsonRecord;
}

function assertArray(value: unknown, label: string): unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an array.`);
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

function readBoolean(record: JsonRecord, key: string): boolean {
	const value = record[key];

	if (typeof value !== "boolean") {
		throw new Error(`Expected ${key} to be a boolean.`);
	}

	return value;
}

function readNumber(record: JsonRecord, key: string): number {
	const value = record[key];

	if (typeof value !== "number" || Number.isNaN(value)) {
		throw new Error(`Expected ${key} to be a number.`);
	}

	return value;
}

function readNullableBoolean(record: JsonRecord, key: string): boolean | null {
	const value = record[key];

	if (value === null) {
		return null;
	}

	if (typeof value !== "boolean") {
		throw new Error(`Expected ${key} to be a boolean or null.`);
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

function readEnum<TValue extends string>(
	record: JsonRecord,
	key: string,
	values: readonly TValue[],
	label = key,
): TValue {
	const value = readString(record, key);

	if (!(values as readonly string[]).includes(value)) {
		throw new Error(`Unsupported ${label}: ${value}`);
	}

	return value as TValue;
}

function readApiErrorStatus(
	record: JsonRecord,
	key: string,
): OperatorHomeApiErrorStatus {
	const value = readString(record, key);

	if (
		value !== "bad-request" &&
		value !== "error" &&
		value !== "method-not-allowed" &&
		value !== "not-found" &&
		value !== "rate-limited"
	) {
		throw new Error(`Unsupported API error status: ${value}`);
	}

	return value;
}

function readStartupStatus(record: JsonRecord, key: string): StartupStatus {
	const value = readString(record, key);

	if (
		value !== "auth-required" &&
		value !== "expired-auth" &&
		value !== "invalid-auth" &&
		value !== "missing-prerequisites" &&
		value !== "prompt-failure" &&
		value !== "ready" &&
		value !== "runtime-error"
	) {
		throw new Error(`Unsupported startup status: ${value}`);
	}

	return value;
}

function parseCurrentSession(value: unknown): OperatorHomeCurrentSession {
	const record = assertRecord(value, "currentSession");
	const source = readString(record, "source");

	if (source !== "fallback" && source !== "state-file") {
		throw new Error(`Unsupported current-session source: ${source}`);
	}

	return {
		id: readString(record, "id"),
		monorepo: readNullableBoolean(record, "monorepo"),
		packagePath: readNullableString(record, "packagePath"),
		phase: readNullableNumber(record, "phase"),
		source,
		stateFilePath: readString(record, "stateFilePath"),
	};
}

function parseHealth(value: unknown): OperatorHomeHealth {
	const record = assertRecord(value, "health");
	const agentRuntime = assertRecord(record.agentRuntime, "health.agentRuntime");
	const missing = assertRecord(record.missing, "health.missing");
	const operationalStore = assertRecord(
		record.operationalStore,
		"health.operationalStore",
	);
	const startupStatus = readStartupStatus(record, "startupStatus");

	return {
		agentRuntime: {
			authPath: readString(agentRuntime, "authPath"),
			message: readString(agentRuntime, "message"),
			promptState: readNullableString(agentRuntime, "promptState"),
			status: readString(agentRuntime, "status"),
		},
		message: readString(record, "message"),
		missing: {
			onboarding: readNumber(missing, "onboarding"),
			optional: readNumber(missing, "optional"),
			runtime: readNumber(missing, "runtime"),
		},
		ok: readBoolean(record, "ok"),
		operationalStore: {
			message: readString(operationalStore, "message"),
			status: readEnum(
				operationalStore,
				"status",
				["absent", "corrupt", "ready"] as const,
				"operational-store status",
			),
		},
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		startupStatus,
		status: readEnum(
			record,
			"status",
			["degraded", "error", "ok"] as const,
			"health status",
		),
	};
}

function parseActionFocus(value: unknown): OperatorHomeActionFocus {
	const record = assertRecord(value, "action focus");
	const section = readNullableString(record, "section");

	if (section !== null && section !== "all" && section !== "processed") {
		throw new Error(`Unsupported action section: ${section}`);
	}

	return {
		approvalId: readNullableString(record, "approvalId"),
		entryNumber: readNullableNumber(record, "entryNumber"),
		mode: readNullableString(record, "mode"),
		reportPath: readNullableString(record, "reportPath"),
		reportNumber: readNullableString(record, "reportNumber"),
		section,
		sessionId: readNullableString(record, "sessionId"),
		url: readNullableString(record, "url"),
	};
}

function parseAction(value: unknown): OperatorHomeAction {
	const record = assertRecord(value, "action");

	return {
		description: readString(record, "description"),
		focus: parseActionFocus(record.focus),
		id: readEnum(record, "id", OPERATOR_HOME_ACTION_ID_VALUES, "action id"),
		label: readString(record, "label"),
		surface: readEnum(
			record,
			"surface",
			OPERATOR_HOME_ACTION_SURFACE_VALUES,
			"action surface",
		),
	};
}

function parseActiveJob(value: unknown): OperatorHomeActiveJobSummary | null {
	if (value === null) {
		return null;
	}

	const record = assertRecord(value, "active job");

	return {
		jobId: readString(record, "jobId"),
		status: readString(record, "status"),
		updatedAt: readString(record, "updatedAt"),
		waitReason: readNullableString(record, "waitReason"),
	};
}

function parseActiveSession(
	value: unknown,
): OperatorHomeActiveSessionSummary | null {
	if (value === null) {
		return null;
	}

	const record = assertRecord(value, "active session");

	return {
		activeJob: parseActiveJob(record.activeJob),
		activeJobId: readNullableString(record, "activeJobId"),
		lastHeartbeatAt: readNullableString(record, "lastHeartbeatAt"),
		pendingApprovalCount: readNumber(record, "pendingApprovalCount"),
		sessionId: readString(record, "sessionId"),
		status: readString(record, "status"),
		updatedAt: readString(record, "updatedAt"),
		workflow: readString(record, "workflow"),
	};
}

function parseApprovalSummary(value: unknown): OperatorHomeApprovalSummary {
	const record = assertRecord(value, "approval summary");

	return {
		action: readString(record, "action"),
		approvalId: readString(record, "approvalId"),
		jobId: readNullableString(record, "jobId"),
		requestedAt: readString(record, "requestedAt"),
		sessionId: readString(record, "sessionId"),
		title: readString(record, "title"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseFailureSummary(value: unknown): OperatorHomeFailureSummary {
	const record = assertRecord(value, "failure summary");

	return {
		failedAt: readString(record, "failedAt"),
		jobId: readString(record, "jobId"),
		message: readString(record, "message"),
		runId: readString(record, "runId"),
		sessionId: readString(record, "sessionId"),
		traceId: readNullableString(record, "traceId"),
	};
}

function parseReadinessCard(value: unknown): OperatorHomeReadinessCard {
	const record = assertRecord(value, "readiness card");
	const missing = assertRecord(record.missing, "readiness missing");

	return {
		actions: assertArray(record.actions, "readiness actions").map((entry) =>
			parseAction(entry),
		),
		currentSession: parseCurrentSession(record.currentSession),
		healthStatus: readEnum(
			record,
			"healthStatus",
			["degraded", "error", "ok"] as const,
			"readiness health status",
		),
		message: readString(record, "message"),
		missing: {
			onboarding: readNumber(missing, "onboarding"),
			optional: readNumber(missing, "optional"),
			runtime: readNumber(missing, "runtime"),
		},
		startupStatus: readStartupStatus(record, "startupStatus"),
		state: readEnum(
			record,
			"state",
			OPERATOR_HOME_CARD_STATE_VALUES,
			"readiness state",
		),
	};
}

function parseLiveWorkCard(value: unknown): OperatorHomeLiveWorkCard {
	const record = assertRecord(value, "live work card");

	return {
		actions: assertArray(record.actions, "live work actions").map((entry) =>
			parseAction(entry),
		),
		activeSession: parseActiveSession(record.activeSession),
		activeSessionCount: readNumber(record, "activeSessionCount"),
		message: readString(record, "message"),
		pendingApprovalCount: readNumber(record, "pendingApprovalCount"),
		recentFailureCount: readNumber(record, "recentFailureCount"),
		recentFailures: assertArray(
			record.recentFailures,
			"live work failures",
		).map((entry) => parseFailureSummary(entry)),
		state: readEnum(
			record,
			"state",
			OPERATOR_HOME_CARD_STATE_VALUES,
			"live work state",
		),
	};
}

function parseApprovalsCard(value: unknown): OperatorHomeApprovalsCard {
	const record = assertRecord(value, "approvals card");

	return {
		actions: assertArray(record.actions, "approval actions").map((entry) =>
			parseAction(entry),
		),
		latestPendingApprovals: assertArray(
			record.latestPendingApprovals,
			"pending approvals",
		).map((entry) => parseApprovalSummary(entry)),
		message: readString(record, "message"),
		pendingApprovalCount: readNumber(record, "pendingApprovalCount"),
		recentFailureCount: readNumber(record, "recentFailureCount"),
		state: readEnum(
			record,
			"state",
			OPERATOR_HOME_CARD_STATE_VALUES,
			"approval state",
		),
	};
}

function parsePipelinePreview(value: unknown): OperatorHomePipelinePreview {
	const record = assertRecord(value, "pipeline preview");

	return {
		company: readNullableString(record, "company"),
		kind: readEnum(
			record,
			"kind",
			OPERATOR_HOME_PIPELINE_KIND_VALUES,
			"pipeline preview kind",
		),
		reportNumber: readNullableString(record, "reportNumber"),
		role: readNullableString(record, "role"),
		score: readNullableNumber(record, "score"),
		url: readString(record, "url"),
		warningCount: readNumber(record, "warningCount"),
	};
}

function parseTrackerPreview(
	value: unknown,
): OperatorHomeTrackerAdditionPreview {
	const record = assertRecord(value, "tracker preview");

	return {
		company: readNullableString(record, "company"),
		entryNumber: readNumber(record, "entryNumber"),
		reportNumber: readNullableString(record, "reportNumber"),
		role: readNullableString(record, "role"),
		status: readNullableString(record, "status"),
	};
}

function parseCloseoutCard(value: unknown): OperatorHomeCloseoutCard {
	const record = assertRecord(value, "closeout card");
	const pipeline = assertRecord(record.pipeline, "closeout pipeline");
	const tracker = assertRecord(record.tracker, "closeout tracker");

	return {
		actions: assertArray(record.actions, "closeout actions").map((entry) =>
			parseAction(entry),
		),
		message: readString(record, "message"),
		pipeline: {
			malformedCount: readNumber(pipeline, "malformedCount"),
			pendingCount: readNumber(pipeline, "pendingCount"),
			preview: assertArray(pipeline.preview, "pipeline preview").map((entry) =>
				parsePipelinePreview(entry),
			),
			processedCount: readNumber(pipeline, "processedCount"),
		},
		state: readEnum(
			record,
			"state",
			OPERATOR_HOME_CARD_STATE_VALUES,
			"closeout state",
		),
		tracker: {
			pendingAdditionCount: readNumber(tracker, "pendingAdditionCount"),
			preview: assertArray(tracker.preview, "tracker preview").map((entry) =>
				parseTrackerPreview(entry),
			),
			rowCount: readNumber(tracker, "rowCount"),
		},
	};
}

function parseArtifactPreview(value: unknown): OperatorHomeArtifactPreview {
	const record = assertRecord(value, "artifact preview");

	return {
		artifactDate: readNullableString(record, "artifactDate"),
		fileName: readString(record, "fileName"),
		kind: readEnum(
			record,
			"kind",
			OPERATOR_HOME_ARTIFACT_KIND_VALUES,
			"artifact kind",
		),
		repoRelativePath: readString(record, "repoRelativePath"),
		reportNumber: readNullableString(record, "reportNumber"),
	};
}

function parseArtifactsCard(value: unknown): OperatorHomeArtifactsCard {
	const record = assertRecord(value, "artifacts card");

	return {
		actions: assertArray(record.actions, "artifact actions").map((entry) =>
			parseAction(entry),
		),
		items: assertArray(record.items, "artifact items").map((entry) =>
			parseArtifactPreview(entry),
		),
		message: readString(record, "message"),
		state: readEnum(
			record,
			"state",
			OPERATOR_HOME_CARD_STATE_VALUES,
			"artifacts state",
		),
		totalCount: readNumber(record, "totalCount"),
	};
}

function parseMaintenanceCommand(
	value: unknown,
): OperatorHomeMaintenanceCommand {
	const record = assertRecord(value, "maintenance command");
	const id = readString(record, "id");

	if (
		id !== "auth-login" &&
		id !== "auth-refresh" &&
		id !== "auth-status" &&
		id !== "backup-run" &&
		id !== "doctor" &&
		id !== "quick-regression" &&
		id !== "update-apply" &&
		id !== "update-check" &&
		id !== "update-rollback"
	) {
		throw new Error(`Unsupported maintenance command id: ${id}`);
	}

	return {
		category: readEnum(
			record,
			"category",
			["auth", "backup", "diagnostics", "updates"] as const,
			"maintenance category",
		),
		command: readString(record, "command"),
		description: readString(record, "description"),
		id,
		label: readString(record, "label"),
	};
}

function parseUpdateCheck(value: unknown): OperatorHomeUpdateCheck {
	const record = assertRecord(value, "update check");
	const command = readString(record, "command");

	if (command !== "node scripts/update-system.mjs check") {
		throw new Error(`Unsupported update check command: ${command}`);
	}

	return {
		changelogExcerpt: readNullableString(record, "changelogExcerpt"),
		checkedAt: readString(record, "checkedAt"),
		command,
		localVersion: readNullableString(record, "localVersion"),
		message: readString(record, "message"),
		remoteVersion: readNullableString(record, "remoteVersion"),
		state: readEnum(
			record,
			"state",
			OPERATOR_HOME_UPDATE_CHECK_STATE_VALUES,
			"update check state",
		),
	};
}

function parseMaintenanceCard(value: unknown): OperatorHomeMaintenanceCard {
	const record = assertRecord(value, "maintenance card");

	return {
		actions: assertArray(record.actions, "maintenance actions").map((entry) =>
			parseAction(entry),
		),
		authState: readEnum(
			record,
			"authState",
			OPERATOR_HOME_AUTH_STATE_VALUES,
			"maintenance auth state",
		),
		commands: assertArray(record.commands, "maintenance commands").map(
			(entry) => parseMaintenanceCommand(entry),
		),
		message: readString(record, "message"),
		operationalStoreStatus: readEnum(
			record,
			"operationalStoreStatus",
			["absent", "corrupt", "ready"] as const,
			"maintenance operational-store status",
		),
		state: readEnum(
			record,
			"state",
			OPERATOR_HOME_CARD_STATE_VALUES,
			"maintenance state",
		),
		updateCheck: parseUpdateCheck(record.updateCheck),
	};
}

export function parseOperatorHomeSummaryPayload(
	value: unknown,
): OperatorHomeSummaryPayload {
	const record = assertRecord(value, "operator-home payload");
	const cards = assertRecord(record.cards, "operator-home cards");
	const health = parseHealth(record.health);
	const status = readStartupStatus(record, "status");

	if (health.startupStatus !== status) {
		throw new Error("Health startup status does not match payload status.");
	}

	if (!readBoolean(record, "ok")) {
		throw new Error("Operator-home summary payload must set ok=true.");
	}

	return {
		cards: {
			approvals: parseApprovalsCard(cards.approvals),
			artifacts: parseArtifactsCard(cards.artifacts),
			closeout: parseCloseoutCard(cards.closeout),
			liveWork: parseLiveWorkCard(cards.liveWork),
			maintenance: parseMaintenanceCard(cards.maintenance),
			readiness: parseReadinessCard(cards.readiness),
		},
		currentSession: parseCurrentSession(record.currentSession),
		generatedAt: readString(record, "generatedAt"),
		health,
		message: readString(record, "message"),
		ok: true,
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status,
	};
}

export function parseOperatorHomeErrorPayload(
	value: unknown,
): OperatorHomeErrorPayload {
	const record = assertRecord(value, "operator-home error payload");
	const error = assertRecord(record.error, "error");

	if (readBoolean(record, "ok")) {
		throw new Error("Operator-home error payload must set ok=false.");
	}

	return {
		error: {
			code: readString(error, "code"),
			message: readString(error, "message"),
		},
		ok: false,
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		status: readApiErrorStatus(record, "status"),
	};
}

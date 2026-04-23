export const SHELL_SURFACE_IDS = [
	"home",
	"startup",
	"chat",
	"workflows",
	"scan",
	"batch",
	"application-help",
	"pipeline",
	"tracker",
	"artifacts",
	"onboarding",
	"approvals",
	"settings",
] as const;

export type ShellSurfaceId = (typeof SHELL_SURFACE_IDS)[number];

export type ShellSurfaceDefinition = {
	description: string;
	id: ShellSurfaceId;
	label: string;
	owner: string;
	path: string;
};

export const SHELL_SURFACES: readonly ShellSurfaceDefinition[] = [
	{
		description: "Daily overview with readiness, approvals, and next steps.",
		id: "home",
		label: "Home",
		owner: "S06",
		path: "/",
	},
	{
		description: "Workspace diagnostics and readiness checks.",
		id: "startup",
		label: "Startup",
		owner: "S01",
		path: "/startup",
	},
	{
		description: "Start or resume a job evaluation.",
		id: "chat",
		label: "Chat",
		owner: "S02",
		path: "/evaluate",
	},
	{
		description: "Launch, resume, or inspect specialist workflows.",
		id: "workflows",
		label: "Workflows",
		owner: "P06",
		path: "/workflows",
	},
	{
		description: "Run scans and review shortlisted roles.",
		id: "scan",
		label: "Scan",
		owner: "P05",
		path: "/scan",
	},
	{
		description: "Supervise batch runs and review results.",
		id: "batch",
		label: "Batch",
		owner: "P05",
		path: "/batch",
	},
	{
		description: "Review application drafts and approval pauses.",
		id: "application-help",
		label: "Apply",
		owner: "P05",
		path: "/apply",
	},
	{
		description: "Review pending and processed queue rows.",
		id: "pipeline",
		label: "Pipeline",
		owner: "P04",
		path: "/pipeline",
	},
	{
		description: "Review tracker rows and pending additions.",
		id: "tracker",
		label: "Tracker",
		owner: "P04",
		path: "/tracker",
	},
	{
		description: "Browse reports and PDF outputs.",
		id: "artifacts",
		label: "Artifacts",
		owner: "P04",
		path: "/artifacts",
	},
	{
		description: "Fix missing files and finish first-run setup.",
		id: "onboarding",
		label: "Onboarding",
		owner: "S03",
		path: "/onboarding",
	},
	{
		description: "Review and act on pending approval requests.",
		id: "approvals",
		label: "Approvals",
		owner: "S04",
		path: "/approvals",
	},
	{
		description: "Auth, environment, and maintenance controls.",
		id: "settings",
		label: "Settings",
		owner: "S05",
		path: "/settings",
	},
] as const;

export type EvidenceRailContent = {
	heading: string | null;
	isEmpty: boolean;
};

export type OperatorShellActivityState =
	| "active"
	| "attention-required"
	| "idle"
	| "unavailable";
export type OperatorShellApiErrorStatus =
	| "bad-request"
	| "error"
	| "method-not-allowed"
	| "not-found"
	| "rate-limited";
export type OperatorShellHealthStatus = "degraded" | "error" | "ok";
export type OperatorShellOperationalStoreStatus =
	| "absent"
	| "corrupt"
	| "ready";
export type OperatorShellStartupStatus =
	| "auth-required"
	| "expired-auth"
	| "invalid-auth"
	| "missing-prerequisites"
	| "prompt-failure"
	| "ready"
	| "runtime-error";

export type OperatorShellCurrentSession = {
	id: string;
	monorepo: boolean | null;
	packagePath: string | null;
	phase: number | null;
	source: "fallback" | "state-file";
	stateFilePath: string;
};

export type OperatorShellHealth = {
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
		status: OperatorShellOperationalStoreStatus;
	};
	service: string;
	sessionId: string;
	startupStatus: OperatorShellStartupStatus;
	status: OperatorShellHealthStatus;
};

export type OperatorShellApprovalSummary = {
	action: string;
	approvalId: string;
	jobId: string | null;
	requestedAt: string;
	sessionId: string;
	title: string;
	traceId: string | null;
};

export type OperatorShellFailureSummary = {
	failedAt: string;
	jobId: string;
	message: string;
	runId: string;
	sessionId: string;
	traceId: string | null;
};

export type OperatorShellActiveJobSummary = {
	jobId: string;
	status: string;
	updatedAt: string;
	waitReason: string | null;
};

export type OperatorShellActiveSessionSummary = {
	activeJob: OperatorShellActiveJobSummary | null;
	activeJobId: string | null;
	lastHeartbeatAt: string | null;
	pendingApprovalCount: number;
	sessionId: string;
	status: string;
	updatedAt: string;
	workflow: string;
};

export type OperatorShellSummaryPayload = {
	activity: {
		activeSession: OperatorShellActiveSessionSummary | null;
		activeSessionCount: number;
		latestPendingApprovals: OperatorShellApprovalSummary[];
		pendingApprovalCount: number;
		recentFailureCount: number;
		recentFailures: OperatorShellFailureSummary[];
		state: OperatorShellActivityState;
	};
	currentSession: OperatorShellCurrentSession;
	generatedAt: string;
	health: OperatorShellHealth;
	message: string;
	ok: true;
	service: string;
	sessionId: string;
	status: OperatorShellStartupStatus;
};

export type OperatorShellErrorPayload = {
	error: {
		code: string;
		message: string;
	};
	ok: false;
	service: string;
	sessionId: string;
	status: OperatorShellApiErrorStatus;
};

type JsonRecord = Record<string, unknown>;

function assertRecord(value: unknown, label: string): JsonRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value as JsonRecord;
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

function readActivityState(
	record: JsonRecord,
	key: string,
): OperatorShellActivityState {
	const value = readString(record, key);

	if (
		value !== "active" &&
		value !== "attention-required" &&
		value !== "idle" &&
		value !== "unavailable"
	) {
		throw new Error(`Unsupported activity state: ${value}`);
	}

	return value;
}

function readApiErrorStatus(
	record: JsonRecord,
	key: string,
): OperatorShellApiErrorStatus {
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

function readHealthStatus(
	record: JsonRecord,
	key: string,
): OperatorShellHealthStatus {
	const value = readString(record, key);

	if (value !== "degraded" && value !== "error" && value !== "ok") {
		throw new Error(`Unsupported health status: ${value}`);
	}

	return value;
}

function readOperationalStoreStatus(
	record: JsonRecord,
	key: string,
): OperatorShellOperationalStoreStatus {
	const value = readString(record, key);

	if (value !== "absent" && value !== "corrupt" && value !== "ready") {
		throw new Error(`Unsupported operational-store status: ${value}`);
	}

	return value;
}

function readStartupStatus(
	record: JsonRecord,
	key: string,
): OperatorShellStartupStatus {
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
		throw new Error(`Unsupported shell startup status: ${value}`);
	}

	return value;
}

function parseCurrentSession(value: unknown): OperatorShellCurrentSession {
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

function parseHealth(value: unknown): OperatorShellHealth {
	const record = assertRecord(value, "health");
	const agentRuntime = assertRecord(record.agentRuntime, "health.agentRuntime");
	const missing = assertRecord(record.missing, "health.missing");
	const operationalStore = assertRecord(
		record.operationalStore,
		"health.operationalStore",
	);
	const startupStatus = readStartupStatus(record, "startupStatus");

	if (startupStatus !== readStartupStatus(record, "startupStatus")) {
		throw new Error("Invalid health startup status.");
	}

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
			status: readOperationalStoreStatus(operationalStore, "status"),
		},
		service: readString(record, "service"),
		sessionId: readString(record, "sessionId"),
		startupStatus,
		status: readHealthStatus(record, "status"),
	};
}

function parseApprovalSummary(value: unknown): OperatorShellApprovalSummary {
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

function parseFailureSummary(value: unknown): OperatorShellFailureSummary {
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

function parseActiveJobSummary(
	value: unknown,
): OperatorShellActiveJobSummary | null {
	if (value === null) {
		return null;
	}

	const record = assertRecord(value, "active job summary");

	return {
		jobId: readString(record, "jobId"),
		status: readString(record, "status"),
		updatedAt: readString(record, "updatedAt"),
		waitReason: readNullableString(record, "waitReason"),
	};
}

function parseActiveSessionSummary(
	value: unknown,
): OperatorShellActiveSessionSummary | null {
	if (value === null) {
		return null;
	}

	const record = assertRecord(value, "active session summary");

	return {
		activeJob: parseActiveJobSummary(record.activeJob),
		activeJobId: readNullableString(record, "activeJobId"),
		lastHeartbeatAt: readNullableString(record, "lastHeartbeatAt"),
		pendingApprovalCount: readNumber(record, "pendingApprovalCount"),
		sessionId: readString(record, "sessionId"),
		status: readString(record, "status"),
		updatedAt: readString(record, "updatedAt"),
		workflow: readString(record, "workflow"),
	};
}

const SURFACE_PATH_TO_ID: ReadonlyMap<string, ShellSurfaceId> = new Map(
	SHELL_SURFACES.map((s) => [s.path, s.id]),
);

const SURFACE_ID_TO_PATH: ReadonlyMap<ShellSurfaceId, string> = new Map(
	SHELL_SURFACES.map((s) => [s.id, s.path]),
);

export function surfaceIdFromPath(pathname: string): ShellSurfaceId | null {
	return SURFACE_PATH_TO_ID.get(pathname) ?? null;
}

export function pathFromSurfaceId(surfaceId: ShellSurfaceId): string {
	return SURFACE_ID_TO_PATH.get(surfaceId) ?? "/";
}

export function isShellSurfaceId(value: string): value is ShellSurfaceId {
	return (SHELL_SURFACE_IDS as readonly string[]).includes(value);
}

export function getDefaultShellSurfaceId(
	status: OperatorShellStartupStatus | null,
): ShellSurfaceId {
	if (status === "missing-prerequisites") {
		return "onboarding";
	}

	if (status === "ready") {
		return "home";
	}

	return "startup";
}

export function resolveShellSurfaceId(
	value: string | null | undefined,
): ShellSurfaceId {
	const normalized = value?.replace(/^#/, "").trim().toLowerCase() ?? "";

	return isShellSurfaceId(normalized) ? normalized : "startup";
}

export function getShellSurface(
	surfaceId: ShellSurfaceId,
): ShellSurfaceDefinition {
	const surface = SHELL_SURFACES.find((entry) => entry.id === surfaceId);

	if (!surface) {
		throw new Error(`Unknown shell surface: ${surfaceId}`);
	}

	return surface;
}

export function parseOperatorShellSummaryPayload(
	value: unknown,
): OperatorShellSummaryPayload {
	const record = assertRecord(value, "operator-shell payload");
	const activity = assertRecord(record.activity, "activity");
	const latestPendingApprovals = activity.latestPendingApprovals;
	const recentFailures = activity.recentFailures;

	if (
		!Array.isArray(latestPendingApprovals) ||
		!Array.isArray(recentFailures)
	) {
		throw new Error("Shell activity arrays are missing.");
	}

	const health = parseHealth(record.health);
	const status = readStartupStatus(record, "status");

	if (health.startupStatus !== status) {
		throw new Error("Health startup status does not match payload status.");
	}

	if (!readBoolean(record, "ok")) {
		throw new Error("Operator-shell summary payload must set ok=true.");
	}

	return {
		activity: {
			activeSession: parseActiveSessionSummary(activity.activeSession),
			activeSessionCount: readNumber(activity, "activeSessionCount"),
			latestPendingApprovals: latestPendingApprovals.map((entry) =>
				parseApprovalSummary(entry),
			),
			pendingApprovalCount: readNumber(activity, "pendingApprovalCount"),
			recentFailureCount: readNumber(activity, "recentFailureCount"),
			recentFailures: recentFailures.map((entry) => parseFailureSummary(entry)),
			state: readActivityState(activity, "state"),
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

export function parseOperatorShellErrorPayload(
	value: unknown,
): OperatorShellErrorPayload {
	const record = assertRecord(value, "operator-shell error payload");
	const error = assertRecord(record.error, "error");

	if (readBoolean(record, "ok")) {
		throw new Error("Operator-shell error payload must set ok=false.");
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

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

type LastErrorRecord = {
	context: Record<string, unknown>;
	error: {
		message: string;
		stack: string;
		type: string;
	};
	level: "error";
	msg: string;
	timestamp: string;
};

type LoggerOptions = {
	context?: Record<string, unknown>;
	level?: LogLevel;
	service?: string;
};

const LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
	fatal: 50,
};

function shouldLog(configured: LogLevel, incoming: LogLevel): boolean {
	return LEVEL_ORDER[incoming] >= LEVEL_ORDER[configured];
}

function toErrorRecord(error: unknown): LastErrorRecord["error"] {
	if (error instanceof Error) {
		return {
			message: error.message,
			stack: error.stack ?? "",
			type: error.name || "Error",
		};
	}
	if (typeof error === "string") {
		return { message: error, stack: "", type: "Error" };
	}
	return { message: String(error), stack: "", type: "Error" };
}

let lastError: LastErrorRecord | null = null;

export function getLastError(): LastErrorRecord | null {
	return lastError;
}

export function captureError(
	message: string,
	error: unknown,
	context: Record<string, unknown> = {},
): LastErrorRecord {
	const record: LastErrorRecord = {
		context,
		error: toErrorRecord(error),
		level: "error",
		msg: message,
		timestamp: new Date().toISOString(),
	};
	lastError = record;
	return record;
}

export function createWebLogger(options: LoggerOptions = {}) {
	const minLevel = options.level ?? "info";
	const base = {
		service: options.service ?? "jobhunt-web",
		...options.context,
	};

	function emit(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
		if (!shouldLog(minLevel, level)) return;

		const entry = {
			...base,
			...extra,
			level,
			msg,
			timestamp: new Date().toISOString(),
		};
		const method = level === "fatal" ? "error" : level;

		// eslint-disable-next-line no-console
		console[method]("[%s] %s", base.service, msg, entry);
	}

	return {
		debug: (msg: string, extra?: Record<string, unknown>) =>
			emit("debug", msg, extra),
		info: (msg: string, extra?: Record<string, unknown>) =>
			emit("info", msg, extra),
		warn: (msg: string, extra?: Record<string, unknown>) =>
			emit("warn", msg, extra),
		error: (msg: string, error?: unknown, extra?: Record<string, unknown>) => {
			if (error !== undefined) {
				captureError(msg, error, { ...base, ...extra });
			}
			emit("error", msg, {
				...extra,
				error: error !== undefined ? toErrorRecord(error) : undefined,
			});
		},
		fatal: (msg: string, error?: unknown, extra?: Record<string, unknown>) => {
			if (error !== undefined) {
				captureError(msg, error, { ...base, ...extra });
			}
			emit("fatal", msg, {
				...extra,
				error: error !== undefined ? toErrorRecord(error) : undefined,
			});
		},
	};
}

const logger = createWebLogger();
export default logger;

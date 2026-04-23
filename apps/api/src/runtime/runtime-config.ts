export const DEFAULT_BOOT_HOST = "127.0.0.1" as const;
export const DEFAULT_BOOT_PORT = 5172;
export const DEFAULT_DIAGNOSTICS_TIMEOUT_MS = 5000;
export const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
export const DEFAULT_KEEP_ALIVE_TIMEOUT_MS = 2000;
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 20;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 10_000;

export type ApiRuntimeConfig = {
	diagnosticsTimeoutMs: number;
	host: string;
	keepAliveTimeoutMs: number;
	port: number;
	rateLimitMaxRequests: number;
	rateLimitWindowMs: number;
	requestTimeoutMs: number;
};

export type ApiRuntimeConfigOverrides = Partial<ApiRuntimeConfig>;

type ApiRuntimeEnv = {
	JOBHUNT_API_DIAGNOSTICS_TIMEOUT_MS?: string;
	JOBHUNT_API_HOST?: string;
	JOBHUNT_API_KEEP_ALIVE_TIMEOUT_MS?: string;
	JOBHUNT_API_PORT?: string;
	JOBHUNT_API_RATE_LIMIT_MAX_REQUESTS?: string;
	JOBHUNT_API_RATE_LIMIT_WINDOW_MS?: string;
	JOBHUNT_API_REQUEST_TIMEOUT_MS?: string;
};

export class RuntimeConfigValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RuntimeConfigValidationError";
	}
}

function assertInteger(
	value: number,
	fieldName: string,
	minimum: number,
): number {
	if (!Number.isInteger(value) || value < minimum) {
		throw new RuntimeConfigValidationError(
			`Invalid ${fieldName} value: ${value}. Expected an integer >= ${minimum}.`,
		);
	}

	return value;
}

function parseEnvInteger(
	value: string | undefined,
	fieldName: keyof ApiRuntimeEnv,
): number | undefined {
	if (value === undefined) {
		return undefined;
	}

	const parsedValue = Number.parseInt(value, 10);

	if (Number.isNaN(parsedValue)) {
		throw new RuntimeConfigValidationError(
			`Invalid ${fieldName} value: ${value}. Expected an integer.`,
		);
	}

	return parsedValue;
}

function resolveHost(host: string | undefined): string {
	const normalizedHost = host?.trim() ?? DEFAULT_BOOT_HOST;

	if (!normalizedHost) {
		throw new RuntimeConfigValidationError(
			"Invalid JOBHUNT_API_HOST value: host cannot be empty.",
		);
	}

	return normalizedHost;
}

function resolvePort(port: number | undefined): number {
	return assertInteger(port ?? DEFAULT_BOOT_PORT, "JOBHUNT_API_PORT", 0);
}

function resolvePositiveTimeout(
	value: number | undefined,
	fieldName: string,
	defaultValue: number,
): number {
	return assertInteger(value ?? defaultValue, fieldName, 1);
}

function resolveRateLimitValue(
	value: number | undefined,
	fieldName: string,
	defaultValue: number,
): number {
	return assertInteger(value ?? defaultValue, fieldName, 1);
}

export function createRuntimeConfig(
	overrides: ApiRuntimeConfigOverrides = {},
): ApiRuntimeConfig {
	return {
		diagnosticsTimeoutMs: resolvePositiveTimeout(
			overrides.diagnosticsTimeoutMs,
			"JOBHUNT_API_DIAGNOSTICS_TIMEOUT_MS",
			DEFAULT_DIAGNOSTICS_TIMEOUT_MS,
		),
		host: resolveHost(overrides.host),
		keepAliveTimeoutMs: resolvePositiveTimeout(
			overrides.keepAliveTimeoutMs,
			"JOBHUNT_API_KEEP_ALIVE_TIMEOUT_MS",
			DEFAULT_KEEP_ALIVE_TIMEOUT_MS,
		),
		port: resolvePort(overrides.port),
		rateLimitMaxRequests: resolveRateLimitValue(
			overrides.rateLimitMaxRequests,
			"JOBHUNT_API_RATE_LIMIT_MAX_REQUESTS",
			DEFAULT_RATE_LIMIT_MAX_REQUESTS,
		),
		rateLimitWindowMs: resolveRateLimitValue(
			overrides.rateLimitWindowMs,
			"JOBHUNT_API_RATE_LIMIT_WINDOW_MS",
			DEFAULT_RATE_LIMIT_WINDOW_MS,
		),
		requestTimeoutMs: resolvePositiveTimeout(
			overrides.requestTimeoutMs,
			"JOBHUNT_API_REQUEST_TIMEOUT_MS",
			DEFAULT_REQUEST_TIMEOUT_MS,
		),
	};
}

export function readRuntimeConfigFromEnv(
	env: ApiRuntimeEnv = process.env,
	overrides: ApiRuntimeConfigOverrides = {},
): ApiRuntimeConfig {
	const configOverrides: ApiRuntimeConfigOverrides = {};

	const diagnosticsTimeoutMs =
		overrides.diagnosticsTimeoutMs ??
		parseEnvInteger(
			env.JOBHUNT_API_DIAGNOSTICS_TIMEOUT_MS,
			"JOBHUNT_API_DIAGNOSTICS_TIMEOUT_MS",
		);
	const host = overrides.host ?? env.JOBHUNT_API_HOST;
	const keepAliveTimeoutMs =
		overrides.keepAliveTimeoutMs ??
		parseEnvInteger(
			env.JOBHUNT_API_KEEP_ALIVE_TIMEOUT_MS,
			"JOBHUNT_API_KEEP_ALIVE_TIMEOUT_MS",
		);
	const port =
		overrides.port ?? parseEnvInteger(env.JOBHUNT_API_PORT, "JOBHUNT_API_PORT");
	const rateLimitMaxRequests =
		overrides.rateLimitMaxRequests ??
		parseEnvInteger(
			env.JOBHUNT_API_RATE_LIMIT_MAX_REQUESTS,
			"JOBHUNT_API_RATE_LIMIT_MAX_REQUESTS",
		);
	const rateLimitWindowMs =
		overrides.rateLimitWindowMs ??
		parseEnvInteger(
			env.JOBHUNT_API_RATE_LIMIT_WINDOW_MS,
			"JOBHUNT_API_RATE_LIMIT_WINDOW_MS",
		);
	const requestTimeoutMs =
		overrides.requestTimeoutMs ??
		parseEnvInteger(
			env.JOBHUNT_API_REQUEST_TIMEOUT_MS,
			"JOBHUNT_API_REQUEST_TIMEOUT_MS",
		);

	if (diagnosticsTimeoutMs !== undefined) {
		configOverrides.diagnosticsTimeoutMs = diagnosticsTimeoutMs;
	}

	if (host !== undefined) {
		configOverrides.host = host;
	}

	if (keepAliveTimeoutMs !== undefined) {
		configOverrides.keepAliveTimeoutMs = keepAliveTimeoutMs;
	}

	if (port !== undefined) {
		configOverrides.port = port;
	}

	if (rateLimitMaxRequests !== undefined) {
		configOverrides.rateLimitMaxRequests = rateLimitMaxRequests;
	}

	if (rateLimitWindowMs !== undefined) {
		configOverrides.rateLimitWindowMs = rateLimitWindowMs;
	}

	if (requestTimeoutMs !== undefined) {
		configOverrides.requestTimeoutMs = requestTimeoutMs;
	}

	return createRuntimeConfig(configOverrides);
}

import {
	type EvaluationResultErrorPayload,
	type EvaluationResultSummaryPayload,
	parseEvaluationResultErrorPayload,
	parseEvaluationResultSummaryPayload,
} from "./evaluation-result-types";

const DEFAULT_PREVIEW_LIMIT = 4;
const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export class EvaluationResultClientError extends Error {
	code: string;
	httpStatus: number | null;
	payload: EvaluationResultErrorPayload | null;
	state: "error" | "offline";

	constructor(options: {
		cause?: unknown;
		code: string;
		httpStatus?: number | null;
		message: string;
		payload?: EvaluationResultErrorPayload | null;
		state: "error" | "offline";
	}) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.code = options.code;
		this.httpStatus = options.httpStatus ?? null;
		this.name = "EvaluationResultClientError";
		this.payload = options.payload ?? null;
		this.state = options.state;
	}
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

export function resolveEvaluationResultEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/evaluation-result`;
	}

	return "/api/evaluation-result";
}

function createSignal(
	timeoutMs: number,
	externalSignal?: AbortSignal,
): {
	cleanup: () => void;
	didTimeout: () => boolean;
	signal: AbortSignal;
} {
	const controller = new AbortController();
	let timedOut = false;
	const timeoutId = window.setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, timeoutMs);

	const abortFromExternal = () => {
		controller.abort();
	};

	if (externalSignal) {
		if (externalSignal.aborted) {
			controller.abort();
		} else {
			externalSignal.addEventListener("abort", abortFromExternal, {
				once: true,
			});
		}
	}

	return {
		cleanup: () => {
			window.clearTimeout(timeoutId);
			externalSignal?.removeEventListener("abort", abortFromExternal);
		},
		didTimeout: () => timedOut,
		signal: controller.signal,
	};
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

function shouldRetry(error: unknown): boolean {
	if (!(error instanceof EvaluationResultClientError)) {
		return false;
	}

	return error.state === "offline" || error.httpStatus === 429;
}

async function waitForRetry(
	delayMs: number,
	signal?: AbortSignal,
): Promise<void> {
	if (delayMs === 0) {
		return;
	}

	await new Promise<void>((resolve, reject) => {
		const timeoutId = window.setTimeout(() => {
			signal?.removeEventListener("abort", abortListener);
			resolve();
		}, delayMs);

		const abortListener = () => {
			window.clearTimeout(timeoutId);
			reject(new DOMException("Aborted", "AbortError"));
		};

		if (!signal) {
			return;
		}

		if (signal.aborted) {
			abortListener();
			return;
		}

		signal.addEventListener("abort", abortListener, { once: true });
	});
}

function buildSummaryUrl(options: {
	endpoint?: string;
	previewLimit?: number;
	sessionId?: string | null;
	workflow?: string | null;
}): string {
	const endpoint = options.endpoint ?? resolveEvaluationResultEndpoint();
	const url = new URL(endpoint, window.location.origin);

	url.searchParams.set(
		"previewLimit",
		String(options.previewLimit ?? DEFAULT_PREVIEW_LIMIT),
	);

	if (options.sessionId) {
		url.searchParams.set("sessionId", options.sessionId);
	}

	if (options.workflow) {
		url.searchParams.set("workflow", options.workflow);
	}

	if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
}

async function parseResponsePayload<TPayload>(
	response: Response,
	parser: (value: unknown) => TPayload,
): Promise<TPayload> {
	const rawPayload = await response.json().catch((error: unknown) => {
		throw new EvaluationResultClientError({
			cause: error,
			code: "invalid-json",
			httpStatus: response.status,
			message: "Evaluation result returned unreadable data. Try refreshing.",
			state: "error",
		});
	});

	try {
		return parser(rawPayload);
	} catch (_payloadError) {
		try {
			const errorPayload = parseEvaluationResultErrorPayload(rawPayload);

			throw new EvaluationResultClientError({
				code: errorPayload.error.code,
				httpStatus: response.status,
				message: errorPayload.error.message,
				payload: errorPayload,
				state: response.status >= 500 ? "error" : "offline",
			});
		} catch (parsedError) {
			if (parsedError instanceof EvaluationResultClientError) {
				throw parsedError;
			}

			throw new EvaluationResultClientError({
				cause: parsedError,
				code: "invalid-response",
				httpStatus: response.status,
				message:
					"Evaluation result returned an unexpected response. Try refreshing.",
				state: "error",
			});
		}
	}
}

async function fetchSummaryOnce(options: {
	endpoint?: string;
	previewLimit?: number;
	sessionId?: string | null;
	signal?: AbortSignal;
	timeoutMs?: number;
	workflow?: string | null;
}): Promise<EvaluationResultSummaryPayload> {
	const request = createSignal(
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		options.signal,
	);

	try {
		const response = await fetch(buildSummaryUrl(options), {
			headers: {
				accept: "application/json",
			},
			method: "GET",
			signal: request.signal,
		});

		return parseResponsePayload(response, parseEvaluationResultSummaryPayload);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new EvaluationResultClientError({
				cause: error,
				code: "timeout",
				message:
					"Evaluation result timed out. Check that the API server is running.",
				state: "offline",
			});
		}

		if (error instanceof EvaluationResultClientError) {
			throw error;
		}

		throw new EvaluationResultClientError({
			cause: error,
			code: "offline",
			message:
				"Evaluation result is unreachable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export async function fetchEvaluationResultSummary(
	options: {
		endpoint?: string;
		previewLimit?: number;
		sessionId?: string | null;
		signal?: AbortSignal;
		timeoutMs?: number;
		workflow?: string | null;
	} = {},
): Promise<EvaluationResultSummaryPayload> {
	let lastError: unknown;

	for (const delayMs of RETRY_DELAYS_MS) {
		await waitForRetry(delayMs, options.signal);

		try {
			return await fetchSummaryOnce(options);
		} catch (error) {
			if (options.signal?.aborted && isAbortError(error)) {
				throw error;
			}

			lastError = error;

			if (!shouldRetry(error) || delayMs === RETRY_DELAYS_MS.at(-1)) {
				throw error;
			}
		}
	}

	throw lastError;
}

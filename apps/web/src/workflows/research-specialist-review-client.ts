import {
	normalizeResearchSpecialistMode,
	normalizeResearchSpecialistSessionId,
	parseResearchSpecialistErrorPayload,
	parseResearchSpecialistSummaryPayload,
	type ResearchSpecialistErrorPayload,
	type ResearchSpecialistMode,
	type ResearchSpecialistSummaryPayload,
} from "./research-specialist-review-types";

const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export type ResearchSpecialistReviewFocus = {
	mode: ResearchSpecialistMode | null;
	sessionId: string | null;
};

export class ResearchSpecialistReviewClientError extends Error {
	code: string;
	httpStatus: number | null;
	payload: ResearchSpecialistErrorPayload | null;
	state: "error" | "offline";

	constructor(options: {
		cause?: unknown;
		code: string;
		httpStatus?: number | null;
		message: string;
		payload?: ResearchSpecialistErrorPayload | null;
		state: "error" | "offline";
	}) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.code = options.code;
		this.httpStatus = options.httpStatus ?? null;
		this.name = "ResearchSpecialistReviewClientError";
		this.payload = options.payload ?? null;
		this.state = options.state;
	}
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
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
	if (!(error instanceof ResearchSpecialistReviewClientError)) {
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

async function parseResponsePayload<TPayload>(
	response: Response,
	parser: (value: unknown) => TPayload,
): Promise<TPayload> {
	const rawPayload = await response.json().catch((error: unknown) => {
		throw new ResearchSpecialistReviewClientError({
			cause: error,
			code: "invalid-json",
			httpStatus: response.status,
			message: "Research-specialist review endpoint returned invalid JSON.",
			state: "error",
		});
	});

	try {
		return parser(rawPayload);
	} catch (_payloadError) {
		try {
			const errorPayload = parseResearchSpecialistErrorPayload(rawPayload);

			throw new ResearchSpecialistReviewClientError({
				code: errorPayload.error.code,
				httpStatus: response.status,
				message: errorPayload.error.message,
				payload: errorPayload,
				state:
					response.status === 400 ||
					response.status === 409 ||
					response.status >= 500
						? "error"
						: "offline",
			});
		} catch (parsedError) {
			if (parsedError instanceof ResearchSpecialistReviewClientError) {
				throw parsedError;
			}

			throw new ResearchSpecialistReviewClientError({
				cause: parsedError,
				code: "invalid-response",
				httpStatus: response.status,
				message:
					"Research-specialist review endpoint returned an unexpected payload.",
				state: "error",
			});
		}
	}
}

function buildSummaryUrl(options: {
	endpoint?: string;
	focus?: Partial<ResearchSpecialistReviewFocus>;
}): string {
	const endpoint =
		options.endpoint ?? resolveResearchSpecialistReviewEndpoint();
	const url = new URL(endpoint, window.location.origin);
	const mode = normalizeResearchSpecialistMode(options.focus?.mode ?? null);
	const sessionId = normalizeResearchSpecialistSessionId(
		options.focus?.sessionId ?? null,
	);

	if (mode) {
		url.searchParams.set("mode", mode);
	}

	if (sessionId) {
		url.searchParams.set("sessionId", sessionId);
	}

	if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
}

async function fetchSummaryOnce(options: {
	endpoint?: string;
	focus?: Partial<ResearchSpecialistReviewFocus>;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<ResearchSpecialistSummaryPayload> {
	const request = createSignal(
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		options.signal,
	);

	try {
		const response = await fetch(
			buildSummaryUrl({
				...(options.endpoint ? { endpoint: options.endpoint } : {}),
				...(options.focus ? { focus: options.focus } : {}),
			}),
			{
				headers: {
					accept: "application/json",
				},
				method: "GET",
				signal: request.signal,
			},
		);

		return parseResponsePayload(
			response,
			parseResearchSpecialistSummaryPayload,
		);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new ResearchSpecialistReviewClientError({
				cause: error,
				code: "timeout",
				message:
					"Research-specialist review timed out before it could respond.",
				state: "offline",
			});
		}

		if (isAbortError(error)) {
			throw error;
		}

		if (error instanceof ResearchSpecialistReviewClientError) {
			throw error;
		}

		throw new ResearchSpecialistReviewClientError({
			cause: error,
			code: "network-error",
			message:
				"Could not reach the research-specialist review endpoint right now.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export function resolveResearchSpecialistReviewEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/research-specialist`;
	}

	return "/api/research-specialist";
}

export async function fetchResearchSpecialistSummary(
	options: {
		endpoint?: string;
		focus?: Partial<ResearchSpecialistReviewFocus>;
		signal?: AbortSignal;
		timeoutMs?: number;
	} = {},
): Promise<ResearchSpecialistSummaryPayload> {
	let lastError: unknown = null;

	for (const delayMs of RETRY_DELAYS_MS) {
		if (delayMs > 0) {
			await waitForRetry(delayMs, options.signal);
		}

		try {
			return await fetchSummaryOnce(options);
		} catch (error) {
			lastError = error;

			if (options.signal?.aborted || !shouldRetry(error)) {
				throw error;
			}
		}
	}

	throw lastError instanceof Error
		? lastError
		: new ResearchSpecialistReviewClientError({
				code: "unknown-client-error",
				message: "Research-specialist review request failed.",
				state: "error",
			});
}

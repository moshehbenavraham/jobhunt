import {
	type OperatorHomeErrorPayload,
	type OperatorHomeSummaryPayload,
	parseOperatorHomeErrorPayload,
	parseOperatorHomeSummaryPayload,
} from "./operator-home-types";

const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export class OperatorHomeClientError extends Error {
	code: string;
	httpStatus: number | null;
	payload: OperatorHomeErrorPayload | null;
	state: "error" | "offline";

	constructor(options: {
		cause?: unknown;
		code: string;
		httpStatus?: number | null;
		message: string;
		payload?: OperatorHomeErrorPayload | null;
		state: "error" | "offline";
	}) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.code = options.code;
		this.httpStatus = options.httpStatus ?? null;
		this.name = "OperatorHomeClientError";
		this.payload = options.payload ?? null;
		this.state = options.state;
	}
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

export function resolveOperatorHomeEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/operator-home`;
	}

	return "/api/operator-home";
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
	if (!(error instanceof OperatorHomeClientError)) {
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

function buildEndpoint(options: {
	approvalLimit?: number;
	artifactLimit?: number;
	closeoutLimit?: number;
	endpoint?: string;
}): string {
	const url = new URL(
		options.endpoint ?? resolveOperatorHomeEndpoint(),
		window.location.origin,
	);

	if (options.approvalLimit !== undefined) {
		url.searchParams.set("approvalLimit", String(options.approvalLimit));
	}

	if (options.artifactLimit !== undefined) {
		url.searchParams.set("artifactLimit", String(options.artifactLimit));
	}

	if (options.closeoutLimit !== undefined) {
		url.searchParams.set("closeoutLimit", String(options.closeoutLimit));
	}

	if (
		url.origin === window.location.origin &&
		options.endpoint !== undefined &&
		options.endpoint.startsWith("/")
	) {
		return `${url.pathname}${url.search}`;
	}

	return url.toString();
}

async function fetchOnce(options: {
	approvalLimit?: number;
	artifactLimit?: number;
	closeoutLimit?: number;
	endpoint?: string;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<OperatorHomeSummaryPayload> {
	const request = createSignal(
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		options.signal,
	);

	try {
		const response = await fetch(buildEndpoint(options), {
			headers: {
				accept: "application/json",
			},
			method: "GET",
			signal: request.signal,
		});
		const rawPayload = await response.json().catch((error: unknown) => {
			throw new OperatorHomeClientError({
				cause: error,
				code: "invalid-json",
				httpStatus: response.status,
				message: "Operator-home endpoint returned invalid JSON.",
				state: "error",
			});
		});

		try {
			return parseOperatorHomeSummaryPayload(rawPayload);
		} catch (_summaryError) {
			try {
				const errorPayload = parseOperatorHomeErrorPayload(rawPayload);

				throw new OperatorHomeClientError({
					code: errorPayload.error.code,
					httpStatus: response.status,
					message: errorPayload.error.message,
					payload: errorPayload,
					state: response.status >= 500 ? "error" : "offline",
				});
			} catch (parsedError) {
				if (parsedError instanceof OperatorHomeClientError) {
					throw parsedError;
				}

				throw new OperatorHomeClientError({
					cause: parsedError,
					code: "invalid-response",
					httpStatus: response.status,
					message: "Operator-home endpoint returned an unexpected payload.",
					state: "error",
				});
			}
		}
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new OperatorHomeClientError({
				cause: error,
				code: "timeout",
				message: "Operator-home endpoint timed out before it responded.",
				state: "offline",
			});
		}

		if (error instanceof OperatorHomeClientError) {
			throw error;
		}

		throw new OperatorHomeClientError({
			cause: error,
			code: "offline",
			message:
				"Operator-home endpoint is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export async function fetchOperatorHomeSummary(
	options: {
		approvalLimit?: number;
		artifactLimit?: number;
		closeoutLimit?: number;
		endpoint?: string;
		signal?: AbortSignal;
		timeoutMs?: number;
	} = {},
): Promise<OperatorHomeSummaryPayload> {
	let lastError: unknown;

	for (const delayMs of RETRY_DELAYS_MS) {
		await waitForRetry(delayMs, options.signal);

		try {
			return await fetchOnce(options);
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

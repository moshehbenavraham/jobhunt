import {
	ChatConsoleClientError,
	type ChatConsoleCommandInput,
	submitChatConsoleCommand,
} from "../chat/chat-console-client";
import type { ChatConsoleCommandPayload } from "../chat/chat-console-types";
import {
	parseScanReviewActionPayload,
	parseScanReviewErrorPayload,
	parseScanReviewSummaryPayload,
	SCAN_REVIEW_ACTION_VALUES,
	SCAN_REVIEW_BUCKET_FILTER_VALUES,
	type ScanReviewAction,
	type ScanReviewActionPayload,
	type ScanReviewBucketFilter,
	type ScanReviewErrorPayload,
	type ScanReviewSummaryPayload,
} from "./scan-review-types";

const DEFAULT_SCAN_REVIEW_LIMIT = 12;
const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export const SCAN_REVIEW_FOCUS_EVENT = "jobhunt:scan-review-focus-change";

export type ScanReviewFocus = {
	bucket: ScanReviewBucketFilter;
	includeIgnored: boolean;
	offset: number;
	sessionId: string | null;
	url: string | null;
};

export type ScanReviewActionInput = {
	action: ScanReviewAction;
	sessionId: string;
	url: string;
};

export class ScanReviewClientError extends Error {
	code: string;
	httpStatus: number | null;
	payload: ScanReviewErrorPayload | null;
	state: "error" | "offline";

	constructor(options: {
		cause?: unknown;
		code: string;
		httpStatus?: number | null;
		message: string;
		payload?: ScanReviewErrorPayload | null;
		state: "error" | "offline";
	}) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.code = options.code;
		this.httpStatus = options.httpStatus ?? null;
		this.name = "ScanReviewClientError";
		this.payload = options.payload ?? null;
		this.state = options.state;
	}
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

function readBucket(value: string | null): ScanReviewBucketFilter {
	if (
		value &&
		SCAN_REVIEW_BUCKET_FILTER_VALUES.includes(value as ScanReviewBucketFilter)
	) {
		return value as ScanReviewBucketFilter;
	}

	return "all";
}

function readOffset(value: string | null): number {
	if (!value) {
		return 0;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function readBooleanFlag(value: string | null): boolean {
	return value === "true";
}

function readSessionId(value: string | null): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

function readUrl(value: string | null): string | null {
	const trimmed = value?.trim() ?? "";

	if (trimmed.length === 0) {
		return null;
	}

	try {
		const parsed = new URL(trimmed);

		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return null;
		}

		parsed.hash = "";
		return parsed.toString();
	} catch {
		return null;
	}
}

function mergeFocus(
	focus: Partial<ScanReviewFocus> | undefined,
): ScanReviewFocus {
	const currentFocus = readScanReviewFocusFromUrl();

	return {
		bucket: focus?.bucket ?? currentFocus.bucket,
		includeIgnored: focus?.includeIgnored ?? currentFocus.includeIgnored,
		offset: focus?.offset ?? currentFocus.offset,
		sessionId:
			focus?.sessionId !== undefined ? focus.sessionId : currentFocus.sessionId,
		url: focus?.url !== undefined ? focus.url : currentFocus.url,
	};
}

export function resolveScanReviewEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/scan-review`;
	}

	return "/api/scan-review";
}

export function resolveScanReviewActionEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/scan-review/action`;
	}

	return "/api/scan-review/action";
}

export function readScanReviewFocusFromUrl(): ScanReviewFocus {
	const url = new URL(window.location.href);

	return {
		bucket: readBucket(url.searchParams.get("scanBucket")),
		includeIgnored: readBooleanFlag(url.searchParams.get("scanIncludeIgnored")),
		offset: readOffset(url.searchParams.get("scanOffset")),
		sessionId: readSessionId(url.searchParams.get("scanSessionId")),
		url: readUrl(url.searchParams.get("scanUrl")),
	};
}

export function syncScanReviewFocus(
	focus: Partial<ScanReviewFocus>,
	options: {
		openSurface?: boolean;
		replace?: boolean;
	} = {},
): void {
	const nextFocus = mergeFocus(focus);
	const url = new URL(window.location.href);

	if (nextFocus.bucket === "all") {
		url.searchParams.delete("scanBucket");
	} else {
		url.searchParams.set("scanBucket", nextFocus.bucket);
	}

	if (nextFocus.includeIgnored) {
		url.searchParams.set("scanIncludeIgnored", "true");
	} else {
		url.searchParams.delete("scanIncludeIgnored");
	}

	if (nextFocus.offset > 0) {
		url.searchParams.set("scanOffset", String(nextFocus.offset));
	} else {
		url.searchParams.delete("scanOffset");
	}

	if (nextFocus.sessionId) {
		url.searchParams.set("scanSessionId", nextFocus.sessionId);
	} else {
		url.searchParams.delete("scanSessionId");
	}

	if (nextFocus.url) {
		url.searchParams.set("scanUrl", nextFocus.url);
	} else {
		url.searchParams.delete("scanUrl");
	}

	if (options.openSurface) {
		url.hash = "#scan";
	}

	const nextUrl = `${url.pathname}${url.search}${url.hash}`;
	const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

	if (nextUrl !== currentUrl) {
		if (options.replace) {
			window.history.replaceState(null, "", nextUrl);
		} else {
			window.history.pushState(null, "", nextUrl);
		}
	}

	window.dispatchEvent(new Event(SCAN_REVIEW_FOCUS_EVENT));
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
	if (!(error instanceof ScanReviewClientError)) {
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
	focus?: ScanReviewFocus;
}): string {
	const endpoint = options.endpoint ?? resolveScanReviewEndpoint();
	const focus = options.focus ?? readScanReviewFocusFromUrl();
	const url = new URL(endpoint, window.location.origin);

	if (focus.bucket !== "all") {
		url.searchParams.set("bucket", focus.bucket);
	}

	if (focus.includeIgnored) {
		url.searchParams.set("includeIgnored", "true");
	}

	if (focus.offset > 0) {
		url.searchParams.set("offset", String(focus.offset));
	}

	url.searchParams.set("limit", String(DEFAULT_SCAN_REVIEW_LIMIT));

	if (focus.sessionId) {
		url.searchParams.set("sessionId", focus.sessionId);
	}

	if (focus.url) {
		url.searchParams.set("url", focus.url);
	}

	if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
}

async function parseResponsePayload<TPayload>(options: {
	invalidJsonMessage: string;
	parser: (value: unknown) => TPayload;
	response: Response;
	unexpectedPayloadMessage: string;
}): Promise<TPayload> {
	const rawPayload = await options.response.json().catch((error: unknown) => {
		throw new ScanReviewClientError({
			cause: error,
			code: "invalid-json",
			httpStatus: options.response.status,
			message: options.invalidJsonMessage,
			state: "error",
		});
	});

	try {
		return options.parser(rawPayload);
	} catch (_payloadError) {
		try {
			const errorPayload = parseScanReviewErrorPayload(rawPayload);

			throw new ScanReviewClientError({
				code: errorPayload.error.code,
				httpStatus: options.response.status,
				message: errorPayload.error.message,
				payload: errorPayload,
				state: options.response.status >= 500 ? "error" : "offline",
			});
		} catch (parsedError) {
			if (parsedError instanceof ScanReviewClientError) {
				throw parsedError;
			}

			throw new ScanReviewClientError({
				cause: parsedError,
				code: "invalid-response",
				httpStatus: options.response.status,
				message: options.unexpectedPayloadMessage,
				state: "error",
			});
		}
	}
}

async function fetchSummaryOnce(options: {
	endpoint?: string;
	focus?: ScanReviewFocus;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<ScanReviewSummaryPayload> {
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

		return parseResponsePayload({
			invalidJsonMessage: "Scan-review endpoint returned invalid JSON.",
			parser: parseScanReviewSummaryPayload,
			response,
			unexpectedPayloadMessage:
				"Scan-review endpoint returned an unexpected payload.",
		});
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new ScanReviewClientError({
				cause: error,
				code: "timeout",
				message: "Scan-review summary timed out before it responded.",
				state: "offline",
			});
		}

		if (error instanceof ScanReviewClientError) {
			throw error;
		}

		throw new ScanReviewClientError({
			cause: error,
			code: "offline",
			message:
				"Scan-review endpoint is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export async function fetchScanReviewSummary(
	options: {
		endpoint?: string;
		focus?: ScanReviewFocus;
		signal?: AbortSignal;
		timeoutMs?: number;
	} = {},
): Promise<ScanReviewSummaryPayload> {
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

export async function submitScanReviewAction(
	input: ScanReviewActionInput,
	options: {
		endpoint?: string;
		signal?: AbortSignal;
		timeoutMs?: number;
	} = {},
): Promise<ScanReviewActionPayload> {
	const request = createSignal(
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		options.signal,
	);

	try {
		const response = await fetch(
			options.endpoint ?? resolveScanReviewActionEndpoint(),
			{
				body: JSON.stringify(input),
				headers: {
					accept: "application/json",
					"content-type": "application/json",
				},
				method: "POST",
				signal: request.signal,
			},
		);

		return parseResponsePayload({
			invalidJsonMessage: "Scan-review action endpoint returned invalid JSON.",
			parser: parseScanReviewActionPayload,
			response,
			unexpectedPayloadMessage:
				"Scan-review action endpoint returned an unexpected payload.",
		});
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new ScanReviewClientError({
				cause: error,
				code: "timeout",
				message: "Scan-review action timed out before it responded.",
				state: "offline",
			});
		}

		if (error instanceof ScanReviewClientError) {
			throw error;
		}

		throw new ScanReviewClientError({
			cause: error,
			code: "offline",
			message:
				"Scan-review action endpoint is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export async function submitScanReviewCommand(
	input: ChatConsoleCommandInput,
	options: {
		signal?: AbortSignal;
	} = {},
): Promise<ChatConsoleCommandPayload> {
	try {
		return await submitChatConsoleCommand(input, {
			...(options.signal ? { signal: options.signal } : {}),
		});
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (error instanceof ChatConsoleClientError) {
			throw new ScanReviewClientError({
				cause: error,
				code: error.code,
				httpStatus: error.httpStatus,
				message: error.message,
				payload: error.payload
					? {
							error: {
								code: error.payload.error.code,
								message: error.payload.error.message,
							},
							ok: false,
							service: error.payload.service,
							sessionId: error.payload.sessionId,
							status:
								error.payload.status === "error" ? "error" : "bad-request",
						}
					: null,
				state: error.state,
			});
		}

		throw new ScanReviewClientError({
			cause: error,
			code: "offline",
			message:
				"Orchestration endpoint is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	}
}

export function isScanReviewAction(value: string): value is ScanReviewAction {
	return (SCAN_REVIEW_ACTION_VALUES as readonly string[]).includes(value);
}

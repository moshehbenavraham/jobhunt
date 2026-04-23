import {
	BATCH_WORKSPACE_ACTION_VALUES,
	BATCH_WORKSPACE_STATUS_FILTER_VALUES,
	type BatchWorkspaceAction,
	type BatchWorkspaceActionPayload,
	type BatchWorkspaceErrorPayload,
	type BatchWorkspaceStatusFilter,
	type BatchWorkspaceSummaryPayload,
	parseBatchWorkspaceActionPayload,
	parseBatchWorkspaceErrorPayload,
	parseBatchWorkspaceSummaryPayload,
} from "./batch-workspace-types";

const DEFAULT_BATCH_WORKSPACE_LIMIT = 12;
const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export const BATCH_WORKSPACE_FOCUS_EVENT =
	"jobhunt:batch-workspace-focus-change";

export type BatchWorkspaceFocus = {
	itemId: number | null;
	offset: number;
	status: BatchWorkspaceStatusFilter;
};

export type BatchWorkspaceActionInput =
	| {
			action: "merge-tracker-additions" | "verify-tracker-pipeline";
			itemId?: number;
	  }
	| {
			action: "resume-run-pending" | "retry-failed";
			itemId?: number;
			maxRetries?: number;
			minScore?: number;
			parallel?: number;
			startFromId?: number;
	  };

export class BatchWorkspaceClientError extends Error {
	code: string;
	httpStatus: number | null;
	payload: BatchWorkspaceErrorPayload | null;
	state: "error" | "offline";

	constructor(options: {
		cause?: unknown;
		code: string;
		httpStatus?: number | null;
		message: string;
		payload?: BatchWorkspaceErrorPayload | null;
		state: "error" | "offline";
	}) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.code = options.code;
		this.httpStatus = options.httpStatus ?? null;
		this.name = "BatchWorkspaceClientError";
		this.payload = options.payload ?? null;
		this.state = options.state;
	}
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

function readItemId(value: string | null): number | null {
	if (!value) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readOffset(value: string | null): number {
	if (!value) {
		return 0;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function readStatus(value: string | null): BatchWorkspaceStatusFilter {
	if (
		value &&
		BATCH_WORKSPACE_STATUS_FILTER_VALUES.includes(
			value as BatchWorkspaceStatusFilter,
		)
	) {
		return value as BatchWorkspaceStatusFilter;
	}

	return "all";
}

function mergeFocus(
	focus: Partial<BatchWorkspaceFocus> | undefined,
): BatchWorkspaceFocus {
	const currentFocus = readBatchWorkspaceFocusFromUrl();

	return {
		itemId: focus?.itemId !== undefined ? focus.itemId : currentFocus.itemId,
		offset: focus?.offset ?? currentFocus.offset,
		status: focus?.status ?? currentFocus.status,
	};
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
	if (!(error instanceof BatchWorkspaceClientError)) {
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
		throw new BatchWorkspaceClientError({
			cause: error,
			code: "invalid-json",
			httpStatus: response.status,
			message: "Batch workspace returned invalid data.",
			state: "error",
		});
	});

	try {
		return parser(rawPayload);
	} catch (_payloadError) {
		try {
			const errorPayload = parseBatchWorkspaceErrorPayload(rawPayload);

			throw new BatchWorkspaceClientError({
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
			if (parsedError instanceof BatchWorkspaceClientError) {
				throw parsedError;
			}

			throw new BatchWorkspaceClientError({
				cause: parsedError,
				code: "invalid-response",
				httpStatus: response.status,
				message: "Batch workspace returned unexpected data.",
				state: "error",
			});
		}
	}
}

function buildSummaryUrl(options: {
	endpoint?: string;
	focus?: Partial<BatchWorkspaceFocus>;
	limit?: number;
}): string {
	const endpoint = options.endpoint ?? resolveBatchWorkspaceEndpoint();
	const url = new URL(endpoint, window.location.origin);
	const focus = mergeFocus(options.focus);

	url.searchParams.set(
		"limit",
		String(options.limit ?? DEFAULT_BATCH_WORKSPACE_LIMIT),
	);

	if (focus.itemId !== null) {
		url.searchParams.set("itemId", String(focus.itemId));
	}

	if (focus.offset > 0) {
		url.searchParams.set("offset", String(focus.offset));
	}

	if (focus.status !== "all") {
		url.searchParams.set("status", focus.status);
	}

	if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
}

function buildActionPayload(
	input: BatchWorkspaceActionInput,
): Record<string, unknown> {
	switch (input.action) {
		case "merge-tracker-additions":
		case "verify-tracker-pipeline":
			return {
				action: input.action,
				...(input.itemId !== undefined ? { itemId: input.itemId } : {}),
			};
		case "resume-run-pending":
		case "retry-failed":
			return {
				action: input.action,
				...(input.itemId !== undefined ? { itemId: input.itemId } : {}),
				maxRetries: input.maxRetries ?? 2,
				minScore: input.minScore ?? 0,
				parallel: input.parallel ?? 1,
				startFromId: input.startFromId ?? 0,
			};
	}
}

async function fetchSummaryOnce(options: {
	endpoint?: string;
	focus?: Partial<BatchWorkspaceFocus>;
	limit?: number;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<BatchWorkspaceSummaryPayload> {
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

		return parseResponsePayload(response, parseBatchWorkspaceSummaryPayload);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new BatchWorkspaceClientError({
				cause: error,
				code: "timeout",
				message: "Batch workspace summary request timed out.",
				state: "offline",
			});
		}

		if (error instanceof BatchWorkspaceClientError) {
			throw error;
		}

		throw new BatchWorkspaceClientError({
			cause: error,
			code: "offline",
			message:
				"Batch workspace summary is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

async function submitActionOnce(options: {
	endpoint?: string;
	input: BatchWorkspaceActionInput;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<BatchWorkspaceActionPayload> {
	const request = createSignal(
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		options.signal,
	);

	try {
		const response = await fetch(
			options.endpoint ?? resolveBatchWorkspaceActionEndpoint(),
			{
				body: JSON.stringify(buildActionPayload(options.input)),
				headers: {
					accept: "application/json",
					"content-type": "application/json",
				},
				method: "POST",
				signal: request.signal,
			},
		);

		return parseResponsePayload(response, parseBatchWorkspaceActionPayload);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new BatchWorkspaceClientError({
				cause: error,
				code: "timeout",
				message: "Batch workspace action request timed out.",
				state: "offline",
			});
		}

		if (error instanceof BatchWorkspaceClientError) {
			throw error;
		}

		throw new BatchWorkspaceClientError({
			cause: error,
			code: "offline",
			message:
				"Batch workspace action is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export function resolveBatchWorkspaceEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/batch-supervisor`;
	}

	return "/api/batch-supervisor";
}

export function resolveBatchWorkspaceActionEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/batch-supervisor/action`;
	}

	return "/api/batch-supervisor/action";
}

export function readBatchWorkspaceFocusFromUrl(): BatchWorkspaceFocus {
	const url = new URL(window.location.href);

	return {
		itemId: readItemId(url.searchParams.get("batchItemId")),
		offset: readOffset(url.searchParams.get("batchOffset")),
		status: readStatus(url.searchParams.get("batchStatus")),
	};
}

export function syncBatchWorkspaceFocus(
	focus: Partial<BatchWorkspaceFocus>,
	options: {
		openSurface?: boolean;
		replace?: boolean;
	} = {},
): void {
	const nextFocus = mergeFocus(focus);
	const url = new URL(window.location.href);

	if (nextFocus.itemId !== null) {
		url.searchParams.set("batchItemId", String(nextFocus.itemId));
	} else {
		url.searchParams.delete("batchItemId");
	}

	if (nextFocus.offset > 0) {
		url.searchParams.set("batchOffset", String(nextFocus.offset));
	} else {
		url.searchParams.delete("batchOffset");
	}

	if (nextFocus.status === "all") {
		url.searchParams.delete("batchStatus");
	} else {
		url.searchParams.set("batchStatus", nextFocus.status);
	}

	if (options.openSurface) {
		url.hash = "#batch";
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

	window.dispatchEvent(new Event(BATCH_WORKSPACE_FOCUS_EVENT));
}

export async function fetchBatchWorkspaceSummary(
	options: {
		endpoint?: string;
		focus?: Partial<BatchWorkspaceFocus>;
		limit?: number;
		signal?: AbortSignal;
		timeoutMs?: number;
	} = {},
): Promise<BatchWorkspaceSummaryPayload> {
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

export async function submitBatchWorkspaceAction(options: {
	endpoint?: string;
	input: BatchWorkspaceActionInput;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<BatchWorkspaceActionPayload> {
	let lastError: unknown;

	for (const delayMs of RETRY_DELAYS_MS) {
		await waitForRetry(delayMs, options.signal);

		try {
			return await submitActionOnce(options);
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

export function isBatchWorkspaceAction(
	value: string,
): value is BatchWorkspaceAction {
	return (BATCH_WORKSPACE_ACTION_VALUES as readonly string[]).includes(value);
}

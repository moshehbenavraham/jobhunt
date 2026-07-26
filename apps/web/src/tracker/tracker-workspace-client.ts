import {
	parseTrackerWorkspaceActionPayload,
	parseTrackerWorkspaceErrorPayload,
	parseTrackerWorkspaceSummaryPayload,
	TRACKER_WORKSPACE_ACTION_VALUES,
	TRACKER_WORKSPACE_SORT_VALUES,
	type TrackerWorkspaceAction,
	type TrackerWorkspaceActionPayload,
	type TrackerWorkspaceErrorPayload,
	type TrackerWorkspaceSort,
	type TrackerWorkspaceSummaryPayload,
} from "./tracker-workspace-types";

const DEFAULT_TRACKER_WORKSPACE_LIMIT = 12;
const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export const TRACKER_WORKSPACE_FOCUS_EVENT =
	"jobhunt:tracker-workspace-focus-change";

export type TrackerWorkspaceFocus = {
	entryNumber: number | null;
	offset: number;
	reportNumber: string | null;
	search: string | null;
	sort: TrackerWorkspaceSort;
	status: string | null;
};

export type TrackerWorkspaceActionInput =
	| {
			action: "dedup-tracker-entries" | "normalize-tracker-statuses";
			dryRun?: boolean;
	  }
	| {
			action: "merge-tracker-additions" | "verify-tracker-pipeline";
	  }
	| {
			action: "update-status";
			entryNumber: number;
			status: string;
	  };

export class TrackerWorkspaceClientError extends Error {
	code: string;
	httpStatus: number | null;
	payload: TrackerWorkspaceErrorPayload | null;
	state: "error" | "offline";

	constructor(options: {
		cause?: unknown;
		code: string;
		httpStatus?: number | null;
		message: string;
		payload?: TrackerWorkspaceErrorPayload | null;
		state: "error" | "offline";
	}) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.code = options.code;
		this.httpStatus = options.httpStatus ?? null;
		this.name = "TrackerWorkspaceClientError";
		this.payload = options.payload ?? null;
		this.state = options.state;
	}
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

function readOffset(value: string | null): number {
	if (!value) {
		return 0;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function readEntryNumber(value: string | null): number | null {
	if (!value) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readReportNumber(value: string | null): string | null {
	if (!value) {
		return null;
	}

	return /^\d{3}$/.test(value) ? value : null;
}

function readSort(value: string | null): TrackerWorkspaceSort {
	if (
		value &&
		TRACKER_WORKSPACE_SORT_VALUES.includes(value as TrackerWorkspaceSort)
	) {
		return value as TrackerWorkspaceSort;
	}

	return "date";
}

function readStatus(value: string | null): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

function readSearch(value: string | null): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

function readSelection(value: {
	entryNumber: number | null;
	reportNumber: string | null;
}): {
	entryNumber: number | null;
	reportNumber: string | null;
} {
	if (value.entryNumber !== null) {
		return {
			entryNumber: value.entryNumber,
			reportNumber: null,
		};
	}

	return {
		entryNumber: null,
		reportNumber: value.reportNumber,
	};
}

function mergeFocus(
	focus: Partial<TrackerWorkspaceFocus> | undefined,
): TrackerWorkspaceFocus {
	const currentFocus = readTrackerWorkspaceFocusFromUrl();
	const nextSelection = readSelection({
		entryNumber:
			focus?.entryNumber !== undefined
				? focus.entryNumber
				: currentFocus.entryNumber,
		reportNumber:
			focus?.reportNumber !== undefined
				? focus.reportNumber
				: currentFocus.reportNumber,
	});

	return {
		...currentFocus,
		...focus,
		...nextSelection,
		offset: focus?.offset ?? currentFocus.offset,
		reportNumber: nextSelection.reportNumber,
		search: focus?.search !== undefined ? focus.search : currentFocus.search,
		sort: focus?.sort ?? currentFocus.sort,
		status: focus?.status !== undefined ? focus.status : currentFocus.status,
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
	if (!(error instanceof TrackerWorkspaceClientError)) {
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
		throw new TrackerWorkspaceClientError({
			cause: error,
			code: "invalid-json",
			httpStatus: response.status,
			message: "Tracker-workspace endpoint returned invalid JSON.",
			state: "error",
		});
	});

	try {
		return parser(rawPayload);
	} catch (_payloadError) {
		try {
			const errorPayload = parseTrackerWorkspaceErrorPayload(rawPayload);

			throw new TrackerWorkspaceClientError({
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
			if (parsedError instanceof TrackerWorkspaceClientError) {
				throw parsedError;
			}

			throw new TrackerWorkspaceClientError({
				cause: parsedError,
				code: "invalid-response",
				httpStatus: response.status,
				message: "Tracker-workspace endpoint returned an unexpected payload.",
				state: "error",
			});
		}
	}
}

function buildSummaryUrl(options: {
	endpoint?: string;
	focus?: Partial<TrackerWorkspaceFocus>;
	limit?: number;
}): string {
	const endpoint = options.endpoint ?? resolveTrackerWorkspaceEndpoint();
	const url = new URL(endpoint, window.location.origin);
	const focus = mergeFocus(options.focus);

	url.searchParams.set(
		"limit",
		String(options.limit ?? DEFAULT_TRACKER_WORKSPACE_LIMIT),
	);
	url.searchParams.set("sort", focus.sort);

	if (focus.offset > 0) {
		url.searchParams.set("offset", String(focus.offset));
	}

	if (focus.entryNumber !== null) {
		url.searchParams.set("entryNumber", String(focus.entryNumber));
	}

	if (focus.reportNumber) {
		url.searchParams.set("reportNumber", focus.reportNumber);
	}

	if (focus.search) {
		url.searchParams.set("search", focus.search);
	}

	if (focus.status) {
		url.searchParams.set("status", focus.status);
	}

	if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
}

function buildActionPayload(
	input: TrackerWorkspaceActionInput,
): Record<string, unknown> {
	switch (input.action) {
		case "dedup-tracker-entries":
		case "normalize-tracker-statuses":
			return {
				action: input.action,
				dryRun: input.dryRun ?? false,
			};
		case "merge-tracker-additions":
		case "verify-tracker-pipeline":
			return {
				action: input.action,
			};
		case "update-status":
			return {
				action: input.action,
				entryNumber: input.entryNumber,
				status: input.status,
			};
	}
}

async function fetchSummaryOnce(options: {
	endpoint?: string;
	focus?: Partial<TrackerWorkspaceFocus>;
	limit?: number;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<TrackerWorkspaceSummaryPayload> {
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

		return parseResponsePayload(response, parseTrackerWorkspaceSummaryPayload);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new TrackerWorkspaceClientError({
				cause: error,
				code: "timeout",
				message: "Tracker-workspace summary timed out before it responded.",
				state: "offline",
			});
		}

		if (error instanceof TrackerWorkspaceClientError) {
			throw error;
		}

		throw new TrackerWorkspaceClientError({
			cause: error,
			code: "offline",
			message:
				"Tracker-workspace summary endpoint is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

async function submitActionOnce(options: {
	endpoint?: string;
	input: TrackerWorkspaceActionInput;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<TrackerWorkspaceActionPayload> {
	const request = createSignal(
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		options.signal,
	);

	try {
		const response = await fetch(
			options.endpoint ?? resolveTrackerWorkspaceActionEndpoint(),
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

		return parseResponsePayload(response, parseTrackerWorkspaceActionPayload);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new TrackerWorkspaceClientError({
				cause: error,
				code: "timeout",
				message: "Tracker-workspace action timed out before it responded.",
				state: "offline",
			});
		}

		if (error instanceof TrackerWorkspaceClientError) {
			throw error;
		}

		throw new TrackerWorkspaceClientError({
			cause: error,
			code: "offline",
			message:
				"Tracker-workspace action endpoint is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export function resolveTrackerWorkspaceEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/tracker-workspace`;
	}

	return "/api/tracker-workspace";
}

export function resolveTrackerWorkspaceActionEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/tracker-workspace/action`;
	}

	return "/api/tracker-workspace/action";
}

export function readTrackerWorkspaceFocusFromUrl(): TrackerWorkspaceFocus {
	const url = new URL(window.location.href);

	return {
		...readSelection({
			entryNumber: readEntryNumber(url.searchParams.get("trackerEntry")),
			reportNumber: readReportNumber(
				url.searchParams.get("trackerReportNumber"),
			),
		}),
		offset: readOffset(url.searchParams.get("trackerOffset")),
		search: readSearch(url.searchParams.get("trackerSearch")),
		sort: readSort(url.searchParams.get("trackerSort")),
		status: readStatus(url.searchParams.get("trackerStatus")),
	};
}

export function syncTrackerWorkspaceFocus(
	focus: Partial<TrackerWorkspaceFocus>,
	options: {
		openSurface?: boolean;
		replace?: boolean;
	} = {},
): void {
	const nextFocus = mergeFocus(focus);
	const url = new URL(window.location.href);

	if (nextFocus.entryNumber !== null) {
		url.searchParams.set("trackerEntry", String(nextFocus.entryNumber));
		url.searchParams.delete("trackerReportNumber");
	} else {
		url.searchParams.delete("trackerEntry");

		if (nextFocus.reportNumber) {
			url.searchParams.set("trackerReportNumber", nextFocus.reportNumber);
		} else {
			url.searchParams.delete("trackerReportNumber");
		}
	}

	if (nextFocus.offset > 0) {
		url.searchParams.set("trackerOffset", String(nextFocus.offset));
	} else {
		url.searchParams.delete("trackerOffset");
	}

	if (nextFocus.search) {
		url.searchParams.set("trackerSearch", nextFocus.search);
	} else {
		url.searchParams.delete("trackerSearch");
	}

	if (nextFocus.sort === "date") {
		url.searchParams.delete("trackerSort");
	} else {
		url.searchParams.set("trackerSort", nextFocus.sort);
	}

	if (nextFocus.status) {
		url.searchParams.set("trackerStatus", nextFocus.status);
	} else {
		url.searchParams.delete("trackerStatus");
	}

	if (options.openSurface) {
		url.hash = "#tracker";
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

	window.dispatchEvent(new Event(TRACKER_WORKSPACE_FOCUS_EVENT));
}

export async function fetchTrackerWorkspaceSummary(
	options: {
		endpoint?: string;
		focus?: Partial<TrackerWorkspaceFocus>;
		limit?: number;
		signal?: AbortSignal;
		timeoutMs?: number;
	} = {},
): Promise<TrackerWorkspaceSummaryPayload> {
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

export async function submitTrackerWorkspaceAction(options: {
	endpoint?: string;
	input: TrackerWorkspaceActionInput;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<TrackerWorkspaceActionPayload> {
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

export function isTrackerWorkspaceAction(
	value: string,
): value is TrackerWorkspaceAction {
	return (TRACKER_WORKSPACE_ACTION_VALUES as readonly string[]).includes(value);
}

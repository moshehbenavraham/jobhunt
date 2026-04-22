import {
	normalizeSpecialistWorkspaceMode,
	normalizeSpecialistWorkspaceSessionId,
	parseSpecialistWorkspaceActionPayload,
	parseSpecialistWorkspaceErrorPayload,
	parseSpecialistWorkspaceSummaryPayload,
	SPECIALIST_WORKSPACE_MODE_QUERY_PARAM,
	SPECIALIST_WORKSPACE_SESSION_QUERY_PARAM,
	type SpecialistWorkspaceActionPayload,
	type SpecialistWorkspaceActionRequest,
	type SpecialistWorkspaceErrorPayload,
	type SpecialistWorkspaceMode,
	type SpecialistWorkspaceSummaryPayload,
} from "./specialist-workspace-types";

const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export const SPECIALIST_WORKSPACE_FOCUS_EVENT =
	"jobhunt:specialist-workspace-focus-change";

export type SpecialistWorkspaceFocus = {
	mode: SpecialistWorkspaceMode | null;
	sessionId: string | null;
};

export class SpecialistWorkspaceClientError extends Error {
	code: string;
	httpStatus: number | null;
	payload: SpecialistWorkspaceErrorPayload | null;
	state: "error" | "offline";

	constructor(options: {
		cause?: unknown;
		code: string;
		httpStatus?: number | null;
		message: string;
		payload?: SpecialistWorkspaceErrorPayload | null;
		state: "error" | "offline";
	}) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.code = options.code;
		this.httpStatus = options.httpStatus ?? null;
		this.name = "SpecialistWorkspaceClientError";
		this.payload = options.payload ?? null;
		this.state = options.state;
	}
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

function mergeFocus(
	focus: Partial<SpecialistWorkspaceFocus> | undefined,
): SpecialistWorkspaceFocus {
	const currentFocus = readSpecialistWorkspaceFocusFromUrl();

	return {
		mode: focus?.mode !== undefined ? focus.mode : currentFocus.mode,
		sessionId:
			focus?.sessionId !== undefined ? focus.sessionId : currentFocus.sessionId,
	};
}

export function resolveSpecialistWorkspaceEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/specialist-workspace`;
	}

	return "/api/specialist-workspace";
}

export function resolveSpecialistWorkspaceActionEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/specialist-workspace/action`;
	}

	return "/api/specialist-workspace/action";
}

export function readSpecialistWorkspaceFocusFromUrl(): SpecialistWorkspaceFocus {
	const url = new URL(window.location.href);

	return {
		mode: normalizeSpecialistWorkspaceMode(
			url.searchParams.get(SPECIALIST_WORKSPACE_MODE_QUERY_PARAM),
		),
		sessionId: normalizeSpecialistWorkspaceSessionId(
			url.searchParams.get(SPECIALIST_WORKSPACE_SESSION_QUERY_PARAM),
		),
	};
}

export function syncSpecialistWorkspaceFocus(
	focus: Partial<SpecialistWorkspaceFocus>,
	options: {
		notify?: boolean;
		openSurface?: boolean;
		replace?: boolean;
	} = {},
): void {
	const nextFocus = mergeFocus(focus);
	const url = new URL(window.location.href);

	if (nextFocus.mode) {
		url.searchParams.set(SPECIALIST_WORKSPACE_MODE_QUERY_PARAM, nextFocus.mode);
	} else {
		url.searchParams.delete(SPECIALIST_WORKSPACE_MODE_QUERY_PARAM);
	}

	if (nextFocus.sessionId) {
		url.searchParams.set(
			SPECIALIST_WORKSPACE_SESSION_QUERY_PARAM,
			nextFocus.sessionId,
		);
	} else {
		url.searchParams.delete(SPECIALIST_WORKSPACE_SESSION_QUERY_PARAM);
	}

	if (options.openSurface) {
		url.hash = "#workflows";
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

	if (options.notify !== false) {
		window.dispatchEvent(new Event(SPECIALIST_WORKSPACE_FOCUS_EVENT));
	}
}

export function openSpecialistWorkspaceSurface(
	focus: Partial<SpecialistWorkspaceFocus>,
	options: {
		replace?: boolean;
	} = {},
): void {
	syncSpecialistWorkspaceFocus(focus, {
		openSurface: true,
		...(options.replace !== undefined ? { replace: options.replace } : {}),
	});
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
	if (!(error instanceof SpecialistWorkspaceClientError)) {
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
		throw new SpecialistWorkspaceClientError({
			cause: error,
			code: "invalid-json",
			httpStatus: response.status,
			message: "Specialist workspace endpoint returned invalid JSON.",
			state: "error",
		});
	});

	try {
		return parser(rawPayload);
	} catch (_payloadError) {
		try {
			const errorPayload = parseSpecialistWorkspaceErrorPayload(rawPayload);

			throw new SpecialistWorkspaceClientError({
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
			if (parsedError instanceof SpecialistWorkspaceClientError) {
				throw parsedError;
			}

			throw new SpecialistWorkspaceClientError({
				cause: parsedError,
				code: "invalid-response",
				httpStatus: response.status,
				message:
					"Specialist workspace endpoint returned an unexpected payload.",
				state: "error",
			});
		}
	}
}

function buildSummaryUrl(options: {
	endpoint?: string;
	focus?: Partial<SpecialistWorkspaceFocus>;
}): string {
	const endpoint = options.endpoint ?? resolveSpecialistWorkspaceEndpoint();
	const url = new URL(endpoint, window.location.origin);
	const focus = mergeFocus(options.focus);

	if (focus.mode) {
		url.searchParams.set("mode", focus.mode);
	}

	if (focus.sessionId) {
		url.searchParams.set("sessionId", focus.sessionId);
	}

	if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
}

async function fetchSummaryOnce(options: {
	endpoint?: string;
	focus?: Partial<SpecialistWorkspaceFocus>;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<SpecialistWorkspaceSummaryPayload> {
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
			parseSpecialistWorkspaceSummaryPayload,
		);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new SpecialistWorkspaceClientError({
				cause: error,
				code: "timeout",
				message: "Specialist workspace summary timed out before it responded.",
				state: "offline",
			});
		}

		if (isAbortError(error)) {
			throw error;
		}

		if (error instanceof SpecialistWorkspaceClientError) {
			throw error;
		}

		throw new SpecialistWorkspaceClientError({
			cause: error,
			code: "network-error",
			message:
				"Could not reach the specialist workspace summary endpoint right now.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export async function fetchSpecialistWorkspaceSummary(
	options: {
		endpoint?: string;
		focus?: Partial<SpecialistWorkspaceFocus>;
		signal?: AbortSignal;
		timeoutMs?: number;
	} = {},
): Promise<SpecialistWorkspaceSummaryPayload> {
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
		: new SpecialistWorkspaceClientError({
				code: "unknown-client-error",
				message: "Specialist workspace summary request failed.",
				state: "error",
			});
}

function buildActionBody(
	input: SpecialistWorkspaceActionRequest,
): SpecialistWorkspaceActionRequest {
	if (input.action === "resume") {
		return {
			action: "resume",
			sessionId: normalizeSpecialistWorkspaceSessionId(input.sessionId) ?? "",
		};
	}

	return {
		action: "launch",
		...(input.context !== undefined ? { context: input.context } : {}),
		mode: input.mode,
		...(normalizeSpecialistWorkspaceSessionId(input.sessionId)
			? {
					sessionId:
						normalizeSpecialistWorkspaceSessionId(input.sessionId) ?? "",
				}
			: {}),
	};
}

async function submitActionOnce(options: {
	endpoint?: string;
	input: SpecialistWorkspaceActionRequest;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<SpecialistWorkspaceActionPayload> {
	const request = createSignal(
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		options.signal,
	);

	try {
		const response = await fetch(
			options.endpoint ?? resolveSpecialistWorkspaceActionEndpoint(),
			{
				body: JSON.stringify(buildActionBody(options.input)),
				headers: {
					accept: "application/json",
					"content-type": "application/json",
				},
				method: "POST",
				signal: request.signal,
			},
		);

		return parseResponsePayload(
			response,
			parseSpecialistWorkspaceActionPayload,
		);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new SpecialistWorkspaceClientError({
				cause: error,
				code: "timeout",
				message: "Specialist workspace action timed out before it responded.",
				state: "offline",
			});
		}

		if (isAbortError(error)) {
			throw error;
		}

		if (error instanceof SpecialistWorkspaceClientError) {
			throw error;
		}

		throw new SpecialistWorkspaceClientError({
			cause: error,
			code: "network-error",
			message: "Could not reach the specialist workspace action endpoint.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

export async function submitSpecialistWorkspaceAction(options: {
	endpoint?: string;
	input: SpecialistWorkspaceActionRequest;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<SpecialistWorkspaceActionPayload> {
	let lastError: unknown = null;

	for (const delayMs of RETRY_DELAYS_MS) {
		if (delayMs > 0) {
			await waitForRetry(delayMs, options.signal);
		}

		try {
			return await submitActionOnce(options);
		} catch (error) {
			lastError = error;

			if (options.signal?.aborted || !shouldRetry(error)) {
				throw error;
			}
		}
	}

	throw lastError instanceof Error
		? lastError
		: new SpecialistWorkspaceClientError({
				code: "unknown-client-error",
				message: "Specialist workspace action failed.",
				state: "error",
			});
}

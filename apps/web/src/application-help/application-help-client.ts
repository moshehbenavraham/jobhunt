import {
	ChatConsoleClientError,
	type ChatConsoleCommandInput,
	submitChatConsoleCommand,
} from "../chat/chat-console-client";
import type { ChatConsoleCommandPayload } from "../chat/chat-console-types";
import {
	APPLICATION_HELP_SESSION_QUERY_PARAM,
	type ApplicationHelpErrorPayload,
	type ApplicationHelpFocus,
	type ApplicationHelpSummaryPayload,
	normalizeApplicationHelpSessionId,
	parseApplicationHelpErrorPayload,
	parseApplicationHelpSummaryPayload,
} from "./application-help-types";

const DEFAULT_TIMEOUT_MS = 4_000;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

export const APPLICATION_HELP_FOCUS_EVENT =
	"jobhunt:application-help-focus-change";

export type ApplicationHelpCommandInput =
	| {
			kind: "launch";
			promptText: string | null;
	  }
	| {
			kind: "resume";
			sessionId: string;
	  };

export class ApplicationHelpClientError extends Error {
	code: string;
	httpStatus: number | null;
	payload: ApplicationHelpErrorPayload | null;
	state: "error" | "offline";

	constructor(options: {
		cause?: unknown;
		code: string;
		httpStatus?: number | null;
		message: string;
		payload?: ApplicationHelpErrorPayload | null;
		state: "error" | "offline";
	}) {
		super(
			options.message,
			options.cause ? { cause: options.cause } : undefined,
		);
		this.code = options.code;
		this.httpStatus = options.httpStatus ?? null;
		this.name = "ApplicationHelpClientError";
		this.payload = options.payload ?? null;
		this.state = options.state;
	}
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

function mergeFocus(
	focus: Partial<ApplicationHelpFocus> | undefined,
): ApplicationHelpFocus {
	const currentFocus = readApplicationHelpFocusFromUrl();

	return {
		sessionId:
			focus?.sessionId !== undefined ? focus.sessionId : currentFocus.sessionId,
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
	if (!(error instanceof ApplicationHelpClientError)) {
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
		throw new ApplicationHelpClientError({
			cause: error,
			code: "invalid-json",
			httpStatus: response.status,
			message: "Application-help endpoint returned invalid JSON.",
			state: "error",
		});
	});

	try {
		return parser(rawPayload);
	} catch (_payloadError) {
		try {
			const errorPayload = parseApplicationHelpErrorPayload(rawPayload);

			throw new ApplicationHelpClientError({
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
			if (parsedError instanceof ApplicationHelpClientError) {
				throw parsedError;
			}

			throw new ApplicationHelpClientError({
				cause: parsedError,
				code: "invalid-response",
				httpStatus: response.status,
				message: "Application-help endpoint returned an unexpected payload.",
				state: "error",
			});
		}
	}
}

function buildSummaryUrl(options: {
	endpoint?: string;
	focus?: Partial<ApplicationHelpFocus>;
}): string {
	const endpoint = options.endpoint ?? resolveApplicationHelpEndpoint();
	const url = new URL(endpoint, window.location.origin);
	const focus = mergeFocus(options.focus);

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
	focus?: Partial<ApplicationHelpFocus>;
	signal?: AbortSignal;
	timeoutMs?: number;
}): Promise<ApplicationHelpSummaryPayload> {
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

		return parseResponsePayload(response, parseApplicationHelpSummaryPayload);
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (request.didTimeout()) {
			throw new ApplicationHelpClientError({
				cause: error,
				code: "timeout",
				message: "Application-help summary timed out before it responded.",
				state: "offline",
			});
		}

		if (error instanceof ApplicationHelpClientError) {
			throw error;
		}

		throw new ApplicationHelpClientError({
			cause: error,
			code: "offline",
			message:
				"Application-help summary endpoint is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	} finally {
		request.cleanup();
	}
}

function toChatCommandInput(
	input: ApplicationHelpCommandInput,
): ChatConsoleCommandInput {
	if (input.kind === "resume") {
		return {
			kind: "resume",
			sessionId: input.sessionId,
		};
	}

	return {
		context: input.promptText
			? {
					promptText: input.promptText,
				}
			: null,
		kind: "launch",
		sessionId: null,
		workflow: "application-help",
	};
}

export function resolveApplicationHelpEndpoint(): string {
	const configuredOrigin = import.meta.env.VITE_JOBHUNT_API_ORIGIN?.trim();

	if (configuredOrigin) {
		return `${trimTrailingSlash(configuredOrigin)}/application-help`;
	}

	return "/api/application-help";
}

export function readApplicationHelpFocusFromUrl(): ApplicationHelpFocus {
	const url = new URL(window.location.href);

	return {
		sessionId: normalizeApplicationHelpSessionId(
			url.searchParams.get(APPLICATION_HELP_SESSION_QUERY_PARAM),
		),
	};
}

export function syncApplicationHelpFocus(
	focus: Partial<ApplicationHelpFocus>,
	options: {
		openSurface?: boolean;
		replace?: boolean;
	} = {},
): void {
	const nextFocus = mergeFocus(focus);
	const url = new URL(window.location.href);

	if (nextFocus.sessionId) {
		url.searchParams.set(
			APPLICATION_HELP_SESSION_QUERY_PARAM,
			nextFocus.sessionId,
		);
	} else {
		url.searchParams.delete(APPLICATION_HELP_SESSION_QUERY_PARAM);
	}

	if (options.openSurface) {
		url.hash = "#application-help";
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

	window.dispatchEvent(new Event(APPLICATION_HELP_FOCUS_EVENT));
}

export async function fetchApplicationHelpSummary(
	options: {
		endpoint?: string;
		focus?: Partial<ApplicationHelpFocus>;
		signal?: AbortSignal;
		timeoutMs?: number;
	} = {},
): Promise<ApplicationHelpSummaryPayload> {
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

export async function submitApplicationHelpCommand(
	input: ApplicationHelpCommandInput,
	options: {
		signal?: AbortSignal;
	} = {},
): Promise<ChatConsoleCommandPayload> {
	try {
		return await submitChatConsoleCommand(toChatCommandInput(input), {
			...(options.signal ? { signal: options.signal } : {}),
		});
	} catch (error) {
		if (options.signal?.aborted && isAbortError(error)) {
			throw error;
		}

		if (error instanceof ChatConsoleClientError) {
			throw new ApplicationHelpClientError({
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

		throw new ApplicationHelpClientError({
			cause: error,
			code: "offline",
			message:
				"Orchestration endpoint is unavailable. Start the local API server and try again.",
			state: "offline",
		});
	}
}

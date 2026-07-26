import {
	startTransition,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import type { StartupStatus } from "../boot/startup-types";
import {
	APPLICATION_HELP_FOCUS_EVENT,
	ApplicationHelpClientError,
	type ApplicationHelpCommandInput,
	fetchApplicationHelpSummary,
	readApplicationHelpFocusFromUrl,
	submitApplicationHelpCommand,
	syncApplicationHelpFocus,
} from "./application-help-client";
import type {
	ApplicationHelpFocus,
	ApplicationHelpSummaryPayload,
} from "./application-help-types";

const POLL_INTERVAL_MS = 4_000;

export type ApplicationHelpViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| StartupStatus;

export type ApplicationHelpPendingAction =
	| {
			kind: "launch";
			sessionId: null;
	  }
	| {
			kind: "resume";
			sessionId: string;
	  }
	| null;

export type ApplicationHelpNotice = {
	kind: "info" | "success" | "warn";
	message: string;
} | null;

export type ApplicationHelpState = {
	data: ApplicationHelpSummaryPayload | null;
	draftInput: string;
	error: ApplicationHelpClientError | null;
	focus: ApplicationHelpFocus;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	notice: ApplicationHelpNotice;
	pendingAction: ApplicationHelpPendingAction;
	status: ApplicationHelpViewStatus;
};

function createEmptyState(): ApplicationHelpState {
	return {
		data: null,
		draftInput: "",
		error: null,
		focus: readApplicationHelpFocusFromUrl(),
		isRefreshing: false,
		lastUpdatedAt: null,
		notice: null,
		pendingAction: null,
		status: "empty",
	};
}

function toApplicationHelpClientError(
	error: unknown,
): ApplicationHelpClientError {
	if (error instanceof ApplicationHelpClientError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new ApplicationHelpClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

function focusEquals(
	left: ApplicationHelpFocus,
	right: ApplicationHelpFocus,
): boolean {
	return left.sessionId === right.sessionId;
}

function getSelectedSessionId(
	payload: ApplicationHelpSummaryPayload | null,
): string | null {
	return payload?.selected.summary?.session.sessionId ?? null;
}

function hasPollingWork(
	payload: ApplicationHelpSummaryPayload | null,
): boolean {
	const summary = payload?.selected.summary ?? null;

	if (!summary) {
		return false;
	}

	if (
		summary.approval?.status === "pending" ||
		summary.job?.status === "queued" ||
		summary.job?.status === "running" ||
		summary.job?.status === "waiting"
	) {
		return true;
	}

	return (
		summary.session.status === "pending" ||
		summary.session.status === "running" ||
		summary.session.status === "waiting"
	);
}

function createCommandNotice(input: {
	command: ApplicationHelpCommandInput;
	message: string;
	pendingApprovalId: string | null;
	routeStatus: string | null;
	sessionId: string | null;
}): ApplicationHelpNotice {
	if (input.routeStatus === "tooling-gap") {
		return {
			kind: "warn",
			message: input.message,
		};
	}

	if (input.pendingApprovalId !== null) {
		return {
			kind: "warn",
			message: input.message,
		};
	}

	if (input.command.kind === "resume") {
		return {
			kind: "info",
			message: input.message,
		};
	}

	if (input.sessionId !== null) {
		return {
			kind: "success",
			message: input.message,
		};
	}

	return {
		kind: "info",
		message: input.message,
	};
}

function normalizeCommandInput(
	input: ApplicationHelpCommandInput,
): ApplicationHelpCommandInput | null {
	if (input.kind === "resume") {
		return input.sessionId.trim()
			? {
					kind: "resume",
					sessionId: input.sessionId.trim(),
				}
			: null;
	}

	const promptText = input.promptText?.trim() ?? "";

	if (!promptText) {
		return null;
	}

	return {
		kind: "launch",
		promptText,
	};
}

export function useApplicationHelp(): {
	clearNotice: () => void;
	launch: () => void;
	refresh: () => void;
	resumeSelected: () => void;
	selectSession: (sessionId: string | null) => void;
	setDraftInput: (value: string) => void;
	state: ApplicationHelpState;
} {
	const abortRef = useRef<AbortController | null>(null);
	const requestIdRef = useRef(0);
	const [state, setState] = useState<ApplicationHelpState>(createEmptyState);

	const loadSummary = useEffectEvent(
		async (
			reason: "action" | "focus" | "mount" | "online" | "refresh" | "select",
			focus: ApplicationHelpFocus = state.focus,
			nextNotice: ApplicationHelpNotice | undefined = undefined,
		) => {
			requestIdRef.current += 1;
			const requestId = requestIdRef.current;

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			startTransition(() => {
				setState((previous) => {
					if (
						(reason === "action" ||
							reason === "refresh" ||
							reason === "select") &&
						previous.data
					) {
						return {
							...previous,
							error: null,
							focus,
							isRefreshing: true,
							notice:
								nextNotice !== undefined
									? nextNotice
									: reason === "select"
										? null
										: previous.notice,
						};
					}

					return {
						...previous,
						error: null,
						focus,
						isRefreshing: false,
						notice:
							nextNotice !== undefined
								? nextNotice
								: reason === "focus" || reason === "select"
									? null
									: previous.notice,
						status: "loading",
					};
				});
			});

			try {
				const payload = await fetchApplicationHelpSummary({
					focus,
					signal: controller.signal,
				});

				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const selectedSessionId = getSelectedSessionId(payload);
				const recoveryNotice =
					focus.sessionId !== null && payload.selected.state === "missing"
						? {
								kind: "warn" as const,
								message: payload.selected.message,
							}
						: nextNotice;

				startTransition(() => {
					setState((previous) => ({
						...previous,
						data: payload,
						error: null,
						focus,
						isRefreshing: false,
						lastUpdatedAt: new Date().toISOString(),
						notice:
							recoveryNotice !== undefined ? recoveryNotice : previous.notice,
						pendingAction: null,
						status: payload.status,
					}));
				});

				if (focus.sessionId !== null && payload.selected.state === "missing") {
					syncApplicationHelpFocus(
						{
							sessionId: null,
						},
						{
							replace: true,
						},
					);
					return;
				}

				if (selectedSessionId && selectedSessionId !== focus.sessionId) {
					syncApplicationHelpFocus(
						{
							sessionId: selectedSessionId,
						},
						{
							replace: true,
						},
					);
				}
			} catch (error) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const clientError = toApplicationHelpClientError(error);

				startTransition(() => {
					setState((previous) => ({
						...previous,
						data: previous.data,
						error: clientError,
						focus,
						isRefreshing: false,
						notice: nextNotice !== undefined ? nextNotice : previous.notice,
						pendingAction: null,
						status: clientError.state,
					}));
				});
			}
		},
	);

	const handleFocusChange = useEffectEvent(() => {
		const nextFocus = readApplicationHelpFocusFromUrl();

		if (focusEquals(nextFocus, state.focus)) {
			return;
		}

		void loadSummary("focus", nextFocus);
	});

	const handleOnline = useEffectEvent(() => {
		if (state.status === "offline") {
			void loadSummary("online");
		}
	});

	useEffect(() => {
		void loadSummary("mount");

		window.addEventListener(APPLICATION_HELP_FOCUS_EVENT, handleFocusChange);
		window.addEventListener("hashchange", handleFocusChange);
		window.addEventListener("online", handleOnline);
		window.addEventListener("popstate", handleFocusChange);

		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
			window.removeEventListener(
				APPLICATION_HELP_FOCUS_EVENT,
				handleFocusChange,
			);
			window.removeEventListener("hashchange", handleFocusChange);
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("popstate", handleFocusChange);
		};
	}, []);

	useEffect(() => {
		if (!hasPollingWork(state.data)) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void loadSummary("refresh");
		}, POLL_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [state.data]);

	const runCommand = useEffectEvent(
		async (input: ApplicationHelpCommandInput) => {
			const normalizedInput = normalizeCommandInput(input);

			if (
				normalizedInput === null ||
				state.pendingAction !== null ||
				state.isRefreshing ||
				state.status === "loading"
			) {
				return;
			}

			const pendingAction: ApplicationHelpPendingAction =
				normalizedInput.kind === "resume"
					? {
							kind: "resume",
							sessionId: normalizedInput.sessionId,
						}
					: {
							kind: "launch",
							sessionId: null,
						};

			startTransition(() => {
				setState((previous) => ({
					...previous,
					error: null,
					pendingAction,
				}));
			});

			try {
				const payload = await submitApplicationHelpCommand(normalizedInput);
				const sessionId =
					payload.handoff.selectedSession?.session.sessionId ??
					payload.handoff.session?.sessionId ??
					null;
				const nextNotice = createCommandNotice({
					command: normalizedInput,
					message: payload.handoff.message,
					pendingApprovalId:
						payload.handoff.pendingApproval?.approvalId ?? null,
					routeStatus: payload.handoff.route.status,
					sessionId,
				});

				if (sessionId === null) {
					startTransition(() => {
						setState((previous) => ({
							...previous,
							notice: nextNotice,
							pendingAction: null,
						}));
					});
					return;
				}

				if (normalizedInput.kind === "launch") {
					startTransition(() => {
						setState((previous) => ({
							...previous,
							draftInput: "",
						}));
					});
				}

				syncApplicationHelpFocus(
					{
						sessionId,
					},
					{
						openSurface: true,
					},
				);

				void loadSummary(
					"action",
					{
						sessionId,
					},
					nextNotice,
				);
			} catch (error) {
				const clientError = toApplicationHelpClientError(error);

				startTransition(() => {
					setState((previous) => ({
						...previous,
						error: clientError,
						pendingAction: null,
						status: clientError.state,
					}));
				});
			}
		},
	);

	return {
		clearNotice: () => {
			startTransition(() => {
				setState((previous) => ({
					...previous,
					notice: null,
				}));
			});
		},
		launch: () => {
			void runCommand({
				kind: "launch",
				promptText: state.draftInput,
			});
		},
		refresh: () => {
			if (state.isRefreshing || state.status === "loading") {
				return;
			}

			void loadSummary("refresh");
		},
		resumeSelected: () => {
			const summary = state.data?.selected.summary ?? null;
			const sessionId = summary?.session.sessionId ?? state.focus.sessionId;
			const resumeAllowed =
				summary?.nextReview.resumeAllowed ??
				summary?.session.resumeAllowed ??
				false;

			if (!sessionId || !resumeAllowed) {
				return;
			}

			void runCommand({
				kind: "resume",
				sessionId,
			});
		},
		selectSession: (sessionId) => {
			const normalizedSessionId = sessionId?.trim() || null;

			if (normalizedSessionId === state.focus.sessionId) {
				return;
			}

			syncApplicationHelpFocus(
				{
					sessionId: normalizedSessionId,
				},
				{
					openSurface: true,
				},
			);
		},
		setDraftInput: (value) => {
			startTransition(() => {
				setState((previous) => ({
					...previous,
					draftInput: value,
				}));
			});
		},
		state,
	};
}

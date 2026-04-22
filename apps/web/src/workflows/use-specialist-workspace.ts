import {
	startTransition,
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import type { StartupStatus } from "../boot/startup-types";
import {
	fetchSpecialistWorkspaceSummary,
	readSpecialistWorkspaceFocusFromUrl,
	SPECIALIST_WORKSPACE_FOCUS_EVENT,
	SpecialistWorkspaceClientError,
	type SpecialistWorkspaceFocus,
	submitSpecialistWorkspaceAction,
	syncSpecialistWorkspaceFocus,
} from "./specialist-workspace-client";
import type {
	SpecialistWorkspaceActionPayload,
	SpecialistWorkspaceActionRequest,
	SpecialistWorkspaceMode,
	SpecialistWorkspaceSummaryPayload,
} from "./specialist-workspace-types";

const POLL_INTERVAL_MS = 4_000;

export type SpecialistWorkspaceViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| StartupStatus;

export type SpecialistWorkspaceNotice = {
	kind: "info" | "success" | "warn";
	message: string;
} | null;

export type SpecialistWorkspacePendingAction = {
	action: SpecialistWorkspaceActionRequest["action"];
	mode: SpecialistWorkspaceMode | null;
	sessionId: string | null;
} | null;

export type SpecialistWorkspaceState = {
	data: SpecialistWorkspaceSummaryPayload | null;
	error: SpecialistWorkspaceClientError | null;
	focus: SpecialistWorkspaceFocus;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	notice: SpecialistWorkspaceNotice;
	pendingAction: SpecialistWorkspacePendingAction;
	status: SpecialistWorkspaceViewStatus;
};

function createEmptyState(): SpecialistWorkspaceState {
	return {
		data: null,
		error: null,
		focus: readSpecialistWorkspaceFocusFromUrl(),
		isRefreshing: false,
		lastUpdatedAt: null,
		notice: null,
		pendingAction: null,
		status: "empty",
	};
}

function toClientError(error: unknown): SpecialistWorkspaceClientError {
	if (error instanceof SpecialistWorkspaceClientError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new SpecialistWorkspaceClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

function focusEquals(
	left: SpecialistWorkspaceFocus,
	right: SpecialistWorkspaceFocus,
): boolean {
	return left.mode === right.mode && left.sessionId === right.sessionId;
}

function getSelectedMode(
	payload: SpecialistWorkspaceSummaryPayload | null,
): SpecialistWorkspaceMode | null {
	return (
		payload?.selected.summary?.handoff.mode ??
		payload?.workflows.find((workflow) => workflow.selected)?.handoff.mode ??
		null
	);
}

function hasPollingWork(
	payload: SpecialistWorkspaceSummaryPayload | null,
): boolean {
	const selected = payload?.selected.summary ?? null;

	if (!selected) {
		return false;
	}

	if (selected.approval?.status === "pending") {
		return true;
	}

	if (
		selected.job &&
		["pending", "queued", "running", "waiting"].includes(selected.job.status)
	) {
		return true;
	}

	if (
		selected.session &&
		["pending", "running", "waiting"].includes(selected.session.status)
	) {
		return true;
	}

	return selected.run.state === "running" || selected.run.state === "waiting";
}

function createActionNotice(
	payload: SpecialistWorkspaceActionPayload,
): SpecialistWorkspaceNotice {
	if (
		payload.actionResult.warnings.length > 0 ||
		payload.actionResult.state === "blocked" ||
		payload.actionResult.state === "degraded" ||
		payload.actionResult.state === "missing-session"
	) {
		return {
			kind: "warn",
			message: payload.actionResult.message,
		};
	}

	if (
		payload.actionResult.state === "completed" ||
		payload.actionResult.action === "resume"
	) {
		return {
			kind: "info",
			message: payload.actionResult.message,
		};
	}

	return {
		kind: "success",
		message: payload.actionResult.message,
	};
}

function buildRecoveryFocus(
	focus: SpecialistWorkspaceFocus,
	payload: SpecialistWorkspaceSummaryPayload,
): SpecialistWorkspaceFocus {
	return {
		mode:
			payload.selected.summary?.handoff.mode ??
			focus.mode ??
			getSelectedMode(payload),
		sessionId: null,
	};
}

function buildNextFocus(
	input: SpecialistWorkspaceActionRequest,
	payload: SpecialistWorkspaceActionPayload,
	state: SpecialistWorkspaceState,
): SpecialistWorkspaceFocus {
	const fallbackMode =
		input.action === "launch"
			? input.mode
			: (state.data?.selected.summary?.handoff.mode ?? state.focus.mode);
	const nextMode = payload.actionResult.mode ?? fallbackMode ?? null;

	return {
		mode: nextMode,
		sessionId:
			payload.actionResult.state === "missing-session"
				? null
				: payload.actionResult.sessionId,
	};
}

export function useSpecialistWorkspace(): {
	clearNotice: () => void;
	clearSelection: () => void;
	launchMode: (mode: SpecialistWorkspaceMode) => void;
	refresh: () => void;
	resumeSelected: () => void;
	selectMode: (mode: SpecialistWorkspaceMode) => void;
	state: SpecialistWorkspaceState;
} {
	const abortRef = useRef<AbortController | null>(null);
	const requestIdRef = useRef(0);
	const revalidationTimeoutRef = useRef<number | null>(null);
	const [state, setState] =
		useState<SpecialistWorkspaceState>(createEmptyState);

	const clearScheduledRevalidation = useCallback(() => {
		if (revalidationTimeoutRef.current !== null) {
			window.clearTimeout(revalidationTimeoutRef.current);
			revalidationTimeoutRef.current = null;
		}
	}, []);

	const loadSummary = useEffectEvent(
		async (
			reason: "action" | "focus" | "mount" | "online" | "refresh",
			focus: SpecialistWorkspaceFocus = state.focus,
			nextNotice: SpecialistWorkspaceNotice | undefined = undefined,
		) => {
			clearScheduledRevalidation();
			requestIdRef.current += 1;
			const requestId = requestIdRef.current;

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			startTransition(() => {
				setState((previous) => {
					if ((reason === "action" || reason === "refresh") && previous.data) {
						return {
							...previous,
							error: null,
							focus,
							isRefreshing: true,
							notice: nextNotice !== undefined ? nextNotice : previous.notice,
						};
					}

					return {
						...previous,
						error: null,
						focus,
						isRefreshing: false,
						notice: nextNotice !== undefined ? nextNotice : previous.notice,
						status: "loading",
					};
				});
			});

			try {
				const payload = await fetchSpecialistWorkspaceSummary({
					focus,
					signal: controller.signal,
				});

				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const recoveryNotice =
					focus.sessionId && payload.selected.state === "missing"
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

				if (focus.sessionId && payload.selected.state === "missing") {
					syncSpecialistWorkspaceFocus(buildRecoveryFocus(focus, payload), {
						replace: true,
					});
				}
			} catch (error) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const clientError = toClientError(error);

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
		const nextFocus = readSpecialistWorkspaceFocusFromUrl();

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

	const runAction = useEffectEvent(
		async (input: SpecialistWorkspaceActionRequest) => {
			if (
				state.pendingAction !== null ||
				state.isRefreshing ||
				state.status === "loading"
			) {
				return;
			}

			const pendingAction: SpecialistWorkspacePendingAction = {
				action: input.action,
				mode: input.action === "launch" ? input.mode : state.focus.mode,
				sessionId:
					input.action === "launch"
						? (input.sessionId ?? null)
						: input.sessionId,
			};

			startTransition(() => {
				setState((previous) => ({
					...previous,
					error: null,
					pendingAction,
				}));
			});

			try {
				const payload = await submitSpecialistWorkspaceAction({
					input,
				});
				const nextFocus = buildNextFocus(input, payload, state);
				const nextNotice = createActionNotice(payload);

				syncSpecialistWorkspaceFocus(nextFocus, {
					replace: false,
				});

				void loadSummary("action", nextFocus, nextNotice);

				if (
					payload.actionResult.nextPollMs !== null &&
					payload.actionResult.state === "ready"
				) {
					revalidationTimeoutRef.current = window.setTimeout(() => {
						revalidationTimeoutRef.current = null;
						void loadSummary("refresh", nextFocus);
					}, payload.actionResult.nextPollMs);
				}
			} catch (error) {
				const clientError = toClientError(error);

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

	useEffect(() => {
		void loadSummary("mount");

		window.addEventListener(
			SPECIALIST_WORKSPACE_FOCUS_EVENT,
			handleFocusChange,
		);
		window.addEventListener("hashchange", handleFocusChange);
		window.addEventListener("online", handleOnline);
		window.addEventListener("popstate", handleFocusChange);

		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
			clearScheduledRevalidation();
			window.removeEventListener(
				SPECIALIST_WORKSPACE_FOCUS_EVENT,
				handleFocusChange,
			);
			window.removeEventListener("hashchange", handleFocusChange);
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("popstate", handleFocusChange);
		};
	}, [clearScheduledRevalidation]);

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

	return {
		clearNotice: () => {
			startTransition(() => {
				setState((previous) => ({
					...previous,
					notice: null,
				}));
			});
		},
		clearSelection: () => {
			syncSpecialistWorkspaceFocus({
				mode: null,
				sessionId: null,
			});
		},
		launchMode: (mode) => {
			const selectedSummary = state.data?.selected.summary ?? null;
			const selectedSessionId =
				selectedSummary?.handoff.mode === mode
					? (selectedSummary.session?.sessionId ?? state.focus.sessionId)
					: null;

			void runAction({
				action: "launch",
				mode,
				...(selectedSessionId ? { sessionId: selectedSessionId } : {}),
			});
		},
		refresh: () => {
			if (state.isRefreshing || state.status === "loading") {
				return;
			}

			void loadSummary("refresh");
		},
		resumeSelected: () => {
			const sessionId =
				state.data?.selected.summary?.session?.sessionId ??
				state.focus.sessionId;

			if (!sessionId) {
				return;
			}

			void runAction({
				action: "resume",
				sessionId,
			});
		},
		selectMode: (mode) => {
			syncSpecialistWorkspaceFocus({
				mode,
				sessionId: null,
			});
		},
		state,
	};
}

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
	BATCH_WORKSPACE_FOCUS_EVENT,
	type BatchWorkspaceActionInput,
	BatchWorkspaceClientError,
	type BatchWorkspaceFocus,
	fetchBatchWorkspaceSummary,
	readBatchWorkspaceFocusFromUrl,
	submitBatchWorkspaceAction,
	syncBatchWorkspaceFocus,
} from "./batch-workspace-client";
import type {
	BatchWorkspaceAction,
	BatchWorkspaceActionRequestStatus,
	BatchWorkspaceItemPreview,
	BatchWorkspaceSummaryPayload,
} from "./batch-workspace-types";

const POLL_INTERVAL_MS = 4_000;

export type BatchWorkspaceViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| StartupStatus;

export type BatchWorkspacePendingAction = {
	action: BatchWorkspaceAction;
	itemId: number | null;
} | null;

export type BatchWorkspaceActionNotice = {
	kind: "info" | "success" | "warn";
	message: string;
} | null;

export type BatchWorkspaceState = {
	data: BatchWorkspaceSummaryPayload | null;
	error: BatchWorkspaceClientError | null;
	focus: BatchWorkspaceFocus;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	notice: BatchWorkspaceActionNotice;
	pendingAction: BatchWorkspacePendingAction;
	status: BatchWorkspaceViewStatus;
};

function createEmptyState(): BatchWorkspaceState {
	return {
		data: null,
		error: null,
		focus: readBatchWorkspaceFocusFromUrl(),
		isRefreshing: false,
		lastUpdatedAt: null,
		notice: null,
		pendingAction: null,
		status: "empty",
	};
}

function toBatchWorkspaceClientError(
	error: unknown,
): BatchWorkspaceClientError {
	if (error instanceof BatchWorkspaceClientError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new BatchWorkspaceClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

function focusEquals(
	left: BatchWorkspaceFocus,
	right: BatchWorkspaceFocus,
): boolean {
	return (
		left.itemId === right.itemId &&
		left.offset === right.offset &&
		left.status === right.status
	);
}

function hasPollingWork(payload: BatchWorkspaceSummaryPayload | null): boolean {
	if (!payload) {
		return false;
	}

	return (
		payload.run.state === "approval-paused" ||
		payload.run.state === "queued" ||
		payload.run.state === "running"
	);
}

function createActionNotice(input: {
	action: BatchWorkspaceAction;
	message: string;
	requestStatus: BatchWorkspaceActionRequestStatus;
	warningCount: number;
}): BatchWorkspaceActionNotice {
	if (input.warningCount > 0) {
		return {
			kind: "warn",
			message: input.message,
		};
	}

	if (input.requestStatus === "already-queued") {
		return {
			kind: "info",
			message: input.message,
		};
	}

	if (
		input.action === "resume-run-pending" ||
		input.action === "retry-failed"
	) {
		return {
			kind: "info",
			message: input.message,
		};
	}

	return {
		kind: "success",
		message: input.message,
	};
}

export function useBatchWorkspace(): {
	clearNotice: () => void;
	clearSelection: () => void;
	goToNextPage: () => void;
	goToPreviousPage: () => void;
	refresh: () => void;
	runAction: (input: BatchWorkspaceActionInput) => void;
	selectItem: (item: BatchWorkspaceItemPreview) => void;
	selectStatusFilter: (status: BatchWorkspaceFocus["status"]) => void;
	state: BatchWorkspaceState;
} {
	const abortRef = useRef<AbortController | null>(null);
	const requestIdRef = useRef(0);
	const revalidationTimeoutRef = useRef<number | null>(null);
	const [state, setState] = useState<BatchWorkspaceState>(createEmptyState);

	const clearScheduledRevalidation = useCallback(() => {
		if (revalidationTimeoutRef.current !== null) {
			window.clearTimeout(revalidationTimeoutRef.current);
			revalidationTimeoutRef.current = null;
		}
	}, []);

	const loadSummary = useEffectEvent(
		async (
			reason: "action" | "focus" | "mount" | "online" | "refresh" | "select",
			focus: BatchWorkspaceFocus = state.focus,
			nextNotice: BatchWorkspaceActionNotice | undefined = undefined,
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
				const payload = await fetchBatchWorkspaceSummary({
					focus,
					signal: controller.signal,
				});

				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const recoveryNotice =
					focus.itemId !== null && payload.selectedDetail.state === "missing"
						? {
								kind: "warn" as const,
								message: payload.selectedDetail.message,
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

				if (
					focus.itemId !== null &&
					payload.selectedDetail.state === "missing"
				) {
					syncBatchWorkspaceFocus(
						{
							itemId: null,
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

				const clientError = toBatchWorkspaceClientError(error);

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

	const scheduleRevalidation = useEffectEvent(
		(delayMs: number | null, focus: BatchWorkspaceFocus) => {
			clearScheduledRevalidation();

			if (delayMs === null || delayMs <= 0) {
				return;
			}

			revalidationTimeoutRef.current = window.setTimeout(() => {
				revalidationTimeoutRef.current = null;
				void loadSummary("refresh", focus);
			}, delayMs);
		},
	);

	const handleFocusChange = useEffectEvent(() => {
		const nextFocus = readBatchWorkspaceFocusFromUrl();

		if (focusEquals(nextFocus, state.focus)) {
			return;
		}

		clearScheduledRevalidation();
		void loadSummary("focus", nextFocus);
	});

	const handleOnline = useEffectEvent(() => {
		if (state.status === "offline") {
			void loadSummary("online");
		}
	});

	useEffect(() => {
		void loadSummary("mount");

		window.addEventListener(BATCH_WORKSPACE_FOCUS_EVENT, handleFocusChange);
		window.addEventListener("hashchange", handleFocusChange);
		window.addEventListener("online", handleOnline);
		window.addEventListener("popstate", handleFocusChange);

		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
			clearScheduledRevalidation();
			window.removeEventListener(
				BATCH_WORKSPACE_FOCUS_EVENT,
				handleFocusChange,
			);
			window.removeEventListener("hashchange", handleFocusChange);
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("popstate", handleFocusChange);
		};
	}, [clearScheduledRevalidation]);

	useEffect(() => {
		if (!hasPollingWork(state.data) || state.pendingAction !== null) {
			return;
		}

		const intervalId = window.setInterval(() => {
			void loadSummary("refresh");
		}, POLL_INTERVAL_MS);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [state.data, state.pendingAction]);

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
			syncBatchWorkspaceFocus({
				itemId: null,
			});
		},
		goToNextPage: () => {
			if (!state.data?.items.hasMore) {
				return;
			}

			syncBatchWorkspaceFocus({
				offset: state.focus.offset + state.data.items.limit,
			});
		},
		goToPreviousPage: () => {
			if (state.focus.offset === 0) {
				return;
			}

			syncBatchWorkspaceFocus({
				offset: Math.max(
					0,
					state.focus.offset - (state.data?.items.limit ?? state.focus.offset),
				),
			});
		},
		refresh: () => {
			if (
				state.isRefreshing ||
				state.status === "loading" ||
				state.pendingAction !== null
			) {
				return;
			}

			clearScheduledRevalidation();
			void loadSummary("refresh");
		},
		runAction: (input) => {
			if (
				state.pendingAction !== null ||
				state.isRefreshing ||
				state.status === "loading"
			) {
				return;
			}

			clearScheduledRevalidation();

			startTransition(() => {
				setState((previous) => ({
					...previous,
					error: null,
					pendingAction: {
						action: input.action,
						itemId: input.itemId ?? null,
					},
				}));
			});

			void (async () => {
				try {
					const payload = await submitBatchWorkspaceAction({
						input,
					});
					const nextFocus: BatchWorkspaceFocus = {
						itemId:
							payload.actionResult.revalidation.itemId !== null
								? payload.actionResult.revalidation.itemId
								: state.focus.itemId,
						offset: state.focus.offset,
						status:
							payload.actionResult.revalidation.status ?? state.focus.status,
					};

					if (!focusEquals(nextFocus, state.focus)) {
						syncBatchWorkspaceFocus(nextFocus, {
							replace: true,
						});
					}

					startTransition(() => {
						setState((previous) => ({
							...previous,
							focus: nextFocus,
							notice: createActionNotice({
								action: payload.actionResult.action,
								message: payload.message,
								requestStatus: payload.actionResult.requestStatus,
								warningCount: payload.actionResult.warnings.length,
							}),
						}));
					});

					scheduleRevalidation(
						payload.actionResult.revalidation.nextPollMs,
						nextFocus,
					);
					await loadSummary("action", nextFocus);
				} catch (error) {
					const clientError = toBatchWorkspaceClientError(error);

					startTransition(() => {
						setState((previous) => ({
							...previous,
							error: clientError,
							pendingAction: null,
							status: clientError.state,
						}));
					});
				}
			})();
		},
		selectItem: (item) => {
			syncBatchWorkspaceFocus({
				itemId: item.id,
			});
		},
		selectStatusFilter: (status) => {
			syncBatchWorkspaceFocus({
				offset: 0,
				status,
			});
		},
		state,
	};
}

import {
	startTransition,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import type { StartupStatus } from "../boot/startup-types";
import {
	fetchTrackerWorkspaceSummary,
	readTrackerWorkspaceFocusFromUrl,
	submitTrackerWorkspaceAction,
	syncTrackerWorkspaceFocus,
	TRACKER_WORKSPACE_FOCUS_EVENT,
	type TrackerWorkspaceActionInput,
	TrackerWorkspaceClientError,
	type TrackerWorkspaceFocus,
} from "./tracker-workspace-client";
import type {
	TrackerWorkspaceAction,
	TrackerWorkspaceRowPreview,
	TrackerWorkspaceSort,
	TrackerWorkspaceSummaryPayload,
} from "./tracker-workspace-types";

export type TrackerWorkspaceViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| StartupStatus;

export type TrackerWorkspacePendingAction = {
	action: TrackerWorkspaceAction;
	entryNumber: number | null;
} | null;

export type TrackerWorkspaceActionNotice = {
	kind: "info" | "success" | "warn";
	message: string;
} | null;

export type TrackerWorkspaceState = {
	data: TrackerWorkspaceSummaryPayload | null;
	error: TrackerWorkspaceClientError | null;
	focus: TrackerWorkspaceFocus;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	notice: TrackerWorkspaceActionNotice;
	pendingAction: TrackerWorkspacePendingAction;
	status: TrackerWorkspaceViewStatus;
};

function createEmptyState(): TrackerWorkspaceState {
	return {
		data: null,
		error: null,
		focus: readTrackerWorkspaceFocusFromUrl(),
		isRefreshing: false,
		lastUpdatedAt: null,
		notice: null,
		pendingAction: null,
		status: "empty",
	};
}

function toTrackerWorkspaceClientError(
	error: unknown,
): TrackerWorkspaceClientError {
	if (error instanceof TrackerWorkspaceClientError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new TrackerWorkspaceClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

function focusEquals(
	left: TrackerWorkspaceFocus,
	right: TrackerWorkspaceFocus,
): boolean {
	return (
		left.entryNumber === right.entryNumber &&
		left.offset === right.offset &&
		left.reportNumber === right.reportNumber &&
		left.search === right.search &&
		left.sort === right.sort &&
		left.status === right.status
	);
}

function createActionNotice(input: {
	action: TrackerWorkspaceAction;
	message: string;
	warningCount: number;
}): TrackerWorkspaceActionNotice {
	if (input.warningCount > 0) {
		return {
			kind: "warn",
			message: input.message,
		};
	}

	switch (input.action) {
		case "verify-tracker-pipeline":
			return {
				kind: "info",
				message: input.message,
			};
		case "dedup-tracker-entries":
		case "merge-tracker-additions":
		case "normalize-tracker-statuses":
		case "update-status":
			return {
				kind: "success",
				message: input.message,
			};
	}
}

export function useTrackerWorkspace(): {
	clearSelection: () => void;
	goToNextPage: () => void;
	goToPreviousPage: () => void;
	refresh: () => void;
	runAction: (input: TrackerWorkspaceActionInput) => void;
	selectRow: (row: TrackerWorkspaceRowPreview) => void;
	selectSearch: (search: string) => void;
	selectSort: (sort: TrackerWorkspaceSort) => void;
	selectStatusFilter: (status: string | null) => void;
	state: TrackerWorkspaceState;
} {
	const abortRef = useRef<AbortController | null>(null);
	const requestIdRef = useRef(0);
	const [state, setState] = useState<TrackerWorkspaceState>(createEmptyState);

	const loadSummary = useEffectEvent(
		async (
			reason: "action" | "focus" | "mount" | "online" | "refresh" | "select",
			focus: TrackerWorkspaceFocus = state.focus,
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
							notice: reason === "select" ? null : previous.notice,
						};
					}

					return {
						...previous,
						error: null,
						focus,
						isRefreshing: false,
						notice:
							reason === "focus" || reason === "select"
								? null
								: previous.notice,
						status: "loading",
					};
				});
			});

			try {
				const payload = await fetchTrackerWorkspaceSummary({
					focus,
					signal: controller.signal,
				});

				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				startTransition(() => {
					setState((previous) => ({
						...previous,
						data: payload,
						error: null,
						focus,
						isRefreshing: false,
						lastUpdatedAt: new Date().toISOString(),
						pendingAction: null,
						status: payload.status,
					}));
				});
			} catch (error) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const clientError = toTrackerWorkspaceClientError(error);

				startTransition(() => {
					setState((previous) => ({
						...previous,
						data: previous.data,
						error: clientError,
						focus,
						isRefreshing: false,
						pendingAction: null,
						status: clientError.state,
					}));
				});
			}
		},
	);

	const handleFocusChange = useEffectEvent(() => {
		const nextFocus = readTrackerWorkspaceFocusFromUrl();

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

		window.addEventListener(TRACKER_WORKSPACE_FOCUS_EVENT, handleFocusChange);
		window.addEventListener("hashchange", handleFocusChange);
		window.addEventListener("popstate", handleFocusChange);
		window.addEventListener("online", handleOnline);

		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
			window.removeEventListener(
				TRACKER_WORKSPACE_FOCUS_EVENT,
				handleFocusChange,
			);
			window.removeEventListener("hashchange", handleFocusChange);
			window.removeEventListener("popstate", handleFocusChange);
			window.removeEventListener("online", handleOnline);
		};
	}, []);

	return {
		clearSelection: () => {
			syncTrackerWorkspaceFocus({
				entryNumber: null,
				reportNumber: null,
			});
		},
		goToNextPage: () => {
			if (!state.data?.rows.hasMore) {
				return;
			}

			syncTrackerWorkspaceFocus({
				offset: state.focus.offset + state.data.rows.limit,
			});
		},
		goToPreviousPage: () => {
			if (state.focus.offset === 0) {
				return;
			}

			syncTrackerWorkspaceFocus({
				offset: Math.max(
					0,
					state.focus.offset - (state.data?.rows.limit ?? state.focus.offset),
				),
			});
		},
		refresh: () => {
			if (state.isRefreshing || state.status === "loading") {
				return;
			}

			void loadSummary("refresh");
		},
		runAction: (input) => {
			if (state.pendingAction !== null) {
				return;
			}

			const entryNumber =
				input.action === "update-status" ? input.entryNumber : null;

			startTransition(() => {
				setState((previous) => ({
					...previous,
					error: null,
					pendingAction: {
						action: input.action,
						entryNumber,
					},
				}));
			});

			void (async () => {
				try {
					const payload = await submitTrackerWorkspaceAction({
						input,
					});

					const nextFocus =
						input.action === "update-status"
							? {
									...state.focus,
									entryNumber: input.entryNumber,
									reportNumber: null,
								}
							: state.focus;

					if (input.action === "update-status") {
						syncTrackerWorkspaceFocus(
							{
								entryNumber: input.entryNumber,
								reportNumber: null,
							},
							{
								replace: true,
							},
						);
					}

					startTransition(() => {
						setState((previous) => ({
							...previous,
							focus: nextFocus,
							notice: createActionNotice({
								action: payload.actionResult.action,
								message: payload.message,
								warningCount: payload.actionResult.warnings.length,
							}),
						}));
					});

					await loadSummary("action", nextFocus);
				} catch (error) {
					const clientError = toTrackerWorkspaceClientError(error);

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
		selectRow: (row) => {
			syncTrackerWorkspaceFocus({
				entryNumber: row.entryNumber,
				reportNumber: null,
			});
		},
		selectSearch: (search) => {
			syncTrackerWorkspaceFocus({
				offset: 0,
				search: search.trim().length > 0 ? search.trim() : null,
			});
		},
		selectSort: (sort) => {
			syncTrackerWorkspaceFocus({
				offset: 0,
				sort,
			});
		},
		selectStatusFilter: (status) => {
			syncTrackerWorkspaceFocus({
				offset: 0,
				status,
			});
		},
		state,
	};
}

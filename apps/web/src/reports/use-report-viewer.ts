import {
	startTransition,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import type { StartupStatus } from "../boot/startup-types";
import {
	fetchReportViewerSummary,
	REPORT_VIEWER_FOCUS_EVENT,
	ReportViewerClientError,
	type ReportViewerFocus,
	readReportViewerFocusFromUrl,
	syncReportViewerFocus,
} from "./report-viewer-client";
import type {
	ReportViewerArtifactGroup,
	ReportViewerSummaryPayload,
} from "./report-viewer-types";

export type ReportViewerViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| StartupStatus;

export type ReportViewerState = {
	data: ReportViewerSummaryPayload | null;
	error: ReportViewerClientError | null;
	focus: ReportViewerFocus;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	status: ReportViewerViewStatus;
};

function createInitialState(
	initialReportPath?: string | null,
): ReportViewerState {
	const urlFocus = readReportViewerFocusFromUrl();

	return {
		data: null,
		error: null,
		focus: initialReportPath
			? { ...urlFocus, reportPath: initialReportPath }
			: urlFocus,
		isRefreshing: false,
		lastUpdatedAt: null,
		status: "empty",
	};
}

function toReportViewerClientError(error: unknown): ReportViewerClientError {
	if (error instanceof ReportViewerClientError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new ReportViewerClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

function focusEquals(
	left: ReportViewerFocus,
	right: ReportViewerFocus,
): boolean {
	return (
		left.group === right.group &&
		left.offset === right.offset &&
		left.reportPath === right.reportPath
	);
}

export function useReportViewer(options?: {
	initialReportPath?: string | null;
}): {
	followLatest: () => void;
	goToNextPage: () => void;
	goToPreviousPage: () => void;
	refresh: () => void;
	selectGroup: (group: ReportViewerArtifactGroup) => void;
	selectReport: (reportPath: string) => void;
	state: ReportViewerState;
} {
	const abortRef = useRef<AbortController | null>(null);
	const requestIdRef = useRef(0);
	const [state, setState] = useState<ReportViewerState>(() =>
		createInitialState(options?.initialReportPath),
	);

	const loadSummary = useEffectEvent(
		async (
			reason: "focus" | "mount" | "online" | "refresh" | "select",
			focus: ReportViewerFocus = state.focus,
		) => {
			requestIdRef.current += 1;
			const requestId = requestIdRef.current;

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			startTransition(() => {
				setState((previous) => {
					if ((reason === "refresh" || reason === "select") && previous.data) {
						return {
							...previous,
							error: null,
							focus,
							isRefreshing: true,
						};
					}

					return {
						...previous,
						error: null,
						focus,
						isRefreshing: false,
						status: "loading",
					};
				});
			});

			try {
				const payload = await fetchReportViewerSummary({
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
						status: payload.status,
					}));
				});
			} catch (error) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const clientError = toReportViewerClientError(error);

				startTransition(() => {
					setState((previous) => ({
						...previous,
						data: previous.data,
						error: clientError,
						focus,
						isRefreshing: false,
						status: clientError.state,
					}));
				});
			}
		},
	);

	const handleFocusChange = useEffectEvent(() => {
		const nextFocus = readReportViewerFocusFromUrl();

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

		window.addEventListener(REPORT_VIEWER_FOCUS_EVENT, handleFocusChange);
		window.addEventListener("hashchange", handleFocusChange);
		window.addEventListener("popstate", handleFocusChange);
		window.addEventListener("online", handleOnline);

		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
			window.removeEventListener(REPORT_VIEWER_FOCUS_EVENT, handleFocusChange);
			window.removeEventListener("hashchange", handleFocusChange);
			window.removeEventListener("popstate", handleFocusChange);
			window.removeEventListener("online", handleOnline);
		};
	}, []);

	return {
		followLatest: () => {
			const nextFocus = {
				...state.focus,
				offset: 0,
				reportPath: null,
			};

			syncReportViewerFocus(nextFocus);
		},
		goToNextPage: () => {
			if (!state.data?.recentArtifacts.hasMore) {
				return;
			}

			const nextFocus = {
				...state.focus,
				offset: state.focus.offset + state.data.recentArtifacts.limit,
			};

			syncReportViewerFocus(nextFocus);
		},
		goToPreviousPage: () => {
			if (state.focus.offset === 0) {
				return;
			}

			const nextFocus = {
				...state.focus,
				offset: Math.max(
					0,
					state.focus.offset -
						(state.data?.recentArtifacts.limit ?? state.focus.offset),
				),
			};

			syncReportViewerFocus(nextFocus);
		},
		refresh: () => {
			if (state.isRefreshing || state.status === "loading") {
				return;
			}

			void loadSummary("refresh");
		},
		selectGroup: (group) => {
			const nextFocus = {
				...state.focus,
				group,
				offset: 0,
			};

			syncReportViewerFocus(nextFocus);
		},
		selectReport: (reportPath) => {
			const nextFocus = {
				...state.focus,
				offset: 0,
				reportPath,
			};

			syncReportViewerFocus(nextFocus);
		},
		state,
	};
}

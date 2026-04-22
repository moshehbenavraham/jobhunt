import {
	startTransition,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import type { StartupStatus } from "../boot/startup-types";
import {
	fetchScanReviewSummary,
	readScanReviewFocusFromUrl,
	SCAN_REVIEW_FOCUS_EVENT,
	type ScanReviewActionInput,
	ScanReviewClientError,
	type ScanReviewFocus,
	submitScanReviewAction,
	submitScanReviewCommand,
	syncScanReviewFocus,
} from "./scan-review-client";
import type {
	ScanReviewAction,
	ScanReviewBucketFilter,
	ScanReviewCandidatePreview,
	ScanReviewSummaryPayload,
} from "./scan-review-types";

const POLL_INTERVAL_MS = 4_000;

export type ScanReviewViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| StartupStatus;

export type ScanReviewActionNotice = {
	kind: "info" | "success" | "warn";
	message: string;
} | null;

export type ScanReviewPendingAction = {
	kind: "batch" | "evaluate" | ScanReviewAction | "launch-scan";
	sessionId: string | null;
	url: string | null;
} | null;

export type ScanReviewState = {
	data: ScanReviewSummaryPayload | null;
	error: ScanReviewClientError | null;
	focus: ScanReviewFocus;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	notice: ScanReviewActionNotice;
	pendingAction: ScanReviewPendingAction;
	status: ScanReviewViewStatus;
};

type UseScanReviewOptions = {
	onOpenChatConsole?: (focus: { sessionId: string | null }) => void;
};

function createEmptyState(): ScanReviewState {
	return {
		data: null,
		error: null,
		focus: readScanReviewFocusFromUrl(),
		isRefreshing: false,
		lastUpdatedAt: null,
		notice: null,
		pendingAction: null,
		status: "empty",
	};
}

function toScanReviewClientError(error: unknown): ScanReviewClientError {
	if (error instanceof ScanReviewClientError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new ScanReviewClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

function focusEquals(left: ScanReviewFocus, right: ScanReviewFocus): boolean {
	return (
		left.bucket === right.bucket &&
		left.includeIgnored === right.includeIgnored &&
		left.offset === right.offset &&
		left.sessionId === right.sessionId &&
		left.url === right.url
	);
}

function hasPollingWork(payload: ScanReviewSummaryPayload | null): boolean {
	if (!payload) {
		return false;
	}

	return (
		payload.run.state === "approval-paused" ||
		payload.run.state === "queued" ||
		payload.run.state === "running"
	);
}

export function useScanReview(options: UseScanReviewOptions = {}): {
	clearNotice: () => void;
	clearSelection: () => void;
	goToNextPage: () => void;
	goToPreviousPage: () => void;
	launchBatchSeed: (candidate: ScanReviewCandidatePreview) => void;
	launchEvaluation: (candidate: ScanReviewCandidatePreview) => void;
	launchScan: () => void;
	refresh: () => void;
	runIgnoreAction: (input: ScanReviewActionInput) => void;
	selectBucket: (bucket: ScanReviewBucketFilter) => void;
	selectCandidate: (candidate: ScanReviewCandidatePreview) => void;
	selectSessionScope: (sessionId: string | null) => void;
	setIncludeIgnored: (includeIgnored: boolean) => void;
	state: ScanReviewState;
} {
	const abortRef = useRef<AbortController | null>(null);
	const requestIdRef = useRef(0);
	const [state, setState] = useState<ScanReviewState>(createEmptyState);

	const loadSummary = useEffectEvent(
		async (
			reason: "action" | "focus" | "mount" | "online" | "refresh" | "select",
			focus: ScanReviewFocus = state.focus,
			nextNotice: ScanReviewActionNotice | undefined = undefined,
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
				const payload = await fetchScanReviewSummary({
					focus,
					signal: controller.signal,
				});

				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const recoveryNotice =
					focus.url && payload.selectedDetail.state === "missing"
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

				if (focus.url && payload.selectedDetail.state === "missing") {
					syncScanReviewFocus(
						{
							url: null,
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

				const clientError = toScanReviewClientError(error);

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
		const nextFocus = readScanReviewFocusFromUrl();

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

	const runIgnoreAction = useEffectEvent(
		async (input: ScanReviewActionInput) => {
			if (
				state.pendingAction ||
				state.isRefreshing ||
				state.status === "loading"
			) {
				return;
			}

			const pendingAction: ScanReviewPendingAction = {
				kind: input.action,
				sessionId: input.sessionId,
				url: input.url,
			};

			startTransition(() => {
				setState((previous) => ({
					...previous,
					error: null,
					pendingAction,
				}));
			});

			try {
				const payload = await submitScanReviewAction(input);
				const shouldClearSelection =
					payload.actionResult.visibility === "hidden" &&
					!state.focus.includeIgnored &&
					state.focus.url === input.url;
				const nextNotice: ScanReviewActionNotice = {
					kind: "success",
					message: payload.message,
				};

				syncScanReviewFocus(
					{
						sessionId: payload.actionResult.sessionId,
						url: shouldClearSelection ? null : input.url,
					},
					{
						replace: false,
					},
				);

				void loadSummary(
					"action",
					{
						...state.focus,
						sessionId: payload.actionResult.sessionId,
						url: shouldClearSelection ? null : input.url,
					},
					nextNotice,
				);
			} catch (error) {
				const clientError = toScanReviewClientError(error);

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

	const launchScan = useEffectEvent(async () => {
		if (
			state.pendingAction ||
			state.isRefreshing ||
			state.status === "loading"
		) {
			return;
		}

		const pendingAction: ScanReviewPendingAction = {
			kind: "launch-scan",
			sessionId: state.focus.sessionId ?? state.data?.run.sessionId ?? null,
			url: null,
		};

		startTransition(() => {
			setState((previous) => ({
				...previous,
				error: null,
				pendingAction,
			}));
		});

		try {
			const payload = await submitScanReviewCommand({
				context: null,
				kind: "launch",
				sessionId: state.focus.sessionId ?? state.data?.run.sessionId ?? null,
				workflow: "scan-portals",
			});
			const nextSessionId =
				payload.handoff.selectedSession?.session.sessionId ??
				payload.handoff.session?.sessionId ??
				state.focus.sessionId ??
				state.data?.run.sessionId ??
				null;
			const nextFocus: ScanReviewFocus = {
				...state.focus,
				offset: 0,
				sessionId: nextSessionId,
				url: null,
			};

			syncScanReviewFocus(nextFocus, {
				replace: false,
			});

			void loadSummary("action", nextFocus, {
				kind: "info",
				message: payload.handoff.message,
			});
		} catch (error) {
			const clientError = toScanReviewClientError(error);

			startTransition(() => {
				setState((previous) => ({
					...previous,
					error: clientError,
					pendingAction: null,
					status: clientError.state,
				}));
			});
		}
	});

	const launchWorkflow = useEffectEvent(
		async (input: {
			candidate: ScanReviewCandidatePreview;
			kind: "batch" | "evaluate";
		}) => {
			if (
				state.pendingAction ||
				state.isRefreshing ||
				state.status === "loading"
			) {
				return;
			}

			const pendingAction: ScanReviewPendingAction = {
				kind: input.kind,
				sessionId: null,
				url: input.candidate.url,
			};

			startTransition(() => {
				setState((previous) => ({
					...previous,
					error: null,
					pendingAction,
				}));
			});

			try {
				const payload = await submitScanReviewCommand({
					context:
						input.kind === "evaluate"
							? input.candidate.evaluate.context
							: input.candidate.batchSeed,
					kind: "launch",
					sessionId: null,
					workflow:
						input.kind === "evaluate"
							? input.candidate.evaluate.workflow
							: "batch-evaluation",
				});
				const nextSessionId =
					payload.handoff.selectedSession?.session.sessionId ??
					payload.handoff.session?.sessionId ??
					null;

				startTransition(() => {
					setState((previous) => ({
						...previous,
						error: null,
						notice: {
							kind: "success",
							message: payload.handoff.message,
						},
						pendingAction: null,
					}));
				});

				options.onOpenChatConsole?.({
					sessionId: nextSessionId,
				});
			} catch (error) {
				const clientError = toScanReviewClientError(error);

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

		window.addEventListener(SCAN_REVIEW_FOCUS_EVENT, handleFocusChange);
		window.addEventListener("hashchange", handleFocusChange);
		window.addEventListener("online", handleOnline);
		window.addEventListener("popstate", handleFocusChange);

		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
			window.removeEventListener(SCAN_REVIEW_FOCUS_EVENT, handleFocusChange);
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
			syncScanReviewFocus({
				url: null,
			});
		},
		goToNextPage: () => {
			if (!state.data?.shortlist.hasMore) {
				return;
			}

			syncScanReviewFocus({
				offset: state.focus.offset + state.data.shortlist.limit,
			});
		},
		goToPreviousPage: () => {
			if (state.focus.offset === 0) {
				return;
			}

			syncScanReviewFocus({
				offset: Math.max(
					0,
					state.focus.offset -
						(state.data?.shortlist.limit ?? state.focus.offset),
				),
			});
		},
		launchBatchSeed: (candidate) => {
			void launchWorkflow({
				candidate,
				kind: "batch",
			});
		},
		launchEvaluation: (candidate) => {
			void launchWorkflow({
				candidate,
				kind: "evaluate",
			});
		},
		launchScan: () => {
			void launchScan();
		},
		refresh: () => {
			if (
				state.isRefreshing ||
				state.status === "loading" ||
				state.pendingAction !== null
			) {
				return;
			}

			void loadSummary("refresh");
		},
		runIgnoreAction: (input) => {
			void runIgnoreAction(input);
		},
		selectBucket: (bucket) => {
			syncScanReviewFocus({
				bucket,
				offset: 0,
			});
		},
		selectCandidate: (candidate) => {
			syncScanReviewFocus({
				url: candidate.url,
			});
		},
		selectSessionScope: (sessionId) => {
			syncScanReviewFocus({
				offset: 0,
				sessionId,
				url: null,
			});
		},
		setIncludeIgnored: (includeIgnored) => {
			const shouldClearSelection =
				!includeIgnored &&
				state.data?.selectedDetail.row?.ignored === true &&
				state.focus.url === state.data.selectedDetail.row.url;

			syncScanReviewFocus({
				includeIgnored,
				offset: 0,
				url: shouldClearSelection ? null : state.focus.url,
			});
		},
		state,
	};
}

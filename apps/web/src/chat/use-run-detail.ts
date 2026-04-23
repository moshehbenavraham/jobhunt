import { useCallback, useEffect, useRef, useState } from "react";

import {
	EvaluationResultClientError,
	fetchRunDetail,
} from "./evaluation-result-client";
import type {
	RunDetailViewState,
	RunDetailViewStatus,
} from "./run-detail-types";

const POLL_INTERVAL_MS = 4_000;

const ACTIVE_STATES = new Set(["running", "pending", "approval-paused"]);

function isRunActive(state: RunDetailViewState): boolean {
	const summary = state.data?.summary;
	return (
		summary !== null &&
		summary !== undefined &&
		ACTIVE_STATES.has(summary.state)
	);
}

function deriveStatus(
	data: RunDetailViewState["data"],
	error: RunDetailViewState["error"],
): RunDetailViewStatus {
	if (error) {
		return error.state === "offline" ? "offline" : "error";
	}

	if (!data) {
		return "loading";
	}

	if (!data.summary) {
		return "empty";
	}

	return "ready";
}

export function useRunDetail(runId: string): {
	refresh: () => void;
	state: RunDetailViewState;
} {
	const [state, setState] = useState<RunDetailViewState>(() => ({
		data: null,
		error: null,
		isRefreshing: false,
		runId,
		status: "loading",
	}));

	const requestIdRef = useRef(0);
	const abortRef = useRef<AbortController | null>(null);
	const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const cancelInflight = useCallback(() => {
		if (pollTimerRef.current !== null) {
			clearTimeout(pollTimerRef.current);
			pollTimerRef.current = null;
		}

		if (abortRef.current) {
			abortRef.current.abort();
			abortRef.current = null;
		}
	}, []);

	const performFetch = useCallback(
		(targetRunId: string, isRefresh: boolean) => {
			requestIdRef.current += 1;
			const thisRequestId = requestIdRef.current;

			cancelInflight();

			const controller = new AbortController();
			abortRef.current = controller;

			if (isRefresh) {
				setState((prev) => ({ ...prev, isRefreshing: true }));
			}

			fetchRunDetail(targetRunId, { signal: controller.signal })
				.then((data) => {
					if (requestIdRef.current !== thisRequestId) {
						return;
					}

					const nextState: RunDetailViewState = {
						data,
						error: null,
						isRefreshing: false,
						runId: targetRunId,
						status: deriveStatus(data, null),
					};

					setState(nextState);

					if (isRunActive(nextState)) {
						pollTimerRef.current = setTimeout(() => {
							performFetch(targetRunId, true);
						}, POLL_INTERVAL_MS);
					}
				})
				.catch((error: unknown) => {
					if (requestIdRef.current !== thisRequestId) {
						return;
					}

					if (error instanceof DOMException && error.name === "AbortError") {
						return;
					}

					const clientError =
						error instanceof EvaluationResultClientError
							? error
							: new EvaluationResultClientError({
									cause: error,
									code: "unknown",
									message:
										error instanceof Error
											? error.message
											: "An unexpected error occurred.",
									state: "error",
								});

					setState((prev) => ({
						...prev,
						error: clientError,
						isRefreshing: false,
						status: deriveStatus(prev.data, clientError),
					}));
				});
		},
		[cancelInflight],
	);

	useEffect(() => {
		setState({
			data: null,
			error: null,
			isRefreshing: false,
			runId,
			status: "loading",
		});

		performFetch(runId, false);

		return cancelInflight;
	}, [runId, performFetch, cancelInflight]);

	const refresh = useCallback(() => {
		performFetch(runId, true);
	}, [runId, performFetch]);

	return { refresh, state };
}

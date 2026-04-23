import {
	startTransition,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import {
	fetchOperatorShellSummary,
	OperatorShellClientError,
} from "./operator-shell-client";
import type {
	OperatorShellStartupStatus,
	OperatorShellSummaryPayload,
} from "./shell-types";

export type OperatorShellViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| OperatorShellStartupStatus;

export type OperatorShellState = {
	data: OperatorShellSummaryPayload | null;
	error: OperatorShellClientError | null;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	status: OperatorShellViewStatus;
};

const EMPTY_STATE: OperatorShellState = {
	data: null,
	error: null,
	isRefreshing: false,
	lastUpdatedAt: null,
	status: "empty",
};

function toOperatorShellClientError(error: unknown): OperatorShellClientError {
	if (error instanceof OperatorShellClientError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new OperatorShellClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

export function useOperatorShell(): {
	refresh: () => void;
	state: OperatorShellState;
} {
	const abortRef = useRef<AbortController | null>(null);
	const requestIdRef = useRef(0);
	const [state, setState] = useState<OperatorShellState>(EMPTY_STATE);

	const loadSummary = useEffectEvent(
		async (reason: "mount" | "online" | "refresh") => {
			requestIdRef.current += 1;
			const requestId = requestIdRef.current;

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			startTransition(() => {
				setState((previous) => {
					if (reason === "refresh" && previous.data) {
						return {
							...previous,
							error: null,
							isRefreshing: true,
						};
					}

					return {
						...previous,
						error: null,
						isRefreshing: false,
						status: "loading",
					};
				});
			});

			try {
				const payload = await fetchOperatorShellSummary({
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
						isRefreshing: false,
						lastUpdatedAt: new Date().toISOString(),
						status: payload.status,
					}));
				});
			} catch (error) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const clientError = toOperatorShellClientError(error);

				startTransition(() => {
					setState((previous) => ({
						...previous,
						data: previous.data,
						error: clientError,
						isRefreshing: false,
						lastUpdatedAt: previous.lastUpdatedAt,
						status: clientError.state,
					}));
				});
			}
		},
	);

	const handleOnline = useEffectEvent(() => {
		if (state.status === "offline") {
			void loadSummary("online");
		}
	});

	useEffect(() => {
		void loadSummary("mount");
		window.addEventListener("online", handleOnline);

		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
			window.removeEventListener("online", handleOnline);
		};
	}, []);

	return {
		refresh: () => {
			if (state.isRefreshing || state.status === "loading") {
				return;
			}

			void loadSummary("refresh");
		},
		state,
	};
}

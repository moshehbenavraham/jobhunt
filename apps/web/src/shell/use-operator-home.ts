import {
	startTransition,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import {
	fetchOperatorHomeSummary,
	OperatorHomeClientError,
} from "./operator-home-client";
import {
	type OperatorHomeSummaryPayload,
	parseOperatorHomeSummaryPayload,
} from "./operator-home-types";

const OPERATOR_HOME_SNAPSHOT_KEY = "jobhunt:operator-home-snapshot";

export type OperatorHomeViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| OperatorHomeSummaryPayload["status"];

export type OperatorHomeState = {
	data: OperatorHomeSummaryPayload | null;
	error: OperatorHomeClientError | null;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	status: OperatorHomeViewStatus;
};

function readSnapshot(): OperatorHomeSummaryPayload | null {
	try {
		const rawValue = window.sessionStorage.getItem(OPERATOR_HOME_SNAPSHOT_KEY);

		if (!rawValue) {
			return null;
		}

		return parseOperatorHomeSummaryPayload(JSON.parse(rawValue) as unknown);
	} catch {
		return null;
	}
}

function writeSnapshot(payload: OperatorHomeSummaryPayload): void {
	try {
		window.sessionStorage.setItem(
			OPERATOR_HOME_SNAPSHOT_KEY,
			JSON.stringify(payload),
		);
	} catch {
		// Ignore snapshot write failures and keep the in-memory copy.
	}
}

function createInitialState(): OperatorHomeState {
	const snapshot = readSnapshot();

	return {
		data: snapshot,
		error: null,
		isRefreshing: false,
		lastUpdatedAt: snapshot?.generatedAt ?? null,
		status: snapshot?.status ?? "empty",
	};
}

function toOperatorHomeClientError(error: unknown): OperatorHomeClientError {
	if (error instanceof OperatorHomeClientError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new OperatorHomeClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

export function useOperatorHome(input: { isActive: boolean }): {
	refresh: () => void;
	state: OperatorHomeState;
} {
	const abortRef = useRef<AbortController | null>(null);
	const hasLoadedRef = useRef(false);
	const requestIdRef = useRef(0);
	const wasActiveRef = useRef(false);
	const [state, setState] = useState<OperatorHomeState>(createInitialState);

	const loadSummary = useEffectEvent(
		async (_reason: "activate" | "mount" | "online" | "refresh") => {
			requestIdRef.current += 1;
			const requestId = requestIdRef.current;

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			startTransition(() => {
				setState((previous) => {
					if (previous.data) {
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
				const payload = await fetchOperatorHomeSummary({
					signal: controller.signal,
				});

				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				hasLoadedRef.current = true;
				writeSnapshot(payload);

				startTransition(() => {
					setState({
						data: payload,
						error: null,
						isRefreshing: false,
						lastUpdatedAt: new Date().toISOString(),
						status: payload.status,
					});
				});
			} catch (error) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const clientError = toOperatorHomeClientError(error);

				startTransition(() => {
					setState((previous) => ({
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
		if (!input.isActive) {
			return;
		}

		if (state.status === "offline") {
			void loadSummary("online");
		}
	});

	useEffect(() => {
		const becameActive = input.isActive && !wasActiveRef.current;

		if (becameActive) {
			void loadSummary(hasLoadedRef.current ? "activate" : "mount");
		}

		wasActiveRef.current = input.isActive;

		return () => {
			wasActiveRef.current = false;
		};
	}, [input.isActive]);

	useEffect(() => {
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
			if (!input.isActive || state.isRefreshing || state.status === "loading") {
				return;
			}

			void loadSummary("refresh");
		},
		state,
	};
}

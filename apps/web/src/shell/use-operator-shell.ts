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
import {
	getDefaultShellSurfaceId,
	type OperatorShellStartupStatus,
	type OperatorShellSummaryPayload,
	resolveShellSurfaceId,
	type ShellSurfaceId,
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
	selectedSurface: ShellSurfaceId;
	status: OperatorShellViewStatus;
};

const EMPTY_STATE: OperatorShellState = {
	data: null,
	error: null,
	isRefreshing: false,
	lastUpdatedAt: null,
	selectedSurface: resolveShellSurfaceId(window.location.hash),
	status: "empty",
};

function syncHash(surfaceId: ShellSurfaceId, replace = false): void {
	const nextHash = `#${surfaceId}`;

	if (window.location.hash === nextHash) {
		return;
	}

	const url = new URL(window.location.href);
	url.hash = nextHash;

	if (replace) {
		window.history.replaceState(null, "", url);
		return;
	}

	window.location.hash = nextHash;
}

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
	selectSurface: (surfaceId: ShellSurfaceId) => void;
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

	const handleHashChange = useEffectEvent(() => {
		const nextSurface = resolveShellSurfaceId(window.location.hash);

		startTransition(() => {
			setState((previous) =>
				previous.selectedSurface === nextSurface
					? previous
					: {
							...previous,
							selectedSurface: nextSurface,
						},
			);
		});

		if (window.location.hash !== `#${nextSurface}`) {
			syncHash(nextSurface, true);
		}
	});

	const handleOnline = useEffectEvent(() => {
		if (state.status === "offline") {
			void loadSummary("online");
		}
	});

	useEffect(() => {
		void loadSummary("mount");
		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("online", handleOnline);

		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("online", handleOnline);
		};
	}, []);

	useEffect(() => {
		if (!state.data) {
			return;
		}

		const hasExplicitHash = window.location.hash.trim().length > 0;

		if (state.status === "missing-prerequisites") {
			if (state.selectedSurface !== "onboarding") {
				startTransition(() => {
					setState((previous) => ({
						...previous,
						selectedSurface: "onboarding",
					}));
				});
			}

			syncHash("onboarding", true);
			return;
		}

		if (state.status === "ready" && state.selectedSurface === "onboarding") {
			startTransition(() => {
				setState((previous) => ({
					...previous,
					selectedSurface: "home",
				}));
			});
			syncHash("home", true);
			return;
		}

		if (!hasExplicitHash) {
			const defaultSurface = getDefaultShellSurfaceId(state.data.status);

			if (state.selectedSurface !== defaultSurface) {
				startTransition(() => {
					setState((previous) => ({
						...previous,
						selectedSurface: defaultSurface,
					}));
				});
			}

			syncHash(defaultSurface, true);
		}
	}, [state.data, state.selectedSurface, state.status]);

	return {
		refresh: () => {
			if (state.isRefreshing || state.status === "loading") {
				return;
			}

			void loadSummary("refresh");
		},
		selectSurface: (surfaceId) => {
			startTransition(() => {
				setState((previous) =>
					previous.selectedSurface === surfaceId
						? previous
						: {
								...previous,
								selectedSurface: surfaceId,
							},
				);
			});
			syncHash(surfaceId);
		},
		state,
	};
}

import {
	startTransition,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import type { StartupStatus } from "../boot/startup-types";
import {
	fetchResearchSpecialistSummary,
	ResearchSpecialistReviewClientError,
	type ResearchSpecialistReviewFocus,
} from "./research-specialist-review-client";
import type { ResearchSpecialistSummaryPayload } from "./research-specialist-review-types";
import {
	resolveSpecialistWorkspaceDetailRoute,
	resolveSpecialistWorkspaceInlineReviewFamily,
	type SpecialistWorkspaceInlineReviewFamily,
	type SpecialistWorkspaceMode,
	type SpecialistWorkspaceSelectedSummary,
	type SpecialistWorkspaceSummaryPayload,
} from "./specialist-workspace-types";
import {
	fetchTrackerSpecialistSummary,
	TrackerSpecialistReviewClientError,
	type TrackerSpecialistReviewFocus,
} from "./tracker-specialist-review-client";
import type { TrackerSpecialistSummaryPayload } from "./tracker-specialist-review-types";

export type SpecialistReviewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| StartupStatus;

export type SpecialistReviewSelection = {
	detailRoute: string | null;
	family: SpecialistWorkspaceInlineReviewFamily | null;
	mode: SpecialistWorkspaceMode | null;
	sessionId: string | null;
};

export type SpecialistReviewPayload =
	| {
			family: "research-specialist";
			payload: ResearchSpecialistSummaryPayload;
	  }
	| {
			family: "tracker-specialist";
			payload: TrackerSpecialistSummaryPayload;
	  };

export type SpecialistReviewError =
	| ResearchSpecialistReviewClientError
	| TrackerSpecialistReviewClientError
	| null;

type SpecialistReviewClientError =
	| ResearchSpecialistReviewClientError
	| TrackerSpecialistReviewClientError;

export type SpecialistReviewState = {
	error: SpecialistReviewError;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	payload: SpecialistReviewPayload | null;
	selectedSummary: SpecialistWorkspaceSelectedSummary | null;
	selection: SpecialistReviewSelection;
	status: SpecialistReviewStatus;
};

type UseSpecialistReviewInput = {
	focus: {
		mode: SpecialistWorkspaceMode | null;
		sessionId: string | null;
	};
	lastUpdatedAt: string | null;
	summary: SpecialistWorkspaceSummaryPayload | null;
};

function createEmptySelection(): SpecialistReviewSelection {
	return {
		detailRoute: null,
		family: null,
		mode: null,
		sessionId: null,
	};
}

function createEmptyState(): SpecialistReviewState {
	return {
		error: null,
		isRefreshing: false,
		lastUpdatedAt: null,
		payload: null,
		selectedSummary: null,
		selection: createEmptySelection(),
		status: "empty",
	};
}

function resolveSelection(input: UseSpecialistReviewInput): {
	selectedSummary: SpecialistWorkspaceSelectedSummary | null;
	selection: SpecialistReviewSelection;
} {
	const selectedSummary = input.summary?.selected.summary ?? null;
	const mode =
		selectedSummary?.handoff.mode ??
		input.summary?.selected.requestedMode ??
		input.focus.mode ??
		null;
	const sessionId =
		selectedSummary?.session?.sessionId ??
		input.summary?.selected.requestedSessionId ??
		input.focus.sessionId ??
		null;
	const detailRoute =
		selectedSummary?.result.detailSurface?.path ??
		selectedSummary?.handoff.detailSurface?.path ??
		resolveSpecialistWorkspaceDetailRoute(mode);

	return {
		selectedSummary,
		selection: {
			detailRoute,
			family: resolveSpecialistWorkspaceInlineReviewFamily(mode),
			mode,
			sessionId,
		},
	};
}

function createSelectionKey(selection: SpecialistReviewSelection): string {
	return [
		selection.family ?? "none",
		selection.mode ?? "none",
		selection.sessionId ?? "none",
	].join(":");
}

function normalizeError(error: unknown): SpecialistReviewClientError {
	if (
		error instanceof ResearchSpecialistReviewClientError ||
		error instanceof TrackerSpecialistReviewClientError
	) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);

	return new TrackerSpecialistReviewClientError({
		cause: error,
		code: "unknown-client-error",
		message,
		state: "error",
	});
}

export function useSpecialistReview(
	input: UseSpecialistReviewInput,
): SpecialistReviewState {
	const requestIdRef = useRef(0);
	const abortRef = useRef<AbortController | null>(null);
	const snapshotRef = useRef<Map<string, SpecialistReviewPayload>>(new Map());
	const [state, setState] = useState<SpecialistReviewState>(createEmptyState);
	const resolved = resolveSelection(input);
	const selectionKey = createSelectionKey(resolved.selection);

	const loadReview = useEffectEvent(
		async (
			reason: "refresh" | "selection",
			selectionKeyOverride?: string,
			lastUpdatedAtOverride?: string | null,
		) => {
			const activeSelectionKey = selectionKeyOverride ?? selectionKey;
			const activeLastUpdatedAt = lastUpdatedAtOverride ?? input.lastUpdatedAt;

			if (!resolved.selection.family || !resolved.selection.mode) {
				startTransition(() => {
					setState({
						error: null,
						isRefreshing: false,
						lastUpdatedAt: activeLastUpdatedAt,
						payload: null,
						selectedSummary: resolved.selectedSummary,
						selection: resolved.selection,
						status: "empty",
					});
				});
				return;
			}

			requestIdRef.current += 1;
			const requestId = requestIdRef.current;

			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			const snapshot = snapshotRef.current.get(activeSelectionKey) ?? null;

			startTransition(() => {
				setState({
					error: null,
					isRefreshing: snapshot !== null || reason === "refresh",
					lastUpdatedAt: state.lastUpdatedAt,
					payload: snapshot,
					selectedSummary: resolved.selectedSummary,
					selection: resolved.selection,
					status: "loading",
				});
			});

			try {
				const payload =
					resolved.selection.family === "tracker-specialist"
						? {
								family: "tracker-specialist" as const,
								payload: await fetchTrackerSpecialistSummary({
									focus: {
										mode: resolved.selection
											.mode as TrackerSpecialistReviewFocus["mode"],
										sessionId: resolved.selection.sessionId,
									},
									signal: controller.signal,
								}),
							}
						: {
								family: "research-specialist" as const,
								payload: await fetchResearchSpecialistSummary({
									focus: {
										mode: resolved.selection
											.mode as ResearchSpecialistReviewFocus["mode"],
										sessionId: resolved.selection.sessionId,
									},
									signal: controller.signal,
								}),
							};

				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				snapshotRef.current.set(activeSelectionKey, payload);

				startTransition(() => {
					setState({
						error: null,
						isRefreshing: false,
						lastUpdatedAt: new Date().toISOString(),
						payload,
						selectedSummary: resolved.selectedSummary,
						selection: resolved.selection,
						status: payload.payload.status,
					});
				});
			} catch (error) {
				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return;
				}

				const clientError = normalizeError(error);

				startTransition(() => {
					setState({
						error: clientError,
						isRefreshing: false,
						lastUpdatedAt: state.lastUpdatedAt,
						payload: snapshot,
						selectedSummary: resolved.selectedSummary,
						selection: resolved.selection,
						status: clientError.state,
					});
				});
			}
		},
	);

	useEffect(() => {
		void loadReview("selection", selectionKey);
	}, [selectionKey]);

	useEffect(() => {
		if (requestIdRef.current === 0) {
			return;
		}

		void loadReview("refresh", selectionKey, input.lastUpdatedAt);
	}, [input.lastUpdatedAt, selectionKey]);

	useEffect(() => {
		return () => {
			requestIdRef.current += 1;
			abortRef.current?.abort();
			abortRef.current = null;
		};
	}, []);

	return state;
}

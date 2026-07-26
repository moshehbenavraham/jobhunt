import type { EvaluationResultClientError } from "./evaluation-result-client";
import type { EvaluationResultSummaryPayload } from "./evaluation-result-types";

export type RunDetailViewStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| "ready";

export type RunDetailViewState = {
	data: EvaluationResultSummaryPayload | null;
	error: EvaluationResultClientError | null;
	isRefreshing: boolean;
	runId: string;
	status: RunDetailViewStatus;
};

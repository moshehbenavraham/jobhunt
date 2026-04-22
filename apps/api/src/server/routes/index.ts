import type { ApiRouteDefinition } from "../route-contract.js";
import { createApprovalInboxRoute } from "./approval-inbox-route.js";
import { createApprovalResolutionRoute } from "./approval-resolution-route.js";
import { createBatchSupervisorActionRoute } from "./batch-supervisor-action-route.js";
import { createBatchSupervisorRoute } from "./batch-supervisor-route.js";
import { createChatConsoleRoute } from "./chat-console-route.js";
import { createEvaluationResultRoute } from "./evaluation-result-route.js";
import { createHealthRoute } from "./health-route.js";
import { createOnboardingRepairRoute } from "./onboarding-repair-route.js";
import { createOnboardingRoute } from "./onboarding-route.js";
import { createOperatorShellRoute } from "./operator-shell-route.js";
import { createOrchestrationRoute } from "./orchestration-route.js";
import { createPipelineReviewRoute } from "./pipeline-review-route.js";
import { createReportViewerRoute } from "./report-viewer-route.js";
import { createRuntimeApprovalsRoute } from "./runtime-approvals-route.js";
import { createRuntimeDiagnosticsRoute } from "./runtime-diagnostics-route.js";
import { createScanReviewActionRoute } from "./scan-review-action-route.js";
import { createScanReviewRoute } from "./scan-review-route.js";
import { createSettingsRoute } from "./settings-route.js";
import { createStartupRoute } from "./startup-route.js";
import { createTrackerWorkspaceActionRoute } from "./tracker-workspace-action-route.js";
import { createTrackerWorkspaceRoute } from "./tracker-workspace-route.js";

function assertUniqueRouteSignatures(
	routes: readonly ApiRouteDefinition[],
): void {
	const seenSignatures = new Set<string>();

	for (const route of routes) {
		for (const method of route.methods) {
			const signature = `${method} ${route.path}`;

			if (seenSignatures.has(signature)) {
				throw new Error(`Duplicate route registration detected: ${signature}`);
			}

			seenSignatures.add(signature);
		}
	}
}

export function createApiRouteRegistry(): ApiRouteDefinition[] {
	const routes = [
		createHealthRoute(),
		createApprovalInboxRoute(),
		createApprovalResolutionRoute(),
		createChatConsoleRoute(),
		createEvaluationResultRoute(),
		createOrchestrationRoute(),
		createOnboardingRoute(),
		createOnboardingRepairRoute(),
		createOperatorShellRoute(),
		createBatchSupervisorRoute(),
		createBatchSupervisorActionRoute(),
		createPipelineReviewRoute(),
		createScanReviewRoute(),
		createScanReviewActionRoute(),
		createReportViewerRoute(),
		createTrackerWorkspaceRoute(),
		createTrackerWorkspaceActionRoute(),
		createSettingsRoute(),
		createStartupRoute(),
		createRuntimeApprovalsRoute(),
		createRuntimeDiagnosticsRoute(),
	];

	assertUniqueRouteSignatures(routes);
	return routes;
}

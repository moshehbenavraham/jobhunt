import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/home-page";
import { RootLayout } from "./shell/root-layout";

function hashRedirectLoader() {
	const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();

	if (!hash) {
		return null;
	}

	const LEGACY_HASH_MAP: Record<string, string> = {
		home: "/",
		startup: "/startup",
		chat: "/evaluate",
		workflows: "/workflows",
		scan: "/scan",
		batch: "/batch",
		"application-help": "/apply",
		pipeline: "/pipeline",
		tracker: "/tracker",
		artifacts: "/artifacts",
		onboarding: "/onboarding",
		approvals: "/approvals",
		settings: "/settings",
	};

	const target = LEGACY_HASH_MAP[hash];

	if (target) {
		window.history.replaceState(null, "", target);
		return new Response(null, {
			status: 302,
			headers: { Location: target },
		});
	}

	return null;
}

export const router = createBrowserRouter([
	{
		path: "/",
		Component: RootLayout,
		children: [
			{
				index: true,
				loader: hashRedirectLoader,
				Component: HomePage,
			},
			{
				path: "startup",
				lazy: async () => ({
					Component: (await import("./pages/startup-page")).StartupPage,
				}),
			},
			{
				path: "evaluate",
				lazy: async () => ({
					Component: (await import("./pages/chat-page")).ChatPage,
				}),
			},
			{
				path: "workflows",
				lazy: async () => ({
					Component: (await import("./pages/workflows-page")).WorkflowsPage,
				}),
			},
			{
				path: "scan",
				lazy: async () => ({
					Component: (await import("./pages/scan-page")).ScanPage,
				}),
			},
			{
				path: "batch",
				lazy: async () => ({
					Component: (await import("./pages/batch-page")).BatchPage,
				}),
			},
			{
				path: "apply",
				lazy: async () => ({
					Component: (await import("./pages/apply-page")).ApplyPage,
				}),
			},
			{
				path: "pipeline",
				lazy: async () => ({
					Component: (await import("./pages/pipeline-page")).PipelinePage,
				}),
			},
			{
				path: "tracker",
				lazy: async () => ({
					Component: (await import("./pages/tracker-page")).TrackerPage,
				}),
			},
			{
				path: "artifacts",
				lazy: async () => ({
					Component: (await import("./pages/artifacts-page")).ArtifactsPage,
				}),
			},
			{
				path: "onboarding",
				lazy: async () => ({
					Component: (await import("./pages/onboarding-page")).OnboardingPage,
				}),
			},
			{
				path: "approvals",
				lazy: async () => ({
					Component: (await import("./pages/approvals-page")).ApprovalsPage,
				}),
			},
			{
				path: "settings",
				lazy: async () => ({
					Component: (await import("./pages/settings-page")).SettingsPage,
				}),
			},
			{
				path: "runs/:runId",
				lazy: async () => ({
					Component: (await import("./pages/run-detail-page")).RunDetailPage,
				}),
			},
			{
				path: "reports/:reportId",
				lazy: async () => ({
					Component: (await import("./pages/report-page")).ReportPage,
				}),
			},
			{
				path: "workflows/:workflowId",
				lazy: async () => ({
					Component: (await import("./pages/workflow-detail-page"))
						.WorkflowDetailPage,
				}),
			},
			{
				path: "batch/:batchId",
				lazy: async () => ({
					Component: (await import("./pages/batch-detail-page"))
						.BatchDetailPage,
				}),
			},
			{
				path: "scan/:scanId",
				lazy: async () => ({
					Component: (await import("./pages/scan-detail-page")).ScanDetailPage,
				}),
			},
			{
				path: "*",
				lazy: async () => ({
					Component: (await import("./pages/not-found-page")).NotFoundPage,
				}),
			},
		],
	},
]);

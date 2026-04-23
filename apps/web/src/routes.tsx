import { createBrowserRouter } from "react-router";
import { ApplyPage } from "./pages/apply-page";
import { ApprovalsPage } from "./pages/approvals-page";
import { ArtifactsPage } from "./pages/artifacts-page";
import { BatchPage } from "./pages/batch-page";
import { ChatPage } from "./pages/chat-page";
import { HomePage } from "./pages/home-page";
import { NotFoundPage } from "./pages/not-found-page";
import { OnboardingPage } from "./pages/onboarding-page";
import { PipelinePage } from "./pages/pipeline-page";
import { ReportPage } from "./pages/report-page";
import { RunDetailPage } from "./pages/run-detail-page";
import { ScanPage } from "./pages/scan-page";
import { SettingsPage } from "./pages/settings-page";
import { StartupPage } from "./pages/startup-page";
import { TrackerPage } from "./pages/tracker-page";
import { WorkflowsPage } from "./pages/workflows-page";
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
			{ path: "startup", Component: StartupPage },
			{ path: "evaluate", Component: ChatPage },
			{ path: "workflows", Component: WorkflowsPage },
			{ path: "scan", Component: ScanPage },
			{ path: "batch", Component: BatchPage },
			{ path: "apply", Component: ApplyPage },
			{ path: "pipeline", Component: PipelinePage },
			{ path: "tracker", Component: TrackerPage },
			{ path: "artifacts", Component: ArtifactsPage },
			{ path: "onboarding", Component: OnboardingPage },
			{ path: "approvals", Component: ApprovalsPage },
			{ path: "settings", Component: SettingsPage },
			{ path: "runs/:runId", Component: RunDetailPage },
			{ path: "reports/:reportId", Component: ReportPage },
			{ path: "*", Component: NotFoundPage },
		],
	},
]);

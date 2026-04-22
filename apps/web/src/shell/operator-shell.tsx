import type { CSSProperties } from "react";
import { useDeferredValue } from "react";
import { syncApprovalInboxFocus } from "../approvals/approval-inbox-client";
import { ApprovalInboxSurface } from "../approvals/approval-inbox-surface";
import { StartupStatusPanel } from "../boot/startup-status-panel";
import { useStartupDiagnostics } from "../boot/use-startup-diagnostics";
import { syncChatConsoleSessionFocus } from "../chat/chat-console-client";
import { ChatConsoleSurface } from "../chat/chat-console-surface";
import { OnboardingWizardSurface } from "../onboarding/onboarding-wizard-surface";
import { syncPipelineReviewFocus } from "../pipeline/pipeline-review-client";
import { PipelineReviewSurface } from "../pipeline/pipeline-review-surface";
import { syncReportViewerFocus } from "../reports/report-viewer-client";
import { ReportViewerSurface } from "../reports/report-viewer-surface";
import { ScanReviewSurface } from "../scan/scan-review-surface";
import { SettingsSurface } from "../settings/settings-surface";
import { syncTrackerWorkspaceFocus } from "../tracker/tracker-workspace-client";
import { TrackerWorkspaceSurface } from "../tracker/tracker-workspace-surface";
import { NavigationRail } from "./navigation-rail";
import { getShellSurface } from "./shell-types";
import { StatusStrip } from "./status-strip";
import { SurfacePlaceholder } from "./surface-placeholder";
import { useOperatorShell } from "./use-operator-shell";

const pageStyle: CSSProperties = {
	background:
		"radial-gradient(circle at top left, #fff7ed 0%, #f8fafc 38%, #f5f3ff 100%)",
	color: "#0f172a",
	fontFamily: '"Avenir Next", "Trebuchet MS", "Gill Sans", sans-serif',
	lineHeight: 1.6,
	minHeight: "100vh",
	padding: "1.2rem 1rem 2rem",
};

const frameStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
	margin: "0 auto",
	maxWidth: "88rem",
};

const shellBodyStyle: CSSProperties = {
	alignItems: "start",
	display: "flex",
	flexWrap: "wrap",
	gap: "1rem",
};

const railWrapperStyle: CSSProperties = {
	flex: "1 1 18rem",
	minWidth: "16rem",
};

const surfaceWrapperStyle: CSSProperties = {
	flex: "999 1 42rem",
	minWidth: "18rem",
};

const surfaceCardStyle: CSSProperties = {
	backdropFilter: "blur(16px)",
	background: "rgba(255, 255, 255, 0.84)",
	border: "1px solid rgba(148, 163, 184, 0.18)",
	borderRadius: "1.6rem",
	minHeight: "100%",
	padding: "1.15rem",
};

const startupNoticeStyle: CSSProperties = {
	background: "#fff7ed",
	border: "1px solid #fed7aa",
	borderRadius: "1.1rem",
	padding: "0.95rem 1rem",
};

function renderStartupNotice(
	startupStatus: ReturnType<typeof useStartupDiagnostics>["state"]["status"],
	message: string | null,
) {
	switch (startupStatus) {
		case "missing-prerequisites":
			return (
				<section style={startupNoticeStyle}>
					<h2 style={{ marginTop: 0 }}>Onboarding still needs attention</h2>
					<p style={{ marginBottom: 0 }}>
						{message ??
							"Required user-layer files are missing. The diagnostics panel below lists the exact paths to repair."}
					</p>
				</section>
			);
		case "auth-required":
		case "expired-auth":
		case "invalid-auth":
		case "prompt-failure":
			return (
				<section
					style={{
						...startupNoticeStyle,
						background: "#dbeafe",
						borderColor: "#bfdbfe",
					}}
				>
					<h2 style={{ marginTop: 0 }}>Agent runtime is not ready</h2>
					<p style={{ marginBottom: 0 }}>
						{message ??
							"The startup contract loaded, but agent runtime readiness still needs attention."}
					</p>
				</section>
			);
		case "runtime-error":
			return (
				<section
					style={{
						...startupNoticeStyle,
						background: "#fee2e2",
						borderColor: "#fecaca",
					}}
				>
					<h2 style={{ marginTop: 0 }}>Runtime blockers detected</h2>
					<p style={{ marginBottom: 0 }}>
						{message ??
							"System-owned runtime files are missing or corrupt. Review the diagnostics before moving on."}
					</p>
				</section>
			);
		default:
			return null;
	}
}

function renderStartupSurface(
	startup: ReturnType<typeof useStartupDiagnostics>["state"],
	onRefresh: () => void,
	onOpenOnboarding: () => void,
) {
	const hasDiagnostics = startup.data !== null;

	if (startup.status === "empty") {
		return (
			<section style={startupNoticeStyle}>
				<h2 style={{ marginTop: 0 }}>Waiting for startup diagnostics</h2>
				<p style={{ marginBottom: 0 }}>
					Refresh to request the first startup payload from the API.
				</p>
			</section>
		);
	}

	if (startup.status === "loading" && !hasDiagnostics) {
		return (
			<section style={startupNoticeStyle}>
				<h2 style={{ marginTop: 0 }}>Checking startup readiness</h2>
				<p style={{ marginBottom: 0 }}>
					Reading the repo boundary, prompt contract, and operational-store
					surface from the API.
				</p>
			</section>
		);
	}

	if (startup.status === "offline" && !hasDiagnostics) {
		return (
			<section style={startupNoticeStyle}>
				<h2 style={{ marginTop: 0 }}>Startup API unavailable</h2>
				<p style={{ marginBottom: 0 }}>
					{startup.error?.message ??
						"The local API is not reachable. Start `npm run app:api:serve` and retry."}
				</p>
			</section>
		);
	}

	if (startup.status === "error" && !hasDiagnostics) {
		return (
			<section
				style={{
					...startupNoticeStyle,
					background: "#fee2e2",
					borderColor: "#fecaca",
				}}
			>
				<h2 style={{ marginTop: 0 }}>Startup diagnostics failed</h2>
				<p style={{ marginBottom: 0 }}>
					{startup.error?.message ??
						"The startup contract failed before diagnostics could load."}
				</p>
			</section>
		);
	}

	return (
		<section
			aria-labelledby="surface-title-startup"
			style={{
				display: "grid",
				gap: "1rem",
			}}
		>
			<header style={surfaceCardStyle}>
				<p
					style={{
						color: "#7c2d12",
						letterSpacing: "0.08em",
						marginBottom: "0.5rem",
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					Session 01
				</p>
				<h2 id="surface-title-startup" style={{ marginBottom: "0.45rem" }}>
					Canonical startup surface
				</h2>
				<p style={{ color: "#475569", marginBottom: 0 }}>
					The startup diagnostics contract remains the source of truth for
					readiness. The shell wraps it without changing ownership or mutating
					the workspace.
				</p>
			</header>

			{renderStartupNotice(startup.status, startup.data?.message ?? null)}

			{startup.status === "offline" && hasDiagnostics ? (
				<section style={startupNoticeStyle}>
					<h2 style={{ marginTop: 0 }}>
						Offline after the last startup refresh
					</h2>
					<p style={{ marginBottom: 0 }}>
						{startup.error?.message ??
							"The API stopped responding after the previous startup refresh."}
					</p>
				</section>
			) : null}

			{startup.status === "error" && hasDiagnostics ? (
				<section
					style={{
						...startupNoticeStyle,
						background: "#fee2e2",
						borderColor: "#fecaca",
					}}
				>
					<h2 style={{ marginTop: 0 }}>Startup contract error</h2>
					<p style={{ marginBottom: 0 }}>
						Runtime blockers were detected in the checked-in repo contract.
					</p>
				</section>
			) : null}

			{startup.data ? (
				<StartupStatusPanel
					diagnostics={startup.data}
					isRefreshing={startup.isRefreshing}
					lastUpdatedAt={startup.lastUpdatedAt}
					onOpenOnboarding={onOpenOnboarding}
					onRefresh={onRefresh}
					variant="shell"
				/>
			) : null}
		</section>
	);
}

export function OperatorShell() {
	const startup = useStartupDiagnostics();
	const shell = useOperatorShell();
	const renderedSurfaceId = useDeferredValue(shell.state.selectedSurface);
	const renderedSurface = getShellSurface(renderedSurfaceId);
	const openApprovals = (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => {
		syncApprovalInboxFocus(focus, {
			openSurface: true,
		});
		shell.selectSurface("approvals");
	};
	const openArtifacts = (focus: { reportPath: string | null }) => {
		syncReportViewerFocus(
			{
				group: "reports",
				offset: 0,
				reportPath: focus.reportPath,
			},
			{
				openSurface: true,
			},
		);
		shell.selectSurface("artifacts");
	};
	const openPipeline = (focus: {
		reportNumber: string | null;
		section: "all" | "processed";
		url: string | null;
	}) => {
		syncPipelineReviewFocus(
			{
				offset: 0,
				reportNumber: focus.reportNumber,
				section: focus.section,
				url: focus.reportNumber ? null : focus.url,
			},
			{
				openSurface: true,
			},
		);
		shell.selectSurface("pipeline");
	};
	const openTracker = (focus: { reportNumber: string | null }) => {
		syncTrackerWorkspaceFocus(
			{
				entryNumber: null,
				offset: 0,
				reportNumber: focus.reportNumber,
			},
			{
				openSurface: true,
			},
		);
		shell.selectSurface("tracker");
	};
	const openChatConsole = (focus: { sessionId: string | null }) => {
		syncChatConsoleSessionFocus(
			{
				sessionId: focus.sessionId,
			},
			{
				replace: false,
			},
		);
		shell.selectSurface("chat");
	};

	return (
		<main style={pageStyle}>
			<div style={frameStyle}>
				<StatusStrip
					error={shell.state.error}
					isRefreshing={shell.state.isRefreshing || startup.state.isRefreshing}
					lastUpdatedAt={shell.state.lastUpdatedAt}
					onOpenApprovals={openApprovals}
					onRefresh={() => {
						shell.refresh();
						startup.refresh();
					}}
					status={shell.state.status}
					summary={shell.state.data}
				/>

				<div style={shellBodyStyle}>
					<aside style={railWrapperStyle}>
						<NavigationRail
							currentSurface={shell.state.selectedSurface}
							onSelect={shell.selectSurface}
							summary={shell.state.data}
						/>
					</aside>

					<section
						id={`surface-${renderedSurface.id}`}
						style={surfaceWrapperStyle}
					>
						<div style={surfaceCardStyle}>
							{renderedSurface.id === "startup" ? (
								renderStartupSurface(startup.state, startup.refresh, () =>
									shell.selectSurface("onboarding"),
								)
							) : renderedSurface.id === "chat" ? (
								<ChatConsoleSurface
									onOpenApprovals={openApprovals}
									onOpenPipelineReview={openPipeline}
									onOpenReportViewer={openArtifacts}
									onOpenTrackerReview={openTracker}
								/>
							) : renderedSurface.id === "scan" ? (
								<ScanReviewSurface onOpenChatConsole={openChatConsole} />
							) : renderedSurface.id === "pipeline" ? (
								<PipelineReviewSurface onOpenReportViewer={openArtifacts} />
							) : renderedSurface.id === "tracker" ? (
								<TrackerWorkspaceSurface onOpenReportViewer={openArtifacts} />
							) : renderedSurface.id === "artifacts" ? (
								<ReportViewerSurface />
							) : renderedSurface.id === "onboarding" ? (
								<OnboardingWizardSurface
									onOpenChat={() => shell.selectSurface("chat")}
									onOpenStartup={() => shell.selectSurface("startup")}
									onRepairApplied={() => {
										startup.refresh();
										shell.refresh();
									}}
								/>
							) : renderedSurface.id === "approvals" ? (
								<ApprovalInboxSurface />
							) : renderedSurface.id === "settings" ? (
								<SettingsSurface
									onOpenOnboarding={() => shell.selectSurface("onboarding")}
									onOpenStartup={() => shell.selectSurface("startup")}
									onSummaryRefresh={() => {
										startup.refresh();
										shell.refresh();
									}}
								/>
							) : (
								<SurfacePlaceholder
									key={`${renderedSurface.id}:${shell.state.data?.generatedAt ?? "empty"}`}
									summary={shell.state.data}
									surface={renderedSurface}
								/>
							)}
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}

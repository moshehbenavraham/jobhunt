import type { CSSProperties } from "react";
import { useDeferredValue } from "react";
import { syncApplicationHelpFocus } from "../application-help/application-help-client";
import { ApplicationHelpSurface } from "../application-help/application-help-surface";
import { syncApprovalInboxFocus } from "../approvals/approval-inbox-client";
import { ApprovalInboxSurface } from "../approvals/approval-inbox-surface";
import { syncBatchWorkspaceFocus } from "../batch/batch-workspace-client";
import { BatchWorkspaceSurface } from "../batch/batch-workspace-surface";
import { StartupStatusPanel } from "../boot/startup-status-panel";
import { useStartupDiagnostics } from "../boot/use-startup-diagnostics";
import { syncChatConsoleSessionFocus } from "../chat/chat-console-client";
import { ChatConsoleSurface } from "../chat/chat-console-surface";
import { OnboardingWizardSurface } from "../onboarding/onboarding-wizard-surface";
import { syncPipelineReviewFocus } from "../pipeline/pipeline-review-client";
import { PipelineReviewSurface } from "../pipeline/pipeline-review-surface";
import { syncReportViewerFocus } from "../reports/report-viewer-client";
import { ReportViewerSurface } from "../reports/report-viewer-surface";
import { syncScanReviewFocus } from "../scan/scan-review-client";
import { ScanReviewSurface } from "../scan/scan-review-surface";
import { SettingsSurface } from "../settings/settings-surface";
import { syncTrackerWorkspaceFocus } from "../tracker/tracker-workspace-client";
import { TrackerWorkspaceSurface } from "../tracker/tracker-workspace-surface";
import { openSpecialistWorkspaceSurface } from "../workflows/specialist-workspace-client";
import { SpecialistWorkspaceSurface } from "../workflows/specialist-workspace-surface";
import type { SpecialistWorkspaceMode } from "../workflows/specialist-workspace-types";
import { SPECIALIST_WORKSPACE_MODE_VALUES } from "../workflows/specialist-workspace-types";
import { EvidenceRail } from "./evidence-rail";
import { NavigationRail } from "./navigation-rail";
import { OperatorHomeSurface } from "./operator-home-surface";
import type { OperatorHomeAction } from "./operator-home-types";
import { getShellSurface } from "./shell-types";
import { StatusStrip } from "./status-strip";
import { SurfacePlaceholder } from "./surface-placeholder";
import { useOperatorHome } from "./use-operator-home";
import { useOperatorShell } from "./use-operator-shell";

const pageStyle: CSSProperties = {
	background: "var(--jh-color-shell-bg)",
	color: "var(--jh-color-text-primary)",
	fontFamily: "var(--jh-font-body)",
	lineHeight: "var(--jh-text-body-line-height)",
	minHeight: "100vh",
};

const surfaceCardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-xl)",
	minHeight: "100%",
	padding: "var(--jh-space-padding)",
};

const startupNoticeStyle: CSSProperties = {
	background: "var(--jh-color-status-warning-bg)",
	border: "var(--jh-border-width) solid var(--jh-color-status-warning-border)",
	borderRadius: "var(--jh-radius-lg)",
	padding: "var(--jh-space-padding-sm) var(--jh-space-padding)",
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
						background: "var(--jh-color-status-auth-bg)",
						borderColor: "var(--jh-color-badge-info-bg)",
					}}
				>
					<h2 style={{ marginTop: 0 }}>Agent runtime is not ready</h2>
					<p style={{ marginBottom: 0 }}>
						{message ??
							"The startup check loaded, but agent runtime readiness still needs attention."}
					</p>
				</section>
			);
		case "runtime-error":
			return (
				<section
					style={{
						...startupNoticeStyle,
						background: "var(--jh-color-status-error-bg)",
						borderColor: "var(--jh-color-status-error-border)",
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
					Refresh to request the first startup readiness check from the API.
				</p>
			</section>
		);
	}

	if (startup.status === "loading" && !hasDiagnostics) {
		return (
			<section style={startupNoticeStyle}>
				<h2 style={{ marginTop: 0 }}>Checking startup readiness</h2>
				<p style={{ marginBottom: 0 }}>
					Reading the repo boundary, prompt readiness, and operational-store
					status from the API.
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
					background: "var(--jh-color-status-error-bg)",
					borderColor: "var(--jh-color-status-error-border)",
				}}
			>
				<h2 style={{ marginTop: 0 }}>Startup diagnostics failed</h2>
				<p style={{ marginBottom: 0 }}>
					{startup.error?.message ??
						"The startup check failed before diagnostics could load."}
				</p>
			</section>
		);
	}

	return (
		<section
			aria-labelledby="surface-title-startup"
			style={{
				display: "grid",
				gap: "var(--jh-zone-gap)",
			}}
		>
			<header style={surfaceCardStyle}>
				<p
					style={{
						color: "var(--jh-color-label-fg)",
						letterSpacing: "0.08em",
						marginBottom: "0.5rem",
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					Build 01
				</p>
				<h2 id="surface-title-startup" style={{ marginBottom: "0.45rem" }}>
					Startup diagnostics
				</h2>
				<p style={{ color: "var(--jh-color-text-secondary)", marginBottom: 0 }}>
					The startup diagnostics remain the source of truth for readiness. The
					shell wraps it without changing ownership or mutating the workspace.
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
						background: "var(--jh-color-status-error-bg)",
						borderColor: "var(--jh-color-status-error-border)",
					}}
				>
					<h2 style={{ marginTop: 0 }}>Startup readiness error</h2>
					<p style={{ marginBottom: 0 }}>
						Runtime blockers were detected in the checked-in repo configuration.
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
	const home = useOperatorHome({
		isActive: shell.state.selectedSurface === "home",
	});
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
	const openTracker = (focus: {
		entryNumber: number | null;
		reportNumber: string | null;
	}) => {
		syncTrackerWorkspaceFocus(
			{
				entryNumber: focus.entryNumber,
				offset: 0,
				reportNumber: focus.reportNumber,
			},
			{
				openSurface: true,
			},
		);
		shell.selectSurface("tracker");
	};
	const openApplicationHelp = (focus: { sessionId: string | null }) => {
		syncApplicationHelpFocus(
			{
				sessionId: focus.sessionId,
			},
			{
				openSurface: true,
			},
		);
		shell.selectSurface("application-help");
	};
	const openSpecialistDetailSurface = (focus: {
		mode: SpecialistWorkspaceMode;
		path: string;
		sessionId: string | null;
	}) => {
		switch (focus.path) {
			case "/application-help":
				openApplicationHelp({
					sessionId: focus.sessionId,
				});
				return;
			case "/research-specialist":
			case "/tracker-specialist":
				openSpecialistWorkspaceSurface({
					mode: focus.mode,
					sessionId: focus.sessionId,
				});
				shell.selectSurface("workflows");
				return;
			default:
				shell.selectSurface("workflows");
		}
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
	const runHomeAction = (action: OperatorHomeAction) => {
		switch (action.surface) {
			case "application-help":
				openApplicationHelp({
					sessionId: action.focus.sessionId,
				});
				return;
			case "approvals":
				openApprovals({
					approvalId: action.focus.approvalId,
					sessionId: action.focus.sessionId,
				});
				return;
			case "artifacts":
				openArtifacts({
					reportPath: action.focus.reportPath,
				});
				return;
			case "batch":
				syncBatchWorkspaceFocus(
					{},
					{
						openSurface: true,
					},
				);
				shell.selectSurface("batch");
				return;
			case "chat":
				openChatConsole({
					sessionId: action.focus.sessionId,
				});
				return;
			case "onboarding":
				shell.selectSurface("onboarding");
				return;
			case "pipeline":
				openPipeline({
					reportNumber: action.focus.reportNumber,
					section: action.focus.section ?? "all",
					url: action.focus.url,
				});
				return;
			case "scan":
				syncScanReviewFocus(
					{
						sessionId: action.focus.sessionId,
						url: action.focus.url,
					},
					{
						openSurface: true,
					},
				);
				shell.selectSurface("scan");
				return;
			case "settings":
				shell.selectSurface("settings");
				return;
			case "startup":
				shell.selectSurface("startup");
				return;
			case "tracker":
				openTracker({
					entryNumber: action.focus.entryNumber,
					reportNumber: action.focus.reportNumber,
				});
				return;
			case "workflows":
				if (
					action.focus.mode &&
					SPECIALIST_WORKSPACE_MODE_VALUES.includes(
						action.focus.mode as SpecialistWorkspaceMode,
					)
				) {
					openSpecialistWorkspaceSurface({
						mode: action.focus.mode as SpecialistWorkspaceMode,
						sessionId: action.focus.sessionId,
					});
				}
				shell.selectSurface("workflows");
				return;
		}
	};

	return (
		<main style={pageStyle}>
			<div className="jh-shell-frame">
				<StatusStrip
					error={shell.state.error}
					isRefreshing={shell.state.isRefreshing || startup.state.isRefreshing}
					lastUpdatedAt={shell.state.lastUpdatedAt}
					onOpenApprovals={openApprovals}
					onRefresh={() => {
						home.refresh();
						shell.refresh();
						startup.refresh();
					}}
					status={shell.state.status}
					summary={shell.state.data}
				/>

				<div className="jh-shell-body">
					<aside>
						<NavigationRail
							currentSurface={shell.state.selectedSurface}
							onSelect={shell.selectSurface}
							summary={shell.state.data}
						/>
					</aside>

					<section id={`surface-${renderedSurface.id}`} style={{ minWidth: 0 }}>
						<div style={surfaceCardStyle}>
							{renderedSurface.id === "home" ? (
								<OperatorHomeSurface
									onRefresh={home.refresh}
									onRunAction={runHomeAction}
									state={home.state}
								/>
							) : renderedSurface.id === "startup" ? (
								renderStartupSurface(startup.state, startup.refresh, () =>
									shell.selectSurface("onboarding"),
								)
							) : renderedSurface.id === "chat" ? (
								<ChatConsoleSurface
									onOpenApprovals={openApprovals}
									onOpenPipelineReview={openPipeline}
									onOpenReportViewer={openArtifacts}
									onOpenTrackerReview={(focus) =>
										openTracker({
											entryNumber: null,
											reportNumber: focus.reportNumber,
										})
									}
								/>
							) : renderedSurface.id === "workflows" ? (
								<SpecialistWorkspaceSurface
									onOpenApprovals={openApprovals}
									onOpenChatConsole={openChatConsole}
									onOpenPipelineReview={openPipeline}
									onOpenReportViewer={openArtifacts}
									onOpenDetailSurface={openSpecialistDetailSurface}
									onOpenTrackerWorkspace={openTracker}
								/>
							) : renderedSurface.id === "scan" ? (
								<ScanReviewSurface onOpenChatConsole={openChatConsole} />
							) : renderedSurface.id === "batch" ? (
								<BatchWorkspaceSurface
									onOpenApprovals={openApprovals}
									onOpenChatConsole={openChatConsole}
									onOpenReportViewer={openArtifacts}
									onOpenTrackerWorkspace={(focus) =>
										openTracker({
											entryNumber: null,
											reportNumber: focus.reportNumber,
										})
									}
								/>
							) : renderedSurface.id === "application-help" ? (
								<ApplicationHelpSurface
									onOpenApprovals={openApprovals}
									onOpenChatConsole={openChatConsole}
									onOpenReportViewer={openArtifacts}
								/>
							) : renderedSurface.id === "pipeline" ? (
								<PipelineReviewSurface onOpenReportViewer={openArtifacts} />
							) : renderedSurface.id === "tracker" ? (
								<TrackerWorkspaceSurface onOpenReportViewer={openArtifacts} />
							) : renderedSurface.id === "artifacts" ? (
								<ReportViewerSurface />
							) : renderedSurface.id === "onboarding" ? (
								<OnboardingWizardSurface
									onOpenHome={() => shell.selectSurface("home")}
									onOpenStartup={() => shell.selectSurface("startup")}
									onRepairApplied={() => {
										startup.refresh();
										shell.refresh();
									}}
								/>
							) : renderedSurface.id === "approvals" ? (
								<ApprovalInboxSurface
									onOpenApplicationHelp={openApplicationHelp}
								/>
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

					<EvidenceRail />
				</div>
			</div>
		</main>
	);
}

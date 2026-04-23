import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { syncApplicationHelpFocus } from "../application-help/application-help-client";
import { syncApprovalInboxFocus } from "../approvals/approval-inbox-client";
import { syncBatchWorkspaceFocus } from "../batch/batch-workspace-client";
import { useStartupDiagnostics } from "../boot/use-startup-diagnostics";
import { syncChatConsoleSessionFocus } from "../chat/chat-console-client";
import { syncPipelineReviewFocus } from "../pipeline/pipeline-review-client";
import { syncReportViewerFocus } from "../reports/report-viewer-client";
import { syncScanReviewFocus } from "../scan/scan-review-client";
import { syncTrackerWorkspaceFocus } from "../tracker/tracker-workspace-client";
import { openSpecialistWorkspaceSurface } from "../workflows/specialist-workspace-client";
import type { SpecialistWorkspaceMode } from "../workflows/specialist-workspace-types";
import { SPECIALIST_WORKSPACE_MODE_VALUES } from "../workflows/specialist-workspace-types";
import { BottomNav } from "./bottom-nav";
import { Drawer } from "./drawer";
import { EvidenceRail } from "./evidence-rail";
import { NavigationRail } from "./navigation-rail";
import type { OperatorHomeAction } from "./operator-home-types";
import type { ShellCallbacks } from "./shell-context";
import { ShellContextProvider } from "./shell-context";
import { pathFromSurfaceId, surfaceIdFromPath } from "./shell-types";
import { StatusStrip } from "./status-strip";
import { useOperatorHome } from "./use-operator-home";
import { useOperatorShell } from "./use-operator-shell";
import { useResponsiveLayout } from "./use-responsive-layout";

const pageStyle: CSSProperties = {
	background: "var(--jh-color-shell-bg)",
	color: "var(--jh-color-text-primary)",
	fontFamily: "var(--jh-font-body)",
	lineHeight: "var(--jh-text-body-line-height)",
	minHeight: "100vh",
};

const evidenceToggleStyle: CSSProperties = {
	alignItems: "center",
	background: "var(--jh-color-nav-bg)",
	border: "var(--jh-border-width) solid var(--jh-color-nav-border)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-nav-text)",
	cursor: "pointer",
	display: "inline-flex",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	gap: "var(--jh-space-2)",
	justifyContent: "center",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

const mobileMenuButtonStyle: CSSProperties = {
	alignItems: "center",
	background: "var(--jh-color-nav-bg)",
	border: "var(--jh-border-width) solid var(--jh-color-nav-border)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-nav-text)",
	cursor: "pointer",
	display: "inline-flex",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	gap: "var(--jh-space-2)",
	justifyContent: "center",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

const drawerHeaderStyle: CSSProperties = {
	alignItems: "center",
	borderBottom: "var(--jh-border-subtle)",
	display: "flex",
	justifyContent: "space-between",
	padding: "var(--jh-space-padding)",
};

const drawerCloseStyle: CSSProperties = {
	background: "none",
	border: "none",
	color: "var(--jh-color-text-primary)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-lg-size)",
	padding: "var(--jh-space-2)",
};

const surfaceCardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-xl)",
	minHeight: "100%",
	padding: "var(--jh-space-padding)",
};

export function RootLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const startup = useStartupDiagnostics();
	const shell = useOperatorShell();
	const responsive = useResponsiveLayout();

	const currentSurface = surfaceIdFromPath(location.pathname) ?? "home";

	const home = useOperatorHome({
		isActive: currentSurface === "home",
	});

	const nav = useMemo(
		() => ({
			toSurface: (id: Parameters<typeof pathFromSurfaceId>[0]) => {
				navigate(pathFromSurfaceId(id));
			},
		}),
		[navigate],
	);

	const openApprovals = useMemo(
		() => (focus: { approvalId: string | null; sessionId: string | null }) => {
			syncApprovalInboxFocus(focus, { openSurface: true });
			nav.toSurface("approvals");
		},
		[nav],
	);

	const openArtifacts = useMemo(
		() => (focus: { reportPath: string | null }) => {
			syncReportViewerFocus(
				{ group: "reports", offset: 0, reportPath: focus.reportPath },
				{ openSurface: true },
			);
			nav.toSurface("artifacts");
		},
		[nav],
	);

	const openPipeline = useMemo(
		() =>
			(focus: {
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
					{ openSurface: true },
				);
				nav.toSurface("pipeline");
			},
		[nav],
	);

	const openTracker = useMemo(
		() =>
			(focus: { entryNumber: number | null; reportNumber: string | null }) => {
				syncTrackerWorkspaceFocus(
					{
						entryNumber: focus.entryNumber,
						offset: 0,
						reportNumber: focus.reportNumber,
					},
					{ openSurface: true },
				);
				nav.toSurface("tracker");
			},
		[nav],
	);

	const openApplicationHelp = useMemo(
		() => (focus: { sessionId: string | null }) => {
			syncApplicationHelpFocus(
				{ sessionId: focus.sessionId },
				{ openSurface: true },
			);
			nav.toSurface("application-help");
		},
		[nav],
	);

	const openSpecialistDetailSurface = useMemo(
		() =>
			(focus: {
				mode: SpecialistWorkspaceMode;
				path: string;
				sessionId: string | null;
			}) => {
				switch (focus.path) {
					case "/application-help":
						openApplicationHelp({ sessionId: focus.sessionId });
						return;
					case "/research-specialist":
					case "/tracker-specialist":
						openSpecialistWorkspaceSurface({
							mode: focus.mode,
							sessionId: focus.sessionId,
						});
						nav.toSurface("workflows");
						return;
					default:
						nav.toSurface("workflows");
				}
			},
		[nav, openApplicationHelp],
	);

	const openChatConsole = useMemo(
		() => (focus: { sessionId: string | null }) => {
			syncChatConsoleSessionFocus(
				{ sessionId: focus.sessionId },
				{ replace: false },
			);
			nav.toSurface("chat");
		},
		[nav],
	);

	const runHomeAction = useMemo(
		() => (action: OperatorHomeAction) => {
			switch (action.surface) {
				case "application-help":
					openApplicationHelp({ sessionId: action.focus.sessionId });
					return;
				case "approvals":
					openApprovals({
						approvalId: action.focus.approvalId,
						sessionId: action.focus.sessionId,
					});
					return;
				case "artifacts":
					openArtifacts({ reportPath: action.focus.reportPath });
					return;
				case "batch":
					syncBatchWorkspaceFocus({}, { openSurface: true });
					nav.toSurface("batch");
					return;
				case "chat":
					openChatConsole({ sessionId: action.focus.sessionId });
					return;
				case "onboarding":
					nav.toSurface("onboarding");
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
						{ openSurface: true },
					);
					nav.toSurface("scan");
					return;
				case "settings":
					nav.toSurface("settings");
					return;
				case "startup":
					nav.toSurface("startup");
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
					nav.toSurface("workflows");
					return;
			}
		},
		[
			nav,
			openApprovals,
			openApplicationHelp,
			openArtifacts,
			openChatConsole,
			openPipeline,
			openTracker,
		],
	);

	const shellCallbacks: ShellCallbacks = useMemo(
		() => ({
			openApprovals,
			openApplicationHelp,
			openArtifacts,
			openChatConsole,
			openPipeline,
			openSpecialistDetailSurface,
			openTracker,
			runHomeAction,
		}),
		[
			openApprovals,
			openApplicationHelp,
			openArtifacts,
			openChatConsole,
			openPipeline,
			openSpecialistDetailSurface,
			openTracker,
			runHomeAction,
		],
	);

	const { breakpoint, isEvidenceDrawerOpen, isNavDrawerOpen, railVariant } =
		responsive.state;
	const isDesktop = breakpoint === "desktop";
	const isMobile = breakpoint === "mobile";
	const showEvidenceInline = isDesktop;

	return (
		<ShellContextProvider value={shellCallbacks}>
			<main style={pageStyle}>
				<div className="jh-shell-frame">
					<StatusStrip
						error={shell.state.error}
						isRefreshing={
							shell.state.isRefreshing || startup.state.isRefreshing
						}
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

					{!isDesktop ? (
						<div
							style={{
								display: "flex",
								gap: "var(--jh-space-2)",
								justifyContent: "flex-end",
								padding: "0 var(--jh-space-2)",
							}}
						>
							{isMobile ? (
								<button
									aria-label="Open navigation"
									onClick={responsive.toggleNavDrawer}
									style={mobileMenuButtonStyle}
									type="button"
								>
									Menu
								</button>
							) : null}
							<button
								aria-label="Toggle evidence panel"
								onClick={responsive.toggleEvidenceDrawer}
								style={evidenceToggleStyle}
								type="button"
							>
								Evidence
							</button>
						</div>
					) : null}

					<div className="jh-shell-body">
						<aside className="jh-nav-rail--inline">
							<NavigationRail
								summary={shell.state.data}
								variant={railVariant}
							/>
						</aside>

						<section style={{ minWidth: 0 }}>
							<div style={surfaceCardStyle}>
								<Outlet
									context={{
										home,
										shell,
										startup,
									}}
								/>
							</div>
						</section>

						{showEvidenceInline ? (
							<EvidenceRail className="jh-evidence-rail--inline" />
						) : null}
					</div>

					<Drawer
						ariaLabel="Evidence and context"
						isOpen={isEvidenceDrawerOpen}
						onClose={responsive.closeEvidenceDrawer}
						side="right"
					>
						<div style={drawerHeaderStyle}>
							<strong>Evidence</strong>
							<button
								aria-label="Close evidence panel"
								onClick={responsive.closeEvidenceDrawer}
								style={drawerCloseStyle}
								type="button"
							>
								X
							</button>
						</div>
						<EvidenceRail inline={false} />
					</Drawer>

					<Drawer
						ariaLabel="Navigation menu"
						isOpen={isNavDrawerOpen}
						onClose={responsive.closeNavDrawer}
						side="left"
						width="min(85vw, var(--jh-zone-drawer-width))"
					>
						<div style={drawerHeaderStyle}>
							<strong>Navigation</strong>
							<button
								aria-label="Close navigation menu"
								onClick={responsive.closeNavDrawer}
								style={drawerCloseStyle}
								type="button"
							>
								X
							</button>
						</div>
						<div
							style={{
								flex: 1,
								overflowY: "auto",
								padding: "var(--jh-space-2)",
							}}
						>
							<NavigationRail
								onDrawerClose={responsive.closeNavDrawer}
								summary={shell.state.data}
								variant="full"
							/>
						</div>
					</Drawer>

					{isMobile ? (
						<BottomNav onMenuTap={responsive.toggleNavDrawer} />
					) : null}
				</div>
			</main>
		</ShellContextProvider>
	);
}

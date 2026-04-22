import type { CSSProperties } from "react";
import { ApplicationHelpContextRail } from "./application-help-context-rail";
import { ApplicationHelpDraftPanel } from "./application-help-draft-panel";
import { ApplicationHelpLaunchPanel } from "./application-help-launch-panel";
import { useApplicationHelp } from "./use-application-help";

type ApplicationHelpSurfaceProps = {
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onOpenChatConsole: (focus: { sessionId: string | null }) => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const detailGridStyle: CSSProperties = {
	alignItems: "start",
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "minmax(0, 1.7fr) minmax(20rem, 1fr)",
};

const noticeStyle: CSSProperties = {
	borderRadius: "1rem",
	padding: "0.9rem",
};

export function ApplicationHelpSurface({
	onOpenApprovals,
	onOpenChatConsole,
	onOpenReportViewer,
}: ApplicationHelpSurfaceProps) {
	const applicationHelp = useApplicationHelp();
	const isBusy =
		applicationHelp.state.isRefreshing ||
		applicationHelp.state.pendingAction !== null;

	return (
		<section
			aria-labelledby="application-help-workspace-title"
			style={surfaceStyle}
		>
			<header
				style={{
					display: "grid",
					gap: "0.35rem",
				}}
			>
				<p
					style={{
						color: "#9a3412",
						letterSpacing: "0.08em",
						marginBottom: 0,
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					Phase 05 / Session 06
				</p>
				<h1
					id="application-help-workspace-title"
					style={{ marginBottom: 0, marginTop: 0 }}
				>
					Application-help workspace
				</h1>
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					Review staged application answers, approval pauses, and report-backed
					context from one bounded shell surface without implying automatic
					submission.
				</p>
			</header>

			{(applicationHelp.state.status === "offline" ||
				applicationHelp.state.status === "error") &&
			applicationHelp.state.error ? (
				<section
					style={{
						...noticeStyle,
						background:
							applicationHelp.state.status === "offline"
								? "#e2e8f0"
								: "#fee2e2",
						border: `1px solid ${
							applicationHelp.state.status === "offline" ? "#cbd5e1" : "#fecaca"
						}`,
					}}
				>
					<strong
						style={{
							display: "block",
							marginBottom: "0.25rem",
						}}
					>
						{applicationHelp.state.status === "offline"
							? "Showing the last application-help snapshot"
							: "Application-help workspace warning"}
					</strong>
					<p style={{ margin: 0 }}>{applicationHelp.state.error.message}</p>
				</section>
			) : null}

			<ApplicationHelpLaunchPanel
				draftInput={applicationHelp.state.draftInput}
				focus={applicationHelp.state.focus}
				isBusy={isBusy}
				lastUpdatedAt={applicationHelp.state.lastUpdatedAt}
				notice={applicationHelp.state.notice}
				onClearNotice={applicationHelp.clearNotice}
				onDraftInputChange={applicationHelp.setDraftInput}
				onLaunch={applicationHelp.launch}
				onRefresh={applicationHelp.refresh}
				onResumeSelected={applicationHelp.resumeSelected}
				onReviewLatest={() => applicationHelp.selectSession(null)}
				status={applicationHelp.state.status}
				summary={applicationHelp.state.data}
			/>

			<div style={detailGridStyle}>
				<ApplicationHelpDraftPanel
					status={applicationHelp.state.status}
					summary={applicationHelp.state.data}
				/>
				<ApplicationHelpContextRail
					onOpenApprovals={onOpenApprovals}
					onOpenChatConsole={onOpenChatConsole}
					onOpenReportViewer={onOpenReportViewer}
					status={applicationHelp.state.status}
					summary={applicationHelp.state.data}
				/>
			</div>
		</section>
	);
}

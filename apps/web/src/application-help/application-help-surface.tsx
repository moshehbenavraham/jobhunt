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
	borderRadius: "var(--jh-radius-md)",
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
				<h1
					id="application-help-workspace-title"
					style={{ marginBottom: 0, marginTop: 0 }}
				>
					Application-help workspace
				</h1>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
					Review staged application answers, approval pauses, and report-backed
					context from one bounded workspace without implying automatic
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
								? "var(--jh-color-status-blocked-bg)"
								: "var(--jh-color-status-error-bg)",
						border: `1px solid ${
							applicationHelp.state.status === "offline"
								? "var(--jh-color-nav-muted)"
								: "var(--jh-color-status-error-border)"
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

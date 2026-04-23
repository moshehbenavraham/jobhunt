import type { CSSProperties } from "react";
import { EvaluationArtifactRail } from "./evaluation-artifact-rail";
import { RecentSessionList } from "./recent-session-list";
import { RunStatusPanel } from "./run-status-panel";
import { RunTimeline } from "./run-timeline";
import { useChatConsole } from "./use-chat-console";
import { WorkflowComposer } from "./workflow-composer";

type ChatConsoleSurfaceProps = {
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onOpenPipelineReview: (focus: {
		reportNumber: string | null;
		section: "all" | "processed";
		url: string | null;
	}) => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
	onOpenTrackerReview: (focus: { reportNumber: string | null }) => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-gap)",
};

const heroStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-gap)",
	justifyContent: "space-between",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontFamily: "var(--jh-font-body)",
	fontWeight: 700,
	minHeight: "2.8rem",
	padding: "0.7rem 1rem",
};

const twoColumnStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-gap)",
	gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
};

const rightColumnStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-gap)",
};

const selectedSummaryStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-gap)",
	padding: "var(--jh-space-padding)",
};

const artifactWorkspaceStyle: CSSProperties = {
	alignItems: "start",
	display: "grid",
	gap: "var(--jh-space-gap)",
	gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
};

function formatTimestamp(value: string | null): string {
	if (!value) {
		return "Not refreshed yet";
	}

	const date = new Date(value);

	if (Number.isNaN(date.valueOf())) {
		return value;
	}

	return date.toLocaleString();
}

export function ChatConsoleSurface({
	onOpenApprovals,
	onOpenPipelineReview,
	onOpenReportViewer,
	onOpenTrackerReview,
}: ChatConsoleSurfaceProps) {
	const chatConsole = useChatConsole();
	const selectedWorkflow =
		chatConsole.state.data?.workflows.find(
			(workflow) => workflow.intent === chatConsole.state.selectedWorkflow,
		) ?? null;
	const selectedSession =
		chatConsole.state.command?.selectedSession ??
		chatConsole.state.data?.selectedSession ??
		null;
	const evaluationSummary =
		chatConsole.state.evaluationResult.data?.summary ?? null;
	const startupMessage =
		chatConsole.state.data?.message ??
		chatConsole.state.error?.message ??
		"Console has not loaded yet.";
	const isConsoleBusy =
		chatConsole.state.isRefreshing ||
		chatConsole.state.evaluationResult.isRefreshing ||
		chatConsole.state.pendingAction !== null;
	const selectedSessionTitle =
		selectedSession?.session.sessionId ??
		evaluationSummary?.session?.sessionId ??
		"No run selected";
	const selectedSessionBody = evaluationSummary
		? `Evaluation ${evaluationSummary.state} -- ${evaluationSummary.closeout.state} closeout, ${evaluationSummary.warnings.totalCount} warning${evaluationSummary.warnings.totalCount === 1 ? "" : "s"}.`
		: selectedSession
			? `${selectedSession.session.workflow} -- ${selectedSession.jobs.length} tracked job${selectedSession.jobs.length === 1 ? "" : "s"}, ${selectedSession.approvals.length} approval${selectedSession.approvals.length === 1 ? "" : "s"}`
			: "Select a recent run to see its evaluation, timeline, and next action.";

	return (
		<section aria-labelledby="chat-console-title" style={surfaceStyle}>
			<header style={heroStyle}>
				<div>
					<h2
						id="chat-console-title"
						style={{
							fontFamily: "var(--jh-font-heading)",
							fontSize: "var(--jh-text-h2-size)",
							fontWeight: "var(--jh-text-h2-weight)",
							marginBottom: "0.35rem",
						}}
					>
						Evaluation console
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							fontFamily: "var(--jh-font-body)",
							marginBottom: "0.2rem",
						}}
					>
						Launch or resume evaluation workflows, then inspect run-to-artifact
						readiness for reports, PDFs, tracker, or approvals.
					</p>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							fontFamily: "var(--jh-font-body)",
							margin: 0,
						}}
					>
						Last refreshed: {formatTimestamp(chatConsole.state.lastUpdatedAt)}
					</p>
				</div>

				<button
					aria-label="Refresh chat console"
					disabled={isConsoleBusy}
					onClick={chatConsole.refresh}
					style={{
						...buttonStyle,
						opacity: isConsoleBusy ? 0.7 : 1,
					}}
					type="button"
				>
					{isConsoleBusy ? "Refreshing..." : "Refresh console"}
				</button>
			</header>

			<div style={twoColumnStyle}>
				<WorkflowComposer
					draftInput={chatConsole.state.draftInput}
					isBusy={isConsoleBusy}
					onDraftInputChange={chatConsole.setDraftInput}
					onLaunch={chatConsole.launch}
					onWorkflowChange={chatConsole.setSelectedWorkflow}
					pendingAction={chatConsole.state.pendingAction}
					selectedWorkflow={chatConsole.state.selectedWorkflow}
					startupMessage={startupMessage}
					status={chatConsole.state.status}
					workflowOptions={chatConsole.state.data?.workflows ?? []}
				/>

				<RunStatusPanel
					command={chatConsole.state.command}
					error={chatConsole.state.error}
					evaluationResult={chatConsole.state.evaluationResult.data}
					isBusy={isConsoleBusy}
					onOpenApprovals={onOpenApprovals}
					selectedSession={selectedSession}
					selectedWorkflow={selectedWorkflow}
					startupMessage={startupMessage}
					status={chatConsole.state.status}
				/>
			</div>

			<div style={twoColumnStyle}>
				<RecentSessionList
					isBusy={isConsoleBusy}
					onResume={chatConsole.resume}
					onSelect={chatConsole.selectSession}
					pendingAction={chatConsole.state.pendingAction}
					selectedSessionId={chatConsole.state.selectedSessionId}
					sessions={chatConsole.state.data?.recentSessions ?? []}
					status={chatConsole.state.status}
				/>

				<div style={rightColumnStyle}>
					<section
						aria-labelledby="chat-console-selected-title"
						style={selectedSummaryStyle}
					>
						<header>
							<p
								style={{
									color: "var(--jh-color-text-secondary)",
									fontFamily: "var(--jh-font-body)",
									fontSize: "var(--jh-text-label-sm-size)",
									fontWeight: "var(--jh-text-label-sm-weight)",
									letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
									marginBottom: "0.35rem",
									marginTop: 0,
									textTransform: "uppercase",
								}}
							>
								Selected run
							</p>
							<h2
								id="chat-console-selected-title"
								style={{
									fontFamily: "var(--jh-font-heading)",
									fontSize: "var(--jh-text-h2-size)",
									fontWeight: "var(--jh-text-h2-weight)",
									marginBottom: "0.35rem",
								}}
							>
								{selectedSessionTitle}
							</h2>
							<p
								style={{
									color: "var(--jh-color-text-muted)",
									fontFamily: "var(--jh-font-body)",
									marginBottom: 0,
								}}
							>
								{selectedSessionBody}
							</p>
						</header>

						{selectedSession || evaluationSummary ? (
							<div
								style={{
									display: "grid",
									gap: "var(--jh-space-gap)",
									gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
								}}
							>
								<article
									style={{
										background: "var(--jh-color-surface-bg)",
										border: "var(--jh-border-subtle)",
										borderRadius: "var(--jh-radius-md)",
										padding:
											"var(--jh-space-padding-sm) var(--jh-space-padding)",
									}}
								>
									<p
										style={{
											color: "var(--jh-color-text-muted)",
											fontFamily: "var(--jh-font-body)",
											fontSize: "var(--jh-text-label-sm-size)",
											fontWeight: "var(--jh-text-label-sm-weight)",
											letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
											marginBottom: "0.25rem",
											marginTop: 0,
										}}
									>
										Input
									</p>
									<p style={{ fontFamily: "var(--jh-font-body)", margin: 0 }}>
										{selectedSession?.route.message ??
											evaluationSummary?.message ??
											"No input recorded yet"}
									</p>
								</article>
								<article
									style={{
										background: "var(--jh-color-surface-bg)",
										border: "var(--jh-border-subtle)",
										borderRadius: "var(--jh-radius-md)",
										padding:
											"var(--jh-space-padding-sm) var(--jh-space-padding)",
									}}
								>
									<p
										style={{
											color: "var(--jh-color-text-muted)",
											fontFamily: "var(--jh-font-body)",
											fontSize: "var(--jh-text-label-sm-size)",
											fontWeight: "var(--jh-text-label-sm-weight)",
											letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
											marginBottom: "0.25rem",
											marginTop: 0,
										}}
									>
										Latest job
									</p>
									<p style={{ fontFamily: "var(--jh-font-body)", margin: 0 }}>
										{selectedSession?.session.job?.jobId ??
											evaluationSummary?.job?.jobId ??
											"No job recorded yet"}
									</p>
								</article>
								<article
									style={{
										background: "var(--jh-color-surface-bg)",
										border: "var(--jh-border-subtle)",
										borderRadius: "var(--jh-radius-md)",
										padding:
											"var(--jh-space-padding-sm) var(--jh-space-padding)",
									}}
								>
									<p
										style={{
											color: "var(--jh-color-text-muted)",
											fontFamily: "var(--jh-font-body)",
											fontSize: "var(--jh-text-label-sm-size)",
											fontWeight: "var(--jh-text-label-sm-weight)",
											letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
											marginBottom: "0.25rem",
											marginTop: 0,
										}}
									>
										Approval or warnings
									</p>
									<p style={{ fontFamily: "var(--jh-font-body)", margin: 0 }}>
										{evaluationSummary
											? `${evaluationSummary.warnings.totalCount} warning${evaluationSummary.warnings.totalCount === 1 ? "" : "s"}`
											: String(
													selectedSession?.session.pendingApprovalCount ?? 0,
												)}
									</p>
								</article>
								<article
									style={{
										background: "var(--jh-color-surface-bg)",
										border: "var(--jh-border-subtle)",
										borderRadius: "var(--jh-radius-md)",
										padding:
											"var(--jh-space-padding-sm) var(--jh-space-padding)",
									}}
								>
									<p
										style={{
											color: "var(--jh-color-text-muted)",
											fontFamily: "var(--jh-font-body)",
											fontSize: "var(--jh-text-label-sm-size)",
											fontWeight: "var(--jh-text-label-sm-weight)",
											letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
											marginBottom: "0.25rem",
											marginTop: 0,
										}}
									>
										Closeout
									</p>
									<p style={{ fontFamily: "var(--jh-font-body)", margin: 0 }}>
										{evaluationSummary?.closeout.state ??
											selectedSession?.session.state ??
											"No closeout status yet"}
									</p>
								</article>
							</div>
						) : null}
					</section>

					<div style={artifactWorkspaceStyle}>
						<EvaluationArtifactRail
							error={chatConsole.state.evaluationResult.error}
							isBusy={isConsoleBusy}
							isRefreshing={chatConsole.state.evaluationResult.isRefreshing}
							onOpenApprovals={onOpenApprovals}
							onOpenPipelineReview={onOpenPipelineReview}
							onOpenReportViewer={onOpenReportViewer}
							onOpenTrackerReview={onOpenTrackerReview}
							payload={chatConsole.state.evaluationResult.data}
							status={chatConsole.state.evaluationResult.status}
						/>

						<RunTimeline
							detail={selectedSession}
							status={chatConsole.state.status}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}

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
	gap: "1rem",
};

const heroStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "1rem",
	justifyContent: "space-between",
};

const buttonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.8rem",
	padding: "0.7rem 1rem",
};

const twoColumnStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
};

const rightColumnStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const selectedSummaryStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.4rem",
	display: "grid",
	gap: "0.9rem",
	padding: "1rem",
};

const artifactWorkspaceStyle: CSSProperties = {
	alignItems: "start",
	display: "grid",
	gap: "1rem",
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
		"Chat console summary has not loaded yet.";
	const isConsoleBusy =
		chatConsole.state.isRefreshing ||
		chatConsole.state.evaluationResult.isRefreshing ||
		chatConsole.state.pendingAction !== null;
	const selectedSessionTitle =
		selectedSession?.session.sessionId ??
		evaluationSummary?.session?.sessionId ??
		"No selected session";
	const selectedSessionBody = evaluationSummary
		? `Evaluation state ${evaluationSummary.state} with ${evaluationSummary.closeout.state} closeout and ${evaluationSummary.warnings.totalCount} warning${evaluationSummary.warnings.totalCount === 1 ? "" : "s"}.`
		: selectedSession
			? `Workflow ${selectedSession.session.workflow} with ${selectedSession.jobs.length} tracked jobs and ${selectedSession.approvals.length} approvals.`
			: "Select a recent session to inspect the evaluation handoff, runtime timeline, and next review action in one place.";

	return (
		<section aria-labelledby="chat-console-title" style={surfaceStyle}>
			<header style={heroStyle}>
				<div>
					<p
						style={{
							color: "#9a3412",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Phase 04 / Session 02
					</p>
					<h2 id="chat-console-title" style={{ marginBottom: "0.35rem" }}>
						Evaluation console and artifact handoff
					</h2>
					<p style={{ color: "#64748b", marginBottom: "0.2rem" }}>
						Launch or resume evaluation workflows, then inspect run-to-artifact
						state without guessing at report, PDF, tracker, or approval
						readiness in the browser.
					</p>
					<p style={{ color: "#94a3b8", margin: 0 }}>
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
									color: "#475569",
									letterSpacing: "0.08em",
									marginBottom: "0.35rem",
									marginTop: 0,
									textTransform: "uppercase",
								}}
							>
								Selected session
							</p>
							<h2
								id="chat-console-selected-title"
								style={{ marginBottom: "0.35rem" }}
							>
								{selectedSessionTitle}
							</h2>
							<p style={{ color: "#64748b", marginBottom: 0 }}>
								{selectedSessionBody}
							</p>
						</header>

						{selectedSession || evaluationSummary ? (
							<div
								style={{
									display: "grid",
									gap: "0.8rem",
									gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
								}}
							>
								<article
									style={{
										background: "rgba(248, 250, 252, 0.9)",
										border: "1px solid rgba(148, 163, 184, 0.2)",
										borderRadius: "1rem",
										padding: "0.85rem 0.9rem",
									}}
								>
									<p
										style={{
											color: "#64748b",
											marginBottom: "0.25rem",
											marginTop: 0,
										}}
									>
										Route message
									</p>
									<p style={{ margin: 0 }}>
										{selectedSession?.route.message ??
											evaluationSummary?.message ??
											"No route message recorded yet"}
									</p>
								</article>
								<article
									style={{
										background: "rgba(248, 250, 252, 0.9)",
										border: "1px solid rgba(148, 163, 184, 0.2)",
										borderRadius: "1rem",
										padding: "0.85rem 0.9rem",
									}}
								>
									<p
										style={{
											color: "#64748b",
											marginBottom: "0.25rem",
											marginTop: 0,
										}}
									>
										Latest job
									</p>
									<p style={{ margin: 0 }}>
										{selectedSession?.session.job?.jobId ??
											evaluationSummary?.job?.jobId ??
											"No job recorded yet"}
									</p>
								</article>
								<article
									style={{
										background: "rgba(248, 250, 252, 0.9)",
										border: "1px solid rgba(148, 163, 184, 0.2)",
										borderRadius: "1rem",
										padding: "0.85rem 0.9rem",
									}}
								>
									<p
										style={{
											color: "#64748b",
											marginBottom: "0.25rem",
											marginTop: 0,
										}}
									>
										Approval or warnings
									</p>
									<p style={{ margin: 0 }}>
										{evaluationSummary
											? `${evaluationSummary.warnings.totalCount} warning${evaluationSummary.warnings.totalCount === 1 ? "" : "s"}`
											: String(
													selectedSession?.session.pendingApprovalCount ?? 0,
												)}
									</p>
								</article>
								<article
									style={{
										background: "rgba(248, 250, 252, 0.9)",
										border: "1px solid rgba(148, 163, 184, 0.2)",
										borderRadius: "1rem",
										padding: "0.85rem 0.9rem",
									}}
								>
									<p
										style={{
											color: "#64748b",
											marginBottom: "0.25rem",
											marginTop: 0,
										}}
									>
										Closeout
									</p>
									<p style={{ margin: 0 }}>
										{evaluationSummary?.closeout.state ??
											selectedSession?.session.state ??
											"No closeout state yet"}
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

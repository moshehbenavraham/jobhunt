import type { CSSProperties } from "react";
import { ApprovalContextPanel } from "./approval-context-panel";
import { ApprovalDecisionBar } from "./approval-decision-bar";
import { ApprovalQueueList } from "./approval-queue-list";
import { InterruptedRunPanel } from "./interrupted-run-panel";
import { useApprovalInbox } from "./use-approval-inbox";

type ApprovalInboxSurfaceProps = {
	onOpenApplicationHelp?: (focus: { sessionId: string | null }) => void;
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
	background: "var(--jh-color-button-bg)",
	border: "none",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: "var(--jh-font-weight-bold)" as CSSProperties["fontWeight"],
	minHeight: "2.8rem",
	padding: "0.7rem 1rem",
};

const contentGridStyle: CSSProperties = {
	alignItems: "start",
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "minmax(20rem, 24rem) minmax(0, 1fr)",
};

const rightColumnStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
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

export function ApprovalInboxSurface({
	onOpenApplicationHelp,
}: ApprovalInboxSurfaceProps) {
	const inbox = useApprovalInbox();
	const selectedApprovalId =
		inbox.state.focus.approvalId ??
		inbox.state.data?.selected?.approval?.approvalId ??
		null;

	return (
		<section aria-labelledby="approval-inbox-title" style={surfaceStyle}>
			<header style={heroStyle}>
				<div>
					<p
						style={{
							color: "var(--jh-color-label-fg)",
							fontFamily: "var(--jh-font-body)",
							fontSize: "var(--jh-text-label-sm-size)",
							fontWeight:
								"var(--jh-text-label-sm-weight)" as CSSProperties["fontWeight"],
							letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Approvals
					</p>
					<h2 id="approval-inbox-title" style={{ marginBottom: "0.35rem" }}>
						Approval inbox and human review flow
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: "0.2rem",
						}}
					>
						Inspect pending approvals, resolve them through the shared runtime,
						and hand interrupted work back to the existing resume route.
					</p>
					<p style={{ color: "var(--jh-color-text-tertiary)", margin: 0 }}>
						Last refreshed: {formatTimestamp(inbox.state.lastUpdatedAt)}
					</p>
				</div>

				<button
					aria-label="Refresh approval inbox"
					disabled={
						inbox.state.isRefreshing || inbox.state.pendingAction !== null
					}
					onClick={inbox.refresh}
					style={{
						...buttonStyle,
						opacity:
							inbox.state.isRefreshing || inbox.state.pendingAction !== null
								? 0.7
								: 1,
					}}
					type="button"
				>
					{inbox.state.isRefreshing ? "Refreshing inbox..." : "Refresh inbox"}
				</button>
			</header>

			<div style={contentGridStyle}>
				<ApprovalQueueList
					onSelect={inbox.selectApproval}
					pendingAction={inbox.state.pendingAction}
					selectedApprovalId={selectedApprovalId}
					status={inbox.state.status}
					summary={inbox.state.data}
				/>

				<div style={rightColumnStyle}>
					<ApprovalContextPanel
						notice={inbox.state.notice}
						selected={inbox.state.data?.selected ?? null}
						status={inbox.state.status}
					/>
					<ApprovalDecisionBar
						notice={inbox.state.notice}
						onResolve={inbox.resolve}
						pendingAction={inbox.state.pendingAction}
						selected={inbox.state.data?.selected ?? null}
					/>
					<InterruptedRunPanel
						{...(onOpenApplicationHelp
							? {
									onOpenApplicationHelp,
								}
							: {})}
						onResume={inbox.resume}
						pendingAction={inbox.state.pendingAction}
						selected={inbox.state.data?.selected ?? null}
						status={inbox.state.status}
					/>
				</div>
			</div>
		</section>
	);
}

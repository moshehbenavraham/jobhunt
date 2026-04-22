import type { CSSProperties } from "react";
import { BatchWorkspaceDetailRail } from "./batch-workspace-detail-rail";
import { BatchWorkspaceItemMatrix } from "./batch-workspace-item-matrix";
import { BatchWorkspaceRunPanel } from "./batch-workspace-run-panel";
import { useBatchWorkspace } from "./use-batch-workspace";

type BatchWorkspaceSurfaceProps = {
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onOpenChatConsole: (focus: { sessionId: string | null }) => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
	onOpenTrackerWorkspace: (focus: { reportNumber: string | null }) => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const detailGridStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
};

const noticeStyle: CSSProperties = {
	borderRadius: "1rem",
	padding: "0.9rem",
};

export function BatchWorkspaceSurface({
	onOpenApprovals,
	onOpenChatConsole,
	onOpenReportViewer,
	onOpenTrackerWorkspace,
}: BatchWorkspaceSurfaceProps) {
	const batch = useBatchWorkspace();
	const isBusy = batch.state.isRefreshing || batch.state.pendingAction !== null;

	return (
		<section aria-labelledby="batch-workspace-title" style={surfaceStyle}>
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
					Phase 05 / Session 04
				</p>
				<h1
					id="batch-workspace-title"
					style={{ marginBottom: 0, marginTop: 0 }}
				>
					Batch jobs workspace
				</h1>
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					Supervise bounded batch draft state, run progress, failures, and
					closeout handoffs without reopening raw repo artifacts in the browser.
				</p>
			</header>

			{(batch.state.status === "offline" || batch.state.status === "error") &&
			batch.state.error ? (
				<section
					style={{
						...noticeStyle,
						background:
							batch.state.status === "offline" ? "#e2e8f0" : "#fee2e2",
						border: `1px solid ${
							batch.state.status === "offline" ? "#cbd5e1" : "#fecaca"
						}`,
					}}
				>
					<strong
						style={{
							display: "block",
							marginBottom: "0.25rem",
						}}
					>
						{batch.state.status === "offline"
							? "Showing the last batch snapshot"
							: "Batch workspace warning"}
					</strong>
					<p style={{ margin: 0 }}>{batch.state.error.message}</p>
				</section>
			) : null}

			<BatchWorkspaceRunPanel
				isBusy={isBusy}
				lastUpdatedAt={batch.state.lastUpdatedAt}
				notice={batch.state.notice}
				onClearNotice={batch.clearNotice}
				onRefresh={batch.refresh}
				onRunAction={batch.runAction}
				pendingAction={batch.state.pendingAction}
				status={batch.state.status}
				summary={batch.state.data}
			/>

			<div style={detailGridStyle}>
				<BatchWorkspaceItemMatrix
					focus={batch.state.focus}
					isBusy={isBusy}
					onClearSelection={batch.clearSelection}
					onNextPage={batch.goToNextPage}
					onPreviousPage={batch.goToPreviousPage}
					onSelectItem={batch.selectItem}
					onSelectStatus={batch.selectStatusFilter}
					status={batch.state.status}
					summary={batch.state.data}
				/>

				<BatchWorkspaceDetailRail
					onClearSelection={batch.clearSelection}
					onOpenApprovals={onOpenApprovals}
					onOpenChatConsole={onOpenChatConsole}
					onOpenReportViewer={onOpenReportViewer}
					onOpenTrackerWorkspace={onOpenTrackerWorkspace}
					status={batch.state.status}
					summary={batch.state.data}
				/>
			</div>
		</section>
	);
}

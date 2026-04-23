import type { CSSProperties } from "react";
import type { BatchWorkspaceSummaryPayload } from "./batch-workspace-types";
import type { BatchWorkspaceViewStatus } from "./use-batch-workspace";

type BatchWorkspaceDetailRailProps = {
	onClearSelection: () => void;
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onOpenChatConsole: (focus: { sessionId: string | null }) => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
	onOpenTrackerWorkspace: (focus: { reportNumber: string | null }) => void;
	status: BatchWorkspaceViewStatus;
	summary: BatchWorkspaceSummaryPayload | null;
};

const railStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "0.95rem",
	padding: "1rem",
};

const cardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "0.55rem",
	padding: "0.9rem",
};

const actionButtonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.2rem",
	padding: "0.5rem 0.85rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "var(--jh-color-button-subtle-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-bg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.1rem",
	padding: "0.45rem 0.8rem",
};

function describeEmptyState(status: BatchWorkspaceViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Waiting for selected-item detail from the batch-supervisor summary.",
				title: "Loading selected detail",
			};
		case "offline":
			return {
				body: "Batch detail data is unavailable right now.",
				title: "Detail rail offline",
			};
		case "error":
			return {
				body: "Selected item detail could not be loaded.",
				title: "Detail rail unavailable",
			};
		default:
			return {
				body: "Select a batch row to inspect artifacts, warnings, and next handoffs.",
				title: "No selected item yet",
			};
	}
}

function formatScore(score: number | null): string {
	if (score === null) {
		return "No score";
	}

	return `${score.toFixed(1)} / 5`;
}

function formatRunStateLabel(value: string): string {
	switch (value) {
		case "approval-paused":
			return "Approval paused";
		case "retryable-failed":
			return "Retryable failed";
		default:
			return value.charAt(0).toUpperCase() + value.slice(1);
	}
}

export function BatchWorkspaceDetailRail({
	onClearSelection,
	onOpenApprovals,
	onOpenChatConsole,
	onOpenReportViewer,
	onOpenTrackerWorkspace,
	status,
	summary,
}: BatchWorkspaceDetailRailProps) {
	if (!summary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="batch-workspace-detail-rail-title"
				style={railStyle}
			>
				<header>
					<h2
						id="batch-workspace-detail-rail-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						Selected detail
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						Keep one selected batch item plus run-context handoffs visible while
						you supervise batch work.
					</p>
				</header>

				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{emptyState.body}
					</p>
				</section>
			</section>
		);
	}

	const selectedRow = summary.selectedDetail.row;

	return (
		<section
			aria-labelledby="batch-workspace-detail-rail-title"
			style={railStyle}
		>
			<header>
				<h2
					id="batch-workspace-detail-rail-title"
					style={{ marginBottom: "0.35rem", marginTop: 0 }}
				>
					Selected detail
				</h2>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
					{summary.selectedDetail.message}
				</p>
			</header>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Run context</h3>
				<p style={{ margin: 0 }}>
					<strong>{formatRunStateLabel(summary.run.state)}</strong>
				</p>
				<p
					style={{
						color: "var(--jh-color-text-secondary)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
					{summary.run.message}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					Run: {summary.run.sessionId ?? "not available"} | Approval:{" "}
					{summary.run.approvalId ?? "none"}
				</p>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						disabled={summary.run.sessionId === null}
						onClick={() =>
							onOpenChatConsole({
								sessionId: summary.run.sessionId,
							})
						}
						style={{
							...actionButtonStyle,
							opacity: summary.run.sessionId === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open chat
					</button>
					<button
						disabled={summary.run.approvalId === null}
						onClick={() =>
							onOpenApprovals({
								approvalId: summary.run.approvalId,
								sessionId: summary.run.sessionId,
							})
						}
						style={{
							...subtleButtonStyle,
							opacity: summary.run.approvalId === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open approvals
					</button>
				</div>
			</section>

			{selectedRow ? (
				<section style={cardStyle}>
					<div
						style={{
							alignItems: "start",
							display: "flex",
							gap: "0.75rem",
							justifyContent: "space-between",
						}}
					>
						<div>
							<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
								Item #{selectedRow.id}
							</h3>
							<p style={{ margin: 0 }}>
								<strong>{selectedRow.company ?? "Unknown company"}</strong>
							</p>
							<p
								style={{
									color: "var(--jh-color-text-secondary)",
									marginBottom: 0,
									marginTop: "0.15rem",
								}}
							>
								{selectedRow.role ?? "Role unavailable"}
							</p>
						</div>
						<button
							onClick={onClearSelection}
							style={subtleButtonStyle}
							type="button"
						>
							Clear
						</button>
					</div>

					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						{formatRunStateLabel(selectedRow.status)} |{" "}
						{formatScore(selectedRow.score)}
						{" | "}Retries {selectedRow.retries}
					</p>
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						{selectedRow.url}
					</p>
					{selectedRow.legitimacy ? (
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							Legitimacy: {selectedRow.legitimacy}
						</p>
					) : null}
					{selectedRow.notes ? (
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							{selectedRow.notes}
						</p>
					) : null}
					{selectedRow.source ? (
						<p style={{ color: "var(--jh-color-text-muted)", margin: 0 }}>
							Source: {selectedRow.source}
						</p>
					) : null}
					{selectedRow.error ? (
						<p style={{ color: "var(--jh-color-status-error-fg)", margin: 0 }}>
							Last error: {selectedRow.error}
						</p>
					) : null}
					{selectedRow.rawStateError ? (
						<p style={{ color: "var(--jh-color-status-error-fg)", margin: 0 }}>
							State parse warning: {selectedRow.rawStateError}
						</p>
					) : null}

					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
						<button
							disabled={!selectedRow.artifacts.report.exists}
							onClick={() =>
								onOpenReportViewer({
									reportPath: selectedRow.artifacts.report.repoRelativePath,
								})
							}
							style={{
								...actionButtonStyle,
								opacity: selectedRow.artifacts.report.exists ? 1 : 0.6,
							}}
							type="button"
						>
							Open report viewer
						</button>
						<button
							disabled={selectedRow.reportNumber === null}
							onClick={() =>
								onOpenTrackerWorkspace({
									reportNumber: selectedRow.reportNumber,
								})
							}
							style={{
								...subtleButtonStyle,
								opacity: selectedRow.reportNumber === null ? 0.6 : 1,
							}}
							type="button"
						>
							Open tracker workspace
						</button>
					</div>

					{selectedRow.warnings.length > 0 ? (
						<div>
							<strong style={{ display: "block", marginBottom: "0.35rem" }}>
								Warnings
							</strong>
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{selectedRow.warnings.map((warning) => (
									<li key={`${warning.code}:${warning.message}`}>
										{warning.message}
									</li>
								))}
							</ul>
						</div>
					) : null}

					{selectedRow.resultWarnings.length > 0 ? (
						<div>
							<strong style={{ display: "block", marginBottom: "0.35rem" }}>
								Result warnings
							</strong>
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{selectedRow.resultWarnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
						</div>
					) : null}
				</section>
			) : (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						Selection guidance
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{summary.selectedDetail.message}
					</p>
				</section>
			)}
		</section>
	);
}

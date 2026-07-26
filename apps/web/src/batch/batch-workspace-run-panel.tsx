import type { CSSProperties } from "react";
import type { BatchWorkspaceActionInput } from "./batch-workspace-client";
import type {
	BatchWorkspaceAction,
	BatchWorkspaceSummaryPayload,
} from "./batch-workspace-types";
import type {
	BatchWorkspaceActionNotice,
	BatchWorkspacePendingAction,
	BatchWorkspaceViewStatus,
} from "./use-batch-workspace";

type BatchWorkspaceRunPanelProps = {
	isBusy: boolean;
	lastUpdatedAt: string | null;
	notice: BatchWorkspaceActionNotice;
	onClearNotice: () => void;
	onRefresh: () => void;
	onRunAction: (input: BatchWorkspaceActionInput) => void;
	pendingAction: BatchWorkspacePendingAction;
	status: BatchWorkspaceViewStatus;
	summary: BatchWorkspaceSummaryPayload | null;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "1rem",
	padding: "1rem",
};

const sectionCardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "0.55rem",
	padding: "0.9rem",
};

const gridStyle: CSSProperties = {
	display: "grid",
	gap: "0.9rem",
	gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.35rem",
	padding: "0.55rem 0.9rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "var(--jh-color-button-subtle-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-bg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.2rem",
	padding: "0.45rem 0.8rem",
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

function formatRunStateLabel(value: string): string {
	switch (value) {
		case "approval-paused":
			return "Approval paused";
		case "completed":
			return "Completed";
		case "failed":
			return "Failed";
		case "idle":
			return "Idle";
		case "queued":
			return "Queued";
		case "running":
			return "Running";
		default:
			return value;
	}
}

function describeEmptyState(status: BatchWorkspaceViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Reading the bounded batch-supervisor summary and action availability from the API.",
				title: "Loading batch workspace",
			};
		case "offline":
			return {
				body: "Batch control is unavailable right now, so batch supervision cannot refresh.",
				title: "Batch workspace offline",
			};
		case "error":
			return {
				body: "Batch run data could not be loaded.",
				title: "Batch workspace unavailable",
			};
		default:
			return {
				body: "Open the batch workspace once the API exposes draft readiness, batch run state, and bounded item review data.",
				title: "No batch summary yet",
			};
	}
}

function describePendingAction(
	action: BatchWorkspaceAction,
	pendingAction: BatchWorkspacePendingAction,
): string {
	if (pendingAction?.action !== action) {
		switch (action) {
			case "merge-tracker-additions":
				return "Merge tracker additions";
			case "resume-run-pending":
				return "Resume pending";
			case "retry-failed":
				return "Retry failed";
			case "verify-tracker-pipeline":
				return "Verify tracker";
		}
	}

	switch (action) {
		case "merge-tracker-additions":
			return "Merging...";
		case "resume-run-pending":
			return "Requesting run...";
		case "retry-failed":
			return "Queueing retry...";
		case "verify-tracker-pipeline":
			return "Verifying...";
	}
}

function createActionInput(
	action: BatchWorkspaceAction,
): BatchWorkspaceActionInput {
	switch (action) {
		case "merge-tracker-additions":
		case "verify-tracker-pipeline":
			return { action };
		case "resume-run-pending":
		case "retry-failed":
			return { action };
	}
}

function getNoticeStyle(
	kind: NonNullable<BatchWorkspaceActionNotice>["kind"],
): CSSProperties {
	switch (kind) {
		case "info":
			return {
				background: "var(--jh-color-severity-info-bg)",
				borderColor: "var(--jh-color-badge-info-bg)",
			};
		case "success":
			return {
				background: "var(--jh-color-status-ready-bg)",
				borderColor: "var(--jh-color-status-completed-bg)",
			};
		case "warn":
			return {
				background: "var(--jh-color-severity-warn-bg)",
				borderColor: "var(--jh-color-badge-attention-bg)",
			};
	}
}

export function BatchWorkspaceRunPanel({
	isBusy,
	lastUpdatedAt,
	notice,
	onClearNotice,
	onRefresh,
	onRunAction,
	pendingAction,
	status,
	summary,
}: BatchWorkspaceRunPanelProps) {
	if (!summary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="batch-workspace-run-panel-title"
				style={panelStyle}
			>
				<header
					style={{
						alignItems: "start",
						display: "flex",
						flexWrap: "wrap",
						gap: "0.8rem",
						justifyContent: "space-between",
					}}
				>
					<div>
						<h2
							id="batch-workspace-run-panel-title"
							style={{ marginBottom: "0.35rem", marginTop: 0 }}
						>
							Batch run control
						</h2>
						<p
							style={{
								color: "var(--jh-color-text-muted)",
								marginBottom: 0,
								marginTop: 0,
							}}
						>
							Review draft readiness, run progress, and closeout guidance.
						</p>
					</div>

					<div style={{ display: "grid", gap: "0.45rem", justifyItems: "end" }}>
						<button
							aria-label="Refresh batch workspace"
							onClick={onRefresh}
							style={buttonStyle}
							type="button"
						>
							Refresh
						</button>
						<span
							style={{
								color: "var(--jh-color-text-muted)",
								fontSize: "0.92rem",
							}}
						>
							Last updated: {formatTimestamp(lastUpdatedAt)}
						</span>
					</div>
				</header>

				<section style={sectionCardStyle}>
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

	return (
		<section
			aria-labelledby="batch-workspace-run-panel-title"
			style={panelStyle}
		>
			<header
				style={{
					alignItems: "start",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.8rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h2
						id="batch-workspace-run-panel-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						Batch run control
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{summary.message}
					</p>
				</div>

				<div style={{ display: "grid", gap: "0.45rem", justifyItems: "end" }}>
					<button
						aria-label="Refresh batch workspace"
						disabled={isBusy}
						onClick={onRefresh}
						style={{
							...buttonStyle,
							opacity: isBusy ? 0.7 : 1,
						}}
						type="button"
					>
						{isBusy ? "Refreshing..." : "Refresh"}
					</button>
					<span
						style={{ color: "var(--jh-color-text-muted)", fontSize: "0.92rem" }}
					>
						Last updated: {formatTimestamp(lastUpdatedAt)}
					</span>
				</div>
			</header>

			{notice ? (
				<section
					style={{
						...sectionCardStyle,
						...getNoticeStyle(notice.kind),
						alignItems: "start",
						borderWidth: "1px",
					}}
				>
					<div
						style={{
							alignItems: "start",
							display: "flex",
							gap: "0.75rem",
							justifyContent: "space-between",
						}}
					>
						<div>
							<strong
								style={{
									display: "block",
									marginBottom: "0.25rem",
								}}
							>
								Batch action feedback
							</strong>
							<p style={{ margin: 0 }}>{notice.message}</p>
						</div>
						<button
							onClick={onClearNotice}
							style={subtleButtonStyle}
							type="button"
						>
							Dismiss
						</button>
					</div>
				</section>
			) : null}

			<div style={gridStyle}>
				<section style={sectionCardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						Draft readiness
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{summary.draft.message}
					</p>
					<p style={{ margin: 0 }}>
						<strong>{summary.draft.totalCount}</strong> draft rows,{" "}
						<strong>{summary.draft.pendingTrackerAdditionCount}</strong> pending
						tracker additions
					</p>
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						Retryable: {summary.draft.counts.retryableFailed} | Pending:{" "}
						{summary.draft.counts.pending} | Partial:{" "}
						{summary.draft.counts.partial}
					</p>
					{summary.draft.firstRunnableItemId !== null ? (
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							First runnable item: #{summary.draft.firstRunnableItemId}
						</p>
					) : null}
				</section>

				<section style={sectionCardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Run status</h3>
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
						Completed: {summary.run.counts.completed} | Failed:{" "}
						{summary.run.counts.failed} | Processing:{" "}
						{summary.run.counts.processing}
					</p>
					{summary.run.approvalId ? (
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							Approval ID: {summary.run.approvalId}
						</p>
					) : null}
					{summary.run.runId ? (
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							Run ID: {summary.run.runId}
						</p>
					) : null}
				</section>

				<section style={sectionCardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						Closeout readiness
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{summary.closeout.message}
					</p>
					<p style={{ margin: 0 }}>
						Merge blocked:{" "}
						<strong>{summary.closeout.mergeBlocked ? "Yes" : "No"}</strong>
					</p>
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						Pending additions: {summary.closeout.pendingTrackerAdditionCount}
					</p>
					{summary.closeout.warnings.length > 0 ? (
						<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
							{summary.closeout.warnings.map((warning) => (
								<li key={`${warning.code}:${warning.message}`}>
									{warning.message}
								</li>
							))}
						</ul>
					) : (
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							No closeout warnings are blocking review right now.
						</p>
					)}
				</section>

				<section style={sectionCardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						Available actions
					</h3>
					<div style={{ display: "grid", gap: "0.65rem" }}>
						{summary.actions.map((action) => {
							const disabled = isBusy || !action.available;

							return (
								<div
									key={action.action}
									style={{ display: "grid", gap: "0.3rem" }}
								>
									<button
										disabled={disabled}
										onClick={() =>
											onRunAction(createActionInput(action.action))
										}
										style={{
											...buttonStyle,
											opacity: disabled ? 0.65 : 1,
										}}
										type="button"
									>
										{describePendingAction(action.action, pendingAction)}
									</button>
									<p
										style={{
											color: "var(--jh-color-text-secondary)",
											margin: 0,
										}}
									>
										{action.message}
									</p>
								</div>
							);
						})}
					</div>
				</section>
			</div>
		</section>
	);
}

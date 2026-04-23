import type { CSSProperties } from "react";
import type { ApprovalInboxSummaryPayload } from "./approval-inbox-types";
import type {
	ApprovalInboxPendingAction,
	ApprovalInboxViewStatus,
} from "./use-approval-inbox";

type ApprovalQueueListProps = {
	onSelect: (input: { approvalId: string; sessionId: string }) => void;
	pendingAction: ApprovalInboxPendingAction;
	selectedApprovalId: string | null;
	status: ApprovalInboxViewStatus;
	summary: ApprovalInboxSummaryPayload | null;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-4)",
	padding: "var(--jh-space-padding)",
};

const itemStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "0.6rem",
	padding: "0.85rem 0.95rem",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: "none",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: "var(--jh-font-weight-bold)" as CSSProperties["fontWeight"],
	minHeight: "2.4rem",
	padding: "0.55rem 0.9rem",
};

function formatTimestamp(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.valueOf())) {
		return value;
	}

	return date.toLocaleString();
}

function getEmptyState(status: ApprovalInboxViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Reading the pending approval queue from the API.",
				title: "Loading approval queue",
			};
		case "offline":
			return {
				body: "The approval queue cannot refresh while the API is offline.",
				title: "Approval queue offline",
			};
		case "error":
			return {
				body: "The approval queue failed before it could load.",
				title: "Approval queue unavailable",
			};
		default:
			return {
				body: "Pending approvals will appear here as workflows pause for review.",
				title: "No pending approvals",
			};
	}
}

export function ApprovalQueueList({
	onSelect,
	pendingAction,
	selectedApprovalId,
	status,
	summary,
}: ApprovalQueueListProps) {
	if (!summary || summary.queue.length === 0) {
		const emptyState = getEmptyState(status);

		return (
			<section aria-labelledby="approval-queue-title" style={panelStyle}>
				<header>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
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
						Approval queue
					</p>
					<h2 id="approval-queue-title" style={{ marginBottom: "0.35rem" }}>
						{emptyState.title}
					</h2>
					<p style={{ color: "var(--jh-color-text-muted)", marginBottom: 0 }}>
						{emptyState.body}
					</p>
				</header>
			</section>
		);
	}

	return (
		<section aria-labelledby="approval-queue-title" style={panelStyle}>
			<header>
				<p
					style={{
						color: "var(--jh-color-text-secondary)",
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
					Approval queue
				</p>
				<h2 id="approval-queue-title" style={{ marginBottom: "0.35rem" }}>
					{summary.pendingApprovalCount} pending approvals
				</h2>
				<p style={{ color: "var(--jh-color-text-muted)", marginBottom: 0 }}>
					Queue ordering is backend-owned and stays bounded for deterministic
					polling.
				</p>
			</header>

			<div style={{ display: "grid", gap: "0.8rem" }}>
				{summary.queue.map((item) => {
					const isSelected = item.approvalId === selectedApprovalId;
					const isBusy =
						pendingAction !== null &&
						(pendingAction.kind === "resume" ||
							pendingAction.approvalId === item.approvalId);

					return (
						<article
							key={item.approvalId}
							style={{
								...itemStyle,
								borderColor: isSelected
									? "var(--jh-color-button-bg)"
									: undefined,
								boxShadow: isSelected
									? "inset 0 0 0 1px var(--jh-color-button-bg)"
									: "none",
							}}
						>
							<div
								style={{
									alignItems: "center",
									display: "flex",
									flexWrap: "wrap",
									gap: "0.6rem",
									justifyContent: "space-between",
								}}
							>
								<div>
									<p style={{ color: "var(--jh-color-text-muted)", margin: 0 }}>
										{item.workflow ?? "Unknown workflow"}
									</p>
									<h3 style={{ marginBottom: "0.2rem", marginTop: "0.1rem" }}>
										{item.title || item.approvalId}
									</h3>
								</div>
								<span
									style={{
										background: "var(--jh-color-status-pending-bg)",
										borderRadius: "var(--jh-radius-pill)",
										color: "var(--jh-color-status-pending-fg)",
										fontSize: "0.82rem",
										fontWeight:
											"var(--jh-font-weight-bold)" as CSSProperties["fontWeight"],
										padding: "0.2rem 0.6rem",
									}}
								>
									pending
								</span>
							</div>

							<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
								Run {item.sessionId}
							</p>
							<p style={{ color: "var(--jh-color-text-muted)", margin: 0 }}>
								Requested {formatTimestamp(item.requestedAt)}
							</p>
							{item.traceId ? (
								<p style={{ color: "var(--jh-color-text-muted)", margin: 0 }}>
									Trace: {item.traceId}
								</p>
							) : null}

							<button
								aria-label={`Review approval ${item.title || item.approvalId}`}
								disabled={isBusy}
								onClick={() =>
									onSelect({
										approvalId: item.approvalId,
										sessionId: item.sessionId,
									})
								}
								style={{
									...buttonStyle,
									opacity: isBusy ? 0.7 : 1,
								}}
								type="button"
							>
								{isSelected ? "Reviewing now" : "Review approval"}
							</button>
						</article>
					);
				})}
			</div>
		</section>
	);
}

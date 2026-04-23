import type { CSSProperties } from "react";
import type { ApprovalInboxSelectedDetail } from "./approval-inbox-types";
import type {
	ApprovalInboxActionNotice,
	ApprovalInboxPendingAction,
} from "./use-approval-inbox";

type ApprovalDecisionBarProps = {
	notice: ApprovalInboxActionNotice;
	onResolve: (decision: "approved" | "rejected") => void;
	pendingAction: ApprovalInboxPendingAction;
	selected: ApprovalInboxSelectedDetail | null;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-4)",
	padding: "var(--jh-space-padding)",
};

const buttonRowStyle: CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	gap: "0.8rem",
};

const buttonStyle: CSSProperties = {
	border: "none",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: "var(--jh-font-weight-bold)" as CSSProperties["fontWeight"],
	minHeight: "2.7rem",
	padding: "var(--jh-space-2) var(--jh-space-4)",
};

export function ApprovalDecisionBar({
	notice,
	onResolve,
	pendingAction,
	selected,
}: ApprovalDecisionBarProps) {
	const approval = selected?.approval ?? null;
	const isPendingApproval = approval?.status === "pending";
	const isApproving =
		pendingAction?.kind === "approved" &&
		pendingAction.approvalId === approval?.approvalId;
	const isRejecting =
		pendingAction?.kind === "rejected" &&
		pendingAction.approvalId === approval?.approvalId;

	return (
		<section aria-labelledby="approval-decision-title" style={panelStyle}>
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
					Decision controls
				</p>
				<h2 id="approval-decision-title" style={{ marginBottom: "0.35rem" }}>
					Approve or reject
				</h2>
				<p style={{ color: "var(--jh-color-text-muted)", marginBottom: 0 }}>
					Decisions route through the shared approval runtime.
				</p>
			</header>

			{!approval ? (
				<p style={{ margin: 0 }}>
					Select a pending approval to enable decision actions.
				</p>
			) : !isPendingApproval ? (
				<p style={{ margin: 0 }}>
					This approval is no longer pending, so decision buttons are disabled.
				</p>
			) : (
				<div style={buttonRowStyle}>
					<button
						aria-label={`Approve ${approval.title || approval.approvalId}`}
						disabled={pendingAction !== null}
						onClick={() => onResolve("approved")}
						style={{
							...buttonStyle,
							background: "var(--jh-color-status-completed-fg)",
							opacity: pendingAction !== null ? 0.7 : 1,
						}}
						type="button"
					>
						{isApproving ? "Approving..." : "Approve and continue"}
					</button>
					<button
						aria-label={`Reject ${approval.title || approval.approvalId}`}
						disabled={pendingAction !== null}
						onClick={() => onResolve("rejected")}
						style={{
							...buttonStyle,
							background: "var(--jh-color-status-error-fg)",
							opacity: pendingAction !== null ? 0.7 : 1,
						}}
						type="button"
					>
						{isRejecting ? "Rejecting..." : "Reject and stop"}
					</button>
				</div>
			)}

			{notice ? (
				<section
					aria-live="polite"
					style={{
						background:
							notice.kind === "success"
								? "var(--jh-color-status-completed-bg)"
								: notice.kind === "warn"
									? "var(--jh-color-status-error-bg)"
									: "var(--jh-color-status-info-bg)",
						borderRadius: "var(--jh-radius-md)",
						padding: "0.8rem 0.9rem",
					}}
				>
					<p style={{ margin: 0 }}>{notice.message}</p>
				</section>
			) : null}
		</section>
	);
}

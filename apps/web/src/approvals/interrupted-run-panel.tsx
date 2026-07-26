import type { CSSProperties } from "react";
import type { ApprovalInboxSelectedDetail } from "./approval-inbox-types";
import type {
	ApprovalInboxPendingAction,
	ApprovalInboxViewStatus,
} from "./use-approval-inbox";

type InterruptedRunPanelProps = {
	onOpenApplicationHelp?: (focus: { sessionId: string | null }) => void;
	onResume: () => void;
	pendingAction: ApprovalInboxPendingAction;
	selected: ApprovalInboxSelectedDetail | null;
	status: ApprovalInboxViewStatus;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-4)",
	padding: "var(--jh-space-padding)",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: "none",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: "var(--jh-font-weight-bold)" as CSSProperties["fontWeight"],
	minHeight: "2.7rem",
	padding: "var(--jh-space-2) var(--jh-space-4)",
};

function getTone(state: string): CSSProperties {
	switch (state) {
		case "resume-ready":
			return {
				background: "var(--jh-color-status-info-bg)",
				color: "var(--jh-color-status-info-fg)",
			};
		case "waiting-for-approval":
			return {
				background: "var(--jh-color-status-pending-bg)",
				color: "var(--jh-color-status-pending-fg)",
			};
		case "running":
			return {
				background: "var(--jh-color-status-completed-bg)",
				color: "var(--jh-color-status-completed-fg)",
			};
		case "completed":
			return {
				background: "var(--jh-color-badge-neutral-bg)",
				color: "var(--jh-color-badge-neutral-fg)",
			};
		default:
			return {
				background: "var(--jh-color-status-error-bg)",
				color: "var(--jh-color-status-error-fg)",
			};
	}
}

function getEmptyState(status: ApprovalInboxViewStatus): string {
	switch (status) {
		case "loading":
			return "Loading interrupted-run state from the API.";
		case "offline":
			return "Interrupted-run state cannot refresh while the API is offline.";
		case "error":
			return "Interrupted-run state failed to load.";
		default:
			return "Select an approval to inspect whether the attached run can resume.";
	}
}

export function InterruptedRunPanel({
	onOpenApplicationHelp,
	onResume,
	pendingAction,
	selected,
	status,
}: InterruptedRunPanelProps) {
	const interruptedRun = selected?.interruptedRun ?? null;
	const isApplicationHelpSession =
		selected?.session?.workflow === "application-help";
	const isResuming =
		pendingAction?.kind === "resume" &&
		pendingAction.sessionId === interruptedRun?.sessionId;

	return (
		<section aria-labelledby="approval-resume-title" style={panelStyle}>
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
					Interrupted run
				</p>
				<h2 id="approval-resume-title" style={{ marginBottom: "0.35rem" }}>
					Resume handoff
				</h2>
				<p style={{ color: "var(--jh-color-text-muted)", marginBottom: 0 }}>
					Resume uses the existing orchestration route instead of a second
					runner path, and application-help runs can return to their review
					workspace.
				</p>
			</header>

			{!interruptedRun ? (
				<p style={{ margin: 0 }}>{getEmptyState(status)}</p>
			) : (
				<>
					<section
						style={{
							...getTone(interruptedRun.state),
							borderRadius: "var(--jh-radius-md)",
							padding: "0.85rem 0.9rem",
						}}
					>
						<p
							style={{ fontWeight: 700, marginBottom: "0.3rem", marginTop: 0 }}
						>
							{interruptedRun.state}
						</p>
						<p style={{ margin: 0 }}>{interruptedRun.message}</p>
					</section>

					{selected?.failure ? (
						<p style={{ color: "var(--jh-color-status-error-fg)", margin: 0 }}>
							Latest failure: {selected.failure.message}
						</p>
					) : null}

					{interruptedRun.resumeAllowed ||
					(isApplicationHelpSession &&
						interruptedRun.sessionId &&
						onOpenApplicationHelp) ? (
						<div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
							{interruptedRun.resumeAllowed ? (
								<button
									aria-label={`Resume run ${interruptedRun.sessionId ?? ""}`}
									disabled={pendingAction !== null}
									onClick={onResume}
									style={{
										...buttonStyle,
										opacity: pendingAction !== null ? 0.7 : 1,
									}}
									type="button"
								>
									{isResuming ? "Resuming..." : "Resume from approval inbox"}
								</button>
							) : null}

							{isApplicationHelpSession &&
							interruptedRun.sessionId &&
							onOpenApplicationHelp ? (
								<button
									aria-label={`Open application-help review for run ${interruptedRun.sessionId}`}
									onClick={() =>
										onOpenApplicationHelp({
											sessionId: interruptedRun.sessionId,
										})
									}
									style={{
										...buttonStyle,
										background: "var(--jh-color-badge-neutral-bg)",
										color: "var(--jh-color-text-primary)",
									}}
									type="button"
								>
									Open application-help review
								</button>
							) : null}
						</div>
					) : null}
				</>
			)}
		</section>
	);
}

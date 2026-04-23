import type { CSSProperties } from "react";
import type { ApprovalInboxSelectedDetail } from "./approval-inbox-types";
import type {
	ApprovalInboxActionNotice,
	ApprovalInboxViewStatus,
} from "./use-approval-inbox";

type ApprovalContextPanelProps = {
	notice: ApprovalInboxActionNotice;
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

const cardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	padding: "var(--jh-space-padding)",
};

function formatTimestamp(value: string | null): string {
	if (!value) {
		return "Not available";
	}

	const date = new Date(value);

	if (Number.isNaN(date.valueOf())) {
		return value;
	}

	return date.toLocaleString();
}

function formatJson(value: unknown | null): string {
	if (value === null) {
		return "No structured details were provided.";
	}

	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return "Structured details could not be serialized.";
	}
}

function getEmptyState(status: ApprovalInboxViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Loading the selected review context from the API.",
				title: "Loading approval context",
			};
		case "offline":
			return {
				body: "The selected approval context cannot refresh while the API is offline.",
				title: "Approval context offline",
			};
		case "error":
			return {
				body: "The selected approval context failed to load.",
				title: "Approval context unavailable",
			};
		default:
			return {
				body: "Choose a queued approval to inspect its request, run, and trace context.",
				title: "No approval selected",
			};
	}
}

function getSelectionTone(
	state: ApprovalInboxSelectedDetail["selectionState"],
): CSSProperties {
	switch (state) {
		case "active":
			return {
				background: "var(--jh-color-status-pending-bg)",
				border: "1px solid var(--jh-color-status-pending-border)",
			};
		case "approved":
			return {
				background: "var(--jh-color-status-completed-bg)",
				border: "1px solid var(--jh-color-status-completed-border)",
			};
		case "rejected":
			return {
				background: "var(--jh-color-status-error-bg)",
				border: "1px solid var(--jh-color-status-error-border)",
			};
		case "missing":
			return {
				background: "var(--jh-color-badge-neutral-bg)",
				border: "1px solid var(--jh-color-badge-neutral-border)",
			};
	}
}

export function ApprovalContextPanel({
	notice,
	selected,
	status,
}: ApprovalContextPanelProps) {
	if (!selected) {
		const emptyState = getEmptyState(status);

		return (
			<section aria-labelledby="approval-context-title" style={panelStyle}>
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
						Review context
					</p>
					<h2 id="approval-context-title" style={{ marginBottom: "0.35rem" }}>
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
		<section aria-labelledby="approval-context-title" style={panelStyle}>
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
					Review context
				</p>
				<h2 id="approval-context-title" style={{ marginBottom: "0.35rem" }}>
					{selected.approval?.title || "Selected approval context"}
				</h2>
				<p style={{ color: "var(--jh-color-text-muted)", marginBottom: 0 }}>
					Backend-owned detail for the current approval selection.
				</p>
			</header>

			<section
				aria-live="polite"
				style={{
					...cardStyle,
					...getSelectionTone(selected.selectionState),
				}}
			>
				<p style={{ fontWeight: 700, marginBottom: "0.35rem", marginTop: 0 }}>
					Selection state
				</p>
				<p style={{ margin: 0 }}>{selected.selectionMessage}</p>
			</section>

			{notice ? (
				<section
					aria-live="polite"
					style={{
						...cardStyle,
						background:
							notice.kind === "success"
								? "var(--jh-color-status-completed-bg)"
								: notice.kind === "warn"
									? "var(--jh-color-status-error-bg)"
									: "var(--jh-color-status-info-bg)",
					}}
				>
					<p style={{ fontWeight: 700, marginBottom: "0.35rem", marginTop: 0 }}>
						Latest action
					</p>
					<p style={{ margin: 0 }}>{notice.message}</p>
				</section>
			) : null}

			<div
				style={{
					display: "grid",
					gap: "0.8rem",
					gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
				}}
			>
				<article style={cardStyle}>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: "0.25rem",
							marginTop: 0,
						}}
					>
						Approval
					</p>
					<p style={{ margin: 0 }}>
						{selected.approval?.approvalId ?? "Missing approval record"}
					</p>
				</article>
				<article style={cardStyle}>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: "0.25rem",
							marginTop: 0,
						}}
					>
						Run
					</p>
					<p style={{ margin: 0 }}>
						{selected.session?.sessionId ?? "Unknown"}
					</p>
				</article>
				<article style={cardStyle}>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: "0.25rem",
							marginTop: 0,
						}}
					>
						Job
					</p>
					<p style={{ margin: 0 }}>{selected.job?.jobId ?? "No active job"}</p>
				</article>
				<article style={cardStyle}>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: "0.25rem",
							marginTop: 0,
						}}
					>
						Trace
					</p>
					<p style={{ margin: 0 }}>
						{selected.approval?.traceId ?? "No trace available"}
					</p>
				</article>
			</div>

			<article style={cardStyle}>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						marginBottom: "0.35rem",
						marginTop: 0,
					}}
				>
					Run and workflow
				</p>
				<p style={{ marginBottom: "0.35rem", marginTop: 0 }}>
					{selected.session
						? `${selected.session.workflow} is ${selected.session.status}. Updated ${formatTimestamp(selected.session.updatedAt)}.`
						: "No run summary is available for this approval."}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", marginBottom: 0 }}>
					{selected.route.message}
				</p>
			</article>

			{selected.failure ? (
				<article
					style={{
						...cardStyle,
						background: "var(--jh-color-status-error-bg)",
						borderColor: "var(--jh-color-status-error-border)",
					}}
				>
					<p
						style={{
							color: "var(--jh-color-status-error-fg)",
							marginBottom: "0.35rem",
							marginTop: 0,
						}}
					>
						Latest failure
					</p>
					<p style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						{selected.failure.message}
					</p>
					<p style={{ color: "var(--jh-color-status-error-fg)", margin: 0 }}>
						Failed {formatTimestamp(selected.failure.failedAt)}
					</p>
				</article>
			) : null}

			<article style={cardStyle}>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						marginBottom: "0.35rem",
						marginTop: 0,
					}}
				>
					Request details
				</p>
				<pre
					style={{
						margin: 0,
						overflowX: "auto",
						whiteSpace: "pre-wrap",
					}}
				>
					{formatJson(selected.approval?.details ?? null)}
				</pre>
			</article>

			<section style={cardStyle}>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						marginBottom: "0.35rem",
						marginTop: 0,
					}}
				>
					Recent timeline
				</p>
				{selected.timeline.length === 0 ? (
					<p style={{ margin: 0 }}>
						No runtime timeline entries are available yet.
					</p>
				) : (
					<div style={{ display: "grid", gap: "0.7rem" }}>
						{selected.timeline.slice(0, 4).map((item) => (
							<article
								key={item.eventId}
								style={{
									borderTop: "var(--jh-border-subtle)",
									paddingTop: "0.7rem",
								}}
							>
								<p
									style={{
										fontWeight: 700,
										marginBottom: "0.2rem",
										marginTop: 0,
									}}
								>
									{item.summary}
								</p>
								<p
									style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}
								>
									{item.eventType} at {formatTimestamp(item.occurredAt)}
								</p>
							</article>
						))}
					</div>
				)}
			</section>
		</section>
	);
}

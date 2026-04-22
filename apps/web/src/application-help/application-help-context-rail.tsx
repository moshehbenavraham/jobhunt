import type { CSSProperties } from "react";
import type { ApplicationHelpSummaryPayload } from "./application-help-types";
import type { ApplicationHelpViewStatus } from "./use-application-help";

type ApplicationHelpContextRailProps = {
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onOpenChatConsole: (focus: { sessionId: string | null }) => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
	status: ApplicationHelpViewStatus;
	summary: ApplicationHelpSummaryPayload | null;
};

const railStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	display: "grid",
	gap: "0.95rem",
	padding: "1rem",
};

const cardStyle: CSSProperties = {
	background: "rgba(248, 250, 252, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.18)",
	borderRadius: "1rem",
	display: "grid",
	gap: "0.55rem",
	padding: "0.9rem",
};

const actionButtonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.2rem",
	padding: "0.5rem 0.85rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "rgba(15, 23, 42, 0.08)",
	border: "1px solid rgba(148, 163, 184, 0.3)",
	borderRadius: "999px",
	color: "#0f172a",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.1rem",
	padding: "0.45rem 0.8rem",
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

function describeEmptyState(status: ApplicationHelpViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Loading report, approval, and runtime context from the application-help summary.",
				title: "Loading context",
			};
		case "offline":
			return {
				body: "The application-help endpoint is offline, so context handoffs cannot refresh right now.",
				title: "Context rail offline",
			};
		case "error":
			return {
				body: "The application-help context rail could not be rendered from the payload.",
				title: "Context rail unavailable",
			};
		default:
			return {
				body: "Load a session to inspect report matches, approval state, and explicit handoff actions.",
				title: "No context selected",
			};
	}
}

export function ApplicationHelpContextRail({
	onOpenApprovals,
	onOpenChatConsole,
	onOpenReportViewer,
	status,
	summary,
}: ApplicationHelpContextRailProps) {
	const selectedSummary = summary?.selected.summary ?? null;

	if (!selectedSummary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="application-help-context-title"
				style={railStyle}
			>
				<header>
					<h2
						id="application-help-context-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						{emptyState.title}
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						{emptyState.body}
					</p>
				</header>
			</section>
		);
	}

	const reportContext = selectedSummary.reportContext;

	return (
		<section aria-labelledby="application-help-context-title" style={railStyle}>
			<header>
				<h2
					id="application-help-context-title"
					style={{ marginBottom: "0.35rem", marginTop: 0 }}
				>
					Context and handoffs
				</h2>
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					Keep report, approval, and chat handoffs explicit while draft review
					stays read-only in the browser.
				</p>
			</header>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Session state</h3>
				<p style={{ margin: 0 }}>
					<strong>{selectedSummary.session.sessionId}</strong>
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					Workflow {selectedSummary.session.workflow} is{" "}
					{selectedSummary.session.status}. Updated{" "}
					{formatTimestamp(selectedSummary.session.updatedAt)}.
				</p>
				{selectedSummary.job ? (
					<p style={{ color: "#475569", margin: 0 }}>
						Job {selectedSummary.job.jobId} is {selectedSummary.job.status}
						{selectedSummary.job.waitReason
							? ` (${selectedSummary.job.waitReason})`
							: ""}
						.
					</p>
				) : null}
				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						aria-label="Open report viewer for the selected application-help context"
						disabled={reportContext === null}
						onClick={() =>
							onOpenReportViewer({
								reportPath: reportContext?.reportRepoRelativePath ?? null,
							})
						}
						style={{
							...actionButtonStyle,
							opacity: reportContext === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open report viewer
					</button>
					<button
						aria-label="Open approvals for the selected application-help session"
						disabled={selectedSummary.approval === null}
						onClick={() =>
							onOpenApprovals({
								approvalId: selectedSummary.approval?.approvalId ?? null,
								sessionId: selectedSummary.session.sessionId,
							})
						}
						style={{
							...subtleButtonStyle,
							opacity: selectedSummary.approval === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open approvals
					</button>
					<button
						aria-label="Open chat for the selected application-help session"
						disabled={!selectedSummary.session.sessionId}
						onClick={() =>
							onOpenChatConsole({
								sessionId: selectedSummary.session.sessionId,
							})
						}
						style={subtleButtonStyle}
						type="button"
					>
						Open chat
					</button>
				</div>
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
					Next-review guidance
				</h3>
				<p style={{ fontWeight: 700, margin: 0 }}>
					{selectedSummary.nextReview.action}
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					{selectedSummary.nextReview.message}
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					{selectedSummary.reviewBoundary.message}
				</p>
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Matched report</h3>
				{reportContext ? (
					<>
						<p style={{ margin: 0 }}>
							<strong>{reportContext.company ?? "Unknown company"}</strong>
						</p>
						<p style={{ color: "#475569", margin: 0 }}>
							{reportContext.role ?? "Role unavailable"} |{" "}
							{reportContext.reportRepoRelativePath}
						</p>
						<p style={{ color: "#475569", margin: 0 }}>
							Match: {reportContext.matchState}
							{reportContext.reportNumber
								? ` | Report ${reportContext.reportNumber}`
								: ""}
							{reportContext.score !== null
								? ` | Score ${reportContext.score.toFixed(1)} / 5`
								: ""}
						</p>
						<p style={{ color: "#475569", margin: 0 }}>
							PDF:{" "}
							{reportContext.pdf.repoRelativePath
								? `${reportContext.pdf.repoRelativePath} (${reportContext.pdf.exists ? "available" : "missing"})`
								: "No linked PDF"}
						</p>
						{reportContext.legitimacy ? (
							<p style={{ color: "#475569", margin: 0 }}>
								Legitimacy: {reportContext.legitimacy}
							</p>
						) : null}
						{reportContext.matchReasons.length > 0 ? (
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{reportContext.matchReasons.map((reason) => (
									<li key={reason}>{reason}</li>
								))}
							</ul>
						) : null}
					</>
				) : (
					<p style={{ color: "#475569", margin: 0 }}>
						No report-backed context is attached to the selected session yet.
					</p>
				)}
			</section>

			{selectedSummary.warnings.length > 0 ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						Review warnings
					</h3>
					<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
						{selectedSummary.warnings.map((warning) => (
							<li key={`${warning.code}:${warning.message}`}>
								{warning.message}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{selectedSummary.approval ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						Approval detail
					</h3>
					<p style={{ margin: 0 }}>
						<strong>{selectedSummary.approval.title}</strong>
					</p>
					<p style={{ color: "#475569", margin: 0 }}>
						Approval {selectedSummary.approval.approvalId} is{" "}
						{selectedSummary.approval.status}. Requested{" "}
						{formatTimestamp(selectedSummary.approval.requestedAt)}.
					</p>
				</section>
			) : null}

			{selectedSummary.failure ? (
				<section
					style={{
						...cardStyle,
						background: "#fee2e2",
						borderColor: "#fecaca",
					}}
				>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						Failure detail
					</h3>
					<p style={{ color: "#991b1b", margin: 0 }}>
						{selectedSummary.failure.message}
					</p>
					<p style={{ color: "#7f1d1d", margin: 0 }}>
						Failed {formatTimestamp(selectedSummary.failure.failedAt)}
					</p>
				</section>
			) : null}
		</section>
	);
}

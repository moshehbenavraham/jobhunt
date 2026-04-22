import type { CSSProperties } from "react";
import type { SpecialistWorkspaceSummaryPayload } from "./specialist-workspace-types";
import type { SpecialistWorkspaceViewStatus } from "./use-specialist-workspace";

type SpecialistWorkspaceStatePanelProps = {
	isBusy: boolean;
	onClearSelection: () => void;
	onResumeSelected: () => void;
	status: SpecialistWorkspaceViewStatus;
	summary: SpecialistWorkspaceSummaryPayload | null;
};

const panelStyle: CSSProperties = {
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

const buttonStyle: CSSProperties = {
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

const warningChipStyle: CSSProperties = {
	background: "#fef3c7",
	border: "1px solid #fde68a",
	borderRadius: "999px",
	color: "#92400e",
	fontSize: "0.82rem",
	fontWeight: 700,
	padding: "0.22rem 0.6rem",
};

function describeEmptyState(status: SpecialistWorkspaceViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Loading the selected specialist summary, warnings, and next action.",
				title: "Loading selected workflow",
			};
		case "offline":
			return {
				body: "The specialist workspace endpoint is offline, so selected workflow state is unavailable right now.",
				title: "Selected workflow offline",
			};
		case "error":
			return {
				body: "The selected specialist state could not be rendered from the summary payload.",
				title: "Selected workflow unavailable",
			};
		default:
			return {
				body: "Select a workflow to inspect run state, selected session context, and the next explicit browser action.",
				title: "No workflow selected",
			};
	}
}

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

function formatStateLabel(value: string): string {
	switch (value) {
		case "active-session":
			return "Active session";
		case "dedicated-detail":
			return "Dedicated detail";
		case "pending-session":
			return "Pending session";
		case "summary-pending":
			return "Summary pending";
		case "tooling-gap":
			return "Tooling gap";
		default:
			return value
				.split("-")
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join(" ");
	}
}

export function SpecialistWorkspaceStatePanel({
	isBusy,
	onClearSelection,
	onResumeSelected,
	status,
	summary,
}: SpecialistWorkspaceStatePanelProps) {
	const selectedSummary = summary?.selected.summary ?? null;

	if (!selectedSummary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="specialist-workspace-state-title"
				style={panelStyle}
			>
				<header>
					<h2
						id="specialist-workspace-state-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						Selected workflow state
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Keep one bounded specialist state in view while the shared workflow
						inventory stays visible beside it.
					</p>
				</header>

				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
						{emptyState.body}
					</p>
				</section>
			</section>
		);
	}

	const canResume =
		selectedSummary.nextAction.action === "resume" &&
		selectedSummary.nextAction.sessionId !== null;

	return (
		<section
			aria-labelledby="specialist-workspace-state-title"
			style={panelStyle}
		>
			<header>
				<h2
					id="specialist-workspace-state-title"
					style={{ marginBottom: "0.35rem", marginTop: 0 }}
				>
					Selected workflow state
				</h2>
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					{summary?.selected.message ?? selectedSummary.message}
				</p>
			</header>

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
							{selectedSummary.handoff.label}
						</h3>
						<p style={{ color: "#475569", margin: 0 }}>
							{selectedSummary.handoff.specialistLabel} |{" "}
							{selectedSummary.supportState}
						</p>
					</div>
					<button
						aria-label="Clear selected specialist workflow"
						onClick={onClearSelection}
						style={subtleButtonStyle}
						type="button"
					>
						Clear
					</button>
				</div>

				<p style={{ color: "#475569", margin: 0 }}>{selectedSummary.message}</p>
				<p style={{ color: "#475569", margin: 0 }}>
					Result: {formatStateLabel(selectedSummary.result.state)} | Next
					action: {formatStateLabel(selectedSummary.nextAction.action)}
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					{selectedSummary.nextAction.message}
				</p>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						aria-label="Resume selected specialist session"
						disabled={!canResume || isBusy}
						onClick={onResumeSelected}
						style={{
							...buttonStyle,
							opacity: !canResume || isBusy ? 0.6 : 1,
						}}
						type="button"
					>
						Resume selected
					</button>
					<span style={{ color: "#475569", fontSize: "0.92rem" }}>
						{selectedSummary.result.message}
					</span>
				</div>
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Run summary</h3>
				<p style={{ margin: 0 }}>
					<strong>{formatStateLabel(selectedSummary.run.state)}</strong>
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					{selectedSummary.run.message}
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					Resume allowed: {selectedSummary.run.resumeAllowed ? "yes" : "no"}
				</p>
				{selectedSummary.session ? (
					<p style={{ color: "#475569", margin: 0 }}>
						Session {selectedSummary.session.sessionId} is{" "}
						{selectedSummary.session.status}. Updated{" "}
						{formatTimestamp(selectedSummary.session.updatedAt)}.
					</p>
				) : (
					<p style={{ color: "#475569", margin: 0 }}>
						No specialist session is currently attached to this selection.
					</p>
				)}
				{selectedSummary.job ? (
					<p style={{ color: "#475569", margin: 0 }}>
						Job {selectedSummary.job.jobId} is {selectedSummary.job.status}
						{selectedSummary.job.waitReason
							? ` (${selectedSummary.job.waitReason})`
							: ""}
						.
					</p>
				) : null}
			</section>

			{selectedSummary.warnings.length > 0 ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Warnings</h3>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
						{selectedSummary.warnings.map((warning) => (
							<span key={warning.code} style={warningChipStyle}>
								{formatStateLabel(warning.code)}
							</span>
						))}
					</div>
					<div style={{ display: "grid", gap: "0.35rem" }}>
						{selectedSummary.warnings.map((warning) => (
							<p key={warning.code} style={{ color: "#475569", margin: 0 }}>
								{warning.message}
							</p>
						))}
					</div>
				</section>
			) : null}

			{selectedSummary.failure ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						Latest failure
					</h3>
					<p style={{ color: "#991b1b", margin: 0 }}>
						{selectedSummary.failure.message}
					</p>
					<p style={{ color: "#475569", margin: 0 }}>
						Failed {formatTimestamp(selectedSummary.failure.failedAt)} | Run{" "}
						{selectedSummary.failure.runId}
					</p>
				</section>
			) : null}
		</section>
	);
}

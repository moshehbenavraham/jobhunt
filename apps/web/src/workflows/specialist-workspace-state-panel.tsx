import type { CSSProperties } from "react";
import {
	isSpecialistWorkspaceInlineReviewMode,
	type SpecialistWorkspaceSummaryPayload,
} from "./specialist-workspace-types";
import type { SpecialistWorkspaceViewStatus } from "./use-specialist-workspace";

type SpecialistWorkspaceStatePanelProps = {
	isBusy: boolean;
	onClearSelection: () => void;
	onResumeSelected: () => void;
	status: SpecialistWorkspaceViewStatus;
	summary: SpecialistWorkspaceSummaryPayload | null;
};

const panelStyle: CSSProperties = {
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

const buttonStyle: CSSProperties = {
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

const warningChipStyle: CSSProperties = {
	background: "var(--jh-color-severity-warn-bg)",
	border: "1px solid var(--jh-color-badge-attention-bg)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-severity-warn-fg)",
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
				body: "The workflows workspace is unavailable right now, so selected workflow state cannot refresh.",
				title: "Selected workflow offline",
			};
		case "error":
			return {
				body: "The selected specialist state could not be loaded.",
				title: "Selected workflow unavailable",
			};
		default:
			return {
				body: "Select a workflow to inspect run state, run context, and the next explicit browser action.",
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

function formatStateLabel(
	value: string,
	input: {
		inlineReview: boolean;
	},
): string {
	switch (value) {
		case "active-session":
			return "Active run";
		case "dedicated-detail":
			return input.inlineReview ? "Inline review" : "Dedicated detail";
		case "pending-session":
			return "Pending run";
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
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						Keep one bounded specialist state in view while the shared workflow
						inventory stays visible beside it.
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

	const canResume =
		selectedSummary.nextAction.action === "resume" &&
		selectedSummary.nextAction.sessionId !== null;
	const inlineReview = isSpecialistWorkspaceInlineReviewMode(
		selectedSummary.handoff.mode,
	);

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
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
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
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
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

				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					{selectedSummary.message}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					Result:{" "}
					{formatStateLabel(selectedSummary.result.state, {
						inlineReview,
					})}{" "}
					| Next action:{" "}
					{formatStateLabel(selectedSummary.nextAction.action, {
						inlineReview,
					})}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					{inlineReview
						? "Planner and narrative review now stay in the workflows workspace while approvals, chat, tracker, pipeline, and report routes remain explicit."
						: selectedSummary.nextAction.message}
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
					<span
						style={{
							color: "var(--jh-color-text-secondary)",
							fontSize: "0.92rem",
						}}
					>
						{selectedSummary.result.message}
					</span>
				</div>
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Run summary</h3>
				<p style={{ margin: 0 }}>
					<strong>
						{formatStateLabel(selectedSummary.run.state, {
							inlineReview,
						})}
					</strong>
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					{selectedSummary.run.message}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					Resume allowed: {selectedSummary.run.resumeAllowed ? "yes" : "no"}
				</p>
				{selectedSummary.session ? (
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						Session {selectedSummary.session.sessionId} is{" "}
						{selectedSummary.session.status}. Updated{" "}
						{formatTimestamp(selectedSummary.session.updatedAt)}.
					</p>
				) : (
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						No specialist run is currently attached to this selection.
					</p>
				)}
				{selectedSummary.job ? (
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
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
								{formatStateLabel(warning.code, {
									inlineReview,
								})}
							</span>
						))}
					</div>
					<div style={{ display: "grid", gap: "0.35rem" }}>
						{selectedSummary.warnings.map((warning) => (
							<p
								key={warning.code}
								style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}
							>
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
					<p style={{ color: "var(--jh-color-status-error-fg)", margin: 0 }}>
						{selectedSummary.failure.message}
					</p>
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						Failed {formatTimestamp(selectedSummary.failure.failedAt)} | Run{" "}
						{selectedSummary.failure.runId}
					</p>
				</section>
			) : null}
		</section>
	);
}

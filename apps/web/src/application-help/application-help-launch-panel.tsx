import type { ChangeEvent, CSSProperties } from "react";
import type {
	ApplicationHelpFocus,
	ApplicationHelpSummaryPayload,
} from "./application-help-types";
import type {
	ApplicationHelpNotice,
	ApplicationHelpViewStatus,
} from "./use-application-help";

type ApplicationHelpLaunchPanelProps = {
	draftInput: string;
	focus: ApplicationHelpFocus;
	isBusy: boolean;
	lastUpdatedAt: string | null;
	notice: ApplicationHelpNotice;
	onClearNotice: () => void;
	onDraftInputChange: (value: string) => void;
	onLaunch: () => void;
	onRefresh: () => void;
	onResumeSelected: () => void;
	onReviewLatest: () => void;
	status: ApplicationHelpViewStatus;
	summary: ApplicationHelpSummaryPayload | null;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "0.9rem",
	padding: "1rem",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.45rem",
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
	minHeight: "2.25rem",
	padding: "0.45rem 0.8rem",
};

const textareaStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-button-bg)",
	font: "inherit",
	lineHeight: 1.5,
	minHeight: "8rem",
	padding: "0.8rem 0.9rem",
	resize: "vertical",
	width: "100%",
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

function formatReviewStateLabel(value: string): string {
	switch (value) {
		case "approval-paused":
			return "Approval paused";
		case "draft-ready":
			return "Draft ready";
		case "missing-context":
			return "Missing context";
		case "no-draft-yet":
			return "No draft yet";
		default:
			return value.charAt(0).toUpperCase() + value.slice(1);
	}
}

function getEmptyState(status: ApplicationHelpViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Reading the bounded application-help summary from the API.",
				title: "Loading application-help workspace",
			};
		case "offline":
			return {
				body: "Application help is unavailable right now, so draft review and launch status cannot refresh.",
				title: "Application-help workspace offline",
			};
		case "error":
			return {
				body: "Application help data could not be loaded.",
				title: "Application-help workspace unavailable",
			};
		default:
			return {
				body: "Start a new application-help run with report hints or a review request, or load the latest run once one exists.",
				title: "No application-help run yet",
			};
	}
}

function handleDraftInputChange(
	event: ChangeEvent<HTMLTextAreaElement>,
	onDraftInputChange: (value: string) => void,
): void {
	onDraftInputChange(event.target.value);
}

export function ApplicationHelpLaunchPanel({
	draftInput,
	focus,
	isBusy,
	lastUpdatedAt,
	notice,
	onClearNotice,
	onDraftInputChange,
	onLaunch,
	onRefresh,
	onResumeSelected,
	onReviewLatest,
	status,
	summary,
}: ApplicationHelpLaunchPanelProps) {
	const selectedSummary = summary?.selected.summary ?? null;
	const selectedDetail = summary?.selected ?? null;
	const resumeAllowed =
		selectedSummary?.nextReview.resumeAllowed ??
		selectedSummary?.session.resumeAllowed ??
		false;
	const launchDisabled = isBusy || draftInput.trim().length === 0;
	const emptyState = !summary ? getEmptyState(status) : null;
	const reviewBoundaryMessage =
		selectedSummary?.reviewBoundary.message ??
		"Draft review is required. Submission stays manual and outside the browser workspace.";

	return (
		<section aria-labelledby="application-help-launch-title" style={panelStyle}>
			<header
				style={{
					alignItems: "start",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.9rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h2
						id="application-help-launch-title"
						style={{ marginBottom: "0.35rem" }}
					>
						Application-help launch and resume
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						Launch a new review through the chat command, or resume the selected
						run without leaving the workspace.
					</p>
				</div>

				<div style={{ display: "grid", gap: "0.55rem", justifyItems: "end" }}>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
						<button
							aria-label="Refresh application-help workspace"
							disabled={isBusy}
							onClick={onRefresh}
							style={{
								...subtleButtonStyle,
								opacity: isBusy ? 0.7 : 1,
							}}
							type="button"
						>
							Refresh
						</button>
						{focus.sessionId ? (
							<button
								aria-label="Review the latest application-help session"
								disabled={isBusy}
								onClick={onReviewLatest}
								style={{
									...subtleButtonStyle,
									opacity: isBusy ? 0.7 : 1,
								}}
								type="button"
							>
								Review latest
							</button>
						) : null}
						<button
							aria-label="Launch application-help review"
							disabled={launchDisabled}
							onClick={onLaunch}
							style={{
								...buttonStyle,
								opacity: launchDisabled ? 0.7 : 1,
							}}
							type="button"
						>
							Launch review
						</button>
					</div>
					<span
						style={{ color: "var(--jh-color-text-muted)", fontSize: "0.92rem" }}
					>
						Last updated: {formatTimestamp(lastUpdatedAt)}
					</span>
				</div>
			</header>

			{notice ? (
				<section
					aria-live="polite"
					style={{
						background:
							notice.kind === "success"
								? "var(--jh-color-status-ready-bg)"
								: notice.kind === "warn"
									? "var(--jh-color-severity-warn-bg)"
									: "var(--jh-color-severity-info-bg)",
						border: `1px solid ${
							notice.kind === "success"
								? "var(--jh-color-status-ready-border)"
								: notice.kind === "warn"
									? "var(--jh-color-status-offline-border)"
									: "#93c5fd"
						}`,
						borderRadius: "var(--jh-radius-md)",
						display: "grid",
						gap: "0.6rem",
						padding: "0.9rem",
					}}
				>
					<div
						style={{
							alignItems: "center",
							display: "flex",
							justifyContent: "space-between",
						}}
					>
						<strong>Latest action</strong>
						<button
							aria-label="Dismiss application-help notice"
							onClick={onClearNotice}
							style={subtleButtonStyle}
							type="button"
						>
							Dismiss
						</button>
					</div>
					<p style={{ margin: 0 }}>{notice.message}</p>
				</section>
			) : null}

			<section
				style={{
					background: "var(--jh-color-surface-bg)",
					border: "var(--jh-border-subtle)",
					borderRadius: "var(--jh-radius-md)",
					display: "grid",
					gap: "0.75rem",
					padding: "0.95rem",
				}}
			>
				<label
					htmlFor="application-help-launch-input"
					style={{ fontWeight: 700 }}
				>
					Application request or report hints
				</label>
				<textarea
					aria-describedby="application-help-launch-hint"
					id="application-help-launch-input"
					onChange={(event) =>
						handleDraftInputChange(event, onDraftInputChange)
					}
					placeholder="Paste the application question set, report number, company, role, or any notes needed to start a new manual-review draft."
					style={textareaStyle}
					value={draftInput}
				/>
				<p
					id="application-help-launch-hint"
					style={{ color: "var(--jh-color-text-muted)", margin: 0 }}
				>
					The browser only launches or resumes review. It never submits the
					application for you.
				</p>
			</section>

			<section
				style={{
					background: "var(--jh-color-surface-bg)",
					border: "var(--jh-border-subtle)",
					borderRadius: "var(--jh-radius-md)",
					display: "grid",
					gap: "0.7rem",
					padding: "0.95rem",
				}}
			>
				<div
					style={{
						alignItems: "start",
						display: "flex",
						flexWrap: "wrap",
						gap: "0.65rem",
						justifyContent: "space-between",
					}}
				>
					<div>
						<h3 style={{ marginBottom: "0.3rem", marginTop: 0 }}>
							Selected or latest review
						</h3>
						<p
							style={{
								color: "var(--jh-color-text-secondary)",
								marginBottom: 0,
								marginTop: 0,
							}}
						>
							{summary?.message ?? emptyState?.body}
						</p>
					</div>

					{selectedSummary ? (
						<button
							aria-label={`Resume application-help session ${selectedSummary.session.sessionId}`}
							disabled={!resumeAllowed || isBusy}
							onClick={onResumeSelected}
							style={{
								...buttonStyle,
								opacity: !resumeAllowed || isBusy ? 0.7 : 1,
							}}
							type="button"
						>
							Resume selected run
						</button>
					) : null}
				</div>

				{selectedSummary ? (
					<>
						<p style={{ margin: 0 }}>
							<strong>{selectedSummary.session.sessionId}</strong>
							{" | "}
							{formatReviewStateLabel(selectedSummary.state)}
						</p>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							{selectedSummary.message}
						</p>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							{selectedSummary.nextReview.message}
						</p>
					</>
				) : selectedDetail ? (
					<>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							{emptyState?.title ?? "Selection update"}
						</h3>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							{selectedDetail.message}
						</p>
					</>
				) : emptyState ? (
					<>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							{emptyState.title}
						</h3>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							{emptyState.body}
						</p>
					</>
				) : null}
			</section>

			<section
				style={{
					background: "var(--jh-color-status-warning-bg)",
					border: "1px solid var(--jh-color-status-warning-border)",
					borderRadius: "var(--jh-radius-md)",
					padding: "0.95rem",
				}}
			>
				<h3 style={{ marginBottom: "0.3rem", marginTop: 0 }}>
					Manual-review boundary
				</h3>
				<p
					style={{
						color: "var(--jh-color-badge-attention-fg)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
					{reviewBoundaryMessage}
				</p>
			</section>
		</section>
	);
}

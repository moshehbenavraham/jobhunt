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
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	display: "grid",
	gap: "0.9rem",
	padding: "1rem",
};

const buttonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.45rem",
	padding: "0.55rem 0.9rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "rgba(15, 23, 42, 0.08)",
	border: "1px solid rgba(148, 163, 184, 0.28)",
	borderRadius: "999px",
	color: "#0f172a",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.25rem",
	padding: "0.45rem 0.8rem",
};

const textareaStyle: CSSProperties = {
	background: "rgba(248, 250, 252, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.24)",
	borderRadius: "1rem",
	color: "#0f172a",
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
				body: "The application-help endpoint is offline, so draft review and launch status cannot refresh.",
				title: "Application-help workspace offline",
			};
		case "error":
			return {
				body: "The application-help payload could not be parsed into the launch and review surface.",
				title: "Application-help workspace unavailable",
			};
		default:
			return {
				body: "Start a new application-help run with report hints or a review request, or load the latest session once one exists.",
				title: "No application-help session yet",
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
					<p
						style={{
							color: "#475569",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Phase 05 / Session 06
					</p>
					<h2
						id="application-help-launch-title"
						style={{ marginBottom: "0.35rem" }}
					>
						Application-help launch and resume
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Launch a new application-help review through the shared chat command
						route, or resume the selected session without leaving the shell.
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
					<span style={{ color: "#64748b", fontSize: "0.92rem" }}>
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
								? "#dcfce7"
								: notice.kind === "warn"
									? "#fef3c7"
									: "#dbeafe",
						border: `1px solid ${
							notice.kind === "success"
								? "#86efac"
								: notice.kind === "warn"
									? "#fcd34d"
									: "#93c5fd"
						}`,
						borderRadius: "1rem",
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
					background: "rgba(248, 250, 252, 0.92)",
					border: "1px solid rgba(148, 163, 184, 0.2)",
					borderRadius: "1rem",
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
					style={{ color: "#64748b", margin: 0 }}
				>
					The browser only launches or resumes review. It never submits the
					application for you.
				</p>
			</section>

			<section
				style={{
					background: "rgba(248, 250, 252, 0.92)",
					border: "1px solid rgba(148, 163, 184, 0.2)",
					borderRadius: "1rem",
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
						<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
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
							Resume selected session
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
						<p style={{ color: "#475569", margin: 0 }}>
							{selectedSummary.message}
						</p>
						<p style={{ color: "#475569", margin: 0 }}>
							{selectedSummary.nextReview.message}
						</p>
					</>
				) : selectedDetail ? (
					<>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							{emptyState?.title ?? "Selection update"}
						</h3>
						<p style={{ color: "#475569", margin: 0 }}>
							{selectedDetail.message}
						</p>
					</>
				) : emptyState ? (
					<>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							{emptyState.title}
						</h3>
						<p style={{ color: "#475569", margin: 0 }}>{emptyState.body}</p>
					</>
				) : null}
			</section>

			<section
				style={{
					background: "#fff7ed",
					border: "1px solid #fed7aa",
					borderRadius: "1rem",
					padding: "0.95rem",
				}}
			>
				<h3 style={{ marginBottom: "0.3rem", marginTop: 0 }}>
					Manual-review boundary
				</h3>
				<p style={{ color: "#7c2d12", marginBottom: 0, marginTop: 0 }}>
					{reviewBoundaryMessage}
				</p>
			</section>
		</section>
	);
}

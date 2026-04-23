import type { CSSProperties } from "react";
import type { ChatConsoleSessionSummary } from "./chat-console-types";
import type {
	ChatConsolePendingAction,
	ChatConsoleViewStatus,
} from "./use-chat-console";

type RecentSessionListProps = {
	isBusy: boolean;
	onResume: (sessionId: string) => void;
	onSelect: (sessionId: string) => void;
	pendingAction: ChatConsolePendingAction;
	selectedSessionId: string | null;
	sessions: ChatConsoleSessionSummary[];
	status: ChatConsoleViewStatus;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-gap)",
	padding: "var(--jh-space-padding)",
};

const itemStyle: CSSProperties = {
	background: "rgba(248, 250, 252, 0.9)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "0.6rem",
	padding: "var(--jh-space-padding-sm)",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontFamily: "var(--jh-font-body)",
	fontWeight: 700,
	minHeight: "2.4rem",
	padding: "0.55rem 0.9rem",
};

function formatTimestamp(value: string | null): string {
	if (!value) {
		return "No timestamp available";
	}

	const date = new Date(value);

	if (Number.isNaN(date.valueOf())) {
		return value;
	}

	return date.toLocaleString();
}

function getStateTone(
	state: ChatConsoleSessionSummary["state"],
): CSSProperties {
	switch (state) {
		case "ready":
			return {
				background: "var(--jh-color-status-ready-bg)",
				color: "var(--jh-color-status-ready-fg)",
			};
		case "running":
			return {
				background: "var(--jh-color-status-running-bg)",
				color: "var(--jh-color-status-running-fg)",
			};
		case "waiting-for-approval":
			return {
				background: "var(--jh-color-status-paused-bg)",
				color: "var(--jh-color-status-paused-fg)",
			};
		case "tooling-gap":
			return {
				background: "var(--jh-color-status-tooling-bg)",
				color: "var(--jh-color-status-tooling-fg)",
			};
		case "auth-required":
			return {
				background: "var(--jh-color-status-auth-required-bg)",
				color: "var(--jh-color-status-auth-required-fg)",
			};
		case "failed":
			return {
				background: "var(--jh-color-status-failed-bg)",
				color: "var(--jh-color-status-failed-fg)",
			};
	}
}

function renderEmptyState(status: ChatConsoleViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Loading recent runs.",
				title: "Loading recent runs",
			};
		case "offline":
			return {
				body: "API offline. Recent runs cannot refresh.",
				title: "Recent runs offline",
			};
		case "error":
			return {
				body: "Failed to load recent runs.",
				title: "Recent runs unavailable",
			};
		default:
			return {
				body: "Launch a workflow to create your first run.",
				title: "No recent runs",
			};
	}
}

export function RecentSessionList({
	isBusy,
	onResume,
	onSelect,
	pendingAction,
	selectedSessionId,
	sessions,
	status,
}: RecentSessionListProps) {
	if (sessions.length === 0) {
		const emptyState = renderEmptyState(status);

		return (
			<section aria-labelledby="chat-console-recent-title" style={panelStyle}>
				<header>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							fontFamily: "var(--jh-font-body)",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Recent runs
					</p>
					<h2
						id="chat-console-recent-title"
						style={{
							fontFamily: "var(--jh-font-heading)",
							marginBottom: "0.35rem",
						}}
					>
						{emptyState.title}
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							fontFamily: "var(--jh-font-body)",
							marginBottom: 0,
						}}
					>
						{emptyState.body}
					</p>
				</header>
			</section>
		);
	}

	return (
		<section aria-labelledby="chat-console-recent-title" style={panelStyle}>
			<header>
				<p
					style={{
						color: "var(--jh-color-text-secondary)",
						fontFamily: "var(--jh-font-body)",
						letterSpacing: "0.08em",
						marginBottom: "0.35rem",
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					Recent runs
				</p>
				<h2
					id="chat-console-recent-title"
					style={{
						fontFamily: "var(--jh-font-heading)",
						marginBottom: "0.35rem",
					}}
				>
					Resume or inspect recent work
				</h2>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						fontFamily: "var(--jh-font-body)",
						marginBottom: 0,
					}}
				>
					Runs are ordered by most recent activity.
				</p>
			</header>

			<div style={{ display: "grid", gap: "0.8rem" }}>
				{sessions.map((session) => {
					const isSelected = session.sessionId === selectedSessionId;
					const isResuming =
						pendingAction?.kind === "resume" &&
						pendingAction.sessionId === session.sessionId;
					const canResume = session.resumeAllowed && session.job !== null;

					return (
						<article
							key={session.sessionId}
							style={{
								...itemStyle,
								borderColor: isSelected ? "var(--jh-color-ink)" : undefined,
								boxShadow: isSelected
									? "inset 0 0 0 1px rgba(15, 23, 42, 0.18)"
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
									<p
										style={{
											color: "var(--jh-color-text-muted)",
											fontFamily: "var(--jh-font-body)",
											margin: 0,
										}}
									>
										{session.workflow}
									</p>
									<h3
										style={{
											fontFamily: "var(--jh-font-heading)",
											marginBottom: "0.2rem",
											marginTop: "0.1rem",
										}}
									>
										{session.sessionId}
									</h3>
								</div>
								<span
									style={{
										...getStateTone(session.state),
										borderRadius: "var(--jh-radius-pill)",
										fontSize: "0.85rem",
										fontWeight: 700,
										padding: "0.25rem 0.6rem",
									}}
								>
									{session.state}
								</span>
							</div>

							<p
								style={{
									color: "var(--jh-color-text-secondary)",
									fontFamily: "var(--jh-font-body)",
									margin: 0,
								}}
							>
								Updated {formatTimestamp(session.updatedAt)}
							</p>

							{session.pendingApproval ? (
								<p
									style={{
										color: "var(--jh-color-status-paused-fg)",
										fontFamily: "var(--jh-font-body)",
										margin: 0,
									}}
								>
									Pending approval:{" "}
									{session.pendingApproval.title ||
										session.pendingApproval.approvalId}
								</p>
							) : null}

							{session.latestFailure ? (
								<p
									style={{
										color: "var(--jh-color-severity-error-fg)",
										fontFamily: "var(--jh-font-body)",
										margin: 0,
									}}
								>
									Latest failure: {session.latestFailure.message}
								</p>
							) : null}

							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "0.65rem",
								}}
							>
								<button
									disabled={isBusy}
									onClick={() => onSelect(session.sessionId)}
									style={{
										...buttonStyle,
										background: isSelected
											? "var(--jh-color-text-secondary)"
											: "var(--jh-color-button-bg)",
										opacity: isBusy ? 0.7 : 1,
									}}
									type="button"
								>
									{isSelected ? "Selected" : "Select"}
								</button>
								<button
									disabled={isBusy || !canResume || pendingAction !== null}
									onClick={() => onResume(session.sessionId)}
									style={{
										...buttonStyle,
										background: "var(--jh-color-amber)",
										color: "var(--jh-color-ink)",
										opacity:
											isBusy || !canResume || pendingAction !== null ? 0.65 : 1,
									}}
									type="button"
								>
									{isResuming ? "Resuming..." : "Resume"}
								</button>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
}

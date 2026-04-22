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
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.4rem",
	display: "grid",
	gap: "0.9rem",
	padding: "1rem",
};

const itemStyle: CSSProperties = {
	background: "rgba(248, 250, 252, 0.9)",
	border: "1px solid rgba(148, 163, 184, 0.22)",
	borderRadius: "1rem",
	display: "grid",
	gap: "0.6rem",
	padding: "0.85rem 0.95rem",
};

const buttonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	font: "inherit",
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
				background: "#dcfce7",
				color: "#166534",
			};
		case "running":
			return {
				background: "#dbeafe",
				color: "#1d4ed8",
			};
		case "waiting-for-approval":
			return {
				background: "#fef3c7",
				color: "#92400e",
			};
		case "tooling-gap":
			return {
				background: "#ede9fe",
				color: "#6d28d9",
			};
		case "auth-required":
			return {
				background: "#e0f2fe",
				color: "#0369a1",
			};
		case "failed":
			return {
				background: "#fee2e2",
				color: "#991b1b",
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
				body: "Reading recent resumable sessions from the operational store.",
				title: "Loading recent sessions",
			};
		case "offline":
			return {
				body: "The API is unavailable right now, so recent session state cannot refresh.",
				title: "Recent sessions offline",
			};
		case "error":
			return {
				body: "The recent-session request failed before a list could load.",
				title: "Recent sessions unavailable",
			};
		default:
			return {
				body: "Launch a workflow to create the first resumable session.",
				title: "No recent sessions yet",
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
							color: "#475569",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Recent sessions
					</p>
					<h2
						id="chat-console-recent-title"
						style={{ marginBottom: "0.35rem" }}
					>
						{emptyState.title}
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0 }}>{emptyState.body}</p>
				</header>
			</section>
		);
	}

	return (
		<section aria-labelledby="chat-console-recent-title" style={panelStyle}>
			<header>
				<p
					style={{
						color: "#475569",
						letterSpacing: "0.08em",
						marginBottom: "0.35rem",
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					Recent sessions
				</p>
				<h2 id="chat-console-recent-title" style={{ marginBottom: "0.35rem" }}>
					Resume or inspect recent work
				</h2>
				<p style={{ color: "#64748b", marginBottom: 0 }}>
					Session ordering comes from the backend store. Selection and resume
					controls stay on the same surface.
				</p>
			</header>

			<div style={{ display: "grid", gap: "0.8rem" }}>
				{sessions.map((session) => {
					const isSelected = session.sessionId === selectedSessionId;
					const isResuming =
						pendingAction?.kind === "resume" &&
						pendingAction.sessionId === session.sessionId;

					return (
						<article
							key={session.sessionId}
							style={{
								...itemStyle,
								borderColor: isSelected
									? "rgba(15, 23, 42, 0.48)"
									: "rgba(148, 163, 184, 0.22)",
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
									<p style={{ color: "#64748b", margin: 0 }}>
										{session.workflow}
									</p>
									<h3 style={{ marginBottom: "0.2rem", marginTop: "0.1rem" }}>
										{session.sessionId}
									</h3>
								</div>
								<span
									style={{
										...getStateTone(session.state),
										borderRadius: "999px",
										fontSize: "0.85rem",
										fontWeight: 700,
										padding: "0.25rem 0.6rem",
									}}
								>
									{session.state}
								</span>
							</div>

							<p style={{ color: "#475569", margin: 0 }}>
								Updated {formatTimestamp(session.updatedAt)}
							</p>

							{session.pendingApproval ? (
								<p style={{ color: "#92400e", margin: 0 }}>
									Pending approval:{" "}
									{session.pendingApproval.title ||
										session.pendingApproval.approvalId}
								</p>
							) : null}

							{session.latestFailure ? (
								<p style={{ color: "#991b1b", margin: 0 }}>
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
										background: isSelected ? "#334155" : "#0f172a",
										opacity: isBusy ? 0.7 : 1,
									}}
									type="button"
								>
									{isSelected ? "Selected" : "Select"}
								</button>
								<button
									disabled={
										isBusy || !session.resumeAllowed || pendingAction !== null
									}
									onClick={() => onResume(session.sessionId)}
									style={{
										...buttonStyle,
										background: "#f59e0b",
										color: "#1f2937",
										opacity:
											isBusy || !session.resumeAllowed || pendingAction !== null
												? 0.65
												: 1,
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

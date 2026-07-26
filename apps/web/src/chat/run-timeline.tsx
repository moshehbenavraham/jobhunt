import type { CSSProperties } from "react";
import type { ChatConsoleSessionDetail } from "./chat-console-types";
import type { ChatConsoleViewStatus } from "./use-chat-console";

type RunTimelineProps = {
	detail: ChatConsoleSessionDetail | null;
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
	gap: "0.35rem",
	padding: "var(--jh-space-padding-sm)",
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

function getEmptyState(status: ChatConsoleViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Loading timeline events for the selected run.",
				title: "Loading timeline",
			};
		case "offline":
			return {
				body: "API offline. Timeline events cannot refresh.",
				title: "Timeline offline",
			};
		case "error":
			return {
				body: "Timeline failed to load.",
				title: "Timeline unavailable",
			};
		default:
			return {
				body: "Select a recent run to see its timeline.",
				title: "No run selected",
			};
	}
}

function getLevelTone(level: "error" | "info" | "warn"): CSSProperties {
	switch (level) {
		case "info":
			return {
				background: "var(--jh-color-severity-info-bg)",
				color: "var(--jh-color-severity-info-fg)",
			};
		case "warn":
			return {
				background: "var(--jh-color-severity-warn-bg)",
				color: "var(--jh-color-severity-warn-fg)",
			};
		case "error":
			return {
				background: "var(--jh-color-severity-error-bg)",
				color: "var(--jh-color-severity-error-fg)",
			};
	}
}

export function RunTimeline({ detail, status }: RunTimelineProps) {
	if (!detail) {
		const emptyState = getEmptyState(status);

		return (
			<section aria-labelledby="chat-console-timeline-title" style={panelStyle}>
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
						Timeline
					</p>
					<h2
						id="chat-console-timeline-title"
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
		<section aria-labelledby="chat-console-timeline-title" style={panelStyle}>
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
					Timeline
				</p>
				<h2
					id="chat-console-timeline-title"
					style={{
						fontFamily: "var(--jh-font-heading)",
						marginBottom: "0.35rem",
					}}
				>
					Timeline events
				</h2>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						fontFamily: "var(--jh-font-body)",
						marginBottom: 0,
					}}
				>
					Run {detail.session.sessionId}
				</p>
			</header>

			{detail.timeline.length === 0 ? (
				<section style={itemStyle}>
					<p style={{ margin: 0 }}>No events recorded for this run yet.</p>
				</section>
			) : (
				<div style={{ display: "grid", gap: "var(--jh-space-padding-sm)" }}>
					{detail.timeline.map((item) => (
						<article key={item.eventId} style={itemStyle}>
							<div
								style={{
									alignItems: "center",
									display: "flex",
									flexWrap: "wrap",
									gap: "0.55rem",
									justifyContent: "space-between",
								}}
							>
								<strong>{item.summary}</strong>
								<span
									style={{
										...getLevelTone(item.level),
										borderRadius: "var(--jh-radius-pill)",
										fontSize: "0.82rem",
										fontWeight: 700,
										padding: "0.2rem 0.55rem",
									}}
								>
									{item.level}
								</span>
							</div>
							<p
								style={{
									color: "var(--jh-color-text-secondary)",
									fontFamily: "var(--jh-font-body)",
									margin: 0,
								}}
							>
								{item.eventType} at {formatTimestamp(item.occurredAt)}
							</p>
							{item.jobId ? (
								<p
									style={{
										color: "var(--jh-color-text-muted)",
										fontFamily: "var(--jh-font-mono)",
										margin: 0,
									}}
								>
									Job: {item.jobId}
								</p>
							) : null}
							{item.traceId ? (
								<p
									style={{
										color: "var(--jh-color-text-muted)",
										fontFamily: "var(--jh-font-mono)",
										margin: 0,
									}}
								>
									Trace: {item.traceId}
								</p>
							) : null}
						</article>
					))}
				</div>
			)}
		</section>
	);
}

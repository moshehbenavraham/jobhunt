import type { CSSProperties } from "react";
import type {
	TrackerSpecialistResultPacket,
	TrackerSpecialistSummaryPayload,
} from "./tracker-specialist-review-types";
import type { SpecialistReviewStatus } from "./use-specialist-review";

type TrackerSpecialistReviewPanelProps = {
	status: SpecialistReviewStatus;
	summary: TrackerSpecialistSummaryPayload | null;
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
	gap: "0.6rem",
	padding: "0.9rem",
};

function formatStateLabel(value: string): string {
	switch (value) {
		case "empty-history":
			return "Empty history";
		case "follow-up-cadence":
			return "Follow-up cadence";
		case "missing-input":
			return "Missing input";
		case "rejection-patterns":
			return "Rejection patterns";
		case "summary-pending":
			return "Summary pending";
		default:
			return value
				.split("-")
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join(" ");
	}
}

function describeEmptyState(status: SpecialistReviewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Loading planner detail.",
				title: "Loading planner review",
			};
		case "offline":
			return {
				body: "The planner service is offline and cannot refresh right now.",
				title: "Planner review offline",
			};
		case "error":
			return {
				body: "Could not load planner data. Try refreshing.",
				title: "Planner review unavailable",
			};
		default:
			return {
				body: "Select a compare-offers, follow-up, or rejection-pattern workflow to inspect planning detail here.",
				title: "No planner review selected",
			};
	}
}

function renderPacket(packet: TrackerSpecialistResultPacket) {
	switch (packet.mode) {
		case "compare-offers":
			return (
				<>
					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Resolved offers
						</h3>
						<div style={{ display: "grid", gap: "0.75rem" }}>
							{packet.offers.map((offer) => (
								<article
									key={offer.fileName}
									style={{ display: "grid", gap: "0.2rem" }}
								>
									<p style={{ fontWeight: 700, margin: 0 }}>
										{offer.company ?? offer.label ?? offer.fileName}
									</p>
									<p
										style={{
											color: "var(--jh-color-text-secondary)",
											margin: 0,
										}}
									>
										{offer.role ?? "Role unavailable"}
										{offer.score !== null
											? ` | Score ${offer.score.toFixed(1)} / 5`
											: ""}
									</p>
									<p
										style={{
											color: "var(--jh-color-text-secondary)",
											margin: 0,
										}}
									>
										Match: {formatStateLabel(offer.matchState)}
										{offer.reportNumber
											? ` | Report ${offer.reportNumber}`
											: ""}
									</p>
									{offer.matchReasons.length > 0 ? (
										<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
											{offer.matchReasons.map((reason) => (
												<li key={reason}>{reason}</li>
											))}
										</ul>
									) : null}
								</article>
							))}
						</div>
					</section>

					{packet.unmatchedReferences.length > 0 ? (
						<section style={cardStyle}>
							<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
								Unmatched references
							</h3>
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{packet.unmatchedReferences.map((reference) => (
									<li
										key={`${reference.label ?? reference.company ?? reference.role ?? "reference"}`}
									>{`${reference.label ?? reference.company ?? "Unmatched reference"}${reference.role ? ` (${reference.role})` : ""}`}</li>
								))}
							</ul>
						</section>
					) : null}
				</>
			);
		case "follow-up-cadence":
			return (
				<>
					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Cadence summary
						</h3>
						<p style={{ margin: 0 }}>
							Actionable: <strong>{packet.metadata.actionable}</strong>
						</p>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							Urgent {packet.metadata.urgent} | Overdue{" "}
							{packet.metadata.overdue}
							{" | "}Waiting {packet.metadata.waiting}
						</p>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							Tracked entries: {packet.metadata.totalTracked} | Analysis date:{" "}
							{packet.metadata.analysisDate}
						</p>
					</section>

					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Top follow-ups
						</h3>
						<div style={{ display: "grid", gap: "0.7rem" }}>
							{packet.entries.slice(0, 6).map((entry) => (
								<article
									key={`${entry.num}:${entry.company}`}
									style={{ display: "grid", gap: "0.15rem" }}
								>
									<p style={{ fontWeight: 700, margin: 0 }}>
										#{entry.num} {entry.company}
									</p>
									<p
										style={{
											color: "var(--jh-color-text-secondary)",
											margin: 0,
										}}
									>
										{entry.role} | {entry.status} | {entry.urgency}
									</p>
									<p
										style={{
											color: "var(--jh-color-text-secondary)",
											margin: 0,
										}}
									>
										Applied {entry.daysSinceApplication} days ago | Follow-ups{" "}
										{entry.followupCount}
									</p>
								</article>
							))}
						</div>
					</section>
				</>
			);
		case "rejection-patterns":
			return (
				<>
					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Funnel and recommendations
						</h3>
						<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
							{packet.funnel.map((item) => (
								<li key={item.stage}>
									{item.stage}: {item.count}
								</li>
							))}
						</ul>
						{packet.recommendations.length > 0 ? (
							<div style={{ display: "grid", gap: "0.55rem" }}>
								{packet.recommendations.map((item) => (
									<article
										key={item.action}
										style={{ display: "grid", gap: "0.15rem" }}
									>
										<p style={{ fontWeight: 700, margin: 0 }}>{item.action}</p>
										<p
											style={{
												color: "var(--jh-color-text-secondary)",
												margin: 0,
											}}
										>
											{item.impact}
										</p>
										<p
											style={{ color: "var(--jh-color-text-muted)", margin: 0 }}
										>
											{item.reasoning}
										</p>
									</article>
								))}
							</div>
						) : null}
					</section>

					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Blockers and score threshold
						</h3>
						<p style={{ margin: 0 }}>
							Recommended threshold:{" "}
							<strong>{packet.scoreThreshold.recommended}</strong>
						</p>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							{packet.scoreThreshold.reasoning}
						</p>
						{packet.topBlockers.length > 0 ? (
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{packet.topBlockers.map((item) => (
									<li key={item.blocker}>
										{item.blocker} ({item.frequency}, {item.percentage}%)
									</li>
								))}
							</ul>
						) : null}
					</section>
				</>
			);
	}
}

export function TrackerSpecialistReviewPanel({
	status,
	summary,
}: TrackerSpecialistReviewPanelProps) {
	const selectedSummary = summary?.selected.summary ?? null;

	if (!selectedSummary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="tracker-specialist-review-title"
				style={panelStyle}
			>
				<header>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Planner review
					</p>
					<h2
						id="tracker-specialist-review-title"
						style={{ marginBottom: "0.35rem" }}
					>
						{emptyState.title}
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{emptyState.body}
					</p>
				</header>
			</section>
		);
	}

	return (
		<section
			aria-labelledby="tracker-specialist-review-title"
			style={panelStyle}
		>
			<header
				style={{
					alignItems: "start",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.8rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Planner review
					</p>
					<h2
						id="tracker-specialist-review-title"
						style={{ marginBottom: "0.35rem" }}
					>
						{selectedSummary.workflow.label}
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{selectedSummary.message}
					</p>
				</div>
				<span
					style={{
						background:
							selectedSummary.state === "degraded"
								? "var(--jh-color-status-error-bg)"
								: selectedSummary.state === "waiting"
									? "var(--jh-color-severity-warn-bg)"
									: "var(--jh-color-severity-info-bg)",
						borderRadius: "var(--jh-radius-pill)",
						color:
							selectedSummary.state === "degraded"
								? "var(--jh-color-status-error-fg)"
								: selectedSummary.state === "waiting"
									? "var(--jh-color-severity-warn-fg)"
									: "var(--jh-color-severity-info-fg)",
						fontSize: "0.9rem",
						fontWeight: 700,
						padding: "0.3rem 0.75rem",
					}}
				>
					{formatStateLabel(selectedSummary.state)}
				</span>
			</header>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>Next action</h3>
				<p style={{ fontWeight: 700, margin: 0 }}>
					{formatStateLabel(selectedSummary.nextAction.action)}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					{selectedSummary.nextAction.message}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					Run state: {formatStateLabel(selectedSummary.run.state)} | Resume
					allowed: {selectedSummary.run.resumeAllowed ? "yes" : "no"}
				</p>
			</section>

			{selectedSummary.warnings.length > 0 ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>Warnings</h3>
					<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
						{selectedSummary.warnings.map((warning) => (
							<li key={`${warning.code}:${warning.message}`}>
								{warning.message}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{selectedSummary.packet ? (
				renderPacket(selectedSummary.packet)
			) : (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
						Review packet
					</h3>
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						{selectedSummary.message}
					</p>
				</section>
			)}
		</section>
	);
}

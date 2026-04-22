import type { CSSProperties } from "react";
import type {
	ApplicationHelpSelectedSummary,
	ApplicationHelpSummaryPayload,
} from "./application-help-types";
import type { ApplicationHelpViewStatus } from "./use-application-help";

type ApplicationHelpDraftPanelProps = {
	status: ApplicationHelpViewStatus;
	summary: ApplicationHelpSummaryPayload | null;
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
	gap: "0.6rem",
	padding: "0.9rem",
};

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

function describeEmptyState(
	status: ApplicationHelpViewStatus,
	summary: ApplicationHelpSummaryPayload | null,
): {
	body: string;
	title: string;
} {
	if (summary?.selected.state === "missing") {
		return {
			body: summary.selected.message,
			title: "Selected session is unavailable",
		};
	}

	switch (status) {
		case "loading":
			return {
				body: "Loading staged draft content and review guidance from the API.",
				title: "Loading draft review",
			};
		case "offline":
			return {
				body: "The application-help endpoint is offline, so staged draft review cannot refresh right now.",
				title: "Draft review offline",
			};
		case "error":
			return {
				body: "The staged draft packet could not be rendered from the application-help payload.",
				title: "Draft review unavailable",
			};
		default:
			return {
				body: "Launch a new application-help run or load the latest session to inspect draft answers here.",
				title: "No draft review selected",
			};
	}
}

function getFallbackDraftBody(summary: ApplicationHelpSelectedSummary): string {
	switch (summary.state) {
		case "missing-context":
			return "No report-backed context has been matched yet, so the browser cannot show a saved draft packet.";
		case "no-draft-yet":
			return "A report may be matched, but the first structured draft packet has not been staged yet.";
		case "approval-paused":
			return "Draft review is paused on approval. Resolve the approval, then resume the session to continue.";
		case "rejected":
			return "The latest staged draft needs revision before the run can continue.";
		case "completed":
			return "The run is complete. Review the final staged packet and keep any submission manual.";
		case "resumed":
			return "The run is resumable from the current draft packet.";
		case "draft-ready":
			return "A draft-ready review state was returned without staged answers.";
	}
}

export function ApplicationHelpDraftPanel({
	status,
	summary,
}: ApplicationHelpDraftPanelProps) {
	const selectedSummary = summary?.selected.summary ?? null;

	if (!selectedSummary) {
		const emptyState = describeEmptyState(status, summary);

		return (
			<section
				aria-labelledby="application-help-draft-title"
				style={panelStyle}
			>
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
						Draft review
					</p>
					<h2
						id="application-help-draft-title"
						style={{ marginBottom: "0.35rem" }}
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

	const stagedItems = selectedSummary.draftPacket?.items ?? [];
	const savedItems =
		selectedSummary.draftPacket === null
			? (selectedSummary.reportContext?.existingDraft.items ?? [])
			: [];
	const items = stagedItems.length > 0 ? stagedItems : savedItems;

	return (
		<section aria-labelledby="application-help-draft-title" style={panelStyle}>
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
							color: "#475569",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Draft review
					</p>
					<h2
						id="application-help-draft-title"
						style={{ marginBottom: "0.35rem" }}
					>
						{selectedSummary.draftPacket
							? "Staged application answers"
							: "Draft review guidance"}
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						{selectedSummary.message}
					</p>
				</div>
				<span
					style={{
						background:
							selectedSummary.state === "approval-paused"
								? "#fef3c7"
								: selectedSummary.state === "rejected"
									? "#fee2e2"
									: "#dbeafe",
						borderRadius: "999px",
						color:
							selectedSummary.state === "approval-paused"
								? "#92400e"
								: selectedSummary.state === "rejected"
									? "#991b1b"
									: "#1d4ed8",
						fontSize: "0.9rem",
						fontWeight: 700,
						padding: "0.3rem 0.75rem",
					}}
				>
					{formatReviewStateLabel(selectedSummary.state)}
				</span>
			</header>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
					Next review action
				</h3>
				<p style={{ fontWeight: 700, margin: 0 }}>
					{selectedSummary.nextReview.action}
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					{selectedSummary.nextReview.message}
				</p>
			</section>

			{selectedSummary.warnings.length > 0 ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>Warnings</h3>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
						{selectedSummary.warnings.map((warning) => (
							<span
								key={`${warning.code}:${warning.message}`}
								style={{
									background:
										warning.code === "approval-paused" ||
										warning.code === "rejected"
											? "#fef3c7"
											: "#e2e8f0",
									borderRadius: "999px",
									padding: "0.35rem 0.7rem",
								}}
							>
								{warning.message}
							</span>
						))}
					</div>
				</section>
			) : null}

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
					{selectedSummary.draftPacket
						? "Structured answers"
						: selectedSummary.reportContext?.existingDraft.sectionPresent
							? "Saved report draft context"
							: "Draft status"}
				</h3>

				{items.length > 0 ? (
					<div style={{ display: "grid", gap: "0.75rem" }}>
						{items.map((item, index) => (
							<article
								key={`${item.question}:${item.answer}`}
								style={{
									borderTop:
										index === 0
											? "none"
											: "1px solid rgba(148, 163, 184, 0.16)",
									paddingTop: index === 0 ? 0 : "0.75rem",
								}}
							>
								<p
									style={{
										fontWeight: 700,
										marginBottom: "0.25rem",
										marginTop: 0,
									}}
								>
									{item.question}
								</p>
								<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
									{item.answer}
								</p>
							</article>
						))}
					</div>
				) : selectedSummary.reportContext?.existingDraft.sectionText ? (
					<p style={{ color: "#475569", margin: 0 }}>
						{selectedSummary.reportContext.existingDraft.sectionText}
					</p>
				) : (
					<p style={{ color: "#475569", margin: 0 }}>
						{getFallbackDraftBody(selectedSummary)}
					</p>
				)}
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>Review notes</h3>
				<p style={{ color: "#475569", margin: 0 }}>
					{selectedSummary.draftPacket?.reviewNotes ??
						"No structured review notes have been staged yet."}
				</p>
			</section>
		</section>
	);
}

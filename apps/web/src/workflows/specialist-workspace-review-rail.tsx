import type { CSSProperties } from "react";
import {
	type ResearchSpecialistSummaryPayload,
	resolveResearchSpecialistPipelineUrl,
	resolveResearchSpecialistReportNumber,
	resolveResearchSpecialistReportPath,
} from "./research-specialist-review-types";
import {
	resolveTrackerSpecialistPipelineUrl,
	resolveTrackerSpecialistReportNumber,
	resolveTrackerSpecialistReportPath,
	resolveTrackerSpecialistTrackerEntryNumber,
	type TrackerSpecialistSummaryPayload,
} from "./tracker-specialist-review-types";
import type { SpecialistReviewPayload } from "./use-specialist-review";

type SpecialistWorkspaceReviewRailProps = {
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onOpenChatConsole: (focus: { sessionId: string | null }) => void;
	onOpenPipelineReview: (focus: {
		reportNumber: string | null;
		section: "all" | "processed";
		url: string | null;
	}) => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
	onOpenTrackerWorkspace: (focus: {
		entryNumber: number | null;
		reportNumber: string | null;
	}) => void;
	review: SpecialistReviewPayload | null;
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

function getTrackerHandoffs(payload: TrackerSpecialistSummaryPayload) {
	return {
		entryNumber: resolveTrackerSpecialistTrackerEntryNumber(payload),
		pipelineUrl: resolveTrackerSpecialistPipelineUrl(payload),
		reportNumber: resolveTrackerSpecialistReportNumber(payload),
		reportPath: resolveTrackerSpecialistReportPath(payload),
	};
}

function getResearchHandoffs(payload: ResearchSpecialistSummaryPayload) {
	return {
		pipelineUrl: resolveResearchSpecialistPipelineUrl(payload),
		reportNumber: resolveResearchSpecialistReportNumber(payload),
		reportPath: resolveResearchSpecialistReportPath(payload),
	};
}

export function SpecialistWorkspaceReviewRail({
	onOpenApprovals,
	onOpenChatConsole,
	onOpenPipelineReview,
	onOpenReportViewer,
	onOpenTrackerWorkspace,
	review,
}: SpecialistWorkspaceReviewRailProps) {
	if (!review) {
		return (
			<section aria-labelledby="specialist-review-rail-title" style={railStyle}>
				<header>
					<h2
						id="specialist-review-rail-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						Review handoffs
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Inline specialist review surfaces keep report, tracker, pipeline,
						chat, and approval handoffs explicit and backend-owned.
					</p>
				</header>

				<section style={cardStyle}>
					<p style={{ color: "#475569", margin: 0 }}>
						Select an inline-review workflow to activate report, tracker,
						pipeline, approval, and chat handoffs.
					</p>
				</section>
			</section>
		);
	}

	const selectedSummary = review.payload.selected.summary;
	const sessionId =
		selectedSummary?.session?.sessionId ??
		selectedSummary?.nextAction.sessionId;
	const approvalId = selectedSummary?.approval?.approvalId ?? null;
	const trackerHandoffs =
		review.family === "tracker-specialist"
			? getTrackerHandoffs(review.payload)
			: null;
	const researchHandoffs =
		review.family === "research-specialist"
			? getResearchHandoffs(review.payload)
			: null;
	const handoffs = trackerHandoffs ??
		researchHandoffs ?? {
			pipelineUrl: null,
			reportNumber: null,
			reportPath: null,
		};
	const canOpenTracker =
		trackerHandoffs !== null &&
		(trackerHandoffs.entryNumber !== null ||
			trackerHandoffs.reportNumber !== null);

	return (
		<section aria-labelledby="specialist-review-rail-title" style={railStyle}>
			<header>
				<h2
					id="specialist-review-rail-title"
					style={{ marginBottom: "0.35rem", marginTop: 0 }}
				>
					Review handoffs
				</h2>
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					Use explicit backend-owned routes when the review packet points to
					related reports, tracker rows, pipeline items, approvals, or chat.
				</p>
			</header>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
					Session context
				</h3>
				<p style={{ margin: 0 }}>
					<strong>
						{selectedSummary?.workflow.label ?? "Specialist review"}
					</strong>
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					Session {sessionId ?? "not available"} | Run{" "}
					{selectedSummary?.run.state ?? "unknown"}
				</p>
				{selectedSummary?.session ? (
					<p style={{ color: "#475569", margin: 0 }}>
						Last updated {formatTimestamp(selectedSummary.session.updatedAt)}
					</p>
				) : null}
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
					Explicit routes
				</h3>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						disabled={handoffs.reportPath === null}
						onClick={() =>
							onOpenReportViewer({
								reportPath: handoffs.reportPath,
							})
						}
						style={{
							...actionButtonStyle,
							opacity: handoffs.reportPath === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open report viewer
					</button>
					<button
						disabled={
							handoffs.reportNumber === null && handoffs.pipelineUrl === null
						}
						onClick={() =>
							onOpenPipelineReview({
								reportNumber: handoffs.reportNumber,
								section: "all",
								url: handoffs.reportNumber ? null : handoffs.pipelineUrl,
							})
						}
						style={{
							...subtleButtonStyle,
							opacity:
								handoffs.reportNumber === null && handoffs.pipelineUrl === null
									? 0.6
									: 1,
						}}
						type="button"
					>
						Open pipeline
					</button>
					<button
						disabled={!canOpenTracker}
						onClick={() =>
							onOpenTrackerWorkspace({
								entryNumber:
									review.family === "tracker-specialist"
										? (trackerHandoffs?.entryNumber ?? null)
										: null,
								reportNumber: handoffs.reportNumber,
							})
						}
						style={{
							...subtleButtonStyle,
							opacity: canOpenTracker ? 1 : 0.6,
						}}
						type="button"
					>
						Open tracker
					</button>
					<button
						disabled={approvalId === null}
						onClick={() =>
							onOpenApprovals({
								approvalId,
								sessionId: sessionId ?? null,
							})
						}
						style={{
							...subtleButtonStyle,
							opacity: approvalId === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open approvals
					</button>
					<button
						disabled={sessionId === null}
						onClick={() =>
							onOpenChatConsole({
								sessionId: sessionId ?? null,
							})
						}
						style={{
							...subtleButtonStyle,
							opacity: sessionId === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open chat
					</button>
				</div>
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Review notes</h3>
				<p style={{ color: "#475569", margin: 0 }}>
					{selectedSummary?.message}
				</p>
				{review.family === "research-specialist" &&
				review.payload.selected.summary?.reviewBoundary ? (
					<p style={{ color: "#475569", margin: 0 }}>
						{review.payload.selected.summary.reviewBoundary.message}
					</p>
				) : null}
				{review.family === "tracker-specialist" && selectedSummary ? (
					<p style={{ color: "#475569", margin: 0 }}>
						{selectedSummary.nextAction.message}
					</p>
				) : null}
			</section>
		</section>
	);
}

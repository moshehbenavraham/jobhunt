import type { CSSProperties } from "react";
import { ResearchSpecialistReviewPanel } from "./research-specialist-review-panel";
import { SpecialistWorkspaceDetailRail } from "./specialist-workspace-detail-rail";
import { SpecialistWorkspaceLaunchPanel } from "./specialist-workspace-launch-panel";
import { SpecialistWorkspaceReviewRail } from "./specialist-workspace-review-rail";
import { SpecialistWorkspaceStatePanel } from "./specialist-workspace-state-panel";
import type { SpecialistWorkspaceMode } from "./specialist-workspace-types";
import { TrackerSpecialistReviewPanel } from "./tracker-specialist-review-panel";
import { useSpecialistReview } from "./use-specialist-review";
import { useSpecialistWorkspace } from "./use-specialist-workspace";

type SpecialistWorkspaceSurfaceProps = {
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
	onOpenDetailSurface: (input: {
		mode: SpecialistWorkspaceMode;
		path: string;
		sessionId: string | null;
	}) => void;
	onOpenTrackerWorkspace: (focus: {
		entryNumber: number | null;
		reportNumber: string | null;
	}) => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const detailGridStyle: CSSProperties = {
	alignItems: "start",
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "minmax(0, 1.7fr) minmax(20rem, 1fr)",
};

const noticeStyle: CSSProperties = {
	borderRadius: "1rem",
	padding: "0.9rem",
};

export function SpecialistWorkspaceSurface({
	onOpenApprovals,
	onOpenChatConsole,
	onOpenPipelineReview,
	onOpenReportViewer,
	onOpenDetailSurface,
	onOpenTrackerWorkspace,
}: SpecialistWorkspaceSurfaceProps) {
	const specialistWorkspace = useSpecialistWorkspace();
	const specialistReview = useSpecialistReview({
		focus: specialistWorkspace.state.focus,
		lastUpdatedAt: specialistWorkspace.state.lastUpdatedAt,
		summary: specialistWorkspace.state.data,
	});
	const isBusy =
		specialistWorkspace.state.isRefreshing ||
		specialistWorkspace.state.pendingAction !== null;
	const trackerSummary =
		specialistReview.payload?.family === "tracker-specialist"
			? specialistReview.payload.payload
			: null;
	const researchSummary =
		specialistReview.payload?.family === "research-specialist"
			? specialistReview.payload.payload
			: null;
	const showInlineReview = specialistReview.selection.family !== null;

	return (
		<section aria-labelledby="specialist-workspace-title" style={surfaceStyle}>
			<header
				style={{
					display: "grid",
					gap: "0.35rem",
				}}
			>
				<p
					style={{
						color: "#9a3412",
						letterSpacing: "0.08em",
						marginBottom: 0,
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					Phase 06 / Session 02
				</p>
				<h1
					id="specialist-workspace-title"
					style={{ marginBottom: 0, marginTop: 0 }}
				>
					Specialist workflows workspace
				</h1>
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					Launch, resume, inspect, and hand off specialist workflows from one
					bounded shell surface without browser-side repo reads.
				</p>
			</header>

			{(specialistWorkspace.state.status === "offline" ||
				specialistWorkspace.state.status === "error") &&
			specialistWorkspace.state.error ? (
				<section
					style={{
						...noticeStyle,
						background:
							specialistWorkspace.state.status === "offline"
								? "#e2e8f0"
								: "#fee2e2",
						border: `1px solid ${
							specialistWorkspace.state.status === "offline"
								? "#cbd5e1"
								: "#fecaca"
						}`,
					}}
				>
					<strong
						style={{
							display: "block",
							marginBottom: "0.25rem",
						}}
					>
						{specialistWorkspace.state.status === "offline"
							? "Showing the last workflows snapshot"
							: "Workflows workspace warning"}
					</strong>
					<p style={{ margin: 0 }}>{specialistWorkspace.state.error.message}</p>
				</section>
			) : null}

			<SpecialistWorkspaceLaunchPanel
				focus={specialistWorkspace.state.focus}
				isBusy={isBusy}
				lastUpdatedAt={specialistWorkspace.state.lastUpdatedAt}
				notice={specialistWorkspace.state.notice}
				onClearNotice={specialistWorkspace.clearNotice}
				onClearSelection={specialistWorkspace.clearSelection}
				onLaunchMode={specialistWorkspace.launchMode}
				onRefresh={specialistWorkspace.refresh}
				onSelectMode={specialistWorkspace.selectMode}
				status={specialistWorkspace.state.status}
				summary={specialistWorkspace.state.data}
			/>

			<div style={detailGridStyle}>
				<div
					style={{
						display: "grid",
						gap: "1rem",
					}}
				>
					<SpecialistWorkspaceStatePanel
						isBusy={isBusy}
						onClearSelection={specialistWorkspace.clearSelection}
						onResumeSelected={specialistWorkspace.resumeSelected}
						status={specialistWorkspace.state.status}
						summary={specialistWorkspace.state.data}
					/>
					{specialistReview.selection.family === "tracker-specialist" ? (
						<TrackerSpecialistReviewPanel
							status={specialistReview.status}
							summary={trackerSummary}
						/>
					) : null}
					{specialistReview.selection.family === "research-specialist" ? (
						<ResearchSpecialistReviewPanel
							status={specialistReview.status}
							summary={researchSummary}
						/>
					) : null}
				</div>
				{showInlineReview ? (
					<SpecialistWorkspaceReviewRail
						onOpenApprovals={onOpenApprovals}
						onOpenChatConsole={onOpenChatConsole}
						onOpenPipelineReview={onOpenPipelineReview}
						onOpenReportViewer={onOpenReportViewer}
						onOpenTrackerWorkspace={onOpenTrackerWorkspace}
						review={specialistReview.payload}
					/>
				) : (
					<SpecialistWorkspaceDetailRail
						onClearSelection={specialistWorkspace.clearSelection}
						onOpenApprovals={onOpenApprovals}
						onOpenChatConsole={onOpenChatConsole}
						onOpenDetailSurface={onOpenDetailSurface}
						status={specialistWorkspace.state.status}
						summary={specialistWorkspace.state.data}
					/>
				)}
			</div>
		</section>
	);
}

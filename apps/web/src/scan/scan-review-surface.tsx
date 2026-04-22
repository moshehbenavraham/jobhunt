import type { CSSProperties } from "react";
import { ScanReviewActionShelf } from "./scan-review-action-shelf";
import { ScanReviewLaunchPanel } from "./scan-review-launch-panel";
import { ScanReviewShortlist } from "./scan-review-shortlist";
import { useScanReview } from "./use-scan-review";

type ScanReviewSurfaceProps = {
	onOpenChatConsole: (focus: { sessionId: string | null }) => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const detailGridStyle: CSSProperties = {
	alignItems: "start",
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "minmax(0, 1.8fr) minmax(18rem, 1fr)",
};

const noticeStyle: CSSProperties = {
	borderRadius: "1rem",
	padding: "0.9rem",
};

export function ScanReviewSurface({
	onOpenChatConsole,
}: ScanReviewSurfaceProps) {
	const review = useScanReview({
		onOpenChatConsole,
	});
	const selectedRow = review.state.data?.selectedDetail.row ?? null;

	return (
		<section aria-labelledby="scan-review-title" style={surfaceStyle}>
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
					Phase 05 / Session 02
				</p>
				<h1 id="scan-review-title" style={{ marginBottom: 0, marginTop: 0 }}>
					Scan review workspace
				</h1>
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					Launch scans, review shortlist candidates, and hand selected roles
					into evaluation or batch workflows without leaving the operator shell.
				</p>
			</header>

			{(review.state.status === "offline" || review.state.status === "error") &&
			review.state.error ? (
				<section
					style={{
						...noticeStyle,
						background:
							review.state.status === "offline" ? "#e2e8f0" : "#fee2e2",
						border: `1px solid ${
							review.state.status === "offline" ? "#cbd5e1" : "#fecaca"
						}`,
					}}
				>
					<strong
						style={{
							display: "block",
							marginBottom: "0.25rem",
						}}
					>
						{review.state.status === "offline"
							? "Showing the last scan snapshot"
							: "Scan workspace warning"}
					</strong>
					<p style={{ margin: 0 }}>{review.state.error.message}</p>
				</section>
			) : null}

			<ScanReviewLaunchPanel
				focus={review.state.focus}
				isBusy={
					review.state.isRefreshing || review.state.pendingAction !== null
				}
				lastUpdatedAt={review.state.lastUpdatedAt}
				onClearSessionScope={() => review.selectSessionScope(null)}
				onLaunch={review.launchScan}
				onRefresh={review.refresh}
				onScopeToRun={() => {
					if (!review.state.data?.run.sessionId) {
						return;
					}

					review.selectSessionScope(review.state.data.run.sessionId);
				}}
				summary={review.state.data}
				status={review.state.status}
			/>

			<div style={detailGridStyle}>
				<ScanReviewShortlist
					focus={review.state.focus}
					isBusy={
						review.state.isRefreshing || review.state.pendingAction !== null
					}
					onClearSelection={review.clearSelection}
					onNextPage={review.goToNextPage}
					onPreviousPage={review.goToPreviousPage}
					onSelectBucket={review.selectBucket}
					onSelectCandidate={review.selectCandidate}
					onSetIncludeIgnored={review.setIncludeIgnored}
					summary={review.state.data}
					status={review.state.status}
				/>

				<ScanReviewActionShelf
					isBusy={
						review.state.isRefreshing || review.state.pendingAction !== null
					}
					notice={review.state.notice}
					onClearNotice={review.clearNotice}
					onClearSelection={review.clearSelection}
					onLaunchBatchSeed={() => {
						if (!selectedRow) {
							return;
						}

						review.launchBatchSeed(selectedRow);
					}}
					onLaunchEvaluation={() => {
						if (!selectedRow) {
							return;
						}

						review.launchEvaluation(selectedRow);
					}}
					onRunIgnoreAction={review.runIgnoreAction}
					pendingAction={review.state.pendingAction}
					selectedDetail={review.state.data?.selectedDetail ?? null}
					status={review.state.status}
				/>
			</div>
		</section>
	);
}

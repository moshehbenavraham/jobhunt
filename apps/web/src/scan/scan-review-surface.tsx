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
	gap: "var(--jh-space-4)",
};

const detailGridStyle: CSSProperties = {
	alignItems: "start",
	display: "grid",
	gap: "var(--jh-space-4)",
	gridTemplateColumns: "minmax(0, 1.8fr) minmax(18rem, 1fr)",
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
					gap: "var(--jh-space-1)",
				}}
			>
				<h1 id="scan-review-title" style={{ marginBottom: 0, marginTop: 0 }}>
					Scan review
				</h1>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
					Launch scans, review candidates, and start evaluations.
				</p>
			</header>

			{(review.state.status === "offline" || review.state.status === "error") &&
			review.state.error ? (
				<section
					style={{
						background:
							review.state.status === "offline"
								? "var(--jh-color-status-blocked-bg)"
								: "var(--jh-color-status-error-bg)",
						border: `1px solid ${
							review.state.status === "offline"
								? "var(--jh-color-status-blocked-border)"
								: "var(--jh-color-status-error-border)"
						}`,
						borderRadius: "var(--jh-radius-sm)",
						padding: "var(--jh-space-3)",
					}}
				>
					<strong
						style={{
							display: "block",
							marginBottom: "var(--jh-space-1)",
						}}
					>
						{review.state.status === "offline"
							? "Showing last snapshot"
							: "Warning"}
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

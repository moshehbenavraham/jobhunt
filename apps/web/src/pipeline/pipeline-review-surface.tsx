import type { CSSProperties } from "react";
import { PipelineContextDetail } from "./pipeline-context-detail";
import { PipelineEmptyState } from "./pipeline-empty-state";
import { PipelineFilters } from "./pipeline-filters";
import { PipelineRow } from "./pipeline-row";
import { PipelineShortlist } from "./pipeline-shortlist";
import { usePipelineReview } from "./use-pipeline-review";

type PipelineReviewSurfaceProps = {
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-gap)",
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-3)",
	padding: "var(--jh-space-padding)",
};

const headerRowStyle: CSSProperties = {
	alignItems: "start",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-3)",
	justifyContent: "space-between",
};

const headingStyle: CSSProperties = {
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-h2-size)",
	fontWeight: "var(--jh-text-h2-weight)" as never,
	marginBottom: "var(--jh-space-1)",
};

const subtextStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-body-sm-size)",
	marginBottom: 0,
	marginTop: 0,
};

const refreshButtonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)" as never,
	minHeight: "2.4rem",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

const degradedBannerBase: CSSProperties = {
	border: "var(--jh-border-width) solid",
	borderRadius: "var(--jh-radius-md)",
	padding: "var(--jh-space-3)",
};

const twoZoneStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-gap)",
	gridTemplateColumns: "1fr",
};

const queueColumnStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-2)",
};

const emptyQueueStyle: CSSProperties = {
	background: "var(--jh-color-pipeline-card-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	padding: "var(--jh-space-padding)",
};

const refreshingOverlay: CSSProperties = {
	opacity: 0.6,
	pointerEvents: "none",
	transition: "opacity 150ms ease-out",
};

function formatTimestamp(value: string | null): string {
	if (!value) return "Not refreshed yet";
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return value;
	return date.toLocaleString();
}

export function PipelineReviewSurface({
	onOpenReportViewer,
}: PipelineReviewSurfaceProps) {
	const review = usePipelineReview();
	const payload = review.state.data;

	if (!payload) {
		return (
			<section aria-labelledby="pipeline-title" style={surfaceStyle}>
				<section style={panelStyle}>
					<header>
						<h2 id="pipeline-title" style={headingStyle}>
							Queue triage
						</h2>
						<p style={subtextStyle}>
							Review pending and processed queue rows without opening raw files.
						</p>
					</header>
					<PipelineEmptyState
						error={review.state.error?.message ?? null}
						status={review.state.status}
					/>
				</section>
			</section>
		);
	}

	const selectedDetail = payload.selectedDetail;
	const visibleRangeStart =
		payload.queue.totalCount === 0 ? 0 : payload.queue.offset + 1;
	const visibleRangeEnd = payload.queue.offset + payload.queue.items.length;
	const isRefreshing = review.state.isRefreshing;

	const responsiveTwoZone: CSSProperties = {
		...twoZoneStyle,
	};

	return (
		<section aria-labelledby="pipeline-title" style={surfaceStyle}>
			<section style={panelStyle}>
				<header style={headerRowStyle}>
					<div>
						<h2 id="pipeline-title" style={headingStyle}>
							Queue triage
						</h2>
						<p style={subtextStyle}>{payload.message}</p>
					</div>
					<div
						style={{
							display: "grid",
							gap: "var(--jh-space-1)",
							justifyItems: "end",
						}}
					>
						<button
							aria-label="Refresh queue overview"
							disabled={isRefreshing}
							onClick={() => review.refresh()}
							style={{
								...refreshButtonStyle,
								opacity: isRefreshing ? 0.7 : 1,
							}}
							type="button"
						>
							{isRefreshing ? "Refreshing..." : "Refresh"}
						</button>
						<span
							style={{
								color: "var(--jh-color-text-muted)",
								fontSize: "var(--jh-text-caption-size)",
							}}
						>
							Updated: {formatTimestamp(review.state.lastUpdatedAt)}
						</span>
					</div>
				</header>

				{(review.state.status === "offline" ||
					review.state.status === "error") &&
				review.state.error ? (
					<section
						style={{
							...degradedBannerBase,
							background:
								review.state.status === "offline"
									? "var(--jh-color-status-offline-bg)"
									: "var(--jh-color-status-error-bg)",
							borderColor:
								review.state.status === "offline"
									? "var(--jh-color-status-offline-border)"
									: "var(--jh-color-status-error-border)",
						}}
					>
						<p
							style={{
								fontWeight: "var(--jh-font-weight-bold)" as never,
								marginBottom: "var(--jh-space-1)",
								marginTop: 0,
							}}
						>
							{review.state.status === "offline"
								? "Showing the last queue snapshot"
								: "Queue overview warning"}
						</p>
						<p style={{ margin: 0 }}>{review.state.error.message}</p>
					</section>
				) : null}
			</section>

			<PipelineShortlist shortlist={payload.shortlist} />

			<div
				className="jh-pipeline-two-zone"
				style={responsiveTwoZone}
			>
				<section style={{ display: "grid", gap: "var(--jh-space-3)" }}>
					<PipelineFilters
						counts={payload.queue.counts}
						hasMore={payload.queue.hasMore}
						offset={payload.queue.offset}
						onClearSelection={() => review.clearSelection()}
						onNextPage={() => review.goToNextPage()}
						onPreviousPage={() => review.goToPreviousPage()}
						onSelectSection={(s) => review.selectSection(s)}
						onSelectSort={(s) => review.selectSort(s)}
						section={payload.queue.section}
						selectionActive={selectedDetail.state !== "empty"}
						sort={payload.queue.sort}
						totalCount={payload.queue.totalCount}
						visibleEnd={visibleRangeEnd}
						visibleStart={visibleRangeStart}
					/>

					<div
						style={
							isRefreshing
								? { ...queueColumnStyle, ...refreshingOverlay }
								: queueColumnStyle
						}
					>
						{payload.queue.items.length === 0 ? (
							<div style={emptyQueueStyle}>
								<p style={{ margin: 0 }}>
									No rows match the current filter and sort settings.
								</p>
							</div>
						) : (
							payload.queue.items.map((row) => (
								<PipelineRow
									key={`${row.kind}:${row.reportNumber ?? row.url}`}
									onSelect={(r) => review.selectRow(r)}
									row={row}
								/>
							))
						)}
					</div>
				</section>

				<PipelineContextDetail
					onClearSelection={() => review.clearSelection()}
					onOpenReportViewer={onOpenReportViewer}
					selectedDetail={selectedDetail}
				/>
			</div>
		</section>
	);
}

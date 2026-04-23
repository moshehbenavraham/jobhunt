import type { CSSProperties } from "react";
import { TrackerDetailPane } from "./tracker-detail-pane";
import { TrackerFilterBar } from "./tracker-filter-bar";
import { TrackerRowList } from "./tracker-row-list";
import { trackerButton, trackerPanel, trackerStatCard } from "./tracker-styles";
import { useTrackerWorkspace } from "./use-tracker-workspace";

type TrackerWorkspaceSurfaceProps = {
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-4)",
};

const detailGridStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-4)",
	gridTemplateColumns: "minmax(0, 1fr) minmax(18rem, 24rem)",
};

function formatTimestamp(value: string | null): string {
	if (!value) return "Not refreshed yet";
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return value;
	return date.toLocaleString();
}

function getEmptyDescription(
	status: ReturnType<typeof useTrackerWorkspace>["state"]["status"],
	error: string | null,
): string {
	switch (status) {
		case "loading":
			return "Loading applications...";
		case "offline":
			return error ?? "The API is offline. Showing cached data.";
		case "error":
			return error ?? "Could not load applications.";
		default:
			return "No applications found yet.";
	}
}

export function TrackerWorkspaceSurface({
	onOpenReportViewer,
}: TrackerWorkspaceSurfaceProps) {
	const tracker = useTrackerWorkspace();
	const payload = tracker.state.data;

	const actionsDisabled =
		tracker.state.pendingAction !== null ||
		tracker.state.isRefreshing ||
		tracker.state.status === "loading";

	if (!payload) {
		return (
			<section aria-labelledby="tracker-title" style={surfaceStyle}>
				<section style={trackerPanel}>
					<header>
						<h2
							id="tracker-title"
							style={{ marginBottom: "var(--jh-space-1)" }}
						>
							Applications
						</h2>
					</header>
					<section style={trackerStatCard}>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							{getEmptyDescription(
								tracker.state.status,
								tracker.state.error?.message ?? null,
							)}
						</p>
					</section>
				</section>
			</section>
		);
	}

	const selectedRow = payload.selectedDetail.row ?? null;
	const focusedPendingAddition = payload.selectedDetail.pendingAddition ?? null;
	const requestedReportNumber =
		payload.selectedDetail.requestedReportNumber ?? null;

	const visibleStart =
		payload.rows.filteredCount === 0 ? 0 : payload.rows.offset + 1;
	const visibleEnd = payload.rows.offset + payload.rows.items.length;

	return (
		<section aria-labelledby="tracker-title" style={surfaceStyle}>
			<section style={trackerPanel}>
				<header
					style={{
						alignItems: "start",
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-3)",
						justifyContent: "space-between",
					}}
				>
					<div>
						<h2
							id="tracker-title"
							style={{ marginBottom: "var(--jh-space-1)" }}
						>
							Applications
						</h2>
						<p
							style={{
								color: "var(--jh-color-text-muted)",
								margin: 0,
							}}
						>
							{payload.message}
						</p>
					</div>

					<div
						style={{
							display: "grid",
							gap: "var(--jh-space-2)",
							justifyItems: "end",
						}}
					>
						<button
							aria-label="Refresh tracker"
							disabled={actionsDisabled}
							onClick={() => tracker.refresh()}
							style={{ ...trackerButton, opacity: actionsDisabled ? 0.7 : 1 }}
							type="button"
						>
							{tracker.state.isRefreshing ? "Refreshing..." : "Refresh"}
						</button>
						<span
							style={{
								color: "var(--jh-color-text-muted)",
								fontSize: "var(--jh-text-caption-size)",
							}}
						>
							Updated: {formatTimestamp(tracker.state.lastUpdatedAt)}
						</span>
					</div>
				</header>

				{(tracker.state.status === "offline" ||
					tracker.state.status === "error") &&
				tracker.state.error ? (
					<section
						style={{
							background:
								tracker.state.status === "offline"
									? "var(--jh-color-status-blocked-bg)"
									: "var(--jh-color-status-error-bg)",
							border: `1px solid ${
								tracker.state.status === "offline"
									? "var(--jh-color-status-blocked-border)"
									: "var(--jh-color-status-error-border)"
							}`,
							borderRadius: "var(--jh-radius-sm)",
							padding: "var(--jh-space-3)",
						}}
					>
						<p
							style={{
								fontWeight: 700,
								marginBottom: "var(--jh-space-1)",
								marginTop: 0,
							}}
						>
							{tracker.state.status === "offline"
								? "The API is offline. Showing cached data."
								: "Could not load applications."}
						</p>
						<p style={{ margin: 0 }}>{tracker.state.error.message}</p>
					</section>
				) : null}

				<div
					style={{
						display: "grid",
						gap: "var(--jh-space-2)",
						gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
					}}
				>
					{payload.pendingAdditions.count > 0 ? (
						<article style={trackerStatCard}>
							<p
								style={{
									color: "var(--jh-color-text-muted)",
									margin: 0,
									fontSize: "var(--jh-text-caption-size)",
								}}
							>
								Staged
							</p>
							<strong>{payload.pendingAdditions.count}</strong>
						</article>
					) : null}
					<article style={trackerStatCard}>
						<p
							style={{
								color: "var(--jh-color-text-muted)",
								margin: 0,
								fontSize: "var(--jh-text-caption-size)",
							}}
						>
							Visible
						</p>
						<strong>
							{visibleStart}-{visibleEnd} of {payload.rows.filteredCount}
						</strong>
					</article>
					<article style={trackerStatCard}>
						<p
							style={{
								color: "var(--jh-color-text-muted)",
								margin: 0,
								fontSize: "var(--jh-text-caption-size)",
							}}
						>
							Total
						</p>
						<strong>{payload.rows.totalCount}</strong>
					</article>
				</div>
			</section>

			<TrackerFilterBar
				onSelectSearch={tracker.selectSearch}
				onSelectSort={tracker.selectSort}
				onSelectStatusFilter={tracker.selectStatusFilter}
				search={tracker.state.focus.search}
				sort={tracker.state.focus.sort}
				status={tracker.state.focus.status}
				statusOptions={payload.statusOptions}
			/>

			<div style={detailGridStyle}>
				<TrackerRowList
					filteredCount={payload.rows.filteredCount}
					hasMore={payload.rows.hasMore}
					items={payload.rows.items}
					offset={tracker.state.focus.offset}
					onGoToNextPage={tracker.goToNextPage}
					onGoToPreviousPage={tracker.goToPreviousPage}
					onSelectRow={tracker.selectRow}
					status={tracker.state.status}
				/>

				<TrackerDetailPane
					actionsDisabled={actionsDisabled}
					focusedPendingAddition={focusedPendingAddition}
					notice={tracker.state.notice}
					onClearSelection={tracker.clearSelection}
					onOpenReportViewer={onOpenReportViewer}
					onRunAction={tracker.runAction}
					pendingAction={tracker.state.pendingAction}
					requestedReportNumber={requestedReportNumber}
					selectedDetail={
						payload.selectedDetail.message
							? { message: payload.selectedDetail.message }
							: null
					}
					selectedRow={selectedRow}
					statusOptions={payload.statusOptions}
				/>
			</div>
		</section>
	);
}

import { type CSSProperties, useCallback, useRef, useState } from "react";
import type { TocEntry } from "./extract-sections";
import { ReportActionShelf } from "./report-action-shelf";
import { ReportMetadataRail } from "./report-metadata-rail";
import { ReportReadingColumn } from "./report-reading-column";
import { ReportToc } from "./report-toc";
import {
	REPORT_VIEWER_ARTIFACT_GROUPS,
	type ReportViewerArtifactGroup,
} from "./report-viewer-types";
import { useReportViewer } from "./use-report-viewer";

type ReportViewerSurfaceProps = {
	initialReportPath?: string | null;
};

/* ----------------------------------------------------------------
   Token-only styles
   ---------------------------------------------------------------- */

const surfaceStyle: CSSProperties = {
	display: "grid",
	fontFamily: "var(--jh-font-body)",
	gap: "var(--jh-space-4)",
};

const desktopLayoutStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-4)",
	gridTemplateColumns: "minmax(0, 1fr) 16rem",
};

const wideLayoutStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-4)",
	gridTemplateColumns: "12rem minmax(0, 1fr) 18rem",
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-3)",
	padding: "var(--jh-space-padding)",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: "none",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)",
	minHeight: "2.4rem",
	padding: "var(--jh-space-2) var(--jh-space-4)",
};

const subtleButtonStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-text-primary)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)",
	minHeight: "2.2rem",
	padding: "var(--jh-space-1) var(--jh-space-3)",
};

const headingStyle: CSSProperties = {
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-h2-size)",
	fontWeight: "var(--jh-text-h2-weight)",
	letterSpacing: "var(--jh-text-h2-letter-spacing)",
	lineHeight: "var(--jh-text-h2-line-height)",
	margin: 0,
};

const h3Style: CSSProperties = {
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-h3-size)",
	fontWeight: "var(--jh-text-h3-weight)",
	letterSpacing: "var(--jh-text-h3-letter-spacing)",
	lineHeight: "var(--jh-text-h3-line-height)",
	margin: 0,
};

const bodyStyle: CSSProperties = {
	color: "var(--jh-color-text-primary)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-size)",
	lineHeight: "var(--jh-text-body-line-height)",
	margin: 0,
};

const bodyMutedStyle: CSSProperties = {
	...bodyStyle,
	color: "var(--jh-color-text-muted)",
};

const bodySecondaryStyle: CSSProperties = {
	...bodyStyle,
	color: "var(--jh-color-text-secondary)",
};

const labelSmStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	fontWeight: "var(--jh-text-label-weight)",
	letterSpacing: "var(--jh-text-label-letter-spacing)",
	margin: 0,
	textTransform: "uppercase",
};

const kindChipStyle: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-text-label-sm-weight)",
	letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
	lineHeight: 1,
	padding: "var(--jh-space-1) var(--jh-space-3)",
	textTransform: "uppercase",
	whiteSpace: "nowrap",
};

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */

function formatTimestamp(value: string | null): string {
	if (!value) {
		return "Not refreshed yet";
	}

	const date = new Date(value);

	if (Number.isNaN(date.valueOf())) {
		return value;
	}

	return date.toLocaleString();
}

function getGroupLabel(group: ReportViewerArtifactGroup): string {
	switch (group) {
		case "all":
			return "All";
		case "output":
			return "PDFs";
		case "reports":
			return "Reports";
	}
}

function getReadingStatus(
	viewerStatus: string,
	selectedState: string,
): "empty" | "error" | "loading" | "missing" | "offline" | "ready" {
	if (viewerStatus === "loading") return "loading";
	if (viewerStatus === "offline") return "offline";
	if (viewerStatus === "error") return "error";
	if (selectedState === "missing") return "missing";
	if (selectedState === "empty") return "empty";
	return "ready";
}

function getMetadataStatus(
	viewerStatus: string,
): "empty" | "error" | "loading" | "offline" | "ready" {
	if (viewerStatus === "loading") return "loading";
	if (viewerStatus === "offline") return "offline";
	if (viewerStatus === "error") return "error";
	return "ready";
}

function useViewportTier(): "mobile" | "tablet" | "desktop" | "wide" {
	const [tier, setTier] = useState<"mobile" | "tablet" | "desktop" | "wide">(
		() => classifyWidth(window.innerWidth),
	);

	const classify = useCallback(() => {
		setTier(classifyWidth(window.innerWidth));
	}, []);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	if (typeof window !== "undefined") {
		// Intentionally using a passive listener pattern
		window.addEventListener("resize", classify, { passive: true });
	}

	return tier;
}

function classifyWidth(
	width: number,
): "mobile" | "tablet" | "desktop" | "wide" {
	if (width < 768) return "mobile";
	if (width < 1200) return "tablet";
	if (width < 1600) return "desktop";
	return "wide";
}

/* ----------------------------------------------------------------
   Empty / error / offline state rendering
   ---------------------------------------------------------------- */

function getEmptyState(input: { error: string | null; status: string }) {
	switch (input.status) {
		case "loading":
			return {
				body: "Loading reports and recent files...",
				title: "Loading",
			};
		case "offline":
			return {
				body:
					input.error ??
					"The server is unreachable. Check your connection and try again.",
				title: "Offline",
			};
		case "error":
			return {
				body:
					input.error ??
					"Something went wrong loading the report data. Try refreshing.",
				title: "Unable to load reports",
			};
		default:
			return {
				body: "Open a report from an evaluation or browse recent files once they exist in the workspace.",
				title: "No reports yet",
			};
	}
}

/* ----------------------------------------------------------------
   Component
   ---------------------------------------------------------------- */

export function ReportViewerSurface({
	initialReportPath,
}: ReportViewerSurfaceProps = {}) {
	const viewer = useReportViewer(
		initialReportPath ? { initialReportPath } : undefined,
	);
	const payload = viewer.state.data;
	const scrollContainerRef = useRef<HTMLElement | null>(null);
	const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
	const viewportTier = useViewportTier();

	const handleSectionsExtracted = useCallback((entries: TocEntry[]) => {
		setTocEntries(entries);
	}, []);

	/* ---- No data yet ---- */
	if (!payload) {
		const emptyState = getEmptyState({
			error: viewer.state.error?.message ?? null,
			status: viewer.state.status,
		});

		return (
			<section aria-labelledby="report-viewer-title" style={surfaceStyle}>
				<section style={panelStyle}>
					<header>
						<h2 id="report-viewer-title" style={headingStyle}>
							Reports
						</h2>
						<p style={bodyMutedStyle}>
							Read evaluation reports, inspect metadata, and browse recent
							files.
						</p>
					</header>

					<section
						style={{
							background: "var(--jh-color-report-reading-bg)",
							border: "var(--jh-border-subtle)",
							borderRadius: "var(--jh-radius-md)",
							padding: "var(--jh-space-padding)",
						}}
					>
						<h3 style={{ ...h3Style, marginBottom: "var(--jh-space-1)" }}>
							{emptyState.title}
						</h3>
						<p style={bodySecondaryStyle}>{emptyState.body}</p>
					</section>
				</section>
			</section>
		);
	}

	/* ---- Derived state ---- */
	const selectedReport = payload.selectedReport;
	const recentArtifacts = payload.recentArtifacts;
	const visibleRangeStart =
		recentArtifacts.totalCount === 0 ? 0 : recentArtifacts.offset + 1;
	const visibleRangeEnd = recentArtifacts.offset + recentArtifacts.items.length;

	const hasSelectedReport =
		selectedReport.state === "ready" && selectedReport.header !== null;

	const readingStatus = getReadingStatus(
		viewer.state.status,
		selectedReport.state,
	);
	const metadataStatus = getMetadataStatus(viewer.state.status);

	/* ---- Layout selection ---- */
	const isMobile = viewportTier === "mobile";
	const isWide = viewportTier === "wide";
	const showTocSidebar = isWide && tocEntries.length > 0 && hasSelectedReport;

	const contentLayoutStyle = showTocSidebar
		? wideLayoutStyle
		: isMobile
			? { display: "grid", gap: "var(--jh-space-4)" }
			: desktopLayoutStyle;

	return (
		<section aria-labelledby="report-viewer-title" style={surfaceStyle}>
			{/* Header bar */}
			<section style={panelStyle}>
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
						<h2 id="report-viewer-title" style={headingStyle}>
							Reports
						</h2>
						<p style={bodyMutedStyle}>{payload.message}</p>
					</div>

					<div
						style={{
							alignItems: "end",
							display: "grid",
							gap: "var(--jh-space-2)",
							justifyItems: "end",
						}}
					>
						<button
							aria-label="Refresh reports"
							disabled={viewer.state.isRefreshing}
							onClick={() => viewer.refresh()}
							style={{
								...buttonStyle,
								opacity: viewer.state.isRefreshing ? 0.7 : 1,
							}}
							type="button"
						>
							Refresh
						</button>
						<span style={{ ...labelSmStyle, textTransform: "none" }}>
							Updated: {formatTimestamp(viewer.state.lastUpdatedAt)}
						</span>
					</div>
				</header>

				{/* Offline / error banner */}
				{(viewer.state.status === "offline" ||
					viewer.state.status === "error") &&
				viewer.state.error ? (
					<section
						style={{
							background:
								viewer.state.status === "offline"
									? "var(--jh-color-status-offline-bg)"
									: "var(--jh-color-status-error-bg)",
							border: `var(--jh-border-width) solid ${
								viewer.state.status === "offline"
									? "var(--jh-color-status-offline-border)"
									: "var(--jh-color-status-error-border)"
							}`,
							borderRadius: "var(--jh-radius-md)",
							padding: "var(--jh-space-padding-sm) var(--jh-space-padding)",
						}}
					>
						<p
							style={{
								...bodyStyle,
								fontWeight: "var(--jh-font-weight-bold)",
								marginBottom: "var(--jh-space-1)",
							}}
						>
							{viewer.state.status === "offline"
								? "Showing last available snapshot"
								: "Warning"}
						</p>
						<p style={bodyStyle}>{viewer.state.error.message}</p>
					</section>
				) : null}
			</section>

			{/* Mobile metadata summary strip */}
			{isMobile && hasSelectedReport ? (
				<ReportMetadataRail
					errorMessage={viewer.state.error?.message}
					header={selectedReport.header}
					repoRelativePath={selectedReport.repoRelativePath}
					reportNumber={selectedReport.reportNumber}
					status={metadataStatus}
				/>
			) : null}

			{/* Action shelf */}
			{hasSelectedReport ? (
				<ReportActionShelf
					header={selectedReport.header}
					isRefreshing={viewer.state.isRefreshing}
					onRefresh={() => viewer.refresh()}
					repoRelativePath={selectedReport.repoRelativePath}
				/>
			) : null}

			{/* Main content: TOC sidebar (wide) | reading column | metadata rail (desktop+) */}
			<div style={contentLayoutStyle}>
				{/* TOC sidebar -- wide viewports only */}
				{showTocSidebar ? (
					<ReportToc
						entries={tocEntries}
						scrollContainerRef={scrollContainerRef}
					/>
				) : null}

				{/* Reading column */}
				<ReportReadingColumn
					body={selectedReport.body}
					errorMessage={viewer.state.error?.message}
					onSectionsExtracted={handleSectionsExtracted}
					ref={scrollContainerRef}
					status={readingStatus}
				/>

				{/* Metadata rail -- tablet+ */}
				{!isMobile ? (
					<ReportMetadataRail
						errorMessage={viewer.state.error?.message}
						header={selectedReport.header}
						repoRelativePath={selectedReport.repoRelativePath}
						reportNumber={selectedReport.reportNumber}
						status={metadataStatus}
					/>
				) : null}
			</div>

			{/* Missing report recovery */}
			{selectedReport.state === "missing" ? (
				<section style={panelStyle}>
					<h3 style={h3Style}>Report unavailable</h3>
					<p style={bodySecondaryStyle}>{selectedReport.message}</p>
					<p
						style={{
							...bodyMutedStyle,
							fontSize: "var(--jh-text-body-sm-size)",
						}}
					>
						Requested:{" "}
						{selectedReport.requestedRepoRelativePath ??
							selectedReport.repoRelativePath ??
							"Unknown"}
					</p>
					<button
						aria-label="Show the latest report instead"
						onClick={() => viewer.followLatest()}
						style={buttonStyle}
						type="button"
					>
						Show latest report
					</button>
				</section>
			) : null}

			{/* Recent artifacts browser */}
			<section style={panelStyle}>
				<header
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-3)",
						justifyContent: "space-between",
					}}
				>
					<div>
						<h3 style={h3Style}>Recent files</h3>
						<p style={bodyMutedStyle}>Browse recent reports and PDFs.</p>
					</div>

					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "var(--jh-space-2)",
						}}
					>
						{REPORT_VIEWER_ARTIFACT_GROUPS.map((group) => {
							const selected = viewer.state.focus.group === group;

							return (
								<button
									aria-label={`Show ${getGroupLabel(group)}`}
									key={group}
									onClick={() => viewer.selectGroup(group)}
									style={{
										...subtleButtonStyle,
										background: selected
											? "var(--jh-color-button-bg)"
											: subtleButtonStyle.background,
										color: selected
											? "var(--jh-color-button-fg)"
											: subtleButtonStyle.color,
									}}
									type="button"
								>
									{getGroupLabel(group)}
								</button>
							);
						})}
					</div>
				</header>

				<div style={{ display: "grid", gap: "var(--jh-space-3)" }}>
					{recentArtifacts.items.length === 0 ? (
						<section
							style={{
								background: "var(--jh-color-report-reading-bg)",
								border: "var(--jh-border-subtle)",
								borderRadius: "var(--jh-radius-md)",
								padding: "var(--jh-space-padding)",
							}}
						>
							<p style={bodyStyle}>
								No {getGroupLabel(recentArtifacts.group).toLowerCase()} are
								available yet.
							</p>
						</section>
					) : (
						recentArtifacts.items.map((artifact) => {
							const isReport = artifact.kind === "report";

							return (
								<article
									key={artifact.repoRelativePath}
									style={{
										background: artifact.selected
											? "var(--jh-color-report-toc-active-bg)"
											: "var(--jh-color-surface-bg)",
										border: artifact.selected
											? "var(--jh-border-width) solid var(--jh-color-accent)"
											: "var(--jh-border-subtle)",
										borderRadius: "var(--jh-radius-md)",
										display: "grid",
										gap: "var(--jh-space-2)",
										padding: "var(--jh-space-padding-sm)",
									}}
								>
									<div
										style={{
											alignItems: "center",
											display: "flex",
											flexWrap: "wrap",
											gap: "var(--jh-space-2)",
											justifyContent: "space-between",
										}}
									>
										<div>
											<p
												style={{
													...bodySecondaryStyle,
													marginBottom: "var(--jh-space-1)",
												}}
											>
												{artifact.fileName}
											</p>
											<p style={bodyMutedStyle}>{artifact.repoRelativePath}</p>
										</div>
										<span
											style={{
												...kindChipStyle,
												background:
													artifact.kind === "report"
														? "var(--jh-color-badge-info-bg)"
														: "var(--jh-color-badge-attention-bg)",
												color:
													artifact.kind === "report"
														? "var(--jh-color-badge-info-fg)"
														: "var(--jh-color-badge-attention-fg)",
											}}
										>
											{artifact.kind === "report" ? "Report" : "PDF"}
										</span>
									</div>

									<div
										style={{
											color: "var(--jh-color-text-secondary)",
											display: "flex",
											flexWrap: "wrap",
											fontSize: "var(--jh-text-body-sm-size)",
											gap: "var(--jh-space-3)",
										}}
									>
										<span>Date: {artifact.artifactDate ?? "No date"}</span>
										<span>
											Report #: {artifact.reportNumber ?? "Not numbered"}
										</span>
									</div>

									{isReport ? (
										<button
											aria-label={`Open report ${artifact.fileName}`}
											onClick={() =>
												viewer.selectReport(artifact.repoRelativePath)
											}
											style={buttonStyle}
											type="button"
										>
											{artifact.selected ? "Currently viewing" : "Open report"}
										</button>
									) : (
										<p style={bodyMutedStyle}>
											PDF available at the path above. Download from your file
											manager or the linked report.
										</p>
									)}
								</article>
							);
						})
					)}
				</div>

				{/* Pagination */}
				<div
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-3)",
						justifyContent: "space-between",
					}}
				>
					<p style={bodyMutedStyle}>
						Showing {visibleRangeStart}-{visibleRangeEnd} of{" "}
						{recentArtifacts.totalCount}
					</p>
					<div style={{ display: "flex", gap: "var(--jh-space-2)" }}>
						<button
							aria-label="Previous page"
							disabled={recentArtifacts.offset === 0}
							onClick={() => viewer.goToPreviousPage()}
							style={{
								...subtleButtonStyle,
								opacity: recentArtifacts.offset === 0 ? 0.55 : 1,
							}}
							type="button"
						>
							Previous
						</button>
						<button
							aria-label="Next page"
							disabled={!recentArtifacts.hasMore}
							onClick={() => viewer.goToNextPage()}
							style={{
								...subtleButtonStyle,
								opacity: recentArtifacts.hasMore ? 1 : 0.55,
							}}
							type="button"
						>
							Next
						</button>
					</div>
				</div>
			</section>
		</section>
	);
}

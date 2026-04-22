import type { CSSProperties } from "react";
import type { ScanReviewFocus } from "./scan-review-client";
import {
	SCAN_REVIEW_BUCKET_FILTER_VALUES,
	type ScanReviewBucketFilter,
	type ScanReviewCandidatePreview,
	type ScanReviewSummaryPayload,
	type ScanReviewWarningCode,
} from "./scan-review-types";
import type { ScanReviewViewStatus } from "./use-scan-review";

type ScanReviewShortlistProps = {
	focus: ScanReviewFocus;
	isBusy: boolean;
	onClearSelection: () => void;
	onNextPage: () => void;
	onPreviousPage: () => void;
	onSelectBucket: (bucket: ScanReviewBucketFilter) => void;
	onSelectCandidate: (candidate: ScanReviewCandidatePreview) => void;
	onSetIncludeIgnored: (includeIgnored: boolean) => void;
	summary: ScanReviewSummaryPayload | null;
	status: ScanReviewViewStatus;
};

const panelStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	display: "grid",
	gap: "0.9rem",
	padding: "1rem",
};

const buttonStyle: CSSProperties = {
	background: "rgba(15, 23, 42, 0.08)",
	border: "1px solid rgba(148, 163, 184, 0.28)",
	borderRadius: "999px",
	color: "#0f172a",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.2rem",
	padding: "0.45rem 0.8rem",
};

const srOnlyStyle: CSSProperties = {
	border: 0,
	clip: "rect(0 0 0 0)",
	clipPath: "inset(50%)",
	height: "1px",
	margin: "-1px",
	overflow: "hidden",
	padding: 0,
	position: "absolute",
	whiteSpace: "nowrap",
	width: "1px",
};

function getWarningTone(code: ScanReviewWarningCode): CSSProperties {
	switch (code) {
		case "already-ignored":
			return {
				background: "#e2e8f0",
				color: "#334155",
			};
		case "already-pending":
		case "approval-paused":
		case "stale-selection":
			return {
				background: "#fef3c7",
				color: "#92400e",
			};
		case "degraded-result":
			return {
				background: "#fee2e2",
				color: "#991b1b",
			};
		case "duplicate-heavy":
			return {
				background: "#dbeafe",
				color: "#1d4ed8",
			};
	}
}

function getBucketLabel(bucket: ScanReviewBucketFilter): string {
	switch (bucket) {
		case "adjacent-or-noisy":
			return "Adjacent or noisy";
		case "all":
			return "All";
		case "possible-fit":
			return "Possible fit";
		case "strongest-fit":
			return "Strongest fit";
	}
}

function getVisibleRange(
	summary: ScanReviewSummaryPayload["shortlist"],
): string {
	if (summary.filteredCount === 0 || summary.items.length === 0) {
		return "0-0";
	}

	return `${summary.offset + 1}-${summary.offset + summary.items.length}`;
}

function getEmptyState(input: { status: ScanReviewViewStatus }): {
	body: string;
	title: string;
} {
	switch (input.status) {
		case "loading":
			return {
				body: "Waiting for shortlist candidates from the scan-review summary.",
				title: "Loading shortlist",
			};
		case "offline":
			return {
				body: "The scan-review endpoint is offline, so shortlist cards cannot refresh.",
				title: "Shortlist offline",
			};
		case "error":
			return {
				body: "The scan-review payload could not be rendered into shortlist cards.",
				title: "Shortlist unavailable",
			};
		default:
			return {
				body: "Refresh scan review once shortlist candidates are available.",
				title: "No shortlist payload yet",
			};
	}
}

export function ScanReviewShortlist({
	focus,
	isBusy,
	onClearSelection,
	onNextPage,
	onPreviousPage,
	onSelectBucket,
	onSelectCandidate,
	onSetIncludeIgnored,
	summary,
	status,
}: ScanReviewShortlistProps) {
	if (!summary) {
		const emptyState = getEmptyState({
			status,
		});

		return (
			<section aria-labelledby="scan-shortlist-title" style={panelStyle}>
				<header>
					<h2 id="scan-shortlist-title" style={{ marginBottom: "0.35rem" }}>
						Shortlist review
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Rank candidates, filter fit buckets, and keep selection backed by
						URL state instead of hidden client-only memory.
					</p>
				</header>

				<section
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.95rem",
					}}
				>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
						{emptyState.body}
					</p>
				</section>
			</section>
		);
	}

	const shortlist = summary.shortlist;
	const selectedUrl = summary.selectedDetail.row?.url ?? focus.url;
	const disabled = isBusy || status === "loading";

	return (
		<section aria-labelledby="scan-shortlist-title" style={panelStyle}>
			<header
				style={{
					alignItems: "start",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.9rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h2 id="scan-shortlist-title" style={{ marginBottom: "0.35rem" }}>
						Shortlist review
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						{shortlist.message}
					</p>
				</div>
				<div
					style={{
						display: "grid",
						gap: "0.25rem",
						justifyItems: "end",
					}}
				>
					<strong>
						Showing {getVisibleRange(shortlist)} of {shortlist.filteredCount}
					</strong>
					<span style={{ color: "#64748b", fontSize: "0.92rem" }}>
						Total shortlist rows: {shortlist.totalCount}
					</span>
				</div>
			</header>

			<section
				style={{
					display: "grid",
					gap: "0.8rem",
					gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
				}}
			>
				<article
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
						Strongest fit
					</p>
					<strong style={{ fontSize: "1.1rem" }}>
						{shortlist.counts.strongestFit ?? "N/A"}
					</strong>
				</article>
				<article
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
						Possible fit
					</p>
					<strong style={{ fontSize: "1.1rem" }}>
						{shortlist.counts.possibleFit ?? "N/A"}
					</strong>
				</article>
				<article
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
						Duplicate heavy
					</p>
					<strong style={{ fontSize: "1.1rem" }}>
						{shortlist.counts.duplicateHeavy}
					</strong>
				</article>
				<article
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
						Pending overlap
					</p>
					<strong style={{ fontSize: "1.1rem" }}>
						{shortlist.counts.pendingOverlap}
					</strong>
				</article>
			</section>

			<section
				style={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.55rem",
					justifyContent: "space-between",
				}}
			>
				<fieldset
					style={{
						border: 0,
						display: "flex",
						flexWrap: "wrap",
						gap: "0.55rem",
						margin: 0,
						minInlineSize: 0,
						padding: 0,
					}}
				>
					<legend style={srOnlyStyle}>Scan shortlist fit filters</legend>
					{SCAN_REVIEW_BUCKET_FILTER_VALUES.map((bucket) => {
						const isSelected = bucket === focus.bucket;

						return (
							<button
								aria-pressed={isSelected}
								key={bucket}
								onClick={() => onSelectBucket(bucket)}
								style={{
									...buttonStyle,
									background: isSelected ? "#0f172a" : buttonStyle.background,
									color: isSelected ? "#f8fafc" : buttonStyle.color,
								}}
								type="button"
							>
								{getBucketLabel(bucket)}
							</button>
						);
					})}
				</fieldset>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						aria-pressed={focus.includeIgnored}
						onClick={() => onSetIncludeIgnored(!focus.includeIgnored)}
						style={{
							...buttonStyle,
							background: focus.includeIgnored
								? "#1d4ed8"
								: buttonStyle.background,
							color: focus.includeIgnored ? "#eff6ff" : buttonStyle.color,
						}}
						type="button"
					>
						{focus.includeIgnored ? "Including ignored" : "Show ignored"}
					</button>
					<button
						disabled={selectedUrl === null}
						onClick={onClearSelection}
						style={{
							...buttonStyle,
							opacity: selectedUrl === null ? 0.6 : 1,
						}}
						type="button"
					>
						Clear selection
					</button>
				</div>
			</section>

			{shortlist.items.length === 0 ? (
				<section
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "1rem",
					}}
				>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						No candidates in this view
					</h3>
					<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
						Try a broader bucket, include ignored roles, or refresh after a new
						scan run completes.
					</p>
				</section>
			) : (
				<fieldset
					style={{
						border: 0,
						display: "grid",
						gap: "0.8rem",
						gridTemplateColumns:
							"repeat(auto-fit, minmax(min(100%, 19rem), 1fr))",
						margin: 0,
						minInlineSize: 0,
						padding: 0,
					}}
				>
					<legend style={srOnlyStyle}>Scan shortlist candidates</legend>
					{shortlist.items.map((candidate) => {
						const isSelected = selectedUrl === candidate.url;

						return (
							<button
								aria-pressed={isSelected}
								key={candidate.url}
								onClick={() => onSelectCandidate(candidate)}
								style={{
									alignItems: "start",
									background: isSelected
										? "#eff6ff"
										: "rgba(248, 250, 252, 0.9)",
									border: isSelected
										? "1px solid #60a5fa"
										: "1px solid rgba(148, 163, 184, 0.2)",
									borderRadius: "1rem",
									color: "#0f172a",
									cursor: "pointer",
									display: "grid",
									gap: "0.7rem",
									padding: "0.95rem",
									textAlign: "left",
								}}
								type="button"
							>
								<div
									style={{
										alignItems: "start",
										display: "flex",
										gap: "0.7rem",
										justifyContent: "space-between",
									}}
								>
									<div>
										<p
											style={{
												color: "#64748b",
												marginBottom: "0.2rem",
												marginTop: 0,
											}}
										>
											#{candidate.rank} {getBucketLabel(candidate.bucket)}
										</p>
										<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
											{candidate.role}
										</h3>
										<p style={{ color: "#475569", margin: 0 }}>
											{candidate.company ?? "Unknown company"}
										</p>
									</div>
									<span
										style={{
											background: candidate.ignored ? "#e2e8f0" : "#dbeafe",
											borderRadius: "999px",
											color: candidate.ignored ? "#334155" : "#1d4ed8",
											fontSize: "0.8rem",
											fontWeight: 700,
											padding: "0.2rem 0.55rem",
										}}
									>
										{candidate.ignored ? "Ignored" : "Visible"}
									</span>
								</div>

								<p
									style={{
										color: "#0f172a",
										margin: 0,
										wordBreak: "break-word",
									}}
								>
									{candidate.url}
								</p>

								<p style={{ color: "#475569", margin: 0 }}>
									{candidate.reasonSummary ?? "No reason summary was recorded."}
								</p>

								<div
									style={{
										display: "grid",
										gap: "0.25rem",
									}}
								>
									<span>
										History: {candidate.duplicateHint.historyCount} entries
									</span>
									<span>
										Pending overlap:{" "}
										{candidate.duplicateHint.pendingOverlap ? "Yes" : "No"}
									</span>
									<span>
										Freshness: {candidate.duplicateHint.firstSeen ?? "Unknown"}
									</span>
								</div>

								{candidate.warnings.length > 0 ? (
									<div
										style={{
											display: "flex",
											flexWrap: "wrap",
											gap: "0.45rem",
										}}
									>
										{candidate.warnings.map((warning) => (
											<span
												key={`${candidate.url}:${warning.code}`}
												style={{
													...getWarningTone(warning.code),
													borderRadius: "999px",
													fontSize: "0.8rem",
													fontWeight: 700,
													padding: "0.2rem 0.55rem",
												}}
											>
												{warning.code}
											</span>
										))}
									</div>
								) : null}
							</button>
						);
					})}
				</fieldset>
			)}

			<footer
				style={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.55rem",
					justifyContent: "space-between",
				}}
			>
				<span style={{ color: "#64748b" }}>
					{shortlist.campaignGuidance ?? "No campaign guidance recorded."}
				</span>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						disabled={disabled || shortlist.offset === 0}
						onClick={onPreviousPage}
						style={{
							...buttonStyle,
							opacity: disabled || shortlist.offset === 0 ? 0.6 : 1,
						}}
						type="button"
					>
						Previous page
					</button>
					<button
						disabled={disabled || !shortlist.hasMore}
						onClick={onNextPage}
						style={{
							...buttonStyle,
							opacity: disabled || !shortlist.hasMore ? 0.6 : 1,
						}}
						type="button"
					>
						Next page
					</button>
				</div>
			</footer>
		</section>
	);
}

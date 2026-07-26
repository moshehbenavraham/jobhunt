import type { CSSProperties } from "react";
import type { ScanReviewFocus } from "./scan-review-client";
import {
	SCAN_REVIEW_BUCKET_FILTER_VALUES,
	type ScanReviewBucketFilter,
	type ScanReviewCandidatePreview,
	type ScanReviewSummaryPayload,
	type ScanReviewWarningCode,
} from "./scan-review-types";
import {
	scanBucketBadge,
	scanListingRow,
	scanListingRowSelected,
	scanPanel,
	scanStatCard,
	scanSubtleButton,
} from "./scan-styles";
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

const metaStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	margin: 0,
};

function getWarningTone(code: ScanReviewWarningCode): CSSProperties {
	switch (code) {
		case "already-ignored":
			return {
				background: "var(--jh-color-badge-neutral-bg)",
				color: "var(--jh-color-badge-neutral-fg)",
			};
		case "already-pending":
		case "approval-paused":
		case "stale-selection":
			return {
				background: "var(--jh-color-status-offline-bg)",
				color: "var(--jh-color-severity-warn-fg)",
			};
		case "degraded-result":
			return {
				background: "var(--jh-color-status-error-bg)",
				color: "var(--jh-color-status-error-fg)",
			};
		case "duplicate-heavy":
			return {
				background: "var(--jh-color-severity-info-bg)",
				color: "var(--jh-color-severity-info-fg)",
			};
	}
}

function getBucketLabel(bucket: ScanReviewBucketFilter): string {
	switch (bucket) {
		case "adjacent-or-noisy":
			return "Adjacent";
		case "all":
			return "All";
		case "possible-fit":
			return "Possible";
		case "strongest-fit":
			return "Strongest";
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
				body: "Loading candidates...",
				title: "Loading candidates",
			};
		case "offline":
			return {
				body: "The API is offline. Showing cached data.",
				title: "Candidates offline",
			};
		case "error":
			return {
				body: "Could not load candidates.",
				title: "Candidates unavailable",
			};
		default:
			return {
				body: "No candidates yet.",
				title: "No candidates yet",
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
			<section aria-labelledby="scan-shortlist-title" style={scanPanel}>
				<header>
					<h2
						id="scan-shortlist-title"
						style={{ marginBottom: "var(--jh-space-1)" }}
					>
						Shortlist
					</h2>
					<p style={metaStyle}>Filter and select candidates.</p>
				</header>

				<section style={scanStatCard}>
					<h3 style={{ marginBottom: "var(--jh-space-1)", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
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
		<section aria-labelledby="scan-shortlist-title" style={scanPanel}>
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
						id="scan-shortlist-title"
						style={{ marginBottom: "var(--jh-space-1)" }}
					>
						Shortlist
					</h2>
					<p style={metaStyle}>{shortlist.message}</p>
				</div>
				<div
					style={{
						display: "grid",
						gap: "var(--jh-space-1)",
						justifyItems: "end",
					}}
				>
					<strong style={{ fontSize: "var(--jh-text-body-sm-size)" }}>
						{getVisibleRange(shortlist)} of {shortlist.filteredCount}
					</strong>
					<span style={metaStyle}>Total: {shortlist.totalCount}</span>
				</div>
			</header>

			<section
				style={{
					display: "grid",
					gap: "var(--jh-space-2)",
					gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))",
				}}
			>
				<article style={scanStatCard}>
					<p style={metaStyle}>Strongest</p>
					<strong>{shortlist.counts.strongestFit ?? "N/A"}</strong>
				</article>
				<article style={scanStatCard}>
					<p style={metaStyle}>Possible</p>
					<strong>{shortlist.counts.possibleFit ?? "N/A"}</strong>
				</article>
				<article style={scanStatCard}>
					<p style={metaStyle}>Dup-heavy</p>
					<strong>{shortlist.counts.duplicateHeavy}</strong>
				</article>
				<article style={scanStatCard}>
					<p style={metaStyle}>Overlaps</p>
					<strong>{shortlist.counts.pendingOverlap}</strong>
				</article>
			</section>

			<section
				style={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "var(--jh-space-2)",
					justifyContent: "space-between",
				}}
			>
				<fieldset
					style={{
						border: 0,
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-2)",
						margin: 0,
						minInlineSize: 0,
						padding: 0,
					}}
				>
					<legend style={srOnlyStyle}>Fit filters</legend>
					{SCAN_REVIEW_BUCKET_FILTER_VALUES.map((bucket) => {
						const isSelected = bucket === focus.bucket;

						return (
							<button
								aria-pressed={isSelected}
								key={bucket}
								onClick={() => onSelectBucket(bucket)}
								style={{
									...scanSubtleButton,
									background: isSelected
										? "var(--jh-color-button-bg)"
										: scanSubtleButton.background,
									color: isSelected
										? "var(--jh-color-button-fg)"
										: scanSubtleButton.color,
								}}
								type="button"
							>
								{getBucketLabel(bucket)}
							</button>
						);
					})}
				</fieldset>

				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-2)",
					}}
				>
					<button
						aria-pressed={focus.includeIgnored}
						onClick={() => onSetIncludeIgnored(!focus.includeIgnored)}
						style={{
							...scanSubtleButton,
							background: focus.includeIgnored
								? "var(--jh-color-accent)"
								: scanSubtleButton.background,
							color: focus.includeIgnored
								? "var(--jh-color-text-on-ink)"
								: scanSubtleButton.color,
						}}
						type="button"
					>
						{focus.includeIgnored ? "Showing ignored" : "Show ignored"}
					</button>
					<button
						disabled={selectedUrl === null}
						onClick={onClearSelection}
						style={{
							...scanSubtleButton,
							opacity: selectedUrl === null ? 0.6 : 1,
						}}
						type="button"
					>
						Clear
					</button>
				</div>
			</section>

			{shortlist.items.length === 0 ? (
				<section style={scanStatCard}>
					<h3 style={{ marginBottom: "var(--jh-space-1)", marginTop: 0 }}>
						No candidates
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						Try a broader filter, include ignored roles, or refresh after a new
						scan completes.
					</p>
				</section>
			) : (
				<ul
					style={{
						display: "grid",
						gap: "var(--jh-space-1)",
						listStyle: "none",
						margin: 0,
						padding: 0,
					}}
				>
					<li style={srOnlyStyle}>Shortlist candidates</li>
					{shortlist.items.map((candidate) => {
						const isSelected = selectedUrl === candidate.url;

						return (
							<li key={candidate.url}>
								<button
									aria-pressed={isSelected}
									onClick={() => onSelectCandidate(candidate)}
									style={{
										...(isSelected ? scanListingRowSelected : scanListingRow),
										font: "inherit",
										gridTemplateColumns: "2.5rem 1fr auto",
										alignItems: "center",
									}}
									type="button"
								>
									<span
										style={{
											color: "var(--jh-color-text-muted)",
											fontFamily: "var(--jh-font-mono)",
											fontSize: "var(--jh-text-mono-sm-size)",
										}}
									>
										#{candidate.rank}
									</span>

									<div style={{ minWidth: 0 }}>
										<p
											style={{
												fontSize: "var(--jh-text-body-sm-size)",
												fontWeight: 700,
												margin: 0,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{candidate.role}
										</p>
										<p
											style={{
												color: "var(--jh-color-text-secondary)",
												fontSize: "var(--jh-text-caption-size)",
												margin: 0,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{candidate.company ?? "Unknown"} |{" "}
											{candidate.reasonSummary ?? "No reason recorded"}
										</p>
									</div>

									<div
										style={{
											display: "flex",
											gap: "var(--jh-space-1)",
											alignItems: "center",
										}}
									>
										<span
											style={{
												...scanBucketBadge,
												background: candidate.ignored
													? "var(--jh-color-badge-neutral-bg)"
													: "var(--jh-color-badge-info-bg)",
												color: candidate.ignored
													? "var(--jh-color-badge-neutral-fg)"
													: "var(--jh-color-badge-info-fg)",
											}}
										>
											{candidate.ignored
												? "Ignored"
												: getBucketLabel(candidate.bucket)}
										</span>

										{candidate.warnings.length > 0
											? candidate.warnings.map((warning) => (
													<span
														key={`${candidate.url}:${warning.code}`}
														style={{
															...scanBucketBadge,
															...getWarningTone(warning.code),
														}}
													>
														{warning.code}
													</span>
												))
											: null}
									</div>
								</button>
							</li>
						);
					})}
				</ul>
			)}

			<footer
				style={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "var(--jh-space-2)",
					justifyContent: "space-between",
				}}
			>
				<span style={metaStyle}>
					{shortlist.campaignGuidance ?? "No guidance recorded."}
				</span>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-2)",
					}}
				>
					<button
						disabled={disabled || shortlist.offset === 0}
						onClick={onPreviousPage}
						style={{
							...scanSubtleButton,
							opacity: disabled || shortlist.offset === 0 ? 0.6 : 1,
						}}
						type="button"
					>
						Previous
					</button>
					<button
						disabled={disabled || !shortlist.hasMore}
						onClick={onNextPage}
						style={{
							...scanSubtleButton,
							opacity: disabled || !shortlist.hasMore ? 0.6 : 1,
						}}
						type="button"
					>
						Next
					</button>
				</div>
			</footer>
		</section>
	);
}

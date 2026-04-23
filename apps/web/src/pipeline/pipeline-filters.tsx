import type { CSSProperties } from "react";
import {
	PIPELINE_REVIEW_QUEUE_SECTIONS,
	PIPELINE_REVIEW_SORT_VALUES,
	type PipelineReviewQueueSection,
	type PipelineReviewSort,
} from "./pipeline-review-types";

type PipelineFiltersProps = {
	counts: { malformed: number; pending: number; processed: number };
	hasMore: boolean;
	offset: number;
	onClearSelection: () => void;
	onNextPage: () => void;
	onPreviousPage: () => void;
	onSelectSection: (section: PipelineReviewQueueSection) => void;
	onSelectSort: (sort: PipelineReviewSort) => void;
	section: PipelineReviewQueueSection;
	selectionActive: boolean;
	sort: PipelineReviewSort;
	totalCount: number;
	visibleEnd: number;
	visibleStart: number;
};

const barStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "var(--jh-space-3)",
	padding: "var(--jh-space-padding-sm) var(--jh-space-padding)",
	position: "sticky",
	top: 0,
	zIndex: 2,
};

const controlRowStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-2)",
};

const chipBase: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)" as never,
	lineHeight: 1,
	padding: "3px 10px",
};

const toggleBase: CSSProperties = {
	background: "transparent",
	border: "1px solid var(--jh-color-surface-border)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-text-primary)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)" as never,
	minHeight: "2rem",
	padding: "var(--jh-space-1) var(--jh-space-3)",
};

const activeToggle: CSSProperties = {
	...toggleBase,
	background: "var(--jh-color-button-bg)",
	borderColor: "var(--jh-color-button-bg)",
	color: "var(--jh-color-button-fg)",
};

const sortActiveToggle: CSSProperties = {
	...toggleBase,
	background: "var(--jh-color-accent)",
	borderColor: "var(--jh-color-accent)",
	color: "var(--jh-color-text-on-ink)",
};

const paginationRowStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-2)",
	justifyContent: "space-between",
};

const navButtonStyle: CSSProperties = {
	...toggleBase,
};

function getSectionLabel(section: PipelineReviewQueueSection): string {
	switch (section) {
		case "all":
			return "All";
		case "pending":
			return "Pending";
		case "processed":
			return "Processed";
	}
}

function getSortLabel(sort: PipelineReviewSort): string {
	switch (sort) {
		case "company":
			return "Company";
		case "queue":
			return "Queue order";
		case "score":
			return "Score";
	}
}

export function PipelineFilters({
	counts,
	hasMore,
	offset,
	onClearSelection,
	onNextPage,
	onPreviousPage,
	onSelectSection,
	onSelectSort,
	section,
	selectionActive,
	sort,
	totalCount,
	visibleEnd,
	visibleStart,
}: PipelineFiltersProps) {
	return (
		<div style={barStyle}>
			<div style={controlRowStyle}>
				{PIPELINE_REVIEW_QUEUE_SECTIONS.map((s) => (
					<button
						aria-label={`Show ${getSectionLabel(s)}`}
						aria-pressed={section === s}
						key={s}
						onClick={() => onSelectSection(s)}
						style={section === s ? activeToggle : toggleBase}
						type="button"
					>
						{getSectionLabel(s)}
					</button>
				))}

				<span
					style={{
						...chipBase,
						background: "var(--jh-color-badge-neutral-bg)",
						color: "var(--jh-color-badge-neutral-fg)",
					}}
				>
					{counts.pending} pending
				</span>
				<span
					style={{
						...chipBase,
						background: "var(--jh-color-badge-info-bg)",
						color: "var(--jh-color-badge-info-fg)",
					}}
				>
					{counts.processed} processed
				</span>
				{counts.malformed > 0 ? (
					<span
						style={{
							...chipBase,
							background: "var(--jh-color-badge-attention-bg)",
							color: "var(--jh-color-badge-attention-fg)",
						}}
					>
						{counts.malformed} malformed
					</span>
				) : null}
			</div>

			<div style={controlRowStyle}>
				<span
					style={{
						color: "var(--jh-color-text-muted)",
						fontSize: "var(--jh-text-caption-size)",
					}}
				>
					Sort:
				</span>
				{PIPELINE_REVIEW_SORT_VALUES.map((s) => (
					<button
						aria-label={`Sort by ${getSortLabel(s)}`}
						aria-pressed={sort === s}
						key={s}
						onClick={() => onSelectSort(s)}
						style={sort === s ? sortActiveToggle : toggleBase}
						type="button"
					>
						{getSortLabel(s)}
					</button>
				))}
			</div>

			<div style={paginationRowStyle}>
				<span
					style={{
						color: "var(--jh-color-text-muted)",
						fontSize: "var(--jh-text-caption-size)",
					}}
				>
					{totalCount === 0
						? "No rows"
						: `${visibleStart}-${visibleEnd} of ${totalCount}`}
				</span>

				<div style={{ display: "flex", gap: "var(--jh-space-2)" }}>
					<button
						aria-label="Previous page"
						disabled={offset === 0}
						onClick={onPreviousPage}
						style={{ ...navButtonStyle, opacity: offset === 0 ? 0.5 : 1 }}
						type="button"
					>
						Prev
					</button>
					<button
						aria-label="Next page"
						disabled={!hasMore}
						onClick={onNextPage}
						style={{ ...navButtonStyle, opacity: hasMore ? 1 : 0.5 }}
						type="button"
					>
						Next
					</button>
					{selectionActive ? (
						<button
							aria-label="Clear selection"
							onClick={onClearSelection}
							style={navButtonStyle}
							type="button"
						>
							Clear
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
}

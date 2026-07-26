import type { CSSProperties } from "react";
import {
	trackerPanel,
	trackerRow,
	trackerRowSelected,
	trackerStatCard,
	trackerSubtleButton,
	trackerWarning,
} from "./tracker-styles";
import type { TrackerWorkspaceRowPreview } from "./tracker-workspace-types";
import type { TrackerWorkspaceViewStatus } from "./use-tracker-workspace";

type TrackerRowListProps = {
	filteredCount: number;
	hasMore: boolean;
	items: TrackerWorkspaceRowPreview[];
	offset: number;
	onGoToNextPage: () => void;
	onGoToPreviousPage: () => void;
	onSelectRow: (row: TrackerWorkspaceRowPreview) => void;
	status: TrackerWorkspaceViewStatus;
};

function formatScore(score: number | null, scoreLabel: string): string {
	if (score !== null) {
		return `${score.toFixed(1)} / 5`;
	}

	return scoreLabel.length > 0 ? scoreLabel : "No score";
}

const secondaryTextStyle: CSSProperties = {
	color: "var(--jh-color-text-secondary)",
	fontSize: "var(--jh-text-body-sm-size)",
};

const badgeStyle: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	display: "inline-block",
	fontSize: "var(--jh-text-caption-size)",
	padding: "0.1rem 0.45rem",
};

const statusBadgeStyle: CSSProperties = {
	...badgeStyle,
	background: "var(--jh-color-badge-neutral-bg)",
	color: "var(--jh-color-badge-neutral-fg)",
};

const paginationBarStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	gap: "var(--jh-space-3)",
	justifyContent: "space-between",
};

const disabledButtonStyle: CSSProperties = {
	...trackerSubtleButton,
	cursor: "default",
	opacity: 0.4,
};

function StatusCard({ message }: { message: string }) {
	return (
		<div style={trackerStatCard}>
			<p style={{ margin: 0 }}>{message}</p>
		</div>
	);
}

function RowWarnings({
	warnings,
}: {
	warnings: TrackerWorkspaceRowPreview["warnings"];
}) {
	if (warnings.length === 0) {
		return null;
	}

	return (
		<ul
			style={{
				display: "grid",
				gap: "var(--jh-space-1)",
				gridColumn: "1 / -1",
				listStyle: "none",
				margin: 0,
				padding: 0,
			}}
		>
			{warnings.map((warning) => (
				<li key={warning.code} style={trackerWarning}>
					<span style={{ fontSize: "var(--jh-text-body-sm-size)" }}>
						{warning.message}
					</span>
				</li>
			))}
		</ul>
	);
}

function RowItem({
	onSelect,
	row,
}: {
	onSelect: (row: TrackerWorkspaceRowPreview) => void;
	row: TrackerWorkspaceRowPreview;
}) {
	const style = row.selected ? trackerRowSelected : trackerRow;

	return (
		<button
			aria-current={row.selected ? "true" : undefined}
			aria-label={`${row.company} - ${row.role}`}
			onClick={() => onSelect(row)}
			style={{ ...style, font: "inherit" }}
			type="button"
		>
			<span
				style={{
					color: "var(--jh-color-text-muted)",
					fontSize: "var(--jh-text-caption-size)",
					textAlign: "right",
				}}
			>
				#{row.entryNumber}
			</span>

			<span style={{ display: "grid", gap: "0.15rem", minWidth: 0 }}>
				<span
					style={{
						fontWeight: "var(--jh-font-weight-semibold)" as unknown as number,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{row.company}
				</span>
				<span style={secondaryTextStyle}>{row.role}</span>
				<span style={{ ...secondaryTextStyle, fontSize: "var(--jh-text-caption-size)" }}>
					{row.report.exists ? "Report" : "No report"} ·{" "}
					{row.pdf.exists ? "PDF" : "No PDF"}
				</span>
			</span>

			<span className="jh-tracker-row-meta">
				<span style={statusBadgeStyle}>
					{row.status || "No status"}
				</span>
				<strong style={{ fontSize: "var(--jh-text-body-sm-size)" }}>
					{formatScore(row.score, row.scoreLabel)}
				</strong>
				<span style={secondaryTextStyle}>{row.date}</span>
				<span
					aria-hidden="true"
					style={{
						color: row.selected
							? "var(--jh-color-accent)"
							: "var(--jh-color-text-muted)",
						fontSize: "1.1rem",
					}}
				>
					›
				</span>
			</span>

			{row.warningCount > 0 && <RowWarnings warnings={row.warnings} />}
		</button>
	);
}

export function TrackerRowList({
	filteredCount,
	hasMore,
	items,
	offset,
	onGoToNextPage,
	onGoToPreviousPage,
	onSelectRow,
	status,
}: TrackerRowListProps) {
	if (status === "loading") {
		return (
			<section aria-label="Application rows" style={trackerPanel}>
				<StatusCard message="Loading applications..." />
			</section>
		);
	}

	if (status === "error") {
		return (
			<section aria-label="Application rows" style={trackerPanel}>
				<StatusCard message="Could not load applications." />
			</section>
		);
	}

	const isOffline = status === "offline";
	const rangeStart = filteredCount > 0 ? offset + 1 : 0;
	const rangeEnd = offset + items.length;
	const hasPrevious = offset > 0;

	return (
		<section aria-label="Application rows" style={trackerPanel}>
			{isOffline && <StatusCard message="Showing cached data." />}

			{items.length === 0 ? (
				<StatusCard message="No rows match the current filters." />
			) : (
				<div style={{ display: "grid", gap: "var(--jh-space-2)" }}>
					{items.map((row) => (
						<RowItem key={row.entryNumber} onSelect={onSelectRow} row={row} />
					))}
				</div>
			)}

			<div style={paginationBarStyle}>
				<span style={secondaryTextStyle}>
					Showing {rangeStart}-{rangeEnd} of {filteredCount}
				</span>

				<div style={{ display: "flex", gap: "var(--jh-space-2)" }}>
					<button
						aria-label="Previous page"
						disabled={!hasPrevious}
						onClick={onGoToPreviousPage}
						style={hasPrevious ? trackerSubtleButton : disabledButtonStyle}
						type="button"
					>
						Previous
					</button>
					<button
						aria-label="Next page"
						disabled={!hasMore}
						onClick={onGoToNextPage}
						style={hasMore ? trackerSubtleButton : disabledButtonStyle}
						type="button"
					>
						Next
					</button>
				</div>
			</div>
		</section>
	);
}

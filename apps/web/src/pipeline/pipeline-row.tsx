import type { CSSProperties } from "react";
import type {
	PipelineReviewLegitimacy,
	PipelineReviewRowPreview,
	PipelineReviewWarningCode,
} from "./pipeline-review-types";

type PipelineRowProps = {
	onSelect: (row: PipelineReviewRowPreview) => void;
	row: PipelineReviewRowPreview;
};

const baseRowStyle: CSSProperties = {
	appearance: "none",
	borderRadius: "var(--jh-radius-md)",
	color: "inherit",
	cursor: "pointer",
	display: "grid",
	font: "inherit",
	gap: "var(--jh-space-2)",
	padding: "var(--jh-space-3) var(--jh-space-padding)",
	textAlign: "start",
	width: "100%",
};

const topLineStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-2)",
	justifyContent: "space-between",
};

const roleStyle: CSSProperties = {
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)" as never,
	margin: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

const companyStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	margin: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

const badgeRowStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-1)",
};

const chipBase: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)" as never,
	letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
	lineHeight: 1,
	padding: "2px 8px",
};

function scoreChipStyle(score: number | null): CSSProperties {
	if (score === null) {
		return {
			...chipBase,
			background: "var(--jh-color-badge-neutral-bg)",
			color: "var(--jh-color-badge-neutral-fg)",
		};
	}
	if (score >= 4.0) {
		return {
			...chipBase,
			background: "var(--jh-color-badge-positive-bg)",
			color: "var(--jh-color-badge-positive-fg)",
		};
	}
	if (score >= 3.0) {
		return {
			...chipBase,
			background: "var(--jh-color-badge-info-bg)",
			color: "var(--jh-color-badge-info-fg)",
		};
	}
	return {
		...chipBase,
		background: "var(--jh-color-badge-attention-bg)",
		color: "var(--jh-color-badge-attention-fg)",
	};
}

function statusPillStyle(kind: "pending" | "processed"): CSSProperties {
	return {
		...chipBase,
		background:
			kind === "pending"
				? "var(--jh-color-pipeline-pending-bg)"
				: "var(--jh-color-pipeline-processed-bg)",
		color:
			kind === "pending"
				? "var(--jh-color-pipeline-pending-fg)"
				: "var(--jh-color-pipeline-processed-fg)",
	};
}

function legitimacyBadgeStyle(
	legitimacy: PipelineReviewLegitimacy,
): CSSProperties {
	switch (legitimacy) {
		case "High Confidence":
			return {
				...chipBase,
				background: "var(--jh-color-pipeline-legit-high-bg)",
				color: "var(--jh-color-pipeline-legit-high-fg)",
			};
		case "Proceed with Caution":
			return {
				...chipBase,
				background: "var(--jh-color-pipeline-legit-caution-bg)",
				color: "var(--jh-color-pipeline-legit-caution-fg)",
			};
		case "Suspicious":
			return {
				...chipBase,
				background: "var(--jh-color-pipeline-legit-suspicious-bg)",
				color: "var(--jh-color-pipeline-legit-suspicious-fg)",
			};
	}
}

function getWarningTone(code: PipelineReviewWarningCode): CSSProperties {
	switch (code) {
		case "low-score":
			return {
				background: "var(--jh-color-pipeline-warn-low-score-bg)",
				color: "var(--jh-color-pipeline-warn-low-score-fg)",
			};
		case "suspicious-legitimacy":
			return {
				background: "var(--jh-color-pipeline-warn-suspicious-bg)",
				color: "var(--jh-color-pipeline-warn-suspicious-fg)",
			};
		case "caution-legitimacy":
		case "missing-pdf":
		case "missing-report":
		case "stale-selection":
			return {
				background: "var(--jh-color-pipeline-warn-caution-bg)",
				color: "var(--jh-color-pipeline-warn-caution-fg)",
			};
	}
}

function formatScore(value: number | null): string {
	if (value === null) return "--";
	return `${value.toFixed(1)} / 5`;
}

export function PipelineRow({ onSelect, row }: PipelineRowProps) {
	const rowStyle: CSSProperties = {
		...baseRowStyle,
		background: row.selected
			? "var(--jh-color-pipeline-row-selected-bg)"
			: "var(--jh-color-pipeline-row-bg)",
		border: row.selected
			? "1px solid var(--jh-color-pipeline-row-selected-border)"
			: "1px solid var(--jh-color-pipeline-row-border)",
	};

	return (
		<button
			aria-current={row.selected ? "true" : undefined}
			aria-label={
				row.reportNumber
					? `Queue row ${row.reportNumber}`
					: `Queue row ${row.url}`
			}
			onClick={() => onSelect(row)}
			style={rowStyle}
			type="button"
		>
			<div style={topLineStyle}>
				<div style={{ minWidth: 0 }}>
					<p style={roleStyle}>{row.role ?? row.url}</p>
					<p style={companyStyle}>{row.company ?? "Unknown company"}</p>
				</div>
				<span style={scoreChipStyle(row.score)}>{formatScore(row.score)}</span>
			</div>

			<div style={badgeRowStyle}>
				<span style={statusPillStyle(row.kind)}>
					{row.kind === "pending" ? "Pending" : "Processed"}
				</span>
				{row.legitimacy ? (
					<span style={legitimacyBadgeStyle(row.legitimacy)}>
						{row.legitimacy}
					</span>
				) : null}
				{row.report.exists ? (
					<span
						style={{
							...chipBase,
							background: "var(--jh-color-badge-positive-bg)",
							color: "var(--jh-color-badge-positive-fg)",
						}}
					>
						Report
					</span>
				) : null}
				{row.pdf.exists ? (
					<span
						style={{
							...chipBase,
							background: "var(--jh-color-badge-positive-bg)",
							color: "var(--jh-color-badge-positive-fg)",
						}}
					>
						PDF
					</span>
				) : null}
				{row.warningCount > 0 ? (
					<span
						style={{
							...chipBase,
							background: "var(--jh-color-badge-attention-bg)",
							color: "var(--jh-color-badge-attention-fg)",
						}}
					>
						{row.warningCount} warning{row.warningCount === 1 ? "" : "s"}
					</span>
				) : null}
				{row.warnings.map((w) => (
					<span
						key={`${w.code}:${w.message}`}
						style={{ ...getWarningTone(w.code), ...chipBase }}
					>
						{w.message}
					</span>
				))}
			</div>
		</button>
	);
}

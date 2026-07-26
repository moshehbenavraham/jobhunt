import type { CSSProperties } from "react";
import type {
	PipelineReviewSelectedDetail,
	PipelineReviewWarningCode,
} from "./pipeline-review-types";

type PipelineContextDetailProps = {
	onClearSelection: () => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
	selectedDetail: PipelineReviewSelectedDetail;
};

const panelStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-3)",
};

const headerStyle: CSSProperties = {
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-h4-size)",
	fontWeight: "var(--jh-text-h4-weight)" as never,
	marginBottom: 0,
	marginTop: 0,
};

const cardStyle: CSSProperties = {
	background: "var(--jh-color-pipeline-card-bg)",
	border: "1px solid var(--jh-color-pipeline-card-border)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "var(--jh-space-2)",
	padding: "var(--jh-space-3)",
};

const metaGridStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-2)",
	gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
};

const labelStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	margin: 0,
};

const valueStyle: CSSProperties = {
	fontWeight: "var(--jh-font-weight-semibold)" as never,
	margin: 0,
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)" as never,
	minHeight: "2rem",
	padding: "var(--jh-space-1) var(--jh-space-3)",
};

const staleStyle: CSSProperties = {
	background: "var(--jh-color-pipeline-stale-bg)",
	border: "1px solid var(--jh-color-pipeline-stale-border)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "var(--jh-space-2)",
	padding: "var(--jh-space-3)",
};

const emptyStyle: CSSProperties = {
	background: "var(--jh-color-pipeline-card-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	padding: "var(--jh-space-3)",
};

const chipBase: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)" as never,
	lineHeight: 1,
	padding: "2px 8px",
};

const sourceStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	padding: "var(--jh-space-2)",
};

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
	if (value === null) return "No score";
	return `${value.toFixed(1)} / 5`;
}

function getSectionLabel(kind: "pending" | "processed"): string {
	return kind === "pending" ? "Pending" : "Processed";
}

export function PipelineContextDetail({
	onClearSelection,
	onOpenReportViewer,
	selectedDetail,
}: PipelineContextDetailProps) {
	const selectedRow = selectedDetail.row;

	if (selectedDetail.state === "empty") {
		return (
			<section style={panelStyle}>
				<h4 style={headerStyle}>Detail</h4>
				<div style={emptyStyle}>
					<p style={{ color: "var(--jh-color-text-muted)", margin: 0 }}>
						Select a row to inspect its report, score, and warnings.
					</p>
				</div>
			</section>
		);
	}

	if (selectedDetail.state === "missing") {
		return (
			<section style={panelStyle}>
				<h4 style={headerStyle}>Detail</h4>
				<div style={staleStyle}>
					<p style={{ margin: 0 }}>
						The selected row is no longer in the current view. Clear the
						selection or pick another row.
					</p>
					<div>
						<button
							aria-label="Clear stale selection"
							onClick={onClearSelection}
							style={buttonStyle}
							type="button"
						>
							Clear selection
						</button>
					</div>
				</div>
			</section>
		);
	}

	if (!selectedRow) return null;

	return (
		<section style={panelStyle}>
			<h4 style={headerStyle}>Detail</h4>
			<div style={cardStyle}>
				<div>
					<strong>{selectedRow.role ?? selectedRow.url}</strong>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							margin: 0,
						}}
					>
						{selectedRow.company ?? "Unknown company"}
					</p>
				</div>

				<div style={metaGridStyle}>
					<article>
						<p style={labelStyle}>Queue state</p>
						<p style={valueStyle}>{getSectionLabel(selectedRow.kind)}</p>
					</article>
					<article>
						<p style={labelStyle}>Score</p>
						<p style={valueStyle}>{formatScore(selectedRow.score)}</p>
					</article>
					<article>
						<p style={labelStyle}>Legitimacy</p>
						<p style={valueStyle}>{selectedRow.legitimacy ?? "Unknown"}</p>
					</article>
					<article>
						<p style={labelStyle}>Verification</p>
						<p style={valueStyle}>
							{selectedRow.verification ?? "No verification note"}
						</p>
					</article>
				</div>

				<div style={{ display: "grid", gap: "var(--jh-space-1)" }}>
					<span>{selectedRow.report.message}</span>
					<span>{selectedRow.pdf.message}</span>
				</div>

				<div
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-2)",
					}}
				>
					<a
						href={selectedRow.url}
						rel="noreferrer"
						style={{ color: "var(--jh-color-accent)" }}
						target="_blank"
					>
						Open job posting
					</a>
					{selectedRow.report.exists ? (
						<button
							aria-label="Open report viewer"
							onClick={() =>
								onOpenReportViewer({
									reportPath: selectedRow.report.repoRelativePath,
								})
							}
							style={buttonStyle}
							type="button"
						>
							Open report
						</button>
					) : null}
				</div>
			</div>

			{selectedRow.warnings.length > 0 ? (
				<div style={cardStyle}>
					<strong>Warnings</strong>
					<div style={{ display: "grid", gap: "var(--jh-space-2)" }}>
						{selectedRow.warnings.map((warning) => (
							<article
								key={`${warning.code}:${warning.message}`}
								style={{
									...getWarningTone(warning.code),
									borderRadius: "var(--jh-radius-md)",
									padding: "var(--jh-space-2) var(--jh-space-3)",
								}}
							>
								<strong>{warning.message}</strong>
								<p
									style={{
										fontSize: "var(--jh-text-caption-size)",
										marginBottom: 0,
										marginTop: "var(--jh-space-1)",
									}}
								>
									Code: {warning.code}
								</p>
							</article>
						))}
					</div>
				</div>
			) : null}

			<div style={sourceStyle}>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						fontSize: "var(--jh-text-caption-size)",
						marginBottom: "var(--jh-space-1)",
						marginTop: 0,
					}}
				>
					Source line
				</p>
				<code
					style={{
						display: "block",
						fontFamily: "var(--jh-font-mono)",
						fontSize: "var(--jh-text-mono-sm-size)",
						overflowX: "auto",
						whiteSpace: "pre-wrap",
					}}
				>
					{selectedRow.sourceLine}
				</code>
			</div>

			{selectedRow.header ? (
				<div style={cardStyle}>
					<strong>Report header</strong>
					<span>{selectedRow.header.title ?? "Untitled report"}</span>
					<span
						style={{
							color: "var(--jh-color-text-muted)",
							fontSize: "var(--jh-text-caption-size)",
						}}
					>
						{selectedRow.header.date ?? "No report date"}
					</span>
					<span
						style={{
							...chipBase,
							background: "var(--jh-color-badge-neutral-bg)",
							color: "var(--jh-color-badge-neutral-fg)",
							justifySelf: "start",
						}}
					>
						{selectedRow.header.archetype ?? "No archetype"}
					</span>
				</div>
			) : null}
		</section>
	);
}

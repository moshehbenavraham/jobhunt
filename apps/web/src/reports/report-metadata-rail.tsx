import type { CSSProperties } from "react";
import type { ReportViewerReportHeader } from "./report-viewer-types";

type ReportMetadataRailProps = {
	header: ReportViewerReportHeader | null;
	repoRelativePath: string | null;
	reportNumber: string | null;
	status: "empty" | "error" | "loading" | "offline" | "ready";
	errorMessage?: string | null | undefined;
};

const railStyle: CSSProperties = {
	background: "var(--jh-color-report-meta-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	fontFamily: "var(--jh-font-body)",
	gap: "var(--jh-space-4)",
	padding: "var(--jh-space-padding)",
	position: "sticky",
	top: "var(--jh-space-4)",
};

const fieldLabelStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	fontWeight: "var(--jh-text-label-weight)",
	letterSpacing: "var(--jh-text-label-letter-spacing)",
	margin: 0,
	textTransform: "uppercase",
};

const fieldValueStyle: CSSProperties = {
	color: "var(--jh-color-text-primary)",
	fontSize: "var(--jh-text-body-sm-size)",
	lineHeight: "var(--jh-text-body-sm-line-height)",
	margin: 0,
};

const chipStyle: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	display: "inline-block",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-text-label-sm-weight)",
	letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
	lineHeight: 1,
	padding: "var(--jh-space-1) var(--jh-space-3)",
	textTransform: "uppercase",
	whiteSpace: "nowrap",
};

function getScoreTokens(score: number | null): { bg: string; fg: string } {
	if (score === null) {
		return {
			bg: "var(--jh-color-badge-neutral-bg)",
			fg: "var(--jh-color-badge-neutral-fg)",
		};
	}

	if (score >= 4.0) {
		return {
			bg: "var(--jh-color-badge-positive-bg)",
			fg: "var(--jh-color-badge-positive-fg)",
		};
	}

	if (score >= 3.0) {
		return {
			bg: "var(--jh-color-badge-info-bg)",
			fg: "var(--jh-color-badge-info-fg)",
		};
	}

	if (score >= 2.0) {
		return {
			bg: "var(--jh-color-badge-attention-bg)",
			fg: "var(--jh-color-badge-attention-fg)",
		};
	}

	return {
		bg: "var(--jh-color-status-error-bg)",
		fg: "var(--jh-color-status-error-fg)",
	};
}

function getLegitimacyTokens(legitimacy: string | null): {
	bg: string;
	fg: string;
} {
	switch (legitimacy) {
		case "High Confidence":
			return {
				bg: "var(--jh-color-badge-positive-bg)",
				fg: "var(--jh-color-badge-positive-fg)",
			};
		case "Proceed with Caution":
			return {
				bg: "var(--jh-color-badge-attention-bg)",
				fg: "var(--jh-color-badge-attention-fg)",
			};
		case "Suspicious":
			return {
				bg: "var(--jh-color-status-error-bg)",
				fg: "var(--jh-color-status-error-fg)",
			};
		default:
			return {
				bg: "var(--jh-color-badge-neutral-bg)",
				fg: "var(--jh-color-badge-neutral-fg)",
			};
	}
}

function MetadataField({
	label,
	children,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<div>
			<p style={fieldLabelStyle}>{label}</p>
			<div style={fieldValueStyle}>{children}</div>
		</div>
	);
}

export function ReportMetadataRail({
	errorMessage,
	header,
	repoRelativePath,
	reportNumber,
	status,
}: ReportMetadataRailProps) {
	if (status === "loading") {
		return (
			<aside aria-label="Report metadata" style={railStyle}>
				<p style={{ ...fieldValueStyle, color: "var(--jh-color-text-muted)" }}>
					Loading report details...
				</p>
			</aside>
		);
	}

	if (status === "error") {
		return (
			<aside aria-label="Report metadata" style={railStyle}>
				<p
					style={{
						...fieldValueStyle,
						color: "var(--jh-color-status-error-fg)",
					}}
				>
					{errorMessage ?? "Unable to load report details."}
				</p>
			</aside>
		);
	}

	if (status === "offline") {
		return (
			<aside aria-label="Report metadata" style={railStyle}>
				<p
					style={{
						...fieldValueStyle,
						color: "var(--jh-color-text-muted)",
					}}
				>
					Server unreachable. Showing last available data.
				</p>
				{header ? (
					<MetadataFields
						header={header}
						repoRelativePath={repoRelativePath}
						reportNumber={reportNumber}
					/>
				) : null}
			</aside>
		);
	}

	if (status === "empty" || !header) {
		return (
			<aside aria-label="Report metadata" style={railStyle}>
				<p style={{ ...fieldValueStyle, color: "var(--jh-color-text-muted)" }}>
					Select a report to view its details.
				</p>
			</aside>
		);
	}

	return (
		<aside aria-label="Report metadata" style={railStyle}>
			<MetadataFields
				header={header}
				repoRelativePath={repoRelativePath}
				reportNumber={reportNumber}
			/>
		</aside>
	);
}

function MetadataFields({
	header,
	repoRelativePath,
	reportNumber,
}: {
	header: ReportViewerReportHeader;
	repoRelativePath: string | null;
	reportNumber: string | null;
}) {
	const scoreTokens = getScoreTokens(header.score);
	const legitimacyTokens = getLegitimacyTokens(header.legitimacy);

	return (
		<>
			{/* Score chip */}
			<div
				style={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "var(--jh-space-2)",
				}}
			>
				<span
					style={{
						...chipStyle,
						background: scoreTokens.bg,
						color: scoreTokens.fg,
					}}
				>
					{header.score !== null
						? `${header.score.toFixed(1)} / 5`
						: "No score"}
				</span>
				<span
					style={{
						...chipStyle,
						background: legitimacyTokens.bg,
						color: legitimacyTokens.fg,
					}}
				>
					{header.legitimacy ?? "Unverified"}
				</span>
			</div>

			{/* Title */}
			<MetadataField label="Title">
				<p
					style={{
						...fieldValueStyle,
						fontWeight: "var(--jh-font-weight-semibold)",
					}}
				>
					{header.title ?? "Untitled report"}
				</p>
			</MetadataField>

			{/* Company / Role / Archetype */}
			<MetadataField label="Archetype">
				{header.archetype ?? "Unavailable"}
			</MetadataField>

			<MetadataField label="Date">{header.date ?? "Unavailable"}</MetadataField>

			<MetadataField label="Report #">
				{reportNumber ?? "Unavailable"}
			</MetadataField>

			<MetadataField label="Verification">
				{header.verification ?? "Unavailable"}
			</MetadataField>

			{/* URL */}
			<MetadataField label="Job URL">
				{header.url ? (
					<a
						href={header.url}
						rel="noreferrer"
						style={{
							color: "var(--jh-color-accent)",
							fontSize: "var(--jh-text-body-sm-size)",
							wordBreak: "break-all",
						}}
						target="_blank"
					>
						{header.url}
					</a>
				) : (
					"Unavailable"
				)}
			</MetadataField>

			{/* Linked PDF */}
			<MetadataField label="Linked PDF">
				{header.pdf.repoRelativePath ?? "None"}
				{header.pdf.repoRelativePath ? (
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							fontSize: "var(--jh-text-caption-size)",
							margin: 0,
						}}
					>
						{header.pdf.exists
							? "Available in output folder"
							: "Not yet generated"}
					</p>
				) : null}
			</MetadataField>

			{/* File path */}
			{repoRelativePath ? (
				<MetadataField label="File">
					<code
						style={{
							fontFamily: "var(--jh-font-mono)",
							fontSize: "var(--jh-text-mono-sm-size)",
							wordBreak: "break-all",
						}}
					>
						{repoRelativePath}
					</code>
				</MetadataField>
			) : null}
		</>
	);
}

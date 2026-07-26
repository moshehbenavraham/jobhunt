import type { CSSProperties } from "react";
import { Link, useParams } from "react-router";
import { ReportViewerSurface } from "../reports/report-viewer-surface";

const pageStyle: CSSProperties = {
	display: "grid",
	fontFamily: "var(--jh-font-body)",
	gap: "var(--jh-space-section-gap)",
};

const bodySecondaryStyle: CSSProperties = {
	color: "var(--jh-color-text-secondary)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-size)",
	lineHeight: "var(--jh-text-body-line-height)",
	margin: 0,
};

const actionLinkStyle: CSSProperties = {
	alignSelf: "start",
	background: "var(--jh-color-nav-item-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-nav-accent)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-size)",
	fontWeight: "var(--jh-font-weight-bold)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
	textDecoration: "none",
};

const cardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	padding: "var(--jh-space-padding)",
};

const headingStyle: CSSProperties = {
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-h2-size)",
	fontWeight: "var(--jh-text-h2-weight)",
	letterSpacing: "var(--jh-text-h2-letter-spacing)",
	lineHeight: "var(--jh-text-h2-line-height)",
	margin: 0,
};

export function ReportPage() {
	const { reportId } = useParams<{ reportId: string }>();

	if (!reportId || reportId.trim() === "") {
		return (
			<section style={pageStyle}>
				<header>
					<h2 style={headingStyle}>No report specified</h2>
				</header>
				<section style={cardStyle}>
					<p style={bodySecondaryStyle}>
						No report identifier was provided. Browse recent reports from the
						artifacts view or open a report link from an evaluation.
					</p>
				</section>
				<Link style={actionLinkStyle} to="/artifacts">
					Browse reports
				</Link>
			</section>
		);
	}

	return <ReportViewerSurface initialReportPath={reportId} />;
}

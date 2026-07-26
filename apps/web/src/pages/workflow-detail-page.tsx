import type { CSSProperties } from "react";
import { Link, useParams } from "react-router";

const pageStyle: CSSProperties = {
	display: "grid",
	fontFamily: "var(--jh-font-body)",
	gap: "var(--jh-space-section-gap)",
	maxWidth: "720px",
};

const cardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	padding: "var(--jh-space-padding)",
};

const labelSmStyle: CSSProperties = {
	color: "var(--jh-color-label-fg)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-text-label-sm-weight)",
	letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
	margin: 0,
	textTransform: "uppercase",
};

const headingStyle: CSSProperties = {
	fontFamily: "var(--jh-font-mono)",
	fontSize: "var(--jh-text-h2-size)",
	fontWeight: "var(--jh-text-h2-weight)",
	letterSpacing: "var(--jh-text-h2-letter-spacing)",
	lineHeight: "var(--jh-text-h2-line-height)",
	margin: 0,
	wordBreak: "break-all",
};

const backLinkStyle: CSSProperties = {
	color: "var(--jh-color-text-secondary)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	textDecoration: "none",
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

export function WorkflowDetailPage() {
	const { workflowId } = useParams<{ workflowId: string }>();

	if (!workflowId || workflowId.trim() === "") {
		return (
			<section style={pageStyle}>
				<header>
					<p style={labelSmStyle}>Workflow detail</p>
					<h2 style={{ ...headingStyle, fontFamily: "var(--jh-font-heading)" }}>
						No workflow specified
					</h2>
				</header>
				<p style={bodySecondaryStyle}>
					No workflow identifier was provided. Navigate to workflows to pick
					one.
				</p>
				<Link style={actionLinkStyle} to="/workflows">
					Back to workflows
				</Link>
			</section>
		);
	}

	return (
		<section aria-labelledby="workflow-detail-heading" style={pageStyle}>
			<header style={{ display: "grid", gap: "var(--jh-space-1)" }}>
				<p style={labelSmStyle}>Workflow detail</p>
				<h2 id="workflow-detail-heading" style={headingStyle}>
					{workflowId}
				</h2>
				<Link style={backLinkStyle} to="/workflows">
					Back to workflows
				</Link>
			</header>

			<section style={cardStyle}>
				<p style={bodySecondaryStyle}>
					Workflow details will appear here once data loading is wired up.
				</p>
			</section>
		</section>
	);
}

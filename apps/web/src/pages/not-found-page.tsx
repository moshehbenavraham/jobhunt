import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router";

const containerStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-padding)",
	maxWidth: "480px",
};

const headingStyle: CSSProperties = {
	fontSize: "var(--jh-text-h2-size)",
	fontWeight: "var(--jh-font-weight-bold)",
	marginBottom: 0,
	marginTop: 0,
};

const bodyStyle: CSSProperties = {
	color: "var(--jh-color-text-secondary)",
	lineHeight: "var(--jh-text-body-line-height)",
	margin: 0,
};

const linkStyle: CSSProperties = {
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

export function NotFoundPage() {
	const location = useLocation();

	return (
		<section aria-labelledby="not-found-heading" style={containerStyle}>
			<h2 id="not-found-heading" style={headingStyle}>
				Page not found
			</h2>
			<p style={bodyStyle}>
				There is nothing at{" "}
				<code
					style={{
						background: "var(--jh-color-surface-bg)",
						borderRadius: "var(--jh-radius-sm)",
						fontFamily: "var(--jh-font-mono)",
						fontSize: "var(--jh-text-body-sm-size)",
						padding: "0.15rem 0.35rem",
					}}
				>
					{location.pathname}
				</code>
				. Check the URL and try again, or head back to the overview.
			</p>
			<Link style={linkStyle} to="/">
				Back to overview
			</Link>
		</section>
	);
}

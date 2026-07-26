import { type CSSProperties, useCallback, useRef } from "react";
import { Link } from "react-router";
import type { ReportViewerReportHeader } from "./report-viewer-types";

type ReportActionShelfProps = {
	header: ReportViewerReportHeader | null;
	onRefresh: () => void;
	isRefreshing: boolean;
	repoRelativePath: string | null;
};

const shelfStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-2)",
	padding: "var(--jh-space-2) 0",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: "none",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)",
	padding: "var(--jh-space-2) var(--jh-space-4)",
};

const subtleButtonStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-text-primary)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)",
	padding: "var(--jh-space-2) var(--jh-space-4)",
};

const linkButtonStyle: CSSProperties = {
	...subtleButtonStyle,
	color: "var(--jh-color-accent)",
	textDecoration: "none",
};

export function ReportActionShelf({
	header,
	isRefreshing,
	onRefresh,
	repoRelativePath,
}: ReportActionShelfProps) {
	const refreshGuardRef = useRef(false);

	const handleRefresh = useCallback(() => {
		if (refreshGuardRef.current || isRefreshing) {
			return;
		}

		refreshGuardRef.current = true;
		onRefresh();

		requestAnimationFrame(() => {
			refreshGuardRef.current = false;
		});
	}, [isRefreshing, onRefresh]);

	return (
		<nav aria-label="Report actions" style={shelfStyle}>
			<button
				disabled={isRefreshing}
				onClick={handleRefresh}
				style={{
					...buttonStyle,
					cursor: isRefreshing ? "not-allowed" : "pointer",
					opacity: isRefreshing ? 0.5 : 1,
				}}
				type="button"
			>
				{isRefreshing ? "Refreshing..." : "Refresh"}
			</button>

			{header?.pdf.exists && header.pdf.repoRelativePath ? (
				<button
					onClick={() => {
						/* PDF download wiring deferred to hosting platform selection */
					}}
					style={subtleButtonStyle}
					title={`PDF: ${header.pdf.repoRelativePath}`}
					type="button"
				>
					Download PDF
				</button>
			) : null}

			<Link style={linkButtonStyle} to="/tracker">
				View in tracker
			</Link>

			<Link style={linkButtonStyle} to="/evaluate">
				Re-evaluate
			</Link>

			{repoRelativePath ? (
				<Link
					style={linkButtonStyle}
					to={`/artifacts?report=${encodeURIComponent(repoRelativePath)}`}
				>
					Browse artifacts
				</Link>
			) : null}
		</nav>
	);
}

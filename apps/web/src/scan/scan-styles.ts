import type { CSSProperties } from "react";

export const scanPanel: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-3)",
	padding: "var(--jh-space-4)",
};

export const scanListingRow: CSSProperties = {
	alignItems: "start",
	background: "var(--jh-color-scan-row-bg)",
	border: "1px solid var(--jh-color-scan-row-border)",
	borderRadius: "var(--jh-radius-sm)",
	color: "var(--jh-color-text-primary)",
	cursor: "pointer",
	display: "grid",
	gap: "var(--jh-space-1)",
	minHeight: "var(--jh-dense-row-height)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
	textAlign: "left" as const,
};

export const scanListingRowSelected: CSSProperties = {
	...scanListingRow,
	background: "var(--jh-color-scan-row-selected-bg)",
	border: "1px solid var(--jh-color-scan-row-selected-border)",
};

export const scanBucketBadge: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	fontSize: "var(--jh-text-caption-size)",
	fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
	padding: "0.2rem 0.55rem",
};

export const scanActionButton: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
	minHeight: "2.3rem",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

export const scanSubtleButton: CSSProperties = {
	background: "rgba(15, 23, 42, 0.08)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-text-primary)",
	cursor: "pointer",
	font: "inherit",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)" as unknown as number,
	minHeight: "2.2rem",
	padding: "var(--jh-space-1) var(--jh-space-3)",
};

export const scanStatCard: CSSProperties = {
	background: "var(--jh-color-scan-row-bg)",
	border: "1px solid var(--jh-color-scan-row-border)",
	borderRadius: "var(--jh-radius-sm)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

export const scanNoticeInfo: CSSProperties = {
	background: "var(--jh-color-severity-info-bg)",
	borderColor: "var(--jh-color-status-running-border)",
};

export const scanNoticeSuccess: CSSProperties = {
	background: "var(--jh-color-status-ready-bg)",
	borderColor: "var(--jh-color-status-ready-border)",
};

export const scanNoticeWarn: CSSProperties = {
	background: "var(--jh-color-status-offline-bg)",
	borderColor: "var(--jh-color-status-offline-border)",
};

export const scanWarning: CSSProperties = {
	background: "var(--jh-color-status-warning-bg)",
	border: "1px solid var(--jh-color-status-warning-border)",
	borderRadius: "var(--jh-radius-sm)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

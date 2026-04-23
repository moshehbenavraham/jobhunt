import type { CSSProperties } from "react";

export const trackerPanel: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-3)",
	padding: "var(--jh-space-4)",
};

export const trackerRow: CSSProperties = {
	alignItems: "center",
	background: "var(--jh-color-tracker-row-bg)",
	border: "1px solid var(--jh-color-tracker-row-border)",
	borderRadius: "var(--jh-radius-sm)",
	cursor: "pointer",
	display: "grid",
	gap: "var(--jh-space-2)",
	gridTemplateColumns: "3rem 1fr auto",
	minHeight: "var(--jh-dense-row-height)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

export const trackerRowSelected: CSSProperties = {
	...trackerRow,
	background: "var(--jh-color-tracker-row-selected-bg)",
	border: "1px solid var(--jh-color-tracker-row-selected-border)",
};

export const trackerFilterBar: CSSProperties = {
	background: "var(--jh-color-tracker-filter-bar-bg)",
	border: "1px solid var(--jh-color-tracker-filter-bar-border)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "var(--jh-space-3)",
	padding: "var(--jh-space-3) var(--jh-space-4)",
	position: "sticky",
	top: 0,
	zIndex: 10,
};

export const trackerButton: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
	minHeight: "2.4rem",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

export const trackerSubtleButton: CSSProperties = {
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

export const trackerInput: CSSProperties = {
	background: "var(--jh-color-input-bg)",
	border: "1px solid rgba(148, 163, 184, 0.4)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-text-primary)",
	font: "inherit",
	fontSize: "var(--jh-text-body-sm-size)",
	minHeight: "var(--jh-dense-row-height)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

export const trackerStatCard: CSSProperties = {
	background: "var(--jh-color-tracker-row-bg)",
	border: "1px solid var(--jh-color-tracker-row-border)",
	borderRadius: "var(--jh-radius-sm)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

export const trackerWarning: CSSProperties = {
	background: "var(--jh-color-status-warning-bg)",
	border: "1px solid var(--jh-color-status-warning-border)",
	borderRadius: "var(--jh-radius-sm)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

export const trackerNoticeInfo: CSSProperties = {
	background: "var(--jh-color-severity-info-bg)",
	borderColor: "var(--jh-color-status-running-border)",
};

export const trackerNoticeSuccess: CSSProperties = {
	background: "var(--jh-color-status-ready-bg)",
	borderColor: "var(--jh-color-status-ready-border)",
};

export const trackerNoticeWarn: CSSProperties = {
	background: "var(--jh-color-status-offline-bg)",
	borderColor: "var(--jh-color-status-offline-border)",
};

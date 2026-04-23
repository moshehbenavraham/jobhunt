import type { CSSProperties } from "react";

type EvidenceRailProps = {
	className?: string;
	inline?: boolean;
};

const railStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-xl)",
	display: "grid",
	gap: "var(--jh-space-gap)",
	padding: "var(--jh-space-padding)",
};

const drawerContentStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-gap)",
	padding: "var(--jh-space-padding)",
};

const emptyStateStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	textAlign: "center" as const,
};

function EvidenceRailContent() {
	return (
		<>
			<div>
				<p
					style={{
						color: "var(--jh-color-label-fg)",
						letterSpacing: "0.08em",
						marginBottom: "0.35rem",
						textTransform: "uppercase",
					}}
				>
					Evidence
				</p>
				<h3 style={{ marginBottom: "0.35rem" }}>Context and details</h3>
			</div>
			<div style={emptyStateStyle}>
				<p style={{ marginBottom: "0.35rem" }}>
					Select an item in the main view to see supporting details here.
				</p>
				<p
					style={{
						color: "var(--jh-color-text-secondary)",
						fontSize: "var(--jh-text-body-sm-size)",
					}}
				>
					Reports, scores, and related context will appear in this area as you
					work.
				</p>
			</div>
		</>
	);
}

export function EvidenceRail({ className, inline = true }: EvidenceRailProps) {
	if (!inline) {
		return (
			<div style={drawerContentStyle}>
				<EvidenceRailContent />
			</div>
		);
	}

	return (
		<aside
			aria-label="Evidence and context"
			className={className}
			style={railStyle}
		>
			<EvidenceRailContent />
		</aside>
	);
}

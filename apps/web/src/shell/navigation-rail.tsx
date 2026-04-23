import type { CSSProperties } from "react";
import { NavLink } from "react-router";
import { SPECIALIST_WORKSPACE_MODE_VALUES } from "../workflows/specialist-workspace-types";
import {
	type OperatorShellSummaryPayload,
	SHELL_SURFACES,
	type ShellSurfaceId,
} from "./shell-types";
import type { NavigationRailVariant } from "./use-responsive-layout";

type NavigationRailProps = {
	onDrawerClose?: () => void;
	summary: OperatorShellSummaryPayload | null;
	variant?: NavigationRailVariant;
};

export const SURFACE_ICON_MAP: Record<ShellSurfaceId, string> = {
	home: "H",
	startup: "S",
	chat: "C",
	workflows: "W",
	scan: "R",
	batch: "B",
	"application-help": "A",
	pipeline: "P",
	tracker: "T",
	artifacts: "F",
	onboarding: "O",
	approvals: "!",
	settings: "*",
};

type NavBadge = {
	count?: number;
	label: string;
	tone: "attention" | "info" | "neutral" | "positive";
};

const railStyle: CSSProperties = {
	background: "var(--jh-color-nav-bg)",
	border: "var(--jh-border-width) solid var(--jh-color-nav-border)",
	borderRadius: "var(--jh-radius-xl)",
	color: "var(--jh-color-nav-text)",
	display: "grid",
	gap: "var(--jh-space-gap)",
	padding: "var(--jh-space-gap)",
};

const listStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-3)",
	listStyle: "none",
	margin: 0,
	padding: 0,
};

const badgeToneStyles: Record<NonNullable<NavBadge["tone"]>, CSSProperties> = {
	attention: {
		background: "var(--jh-color-badge-attention-bg)",
		color: "var(--jh-color-badge-attention-fg)",
	},
	info: {
		background: "var(--jh-color-badge-info-bg)",
		color: "var(--jh-color-badge-info-fg)",
	},
	neutral: {
		background: "var(--jh-color-badge-neutral-bg)",
		color: "var(--jh-color-badge-neutral-fg)",
	},
	positive: {
		background: "var(--jh-color-badge-positive-bg)",
		color: "var(--jh-color-badge-positive-fg)",
	},
};

function formatStatusLabel(
	status: OperatorShellSummaryPayload["status"],
): string {
	switch (status) {
		case "auth-required":
			return "Auth";
		case "expired-auth":
			return "Refresh";
		case "invalid-auth":
			return "Repair";
		case "missing-prerequisites":
			return "Setup";
		case "prompt-failure":
			return "Prompt";
		case "ready":
			return "Ready";
		case "runtime-error":
			return "Blocked";
	}
}

function getBadge(
	summary: OperatorShellSummaryPayload | null,
	surfaceId: ShellSurfaceId,
): NavBadge | null {
	if (!summary) {
		return null;
	}

	switch (surfaceId) {
		case "home":
			if (summary.activity.pendingApprovalCount > 0) {
				return {
					count: summary.activity.pendingApprovalCount,
					label: "Now",
					tone: "attention",
				};
			}

			if (summary.activity.activeSessionCount > 0) {
				return {
					count: summary.activity.activeSessionCount,
					label: "Live",
					tone: "info",
				};
			}

			return {
				label: summary.status === "ready" ? "Ready" : "Setup",
				tone: summary.status === "ready" ? "positive" : "neutral",
			};
		case "startup":
			return {
				label: formatStatusLabel(summary.status),
				tone: summary.health.status === "ok" ? "positive" : "info",
			};
		case "chat":
			if (summary.activity.activeSessionCount > 0) {
				return {
					count: summary.activity.activeSessionCount,
					label: "Live",
					tone:
						summary.activity.state === "attention-required"
							? "attention"
							: "info",
				};
			}

			return {
				label: summary.activity.state === "idle" ? "Idle" : "Queue",
				tone: "neutral",
			};
		case "workflows":
			if (
				summary.activity.activeSession &&
				SPECIALIST_WORKSPACE_MODE_VALUES.includes(
					summary.activity.activeSession
						.workflow as (typeof SPECIALIST_WORKSPACE_MODE_VALUES)[number],
				)
			) {
				const isApprovalPause =
					summary.activity.activeSession.activeJob?.waitReason === "approval" ||
					summary.activity.activeSession.status === "waiting";

				return {
					label: isApprovalPause ? "Paused" : "Live",
					tone: isApprovalPause ? "attention" : "info",
				};
			}

			return {
				label: summary.status === "ready" ? "Review" : "Setup",
				tone: summary.status === "ready" ? "info" : "neutral",
			};
		case "scan":
			if (summary.activity.activeSession?.workflow === "scan-portals") {
				return {
					label: "Live",
					tone:
						summary.activity.state === "attention-required"
							? "attention"
							: "info",
				};
			}

			return {
				label: summary.status === "ready" ? "Ready" : "Setup",
				tone: summary.status === "ready" ? "info" : "neutral",
			};
		case "batch":
			if (summary.activity.activeSession?.workflow === "batch-evaluation") {
				const isApprovalPause =
					summary.activity.activeSession.activeJob?.waitReason === "approval" ||
					summary.activity.activeSession.status === "waiting";

				return {
					label: isApprovalPause ? "Paused" : "Live",
					tone: isApprovalPause ? "attention" : "info",
				};
			}

			return {
				label: summary.status === "ready" ? "Review" : "Setup",
				tone: summary.status === "ready" ? "info" : "neutral",
			};
		case "application-help":
			if (summary.activity.activeSession?.workflow === "application-help") {
				const isApprovalPause =
					summary.activity.activeSession.activeJob?.waitReason === "approval" ||
					summary.activity.activeSession.status === "waiting";

				return {
					label: isApprovalPause ? "Paused" : "Live",
					tone: isApprovalPause ? "attention" : "info",
				};
			}

			return {
				label: summary.status === "ready" ? "Drafts" : "Setup",
				tone: summary.status === "ready" ? "info" : "neutral",
			};
		case "artifacts":
			return {
				label: summary.status === "ready" ? "Review" : "Read-only",
				tone: summary.status === "ready" ? "info" : "neutral",
			};
		case "pipeline":
			return {
				label: summary.status === "ready" ? "Queue" : "Read-only",
				tone: summary.status === "ready" ? "info" : "neutral",
			};
		case "tracker":
			return {
				label: summary.status === "ready" ? "Closeout" : "Read-only",
				tone: summary.status === "ready" ? "info" : "neutral",
			};
		case "onboarding":
			if (summary.health.missing.onboarding > 0) {
				return {
					count: summary.health.missing.onboarding,
					label: "Fix",
					tone: "attention",
				};
			}

			return {
				label: "Ready",
				tone: "positive",
			};
		case "approvals":
			return {
				count: summary.activity.pendingApprovalCount,
				label: "Pending",
				tone:
					summary.activity.pendingApprovalCount > 0 ? "attention" : "neutral",
			};
		case "settings":
			return {
				label: summary.health.ok ? "Stable" : "Review",
				tone: summary.health.ok ? "positive" : "info",
			};
	}
}

const collapsedRailStyle: CSSProperties = {
	...railStyle,
	padding: "var(--jh-space-2)",
	width: "var(--jh-zone-rail-collapsed-width)",
};

const collapsedItemBase: CSSProperties = {
	alignItems: "center",
	background: "var(--jh-color-nav-item-bg)",
	border: "var(--jh-border-width) solid var(--jh-color-surface-border)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-nav-text)",
	display: "flex",
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)",
	height: "36px",
	justifyContent: "center",
	textDecoration: "none",
	width: "100%",
};

const fullItemBase: CSSProperties = {
	alignItems: "center",
	background: "var(--jh-color-nav-item-bg)",
	border: "var(--jh-border-width) solid var(--jh-color-surface-border)",
	borderRadius: "var(--jh-radius-lg)",
	color: "var(--jh-color-nav-text)",
	display: "grid",
	gap: "var(--jh-space-1)",
	padding: "var(--jh-space-padding-sm) var(--jh-space-padding)",
	textDecoration: "none",
};

const activeItemOverrides: CSSProperties = {
	background: "var(--jh-color-nav-item-selected-bg)",
	border:
		"var(--jh-border-width) solid var(--jh-color-nav-item-selected-border)",
};

export function NavigationRail({
	onDrawerClose,
	summary,
	variant = "full",
}: NavigationRailProps) {
	if (variant === "hidden") {
		return null;
	}

	if (variant === "collapsed") {
		return (
			<nav
				aria-label="Operator workbench navigation"
				style={collapsedRailStyle}
			>
				<ul style={{ ...listStyle, gap: "var(--jh-space-2)" }}>
					{SHELL_SURFACES.map((surface) => (
						<li key={surface.id}>
							<NavLink
								aria-label={surface.label}
								end={surface.path === "/"}
								onClick={onDrawerClose}
								style={({ isActive }) => ({
									...collapsedItemBase,
									...(isActive ? activeItemOverrides : undefined),
								})}
								title={surface.label}
								to={surface.path}
							>
								{SURFACE_ICON_MAP[surface.id]}
							</NavLink>
						</li>
					))}
				</ul>
			</nav>
		);
	}

	return (
		<nav aria-label="Operator workbench navigation" style={railStyle}>
			<div>
				<p
					style={{
						color: "var(--jh-color-nav-accent)",
						letterSpacing: "0.08em",
						margin: 0,
						textTransform: "uppercase",
					}}
				>
					Workbench
				</p>
				<h2
					style={{
						fontSize: "var(--jh-text-h3-size)",
						marginBottom: "0.35rem",
					}}
				>
					Navigation
				</h2>
				<p
					style={{
						color: "var(--jh-color-nav-muted)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
					Jump to any area. Press Ctrl+K to search.
				</p>
			</div>

			<ul style={listStyle}>
				{SHELL_SURFACES.map((surface) => {
					const badge = getBadge(summary, surface.id);

					return (
						<li key={surface.id}>
							<NavLink
								end={surface.path === "/"}
								onClick={onDrawerClose}
								style={({ isActive }) => ({
									...fullItemBase,
									...(isActive ? activeItemOverrides : undefined),
								})}
								to={surface.path}
							>
								<div
									style={{
										alignItems: "center",
										display: "flex",
										gap: "0.6rem",
										justifyContent: "space-between",
									}}
								>
									<strong>{surface.label}</strong>
									{badge ? (
										<span
											style={{
												...badgeToneStyles[badge.tone],
												borderRadius: "var(--jh-radius-pill)",
												display: "inline-flex",
												fontSize: "var(--jh-text-caption-size)",
												fontWeight: "var(--jh-font-weight-bold)",
												gap: "var(--jh-space-1)",
												padding: "0.2rem 0.55rem",
											}}
										>
											{badge.count !== undefined ? (
												<span>{badge.count}</span>
											) : null}
											<span>{badge.label}</span>
										</span>
									) : null}
								</div>
								<span
									style={{
										color: "var(--jh-color-nav-muted)",
										fontSize: "var(--jh-text-body-sm-size)",
									}}
								>
									{surface.description}
								</span>
							</NavLink>
						</li>
					);
				})}
			</ul>

			{summary ? (
				<section
					style={{
						background: "var(--jh-color-nav-item-bg)",
						border:
							"var(--jh-border-width) solid var(--jh-color-surface-border)",
						borderRadius: "var(--jh-radius-lg)",
						padding: "var(--jh-space-padding-sm)",
					}}
				>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: "0.35rem",
							marginTop: 0,
						}}
					>
						Current context
					</p>
					<p style={{ margin: 0 }}>
						<strong>{summary.currentSession.id}</strong>
					</p>
					<p style={{ color: "var(--jh-color-nav-muted)", marginBottom: 0 }}>
						{summary.currentSession.packagePath ?? "All packages"}
					</p>
				</section>
			) : null}
		</nav>
	);
}

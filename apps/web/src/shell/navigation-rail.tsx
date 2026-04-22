import type { CSSProperties, MouseEvent } from "react";
import { SPECIALIST_WORKSPACE_MODE_VALUES } from "../workflows/specialist-workspace-types";
import {
	type OperatorShellSummaryPayload,
	SHELL_SURFACES,
	type ShellSurfaceId,
} from "./shell-types";

type NavigationRailProps = {
	currentSurface: ShellSurfaceId;
	onSelect: (surfaceId: ShellSurfaceId) => void;
	summary: OperatorShellSummaryPayload | null;
};

type NavBadge = {
	count?: number;
	label: string;
	tone: "attention" | "info" | "neutral" | "positive";
};

const railStyle: CSSProperties = {
	backdropFilter: "blur(14px)",
	background: "rgba(15, 23, 42, 0.9)",
	border: "1px solid rgba(148, 163, 184, 0.22)",
	borderRadius: "1.5rem",
	color: "#f8fafc",
	display: "grid",
	gap: "1rem",
	padding: "1rem",
};

const listStyle: CSSProperties = {
	display: "grid",
	gap: "0.75rem",
	listStyle: "none",
	margin: 0,
	padding: 0,
};

const badgeToneStyles: Record<NonNullable<NavBadge["tone"]>, CSSProperties> = {
	attention: {
		background: "#fde68a",
		color: "#7c2d12",
	},
	info: {
		background: "#bfdbfe",
		color: "#1d4ed8",
	},
	neutral: {
		background: "#e2e8f0",
		color: "#334155",
	},
	positive: {
		background: "#bbf7d0",
		color: "#166534",
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

export function NavigationRail({
	currentSurface,
	onSelect,
	summary,
}: NavigationRailProps) {
	return (
		<nav aria-label="Operator shell surfaces" style={railStyle}>
			<div>
				<p
					style={{
						color: "#fbbf24",
						letterSpacing: "0.08em",
						margin: 0,
						textTransform: "uppercase",
					}}
				>
					Phase 06 shell
				</p>
				<h2 style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
					Operator navigation
				</h2>
				<p style={{ color: "#cbd5e1", marginBottom: 0, marginTop: 0 }}>
					One stable frame for startup, chat, specialist workflows, scan review,
					batch supervision, application-help review, queue review, tracker
					closeout, and settings.
				</p>
			</div>

			<ul style={listStyle}>
				{SHELL_SURFACES.map((surface) => {
					const isSelected = surface.id === currentSurface;
					const badge = getBadge(summary, surface.id);

					return (
						<li key={surface.id}>
							<a
								aria-controls={`surface-${surface.id}`}
								aria-current={isSelected ? "page" : undefined}
								href={`#${surface.id}`}
								onClick={(event: MouseEvent<HTMLAnchorElement>) => {
									event.preventDefault();
									onSelect(surface.id);
								}}
								style={{
									alignItems: "center",
									background: isSelected
										? "rgba(248, 250, 252, 0.14)"
										: "rgba(15, 23, 42, 0.4)",
									border: isSelected
										? "1px solid rgba(251, 191, 36, 0.7)"
										: "1px solid rgba(148, 163, 184, 0.18)",
									borderRadius: "1.15rem",
									color: "#f8fafc",
									display: "grid",
									gap: "0.35rem",
									padding: "0.9rem 1rem",
									textDecoration: "none",
								}}
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
												borderRadius: "999px",
												display: "inline-flex",
												fontSize: "0.82rem",
												fontWeight: 700,
												gap: "0.35rem",
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
								<span style={{ color: "#cbd5e1", fontSize: "0.92rem" }}>
									{surface.description}
								</span>
							</a>
						</li>
					);
				})}
			</ul>

			{summary ? (
				<section
					style={{
						background: "rgba(15, 23, 42, 0.45)",
						border: "1px solid rgba(148, 163, 184, 0.18)",
						borderRadius: "1.15rem",
						padding: "0.85rem 0.95rem",
					}}
				>
					<p
						style={{ color: "#94a3b8", marginBottom: "0.35rem", marginTop: 0 }}
					>
						Current spec session
					</p>
					<p style={{ margin: 0 }}>
						<strong>{summary.currentSession.id}</strong>
					</p>
					<p style={{ color: "#cbd5e1", marginBottom: 0 }}>
						{summary.currentSession.packagePath ?? "Cross-cutting package"}
					</p>
				</section>
			) : null}
		</nav>
	);
}

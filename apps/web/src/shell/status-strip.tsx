import type { CSSProperties } from "react";
import type { OperatorShellClientError } from "./operator-shell-client";
import type {
	OperatorShellStartupStatus,
	OperatorShellSummaryPayload,
} from "./shell-types";
import type { OperatorShellViewStatus } from "./use-operator-shell";

type StatusStripProps = {
	error: OperatorShellClientError | null;
	isRefreshing: boolean;
	lastUpdatedAt: string | null;
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onRefresh: () => void;
	status: OperatorShellViewStatus;
	summary: OperatorShellSummaryPayload | null;
};

const panelStyle: CSSProperties = {
	backdropFilter: "blur(16px)",
	background:
		"linear-gradient(135deg, rgba(255, 250, 240, 0.92) 0%, rgba(248, 250, 252, 0.94) 58%, rgba(237, 233, 254, 0.58) 100%)",
	border: "1px solid rgba(148, 163, 184, 0.22)",
	borderRadius: "1.8rem",
	display: "grid",
	gap: "1rem",
	padding: "1.25rem 1.35rem",
};

const cardGridStyle: CSSProperties = {
	display: "grid",
	gap: "0.95rem",
	gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
};

const cardStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.76)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.2rem",
	minHeight: "100%",
	padding: "0.95rem 1rem",
};

const buttonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	fontSize: "0.95rem",
	fontWeight: 700,
	minWidth: "12rem",
	padding: "0.8rem 1rem",
};

function formatTimestamp(value: string | null): string {
	if (!value) {
		return "Not loaded yet";
	}

	const date = new Date(value);

	if (Number.isNaN(date.valueOf())) {
		return value;
	}

	return date.toLocaleString();
}

function getStatusTone(status: OperatorShellStartupStatus): {
	accent: string;
	background: string;
	label: string;
} {
	switch (status) {
		case "ready":
			return {
				accent: "#166534",
				background: "#dcfce7",
				label: "Ready",
			};
		case "missing-prerequisites":
			return {
				accent: "#9a3412",
				background: "#ffedd5",
				label: "Setup required",
			};
		case "runtime-error":
			return {
				accent: "#991b1b",
				background: "#fee2e2",
				label: "Runtime blocked",
			};
		case "auth-required":
			return {
				accent: "#1d4ed8",
				background: "#dbeafe",
				label: "Auth required",
			};
		case "expired-auth":
			return {
				accent: "#7c2d12",
				background: "#fed7aa",
				label: "Auth expired",
			};
		case "invalid-auth":
			return {
				accent: "#7c2d12",
				background: "#ffedd5",
				label: "Auth invalid",
			};
		case "prompt-failure":
			return {
				accent: "#7c3aed",
				background: "#ede9fe",
				label: "Prompt issue",
			};
	}
}

function getFallbackSummary(status: OperatorShellViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Reading the app-first landing state, approvals, and runtime activity from the local API.",
				title: "Loading operator home shell",
			};
		case "offline":
			return {
				body: "The API is unavailable. Start `npm run app:api:serve` and refresh.",
				title: "Shell summary offline",
			};
		case "error":
			return {
				body: "The shared shell summary failed before it could render the operator-home status cards.",
				title: "Shell summary error",
			};
		default:
			return {
				body: "Refresh to request the first operator-shell summary payload.",
				title: "Waiting for shell summary",
			};
	}
}

export function StatusStrip({
	error,
	isRefreshing,
	lastUpdatedAt,
	onOpenApprovals,
	onRefresh,
	status,
	summary,
}: StatusStripProps) {
	if (!summary) {
		const fallback = getFallbackSummary(status);

		return (
			<section style={panelStyle}>
				<div
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "1rem",
						justifyContent: "space-between",
					}}
				>
					<div>
						<p
							style={{
								color: "#7c2d12",
								letterSpacing: "0.08em",
								marginBottom: "0.45rem",
								marginTop: 0,
								textTransform: "uppercase",
							}}
						>
							Operator shell
						</p>
						<h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", margin: 0 }}>
							{fallback.title}
						</h1>
						<p style={{ color: "#475569", marginBottom: 0 }}>{fallback.body}</p>
					</div>
					<button
						aria-label="Refresh operator shell summary"
						disabled={isRefreshing}
						onClick={onRefresh}
						style={{
							...buttonStyle,
							opacity: isRefreshing ? 0.7 : 1,
						}}
						type="button"
					>
						{isRefreshing ? "Refreshing shell..." : "Refresh shell"}
					</button>
				</div>

				{error ? (
					<section
						style={{
							...cardStyle,
							background: "#fff7ed",
							borderColor: "#fed7aa",
						}}
					>
						<h2 style={{ marginTop: 0 }}>Most recent client message</h2>
						<p style={{ marginBottom: 0 }}>{error.message}</p>
					</section>
				) : null}
			</section>
		);
	}

	const tone = getStatusTone(summary.status);
	const hasDegradedClientState = status === "offline" || status === "error";
	const approvalFocus = summary.activity.latestPendingApprovals[0]
		? {
				approvalId: summary.activity.latestPendingApprovals[0].approvalId,
				sessionId: summary.activity.latestPendingApprovals[0].sessionId,
			}
		: summary.activity.recentFailures[0]
			? {
					approvalId: null,
					sessionId: summary.activity.recentFailures[0].sessionId,
				}
			: summary.activity.activeSession
				? {
						approvalId: null,
						sessionId: summary.activity.activeSession.sessionId,
					}
				: null;
	const approvalHeading =
		summary.activity.pendingApprovalCount > 0
			? `${summary.activity.pendingApprovalCount} pending`
			: summary.activity.recentFailureCount > 0
				? `${summary.activity.recentFailureCount} interrupted`
				: "No review work waiting";
	const approvalBody =
		summary.activity.pendingApprovalCount > 0
			? (summary.activity.latestPendingApprovals[0]?.title ??
				"Pending approvals require review in the inbox.")
			: summary.activity.recentFailureCount > 0
				? "Recent failed runs can be reopened from the approval inbox."
				: "No approval work is waiting right now.";

	return (
		<section style={panelStyle}>
			<div
				style={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "1rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<p
						style={{
							color: "#7c2d12",
							letterSpacing: "0.08em",
							marginBottom: "0.45rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Operator shell
					</p>
					<h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", margin: 0 }}>
						App-first operator home
					</h1>
					<p style={{ color: "#475569", marginBottom: "0.35rem" }}>
						{summary.message}
					</p>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Last refreshed: {formatTimestamp(lastUpdatedAt)}
					</p>
				</div>

				<div
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "0.75rem",
					}}
				>
					<span
						style={{
							background: tone.background,
							borderRadius: "999px",
							color: tone.accent,
							display: "inline-flex",
							fontWeight: 700,
							padding: "0.35rem 0.8rem",
						}}
					>
						{tone.label}
					</span>
					<button
						aria-label="Refresh operator shell summary"
						disabled={isRefreshing}
						onClick={onRefresh}
						style={{
							...buttonStyle,
							opacity: isRefreshing ? 0.7 : 1,
						}}
						type="button"
					>
						{isRefreshing ? "Refreshing shell..." : "Refresh shell"}
					</button>
				</div>
			</div>

			{hasDegradedClientState ? (
				<section
					style={{
						...cardStyle,
						background: status === "offline" ? "#fef3c7" : "#fee2e2",
						borderColor: status === "offline" ? "#fcd34d" : "#fecaca",
					}}
				>
					<h2 style={{ marginTop: 0 }}>
						{status === "offline"
							? "Offline after the last good summary"
							: "Shell summary error after the last good summary"}
					</h2>
					<p style={{ marginBottom: 0 }}>
						{error?.message ??
							"The shared status view degraded after its previous successful refresh."}
					</p>
				</section>
			) : null}

			<div style={cardGridStyle}>
				<article style={cardStyle}>
					<p
						style={{ color: "#64748b", marginBottom: "0.35rem", marginTop: 0 }}
					>
						Home readiness
					</p>
					<h2 style={{ marginBottom: "0.4rem", marginTop: 0 }}>{tone.label}</h2>
					<p style={{ marginBottom: "0.35rem" }}>{summary.health.message}</p>
					<p style={{ color: "#475569", marginBottom: 0 }}>
						Missing: onboarding {summary.health.missing.onboarding}, optional{" "}
						{summary.health.missing.optional}, runtime{" "}
						{summary.health.missing.runtime}
					</p>
				</article>

				<article style={cardStyle}>
					<p
						style={{ color: "#64748b", marginBottom: "0.35rem", marginTop: 0 }}
					>
						Daily path
					</p>
					<h2 style={{ marginBottom: "0.4rem", marginTop: 0 }}>
						{summary.activity.activeSession
							? summary.activity.activeSession.workflow
							: "No active runtime"}
					</h2>
					<p style={{ marginBottom: "0.35rem" }}>
						{summary.activity.activeSession
							? `Session ${summary.activity.activeSession.sessionId} is ${summary.activity.activeSession.status}.`
							: "No running or waiting runtime session is attached to the app-owned daily path right now."}
					</p>
					<p style={{ color: "#475569", marginBottom: 0 }}>
						Active sessions: {summary.activity.activeSessionCount}
					</p>
				</article>

				<article style={cardStyle}>
					<p
						style={{ color: "#64748b", marginBottom: "0.35rem", marginTop: 0 }}
					>
						Approvals
					</p>
					<h2 style={{ marginBottom: "0.4rem", marginTop: 0 }}>
						{approvalHeading}
					</h2>
					<p style={{ marginBottom: "0.35rem" }}>{approvalBody}</p>
					<p style={{ color: "#475569", marginBottom: 0 }}>
						{approvalFocus
							? "Open the inbox to review live approvals or interrupted runs."
							: "Approval badge is kept live in the left rail."}
					</p>
					{approvalFocus ? (
						<button
							aria-label="Open approval inbox"
							onClick={() => onOpenApprovals(approvalFocus)}
							style={{
								...buttonStyle,
								marginTop: "0.85rem",
							}}
							type="button"
						>
							Open approval inbox
						</button>
					) : null}
				</article>

				<article style={cardStyle}>
					<p
						style={{ color: "#64748b", marginBottom: "0.35rem", marginTop: 0 }}
					>
						Current spec session
					</p>
					<h2 style={{ marginBottom: "0.4rem", marginTop: 0 }}>
						{summary.currentSession.id}
					</h2>
					<p style={{ marginBottom: "0.35rem" }}>
						Package: {summary.currentSession.packagePath ?? "cross-cutting"}
					</p>
					<p style={{ color: "#475569", marginBottom: 0 }}>
						Recent failures: {summary.activity.recentFailureCount}
					</p>
				</article>
			</div>
		</section>
	);
}

import { type CSSProperties, useEffect, useRef } from "react";
import type { OperatorHomeAction } from "./operator-home-types";
import type { OperatorHomeState } from "./use-operator-home";

type OperatorHomeSurfaceProps = {
	onRefresh: () => void;
	onRunAction: (action: OperatorHomeAction) => void;
	state: OperatorHomeState;
};

const pageStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const heroStyle: CSSProperties = {
	background:
		"linear-gradient(145deg, rgba(255, 247, 237, 0.96) 0%, rgba(255, 255, 255, 0.94) 52%, rgba(240, 249, 255, 0.88) 100%)",
	border: "1px solid rgba(148, 163, 184, 0.22)",
	borderRadius: "1.45rem",
	display: "grid",
	gap: "1rem",
	padding: "1rem 1.1rem",
};

const cardGridStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
};

const cardStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.94)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	display: "grid",
	gap: "0.9rem",
	minHeight: "100%",
	padding: "1rem",
};

const badgeStyle: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	display: "inline-flex",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-bold)",
	padding: "0.3rem 0.75rem",
};

const actionRowStyle: CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	gap: "0.65rem",
};

const actionButtonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: "var(--jh-font-weight-bold)",
	minHeight: "2.7rem",
	padding: "0.7rem 0.95rem",
};

function formatTimestamp(value: string | null): string {
	if (!value) {
		return "Not refreshed yet";
	}

	const date = new Date(value);

	if (Number.isNaN(date.valueOf())) {
		return value;
	}

	return date.toLocaleString();
}

function getStateTone(state: {
	value:
		| "attention-required"
		| "auth-required"
		| "degraded"
		| "expired-auth"
		| "error"
		| "invalid-auth"
		| "idle"
		| "loading"
		| "missing-prerequisites"
		| "offline"
		| "prompt-failure"
		| "ready"
		| "runtime-error";
}): {
	accent: string;
	background: string;
	label: string;
} {
	switch (state.value) {
		case "ready":
			return {
				accent: "#166534",
				background: "#dcfce7",
				label: "Ready",
			};
		case "auth-required":
		case "expired-auth":
		case "invalid-auth":
		case "missing-prerequisites":
		case "attention-required":
			return {
				accent: "#9a3412",
				background: "#ffedd5",
				label: "Needs attention",
			};
		case "prompt-failure":
		case "runtime-error":
		case "degraded":
			return {
				accent: "#1d4ed8",
				background: "#dbeafe",
				label: "Degraded",
			};
		case "idle":
			return {
				accent: "#475569",
				background: "#e2e8f0",
				label: "Idle",
			};
		case "loading":
			return {
				accent: "#7c3aed",
				background: "#ede9fe",
				label: "Loading",
			};
		case "offline":
			return {
				accent: "#1d4ed8",
				background: "#dbeafe",
				label: "Offline snapshot",
			};
		case "error":
			return {
				accent: "#991b1b",
				background: "#fee2e2",
				label: "Error",
			};
	}
}

function getFallbackCopy(status: OperatorHomeState["status"]): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Composing readiness, live work, closeout, artifacts, and maintenance from the local API.",
				title: "Loading operator home",
			};
		case "offline":
			return {
				body: "The operator-home route is offline. Start `npm run app:api:serve` and refresh.",
				title: "Operator home offline",
			};
		case "error":
			return {
				body: "The latest operator-home request failed before a summary could render.",
				title: "Operator home error",
			};
		default:
			return {
				body: "Open the home surface to request the first operator-home payload.",
				title: "Waiting for operator home",
			};
	}
}

function renderActions(
	actions: readonly OperatorHomeAction[],
	onRunAction: (action: OperatorHomeAction) => void,
) {
	if (actions.length === 0) {
		return null;
	}

	return (
		<div style={actionRowStyle}>
			{actions.map((action) => (
				<button
					key={`${action.id}:${action.label}`}
					onClick={() => onRunAction(action)}
					style={actionButtonStyle}
					title={action.description}
					type="button"
				>
					{action.label}
				</button>
			))}
		</div>
	);
}

export function OperatorHomeSurface({
	onRefresh,
	onRunAction,
	state,
}: OperatorHomeSurfaceProps) {
	const headingRef = useRef<HTMLHeadingElement | null>(null);

	useEffect(() => {
		headingRef.current?.focus();
	}, []);

	if (!state.data) {
		const fallback = getFallbackCopy(state.status);
		const tone = getStateTone({
			value: state.status === "empty" ? "idle" : state.status,
		});

		return (
			<section style={heroStyle}>
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
								color: "#9a3412",
								letterSpacing: "0.08em",
								marginBottom: "0.35rem",
								marginTop: 0,
								textTransform: "uppercase",
							}}
						>
							Operator home
						</p>
						<h2
							ref={headingRef}
							style={{ marginBottom: "0.35rem", marginTop: 0 }}
							tabIndex={-1}
						>
							{fallback.title}
						</h2>
						<p style={{ color: "#475569", marginBottom: 0 }}>{fallback.body}</p>
					</div>
					<div
						style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}
					>
						<span
							style={{
								...badgeStyle,
								background: tone.background,
								color: tone.accent,
							}}
						>
							{tone.label}
						</span>
						<button
							disabled={state.isRefreshing}
							onClick={onRefresh}
							style={{
								...actionButtonStyle,
								opacity: state.isRefreshing ? 0.7 : 1,
							}}
							type="button"
						>
							{state.isRefreshing ? "Refreshing home..." : "Refresh home"}
						</button>
					</div>
				</div>
			</section>
		);
	}

	const { cards } = state.data;
	const heroTone = getStateTone({
		value:
			state.status === "offline" || state.status === "error"
				? state.status
				: cards.readiness.state,
	});

	return (
		<section aria-labelledby="operator-home-title" style={pageStyle}>
			<header style={heroStyle}>
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
								color: "#9a3412",
								letterSpacing: "0.08em",
								marginBottom: "0.35rem",
								marginTop: 0,
								textTransform: "uppercase",
							}}
						>
							Operator home
						</p>
						<h2
							id="operator-home-title"
							ref={headingRef}
							style={{ marginBottom: "0.35rem", marginTop: 0 }}
							tabIndex={-1}
						>
							App-owned daily landing path
						</h2>
						<p style={{ color: "#475569", marginBottom: "0.35rem" }}>
							{state.data.message}
						</p>
						<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
							Phase{" "}
							{state.data.currentSession.phase !== null
								? state.data.currentSession.phase.toString().padStart(2, "0")
								: "--"}{" "}
							| Session `{state.data.currentSession.id}` | Refreshed{" "}
							{formatTimestamp(state.lastUpdatedAt)}
						</p>
					</div>
					<div
						style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}
					>
						<span
							style={{
								...badgeStyle,
								background: heroTone.background,
								color: heroTone.accent,
							}}
						>
							{heroTone.label}
						</span>
						<button
							disabled={state.isRefreshing}
							onClick={onRefresh}
							style={{
								...actionButtonStyle,
								opacity: state.isRefreshing ? 0.7 : 1,
							}}
							type="button"
						>
							{state.isRefreshing ? "Refreshing home..." : "Refresh home"}
						</button>
					</div>
				</div>

				{state.status === "offline" || state.status === "error" ? (
					<section
						style={{
							background: state.status === "offline" ? "#dbeafe" : "#fee2e2",
							border: `1px solid ${state.status === "offline" ? "#bfdbfe" : "#fecaca"}`,
							borderRadius: "1rem",
							padding: "0.85rem 0.9rem",
						}}
					>
						<p
							style={{
								fontWeight: "var(--jh-font-weight-bold)",
								marginBottom: "0.35rem",
								marginTop: 0,
							}}
						>
							{state.status === "offline"
								? "Showing the last known operator-home snapshot."
								: "Showing the last good operator-home snapshot after an error."}
						</p>
						<p style={{ marginBottom: 0, marginTop: 0 }}>
							{state.error?.message ??
								"The current operator-home fetch did not finish cleanly."}
						</p>
					</section>
				) : null}
			</header>

			<div style={cardGridStyle}>
				<article style={cardStyle}>
					<div>
						<p
							style={{
								color: "#9a3412",
								marginBottom: "0.35rem",
								marginTop: 0,
							}}
						>
							Readiness
						</p>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
							{cards.readiness.startupStatus}
						</h3>
						<p style={{ color: "#475569", marginBottom: 0 }}>
							{cards.readiness.message}
						</p>
					</div>

					<div
						style={{
							display: "grid",
							gap: "0.7rem",
							gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))",
						}}
					>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Required files
							</p>
							<strong>{cards.readiness.missing.onboarding}</strong>
						</div>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Runtime blockers
							</p>
							<strong>{cards.readiness.missing.runtime}</strong>
						</div>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Optional drift
							</p>
							<strong>{cards.readiness.missing.optional}</strong>
						</div>
					</div>

					{renderActions(cards.readiness.actions, onRunAction)}
				</article>

				<article style={cardStyle}>
					<div>
						<p
							style={{
								color: "#9a3412",
								marginBottom: "0.35rem",
								marginTop: 0,
							}}
						>
							Live work
						</p>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
							{cards.liveWork.activeSession
								? cards.liveWork.activeSession.workflow
								: "No active workflow"}
						</h3>
						<p style={{ color: "#475569", marginBottom: 0 }}>
							{cards.liveWork.message}
						</p>
					</div>

					<div
						style={{
							display: "grid",
							gap: "0.7rem",
							gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))",
						}}
					>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Active sessions
							</p>
							<strong>{cards.liveWork.activeSessionCount}</strong>
						</div>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Pending approvals
							</p>
							<strong>{cards.liveWork.pendingApprovalCount}</strong>
						</div>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Interrupted runs
							</p>
							<strong>{cards.liveWork.recentFailureCount}</strong>
						</div>
					</div>

					{cards.liveWork.recentFailures.length > 0 ? (
						<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
							{cards.liveWork.recentFailures.slice(0, 2).map((failure) => (
								<li key={failure.runId}>
									{failure.message} ({failure.sessionId})
								</li>
							))}
						</ul>
					) : null}

					{renderActions(cards.liveWork.actions, onRunAction)}
				</article>

				<article style={cardStyle}>
					<div>
						<p
							style={{
								color: "#9a3412",
								marginBottom: "0.35rem",
								marginTop: 0,
							}}
						>
							Approvals
						</p>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
							{cards.approvals.pendingApprovalCount > 0
								? `${cards.approvals.pendingApprovalCount} pending`
								: "No pending approvals"}
						</h3>
						<p style={{ color: "#475569", marginBottom: 0 }}>
							{cards.approvals.message}
						</p>
					</div>

					{cards.approvals.latestPendingApprovals.length > 0 ? (
						<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
							{cards.approvals.latestPendingApprovals.map((approval) => (
								<li key={approval.approvalId}>
									{approval.title || approval.action} ({approval.sessionId})
								</li>
							))}
						</ul>
					) : null}

					{renderActions(cards.approvals.actions, onRunAction)}
				</article>

				<article style={cardStyle}>
					<div>
						<p
							style={{
								color: "#9a3412",
								marginBottom: "0.35rem",
								marginTop: 0,
							}}
						>
							Queue closeout
						</p>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
							Pipeline {cards.closeout.pipeline.pendingCount} pending | Tracker{" "}
							{cards.closeout.tracker.pendingAdditionCount} additions
						</h3>
						<p style={{ color: "#475569", marginBottom: 0 }}>
							{cards.closeout.message}
						</p>
					</div>

					<div
						style={{
							display: "grid",
							gap: "0.7rem",
							gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))",
						}}
					>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Pipeline processed
							</p>
							<strong>{cards.closeout.pipeline.processedCount}</strong>
						</div>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Malformed rows
							</p>
							<strong>{cards.closeout.pipeline.malformedCount}</strong>
						</div>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Tracker rows
							</p>
							<strong>{cards.closeout.tracker.rowCount}</strong>
						</div>
					</div>

					{cards.closeout.pipeline.preview.length > 0 ? (
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.35rem",
									marginTop: 0,
								}}
							>
								Pipeline preview
							</p>
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{cards.closeout.pipeline.preview.map((item) => (
									<li key={`${item.kind}:${item.url}`}>
										{item.company ?? "Unknown company"} -{" "}
										{item.role ?? "Unknown role"}
									</li>
								))}
							</ul>
						</div>
					) : null}

					{cards.closeout.tracker.preview.length > 0 ? (
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.35rem",
									marginTop: 0,
								}}
							>
								Pending tracker additions
							</p>
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{cards.closeout.tracker.preview.map((item) => (
									<li
										key={`${item.entryNumber}:${item.reportNumber ?? "none"}`}
									>
										{item.company ?? "Unknown company"} -{" "}
										{item.role ?? "Unknown role"}
									</li>
								))}
							</ul>
						</div>
					) : null}

					{renderActions(cards.closeout.actions, onRunAction)}
				</article>

				<article style={cardStyle}>
					<div>
						<p
							style={{
								color: "#9a3412",
								marginBottom: "0.35rem",
								marginTop: 0,
							}}
						>
							Artifacts
						</p>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
							{cards.artifacts.totalCount > 0
								? `${cards.artifacts.totalCount} checked-in artifacts`
								: "No artifacts yet"}
						</h3>
						<p style={{ color: "#475569", marginBottom: 0 }}>
							{cards.artifacts.message}
						</p>
					</div>

					{cards.artifacts.items.length > 0 ? (
						<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
							{cards.artifacts.items.map((item) => (
								<li key={item.repoRelativePath}>
									{item.kind.toUpperCase()} - {item.fileName}
								</li>
							))}
						</ul>
					) : null}

					{renderActions(cards.artifacts.actions, onRunAction)}
				</article>

				<article style={cardStyle}>
					<div>
						<p
							style={{
								color: "#9a3412",
								marginBottom: "0.35rem",
								marginTop: 0,
							}}
						>
							Maintenance
						</p>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
							{cards.maintenance.updateCheck.state}
						</h3>
						<p style={{ color: "#475569", marginBottom: 0 }}>
							{cards.maintenance.message}
						</p>
					</div>

					<div
						style={{
							display: "grid",
							gap: "0.7rem",
							gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))",
						}}
					>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Auth
							</p>
							<strong>{cards.maintenance.authState}</strong>
						</div>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Store
							</p>
							<strong>{cards.maintenance.operationalStoreStatus}</strong>
						</div>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								Local version
							</p>
							<strong>
								{cards.maintenance.updateCheck.localVersion ?? "n/a"}
							</strong>
						</div>
					</div>

					{cards.maintenance.commands.length > 0 ? (
						<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
							{cards.maintenance.commands.map((command) => (
								<li key={command.id}>{command.command}</li>
							))}
						</ul>
					) : null}

					{renderActions(cards.maintenance.actions, onRunAction)}
				</article>
			</div>
		</section>
	);
}

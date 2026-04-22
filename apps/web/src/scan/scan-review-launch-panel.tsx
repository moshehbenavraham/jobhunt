import type { CSSProperties } from "react";
import type { ScanReviewFocus } from "./scan-review-client";
import type { ScanReviewSummaryPayload } from "./scan-review-types";
import type { ScanReviewViewStatus } from "./use-scan-review";

type ScanReviewLaunchPanelProps = {
	focus: ScanReviewFocus;
	isBusy: boolean;
	lastUpdatedAt: string | null;
	onClearSessionScope: () => void;
	onLaunch: () => void;
	onRefresh: () => void;
	onScopeToRun: () => void;
	summary: ScanReviewSummaryPayload | null;
	status: ScanReviewViewStatus;
};

const panelStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	display: "grid",
	gap: "0.9rem",
	padding: "1rem",
};

const buttonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.45rem",
	padding: "0.55rem 0.9rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "rgba(15, 23, 42, 0.08)",
	border: "1px solid rgba(148, 163, 184, 0.28)",
	borderRadius: "999px",
	color: "#0f172a",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.25rem",
	padding: "0.45rem 0.8rem",
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

function formatCount(value: number | null): string {
	if (value === null) {
		return "N/A";
	}

	return String(value);
}

function getRunStateLabel(
	state: NonNullable<ScanReviewSummaryPayload>["run"]["state"],
): string {
	switch (state) {
		case "approval-paused":
			return "Approval paused";
		case "completed":
			return "Completed";
		case "degraded":
			return "Degraded";
		case "idle":
			return "Idle";
		case "queued":
			return "Queued";
		case "running":
			return "Running";
	}
}

function getEmptyState(input: { status: ScanReviewViewStatus }): {
	body: string;
	title: string;
} {
	switch (input.status) {
		case "loading":
			return {
				body: "Reading the bounded scan-review summary from the API.",
				title: "Loading scan workspace",
			};
		case "offline":
			return {
				body: "The scan-review endpoint is offline, so launcher readiness and shortlist detail cannot refresh.",
				title: "Scan workspace offline",
			};
		case "error":
			return {
				body: "The scan-review payload could not be parsed into the launcher and shortlist surface.",
				title: "Scan workspace unavailable",
			};
		default:
			return {
				body: "Launch or refresh scan review once the API exposes a shortlist summary.",
				title: "No scan summary yet",
			};
	}
}

export function ScanReviewLaunchPanel({
	focus,
	isBusy,
	lastUpdatedAt,
	onClearSessionScope,
	onLaunch,
	onRefresh,
	onScopeToRun,
	summary,
	status,
}: ScanReviewLaunchPanelProps) {
	if (!summary) {
		const emptyState = getEmptyState({
			status,
		});

		return (
			<section aria-labelledby="scan-launch-panel-title" style={panelStyle}>
				<header>
					<p
						style={{
							color: "#475569",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Phase 05 / Session 02
					</p>
					<h2 id="scan-launch-panel-title" style={{ marginBottom: "0.35rem" }}>
						Scan launcher and run status
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Review launcher readiness, current scan state, and shortlist totals
						without leaving the operator shell.
					</p>
				</header>

				<section
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.95rem",
					}}
				>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
						{emptyState.body}
					</p>
				</section>
			</section>
		);
	}

	const scopeMatchesRun =
		summary.run.sessionId !== null && focus.sessionId === summary.run.sessionId;
	const launchDisabled =
		isBusy || !summary.launcher.available || !summary.launcher.canStart;

	return (
		<section aria-labelledby="scan-launch-panel-title" style={panelStyle}>
			<header
				style={{
					alignItems: "start",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.9rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<p
						style={{
							color: "#475569",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Phase 05 / Session 02
					</p>
					<h2 id="scan-launch-panel-title" style={{ marginBottom: "0.35rem" }}>
						Scan launcher and run status
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						{summary.message}
					</p>
				</div>

				<div style={{ display: "grid", gap: "0.55rem", justifyItems: "end" }}>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
						<button
							aria-label="Refresh scan review"
							disabled={isBusy}
							onClick={onRefresh}
							style={{
								...subtleButtonStyle,
								opacity: isBusy ? 0.7 : 1,
							}}
							type="button"
						>
							Refresh
						</button>
						<button
							aria-label="Launch scan review"
							disabled={launchDisabled}
							onClick={onLaunch}
							style={{
								...buttonStyle,
								opacity: launchDisabled ? 0.7 : 1,
							}}
							type="button"
						>
							{summary.run.state === "running" || summary.run.state === "queued"
								? "Scan already active"
								: "Launch scan"}
						</button>
					</div>
					<span style={{ color: "#64748b", fontSize: "0.92rem" }}>
						Last updated: {formatTimestamp(lastUpdatedAt)}
					</span>
				</div>
			</header>

			<section
				style={{
					background:
						summary.run.state === "degraded"
							? "#fee2e2"
							: summary.run.state === "approval-paused"
								? "#fef3c7"
								: "rgba(248, 250, 252, 0.9)",
					border: `1px solid ${
						summary.run.state === "degraded"
							? "#fecaca"
							: summary.run.state === "approval-paused"
								? "#fde68a"
								: "rgba(148, 163, 184, 0.2)"
					}`,
					borderRadius: "1rem",
					padding: "0.95rem",
				}}
			>
				<div
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "0.6rem",
						justifyContent: "space-between",
						marginBottom: "0.65rem",
					}}
				>
					<div>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							{getRunStateLabel(summary.run.state)}
						</h3>
						<p style={{ color: "#475569", margin: 0 }}>{summary.run.message}</p>
					</div>
					<span
						style={{
							background:
								summary.launcher.canStart && summary.launcher.available
									? "#dbeafe"
									: "#e2e8f0",
							borderRadius: "999px",
							color:
								summary.launcher.canStart && summary.launcher.available
									? "#1d4ed8"
									: "#334155",
							fontSize: "0.85rem",
							fontWeight: 700,
							padding: "0.25rem 0.65rem",
						}}
					>
						{summary.launcher.canStart && summary.launcher.available
							? "Ready to launch"
							: "Launcher guarded"}
					</span>
				</div>

				<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
					{summary.launcher.message}
				</p>
			</section>

			<section
				style={{
					display: "grid",
					gap: "0.8rem",
					gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
				}}
			>
				<article
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
						New offers
					</p>
					<strong style={{ fontSize: "1.2rem" }}>
						{formatCount(summary.run.summary.newOffersAdded)}
					</strong>
				</article>
				<article
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
						Jobs found
					</p>
					<strong style={{ fontSize: "1.2rem" }}>
						{formatCount(summary.run.summary.totalJobsFound)}
					</strong>
				</article>
				<article
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
						Duplicates skipped
					</p>
					<strong style={{ fontSize: "1.2rem" }}>
						{formatCount(summary.run.summary.duplicatesSkipped)}
					</strong>
				</article>
				<article
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
						Current scope
					</p>
					<strong style={{ fontSize: "1rem" }}>
						{focus.sessionId ?? "Latest scan session"}
					</strong>
				</article>
			</section>

			<section
				style={{
					background: "rgba(248, 250, 252, 0.9)",
					border: "1px solid rgba(148, 163, 184, 0.2)",
					borderRadius: "1rem",
					display: "grid",
					gap: "0.75rem",
					padding: "0.9rem",
				}}
			>
				<div>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
						Session scope
					</h3>
					<p style={{ color: "#475569", margin: 0 }}>
						Keep review locked to a specific scan run when you need stable
						ignore or restore history, or clear the scope to follow the newest
						run.
					</p>
				</div>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						disabled={summary.run.sessionId === null || scopeMatchesRun}
						onClick={onScopeToRun}
						style={{
							...subtleButtonStyle,
							opacity:
								summary.run.sessionId === null || scopeMatchesRun ? 0.6 : 1,
						}}
						type="button"
					>
						Scope to current run
					</button>
					<button
						disabled={focus.sessionId === null}
						onClick={onClearSessionScope}
						style={{
							...subtleButtonStyle,
							opacity: focus.sessionId === null ? 0.6 : 1,
						}}
						type="button"
					>
						Clear scope
					</button>
				</div>
			</section>

			{summary.run.warnings.length > 0 ? (
				<section
					style={{
						display: "grid",
						gap: "0.7rem",
					}}
				>
					<h3 style={{ marginBottom: 0, marginTop: 0 }}>Run warnings</h3>
					<div
						style={{
							display: "grid",
							gap: "0.65rem",
						}}
					>
						{summary.run.warnings.map((warning) => (
							<article
								key={`${warning.code}:${warning.message}`}
								style={{
									background: "#fef3c7",
									border: "1px solid #fde68a",
									borderRadius: "0.95rem",
									padding: "0.8rem",
								}}
							>
								<strong
									style={{
										display: "block",
										marginBottom: "0.25rem",
									}}
								>
									{warning.code}
								</strong>
								<p style={{ margin: 0 }}>{warning.message}</p>
							</article>
						))}
					</div>
				</section>
			) : null}
		</section>
	);
}

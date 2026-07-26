import { type CSSProperties, useCallback, useRef } from "react";
import { Link, useParams } from "react-router";

import type { EvaluationResultState } from "../chat/evaluation-result-types";
import type { RunDetailViewState } from "../chat/run-detail-types";
import { useRunDetail } from "../chat/use-run-detail";

/* ----------------------------------------------------------------
   Helper: state badge token mapping
   ---------------------------------------------------------------- */

type BadgeTokens = { bg: string; fg: string };

function getStateBadgeTokens(state: EvaluationResultState): BadgeTokens {
	switch (state) {
		case "completed":
			return {
				bg: "var(--jh-color-status-completed-bg)",
				fg: "var(--jh-color-status-completed-fg)",
			};
		case "running":
			return {
				bg: "var(--jh-color-status-running-bg)",
				fg: "var(--jh-color-status-running-fg)",
			};
		case "failed":
			return {
				bg: "var(--jh-color-status-failed-bg)",
				fg: "var(--jh-color-status-failed-fg)",
			};
		case "pending":
			return {
				bg: "var(--jh-color-status-pending-bg)",
				fg: "var(--jh-color-status-pending-fg)",
			};
		case "approval-paused":
			return {
				bg: "var(--jh-color-status-paused-bg)",
				fg: "var(--jh-color-status-paused-fg)",
			};
		case "degraded":
			return {
				bg: "var(--jh-color-status-degraded-bg)",
				fg: "var(--jh-color-status-degraded-fg)",
			};
		case "empty":
		case "missing-session":
		case "unsupported-workflow":
			return {
				bg: "var(--jh-color-badge-neutral-bg)",
				fg: "var(--jh-color-badge-neutral-fg)",
			};
	}
}

/* ----------------------------------------------------------------
   Helper: score formatter
   ---------------------------------------------------------------- */

function formatScore(score: number | null): string {
	if (score === null) {
		return "No score";
	}

	return `${score.toFixed(1)} / 5`;
}

/* ----------------------------------------------------------------
   Shared styles
   ---------------------------------------------------------------- */

const pageStyle: CSSProperties = {
	display: "grid",
	fontFamily: "var(--jh-font-body)",
	gap: "var(--jh-space-section-gap)",
	maxWidth: "720px",
};

const cardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	padding: "var(--jh-space-padding)",
};

const labelSmStyle: CSSProperties = {
	color: "var(--jh-color-label-fg)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-text-label-sm-weight)",
	letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
	margin: 0,
	textTransform: "uppercase",
};

const headingStyle: CSSProperties = {
	fontFamily: "var(--jh-font-mono)",
	fontSize: "var(--jh-text-h2-size)",
	fontWeight: "var(--jh-text-h2-weight)",
	letterSpacing: "var(--jh-text-h2-letter-spacing)",
	lineHeight: "var(--jh-text-h2-line-height)",
	margin: 0,
	wordBreak: "break-all",
};

const backLinkStyle: CSSProperties = {
	color: "var(--jh-color-text-secondary)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	textDecoration: "none",
};

const pillRowStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-2)",
};

const basePillStyle: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	display: "inline-block",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-text-label-sm-weight)",
	letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
	lineHeight: 1,
	padding: "var(--jh-space-1) var(--jh-space-3)",
	textTransform: "uppercase",
	whiteSpace: "nowrap",
};

const bodyStyle: CSSProperties = {
	color: "var(--jh-color-text-primary)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-size)",
	lineHeight: "var(--jh-text-body-line-height)",
	margin: 0,
};

const bodySecondaryStyle: CSSProperties = {
	...bodyStyle,
	color: "var(--jh-color-text-secondary)",
};

const h3Style: CSSProperties = {
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-h3-size)",
	fontWeight: "var(--jh-text-h3-weight)",
	letterSpacing: "var(--jh-text-h3-letter-spacing)",
	lineHeight: "var(--jh-text-h3-line-height)",
	margin: 0,
};

const failureCardStyle: CSSProperties = {
	...cardStyle,
	background: "var(--jh-color-status-error-bg)",
	borderColor: "var(--jh-color-status-error-border)",
};

const monoSmStyle: CSSProperties = {
	fontFamily: "var(--jh-font-mono)",
	fontSize: "var(--jh-text-mono-sm-size)",
	letterSpacing: "var(--jh-text-mono-sm-letter-spacing)",
	lineHeight: "var(--jh-text-mono-sm-line-height)",
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

const buttonDisabledStyle: CSSProperties = {
	...buttonStyle,
	cursor: "not-allowed",
	opacity: 0.5,
};

const actionLinkStyle: CSSProperties = {
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

const stepListStyle: CSSProperties = {
	color: "var(--jh-color-text-secondary)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	lineHeight: "var(--jh-text-body-sm-line-height)",
	margin: 0,
	paddingLeft: "var(--jh-space-6)",
};

/* ----------------------------------------------------------------
   Closeout state badge helpers
   ---------------------------------------------------------------- */

function getCloseoutBadgeTokens(state: string): BadgeTokens {
	switch (state) {
		case "review-ready":
			return {
				bg: "var(--jh-color-closeout-review-ready-bg)",
				fg: "var(--jh-color-closeout-review-ready-fg)",
			};
		case "in-progress":
			return {
				bg: "var(--jh-color-closeout-in-progress-bg)",
				fg: "var(--jh-color-closeout-in-progress-fg)",
			};
		case "attention-required":
			return {
				bg: "var(--jh-color-closeout-attention-bg)",
				fg: "var(--jh-color-closeout-attention-fg)",
			};
		default:
			return {
				bg: "var(--jh-color-closeout-not-ready-bg)",
				fg: "var(--jh-color-closeout-not-ready-fg)",
			};
	}
}

function getArtifactBadgeTokens(state: string): BadgeTokens {
	switch (state) {
		case "ready":
			return {
				bg: "var(--jh-color-badge-positive-bg)",
				fg: "var(--jh-color-badge-positive-fg)",
			};
		case "pending":
			return {
				bg: "var(--jh-color-badge-info-bg)",
				fg: "var(--jh-color-badge-info-fg)",
			};
		default:
			return {
				bg: "var(--jh-color-badge-neutral-bg)",
				fg: "var(--jh-color-badge-neutral-fg)",
			};
	}
}

function getLegitimacyBadgeTokens(legitimacy: string): BadgeTokens {
	switch (legitimacy) {
		case "High Confidence":
			return {
				bg: "var(--jh-color-badge-positive-bg)",
				fg: "var(--jh-color-badge-positive-fg)",
			};
		case "Proceed with Caution":
			return {
				bg: "var(--jh-color-badge-attention-bg)",
				fg: "var(--jh-color-badge-attention-fg)",
			};
		default:
			return {
				bg: "var(--jh-color-status-error-bg)",
				fg: "var(--jh-color-status-error-fg)",
			};
	}
}

/* ----------------------------------------------------------------
   Pill component (inline)
   ---------------------------------------------------------------- */

function Pill({ bg, fg, label }: { bg: string; fg: string; label: string }) {
	return (
		<span style={{ ...basePillStyle, background: bg, color: fg }}>{label}</span>
	);
}

/* ----------------------------------------------------------------
   Ready-state detail view
   ---------------------------------------------------------------- */

function RunDetailReady({
	onRefresh,
	state,
}: {
	onRefresh: () => void;
	state: RunDetailViewState;
}) {
	const summary = state.data?.summary;

	if (!summary) {
		return null;
	}

	const stateTokens = getStateBadgeTokens(summary.state);
	const closeoutTokens = getCloseoutBadgeTokens(summary.closeout.state);
	const showResume =
		summary.handoff.resumeAllowed &&
		(summary.state === "approval-paused" ||
			summary.handoff.state === "resume-ready");

	return (
		<>
			{/* Status overview row */}
			<section style={pillRowStyle} aria-label="Status overview">
				<Pill
					bg="var(--jh-color-badge-info-bg)"
					fg="var(--jh-color-badge-info-fg)"
					label={formatScore(summary.score)}
				/>
				{summary.legitimacy !== null ? (
					<Pill
						{...getLegitimacyBadgeTokens(summary.legitimacy)}
						label={summary.legitimacy}
					/>
				) : null}
				<Pill {...stateTokens} label={summary.state} />
				<Pill {...closeoutTokens} label={summary.closeout.state} />
				{state.isRefreshing ? (
					<span
						style={{
							color: "var(--jh-color-text-muted)",
							fontSize: "var(--jh-text-caption-size)",
						}}
					>
						Refreshing...
					</span>
				) : null}
			</section>

			{/* Summary message */}
			<section style={cardStyle}>
				<p style={bodyStyle}>{summary.message}</p>
			</section>

			{/* Checkpoint progress */}
			<section
				style={{ ...cardStyle, display: "grid", gap: "var(--jh-space-2)" }}
			>
				<h3 style={h3Style}>
					{summary.checkpoint.completedStepCount} steps completed
				</h3>
				{summary.checkpoint.completedSteps.length > 0 ? (
					<ol style={stepListStyle}>
						{summary.checkpoint.completedSteps.map((step) => (
							<li key={step}>{step}</li>
						))}
						{summary.checkpoint.hasMore ? (
							<li style={{ color: "var(--jh-color-text-muted)" }}>
								and more...
							</li>
						) : null}
					</ol>
				) : null}
			</section>

			{/* Artifact status row */}
			<section
				style={{ ...cardStyle, display: "grid", gap: "var(--jh-space-2)" }}
				aria-label="Artifacts"
			>
				<h3 style={h3Style}>Artifacts</h3>
				<div style={pillRowStyle}>
					{(["report", "pdf", "tracker"] as const).map((kind) => {
						const artifact = summary.artifacts[kind];
						const tokens = getArtifactBadgeTokens(artifact.state);
						return (
							<Pill
								key={kind}
								{...tokens}
								label={`${kind}: ${artifact.state}`}
							/>
						);
					})}
				</div>
			</section>

			{/* Failure details */}
			{summary.failure !== null ? (
				<section
					style={{
						...failureCardStyle,
						display: "grid",
						gap: "var(--jh-space-2)",
					}}
					aria-label="Failure details"
				>
					<h3
						style={{
							...h3Style,
							color: "var(--jh-color-status-error-fg)",
						}}
					>
						Failure details
					</h3>
					<p style={bodyStyle}>{summary.failure.message}</p>
					<dl
						style={{
							display: "grid",
							gap: "var(--jh-space-1)",
							gridTemplateColumns: "auto 1fr",
							margin: 0,
						}}
					>
						<dt
							style={{
								...bodySecondaryStyle,
								fontWeight: "var(--jh-font-weight-semibold)",
							}}
						>
							Failed at
						</dt>
						<dd style={{ ...monoSmStyle, margin: 0 }}>
							{summary.failure.failedAt}
						</dd>
						<dt
							style={{
								...bodySecondaryStyle,
								fontWeight: "var(--jh-font-weight-semibold)",
							}}
						>
							Job
						</dt>
						<dd style={{ ...monoSmStyle, margin: 0 }}>
							{summary.failure.jobId}
						</dd>
						{summary.failure.traceId !== null ? (
							<>
								<dt
									style={{
										...bodySecondaryStyle,
										fontWeight: "var(--jh-font-weight-semibold)",
									}}
								>
									Trace
								</dt>
								<dd style={{ ...monoSmStyle, margin: 0 }}>
									{summary.failure.traceId}
								</dd>
							</>
						) : null}
					</dl>
				</section>
			) : null}

			{/* Resume/Retry controls */}
			{showResume ? (
				<section style={cardStyle}>
					<button
						disabled
						style={buttonDisabledStyle}
						title="Resume wiring is not yet connected"
						type="button"
					>
						Resume run
					</button>
				</section>
			) : null}

			{summary.state === "failed" ? (
				<section style={cardStyle}>
					<p style={bodySecondaryStyle}>
						This run failed. Review the failure details above, then re-evaluate
						from the console.
					</p>
				</section>
			) : null}

			{/* Actions row */}
			<nav style={{ display: "flex", gap: "var(--jh-space-3)" }}>
				<Link style={actionLinkStyle} to="/evaluate">
					Back to evaluate console
				</Link>
				<button
					onClick={onRefresh}
					disabled={state.isRefreshing}
					style={state.isRefreshing ? buttonDisabledStyle : buttonStyle}
					type="button"
				>
					{state.isRefreshing ? "Refreshing..." : "Refresh"}
				</button>
			</nav>
		</>
	);
}

/* ----------------------------------------------------------------
   RunDetailPage (exported component)
   ---------------------------------------------------------------- */

export function RunDetailPage() {
	const { runId } = useParams<{ runId: string }>();

	if (!runId || runId.trim() === "") {
		return (
			<section style={pageStyle}>
				<header>
					<p style={labelSmStyle}>Run detail</p>
					<h2 style={{ ...headingStyle, fontFamily: "var(--jh-font-heading)" }}>
						No run specified
					</h2>
				</header>
				<p style={bodySecondaryStyle}>
					No run identifier was provided. Navigate to an evaluation to view its
					details.
				</p>
				<Link style={actionLinkStyle} to="/evaluate">
					Go to evaluate console
				</Link>
			</section>
		);
	}

	return <RunDetailInner runId={runId} />;
}

function RunDetailInner({ runId }: { runId: string }) {
	const { refresh, state } = useRunDetail(runId);
	const refreshClickedRef = useRef(false);

	const handleRefresh = useCallback(() => {
		if (refreshClickedRef.current) {
			return;
		}
		refreshClickedRef.current = true;
		refresh();
		requestAnimationFrame(() => {
			refreshClickedRef.current = false;
		});
	}, [refresh]);

	return (
		<section aria-labelledby="run-detail-heading" style={pageStyle}>
			{/* Header */}
			<header style={{ display: "grid", gap: "var(--jh-space-1)" }}>
				<p style={labelSmStyle}>Run detail</p>
				<h2 id="run-detail-heading" style={headingStyle}>
					{runId}
				</h2>
				<Link style={backLinkStyle} to="/evaluate">
					Back to evaluate console
				</Link>
			</header>

			{/* Render based on view status */}
			{state.status === "loading" ? (
				<section style={cardStyle}>
					<p style={bodySecondaryStyle}>
						Loading run details for{" "}
						<code style={monoSmStyle}>{state.runId}</code>...
					</p>
				</section>
			) : null}

			{state.status === "error" ? (
				<section
					style={{
						...cardStyle,
						background: "var(--jh-color-status-error-bg)",
						borderColor: "var(--jh-color-status-error-border)",
						display: "grid",
						gap: "var(--jh-space-2)",
					}}
				>
					<h3
						style={{
							...h3Style,
							color: "var(--jh-color-status-error-fg)",
						}}
					>
						Failed to load run details
					</h3>
					<p style={bodyStyle}>
						{state.error?.message ?? "An unknown error occurred."}
					</p>
					<p
						style={{
							...bodySecondaryStyle,
							fontSize: "var(--jh-text-body-sm-size)",
						}}
					>
						Run: <code style={monoSmStyle}>{state.runId}</code>
					</p>
					<button
						onClick={handleRefresh}
						disabled={state.isRefreshing}
						style={state.isRefreshing ? buttonDisabledStyle : buttonStyle}
						type="button"
					>
						{state.isRefreshing ? "Retrying..." : "Retry"}
					</button>
				</section>
			) : null}

			{state.status === "offline" ? (
				<section
					style={{
						...cardStyle,
						background: "var(--jh-color-status-offline-bg)",
						borderColor: "var(--jh-color-status-offline-border)",
						display: "grid",
						gap: "var(--jh-space-2)",
					}}
				>
					<p style={bodyStyle}>
						Cannot reach the server. Showing last snapshot if available.
					</p>
					{state.data?.summary ? (
						<RunDetailReady onRefresh={handleRefresh} state={state} />
					) : null}
				</section>
			) : null}

			{state.status === "empty" ? (
				<section style={cardStyle}>
					<p style={bodySecondaryStyle}>No data found for this run.</p>
					<Link
						style={{ ...actionLinkStyle, marginTop: "var(--jh-space-2)" }}
						to="/evaluate"
					>
						Go to evaluate console
					</Link>
				</section>
			) : null}

			{state.status === "ready" ? (
				<RunDetailReady onRefresh={handleRefresh} state={state} />
			) : null}
		</section>
	);
}

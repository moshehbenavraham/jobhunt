import type { CSSProperties } from "react";
import { Link } from "react-router";
import type { StartupStatus } from "../boot/startup-types";
import type { EvaluationResultClientError } from "./evaluation-result-client";
import type {
	EvaluationArtifactHandoffIntent,
	EvaluationResultSummary,
	EvaluationResultSummaryPayload,
} from "./evaluation-result-types";

export type EvaluationArtifactRailStatus =
	| "empty"
	| "error"
	| "loading"
	| "offline"
	| StartupStatus;

type EvaluationArtifactRailProps = {
	error: EvaluationResultClientError | null;
	isBusy: boolean;
	isRefreshing: boolean;
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onOpenPipelineReview: (focus: {
		reportNumber: string | null;
		section: "all" | "processed";
		url: string | null;
	}) => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
	onOpenTrackerReview: (focus: { reportNumber: string | null }) => void;
	payload: EvaluationResultSummaryPayload | null;
	status: EvaluationArtifactRailStatus;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-xl)",
	display: "grid",
	gap: "var(--jh-space-gap)",
	padding: "var(--jh-space-padding)",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)" as unknown as number,
	lineHeight: "var(--jh-text-body-sm-line-height)",
	minHeight: "2.2rem",
	padding: "var(--jh-space-1) var(--jh-space-3)",
};

const pillStyle: CSSProperties = {
	borderRadius: "var(--jh-radius-pill)",
	display: "inline-block",
	fontSize: "var(--jh-text-label-sm-size)",
	fontWeight: "var(--jh-font-weight-medium)" as unknown as number,
	letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
	lineHeight: "var(--jh-text-label-sm-line-height)",
	padding: "var(--jh-space-1) var(--jh-space-2)",
};

const linkStyle: CSSProperties = {
	background: "transparent",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-text-primary)",
	display: "inline-flex",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)" as unknown as number,
	lineHeight: "var(--jh-text-body-sm-line-height)",
	minHeight: "2.2rem",
	padding: "var(--jh-space-1) var(--jh-space-3)",
	textDecoration: "none",
	alignItems: "center",
};

const rowStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-2)",
};

const secondaryText: CSSProperties = {
	color: "var(--jh-color-text-secondary)",
	fontSize: "var(--jh-text-body-sm-size)",
	lineHeight: "var(--jh-text-body-sm-line-height)",
	margin: 0,
};

const mutedText: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	lineHeight: "var(--jh-text-caption-line-height)",
	margin: 0,
};

function formatScore(score: number | null): string {
	if (score === null) {
		return "--";
	}

	return `${score.toFixed(1)} / 5`;
}

function formatInputKind(value: "job-url" | "raw-jd" | "unknown"): string {
	switch (value) {
		case "job-url":
			return "Live job URL";
		case "raw-jd":
			return "Raw JD text";
		case "unknown":
			return "Unknown input";
	}
}

function getArtifactTone(
	state: "missing" | "pending" | "ready",
): CSSProperties {
	switch (state) {
		case "ready":
			return {
				background: "var(--jh-color-status-ready-bg)",
				color: "var(--jh-color-status-ready-fg)",
			};
		case "pending":
			return {
				background: "var(--jh-color-status-pending-bg)",
				color: "var(--jh-color-status-pending-fg)",
			};
		case "missing":
			return {
				background: "var(--jh-color-status-error-bg)",
				color: "var(--jh-color-status-error-fg)",
			};
	}
}

function getCloseoutTone(
	state: "attention-required" | "in-progress" | "not-ready" | "review-ready",
): CSSProperties {
	switch (state) {
		case "review-ready":
			return {
				background: "var(--jh-color-closeout-review-ready-bg)",
				color: "var(--jh-color-closeout-review-ready-fg)",
			};
		case "in-progress":
			return {
				background: "var(--jh-color-closeout-in-progress-bg)",
				color: "var(--jh-color-closeout-in-progress-fg)",
			};
		case "attention-required":
			return {
				background: "var(--jh-color-closeout-attention-bg)",
				color: "var(--jh-color-closeout-attention-fg)",
			};
		case "not-ready":
			return {
				background: "var(--jh-color-closeout-not-ready-bg)",
				color: "var(--jh-color-closeout-not-ready-fg)",
			};
	}
}

function getVerificationTone(
	status:
		| "needs-review"
		| "not-applicable"
		| "pending"
		| "unconfirmed"
		| "verified",
): CSSProperties {
	switch (status) {
		case "verified":
			return {
				background: "var(--jh-color-status-ready-bg)",
				color: "var(--jh-color-status-ready-fg)",
			};
		case "pending":
			return {
				background: "var(--jh-color-status-pending-bg)",
				color: "var(--jh-color-status-pending-fg)",
			};
		case "needs-review":
			return {
				background: "var(--jh-color-closeout-attention-bg)",
				color: "var(--jh-color-closeout-attention-fg)",
			};
		case "not-applicable":
		case "unconfirmed":
			return {
				background: "var(--jh-color-status-blocked-bg)",
				color: "var(--jh-color-status-blocked-fg)",
			};
	}
}

function getHandoffTone(
	availability: "deferred" | "ready" | "unavailable",
): CSSProperties {
	switch (availability) {
		case "ready":
			return {
				background: "var(--jh-color-status-ready-bg)",
				color: "var(--jh-color-status-ready-fg)",
			};
		case "deferred":
			return {
				background: "var(--jh-color-badge-attention-bg)",
				color: "var(--jh-color-badge-attention-fg)",
			};
		case "unavailable":
			return {
				background: "var(--jh-color-status-blocked-bg)",
				color: "var(--jh-color-status-blocked-fg)",
			};
	}
}

function getEmptyState(
	status: EvaluationArtifactRailStatus,
	payload: EvaluationResultSummaryPayload | null,
	error: EvaluationResultClientError | null,
): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Fetching latest results.",
				title: "Loading results",
			};
		case "offline":
			return {
				body:
					error?.message ?? "Cannot reach the server. Showing last snapshot.",
				title: "Results offline",
			};
		case "error":
			return {
				body: error?.message ?? "Unexpected response from the server.",
				title: "Results unavailable",
			};
		default:
			return {
				body: payload?.message ?? "Start or select a run to see results here.",
				title: "No results yet",
			};
	}
}

function createHandoffIntents(
	summary: EvaluationResultSummary,
): EvaluationArtifactHandoffIntent[] {
	const sessionId = summary.session?.sessionId ?? null;
	const reportFocus = summary.reviewFocus.reportViewer;
	const pipelineFocus = summary.reviewFocus.pipelineReview;
	const trackerFocus = summary.reviewFocus.trackerWorkspace;
	const pdfArtifact = summary.artifacts.pdf;

	const approvalIntent: EvaluationArtifactHandoffIntent =
		summary.handoff.state === "waiting-for-approval" && summary.handoff.approval
			? {
					approvalId: summary.handoff.approval.approvalId,
					availability: "ready",
					description: summary.handoff.message,
					kind: "approval-review",
					label: "Open approval review",
					reportNumber: null,
					repoRelativePath: null,
					section: null,
					sessionId,
					url: null,
				}
			: summary.handoff.state === "resume-ready" && sessionId
				? {
						approvalId: summary.handoff.approval?.approvalId ?? null,
						availability: "ready",
						description: summary.handoff.message,
						kind: "approval-review",
						label: "Open interrupted run",
						reportNumber: null,
						repoRelativePath: null,
						section: null,
						sessionId,
						url: null,
					}
				: {
						approvalId: null,
						availability: "unavailable",
						description: summary.handoff.message,
						kind: "approval-review",
						label: "Approval review",
						reportNumber: null,
						repoRelativePath: null,
						section: null,
						sessionId,
						url: null,
					};

	const reportIntent: EvaluationArtifactHandoffIntent =
		reportFocus.availability === "ready" && reportFocus.reportPath
			? {
					approvalId: null,
					availability: "ready",
					description: reportFocus.message,
					kind: "report-viewer",
					label: "Open report viewer",
					reportNumber: reportFocus.reportNumber,
					repoRelativePath: reportFocus.reportPath,
					section: null,
					sessionId,
					url: null,
				}
			: {
					approvalId: null,
					availability: "unavailable",
					description: reportFocus.message,
					kind: "report-viewer",
					label: "Report viewer unavailable",
					reportNumber: reportFocus.reportNumber,
					repoRelativePath: reportFocus.reportPath,
					section: null,
					sessionId,
					url: null,
				};

	const pdfIntent: EvaluationArtifactHandoffIntent =
		pdfArtifact.state === "ready"
			? {
					approvalId: null,
					availability: "deferred",
					description:
						"PDF artifact is ready in the workspace. Browser-owned artifact serving is not wired yet.",
					kind: "pdf-review",
					label: "PDF handoff deferred",
					reportNumber: summary.reportNumber,
					repoRelativePath: pdfArtifact.repoRelativePath,
					section: null,
					sessionId,
					url: null,
				}
			: {
					approvalId: null,
					availability: "unavailable",
					description: pdfArtifact.message,
					kind: "pdf-review",
					label: "PDF handoff unavailable",
					reportNumber: summary.reportNumber,
					repoRelativePath: pdfArtifact.repoRelativePath,
					section: null,
					sessionId,
					url: null,
				};

	const pipelineIntent: EvaluationArtifactHandoffIntent =
		pipelineFocus.availability === "ready"
			? {
					approvalId: null,
					availability: "ready",
					description: pipelineFocus.message,
					kind: "pipeline-review",
					label: "Open pipeline review",
					reportNumber: pipelineFocus.reportNumber,
					repoRelativePath: null,
					section: pipelineFocus.section,
					sessionId,
					url: pipelineFocus.url,
				}
			: {
					approvalId: null,
					availability: "unavailable",
					description: pipelineFocus.message,
					kind: "pipeline-review",
					label: "Pipeline review unavailable",
					reportNumber: pipelineFocus.reportNumber,
					repoRelativePath: null,
					section: pipelineFocus.section,
					sessionId,
					url: pipelineFocus.url,
				};

	const trackerIntent: EvaluationArtifactHandoffIntent =
		trackerFocus.availability === "ready"
			? {
					approvalId: null,
					availability: "ready",
					description: trackerFocus.message,
					kind: "tracker-review",
					label: "Open tracker review",
					reportNumber: trackerFocus.reportNumber,
					repoRelativePath: null,
					section: null,
					sessionId,
					url: null,
				}
			: {
					approvalId: null,
					availability: "unavailable",
					description: trackerFocus.message,
					kind: "tracker-review",
					label: "Tracker review unavailable",
					reportNumber: trackerFocus.reportNumber,
					repoRelativePath: null,
					section: null,
					sessionId,
					url: null,
				};

	return [
		approvalIntent,
		reportIntent,
		pdfIntent,
		pipelineIntent,
		trackerIntent,
	];
}

function renderActionButton(
	intent: EvaluationArtifactHandoffIntent,
	isBusy: boolean,
	onOpenApprovals: EvaluationArtifactRailProps["onOpenApprovals"],
	onOpenPipelineReview: EvaluationArtifactRailProps["onOpenPipelineReview"],
	onOpenReportViewer: EvaluationArtifactRailProps["onOpenReportViewer"],
	onOpenTrackerReview: EvaluationArtifactRailProps["onOpenTrackerReview"],
) {
	if (intent.availability !== "ready") {
		return (
			<button
				aria-label={intent.label}
				disabled
				style={{
					...buttonStyle,
					opacity: 0.55,
				}}
				type="button"
			>
				{intent.label}
			</button>
		);
	}

	return (
		<button
			aria-label={intent.label}
			disabled={isBusy}
			onClick={() => {
				if (intent.kind === "approval-review") {
					onOpenApprovals({
						approvalId: intent.approvalId,
						sessionId: intent.sessionId,
					});
					return;
				}

				if (intent.kind === "report-viewer") {
					onOpenReportViewer({
						reportPath: intent.repoRelativePath,
					});
					return;
				}

				if (intent.kind === "pipeline-review") {
					onOpenPipelineReview({
						reportNumber: intent.reportNumber,
						section: intent.section ?? "all",
						url: intent.url,
					});
					return;
				}

				if (intent.kind === "tracker-review") {
					onOpenTrackerReview({
						reportNumber: intent.reportNumber,
					});
				}
			}}
			style={{
				...buttonStyle,
				opacity: isBusy ? 0.7 : 1,
			}}
			type="button"
		>
			{intent.label}
		</button>
	);
}

export function EvaluationArtifactRail({
	error,
	isBusy,
	isRefreshing,
	onOpenApprovals,
	onOpenPipelineReview,
	onOpenReportViewer,
	onOpenTrackerReview,
	payload,
	status,
}: EvaluationArtifactRailProps) {
	const summary = payload?.summary ?? null;

	if (!summary || summary.state === "empty") {
		const emptyState = getEmptyState(status, payload, error);

		return (
			<section
				aria-labelledby="evaluation-artifact-rail-title"
				style={panelStyle}
			>
				<header>
					<p
						style={{
							color: "var(--jh-color-label-fg)",
							fontFamily: "var(--jh-font-heading)",
							fontSize: "var(--jh-text-label-sm-size)",
							fontWeight: "var(--jh-font-weight-medium)" as unknown as number,
							letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
							lineHeight: "var(--jh-text-label-sm-line-height)",
							marginBottom: "var(--jh-space-1)",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Results
					</p>
					<h2
						id="evaluation-artifact-rail-title"
						style={{
							fontFamily: "var(--jh-font-heading)",
							fontSize: "var(--jh-text-h3-size)",
							fontWeight: "var(--jh-text-h3-weight)" as unknown as number,
							letterSpacing: "var(--jh-text-h3-letter-spacing)",
							lineHeight: "var(--jh-text-h3-line-height)",
							margin: 0,
						}}
					>
						{emptyState.title}
					</h2>
					<p style={{ ...secondaryText, marginTop: "var(--jh-space-1)" }}>
						{emptyState.body}
					</p>
				</header>
			</section>
		);
	}

	const handoffIntents = createHandoffIntents(summary);
	const sessionId = summary.session?.sessionId ?? null;
	const artifactEntries = [
		{ label: "Report", state: summary.artifacts.report.state },
		{ label: "PDF", state: summary.artifacts.pdf.state },
		{ label: "Tracker", state: summary.artifacts.tracker.state },
	];

	return (
		<section
			aria-labelledby="evaluation-artifact-rail-title"
			style={panelStyle}
		>
			{/* --- Header: score chip + legitimacy badge --- */}
			<header style={{ display: "grid", gap: "var(--jh-space-2)" }}>
				<div style={rowStyle}>
					<span
						id="evaluation-artifact-rail-title"
						style={{
							background: "var(--jh-color-badge-neutral-bg)",
							borderRadius: "var(--jh-radius-md)",
							color: "var(--jh-color-text-primary)",
							display: "inline-block",
							fontFamily: "var(--jh-font-mono)",
							fontSize: "var(--jh-text-h3-size)",
							fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
							lineHeight: "var(--jh-text-h3-line-height)",
							padding: "var(--jh-space-1) var(--jh-space-3)",
						}}
					>
						{formatScore(summary.score)}
					</span>
					{summary.legitimacy ? (
						<span
							style={{
								...pillStyle,
								background: "var(--jh-color-badge-info-bg)",
								color: "var(--jh-color-badge-info-fg)",
							}}
						>
							{summary.legitimacy}
						</span>
					) : null}
					{summary.reportNumber ? (
						<span style={{ ...mutedText, marginLeft: "auto" }}>
							#{summary.reportNumber}
						</span>
					) : null}
				</div>

				{/* Closeout state badge */}
				<div style={rowStyle}>
					<span
						style={{
							...pillStyle,
							...getCloseoutTone(summary.closeout.state),
						}}
					>
						{summary.closeout.state}
					</span>
					<span style={secondaryText}>{summary.closeout.message}</span>
				</div>

				{isRefreshing ? <p style={mutedText}>Refreshing...</p> : null}
			</header>

			{/* --- Error / offline banner --- */}
			{(status === "offline" || status === "error") && error ? (
				<div
					style={{
						background:
							status === "offline"
								? "var(--jh-color-status-offline-bg)"
								: "var(--jh-color-status-error-bg)",
						border: `var(--jh-border-width) solid ${
							status === "offline"
								? "var(--jh-color-status-offline-border)"
								: "var(--jh-color-status-error-border)"
						}`,
						borderRadius: "var(--jh-radius-sm)",
						padding: "var(--jh-space-2) var(--jh-space-3)",
					}}
				>
					<p
						style={{
							fontSize: "var(--jh-text-body-sm-size)",
							fontWeight: "var(--jh-font-weight-semibold)" as unknown as number,
							lineHeight: "var(--jh-text-body-sm-line-height)",
							marginBottom: "var(--jh-space-1)",
							marginTop: 0,
						}}
					>
						{status === "offline" ? "Showing last snapshot" : "Data issue"}
					</p>
					<p style={{ ...secondaryText }}>{error.message}</p>
				</div>
			) : null}

			{/* --- Artifact status pills --- */}
			<div style={rowStyle}>
				{artifactEntries.map((entry) => (
					<span
						key={entry.label}
						style={{
							...pillStyle,
							...getArtifactTone(entry.state),
						}}
					>
						{entry.label}: {entry.state}
					</span>
				))}
			</div>

			{/* --- Input + Verification compact lines --- */}
			<div style={{ display: "grid", gap: "var(--jh-space-1)" }}>
				<div style={rowStyle}>
					<span
						style={{
							...pillStyle,
							background: "var(--jh-color-badge-neutral-bg)",
							color: "var(--jh-color-badge-neutral-fg)",
						}}
					>
						{formatInputKind(summary.inputProvenance.kind)}
					</span>
					{summary.inputProvenance.canonicalUrl ? (
						<span style={mutedText}>
							{summary.inputProvenance.canonicalUrl}
						</span>
					) : null}
				</div>
				<div style={rowStyle}>
					<span
						style={{
							...pillStyle,
							...getVerificationTone(summary.verification.status),
						}}
					>
						{summary.verification.status}
					</span>
					<span style={secondaryText}>{summary.verification.message}</span>
				</div>
			</div>

			{/* --- Warnings compact --- */}
			<div style={{ display: "grid", gap: "var(--jh-space-1)" }}>
				<div style={rowStyle}>
					<span
						style={{
							...pillStyle,
							background:
								summary.warnings.totalCount > 0
									? "var(--jh-color-status-warning-bg)"
									: "var(--jh-color-badge-neutral-bg)",
							color:
								summary.warnings.totalCount > 0
									? "var(--jh-color-status-expired-fg)"
									: "var(--jh-color-badge-neutral-fg)",
							borderWidth:
								summary.warnings.totalCount > 0
									? "var(--jh-border-width)"
									: undefined,
							borderStyle:
								summary.warnings.totalCount > 0 ? "solid" : undefined,
							borderColor:
								summary.warnings.totalCount > 0
									? "var(--jh-color-status-warning-border)"
									: undefined,
						}}
					>
						{summary.warnings.totalCount === 0
							? "No warnings"
							: `${summary.warnings.totalCount} warning${summary.warnings.totalCount === 1 ? "" : "s"}`}
					</span>
				</div>
				{summary.warnings.items.length > 0 ? (
					<div
						style={{
							display: "grid",
							gap: "var(--jh-space-1)",
							paddingLeft: "var(--jh-space-2)",
						}}
					>
						{summary.warnings.items.map((item) => (
							<p key={item.code ?? item.message} style={secondaryText}>
								{item.code ? <strong>{item.code}:</strong> : null}{" "}
								{item.message}
							</p>
						))}
						{summary.warnings.hasMore ? (
							<p style={mutedText}>More warnings available in full report</p>
						) : null}
					</div>
				) : null}
			</div>

			{/* --- Actions: compact button row --- */}
			<div style={{ display: "grid", gap: "var(--jh-space-2)" }}>
				<p
					style={{
						color: "var(--jh-color-text-secondary)",
						fontSize: "var(--jh-text-label-size)",
						fontWeight: "var(--jh-font-weight-medium)" as unknown as number,
						letterSpacing: "var(--jh-text-label-letter-spacing)",
						lineHeight: "var(--jh-text-label-line-height)",
						margin: 0,
					}}
				>
					Actions
				</p>
				<div
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-2)",
					}}
				>
					{handoffIntents.map((intent) => (
						<span key={intent.kind} style={{ display: "contents" }}>
							{renderActionButton(
								intent,
								isBusy,
								onOpenApprovals,
								onOpenPipelineReview,
								onOpenReportViewer,
								onOpenTrackerReview,
							)}
						</span>
					))}
					{sessionId ? (
						<Link to={`/runs/${sessionId}`} style={linkStyle}>
							View run details
						</Link>
					) : null}
				</div>
			</div>
		</section>
	);
}

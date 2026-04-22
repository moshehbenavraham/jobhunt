import type { CSSProperties } from "react";
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
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.4rem",
	display: "grid",
	gap: "0.9rem",
	padding: "1rem",
};

const sectionStyle: CSSProperties = {
	background: "rgba(248, 250, 252, 0.9)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1rem",
	display: "grid",
	gap: "0.7rem",
	padding: "0.9rem",
};

const buttonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.4rem",
	padding: "0.55rem 0.9rem",
};

function formatScore(score: number | null): string {
	if (score === null) {
		return "No score yet";
	}

	return `${score.toFixed(1)} / 5`;
}

function formatWorkflow(value: string | null): string {
	if (!value) {
		return "Evaluation workflow pending";
	}

	return value.replace(/-/g, " ");
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
				background: "#dcfce7",
				color: "#166534",
			};
		case "pending":
			return {
				background: "#dbeafe",
				color: "#1d4ed8",
			};
		case "missing":
			return {
				background: "#fee2e2",
				color: "#991b1b",
			};
	}
}

function getCloseoutTone(
	state: "attention-required" | "in-progress" | "not-ready" | "review-ready",
): CSSProperties {
	switch (state) {
		case "review-ready":
			return {
				background: "#dcfce7",
				color: "#166534",
			};
		case "in-progress":
			return {
				background: "#dbeafe",
				color: "#1d4ed8",
			};
		case "attention-required":
			return {
				background: "#ffedd5",
				color: "#9a3412",
			};
		case "not-ready":
			return {
				background: "#e2e8f0",
				color: "#475569",
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
				background: "#dcfce7",
				color: "#166534",
			};
		case "pending":
			return {
				background: "#dbeafe",
				color: "#1d4ed8",
			};
		case "needs-review":
			return {
				background: "#ffedd5",
				color: "#9a3412",
			};
		case "not-applicable":
		case "unconfirmed":
			return {
				background: "#e2e8f0",
				color: "#475569",
			};
	}
}

function getHandoffTone(
	availability: "deferred" | "ready" | "unavailable",
): CSSProperties {
	switch (availability) {
		case "ready":
			return {
				background: "#dcfce7",
				color: "#166534",
			};
		case "deferred":
			return {
				background: "#fef3c7",
				color: "#92400e",
			};
		case "unavailable":
			return {
				background: "#e2e8f0",
				color: "#475569",
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
				body: "Reading the bounded evaluation-result summary for the active session.",
				title: "Loading evaluation handoff",
			};
		case "offline":
			return {
				body:
					error?.message ??
					"The evaluation-result endpoint is offline, so the artifact handoff cannot refresh.",
				title: "Evaluation handoff offline",
			};
		case "error":
			return {
				body:
					error?.message ??
					"The evaluation-result payload could not be parsed into the artifact handoff surface.",
				title: "Evaluation handoff unavailable",
			};
		default:
			return {
				body:
					payload?.message ??
					"Launch or select an evaluation session to inspect report, PDF, tracker, and closeout readiness in one place.",
				title: "No evaluation handoff yet",
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
							color: "#475569",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Artifact handoff
					</p>
					<h2
						id="evaluation-artifact-rail-title"
						style={{ marginBottom: "0.35rem" }}
					>
						{emptyState.title}
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0 }}>{emptyState.body}</p>
				</header>
			</section>
		);
	}

	const handoffIntents = createHandoffIntents(summary);
	const artifactCards = [
		summary.artifacts.report,
		summary.artifacts.pdf,
		summary.artifacts.tracker,
	];
	const statCards = [
		{
			body: formatScore(summary.score),
			title: "Score",
		},
		{
			body: summary.legitimacy ?? "No legitimacy signal yet",
			title: "Legitimacy",
		},
		{
			body: summary.reportNumber ?? "No report number yet",
			title: "Report number",
		},
		{
			body: `${summary.warnings.totalCount} warning${summary.warnings.totalCount === 1 ? "" : "s"}`,
			title: "Warnings",
		},
	];

	return (
		<section
			aria-labelledby="evaluation-artifact-rail-title"
			style={panelStyle}
		>
			<header>
				<div
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "0.65rem",
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
							Artifact handoff
						</p>
						<h2
							id="evaluation-artifact-rail-title"
							style={{ marginBottom: "0.35rem" }}
						>
							{summary.session?.sessionId ?? "Latest evaluation summary"}
						</h2>
					</div>
					<span
						style={{
							...getCloseoutTone(summary.closeout.state),
							borderRadius: "999px",
							fontSize: "0.85rem",
							fontWeight: 700,
							padding: "0.25rem 0.6rem",
						}}
					>
						{summary.state}
					</span>
				</div>
				<p style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}>
					{formatWorkflow(
						summary.workflow ?? summary.session?.workflow ?? null,
					)}
				</p>
				<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
					{summary.message}
				</p>
				{isRefreshing ? (
					<p
						style={{ color: "#94a3b8", marginBottom: 0, marginTop: "0.45rem" }}
					>
						Refreshing artifact handoff...
					</p>
				) : null}
			</header>

			{(status === "offline" || status === "error") && error ? (
				<section
					style={{
						background: status === "offline" ? "#e2e8f0" : "#fee2e2",
						border: `1px solid ${status === "offline" ? "#cbd5e1" : "#fecaca"}`,
						borderRadius: "1rem",
						padding: "0.85rem 0.9rem",
					}}
				>
					<p style={{ fontWeight: 700, marginBottom: "0.25rem", marginTop: 0 }}>
						{status === "offline"
							? "Showing the last handoff snapshot"
							: "Contract warning"}
					</p>
					<p style={{ margin: 0 }}>{error.message}</p>
				</section>
			) : null}

			<section style={sectionStyle}>
				<header>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						Closeout summary
					</h3>
					<p style={{ color: "#475569", margin: 0 }}>
						{summary.closeout.message}
					</p>
				</header>
				<div
					style={{
						display: "grid",
						gap: "0.75rem",
						gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
					}}
				>
					<article
						style={{
							background: "rgba(255, 255, 255, 0.8)",
							border: "1px solid rgba(148, 163, 184, 0.18)",
							borderRadius: "0.9rem",
							padding: "0.75rem 0.8rem",
						}}
					>
						<p
							style={{ color: "#64748b", marginBottom: "0.2rem", marginTop: 0 }}
						>
							Review state
						</p>
						<span
							style={{
								...getCloseoutTone(summary.closeout.state),
								borderRadius: "999px",
								display: "inline-block",
								fontSize: "0.82rem",
								fontWeight: 700,
								padding: "0.22rem 0.55rem",
							}}
						>
							{summary.closeout.state}
						</span>
					</article>
					{statCards.map((card) => (
						<article
							key={card.title}
							style={{
								background: "rgba(255, 255, 255, 0.8)",
								border: "1px solid rgba(148, 163, 184, 0.18)",
								borderRadius: "0.9rem",
								padding: "0.75rem 0.8rem",
							}}
						>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								{card.title}
							</p>
							<p style={{ margin: 0 }}>{card.body}</p>
						</article>
					))}
				</div>
			</section>

			<section style={sectionStyle}>
				<header>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						Input and verification
					</h3>
					<p style={{ color: "#475569", margin: 0 }}>
						Launch provenance and verification stay backend-owned so the browser
						never re-parses prompt text or guesses at liveness.
					</p>
				</header>
				<div
					style={{
						display: "grid",
						gap: "0.75rem",
						gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
					}}
				>
					<article style={sectionStyle}>
						<div
							style={{
								alignItems: "center",
								display: "flex",
								flexWrap: "wrap",
								gap: "0.55rem",
								justifyContent: "space-between",
							}}
						>
							<h4 style={{ margin: 0 }}>Input provenance</h4>
							<span
								style={{
									...getCloseoutTone("not-ready"),
									borderRadius: "999px",
									fontSize: "0.82rem",
									fontWeight: 700,
									padding: "0.2rem 0.55rem",
								}}
							>
								{formatInputKind(summary.inputProvenance.kind)}
							</span>
						</div>
						<p style={{ color: "#475569", margin: 0 }}>
							{summary.inputProvenance.message}
						</p>
						{summary.inputProvenance.canonicalUrl ? (
							<p style={{ color: "#64748b", margin: 0 }}>
								{summary.inputProvenance.canonicalUrl}
							</p>
						) : null}
					</article>

					<article style={sectionStyle}>
						<div
							style={{
								alignItems: "center",
								display: "flex",
								flexWrap: "wrap",
								gap: "0.55rem",
								justifyContent: "space-between",
							}}
						>
							<h4 style={{ margin: 0 }}>Verification</h4>
							<span
								style={{
									...getVerificationTone(summary.verification.status),
									borderRadius: "999px",
									fontSize: "0.82rem",
									fontWeight: 700,
									padding: "0.2rem 0.55rem",
								}}
							>
								{summary.verification.status}
							</span>
						</div>
						<p style={{ color: "#475569", margin: 0 }}>
							{summary.verification.message}
						</p>
						{summary.verification.url ? (
							<p style={{ color: "#64748b", margin: 0 }}>
								{summary.verification.url}
							</p>
						) : null}
					</article>
				</div>
			</section>

			<section style={sectionStyle}>
				<header>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						Artifact packet
					</h3>
					<p style={{ color: "#475569", margin: 0 }}>
						Report, PDF, and tracker readiness stays backend-owned and explicit.
					</p>
				</header>
				<div
					style={{
						display: "grid",
						gap: "0.75rem",
						gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
					}}
				>
					{artifactCards.map((artifact) => (
						<article key={artifact.kind} style={sectionStyle}>
							<div
								style={{
									alignItems: "center",
									display: "flex",
									flexWrap: "wrap",
									gap: "0.55rem",
									justifyContent: "space-between",
								}}
							>
								<h4 style={{ margin: 0 }}>{artifact.kind}</h4>
								<span
									style={{
										...getArtifactTone(artifact.state),
										borderRadius: "999px",
										fontSize: "0.82rem",
										fontWeight: 700,
										padding: "0.2rem 0.55rem",
									}}
								>
									{artifact.state}
								</span>
							</div>
							<p style={{ color: "#475569", margin: 0 }}>{artifact.message}</p>
							<p style={{ color: "#64748b", margin: 0 }}>
								{artifact.repoRelativePath ?? "No workspace path recorded"}
							</p>
						</article>
					))}
				</div>
			</section>

			<section style={sectionStyle}>
				<header>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						Warning preview
					</h3>
					<p style={{ color: "#475569", margin: 0 }}>
						The rail shows only the bounded preview from the backend contract.
					</p>
				</header>
				{summary.warnings.items.length === 0 ? (
					<p style={{ margin: 0 }}>
						No warning preview is attached to this result.
					</p>
				) : (
					<div style={{ display: "grid", gap: "0.6rem" }}>
						{summary.warnings.items.map((item) => (
							<article
								key={item.code ?? item.message}
								style={{
									background: "#fff7ed",
									border: "1px solid #fed7aa",
									borderRadius: "0.9rem",
									padding: "0.75rem 0.8rem",
								}}
							>
								<p
									style={{
										fontWeight: 700,
										marginBottom: "0.2rem",
										marginTop: 0,
									}}
								>
									{item.code ?? "Warning"}
								</p>
								<p style={{ margin: 0 }}>{item.message}</p>
							</article>
						))}
						{summary.warnings.hasMore ? (
							<p style={{ color: "#92400e", margin: 0 }}>
								Additional warnings are available in the backend summary.
							</p>
						) : null}
					</div>
				)}
			</section>

			<section style={sectionStyle}>
				<header>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						Handoff actions
					</h3>
					<p style={{ color: "#475569", margin: 0 }}>
						Report, pipeline, and tracker actions use the backend-owned review
						focus contract instead of local path or prompt inference.
					</p>
				</header>
				<div
					style={{
						display: "grid",
						gap: "0.75rem",
						gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
					}}
				>
					{handoffIntents.map((intent) => (
						<article key={intent.kind} style={sectionStyle}>
							<div
								style={{
									alignItems: "center",
									display: "flex",
									flexWrap: "wrap",
									gap: "0.55rem",
									justifyContent: "space-between",
								}}
							>
								<h4 style={{ margin: 0 }}>{intent.kind}</h4>
								<span
									style={{
										...getHandoffTone(intent.availability),
										borderRadius: "999px",
										fontSize: "0.82rem",
										fontWeight: 700,
										padding: "0.2rem 0.55rem",
									}}
								>
									{intent.availability}
								</span>
							</div>
							<p style={{ color: "#475569", margin: 0 }}>
								{intent.description}
							</p>
							{intent.repoRelativePath ? (
								<p style={{ color: "#64748b", margin: 0 }}>
									{intent.repoRelativePath}
								</p>
							) : null}
							{renderActionButton(
								intent,
								isBusy,
								onOpenApprovals,
								onOpenPipelineReview,
								onOpenReportViewer,
								onOpenTrackerReview,
							)}
						</article>
					))}
				</div>
			</section>
		</section>
	);
}

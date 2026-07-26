import type { CSSProperties } from "react";
import type { ChatConsoleClientError } from "./chat-console-client";
import type {
	ChatConsoleCommandHandoff,
	ChatConsoleSessionDetail,
	ChatConsoleWorkflowOption,
} from "./chat-console-types";
import type { EvaluationResultSummaryPayload } from "./evaluation-result-types";
import type { ChatConsoleViewStatus } from "./use-chat-console";

type RunStatusPanelProps = {
	command: ChatConsoleCommandHandoff | null;
	error: ChatConsoleClientError | null;
	evaluationResult: EvaluationResultSummaryPayload | null;
	isBusy: boolean;
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	selectedSession: ChatConsoleSessionDetail | null;
	selectedWorkflow: ChatConsoleWorkflowOption | null;
	startupMessage: string;
	status: ChatConsoleViewStatus;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-nav-bg)",
	border: "1px solid var(--jh-color-nav-border)",
	borderRadius: "var(--jh-radius-lg)",
	color: "var(--jh-color-text-on-ink)",
	display: "grid",
	fontFamily: "var(--jh-font-body)",
	gap: "var(--jh-space-gap)",
	padding: "var(--jh-space-padding) var(--jh-space-padding)",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-fg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-bg)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontWeight: 700,
	minHeight: "2.5rem",
	padding: "0.65rem 0.95rem",
};

type DisplayTone =
	| "auth-required"
	| "blocked"
	| "completed"
	| "degraded"
	| "failed"
	| "pending"
	| "ready"
	| "running"
	| "tooling-gap"
	| "waiting-for-approval";

function formatWorkflow(value: string | null): string {
	if (!value) {
		return "Workflow pending";
	}

	return value.replace(/-/g, " ");
}

function getTone(state: DisplayTone): {
	background: string;
	border: string;
	foreground: string;
	label: string;
} {
	switch (state) {
		case "completed":
			return {
				background: "var(--jh-color-status-completed-bg)",
				border: "var(--jh-color-status-completed-border)",
				foreground: "var(--jh-color-status-completed-fg)",
				label: "Completed",
			};
		case "ready":
			return {
				background: "var(--jh-color-status-ready-bg)",
				border: "var(--jh-color-status-ready-border)",
				foreground: "var(--jh-color-status-ready-fg)",
				label: "Ready",
			};
		case "pending":
			return {
				background: "var(--jh-color-status-pending-bg)",
				border: "var(--jh-color-status-pending-border)",
				foreground: "var(--jh-color-status-pending-fg)",
				label: "Pending",
			};
		case "running":
			return {
				background: "var(--jh-color-status-running-bg)",
				border: "var(--jh-color-status-running-border)",
				foreground: "var(--jh-color-status-running-fg)",
				label: "Running",
			};
		case "waiting-for-approval":
			return {
				background: "var(--jh-color-status-paused-bg)",
				border: "var(--jh-color-status-paused-border)",
				foreground: "var(--jh-color-status-paused-fg)",
				label: "Approval paused",
			};
		case "tooling-gap":
			return {
				background: "var(--jh-color-status-tooling-bg)",
				border: "var(--jh-color-status-tooling-border)",
				foreground: "var(--jh-color-status-tooling-fg)",
				label: "Tooling gap",
			};
		case "auth-required":
			return {
				background: "var(--jh-color-status-auth-required-bg)",
				border: "var(--jh-color-status-auth-required-border)",
				foreground: "var(--jh-color-status-auth-required-fg)",
				label: "Auth required",
			};
		case "degraded":
			return {
				background: "var(--jh-color-status-degraded-bg)",
				border: "var(--jh-color-status-degraded-border)",
				foreground: "var(--jh-color-status-degraded-fg)",
				label: "Degraded",
			};
		case "blocked":
			return {
				background: "var(--jh-color-status-blocked-bg)",
				border: "var(--jh-color-status-blocked-border)",
				foreground: "var(--jh-color-status-blocked-fg)",
				label: "Not ready",
			};
		case "failed":
			return {
				background: "var(--jh-color-status-failed-bg)",
				border: "var(--jh-color-status-failed-border)",
				foreground: "var(--jh-color-status-failed-fg)",
				label: "Failed",
			};
	}
}

function resolveEvaluationDisplay(payload: EvaluationResultSummaryPayload): {
	buttonLabel: string | null;
	details: string[];
	focus: {
		approvalId: string | null;
		sessionId: string | null;
	} | null;
	message: string;
	state: DisplayTone;
	title: string;
} | null {
	const summary = payload.summary;

	if (!summary) {
		return null;
	}

	const sessionId =
		summary.session?.sessionId ?? payload.filters.sessionId ?? null;
	const workflow = formatWorkflow(
		summary.workflow ?? summary.session?.workflow ?? payload.filters.workflow,
	);

	switch (summary.state) {
		case "pending":
			return {
				buttonLabel: null,
				details: [
					sessionId ?? "Run pending",
					workflow,
					summary.job?.status ?? "Job pending",
				],
				focus: null,
				message: summary.message,
				state: "pending",
				title: "Evaluation is queued",
			};
		case "running":
			return {
				buttonLabel: null,
				details: [
					sessionId ?? "Run in progress",
					workflow,
					`${summary.checkpoint.completedStepCount} completed steps`,
				],
				focus: null,
				message: summary.message,
				state: "running",
				title: "Evaluation is running",
			};
		case "approval-paused":
			return {
				buttonLabel: "Open approval review",
				details: [
					sessionId ?? "Approval review pending",
					workflow,
					summary.handoff.approval?.title || "Approval handoff ready",
				],
				focus: {
					approvalId: summary.handoff.approval?.approvalId ?? null,
					sessionId,
				},
				message: summary.message,
				state: "waiting-for-approval",
				title: "Evaluation is waiting for approval",
			};
		case "failed":
			return {
				buttonLabel: summary.handoff.resumeAllowed
					? "Open interrupted run"
					: null,
				details: [
					sessionId ?? "Failed run",
					workflow,
					summary.failure?.jobId ?? "Failure context unavailable",
				],
				focus: summary.handoff.resumeAllowed
					? {
							approvalId: summary.handoff.approval?.approvalId ?? null,
							sessionId,
						}
					: null,
				message: summary.failure?.message ?? summary.message,
				state: "failed",
				title: "Evaluation failed",
			};
		case "completed":
			return {
				buttonLabel: null,
				details: [
					sessionId ?? "Completed run",
					workflow,
					summary.closeout.state,
				],
				focus: null,
				message: summary.closeout.message,
				state: "completed",
				title: "Artifacts are ready for review",
			};
		case "degraded":
			return {
				buttonLabel: null,
				details: [
					sessionId ?? "Degraded run",
					workflow,
					`${summary.warnings.totalCount} warning${summary.warnings.totalCount === 1 ? "" : "s"}`,
				],
				focus: null,
				message: summary.closeout.message,
				state: "degraded",
				title: "Evaluation needs review attention",
			};
		case "empty":
			return {
				buttonLabel: null,
				details: [workflow, "No evaluation run selected"],
				focus: null,
				message: summary.message,
				state: "blocked",
				title: "No evaluation handoff yet",
			};
		case "missing-session":
			return {
				buttonLabel: null,
				details: [sessionId ?? "Missing run", workflow],
				focus: null,
				message: summary.message,
				state: "blocked",
				title: "Selected run was not found",
			};
		case "unsupported-workflow":
			return {
				buttonLabel: null,
				details: [sessionId ?? "Selected run", workflow],
				focus: null,
				message: summary.message,
				state: "blocked",
				title: "Selected run is not an evaluation workflow",
			};
	}
}

function resolveFallbackDisplay(input: {
	command: ChatConsoleCommandHandoff | null;
	selectedSession: ChatConsoleSessionDetail | null;
	selectedWorkflow: ChatConsoleWorkflowOption | null;
	startupMessage: string;
	status: ChatConsoleViewStatus;
}): {
	buttonLabel: string | null;
	details: string[];
	focus: {
		approvalId: string | null;
		sessionId: string | null;
	} | null;
	message: string;
	state: DisplayTone;
	title: string;
} {
	if (input.command) {
		const focus = input.command.pendingApproval
			? {
					approvalId: input.command.pendingApproval.approvalId,
					sessionId:
						input.command.selectedSession?.session.sessionId ??
						input.command.session?.sessionId ??
						null,
				}
			: input.command.state === "waiting-for-approval" ||
					input.command.state === "failed"
				? {
						approvalId: null,
						sessionId:
							input.command.selectedSession?.session.sessionId ??
							input.command.session?.sessionId ??
							null,
					}
				: null;

		return {
			buttonLabel: focus
				? focus.approvalId
					? "Open approval review"
					: "Open interrupted run"
				: null,
			details: [
				input.command.route.workflow ?? "No workflow",
				input.command.specialist?.label ?? "No specialist handoff",
			],
			focus,
			message: input.command.message,
			state:
				input.command.state === "ready"
					? "ready"
					: input.command.state === "running"
						? "running"
						: input.command.state === "waiting-for-approval"
							? "waiting-for-approval"
							: input.command.state === "tooling-gap"
								? "tooling-gap"
								: input.command.state === "auth-required"
									? "auth-required"
									: "failed",
			title: "Latest launch or resume outcome",
		};
	}

	if (input.selectedSession) {
		const focus =
			input.selectedSession.session.pendingApproval ||
			input.selectedSession.session.state === "waiting-for-approval" ||
			input.selectedSession.session.state === "failed"
				? {
						approvalId:
							input.selectedSession.session.pendingApproval?.approvalId ?? null,
						sessionId: input.selectedSession.session.sessionId,
					}
				: null;

		return {
			buttonLabel: focus
				? focus.approvalId
					? "Open approval review"
					: "Open interrupted run"
				: null,
			details: [
				input.selectedSession.session.sessionId,
				input.selectedSession.session.workflow,
			],
			focus,
			message:
				input.selectedSession.failure?.message ??
				input.selectedSession.route.message,
			state:
				input.selectedSession.session.state === "ready"
					? "ready"
					: input.selectedSession.session.state === "running"
						? "running"
						: input.selectedSession.session.state === "waiting-for-approval"
							? "waiting-for-approval"
							: input.selectedSession.session.state === "tooling-gap"
								? "tooling-gap"
								: input.selectedSession.session.state === "auth-required"
									? "auth-required"
									: "failed",
			title: "Selected run state",
		};
	}

	if (
		input.status === "auth-required" ||
		input.status === "expired-auth" ||
		input.status === "invalid-auth" ||
		input.status === "prompt-failure"
	) {
		return {
			buttonLabel: null,
			details: ["Agent runtime", "Startup gate"],
			focus: null,
			message: input.startupMessage,
			state: "auth-required",
			title: "Runtime readiness required",
		};
	}

	if (
		input.status === "missing-prerequisites" ||
		input.status === "runtime-error" ||
		input.status === "error" ||
		input.status === "offline"
	) {
		return {
			buttonLabel: null,
			details: ["Console health", "Startup gate"],
			focus: null,
			message: input.startupMessage,
			state: "failed",
			title: "Console launch is blocked",
		};
	}

	if (input.selectedWorkflow?.status === "tooling-gap") {
		return {
			buttonLabel: null,
			details: [
				input.selectedWorkflow.label,
				input.selectedWorkflow.specialist?.label ?? "No specialist available",
			],
			focus: null,
			message: input.selectedWorkflow.message,
			state: "tooling-gap",
			title: "Selected workflow is blocked",
		};
	}

	return {
		buttonLabel: null,
		details: [
			input.selectedWorkflow?.label ?? "Workflow pending",
			input.selectedWorkflow?.specialist?.label ?? "Backend-owned routing",
		],
		focus: null,
		message:
			input.selectedWorkflow?.message ??
			"Launch a workflow or select a recent run to inspect run state.",
		state: "ready",
		title: "Console is ready",
	};
}

export function RunStatusPanel({
	command,
	error,
	evaluationResult,
	isBusy,
	onOpenApprovals,
	selectedSession,
	selectedWorkflow,
	startupMessage,
	status,
}: RunStatusPanelProps) {
	const display =
		(evaluationResult ? resolveEvaluationDisplay(evaluationResult) : null) ??
		resolveFallbackDisplay({
			command,
			selectedSession,
			selectedWorkflow,
			startupMessage,
			status,
		});
	const tone = getTone(display.state);
	const focus = display.focus;

	return (
		<section
			aria-live="polite"
			aria-labelledby="chat-console-status-title"
			style={panelStyle}
		>
			<div
				style={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.75rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<p
						style={{
							color: "var(--jh-color-nav-muted)",
							fontFamily: "var(--jh-font-body)",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Run status
					</p>
					<h2
						id="chat-console-status-title"
						style={{
							fontFamily: "var(--jh-font-heading)",
							marginBottom: "0.35rem",
						}}
					>
						{display.title}
					</h2>
					<p style={{ color: "var(--jh-color-text-on-ink)", marginBottom: 0 }}>
						{display.message}
					</p>
				</div>
				<span
					style={{
						background: tone.background,
						border: `1px solid ${tone.border}`,
						borderRadius: "var(--jh-radius-pill)",
						color: tone.foreground,
						fontFamily: "var(--jh-font-body)",
						fontSize: "0.88rem",
						fontWeight: 800,
						padding: "0.35rem 0.7rem",
					}}
				>
					{tone.label}
				</span>
			</div>

			<div
				style={{
					display: "grid",
					gap: "0.8rem",
					gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
				}}
			>
				{display.details.map((detail) => (
					<article
						key={detail}
						style={{
							background: "var(--jh-color-nav-item-bg)",
							border: "1px solid var(--jh-color-nav-border)",
							borderRadius: "var(--jh-radius-md)",
							fontFamily: "var(--jh-font-mono)",
							padding: "var(--jh-space-padding-sm)",
						}}
					>
						<p style={{ margin: 0 }}>{detail}</p>
					</article>
				))}
			</div>

			{error ? (
				<section
					style={{
						background: "var(--jh-color-status-error-bg)",
						border: "1px solid var(--jh-color-status-error-border)",
						borderRadius: "var(--jh-radius-md)",
						padding: "var(--jh-space-padding-sm)",
					}}
				>
					<p
						style={{
							color: "var(--jh-color-status-failed-fg)",
							fontFamily: "var(--jh-font-heading)",
							fontWeight: 700,
							marginBottom: "0.3rem",
							marginTop: 0,
						}}
					>
						Error detail
					</p>
					<p style={{ color: "var(--jh-color-status-failed-fg)", margin: 0 }}>
						{error.message}
					</p>
				</section>
			) : null}

			{focus && display.buttonLabel ? (
				<button
					aria-label={display.buttonLabel}
					disabled={isBusy}
					onClick={() => onOpenApprovals(focus)}
					style={{
						...buttonStyle,
						opacity: isBusy ? 0.7 : 1,
					}}
					type="button"
				>
					{display.buttonLabel}
				</button>
			) : null}
		</section>
	);
}

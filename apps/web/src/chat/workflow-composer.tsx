import type { CSSProperties } from "react";
import type {
	ChatConsoleWorkflowIntent,
	ChatConsoleWorkflowOption,
} from "./chat-console-types";
import type {
	ChatConsolePendingAction,
	ChatConsoleViewStatus,
} from "./use-chat-console";

type WorkflowComposerProps = {
	draftInput: string;
	isBusy: boolean;
	onDraftInputChange: (value: string) => void;
	onLaunch: () => void;
	onWorkflowChange: (workflow: ChatConsoleWorkflowIntent) => void;
	pendingAction: ChatConsolePendingAction;
	selectedWorkflow: ChatConsoleWorkflowIntent;
	startupMessage: string;
	status: ChatConsoleViewStatus;
	workflowOptions: ChatConsoleWorkflowOption[];
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "var(--jh-space-gap)",
	padding: "var(--jh-space-padding)",
};

const inputStyle: CSSProperties = {
	appearance: "none",
	background: "var(--jh-color-input-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-text-primary)",
	font: "inherit",
	fontFamily: "var(--jh-font-body)",
	padding: "var(--jh-space-padding-sm)",
	width: "100%",
};

const textareaStyle: CSSProperties = {
	...inputStyle,
	minHeight: "8.5rem",
	resize: "vertical",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontFamily: "var(--jh-font-body)",
	fontWeight: 700,
	minHeight: "2.9rem",
	padding: "0.7rem 1.1rem",
};

function getStartupNotice(status: ChatConsoleViewStatus): {
	background: string;
	borderColor: string;
	title: string;
} | null {
	switch (status) {
		case "auth-required":
		case "expired-auth":
		case "invalid-auth":
		case "prompt-failure":
			return {
				background: "var(--jh-color-status-auth-bg)",
				borderColor: "var(--jh-color-status-auth-bg)",
				title: "Runtime attention required",
			};
		case "missing-prerequisites":
			return {
				background: "var(--jh-color-status-setup-bg)",
				borderColor: "var(--jh-color-status-setup-border)",
				title: "Setup still needs attention",
			};
		case "runtime-error":
		case "error":
			return {
				background: "var(--jh-color-status-error-bg)",
				borderColor: "var(--jh-color-status-error-border)",
				title: "Console launch is blocked",
			};
		case "offline":
			return {
				background: "var(--jh-color-status-blocked-bg)",
				borderColor: "var(--jh-color-status-blocked-border)",
				title: "API currently offline",
			};
		default:
			return null;
	}
}

export function WorkflowComposer({
	draftInput,
	isBusy,
	onDraftInputChange,
	onLaunch,
	onWorkflowChange,
	pendingAction,
	selectedWorkflow,
	startupMessage,
	status,
	workflowOptions,
}: WorkflowComposerProps) {
	const selectedOption =
		workflowOptions.find((option) => option.intent === selectedWorkflow) ??
		null;
	const startupNotice = getStartupNotice(status);
	const isLaunching =
		pendingAction?.kind === "launch" &&
		pendingAction.workflow === selectedWorkflow;

	return (
		<section aria-labelledby="chat-console-composer-title" style={panelStyle}>
			<header>
				<p
					style={{
						color: "var(--jh-color-label-fg)",
						fontFamily: "var(--jh-font-body)",
						letterSpacing: "0.08em",
						marginBottom: "0.35rem",
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					Run composer
				</p>
				<h2
					id="chat-console-composer-title"
					style={{
						fontFamily: "var(--jh-font-heading)",
						marginBottom: "0.4rem",
					}}
				>
					Launch a supported workflow
				</h2>
				<p
					style={{
						color: "var(--jh-color-text-secondary)",
						fontFamily: "var(--jh-font-body)",
						marginBottom: 0,
					}}
				>
					Paste a JD block, ATS URL, or short instruction. Workflow routing,
					tooling readiness, and run ownership are handled automatically.
				</p>
			</header>

			{startupNotice ? (
				<section
					style={{
						background: startupNotice.background,
						border: `1px solid ${startupNotice.borderColor}`,
						borderRadius: "var(--jh-radius-md)",
						padding: "var(--jh-space-padding-sm)",
					}}
				>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						{startupNotice.title}
					</h3>
					<p style={{ margin: 0 }}>{startupMessage}</p>
				</section>
			) : null}

			<div
				style={{
					display: "grid",
					gap: "0.85rem",
					gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
				}}
			>
				<label style={{ display: "grid", gap: "0.45rem" }}>
					<span style={{ fontWeight: 700 }}>Workflow</span>
					<select
						aria-label="Select workflow"
						disabled={isBusy}
						onChange={(event) =>
							onWorkflowChange(
								event.currentTarget.value as ChatConsoleWorkflowIntent,
							)
						}
						style={inputStyle}
						value={selectedWorkflow}
					>
						{workflowOptions.map((option) => (
							<option key={option.intent} value={option.intent}>
								{option.label}
							</option>
						))}
					</select>
				</label>

				<div
					aria-live="polite"
					style={{
						background: "rgba(15, 23, 42, 0.05)",
						border: `1px solid var(--jh-color-surface-border)`,
						borderRadius: "var(--jh-radius-md)",
						padding: "var(--jh-space-padding-sm)",
					}}
				>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							fontFamily: "var(--jh-font-body)",
							marginBottom: "0.2rem",
							marginTop: 0,
						}}
					>
						Preflight
					</p>
					<p
						style={{
							fontFamily: "var(--jh-font-heading)",
							fontWeight: 700,
							marginBottom: "0.3rem",
							marginTop: 0,
						}}
					>
						{selectedOption?.label ?? "Workflow selection required"}
					</p>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							fontFamily: "var(--jh-font-body)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{selectedOption?.message ?? startupMessage}
					</p>
				</div>
			</div>

			{selectedOption?.missingCapabilities.length ? (
				<section
					style={{
						background: "var(--jh-color-status-offline-bg)",
						border: "1px solid var(--jh-color-status-offline-border)",
						borderRadius: "var(--jh-radius-md)",
						padding: "var(--jh-space-padding-sm)",
					}}
				>
					<p style={{ fontWeight: 700, marginBottom: "0.3rem", marginTop: 0 }}>
						Tooling gap
					</p>
					<p style={{ margin: 0 }}>
						Missing capabilities:{" "}
						{selectedOption.missingCapabilities.join(", ")}
					</p>
				</section>
			) : null}

			<label style={{ display: "grid", gap: "0.45rem" }}>
				<span style={{ fontWeight: 700 }}>Request input</span>
				<textarea
					aria-label="Workflow request input"
					disabled={isBusy}
					onChange={(event) => onDraftInputChange(event.currentTarget.value)}
					placeholder="Paste a job description, ATS URL, or short request context for the workflow."
					style={textareaStyle}
					value={draftInput}
				/>
			</label>

			<div
				style={{
					alignItems: "center",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.85rem",
					justifyContent: "space-between",
				}}
			>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						fontFamily: "var(--jh-font-body)",
						margin: 0,
					}}
				>
					Each launch creates a new run. If one is already in progress, use the
					resume controls instead.
				</p>
				<button
					aria-label={`Launch ${selectedOption?.label ?? "workflow"}`}
					disabled={isBusy || pendingAction !== null || status === "loading"}
					onClick={onLaunch}
					style={{
						...buttonStyle,
						opacity:
							isBusy || pendingAction !== null || status === "loading"
								? 0.7
								: 1,
					}}
					type="button"
				>
					{isLaunching ? "Launching..." : "Launch workflow"}
				</button>
			</div>
		</section>
	);
}

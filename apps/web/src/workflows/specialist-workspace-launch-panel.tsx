import type { CSSProperties } from "react";
import type { SpecialistWorkspaceFocus } from "./specialist-workspace-client";
import type {
	SpecialistWorkspaceMode,
	SpecialistWorkspaceSummaryPayload,
	SpecialistWorkspaceWorkflowDescriptor,
} from "./specialist-workspace-types";
import { isSpecialistWorkspaceInlineReviewMode } from "./specialist-workspace-types";
import type {
	SpecialistWorkspaceNotice,
	SpecialistWorkspaceViewStatus,
} from "./use-specialist-workspace";

type SpecialistWorkspaceLaunchPanelProps = {
	focus: SpecialistWorkspaceFocus;
	isBusy: boolean;
	lastUpdatedAt: string | null;
	notice: SpecialistWorkspaceNotice;
	onClearNotice: () => void;
	onClearSelection: () => void;
	onLaunchMode: (mode: SpecialistWorkspaceMode) => void;
	onRefresh: () => void;
	onSelectMode: (mode: SpecialistWorkspaceMode) => void;
	status: SpecialistWorkspaceViewStatus;
	summary: SpecialistWorkspaceSummaryPayload | null;
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "1rem",
	padding: "1rem",
};

const cardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	display: "grid",
	gap: "0.55rem",
	padding: "0.9rem",
};

const buttonStyle: CSSProperties = {
	background: "var(--jh-color-button-bg)",
	border: 0,
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-fg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.35rem",
	padding: "0.55rem 0.9rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "var(--jh-color-button-subtle-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-bg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.2rem",
	padding: "0.45rem 0.8rem",
};

const workflowGridStyle: CSSProperties = {
	display: "grid",
	gap: "0.8rem",
	gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
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

function describeEmptyState(status: SpecialistWorkspaceViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Reading the bounded specialist workspace summary from the API.",
				title: "Loading workflows workspace",
			};
		case "offline":
			return {
				body: "The specialist workspace is unavailable right now, so workflow availability cannot refresh.",
				title: "Workflows workspace offline",
			};
		case "error":
			return {
				body: "The specialist workspace data could not be loaded into the workflow inventory.",
				title: "Workflows workspace unavailable",
			};
		default:
			return {
				body: "Select a workflow family to review intake expectations, support status, and explicit launch controls.",
				title: "No workflows summary yet",
			};
	}
}

function formatSupportStateLabel(value: string): string {
	switch (value) {
		case "tooling-gap":
			return "Tooling gap";
		default:
			return value.charAt(0).toUpperCase() + value.slice(1);
	}
}

function getSupportBadgeStyle(
	supportState: SpecialistWorkspaceWorkflowDescriptor["supportState"],
): CSSProperties {
	return supportState === "ready"
		? {
				background: "var(--jh-color-status-ready-bg)",
				color: "var(--jh-color-status-ready-fg)",
			}
		: {
				background: "var(--jh-color-severity-warn-bg)",
				color: "var(--jh-color-severity-warn-fg)",
			};
}

function renderWorkflowCard(input: {
	descriptor: SpecialistWorkspaceWorkflowDescriptor;
	focus: SpecialistWorkspaceFocus;
	isBusy: boolean;
	onLaunchMode: (mode: SpecialistWorkspaceMode) => void;
	onSelectMode: (mode: SpecialistWorkspaceMode) => void;
}) {
	const { descriptor, focus, isBusy, onLaunchMode, onSelectMode } = input;
	const isSelected =
		descriptor.selected || focus.mode === descriptor.handoff.mode;
	const launchDisabled = isBusy || descriptor.supportState !== "ready";
	const inlineReview = isSpecialistWorkspaceInlineReviewMode(
		descriptor.handoff.mode,
	);

	return (
		<article
			key={descriptor.handoff.mode}
			style={{
				...cardStyle,
				border: isSelected
					? "1px solid var(--jh-color-selected-highlight-border)"
					: cardStyle.border,
				boxShadow: isSelected
					? "0 0 0 1px var(--jh-color-selected-highlight-shadow)"
					: "none",
			}}
		>
			<div
				style={{
					alignItems: "start",
					display: "flex",
					gap: "0.75rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						{descriptor.handoff.label}
					</h3>
					<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
						{descriptor.handoff.specialistLabel} | {descriptor.handoff.family}
					</p>
				</div>
				<span
					style={{
						...getSupportBadgeStyle(descriptor.supportState),
						borderRadius: "var(--jh-radius-pill)",
						fontSize: "0.82rem",
						fontWeight: 700,
						padding: "0.2rem 0.6rem",
					}}
				>
					{formatSupportStateLabel(descriptor.supportState)}
				</span>
			</div>

			<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
				{descriptor.message}
			</p>
			<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
				Intake: {descriptor.intake.message}
			</p>
			<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
				Saved state:{" "}
				{descriptor.intake.requiresSavedState ? "required" : "optional"} |
				Summary:{" "}
				{inlineReview
					? "inline review in workflows"
					: descriptor.summaryAvailability}
			</p>
			{descriptor.missingCapabilities.length > 0 ? (
				<p style={{ color: "var(--jh-color-severity-warn-fg)", margin: 0 }}>
					Missing capabilities: {descriptor.missingCapabilities.join(", ")}
				</p>
			) : null}

			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
				<button
					aria-label={`Review ${descriptor.handoff.label} state`}
					onClick={() => onSelectMode(descriptor.handoff.mode)}
					style={subtleButtonStyle}
					type="button"
				>
					{isSelected ? "Selected" : "Review state"}
				</button>
				<button
					aria-label={`Launch ${descriptor.handoff.label}`}
					disabled={launchDisabled}
					onClick={() => onLaunchMode(descriptor.handoff.mode)}
					style={{
						...buttonStyle,
						opacity: launchDisabled ? 0.6 : 1,
					}}
					type="button"
				>
					{descriptor.supportState === "ready" ? "Launch" : "Tooling gap"}
				</button>
			</div>
		</article>
	);
}

export function SpecialistWorkspaceLaunchPanel({
	focus,
	isBusy,
	lastUpdatedAt,
	notice,
	onClearNotice,
	onClearSelection,
	onLaunchMode,
	onRefresh,
	onSelectMode,
	status,
	summary,
}: SpecialistWorkspaceLaunchPanelProps) {
	if (!summary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="specialist-workspace-launch-title"
				style={panelStyle}
			>
				<header
					style={{
						alignItems: "start",
						display: "flex",
						flexWrap: "wrap",
						gap: "0.8rem",
						justifyContent: "space-between",
					}}
				>
					<div>
						<h2
							id="specialist-workspace-launch-title"
							style={{ marginBottom: "0.35rem", marginTop: 0 }}
						>
							Specialist workflows inventory
						</h2>
						<p
							style={{
								color: "var(--jh-color-text-muted)",
								marginBottom: 0,
								marginTop: 0,
							}}
						>
							Review the typed workflow inventory, then launch specialist work
							through explicit backend-owned actions.
						</p>
					</div>

					<div style={{ display: "grid", gap: "0.45rem", justifyItems: "end" }}>
						<button
							aria-label="Refresh workflows workspace"
							onClick={onRefresh}
							style={buttonStyle}
							type="button"
						>
							Refresh
						</button>
						<span
							style={{
								color: "var(--jh-color-text-muted)",
								fontSize: "0.92rem",
							}}
						>
							Last updated: {formatTimestamp(lastUpdatedAt)}
						</span>
					</div>
				</header>

				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{emptyState.body}
					</p>
				</section>
			</section>
		);
	}

	const readyWorkflows = summary.workflows.filter(
		(workflow) => workflow.supportState === "ready",
	);
	const toolingGapWorkflows = summary.workflows.filter(
		(workflow) => workflow.supportState === "tooling-gap",
	);
	const selectedLabel =
		summary.selected.summary?.handoff.label ??
		summary.workflows.find((workflow) => workflow.selected)?.handoff.label ??
		"Workflow catalog";

	return (
		<section
			aria-labelledby="specialist-workspace-launch-title"
			style={panelStyle}
		>
			<header
				style={{
					alignItems: "start",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.8rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h2
						id="specialist-workspace-launch-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						Specialist workflows inventory
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{summary.selected.message}
					</p>
				</div>

				<div style={{ display: "grid", gap: "0.45rem", justifyItems: "end" }}>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
						{(focus.mode || focus.sessionId) && (
							<button
								aria-label="Clear specialist workflow selection"
								disabled={isBusy}
								onClick={onClearSelection}
								style={{
									...subtleButtonStyle,
									opacity: isBusy ? 0.7 : 1,
								}}
								type="button"
							>
								Clear focus
							</button>
						)}
						<button
							aria-label="Refresh workflows workspace"
							disabled={isBusy}
							onClick={onRefresh}
							style={{
								...buttonStyle,
								opacity: isBusy ? 0.7 : 1,
							}}
							type="button"
						>
							Refresh
						</button>
					</div>
					<span
						style={{ color: "var(--jh-color-text-muted)", fontSize: "0.92rem" }}
					>
						Last updated: {formatTimestamp(lastUpdatedAt)}
					</span>
				</div>
			</header>

			{notice ? (
				<section
					aria-live="polite"
					style={{
						background:
							notice.kind === "success"
								? "var(--jh-color-status-ready-bg)"
								: notice.kind === "warn"
									? "var(--jh-color-severity-warn-bg)"
									: "var(--jh-color-severity-info-bg)",
						border: `1px solid ${
							notice.kind === "success"
								? "var(--jh-color-status-ready-border)"
								: notice.kind === "warn"
									? "var(--jh-color-status-offline-border)"
									: "#93c5fd"
						}`,
						borderRadius: "var(--jh-radius-md)",
						display: "grid",
						gap: "0.5rem",
						padding: "0.85rem 0.95rem",
					}}
				>
					<div
						style={{
							alignItems: "center",
							display: "flex",
							gap: "0.75rem",
							justifyContent: "space-between",
						}}
					>
						<strong>
							{notice.kind === "success"
								? "Workflow action applied"
								: notice.kind === "warn"
									? "Workflow action needs attention"
									: "Workflow action update"}
						</strong>
						<button
							aria-label="Dismiss specialist workspace notice"
							onClick={onClearNotice}
							style={subtleButtonStyle}
							type="button"
						>
							Dismiss
						</button>
					</div>
					<p style={{ margin: 0 }}>{notice.message}</p>
				</section>
			) : null}

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Selected focus</h3>
				<p style={{ margin: 0 }}>
					<strong>{selectedLabel}</strong>
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					{summary.message}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					Query focus: {focus.mode ?? "catalog"} | Session:{" "}
					{focus.sessionId ?? "latest or none"}
				</p>
			</section>

			{summary.workflows.length === 0 ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						No specialist workflows configured
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{summary.message}
					</p>
				</section>
			) : null}

			{readyWorkflows.length > 0 ? (
				<section style={{ display: "grid", gap: "0.75rem" }}>
					<div>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>Ready now</h3>
						<p
							style={{
								color: "var(--jh-color-text-muted)",
								marginBottom: 0,
								marginTop: 0,
							}}
						>
							Workflows that can launch or resume today.
						</p>
					</div>
					<div style={workflowGridStyle}>
						{readyWorkflows.map((descriptor) =>
							renderWorkflowCard({
								descriptor,
								focus,
								isBusy,
								onLaunchMode,
								onSelectMode,
							}),
						)}
					</div>
				</section>
			) : null}

			{toolingGapWorkflows.length > 0 ? (
				<section style={{ display: "grid", gap: "0.75rem" }}>
					<div>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
							Tooling gaps
						</h3>
						<p
							style={{
								color: "var(--jh-color-text-muted)",
								marginBottom: 0,
								marginTop: 0,
							}}
						>
							Specialist routes that are visible in the catalog but still
							blocked on typed tooling or summary work.
						</p>
					</div>
					<div style={workflowGridStyle}>
						{toolingGapWorkflows.map((descriptor) =>
							renderWorkflowCard({
								descriptor,
								focus,
								isBusy,
								onLaunchMode,
								onSelectMode,
							}),
						)}
					</div>
				</section>
			) : null}
		</section>
	);
}

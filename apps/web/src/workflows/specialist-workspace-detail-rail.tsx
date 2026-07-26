import type { CSSProperties } from "react";
import type {
	SpecialistWorkspaceDetailSurface,
	SpecialistWorkspaceMode,
	SpecialistWorkspaceSummaryPayload,
} from "./specialist-workspace-types";
import type { SpecialistWorkspaceViewStatus } from "./use-specialist-workspace";

type SpecialistWorkspaceDetailRailProps = {
	onClearSelection: () => void;
	onOpenApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	onOpenChatConsole: (focus: { sessionId: string | null }) => void;
	onOpenDetailSurface: (input: {
		mode: SpecialistWorkspaceMode;
		path: SpecialistWorkspaceDetailSurface["path"];
		sessionId: string | null;
	}) => void;
	status: SpecialistWorkspaceViewStatus;
	summary: SpecialistWorkspaceSummaryPayload | null;
};

const railStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	display: "grid",
	gap: "0.95rem",
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
	minHeight: "2.2rem",
	padding: "0.5rem 0.85rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "var(--jh-color-button-subtle-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-pill)",
	color: "var(--jh-color-button-bg)",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.1rem",
	padding: "0.45rem 0.8rem",
};

function describeEmptyState(status: SpecialistWorkspaceViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Loading handoff routes, detail metadata, and tool previews for the selected workflow.",
				title: "Loading workflow handoffs",
			};
		case "offline":
			return {
				body: "The specialist workspace is unavailable right now, so explicit handoffs cannot refresh.",
				title: "Workflow handoffs offline",
			};
		case "error":
			return {
				body: "The selected workflow handoff rail data could not be loaded.",
				title: "Workflow handoffs unavailable",
			};
		default:
			return {
				body: "Select a workflow with dedicated detail to inspect explicit handoff routes. Inline tracker and research review now stay in the workflows workspace.",
				title: "No handoff selected",
			};
	}
}

export function SpecialistWorkspaceDetailRail({
	onClearSelection,
	onOpenApprovals,
	onOpenChatConsole,
	onOpenDetailSurface,
	status,
	summary,
}: SpecialistWorkspaceDetailRailProps) {
	const selectedSummary = summary?.selected.summary ?? null;

	if (!selectedSummary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="specialist-workspace-detail-title"
				style={railStyle}
			>
				<header>
					<h2
						id="specialist-workspace-detail-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						Detail and handoffs
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						Keep specialist detail views and cross-shell routes explicit.
					</p>
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

	const descriptor =
		summary?.workflows.find(
			(workflow) => workflow.handoff.mode === selectedSummary.handoff.mode,
		) ?? null;
	const detailSurface =
		selectedSummary.result.detailSurface ??
		selectedSummary.handoff.detailSurface;
	const chatSessionId =
		selectedSummary.session?.sessionId ?? selectedSummary.nextAction.sessionId;

	return (
		<section
			aria-labelledby="specialist-workspace-detail-title"
			style={railStyle}
		>
			<header>
				<h2
					id="specialist-workspace-detail-title"
					style={{ marginBottom: "0.35rem", marginTop: 0 }}
				>
					Detail and handoffs
				</h2>
				<p
					style={{
						color: "var(--jh-color-text-muted)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
					{selectedSummary.handoff.mode === "application-help"
						? "Application-help keeps detailed review in its own workspace, while the workflows shell keeps the handoff explicit."
						: selectedSummary.result.message}
				</p>
			</header>

			<section style={cardStyle}>
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
							Explicit handoffs
						</h3>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							Navigate from the shared workflows workspace into dedicated review
							areas without guessing from repo artifacts or duplicating the
							review UI in the browser shell.
						</p>
					</div>
					<button
						aria-label="Clear selected specialist workflow"
						onClick={onClearSelection}
						style={subtleButtonStyle}
						type="button"
					>
						Clear
					</button>
				</div>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						aria-label="Open the dedicated detail view for the selected specialist workflow"
						disabled={detailSurface === null}
						onClick={() => {
							if (!detailSurface) {
								return;
							}

							onOpenDetailSurface({
								mode: selectedSummary.handoff.mode,
								path: detailSurface.path,
								sessionId: selectedSummary.session?.sessionId ?? null,
							});
						}}
						style={{
							...buttonStyle,
							opacity: detailSurface === null ? 0.6 : 1,
						}}
						type="button"
					>
						{detailSurface ? detailSurface.label : "No detail view"}
					</button>
					<button
						aria-label="Open approvals for the selected specialist workflow"
						disabled={selectedSummary.approval === null}
						onClick={() =>
							onOpenApprovals({
								approvalId: selectedSummary.approval?.approvalId ?? null,
								sessionId: selectedSummary.session?.sessionId ?? null,
							})
						}
						style={{
							...subtleButtonStyle,
							opacity: selectedSummary.approval === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open approvals
					</button>
					<button
						aria-label="Open chat for the selected specialist workflow"
						disabled={chatSessionId === null}
						onClick={() =>
							onOpenChatConsole({
								sessionId: chatSessionId,
							})
						}
						style={{
							...subtleButtonStyle,
							opacity: chatSessionId === null ? 0.6 : 1,
						}}
						type="button"
					>
						Open chat
					</button>
				</div>
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
					Intake and support
				</h3>
				<p style={{ margin: 0 }}>
					<strong>{selectedSummary.handoff.label}</strong>
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					Repo mode: {selectedSummary.handoff.modeRepoRelativePath}
				</p>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					Workspace path: {selectedSummary.handoff.workspacePath}
				</p>
				{descriptor ? (
					<>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							{descriptor.intake.message}
						</p>
						<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
							Missing capabilities:{" "}
							{descriptor.missingCapabilities.length > 0
								? descriptor.missingCapabilities.join(", ")
								: "none"}
						</p>
					</>
				) : null}
			</section>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>Tool preview</h3>
				<p style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}>
					{selectedSummary.handoff.toolPreview.fallbackApplied
						? "Fallback preview applied."
						: "Direct tool preview available."}{" "}
					Hidden tools: {selectedSummary.handoff.toolPreview.hiddenToolCount}.
				</p>
				<div style={{ display: "grid", gap: "0.35rem" }}>
					{selectedSummary.handoff.toolPreview.items.map((tool) => (
						<p
							key={`${tool.access}:${tool.name}`}
							style={{ color: "var(--jh-color-text-secondary)", margin: 0 }}
						>
							{tool.name} ({tool.access})
						</p>
					))}
				</div>
			</section>
		</section>
	);
}

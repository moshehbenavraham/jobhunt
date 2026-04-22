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
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	display: "grid",
	gap: "0.95rem",
	padding: "1rem",
};

const cardStyle: CSSProperties = {
	background: "rgba(248, 250, 252, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.18)",
	borderRadius: "1rem",
	display: "grid",
	gap: "0.55rem",
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
	minHeight: "2.2rem",
	padding: "0.5rem 0.85rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "rgba(15, 23, 42, 0.08)",
	border: "1px solid rgba(148, 163, 184, 0.3)",
	borderRadius: "999px",
	color: "#0f172a",
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
				body: "Loading handoff routes, detail-surface metadata, and tool previews for the selected workflow.",
				title: "Loading workflow handoffs",
			};
		case "offline":
			return {
				body: "The specialist workspace endpoint is offline, so explicit handoffs cannot refresh right now.",
				title: "Workflow handoffs offline",
			};
		case "error":
			return {
				body: "The selected workflow handoff rail could not be rendered from the summary payload.",
				title: "Workflow handoffs unavailable",
			};
		default:
			return {
				body: "Select a workflow with a dedicated detail surface to inspect explicit handoff routes. Inline tracker and research review now stay in the workflows surface.",
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
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Keep specialist detail surfaces and cross-shell routes explicit.
					</p>
				</header>

				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.2rem", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
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
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					{selectedSummary.handoff.mode === "application-help"
						? "Application-help keeps detailed review in its own surface, while the workflows shell keeps the handoff explicit."
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
						<p style={{ color: "#475569", margin: 0 }}>
							Route from the shared workflows surface into dedicated review
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
						aria-label="Open the dedicated detail surface for the selected specialist workflow"
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
						{detailSurface ? detailSurface.label : "No detail surface"}
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
				<p style={{ color: "#475569", margin: 0 }}>
					Repo mode: {selectedSummary.handoff.modeRepoRelativePath}
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					Workspace path: {selectedSummary.handoff.workspacePath}
				</p>
				{descriptor ? (
					<>
						<p style={{ color: "#475569", margin: 0 }}>
							{descriptor.intake.message}
						</p>
						<p style={{ color: "#475569", margin: 0 }}>
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
				<p style={{ color: "#475569", margin: 0 }}>
					{selectedSummary.handoff.toolPreview.fallbackApplied
						? "Fallback preview applied."
						: "Direct tool preview available."}{" "}
					Hidden tools: {selectedSummary.handoff.toolPreview.hiddenToolCount}.
				</p>
				<div style={{ display: "grid", gap: "0.35rem" }}>
					{selectedSummary.handoff.toolPreview.items.map((tool) => (
						<p
							key={`${tool.access}:${tool.name}`}
							style={{ color: "#475569", margin: 0 }}
						>
							{tool.name} ({tool.access})
						</p>
					))}
				</div>
			</section>
		</section>
	);
}

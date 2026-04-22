import type { CSSProperties } from "react";
import type {
	OperatorShellSummaryPayload,
	ShellSurfaceDefinition,
} from "./shell-types";

type SurfacePlaceholderProps = {
	summary: OperatorShellSummaryPayload | null;
	surface: ShellSurfaceDefinition;
};

const shellCardStyle: CSSProperties = {
	background: "#ffffff",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	padding: "1.1rem 1.15rem",
};

function getPlaceholderBody(
	surface: ShellSurfaceDefinition,
	summary: OperatorShellSummaryPayload | null,
): {
	body: string;
	highlights: string[];
	title: string;
} {
	switch (surface.id) {
		case "chat":
			return {
				body: "The shell already tracks runtime activity and current session context. Session 02 will attach the live chat console and resume controls inside this frame.",
				highlights: [
					summary?.activity.activeSession
						? `Active workflow: ${summary.activity.activeSession.workflow}`
						: "No runtime session is active yet.",
					`${summary?.activity.recentFailureCount ?? 0} recent failures are already visible to the shell.`,
					"No transcript or submit actions are enabled in Session 01.",
				],
				title: "Chat console lands in Session 02",
			};
		case "artifacts":
			return {
				body: "Phase 04 adds the dedicated artifact review surface here. The placeholder keeps the shell registry exhaustive until the real report viewer is mounted.",
				highlights: [
					"Report review stays read-only and backend-owned.",
					"Recent report and PDF browsing will land without widening filesystem access in the browser.",
					"Chat handoff can target this surface once the report viewer is wired.",
				],
				title: "Artifact review lands in Phase 04",
			};
		case "scan":
			return {
				body: "Phase 05 adds the dedicated scan workspace here. The placeholder keeps the shell registry exhaustive until shortlist review and launch handoffs are mounted.",
				highlights: [
					"Scan review stays bounded by the backend-owned shortlist summary route.",
					"Ignore, restore, evaluate, and batch-seed actions continue to flow through backend routes instead of browser-owned file writes.",
					"Selected scan candidates will hand off into chat rather than inventing a separate browser workflow launcher.",
				],
				title: "Scan workspace lands in Phase 05",
			};
		case "batch":
			return {
				body: "Phase 05 adds the dedicated batch workspace here. The placeholder keeps the shell registry exhaustive until bounded run supervision and closeout handoffs are mounted.",
				highlights: [
					"Batch review stays bounded by the backend-owned batch-supervisor summary route.",
					"Resume, retry, merge, and verify controls continue to flow through backend routes instead of browser-owned repo mutations.",
					"Selected batch items will hand off into report, tracker, approvals, and chat surfaces instead of creating parallel review paths.",
				],
				title: "Batch workspace lands in Phase 05",
			};
		case "application-help":
			return {
				body: "Phase 05 adds the dedicated application-help workspace here. The placeholder keeps the shell registry exhaustive until draft review, approval handoffs, and resumable launch controls are mounted.",
				highlights: [
					"Application-help review stays bounded by the backend-owned summary route instead of raw draft files.",
					"Launch and resume continue through the existing chat orchestration path instead of a second browser-owned runner.",
					"Approval, artifact, and chat handoffs stay explicit so the no-submit boundary remains visible in the shell.",
				],
				title: "Application-help workspace lands in Phase 05",
			};
		case "tracker":
			return {
				body: "Phase 04 adds the dedicated tracker workspace here. The placeholder keeps the shell registry exhaustive until the tracker review and integrity controls are mounted.",
				highlights: [
					"Tracker review stays backend-owned and preserves the markdown tracker contract.",
					"Canonical status updates and maintenance actions will reuse allowlisted tools instead of browser-side file writes.",
					"Report handoff will stay inside the existing artifact viewer surface.",
				],
				title: "Tracker workspace lands in Phase 04",
			};
		case "pipeline":
			return {
				body: "Phase 04 adds the dedicated pipeline review workspace here. The placeholder keeps the shell registry exhaustive until the real queue surface is mounted.",
				highlights: [
					"Pipeline review stays read-only and backend-owned.",
					"Queue filters, row selection, and shortlist context will land without exposing raw markdown parsing to the browser.",
					"Evaluation closeout can hand off here once the queue workspace is wired.",
				],
				title: "Pipeline review lands in Phase 04",
			};
		case "onboarding":
			return {
				body: "Session 03 owns the onboarding wizard. This placeholder keeps the future surface stable while the shell already exposes startup readiness and missing-file counts.",
				highlights: [
					`${summary?.health.missing.onboarding ?? 0} required onboarding files are still missing.`,
					`${summary?.health.missing.optional ?? 0} optional surfaces are absent from the repo summary.`,
					"Repair actions remain read-only in Session 01.",
				],
				title: "Onboarding wizard lands in Session 03",
			};
		case "approvals":
			return {
				body: "Session 04 will turn this surface into the approval inbox. The shell already knows the pending count and can show the latest queued request without exposing raw store rows.",
				highlights: [
					`${summary?.activity.pendingApprovalCount ?? 0} approvals are pending right now.`,
					summary?.activity.latestPendingApprovals[0]
						? `Latest approval: ${summary.activity.latestPendingApprovals[0].title}`
						: "No approvals are waiting at the moment.",
					"Approve and reject actions stay disabled until Session 04.",
				],
				title: "Approval inbox lands in Session 04",
			};
		case "settings":
			return {
				body: "Session 05 will add auth and maintenance controls here. For now the shell keeps package, current spec-session, and store health context visible so settings work has a stable home.",
				highlights: [
					`Package scope: ${summary?.currentSession.packagePath ?? "cross-cutting"}`,
					`Store status: ${summary?.health.operationalStore.status ?? "unknown"}`,
					`Agent runtime: ${summary?.health.agentRuntime.status ?? "unknown"}`,
				],
				title: "Settings surface lands in Session 05",
			};
		case "startup":
			return {
				body: "Startup is the one fully populated surface in Session 01 and should not render through the generic placeholder.",
				highlights: [],
				title: "Startup",
			};
	}
}

export function SurfacePlaceholder({
	summary,
	surface,
}: SurfacePlaceholderProps) {
	const copy = getPlaceholderBody(surface, summary);

	return (
		<section
			aria-labelledby={`surface-title-${surface.id}`}
			style={{
				display: "grid",
				gap: "1rem",
			}}
		>
			<header style={shellCardStyle}>
				<p
					style={{
						color: "#7c2d12",
						letterSpacing: "0.08em",
						marginBottom: "0.5rem",
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					{surface.owner}
				</p>
				<h2
					id={`surface-title-${surface.id}`}
					style={{ marginBottom: "0.45rem" }}
				>
					{copy.title}
				</h2>
				<p style={{ color: "#475569", marginBottom: 0 }}>{copy.body}</p>
			</header>

			<div
				style={{
					display: "grid",
					gap: "0.95rem",
					gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
				}}
			>
				{copy.highlights.map((highlight) => (
					<article key={highlight} style={shellCardStyle}>
						<p style={{ margin: 0 }}>{highlight}</p>
					</article>
				))}
			</div>
		</section>
	);
}

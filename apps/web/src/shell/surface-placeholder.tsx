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
		case "home":
			return {
				body: "Home is a dedicated area and does not use this placeholder.",
				highlights: [],
				title: "Home",
			};
		case "chat":
			return {
				body: "This area will host the live evaluation console and resume controls. Runtime activity is already tracked.",
				highlights: [
					summary?.activity.activeSession
						? `Active workflow: ${summary.activity.activeSession.workflow}`
						: "No active workflow right now.",
					`${summary?.activity.recentFailureCount ?? 0} recent interrupted runs.`,
					"Evaluation controls are not yet available here.",
				],
				title: "Evaluation console -- coming soon",
			};
		case "artifacts":
			return {
				body: "This area will show reports and PDFs once the viewer is ready. All artifacts stay read-only.",
				highlights: [
					"Reports stay read-only and backend-managed.",
					"PDF browsing will land without extra file access.",
					"Evaluations can link here once the viewer is wired.",
				],
				title: "Report viewer -- coming soon",
			};
		case "scan":
			return {
				body: "This area will host shortlist review and scan launch controls. Scan results are backend-managed.",
				highlights: [
					"Shortlist review is backend-managed.",
					"Ignore, restore, and evaluate actions go through the backend.",
					"Selected candidates hand off into evaluation.",
				],
				title: "Scan workspace -- coming soon",
			};
		case "workflows":
			return {
				body: "This area will host the specialist workflow catalog, launch and resume controls, and detail handoffs.",
				highlights: [
					"Workflow review is backend-managed.",
					"Launch and resume go through the backend.",
					"Detail and approval handoffs stay explicit.",
				],
				title: "Workflows workspace -- coming soon",
			};
		case "batch":
			return {
				body: "This area will host batch run supervision and closeout handoffs. Batch data is backend-managed.",
				highlights: [
					"Batch review is backend-managed.",
					"Resume, retry, merge, and verify go through the backend.",
					"Results hand off into reports, tracker, and approvals.",
				],
				title: "Batch workspace -- coming soon",
			};
		case "application-help":
			return {
				body: "This area will host application draft review, approval handoffs, and resumable launch controls.",
				highlights: [
					"Draft review is backend-managed.",
					"Launch and resume go through evaluation orchestration.",
					"Approval and artifact handoffs stay explicit.",
				],
				title: "Application help -- coming soon",
			};
		case "tracker":
			return {
				body: "This area will host tracker review and integrity controls. Tracker data follows the markdown format.",
				highlights: [
					"Tracker review is backend-managed.",
					"Status updates use allowlisted tools.",
					"Report links open in the report viewer.",
				],
				title: "Tracker workspace -- coming soon",
			};
		case "pipeline":
			return {
				body: "This area will host queue review with filters, row selection, and shortlist context.",
				highlights: [
					"Queue review stays read-only and backend-managed.",
					"Filters and selection land without raw markdown parsing.",
					"Evaluation closeout can hand off here.",
				],
				title: "Pipeline review -- coming soon",
			};
		case "onboarding":
			return {
				body: "This area guides first-run setup and prerequisite repair. Readiness and missing-file counts are already tracked.",
				highlights: [
					`${summary?.health.missing.onboarding ?? 0} required files still missing.`,
					`${summary?.health.missing.optional ?? 0} optional items absent.`,
					"Repair actions are not yet available here.",
				],
				title: "Onboarding wizard -- coming soon",
			};
		case "approvals":
			return {
				body: "This area will become the approval inbox. Pending counts and latest requests are already tracked.",
				highlights: [
					`${summary?.activity.pendingApprovalCount ?? 0} approvals pending right now.`,
					summary?.activity.latestPendingApprovals[0]
						? `Latest: ${summary.activity.latestPendingApprovals[0].title}`
						: "No approvals waiting.",
					"Approve and reject actions are not yet available here.",
				],
				title: "Approval inbox -- coming soon",
			};
		case "settings":
			return {
				body: "This area will host auth and maintenance controls. Environment health is already tracked.",
				highlights: [
					`Package scope: ${summary?.currentSession.packagePath ?? "all packages"}`,
					`Store: ${summary?.health.operationalStore.status ?? "unknown"}`,
					`Runtime: ${summary?.health.agentRuntime.status ?? "unknown"}`,
				],
				title: "Settings -- coming soon",
			};
		case "startup":
			return {
				body: "Startup diagnostics are a dedicated area and do not use this placeholder.",
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

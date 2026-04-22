import type { CSSProperties } from "react";
import type {
	ResearchSpecialistPacket,
	ResearchSpecialistSummaryPayload,
} from "./research-specialist-review-types";
import type { SpecialistReviewStatus } from "./use-specialist-review";

type ResearchSpecialistReviewPanelProps = {
	status: SpecialistReviewStatus;
	summary: ResearchSpecialistSummaryPayload | null;
};

const panelStyle: CSSProperties = {
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
	gap: "0.6rem",
	padding: "0.9rem",
};

function formatStateLabel(value: string): string {
	switch (value) {
		case "approval-paused":
			return "Approval paused";
		case "deep-company-research":
			return "Deep research";
		case "interview-prep":
			return "Interview prep";
		case "linkedin-outreach":
			return "LinkedIn outreach";
		case "missing-input":
			return "Missing input";
		case "no-packet-yet":
			return "No packet yet";
		case "project-review":
			return "Project review";
		case "training-review":
			return "Training review";
		default:
			return value
				.split("-")
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join(" ");
	}
}

function describeEmptyState(status: SpecialistReviewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Loading research-specialist narrative detail from the bounded review route.",
				title: "Loading narrative review",
			};
		case "offline":
			return {
				body: "The research-specialist review endpoint is offline, so the last narrative packet cannot refresh right now.",
				title: "Narrative review offline",
			};
		case "error":
			return {
				body: "The research-specialist review payload could not be parsed into a narrative summary.",
				title: "Narrative review unavailable",
			};
		default:
			return {
				body: "Select a deep research, outreach, interview, training, or project workflow to inspect the bounded narrative packet here.",
				title: "No narrative review selected",
			};
	}
}

function renderPacket(packet: ResearchSpecialistPacket) {
	switch (packet.mode) {
		case "deep-company-research":
			return (
				<>
					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Research sections
						</h3>
						{Object.entries(packet.sections).map(([key, values]) => (
							<div key={key} style={{ display: "grid", gap: "0.2rem" }}>
								<p style={{ fontWeight: 700, margin: 0 }}>
									{formatStateLabel(key)}
								</p>
								<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
									{values.map((value) => (
										<li key={value}>{value}</li>
									))}
								</ul>
							</div>
						))}
					</section>

					{packet.sources.length > 0 ? (
						<section style={cardStyle}>
							<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>Sources</h3>
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{packet.sources.map((source) => (
									<li key={`${source.label}:${source.note}`}>
										<strong>{source.label}</strong>: {source.note}
										{source.url ? ` (${source.url})` : ""}
									</li>
								))}
							</ul>
						</section>
					) : null}
				</>
			);
		case "linkedin-outreach":
			return (
				<>
					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Message draft
						</h3>
						<p style={{ margin: 0 }}>
							Primary target:{" "}
							<strong>
								{packet.primaryTarget.name ??
									packet.primaryTarget.title ??
									"Unknown"}
							</strong>
						</p>
						<p style={{ color: "#475569", margin: 0 }}>
							Language: {packet.language} | Characters: {packet.characterCount}
						</p>
						<p style={{ color: "#475569", margin: 0 }}>{packet.messageDraft}</p>
					</section>

					{packet.alternativeTargets.length > 0 ? (
						<section style={cardStyle}>
							<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
								Alternative targets
							</h3>
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{packet.alternativeTargets.map((target) => (
									<li key={`${target.name ?? target.title ?? "target"}`}>
										{target.name ?? "Unknown"} -{" "}
										{target.title ?? "Title unavailable"}
									</li>
								))}
							</ul>
						</section>
					) : null}
				</>
			);
		case "interview-prep":
			return (
				<>
					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Process overview
						</h3>
						<p style={{ margin: 0 }}>
							Format: {packet.processOverview.format ?? "Unknown"} | Difficulty:{" "}
							{packet.processOverview.difficulty ?? "Unknown"}
						</p>
						<p style={{ color: "#475569", margin: 0 }}>
							Rounds: {packet.processOverview.rounds ?? "Unknown"}
						</p>
						{packet.processOverview.knownQuirks.length > 0 ? (
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{packet.processOverview.knownQuirks.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						) : null}
					</section>

					<section style={cardStyle}>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Rounds and checklist
						</h3>
						{packet.rounds.map((round) => (
							<article
								key={round.name}
								style={{ display: "grid", gap: "0.15rem" }}
							>
								<p style={{ fontWeight: 700, margin: 0 }}>{round.name}</p>
								<p style={{ color: "#475569", margin: 0 }}>
									Conducted by: {round.conductedBy ?? "Unknown"} | Duration:{" "}
									{round.duration ?? "Unknown"}
								</p>
							</article>
						))}
						{packet.technicalChecklist.length > 0 ? (
							<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
								{packet.technicalChecklist.map((item) => (
									<li key={`${item.topic}:${item.reason}`}>
										{item.topic}: {item.reason}
									</li>
								))}
							</ul>
						) : null}
					</section>
				</>
			);
		case "training-review":
			return (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
						Training verdict
					</h3>
					<p style={{ margin: 0 }}>
						<strong>{formatStateLabel(packet.verdict)}</strong> -{" "}
						{packet.trainingTitle}
					</p>
					{packet.betterAlternative ? (
						<p style={{ color: "#475569", margin: 0 }}>
							Better alternative: {packet.betterAlternative}
						</p>
					) : null}
					<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
						{packet.dimensions.map((item) => (
							<li key={item.dimension}>
								{item.dimension}: {item.score}/5 - {item.rationale}
							</li>
						))}
					</ul>
				</section>
			);
		case "project-review":
			return (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
						Project verdict
					</h3>
					<p style={{ margin: 0 }}>
						<strong>{formatStateLabel(packet.verdict)}</strong> -{" "}
						{packet.projectTitle}
					</p>
					{packet.betterAlternative ? (
						<p style={{ color: "#475569", margin: 0 }}>
							Better alternative: {packet.betterAlternative}
						</p>
					) : null}
					<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
						{packet.milestones.map((item) => (
							<li key={`${item.label}:${item.deliverable}`}>
								{item.label}: {item.deliverable}
							</li>
						))}
					</ul>
				</section>
			);
	}
}

export function ResearchSpecialistReviewPanel({
	status,
	summary,
}: ResearchSpecialistReviewPanelProps) {
	const selectedSummary = summary?.selected.summary ?? null;

	if (!selectedSummary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="research-specialist-review-title"
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
						Narrative review
					</p>
					<h2
						id="research-specialist-review-title"
						style={{ marginBottom: "0.35rem" }}
					>
						{emptyState.title}
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						{emptyState.body}
					</p>
				</header>
			</section>
		);
	}

	const context = selectedSummary.context;

	return (
		<section
			aria-labelledby="research-specialist-review-title"
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
					<p
						style={{
							color: "#475569",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Narrative review
					</p>
					<h2
						id="research-specialist-review-title"
						style={{ marginBottom: "0.35rem" }}
					>
						{selectedSummary.workflow.label}
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						{selectedSummary.message}
					</p>
				</div>
				<span
					style={{
						background:
							selectedSummary.state === "rejected"
								? "#fee2e2"
								: selectedSummary.state === "approval-paused"
									? "#fef3c7"
									: "#dbeafe",
						borderRadius: "999px",
						color:
							selectedSummary.state === "rejected"
								? "#991b1b"
								: selectedSummary.state === "approval-paused"
									? "#92400e"
									: "#1d4ed8",
						fontSize: "0.9rem",
						fontWeight: 700,
						padding: "0.3rem 0.75rem",
					}}
				>
					{formatStateLabel(selectedSummary.state)}
				</span>
			</header>

			<section style={cardStyle}>
				<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
					Review boundary
				</h3>
				<p style={{ margin: 0 }}>{selectedSummary.reviewBoundary.message}</p>
				<p style={{ color: "#475569", margin: 0 }}>
					Automation allowed: no | Manual send required:{" "}
					{selectedSummary.reviewBoundary.manualSendRequired ? "yes" : "no"}
				</p>
				<p style={{ color: "#475569", margin: 0 }}>
					Next action: {formatStateLabel(selectedSummary.nextAction.action)}
				</p>
			</section>

			{context ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
						Resolved context
					</h3>
					<p style={{ margin: 0 }}>
						<strong>
							{context.company ?? context.subject ?? "Context pending"}
						</strong>
					</p>
					<p style={{ color: "#475569", margin: 0 }}>
						{context.role ?? "Role unavailable"} |{" "}
						{context.modeRepoRelativePath}
					</p>
					{context.storyBank ? (
						<p style={{ color: "#475569", margin: 0 }}>
							Story bank: {context.storyBank.source}
							{context.storyBank.repoRelativePath
								? ` (${context.storyBank.repoRelativePath})`
								: ""}
						</p>
					) : null}
				</section>
			) : null}

			{selectedSummary.warnings.length > 0 ? (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>Warnings</h3>
					<ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
						{selectedSummary.warnings.map((warning) => (
							<li key={`${warning.code}:${warning.message}`}>
								{warning.message}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{selectedSummary.packet ? (
				renderPacket(selectedSummary.packet)
			) : (
				<section style={cardStyle}>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
						Narrative packet
					</h3>
					<p style={{ color: "#475569", margin: 0 }}>
						{selectedSummary.message}
					</p>
				</section>
			)}
		</section>
	);
}

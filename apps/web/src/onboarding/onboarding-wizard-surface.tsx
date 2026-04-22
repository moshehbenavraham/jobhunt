import type { CSSProperties } from "react";
import { OnboardingChecklist } from "./onboarding-checklist";
import { ReadinessHandoffCard } from "./readiness-handoff-card";
import { RepairConfirmationPanel } from "./repair-confirmation-panel";
import { RepairPreviewList } from "./repair-preview-list";
import { useOnboardingWizard } from "./use-onboarding-wizard";

type OnboardingWizardSurfaceProps = {
	onOpenHome: () => void;
	onOpenStartup: () => void;
	onRepairApplied: () => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const heroStyle: CSSProperties = {
	alignItems: "center",
	display: "flex",
	flexWrap: "wrap",
	gap: "1rem",
	justifyContent: "space-between",
};

const heroCardStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.94)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.4rem",
	padding: "1rem",
};

const buttonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.8rem",
	padding: "0.7rem 1rem",
};

const lowerGridStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
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

export function OnboardingWizardSurface({
	onOpenHome,
	onOpenStartup,
	onRepairApplied,
}: OnboardingWizardSurfaceProps) {
	const wizard = useOnboardingWizard({
		onRepairApplied,
	});
	const summary = wizard.state.data;
	const health = summary?.health ?? wizard.state.lastRepair?.health ?? null;
	const message =
		wizard.state.error?.message ??
		summary?.message ??
		wizard.state.lastRepair?.message ??
		"Onboarding summary has not loaded yet.";

	return (
		<section aria-labelledby="onboarding-wizard-title" style={surfaceStyle}>
			<header style={heroStyle}>
				<div style={heroCardStyle}>
					<p
						style={{
							color: "#9a3412",
							letterSpacing: "0.08em",
							marginBottom: "0.35rem",
							marginTop: 0,
							textTransform: "uppercase",
						}}
					>
						Session 03
					</p>
					<h2 id="onboarding-wizard-title" style={{ marginBottom: "0.35rem" }}>
						Startup checklist and onboarding wizard
					</h2>
					<p style={{ color: "#64748b", marginBottom: "0.2rem" }}>
						Repair missing onboarding files from checked-in templates without
						recreating workspace rules in the browser.
					</p>
					<p style={{ color: "#94a3b8", margin: 0 }}>
						Last refreshed: {formatTimestamp(wizard.state.lastUpdatedAt)}
					</p>
				</div>

				<button
					aria-label="Refresh onboarding summary"
					disabled={
						wizard.state.isRefreshing || wizard.state.pendingAction !== null
					}
					onClick={wizard.refresh}
					style={{
						...buttonStyle,
						opacity:
							wizard.state.isRefreshing || wizard.state.pendingAction !== null
								? 0.6
								: 1,
					}}
					type="button"
				>
					{wizard.state.isRefreshing ? "Refreshing..." : "Refresh onboarding"}
				</button>
			</header>

			{(wizard.state.status === "offline" || wizard.state.status === "error") &&
			summary ? (
				<section
					style={{
						...heroCardStyle,
						background:
							wizard.state.status === "offline" ? "#fff7ed" : "#fef2f2",
						borderColor:
							wizard.state.status === "offline" ? "#fed7aa" : "#fecaca",
					}}
				>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						{wizard.state.status === "offline"
							? "Using the last good onboarding summary"
							: "Onboarding summary error"}
					</h3>
					<p style={{ marginBottom: 0 }}>{message}</p>
				</section>
			) : null}

			<OnboardingChecklist
				checklist={summary?.checklist ?? null}
				message={message}
				status={wizard.state.status}
			/>

			<RepairPreviewList
				items={summary?.repairPreview.items ?? null}
				message={message}
				pendingAction={wizard.state.pendingAction}
				selectedTargets={wizard.state.selectedTargets}
				status={wizard.state.status}
				toggleTarget={wizard.toggleTarget}
			/>

			<div style={lowerGridStyle}>
				<RepairConfirmationPanel
					error={wizard.state.error}
					lastRepair={wizard.state.lastRepair}
					pendingAction={wizard.state.pendingAction}
					readyTargetCount={summary?.repairPreview.readyTargets.length ?? 0}
					selectedTargets={wizard.state.selectedTargets}
					status={wizard.state.status}
					onApplyRepair={wizard.applyRepair}
					onClear={wizard.clearSelectedTargets}
					onSelectAll={wizard.selectAllReadyTargets}
				/>

				<ReadinessHandoffCard
					health={health}
					lastRepair={wizard.state.lastRepair}
					lastUpdatedAt={wizard.state.lastUpdatedAt}
					onOpenHome={onOpenHome}
					onOpenStartup={onOpenStartup}
					status={wizard.state.status}
				/>
			</div>
		</section>
	);
}

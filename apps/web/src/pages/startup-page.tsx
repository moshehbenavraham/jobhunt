import type { CSSProperties } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { StartupStatusPanel } from "../boot/startup-status-panel";
import type { useStartupDiagnostics } from "../boot/use-startup-diagnostics";
import type { useOperatorHome } from "../shell/use-operator-home";
import type { useOperatorShell } from "../shell/use-operator-shell";

type LayoutContext = {
	home: ReturnType<typeof useOperatorHome>;
	shell: ReturnType<typeof useOperatorShell>;
	startup: ReturnType<typeof useStartupDiagnostics>;
};

const surfaceCardStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-xl)",
	minHeight: "100%",
	padding: "var(--jh-space-padding)",
};

const startupNoticeStyle: CSSProperties = {
	background: "var(--jh-color-status-warning-bg)",
	border: "var(--jh-border-width) solid var(--jh-color-status-warning-border)",
	borderRadius: "var(--jh-radius-lg)",
	padding: "var(--jh-space-padding-sm) var(--jh-space-padding)",
};

function renderStartupNotice(startupStatus: string, message: string | null) {
	switch (startupStatus) {
		case "missing-prerequisites":
			return (
				<section style={startupNoticeStyle}>
					<h2 style={{ marginTop: 0 }}>Onboarding still needs attention</h2>
					<p style={{ marginBottom: 0 }}>
						{message ??
							"Required user-layer files are missing. The diagnostics panel below lists the exact paths to repair."}
					</p>
				</section>
			);
		case "auth-required":
		case "expired-auth":
		case "invalid-auth":
		case "prompt-failure":
			return (
				<section
					style={{
						...startupNoticeStyle,
						background: "var(--jh-color-status-auth-bg)",
						borderColor: "var(--jh-color-badge-info-bg)",
					}}
				>
					<h2 style={{ marginTop: 0 }}>Agent runtime is not ready</h2>
					<p style={{ marginBottom: 0 }}>
						{message ??
							"The startup check loaded, but agent runtime readiness still needs attention."}
					</p>
				</section>
			);
		case "runtime-error":
			return (
				<section
					style={{
						...startupNoticeStyle,
						background: "var(--jh-color-status-error-bg)",
						borderColor: "var(--jh-color-status-error-border)",
					}}
				>
					<h2 style={{ marginTop: 0 }}>Runtime blockers detected</h2>
					<p style={{ marginBottom: 0 }}>
						{message ??
							"System-owned runtime files are missing or corrupt. Review the diagnostics before moving on."}
					</p>
				</section>
			);
		default:
			return null;
	}
}

export function StartupPage() {
	const { startup } = useOutletContext<LayoutContext>();
	const navigate = useNavigate();
	const { state } = startup;
	const hasDiagnostics = state.data !== null;

	if (state.status === "empty") {
		return (
			<section style={startupNoticeStyle}>
				<h2 style={{ marginTop: 0 }}>Waiting for startup diagnostics</h2>
				<p style={{ marginBottom: 0 }}>
					Refresh to request the first startup readiness check from the API.
				</p>
			</section>
		);
	}

	if (state.status === "loading" && !hasDiagnostics) {
		return (
			<section style={startupNoticeStyle}>
				<h2 style={{ marginTop: 0 }}>Checking startup readiness</h2>
				<p style={{ marginBottom: 0 }}>
					Reading the repo boundary, prompt readiness, and operational-store
					status from the API.
				</p>
			</section>
		);
	}

	if (state.status === "offline" && !hasDiagnostics) {
		return (
			<section style={startupNoticeStyle}>
				<h2 style={{ marginTop: 0 }}>Startup API unavailable</h2>
				<p style={{ marginBottom: 0 }}>
					{state.error?.message ??
						"The local API is not reachable. Start `npm run app:api:serve` and retry."}
				</p>
			</section>
		);
	}

	if (state.status === "error" && !hasDiagnostics) {
		return (
			<section
				style={{
					...startupNoticeStyle,
					background: "var(--jh-color-status-error-bg)",
					borderColor: "var(--jh-color-status-error-border)",
				}}
			>
				<h2 style={{ marginTop: 0 }}>Startup diagnostics failed</h2>
				<p style={{ marginBottom: 0 }}>
					{state.error?.message ??
						"The startup check failed before diagnostics could load."}
				</p>
			</section>
		);
	}

	return (
		<section
			aria-labelledby="surface-title-startup"
			style={{
				display: "grid",
				gap: "var(--jh-zone-gap)",
			}}
		>
			<header style={surfaceCardStyle}>
				<p
					style={{
						color: "var(--jh-color-label-fg)",
						letterSpacing: "0.08em",
						marginBottom: "0.5rem",
						marginTop: 0,
						textTransform: "uppercase",
					}}
				>
					Build 01
				</p>
				<h2 id="surface-title-startup" style={{ marginBottom: "0.45rem" }}>
					Startup diagnostics
				</h2>
				<p style={{ color: "var(--jh-color-text-secondary)", marginBottom: 0 }}>
					The startup diagnostics remain the source of truth for readiness. The
					shell wraps it without changing ownership or mutating the workspace.
				</p>
			</header>

			{renderStartupNotice(state.status, state.data?.message ?? null)}

			{state.status === "offline" && hasDiagnostics ? (
				<section style={startupNoticeStyle}>
					<h2 style={{ marginTop: 0 }}>
						Offline after the last startup refresh
					</h2>
					<p style={{ marginBottom: 0 }}>
						{state.error?.message ??
							"The API stopped responding after the previous startup refresh."}
					</p>
				</section>
			) : null}

			{state.status === "error" && hasDiagnostics ? (
				<section
					style={{
						...startupNoticeStyle,
						background: "var(--jh-color-status-error-bg)",
						borderColor: "var(--jh-color-status-error-border)",
					}}
				>
					<h2 style={{ marginTop: 0 }}>Startup readiness error</h2>
					<p style={{ marginBottom: 0 }}>
						Runtime blockers were detected in the checked-in repo configuration.
					</p>
				</section>
			) : null}

			{state.data ? (
				<StartupStatusPanel
					diagnostics={state.data}
					isRefreshing={state.isRefreshing}
					lastUpdatedAt={state.lastUpdatedAt}
					onOpenOnboarding={() => navigate("/onboarding")}
					onRefresh={startup.refresh}
					variant="shell"
				/>
			) : null}
		</section>
	);
}

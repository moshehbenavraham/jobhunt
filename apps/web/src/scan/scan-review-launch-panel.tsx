import type { ScanReviewFocus } from "./scan-review-client";
import type { ScanReviewSummaryPayload } from "./scan-review-types";
import {
	scanActionButton,
	scanBucketBadge,
	scanPanel,
	scanStatCard,
	scanSubtleButton,
	scanWarning,
} from "./scan-styles";
import type { ScanReviewViewStatus } from "./use-scan-review";

type ScanReviewLaunchPanelProps = {
	focus: ScanReviewFocus;
	isBusy: boolean;
	lastUpdatedAt: string | null;
	onClearSessionScope: () => void;
	onLaunch: () => void;
	onRefresh: () => void;
	onScopeToRun: () => void;
	summary: ScanReviewSummaryPayload | null;
	status: ScanReviewViewStatus;
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

function formatCount(value: number | null): string {
	if (value === null) {
		return "N/A";
	}

	return String(value);
}

function getRunStateLabel(
	state: NonNullable<ScanReviewSummaryPayload>["run"]["state"],
): string {
	switch (state) {
		case "approval-paused":
			return "Approval paused";
		case "completed":
			return "Completed";
		case "degraded":
			return "Degraded";
		case "idle":
			return "Idle";
		case "queued":
			return "Queued";
		case "running":
			return "Running";
	}
}

function getEmptyState(input: { status: ScanReviewViewStatus }): {
	body: string;
	title: string;
} {
	switch (input.status) {
		case "loading":
			return {
				body: "Loading scan data...",
				title: "Loading scans",
			};
		case "offline":
			return {
				body: "The API is offline. Showing cached data.",
				title: "Scans offline",
			};
		case "error":
			return {
				body: "Could not load scan data.",
				title: "Scans unavailable",
			};
		default:
			return {
				body: "No scan data yet.",
				title: "No scan data yet",
			};
	}
}

const statLabelStyle = {
	color: "var(--jh-color-text-muted)",
	marginBottom: "0.2rem",
	marginTop: 0,
	fontSize: "var(--jh-text-caption-size)",
} as const;

export function ScanReviewLaunchPanel({
	focus,
	isBusy,
	lastUpdatedAt,
	onClearSessionScope,
	onLaunch,
	onRefresh,
	onScopeToRun,
	summary,
	status,
}: ScanReviewLaunchPanelProps) {
	if (!summary) {
		const emptyState = getEmptyState({
			status,
		});

		return (
			<section aria-labelledby="scan-launch-panel-title" style={scanPanel}>
				<header>
					<h2
						id="scan-launch-panel-title"
						style={{ marginBottom: "var(--jh-space-1)" }}
					>
						Scan status
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						Run status and shortlist summary.
					</p>
				</header>

				<section style={scanStatCard}>
					<h3 style={{ marginBottom: "var(--jh-space-1)", marginTop: 0 }}>
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

	const scopeMatchesRun =
		summary.run.sessionId !== null && focus.sessionId === summary.run.sessionId;
	const launchDisabled =
		isBusy || !summary.launcher.available || !summary.launcher.canStart;

	const launcherReady = summary.launcher.canStart && summary.launcher.available;

	return (
		<section aria-labelledby="scan-launch-panel-title" style={scanPanel}>
			<header
				style={{
					alignItems: "start",
					display: "flex",
					flexWrap: "wrap",
					gap: "var(--jh-space-3)",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h2
						id="scan-launch-panel-title"
						style={{ marginBottom: "var(--jh-space-1)" }}
					>
						Scan status
					</h2>
					<p
						style={{
							color: "var(--jh-color-text-muted)",
							marginBottom: 0,
							marginTop: 0,
						}}
					>
						{summary.message}
					</p>
				</div>

				<div
					style={{
						display: "grid",
						gap: "var(--jh-space-2)",
						justifyItems: "end",
					}}
				>
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "var(--jh-space-2)",
						}}
					>
						<button
							aria-label="Refresh scan data"
							disabled={isBusy}
							onClick={onRefresh}
							style={{
								...scanSubtleButton,
								opacity: isBusy ? 0.7 : 1,
							}}
							type="button"
						>
							Refresh
						</button>
						<button
							aria-label="Launch scan"
							disabled={launchDisabled}
							onClick={onLaunch}
							style={{
								...scanActionButton,
								opacity: launchDisabled ? 0.7 : 1,
							}}
							type="button"
						>
							{summary.run.state === "running" || summary.run.state === "queued"
								? "Scan active"
								: "Launch scan"}
						</button>
					</div>
					<span
						style={{
							color: "var(--jh-color-text-muted)",
							fontSize: "var(--jh-text-caption-size)",
						}}
					>
						Updated: {formatTimestamp(lastUpdatedAt)}
					</span>
				</div>
			</header>

			<section
				style={{
					background:
						summary.run.state === "degraded"
							? "var(--jh-color-status-error-bg)"
							: summary.run.state === "approval-paused"
								? "var(--jh-color-status-offline-bg)"
								: scanStatCard.background,
					border: `1px solid ${
						summary.run.state === "degraded"
							? "var(--jh-color-status-error-border)"
							: summary.run.state === "approval-paused"
								? "var(--jh-color-status-offline-border)"
								: "var(--jh-color-scan-row-border)"
					}`,
					borderRadius: "var(--jh-radius-sm)",
					padding: "var(--jh-space-3)",
				}}
			>
				<div
					style={{
						alignItems: "center",
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-2)",
						justifyContent: "space-between",
						marginBottom: "var(--jh-space-2)",
					}}
				>
					<div>
						<h3 style={{ marginBottom: "var(--jh-space-1)", marginTop: 0 }}>
							{getRunStateLabel(summary.run.state)}
						</h3>
						<p
							style={{
								color: "var(--jh-color-text-secondary)",
								margin: 0,
							}}
						>
							{summary.run.message}
						</p>
					</div>
					<span
						style={{
							...scanBucketBadge,
							background: launcherReady
								? "var(--jh-color-badge-info-bg)"
								: "var(--jh-color-badge-neutral-bg)",
							color: launcherReady
								? "var(--jh-color-badge-info-fg)"
								: "var(--jh-color-badge-neutral-fg)",
						}}
					>
						{launcherReady ? "Ready" : "Not ready"}
					</span>
				</div>

				<p
					style={{
						color: "var(--jh-color-text-secondary)",
						marginBottom: 0,
						marginTop: 0,
					}}
				>
					{summary.launcher.message}
				</p>
			</section>

			<section
				style={{
					display: "grid",
					gap: "var(--jh-space-2)",
					gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
				}}
			>
				<article style={scanStatCard}>
					<p style={statLabelStyle}>New offers</p>
					<strong>{formatCount(summary.run.summary.newOffersAdded)}</strong>
				</article>
				<article style={scanStatCard}>
					<p style={statLabelStyle}>Jobs found</p>
					<strong>{formatCount(summary.run.summary.totalJobsFound)}</strong>
				</article>
				<article style={scanStatCard}>
					<p style={statLabelStyle}>Duplicates skipped</p>
					<strong>{formatCount(summary.run.summary.duplicatesSkipped)}</strong>
				</article>
				<article style={scanStatCard}>
					<p style={statLabelStyle}>Scope</p>
					<strong style={{ fontSize: "var(--jh-text-body-sm-size)" }}>
						{focus.sessionId ?? "Latest run"}
					</strong>
				</article>
			</section>

			<section
				style={{
					...scanStatCard,
					display: "grid",
					gap: "var(--jh-space-3)",
				}}
			>
				<div>
					<h3 style={{ marginBottom: "var(--jh-space-1)", marginTop: 0 }}>
						Run scope
					</h3>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							margin: 0,
						}}
					>
						Lock to a specific run for stable history, or clear to follow the
						latest.
					</p>
				</div>

				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--jh-space-2)",
					}}
				>
					<button
						disabled={summary.run.sessionId === null || scopeMatchesRun}
						onClick={onScopeToRun}
						style={{
							...scanSubtleButton,
							opacity:
								summary.run.sessionId === null || scopeMatchesRun ? 0.6 : 1,
						}}
						type="button"
					>
						Lock to current run
					</button>
					<button
						disabled={focus.sessionId === null}
						onClick={onClearSessionScope}
						style={{
							...scanSubtleButton,
							opacity: focus.sessionId === null ? 0.6 : 1,
						}}
						type="button"
					>
						Clear scope
					</button>
				</div>
			</section>

			{summary.run.warnings.length > 0 ? (
				<section
					style={{
						display: "grid",
						gap: "var(--jh-space-2)",
					}}
				>
					<h3 style={{ marginBottom: 0, marginTop: 0 }}>Warnings</h3>
					<div
						style={{
							display: "grid",
							gap: "var(--jh-space-2)",
						}}
					>
						{summary.run.warnings.map((warning) => (
							<article
								key={`${warning.code}:${warning.message}`}
								style={scanWarning}
							>
								<strong
									style={{
										display: "block",
										marginBottom: "var(--jh-space-1)",
										fontSize: "var(--jh-text-caption-size)",
									}}
								>
									{warning.code}
								</strong>
								<p
									style={{ margin: 0, fontSize: "var(--jh-text-caption-size)" }}
								>
									{warning.message}
								</p>
							</article>
						))}
					</div>
				</section>
			) : null}
		</section>
	);
}

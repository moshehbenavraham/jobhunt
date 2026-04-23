import type { CSSProperties } from "react";
import type { ScanReviewActionInput } from "./scan-review-client";
import type {
	ScanReviewSelectedDetail,
	ScanReviewWarningCode,
} from "./scan-review-types";
import {
	scanActionButton,
	scanBucketBadge,
	scanNoticeInfo,
	scanNoticeSuccess,
	scanNoticeWarn,
	scanPanel,
	scanStatCard,
	scanSubtleButton,
	scanWarning,
} from "./scan-styles";
import type {
	ScanReviewActionNotice,
	ScanReviewPendingAction,
	ScanReviewViewStatus,
} from "./use-scan-review";

type ScanReviewActionShelfProps = {
	isBusy: boolean;
	notice: ScanReviewActionNotice;
	onClearNotice: () => void;
	onClearSelection: () => void;
	onLaunchBatchSeed: () => void;
	onLaunchEvaluation: () => void;
	onRunIgnoreAction: (input: ScanReviewActionInput) => void;
	pendingAction: ScanReviewPendingAction;
	selectedDetail: ScanReviewSelectedDetail | null;
	status: ScanReviewViewStatus;
};

const metaStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	margin: 0,
};

function getEmptyState(input: { status: ScanReviewViewStatus }): {
	body: string;
	title: string;
} {
	switch (input.status) {
		case "loading":
			return {
				body: "Loading details...",
				title: "Loading detail",
			};
		case "offline":
			return {
				body: "The API is offline.",
				title: "Detail offline",
			};
		case "error":
			return {
				body: "Could not load details.",
				title: "Detail unavailable",
			};
		default:
			return {
				body: "Select a role to see details and actions.",
				title: "No role selected",
			};
	}
}

function getNoticeStyle(kind: NonNullable<ScanReviewActionNotice>["kind"]) {
	switch (kind) {
		case "info":
			return scanNoticeInfo;
		case "success":
			return scanNoticeSuccess;
		case "warn":
			return scanNoticeWarn;
	}
}

function getWarningTone(code: ScanReviewWarningCode): CSSProperties {
	switch (code) {
		case "already-ignored":
			return {
				background: "var(--jh-color-badge-neutral-bg)",
				color: "var(--jh-color-badge-neutral-fg)",
			};
		case "already-pending":
		case "approval-paused":
		case "stale-selection":
			return {
				background: "var(--jh-color-status-offline-bg)",
				color: "var(--jh-color-severity-warn-fg)",
			};
		case "degraded-result":
			return {
				background: "var(--jh-color-status-error-bg)",
				color: "var(--jh-color-status-error-fg)",
			};
		case "duplicate-heavy":
			return {
				background: "var(--jh-color-severity-info-bg)",
				color: "var(--jh-color-severity-info-fg)",
			};
	}
}

function getIgnoreLabel(
	action: "ignore" | "restore",
	pendingAction: ScanReviewPendingAction,
): string {
	if (action === "ignore") {
		return pendingAction !== null ? "Ignoring..." : "Ignore role";
	}
	return pendingAction !== null ? "Restoring..." : "Restore role";
}

export function ScanReviewActionShelf({
	isBusy,
	notice,
	onClearNotice,
	onClearSelection,
	onLaunchBatchSeed,
	onLaunchEvaluation,
	onRunIgnoreAction,
	pendingAction,
	selectedDetail,
	status,
}: ScanReviewActionShelfProps) {
	const selectedRow = selectedDetail?.row ?? null;
	const emptyState = getEmptyState({
		status,
	});
	const actionsDisabled =
		isBusy || pendingAction !== null || selectedRow === null;
	const ignoreDisabled =
		actionsDisabled || selectedRow?.ignoreAction.sessionId === null;

	return (
		<aside aria-labelledby="scan-action-shelf-title" style={scanPanel}>
			<header>
				<h2
					id="scan-action-shelf-title"
					style={{ marginBottom: "var(--jh-space-1)" }}
				>
					Actions
				</h2>
				<p style={metaStyle}>{selectedDetail?.message ?? emptyState.body}</p>
			</header>

			{notice ? (
				<section
					style={{
						...getNoticeStyle(notice.kind),
						border: "1px solid",
						borderRadius: "var(--jh-radius-sm)",
						display: "grid",
						gap: "var(--jh-space-2)",
						padding: "var(--jh-space-3)",
					}}
				>
					<p style={{ margin: 0 }}>{notice.message}</p>
					<div>
						<button
							onClick={onClearNotice}
							style={scanSubtleButton}
							type="button"
						>
							Dismiss
						</button>
					</div>
				</section>
			) : null}

			{selectedRow ? (
				<>
					<section
						style={{
							...scanStatCard,
							display: "grid",
							gap: "var(--jh-space-2)",
						}}
					>
						<div>
							<p style={metaStyle}>
								#{selectedRow.rank} {selectedRow.bucket}
							</p>
							<h3 style={{ marginBottom: "var(--jh-space-1)", marginTop: 0 }}>
								{selectedRow.role}
							</h3>
							<p
								style={{
									color: "var(--jh-color-text-secondary)",
									margin: 0,
								}}
							>
								{selectedRow.company ?? "Unknown company"}
							</p>
						</div>

						<p
							style={{
								margin: 0,
								wordBreak: "break-word",
								fontSize: "var(--jh-text-caption-size)",
								fontFamily: "var(--jh-font-mono)",
							}}
						>
							{selectedRow.url}
						</p>

						<p
							style={{
								color: "var(--jh-color-text-secondary)",
								margin: 0,
								fontSize: "var(--jh-text-body-sm-size)",
							}}
						>
							{selectedRow.reasonSummary ?? "No reason recorded."}
						</p>

						<div
							style={{
								display: "grid",
								gap: "var(--jh-space-1)",
								fontSize: "var(--jh-text-caption-size)",
							}}
						>
							<span>History: {selectedRow.duplicateHint.historyCount}</span>
							<span>
								Overlap:{" "}
								{selectedRow.duplicateHint.pendingOverlap ? "Yes" : "No"}
							</span>
							<span>
								First seen: {selectedRow.duplicateHint.firstSeen ?? "Unknown"}
							</span>
							<span>
								Run: {selectedRow.ignoreAction.sessionId ?? "No run selected"}
							</span>
						</div>
					</section>

					{selectedRow.warnings.length > 0 ? (
						<section
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "var(--jh-space-1)",
							}}
						>
							{selectedRow.warnings.map((warning) => (
								<span
									key={`${warning.code}:${warning.message}`}
									style={{
										...scanBucketBadge,
										...getWarningTone(warning.code),
									}}
								>
									{warning.code}
								</span>
							))}
						</section>
					) : null}

					<section
						style={{
							display: "grid",
							gap: "var(--jh-space-2)",
						}}
					>
						<button
							disabled={ignoreDisabled}
							onClick={() =>
								selectedRow.ignoreAction.sessionId
									? onRunIgnoreAction({
											action: selectedRow.ignoreAction.action,
											sessionId: selectedRow.ignoreAction.sessionId,
											url: selectedRow.ignoreAction.url,
										})
									: undefined
							}
							style={{
								...scanActionButton,
								opacity: ignoreDisabled ? 0.6 : 1,
							}}
							type="button"
						>
							{getIgnoreLabel(selectedRow.ignoreAction.action, pendingAction)}
						</button>
						<button
							disabled={actionsDisabled}
							onClick={onLaunchEvaluation}
							style={{
								...scanActionButton,
								opacity: actionsDisabled ? 0.6 : 1,
							}}
							type="button"
						>
							{pendingAction !== null ? "Launching..." : "Evaluate"}
						</button>
						<button
							disabled={actionsDisabled}
							onClick={onLaunchBatchSeed}
							style={{
								...scanActionButton,
								opacity: actionsDisabled ? 0.6 : 1,
							}}
							type="button"
						>
							{pendingAction !== null ? "Seeding..." : "Add to batch"}
						</button>
						<button
							onClick={onClearSelection}
							style={scanSubtleButton}
							type="button"
						>
							Clear
						</button>
					</section>

					{selectedRow.ignoreAction.sessionId === null ? (
						<section style={scanWarning}>
							<p
								style={{
									margin: 0,
									fontSize: "var(--jh-text-caption-size)",
								}}
							>
								Scope to a specific scan run to enable ignore and restore.
							</p>
						</section>
					) : null}
				</>
			) : (
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
						{selectedDetail?.message ?? emptyState.body}
					</p>
				</section>
			)}
		</aside>
	);
}

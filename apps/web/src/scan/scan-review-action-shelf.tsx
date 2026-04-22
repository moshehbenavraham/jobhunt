import type { CSSProperties } from "react";
import type { ScanReviewActionInput } from "./scan-review-client";
import type {
	ScanReviewSelectedDetail,
	ScanReviewWarningCode,
} from "./scan-review-types";
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

const panelStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	display: "grid",
	gap: "0.9rem",
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
	minHeight: "2.3rem",
	padding: "0.5rem 0.85rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "rgba(15, 23, 42, 0.08)",
	border: "1px solid rgba(148, 163, 184, 0.28)",
	borderRadius: "999px",
	color: "#0f172a",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.2rem",
	padding: "0.45rem 0.8rem",
};

function getEmptyState(input: { status: ScanReviewViewStatus }): {
	body: string;
	title: string;
} {
	switch (input.status) {
		case "loading":
			return {
				body: "Loading the selected shortlist detail and action metadata.",
				title: "Loading selected role",
			};
		case "offline":
			return {
				body: "The scan-review endpoint is offline, so selected-role detail is not available right now.",
				title: "Selected role offline",
			};
		case "error":
			return {
				body: "The selected shortlist detail could not be rendered from the scan-review payload.",
				title: "Selected role unavailable",
			};
		default:
			return {
				body: "Select a shortlist role to inspect duplicate context and launch follow-through actions.",
				title: "No selected role",
			};
	}
}

function getNoticeStyle(kind: NonNullable<ScanReviewActionNotice>["kind"]) {
	switch (kind) {
		case "info":
			return {
				background: "#dbeafe",
				borderColor: "#bfdbfe",
			};
		case "success":
			return {
				background: "#dcfce7",
				borderColor: "#bbf7d0",
			};
		case "warn":
			return {
				background: "#fef3c7",
				borderColor: "#fde68a",
			};
	}
}

function getWarningTone(code: ScanReviewWarningCode): CSSProperties {
	switch (code) {
		case "already-ignored":
			return {
				background: "#e2e8f0",
				color: "#334155",
			};
		case "already-pending":
		case "approval-paused":
		case "stale-selection":
			return {
				background: "#fef3c7",
				color: "#92400e",
			};
		case "degraded-result":
			return {
				background: "#fee2e2",
				color: "#991b1b",
			};
		case "duplicate-heavy":
			return {
				background: "#dbeafe",
				color: "#1d4ed8",
			};
	}
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
		<aside aria-labelledby="scan-action-shelf-title" style={panelStyle}>
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
					Selected detail
				</p>
				<h2 id="scan-action-shelf-title" style={{ marginBottom: "0.35rem" }}>
					Action shelf
				</h2>
				<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
					{selectedDetail?.message ?? emptyState.body}
				</p>
			</header>

			{notice ? (
				<section
					style={{
						...getNoticeStyle(notice.kind),
						border: "1px solid",
						borderRadius: "1rem",
						display: "grid",
						gap: "0.55rem",
						padding: "0.9rem",
					}}
				>
					<p style={{ margin: 0 }}>{notice.message}</p>
					<div>
						<button
							onClick={onClearNotice}
							style={subtleButtonStyle}
							type="button"
						>
							Dismiss notice
						</button>
					</div>
				</section>
			) : null}

			{selectedRow ? (
				<>
					<section
						style={{
							background: "rgba(248, 250, 252, 0.9)",
							border: "1px solid rgba(148, 163, 184, 0.2)",
							borderRadius: "1rem",
							display: "grid",
							gap: "0.7rem",
							padding: "0.95rem",
						}}
					>
						<div>
							<p
								style={{
									color: "#64748b",
									marginBottom: "0.2rem",
									marginTop: 0,
								}}
							>
								#{selectedRow.rank} {selectedRow.bucket}
							</p>
							<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
								{selectedRow.role}
							</h3>
							<p style={{ color: "#475569", margin: 0 }}>
								{selectedRow.company ?? "Unknown company"}
							</p>
						</div>

						<p
							style={{
								margin: 0,
								wordBreak: "break-word",
							}}
						>
							{selectedRow.url}
						</p>

						<p style={{ color: "#475569", margin: 0 }}>
							{selectedRow.reasonSummary ?? "No reason summary was recorded."}
						</p>

						<div
							style={{
								display: "grid",
								gap: "0.35rem",
							}}
						>
							<span>
								History count: {selectedRow.duplicateHint.historyCount}
							</span>
							<span>
								Pending overlap:{" "}
								{selectedRow.duplicateHint.pendingOverlap ? "Yes" : "No"}
							</span>
							<span>
								First seen: {selectedRow.duplicateHint.firstSeen ?? "Unknown"}
							</span>
							<span>
								Scan session:{" "}
								{selectedRow.ignoreAction.sessionId ?? "Not bound yet"}
							</span>
						</div>
					</section>

					{selectedRow.warnings.length > 0 ? (
						<section
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "0.45rem",
							}}
						>
							{selectedRow.warnings.map((warning) => (
								<span
									key={`${warning.code}:${warning.message}`}
									style={{
										...getWarningTone(warning.code),
										borderRadius: "999px",
										fontSize: "0.82rem",
										fontWeight: 700,
										padding: "0.22rem 0.6rem",
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
							gap: "0.55rem",
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
								...buttonStyle,
								opacity: ignoreDisabled ? 0.6 : 1,
							}}
							type="button"
						>
							{selectedRow.ignoreAction.action === "ignore"
								? "Ignore role"
								: "Restore role"}
						</button>
						<button
							disabled={actionsDisabled}
							onClick={onLaunchEvaluation}
							style={{
								...buttonStyle,
								opacity: actionsDisabled ? 0.6 : 1,
							}}
							type="button"
						>
							Launch single evaluation
						</button>
						<button
							disabled={actionsDisabled}
							onClick={onLaunchBatchSeed}
							style={{
								...buttonStyle,
								opacity: actionsDisabled ? 0.6 : 1,
							}}
							type="button"
						>
							Seed batch evaluation
						</button>
						<button
							onClick={onClearSelection}
							style={subtleButtonStyle}
							type="button"
						>
							Clear selection
						</button>
					</section>

					{selectedRow.ignoreAction.sessionId === null ? (
						<section
							style={{
								background: "#fef3c7",
								border: "1px solid #fde68a",
								borderRadius: "1rem",
								padding: "0.9rem",
							}}
						>
							<p style={{ margin: 0 }}>
								Ignore and restore controls stay disabled until the shortlist is
								scoped to a concrete scan session.
							</p>
						</section>
					) : null}
				</>
			) : (
				<section
					style={{
						background: "rgba(248, 250, 252, 0.9)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
						borderRadius: "1rem",
						padding: "1rem",
					}}
				>
					<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
						{selectedDetail?.message ?? emptyState.body}
					</p>
				</section>
			)}
		</aside>
	);
}

import { type CSSProperties, useEffect, useState } from "react";
import {
	trackerButton,
	trackerInput,
	trackerNoticeInfo,
	trackerNoticeSuccess,
	trackerNoticeWarn,
	trackerPanel,
	trackerStatCard,
	trackerSubtleButton,
	trackerWarning,
} from "./tracker-styles";
import type { TrackerWorkspaceActionInput } from "./tracker-workspace-client";
import type {
	TrackerWorkspaceFocusedPendingAddition,
	TrackerWorkspaceSelectedRow,
	TrackerWorkspaceStatusOption,
} from "./tracker-workspace-types";
import type {
	TrackerWorkspaceActionNotice,
	TrackerWorkspacePendingAction,
} from "./use-tracker-workspace";

type TrackerDetailPaneProps = {
	actionsDisabled: boolean;
	focusedPendingAddition: TrackerWorkspaceFocusedPendingAddition | null;
	notice: TrackerWorkspaceActionNotice;
	onClearSelection: () => void;
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
	onRunAction: (input: TrackerWorkspaceActionInput) => void;
	pendingAction: TrackerWorkspacePendingAction;
	requestedReportNumber: string | null;
	selectedDetail: { message: string } | null;
	selectedRow: TrackerWorkspaceSelectedRow | null;
	statusOptions: TrackerWorkspaceStatusOption[];
};

function formatScore(score: number | null, scoreLabel: string): string {
	if (score !== null) {
		return `${score.toFixed(1)} / 5`;
	}

	return scoreLabel || "No score";
}

function getNoticeStyle(kind: "info" | "success" | "warn"): CSSProperties {
	switch (kind) {
		case "info":
			return trackerNoticeInfo;
		case "success":
			return trackerNoticeSuccess;
		case "warn":
			return trackerNoticeWarn;
	}
}

const sectionStyle: CSSProperties = {
	display: "grid",
	gap: "var(--jh-space-3)",
};

const headingStyle: CSSProperties = {
	fontSize: "var(--jh-text-body-sm-size)",
	fontWeight: "var(--jh-font-weight-semibold)" as unknown as number,
	marginBottom: "var(--jh-space-1)",
	marginTop: 0,
};

const metaStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	margin: 0,
};

const actionRow: CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-2)",
};

const noticeBannerBase: CSSProperties = {
	border: "1px solid",
	borderRadius: "var(--jh-radius-sm)",
	padding: "var(--jh-space-2) var(--jh-space-3)",
};

export function TrackerDetailPane({
	actionsDisabled,
	focusedPendingAddition,
	notice,
	onClearSelection,
	onOpenReportViewer,
	onRunAction,
	pendingAction,
	requestedReportNumber,
	selectedDetail,
	selectedRow,
	statusOptions,
}: TrackerDetailPaneProps) {
	const [statusDraft, setStatusDraft] = useState("");

	useEffect(() => {
		setStatusDraft(selectedRow?.status ?? "");
	}, [selectedRow?.status]);

	const noticeBanner = notice ? (
		<section
			aria-live="polite"
			style={{ ...noticeBannerBase, ...getNoticeStyle(notice.kind) }}
		>
			<p
				style={{
					fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
					marginBottom: "var(--jh-space-1)",
					marginTop: 0,
					fontSize: "var(--jh-text-body-sm-size)",
				}}
			>
				Action result
			</p>
			<p style={{ margin: 0, fontSize: "var(--jh-text-caption-size)" }}>
				{notice.message}
			</p>
		</section>
	) : null;

	if (!selectedRow && !focusedPendingAddition) {
		return (
			<aside aria-label="Row detail" style={trackerPanel}>
				<h3 style={headingStyle}>Detail</h3>
				<section style={trackerStatCard}>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							margin: 0,
							fontSize: "var(--jh-text-body-sm-size)",
						}}
					>
						Select a row to see details, actions, and report links.
					</p>
				</section>
				{selectedDetail ? (
					<p style={metaStyle}>{selectedDetail.message}</p>
				) : null}
				{requestedReportNumber ? (
					<section
						style={{
							background: "var(--jh-color-tracker-row-selected-bg)",
							border: "1px solid var(--jh-color-tracker-row-selected-border)",
							borderRadius: "var(--jh-radius-sm)",
							padding: "var(--jh-space-2) var(--jh-space-3)",
						}}
					>
						<p
							style={{
								fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
								marginBottom: "var(--jh-space-1)",
								marginTop: 0,
								fontSize: "var(--jh-text-body-sm-size)",
							}}
						>
							Auto-focused from report #{requestedReportNumber}
						</p>
						<p
							style={{
								margin: 0,
								fontSize: "var(--jh-text-caption-size)",
							}}
						>
							Resolving the matching tracker row or staged addition.
						</p>
					</section>
				) : null}
				{noticeBanner}
			</aside>
		);
	}

	if (focusedPendingAddition) {
		return (
			<aside aria-label="Pending addition detail" style={trackerPanel}>
				{requestedReportNumber ? (
					<section
						style={{
							background: "var(--jh-color-tracker-row-selected-bg)",
							border: "1px solid var(--jh-color-tracker-row-selected-border)",
							borderRadius: "var(--jh-radius-sm)",
							padding: "var(--jh-space-2) var(--jh-space-3)",
						}}
					>
						<p
							style={{
								fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
								marginBottom: "var(--jh-space-1)",
								marginTop: 0,
								fontSize: "var(--jh-text-body-sm-size)",
							}}
						>
							Auto-focused from report #{requestedReportNumber}
						</p>
					</section>
				) : null}

				<section style={sectionStyle}>
					<div>
						<p
							style={{
								marginBottom: "var(--jh-space-1)",
								marginTop: 0,
								fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
								fontSize: "var(--jh-text-body-sm-size)",
							}}
						>
							Staged addition: {focusedPendingAddition.fileName}
						</p>
						<p
							style={{
								color: "var(--jh-color-text-secondary)",
								margin: 0,
								fontSize: "var(--jh-text-body-sm-size)",
							}}
						>
							{focusedPendingAddition.company ?? "Unknown company"} |{" "}
							{focusedPendingAddition.role ?? "Unknown role"}
						</p>
						<p style={metaStyle}>
							Entry #{focusedPendingAddition.entryNumber || "n/a"} |{" "}
							{focusedPendingAddition.status ?? "No status"} | Report #
							{focusedPendingAddition.reportNumber ?? "n/a"}
						</p>
					</div>
				</section>

				<section style={trackerWarning}>
					<p
						style={{
							fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
							marginBottom: "var(--jh-space-1)",
							marginTop: 0,
							fontSize: "var(--jh-text-body-sm-size)",
						}}
					>
						Not yet merged
					</p>
					<p
						style={{
							margin: 0,
							fontSize: "var(--jh-text-caption-size)",
						}}
					>
						This entry has not been merged yet. Review before merging.
					</p>
				</section>

				<section style={trackerStatCard}>
					<h4 style={headingStyle}>Notes</h4>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							margin: 0,
							fontSize: "var(--jh-text-body-sm-size)",
						}}
					>
						{focusedPendingAddition.notes ?? "No notes stored."}
					</p>
				</section>

				{noticeBanner}

				<div style={actionRow}>
					<button
						disabled={!focusedPendingAddition.reportRepoRelativePath}
						onClick={() =>
							onOpenReportViewer({
								reportPath: focusedPendingAddition.reportRepoRelativePath,
							})
						}
						style={{
							...trackerButton,
							opacity: focusedPendingAddition.reportRepoRelativePath ? 1 : 0.65,
						}}
						type="button"
					>
						Open report
					</button>
					<button
						disabled={actionsDisabled}
						onClick={() => onRunAction({ action: "merge-tracker-additions" })}
						style={{
							...trackerSubtleButton,
							opacity: actionsDisabled ? 0.65 : 1,
						}}
						type="button"
					>
						Merge TSVs
					</button>
					<button
						onClick={onClearSelection}
						style={trackerSubtleButton}
						type="button"
					>
						Clear selection
					</button>
				</div>
			</aside>
		);
	}

	if (!selectedRow) {
		return null;
	}

	const statusUpdateDisabled =
		actionsDisabled || statusDraft.trim() === selectedRow.status;

	return (
		<aside aria-label="Selected row detail" style={trackerPanel}>
			{requestedReportNumber ? (
				<section
					style={{
						background: "var(--jh-color-tracker-row-selected-bg)",
						border: "1px solid var(--jh-color-tracker-row-selected-border)",
						borderRadius: "var(--jh-radius-sm)",
						padding: "var(--jh-space-2) var(--jh-space-3)",
					}}
				>
					<p
						style={{
							fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
							marginBottom: "var(--jh-space-1)",
							marginTop: 0,
							fontSize: "var(--jh-text-body-sm-size)",
						}}
					>
						Auto-focused from report #{requestedReportNumber}
					</p>
				</section>
			) : null}

			<section style={sectionStyle}>
				<div>
					<p
						style={{
							marginBottom: "var(--jh-space-1)",
							marginTop: 0,
							fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
							fontSize: "var(--jh-text-body-sm-size)",
						}}
					>
						#{selectedRow.entryNumber} {selectedRow.company}
					</p>
					<p
						style={{
							color: "var(--jh-color-text-secondary)",
							marginBottom: "var(--jh-space-1)",
							marginTop: 0,
							fontSize: "var(--jh-text-body-sm-size)",
						}}
					>
						{selectedRow.role}
					</p>
					<p style={metaStyle}>
						{selectedRow.date} | {selectedRow.status} |{" "}
						{formatScore(selectedRow.score, selectedRow.scoreLabel)}
					</p>
				</div>
			</section>

			<div
				style={{
					display: "grid",
					gap: "var(--jh-space-2)",
					gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
				}}
			>
				<article style={trackerStatCard}>
					<p style={metaStyle}>Report</p>
					<strong style={{ fontSize: "var(--jh-text-caption-size)" }}>
						{selectedRow.report.repoRelativePath ?? "No report linked"}
					</strong>
				</article>
				<article style={trackerStatCard}>
					<p style={metaStyle}>PDF</p>
					<strong style={{ fontSize: "var(--jh-text-caption-size)" }}>
						{selectedRow.pdf.repoRelativePath ?? "No PDF linked"}
					</strong>
				</article>
				<article style={trackerStatCard}>
					<p style={metaStyle}>Legitimacy</p>
					<strong style={{ fontSize: "var(--jh-text-caption-size)" }}>
						{selectedRow.header?.legitimacy ?? "Not available"}
					</strong>
				</article>
			</div>

			{selectedRow.warnings.length > 0 ? (
				<div style={{ display: "grid", gap: "var(--jh-space-1)" }}>
					{selectedRow.warnings.map((warning) => (
						<article
							key={
								selectedRow.entryNumber +
								":" +
								warning.code +
								":" +
								warning.message
							}
							style={trackerWarning}
						>
							<p
								style={{
									fontWeight: "var(--jh-font-weight-bold)" as unknown as number,
									marginBottom: "var(--jh-space-1)",
									marginTop: 0,
									fontSize: "var(--jh-text-caption-size)",
								}}
							>
								{warning.code}
							</p>
							<p
								style={{
									margin: 0,
									fontSize: "var(--jh-text-caption-size)",
								}}
							>
								{warning.message}
							</p>
						</article>
					))}
				</div>
			) : null}

			<section style={trackerStatCard}>
				<h4 style={headingStyle}>Notes</h4>
				<p
					style={{
						margin: 0,
						fontSize: "var(--jh-text-body-sm-size)",
					}}
				>
					{selectedRow.notes || "No notes stored."}
				</p>
			</section>

			{noticeBanner}

			<section style={trackerStatCard}>
				<h4 style={headingStyle}>Status update</h4>
				<div
					style={{
						alignItems: "end",
						display: "grid",
						gap: "var(--jh-space-3)",
						gridTemplateColumns: "minmax(0, 1fr) auto",
					}}
				>
					<select
						aria-label="Select status"
						onChange={(event) => setStatusDraft(event.target.value)}
						style={trackerInput}
						value={statusDraft}
					>
						{statusOptions.map((option) => (
							<option key={option.id} value={option.label}>
								{option.label}
							</option>
						))}
					</select>

					<button
						disabled={statusUpdateDisabled}
						onClick={() =>
							onRunAction({
								action: "update-status",
								entryNumber: selectedRow.entryNumber,
								status: statusDraft,
							})
						}
						style={{
							...trackerButton,
							opacity: statusUpdateDisabled ? 0.65 : 1,
						}}
						type="button"
					>
						{pendingAction?.action === "update-status"
							? "Updating..."
							: "Update status"}
					</button>
				</div>
			</section>

			<section style={trackerStatCard}>
				<h4 style={headingStyle}>Maintenance</h4>
				<div style={actionRow}>
					<button
						disabled={actionsDisabled}
						onClick={() => onRunAction({ action: "merge-tracker-additions" })}
						style={{
							...trackerSubtleButton,
							opacity: actionsDisabled ? 0.65 : 1,
						}}
						type="button"
					>
						Merge TSVs
					</button>
					<button
						disabled={actionsDisabled}
						onClick={() => onRunAction({ action: "verify-tracker-pipeline" })}
						style={{
							...trackerSubtleButton,
							opacity: actionsDisabled ? 0.65 : 1,
						}}
						type="button"
					>
						Verify
					</button>
					<button
						disabled={actionsDisabled}
						onClick={() =>
							onRunAction({
								action: "normalize-tracker-statuses",
								dryRun: true,
							})
						}
						style={{
							...trackerSubtleButton,
							opacity: actionsDisabled ? 0.65 : 1,
						}}
						type="button"
					>
						Normalize dry run
					</button>
					<button
						disabled={actionsDisabled}
						onClick={() =>
							onRunAction({
								action: "normalize-tracker-statuses",
								dryRun: false,
							})
						}
						style={{
							...trackerSubtleButton,
							opacity: actionsDisabled ? 0.65 : 1,
						}}
						type="button"
					>
						Normalize
					</button>
					<button
						disabled={actionsDisabled}
						onClick={() =>
							onRunAction({
								action: "dedup-tracker-entries",
								dryRun: true,
							})
						}
						style={{
							...trackerSubtleButton,
							opacity: actionsDisabled ? 0.65 : 1,
						}}
						type="button"
					>
						Dedup dry run
					</button>
					<button
						disabled={actionsDisabled}
						onClick={() =>
							onRunAction({
								action: "dedup-tracker-entries",
								dryRun: false,
							})
						}
						style={{
							...trackerSubtleButton,
							opacity: actionsDisabled ? 0.65 : 1,
						}}
						type="button"
					>
						Dedup
					</button>
				</div>
			</section>

			<section style={trackerStatCard}>
				<h4 style={headingStyle}>Report handoff</h4>
				<div style={actionRow}>
					<button
						disabled={!selectedRow.report.repoRelativePath}
						onClick={() =>
							onOpenReportViewer({
								reportPath: selectedRow.report.repoRelativePath,
							})
						}
						style={{
							...trackerButton,
							opacity: selectedRow.report.repoRelativePath ? 1 : 0.65,
						}}
						type="button"
					>
						Open report
					</button>
					<button
						onClick={onClearSelection}
						style={trackerSubtleButton}
						type="button"
					>
						Clear selection
					</button>
				</div>
			</section>

			<section style={trackerStatCard}>
				<h4 style={headingStyle}>Source line</h4>
				<code
					style={{
						display: "block",
						fontFamily: "var(--jh-font-mono)",
						fontSize: "var(--jh-text-mono-sm-size)",
						overflowX: "auto",
						whiteSpace: "pre-wrap",
					}}
				>
					{selectedRow.sourceLine}
				</code>
			</section>
		</aside>
	);
}

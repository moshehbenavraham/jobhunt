import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import {
	TRACKER_WORKSPACE_SORT_VALUES,
	type TrackerWorkspaceSort,
} from "./tracker-workspace-types";
import { useTrackerWorkspace } from "./use-tracker-workspace";

type TrackerWorkspaceSurfaceProps = {
	onOpenReportViewer: (focus: { reportPath: string | null }) => void;
};

const surfaceStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const panelStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.4rem",
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
	minHeight: "2.4rem",
	padding: "0.55rem 0.9rem",
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

const inputStyle: CSSProperties = {
	background: "#ffffff",
	border: "1px solid rgba(148, 163, 184, 0.4)",
	borderRadius: "0.9rem",
	color: "#0f172a",
	font: "inherit",
	minHeight: "2.75rem",
	padding: "0.65rem 0.8rem",
};

const listGridStyle: CSSProperties = {
	display: "grid",
	gap: "0.8rem",
};

const detailGridStyle: CSSProperties = {
	display: "grid",
	gap: "1rem",
	gridTemplateColumns: "minmax(18rem, 24rem) minmax(0, 1fr)",
};

const stackedCardStyle: CSSProperties = {
	background: "rgba(248, 250, 252, 0.9)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1rem",
	padding: "0.9rem",
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

function formatScore(score: number | null, scoreLabel: string): string {
	if (score !== null) {
		return `${score.toFixed(1)} / 5`;
	}

	return scoreLabel || "No score";
}

function getSortLabel(sort: TrackerWorkspaceSort): string {
	switch (sort) {
		case "company":
			return "Company";
		case "date":
			return "Date";
		case "score":
			return "Score";
		case "status":
			return "Status";
	}
}

function getEmptyState(input: {
	error: string | null;
	status: ReturnType<typeof useTrackerWorkspace>["state"]["status"];
}) {
	switch (input.status) {
		case "loading":
			return {
				body: "Reading the bounded tracker summary and pending TSV status from the API.",
				title: "Loading tracker workspace",
			};
		case "offline":
			return {
				body:
					input.error ??
					"The tracker-workspace endpoint is offline, so tracker review cannot refresh.",
				title: "Tracker workspace offline",
			};
		case "error":
			return {
				body:
					input.error ??
					"The tracker-workspace payload could not be parsed into the tracker review surface.",
				title: "Tracker workspace unavailable",
			};
		default:
			return {
				body: "Open the tracker workspace after the API exposes tracker rows, canonical statuses, and pending TSV guidance.",
				title: "No tracker payload yet",
			};
	}
}

function getNoticeStyle(kind: "info" | "success" | "warn"): CSSProperties {
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

export function TrackerWorkspaceSurface({
	onOpenReportViewer,
}: TrackerWorkspaceSurfaceProps) {
	const tracker = useTrackerWorkspace();
	const payload = tracker.state.data;
	const selectedRow = payload?.selectedDetail.row ?? null;
	const focusedPendingAddition =
		payload?.selectedDetail.pendingAddition ?? null;
	const requestedReportNumber =
		payload?.selectedDetail.requestedReportNumber ?? null;
	const [searchDraft, setSearchDraft] = useState(
		tracker.state.focus.search ?? "",
	);
	const [statusDraft, setStatusDraft] = useState("");

	useEffect(() => {
		setSearchDraft(tracker.state.focus.search ?? "");
	}, [tracker.state.focus.search]);

	useEffect(() => {
		setStatusDraft(selectedRow?.status ?? "");
	}, [selectedRow?.status]);

	if (!payload) {
		const emptyState = getEmptyState({
			error: tracker.state.error?.message ?? null,
			status: tracker.state.status,
		});

		return (
			<section aria-labelledby="tracker-workspace-title" style={surfaceStyle}>
				<section style={panelStyle}>
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
							Phase 04 / Session 05
						</p>
						<h2
							id="tracker-workspace-title"
							style={{ marginBottom: "0.35rem" }}
						>
							Tracker workspace and integrity actions
						</h2>
						<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
							Review tracker rows, pending TSV additions, and canonical status
							actions inside the shell without opening raw markdown.
						</p>
					</header>

					<section style={stackedCardStyle}>
						<h3 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
							{emptyState.title}
						</h3>
						<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
							{emptyState.body}
						</p>
					</section>
				</section>
			</section>
		);
	}

	const visibleRangeStart =
		payload.rows.filteredCount === 0 ? 0 : payload.rows.offset + 1;
	const visibleRangeEnd = payload.rows.offset + payload.rows.items.length;
	const actionsDisabled =
		tracker.state.pendingAction !== null ||
		tracker.state.isRefreshing ||
		tracker.state.status === "loading";

	return (
		<section aria-labelledby="tracker-workspace-title" style={surfaceStyle}>
			<section style={panelStyle}>
				<header
					style={{
						alignItems: "start",
						display: "flex",
						flexWrap: "wrap",
						gap: "0.9rem",
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
							Phase 04 / Session 05
						</p>
						<h2
							id="tracker-workspace-title"
							style={{ marginBottom: "0.35rem" }}
						>
							Tracker workspace and integrity actions
						</h2>
						<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
							{payload.message}
						</p>
					</div>

					<div style={{ display: "grid", gap: "0.55rem", justifyItems: "end" }}>
						<button
							aria-label="Refresh tracker workspace"
							disabled={actionsDisabled}
							onClick={() => tracker.refresh()}
							style={{
								...buttonStyle,
								opacity: actionsDisabled ? 0.7 : 1,
							}}
							type="button"
						>
							{tracker.state.isRefreshing ? "Refreshing tracker..." : "Refresh"}
						</button>
						<span style={{ color: "#64748b", fontSize: "0.92rem" }}>
							Last updated: {formatTimestamp(tracker.state.lastUpdatedAt)}
						</span>
					</div>
				</header>

				{(tracker.state.status === "offline" ||
					tracker.state.status === "error") &&
				tracker.state.error ? (
					<section
						style={{
							background:
								tracker.state.status === "offline" ? "#e2e8f0" : "#fee2e2",
							border: `1px solid ${
								tracker.state.status === "offline" ? "#cbd5e1" : "#fecaca"
							}`,
							borderRadius: "1rem",
							padding: "0.85rem 0.9rem",
						}}
					>
						<p
							style={{ fontWeight: 700, marginBottom: "0.25rem", marginTop: 0 }}
						>
							{tracker.state.status === "offline"
								? "Showing the last tracker snapshot"
								: "Tracker workspace warning"}
						</p>
						<p style={{ margin: 0 }}>{tracker.state.error.message}</p>
					</section>
				) : null}

				{tracker.state.notice ? (
					<section
						aria-live="polite"
						style={{
							...stackedCardStyle,
							...getNoticeStyle(tracker.state.notice.kind),
						}}
					>
						<p
							style={{ fontWeight: 700, marginBottom: "0.25rem", marginTop: 0 }}
						>
							Tracker action feedback
						</p>
						<p style={{ margin: 0 }}>{tracker.state.notice.message}</p>
					</section>
				) : null}

				<section style={panelStyle}>
					<header>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Pending TSV additions
						</h3>
						<p style={{ color: "#64748b", margin: 0 }}>
							{payload.pendingAdditions.message}
						</p>
					</header>

					<div
						style={{
							display: "grid",
							gap: "0.8rem",
							gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
						}}
					>
						<article style={stackedCardStyle}>
							<p style={{ color: "#64748b", margin: 0 }}>Pending additions</p>
							<strong>{payload.pendingAdditions.count}</strong>
						</article>
						<article style={stackedCardStyle}>
							<p style={{ color: "#64748b", margin: 0 }}>Visible rows</p>
							<strong>
								{visibleRangeStart}-{visibleRangeEnd} of{" "}
								{payload.rows.filteredCount}
							</strong>
						</article>
						<article style={stackedCardStyle}>
							<p style={{ color: "#64748b", margin: 0 }}>Tracker rows</p>
							<strong>{payload.rows.totalCount}</strong>
						</article>
					</div>

					{payload.pendingAdditions.items.length > 0 ? (
						<div style={listGridStyle}>
							{payload.pendingAdditions.items.map((item) => (
								<article key={item.repoRelativePath} style={stackedCardStyle}>
									<p style={{ marginBottom: "0.2rem", marginTop: 0 }}>
										<strong>#{item.entryNumber || "n/a"}</strong>{" "}
										{item.fileName}
									</p>
									<p style={{ color: "#64748b", margin: 0 }}>
										{item.repoRelativePath}
									</p>
								</article>
							))}
						</div>
					) : null}
				</section>

				<section style={panelStyle}>
					<header>
						<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
							Filters and ordering
						</h3>
						<p style={{ color: "#64748b", margin: 0 }}>
							Search by company, role, notes, score, or entry number, then keep
							selection stable through the URL-backed tracker focus state.
						</p>
					</header>

					<form
						onSubmit={(event: FormEvent<HTMLFormElement>) => {
							event.preventDefault();
							tracker.selectSearch(searchDraft);
						}}
						style={{
							alignItems: "end",
							display: "grid",
							gap: "0.9rem",
							gridTemplateColumns: "minmax(0, 1fr) minmax(14rem, 16rem) auto",
						}}
					>
						<label style={{ display: "grid", gap: "0.35rem" }}>
							<span>Search rows</span>
							<input
								aria-label="Search tracker rows"
								onChange={(event) => setSearchDraft(event.target.value)}
								placeholder="Search company, role, notes, or entry number"
								style={inputStyle}
								type="search"
								value={searchDraft}
							/>
						</label>

						<label style={{ display: "grid", gap: "0.35rem" }}>
							<span>Status filter</span>
							<select
								aria-label="Filter tracker rows by status"
								onChange={(event) =>
									tracker.selectStatusFilter(
										event.target.value.trim().length > 0
											? event.target.value
											: null,
									)
								}
								style={inputStyle}
								value={tracker.state.focus.status ?? ""}
							>
								<option value="">All statuses</option>
								{payload.statusOptions.map((option) => (
									<option key={option.id} value={option.label}>
										{option.label} ({option.count})
									</option>
								))}
							</select>
						</label>

						<button style={buttonStyle} type="submit">
							Apply
						</button>
					</form>

					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
						{TRACKER_WORKSPACE_SORT_VALUES.map((sort) => {
							const selected = tracker.state.focus.sort === sort;

							return (
								<button
									aria-label={`Sort tracker rows by ${getSortLabel(sort)}`}
									key={sort}
									onClick={() => tracker.selectSort(sort)}
									style={{
										...subtleButtonStyle,
										background: selected
											? "#0f172a"
											: subtleButtonStyle.background,
										color: selected ? "#f8fafc" : subtleButtonStyle.color,
									}}
									type="button"
								>
									{getSortLabel(sort)}
								</button>
							);
						})}
					</div>
				</section>

				<section style={detailGridStyle}>
					<section style={panelStyle}>
						<header>
							<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
								Tracker rows
							</h3>
							<p style={{ color: "#64748b", margin: 0 }}>
								Showing {visibleRangeStart}-{visibleRangeEnd} of{" "}
								{payload.rows.filteredCount} filtered rows.
							</p>
						</header>

						{payload.rows.items.length === 0 ? (
							<section style={stackedCardStyle}>
								<p style={{ margin: 0 }}>
									No tracker rows match the current filters.
								</p>
							</section>
						) : (
							<div style={listGridStyle}>
								{payload.rows.items.map((row) => (
									<article
										key={row.entryNumber}
										style={{
											...stackedCardStyle,
											background: row.selected
												? "rgba(219, 234, 254, 0.7)"
												: stackedCardStyle.background,
											border: row.selected
												? "1px solid rgba(37, 99, 235, 0.35)"
												: stackedCardStyle.border,
										}}
									>
										<div
											style={{
												alignItems: "start",
												display: "flex",
												gap: "0.75rem",
												justifyContent: "space-between",
											}}
										>
											<div>
												<p style={{ marginBottom: "0.25rem", marginTop: 0 }}>
													<strong>#{row.entryNumber}</strong> {row.company}
												</p>
												<p
													style={{
														color: "#475569",
														marginBottom: "0.35rem",
														marginTop: 0,
													}}
												>
													{row.role}
												</p>
												<p style={{ color: "#64748b", margin: 0 }}>
													{row.date} | {row.status} |{" "}
													{formatScore(row.score, row.scoreLabel)}
												</p>
											</div>

											<button
												aria-label={`Select tracker row ${row.entryNumber}`}
												onClick={() => tracker.selectRow(row)}
												style={{
													...subtleButtonStyle,
													background: row.selected
														? "#0f172a"
														: subtleButtonStyle.background,
													color: row.selected
														? "#f8fafc"
														: subtleButtonStyle.color,
												}}
												type="button"
											>
												{row.selected ? "Selected" : "Inspect"}
											</button>
										</div>

										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												gap: "0.5rem",
											}}
										>
											<span style={stackedCardStyle}>
												Report: {row.report.exists ? "Ready" : "Missing"}
											</span>
											<span style={stackedCardStyle}>
												PDF: {row.pdf.exists ? "Ready" : "Missing"}
											</span>
										</div>

										{row.warnings.length > 0 ? (
											<div style={listGridStyle}>
												{row.warnings.map((warning) => (
													<article
														key={`${row.entryNumber}:${warning.code}:${warning.message}`}
														style={{
															background: "#fef3c7",
															border: "1px solid #fde68a",
															borderRadius: "0.9rem",
															padding: "0.7rem 0.8rem",
														}}
													>
														<p
															style={{
																fontWeight: 700,
																marginBottom: "0.2rem",
																marginTop: 0,
															}}
														>
															{warning.code}
														</p>
														<p style={{ margin: 0 }}>{warning.message}</p>
													</article>
												))}
											</div>
										) : null}
									</article>
								))}
							</div>
						)}

						<div
							style={{
								alignItems: "center",
								display: "flex",
								flexWrap: "wrap",
								gap: "0.75rem",
								justifyContent: "space-between",
							}}
						>
							<button
								disabled={tracker.state.focus.offset === 0}
								onClick={() => tracker.goToPreviousPage()}
								style={{
									...subtleButtonStyle,
									opacity: tracker.state.focus.offset === 0 ? 0.55 : 1,
								}}
								type="button"
							>
								Previous page
							</button>

							<button
								disabled={!payload.rows.hasMore}
								onClick={() => tracker.goToNextPage()}
								style={{
									...subtleButtonStyle,
									opacity: payload.rows.hasMore ? 1 : 0.55,
								}}
								type="button"
							>
								Next page
							</button>
						</div>
					</section>

					<section style={panelStyle}>
						<header>
							<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
								Selected detail
							</h3>
							<p style={{ color: "#64748b", margin: 0 }}>
								{payload.selectedDetail.message}
							</p>
						</header>

						{requestedReportNumber ? (
							<section
								style={{
									background: "rgba(219, 234, 254, 0.7)",
									border: "1px solid rgba(59, 130, 246, 0.28)",
									borderRadius: "0.9rem",
									padding: "0.75rem 0.8rem",
								}}
							>
								<p
									style={{
										fontWeight: 700,
										marginBottom: "0.2rem",
										marginTop: 0,
									}}
								>
									Auto-pipeline closeout focus
								</p>
								<p style={{ margin: 0 }}>
									Tracker review is focused by report #{requestedReportNumber},
									so the workspace can resolve either the merged tracker row or
									the staged TSV addition without local guessing.
								</p>
							</section>
						) : null}

						{!selectedRow && !focusedPendingAddition ? (
							<section style={stackedCardStyle}>
								<p style={{ marginBottom: "0.5rem", marginTop: 0 }}>
									Choose a tracker row to inspect notes, artifact links, report
									metadata, and canonical status controls.
								</p>
								<button
									onClick={() => tracker.clearSelection()}
									style={subtleButtonStyle}
									type="button"
								>
									Clear selection
								</button>
							</section>
						) : focusedPendingAddition ? (
							<>
								<section style={stackedCardStyle}>
									<p style={{ marginBottom: "0.25rem", marginTop: 0 }}>
										<strong>Pending TSV</strong>{" "}
										{focusedPendingAddition.fileName}
									</p>
									<p
										style={{
											color: "#475569",
											marginBottom: "0.35rem",
											marginTop: 0,
										}}
									>
										{focusedPendingAddition.company ?? "Unknown company"} |{" "}
										{focusedPendingAddition.role ?? "Unknown role"}
									</p>
									<p style={{ color: "#64748b", margin: 0 }}>
										Entry #{focusedPendingAddition.entryNumber || "n/a"} |{" "}
										{focusedPendingAddition.status ?? "No status"} | Report #
										{focusedPendingAddition.reportNumber ?? "n/a"}
									</p>
								</section>

								<section style={stackedCardStyle}>
									<h4 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
										Staged tracker addition
									</h4>
									<p style={{ marginBottom: "0.5rem", marginTop: 0 }}>
										This closeout has not been merged into
										`data/applications.md` yet. The tracker workspace is showing
										the staged TSV so you can review it before merge.
									</p>
									<p style={{ color: "#475569", margin: 0 }}>
										{focusedPendingAddition.notes ??
											"No notes are stored in the staged TSV."}
									</p>
								</section>

								<section style={stackedCardStyle}>
									<h4 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
										Report handoff
									</h4>
									<div
										style={{
											display: "flex",
											flexWrap: "wrap",
											gap: "0.5rem",
										}}
									>
										<button
											disabled={!focusedPendingAddition.reportRepoRelativePath}
											onClick={() =>
												onOpenReportViewer({
													reportPath:
														focusedPendingAddition.reportRepoRelativePath,
												})
											}
											style={{
												...buttonStyle,
												opacity: focusedPendingAddition.reportRepoRelativePath
													? 1
													: 0.65,
											}}
											type="button"
										>
											Open report viewer
										</button>
										<button
											disabled={actionsDisabled}
											onClick={() =>
												tracker.runAction({
													action: "merge-tracker-additions",
												})
											}
											style={{
												...subtleButtonStyle,
												opacity: actionsDisabled ? 0.65 : 1,
											}}
											type="button"
										>
											Merge TSVs
										</button>
										<button
											onClick={() => tracker.clearSelection()}
											style={subtleButtonStyle}
											type="button"
										>
											Clear selection
										</button>
									</div>
								</section>
							</>
						) : selectedRow ? (
							<>
								<section style={stackedCardStyle}>
									<p style={{ marginBottom: "0.25rem", marginTop: 0 }}>
										<strong>#{selectedRow.entryNumber}</strong>{" "}
										{selectedRow.company}
									</p>
									<p
										style={{
											color: "#475569",
											marginBottom: "0.35rem",
											marginTop: 0,
										}}
									>
										{selectedRow.role}
									</p>
									<p style={{ color: "#64748b", margin: 0 }}>
										{selectedRow.date} | {selectedRow.status} |{" "}
										{formatScore(selectedRow.score, selectedRow.scoreLabel)}
									</p>
								</section>

								<div
									style={{
										display: "grid",
										gap: "0.8rem",
										gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
									}}
								>
									<article style={stackedCardStyle}>
										<p style={{ color: "#64748b", margin: 0 }}>Report path</p>
										<strong>
											{selectedRow.report.repoRelativePath ??
												"No report linked"}
										</strong>
									</article>
									<article style={stackedCardStyle}>
										<p style={{ color: "#64748b", margin: 0 }}>PDF path</p>
										<strong>
											{selectedRow.pdf.repoRelativePath ?? "No PDF linked"}
										</strong>
									</article>
									<article style={stackedCardStyle}>
										<p style={{ color: "#64748b", margin: 0 }}>Legitimacy</p>
										<strong>
											{selectedRow.header?.legitimacy ?? "Not available"}
										</strong>
									</article>
								</div>

								{selectedRow.warnings.length > 0 ? (
									<div style={listGridStyle}>
										{selectedRow.warnings.map((warning) => (
											<article
												key={`${selectedRow.entryNumber}:${warning.code}:${warning.message}`}
												style={{
													background: "#fef3c7",
													border: "1px solid #fde68a",
													borderRadius: "0.9rem",
													padding: "0.7rem 0.8rem",
												}}
											>
												<p
													style={{
														fontWeight: 700,
														marginBottom: "0.2rem",
														marginTop: 0,
													}}
												>
													{warning.code}
												</p>
												<p style={{ margin: 0 }}>{warning.message}</p>
											</article>
										))}
									</div>
								) : null}

								<section style={stackedCardStyle}>
									<h4 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
										Notes
									</h4>
									<p style={{ margin: 0 }}>
										{selectedRow.notes || "No notes are stored for this row."}
									</p>
								</section>

								<section style={stackedCardStyle}>
									<h4 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
										Canonical status
									</h4>
									<div
										style={{
											alignItems: "end",
											display: "grid",
											gap: "0.75rem",
											gridTemplateColumns: "minmax(0, 1fr) auto",
										}}
									>
										<label style={{ display: "grid", gap: "0.35rem" }}>
											<span>Status label</span>
											<select
												aria-label="Select tracker status"
												onChange={(event) => setStatusDraft(event.target.value)}
												style={inputStyle}
												value={statusDraft}
											>
												{payload.statusOptions.map((option) => (
													<option key={option.id} value={option.label}>
														{option.label}
													</option>
												))}
											</select>
										</label>

										<button
											disabled={
												actionsDisabled ||
												statusDraft.trim() === selectedRow.status
											}
											onClick={() =>
												tracker.runAction({
													action: "update-status",
													entryNumber: selectedRow.entryNumber,
													status: statusDraft,
												})
											}
											style={{
												...buttonStyle,
												opacity:
													actionsDisabled ||
													statusDraft.trim() === selectedRow.status
														? 0.65
														: 1,
											}}
											type="button"
										>
											{tracker.state.pendingAction?.action === "update-status"
												? "Updating..."
												: "Update status"}
										</button>
									</div>
								</section>

								<section style={stackedCardStyle}>
									<h4 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
										Maintenance actions
									</h4>
									<div
										style={{
											display: "flex",
											flexWrap: "wrap",
											gap: "0.5rem",
										}}
									>
										<button
											disabled={actionsDisabled}
											onClick={() =>
												tracker.runAction({
													action: "merge-tracker-additions",
												})
											}
											style={{
												...subtleButtonStyle,
												opacity: actionsDisabled ? 0.65 : 1,
											}}
											type="button"
										>
											Merge TSVs
										</button>
										<button
											disabled={actionsDisabled}
											onClick={() =>
												tracker.runAction({
													action: "verify-tracker-pipeline",
												})
											}
											style={{
												...subtleButtonStyle,
												opacity: actionsDisabled ? 0.65 : 1,
											}}
											type="button"
										>
											Verify
										</button>
										<button
											disabled={actionsDisabled}
											onClick={() =>
												tracker.runAction({
													action: "normalize-tracker-statuses",
													dryRun: true,
												})
											}
											style={{
												...subtleButtonStyle,
												opacity: actionsDisabled ? 0.65 : 1,
											}}
											type="button"
										>
											Normalize dry run
										</button>
										<button
											disabled={actionsDisabled}
											onClick={() =>
												tracker.runAction({
													action: "normalize-tracker-statuses",
													dryRun: false,
												})
											}
											style={{
												...subtleButtonStyle,
												opacity: actionsDisabled ? 0.65 : 1,
											}}
											type="button"
										>
											Normalize
										</button>
										<button
											disabled={actionsDisabled}
											onClick={() =>
												tracker.runAction({
													action: "dedup-tracker-entries",
													dryRun: true,
												})
											}
											style={{
												...subtleButtonStyle,
												opacity: actionsDisabled ? 0.65 : 1,
											}}
											type="button"
										>
											Dedup dry run
										</button>
										<button
											disabled={actionsDisabled}
											onClick={() =>
												tracker.runAction({
													action: "dedup-tracker-entries",
													dryRun: false,
												})
											}
											style={{
												...subtleButtonStyle,
												opacity: actionsDisabled ? 0.65 : 1,
											}}
											type="button"
										>
											Dedup
										</button>
									</div>
								</section>

								<section style={stackedCardStyle}>
									<h4 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
										Report handoff
									</h4>
									<p
										style={{
											color: "#475569",
											marginBottom: "0.75rem",
											marginTop: 0,
										}}
									>
										Open the checked-in report in the existing artifact viewer
										instead of rendering another report reader inside tracker.
									</p>
									<div
										style={{
											display: "flex",
											flexWrap: "wrap",
											gap: "0.5rem",
										}}
									>
										<button
											disabled={!selectedRow.report.repoRelativePath}
											onClick={() =>
												onOpenReportViewer({
													reportPath: selectedRow.report.repoRelativePath,
												})
											}
											style={{
												...buttonStyle,
												opacity: selectedRow.report.repoRelativePath ? 1 : 0.65,
											}}
											type="button"
										>
											Open report viewer
										</button>
										<button
											onClick={() => tracker.clearSelection()}
											style={subtleButtonStyle}
											type="button"
										>
											Clear selection
										</button>
									</div>
								</section>

								<section style={stackedCardStyle}>
									<h4 style={{ marginBottom: "0.35rem", marginTop: 0 }}>
										Source line
									</h4>
									<code
										style={{
											display: "block",
											overflowX: "auto",
											whiteSpace: "pre-wrap",
										}}
									>
										{selectedRow.sourceLine}
									</code>
								</section>
							</>
						) : null}
					</section>
				</section>
			</section>
		</section>
	);
}

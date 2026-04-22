import type { CSSProperties } from "react";
import type { BatchWorkspaceFocus } from "./batch-workspace-client";
import type {
	BatchWorkspaceItemPreview,
	BatchWorkspaceStatusFilter,
	BatchWorkspaceSummaryPayload,
} from "./batch-workspace-types";
import type { BatchWorkspaceViewStatus } from "./use-batch-workspace";

type BatchWorkspaceItemMatrixProps = {
	focus: BatchWorkspaceFocus;
	isBusy: boolean;
	onClearSelection: () => void;
	onNextPage: () => void;
	onPreviousPage: () => void;
	onSelectItem: (item: BatchWorkspaceItemPreview) => void;
	onSelectStatus: (status: BatchWorkspaceStatusFilter) => void;
	status: BatchWorkspaceViewStatus;
	summary: BatchWorkspaceSummaryPayload | null;
};

const panelStyle: CSSProperties = {
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(148, 163, 184, 0.2)",
	borderRadius: "1.35rem",
	display: "grid",
	gap: "0.95rem",
	padding: "1rem",
};

const listStyle: CSSProperties = {
	display: "grid",
	gap: "0.75rem",
	listStyle: "none",
	margin: 0,
	padding: 0,
};

const buttonStyle: CSSProperties = {
	background: "#0f172a",
	border: 0,
	borderRadius: "999px",
	color: "#f8fafc",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 700,
	minHeight: "2.25rem",
	padding: "0.5rem 0.85rem",
};

const subtleButtonStyle: CSSProperties = {
	background: "rgba(15, 23, 42, 0.08)",
	border: "1px solid rgba(148, 163, 184, 0.3)",
	borderRadius: "999px",
	color: "#0f172a",
	cursor: "pointer",
	font: "inherit",
	fontWeight: 600,
	minHeight: "2.1rem",
	padding: "0.45rem 0.8rem",
};

function describeEmptyState(status: BatchWorkspaceViewStatus): {
	body: string;
	title: string;
} {
	switch (status) {
		case "loading":
			return {
				body: "Waiting for bounded batch rows from the batch-supervisor summary.",
				title: "Loading item matrix",
			};
		case "offline":
			return {
				body: "The batch-supervisor endpoint is offline, so the item matrix cannot refresh.",
				title: "Item matrix offline",
			};
		case "error":
			return {
				body: "The batch-supervisor payload could not be rendered into item rows.",
				title: "Item matrix unavailable",
			};
		default:
			return {
				body: "Select the batch surface once draft rows and run status are available.",
				title: "No batch rows yet",
			};
	}
}

function formatStatusLabel(value: string): string {
	switch (value) {
		case "retryable-failed":
			return "Retryable failed";
		default:
			return value.charAt(0).toUpperCase() + value.slice(1);
	}
}

function formatScore(value: number | null): string {
	if (value === null) {
		return "No score";
	}

	return `${value.toFixed(1)} / 5`;
}

export function BatchWorkspaceItemMatrix({
	focus,
	isBusy,
	onClearSelection,
	onNextPage,
	onPreviousPage,
	onSelectItem,
	onSelectStatus,
	status,
	summary,
}: BatchWorkspaceItemMatrixProps) {
	if (!summary) {
		const emptyState = describeEmptyState(status);

		return (
			<section
				aria-labelledby="batch-workspace-item-matrix-title"
				style={panelStyle}
			>
				<header>
					<h2
						id="batch-workspace-item-matrix-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						Item matrix
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Review bounded batch rows, filters, and warning badges without
						reading repo files in the browser.
					</p>
				</header>

				<section
					style={{
						background: "rgba(248, 250, 252, 0.92)",
						border: "1px solid rgba(148, 163, 184, 0.18)",
						borderRadius: "1rem",
						padding: "0.9rem",
					}}
				>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
						{emptyState.title}
					</h3>
					<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
						{emptyState.body}
					</p>
				</section>
			</section>
		);
	}

	const visibleRangeStart =
		summary.items.filteredCount === 0 ? 0 : summary.items.offset + 1;
	const visibleRangeEnd = summary.items.offset + summary.items.items.length;
	const allOptionIncluded = summary.statusOptions.some(
		(option) => option.id === "all",
	);
	const statusOptions = allOptionIncluded
		? summary.statusOptions
		: [
				{
					count: summary.items.totalCount,
					id: "all" as const,
					label: "All",
				},
				...summary.statusOptions,
			];

	return (
		<section
			aria-labelledby="batch-workspace-item-matrix-title"
			style={panelStyle}
		>
			<header
				style={{
					alignItems: "start",
					display: "flex",
					flexWrap: "wrap",
					gap: "0.75rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h2
						id="batch-workspace-item-matrix-title"
						style={{ marginBottom: "0.35rem", marginTop: 0 }}
					>
						Item matrix
					</h2>
					<p style={{ color: "#64748b", marginBottom: 0, marginTop: 0 }}>
						Showing {visibleRangeStart}-{visibleRangeEnd} of{" "}
						{summary.items.filteredCount} filtered rows.
					</p>
				</div>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
					<button
						disabled={focus.itemId === null}
						onClick={onClearSelection}
						style={{
							...subtleButtonStyle,
							opacity: focus.itemId === null ? 0.6 : 1,
						}}
						type="button"
					>
						Clear selection
					</button>
					<button
						disabled={isBusy || focus.offset === 0}
						onClick={onPreviousPage}
						style={{
							...subtleButtonStyle,
							opacity: isBusy || focus.offset === 0 ? 0.6 : 1,
						}}
						type="button"
					>
						Previous
					</button>
					<button
						disabled={isBusy || !summary.items.hasMore}
						onClick={onNextPage}
						style={{
							...buttonStyle,
							opacity: isBusy || !summary.items.hasMore ? 0.65 : 1,
						}}
						type="button"
					>
						Next
					</button>
				</div>
			</header>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
				{statusOptions.map((option) => {
					const selected = option.id === focus.status;

					return (
						<button
							aria-pressed={selected}
							key={option.id}
							onClick={() => onSelectStatus(option.id)}
							style={{
								...(selected ? buttonStyle : subtleButtonStyle),
								opacity: isBusy ? 0.7 : 1,
							}}
							type="button"
						>
							{option.label} ({option.count})
						</button>
					);
				})}
			</div>

			{summary.items.items.length === 0 ? (
				<section
					style={{
						background: "rgba(248, 250, 252, 0.92)",
						border: "1px solid rgba(148, 163, 184, 0.18)",
						borderRadius: "1rem",
						padding: "0.9rem",
					}}
				>
					<h3 style={{ marginBottom: "0.25rem", marginTop: 0 }}>
						No rows match the current filter
					</h3>
					<p style={{ color: "#475569", marginBottom: 0, marginTop: 0 }}>
						Try another status filter or wait for the next batch refresh.
					</p>
				</section>
			) : (
				<ul style={listStyle}>
					{summary.items.items.map((item) => {
						const selected =
							item.selected ||
							(focus.itemId !== null && focus.itemId === item.id);

						return (
							<li key={item.id}>
								<button
									aria-pressed={selected}
									aria-label={`Select batch item ${item.id}`}
									onClick={() => onSelectItem(item)}
									style={{
										alignItems: "start",
										background: selected ? "rgba(15, 23, 42, 0.06)" : "#ffffff",
										border: selected
											? "1px solid rgba(15, 23, 42, 0.42)"
											: "1px solid rgba(148, 163, 184, 0.25)",
										borderRadius: "1rem",
										cursor: "pointer",
										display: "grid",
										gap: "0.45rem",
										padding: "0.9rem",
										textAlign: "left",
										width: "100%",
									}}
									type="button"
								>
									<div
										style={{
											alignItems: "start",
											display: "flex",
											gap: "0.8rem",
											justifyContent: "space-between",
										}}
									>
										<div>
											<strong>
												#{item.id} {item.company ?? "Unknown company"}
											</strong>
											<p
												style={{
													color: "#475569",
													marginBottom: 0,
													marginTop: "0.15rem",
												}}
											>
												{item.role ?? "Role unavailable"}
											</p>
										</div>
										<span
											style={{
												background: selected ? "#0f172a" : "#e2e8f0",
												borderRadius: "999px",
												color: selected ? "#f8fafc" : "#334155",
												fontSize: "0.82rem",
												fontWeight: 700,
												padding: "0.25rem 0.6rem",
											}}
										>
											{formatStatusLabel(item.status)}
										</span>
									</div>

									<p
										style={{
											color: "#475569",
											display: "flex",
											flexWrap: "wrap",
											gap: "0.75rem",
											margin: 0,
										}}
									>
										<span>Score: {formatScore(item.score)}</span>
										<span>Retries: {item.retries}</span>
										<span>Report: {item.reportNumber ?? "pending"}</span>
									</p>

									<p
										style={{
											color: "#64748b",
											display: "flex",
											flexWrap: "wrap",
											gap: "0.75rem",
											margin: 0,
										}}
									>
										<span>
											Report{" "}
											{item.artifacts.report.exists ? "ready" : "missing"}
										</span>
										<span>
											PDF {item.artifacts.pdf.exists ? "ready" : "missing"}
										</span>
										<span>
											Tracker{" "}
											{item.artifacts.tracker.exists ? "ready" : "missing"}
										</span>
										<span>Warnings {item.warningCount}</span>
									</p>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

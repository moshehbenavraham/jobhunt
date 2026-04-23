import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import {
	trackerButton,
	trackerFilterBar,
	trackerInput,
	trackerSubtleButton,
} from "./tracker-styles";
import {
	TRACKER_WORKSPACE_SORT_VALUES,
	type TrackerWorkspaceSort,
	type TrackerWorkspaceStatusOption,
} from "./tracker-workspace-types";

type TrackerFilterBarProps = {
	onSelectSearch: (search: string) => void;
	onSelectSort: (sort: TrackerWorkspaceSort) => void;
	onSelectStatusFilter: (status: string | null) => void;
	search: string | null;
	sort: TrackerWorkspaceSort;
	status: string | null;
	statusOptions: TrackerWorkspaceStatusOption[];
};

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

const sortBarStyle: CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--jh-space-2)",
};

export function TrackerFilterBar({
	onSelectSearch,
	onSelectSort,
	onSelectStatusFilter,
	search,
	sort,
	status,
	statusOptions,
}: TrackerFilterBarProps) {
	const [searchDraft, setSearchDraft] = useState(search ?? "");

	useEffect(() => {
		setSearchDraft(search ?? "");
	}, [search]);

	return (
		<section aria-label="Tracker filters" style={trackerFilterBar}>
			<form
				onSubmit={(event: FormEvent<HTMLFormElement>) => {
					event.preventDefault();
					onSelectSearch(searchDraft);
				}}
				style={{
					alignItems: "end",
					display: "grid",
					gap: "var(--jh-space-3)",
					gridTemplateColumns: "minmax(0, 1fr) minmax(14rem, 16rem) auto",
				}}
			>
				<label style={{ display: "grid", gap: "var(--jh-space-1)" }}>
					<span
						style={{
							fontSize: "var(--jh-text-label-size)",
							fontWeight: "var(--jh-font-weight-medium)" as unknown as number,
						}}
					>
						Search
					</span>
					<input
						aria-label="Search tracker rows"
						onChange={(event) => setSearchDraft(event.target.value)}
						placeholder="Company, role, notes, or entry number"
						style={trackerInput}
						type="search"
						value={searchDraft}
					/>
				</label>

				<label style={{ display: "grid", gap: "var(--jh-space-1)" }}>
					<span
						style={{
							fontSize: "var(--jh-text-label-size)",
							fontWeight: "var(--jh-font-weight-medium)" as unknown as number,
						}}
					>
						Status
					</span>
					<select
						aria-label="Filter by status"
						onChange={(event) =>
							onSelectStatusFilter(
								event.target.value.trim().length > 0
									? event.target.value
									: null,
							)
						}
						style={trackerInput}
						value={status ?? ""}
					>
						<option value="">All statuses</option>
						{statusOptions.map((option) => (
							<option key={option.id} value={option.label}>
								{option.label} ({option.count})
							</option>
						))}
					</select>
				</label>

				<button style={trackerButton} type="submit">
					Apply
				</button>
			</form>

			<div style={sortBarStyle}>
				{TRACKER_WORKSPACE_SORT_VALUES.map((s) => {
					const selected = sort === s;

					return (
						<button
							aria-label={`Sort by ${getSortLabel(s)}`}
							key={s}
							onClick={() => onSelectSort(s)}
							style={{
								...trackerSubtleButton,
								background: selected
									? "var(--jh-color-button-bg)"
									: trackerSubtleButton.background,
								color: selected
									? "var(--jh-color-button-fg)"
									: trackerSubtleButton.color,
							}}
							type="button"
						>
							{getSortLabel(s)}
						</button>
					);
				})}
			</div>
		</section>
	);
}

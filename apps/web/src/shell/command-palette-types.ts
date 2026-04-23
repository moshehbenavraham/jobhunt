import type { ShellSurfaceId } from "./shell-types";

export type PaletteCommandKind = "action" | "navigate";

export type PaletteActionId =
	| "new-evaluation"
	| "open-approval-detail"
	| "open-tracker"
	| "refresh-approvals"
	| "refresh-batch"
	| "refresh-scan"
	| "refresh-settings"
	| "view-pipeline";

export type PaletteCommand = {
	actionId: PaletteActionId | null;
	description: string;
	forSurface?: ShellSurfaceId | null;
	id: string;
	kind: PaletteCommandKind;
	label: string;
	path: string;
	surfaceId: ShellSurfaceId | null;
};

export const PALETTE_ACTIONS: readonly PaletteCommand[] = [
	{
		actionId: "new-evaluation",
		description: "Start a new job evaluation",
		id: "action:new-evaluation",
		kind: "action",
		label: "New evaluation",
		path: "/evaluate",
		surfaceId: "chat",
	},
	{
		actionId: "view-pipeline",
		description: "Review pending and processed queue rows",
		id: "action:view-pipeline",
		kind: "action",
		label: "View pipeline",
		path: "/pipeline",
		surfaceId: "pipeline",
	},
	{
		actionId: "open-tracker",
		description: "Review tracker rows and additions",
		id: "action:open-tracker",
		kind: "action",
		label: "Open tracker",
		path: "/tracker",
		surfaceId: "tracker",
	},
] as const;

export const PALETTE_CONTEXT_COMMANDS: readonly PaletteCommand[] = [
	{
		actionId: "refresh-approvals",
		description: "Reload pending approvals from the API",
		forSurface: "approvals",
		id: "context:refresh-approvals",
		kind: "action",
		label: "Refresh approval inbox",
		path: "",
		surfaceId: "approvals",
	},
	{
		actionId: "refresh-scan",
		description: "Reload the latest scan shortlist",
		forSurface: "scan",
		id: "context:refresh-scan",
		kind: "action",
		label: "Refresh scan results",
		path: "",
		surfaceId: "scan",
	},
	{
		actionId: "refresh-batch",
		description: "Reload batch run status",
		forSurface: "batch",
		id: "context:refresh-batch",
		kind: "action",
		label: "Refresh batch results",
		path: "",
		surfaceId: "batch",
	},
	{
		actionId: "refresh-settings",
		description: "Reload runtime and maintenance details",
		forSurface: "settings",
		id: "context:refresh-settings",
		kind: "action",
		label: "Refresh settings",
		path: "",
		surfaceId: "settings",
	},
] as const;

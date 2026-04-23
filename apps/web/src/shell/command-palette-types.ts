import type { ShellSurfaceId } from "./shell-types";

export type PaletteCommandKind = "action" | "navigate";

export type PaletteActionId =
	| "new-evaluation"
	| "open-tracker"
	| "view-pipeline";

export type PaletteCommand = {
	actionId: PaletteActionId | null;
	description: string;
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

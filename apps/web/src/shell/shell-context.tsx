import { createContext, useContext } from "react";
import type { SpecialistWorkspaceMode } from "../workflows/specialist-workspace-types";
import type { OperatorHomeAction } from "./operator-home-types";

export type ShellCallbacks = {
	openApprovals: (focus: {
		approvalId: string | null;
		sessionId: string | null;
	}) => void;
	openApplicationHelp: (focus: { sessionId: string | null }) => void;
	openArtifacts: (focus: { reportPath: string | null }) => void;
	openChatConsole: (focus: { sessionId: string | null }) => void;
	openPipeline: (focus: {
		reportNumber: string | null;
		section: "all" | "processed";
		url: string | null;
	}) => void;
	openSpecialistDetailSurface: (focus: {
		mode: SpecialistWorkspaceMode;
		path: string;
		sessionId: string | null;
	}) => void;
	openTracker: (focus: {
		entryNumber: number | null;
		reportNumber: string | null;
	}) => void;
	runHomeAction: (action: OperatorHomeAction) => void;
};

const ShellContext = createContext<ShellCallbacks | null>(null);

export const ShellContextProvider = ShellContext.Provider;

export function useShellCallbacks(): ShellCallbacks {
	const ctx = useContext(ShellContext);

	if (!ctx) {
		throw new Error(
			"useShellCallbacks must be used inside ShellContextProvider.",
		);
	}

	return ctx;
}

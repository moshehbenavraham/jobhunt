import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PaletteCommand } from "./command-palette-types";
import {
	PALETTE_ACTIONS,
	PALETTE_CONTEXT_COMMANDS,
} from "./command-palette-types";
import type { ShellSurfaceId } from "./shell-types";
import { SHELL_SURFACES } from "./shell-types";

function buildRegistry(
	surfaceId: ShellSurfaceId | null,
): readonly PaletteCommand[] {
	const contextCommands = PALETTE_CONTEXT_COMMANDS.filter(
		(cmd) => cmd.forSurface == null || cmd.forSurface === surfaceId,
	);

	const surfaceCommands: PaletteCommand[] = SHELL_SURFACES.map((s) => ({
		actionId: null,
		description: s.description,
		id: `surface:${s.id}`,
		kind: "navigate" as const,
		label: s.label,
		path: s.path,
		surfaceId: s.id,
	}));

	return [...contextCommands, ...surfaceCommands, ...PALETTE_ACTIONS];
}

function matchesQuery(command: PaletteCommand, query: string): boolean {
	const lower = query.toLowerCase();
	const label = command.label.toLowerCase();
	const desc = command.description.toLowerCase();

	if (label.includes(lower) || desc.includes(lower)) {
		return true;
	}

	let labelIdx = 0;

	for (let i = 0; i < lower.length; i++) {
		const ch = lower[i];

		if (ch === undefined) {
			return false;
		}

		labelIdx = label.indexOf(ch, labelIdx);

		if (labelIdx === -1) {
			return false;
		}

		labelIdx++;
	}

	return true;
}

export type CommandPaletteState = {
	commands: readonly PaletteCommand[];
	isOpen: boolean;
	query: string;
	selectedIndex: number;
};

export type CommandPaletteActions = {
	close: () => void;
	onSelect: (command: PaletteCommand) => void;
	setQuery: (query: string) => void;
	setSelectedIndex: (index: number) => void;
	toggle: () => void;
};

export function useCommandPalette(
	onNavigate: (path: string) => void,
	currentSurfaceId: ShellSurfaceId | null,
): {
	actions: CommandPaletteActions;
	state: CommandPaletteState;
} {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const registry = useMemo(
		() => buildRegistry(currentSurfaceId),
		[currentSurfaceId],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on surface navigation change
	useEffect(() => {
		setQuery("");
		setSelectedIndex(0);
	}, [currentSurfaceId]);

	const commands = useMemo(() => {
		if (query.trim() === "") {
			return registry;
		}

		return registry.filter((cmd) => matchesQuery(cmd, query));
	}, [registry, query]);

	const close = useCallback(() => {
		setIsOpen(false);
		setQuery("");
		setSelectedIndex(0);

		if (previousFocusRef.current) {
			previousFocusRef.current.focus();
			previousFocusRef.current = null;
		}
	}, []);

	const toggle = useCallback(() => {
		setIsOpen((prev) => {
			if (prev) {
				setQuery("");
				setSelectedIndex(0);

				if (previousFocusRef.current) {
					previousFocusRef.current.focus();
					previousFocusRef.current = null;
				}

				return false;
			}

			previousFocusRef.current = document.activeElement as HTMLElement | null;
			return true;
		});
	}, []);

	const onSelect = useCallback(
		(command: PaletteCommand) => {
			onNavigate(command.path);
			setIsOpen(false);
			setQuery("");
			setSelectedIndex(0);

			if (previousFocusRef.current) {
				previousFocusRef.current.focus();
				previousFocusRef.current = null;
			}
		},
		[onNavigate],
	);

	const setQueryWrapped = useCallback((value: string) => {
		setQuery(value);
		setSelectedIndex(0);
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (
				(event.metaKey || event.ctrlKey) &&
				event.key === "k" &&
				!event.shiftKey &&
				!event.altKey
			) {
				const target = event.target as HTMLElement | null;
				const tag = target?.tagName?.toLowerCase();

				if (
					tag === "textarea" ||
					(tag === "input" &&
						(target as HTMLInputElement).type !== "button" &&
						(target as HTMLInputElement).type !== "submit") ||
					target?.isContentEditable
				) {
					return;
				}

				event.preventDefault();
				toggle();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [toggle]);

	return {
		actions: {
			close,
			onSelect,
			setQuery: setQueryWrapped,
			setSelectedIndex,
			toggle,
		},
		state: {
			commands,
			isOpen,
			query,
			selectedIndex,
		},
	};
}

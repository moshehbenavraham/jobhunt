import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import type { PaletteCommand } from "./command-palette-types";
import type {
	CommandPaletteActions,
	CommandPaletteState,
} from "./use-command-palette";

type CommandPaletteProps = {
	actions: CommandPaletteActions;
	state: CommandPaletteState;
};

const backdropStyle: CSSProperties = {
	alignItems: "flex-start",
	background: "var(--jh-color-drawer-backdrop)",
	display: "flex",
	inset: 0,
	justifyContent: "center",
	paddingTop: "min(20vh, 120px)",
	position: "fixed",
	zIndex: 9999,
};

const panelStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-width) solid var(--jh-color-surface-border)",
	borderRadius: "var(--jh-radius-xl)",
	boxShadow: "var(--jh-shadow-lg)",
	display: "flex",
	flexDirection: "column",
	maxHeight: "min(60vh, 420px)",
	maxWidth: "540px",
	overflow: "hidden",
	width: "90vw",
};

const inputStyle: CSSProperties = {
	background: "transparent",
	border: "none",
	borderBottom: "var(--jh-border-subtle)",
	color: "var(--jh-color-text-primary)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-lg-size)",
	outline: "none",
	padding: "var(--jh-space-4)",
	width: "100%",
};

const listStyle: CSSProperties = {
	listStyle: "none",
	margin: 0,
	overflowY: "auto",
	padding: "var(--jh-space-2)",
};

const itemBaseStyle: CSSProperties = {
	alignItems: "center",
	borderRadius: "var(--jh-radius-md)",
	cursor: "pointer",
	display: "flex",
	gap: "var(--jh-space-3)",
	padding: "var(--jh-space-3) var(--jh-space-4)",
};

const selectedItemStyle: CSSProperties = {
	...itemBaseStyle,
	background: "var(--jh-color-nav-item-selected-bg)",
};

const emptyStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	padding: "var(--jh-space-6) var(--jh-space-4)",
	textAlign: "center",
};

const kindBadgeStyle: CSSProperties = {
	background: "var(--jh-color-badge-neutral-bg)",
	borderRadius: "var(--jh-radius-sm)",
	color: "var(--jh-color-badge-neutral-fg)",
	fontSize: "var(--jh-text-caption-size)",
	fontWeight: "var(--jh-font-weight-medium)",
	padding: "0.15rem 0.4rem",
};

const hintStyle: CSSProperties = {
	borderTop: "var(--jh-border-subtle)",
	color: "var(--jh-color-text-muted)",
	display: "flex",
	fontSize: "var(--jh-text-caption-size)",
	gap: "var(--jh-space-4)",
	justifyContent: "center",
	padding: "var(--jh-space-2) var(--jh-space-4)",
};

function getKindLabel(command: PaletteCommand): string {
	return command.kind === "action" ? "Action" : "Go to";
}

export function CommandPalette({ actions, state }: CommandPaletteProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const listRef = useRef<HTMLUListElement | null>(null);

	useEffect(() => {
		if (state.isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [state.isOpen]);

	useEffect(() => {
		if (!state.isOpen) {
			return;
		}

		const selected = listRef.current?.children[state.selectedIndex] as
			| HTMLElement
			| undefined;

		selected?.scrollIntoView({ block: "nearest" });
	}, [state.isOpen, state.selectedIndex]);

	if (!state.isOpen) {
		return null;
	}

	function handleKeyDown(event: React.KeyboardEvent) {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				actions.setSelectedIndex(
					Math.min(state.selectedIndex + 1, state.commands.length - 1),
				);
				break;
			case "ArrowUp":
				event.preventDefault();
				actions.setSelectedIndex(Math.max(state.selectedIndex - 1, 0));
				break;
			case "Enter": {
				event.preventDefault();
				const selected = state.commands[state.selectedIndex];

				if (selected) {
					actions.onSelect(selected);
				}

				break;
			}
			case "Escape":
				event.preventDefault();
				actions.close();
				break;
		}
	}

	function handleBackdropClick(event: React.MouseEvent) {
		if (event.target === event.currentTarget) {
			actions.close();
		}
	}

	return (
		<div
			aria-label="Command palette"
			onClick={handleBackdropClick}
			onKeyDown={handleKeyDown}
			role="dialog"
			style={backdropStyle}
		>
			<div
				aria-expanded={state.commands.length > 0}
				aria-label="Command palette panel"
				role="combobox"
				style={panelStyle}
				tabIndex={-1}
			>
				<input
					aria-autocomplete="list"
					aria-controls="command-palette-list"
					aria-label="Search commands"
					onChange={(e) => actions.setQuery(e.target.value)}
					placeholder="Type a command..."
					ref={inputRef}
					style={inputStyle}
					type="text"
					value={state.query}
				/>

				{state.commands.length === 0 ? (
					<p style={emptyStyle}>No matching commands</p>
				) : (
					<div
						id="command-palette-list"
						ref={listRef}
						role="listbox"
						style={listStyle}
					>
						{state.commands.map((command, index) => (
							<div
								aria-selected={index === state.selectedIndex}
								key={command.id}
								onClick={() => actions.onSelect(command)}
								onKeyDown={(e) => {
									if (e.key === "Enter") actions.onSelect(command);
								}}
								onMouseEnter={() => actions.setSelectedIndex(index)}
								role="option"
								tabIndex={-1}
								style={
									index === state.selectedIndex
										? selectedItemStyle
										: itemBaseStyle
								}
							>
								<span style={kindBadgeStyle}>{getKindLabel(command)}</span>
								<span
									style={{
										flex: 1,
										fontWeight: "var(--jh-font-weight-medium)",
									}}
								>
									{command.label}
								</span>
								<span
									style={{
										color: "var(--jh-color-text-muted)",
										fontSize: "var(--jh-text-body-sm-size)",
									}}
								>
									{command.description}
								</span>
							</div>
						))}
					</div>
				)}

				<div style={hintStyle}>
					<span>Up/Down to navigate</span>
					<span>Enter to select</span>
					<span>Esc to dismiss</span>
				</div>
			</div>
		</div>
	);
}

import type { CSSProperties, MouseEvent } from "react";
import { useRef } from "react";
import type { ShellSurfaceId } from "./shell-types";

type BottomNavItem = {
	icon: string;
	id: ShellSurfaceId;
	label: string;
};

type BottomNavProps = {
	currentSurface: ShellSurfaceId;
	onMenuTap: () => void;
	onSelect: (surfaceId: ShellSurfaceId) => void;
};

const BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
	{ icon: "H", id: "home", label: "Home" },
	{ icon: "C", id: "chat", label: "Chat" },
	{ icon: "W", id: "workflows", label: "Workflows" },
	{ icon: "T", id: "tracker", label: "Tracker" },
] as const;

const barStyle: CSSProperties = {
	alignItems: "center",
	background: "var(--jh-color-nav-bg)",
	borderTop: "var(--jh-border-width) solid var(--jh-color-nav-border)",
	bottom: 0,
	display: "grid",
	gridTemplateColumns: `repeat(${BOTTOM_NAV_ITEMS.length + 1}, 1fr)`,
	height: "var(--jh-zone-bottom-nav-height)",
	left: 0,
	position: "fixed",
	right: 0,
	zIndex: 800,
};

const itemStyle: CSSProperties = {
	alignItems: "center",
	background: "none",
	border: "none",
	color: "var(--jh-color-nav-muted)",
	cursor: "pointer",
	display: "flex",
	flexDirection: "column",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-caption-size)",
	gap: "var(--jh-space-1)",
	height: "100%",
	justifyContent: "center",
	letterSpacing: "var(--jh-text-label-sm-letter-spacing)",
	minWidth: "44px",
	padding: "var(--jh-space-1) 0",
};

const iconStyle: CSSProperties = {
	alignItems: "center",
	borderRadius: "var(--jh-radius-sm)",
	display: "flex",
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-body-size)",
	fontWeight: "var(--jh-font-weight-bold)",
	height: "28px",
	justifyContent: "center",
	width: "28px",
};

const DEBOUNCE_MS = 300;

export function BottomNav({
	currentSurface,
	onMenuTap,
	onSelect,
}: BottomNavProps) {
	const lastTapRef = useRef(0);

	const handleTap = (
		event: MouseEvent<HTMLButtonElement>,
		surfaceId: ShellSurfaceId,
	) => {
		event.preventDefault();
		const now = Date.now();
		if (now - lastTapRef.current < DEBOUNCE_MS) return;
		lastTapRef.current = now;
		onSelect(surfaceId);
	};

	const handleMenuTap = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		const now = Date.now();
		if (now - lastTapRef.current < DEBOUNCE_MS) return;
		lastTapRef.current = now;
		onMenuTap();
	};

	return (
		<nav aria-label="Mobile navigation" style={barStyle}>
			{BOTTOM_NAV_ITEMS.map((item) => {
				const isActive = item.id === currentSurface;

				return (
					<button
						aria-current={isActive ? "page" : undefined}
						key={item.id}
						onClick={(e) => handleTap(e, item.id)}
						style={{
							...itemStyle,
							color: isActive
								? "var(--jh-color-nav-accent)"
								: "var(--jh-color-nav-muted)",
						}}
						type="button"
					>
						<span
							style={{
								...iconStyle,
								background: isActive
									? "var(--jh-color-nav-item-selected-bg)"
									: "transparent",
							}}
						>
							{item.icon}
						</span>
						<span>{item.label}</span>
					</button>
				);
			})}
			<button
				aria-label="Open navigation menu"
				onClick={handleMenuTap}
				style={itemStyle}
				type="button"
			>
				<span style={iconStyle}>=</span>
				<span>More</span>
			</button>
		</nav>
	);
}

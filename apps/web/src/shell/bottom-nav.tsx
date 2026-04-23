import type { CSSProperties, MouseEvent } from "react";
import { useRef } from "react";
import { NavLink } from "react-router";

type BottomNavItem = {
	icon: string;
	label: string;
	path: string;
};

type BottomNavProps = {
	onMenuTap: () => void;
};

const BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
	{ icon: "H", label: "Home", path: "/" },
	{ icon: "C", label: "Chat", path: "/evaluate" },
	{ icon: "W", label: "Workflows", path: "/workflows" },
	{ icon: "T", label: "Tracker", path: "/tracker" },
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
	textDecoration: "none",
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

const menuButtonStyle: CSSProperties = {
	...itemStyle,
};

const DEBOUNCE_MS = 300;

export function BottomNav({ onMenuTap }: BottomNavProps) {
	const lastTapRef = useRef(0);

	const handleMenuTap = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		const now = Date.now();
		if (now - lastTapRef.current < DEBOUNCE_MS) return;
		lastTapRef.current = now;
		onMenuTap();
	};

	return (
		<nav aria-label="Mobile navigation" style={barStyle}>
			{BOTTOM_NAV_ITEMS.map((item) => (
				<NavLink
					end={item.path === "/"}
					key={item.path}
					style={({ isActive }) => ({
						...itemStyle,
						color: isActive
							? "var(--jh-color-nav-accent)"
							: "var(--jh-color-nav-muted)",
					})}
					to={item.path}
				>
					{({ isActive }) => (
						<>
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
						</>
					)}
				</NavLink>
			))}
			<button
				aria-label="Open navigation menu"
				onClick={handleMenuTap}
				style={menuButtonStyle}
				type="button"
			>
				<span style={iconStyle}>=</span>
				<span>More</span>
			</button>
		</nav>
	);
}

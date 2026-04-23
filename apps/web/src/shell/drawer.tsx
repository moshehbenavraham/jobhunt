import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
} from "react";

type DrawerSide = "left" | "right";

type DrawerProps = {
	ariaLabel: string;
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	side?: DrawerSide;
	width?: string;
};

const backdropStyle: CSSProperties = {
	background: "var(--jh-color-drawer-backdrop)",
	inset: 0,
	position: "fixed",
	transition: "opacity var(--jh-zone-drawer-transition)",
	zIndex: 900,
};

const panelBaseStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	boxShadow: "var(--jh-shadow-lg)",
	display: "flex",
	flexDirection: "column",
	height: "100%",
	maxWidth: "100vw",
	overflowY: "auto",
	position: "fixed",
	top: 0,
	transition: "transform var(--jh-zone-drawer-transition)",
	zIndex: 910,
};

export function Drawer({
	ariaLabel,
	children,
	isOpen,
	onClose,
	side = "right",
	width = "var(--jh-zone-drawer-width)",
}: DrawerProps) {
	const panelRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!isOpen) return;

		previousFocusRef.current = document.activeElement as HTMLElement | null;

		const panel = panelRef.current;
		if (panel) {
			const firstFocusable = panel.querySelector<HTMLElement>(
				'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
			);
			if (firstFocusable) {
				firstFocusable.focus();
			} else {
				panel.focus();
			}
		}

		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = "";
			previousFocusRef.current?.focus();
			previousFocusRef.current = null;
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.stopPropagation();
				onClose();
				return;
			}

			if (event.key !== "Tab") return;

			const panel = panelRef.current;
			if (!panel) return;

			const focusables = panel.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
			);
			if (focusables.length === 0) return;

			const first = focusables[0] as HTMLElement | undefined;
			const last = focusables[focusables.length - 1] as HTMLElement | undefined;
			if (!first || !last) return;

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleBackdropClick = useCallback(() => {
		onClose();
	}, [onClose]);

	const panelPositionStyle: CSSProperties =
		side === "left"
			? {
					left: 0,
					transform: isOpen ? "translateX(0)" : "translateX(-100%)",
					width,
				}
			: {
					right: 0,
					transform: isOpen ? "translateX(0)" : "translateX(100%)",
					width,
				};

	return (
		<>
			<div
				aria-hidden="true"
				onClick={handleBackdropClick}
				style={{
					...backdropStyle,
					opacity: isOpen ? 1 : 0,
					pointerEvents: isOpen ? "auto" : "none",
				}}
			/>
			<div
				aria-label={ariaLabel}
				aria-modal={isOpen ? "true" : undefined}
				ref={panelRef}
				role="dialog"
				style={{ ...panelBaseStyle, ...panelPositionStyle }}
				tabIndex={-1}
			>
				{children}
			</div>
		</>
	);
}

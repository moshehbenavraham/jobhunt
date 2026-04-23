import { useCallback, useEffect, useRef, useState } from "react";

export type Breakpoint = "desktop" | "mobile" | "tablet";

export type NavigationRailVariant = "collapsed" | "full" | "hidden";

export type ResponsiveLayoutState = {
	breakpoint: Breakpoint;
	isEvidenceDrawerOpen: boolean;
	isNavDrawerOpen: boolean;
	railVariant: NavigationRailVariant;
};

const MOBILE_QUERY = "(max-width: 767px)";
const TABLET_QUERY = "(min-width: 768px) and (max-width: 1199px)";

function resolveBreakpoint(
	mobileMatch: boolean,
	tabletMatch: boolean,
): Breakpoint {
	if (mobileMatch) return "mobile";
	if (tabletMatch) return "tablet";
	return "desktop";
}

function railVariantForBreakpoint(bp: Breakpoint): NavigationRailVariant {
	switch (bp) {
		case "mobile":
			return "hidden";
		case "tablet":
			return "collapsed";
		case "desktop":
			return "full";
	}
}

export const BREAKPOINTS = {
	mobile: 768,
	tablet: 1200,
	wide: 1600,
} as const;

export function useResponsiveLayout(): {
	closeEvidenceDrawer: () => void;
	closeNavDrawer: () => void;
	openEvidenceDrawer: () => void;
	openNavDrawer: () => void;
	state: ResponsiveLayoutState;
	toggleEvidenceDrawer: () => void;
	toggleNavDrawer: () => void;
} {
	const mobileRef = useRef<MediaQueryList | null>(null);
	const tabletRef = useRef<MediaQueryList | null>(null);

	const [state, setState] = useState<ResponsiveLayoutState>(() => {
		const mobileMatch = window.matchMedia(MOBILE_QUERY).matches;
		const tabletMatch = window.matchMedia(TABLET_QUERY).matches;
		const bp = resolveBreakpoint(mobileMatch, tabletMatch);

		return {
			breakpoint: bp,
			isEvidenceDrawerOpen: false,
			isNavDrawerOpen: false,
			railVariant: railVariantForBreakpoint(bp),
		};
	});

	useEffect(() => {
		const mobileMql = window.matchMedia(MOBILE_QUERY);
		const tabletMql = window.matchMedia(TABLET_QUERY);
		mobileRef.current = mobileMql;
		tabletRef.current = tabletMql;

		const handleChange = () => {
			const nextBp = resolveBreakpoint(mobileMql.matches, tabletMql.matches);

			setState((prev) => {
				if (prev.breakpoint === nextBp) return prev;

				return {
					breakpoint: nextBp,
					isEvidenceDrawerOpen: false,
					isNavDrawerOpen: false,
					railVariant: railVariantForBreakpoint(nextBp),
				};
			});
		};

		mobileMql.addEventListener("change", handleChange);
		tabletMql.addEventListener("change", handleChange);

		handleChange();

		return () => {
			mobileMql.removeEventListener("change", handleChange);
			tabletMql.removeEventListener("change", handleChange);
			mobileRef.current = null;
			tabletRef.current = null;
		};
	}, []);

	const openEvidenceDrawer = useCallback(() => {
		setState((prev) =>
			prev.breakpoint === "desktop" || prev.isEvidenceDrawerOpen
				? prev
				: { ...prev, isEvidenceDrawerOpen: true, isNavDrawerOpen: false },
		);
	}, []);

	const closeEvidenceDrawer = useCallback(() => {
		setState((prev) =>
			prev.isEvidenceDrawerOpen
				? { ...prev, isEvidenceDrawerOpen: false }
				: prev,
		);
	}, []);

	const toggleEvidenceDrawer = useCallback(() => {
		setState((prev) =>
			prev.breakpoint === "desktop"
				? prev
				: {
						...prev,
						isEvidenceDrawerOpen: !prev.isEvidenceDrawerOpen,
						isNavDrawerOpen: false,
					},
		);
	}, []);

	const openNavDrawer = useCallback(() => {
		setState((prev) =>
			prev.breakpoint !== "mobile" || prev.isNavDrawerOpen
				? prev
				: { ...prev, isEvidenceDrawerOpen: false, isNavDrawerOpen: true },
		);
	}, []);

	const closeNavDrawer = useCallback(() => {
		setState((prev) =>
			prev.isNavDrawerOpen ? { ...prev, isNavDrawerOpen: false } : prev,
		);
	}, []);

	const toggleNavDrawer = useCallback(() => {
		setState((prev) =>
			prev.breakpoint !== "mobile"
				? prev
				: {
						...prev,
						isEvidenceDrawerOpen: false,
						isNavDrawerOpen: !prev.isNavDrawerOpen,
					},
		);
	}, []);

	return {
		closeEvidenceDrawer,
		closeNavDrawer,
		openEvidenceDrawer,
		openNavDrawer,
		state,
		toggleEvidenceDrawer,
		toggleNavDrawer,
	};
}

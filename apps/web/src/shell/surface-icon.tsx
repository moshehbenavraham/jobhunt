import type { SVGProps } from "react";
import type { ShellSurfaceId } from "./shell-types";

type SurfaceIconProps = SVGProps<SVGSVGElement> & {
	surface: ShellSurfaceId | "menu";
};

const ICON_PATHS: Record<SurfaceIconProps["surface"], readonly string[]> = {
	home: ["M4 5h16", "M6 9h12", "M8 13h8", "M10 17h4"],
	startup: ["M12 3v18", "m5-13-5-5-5 5", "M5 15h14"],
	chat: ["M4 5h16v11H8l-4 4V5Z", "M8 9h8", "M8 12h5"],
	workflows: [
		"M7 4h10v5H7z",
		"M4 15h6v5H4z",
		"M14 15h6v5h-6z",
		"M12 9v3",
		"M7 12h10",
		"M7 12v3",
		"M17 12v3",
	],
	scan: ["M4 7V4h3", "M17 4h3v3", "M20 17v3h-3", "M7 20H4v-3", "M7 12h10"],
	batch: ["M5 5h14v4H5z", "M5 11h14v4H5z", "M5 17h14v2H5z"],
	"application-help": ["M5 4h14v16H5z", "M8 8h8", "M8 12h8", "M8 16h5"],
	pipeline: ["M5 4v16", "M5 7h8l-2-2", "M5 12h12l-2-2", "M5 17h7l-2-2"],
	tracker: ["M5 4h14v16H5z", "M5 9h14", "M5 14h14", "M10 4v16"],
	artifacts: ["M7 3h7l4 4v14H7z", "M14 3v5h5", "M10 13h5", "M10 17h5"],
	onboarding: ["M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M5 21a7 7 0 0 1 14 0"],
	approvals: ["m5 12 4 4L19 6"],
	settings: [
		"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
		"M4 12h2",
		"M18 12h2",
		"M12 4v2",
		"M12 18v2",
		"m6.3 6.3 1.4 1.4",
		"m16.3 16.3 1.4 1.4",
		"m17.7 6.3-1.4 1.4",
		"m7.7 16.3-1.4 1.4",
	],
	menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
};

export function SurfaceIcon({
	surface,
	...svgProps
}: SurfaceIconProps) {
	return (
		<svg
			aria-hidden="true"
			fill="none"
			height="18"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.7"
			viewBox="0 0 24 24"
			width="18"
			{...svgProps}
		>
			{ICON_PATHS[surface].map((path) => (
				<path d={path} key={path} />
			))}
		</svg>
	);
}

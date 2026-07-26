import { ScanReviewSurface } from "../scan/scan-review-surface";
import { useShellCallbacks } from "../shell/shell-context";

export function ScanPage() {
	const { openChatConsole } = useShellCallbacks();

	return <ScanReviewSurface onOpenChatConsole={openChatConsole} />;
}

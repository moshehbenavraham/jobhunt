import { BatchWorkspaceSurface } from "../batch/batch-workspace-surface";
import { useShellCallbacks } from "../shell/shell-context";

export function BatchPage() {
	const { openApprovals, openArtifacts, openChatConsole, openTracker } =
		useShellCallbacks();

	return (
		<BatchWorkspaceSurface
			onOpenApprovals={openApprovals}
			onOpenChatConsole={openChatConsole}
			onOpenReportViewer={openArtifacts}
			onOpenTrackerWorkspace={(focus) =>
				openTracker({
					entryNumber: null,
					reportNumber: focus.reportNumber,
				})
			}
		/>
	);
}

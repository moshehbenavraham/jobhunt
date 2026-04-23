import { ChatConsoleSurface } from "../chat/chat-console-surface";
import { useShellCallbacks } from "../shell/shell-context";

export function ChatPage() {
	const { openApprovals, openArtifacts, openPipeline, openTracker } =
		useShellCallbacks();

	return (
		<ChatConsoleSurface
			onOpenApprovals={openApprovals}
			onOpenPipelineReview={openPipeline}
			onOpenReportViewer={openArtifacts}
			onOpenTrackerReview={(focus) =>
				openTracker({
					entryNumber: null,
					reportNumber: focus.reportNumber,
				})
			}
		/>
	);
}

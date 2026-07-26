import { useShellCallbacks } from "../shell/shell-context";
import { SpecialistWorkspaceSurface } from "../workflows/specialist-workspace-surface";

export function WorkflowsPage() {
	const {
		openApprovals,
		openArtifacts,
		openChatConsole,
		openPipeline,
		openSpecialistDetailSurface,
		openTracker,
	} = useShellCallbacks();

	return (
		<SpecialistWorkspaceSurface
			onOpenApprovals={openApprovals}
			onOpenChatConsole={openChatConsole}
			onOpenPipelineReview={openPipeline}
			onOpenReportViewer={openArtifacts}
			onOpenDetailSurface={openSpecialistDetailSurface}
			onOpenTrackerWorkspace={openTracker}
		/>
	);
}

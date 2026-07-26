import { ApplicationHelpSurface } from "../application-help/application-help-surface";
import { useShellCallbacks } from "../shell/shell-context";

export function ApplyPage() {
	const { openApprovals, openArtifacts, openChatConsole } = useShellCallbacks();

	return (
		<ApplicationHelpSurface
			onOpenApprovals={openApprovals}
			onOpenChatConsole={openChatConsole}
			onOpenReportViewer={openArtifacts}
		/>
	);
}

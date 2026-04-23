import { useShellCallbacks } from "../shell/shell-context";
import { TrackerWorkspaceSurface } from "../tracker/tracker-workspace-surface";

export function TrackerPage() {
	const { openArtifacts } = useShellCallbacks();

	return <TrackerWorkspaceSurface onOpenReportViewer={openArtifacts} />;
}

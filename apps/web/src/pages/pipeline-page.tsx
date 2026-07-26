import { PipelineReviewSurface } from "../pipeline/pipeline-review-surface";
import { useShellCallbacks } from "../shell/shell-context";

export function PipelinePage() {
	const { openArtifacts } = useShellCallbacks();

	return <PipelineReviewSurface onOpenReportViewer={openArtifacts} />;
}

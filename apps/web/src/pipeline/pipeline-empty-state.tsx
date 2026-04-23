import type { CSSProperties } from "react";
import type { PipelineReviewViewStatus } from "./use-pipeline-review";

type PipelineEmptyStateProps = {
	error: string | null;
	status: PipelineReviewViewStatus;
};

const containerStyle: CSSProperties = {
	background: "var(--jh-color-pipeline-card-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-md)",
	padding: "var(--jh-space-padding)",
};

const titleStyle: CSSProperties = {
	fontFamily: "var(--jh-font-heading)",
	fontSize: "var(--jh-text-h3-size)",
	fontWeight: "var(--jh-text-h3-weight)" as never,
	marginBottom: "var(--jh-space-1)",
	marginTop: 0,
};

const bodyStyle: CSSProperties = {
	color: "var(--jh-color-text-secondary)",
	marginBottom: 0,
	marginTop: 0,
};

function getEmptyState(input: {
	error: string | null;
	status: PipelineReviewViewStatus;
}): { body: string; title: string } {
	switch (input.status) {
		case "loading":
			return {
				body: "Retrieving the queue overview from the API.",
				title: "Loading queue overview",
			};
		case "offline":
			return {
				body:
					input.error ??
					"The API is unreachable. Start the local server and try again.",
				title: "Queue overview offline",
			};
		case "error":
			return {
				body:
					input.error ??
					"The queue overview could not be loaded. Try refreshing.",
				title: "Queue overview unavailable",
			};
		default:
			return {
				body: "Add rows to data/pipeline.md, then open this view to triage them.",
				title: "No queue rows yet",
			};
	}
}

export function PipelineEmptyState({ error, status }: PipelineEmptyStateProps) {
	const state = getEmptyState({ error, status });

	return (
		<section style={containerStyle}>
			<h3 style={titleStyle}>{state.title}</h3>
			<p style={bodyStyle}>{state.body}</p>
		</section>
	);
}

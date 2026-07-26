import { type CSSProperties, forwardRef, useMemo } from "react";
import { extractSections, type TocEntry } from "./extract-sections";

type ReportReadingColumnProps = {
	body: string | null;
	onSectionsExtracted?: (entries: TocEntry[]) => void;
	status: "empty" | "error" | "loading" | "missing" | "offline" | "ready";
	errorMessage?: string | null | undefined;
};

const columnStyle: CSSProperties = {
	display: "grid",
	fontFamily: "var(--jh-font-body)",
	gap: "var(--jh-space-4)",
	maxHeight: "80vh",
	overflowY: "auto",
};

const preStyle: CSSProperties = {
	background: "var(--jh-color-report-reading-bg)",
	borderRadius: "var(--jh-radius-md)",
	color: "var(--jh-color-report-reading-fg)",
	fontFamily: "var(--jh-font-mono)",
	fontSize: "var(--jh-text-mono-size)",
	lineHeight: "var(--jh-text-mono-line-height)",
	margin: 0,
	padding: "var(--jh-space-padding)",
	whiteSpace: "pre-wrap",
	wordBreak: "break-word",
};

const messageStyle: CSSProperties = {
	background: "var(--jh-color-surface-bg)",
	border: "var(--jh-border-subtle)",
	borderRadius: "var(--jh-radius-lg)",
	color: "var(--jh-color-text-secondary)",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-size)",
	lineHeight: "var(--jh-text-body-line-height)",
	margin: 0,
	padding: "var(--jh-space-padding)",
};

function getStateMessage(
	status: ReportReadingColumnProps["status"],
	errorMessage?: string | null,
): string | null {
	switch (status) {
		case "loading":
			return "Loading report...";
		case "error":
			return errorMessage ?? "Unable to load this report. Try refreshing.";
		case "offline":
			return "Server unreachable. Showing last available content if cached.";
		case "empty":
			return "Select a report to read its full content here.";
		case "missing":
			return "This report no longer exists in the workspace.";
		case "ready":
			return null;
	}
}

const HEADING_PATTERN = /^(## +)(.+)$/gm;

function injectAnchors(
	body: string,
	sections: TocEntry[],
): { __html: string } | null {
	if (sections.length === 0) {
		return null;
	}

	const idMap = new Map<string, string>();

	for (const entry of sections) {
		idMap.set(entry.text, entry.id);
	}

	let sectionIndex = 0;
	const escaped = body
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	const html = escaped.replace(HEADING_PATTERN, (_match, prefix, text) => {
		const trimmed = text.trim();
		const section = sections[sectionIndex];

		if (section && idMap.has(section.text)) {
			sectionIndex += 1;
			return `${prefix}<span id="${section.id}" tabindex="-1">${trimmed}</span>`;
		}

		return `${prefix}${trimmed}`;
	});

	return { __html: html };
}

export const ReportReadingColumn = forwardRef<
	HTMLElement,
	ReportReadingColumnProps
>(function ReportReadingColumn(
	{ body, onSectionsExtracted, status, errorMessage },
	ref,
) {
	const sections = useMemo(() => {
		const result = extractSections(body);
		onSectionsExtracted?.(result);
		return result;
	}, [body, onSectionsExtracted]);

	const stateMessage = getStateMessage(status, errorMessage);

	if (stateMessage) {
		return (
			<section aria-label="Report content" ref={ref} style={columnStyle}>
				<p style={messageStyle}>{stateMessage}</p>
			</section>
		);
	}

	if (!body) {
		return (
			<section aria-label="Report content" ref={ref} style={columnStyle}>
				<p style={messageStyle}>This report has no content.</p>
			</section>
		);
	}

	const anchoredHtml = injectAnchors(body, sections);

	return (
		<section aria-label="Report content" ref={ref} style={columnStyle}>
			{anchoredHtml ? (
				// biome-ignore lint/security/noDangerouslySetInnerHtml: body is HTML-escaped before anchor injection in injectAnchors
				<pre dangerouslySetInnerHTML={anchoredHtml} style={preStyle} />
			) : (
				<pre style={preStyle}>{body}</pre>
			)}
		</section>
	);
});

import type { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from "../index.js";
import type { StartupStatus } from "./startup-status.js";

export const reportViewerArtifactGroupValues = [
	"all",
	"output",
	"reports",
] as const;

export type ReportViewerArtifactGroup =
	(typeof reportViewerArtifactGroupValues)[number];

export const reportViewerArtifactKindValues = ["pdf", "report"] as const;

export type ReportViewerArtifactKind =
	(typeof reportViewerArtifactKindValues)[number];

export const reportViewerSelectionOriginValues = [
	"latest",
	"none",
	"selected",
] as const;

export type ReportViewerSelectionOrigin =
	(typeof reportViewerSelectionOriginValues)[number];

export const reportViewerSelectionStateValues = [
	"empty",
	"missing",
	"ready",
] as const;

export type ReportViewerSelectionState =
	(typeof reportViewerSelectionStateValues)[number];

export const reportViewerLegitimacyValues = [
	"High Confidence",
	"Proceed with Caution",
	"Suspicious",
] as const;

export type ReportViewerLegitimacy =
	(typeof reportViewerLegitimacyValues)[number];

export const DEFAULT_REPORT_VIEWER_ARTIFACT_LIMIT = 8;
export const MAX_REPORT_VIEWER_ARTIFACT_LIMIT = 20;

export type ReportViewerArtifactItem = {
	artifactDate: string | null;
	fileName: string;
	kind: ReportViewerArtifactKind;
	repoRelativePath: string;
	reportNumber: string | null;
	selected: boolean;
};

export type ReportViewerLinkedPdf = {
	exists: boolean;
	repoRelativePath: string | null;
};

export type ReportViewerReportHeader = {
	archetype: string | null;
	date: string | null;
	legitimacy: ReportViewerLegitimacy | null;
	pdf: ReportViewerLinkedPdf;
	score: number | null;
	title: string | null;
	url: string | null;
	verification: string | null;
};

export type ReportViewerSelectedReport = {
	body: string | null;
	header: ReportViewerReportHeader | null;
	message: string;
	origin: ReportViewerSelectionOrigin;
	repoRelativePath: string | null;
	reportNumber: string | null;
	requestedRepoRelativePath: string | null;
	state: ReportViewerSelectionState;
};

export type ReportViewerSummaryOptions = {
	group?: ReportViewerArtifactGroup;
	limit?: number;
	offset?: number;
	reportPath?: string;
};

export type ReportViewerSummaryPayload = {
	filters: {
		group: ReportViewerArtifactGroup;
		limit: number;
		offset: number;
		reportPath: string | null;
	};
	generatedAt: string;
	message: string;
	ok: true;
	recentArtifacts: {
		group: ReportViewerArtifactGroup;
		hasMore: boolean;
		items: ReportViewerArtifactItem[];
		limit: number;
		offset: number;
		totalCount: number;
	};
	selectedReport: ReportViewerSelectedReport;
	service: typeof STARTUP_SERVICE_NAME;
	sessionId: typeof STARTUP_SESSION_ID;
	status: StartupStatus;
};

export function isReportViewerArtifactGroup(
	candidate: unknown,
): candidate is ReportViewerArtifactGroup {
	return (
		typeof candidate === "string" &&
		(reportViewerArtifactGroupValues as readonly string[]).includes(candidate)
	);
}

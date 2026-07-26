import { readFile } from "node:fs/promises";
import { resolveRepoRelativePath } from "../config/repo-paths.js";
import { readStoredEvaluationLaunchContext } from "../orchestration/evaluation-launch-context.js";
import type { JsonValue } from "../workspace/workspace-types.js";
import type {
	EvaluationResultInputProvenance,
	EvaluationResultReviewFocus,
	EvaluationResultState,
	EvaluationResultSummary,
	EvaluationResultVerificationResult,
	EvaluationResultVerificationSource,
	EvaluationResultVerificationStatus,
	EvaluationResultVerificationSummary,
} from "./evaluation-result-contract.js";

type JsonRecord = Record<string, JsonValue>;

type HeaderVerification = {
	message: string;
	url: string | null;
};

type LivenessVerification = {
	message: string;
	result: EvaluationResultVerificationResult;
	status: EvaluationResultVerificationStatus;
	url: string | null;
};

type EvaluationReviewEnvelope = {
	inputProvenance: EvaluationResultInputProvenance;
	reviewFocus: EvaluationResultReviewFocus;
	verification: EvaluationResultVerificationSummary;
};

function isJsonRecord(value: JsonValue | null): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: JsonRecord, key: string): string | null {
	const candidate = value[key];
	return typeof candidate === "string" && candidate.trim().length > 0
		? candidate.trim()
		: null;
}

function expandSignalSources(value: JsonValue | null): JsonRecord[] {
	if (!isJsonRecord(value)) {
		return [];
	}

	const sources = [value];

	if (isJsonRecord(value.artifacts ?? null)) {
		sources.push(value.artifacts as JsonRecord);
	}

	const items = value.items;
	if (Array.isArray(items)) {
		for (const item of items) {
			if (isJsonRecord(item)) {
				sources.push(item);
			}
		}
	}

	return sources;
}

function mapVerificationKeywords(message: string): {
	result: EvaluationResultVerificationResult;
	status: EvaluationResultVerificationStatus;
} {
	const normalized = message.toLowerCase();

	if (normalized.includes("active")) {
		return {
			result: "active",
			status: "verified",
		};
	}

	if (
		normalized.includes("expired") ||
		normalized.includes("closed") ||
		normalized.includes("inactive")
	) {
		return {
			result: "expired",
			status: "needs-review",
		};
	}

	if (
		normalized.includes("uncertain") ||
		normalized.includes("manual") ||
		normalized.includes("review")
	) {
		return {
			result: "uncertain",
			status: "needs-review",
		};
	}

	return {
		result: "none",
		status: "verified",
	};
}

function extractLivenessVerification(
	sources: readonly (JsonValue | null)[],
): LivenessVerification | null {
	for (const source of sources) {
		for (const entry of expandSignalSources(source)) {
			const state = readString(entry, "state");
			const liveness = isJsonRecord(entry.liveness ?? null)
				? (entry.liveness as JsonRecord)
				: null;
			const message =
				readString(entry, "message") ??
				(liveness ? readString(liveness, "reason") : null) ??
				"Verification status is available.";
			const url =
				(liveness ? readString(liveness, "url") : null) ??
				readString(entry, "url");

			if (state === "ready" && liveness) {
				const result = readString(liveness, "result");

				if (result === "active") {
					return {
						message,
						result: "active",
						status: "verified",
						url,
					};
				}

				if (result === "expired" || result === "uncertain") {
					return {
						message,
						result,
						status: "needs-review",
						url,
					};
				}
			}

			if (state === "offline") {
				return {
					message,
					result: "offline",
					status: "needs-review",
					url,
				};
			}

			if (state === "error") {
				return {
					message,
					result: "error",
					status: "needs-review",
					url,
				};
			}
		}
	}

	return null;
}

function readHeaderValue(
	lines: readonly string[],
	label: string,
): string | null {
	const prefix = `**${label}:**`;

	for (const line of lines) {
		if (!line.startsWith(prefix)) {
			continue;
		}

		const value = line.slice(prefix.length).trim();
		return value.length > 0 ? value : null;
	}

	return null;
}

async function readReportHeaderVerification(input: {
	repoRoot: string;
	reportPath: string | null;
}): Promise<HeaderVerification | null> {
	if (!input.reportPath) {
		return null;
	}

	try {
		const reportText = await readFile(
			resolveRepoRelativePath(input.reportPath, {
				repoRoot: input.repoRoot,
			}),
			"utf8",
		);
		const normalizedText = reportText.replace(/\r\n?/g, "\n");
		const lines = normalizedText.split("\n");
		const dividerIndex = lines.findIndex((line) => line.trim() === "---");
		const headerLines =
			dividerIndex >= 0 ? lines.slice(0, dividerIndex) : lines;
		const message = readHeaderValue(headerLines, "Verification");

		if (!message) {
			return null;
		}

		return {
			message,
			url: readHeaderValue(headerLines, "URL"),
		};
	} catch {
		return null;
	}
}

function createInputProvenance(
	sessionContext: JsonValue,
): EvaluationResultInputProvenance {
	let launchContext = null;

	try {
		launchContext = readStoredEvaluationLaunchContext(sessionContext);
	} catch {
		launchContext = null;
	}

	if (!launchContext) {
		return {
			canonicalUrl: null,
			host: null,
			kind: "unknown",
			message: "Evaluation input provenance is unavailable.",
		};
	}

	if (launchContext.kind === "job-url") {
		return {
			canonicalUrl: launchContext.canonicalUrl,
			host: launchContext.host,
			kind: "job-url",
			message: `Launched from live job URL ${launchContext.canonicalUrl}.`,
		};
	}

	return {
		canonicalUrl: null,
		host: null,
		kind: "raw-jd",
		message:
			"Launched from raw job-description text. Prompt text is redacted from stored session context.",
	};
}

function isReviewReadyState(state: EvaluationResultState): boolean {
	return state === "completed" || state === "degraded";
}

function createVerificationSummary(input: {
	inputProvenance: EvaluationResultInputProvenance;
	liveness: LivenessVerification | null;
	reportHeaderVerification: HeaderVerification | null;
	state: EvaluationResultState;
}): EvaluationResultVerificationSummary {
	if (input.inputProvenance.kind === "raw-jd") {
		return {
			message:
				"Verification is not applicable for raw job-description launches.",
			result: "none",
			source: "none",
			status: "not-applicable",
			url: null,
		};
	}

	if (input.liveness) {
		return {
			message: input.liveness.message,
			result: input.liveness.result,
			source: "liveness",
			status: input.liveness.status,
			url: input.liveness.url ?? input.inputProvenance.canonicalUrl,
		};
	}

	if (input.reportHeaderVerification) {
		const mapped = mapVerificationKeywords(
			input.reportHeaderVerification.message,
		);

		return {
			message: input.reportHeaderVerification.message,
			result: mapped.result,
			source: "report-header",
			status: mapped.status,
			url:
				input.reportHeaderVerification.url ??
				input.inputProvenance.canonicalUrl,
		};
	}

	if (
		input.state === "pending" ||
		input.state === "running" ||
		input.state === "approval-paused"
	) {
		return {
			message: "Verification is still pending for this live job URL.",
			result: "none",
			source: "none",
			status: "pending",
			url: input.inputProvenance.canonicalUrl,
		};
	}

	return {
		message:
			"No explicit verification result was captured for this live job URL.",
		result: "none",
		source: "none",
		status: "unconfirmed",
		url: input.inputProvenance.canonicalUrl,
	};
}

function createReviewFocus(input: {
	artifacts: EvaluationResultSummary["artifacts"];
	inputProvenance: EvaluationResultInputProvenance;
	reportNumber: string | null;
	state: EvaluationResultState;
}): EvaluationResultReviewFocus {
	const reportViewer =
		input.artifacts.report.state === "ready" &&
		input.artifacts.report.repoRelativePath
			? {
					availability: "ready" as const,
					message: "Report artifact is ready for in-app review.",
					reportNumber: input.reportNumber,
					reportPath: input.artifacts.report.repoRelativePath,
				}
			: {
					availability: "unavailable" as const,
					message: input.artifacts.report.message,
					reportNumber: input.reportNumber,
					reportPath: input.artifacts.report.repoRelativePath,
				};
	const pipelineReview = isReviewReadyState(input.state)
		? {
				availability: "ready" as const,
				message: input.reportNumber
					? `Pipeline review can focus processed row #${input.reportNumber}.`
					: input.inputProvenance.canonicalUrl
						? `Pipeline review can focus ${input.inputProvenance.canonicalUrl}.`
						: "Pipeline review can open the processed queue.",
				reportNumber: input.reportNumber,
				section:
					input.reportNumber || input.inputProvenance.canonicalUrl
						? ("processed" as const)
						: ("all" as const),
				url:
					input.reportNumber === null
						? input.inputProvenance.canonicalUrl
						: null,
			}
		: {
				availability: "unavailable" as const,
				message:
					"Pipeline review unlocks after the evaluation closeout reaches a review-ready state.",
				reportNumber: input.reportNumber,
				section: "all" as const,
				url: null,
			};
	const trackerWorkspace =
		isReviewReadyState(input.state) && input.reportNumber
			? {
					availability: "ready" as const,
					message: `Tracker review can focus report #${input.reportNumber} across merged rows and pending TSV additions.`,
					reportNumber: input.reportNumber,
				}
			: {
					availability: "unavailable" as const,
					message:
						"Tracker review unlocks after the evaluation closeout records a report number.",
					reportNumber: input.reportNumber,
				};

	return {
		pipelineReview,
		primaryTarget:
			reportViewer.availability === "ready"
				? "report-viewer"
				: pipelineReview.availability === "ready"
					? "pipeline-review"
					: trackerWorkspace.availability === "ready"
						? "tracker-workspace"
						: "none",
		reportViewer,
		trackerWorkspace,
	};
}

export async function createEvaluationReviewEnvelope(input: {
	artifacts: EvaluationResultSummary["artifacts"];
	repoRoot: string;
	reportNumber: string | null;
	sessionContext: JsonValue;
	signals: readonly (JsonValue | null)[];
	state: EvaluationResultState;
}): Promise<EvaluationReviewEnvelope> {
	const inputProvenance = createInputProvenance(input.sessionContext);
	const [livenessVerification, reportHeaderVerification] = await Promise.all([
		Promise.resolve(extractLivenessVerification(input.signals)),
		readReportHeaderVerification({
			repoRoot: input.repoRoot,
			reportPath:
				input.artifacts.report.state === "ready"
					? input.artifacts.report.repoRelativePath
					: null,
		}),
	]);

	return {
		inputProvenance,
		reviewFocus: createReviewFocus({
			artifacts: input.artifacts,
			inputProvenance,
			reportNumber: input.reportNumber,
			state: input.state,
		}),
		verification: createVerificationSummary({
			inputProvenance,
			liveness: livenessVerification,
			reportHeaderVerification,
			state: input.state,
		}),
	};
}

export function hasVerificationSource(
	verification: EvaluationResultVerificationSummary,
): verification is EvaluationResultVerificationSummary & {
	source: Exclude<EvaluationResultVerificationSource, "none">;
} {
	return verification.source !== "none";
}

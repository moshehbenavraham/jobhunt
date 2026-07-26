import { z } from "zod";
import type { WorkflowIntent } from "../prompt/index.js";
import type { JsonValue } from "../workspace/index.js";
import type { EvaluationLaunchContextMetadata } from "./orchestration-contract.js";

const evaluationLaunchMetadataSchema = z.discriminatedUnion("kind", [
	z.object({
		canonicalUrl: z.string().url(),
		host: z.string().trim().min(1),
		kind: z.literal("job-url"),
		promptRedacted: z.literal(true),
	}),
	z.object({
		canonicalUrl: z.null(),
		host: z.null(),
		kind: z.literal("raw-jd"),
		promptRedacted: z.literal(true),
	}),
]);

const promptContextSchema = z
	.object({
		promptText: z.string().trim().min(1).optional(),
	})
	.passthrough();

const EVALUATION_WORKFLOWS = new Set<WorkflowIntent>([
	"auto-pipeline",
	"single-evaluation",
]);

type JsonRecord = Record<string, JsonValue>;

export class EvaluationLaunchContextError extends Error {
	readonly code: string;

	constructor(message: string) {
		super(message);
		this.code = "invalid-evaluation-launch-context";
		this.name = "EvaluationLaunchContextError";
	}
}

function isJsonRecord(value: JsonValue | null): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStandaloneHttpUrl(value: string): boolean {
	return /^https?:\/\/\S+$/i.test(value);
}

function canonicalizeJobUrl(value: string): {
	canonicalUrl: string;
	host: string;
} {
	let parsedUrl: URL;

	try {
		parsedUrl = new URL(value);
	} catch (error) {
		throw new EvaluationLaunchContextError(
			error instanceof Error
				? error.message
				: "Evaluation launch URL is invalid.",
		);
	}

	if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
		throw new EvaluationLaunchContextError(
			"Evaluation launch URL must use http or https.",
		);
	}

	parsedUrl.hash = "";

	return {
		canonicalUrl: parsedUrl.toString(),
		host: parsedUrl.hostname.toLowerCase(),
	};
}

function classifyPromptText(
	promptText: string,
): EvaluationLaunchContextMetadata {
	const normalizedPromptText = promptText.replace(/\r\n?/g, "\n").trim();

	if (isStandaloneHttpUrl(normalizedPromptText)) {
		const normalizedUrl = canonicalizeJobUrl(normalizedPromptText);

		return {
			canonicalUrl: normalizedUrl.canonicalUrl,
			host: normalizedUrl.host,
			kind: "job-url",
			promptRedacted: true,
		};
	}

	return {
		canonicalUrl: null,
		host: null,
		kind: "raw-jd",
		promptRedacted: true,
	};
}

function readEvaluationLaunchMetadata(
	context: JsonRecord,
): EvaluationLaunchContextMetadata | null {
	const candidate = context.evaluationLaunch;

	if (candidate === undefined || candidate === null) {
		return null;
	}

	const parsedCandidate = evaluationLaunchMetadataSchema.safeParse(candidate);

	if (!parsedCandidate.success) {
		throw new EvaluationLaunchContextError(
			parsedCandidate.error.issues.map((issue) => issue.message).join("; "),
		);
	}

	return parsedCandidate.data;
}

function omitEvaluationLaunchKeys(context: JsonRecord): JsonRecord {
	const nextContext: JsonRecord = {};

	for (const [key, value] of Object.entries(context)) {
		if (key === "evaluationLaunch" || key === "promptText") {
			continue;
		}

		nextContext[key] = value;
	}

	return nextContext;
}

function sanitizeObjectContext(context: JsonRecord): JsonValue {
	const parsedContext = promptContextSchema.safeParse(context);

	if (!parsedContext.success) {
		throw new EvaluationLaunchContextError(
			parsedContext.error.issues.map((issue) => issue.message).join("; "),
		);
	}

	const existingLaunch = readEvaluationLaunchMetadata(context);
	const promptText = parsedContext.data.promptText?.trim() ?? null;
	const nextContext = omitEvaluationLaunchKeys(context);
	const evaluationLaunch =
		promptText !== null ? classifyPromptText(promptText) : existingLaunch;

	if (!evaluationLaunch) {
		return nextContext;
	}

	return {
		...nextContext,
		evaluationLaunch,
	};
}

export function isEvaluationLaunchWorkflow(
	workflow: WorkflowIntent | null,
): workflow is Extract<WorkflowIntent, "auto-pipeline" | "single-evaluation"> {
	return workflow !== null && EVALUATION_WORKFLOWS.has(workflow);
}

export function sanitizeEvaluationLaunchContext(
	context: JsonValue | null,
): JsonValue | null {
	if (context === null) {
		return null;
	}

	if (typeof context === "string") {
		return {
			evaluationLaunch: classifyPromptText(context),
		} satisfies JsonRecord;
	}

	if (isJsonRecord(context)) {
		return sanitizeObjectContext(context);
	}

	throw new EvaluationLaunchContextError(
		"Evaluation launch context must be an object, string, or null.",
	);
}

export function sanitizeContextForWorkflow(input: {
	context: JsonValue | null;
	workflow: WorkflowIntent | null;
}): JsonValue | null {
	if (!isEvaluationLaunchWorkflow(input.workflow)) {
		return input.context;
	}

	return sanitizeEvaluationLaunchContext(input.context);
}

export function readStoredEvaluationLaunchContext(
	context: JsonValue | null,
): EvaluationLaunchContextMetadata | null {
	const sanitizedContext = sanitizeEvaluationLaunchContext(context);

	if (!isJsonRecord(sanitizedContext)) {
		return null;
	}

	return readEvaluationLaunchMetadata(sanitizedContext);
}

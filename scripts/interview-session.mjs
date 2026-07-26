#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import {
	existsSync,
	lstatSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import { publishArtifactSet, resolveArtifactPath } from "./artifact-policy.mjs";
import {
	assertContainedPath,
	ensureContainedDirectory,
	safeFilename,
} from "./path-policy.mjs";
import { openTrackerTransaction, writeFileAtomic } from "./tracker-utils.mjs";

export const INTERVIEW_SESSION_SCHEMA_VERSION = 1;

const evidenceSchema = z
	.object({
		source: z.enum([
			"job_description",
			"cv",
			"profile",
			"story_bank",
			"interview_transcript",
			"candidate_note",
			"first_party_company",
			"reliable_third_party",
			"inferred",
		]),
		reference: z.string().min(1).max(500),
		excerpt: z.string().min(1).max(1200).nullable().default(null),
		url: z.string().url().nullable().default(null),
	})
	.strict();

const panelistSchema = z
	.object({
		name: z.string().min(1).max(160).nullable().default(null),
		role: z.string().min(1).max(200),
		audienceTag: z.enum([
			"recruiter",
			"hiring_manager",
			"practitioner",
			"skip_level",
			"cross_functional",
			"unknown",
		]),
		decisionWeight: z.enum(["primary", "shared", "advisory", "unknown"]),
		careerSignal: z.string().min(1).max(600).nullable().default(null),
		closingQuestion: z.string().min(1).max(600),
		evidence: z.array(evidenceSchema).min(1).max(10),
	})
	.strict();

const redFlagSchema = z
	.object({
		dimension: z.enum([
			"process",
			"culture",
			"management",
			"scope",
			"compensation",
		]),
		status: z.enum(["clear", "watch", "reconsider", "unknown"]),
		severity: z.enum(["none", "low", "medium", "high", "unknown"]),
		signal: z.string().min(1).max(600),
		evidence: z.array(evidenceSchema).max(10),
		candidateReview: z.enum(["pending", "confirmed", "disputed"]),
	})
	.strict()
	.superRefine((flag, ctx) => {
		if (flag.status === "clear" && flag.severity !== "none") {
			ctx.addIssue({
				code: "custom",
				path: ["severity"],
				message: "clear signals require severity none",
			});
		}
		if (
			flag.status === "unknown" &&
			(flag.severity !== "unknown" || flag.evidence.length > 0)
		) {
			ctx.addIssue({
				code: "custom",
				path: ["evidence"],
				message:
					"unknown signals require unknown severity and no claimed evidence",
			});
		}
		if (
			["watch", "reconsider"].includes(flag.status) &&
			(!["low", "medium", "high"].includes(flag.severity) ||
				flag.evidence.length === 0)
		) {
			ctx.addIssue({
				code: "custom",
				path: ["evidence"],
				message: "watch/reconsider signals require severity and evidence",
			});
		}
	});

const storySchema = z
	.object({
		title: z.string().min(1).max(180),
		situation: z.string().min(1).max(2000),
		task: z.string().min(1).max(2000),
		action: z.string().min(1).max(4000),
		result: z.string().min(1).max(2000),
		reflection: z.string().min(1).max(2000),
		evidence: z.array(evidenceSchema).min(1).max(10),
	})
	.strict();

const baseSchema = z.object({
	schemaVersion: z.literal(INTERVIEW_SESSION_SCHEMA_VERSION),
	sessionId: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,80}$/),
	company: z.string().min(1).max(200),
	role: z.string().min(1).max(300),
	trackerNum: z.number().int().positive().nullable().default(null),
	round: z
		.object({
			type: z.enum([
				"recruiter_screen",
				"hiring_manager",
				"technical",
				"case_or_design",
				"behavioral",
				"panel",
				"final",
				"unknown",
			]),
			scheduledAt: z
				.string()
				.datetime({ offset: true })
				.nullable()
				.default(null),
		})
		.strict(),
	panel: z.array(panelistSchema).max(20).default([]),
	redFlags: z.array(redFlagSchema).max(50).default([]),
	storyCandidates: z.array(storySchema).max(20).default([]),
	humanReviewRequired: z.literal(true),
});

const planSchema = baseSchema
	.extend({
		kind: z.literal("plan"),
		strengths: z.array(z.string().min(1).max(600)).max(20),
		gaps: z
			.array(
				z
					.object({
						topic: z.string().min(1).max(200),
						priority: z.enum(["critical", "high", "medium", "low"]),
						evidence: evidenceSchema,
					})
					.strict(),
			)
			.max(30),
		blocks: z
			.array(
				z
					.object({
						title: z.string().min(1).max(200),
						minutes: z.number().int().positive().max(1440),
						goal: z.string().min(1).max(1000),
					})
					.strict(),
			)
			.min(1)
			.max(30),
		quickReview: z.array(z.string().min(1).max(600)).min(1).max(20),
	})
	.strict();

const practiceSchema = baseSchema
	.extend({
		kind: z.literal("practice"),
		exchanges: z
			.array(
				z
					.object({
						question: z.string().min(1).max(1500),
						answer: z.string().min(1).max(12000),
						competency: z.string().min(1).max(160),
						status: z.enum(["strong", "solid", "gap"]),
						landed: z.array(z.string().min(1).max(800)).max(10),
						sharpen: z.array(z.string().min(1).max(800)).max(10),
						claimReview: z.enum([
							"verified",
							"candidate_confirmed",
							"needs_evidence",
							"no_claims",
						]),
					})
					.strict(),
			)
			.min(1)
			.max(100),
	})
	.strict();

const debriefSchema = baseSchema
	.extend({
		kind: z.literal("debrief"),
		transcriptPath: z.string().min(1).max(500),
		transcriptEvidence: z.array(evidenceSchema).min(1).max(100),
		wentWell: z.array(z.string().min(1).max(1000)).max(30),
		gaps: z.array(z.string().min(1).max(1000)).max(30),
		followUps: z.array(z.string().min(1).max(1000)).max(30),
	})
	.strict();

export const InterviewSessionSchema = z.discriminatedUnion("kind", [
	planSchema,
	practiceSchema,
	debriefSchema,
]);

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function escapeCell(value) {
	return String(value).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function renderEvidence(evidence) {
	const excerpt = evidence.excerpt ? ` — “${evidence.excerpt}”` : "";
	const link = evidence.url ? ` ([source](${evidence.url}))` : "";
	return `${evidence.source}: ${evidence.reference}${excerpt}${link}`;
}

function renderPanel(panel) {
	if (panel.length === 0) return [];
	return [
		"## Panel Intel",
		"",
		"| Panelist | Role | Audience | Weight | Career signal | Closing question |",
		"| --- | --- | --- | --- | --- | --- |",
		...panel.map(
			(item) =>
				`| ${escapeCell(item.name || "Name not supplied")} | ${escapeCell(item.role)} | ${item.audienceTag} | ${item.decisionWeight} | ${escapeCell(item.careerSignal || "unknown")} | ${escapeCell(item.closingQuestion)} |`,
		),
		"",
		...panel.flatMap((item) => [
			`- **${item.name || item.role} evidence:**`,
			...item.evidence.map((evidence) => `  - ${renderEvidence(evidence)}`),
		]),
		"",
	];
}

function renderRedFlags(redFlags) {
	if (redFlags.length === 0) return [];
	return [
		"## Interview Risk Review",
		"",
		"| Dimension | Status | Severity | Signal | Candidate review |",
		"| --- | --- | --- | --- | --- |",
		...redFlags.map(
			(item) =>
				`| ${item.dimension} | ${item.status} | ${item.severity} | ${escapeCell(item.signal)} | ${item.candidateReview} |`,
		),
		"",
		...redFlags.flatMap((item) =>
			item.evidence.map(
				(evidence) => `- **${item.dimension}:** ${renderEvidence(evidence)}`,
			),
		),
		"",
	];
}

export function renderInterviewSession(session, metadata = {}) {
	const lines = [
		`# Interview ${session.kind}: ${session.company} — ${session.role}`,
		"",
		`- Session: \`${session.sessionId}\``,
		`- Round: ${session.round.type}`,
		`- Scheduled: ${session.round.scheduledAt || "not supplied"}`,
		`- Tracker: ${session.trackerNum ? `#${session.trackerNum}` : "not linked"}`,
		"- Human review required: yes",
		"",
		...renderPanel(session.panel),
	];
	if (session.kind === "plan") {
		lines.push(
			"## Strengths to Anchor",
			"",
			...session.strengths.map((item) => `- ${item}`),
			"",
			"## Priority Gaps",
			"",
			...session.gaps.map(
				(item) =>
					`- **${item.priority}: ${item.topic}** — ${renderEvidence(item.evidence)}`,
			),
			"",
			"## Time-Blocked Plan",
			"",
			...session.blocks.map(
				(item, index) =>
					`${index + 1}. **${item.title} (${item.minutes} min)** — ${item.goal}`,
			),
			"",
			"## 15-Minute Review",
			"",
			...session.quickReview.map((item) => `- ${item}`),
			"",
		);
	} else if (session.kind === "practice") {
		lines.push("## Practice Exchanges", "");
		for (const [index, item] of session.exchanges.entries()) {
			lines.push(
				`### ${index + 1}. ${item.question}`,
				"",
				`**Candidate answer:** ${item.answer}`,
				"",
				`**Competency:** ${item.competency}`,
				`**Status:** ${item.status}`,
				`**Claim review:** ${item.claimReview}`,
				"",
				"**What landed:**",
				...item.landed.map((value) => `- ${value}`),
				"",
				"**What to sharpen:**",
				...item.sharpen.map((value) => `- ${value}`),
				"",
			);
		}
	} else {
		lines.push(
			"## Transcript Evidence",
			"",
			`- Transcript: \`${session.transcriptPath}\``,
			`- SHA-256: \`${metadata.transcriptSha256}\``,
			...session.transcriptEvidence.map(
				(evidence) => `- ${renderEvidence(evidence)}`,
			),
			"",
			"## What Went Well",
			"",
			...session.wentWell.map((item) => `- ${item}`),
			"",
			"## Gaps",
			"",
			...session.gaps.map((item) => `- ${item}`),
			"",
			"## Follow-Ups",
			"",
			...session.followUps.map((item) => `- ${item}`),
			"",
		);
	}
	lines.push(...renderRedFlags(session.redFlags));
	if (session.storyCandidates.length > 0) {
		lines.push(
			"## Story Candidates (not added automatically)",
			"",
			...session.storyCandidates.map(
				(story) =>
					`- **${story.title}** — result: ${story.result}; reflection: ${story.reflection}`,
			),
			"",
		);
	}
	return `${lines.join("\n").trimEnd()}\n`;
}

function validateTranscript(root, session) {
	if (session.kind !== "debrief") return {};
	const interviewRoot = resolve(root, "interview-prep");
	const transcriptPath = assertContainedPath(
		interviewRoot,
		resolve(root, session.transcriptPath),
		{ mustExist: true, label: "Interview transcript" },
	);
	const stat = lstatSync(transcriptPath);
	if (!stat.isFile() || stat.isSymbolicLink()) {
		throw new Error("Interview transcript must be a regular non-symlink file");
	}
	const content = readFileSync(transcriptPath, "utf8");
	for (const evidence of session.transcriptEvidence) {
		if (
			evidence.source !== "interview_transcript" ||
			!evidence.excerpt ||
			!content.includes(evidence.excerpt)
		) {
			throw new Error(
				"Every debrief transcript evidence excerpt must occur exactly in the transcript",
			);
		}
	}
	return {
		transcriptPath: relative(root, transcriptPath).replaceAll("\\", "/"),
		transcriptSha256: sha256(content),
	};
}

function storySection(sessionId, story) {
	const marker = `<!-- interview-story:${sessionId}:${safeFilename(story.title, { fallback: "story" })} -->`;
	return [
		marker,
		`## ${story.title}`,
		"",
		`**Situation:** ${story.situation}`,
		"",
		`**Task:** ${story.task}`,
		"",
		`**Action:** ${story.action}`,
		"",
		`**Result:** ${story.result}`,
		"",
		`**Reflection:** ${story.reflection}`,
		"",
		"**Evidence:**",
		...story.evidence.map((item) => `- ${renderEvidence(item)}`),
		"",
	].join("\n");
}

async function appendStoryCandidates(root, session) {
	if (session.storyCandidates.length === 0) return { appended: 0 };
	const interviewRoot = ensureContainedDirectory(root, "interview-prep");
	const storyPath = assertContainedPath(
		interviewRoot,
		resolve(interviewRoot, "story-bank.md"),
		{ label: "Story bank" },
	);
	if (!existsSync(storyPath)) {
		try {
			writeFileSync(storyPath, "# Interview Story Bank\n", {
				flag: "wx",
				mode: 0o600,
			});
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
		}
	}
	const transaction = await openTrackerTransaction(storyPath);
	let error = null;
	let appended = 0;
	try {
		let content = transaction.read();
		for (const story of session.storyCandidates) {
			const section = storySection(session.sessionId, story);
			const marker = section.split("\n", 1)[0];
			if (content.includes(marker)) continue;
			content = `${content.trimEnd()}\n\n${section}`;
			appended++;
		}
		if (appended > 0) transaction.replace(content);
	} catch (caught) {
		error = caught;
	}
	const closeError = transaction.close();
	if (error) throw error;
	if (closeError) throw closeError;
	return { appended };
}

export async function createInterviewSession({
	root = process.cwd(),
	input,
	force = false,
	acceptStoryUpdates = false,
}) {
	const projectRoot = resolve(root);
	const session = InterviewSessionSchema.parse(input);
	const transcript = validateTranscript(projectRoot, session);
	const outputBase = safeFilename(session.sessionId, {
		fallback: randomUUID(),
	});
	const markdown = resolveArtifactPath({
		root: projectRoot,
		directory: "interview-prep/sessions",
		requested: `${outputBase}.md`,
		extensions: [".md"],
		label: "Interview session Markdown",
	});
	const json = resolveArtifactPath({
		root: projectRoot,
		directory: "interview-prep/sessions",
		requested: `${outputBase}.json`,
		extensions: [".json"],
		label: "Interview session JSON",
	});
	const canonical = {
		...session,
		...(session.kind === "debrief"
			? { transcriptPath: transcript.transcriptPath }
			: {}),
		artifact: {
			createdAt: new Date().toISOString(),
			transcriptSha256: transcript.transcriptSha256 || null,
			humanReviewRequired: true,
			realTimeInterviewAssistance: false,
		},
	};
	const staged = new Map();
	const mdStage = `${markdown.path}.${process.pid}.${randomUUID()}.stage`;
	const jsonStage = `${json.path}.${process.pid}.${randomUUID()}.stage`;
	try {
		writeFileAtomic(mdStage, renderInterviewSession(session, transcript));
		writeFileAtomic(jsonStage, `${JSON.stringify(canonical, null, 2)}\n`);
		staged.set(mdStage, markdown.path);
		staged.set(jsonStage, json.path);
		await publishArtifactSet(staged, { force });
	} catch (error) {
		for (const path of staged.keys()) {
			rmSync(path, { force: true });
		}
		throw error;
	}
	const storyResult = acceptStoryUpdates
		? await appendStoryCandidates(projectRoot, session)
		: { appended: 0 };
	return {
		session: relative(projectRoot, markdown.path).replaceAll("\\", "/"),
		snapshot: relative(projectRoot, json.path).replaceAll("\\", "/"),
		storyCandidates: session.storyCandidates.length,
		storiesAppended: storyResult.appended,
		humanReviewRequired: true,
		realTimeInterviewAssistance: false,
	};
}

function argument(argv, name) {
	const prefix = `${name}=`;
	return argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
	return [
		"Usage: node scripts/interview-session.mjs --input=session.json",
		"  [--accept-story-updates] [--force] [--root=.]",
		"Creates plan/practice/debrief artifacts. It never assists during a live interview.",
	].join("\n");
}

export async function runInterviewSessionCli(
	argv = process.argv.slice(2),
	options = {},
) {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(usage());
		return 0;
	}
	const inputPath = argument(argv, "--input");
	if (!inputPath) throw new Error(usage());
	const root = resolve(
		argument(argv, "--root") || options.root || process.cwd(),
	);
	const absoluteInput = assertContainedPath(root, resolve(root, inputPath), {
		mustExist: true,
		label: "Interview session input",
	});
	const result = await createInterviewSession({
		root,
		input: JSON.parse(readFileSync(absoluteInput, "utf8")),
		force: argv.includes("--force"),
		acceptStoryUpdates: argv.includes("--accept-story-updates"),
	});
	console.log(JSON.stringify(result, null, 2));
	return 0;
}

const direct =
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
	runInterviewSessionCli().catch((error) => {
		console.error(`Interview session failed: ${error.message}`);
		process.exitCode = 1;
	});
}

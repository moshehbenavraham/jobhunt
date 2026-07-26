#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import {
	atomicWriteArtifact,
	resolveArtifactPath,
} from "./artifact-policy.mjs";
import { assertContainedPath } from "./path-policy.mjs";

export const APPLICATION_ANSWERS_SCHEMA_VERSION = 1;
export const APPLICATION_ANSWERS_HEADING = "## Application Answers";

const provenanceSchema = z
	.object({
		kind: z.enum([
			"config_profile",
			"candidate_cv",
			"evaluation_report",
			"explicit_user_answer",
			"generated_draft",
			"application_form",
		]),
		reference: z.string().min(1).max(500),
	})
	.strict();

const answerSchema = z
	.object({
		fieldId: z.string().min(1).max(200),
		label: z.string().min(1).max(500),
		fieldType: z.enum([
			"free_text",
			"selection",
			"boolean",
			"number",
			"date",
			"other",
		]),
		value: z.union([z.string(), z.boolean(), z.number()]),
		provenance: z.array(provenanceSchema).min(1).max(20),
		reviewStatus: z.enum(["unreviewed", "reviewed", "edited_by_user"]),
	})
	.strict();

const fileSchema = z
	.object({
		fieldId: z.string().min(1).max(200),
		label: z.string().min(1).max(300),
		path: z.string().regex(/^output\/[^/].+/),
		manifest: z.string().regex(/^output\/[^/].+\.manifest\.json$/),
		validation: z.literal("valid-and-fresh"),
		reviewStatus: z.enum(["unreviewed", "reviewed"]),
	})
	.strict();

export const ApplicationAnswersSnapshotSchema = z
	.object({
		schemaVersion: z.literal(APPLICATION_ANSWERS_SCHEMA_VERSION),
		reportId: z.string().regex(/^\d{3,}$/),
		company: z.string().min(1).max(200),
		role: z.string().min(1).max(300),
		applicationUrl: z
			.string()
			.url()
			.refine((value) => /^https:\/\//i.test(value)),
		capturedAt: z.string().datetime(),
		state: z.enum(["prepared", "reviewed", "submitted_by_user"]),
		confirmedByUser: z.boolean(),
		answers: z.array(answerSchema).max(300),
		files: z.array(fileSchema).max(20),
		humanReviewRequired: z.literal(true),
		submissionPerformedByTool: z.literal(false),
	})
	.strict()
	.superRefine((snapshot, ctx) => {
		const ids = snapshot.answers.map((answer) => answer.fieldId);
		if (new Set(ids).size !== ids.length) {
			ctx.addIssue({
				code: "custom",
				path: ["answers"],
				message: "answer field IDs must be unique",
			});
		}
		if (snapshot.state === "submitted_by_user") {
			if (!snapshot.confirmedByUser) {
				ctx.addIssue({
					code: "custom",
					path: ["confirmedByUser"],
					message: "submitted_by_user requires explicit user confirmation",
				});
			}
			if (
				snapshot.answers.some(
					(answer) => answer.reviewStatus === "unreviewed",
				) ||
				snapshot.files.some((file) => file.reviewStatus === "unreviewed")
			) {
				ctx.addIssue({
					code: "custom",
					path: ["state"],
					message: "submitted snapshots cannot contain unreviewed values",
				});
			}
		}
	});

function markdownValue(value) {
	return String(value).replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|").trim();
}

export function formatApplicationAnswersSection(snapshotInput) {
	const snapshot = ApplicationAnswersSnapshotSchema.parse(snapshotInput);
	const lines = [
		APPLICATION_ANSWERS_HEADING,
		"",
		`**Schema:** ${snapshot.schemaVersion}`,
		`**Captured:** ${snapshot.capturedAt}`,
		`**State:** ${snapshot.state}`,
		`**Human review required:** yes`,
		`**Submitted by tool:** no`,
		"",
		"### Field values",
		"",
		"| Field | Type | Value | Provenance | Review |",
		"| --- | --- | --- | --- | --- |",
		...snapshot.answers.map((answer) => {
			const provenance = answer.provenance
				.map((source) => `${source.kind}:${source.reference}`)
				.join("; ");
			return `| ${markdownValue(answer.label)} | ${answer.fieldType} | ${markdownValue(answer.value)} | ${markdownValue(provenance)} | ${answer.reviewStatus} |`;
		}),
		"",
		"### Files selected",
		"",
		"| Field | File | Manifest | Validation | Review |",
		"| --- | --- | --- | --- | --- |",
		...snapshot.files.map(
			(file) =>
				`| ${markdownValue(file.label)} | ${markdownValue(file.path)} | ${markdownValue(file.manifest)} | ${file.validation} | ${file.reviewStatus} |`,
		),
	];
	if (snapshot.answers.length === 0) {
		lines.splice(
			lines.indexOf("### Files selected") - 1,
			0,
			"_No field values captured._",
			"",
		);
	}
	if (snapshot.files.length === 0) {
		lines.push("", "_No files selected._");
	}
	return `${lines.join("\n").trim()}\n`;
}

export function upsertApplicationAnswersSection(reportText, snapshot) {
	const report = String(reportText).replace(/\r\n/g, "\n");
	const section = formatApplicationAnswersSection(snapshot).trimEnd();
	const heading = /^## Application Answers\s*$/m.exec(report);
	if (!heading) return `${report.trimEnd()}\n\n${section}\n`;
	const remainder = report.slice(heading.index + heading[0].length);
	const next = /^##\s+/m.exec(remainder);
	const end = next
		? heading.index + heading[0].length + next.index
		: report.length;
	return `${report.slice(0, heading.index).trimEnd()}\n\n${section}\n\n${report.slice(end).trimStart()}`
		.trimEnd()
		.concat("\n");
}

function resolveReport(root, requested) {
	const reportsRoot = resolve(root, "reports");
	const path = assertContainedPath(reportsRoot, resolve(root, requested), {
		mustExist: true,
		label: "Application answers report",
	});
	const stat = lstatSync(path);
	if (!stat.isFile() || stat.isSymbolicLink() || !path.endsWith(".md")) {
		throw new Error("report must be a regular Markdown file inside reports/");
	}
	return path;
}

function usage() {
	return [
		"Usage: node scripts/application-answers.mjs",
		"  --report=reports/042-company.md --input=answers.json [--force]",
		"Writes a versioned JSON snapshot and an idempotent report section.",
	].join("\n");
}

function argument(argv, name) {
	return argv
		.find((value) => value.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

export async function runApplicationAnswersCli(
	argv = process.argv.slice(2),
	options = {},
) {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(usage());
		return 0;
	}
	const reportArg = argument(argv, "--report");
	const inputArg = argument(argv, "--input");
	if (!reportArg || !inputArg) throw new Error(usage());
	const root = resolve(options.root || process.cwd());
	const reportPath = resolveReport(root, reportArg);
	const snapshot = ApplicationAnswersSnapshotSchema.parse(
		JSON.parse(readFileSync(resolve(inputArg), "utf8")),
	);
	const filenameReportId = basename(reportPath).match(/^(\d{3,})-/)?.[1];
	if (filenameReportId && filenameReportId !== snapshot.reportId) {
		throw new Error(
			`snapshot reportId ${snapshot.reportId} does not match ${filenameReportId}`,
		);
	}
	const updated = upsertApplicationAnswersSection(
		readFileSync(reportPath, "utf8"),
		snapshot,
	);
	const snapshotName = basename(reportPath, ".md").concat(
		".application-answers.json",
	);
	const snapshotPath = resolveArtifactPath({
		root,
		directory: "reports",
		requested: snapshotName,
		extensions: [".json"],
		label: "Application answer snapshot",
	}).path;
	if (!argv.includes("--force")) {
		try {
			lstatSync(snapshotPath);
			throw new Error(`snapshot already exists: ${snapshotName}; use --force`);
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
	}
	await atomicWriteArtifact(
		snapshotPath,
		`${JSON.stringify(snapshot, null, 2)}\n`,
	);
	await atomicWriteArtifact(reportPath, updated);
	console.log(
		JSON.stringify(
			{
				report: reportArg,
				snapshot: `reports/${snapshotName}`,
				state: snapshot.state,
				humanReviewRequired: true,
				submissionPerformedByTool: false,
			},
			null,
			2,
		),
	);
	return 0;
}

const direct =
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
	try {
		process.exitCode = await runApplicationAnswersCli();
	} catch (error) {
		console.error(`Application answer snapshot failed: ${error.message}`);
		process.exitCode = 1;
	}
}

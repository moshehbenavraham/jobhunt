#!/usr/bin/env node

import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	ApplicationAnswersSnapshotSchema,
	formatApplicationAnswersSection,
	runApplicationAnswersCli,
	upsertApplicationAnswersSection,
} from "./application-answers.mjs";

const snapshot = {
	schemaVersion: 1,
	reportId: "042",
	company: "Example AI",
	role: "Staff Engineer",
	applicationUrl: "https://jobs.example.com/42/apply",
	capturedAt: "2026-07-26T12:00:00.000Z",
	state: "reviewed",
	confirmedByUser: false,
	answers: [
		{
			fieldId: "motivation",
			label: "Why this role?",
			fieldType: "free_text",
			value: "I can contribute production AI delivery.",
			provenance: [
				{ kind: "candidate_cv", reference: "profile/cv.md#summary" },
				{ kind: "evaluation_report", reference: "reports/042-example.md#B" },
			],
			reviewStatus: "edited_by_user",
		},
	],
	files: [
		{
			fieldId: "resume",
			label: "Resume",
			path: "output/cv-example.pdf",
			manifest: "output/cv-example.manifest.json",
			validation: "valid-and-fresh",
			reviewStatus: "reviewed",
		},
	],
	humanReviewRequired: true,
	submissionPerformedByTool: false,
};

assert.match(formatApplicationAnswersSection(snapshot), /candidate_cv/);
const upserted = upsertApplicationAnswersSection(
	"# Report\n\n## Application Answers\n\nold\n\n## Next\n\nkeep\n",
	snapshot,
);
assert.equal((upserted.match(/## Application Answers/g) || []).length, 1);
assert.match(upserted, /## Next\n\nkeep/);

assert.throws(
	() =>
		ApplicationAnswersSnapshotSchema.parse({
			...snapshot,
			state: "submitted_by_user",
			confirmedByUser: false,
		}),
	/explicit user confirmation/,
);

const root = mkdtempSync(join(tmpdir(), "jobhunt-answers-"));
try {
	mkdirSync(join(root, "reports"), { recursive: true });
	writeFileSync(join(root, "reports", "042-example.md"), "# Report\n");
	writeFileSync(join(root, "answers.json"), JSON.stringify(snapshot));
	const code = await runApplicationAnswersCli(
		[
			"--report=reports/042-example.md",
			`--input=${join(root, "answers.json")}`,
		],
		{ root },
	);
	assert.equal(code, 0);
	assert.match(
		readFileSync(join(root, "reports", "042-example.md"), "utf8"),
		/## Application Answers/,
	);
	const sidecar = JSON.parse(
		readFileSync(
			join(root, "reports", "042-example.application-answers.json"),
			"utf8",
		),
	);
	assert.equal(sidecar.submissionPerformedByTool, false);
} finally {
	rmSync(root, { recursive: true, force: true });
}

console.log("Application answer snapshot tests passed");

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
import { addApplicationTsv } from "./add-application.mjs";
import { suggestTitleExpansion } from "./expand-titles.mjs";
import { findApplications } from "./find-application.mjs";

const root = mkdtempSync(join(tmpdir(), "jobhunt-app-utils-"));
try {
	mkdirSync(join(root, "data"), { recursive: true });
	mkdirSync(join(root, "reports"), { recursive: true });
	mkdirSync(join(root, "templates"), { recursive: true });
	writeFileSync(
		join(root, "templates", "states.yml"),
		"states:\n  - id: evaluated\n    label: Evaluated\n    aliases: []\n",
	);
	const tracker = [
		"# Applications Tracker",
		"",
		"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
		"| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
		"| 1 | 2026-07-01 | Existing | AI Engineer | 4.0/5 | Evaluated | No | [001](reports/001-existing.md) | |",
	].join("\n");
	writeFileSync(join(root, "data", "applications.md"), tracker);
	writeFileSync(join(root, "reports", "002-acme.md"), "# Report\n");
	writeFileSync(join(root, "reports", "003-acme.md"), "# Report\n");
	const added = await addApplicationTsv({
		root,
		num: 2,
		date: "2026-07-26",
		company: "Acme",
		role: "Solutions Architect",
		score: "4.3/5",
		report: "reports/002-acme.md",
	});
	assert.equal(added.trackerMutated, false);
	assert.match(
		readFileSync(join(root, added.created), "utf8"),
		/\tEvaluated\t4.3\/5\t/,
	);
	await assert.rejects(
		addApplicationTsv({
			root,
			num: 3,
			date: "2026-07-26",
			company: "Acme",
			role: "Senior Solutions Architect",
			score: "4.2/5",
			report: "reports/003-acme.md",
		}),
		/pending TSV/,
	);
	const parsedRows = [
		{
			num: 1,
			company: "Existing",
			role: "AI Engineer",
			report: "[001](reports/001-existing.md)",
		},
	];
	assert.equal(findApplications(parsedRows, "AI Engineer").length, 1);
	assert.equal(findApplications(parsedRows, "1").length, 1);

	const expansion = suggestTitleExpansion(
		{
			target_roles: {
				primary: ["Forward Deployed Engineer"],
				archetypes: [],
			},
		},
		{
			title_filter: {
				positive: ["Forward Deployed"],
				negative: ["Customer Engineer"],
			},
		},
	);
	assert.ok(
		expansion.suggestions.some((item) => item.title === "Deployment Engineer"),
	);
	assert.equal(
		expansion.suggestions.some((item) => item.title === "Customer Engineer"),
		false,
	);
} finally {
	rmSync(root, { recursive: true, force: true });
}

console.log("Application add/find/title utility tests passed");

#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	AssessmentRecordSchema,
	appendAssessmentRecord,
	parseAssessmentLog,
	readAssessments,
} from "./assessment-log.mjs";

const root = mkdtempSync(join(tmpdir(), "jobhunt-assessment-log-"));
try {
	mkdirSync(join(root, "data"), { recursive: true });
	writeFileSync(
		join(root, "data", "applications.md"),
		[
			"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
			"| 42 | 2026-07-01 | Acme | Engineer | 4.1/5 | Interview | No | [042](reports/042-acme.md) | |",
		].join("\n"),
	);
	const record = {
		schemaVersion: 1,
		evaluatedAt: "2026-01-15",
		appNum: 42,
		company: "Acme",
		platform: "HackerRank",
		skill: "TypeScript",
		outcome: "passed",
		source: "candidate score report",
		staleAfter: "2026-07-15",
		note: "Assessment version 3.",
	};
	await appendAssessmentRecord({ root, record });
	const result = readAssessments({ root, today: "2026-07-26" });
	assert.equal(result.records[0].stale, true);
	assert.equal(result.aggregates.bySkill.TypeScript.passed, 1);
	assert.match(result.dataQuality.stalenessPolicy, /explicit/);
	await assert.rejects(
		appendAssessmentRecord({ root, record }),
		/already exists/,
	);
	assert.throws(
		() =>
			AssessmentRecordSchema.parse({
				...record,
				staleAfter: "2025-01-01",
			}),
		/cannot be before/,
	);
	const malformed = parseAssessmentLog(
		"schema_version\tevaluated_at\tapp_num\tcompany\tplatform\tskill\toutcome\tsource\tstale_after\tnote\nbad\trow\n",
	);
	assert.equal(malformed.records.length, 0);
	assert.equal(malformed.malformed.length, 1);
} finally {
	rmSync(root, { recursive: true, force: true });
}

console.log("Append-only assessment outcome and staleness tests passed");

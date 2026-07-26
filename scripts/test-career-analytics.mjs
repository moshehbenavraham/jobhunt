#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as yaml from "js-yaml";
import {
	analyzeCareer,
	computeFunnel,
	detectAtsChannel,
	parseStatusEvents,
} from "./career-analytics.mjs";
import { RISK_LABELS } from "./evaluation-summary.mjs";
import { loadCanonicalStates } from "./tracker-utils.mjs";

const root = mkdtempSync(join(tmpdir(), "jobhunt-career-analytics-"));
try {
	for (const directory of ["data", "reports", "templates"]) {
		mkdirSync(join(root, directory), { recursive: true });
	}
	writeFileSync(
		join(root, "templates", "states.yml"),
		[
			"states:",
			"  - id: applied",
			"    label: Applied",
			"    aliases: []",
			"  - id: responded",
			"    label: Responded",
			"    aliases: []",
			"  - id: interview",
			"    label: Interview",
			"    aliases: []",
			"  - id: offer",
			"    label: Offer",
			"    aliases: []",
			"  - id: hired",
			"    label: Hired",
			"    aliases: []",
			"  - id: rejected",
			"    label: Rejected",
			"    aliases: []",
			"  - id: discarded",
			"    label: Discarded",
			"    aliases: []",
			"  - id: evaluated",
			"    label: Evaluated",
			"    aliases: []",
		].join("\n"),
	);
	writeFileSync(
		join(root, "templates", "benchmarks.yml"),
		yaml.dump({
			benchmarks: {
				response_rate: {
					range_pct: [10, 40],
					typical_pct: 25,
					source: "test",
					year: 2026,
					caveat: "directional",
				},
				application_to_interview: {
					range_pct: [5, 25],
					typical_pct: 12,
					source: "test",
					year: 2026,
					caveat: "directional",
				},
				interview_to_offer: {
					range_pct: [10, 40],
					typical_pct: 25,
					source: "test",
					year: 2026,
					caveat: "directional",
				},
			},
		}),
	);
	const riskSummary = Object.fromEntries(
		Object.keys(RISK_LABELS).map((key) => [
			key,
			{
				status: key === "legitimacy" ? "clear" : "not_evaluated",
				severity: key === "legitimacy" ? "none" : "unknown",
				source: key === "legitimacy" ? "live_posting" : "not_available",
				evidence: key === "legitimacy" ? "Live posting." : null,
			},
		]),
	);
	const summary = {
		schema_version: 1,
		report_id: "001",
		date: "2026-07-01",
		url: "https://boards.greenhouse.io/acme/jobs/1",
		company: "Acme",
		role: "Engineer",
		score: 4.2,
		dimension_scores: {
			cv_match: 4,
			north_star_alignment: 4,
			compensation: 4,
			culture_working_model: 4,
			red_flag_adjustment: 0,
		},
		legitimacy_tier: "High Confidence",
		archetype: "Builder",
		final_decision: "apply",
		risk_level: "low",
		confidence: "high",
		next_action: "Apply.",
		hard_stops: [],
		soft_gaps: [],
		top_strengths: ["Relevant experience"],
		discard_reasons: [],
		via: "Hays",
		company_confidential: false,
		advertised_comp: null,
		output_language: "en",
		market_ruleset: "us",
		company_evidence: {
			tier: "first_party",
			conflicts: false,
			sources: [
				{
					kind: "employer_site",
					label: "careers",
					url: "https://boards.greenhouse.io/acme/jobs/1",
				},
			],
		},
		compensation_evidence: {
			tier: "unknown",
			conflicts: false,
			sources: [],
		},
		risk_summary: riskSummary,
	};
	writeFileSync(
		join(root, "reports", "001-acme.md"),
		`## Machine Summary\n\n\`\`\`yaml\n${yaml.dump(summary)}\`\`\`\n`,
	);
	writeFileSync(
		join(root, "data", "applications.md"),
		[
			"| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes |",
			"| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
			"| 1 | 2026-07-01 | Acme | Hays | Engineer | 4.2/5 | Offer | No | [001](reports/001-acme.md) | |",
			"| 2 | 2026-07-02 | Beta | — | Engineer | 4.0/5 | Rejected | No | — | |",
			"| 3 | 2026-07-03 | Gamma | | Engineer | 3.8/5 | Applied | No | — | |",
		].join("\n"),
	);
	const header =
		"event_id\ttimestamp\tapp_num\treport_num\tcompany\trole\tfrom_status\tto_status\tsource\tnote";
	const event = (id, timestamp, appNum, from, to) =>
		`${id}\t${timestamp}\t${appNum}\t\tAcme\tEngineer\t${from}\t${to}\tcli\t`;
	writeFileSync(
		join(root, "data", "status-log.tsv"),
		[
			header,
			event("e1", "2026-07-01T10:00:00.000Z", 1, "Evaluated", "Applied"),
			event("e2", "2026-07-04T10:00:00.000Z", 1, "Applied", "Responded"),
			event("e3", "2026-07-08T10:00:00.000Z", 1, "Responded", "Interview"),
			event("e4", "2026-07-12T10:00:00.000Z", 1, "Interview", "Offer"),
			"broken",
		].join("\n"),
	);
	const result = analyzeCareer({ root });
	assert.deepEqual(result.funnel.counts, {
		applied: 3,
		responded: 1,
		interviewed: 1,
		offered: 1,
		hired: 0,
	});
	assert.equal(result.funnel.rates.response.sufficientSample, false);
	assert.equal(result.velocity.appliedToResponded.n, 1);
	assert.equal(result.velocity.appliedToResponded.medianDays, null);
	assert.equal(
		result.channels.vendor.find((item) => item.channel === "greenhouse")
			?.submitted,
		1,
	);
	assert.equal(
		result.channels.via.some((item) => item.channel === "direct"),
		true,
	);
	assert.equal(result.dataQuality.malformedStatusEvents.length, 1);
	assert.match(result.channels.honesty, /not causal/);
	assert.equal(
		detectAtsChannel("https://jobs.ashbyhq.com/example/123"),
		"ashby",
	);

	const states = loadCanonicalStates(join(root, "templates", "states.yml"));
	const missingHeader = parseStatusEvents("bad\trow", states);
	assert.equal(missingHeader.malformed.length, 1);
	const syntheticFunnel = computeFunnel(
		Array.from({ length: 20 }, (_, index) => ({
			reached: new Set(index < 10 ? ["Applied", "Responded"] : ["Applied"]),
		})),
		{},
	);
	assert.equal(syntheticFunnel.rates.response.sufficientSample, true);
} finally {
	rmSync(root, { recursive: true, force: true });
}

console.log(
	"Header-aware funnel, velocity, ATS, and intermediary tests passed",
);

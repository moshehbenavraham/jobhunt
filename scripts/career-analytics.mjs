#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { parseEvaluationSummary } from "./evaluation-summary.mjs";
import {
	extractTrackerLocalReportPaths,
	normalizeVia,
	parseTracker,
} from "./tracker-parse.mjs";
import {
	loadCanonicalStates,
	resolveCanonicalState,
	resolveTrackerPath,
} from "./tracker-utils.mjs";

export const CAREER_ANALYTICS_SCHEMA_VERSION = 1;
const CLAIM_MIN_N = 20;
const VELOCITY_MIN_N = 3;
const CHANNEL_MIN_N = 5;
const FORWARD_STAGES = ["Applied", "Responded", "Interview", "Offer", "Hired"];
const HOPS = [
	["appliedToResponded", "Applied", "Responded"],
	["respondedToInterview", "Responded", "Interview"],
	["interviewToOffer", "Interview", "Offer"],
	["appliedToRejected", "Applied", "Rejected"],
];

function round1(value) {
	return Math.round(value * 10) / 10;
}

function percentage(part, total) {
	return total > 0 ? round1((part / total) * 100) : null;
}

function canonicalStatus(value, states) {
	return resolveCanonicalState(value, states) || "Unknown";
}

export function parseStatusEvents(content, states) {
	const events = [];
	const malformed = [];
	const lines = String(content).replace(/\r/g, "").split("\n");
	const header = lines.find((line) => line.startsWith("event_id\t"));
	if (!header && lines.some((line) => line.trim())) {
		return {
			events,
			malformed: [{ line: 1, reason: "missing current status-log header" }],
		};
	}
	const columns = header?.split("\t") || [];
	const index = Object.fromEntries(columns.map((name, i) => [name, i]));
	for (const [lineIndex, line] of lines.entries()) {
		if (!line.trim() || line === header) continue;
		const cells = line.split("\t");
		try {
			const appNum = Number(cells[index.app_num]);
			const timestamp = cells[index.timestamp];
			const date = timestamp?.slice(0, 10);
			const from = canonicalStatus(cells[index.from_status], states);
			const to = canonicalStatus(cells[index.to_status], states);
			if (!Number.isInteger(appNum) || appNum <= 0) {
				throw new Error("invalid app_num");
			}
			if (
				!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
				Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())
			) {
				throw new Error("invalid timestamp");
			}
			if (to === "Unknown") throw new Error("unknown to_status");
			events.push({
				eventId: cells[index.event_id],
				timestamp,
				date,
				appNum,
				from,
				to,
				source: cells[index.source] || "unknown",
			});
		} catch (error) {
			malformed.push({ line: lineIndex + 1, reason: error.message });
		}
	}
	events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
	return { events, malformed };
}

function inferredStages(status) {
	const stages = new Set();
	const index = FORWARD_STAGES.indexOf(status);
	if (index >= 0) {
		for (let i = 0; i <= index; i++) stages.add(FORWARD_STAGES[i]);
	} else if (status === "Rejected" || status === "Discarded") {
		stages.add("Applied");
	}
	return stages;
}

function timelinesFor(rows, events, states) {
	const byApp = new Map(rows.map((row) => [row.num, []]));
	for (const event of events) {
		if (!byApp.has(event.appNum)) byApp.set(event.appNum, []);
		byApp.get(event.appNum).push(event);
	}
	return rows.map((row) => {
		const status = canonicalStatus(row.status, states);
		const eventsForRow = byApp.get(row.num) || [];
		const reached = inferredStages(status);
		for (const event of eventsForRow) reached.add(event.to);
		return { row, status, events: eventsForRow, reached };
	});
}

function rateMetric(numerator, denominator, benchmark = null) {
	const ownPct = percentage(numerator, denominator);
	let band = null;
	if (ownPct !== null && Array.isArray(benchmark?.range_pct)) {
		const [low, high] = benchmark.range_pct;
		band =
			ownPct < low
				? "below_directional_range"
				: ownPct > high
					? "above_directional_range"
					: "within_directional_range";
	}
	return {
		numerator,
		denominator,
		ratePct: ownPct,
		sufficientSample: denominator >= CLAIM_MIN_N,
		claimMinN: CLAIM_MIN_N,
		benchmark: benchmark
			? {
					rangePct: benchmark.range_pct || null,
					typicalPct: benchmark.typical_pct ?? null,
					source: benchmark.source || null,
					year: benchmark.year ?? null,
					caveat: benchmark.caveat || null,
					directional: true,
					band,
				}
			: null,
	};
}

export function computeFunnel(timelines, benchmarks = {}) {
	const counts = {
		applied: timelines.filter((item) => item.reached.has("Applied")).length,
		responded: timelines.filter((item) => item.reached.has("Responded")).length,
		interviewed: timelines.filter((item) => item.reached.has("Interview"))
			.length,
		offered: timelines.filter((item) => item.reached.has("Offer")).length,
		hired: timelines.filter((item) => item.reached.has("Hired")).length,
	};
	return {
		counts,
		rates: {
			response: rateMetric(
				counts.responded,
				counts.applied,
				benchmarks.response_rate,
			),
			applicationToInterview: rateMetric(
				counts.interviewed,
				counts.applied,
				benchmarks.application_to_interview,
			),
			interviewToOffer: rateMetric(
				counts.offered,
				counts.interviewed,
				benchmarks.interview_to_offer,
			),
		},
		honesty:
			counts.applied < CLAIM_MIN_N
				? "Small sample: counts and rates are descriptive only; do not make comparative claims."
				: "Benchmark comparisons remain directional and selection-biased.",
	};
}

function daysBetween(first, second) {
	return Math.round(
		(new Date(`${second}T00:00:00Z`) - new Date(`${first}T00:00:00Z`)) /
			86_400_000,
	);
}

function percentile(values, percentileValue) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	if (sorted.length === 1) return sorted[0];
	const rank = percentileValue * (sorted.length - 1);
	const low = Math.floor(rank);
	const high = Math.ceil(rank);
	return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

export function computeVelocity(timelines) {
	const result = {};
	for (const [key, from, to] of HOPS) {
		const values = [];
		let censored = 0;
		let sameDay = 0;
		for (const timeline of timelines) {
			const fromEvent = timeline.events.find((event) => event.to === from);
			if (!fromEvent) continue;
			const toEvent = timeline.events.find(
				(event) => event.to === to && event.timestamp >= fromEvent.timestamp,
			);
			if (!toEvent) {
				if (to !== "Rejected" && timeline.status === from) censored++;
				continue;
			}
			const days = daysBetween(fromEvent.date, toEvent.date);
			if (days < 0) continue;
			if (days === 0) sameDay++;
			values.push(days);
		}
		result[key] = {
			from,
			to,
			n: values.length,
			medianDays:
				values.length >= VELOCITY_MIN_N ? percentile(values, 0.5) : null,
			p75Days:
				values.length >= VELOCITY_MIN_N ? percentile(values, 0.75) : null,
			sufficientSample: values.length >= VELOCITY_MIN_N,
			minimumN: VELOCITY_MIN_N,
			censored,
			sameDay,
			honesty:
				"Percentiles use completed observed transitions only; censored in-flight rows are reported separately.",
		};
	}
	return result;
}

const VENDORS = [
	["greenhouse", /(^|\.)greenhouse\.io$/],
	["lever", /(^|\.)lever\.co$/],
	["ashby", /(^|\.)ashbyhq\.com$/],
	["workday", /(^|\.)myworkday(?:jobs|site)\.com$/],
	["smartrecruiters", /(^|\.)smartrecruiters\.com$/],
	["teamtailor", /(^|\.)teamtailor\.com$/],
	["workable", /(^|\.)workable\.com$/],
	["breezy", /(^|\.)breezy\.hr$/],
	["recruitee", /(^|\.)recruitee\.com$/],
	["icims", /(^|\.)icims\.com$/],
	["jobvite", /(^|\.)jobvite\.com$/],
	["bamboohr", /(^|\.)bamboohr\.com$/],
];

export function detectAtsChannel(rawUrl) {
	try {
		const url = new URL(rawUrl);
		const hostname = url.hostname.toLowerCase();
		return VENDORS.find(([, pattern]) => pattern.test(hostname))?.[0] || null;
	} catch {
		return null;
	}
}

function reportSummaryForRow(root, row) {
	for (const reportPath of extractTrackerLocalReportPaths(row.report)) {
		const path = resolve(root, reportPath);
		try {
			const stat = lstatSync(path);
			if (!stat.isFile() || stat.isSymbolicLink()) continue;
			return parseEvaluationSummary(readFileSync(path, "utf8"));
		} catch {}
	}
	return null;
}

function aggregateChannel(items, keyName, minSample = CHANNEL_MIN_N) {
	const groups = new Map();
	for (const item of items) {
		const raw = item[keyName];
		const key =
			keyName === "via" && raw && !["direct", "unknown"].includes(raw)
				? normalizeVia(raw) || raw.normalize("NFKC").toLowerCase()
				: raw;
		if (!groups.has(key)) {
			groups.set(key, {
				channel: raw,
				submitted: 0,
				advanced: 0,
			});
		}
		const group = groups.get(key);
		group.submitted++;
		if (item.advanced) group.advanced++;
	}
	return [...groups.values()]
		.map((group) => ({
			...group,
			advanceRatePct: percentage(group.advanced, group.submitted),
			sufficientSample: group.submitted >= minSample,
			minimumN: minSample,
		}))
		.sort((a, b) => b.submitted - a.submitted);
}

export function computeChannelYield(root, timelines) {
	const submitted = timelines
		.filter((item) => item.reached.has("Applied"))
		.map((item) => {
			const summary = reportSummaryForRow(root, item.row);
			const rawVia = String(item.row.via ?? "").trim();
			return {
				appNum: item.row.num,
				advanced: item.reached.has("Responded"),
				vendor: detectAtsChannel(summary?.url) || "unknown",
				via:
					rawVia === ""
						? "unknown"
						: ["-", "—", "direct"].includes(rawVia.toLowerCase())
							? "direct"
							: rawVia,
			};
		});
	return {
		submitted: submitted.length,
		advanced: submitted.filter((item) => item.advanced).length,
		vendor: aggregateChannel(submitted, "vendor"),
		via: aggregateChannel(submitted, "via"),
		honesty:
			"Channel yield is observational, not causal. ATS, agency, role mix, timing, and candidate fit are confounded; insufficient samples are never promoted to recommendations.",
	};
}

function validateBenchmarkMetric(name, metric) {
	if (!metric || typeof metric !== "object") return;
	if (
		!Array.isArray(metric.range_pct) ||
		metric.range_pct.length !== 2 ||
		metric.range_pct.some(
			(value) => !Number.isFinite(value) || value < 0 || value > 100,
		) ||
		metric.range_pct[0] > metric.range_pct[1]
	) {
		throw new Error(`Benchmark ${name} needs an ascending range_pct`);
	}
	if (!metric.source || !metric.caveat) {
		throw new Error(`Benchmark ${name} needs source and caveat`);
	}
}

export function loadBenchmarks(root, explicitPath) {
	const path = explicitPath
		? resolve(root, explicitPath)
		: existsSync(resolve(root, "config/benchmarks.yml"))
			? resolve(root, "config/benchmarks.yml")
			: resolve(root, "templates/benchmarks.yml");
	const stat = lstatSync(path);
	if (!stat.isFile() || stat.isSymbolicLink()) {
		throw new Error("Benchmark config must be a regular non-symlink file");
	}
	const document = yaml.load(readFileSync(path, "utf8"));
	if (!document || typeof document.benchmarks !== "object") {
		throw new Error("Benchmark config needs a benchmarks map");
	}
	for (const [name, metric] of Object.entries(document.benchmarks)) {
		validateBenchmarkMetric(name, metric);
	}
	return {
		benchmarks: document.benchmarks,
		path: relative(root, path).replaceAll("\\", "/"),
	};
}

export function analyzeCareer({ root = process.cwd(), benchmarkPath } = {}) {
	const projectRoot = resolve(root);
	const trackerPath = resolveTrackerPath(projectRoot);
	const states = loadCanonicalStates(
		resolve(projectRoot, "templates/states.yml"),
	);
	const tracker = parseTracker(readFileSync(trackerPath, "utf8"));
	const statusPath = resolve(projectRoot, "data/status-log.tsv");
	const parsedEvents = parseStatusEvents(
		existsSync(statusPath) ? readFileSync(statusPath, "utf8") : "",
		states,
	);
	const timelines = timelinesFor(tracker.rows, parsedEvents.events, states);
	const benchmark = loadBenchmarks(projectRoot, benchmarkPath);
	return {
		schemaVersion: CAREER_ANALYTICS_SCHEMA_VERSION,
		generatedAt: new Date().toISOString(),
		funnel: computeFunnel(timelines, benchmark.benchmarks),
		velocity: computeVelocity(timelines),
		channels: computeChannelYield(projectRoot, timelines),
		dataQuality: {
			trackerRows: tracker.rows.length,
			statusEvents: parsedEvents.events.length,
			malformedStatusEvents: parsedEvents.malformed,
			benchmarkPath: benchmark.path,
			lowerBoundRule:
				"Final Rejected/Discarded status proves Applied only; intermediate stages require an observed status event.",
		},
	};
}

function argument(argv, name) {
	return argv
		.find((value) => value.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

function usage() {
	return [
		"Usage: node scripts/career-analytics.mjs [--summary]",
		"  [--benchmarks=config/benchmarks.yml] [--root=.]",
	].join("\n");
}

export function runCareerAnalyticsCli(
	argv = process.argv.slice(2),
	options = {},
) {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(usage());
		return 0;
	}
	const root = resolve(
		argument(argv, "--root") || options.root || process.cwd(),
	);
	const result = analyzeCareer({
		root,
		benchmarkPath: argument(argv, "--benchmarks"),
	});
	if (!argv.includes("--summary")) {
		console.log(JSON.stringify(result, null, 2));
		return 0;
	}
	console.log(
		`Funnel: ${result.funnel.counts.applied} applied → ${result.funnel.counts.responded} responded → ${result.funnel.counts.interviewed} interviewed → ${result.funnel.counts.offered} offered`,
	);
	console.log(result.funnel.honesty);
	for (const [name, hop] of Object.entries(result.velocity)) {
		console.log(
			`${name}: n=${hop.n}, median=${hop.medianDays ?? "insufficient"}, p75=${hop.p75Days ?? "insufficient"}, censored=${hop.censored}`,
		);
	}
	for (const channel of result.channels.vendor) {
		console.log(
			`ATS ${channel.channel}: ${channel.advanced}/${channel.submitted} advanced${channel.sufficientSample ? "" : " (small sample)"}`,
		);
	}
	console.log(result.channels.honesty);
	return 0;
}

const direct =
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
	try {
		process.exitCode = runCareerAnalyticsCli();
	} catch (error) {
		console.error(`Career analytics failed: ${error.message}`);
		process.exitCode = 1;
	}
}

#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import { parseTracker } from "./tracker-parse.mjs";
import {
	openTrackerTransaction,
	resolveTrackerPath,
} from "./tracker-utils.mjs";

export const SALARY_OBSERVATION_SCHEMA_VERSION = 1;
const HEADER =
	"schema_version\tdate\tapp_num\tcompany\ttype\tamount_min\tamount_max\tcurrency\tperiod\tsource\tsource_ref\tnote\tround\tinterviewer\n";

export const SalaryObservationSchema = z
	.object({
		schemaVersion: z.literal(SALARY_OBSERVATION_SCHEMA_VERSION),
		date: z.iso.date(),
		appNum: z.number().int().positive(),
		company: z.string().min(1).max(200),
		type: z.enum(["desired", "advertised", "actual", "stated"]),
		amountMin: z.number().nonnegative().finite(),
		amountMax: z.number().nonnegative().finite().nullable().default(null),
		currency: z.string().regex(/^[A-Z]{3}$/),
		period: z.enum(["annual", "monthly", "hourly", "daily", "total"]),
		source: z.enum([
			"candidate",
			"profile",
			"job_description",
			"recruiter_written",
			"recruiter_verbal",
			"offer_letter",
			"contract",
			"other",
		]),
		sourceRef: z.string().min(1).max(500),
		note: z.string().max(1000).default(""),
		round: z.string().max(160).default(""),
		interviewer: z.string().max(200).default(""),
	})
	.strict()
	.superRefine((item, ctx) => {
		if (item.amountMax !== null && item.amountMax < item.amountMin) {
			ctx.addIssue({
				code: "custom",
				path: ["amountMax"],
				message: "amountMax must be greater than or equal to amountMin",
			});
		}
		if (
			item.type === "stated" &&
			(!item.round.trim() || !item.interviewer.trim())
		) {
			ctx.addIssue({
				code: "custom",
				path: ["round"],
				message: "stated compensation requires the round and interviewer",
			});
		}
	});

function tsv(value) {
	const clean = String(value ?? "")
		.normalize("NFKC")
		.replace(/[\t\r\n\u2028\u2029]+/g, " ")
		.trim();
	if (clean.includes("\0")) throw new Error("TSV values cannot contain NUL");
	return clean;
}

function ensureLedger(path) {
	mkdirSync(dirname(path), { recursive: true });
	if (existsSync(path)) return;
	try {
		writeFileSync(path, HEADER, { flag: "wx", mode: 0o600 });
	} catch (error) {
		if (error.code !== "EEXIST") throw error;
	}
}

function serialize(item) {
	return [
		item.schemaVersion,
		item.date,
		item.appNum,
		item.company,
		item.type,
		item.amountMin,
		item.amountMax ?? "",
		item.currency,
		item.period,
		item.source,
		item.sourceRef,
		item.note,
		item.round,
		item.interviewer,
	]
		.map(tsv)
		.join("\t");
}

export function parseSalaryObservations(content) {
	const observations = [];
	const malformed = [];
	for (const [index, raw] of String(content).split("\n").entries()) {
		if (!raw.trim() || raw.startsWith("schema_version\t")) continue;
		const cells = raw.split("\t");
		if (cells.length !== 14) {
			malformed.push({
				line: index + 1,
				reason: `expected 14 columns, found ${cells.length}`,
			});
			continue;
		}
		try {
			observations.push(
				SalaryObservationSchema.parse({
					schemaVersion: Number(cells[0]),
					date: cells[1],
					appNum: Number(cells[2]),
					company: cells[3],
					type: cells[4],
					amountMin: Number(cells[5]),
					amountMax: cells[6] === "" ? null : Number(cells[6]),
					currency: cells[7],
					period: cells[8],
					source: cells[9],
					sourceRef: cells[10],
					note: cells[11],
					round: cells[12],
					interviewer: cells[13],
				}),
			);
		} catch (error) {
			malformed.push({
				line: index + 1,
				reason: error.issues?.[0]?.message || error.message,
			});
		}
	}
	return { observations, malformed };
}

function latestByType(items) {
	const result = new Map();
	for (const item of items) {
		const current = result.get(item.type);
		if (!current || item.date >= current.date) result.set(item.type, item);
	}
	return result;
}

function rangeLabel(item) {
	return item.amountMax === null
		? `${item.amountMin} ${item.currency}/${item.period}`
		: `${item.amountMin}–${item.amountMax} ${item.currency}/${item.period}`;
}

export function summarizeSalaryObservations(observations, malformed = []) {
	const byApp = new Map();
	for (const item of observations) {
		if (!byApp.has(item.appNum)) byApp.set(item.appNum, []);
		byApp.get(item.appNum).push(item);
	}
	const applications = [];
	for (const [appNum, items] of byApp.entries()) {
		const latest = latestByType(items);
		const desired = latest.get("desired") || null;
		const comparison = latest.get("actual") || latest.get("advertised") || null;
		let gap = null;
		let gapUnavailableReason = null;
		if (desired && comparison) {
			if (
				desired.currency !== comparison.currency ||
				desired.period !== comparison.period
			) {
				gapUnavailableReason =
					"currency or period differs; no silent conversion was performed";
			} else {
				gap = {
					currency: desired.currency,
					period: desired.period,
					minDifference: comparison.amountMin - desired.amountMin,
					comparisonType: comparison.type,
				};
			}
		} else {
			gapUnavailableReason =
				"desired and comparison observations are both required";
		}
		applications.push({
			appNum,
			company: items.at(-1).company,
			latest: Object.fromEntries(
				[...latest].map(([type, item]) => [
					type,
					{ ...item, display: rangeLabel(item) },
				]),
			),
			statedHistory: items.filter((item) => item.type === "stated"),
			gap,
			gapUnavailableReason,
		});
	}
	return {
		schemaVersion: SALARY_OBSERVATION_SCHEMA_VERSION,
		applications: applications.sort((a, b) => a.appNum - b.appNum),
		dataQuality: {
			observations: observations.length,
			malformed,
			conversionsPerformed: false,
		},
	};
}

function assertTrackerIdentity(root, item) {
	const trackerPath = resolveTrackerPath(root);
	if (!existsSync(trackerPath)) {
		throw new Error(`Tracker not found at ${trackerPath}`);
	}
	const row = parseTracker(readFileSync(trackerPath, "utf8")).rows.find(
		(candidate) => candidate.num === item.appNum,
	);
	if (!row) throw new Error(`Tracker row #${item.appNum} does not exist`);
	const normalized = (value) =>
		String(value)
			.normalize("NFKC")
			.toLowerCase()
			.replace(/[^\p{L}\p{N}]/gu, "");
	if (normalized(row.company) !== normalized(item.company)) {
		throw new Error(
			`Company mismatch for tracker #${item.appNum}: expected ${row.company}`,
		);
	}
}

export async function appendSalaryObservation({
	root = process.cwd(),
	observation,
}) {
	const projectRoot = resolve(root);
	const item = SalaryObservationSchema.parse(observation);
	assertTrackerIdentity(projectRoot, item);
	const path = resolve(projectRoot, "data/salary-observations.tsv");
	ensureLedger(path);
	const transaction = await openTrackerTransaction(path);
	let operationError = null;
	try {
		const before = transaction.read();
		const line = serialize(item);
		if (before.split("\n").includes(line)) {
			throw new Error("Exact salary observation already exists");
		}
		transaction.replace(`${before.replace(/\n*$/, "")}\n${line}\n`);
	} catch (error) {
		operationError = error;
	}
	const closeError = transaction.close();
	if (operationError) throw operationError;
	if (closeError) throw closeError;
	return {
		added: true,
		appNum: item.appNum,
		type: item.type,
		currency: item.currency,
		conversionPerformed: false,
	};
}

export function readSalaryObservations({ root = process.cwd() } = {}) {
	const path = resolve(root, "data/salary-observations.tsv");
	const parsed = parseSalaryObservations(
		existsSync(path) ? readFileSync(path, "utf8") : "",
	);
	return summarizeSalaryObservations(parsed.observations, parsed.malformed);
}

function argument(argv, name) {
	return argv
		.find((value) => value.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

function usage() {
	return [
		"Usage:",
		"  node scripts/salary-observations.mjs add --input=observation.json [--root=.]",
		"  node scripts/salary-observations.mjs [--summary] [--root=.]",
		"Amounts retain their original currency and period; no conversion is performed.",
	].join("\n");
}

export async function runSalaryObservationsCli(
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
	if (argv[0] === "add") {
		const input = argument(argv, "--input");
		if (!input) throw new Error(usage());
		const result = await appendSalaryObservation({
			root,
			observation: JSON.parse(readFileSync(resolve(root, input), "utf8")),
		});
		console.log(JSON.stringify(result, null, 2));
		return 0;
	}
	const result = readSalaryObservations({ root });
	if (argv.includes("--summary")) {
		for (const item of result.applications) {
			console.log(
				`#${item.appNum} ${item.company}: ${item.gap ? `${item.gap.minDifference} ${item.gap.currency}/${item.gap.period} vs desired` : item.gapUnavailableReason}`,
			);
		}
		if (result.dataQuality.malformed.length > 0) {
			console.log(
				`${result.dataQuality.malformed.length} malformed ledger row(s) reported`,
			);
		}
	} else {
		console.log(JSON.stringify(result, null, 2));
	}
	return 0;
}

const direct =
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
	runSalaryObservationsCli().catch((error) => {
		console.error(`Salary observation failed: ${error.message}`);
		process.exitCode = 1;
	});
}

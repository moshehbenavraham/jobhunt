#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addDays, parseNextOverrides } from "./followup-cadence.mjs";
import { parseTracker } from "./tracker-parse.mjs";
import {
	openTrackerTransaction,
	resolveTrackerPath,
} from "./tracker-utils.mjs";

export const FOLLOWUPS_HEADER = [
	"# Follow-up History",
	"",
	"| # | App# | Date | Company | Role | Channel | Contact | Notes |",
	"| --- | ---- | ---- | ------- | ---- | ------- | ------- | ----- |",
	"",
].join("\n");

function validDate(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
	const parsed = new Date(`${value}T00:00:00.000Z`);
	return (
		!Number.isNaN(parsed.getTime()) &&
		parsed.toISOString().slice(0, 10) === value
	);
}

function hasFollowupRow(content, appNum) {
	return String(content)
		.split("\n")
		.some((line) => {
			if (!line.startsWith("|")) return false;
			const cells = line.split("|").map((cell) => cell.trim());
			return Number.parseInt(cells[2], 10) === appNum;
		});
}

function ensureFollowupsFile(path) {
	mkdirSync(dirname(path), { recursive: true });
	if (existsSync(path)) return;
	try {
		writeFileSync(path, FOLLOWUPS_HEADER, { flag: "wx", mode: 0o600 });
	} catch (error) {
		if (error.code !== "EEXIST") throw error;
	}
}

export function formatFollowupPin(appNum, nextDate, seededAt, variant) {
	return `- next #${appNum} ${nextDate} (seeded ${seededAt}; variant ${variant})`;
}

export async function seedFollowup({
	root = process.cwd(),
	appNum,
	appliedDate = new Date().toISOString().slice(0, 10),
	days = 7,
	variant = "standard",
	force = false,
	dryRun = false,
	allowNonApplied = false,
}) {
	const projectRoot = resolve(root);
	if (!Number.isInteger(Number(appNum)) || Number(appNum) <= 0) {
		throw new Error("appNum must be a positive integer");
	}
	if (!validDate(appliedDate))
		throw new Error("appliedDate must be a real YYYY-MM-DD");
	if (
		!Number.isInteger(Number(days)) ||
		Number(days) < 0 ||
		Number(days) > 90
	) {
		throw new Error("days must be an integer from 0 to 90");
	}
	if (
		!["standard", "ats_failure", "no_show", "interview_thankyou"].includes(
			variant,
		)
	) {
		throw new Error("unsupported follow-up seed variant");
	}
	const trackerPath = resolveTrackerPath(projectRoot);
	const row = parseTracker(readFileSync(trackerPath, "utf8")).rows.find(
		(candidate) => candidate.num === Number(appNum),
	);
	if (!row) {
		const error = new Error(`application #${appNum} was not found`);
		error.code = "NOT_FOUND";
		throw error;
	}
	if (!allowNonApplied && String(row.status).toLowerCase() !== "applied") {
		throw new Error(`application #${appNum} is ${row.status}, not Applied`);
	}
	const followupsPath = resolve(projectRoot, "data/follow-ups.md");
	ensureFollowupsFile(followupsPath);
	const nextDate = addDays(
		new Date(`${appliedDate}T00:00:00.000Z`),
		Number(days),
	);
	const pin = formatFollowupPin(Number(appNum), nextDate, appliedDate, variant);
	if (dryRun) {
		return {
			seeded: false,
			dryRun: true,
			appNum: Number(appNum),
			nextDate,
			variant,
			pin,
		};
	}
	const transaction = await openTrackerTransaction(followupsPath);
	let result;
	let operationError = null;
	try {
		const before = transaction.read();
		const already =
			parseNextOverrides(before).has(Number(appNum)) ||
			hasFollowupRow(before, Number(appNum));
		if (already && !force) {
			result = {
				seeded: false,
				reason: "already-seeded-or-contacted",
				appNum: Number(appNum),
				nextDate: null,
				variant,
			};
		} else {
			transaction.replace(`${before.trimEnd()}\n${pin}\n`);
			result = {
				seeded: true,
				appNum: Number(appNum),
				nextDate,
				variant,
				pin,
				path: "data/follow-ups.md",
			};
		}
	} catch (error) {
		operationError = error;
	}
	const closeError = transaction.close();
	if (operationError) throw operationError;
	if (closeError) throw closeError;
	return result;
}

function argument(argv, name) {
	return argv
		.find((value) => value.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

function usage() {
	return [
		"Usage: node scripts/followup-seed.mjs <appNum>",
		"  [--date=YYYY-MM-DD] [--days=7] [--variant=standard|ats_failure|no_show|interview_thankyou]",
		"  [--force] [--dry-run] [--json]",
	].join("\n");
}

export async function runFollowupSeedCli(
	argv = process.argv.slice(2),
	options = {},
) {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(usage());
		return 0;
	}
	const positional = argv.filter((value) => !value.startsWith("--"));
	if (positional.length !== 1) throw new Error(usage());
	const result = await seedFollowup({
		root: options.root || argument(argv, "--root") || process.cwd(),
		appNum: Number(positional[0]),
		appliedDate:
			argument(argv, "--date") || new Date().toISOString().slice(0, 10),
		days: Number(argument(argv, "--days") || 7),
		variant: argument(argv, "--variant") || "standard",
		force: argv.includes("--force"),
		dryRun: argv.includes("--dry-run"),
	});
	console.log(
		argv.includes("--json")
			? JSON.stringify(result)
			: JSON.stringify(result, null, 2),
	);
	return 0;
}

const direct =
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
	try {
		process.exitCode = await runFollowupSeedCli();
	} catch (error) {
		console.error(`Follow-up seed failed: ${error.message}`);
		process.exitCode = error.code === "NOT_FOUND" ? 2 : 1;
	}
}

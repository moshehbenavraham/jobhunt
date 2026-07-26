#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import { parseTracker } from "./tracker-parse.mjs";
import {
	normalizeCompany,
	resolveTrackerPath,
	roleFuzzyMatch,
} from "./tracker-utils.mjs";

export const INBOUND_MATCH_SCHEMA_VERSION = 1;

const inboundSchema = z
	.object({
		id: z.string().min(1).max(300),
		from: z.string().max(500).default(""),
		subject: z.string().max(1000).default(""),
		body: z.string().max(50_000).default(""),
		companyHint: z.string().max(200).default(""),
		roleHint: z.string().max(300).default(""),
		receivedAt: z.string().datetime().optional(),
	})
	.strict();

const SHARED_DOMAINS = [
	"greenhouse.io",
	"lever.co",
	"ashbyhq.com",
	"myworkday.com",
	"myworkdayjobs.com",
	"smartrecruiters.com",
	"linkedin.com",
	"indeed.com",
	"gmail.com",
	"outlook.com",
	"yahoo.com",
];

function senderDomain(value) {
	const match = String(value)
		.toLowerCase()
		.match(/@([a-z0-9.-]+\.[a-z]{2,})/);
	if (!match) return null;
	const domain = match[1].replace(/\.+$/, "");
	if (
		SHARED_DOMAINS.some(
			(shared) => domain === shared || domain.endsWith(`.${shared}`),
		)
	) {
		return null;
	}
	return domain;
}

function domainsFromNotes(notes) {
	const domains = new Set();
	for (const match of String(notes).matchAll(
		/(?:https?:\/\/|@)([a-z0-9.-]+\.[a-z]{2,})/gi,
	)) {
		const domain = match[1].toLowerCase();
		if (
			!SHARED_DOMAINS.some(
				(shared) => domain === shared || domain.endsWith(`.${shared}`),
			)
		) {
			domains.add(domain);
		}
	}
	return domains;
}

export function extractInboundReqId(text) {
	return (
		String(text).match(
			/\b(?:req(?:uisition)?|job)\s*(?:id|number|#)?\s*[:#-]?\s*([A-Z]{0,4}\d{3,12})\b/i,
		)?.[1] ??
		String(text).match(/\b([A-Z]{1,4}\d{5,12})\b/)?.[1] ??
		null
	);
}

const CATEGORY_RULES = [
	{
		category: "noise",
		transition: null,
		pattern:
			/\b(?:job alert|recommended jobs|newsletter|invitation to apply|talent community)\b/i,
	},
	{
		category: "offer",
		transition: "Offer",
		pattern:
			/\b(?:offer letter|employment agreement|job offer|compensation details)\b/i,
	},
	{
		category: "rejection",
		transition: "Rejected",
		pattern:
			/\b(?:unfortunately|not moving forward|will not be moving forward|decided not to proceed|position has been filled|unable to offer)\b/i,
	},
	{
		category: "interview_invite",
		transition: "Interview",
		pattern:
			/\b(?:interview|phone screen|technical screen|schedule a call|meet the team|calendar invite)\b/i,
	},
	{
		category: "action_required",
		transition: "Responded",
		pattern:
			/\b(?:complete (?:the|an) assessment|provide additional|action required|select a time|availability|take-home)\b/i,
	},
	{
		category: "application_confirmation",
		transition: "Applied",
		pattern:
			/\b(?:thank you for applying|application received|received your application|application confirmation)\b/i,
	},
];

export function classifyInboundMessage(messageInput) {
	const message = inboundSchema.parse(messageInput);
	const text = `${message.subject}\n${message.body}`;
	const match = CATEGORY_RULES.find((rule) => rule.pattern.test(text));
	return {
		category: match?.category || "human_reply",
		recommendedStatus: match?.transition || (match ? null : "Responded"),
		reqId: extractInboundReqId(text),
	};
}

function companyTextMatch(text, company) {
	const companyKey = normalizeCompany(company);
	if (!companyKey || companyKey === "?") return false;
	return normalizeCompany(text).includes(companyKey);
}

function statusPriority(status) {
	const key = String(status).toLowerCase();
	return (
		{
			interview: 6,
			responded: 5,
			applied: 4,
			evaluated: 3,
			offer: 2,
			rejected: 0,
			discarded: 0,
			skip: 0,
		}[key] ?? 1
	);
}

export function rankInboundMatches(messageInput, trackerRows) {
	const message = inboundSchema.parse(messageInput);
	const classification = classifyInboundMessage(message);
	const text = [
		message.from,
		message.subject,
		message.body,
		message.companyHint,
		message.roleHint,
	].join(" ");
	const domain = senderDomain(message.from);
	const candidates = [];
	for (const row of trackerRows) {
		const signals = [];
		let score = 0;
		if (
			classification.reqId &&
			String(row.notes).includes(classification.reqId)
		) {
			score += 6;
			signals.push("requisition-id");
		}
		if (
			companyTextMatch(
				`${message.companyHint} ${message.subject} ${message.body}`,
				row.company,
			)
		) {
			score += 3;
			signals.push("company");
		}
		if (message.roleHint && roleFuzzyMatch(message.roleHint, row.role)) {
			score += 3;
			signals.push("role-hint");
		} else if (roleFuzzyMatch(text, row.role)) {
			score += 2;
			signals.push("role-text");
		}
		if (
			domain &&
			[...domainsFromNotes(row.notes)].some(
				(candidate) => domain === candidate || domain.endsWith(`.${candidate}`),
			)
		) {
			score += 3;
			signals.push("sender-domain");
		}
		if (score > 0) {
			candidates.push({
				applicationNum: row.num,
				company: row.company,
				role: row.role,
				currentStatus: row.status,
				score,
				statusPriority: statusPriority(row.status),
				signals,
			});
		}
	}
	return { message, classification, candidates };
}

export function matchInboundMessage(messageInput, trackerRows) {
	const ranked = rankInboundMatches(messageInput, trackerRows);
	const candidates = ranked.candidates.sort(
		(first, second) =>
			second.score - first.score ||
			second.statusPriority - first.statusPriority ||
			first.applicationNum - second.applicationNum,
	);
	const first = candidates[0] || null;
	const second = candidates[1] || null;
	const tie =
		first &&
		second &&
		first.score === second.score &&
		first.statusPriority === second.statusPriority;
	const confidence = !first
		? "none"
		: tie
			? "ambiguous"
			: first.score >= 6 && (!second || first.score - second.score >= 2)
				? "high"
				: first.score >= 3
					? "medium"
					: "low";
	const chosen =
		confidence === "high" || confidence === "medium" ? first : null;
	return {
		schemaVersion: INBOUND_MATCH_SCHEMA_VERSION,
		messageId: ranked.message.id,
		classification: ranked.classification.category,
		requisitionId: ranked.classification.reqId,
		match: chosen
			? {
					applicationNum: chosen.applicationNum,
					company: chosen.company,
					role: chosen.role,
					currentStatus: chosen.currentStatus,
					confidence,
					signals: chosen.signals,
				}
			: null,
		candidates: candidates.map(
			({ statusPriority: _priority, ...candidate }) => candidate,
		),
		recommendedTransition:
			chosen && ranked.classification.recommendedStatus
				? {
						applicationNum: chosen.applicationNum,
						from: chosen.currentStatus,
						to: ranked.classification.recommendedStatus,
						command: `node scripts/set-status.mjs #${chosen.applicationNum} ${ranked.classification.recommendedStatus} --source=inbound-review`,
					}
				: null,
		reviewRequired: true,
		mutationPerformed: false,
		conflict:
			confidence === "ambiguous"
				? "multiple tracker rows have the same evidence score"
				: confidence === "none"
					? "no tracker row matched"
					: null,
	};
}

function argument(argv, name) {
	return argv
		.find((value) => value.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

function usage() {
	return [
		"Usage: node scripts/inbound-match.mjs --input=message.json [--root=.]",
		"Classifies and matches one employer reply/invite. It never mutates the tracker.",
	].join("\n");
}

export function runInboundMatchCli(argv = process.argv.slice(2), options = {}) {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(usage());
		return 0;
	}
	const input = argument(argv, "--input");
	if (!input) throw new Error(usage());
	const inputPath = resolve(input);
	const stat = lstatSync(inputPath);
	if (!stat.isFile() || stat.isSymbolicLink()) {
		throw new Error("inbound input must be a regular non-symlink file");
	}
	const root = resolve(
		options.root || argument(argv, "--root") || process.cwd(),
	);
	const trackerPath = resolveTrackerPath(root);
	const rows = parseTracker(readFileSync(trackerPath, "utf8")).rows;
	const result = matchInboundMessage(
		JSON.parse(readFileSync(inputPath, "utf8")),
		rows,
	);
	console.log(JSON.stringify(result, null, 2));
	return result.match ? 0 : 2;
}

const direct =
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
	try {
		process.exitCode = runInboundMatchCli();
	} catch (error) {
		console.error(`Inbound match failed: ${error.message}`);
		process.exitCode = 1;
	}
}

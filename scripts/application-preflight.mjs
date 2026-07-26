#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import * as z from "zod";
import { assertContainedPath } from "./path-policy.mjs";
import { parseTracker } from "./tracker-parse.mjs";
import {
	normalizeCompany,
	resolveTrackerPath,
	roleFuzzyMatch,
} from "./tracker-utils.mjs";

export const APPLICATION_PREFLIGHT_SCHEMA_VERSION = 1;

const FIELD_TYPES = [
	"text",
	"textarea",
	"email",
	"tel",
	"url",
	"select",
	"radio",
	"checkbox",
	"file",
	"number",
	"date",
	"unknown",
];

const fieldSchema = z
	.object({
		id: z.string().min(1).max(200),
		label: z.string().min(1).max(500),
		type: z.enum(FIELD_TYPES).default("unknown"),
		required: z.boolean().default(false),
		options: z.array(z.string().min(1).max(300)).max(100).default([]),
		value: z
			.union([z.string(), z.boolean(), z.number()])
			.nullable()
			.default(null),
	})
	.strict();

export const ApplicationFormSnapshotSchema = z
	.object({
		schemaVersion: z.literal(APPLICATION_PREFLIGHT_SCHEMA_VERSION),
		capturedAt: z.string().datetime().optional(),
		url: z
			.string()
			.url()
			.refine((value) => /^https:\/\//i.test(value)),
		pageTitle: z.string().min(1).max(500),
		company: z.string().min(1).max(200),
		role: z.string().min(1).max(300),
		fields: z.array(fieldSchema).min(1).max(300),
	})
	.strict();

const ATS_HOSTS = Object.freeze({
	greenhouse: [
		"boards.greenhouse.io",
		"job-boards.greenhouse.io",
		"greenhouse.io",
	],
	ashby: ["jobs.ashbyhq.com", "ashbyhq.com"],
	lever: ["jobs.lever.co", "jobs.eu.lever.co", "lever.co"],
	workday: ["myworkdayjobs.com", "myworkday.com"],
});

function hostMatches(hostname, suffix) {
	return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

export function detectApplicationAts(url) {
	const hostname = new URL(url).hostname.toLowerCase();
	for (const [ats, hosts] of Object.entries(ATS_HOSTS)) {
		if (hosts.some((host) => hostMatches(hostname, host))) return ats;
	}
	return "generic";
}

function fieldCategory(field) {
	const label = field.label.toLowerCase();
	if (field.type === "file") return "file";
	if (
		/\b(?:authorized|authorization|sponsor|sponsorship|relocat|commut|clearance|citizen|years? of experience|degree|required location|work permit)\b/i.test(
			label,
		)
	) {
		return "knockout";
	}
	if (
		/\b(?:name|email|phone|telephone|linkedin|portfolio|website|location|address)\b/i.test(
			label,
		)
	) {
		return "identity";
	}
	if (
		/\b(?:consent|privacy|terms|certify|acknowledge|signature)\b/i.test(label)
	) {
		return "consent";
	}
	return "custom";
}

function profileValues(profile) {
	const fullName = String(profile.candidate?.full_name || "").trim();
	const parts = fullName.split(/\s+/).filter(Boolean);
	return {
		full_name: fullName,
		first_name: parts[0] || "",
		last_name: parts.slice(1).join(" "),
		email: String(profile.candidate?.email || "").trim(),
		phone: String(profile.candidate?.phone || "").trim(),
		location: String(
			profile.candidate?.location || profile.location?.country || "",
		).trim(),
		linkedin: String(profile.candidate?.linkedin || "").trim(),
		portfolio: String(profile.candidate?.portfolio_url || "").trim(),
		github: String(profile.candidate?.github || "").trim(),
	};
}

function identityValue(field, values) {
	const label = `${field.id} ${field.label}`.toLowerCase();
	if (/\bfirst[\s_-]*name\b/.test(label)) return values.first_name;
	if (/\blast[\s_-]*name\b/.test(label)) return values.last_name;
	if (/\b(?:full[\s_-]*name|name)\b/.test(label)) return values.full_name;
	if (/\bemail\b/.test(label)) return values.email;
	if (/\b(?:phone|telephone|mobile)\b/.test(label)) return values.phone;
	if (/\blinkedin\b/.test(label)) return values.linkedin;
	if (/\b(?:portfolio|website)\b/.test(label)) return values.portfolio;
	if (/\bgithub\b/.test(label)) return values.github;
	if (/\blocation\b/.test(label)) return values.location;
	return "";
}

function validatePdfArtifact(root, requested) {
	const outputRoot = resolve(root, "output");
	const pdf = assertContainedPath(outputRoot, resolve(root, requested), {
		mustExist: true,
		label: "Application PDF",
	});
	const stat = lstatSync(pdf);
	if (!stat.isFile() || stat.isSymbolicLink() || !pdf.endsWith(".pdf")) {
		throw new Error("Application PDF must be a regular .pdf inside output/");
	}
	const manifest = pdf.replace(/\.pdf$/i, ".manifest.json");
	if (!existsSync(manifest)) {
		throw new Error(`Application PDF manifest is missing: ${manifest}`);
	}
	const manifestStat = lstatSync(manifest);
	if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) {
		throw new Error("Application PDF manifest must be a regular file");
	}
	const parsed = JSON.parse(readFileSync(manifest, "utf8"));
	if (parsed.validation?.valid !== true) {
		throw new Error("Application PDF manifest is not valid");
	}
	if (manifestStat.mtimeMs < stat.mtimeMs) {
		throw new Error("Application PDF manifest is stale");
	}
	return {
		path: `output/${basename(pdf)}`,
		manifest: `output/${basename(manifest)}`,
		validation: "valid-and-fresh",
	};
}

function repeatCompanyWarnings(root, snapshot) {
	const trackerPath = resolveTrackerPath(root);
	if (!existsSync(trackerPath)) return [];
	const companyKey = normalizeCompany(snapshot.company);
	if (!companyKey) return [];
	return parseTracker(readFileSync(trackerPath, "utf8"))
		.rows.filter((row) => normalizeCompany(row.company) === companyKey)
		.map((row) => ({
			applicationNum: row.num,
			role: row.role,
			status: row.status,
			sameRole: roleFuzzyMatch(row.role, snapshot.role),
			warning: roleFuzzyMatch(row.role, snapshot.role)
				? "same-company-similar-role"
				: "repeat-company-distinct-role",
		}));
}

export function prepareApplicationPreflight({
	snapshot: snapshotInput,
	profile: profileInput = {},
	answers = {},
	expected = {},
	files = [],
	root = process.cwd(),
}) {
	const snapshot = ApplicationFormSnapshotSchema.parse(snapshotInput);
	const profile =
		typeof profileInput === "string"
			? yaml.load(profileInput) || {}
			: profileInput;
	const values = profileValues(profile);
	const preparedFields = [];
	const unresolvedRequired = [];
	const knockoutFields = [];
	const consentFields = [];

	for (const field of snapshot.fields) {
		const category = fieldCategory(field);
		const explicit = Object.hasOwn(answers, field.id)
			? answers[field.id]
			: null;
		const identity =
			category === "identity" ? identityValue(field, values) : "";
		const proposedValue = explicit !== null ? explicit : identity || null;
		const source =
			explicit !== null
				? "explicit_user_answer"
				: identity
					? "config/profile.yml"
					: null;
		preparedFields.push({
			id: field.id,
			label: field.label,
			type: field.type,
			required: field.required,
			category,
			proposedValue,
			source,
			humanReviewRequired: true,
		});
		if (category === "knockout") {
			knockoutFields.push({
				id: field.id,
				label: field.label,
				answeredExplicitly: explicit !== null,
				value: explicit,
			});
		}
		if (category === "consent") {
			consentFields.push({
				id: field.id,
				label: field.label,
				autoFillAllowed: false,
			});
		}
		if (field.required && proposedValue === null && category !== "file") {
			unresolvedRequired.push(field.id);
		}
	}

	const roleMatch = expected.role
		? roleFuzzyMatch(expected.role, snapshot.role)
		: null;
	const companyMatch = expected.company
		? normalizeCompany(expected.company) === normalizeCompany(snapshot.company)
		: null;
	const validatedFiles = files.map((path) =>
		validatePdfArtifact(resolve(root), path),
	);

	return {
		schemaVersion: APPLICATION_PREFLIGHT_SCHEMA_VERSION,
		capturedForm: {
			ats: detectApplicationAts(snapshot.url),
			url: snapshot.url,
			pageTitle: snapshot.pageTitle,
			company: snapshot.company,
			role: snapshot.role,
			fieldCount: snapshot.fields.length,
		},
		contextMatch: {
			expectedCompany: expected.company || null,
			expectedRole: expected.role || null,
			companyMatch,
			roleMatch,
			roleDrift:
				roleMatch === false || companyMatch === false
					? "review_required"
					: "none_detected",
		},
		repeatCompany: repeatCompanyWarnings(resolve(root), snapshot),
		knockoutFields,
		consentFields,
		preparedFields,
		unresolvedRequired,
		files: validatedFiles,
		readiness:
			unresolvedRequired.length === 0 &&
			knockoutFields.every((field) => field.answeredExplicitly)
				? "ready_for_human_review"
				: "blocked_for_missing_answers",
		guard: {
			maySubmit: false,
			mayClickSubmit: false,
			mayAcceptTerms: false,
			humanReviewRequired: true,
			instruction:
				"Review and enter these values manually. This tool never submits an application.",
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
		"Usage: node scripts/application-preflight.mjs --snapshot=form.json",
		"  [--answers=answers.json] [--expected-company=...] [--expected-role=...]",
		"  [--pdf=output/cv.pdf] [--root=.]",
		"Prints a typed prepare-only plan. It cannot submit or accept terms.",
	].join("\n");
}

export function runApplicationPreflightCli(
	argv = process.argv.slice(2),
	options = {},
) {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(usage());
		return 0;
	}
	const snapshotPath = argument(argv, "--snapshot");
	if (!snapshotPath) throw new Error(usage());
	const root = resolve(
		options.root || argument(argv, "--root") || process.cwd(),
	);
	const profilePath = resolve(root, "config/profile.yml");
	const result = prepareApplicationPreflight({
		snapshot: JSON.parse(readFileSync(resolve(snapshotPath), "utf8")),
		profile: readFileSync(profilePath, "utf8"),
		answers: argument(argv, "--answers")
			? JSON.parse(readFileSync(resolve(argument(argv, "--answers")), "utf8"))
			: {},
		expected: {
			company: argument(argv, "--expected-company"),
			role: argument(argv, "--expected-role"),
		},
		files: argument(argv, "--pdf") ? [argument(argv, "--pdf")] : [],
		root,
	});
	console.log(JSON.stringify(result, null, 2));
	return result.readiness === "ready_for_human_review" ? 0 : 2;
}

const direct =
	process.argv[1] &&
	resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
	try {
		process.exitCode = runApplicationPreflightCli();
	} catch (error) {
		console.error(`Application preflight failed: ${error.message}`);
		process.exitCode = 1;
	}
}

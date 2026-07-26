#!/usr/bin/env node

/**
 * test-all.mjs - Comprehensive test suite for jobhunt
 *
 * Run before merging any PR or pushing changes.
 * Tests: syntax, scripts, dashboard, data contract, personal data, paths.
 *
 * Usage:
 *   node scripts/test-all.mjs           # Run all tests
 *   node scripts/test-all.mjs --quick   # Skip dashboard build (faster)
 */

import { execFileSync, execSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const QUICK = process.argv.includes("--quick");

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) {
	console.log(`  [PASS] ${msg}`);
	passed++;
}
function fail(msg) {
	console.log(`  [FAIL] ${msg}`);
	failed++;
}
function warn(msg) {
	console.log(`  [WARN] ${msg}`);
	warnings++;
}

function run(cmd, args = [], opts = {}) {
	try {
		if (Array.isArray(args) && args.length > 0) {
			return execFileSync(cmd, args, {
				cwd: ROOT,
				encoding: "utf-8",
				timeout: 30000,
				...opts,
			}).trim();
		}
		return execSync(cmd, {
			cwd: ROOT,
			encoding: "utf-8",
			timeout: 30000,
			...opts,
		}).trim();
	} catch (_e) {
		return null;
	}
}

function fileExists(path) {
	return existsSync(join(ROOT, path));
}
function readFile(path) {
	return readFileSync(join(ROOT, path), "utf-8");
}
function readJson(path) {
	return JSON.parse(readFile(path));
}
function stripAnsi(text) {
	const ESC = String.fromCharCode(0x1b);
	return text.replace(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), "");
}

console.log("\njobhunt test suite\n");

// -- 1. SYNTAX CHECKS --------------------------------------------

console.log("1. Syntax checks");

const mjsFiles = readdirSync(join(ROOT, "scripts")).filter((f) =>
	f.endsWith(".mjs"),
);
for (const f of mjsFiles) {
	const result = run("node", ["--check", join("scripts", f)]);
	if (result !== null) {
		pass(`${f} syntax OK`);
	} else {
		fail(`${f} has syntax errors`);
	}
}

// -- 2. SCRIPT EXECUTION -----------------------------------------

console.log("\n2. Script execution (graceful on empty data)");

const scripts = [
	{ name: "cv-sync-check.mjs", expectExit: 1, allowFail: true }, // fails without any CV (normal in repo)
	{ name: "verify-pipeline.mjs", expectExit: 0, emptyData: true },
	{ name: "normalize-statuses.mjs", expectExit: 0, emptyData: true },
	{ name: "dedup-tracker.mjs", expectExit: 0, emptyData: true },
	{ name: "merge-tracker.mjs", expectExit: 0, emptyData: true },
	{ name: "update-system.mjs check", expectExit: 0 },
];

const emptyDataRoot = mkdtempSync(join(tmpdir(), "jobhunt-test-all-empty-"));
mkdirSync(join(emptyDataRoot, "batch", "tracker-additions"), {
	recursive: true,
});
mkdirSync(join(emptyDataRoot, "data"), { recursive: true });
mkdirSync(join(emptyDataRoot, "templates"), { recursive: true });
writeFileSync(
	join(emptyDataRoot, "data", "applications.md"),
	[
		"# Applications Tracker",
		"",
		"| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |",
		"| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |",
		"",
	].join("\n"),
);
writeFileSync(
	join(emptyDataRoot, "templates", "states.yml"),
	readFile("templates/states.yml"),
);

try {
	for (const { name, allowFail, emptyData } of scripts) {
		const parts = name.split(" ");
		parts[0] = join("scripts", parts[0]);
		const result = run("node", parts, {
			stdio: ["pipe", "pipe", "pipe"],
			...(emptyData
				? { env: { ...process.env, JOBHUNT_ROOT: emptyDataRoot } }
				: {}),
		});
		if (result !== null) {
			pass(`${name} runs OK`);
		} else if (allowFail) {
			warn(`${name} exited with error (expected without user data)`);
		} else {
			fail(`${name} crashed`);
		}
	}
} finally {
	rmSync(emptyDataRoot, { recursive: true, force: true });
}

// -- 3. LIVENESS CLASSIFICATION ----------------------------------

console.log("\n3. Liveness classification");

try {
	const { classifyLiveness } = await import(
		pathToFileURL(join(ROOT, "scripts", "liveness-core.mjs")).href
	);

	const expiredChromeApply = classifyLiveness({
		finalUrl: "https://example.com/jobs/closed-role",
		bodyText:
			"Company Careers\nApply\nThe job you are looking for is no longer open.",
		applyControls: [],
	});
	if (expiredChromeApply.result === "expired") {
		pass('Expired pages are not revived by nav/footer "Apply" text');
	} else {
		fail(`Expired page misclassified as ${expiredChromeApply.result}`);
	}

	const activeWorkdayPage = classifyLiveness({
		finalUrl: "https://example.workday.com/job/123",
		bodyText: [
			"663 JOBS FOUND",
			"Senior AI Engineer",
			"Join our applied AI team to ship production systems, partner with customers, and own delivery across evaluation, deployment, and reliability.",
		].join("\n"),
		applyControls: ["Apply for this Job"],
	});
	if (activeWorkdayPage.result === "active") {
		pass("Visible apply controls still keep real job pages active");
	} else {
		fail(`Active job page misclassified as ${activeWorkdayPage.result}`);
	}

	const closedMycareersfuture = classifyLiveness({
		finalUrl:
			"https://www.mycareersfuture.gov.sg/job/engineering/senior-staff-embedded-software-engineer",
		bodyText: [
			"Senior Staff Embedded Software Engineer",
			"MaxLinear Asia Singapore Private Limited",
			"9 applications    Posted 27 Oct 2025    Closed on 26 Nov 2025",
			"Applications have closed for this job",
			"Log in to Apply",
			"Roles & Responsibilities: design and maintain embedded firmware for broadband communications ICs.",
		].join("\n"),
		applyControls: ["Log in to Apply"],
	});
	if (closedMycareersfuture.result === "expired") {
		pass("Closed postings with closed-applications banners are detected");
	} else {
		fail(`Closed posting misclassified as ${closedMycareersfuture.result}`);
	}
} catch (e) {
	fail(`Liveness classification tests crashed: ${e.message}`);
}

// -- 3b. BATCH RUNNER CONTRACT ----------------------------------

console.log("\n3b. Batch runner contract");

const batchContract = run("node", ["scripts/test-batch-runner-contract.mjs"]);
if (batchContract !== null) {
	pass("Batch runner contract tests pass");
} else {
	fail("Batch runner contract tests failed");
}

// -- 3c. BATCH RUNNER STATE SEMANTICS ---------------------------

console.log("\n3c. Batch runner state semantics");

const batchStateSemantics = run("node", [
	"scripts/test-batch-runner-state-semantics.mjs",
]);
if (batchStateSemantics !== null) {
	pass("Batch runner state-semantics tests pass");
} else {
	fail("Batch runner state-semantics tests failed");
}

// -- 3d. BATCH RUNNER CLOSEOUT ----------------------------------

console.log("\n3d. Batch runner closeout");

const batchCloseout = run("node", ["scripts/test-batch-runner-closeout.mjs"]);
if (batchCloseout !== null) {
	pass("Batch runner closeout tests pass");
} else {
	fail("Batch runner closeout tests failed");
}

// -- 3d-1. EVALUATION CONTRACTS ---------------------------------

console.log("\n3d-1. Evaluation contracts and usage");

for (const [script, label] of [
	["scripts/test-evaluation-policy.mjs", "evaluation policy"],
	["scripts/test-evidence-reliability.mjs", "evidence reliability"],
	["scripts/test-evaluation-summary.mjs", "machine/risk summary"],
	["scripts/test-token-usage.mjs", "runner-measured token usage"],
	["scripts/test-model-provider-runner.mjs", "optional provider runners"],
	["scripts/test-locale-parity.mjs", "EN/DE/FR/JA locale parity"],
	["scripts/test-eval-golden.mjs", "golden evaluation harness"],
]) {
	if (run("node", [script]) !== null) {
		pass(`${label} tests pass`);
	} else {
		fail(`${label} tests failed`);
	}
}

const containerContract = run("node", ["scripts/test-container-contract.mjs"]);
if (containerContract !== null) {
	pass("Pinned container and smoke-test contract passes");
} else {
	fail("Pinned container or smoke-test contract failed");
}

// -- 3e. PDF ATS NORMALIZATION ----------------------------------

console.log("\n3e. PDF ATS normalization");

const pdfNormalization = run("node", [
	"scripts/test-generate-pdf-normalization.mjs",
]);
if (pdfNormalization !== null) {
	pass("PDF ATS normalization regression test passes");
} else {
	fail("PDF ATS normalization regression test failed");
}

// -- 3e-1. STRUCTURED CV BUILD CONTRACT --------------------------

console.log("\n3e-1. Structured CV build contract");

const cvBuildContract = run("node", ["scripts/test-cv-build.mjs"]);
if (cvBuildContract !== null) {
	pass("Structured CV build contract tests pass");
} else {
	fail("Structured CV build contract tests failed");
}

const cvFactVerifier = run("node", ["scripts/test-verify-cv-facts.mjs"]);
if (cvFactVerifier !== null) {
	pass("Standalone CV fact verifier tests pass");
} else {
	fail("Standalone CV fact verifier tests failed");
}

const jdSkillGap = run("node", ["scripts/test-jd-skill-gap.mjs"]);
if (jdSkillGap !== null) {
	pass("Zero-LLM JD skill-gap preflight tests pass");
} else {
	fail("Zero-LLM JD skill-gap preflight tests failed");
}

// -- 3e-2. FINISHED PDF AND VISUAL REGRESSIONS ------------------

console.log("\n3e-2. Finished PDF and visual regressions");

const finishedPdfPipeline = run("node", ["scripts/test-pdf-pipeline.mjs"], {
	timeout: 120000,
});
if (finishedPdfPipeline !== null) {
	pass("Finished PDF and visual regression tests pass");
} else {
	fail("Finished PDF and visual regression tests failed");
}

// -- 3e-3. DETERMINISTIC COVER LETTER PIPELINE ------------------

console.log("\n3e-3. Deterministic cover letter pipeline");

const coverLetterPipeline = run("node", ["scripts/test-cover-letter.mjs"], {
	timeout: 120000,
});
if (coverLetterPipeline !== null) {
	pass("Deterministic cover letter pipeline tests pass");
} else {
	fail("Deterministic cover letter pipeline tests failed");
}

const documentTemplates = run("node", ["scripts/test-document-templates.mjs"]);
if (documentTemplates !== null) {
	pass("Contained document template resolver tests pass");
} else {
	fail("Contained document template resolver tests failed");
}

const structuredLatex = run("node", ["scripts/test-build-cv-latex.mjs"]);
if (structuredLatex !== null) {
	pass("Structured LaTeX CV build tests pass");
} else {
	fail("Structured LaTeX CV build tests failed");
}

// -- 3e-4. TRACKER PARSER, LOCK, AND TRANSITIONS ----------------

console.log("\n3e-4. Tracker parser, lock, and status transitions");

const trackerCore = run("node", ["scripts/test-tracker-core.mjs"]);
if (trackerCore !== null) {
	pass("Tracker parser, lock, transition, and audit-log tests pass");
} else {
	fail("Tracker parser, lock, transition, or audit-log tests failed");
}

const reportReservations = run("node", [
	"scripts/test-report-reservations.mjs",
]);
if (reportReservations !== null) {
	pass("Atomic report ID reservation tests pass");
} else {
	fail("Atomic report ID reservation tests failed");
}

const pipelineReconciliation = run("node", [
	"scripts/test-reconcile-pipeline.mjs",
]);
if (pipelineReconciliation !== null) {
	pass("Proof-gated pipeline reconciliation tests pass");
} else {
	fail("Proof-gated pipeline reconciliation tests failed");
}

// -- 3e-5. APPLICATION LIFECYCLE AND COMMUNICATION ---------------

console.log("\n3e-5. Application lifecycle and communication");

for (const [script, label] of [
	["scripts/test-application-preflight.mjs", "application preflight"],
	["scripts/test-application-answers.mjs", "application answer snapshots"],
	["scripts/test-application-email.mjs", "formal application email drafts"],
	["scripts/test-inbound-match.mjs", "inbound reply/invite matching"],
	["scripts/test-followup-seed.mjs", "follow-up seeding"],
	["scripts/test-application-utilities.mjs", "add/find/title utilities"],
	["scripts/test-agent-inbox.mjs", "durable agent inbox"],
]) {
	if (run("node", [script]) !== null) {
		pass(`${label} tests pass`);
	} else {
		fail(`${label} tests failed`);
	}
}

// -- 3e-6. INTERVIEW, OFFER, AND CAREER ANALYTICS ----------------

console.log("\n3e-6. Interview, offer, and career analytics");

for (const [script, label] of [
	["scripts/test-interview-session.mjs", "interview session/intelligence"],
	["scripts/test-offer-prep.mjs", "sensitive offer preparation"],
	["scripts/test-salary-observations.mjs", "salary observations"],
	["scripts/test-assessment-log.mjs", "assessment outcome/staleness"],
	["scripts/test-upskill-report.mjs", "exact-source upskill reporting"],
	["scripts/test-career-analytics.mjs", "funnel/velocity/channel analytics"],
]) {
	if (run("node", [script]) !== null) {
		pass(`${label} tests pass`);
	} else {
		fail(`${label} tests failed`);
	}
}

// -- 3f. Pattern analysis regressions ----------------------------

console.log("\n3f. Pattern analysis regressions");

const analyzePatterns = run("node", ["scripts/test-analyze-patterns.mjs"]);
if (analyzePatterns !== null) {
	pass("Pattern analysis regression tests pass");
} else {
	fail("Pattern analysis regression tests failed");
}

// -- 3g. Follow-up cadence regressions ---------------------------

console.log("\n3g. Follow-up cadence regressions");

const followupCadence = run("node", ["scripts/test-followup-cadence.mjs"]);
if (followupCadence !== null) {
	pass("Follow-up cadence regression tests pass");
} else {
	fail("Follow-up cadence regression tests failed");
}

// -- 3h. ATS extraction regressions ------------------------------

console.log("\n3h. ATS extraction regressions");

const networkPolicy = run("node", ["scripts/test-network-policy.mjs"]);
if (networkPolicy !== null) {
	pass("Shared network policy regressions pass");
} else {
	fail("Shared network policy regressions failed");
}

const pathPolicy = run("node", ["scripts/test-path-policy.mjs"]);
if (pathPolicy !== null) {
	pass("Shared path containment regressions pass");
} else {
	fail("Shared path containment regressions failed");
}

const artifactPolicy = run("node", ["scripts/test-artifact-policy.mjs"]);
if (artifactPolicy !== null) {
	pass("Contained artifact publication regressions pass");
} else {
	fail("Contained artifact publication regressions failed");
}

const providerRegistry = run("node", ["scripts/test-providers.mjs"]);
if (providerRegistry !== null) {
	pass("Provider registry and fixtures pass");
} else {
	fail("Provider registry and fixtures failed");
}

const scanPolicy = run("node", ["scripts/test-scan-policy.mjs"]);
if (scanPolicy !== null) {
	pass("Rich scan filter regressions pass");
} else {
	fail("Rich scan filter regressions failed");
}

const scanLedger = run("node", ["scripts/test-scan-ledger.mjs"]);
if (scanLedger !== null) {
	pass("Scan ledger regressions pass");
} else {
	fail("Scan ledger regressions failed");
}

const listingFingerprints = run("node", ["scripts/test-fingerprint-core.mjs"]);
if (listingFingerprints !== null) {
	pass("Listing fingerprint regressions pass");
} else {
	fail("Listing fingerprint regressions failed");
}

const repostDetection = run("node", ["scripts/test-detect-reposts.mjs"]);
if (repostDetection !== null) {
	pass("Repost detection regressions pass");
} else {
	fail("Repost detection regressions failed");
}

const browserExtraction = run("node", ["scripts/test-browser-extract.mjs"]);
if (browserExtraction !== null) {
	pass("Browser board extraction regressions pass");
} else {
	fail("Browser board extraction regressions failed");
}

const postingArchive = run("node", ["scripts/test-archive-posting.mjs"]);
if (postingArchive !== null) {
	pass("Contained posting archive regressions pass");
} else {
	fail("Contained posting archive regressions failed");
}

const imagePdf = run("node", ["scripts/test-img-to-pdf.mjs"], {
	timeout: 120000,
});
if (imagePdf !== null) {
	pass("Validated image-to-PDF artifact regressions pass");
} else {
	fail("Validated image-to-PDF artifact regressions failed");
}

const apiLiveness = run("node", ["scripts/test-liveness-api.mjs"]);
if (apiLiveness !== null) {
	pass("API liveness regressions pass");
} else {
	fail("API liveness regressions failed");
}

const portalConfig = run("node", ["scripts/test-portals-config.mjs"]);
if (portalConfig !== null) {
	pass("Portal config validation and verification tests pass");
} else {
	fail("Portal config validation and verification tests failed");
}

const reverseAts = run("node", ["scripts/test-scan-ats-full.mjs"]);
if (reverseAts !== null) {
	pass("Reverse ATS seed discovery regressions pass");
} else {
	fail("Reverse ATS seed discovery regressions failed");
}

const userDataAuditTests = run("node", ["scripts/test-audit-user-data.mjs"]);
if (userDataAuditTests !== null) {
	pass("Tracked user-data and secret audit regressions pass");
} else {
	fail("Tracked user-data and secret audit regressions failed");
}

const extractJob = run("node", ["scripts/test-extract-job.mjs"]);
if (extractJob !== null) {
	pass("ATS extraction regression tests pass");
} else {
	fail("ATS extraction regression tests failed");
}

// -- 3i. Auto-pipeline ATS routing regressions ------------------

console.log("\n3i. Auto-pipeline ATS routing regressions");

const autoPipelineRouting = run("node", [
	"scripts/test-auto-pipeline-routing.mjs",
]);
if (autoPipelineRouting !== null) {
	pass("Auto-pipeline ATS routing regression tests pass");
} else {
	fail("Auto-pipeline ATS routing regression tests failed");
}

// -- 3j. Portal scan regressions --------------------------------

console.log("\n3j. Portal scan regressions");

const scanRegressions = run("node", ["scripts/test-scan.mjs"]);
if (scanRegressions !== null) {
	pass("Portal scan regression tests pass");
} else {
	fail("Portal scan regression tests failed");
}

// -- 3k. Job liveness regressions -------------------------------

console.log("\n3k. Job liveness regressions");

const checkLiveness = run("node", ["scripts/test-check-liveness.mjs"]);
if (checkLiveness !== null) {
	pass("Job liveness regression tests pass");
} else {
	fail("Job liveness regression tests failed");
}

// -- 3l. Maintenance script regressions -------------------------

console.log("\n3l. Maintenance script regressions");

const maintenanceScripts = run("node", [
	"scripts/test-maintenance-scripts.mjs",
]);
if (maintenanceScripts !== null) {
	pass("Maintenance script regression tests pass");
} else {
	fail("Maintenance script regression tests failed");
}

// -- 3m. Updater regressions ------------------------------------

console.log("\n3m. Updater regressions");

const updateSystem = run("node", ["scripts/test-update-system-cli.mjs"]);
if (updateSystem !== null) {
	pass("Updater regression tests pass");
} else {
	fail("Updater regression tests failed");
}

// -- 3n. OpenAI account auth regressions ------------------------

console.log("\n3n. OpenAI account auth regressions");

const openaiAccountAuth = run("node", ["scripts/test-openai-account-auth.mjs"]);
if (openaiAccountAuth !== null) {
	pass("OpenAI account auth regression tests pass");
} else {
	fail("OpenAI account auth regression tests failed");
}

// -- 3o. OpenAI Codex transport regressions ---------------------

console.log("\n3o. OpenAI Codex transport regressions");

const openaiCodexTransport = run("node", [
	"scripts/test-openai-codex-transport.mjs",
]);
if (openaiCodexTransport !== null) {
	pass("OpenAI Codex transport regression tests pass");
} else {
	fail("OpenAI Codex transport regression tests failed");
}

// -- 3p. OpenAI Agents Codex provider regressions ---------------

console.log("\n3p. OpenAI Agents Codex provider regressions");

const openaiAgentsCodexProvider = run("node", [
	"scripts/test-openai-agents-provider.mjs",
]);
if (openaiAgentsCodexProvider !== null) {
	pass("OpenAI Agents Codex provider regression tests pass");
} else {
	fail("OpenAI Agents Codex provider regression tests failed");
}

// -- 3l. UPGRADE SAFETY REGRESSIONS ------------------------------

console.log("\n3l. Upgrade safety regressions");

try {
	const updaterSource = readFile("scripts/update-system.mjs");
	const updaterHarnessPath = join(ROOT, ".tmp-test-update-system-contract.mjs");
	writeFileSync(
		updaterHarnessPath,
		`${updaterSource.split("// -- MAIN")[0]}\nexport { isUserPath, isUpdateTargetPath };\n`,
	);
	try {
		const updaterHarness = await import(pathToFileURL(updaterHarnessPath).href);

		if (updaterHarness.isUpdateTargetPath("data/follow-ups.example.md")) {
			pass(
				"Updater still treats data/follow-ups.example.md as a system target",
			);
		} else {
			fail("Updater lost data/follow-ups.example.md as a system target");
		}

		if (!updaterHarness.isUserPath("data/follow-ups.example.md")) {
			pass("Updater does not classify data/follow-ups.example.md as user data");
		} else {
			fail("Updater still classifies data/follow-ups.example.md as user data");
		}

		if (updaterHarness.isUserPath("data/applications.md")) {
			pass("Updater still protects real user data under data/");
		} else {
			fail("Updater no longer protects real user data under data/");
		}

		if (updaterHarness.isUserPath("cv.md")) {
			pass("Updater still protects legacy root cv.md");
		} else {
			fail("Updater does not protect legacy root cv.md");
		}

		if (updaterHarness.isUserPath("portals.yml")) {
			pass("Updater still protects legacy root portals.yml during migration");
		} else {
			fail("Updater does not protect legacy root portals.yml during migration");
		}

		if (updaterHarness.isUpdateTargetPath("templates/portals.example.yml")) {
			pass("Updater still tracks removed templates for upgrade cleanup");
		} else {
			fail("Updater does not track removed templates for upgrade cleanup");
		}

		const latexSystemTargets = [
			"modes/latex.md",
			"scripts/generate-latex.mjs",
			"scripts/test-generate-latex.mjs",
			"templates/cv-template.tex",
		];

		for (const path of latexSystemTargets) {
			if (updaterHarness.isUpdateTargetPath(path)) {
				pass(`Updater ships LaTeX system target: ${path}`);
			} else {
				fail(`Updater misses LaTeX system target: ${path}`);
			}

			if (!updaterHarness.isUserPath(path)) {
				pass(`Updater keeps LaTeX system target out of user data: ${path}`);
			} else {
				fail(`Updater misclassifies LaTeX system target as user data: ${path}`);
			}
		}

		const shellSystemTargets = [
			"scripts/run-scheduled-scan.sh",
			"scripts/ux.sh",
		];

		for (const path of shellSystemTargets) {
			if (updaterHarness.isUpdateTargetPath(path)) {
				pass(`Updater ships shell system target: ${path}`);
			} else {
				fail(`Updater misses shell system target: ${path}`);
			}

			if (!updaterHarness.isUserPath(path)) {
				pass(`Updater keeps shell system target out of user data: ${path}`);
			} else {
				fail(`Updater misclassifies shell system target as user data: ${path}`);
			}
		}

		const authSystemTargets = [
			"scripts/lib/openai-account-auth/",
			"scripts/openai-account-auth.mjs",
			"scripts/openai-codex-smoke.mjs",
			"scripts/openai-agents-codex-smoke.mjs",
			"scripts/test-openai-account-auth.mjs",
			"scripts/test-openai-codex-transport.mjs",
			"scripts/test-openai-agents-provider.mjs",
		];

		for (const path of authSystemTargets) {
			if (updaterHarness.isUpdateTargetPath(path)) {
				pass(`Updater ships OpenAI auth system target: ${path}`);
			} else {
				fail(`Updater misses OpenAI auth system target: ${path}`);
			}

			if (!updaterHarness.isUserPath(path)) {
				pass(`Updater keeps OpenAI auth target out of user data: ${path}`);
			} else {
				fail(`Updater misclassifies OpenAI auth target as user data: ${path}`);
			}
		}

		const pdfSystemTargets = [
			"package-lock.json",
			"scripts/build-cv.mjs",
			"scripts/build-cover-letter.mjs",
			"scripts/cover-letter-core.mjs",
			"scripts/cv-build-core.mjs",
			"scripts/pdf-validation-core.mjs",
			"scripts/validate-cover-letter.mjs",
			"scripts/validate-pdf.mjs",
			"scripts/test-cover-letter.mjs",
			"scripts/test-cv-build.mjs",
			"scripts/test-pdf-pipeline.mjs",
			"scripts/test-fixtures/cover-letter-build.json",
			"scripts/test-fixtures/cv-build-letter.json",
			"scripts/test-fixtures/pdf-visual-baselines.json",
			"scripts/test-fixtures/pdf-snapshots/letter-page-1.png",
			"templates/cover-letter-build.schema.json",
			"templates/cover-letter-template.html",
			"templates/cv-build.schema.json",
			"templates/cv-template.html",
		];

		for (const path of pdfSystemTargets) {
			if (updaterHarness.isUpdateTargetPath(path)) {
				pass(`Updater ships deterministic PDF system target: ${path}`);
			} else {
				fail(`Updater misses deterministic PDF system target: ${path}`);
			}

			if (!updaterHarness.isUserPath(path)) {
				pass(
					`Updater keeps deterministic PDF target out of user data: ${path}`,
				);
			} else {
				fail(
					`Updater misclassifies deterministic PDF target as user data: ${path}`,
				);
			}
		}

		const trackerSystemTargets = [
			"scripts/tracker-aliases.json",
			"scripts/tracker-parse.mjs",
			"scripts/tracker-utils.mjs",
			"scripts/set-status.mjs",
			"scripts/reserve-report-ids.mjs",
			"scripts/reconcile-pipeline.mjs",
			"scripts/test-tracker-core.mjs",
			"scripts/test-report-reservations.mjs",
			"scripts/test-reconcile-pipeline.mjs",
			"dashboard/internal/data/tracker_lock.go",
			"dashboard/internal/data/tracker_status_log.go",
		];

		for (const path of trackerSystemTargets) {
			if (updaterHarness.isUpdateTargetPath(path)) {
				pass(`Updater ships tracker integrity target: ${path}`);
			} else {
				fail(`Updater misses tracker integrity target: ${path}`);
			}
		}
	} finally {
		rmSync(updaterHarnessPath, { force: true });
	}
} catch (e) {
	fail(`Updater regression tests crashed: ${e.message}`);
}

try {
	const tempRoot = mkdtempSync(join(tmpdir(), "jobhunt-legacy-cv-"));
	mkdirSync(join(tempRoot, "scripts"), { recursive: true });
	mkdirSync(join(tempRoot, "scripts", "lib", "openai-account-auth"), {
		recursive: true,
	});
	mkdirSync(join(tempRoot, "config"), { recursive: true });
	mkdirSync(join(tempRoot, "fonts"), { recursive: true });
	mkdirSync(join(tempRoot, "profile"), { recursive: true });
	symlinkSync(join(ROOT, "node_modules"), join(tempRoot, "node_modules"));
	writeFileSync(
		join(tempRoot, "scripts", "doctor.mjs"),
		readFile("scripts/doctor.mjs"),
	);
	writeFileSync(
		join(tempRoot, "scripts", "cv-sync-check.mjs"),
		readFile("scripts/cv-sync-check.mjs"),
	);
	for (const authLibFile of [
		"agents-provider.mjs",
		"codex-transport.mjs",
		"common.mjs",
		"index.mjs",
		"oauth.mjs",
		"storage.mjs",
	]) {
		writeFileSync(
			join(tempRoot, "scripts", "lib", "openai-account-auth", authLibFile),
			readFile(join("scripts", "lib", "openai-account-auth", authLibFile)),
		);
	}
	writeFileSync(
		join(tempRoot, "cv.md"),
		`# Legacy CV\n\n${"Experience\n".repeat(20)}`,
	);
	writeFileSync(
		join(tempRoot, "config", "profile.yml"),
		'full_name: "Test User"\nemail: "test@example.com"\nlocation: "Remote"\n',
	);
	writeFileSync(join(tempRoot, "config", "portals.yml"), "companies: []\n");
	writeFileSync(join(tempRoot, "fonts", "dummy.txt"), "font");

	try {
		const legacyDoctor = run(
			"node",
			[join(tempRoot, "scripts", "doctor.mjs")],
			{
				cwd: tempRoot,
				stdio: ["pipe", "pipe", "pipe"],
			},
		);
		if (
			legacyDoctor !== null &&
			stripAnsi(legacyDoctor).includes("cv.md found")
		) {
			pass("doctor accepts legacy root cv.md during migration");
		} else {
			fail("doctor rejects legacy root cv.md during migration");
		}

		const legacySync = run(
			"node",
			[join(tempRoot, "scripts", "cv-sync-check.mjs")],
			{
				cwd: tempRoot,
				stdio: ["pipe", "pipe", "pipe"],
			},
		);
		if (legacySync !== null && !stripAnsi(legacySync).includes("ERRORS (")) {
			pass("cv-sync-check accepts legacy root cv.md during migration");
		} else {
			fail("cv-sync-check rejects legacy root cv.md during migration");
		}
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
} catch (e) {
	fail(`Legacy CV migration tests crashed: ${e.message}`);
}

try {
	const tempRoot = mkdtempSync(join(tmpdir(), "jobhunt-doctor-no-deps-"));
	mkdirSync(join(tempRoot, "scripts", "lib", "openai-account-auth"), {
		recursive: true,
	});
	writeFileSync(
		join(tempRoot, "scripts", "doctor.mjs"),
		readFile("scripts/doctor.mjs"),
	);
	for (const authLibFile of ["common.mjs", "storage.mjs"]) {
		writeFileSync(
			join(tempRoot, "scripts", "lib", "openai-account-auth", authLibFile),
			readFile(join("scripts", "lib", "openai-account-auth", authLibFile)),
		);
	}

	try {
		let doctorNoDepsFailed = false;
		let doctorNoDepsOutput = "";

		try {
			doctorNoDepsOutput = execFileSync(
				"node",
				[join(tempRoot, "scripts", "doctor.mjs")],
				{
					cwd: tempRoot,
					encoding: "utf8",
					stdio: ["pipe", "pipe", "pipe"],
				},
			);
		} catch (error) {
			doctorNoDepsFailed = true;
			doctorNoDepsOutput = `${error.stdout || ""}${error.stderr || ""}`;
		}

		const normalizedDoctorNoDeps = stripAnsi(doctorNoDepsOutput);

		if (
			doctorNoDepsFailed &&
			normalizedDoctorNoDeps.includes("Dependencies not installed") &&
			!normalizedDoctorNoDeps.includes("@openai/agents-core")
		) {
			pass("doctor stays runnable before npm install");
		} else {
			fail("doctor no longer stays runnable before npm install");
		}
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
} catch (e) {
	fail(`Doctor pre-install regression tests crashed: ${e.message}`);
}

try {
	const tempRoot = mkdtempSync(join(tmpdir(), "jobhunt-visa-warning-"));
	mkdirSync(join(tempRoot, "scripts"), { recursive: true });
	mkdirSync(join(tempRoot, "config"), { recursive: true });
	mkdirSync(join(tempRoot, "profile"), { recursive: true });
	symlinkSync(join(ROOT, "node_modules"), join(tempRoot, "node_modules"));
	writeFileSync(
		join(tempRoot, "scripts", "cv-sync-check.mjs"),
		readFile("scripts/cv-sync-check.mjs"),
	);
	writeFileSync(
		join(tempRoot, "profile", "cv.md"),
		`# Test CV\n\n${"Experience\n".repeat(20)}`,
	);
	writeFileSync(
		join(tempRoot, "config", "profile.yml"),
		[
			"candidate:",
			'  full_name: "Test User"',
			'  email: "test@example.com"',
			'  location: "Remote"',
			"location:",
			'  country: "United States"',
			'  city: "Remote"',
			'  timezone: "America/New_York"',
			'  visa_status: ""',
			"",
		].join("\n"),
	);

	try {
		const visaWarningOutput = run(
			"node",
			[join(tempRoot, "scripts", "cv-sync-check.mjs")],
			{
				cwd: tempRoot,
				stdio: ["pipe", "pipe", "pipe"],
			},
		);
		if (
			visaWarningOutput !== null &&
			stripAnsi(visaWarningOutput).includes("location.visa_status") &&
			!stripAnsi(visaWarningOutput).includes("ERRORS (")
		) {
			pass("cv-sync-check warns when location.visa_status is blank");
		} else {
			fail("cv-sync-check did not warn on blank location.visa_status");
		}
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
} catch (e) {
	fail(`Visa-status warning tests crashed: ${e.message}`);
}

// -- 3m. LaTeX validation regressions ----------------------------

console.log("\n3m. LaTeX validation regressions");

const generateLatex = run("node", ["scripts/test-generate-latex.mjs"]);
if (generateLatex !== null) {
	pass("LaTeX validation regression tests pass");
} else {
	fail("LaTeX validation regression tests failed");
}

// -- 4. DASHBOARD BUILD ------------------------------------------

if (!QUICK) {
	console.log("\n4. Dashboard build");
	const goBuild = run(
		"cd dashboard && go build -o /tmp/career-dashboard-test . 2>&1",
	);
	if (goBuild !== null) {
		pass("Dashboard compiles");
	} else {
		fail("Dashboard build failed");
	}
} else {
	console.log("\n4. Dashboard build (skipped --quick)");
}

// -- 5. DATA CONTRACT --------------------------------------------

console.log("\n5. Data contract validation");

// Check system files exist
const systemFiles = [
	"AGENTS.md",
	".codex/skills/career-ops/SKILL.md",
	"VERSION",
	"scripts/lib/openai-account-auth",
	"scripts/openai-account-auth.mjs",
	"scripts/openai-codex-smoke.mjs",
	"scripts/openai-agents-codex-smoke.mjs",
	"scripts/run-scheduled-scan.sh",
	"scripts/ux.sh",
	"data/follow-ups.example.md",
	"data/openai-account-auth.example.json",
	"data/openai-account-auth.example.json.lock",
	"docs/DATA_CONTRACT.md",
	"interview-prep/README-interview-prep.md",
	"interview-prep/story-bank.example.md",
	"profile/cv.example.md",
	"profile/article-digest.example.md",
	"modes/_shared.md",
	"modes/_profile.template.md",
	"modes/oferta.md",
	"modes/cover-letter.md",
	"modes/latex.md",
	"modes/pdf.md",
	"modes/scan.md",
	"templates/cover-letter-template.html",
	"templates/cover-letter-build.schema.json",
	"templates/cv-template.tex",
	"templates/states.yml",
	"templates/cv-template.html",
	"templates/cv-build.schema.json",
	"scripts/build-cover-letter.mjs",
	"scripts/build-cv.mjs",
	"scripts/document-templates.mjs",
	"scripts/cover-letter-core.mjs",
	"scripts/cv-build-core.mjs",
	"scripts/pdf-validation-core.mjs",
	"scripts/validate-cover-letter.mjs",
	"scripts/validate-pdf.mjs",
	"scripts/audit-user-data.mjs",
];

for (const f of systemFiles) {
	if (fileExists(f)) {
		pass(`System file exists: ${f}`);
	} else {
		fail(`Missing system file: ${f}`);
	}
}

// Check user files are NOT tracked (gitignored)
const userFiles = [
	"cv.md",
	"profile/cv.md",
	"profile/article-digest.md",
	"article-digest.md",
	"portals.yml",
	"config/profile.yml",
	"config/cv-facts.json",
	"data/follow-ups.md",
	"data/openai-account-auth.json",
	"interview-prep/story-bank.md",
	"modes/_profile.md",
	"config/portals.yml",
];
for (const f of userFiles) {
	const tracked = run("git", ["ls-files", f]);
	if (tracked === "") {
		pass(`User file gitignored: ${f}`);
	} else if (tracked === null) {
		pass(`User file gitignored: ${f}`);
	} else {
		fail(`User file IS tracked (should be gitignored): ${f}`);
	}
}

// -- 6. PERSONAL DATA LEAK CHECK ---------------------------------

console.log("\n6. Personal data leak check");

const userDataAudit = run("node", ["scripts/audit-user-data.mjs"]);
if (userDataAudit !== null) {
	pass("No tracked user data, private documents, credentials, or secrets");
} else {
	fail("Tracked user-data and secret audit failed");
}

// -- 7. ABSOLUTE PATH CHECK --------------------------------------

console.log("\n7. Absolute path check");

// Same git grep approach: only scans tracked files. Untracked AI tool
// outputs, local debate artifacts, etc. can't false-positive here.
const absPathResult = run(
	`git grep -n "/Users/" -- '*.mjs' '*.sh' '*.md' '*.go' '*.yml' 2>/dev/null | grep -v README.md | grep -v LICENSE | grep -v scripts/test-all.mjs`,
);
if (!absPathResult) {
	pass("No absolute paths in code files");
} else {
	for (const line of absPathResult.split("\n").filter(Boolean)) {
		fail(`Absolute path: ${line.slice(0, 100)}`);
	}
}

// -- 8. MODE FILE INTEGRITY --------------------------------------

console.log("\n8. Mode file integrity");

const expectedModes = [
	"_shared.md",
	"_profile.template.md",
	"cover-letter.md",
	"oferta.md",
	"pdf.md",
	"scan.md",
	"batch.md",
	"apply.md",
	"auto-pipeline.md",
	"contacto.md",
	"deep.md",
	"ofertas.md",
	"pipeline.md",
	"project.md",
	"tracker.md",
	"training.md",
];

for (const mode of expectedModes) {
	if (fileExists(`modes/${mode}`)) {
		pass(`Mode exists: ${mode}`);
	} else {
		fail(`Missing mode: ${mode}`);
	}
}

// Check _shared.md references _profile.md
const shared = readFile("modes/_shared.md");
if (shared.includes("_profile.md")) {
	pass("_shared.md references _profile.md");
} else {
	fail("_shared.md does NOT reference _profile.md");
}

// -- 9. CODEX-PRIMARY INSTRUCTION SURFACE ------------------------

console.log("\n9. Codex-primary instruction surface");

if (fileExists("AGENTS.md")) {
	pass("AGENTS.md exists");
} else {
	fail("AGENTS.md missing");
}

const agents = readFile("AGENTS.md");
if (agents.includes("Startup Checklist (every session)")) {
	pass("AGENTS.md includes the startup checklist");
} else {
	fail("AGENTS.md missing the startup checklist");
}

const skillPath = ".codex/skills/career-ops/SKILL.md";
if (fileExists(skillPath)) {
	pass("career-ops skill exists");
	const careerOpsSkill = readFile(skillPath);

	if (careerOpsSkill.includes("1. `AGENTS.md`")) {
		pass("career-ops skill reads AGENTS.md first");
	} else {
		fail("career-ops skill does not read AGENTS.md first");
	}

	const bootstrapMarkers = [
		"node scripts/update-system.mjs check",
		"`profile/cv.md`",
		"`config/profile.yml`",
		"`modes/_profile.md`",
		"`config/portals.yml`",
	];
	const missingBootstrapMarkers = bootstrapMarkers.filter(
		(marker) => !careerOpsSkill.includes(marker),
	);
	if (missingBootstrapMarkers.length === 0) {
		pass("career-ops skill bootstrap matches the startup checklist");
	} else {
		fail(
			`career-ops skill missing startup checklist markers: ${missingBootstrapMarkers.join(", ")}`,
		);
	}

	if (
		!careerOpsSkill.includes("docs/CODEX.md") &&
		!careerOpsSkill.includes("docs/CLAUDE.md")
	) {
		pass("career-ops skill has no legacy instruction-doc dependency");
	} else {
		fail("career-ops skill still references legacy instruction docs");
	}
} else {
	fail("career-ops skill missing");
}

if (!shared.includes("docs/CODEX.md") && !shared.includes("docs/CLAUDE.md")) {
	pass("shared mode guidance has no legacy instruction-doc dependency");
} else {
	fail("shared mode guidance still references legacy instruction docs");
}

// -- 10. METADATA PATH ALIGNMENT ---------------------------------

console.log("\n10. Metadata path alignment");

const updaterScript = readFile("scripts/update-system.mjs");
if (
	/["']\.codex\/skills\/["']/.test(updaterScript) &&
	!/["']\.claude\/skills\/["']/.test(updaterScript)
) {
	pass("Updater system paths use .codex/skills/");
} else {
	fail("Updater system paths are not aligned to .codex/skills/");
}

const dataContract = readFile("docs/DATA_CONTRACT.md");
const dataContractLines = dataContract.split("\n");
if (
	dataContractLines.some(
		(line) =>
			line.includes("`.codex/skills/*`") && line.includes("Skill definitions"),
	) &&
	!dataContract.includes(".claude/skills/*")
) {
	pass("Data contract names .codex/skills/* as the system skill surface");
} else {
	fail("Data contract skill surface is not aligned to .codex/skills/*");
}

const labeler = readFile(".github/labeler.yml");
const labelerLines = labeler.split("\n").map((line) => line.trim());
const requiredLabelerLines = [
	"- AGENTS.md",
	"- docs/DATA_CONTRACT.md",
	"- .codex/skills/**",
	"- docs/CONTRIBUTING.md",
	"- docs/CODE_OF_CONDUCT.md",
	"- docs/SECURITY.md",
	"- docs/SUPPORT.md",
];
const missingLabelerLines = requiredLabelerLines.filter(
	(line) => !labelerLines.includes(line),
);
if (missingLabelerLines.length === 0) {
	pass("Labeler targets the live metadata and docs paths");
} else {
	fail(`Labeler missing live path globs: ${missingLabelerLines.join(", ")}`);
}

const forbiddenLabelerLines = [
	"- CLAUDE.md",
	"- DATA_CONTRACT.md",
	"- .claude/skills/**",
	"- CONTRIBUTING.md",
	"- CODE_OF_CONDUCT.md",
	"- SECURITY.md",
	"- SUPPORT.md",
];
const forbiddenLabelerMatches = forbiddenLabelerLines.filter((line) =>
	labelerLines.includes(line),
);
if (forbiddenLabelerMatches.length === 0) {
	pass("Labeler has no dead metadata or root-doc globs");
} else {
	fail(
		`Labeler still includes dead path globs: ${forbiddenLabelerMatches.join(", ")}`,
	);
}

const contributorMetadataChecks = [
	{
		path: ".github/PULL_REQUEST_TEMPLATE.md",
		required: [
			"https://github.com/moshehbenavraham/jobhunt/blob/main/docs/CONTRIBUTING.md",
		],
		forbidden: [
			"https://github.com/moshehbenavraham/jobhunt/blob/main/CONTRIBUTING.md",
		],
	},
	{
		path: ".github/workflows/welcome.yml",
		required: [
			"https://github.com/moshehbenavraham/jobhunt/blob/main/docs/CONTRIBUTING.md",
			"https://github.com/moshehbenavraham/jobhunt/blob/main/docs/SUPPORT.md",
		],
		forbidden: [
			"https://github.com/moshehbenavraham/jobhunt/blob/main/CONTRIBUTING.md",
			"https://github.com/moshehbenavraham/jobhunt/blob/main/SUPPORT.md",
		],
	},
	{
		path: ".github/ISSUE_TEMPLATE/bug_report.yml",
		required: [
			"https://github.com/moshehbenavraham/jobhunt/blob/main/docs/CODE_OF_CONDUCT.md",
		],
		forbidden: [
			"https://github.com/moshehbenavraham/jobhunt/blob/main/CODE_OF_CONDUCT.md",
		],
	},
	{
		path: ".github/ISSUE_TEMPLATE/feature_request.yml",
		required: [
			"https://github.com/moshehbenavraham/jobhunt/blob/main/docs/CODE_OF_CONDUCT.md",
		],
		forbidden: [
			"https://github.com/moshehbenavraham/jobhunt/blob/main/CODE_OF_CONDUCT.md",
		],
	},
];

for (const check of contributorMetadataChecks) {
	const fileText = readFile(check.path);
	const missingRequired = check.required.filter(
		(marker) => !fileText.includes(marker),
	);
	const forbiddenPresent = check.forbidden.filter((marker) =>
		fileText.includes(marker),
	);

	if (missingRequired.length === 0 && forbiddenPresent.length === 0) {
		pass(`${check.path} points at live contributor docs`);
	} else {
		const details = [
			missingRequired.length > 0
				? `missing ${missingRequired.join(", ")}`
				: null,
			forbiddenPresent.length > 0
				? `contains ${forbiddenPresent.join(", ")}`
				: null,
		]
			.filter(Boolean)
			.join("; ");
		fail(`${check.path} has metadata path drift: ${details}`);
	}
}

// -- 11. VALIDATOR RUNTIME CONTRACT -------------------------------

console.log("\n11. Validator runtime contract");

const doctorContractRoot = mkdtempSync(
	join(tmpdir(), "jobhunt-doctor-contract-"),
);
mkdirSync(join(doctorContractRoot, "node_modules"), { recursive: true });
mkdirSync(join(doctorContractRoot, "profile"), { recursive: true });
mkdirSync(join(doctorContractRoot, "config"), { recursive: true });
mkdirSync(join(doctorContractRoot, "fonts"), { recursive: true });
writeFileSync(join(doctorContractRoot, "profile", "cv.md"), "# Test CV\n");
writeFileSync(
	join(doctorContractRoot, "config", "profile.yml"),
	'full_name: "Test User"\n',
);
writeFileSync(
	join(doctorContractRoot, "config", "portals.yml"),
	"companies: []\n",
);
writeFileSync(join(doctorContractRoot, "fonts", "test-font.ttf"), "font");

const doctorOutput = run("npm", ["run", "doctor"], {
	env: { ...process.env, JOBHUNT_ROOT: doctorContractRoot },
	stdio: ["pipe", "pipe", "pipe"],
});
rmSync(doctorContractRoot, { recursive: true, force: true });

if (doctorOutput === null) {
	fail("npm run doctor failed");
} else {
	const normalizedDoctorOutput = stripAnsi(doctorOutput);
	const hasCodexFooter = normalizedDoctorOutput.includes(
		"Run `codex` to start.",
	);
	const hasOpenAIAuthGuidance = normalizedDoctorOutput.includes(
		"npm run auth:openai -- status",
	);
	const hasLegacyRuntimeHint =
		normalizedDoctorOutput.includes("`claude`") &&
		normalizedDoctorOutput.includes("to start.");

	if (hasCodexFooter && hasOpenAIAuthGuidance && !hasLegacyRuntimeHint) {
		pass("Doctor success output points to codex");
	} else {
		fail(
			"Doctor success output is not aligned to the Codex-primary runtime contract",
		);
	}
}

// -- 12. VERSION FILE --------------------------------------------

console.log("\n12. Version file");

if (fileExists("VERSION")) {
	const canonicalVersion = readFile("VERSION").trim();
	if (/^\d+\.\d+\.\d+$/.test(canonicalVersion)) {
		pass(`VERSION is valid semver: ${canonicalVersion}`);

		if (fileExists("package.json")) {
			const packageVersion = readJson("package.json").version;
			if (packageVersion === canonicalVersion) {
				pass(`package.json version matches VERSION (${canonicalVersion})`);
			} else {
				fail(
					`package.json version mismatch: expected ${canonicalVersion} from VERSION, found ${packageVersion}`,
				);
			}
		} else {
			fail("package.json missing");
		}

		if (fileExists("package-lock.json")) {
			const lockfile = readJson("package-lock.json");
			const lockVersion = lockfile.version;
			const lockRootVersion = lockfile.packages?.[""]
				? lockfile.packages[""].version
				: null;

			if (lockVersion === canonicalVersion) {
				pass(`package-lock.json version matches VERSION (${canonicalVersion})`);
			} else {
				fail(
					`package-lock.json version mismatch: expected ${canonicalVersion} from VERSION, found ${lockVersion}`,
				);
			}

			if (lockRootVersion === canonicalVersion) {
				pass(
					`package-lock.json packages[""] version matches VERSION (${canonicalVersion})`,
				);
			} else {
				fail(
					`package-lock.json packages[""] version mismatch: expected ${canonicalVersion} from VERSION, found ${lockRootVersion}`,
				);
			}
		} else {
			fail("package-lock.json missing");
		}
	} else {
		fail(`VERSION is not valid semver: "${canonicalVersion}"`);
	}
} else {
	fail("VERSION file missing");
}

// -- SUMMARY -----------------------------------------------------

console.log(`\n${"=".repeat(50)}`);
console.log(
	`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`,
);

if (failed > 0) {
	console.log("TESTS FAILED - do NOT push/merge until fixed\n");
	process.exit(1);
} else if (warnings > 0) {
	console.log("Tests passed with warnings - review before pushing\n");
	process.exit(0);
} else {
	console.log("All tests passed - safe to push/merge\n");
	process.exit(0);
}

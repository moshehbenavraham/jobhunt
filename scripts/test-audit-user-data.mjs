#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { auditTrackedFiles } from "./audit-user-data.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT = join(ROOT, "scripts", "audit-user-data.mjs");

function evaluate(entries) {
	const values = new Map(entries.map(([path, content]) => [path, content]));
	return auditTrackedFiles({
		files: [...values.keys()],
		readFile(path) {
			return Buffer.from(values.get(path));
		},
	});
}

const safe = evaluate([
	["profile/cv.example.md", "**Email:** jane@example.com"],
	["config/profile.example.yml", 'phone: "+1-555-0123"'],
	["data/README-data.md", "User data is ignored."],
	["reports/.gitkeep", ""],
	["templates/cv-template.tex", "Template only"],
	["docs/SECURITY.md", "Contact security@example.org"],
]);
assert.equal(safe.valid, true);

const userArtifacts = evaluate([
	[".jobhunt-app/operational.sqlite", "local operational store"],
	["profile/cv.md", "private CV"],
	["data/applications.md", "tracker"],
	["output/cv-person-company.pdf", "%PDF"],
	["batch/tracker-additions/001-company.tsv", "private row"],
]);
assert.equal(userArtifacts.valid, false);
assert.deepEqual(
	new Set(userArtifacts.findings.map((finding) => finding.rule)),
	new Set(["user-layer-artifact", "generated-user-artifact"]),
);

const privatePaths = evaluate([
	["documents/alex-resume.pdf", "%PDF"],
	["scratch/interview-transcript.txt", "private"],
	["offers/acme-offer.pdf", "private offer"],
	[".env.production", "SAFE_NAME=unsafe_place"],
	["keys/id_ed25519", "not-even-a-real-key"],
]);
assert.deepEqual(
	new Set(privatePaths.findings.map((finding) => finding.rule)),
	new Set([
		"private-career-document",
		"credential-file",
		"user-layer-artifact",
	]),
);

const privateKey = ["-----BEGIN RSA ", "PRIVATE KEY-----", "fixture"].join("");
const githubToken = ["gh", "p_", "a".repeat(36)].join("");
const secretContent = evaluate([
	["src/config.mjs", `export const token = "${githubToken}";`],
	["src/key.txt", privateKey],
	["src/runtime.json", `{"refresh_token":"${"b".repeat(32)}"}`],
]);
assert.deepEqual(
	new Set(secretContent.findings.map((finding) => finding.rule)),
	new Set(["github-token", "private-key", "credential-value"]),
);
assert.equal(
	JSON.stringify(secretContent).includes(githubToken),
	false,
	"audit findings must redact secret values",
);

const pii = evaluate([
	["src/runtime-config.yml", "email: person@real-company.invalid"],
	["src/contact.json", '{"phone":"+44 20 7946 0958"}'],
	["scripts/test-fixtures/person.json", "person@real-company.invalid"],
]);
assert.deepEqual(pii.findings.map((finding) => finding.rule).sort(), [
	"non-example-email",
	"phone-field",
]);

const badPath = evaluate([["../profile/cv.md", "private"]]);
assert.equal(badPath.findings[0].rule, "invalid-tracked-path");

const sandbox = mkdtempSync(join(tmpdir(), "jobhunt-audit-"));
try {
	const runGit = (...args) => {
		const result = spawnSync("git", args, {
			cwd: sandbox,
			encoding: "utf8",
		});
		assert.equal(result.status, 0, result.stderr);
	};
	runGit("init", "-q");
	mkdirSync(join(sandbox, "src"), { recursive: true });
	writeFileSync(
		join(sandbox, "src", "safe.mjs"),
		"export const safe = true;\n",
	);
	runGit("add", "src/safe.mjs");

	const passingCli = spawnSync(
		process.execPath,
		[AUDIT, "--root", sandbox, "--json"],
		{ encoding: "utf8" },
	);
	assert.equal(passingCli.status, 0, passingCli.stderr);
	assert.equal(JSON.parse(passingCli.stdout).valid, true);

	mkdirSync(join(sandbox, "output"), { recursive: true });
	writeFileSync(join(sandbox, "output", "private.pdf"), "%PDF fixture");
	runGit("add", "-f", "output/private.pdf");
	const failingCli = spawnSync(
		process.execPath,
		[AUDIT, "--root", sandbox, "--json"],
		{ encoding: "utf8" },
	);
	assert.equal(failingCli.status, 1);
	const report = JSON.parse(failingCli.stdout);
	assert.equal(report.valid, false);
	assert.equal(report.findings[0].path, "output/private.pdf");
} finally {
	rmSync(sandbox, { recursive: true, force: true });
}

console.log("audit-user-data tests passed");

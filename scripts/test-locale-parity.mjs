#!/usr/bin/env node

import assert from "node:assert/strict";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
	CANONICAL_WORKFLOW_MODES,
	checkLocaleParity,
	runLocaleParityCli,
	VERIFIED_OUTPUT_LOCALES,
} from "./locale-parity.mjs";

const root = resolve(import.meta.dirname, "..");
const current = checkLocaleParity(root);
assert.equal(current.valid, true, current.issues.join("\n"));
assert.deepEqual(VERIFIED_OUTPUT_LOCALES, ["en", "de", "fr", "ja"]);
assert.ok(current.modeCount >= 27);
for (const locale of VERIFIED_OUTPUT_LOCALES) {
	assert.equal(current.policies[locale].outputLanguage, locale);
	assert.equal(current.policies[locale].machineKeysCanonical, true);
}
assert.equal(runLocaleParityCli(["--json"], { root }), 0);

const sandbox = mkdtempSync(join(tmpdir(), "jobhunt-locales-"));
try {
	for (const relative of [
		"AGENTS.md",
		"modes/_shared.md",
		"batch/batch-prompt.md",
		...CANONICAL_WORKFLOW_MODES.map((mode) => `modes/${mode}`),
	]) {
		const source = join(root, relative);
		const target = join(sandbox, relative);
		mkdirSync(dirname(target), { recursive: true });
		cpSync(source, target);
	}

	writeFileSync(
		join(sandbox, "modes", "apply.md"),
		`${readFileSync(join(sandbox, "modes", "apply.md"), "utf8")}\nWrite the answer in the JD language.\n`,
	);
	const contradictory = checkLocaleParity(sandbox);
	assert.equal(contradictory.valid, false);
	assert.match(
		contradictory.issues.join("\n"),
		/contradicts configured output/,
	);

	rmSync(join(sandbox, "modes", "interview", "debrief.md"));
	const missing = checkLocaleParity(sandbox);
	assert.match(missing.issues.join("\n"), /canonical workflow mode is missing/);
} finally {
	rmSync(sandbox, { recursive: true, force: true });
}

console.log("locale parity tests pass");

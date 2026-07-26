#!/usr/bin/env node

/**
 * update-system.mjs - Safe auto-updater for jobhunt
 *
 * Updates ONLY system layer files (modes, scripts, dashboard, templates).
 * NEVER touches user data (profile/cv.md, legacy cv.md, profile/article-digest.md, config/profile.yml, legacy portals.yml, config/portals.yml, _profile.md, data/, reports/).
 *
 * Usage:
 *   node scripts/update-system.mjs check      # Check if update available
 *   node scripts/update-system.mjs apply      # Apply update (after user confirms)
 *   node scripts/update-system.mjs rollback   # Rollback last update
 *   node scripts/update-system.mjs dismiss    # Dismiss update check
 *
 * See docs/DATA_CONTRACT.md for the full system/user layer definitions.
 */

import { execFileSync, execSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, posix as pathPosix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const ROOT = process.env.JOBHUNT_ROOT
	? resolve(process.env.JOBHUNT_ROOT)
	: resolve(SCRIPT_DIR, "..");

const UPDATE_REMOTE = "origin";
const CANONICAL_REPO = "https://github.com/moshehbenavraham/jobhunt.git";
const RAW_VERSION_URL =
	"https://raw.githubusercontent.com/moshehbenavraham/jobhunt/main/VERSION";
const RELEASES_API =
	"https://api.github.com/repos/moshehbenavraham/jobhunt/releases/latest";
const VERSION_PATH = "VERSION";

// System-managed legacy paths removed from the canonical layout. Keep them in
// the updater contract so apply/rollback can cleanly delete or restore them.
const REMOVED_SYSTEM_PATHS = ["templates/portals.example.yml"];

// System layer paths - ONLY these files get updated
const SYSTEM_PATHS = [
	".gitignore",
	"config/README-config.md",
	"config/cv-facts.example.json",
	"config/profile.example.yml",
	"config/portals.example.yml",
	"modes/_shared.md",
	"modes/_profile.template.md",
	"modes/cover-letter.md",
	"modes/email.md",
	"modes/agent-inbox.md",
	"modes/interview/",
	"modes/interview-redflag.md",
	"modes/offer-prep.md",
	"modes/upskill.md",
	"modes/analytics.md",
	"modes/latex.md",
	"modes/oferta.md",
	"modes/pdf.md",
	"modes/scan.md",
	"modes/batch.md",
	"modes/apply.md",
	"modes/auto-pipeline.md",
	"modes/contacto.md",
	"modes/deep.md",
	"modes/ofertas.md",
	"modes/pipeline.md",
	"modes/project.md",
	"modes/tracker.md",
	"modes/training.md",
	"AGENTS.md",
	"batch/batch-prompt.md",
	"batch/batch-runner.sh",
	"batch/test-fixtures/mock-pdf-validator.mjs",
	"evals/",
	"apps/",
	"dashboard/",
	"templates/",
	"fonts/",
	".codex/skills/",
	"docs/",
	"data/follow-ups.example.md",
	"data/openai-account-auth.example.json",
	"data/openai-account-auth.example.json.lock",
	"interview-prep/story-bank.example.md",
	"interview-prep/README-interview-prep.md",
	"profile/article-digest.example.md",
	"profile/cv.example.md",
	"VERSION",
	"README.md",
	"LICENSE",
	".github/",
	"package.json",
	"package-lock.json",
	"tsconfig.base.json",
	"Dockerfile",
	"docker-compose.yml",
	".dockerignore",
	"scripts/",
	"scripts/lib/openai-account-auth/",
	"scripts/openai-account-auth.mjs",
	"scripts/openai-agents-codex-smoke.mjs",
	"scripts/openai-codex-smoke.mjs",
	"scripts/run-scheduled-scan.sh",
	"scripts/test-openai-account-auth.mjs",
	"scripts/test-openai-agents-provider.mjs",
	"scripts/test-openai-codex-transport.mjs",
	"scripts/ux.sh",
	"scripts/generate-latex.mjs",
	"scripts/test-generate-latex.mjs",
	"scripts/test-fixtures/cv-build-letter.json",
	"scripts/test-fixtures/pdf-visual-baselines.json",
	"scripts/test-fixtures/pdf-snapshots/",
];

const REMAPPED_SYSTEM_FILES = [
	{ source: "ats-core.mjs", dest: "scripts/ats-core.mjs" },
	{ source: "analyze-patterns.mjs", dest: "scripts/analyze-patterns.mjs" },
	{ source: "build-cv.mjs", dest: "scripts/build-cv.mjs" },
	{ source: "check-liveness.mjs", dest: "scripts/check-liveness.mjs" },
	{ source: "cv-build-core.mjs", dest: "scripts/cv-build-core.mjs" },
	{ source: "cv-sync-check.mjs", dest: "scripts/cv-sync-check.mjs" },
	{ source: "dedup-tracker.mjs", dest: "scripts/dedup-tracker.mjs" },
	{ source: "doctor.mjs", dest: "scripts/doctor.mjs" },
	{ source: "extract-job.mjs", dest: "scripts/extract-job.mjs" },
	{ source: "followup-cadence.mjs", dest: "scripts/followup-cadence.mjs" },
	{ source: "generate-latex.mjs", dest: "scripts/generate-latex.mjs" },
	{ source: "generate-pdf.mjs", dest: "scripts/generate-pdf.mjs" },
	{ source: "liveness-core.mjs", dest: "scripts/liveness-core.mjs" },
	{ source: "merge-tracker.mjs", dest: "scripts/merge-tracker.mjs" },
	{ source: "normalize-statuses.mjs", dest: "scripts/normalize-statuses.mjs" },
	{
		source: "pdf-validation-core.mjs",
		dest: "scripts/pdf-validation-core.mjs",
	},
	{ source: "scan.mjs", dest: "scripts/scan.mjs" },
	{ source: "test-all.mjs", dest: "scripts/test-all.mjs" },
	{ source: "test-cv-build.mjs", dest: "scripts/test-cv-build.mjs" },
	{
		source: "test-generate-latex.mjs",
		dest: "scripts/test-generate-latex.mjs",
	},
	{
		source: "test-pdf-pipeline.mjs",
		dest: "scripts/test-pdf-pipeline.mjs",
	},
	{ source: "update-system.mjs", dest: "scripts/update-system.mjs" },
	{ source: "validate-pdf.mjs", dest: "scripts/validate-pdf.mjs" },
	{ source: "verify-pipeline.mjs", dest: "scripts/verify-pipeline.mjs" },
];

// User layer paths - NEVER touch these (safety check)
const USER_PATHS = [
	"cv.md",
	"profile/cv.md",
	"profile/article-digest.md",
	"article-digest.md",
	"config/profile.yml",
	"config/cv-facts.json",
	"portals.yml",
	"config/portals.yml",
	"modes/_profile.md",
	"interview-prep/story-bank.md",
	"data/follow-ups.md",
	"data/",
	"reports/",
	"output/",
	"jds/",
];

function readText(path) {
	return readFileSync(join(ROOT, path), "utf-8").trim();
}

function isSemver(value) {
	return /^\d+\.\d+\.\d+$/.test(value);
}

function readCanonicalVersion() {
	if (!existsSync(join(ROOT, VERSION_PATH))) {
		throw new Error(`Missing canonical version file: ${VERSION_PATH}`);
	}

	const version = readText(VERSION_PATH);
	if (!isSemver(version)) {
		throw new Error(`Invalid semver in ${VERSION_PATH}: "${version}"`);
	}

	return version;
}

function localVersion() {
	try {
		return readCanonicalVersion();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}

function compareVersions(a, b) {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		if ((pa[i] || 0) < (pb[i] || 0)) return -1;
		if ((pa[i] || 0) > (pb[i] || 0)) return 1;
	}
	return 0;
}

function git(...args) {
	return execFileSync("git", args, {
		cwd: ROOT,
		encoding: "utf-8",
		timeout: 30000,
	}).trim();
}

function gitOrNull(...args) {
	try {
		return git(...args);
	} catch {
		return null;
	}
}

function gitStatusEntries() {
	const status = git("status", "--porcelain");
	if (!status) return [];

	return status
		.split("\n")
		.filter(Boolean)
		.map((line) => ({
			code: line.slice(0, 2),
			path: line.slice(3),
		}));
}

function revertPaths(paths) {
	if (paths.length === 0) return;
	for (const path of paths) {
		const spec = path.endsWith("/") ? path.slice(0, -1) : path;
		if (pathExistsInRef("HEAD", spec)) {
			git("checkout", "HEAD", "--", spec);
		}
		const expected = new Set(refFiles("HEAD", path));
		for (const file of trackedFiles(path)) {
			if (!expected.has(file)) removeManagedFile(file, new Set());
		}
	}
}

function addPaths(paths) {
	const addable = paths.filter(
		(path) => existsSync(join(ROOT, path)) || isTrackedPath(path),
	);
	if (addable.length === 0) return;
	git("add", "-A", "--", ...addable);
}

function resolveUpdateTarget() {
	const remoteUrl = gitOrNull("remote", "get-url", UPDATE_REMOTE);
	if (remoteUrl) {
		return { ref: UPDATE_REMOTE, url: remoteUrl };
	}

	return { ref: CANONICAL_REPO, url: CANONICAL_REPO };
}

function extractTagVersion(ref) {
	const match = ref.match(/refs\/tags\/(?:.*?-)?v?(\d+\.\d+\.\d+)$/);
	return match ? match[1] : null;
}

function latestRemoteTagVersion() {
	const target = resolveUpdateTarget();
	const refs = gitOrNull("ls-remote", "--refs", "--tags", target.ref);
	if (!refs) return null;

	const versions = refs
		.split("\n")
		.map((line) => line.trim().split(/\s+/)[1] || "")
		.map(extractTagVersion)
		.filter(Boolean);

	if (versions.length === 0) return null;
	return versions.sort(compareVersions).at(-1);
}

function readVersionFromGitRef(ref) {
	const text = gitOrNull("show", `${ref}:${VERSION_PATH}`);
	if (!text) return null;

	const version = text.trim();
	return isSemver(version) ? version : null;
}

async function latestRemoteVersion() {
	const versions = [];

	const tagVersion = latestRemoteTagVersion();
	if (tagVersion) versions.push(tagVersion);

	try {
		const res = await fetch(RAW_VERSION_URL);
		if (res.ok) {
			const version = (await res.text()).trim();
			if (isSemver(version)) versions.push(version);
		}
	} catch {
		// Keep using any version found through git tags.
	}

	try {
		const res = await fetch(RELEASES_API, {
			headers: { Accept: "application/vnd.github.v3+json" },
		});
		if (res.ok) {
			const release = await res.json();
			const tagVersion = extractTagVersion(
				`refs/tags/${String(release.tag_name || "").trim()}`,
			);
			if (tagVersion) versions.push(tagVersion);
		}
	} catch {
		// Release metadata is optional.
	}

	if (versions.length === 0) return null;
	return versions.sort(compareVersions).at(-1);
}

function writeCanonicalVersion(version, updatedPaths) {
	if (!version || !isSemver(version)) return;

	const versionFile = join(ROOT, VERSION_PATH);
	const current = existsSync(versionFile)
		? readFileSync(versionFile, "utf-8").trim()
		: null;
	if (current !== version) {
		writeFileSync(versionFile, `${version}\n`);
	}
	updatedPaths.add(VERSION_PATH);
}

function isUserPath(file) {
	// System-managed example files can live under otherwise user-owned prefixes
	// such as data/ or interview-prep/. Treat explicit update targets as system
	// paths first so the updater can ship them safely.
	if (isUpdateTargetPath(file)) return false;
	return USER_PATHS.some((path) => file === path || file.startsWith(path));
}

function updateTargets() {
	return new Set([
		...SYSTEM_PATHS,
		...REMOVED_SYSTEM_PATHS,
		...REMAPPED_SYSTEM_FILES.map(({ dest }) => dest),
	]);
}

function mergeUniquePaths(...lists) {
	return [...new Set(lists.flat().filter(Boolean))];
}

function readUpdateManifest(ref) {
	const manifestPath = "scripts/update-manifest.json";
	if (!pathExistsInRef(ref, manifestPath)) {
		return {
			schemaVersion: 1,
			systemPaths: [],
			requiredPaths: [],
			migrations: [],
		};
	}
	let manifest;
	try {
		manifest = JSON.parse(
			execFileSync("git", ["show", `${ref}:${manifestPath}`], {
				cwd: ROOT,
				encoding: "utf8",
			}),
		);
	} catch (error) {
		throw new Error(`Invalid target update manifest: ${error.message}`);
	}
	if (
		manifest?.schemaVersion !== 1 ||
		!Array.isArray(manifest.systemPaths) ||
		!Array.isArray(manifest.requiredPaths) ||
		!Array.isArray(manifest.migrations)
	) {
		throw new Error("Invalid target update manifest schema");
	}
	for (const path of [
		...manifest.systemPaths,
		...manifest.requiredPaths,
		...manifest.migrations.map((migration) => migration.path),
	].filter(Boolean)) {
		if (
			typeof path !== "string" ||
			path.startsWith("/") ||
			path.includes("..") ||
			isUserPath(path)
		) {
			throw new Error(`Unsafe path in target update manifest: ${path}`);
		}
	}
	return manifest;
}

function relativeImportSpecifiers(source) {
	const specifiers = new Set();
	for (const pattern of [
		/\b(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
		/\bimport\s*['"]([^'"]+)['"]/g,
	]) {
		for (const match of source.matchAll(pattern)) {
			if (match[1].startsWith(".")) specifiers.add(match[1]);
		}
	}
	return [...specifiers];
}

function resolveImportClosure(ref, entry) {
	const visited = new Set();
	const present = [];
	const queue = [entry];
	while (queue.length > 0) {
		const file = queue.shift();
		if (visited.has(file)) continue;
		visited.add(file);
		if (!pathExistsInRef(ref, file)) continue;
		const source = execFileSync("git", ["show", `${ref}:${file}`], {
			cwd: ROOT,
			encoding: "utf8",
		});
		present.push(file);
		const directory = pathPosix.dirname(file);
		for (const specifier of relativeImportSpecifiers(source)) {
			const candidate = pathPosix.normalize(
				pathPosix.join(directory, specifier),
			);
			if (!candidate.startsWith("../") && candidate !== "..") {
				queue.push(candidate);
			}
		}
	}
	return present;
}

function refFiles(ref, path) {
	const spec = path.endsWith("/") ? path.slice(0, -1) : path;
	const output = execFileSync(
		"git",
		["ls-tree", "-r", "--name-only", ref, "--", spec],
		{ cwd: ROOT, encoding: "utf8" },
	).trim();
	return output ? output.split("\n").filter(Boolean) : [];
}

function trackedFiles(path) {
	const spec = path.endsWith("/") ? path.slice(0, -1) : path;
	const output = execFileSync("git", ["ls-files", "--", spec], {
		cwd: ROOT,
		encoding: "utf8",
	}).trim();
	return output ? output.split("\n").filter(Boolean) : [];
}

function removeManagedFile(path, updatedPaths) {
	try {
		git("rm", "-f", "--ignore-unmatch", "--", path);
	} catch {
		rmSync(join(ROOT, path), { recursive: true, force: true });
	}
	updatedPaths.add(path);
}

function verifyRequiredPaths(ref, requiredPaths) {
	const missing = [];
	for (const path of requiredPaths) {
		if (!pathExistsInRef(ref, path)) {
			throw new Error(`Target manifest requires missing ref path: ${path}`);
		}
		const expected = refFiles(ref, path);
		if (expected.length > 0) {
			if (expected.some((file) => !existsSync(join(ROOT, file)))) {
				missing.push(path);
			}
		} else if (!existsSync(join(ROOT, path))) {
			missing.push(path);
		}
	}
	if (missing.length > 0) {
		throw new Error(
			`Update checkout incomplete; missing required paths: ${missing.join(", ")}`,
		);
	}
}

function runManifestMigrations(manifest, updatedPaths) {
	for (const migration of manifest.migrations) {
		if (
			migration?.operation !== "remove-system-path" ||
			typeof migration.path !== "string"
		) {
			throw new Error(
				`Unsupported update migration: ${JSON.stringify(migration)}`,
			);
		}
		if (!isUpdateTargetPath(migration.path)) {
			throw new Error(
				`Migration path is not update-managed: ${migration.path}`,
			);
		}
		if (existsSync(join(ROOT, migration.path))) {
			removeManagedFile(migration.path, updatedPaths);
		}
	}
}

function isUpdateTargetPath(file) {
	for (const target of updateTargets()) {
		if (target.endsWith("/")) {
			if (file.startsWith(target)) return true;
			continue;
		}

		if (file === target) return true;
	}

	return false;
}

function dirtyUpdateTargets() {
	return gitStatusEntries()
		.map((entry) => entry.path)
		.filter((path) => !isUserPath(path))
		.filter(isUpdateTargetPath);
}

function pathExistsInRef(ref, path) {
	try {
		execFileSync("git", ["cat-file", "-e", `${ref}:${path}`], {
			cwd: ROOT,
			stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
}

function isTrackedPath(path) {
	try {
		execFileSync("git", ["ls-files", "--error-unmatch", path], {
			cwd: ROOT,
			stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
}

function checkoutSystemFilesFromRef(
	ref,
	updatedPaths,
	{ systemPaths = SYSTEM_PATHS, pruneMissingDirectories = false } = {},
) {
	for (const path of systemPaths) {
		const desiredFiles = refFiles(ref, path);
		const currentFiles = trackedFiles(path);
		const existsInRef = pathExistsInRef(
			ref,
			path.endsWith("/") ? path.slice(0, -1) : path,
		);
		if (existsInRef) {
			git("checkout", ref, "--", path);
			updatedPaths.add(path);
		}
		if (
			path.endsWith("/") &&
			(desiredFiles.length > 0 || pruneMissingDirectories)
		) {
			const desired = new Set(desiredFiles);
			for (const file of currentFiles) {
				if (!desired.has(file)) removeManagedFile(file, updatedPaths);
			}
		}
	}

	for (const path of REMOVED_SYSTEM_PATHS) {
		if (pathExistsInRef(ref, path)) {
			try {
				git("checkout", ref, "--", path);
				updatedPaths.add(path);
			} catch {
				// File may not exist in the source ref.
			}
			continue;
		}

		const destination = join(ROOT, path);
		if (!existsSync(destination) || !isTrackedPath(path)) {
			continue;
		}

		unlinkSync(destination);
		updatedPaths.add(path);
	}

	for (const { source, dest } of REMAPPED_SYSTEM_FILES) {
		if (pathExistsInRef(ref, source)) {
			const content = execFileSync("git", ["show", `${ref}:${source}`], {
				cwd: ROOT,
			});
			const destination = join(ROOT, dest);
			mkdirSync(dirname(destination), { recursive: true });
			writeFileSync(destination, content);
			updatedPaths.add(dest);
		}
	}
}

// -- CHECK -------------------------------------------------------

async function check() {
	// Respect dismiss flag
	if (existsSync(join(ROOT, ".update-dismissed"))) {
		console.log(JSON.stringify({ status: "dismissed" }));
		return;
	}

	const local = localVersion();
	let remote;

	try {
		remote = await latestRemoteVersion();
		if (!remote) throw new Error("no remote version");
	} catch {
		console.log(JSON.stringify({ status: "offline", local }));
		return;
	}

	if (compareVersions(local, remote) >= 0) {
		console.log(JSON.stringify({ status: "up-to-date", local, remote }));
		return;
	}

	// Fetch changelog from GitHub releases
	let changelog = "";
	try {
		const res = await fetch(RELEASES_API, {
			headers: { Accept: "application/vnd.github.v3+json" },
		});
		if (res.ok) {
			const release = await res.json();
			changelog = release.body || "";
		}
	} catch {
		// No changelog available, that's OK
	}

	console.log(
		JSON.stringify({
			status: "update-available",
			local,
			remote,
			changelog: changelog.slice(0, 500),
		}),
	);
}

// -- APPLY -------------------------------------------------------

async function apply() {
	const local = localVersion();
	const initialStatusPaths = new Set(
		gitStatusEntries().map((entry) => entry.path),
	);
	const dirtyTargets = dirtyUpdateTargets();

	if (dirtyTargets.length > 0) {
		console.error(
			"Refusing to update with local changes in update-managed files:",
		);
		for (const path of dirtyTargets) {
			console.error(`- ${path}`);
		}
		console.error("Commit, stash, or clean those paths first.");
		process.exit(1);
	}

	// Check for lock
	const lockFile = join(ROOT, ".update-lock");
	if (existsSync(lockFile)) {
		console.error(
			"Update already in progress (.update-lock exists). If stuck, delete it manually.",
		);
		process.exit(1);
	}

	// Create lock
	writeFileSync(lockFile, new Date().toISOString());
	const updated = new Set();

	try {
		// 1. Backup: create branch
		const backupBranch = `backup-pre-update-${local}`;
		try {
			git("branch", backupBranch);
			console.log(`Backup branch created: ${backupBranch}`);
		} catch {
			console.log(
				`Backup branch already exists (${backupBranch}), continuing...`,
			);
		}

		// 2. Fetch from the configured update source.
		console.log("Fetching latest from update source...");
		git("fetch", resolveUpdateTarget().ref, "main");

		// 3. Checkout system files only
		console.log("Updating system files...");
		const manifest = readUpdateManifest("FETCH_HEAD");
		const systemPaths = mergeUniquePaths(SYSTEM_PATHS, manifest.systemPaths, [
			"scripts/update-manifest.json",
		]);
		for (const path of resolveImportClosure(
			"FETCH_HEAD",
			"scripts/update-system.mjs",
		)) {
			if (isUserPath(path)) {
				throw new Error(`Unsafe updater import path: ${path}`);
			}
			git("checkout", "FETCH_HEAD", "--", path);
			updated.add(path);
		}
		checkoutSystemFilesFromRef("FETCH_HEAD", updated, { systemPaths });
		runManifestMigrations(manifest, updated);
		verifyRequiredPaths("FETCH_HEAD", manifest.requiredPaths);
		writeCanonicalVersion(readVersionFromGitRef("FETCH_HEAD"), updated);

		// 4. Validate: check NO user files were touched
		let userFileTouched = false;
		try {
			for (const entry of gitStatusEntries()) {
				const file = entry.path;
				if (initialStatusPaths.has(file)) continue;
				if (isUserPath(file)) {
					console.error(`SAFETY VIOLATION: User file was modified: ${file}`);
					userFileTouched = true;
				}
			}
		} catch {
			// git status failed, skip validation
		}

		if (userFileTouched) {
			throw new Error("User files were touched");
		}

		// 5. Install any new dependencies
		try {
			execSync("npm install --silent", { cwd: ROOT, timeout: 60000 });
		} catch {
			console.log("npm install skipped (may need manual run)");
		}

		// 6. Commit the update
		const updatedVersion = localVersion(); // Re-read after normalization
		try {
			const pathsToStage = [...updated];
			const dismissFile = join(ROOT, ".update-dismissed");
			if (existsSync(dismissFile)) {
				unlinkSync(dismissFile);
				pathsToStage.push(".update-dismissed");
			}
			addPaths(pathsToStage);
			git(
				"commit",
				"-m",
				`chore: auto-update system files to v${updatedVersion}`,
			);
		} catch {
			// Nothing to commit (already up to date)
		}

		console.log(`\nUpdate complete: v${local} -> v${updatedVersion}`);
		console.log(`Updated ${updated.size} system paths.`);
		console.log("Rollback available: node scripts/update-system.mjs rollback");
	} catch (error) {
		if (updated.size > 0) {
			console.error("Update failed; restoring pre-update system files...");
			revertPaths([...updated]);
		}
		console.error(`Update failed: ${error.message}`);
		process.exitCode = 1;
	} finally {
		// Remove lock
		if (existsSync(lockFile)) unlinkSync(lockFile);
	}
}

// -- ROLLBACK ----------------------------------------------------

function rollback() {
	// Find most recent backup branch
	try {
		const branches = git(
			"for-each-ref",
			"--sort=-committerdate",
			"--format=%(refname:short)",
			"refs/heads/backup-pre-update-*",
		);
		const branchList = branches
			.split("\n")
			.map((b) => b.trim())
			.filter(Boolean);

		if (branchList.length === 0) {
			console.error("No backup branches found. Nothing to rollback.");
			process.exit(1);
		}

		const latest = branchList[0];
		console.log(`Rolling back to: ${latest}`);

		// Checkout system files from backup branch
		const updated = new Set();
		const manifest = readUpdateManifest(latest);
		const systemPaths = mergeUniquePaths(SYSTEM_PATHS, manifest.systemPaths, [
			"scripts/update-manifest.json",
		]);
		checkoutSystemFilesFromRef(latest, updated, {
			systemPaths,
			pruneMissingDirectories: true,
		});
		verifyRequiredPaths(latest, manifest.requiredPaths);
		writeCanonicalVersion(readVersionFromGitRef(latest), updated);

		addPaths([...updated]);
		git("commit", "-m", `chore: rollback system files from ${latest}`);

		console.log(`Rollback complete. System files restored from ${latest}.`);
		console.log("Your data (CV, profile, tracker, reports) was not affected.");
	} catch (err) {
		console.error("Rollback failed:", err.message);
		process.exit(1);
	}
}

// -- DISMISS -----------------------------------------------------

function dismiss() {
	writeFileSync(join(ROOT, ".update-dismissed"), new Date().toISOString());
	console.log(
		'Update check dismissed. Run "node scripts/update-system.mjs check" or say "check for updates" to re-enable.',
	);
}

// -- MAIN --------------------------------------------------------

const cmd = process.argv[2] || "check";

switch (cmd) {
	case "check":
		await check();
		break;
	case "apply":
		await apply();
		break;
	case "rollback":
		rollback();
		break;
	case "dismiss":
		dismiss();
		break;
	default:
		console.log(
			"Usage: node scripts/update-system.mjs [check|apply|rollback|dismiss]",
		);
		process.exit(1);
}

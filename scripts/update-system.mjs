#!/usr/bin/env node

/**
 * update-system.mjs - Safe auto-updater for career-ops
 *
 * Updates ONLY system layer files (modes, scripts, dashboard, templates).
 * NEVER touches user data (cv.md, profile.yml, _profile.md, data/, reports/).
 *
 * Usage:
 *   node scripts/update-system.mjs check      # Check if update available
 *   node scripts/update-system.mjs apply      # Apply update (after user confirms)
 *   node scripts/update-system.mjs rollback   # Rollback last update
 *   node scripts/update-system.mjs dismiss    # Dismiss update check
 *
 * See docs/DATA_CONTRACT.md for the full system/user layer definitions.
 */

import { execFileSync, execSync } from 'child_process';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
} from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const UPSTREAM_REMOTE = 'upstream';
const CANONICAL_REPO = 'https://github.com/santifer/career-ops.git';
const RAW_VERSION_URL =
  'https://raw.githubusercontent.com/santifer/career-ops/main/VERSION';
const RELEASES_API =
  'https://api.github.com/repos/santifer/career-ops/releases/latest';
const VERSION_PATH = 'VERSION';

// System layer paths - ONLY these files get updated
const SYSTEM_PATHS = [
  'modes/_shared.md',
  'modes/_profile.template.md',
  'modes/oferta.md',
  'modes/pdf.md',
  'modes/scan.md',
  'modes/batch.md',
  'modes/apply.md',
  'modes/auto-pipeline.md',
  'modes/contacto.md',
  'modes/deep.md',
  'modes/ofertas.md',
  'modes/pipeline.md',
  'modes/project.md',
  'modes/tracker.md',
  'modes/training.md',
  'modes/de/',
  'AGENTS.md',
  'batch/batch-prompt.md',
  'batch/batch-runner.sh',
  'dashboard/',
  'templates/',
  'fonts/',
  '.codex/skills/',
  'docs/',
  'VERSION',
  'README.md',
  'LICENSE',
  '.github/',
  'package.json',
];

const REMAPPED_SYSTEM_FILES = [
  { source: 'analyze-patterns.mjs', dest: 'scripts/analyze-patterns.mjs' },
  { source: 'check-liveness.mjs', dest: 'scripts/check-liveness.mjs' },
  { source: 'cv-sync-check.mjs', dest: 'scripts/cv-sync-check.mjs' },
  { source: 'dedup-tracker.mjs', dest: 'scripts/dedup-tracker.mjs' },
  { source: 'doctor.mjs', dest: 'scripts/doctor.mjs' },
  { source: 'followup-cadence.mjs', dest: 'scripts/followup-cadence.mjs' },
  { source: 'generate-pdf.mjs', dest: 'scripts/generate-pdf.mjs' },
  { source: 'liveness-core.mjs', dest: 'scripts/liveness-core.mjs' },
  { source: 'merge-tracker.mjs', dest: 'scripts/merge-tracker.mjs' },
  { source: 'normalize-statuses.mjs', dest: 'scripts/normalize-statuses.mjs' },
  { source: 'scan.mjs', dest: 'scripts/scan.mjs' },
  { source: 'test-all.mjs', dest: 'scripts/test-all.mjs' },
  { source: 'update-system.mjs', dest: 'scripts/update-system.mjs' },
  { source: 'verify-pipeline.mjs', dest: 'scripts/verify-pipeline.mjs' },
];

// User layer paths - NEVER touch these (safety check)
const USER_PATHS = [
  'cv.md',
  'config/profile.yml',
  'modes/_profile.md',
  'portals.yml',
  'article-digest.md',
  'interview-prep/story-bank.md',
  'data/',
  'reports/',
  'output/',
  'jds/',
];

function readText(path) {
  return readFileSync(join(ROOT, path), 'utf-8').trim();
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
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf-8',
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
  const status = git('status', '--porcelain');
  if (!status) return [];

  return status
    .split('\n')
    .filter(Boolean)
    .map((line) => ({
      code: line.slice(0, 2),
      path: line.slice(3),
    }));
}

function revertPaths(paths) {
  if (paths.length === 0) return;
  git('checkout', '--', ...paths);
}

function addPaths(paths) {
  if (paths.length === 0) return;
  git('add', '--', ...paths);
}

function resolveUpstreamTarget() {
  const remoteUrl = gitOrNull('remote', 'get-url', UPSTREAM_REMOTE);
  if (remoteUrl) {
    return { ref: UPSTREAM_REMOTE, url: remoteUrl };
  }

  return { ref: CANONICAL_REPO, url: CANONICAL_REPO };
}

function extractTagVersion(ref) {
  const match = ref.match(/refs\/tags\/v?(\d+\.\d+\.\d+)$/);
  return match ? match[1] : null;
}

function latestRemoteTagVersion() {
  const target = resolveUpstreamTarget();
  const refs = gitOrNull('ls-remote', '--refs', '--tags', target.ref);
  if (!refs) return null;

  const versions = refs
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[1] || '')
    .map(extractTagVersion)
    .filter(Boolean);

  if (versions.length === 0) return null;
  return versions.sort(compareVersions).at(-1);
}

function readVersionFromGitRef(ref) {
  const text = gitOrNull('show', `${ref}:${VERSION_PATH}`);
  if (!text) return null;

  const version = text.trim();
  return isSemver(version) ? version : null;
}

function writeCanonicalVersion(version, updatedPaths) {
  if (!version || !isSemver(version)) return;

  const versionFile = join(ROOT, VERSION_PATH);
  const current = existsSync(versionFile)
    ? readFileSync(versionFile, 'utf-8').trim()
    : null;
  if (current !== version) {
    writeFileSync(versionFile, `${version}\n`);
  }
  updatedPaths.add(VERSION_PATH);
}

function isUserPath(file) {
  return USER_PATHS.some((path) => file === path || file.startsWith(path));
}

function updateTargets() {
  return new Set([
    ...SYSTEM_PATHS,
    ...REMAPPED_SYSTEM_FILES.map(({ dest }) => dest),
  ]);
}

function isUpdateTargetPath(file) {
  for (const target of updateTargets()) {
    if (target.endsWith('/')) {
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

function checkoutSystemFilesFromRef(ref, updatedPaths) {
  for (const path of SYSTEM_PATHS) {
    try {
      git('checkout', ref, '--', path);
      updatedPaths.add(path);
    } catch {
      // File may not exist in the source ref.
    }
  }

  for (const { source, dest } of REMAPPED_SYSTEM_FILES) {
    try {
      const content = execFileSync('git', ['show', `${ref}:${source}`], {
        cwd: ROOT,
      });
      const destination = join(ROOT, dest);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, content);
      updatedPaths.add(dest);
    } catch {
      // File may not exist in the source ref.
    }
  }
}

// -- CHECK -------------------------------------------------------

async function check() {
  // Respect dismiss flag
  if (existsSync(join(ROOT, '.update-dismissed'))) {
    console.log(JSON.stringify({ status: 'dismissed' }));
    return;
  }

  const local = localVersion();
  let remote;

  try {
    remote = latestRemoteTagVersion();
    if (!remote) {
      const res = await fetch(RAW_VERSION_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      remote = (await res.text()).trim();
    }
  } catch {
    console.log(JSON.stringify({ status: 'offline', local }));
    return;
  }

  if (compareVersions(local, remote) >= 0) {
    console.log(JSON.stringify({ status: 'up-to-date', local, remote }));
    return;
  }

  // Fetch changelog from GitHub releases
  let changelog = '';
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (res.ok) {
      const release = await res.json();
      changelog = release.body || '';
    }
  } catch {
    // No changelog available, that's OK
  }

  console.log(
    JSON.stringify({
      status: 'update-available',
      local,
      remote,
      changelog: changelog.slice(0, 500),
    }),
  );
}

// -- APPLY -------------------------------------------------------

async function apply() {
  const local = localVersion();
  const remote = latestRemoteTagVersion();
  const initialStatusPaths = new Set(
    gitStatusEntries().map((entry) => entry.path),
  );
  const dirtyTargets = dirtyUpdateTargets();

  if (dirtyTargets.length > 0) {
    console.error(
      'Refusing to update with local changes in update-managed files:',
    );
    for (const path of dirtyTargets) {
      console.error(`- ${path}`);
    }
    console.error('Commit, stash, or clean those paths first.');
    process.exit(1);
  }

  // Check for lock
  const lockFile = join(ROOT, '.update-lock');
  if (existsSync(lockFile)) {
    console.error(
      'Update already in progress (.update-lock exists). If stuck, delete it manually.',
    );
    process.exit(1);
  }

  // Create lock
  writeFileSync(lockFile, new Date().toISOString());

  try {
    // 1. Backup: create branch
    const backupBranch = `backup-pre-update-${local}`;
    try {
      git('branch', backupBranch);
      console.log(`Backup branch created: ${backupBranch}`);
    } catch {
      console.log(
        `Backup branch already exists (${backupBranch}), continuing...`,
      );
    }

    // 2. Fetch from canonical repo
    console.log('Fetching latest from upstream...');
    git('fetch', resolveUpstreamTarget().ref, 'main');

    // 3. Checkout system files only
    console.log('Updating system files...');
    const updated = new Set();
    checkoutSystemFilesFromRef('FETCH_HEAD', updated);
    writeCanonicalVersion(
      remote || readVersionFromGitRef('FETCH_HEAD'),
      updated,
    );

    // 4. Validate: check NO user files were touched
    let userFileTouched = false;
    try {
      for (const entry of gitStatusEntries()) {
        const file = entry.path;
        if (initialStatusPaths.has(file)) continue;
        for (const userPath of USER_PATHS) {
          if (file.startsWith(userPath)) {
            console.error(`SAFETY VIOLATION: User file was modified: ${file}`);
            userFileTouched = true;
          }
        }
      }
    } catch {
      // git status failed, skip validation
    }

    if (userFileTouched) {
      console.error('Aborting: user files were touched. Rolling back...');
      revertPaths([...updated]);
      process.exit(1);
    }

    // 5. Install any new dependencies
    try {
      execSync('npm install --silent', { cwd: ROOT, timeout: 60000 });
    } catch {
      console.log('npm install skipped (may need manual run)');
    }

    // 6. Commit the update
    const updatedVersion = localVersion(); // Re-read after normalization
    try {
      const pathsToStage = [...updated];
      const dismissFile = join(ROOT, '.update-dismissed');
      if (existsSync(dismissFile)) {
        unlinkSync(dismissFile);
        pathsToStage.push('.update-dismissed');
      }
      addPaths(pathsToStage);
      git(
        'commit',
        '-m',
        `chore: auto-update system files to v${updatedVersion}`,
      );
    } catch {
      // Nothing to commit (already up to date)
    }

    console.log(`\nUpdate complete: v${local} -> v${updatedVersion}`);
    console.log(`Updated ${updated.size} system paths.`);
    console.log('Rollback available: node scripts/update-system.mjs rollback');
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
      'for-each-ref',
      '--sort=-committerdate',
      '--format=%(refname:short)',
      'refs/heads/backup-pre-update-*',
    );
    const branchList = branches
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    if (branchList.length === 0) {
      console.error('No backup branches found. Nothing to rollback.');
      process.exit(1);
    }

    const latest = branchList[0];
    console.log(`Rolling back to: ${latest}`);

    // Checkout system files from backup branch
    const updated = new Set();
    checkoutSystemFilesFromRef(latest, updated);
    writeCanonicalVersion(readVersionFromGitRef(latest), updated);

    addPaths([...updated]);
    git('commit', '-m', `chore: rollback system files from ${latest}`);

    console.log(`Rollback complete. System files restored from ${latest}.`);
    console.log('Your data (CV, profile, tracker, reports) was not affected.');
  } catch (err) {
    console.error('Rollback failed:', err.message);
    process.exit(1);
  }
}

// -- DISMISS -----------------------------------------------------

function dismiss() {
  writeFileSync(join(ROOT, '.update-dismissed'), new Date().toISOString());
  console.log(
    'Update check dismissed. Run "node scripts/update-system.mjs check" or say "check for updates" to re-enable.',
  );
}

// -- MAIN --------------------------------------------------------

const cmd = process.argv[2] || 'check';

switch (cmd) {
  case 'check':
    await check();
    break;
  case 'apply':
    await apply();
    break;
  case 'rollback':
    rollback();
    break;
  case 'dismiss':
    dismiss();
    break;
  default:
    console.log(
      'Usage: node scripts/update-system.mjs [check|apply|rollback|dismiss]',
    );
    process.exit(1);
}

#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const APP_STATE_ROOT = join(ROOT, '.jobhunt-app');

function run(command, args) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), 'utf-8'));
}

function readText(relativePath) {
  return readFileSync(join(ROOT, relativePath), 'utf-8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function snapshotFile(relativePath) {
  const absolutePath = join(ROOT, relativePath);

  return {
    relativePath,
    exists: existsSync(absolutePath),
    contents: existsSync(absolutePath)
      ? readFileSync(absolutePath, 'utf-8')
      : undefined,
  };
}

const userLayerSnapshots = [
  'profile/cv.md',
  'profile/article-digest.md',
  'config/profile.yml',
  'config/portals.yml',
  'modes/_profile.md',
  'data/applications.md',
  'data/pipeline.md',
  'data/follow-ups.md',
].map(snapshotFile);

const appStateExistedBefore = existsSync(APP_STATE_ROOT);
const appStateStatBefore = appStateExistedBefore ? statSync(APP_STATE_ROOT) : null;

const rootPackage = readJson('package.json');
const webPackage = readJson('apps/web/package.json');
const apiPackage = readJson('apps/api/package.json');
const lockfile = readJson('package-lock.json');
const gitignore = readText('.gitignore');

assert(
  Array.isArray(rootPackage.workspaces) &&
    rootPackage.workspaces.includes('apps/web') &&
    rootPackage.workspaces.includes('apps/api'),
  'Root package.json is missing the app workspace declarations.',
);

for (const scriptName of [
  'app:web:dev',
  'app:web:build',
  'app:web:check',
  'app:api:dev',
  'app:api:build',
  'app:api:check',
  'app:check',
]) {
  assert(
    typeof rootPackage.scripts?.[scriptName] === 'string',
    `Root package.json is missing script: ${scriptName}`,
  );
}

assert(webPackage.name === '@jobhunt/web', 'Unexpected web workspace package name.');
assert(apiPackage.name === '@jobhunt/api', 'Unexpected API workspace package name.');
assert(lockfile.packages['apps/web'], 'package-lock.json is missing the apps/web workspace entry.');
assert(lockfile.packages['apps/api'], 'package-lock.json is missing the apps/api workspace entry.');

for (const ignoredPath of ['.jobhunt-app/', 'apps/web/dist/', 'apps/api/dist/']) {
  assert(
    gitignore.includes(ignoredPath),
    `.gitignore is missing scaffold ignore rule: ${ignoredPath}`,
  );
}

run('npm', ['run', 'app:check']);
run('npm', ['run', 'app:api:build']);
run('npm', ['run', 'app:web:build']);

assert(
  existsSync(join(ROOT, 'apps', 'api', 'dist', 'index.js')),
  'API scaffold build did not produce apps/api/dist/index.js.',
);
assert(
  existsSync(join(ROOT, 'apps', 'web', 'dist', 'index.html')),
  'Web scaffold build did not produce apps/web/dist/index.html.',
);

const diagnostics = JSON.parse(run('node', ['apps/api/dist/index.js']));

assert(
  diagnostics.service === 'jobhunt-api-scaffold',
  'API scaffold diagnostics reported an unexpected service name.',
);
assert(
  diagnostics.sessionId === 'phase00-session02-workspace-adapter-contract',
  'API scaffold diagnostics reported an unexpected session id.',
);
assert(
  diagnostics.appStateRootPath === APP_STATE_ROOT,
  'API scaffold diagnostics reported an unexpected app state root path.',
);
assert(
  diagnostics.appStateRootExists === appStateExistedBefore,
  'API scaffold diagnostics changed app-state existence unexpectedly.',
);
assert(
  diagnostics.mutationPolicy === 'app-owned-only',
  'API scaffold diagnostics reported an unexpected mutation policy.',
);
assert(
  diagnostics.userLayerWrites === 'disabled',
  'API scaffold diagnostics reported an unexpected user-layer policy.',
);
assert(
  Array.isArray(diagnostics.onboardingMissing),
  'API scaffold diagnostics did not include onboarding-missing details.',
);
assert(
  Array.isArray(diagnostics.runtimeMissing),
  'API scaffold diagnostics did not include runtime-missing details.',
);

if (!appStateExistedBefore) {
  assert(
    !existsSync(APP_STATE_ROOT),
    '.jobhunt-app was created by scaffold checks without explicit bootstrap.',
  );
} else {
  const appStateStatAfter = statSync(APP_STATE_ROOT);
  assert(
    appStateStatBefore !== null &&
      appStateStatAfter.mtimeMs === appStateStatBefore.mtimeMs,
    '.jobhunt-app was modified by scaffold checks unexpectedly.',
  );
}

for (const snapshot of userLayerSnapshots) {
  const absolutePath = join(ROOT, snapshot.relativePath);
  const existsAfter = existsSync(absolutePath);

  assert(
    existsAfter === snapshot.exists,
    `Scaffold commands changed file existence for ${snapshot.relativePath}.`,
  );

  if (snapshot.exists) {
    const contentsAfter = readFileSync(absolutePath, 'utf-8');
    assert(
      contentsAfter === snapshot.contents,
      `Scaffold commands mutated user-layer file contents: ${snapshot.relativePath}.`,
    );
  }
}

console.log('App scaffold regression checks passed.');

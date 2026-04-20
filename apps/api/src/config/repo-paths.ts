import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_REPO_ANCHORS = [
  'AGENTS.md',
  join('docs', 'DATA_CONTRACT.md'),
  'package.json',
] as const;

export const APP_STATE_DIRNAME = '.jobhunt-app';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repoRootCache = new Map<string, string>();

export class RepoRootResolutionError extends Error {
  constructor(attemptedRoots: string[]) {
    super(
      `Unable to resolve repo root from ${moduleDirectory}. Missing anchors: ${REQUIRED_REPO_ANCHORS.join(', ')}. Checked: ${attemptedRoots.join(' -> ')}`,
    );
    this.name = 'RepoRootResolutionError';
  }
}

export class RepoRelativePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepoRelativePathError';
  }
}

export type RepoPathOptions = {
  repoRoot?: string;
  startDirectory?: string;
};

export type RepoDirectoryPaths = {
  apiPackagePath: string;
  appsPath: string;
  batchPath: string;
  configPath: string;
  dashboardPath: string;
  dataPath: string;
  docsPath: string;
  interviewPrepPath: string;
  jdsPath: string;
  modesPath: string;
  outputPath: string;
  profilePath: string;
  reportsPath: string;
  scriptsPath: string;
  specSystemPath: string;
  templatesPath: string;
  webPackagePath: string;
};

export type RepoPaths = {
  repoRoot: string;
  agentsGuidePath: string;
  dataContractPath: string;
  appStateRootPath: string;
  packageJsonPath: string;
  directories: RepoDirectoryPaths;
};

function hasRepoAnchors(candidateRoot: string): boolean {
  return REQUIRED_REPO_ANCHORS.every((anchor) =>
    existsSync(join(candidateRoot, anchor)),
  );
}

function listCandidateRoots(startDirectory: string): string[] {
  const candidates: string[] = [];
  let currentDirectory = resolve(startDirectory);

  while (true) {
    candidates.push(currentDirectory);

    const parentDirectory = resolve(currentDirectory, '..');
    if (parentDirectory === currentDirectory) {
      return candidates;
    }

    currentDirectory = parentDirectory;
  }
}

let cachedRepoRoot: string | undefined;

function isPathInside(basePath: string, candidatePath: string): boolean {
  const relativePath = relative(basePath, candidatePath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}

export function assertRepoRoot(candidateRoot: string): string {
  const resolvedRoot = resolve(candidateRoot);

  if (!hasRepoAnchors(resolvedRoot)) {
    throw new RepoRootResolutionError([resolvedRoot]);
  }

  return resolvedRoot;
}

export function resolveRepoRoot(startDirectory: string = moduleDirectory): string {
  const resolvedStartDirectory = resolve(startDirectory);
  const cachedRoot = repoRootCache.get(resolvedStartDirectory);

  if (cachedRoot) {
    return cachedRoot;
  }

  const candidates = listCandidateRoots(resolvedStartDirectory);
  const repoRoot = candidates.find(hasRepoAnchors);

  if (!repoRoot) {
    throw new RepoRootResolutionError(candidates);
  }

  cachedRepoRoot = repoRoot;
  repoRootCache.set(resolvedStartDirectory, repoRoot);
  return repoRoot;
}

export function resolveFromRepoRoot(...segments: string[]): string {
  return join(resolveRepoRoot(), ...segments);
}

export function normalizeRepoRelativePath(repoRelativePath: string): string {
  if (!repoRelativePath.trim()) {
    throw new RepoRelativePathError('Repo-relative path cannot be empty.');
  }

  if (isAbsolute(repoRelativePath)) {
    throw new RepoRelativePathError(
      `Expected a repo-relative path, received absolute path: ${repoRelativePath}`,
    );
  }

  const normalizedPath = normalize(repoRelativePath).replace(/\\/g, '/');
  const withoutDotPrefix = normalizedPath.replace(/^\.\//, '');

  if (!withoutDotPrefix || withoutDotPrefix === '.') {
    throw new RepoRelativePathError(
      'Repo-relative path cannot resolve to the repo root.',
    );
  }

  if (
    withoutDotPrefix === '..' ||
    withoutDotPrefix.startsWith('../') ||
    withoutDotPrefix.includes('/../')
  ) {
    throw new RepoRelativePathError(
      `Repo-relative path escapes the repo root: ${repoRelativePath}`,
    );
  }

  return withoutDotPrefix;
}

export function resolveRepoRelativePath(
  repoRelativePath: string,
  options: RepoPathOptions = {},
): string {
  const normalizedPath = normalizeRepoRelativePath(repoRelativePath);
  const repoRoot = options.repoRoot
    ? assertRepoRoot(options.repoRoot)
    : resolveRepoRoot(options.startDirectory ?? moduleDirectory);

  return resolve(repoRoot, normalizedPath);
}

export function toRepoRelativePath(
  candidatePath: string,
  options: RepoPathOptions = {},
): string {
  const repoRoot = options.repoRoot
    ? assertRepoRoot(options.repoRoot)
    : resolveRepoRoot(options.startDirectory ?? moduleDirectory);
  const resolvedCandidatePath = resolve(candidatePath);

  if (!isPathInside(repoRoot, resolvedCandidatePath)) {
    throw new RepoRelativePathError(
      `Path is outside the repo root ${repoRoot}: ${candidatePath}`,
    );
  }

  const relativePath = relative(repoRoot, resolvedCandidatePath);
  return normalizeRepoRelativePath(relativePath || '.');
}

export function getRepoPaths(options: RepoPathOptions = {}): RepoPaths {
  const repoRoot = options.repoRoot
    ? assertRepoRoot(options.repoRoot)
    : resolveRepoRoot(options.startDirectory ?? moduleDirectory);
  const directories: RepoDirectoryPaths = {
    apiPackagePath: resolve(repoRoot, 'apps', 'api'),
    appsPath: resolve(repoRoot, 'apps'),
    batchPath: resolve(repoRoot, 'batch'),
    configPath: resolve(repoRoot, 'config'),
    dashboardPath: resolve(repoRoot, 'dashboard'),
    dataPath: resolve(repoRoot, 'data'),
    docsPath: resolve(repoRoot, 'docs'),
    interviewPrepPath: resolve(repoRoot, 'interview-prep'),
    jdsPath: resolve(repoRoot, 'jds'),
    modesPath: resolve(repoRoot, 'modes'),
    outputPath: resolve(repoRoot, 'output'),
    profilePath: resolve(repoRoot, 'profile'),
    reportsPath: resolve(repoRoot, 'reports'),
    scriptsPath: resolve(repoRoot, 'scripts'),
    specSystemPath: resolve(repoRoot, '.spec_system'),
    templatesPath: resolve(repoRoot, 'templates'),
    webPackagePath: resolve(repoRoot, 'apps', 'web'),
  };

  return {
    repoRoot,
    agentsGuidePath: resolve(repoRoot, 'AGENTS.md'),
    dataContractPath: resolve(repoRoot, 'docs', 'DATA_CONTRACT.md'),
    appStateRootPath: resolve(repoRoot, APP_STATE_DIRNAME),
    packageJsonPath: resolve(repoRoot, 'package.json'),
    directories,
  };
}

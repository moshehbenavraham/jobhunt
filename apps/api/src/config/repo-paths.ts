import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_REPO_ANCHORS = [
  'AGENTS.md',
  join('docs', 'DATA_CONTRACT.md'),
  'package.json',
] as const;

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

export class RepoRootResolutionError extends Error {
  constructor(attemptedRoots: string[]) {
    super(
      `Unable to resolve repo root from ${moduleDirectory}. Missing anchors: ${REQUIRED_REPO_ANCHORS.join(', ')}. Checked: ${attemptedRoots.join(' -> ')}`,
    );
    this.name = 'RepoRootResolutionError';
  }
}

export type RepoPaths = {
  repoRoot: string;
  agentsGuidePath: string;
  dataContractPath: string;
  appStateRootPath: string;
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

export function resolveRepoRoot(startDirectory: string = moduleDirectory): string {
  if (cachedRepoRoot) {
    return cachedRepoRoot;
  }

  const candidates = listCandidateRoots(startDirectory);
  const repoRoot = candidates.find(hasRepoAnchors);

  if (!repoRoot) {
    throw new RepoRootResolutionError(candidates);
  }

  cachedRepoRoot = repoRoot;
  return repoRoot;
}

export function resolveFromRepoRoot(...segments: string[]): string {
  return join(resolveRepoRoot(), ...segments);
}

export function getRepoPaths(): RepoPaths {
  const repoRoot = resolveRepoRoot();

  return {
    repoRoot,
    agentsGuidePath: resolveFromRepoRoot('AGENTS.md'),
    dataContractPath: resolveFromRepoRoot('docs', 'DATA_CONTRACT.md'),
    appStateRootPath: resolveFromRepoRoot('.jobhunt-app'),
  };
}

import { lstat, readFile, readdir } from 'node:fs/promises';
import {
  getRepoPaths,
  resolveRepoRelativePath,
  type RepoPathOptions,
} from '../config/repo-paths.js';
import { getWorkspaceSurface } from './workspace-contract.js';
import {
  WorkspaceJsonParseError,
  WorkspaceMissingSurfaceError,
  WorkspaceReadError,
} from './workspace-errors.js';
import type {
  JsonValue,
  WorkspaceReadResult,
  WorkspaceResolvedSurface,
  WorkspaceSurfaceDefinition,
  WorkspaceSurfaceKey,
} from './workspace-types.js';

type NodeError = NodeJS.ErrnoException;

function isNodeError(error: unknown): error is NodeError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

async function resolveSurfaceCandidate(
  surface: WorkspaceSurfaceDefinition,
  repoRoot: string,
): Promise<WorkspaceResolvedSurface> {
  for (const candidate of surface.candidates) {
    const candidatePath = resolveRepoRelativePath(candidate, { repoRoot });

    try {
      const stats = await lstat(candidatePath);

      if (surface.kind === 'file' && !stats.isFile()) {
        throw new WorkspaceReadError(
          surface,
          candidatePath,
          `Expected file workspace surface ${surface.key} at ${candidatePath}.`,
        );
      }

      if (surface.kind === 'directory' && !stats.isDirectory()) {
        throw new WorkspaceReadError(
          surface,
          candidatePath,
          `Expected directory workspace surface ${surface.key} at ${candidatePath}.`,
        );
      }

      return {
        exists: true,
        matchedCandidate: candidate,
        path: candidatePath,
        repoRelativePath: candidate,
        surface,
      };
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }

  const canonicalRepoRelativePath = surface.candidates[0] ?? '';

  return {
    exists: false,
    matchedCandidate: null,
    path: resolveRepoRelativePath(canonicalRepoRelativePath, { repoRoot }),
    repoRelativePath: canonicalRepoRelativePath,
    surface,
  };
}

export async function resolveWorkspaceSurface(
  key: WorkspaceSurfaceKey,
  options: RepoPathOptions = {},
): Promise<WorkspaceResolvedSurface> {
  const repoPaths = getRepoPaths(options);
  const surface = getWorkspaceSurface(key);

  return resolveSurfaceCandidate(surface, repoPaths.repoRoot);
}

export async function readWorkspaceSurface(
  key: WorkspaceSurfaceKey,
  options: RepoPathOptions = {},
): Promise<WorkspaceReadResult> {
  const resolvedSurface = await resolveWorkspaceSurface(key, options);
  const { surface } = resolvedSurface;

  if (!resolvedSurface.exists) {
    return {
      missingBehavior: surface.missingBehavior,
      path: resolvedSurface.path,
      repoRelativePath: resolvedSurface.repoRelativePath,
      status: 'missing',
      surface,
    };
  }

  if (surface.kind === 'directory') {
    const directoryEntries = (await readdir(resolvedSurface.path)).sort();

    return {
      directoryEntries,
      path: resolvedSurface.path,
      repoRelativePath: resolvedSurface.repoRelativePath,
      status: 'found',
      surface,
      value: null,
    };
  }

  const textContent = await readFile(resolvedSurface.path, 'utf8');

  if (surface.contentType === 'json') {
    try {
      return {
        path: resolvedSurface.path,
        repoRelativePath: resolvedSurface.repoRelativePath,
        status: 'found',
        surface,
        value: JSON.parse(textContent) as JsonValue,
      };
    } catch (error) {
      throw new WorkspaceJsonParseError(surface, resolvedSurface.path, {
        cause: error,
      });
    }
  }

  return {
    path: resolvedSurface.path,
    repoRelativePath: resolvedSurface.repoRelativePath,
    status: 'found',
    surface,
    value: textContent,
  };
}

export async function readRequiredWorkspaceSurface(
  key: WorkspaceSurfaceKey,
  options: RepoPathOptions = {},
): Promise<Exclude<WorkspaceReadResult, { status: 'missing' }>> {
  const result = await readWorkspaceSurface(key, options);

  if (result.status === 'missing') {
    throw new WorkspaceMissingSurfaceError(
      result.surface,
      result.repoRelativePath,
      result.missingBehavior,
    );
  }

  return result;
}

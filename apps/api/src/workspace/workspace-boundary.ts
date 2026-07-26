import { resolve } from 'node:path';
import {
  APP_STATE_DIRNAME,
  getRepoPaths,
  type RepoPathOptions,
  toRepoRelativePath,
} from '../config/repo-paths.js';
import {
  classifyWorkspaceMutationPolicy,
  classifyKnownRepoRelativePath,
  findSurfaceByRepoRelativePath,
} from './workspace-contract.js';
import {
  WorkspaceMutationPolicyDeniedError,
  WorkspaceUnknownPathError,
  WorkspaceWriteDeniedError,
} from './workspace-errors.js';
import type {
  WorkspaceMutationAuthorization,
  WorkspaceMutationTarget,
  WorkspacePathClassification,
} from './workspace-types.js';

function buildReason(owner: WorkspacePathClassification['owner']): string {
  switch (owner) {
    case 'app':
      return 'Path is inside the app-owned runtime state root.';
    case 'system':
      return 'Path belongs to a system-layer repo surface.';
    case 'user':
      return 'Path belongs to a protected user-layer repo surface.';
    case 'unknown':
      return 'Path is outside the known workspace contract.';
    default: {
      const exhaustiveOwner: never = owner;
      return exhaustiveOwner;
    }
  }
}

export function classifyWorkspacePath(
  candidatePath: string,
  options: RepoPathOptions = {},
): WorkspacePathClassification {
  const repoPaths = getRepoPaths(options);
  const resolvedPath = resolve(repoPaths.repoRoot, candidatePath);

  try {
    const repoRelativePath = toRepoRelativePath(resolvedPath, {
      repoRoot: repoPaths.repoRoot,
    });
    const owner =
      repoRelativePath === APP_STATE_DIRNAME ||
      repoRelativePath.startsWith(`${APP_STATE_DIRNAME}/`)
        ? 'app'
        : classifyKnownRepoRelativePath(repoRelativePath);
    const surface = findSurfaceByRepoRelativePath(repoRelativePath);

    return {
      owner,
      path: resolvedPath,
      reason: buildReason(owner),
      repoRelativePath,
      surfaceKey: surface?.key ?? null,
    };
  } catch (error) {
    return {
      owner: 'unknown',
      path: resolvedPath,
      reason:
        error instanceof Error
          ? error.message
          : `Unable to classify workspace path: ${String(error)}`,
      repoRelativePath: null,
      surfaceKey: null,
    };
  }
}

export function assertKnownWorkspacePath(
  candidatePath: string,
  options: RepoPathOptions = {},
): WorkspacePathClassification {
  const classification = classifyWorkspacePath(candidatePath, options);

  if (classification.owner === 'unknown') {
    throw new WorkspaceUnknownPathError(classification);
  }

  return classification;
}

export function assertAppOwnedWorkspacePath(
  candidatePath: string,
  options: RepoPathOptions = {},
): WorkspacePathClassification {
  const classification = assertKnownWorkspacePath(candidatePath, options);

  if (classification.owner !== 'app') {
    throw new WorkspaceWriteDeniedError(classification);
  }

  return classification;
}

export function assertWritableWorkspacePath(
  candidatePath: string,
  options: RepoPathOptions = {},
): WorkspacePathClassification {
  const classification = assertKnownWorkspacePath(candidatePath, options);

  if (classification.owner === 'app') {
    return classification;
  }

  throw new WorkspaceWriteDeniedError(classification);
}

export function authorizeWorkspaceMutationPath(
  candidatePath: string,
  target: WorkspaceMutationTarget,
  options: RepoPathOptions = {},
): WorkspaceMutationAuthorization {
  const classification = assertKnownWorkspacePath(candidatePath, options);
  const repoRelativePath = classification.repoRelativePath;

  if (repoRelativePath === null) {
    throw new WorkspaceMutationPolicyDeniedError(classification, {
      allowedTarget: null,
      requestedTarget: target,
      requiredApproval: 'required',
      surfaceKey: classification.surfaceKey,
    });
  }

  const mutationPolicy =
    classification.owner === 'app'
      ? {
          approval: 'none' as const,
          surface: findSurfaceByRepoRelativePath(repoRelativePath),
          target: 'app-state' as const,
        }
      : classifyWorkspaceMutationPolicy(repoRelativePath);

  if (!mutationPolicy || mutationPolicy.target !== target) {
    throw new WorkspaceMutationPolicyDeniedError(classification, {
      allowedTarget: mutationPolicy?.target ?? null,
      requestedTarget: target,
      requiredApproval: mutationPolicy?.approval ?? 'required',
      surfaceKey: classification.surfaceKey,
    });
  }

  return {
    approval: mutationPolicy.approval,
    classification,
    path: classification.path,
    repoRelativePath,
    surface: mutationPolicy.surface,
    target,
  };
}

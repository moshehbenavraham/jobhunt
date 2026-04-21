import { lstat, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  getRepoPaths,
  normalizeRepoRelativePath,
  resolveRepoRelativePath,
  type RepoPathOptions,
} from '../config/repo-paths.js';
import { getWorkspaceSurface } from './workspace-contract.js';
import {
  assertWritableWorkspacePath,
  classifyWorkspacePath,
} from './workspace-boundary.js';
import {
  WorkspaceUnknownPathError,
  WorkspaceWriteConflictError,
  WorkspaceWriteDeniedError,
} from './workspace-errors.js';
import type {
  WorkspacePathClassification,
  WorkspaceWriteInput,
  WorkspaceWriteResult,
} from './workspace-types.js';

type NodeError = NodeJS.ErrnoException;

function isNodeError(error: unknown): error is NodeError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function serializeWriteContent(input: WorkspaceWriteInput): string {
  const format =
    input.format ?? (typeof input.content === 'string' ? 'text' : 'json');

  if (format === 'text') {
    if (typeof input.content !== 'string') {
      throw new Error('Text workspace writes require string content.');
    }

    return input.content;
  }

  return `${JSON.stringify(input.content, null, 2)}\n`;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    return stats.isFile();
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function getWritableTarget(
  input: WorkspaceWriteInput,
  repoRoot: string,
): {
  classification: WorkspacePathClassification;
  repoRelativePath: string;
  targetPath: string;
} {
  if (input.surfaceKey) {
    const surface = getWorkspaceSurface(input.surfaceKey);
    const repoRelativePath = surface.candidates[0];

    if (surface.kind !== 'file') {
      throw new Error(
        `Workspace surface ${surface.key} is not a writable file target.`,
      );
    }

    if (!repoRelativePath) {
      throw new Error(`Workspace surface ${surface.key} has no write target.`);
    }

    if (surface.writePolicy !== 'explicit-allow') {
      const classification = classifyWorkspacePath(repoRelativePath, {
        repoRoot,
      });
      throw new WorkspaceWriteDeniedError(classification);
    }

    const targetPath = resolveRepoRelativePath(repoRelativePath, { repoRoot });

    return {
      classification: classifyWorkspacePath(targetPath, { repoRoot }),
      repoRelativePath,
      targetPath,
    };
  }

  if (!input.repoRelativePath) {
    throw new Error(
      'Workspace writes require either a surface key or a repo-relative path.',
    );
  }

  let repoRelativePath: string;
  let targetPath: string;

  try {
    repoRelativePath = normalizeRepoRelativePath(input.repoRelativePath);
    targetPath = resolveRepoRelativePath(repoRelativePath, { repoRoot });
  } catch (_error) {
    throw new WorkspaceUnknownPathError(
      classifyWorkspacePath(input.repoRelativePath, { repoRoot }),
    );
  }

  const classification = assertWritableWorkspacePath(targetPath, { repoRoot });

  return {
    classification,
    repoRelativePath,
    targetPath,
  };
}

export async function writeWorkspaceFile(
  input: WorkspaceWriteInput,
  options: RepoPathOptions = {},
): Promise<WorkspaceWriteResult> {
  const repoPaths = getRepoPaths(options);
  const serializedContent = serializeWriteContent(input);
  const { classification, repoRelativePath, targetPath } = getWritableTarget(
    input,
    repoPaths.repoRoot,
  );
  const targetDirectory = dirname(targetPath);
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  const existedBeforeWrite = await fileExists(targetPath);

  if (existedBeforeWrite && !input.overwrite) {
    throw new WorkspaceWriteConflictError(targetPath);
  }

  await mkdir(targetDirectory, { recursive: true });

  try {
    await writeFile(tempPath, serializedContent, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(tempPath, targetPath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }

  const owner = classification.owner;

  if (owner === 'unknown') {
    throw new WorkspaceWriteDeniedError(classification);
  }

  return {
    bytesWritten: Buffer.byteLength(serializedContent, 'utf8'),
    created: !existedBeforeWrite,
    overwritten: existedBeforeWrite,
    owner,
    path: targetPath,
    repoRelativePath,
    surfaceKey: classification.surfaceKey,
  };
}

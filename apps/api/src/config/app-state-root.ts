import { lstat, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  APP_STATE_DIRNAME,
  getRepoPaths,
  type RepoPathOptions,
} from './repo-paths.js';
import { assertAppOwnedWorkspacePath } from '../workspace/workspace-boundary.js';

export type AppStateRootStatus = {
  rootPath: string;
  exists: boolean;
  created: boolean;
  owner: 'app';
};

type NodeError = NodeJS.ErrnoException;

function isNodeError(error: unknown): error is NodeError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

export async function getAppStateRootStatus(
  options: RepoPathOptions = {},
): Promise<AppStateRootStatus> {
  const { appStateRootPath } = getRepoPaths(options);

  try {
    const stats = await lstat(appStateRootPath);

    if (!stats.isDirectory()) {
      throw new Error(
        `App state root must be a directory: ${appStateRootPath}`,
      );
    }

    return {
      rootPath: appStateRootPath,
      exists: true,
      created: false,
      owner: 'app',
    };
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return {
        rootPath: appStateRootPath,
        exists: false,
        created: false,
        owner: 'app',
      };
    }

    throw error;
  }
}

export async function ensureAppStateRoot(
  options: RepoPathOptions = {},
): Promise<AppStateRootStatus> {
  const status = await getAppStateRootStatus(options);

  if (status.exists) {
    return status;
  }

  await mkdir(status.rootPath, { recursive: true });

  return {
    rootPath: status.rootPath,
    exists: true,
    created: true,
    owner: 'app',
  };
}

export function assertAppOwnedPath(
  candidatePath: string,
  options: RepoPathOptions = {},
): string {
  return assertAppOwnedWorkspacePath(candidatePath, options).path;
}

export function resolveAppStatePath(...segments: string[]): string {
  const { appStateRootPath } = getRepoPaths();
  const candidatePath = resolve(appStateRootPath, ...segments);
  return assertAppOwnedPath(candidatePath);
}

export function resolveAppStatePathForRepo(
  options: RepoPathOptions,
  ...segments: string[]
): string {
  const { appStateRootPath } = getRepoPaths(options);
  const candidatePath = resolve(appStateRootPath, ...segments);
  return assertAppOwnedPath(candidatePath, options);
}

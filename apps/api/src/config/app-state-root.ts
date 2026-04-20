import { lstat, mkdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { getRepoPaths } from './repo-paths.js';

export const APP_STATE_DIRNAME = '.jobhunt-app';

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

export async function getAppStateRootStatus(): Promise<AppStateRootStatus> {
  const { appStateRootPath } = getRepoPaths();

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

export async function ensureAppStateRoot(): Promise<AppStateRootStatus> {
  const status = await getAppStateRootStatus();

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

export function assertAppOwnedPath(candidatePath: string): string {
  const { appStateRootPath } = getRepoPaths();
  const resolvedPath = resolve(candidatePath);
  const relativePath = relative(appStateRootPath, resolvedPath);

  if (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !relativePath.startsWith('/'))
  ) {
    return resolvedPath;
  }

  throw new Error(
    `Refusing to access non-app-owned path: ${candidatePath}. Expected a path inside ${appStateRootPath}.`,
  );
}

export function resolveAppStatePath(...segments: string[]): string {
  const { appStateRootPath } = getRepoPaths();
  const candidatePath = resolve(appStateRootPath, ...segments);
  return assertAppOwnedPath(candidatePath);
}

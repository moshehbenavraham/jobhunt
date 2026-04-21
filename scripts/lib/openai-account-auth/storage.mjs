import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { OPENAI_CODEX_PROVIDER, getDefaultAuthPath } from './common.mjs';

const LOCK_RETRY_MS = 100;
const LOCK_TIMEOUT_MS = 10_000;
const LOCK_STALE_MS = 30_000;

export function createStoredAuthRecord(credentials, now = new Date()) {
  return {
    version: 1,
    provider: OPENAI_CODEX_PROVIDER,
    updatedAt: now.toISOString(),
    credentials: {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      accountId: credentials.accountId,
    },
  };
}

export function normalizeStoredCredentials(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const credentials = value.credentials;
  if (!credentials || typeof credentials !== 'object') {
    return null;
  }

  const accessToken = credentials.accessToken;
  const refreshToken = credentials.refreshToken;
  const expiresAt = credentials.expiresAt;
  const accountId = credentials.accountId;

  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof expiresAt !== 'number' ||
    !Number.isFinite(expiresAt) ||
    typeof accountId !== 'string'
  ) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    accountId,
  };
}

export async function withAuthStorageLock(authPath, callback) {
  const resolvedPath = authPath || getDefaultAuthPath();
  const lockPath = `${resolvedPath}.lock`;
  await mkdir(dirname(resolvedPath), { recursive: true, mode: 0o700 });

  const startedAt = Date.now();
  let handle;

  while (!handle) {
    try {
      handle = await open(lockPath, 'wx', 0o600);
      await handle.writeFile(
        JSON.stringify({
          pid: process.pid,
          createdAt: new Date().toISOString(),
        }),
        'utf8',
      );
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }

      const lockAge = await getLockAge(lockPath);
      if (lockAge !== null && lockAge > LOCK_STALE_MS) {
        await unlink(lockPath).catch(() => {});
        continue;
      }

      if (Date.now() - startedAt > LOCK_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for auth lock: ${lockPath}`);
      }

      await delay(LOCK_RETRY_MS);
    }
  }

  try {
    return await callback(resolvedPath);
  } finally {
    await handle.close().catch(() => {});
    await unlink(lockPath).catch(() => {});
  }
}

export async function loadStoredCredentials(options = {}) {
  const authPath = options.authPath || getDefaultAuthPath();
  return withAuthStorageLock(authPath, async (resolvedPath) => {
    try {
      const content = await readFile(resolvedPath, 'utf8');
      const parsed = JSON.parse(content);
      const normalized = normalizeStoredCredentials(parsed);
      if (!normalized) {
        throw new Error(
          `Stored auth file is invalid: ${resolvedPath}. Delete it and log in again.`,
        );
      }
      return normalized;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  });
}

export async function saveStoredCredentials(credentials, options = {}) {
  const authPath = options.authPath || getDefaultAuthPath();
  return withAuthStorageLock(authPath, async (resolvedPath) => {
    await writeStoredRecord(resolvedPath, createStoredAuthRecord(credentials));
    return resolvedPath;
  });
}

export async function clearStoredCredentials(options = {}) {
  const authPath = options.authPath || getDefaultAuthPath();
  return withAuthStorageLock(authPath, async (resolvedPath) => {
    await rm(resolvedPath, { force: true });
    return resolvedPath;
  });
}

export async function getStoredCredentialsStatus(options = {}) {
  const authPath = options.authPath || getDefaultAuthPath();
  const now = typeof options.now === 'number' ? options.now : Date.now();

  return withAuthStorageLock(authPath, async (resolvedPath) => {
    try {
      const content = await readFile(resolvedPath, 'utf8');
      const parsed = JSON.parse(content);
      const normalized = normalizeStoredCredentials(parsed);
      if (!normalized) {
        return {
          authenticated: false,
          authPath: resolvedPath,
          reason: 'invalid',
        };
      }

      return {
        authenticated: true,
        authPath: resolvedPath,
        accountId: normalized.accountId,
        expiresAt: normalized.expiresAt,
        expired: normalized.expiresAt <= now,
        updatedAt:
          typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
      };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return {
          authenticated: false,
          authPath: resolvedPath,
          reason: 'missing',
        };
      }
      throw error;
    }
  });
}

export async function refreshStoredCredentials(refresher, options = {}) {
  const authPath = options.authPath || getDefaultAuthPath();
  return withAuthStorageLock(authPath, async (resolvedPath) => {
    let current;
    try {
      const content = await readFile(resolvedPath, 'utf8');
      const parsed = JSON.parse(content);
      current = normalizeStoredCredentials(parsed);
      if (!current) {
        throw new Error(
          `Stored auth file is invalid: ${resolvedPath}. Delete it and log in again.`,
        );
      }
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(
          `No stored OpenAI account credentials found at ${resolvedPath}.`,
        );
      }
      throw error;
    }

    const refreshed = await refresher(current);
    await writeStoredRecord(resolvedPath, createStoredAuthRecord(refreshed));
    return refreshed;
  });
}

async function writeStoredRecord(authPath, record) {
  const tempPath = join(
    dirname(authPath),
    `.${process.pid}.${Date.now()}.openai-account-auth.tmp`,
  );
  const payload = JSON.stringify(record, null, 2);
  await writeFile(tempPath, `${payload}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(tempPath, authPath);
}

async function getLockAge(lockPath) {
  try {
    const details = await stat(lockPath);
    return Date.now() - details.mtimeMs;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

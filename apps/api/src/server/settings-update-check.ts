import { execFile } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const UPDATE_CHECK_COMMAND = ['scripts/update-system.mjs', 'check'] as const;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_BACKOFF_MS = 200;
const DEFAULT_TIMEOUT_MS = 4_000;

export type SettingsUpdateCheckState =
  | 'dismissed'
  | 'error'
  | 'offline'
  | 'up-to-date'
  | 'update-available';

export type SettingsUpdateCheckPayload = {
  changelogExcerpt: string | null;
  checkedAt: string;
  command: 'node scripts/update-system.mjs check';
  localVersion: string | null;
  message: string;
  remoteVersion: string | null;
  state: SettingsUpdateCheckState;
};

export type SettingsUpdateCheckRunner = (input: {
  cwd: string;
  timeoutMs: number;
}) => Promise<{
  stdout: string;
}>;

type UpdateCheckJson =
  | {
      status: 'dismissed';
    }
  | {
      local?: unknown;
      status: 'offline';
    }
  | {
      local: unknown;
      remote: unknown;
      status: 'up-to-date';
    }
  | {
      changelog?: unknown;
      local: unknown;
      remote: unknown;
      status: 'update-available';
    };

function buildBoundedEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const allowedKeys = [
    'HOME',
    'PATH',
    'SHELL',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'TMPDIR',
    'USER',
  ];
  const boundedEnv: NodeJS.ProcessEnv = {
    FORCE_COLOR: '0',
  };

  for (const key of allowedKeys) {
    const value = env[key];

    if (typeof value === 'string' && value.length > 0) {
      boundedEnv[key] = value;
    }
  }

  return boundedEnv;
}

function createErrorPayload(message: string): SettingsUpdateCheckPayload {
  return {
    changelogExcerpt: null,
    checkedAt: new Date().toISOString(),
    command: 'node scripts/update-system.mjs check',
    localVersion: null,
    message,
    remoteVersion: null,
    state: 'error',
  };
}

function readOptionalString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const candidate = value[key];

  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return null;
  }

  return candidate.trim();
}

function readRequiredString(
  value: Record<string, unknown>,
  key: string,
): string {
  const candidate = readOptionalString(value, key);

  if (!candidate) {
    throw new Error(`Updater check output is missing ${key}.`);
  }

  return candidate;
}

function assertObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Updater check output must be a JSON object.');
  }

  return value as Record<string, unknown>;
}

function parseUpdateCheckOutput(stdout: string): SettingsUpdateCheckPayload {
  const parsed = JSON.parse(stdout) as UpdateCheckJson;
  const record = assertObject(parsed);
  const status = readRequiredString(record, 'status');
  const checkedAt = new Date().toISOString();

  switch (status) {
    case 'dismissed':
      return {
        changelogExcerpt: null,
        checkedAt,
        command: 'node scripts/update-system.mjs check',
        localVersion: null,
        message: 'Update checks are currently dismissed.',
        remoteVersion: null,
        state: 'dismissed',
      };
    case 'offline':
      return {
        changelogExcerpt: null,
        checkedAt,
        command: 'node scripts/update-system.mjs check',
        localVersion: readOptionalString(record, 'local'),
        message:
          'Update check could not reach the upstream release source.',
        remoteVersion: null,
        state: 'offline',
      };
    case 'up-to-date': {
      const localVersion = readRequiredString(record, 'local');
      const remoteVersion = readRequiredString(record, 'remote');

      return {
        changelogExcerpt: null,
        checkedAt,
        command: 'node scripts/update-system.mjs check',
        localVersion,
        message: `Job-Hunt is up to date (${localVersion}).`,
        remoteVersion,
        state: 'up-to-date',
      };
    }
    case 'update-available': {
      const localVersion = readRequiredString(record, 'local');
      const remoteVersion = readRequiredString(record, 'remote');

      return {
        changelogExcerpt: readOptionalString(record, 'changelog'),
        checkedAt,
        command: 'node scripts/update-system.mjs check',
        localVersion,
        message: `Job-Hunt update available (${localVersion} -> ${remoteVersion}).`,
        remoteVersion,
        state: 'update-available',
      };
    }
    default:
      throw new Error(`Unsupported updater check status: ${status}`);
  }
}

const defaultRunner: SettingsUpdateCheckRunner = async ({
  cwd,
  timeoutMs,
}) => {
  const result = await execFileAsync(
    'node',
    [...UPDATE_CHECK_COMMAND],
    {
      cwd,
      encoding: 'utf8',
      env: buildBoundedEnv(process.env),
      maxBuffer: 64 * 1024,
      timeout: timeoutMs,
      windowsHide: true,
    },
  );

  return {
    stdout: result.stdout,
  };
};

export async function readSettingsUpdateCheck(options: {
  repoRoot: string;
  retryAttempts?: number;
  retryBackoffMs?: number;
  runCheck?: SettingsUpdateCheckRunner;
  timeoutMs?: number;
}): Promise<SettingsUpdateCheckPayload> {
  const retryAttempts = Math.max(1, options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS);
  const retryBackoffMs = Math.max(0, options.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS);
  const timeoutMs = Math.max(250, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const runCheck = options.runCheck ?? defaultRunner;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const result = await runCheck({
        cwd: options.repoRoot,
        timeoutMs,
      });

      return parseUpdateCheckOutput(result.stdout);
    } catch (error) {
      lastError = error;

      if (attempt >= retryAttempts) {
        break;
      }

      await delay(retryBackoffMs * attempt);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : 'Updater check failed unexpectedly.';

  return createErrorPayload(
    `Update check failed before it could return a usable status: ${message}`,
  );
}

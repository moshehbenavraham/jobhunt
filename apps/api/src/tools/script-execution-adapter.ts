import { execFile } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { z } from 'zod';
import {
  getRepoPaths,
  resolveRepoRelativePath,
  type RepoPathOptions,
} from '../config/repo-paths.js';
import type {
  ToolScriptDispatchRequest,
  ToolScriptDispatchResult,
} from './tool-contract.js';
import { ToolExecutionError } from './tool-errors.js';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_BACKOFF_MS = 100;
const MAX_STDIO_BYTES = 16_384;

const scriptDispatchRequestSchema = z.object({
  args: z.array(z.string()).max(32).optional(),
  scriptName: z.string().trim().min(1),
  timeoutMs: z.number().int().min(100).max(MAX_TIMEOUT_MS).optional(),
});

export type ScriptExecutionDefinition = {
  command: string;
  commandArgs?: readonly string[];
  cwdRepoRelativePath?: string;
  description: string;
  name: string;
  retryableExitCodes?: readonly number[];
  timeoutMs?: number;
};

export type ScriptExecutionAdapter = {
  execute: (
    request: ToolScriptDispatchRequest,
  ) => Promise<ToolScriptDispatchResult>;
  listScripts: () => string[];
};

export type ScriptExecutionAdapterOptions = RepoPathOptions & {
  allowlist: readonly ScriptExecutionDefinition[];
  now?: () => number;
  retryAttempts?: number;
  retryBackoffMs?: number;
};

type ExecFileError = Error & {
  code?: number | string | null;
  killed?: boolean;
  signal?: NodeJS.Signals | null;
  stderr?: string | Buffer;
  stdout?: string | Buffer;
};

function normalizeStdio(value: string | Buffer | undefined): string {
  const text =
    typeof value === 'string'
      ? value
      : value instanceof Buffer
        ? value.toString('utf8')
        : '';
  const normalized = text.replace(/\r\n/g, '\n');

  if (Buffer.byteLength(normalized, 'utf8') <= MAX_STDIO_BYTES) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_STDIO_BYTES)}\n[truncated]\n`;
}

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

function isTimedOut(error: ExecFileError): boolean {
  return (
    /timed out/i.test(error.message) ||
    error.killed === true ||
    error.signal === 'SIGTERM'
  );
}

function normalizeExitCode(error: ExecFileError): number {
  if (typeof error.code === 'number') {
    return error.code;
  }

  return 1;
}

function resolveTimeoutMs(
  request: z.infer<typeof scriptDispatchRequestSchema>,
  definition: ScriptExecutionDefinition,
): number {
  return request.timeoutMs ?? definition.timeoutMs ?? DEFAULT_TIMEOUT_MS;
}

function resolveWorkingDirectory(
  definition: ScriptExecutionDefinition,
  options: RepoPathOptions,
): string {
  if (!definition.cwdRepoRelativePath) {
    return getRepoPaths(options).repoRoot;
  }

  return resolveRepoRelativePath(definition.cwdRepoRelativePath, options);
}

export function createScriptExecutionAdapter(
  options: ScriptExecutionAdapterOptions,
): ScriptExecutionAdapter {
  const definitions = new Map<string, ScriptExecutionDefinition>();
  const now = options.now ?? Date.now;
  const retryAttempts =
    options.retryAttempts === undefined
      ? DEFAULT_RETRY_ATTEMPTS
      : Math.max(1, options.retryAttempts);
  const retryBackoffMs =
    options.retryBackoffMs === undefined
      ? DEFAULT_RETRY_BACKOFF_MS
      : Math.max(0, options.retryBackoffMs);

  for (const definition of options.allowlist) {
    if (!definition.name.trim()) {
      throw new ToolExecutionError(
        'tool-invalid-config',
        'Allowlisted scripts must declare a non-empty name.',
      );
    }

    if (definitions.has(definition.name)) {
      throw new ToolExecutionError(
        'tool-invalid-config',
        `Duplicate allowlisted script ${definition.name}.`,
      );
    }

    definitions.set(definition.name, definition);
  }

  return {
    async execute(
      request: ToolScriptDispatchRequest,
    ): Promise<ToolScriptDispatchResult> {
      const parsedRequest = scriptDispatchRequestSchema.parse(request);
      const definition = definitions.get(parsedRequest.scriptName);

      if (!definition) {
        throw new ToolExecutionError(
          'tool-script-disallowed',
          `Script ${parsedRequest.scriptName} is not in the execution allowlist.`,
          {
            detail: {
              allowedScripts: [...definitions.keys()].sort(),
              scriptName: parsedRequest.scriptName,
            },
          },
        );
      }

      const timeoutMs = resolveTimeoutMs(parsedRequest, definition);
      const startTime = now();
      let lastError: ExecFileError | null = null;

      for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
        try {
          const result = await execFileAsync(
            definition.command,
            [...(definition.commandArgs ?? []), ...(parsedRequest.args ?? [])],
            {
              cwd: resolveWorkingDirectory(definition, options),
              encoding: 'utf8',
              env: buildBoundedEnv(process.env),
              maxBuffer: 256 * 1024,
              timeout: timeoutMs,
              windowsHide: true,
            },
          );

          return {
            attempts: attempt,
            durationMs: Math.max(0, now() - startTime),
            exitCode: 0,
            stderr: normalizeStdio(result.stderr),
            stdout: normalizeStdio(result.stdout),
          };
        } catch (error) {
          const execError =
            error instanceof Error ? (error as ExecFileError) : null;

          if (!execError) {
            throw error;
          }

          lastError = execError;

          if (isTimedOut(execError)) {
            throw new ToolExecutionError(
              'tool-script-timeout',
              `Script ${parsedRequest.scriptName} timed out after ${timeoutMs}ms.`,
              {
                cause: execError,
                detail: {
                  attempts: attempt,
                  durationMs: Math.max(0, now() - startTime),
                  scriptName: parsedRequest.scriptName,
                  stderr: normalizeStdio(execError.stderr),
                  timeoutMs,
                },
                retryable: true,
              },
            );
          }

          const exitCode = normalizeExitCode(execError);
          const isRetryable =
            definition.retryableExitCodes?.includes(exitCode) ?? false;

          if (isRetryable && attempt < retryAttempts) {
            await delay(retryBackoffMs * attempt);
            continue;
          }

          throw new ToolExecutionError(
            'tool-script-failed',
            `Script ${parsedRequest.scriptName} exited with code ${exitCode}.`,
            {
              cause: execError,
              detail: {
                attempts: attempt,
                durationMs: Math.max(0, now() - startTime),
                exitCode,
                scriptName: parsedRequest.scriptName,
                stderr: normalizeStdio(execError.stderr),
                stdout: normalizeStdio(execError.stdout),
              },
              retryable: isRetryable,
            },
          );
        }
      }

      throw new ToolExecutionError(
        'tool-script-failed',
        `Script ${parsedRequest.scriptName} failed without a result.`,
        {
          cause: lastError ?? undefined,
        },
      );
    },
    listScripts(): string[] {
      return [...definitions.keys()].sort();
    },
  };
}

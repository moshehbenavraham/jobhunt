import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pino from 'pino';

export type LastErrorRecord = {
  context: Record<string, unknown>;
  error: {
    message: string;
    stack: string;
    type: string;
  };
  level: 'error';
  msg: string;
  timestamp: string;
};

type CaptureLastErrorOptions = {
  context?: Record<string, unknown>;
  error: unknown;
  logsDir?: string;
  message: string;
  repoRoot?: string;
  timestamp?: string;
};

type JobhuntLoggerOptions = {
  context?: Record<string, unknown>;
  level?: string;
  logsDir?: string;
  repoRoot?: string;
  service?: string;
  timestamp?: () => string;
};

type PinoLogger = ReturnType<typeof pino>;

function resolveLogsDir(
  options: Pick<JobhuntLoggerOptions, 'logsDir' | 'repoRoot'>,
): string {
  return options.logsDir ?? join(options.repoRoot ?? process.cwd(), 'logs');
}

function toErrorRecord(error: unknown): LastErrorRecord['error'] {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? '',
      type: error.name || 'Error',
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      stack: '',
      type: 'Error',
    };
  }

  return {
    message: String(error),
    stack: '',
    type: 'Error',
  };
}

function getMessage(args: readonly unknown[], fallback: string): string {
  for (const arg of args) {
    if (typeof arg === 'string' && arg.trim().length > 0) {
      return arg;
    }
  }

  return fallback;
}

function getErrorFromArgs(args: readonly unknown[]): unknown | null {
  for (const arg of args) {
    if (arg instanceof Error) {
      return arg;
    }

    if (
      typeof arg === 'object' &&
      arg !== null &&
      'err' in arg &&
      (arg as { err?: unknown }).err instanceof Error
    ) {
      return (arg as { err: Error }).err;
    }
  }

  return null;
}

export async function captureLastError(
  options: CaptureLastErrorOptions,
): Promise<{ filePath: string; record: LastErrorRecord }> {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const record: LastErrorRecord = {
    context: options.context ?? {},
    error: toErrorRecord(options.error),
    level: 'error',
    msg: options.message,
    timestamp,
  };
  const logsDir = resolveLogsDir(options);
  const filePath = join(logsDir, `last_error_${timestamp}.json`);

  await mkdir(logsDir, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  return { filePath, record };
}

export function createJobhuntLogger(
  options: JobhuntLoggerOptions = {},
): PinoLogger {
  const logsDir = resolveLogsDir(options);

  return pino({
    base: {
      service: options.service ?? 'jobhunt-api',
      ...options.context,
    },
    hooks: {
      logMethod(args, method) {
        const error = getErrorFromArgs(args);

        if (error) {
          const message = getMessage(args, 'Unhandled error');
          const timestamp = options.timestamp?.();
          void captureLastError({
            context: options.context ?? {},
            error,
            logsDir,
            message,
            ...(timestamp ? { timestamp } : {}),
          }).catch(() => undefined);
        }

        method.apply(this, args as never);
      },
    },
    level: (options.level ?? process.env.LOG_LEVEL ?? 'info') as
      | 'fatal'
      | 'error'
      | 'warn'
      | 'info'
      | 'debug'
      | 'trace'
      | 'silent',
  });
}

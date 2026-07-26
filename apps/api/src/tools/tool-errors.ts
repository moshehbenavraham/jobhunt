import { ZodError } from 'zod';
import {
  WorkspaceMutationPolicyDeniedError,
  WorkspaceUnknownPathError,
  WorkspaceWriteConflictError,
  WorkspaceWriteDeniedError,
} from '../workspace/workspace-errors.js';
import type { JsonValue } from '../workspace/workspace-types.js';

export const TOOL_ERROR_CODES = [
  'tool-duplicate-invocation',
  'tool-duplicate-registration',
  'tool-execution-failed',
  'tool-invalid-config',
  'tool-invalid-input',
  'tool-not-found',
  'tool-permission-denied',
  'tool-script-disallowed',
  'tool-script-failed',
  'tool-script-timeout',
  'tool-workspace-conflict',
  'tool-workspace-denied',
  'tool-workspace-unknown-path',
] as const;

export type ToolErrorCode = (typeof TOOL_ERROR_CODES)[number];

export type ToolErrorEnvelope = {
  code: ToolErrorCode;
  detail: JsonValue | null;
  message: string;
  retryable: boolean;
};

function isJsonArray(value: unknown): value is JsonValue[] {
  return Array.isArray(value);
}

function isJsonObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !isJsonArray(value);
}

function toJsonValue(value: unknown): JsonValue | null {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }

  if (isJsonArray(value)) {
    return value.map((entry) => toJsonValue(entry)) as JsonValue;
  }

  if (isJsonObject(value)) {
    const result: Record<string, JsonValue> = {};

    for (const [key, entry] of Object.entries(value)) {
      result[key] = toJsonValue(entry);
    }

    return result;
  }

  return value === undefined ? null : String(value);
}

function mapZodIssues(error: ZodError): JsonValue {
  return error.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.map((segment) => String(segment)),
  }));
}

export class ToolExecutionError extends Error {
  readonly code: ToolErrorCode;
  readonly detail: JsonValue | null;
  readonly retryable: boolean;

  constructor(
    code: ToolErrorCode,
    message: string,
    options: {
      cause?: unknown;
      detail?: JsonValue;
      retryable?: boolean;
    } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.code = code;
    this.detail = options.detail ?? null;
    this.retryable = options.retryable ?? false;
    this.name = 'ToolExecutionError';
  }
}

export function toToolErrorEnvelope(error: unknown): ToolErrorEnvelope {
  if (error instanceof ToolExecutionError) {
    return {
      code: error.code,
      detail: error.detail,
      message: error.message,
      retryable: error.retryable,
    };
  }

  if (error instanceof ZodError) {
    return {
      code: 'tool-invalid-input',
      detail: {
        issues: mapZodIssues(error),
      },
      message: 'Tool input failed schema validation.',
      retryable: false,
    };
  }

  if (error instanceof WorkspaceMutationPolicyDeniedError) {
    return {
      code: 'tool-workspace-denied',
      detail: {
        classification: {
          owner: error.classification.owner,
          reason: error.classification.reason,
          repoRelativePath: error.classification.repoRelativePath,
          surfaceKey: error.classification.surfaceKey,
        },
        policy: error.detail,
      },
      message: error.message,
      retryable: false,
    };
  }

  if (error instanceof WorkspaceWriteDeniedError) {
    return {
      code: 'tool-workspace-denied',
      detail: {
        owner: error.classification.owner,
        reason: error.classification.reason,
        repoRelativePath: error.classification.repoRelativePath,
        surfaceKey: error.classification.surfaceKey,
      },
      message: error.message,
      retryable: false,
    };
  }

  if (error instanceof WorkspaceUnknownPathError) {
    return {
      code: 'tool-workspace-unknown-path',
      detail: {
        reason: error.classification.reason,
      },
      message: error.message,
      retryable: false,
    };
  }

  if (error instanceof WorkspaceWriteConflictError) {
    return {
      code: 'tool-workspace-conflict',
      detail: {
        path: error.path,
      },
      message: error.message,
      retryable: false,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'tool-execution-failed',
      detail: {
        cause: toJsonValue(error.cause),
      },
      message: error.message,
      retryable: false,
    };
  }

  return {
    code: 'tool-execution-failed',
    detail: {
      cause: toJsonValue(error),
    },
    message: `Tool execution failed: ${String(error)}`,
    retryable: false,
  };
}

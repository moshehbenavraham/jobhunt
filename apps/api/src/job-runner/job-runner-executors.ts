import { ZodError } from 'zod';
import type {
  AnyDurableJobExecutorDefinition,
  DurableJobExecutorDefinition,
  DurableJobExecutorRegistry,
  DurableJobExecutorRegistryInput,
} from './job-runner-contract.js';
import { DurableJobRunnerError } from './job-runner-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';

function assertJobType(jobType: string): void {
  if (!jobType.trim()) {
    throw new DurableJobRunnerError(
      'job-runner-invalid-config',
      'Durable job executors must declare a non-empty job type.',
    );
  }
}

export function createDurableJobExecutorRegistry(
  definitions: DurableJobExecutorRegistryInput,
): DurableJobExecutorRegistry {
  const normalizedDefinitions = new Map<
    string,
    AnyDurableJobExecutorDefinition
  >();

  for (const definition of definitions) {
    assertJobType(definition.jobType);

    if (normalizedDefinitions.has(definition.jobType)) {
      throw new DurableJobRunnerError(
        'job-runner-invalid-config',
        `Duplicate durable job executor registration for ${definition.jobType}.`,
      );
    }

    normalizedDefinitions.set(definition.jobType, definition);
  }

  return {
    definitions: normalizedDefinitions,
    get(jobType: string): DurableJobExecutorDefinition | null {
      return normalizedDefinitions.get(jobType) ?? null;
    },
    listJobTypes(): string[] {
      return [...normalizedDefinitions.keys()].sort();
    },
  };
}

export function getDurableJobExecutorOrThrow(
  registry: DurableJobExecutorRegistry,
  jobType: string,
): DurableJobExecutorDefinition {
  const definition = registry.get(jobType);

  if (!definition) {
    throw new DurableJobRunnerError(
      'job-runner-unsupported-job-type',
      `Unsupported durable job type ${jobType}. Supported types: ${registry.listJobTypes().join(', ') || '(none)'}.`,
      {
        detail: {
          jobType,
          supportedJobTypes: registry.listJobTypes(),
        },
      },
    );
  }

  return definition;
}

export function parseDurableJobPayload<TPayload extends JsonValue>(
  registry: DurableJobExecutorRegistry,
  jobType: string,
  payload: JsonValue,
): TPayload {
  const definition = getDurableJobExecutorOrThrow(registry, jobType);
  const result = definition.payloadSchema.safeParse(payload);

  if (!result.success) {
    throw new DurableJobRunnerError(
      'job-runner-invalid-payload',
      `Invalid payload for durable job type ${jobType}.`,
      {
        cause: result.error,
        detail: {
          issues: result.error.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            path: issue.path.map((segment) => String(segment)),
          })),
          jobType,
        },
      },
    );
  }

  return result.data as TPayload;
}

export function formatDurableJobExecutorError(error: unknown): string {
  if (error instanceof DurableJobRunnerError || error instanceof ZodError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

import { randomUUID } from 'node:crypto';
import type {
  ObservabilityService,
  RuntimeDiagnosticsFilter,
  RuntimeDiagnosticsSummary,
  RuntimeEventWriteInput,
  RuntimeFailedJobSummary,
} from './observability-contract.js';
import type {
  OperationalStore,
  OperationalStoreStatus,
  RuntimeEventRecord,
} from '../store/store-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';

type ObservabilityServiceOptions = {
  getStore: () => Promise<OperationalStore>;
  getStoreStatus: () => Promise<OperationalStoreStatus>;
};

const REDACTED_VALUE = '[redacted]';
const REDACTED_KEYS = new Set([
  'body',
  'content',
  'prompt',
  'promptBody',
  'rawOutput',
  'stderr',
  'stdout',
  'transcript',
]);

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactMetadata(value: JsonValue | null): JsonValue | null {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactMetadata(entry)) as JsonValue;
  }

  if (isJsonObject(value)) {
    const redacted: Record<string, JsonValue> = {};

    for (const [key, entry] of Object.entries(value)) {
      redacted[key] = REDACTED_KEYS.has(key)
        ? REDACTED_VALUE
        : (redactMetadata(entry) as JsonValue);
    }

    return redacted;
  }

  return value;
}

function toFailedJobSummary(
  record: RuntimeEventRecord,
): RuntimeFailedJobSummary | null {
  if (!record.jobId || !record.sessionId) {
    return null;
  }

  const metadata = isJsonObject(record.metadata) ? record.metadata : {};
  const message =
    typeof metadata.message === 'string' ? metadata.message : record.summary;
  const runId =
    typeof metadata.runId === 'string'
      ? metadata.runId
      : (record.traceId ?? record.eventId);

  return {
    failedAt: record.occurredAt,
    jobId: record.jobId,
    message,
    runId,
    sessionId: record.sessionId,
    traceId: record.traceId,
  };
}

export function createObservabilityService(
  options: ObservabilityServiceOptions,
): ObservabilityService {
  async function isStoreReady(): Promise<boolean> {
    const status = await options.getStoreStatus();
    return status.status === 'ready';
  }

  async function getStoreOrNull(): Promise<OperationalStore | null> {
    if (!(await isStoreReady())) {
      return null;
    }

    return options.getStore();
  }

  return {
    async getDiagnosticsSummary(
      filter: RuntimeDiagnosticsFilter = {},
    ): Promise<RuntimeDiagnosticsSummary> {
      const store = await getStoreOrNull();

      if (!store) {
        return {
          failedJobs: [],
          recentEvents: [],
        };
      }

      const limit = filter.limit ?? 25;
      const [recentEvents, failedEvents] = await Promise.all([
        store.events.list(filter),
        store.events.list({
          ...filter,
          eventTypes: ['job-failed'],
          limit,
        }),
      ]);
      const failedJobs = failedEvents
        .map((event) => toFailedJobSummary(event))
        .filter((entry): entry is RuntimeFailedJobSummary => entry !== null);

      return {
        failedJobs,
        recentEvents,
      };
    },
    async recordEvent(
      input: RuntimeEventWriteInput,
    ): Promise<RuntimeEventRecord | null> {
      const store = await getStoreOrNull();

      if (!store) {
        return null;
      }

      return store.events.save({
        approvalId: input.correlation.approvalId ?? null,
        eventId: randomUUID(),
        eventType: input.eventType,
        jobId: input.correlation.jobId ?? null,
        level: input.level ?? 'info',
        metadata: redactMetadata(input.metadata),
        occurredAt: input.occurredAt,
        requestId: input.correlation.requestId ?? null,
        sessionId: input.correlation.sessionId ?? null,
        summary: input.summary,
        traceId: input.correlation.traceId ?? null,
      });
    },
  };
}

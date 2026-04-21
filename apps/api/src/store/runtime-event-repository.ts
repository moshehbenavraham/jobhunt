import type { DatabaseSync } from 'node:sqlite';
import type {
  RuntimeEventListInput,
  RuntimeEventRecord,
  RuntimeEventRepository,
} from './store-contract.js';
import {
  OperationalStoreError,
  type SqliteStoreContext,
} from './sqlite-store.js';

type RuntimeEventRow = {
  approval_id: string | null;
  event_id: string;
  event_type: RuntimeEventRecord['eventType'];
  job_id: string | null;
  level: RuntimeEventRecord['level'];
  metadata_json: string | null;
  occurred_at: string;
  request_id: string | null;
  session_id: string | null;
  summary: string;
  trace_id: string | null;
};

const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;

const SELECT_RUNTIME_EVENT_SQL = `
  SELECT
    event_id,
    session_id,
    job_id,
    approval_id,
    request_id,
    trace_id,
    event_type,
    level,
    summary,
    metadata_json,
    occurred_at
  FROM runtime_events
`;

function assertNonEmptyString(
  value: string,
  fieldName: string,
  databasePath: string,
): void {
  if (!value.trim()) {
    throw new OperationalStoreError(
      'operational-store-invalid-input',
      databasePath,
      `Runtime event ${fieldName} must not be empty.`,
    );
  }
}

function parseMetadataJson(
  serializedValue: string | null,
  databasePath: string,
  eventId: string,
) {
  if (serializedValue === null) {
    return null;
  }

  try {
    return JSON.parse(serializedValue);
  } catch (error) {
    throw new OperationalStoreError(
      'operational-store-corrupt',
      databasePath,
      `Runtime event ${eventId} contains invalid JSON metadata.`,
      { cause: error },
    );
  }
}

function mapRuntimeEventRow(
  row: RuntimeEventRow,
  databasePath: string,
): RuntimeEventRecord {
  return {
    approvalId: row.approval_id,
    eventId: row.event_id,
    eventType: row.event_type,
    jobId: row.job_id,
    level: row.level,
    metadata: parseMetadataJson(row.metadata_json, databasePath, row.event_id),
    occurredAt: row.occurred_at,
    requestId: row.request_id,
    sessionId: row.session_id,
    summary: row.summary,
    traceId: row.trace_id,
  };
}

function selectRuntimeEventById(
  database: DatabaseSync,
  eventId: string,
): RuntimeEventRow | null {
  return (
    (database
      .prepare(`${SELECT_RUNTIME_EVENT_SQL} WHERE event_id = @eventId LIMIT 1`)
      .get({ eventId }) as RuntimeEventRow | undefined) ?? null
  );
}

function normalizeLimit(
  limit: number | undefined,
  databasePath: string,
): number {
  const resolvedLimit = limit ?? DEFAULT_LIST_LIMIT;

  if (
    !Number.isInteger(resolvedLimit) ||
    resolvedLimit < 1 ||
    resolvedLimit > MAX_LIST_LIMIT
  ) {
    throw new OperationalStoreError(
      'operational-store-invalid-input',
      databasePath,
      `Runtime event limit must be an integer between 1 and ${MAX_LIST_LIMIT}.`,
    );
  }

  return resolvedLimit;
}

export function createRuntimeEventRepository(
  store: SqliteStoreContext,
): RuntimeEventRepository {
  return {
    async getById(eventId: string): Promise<RuntimeEventRecord | null> {
      assertNonEmptyString(eventId, 'eventId', store.databasePath);
      const row = await store.get<RuntimeEventRow>(
        `${SELECT_RUNTIME_EVENT_SQL} WHERE event_id = @eventId LIMIT 1`,
        { eventId },
      );

      return row ? mapRuntimeEventRow(row, store.databasePath) : null;
    },
    async list(input: RuntimeEventListInput = {}): Promise<RuntimeEventRecord[]> {
      const clauses: string[] = [];
      const parameters: Record<string, string | number> = {
        limit: normalizeLimit(input.limit, store.databasePath),
      };

      if (input.approvalId) {
        assertNonEmptyString(input.approvalId, 'approvalId', store.databasePath);
        clauses.push('approval_id = @approvalId');
        parameters.approvalId = input.approvalId;
      }

      if (input.jobId) {
        assertNonEmptyString(input.jobId, 'jobId', store.databasePath);
        clauses.push('job_id = @jobId');
        parameters.jobId = input.jobId;
      }

      if (input.requestId) {
        assertNonEmptyString(input.requestId, 'requestId', store.databasePath);
        clauses.push('request_id = @requestId');
        parameters.requestId = input.requestId;
      }

      if (input.sessionId) {
        assertNonEmptyString(input.sessionId, 'sessionId', store.databasePath);
        clauses.push('session_id = @sessionId');
        parameters.sessionId = input.sessionId;
      }

      if (input.traceId) {
        assertNonEmptyString(input.traceId, 'traceId', store.databasePath);
        clauses.push('trace_id = @traceId');
        parameters.traceId = input.traceId;
      }

      if (input.level) {
        assertNonEmptyString(input.level, 'level', store.databasePath);
        clauses.push('level = @level');
        parameters.level = input.level;
      }

      if (input.eventTypes && input.eventTypes.length > 0) {
        const placeholders: string[] = [];

        for (const [index, eventType] of input.eventTypes.entries()) {
          const parameterName = `eventType${index}`;
          assertNonEmptyString(eventType, parameterName, store.databasePath);
          placeholders.push(`@${parameterName}`);
          parameters[parameterName] = eventType;
        }

        clauses.push(`event_type IN (${placeholders.join(', ')})`);
      }

      const whereSql =
        clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const rows = await store.all<RuntimeEventRow>(
        `
          ${SELECT_RUNTIME_EVENT_SQL}
          ${whereSql}
          ORDER BY occurred_at DESC, event_id ASC
          LIMIT @limit
        `,
        parameters,
      );

      return rows.map((row) => mapRuntimeEventRow(row, store.databasePath));
    },
    async save(record: RuntimeEventRecord): Promise<RuntimeEventRecord> {
      assertNonEmptyString(record.eventId, 'eventId', store.databasePath);
      assertNonEmptyString(record.eventType, 'eventType', store.databasePath);
      assertNonEmptyString(record.level, 'level', store.databasePath);
      assertNonEmptyString(record.occurredAt, 'occurredAt', store.databasePath);
      assertNonEmptyString(record.summary, 'summary', store.databasePath);

      return store.withTransaction((database) => {
        database
          .prepare(
            `
              INSERT INTO runtime_events (
                event_id,
                session_id,
                job_id,
                approval_id,
                request_id,
                trace_id,
                event_type,
                level,
                summary,
                metadata_json,
                occurred_at
              ) VALUES (
                @eventId,
                @sessionId,
                @jobId,
                @approvalId,
                @requestId,
                @traceId,
                @eventType,
                @level,
                @summary,
                @metadataJson,
                @occurredAt
              )
              ON CONFLICT(event_id) DO UPDATE SET
                session_id = excluded.session_id,
                job_id = excluded.job_id,
                approval_id = excluded.approval_id,
                request_id = excluded.request_id,
                trace_id = excluded.trace_id,
                event_type = excluded.event_type,
                level = excluded.level,
                summary = excluded.summary,
                metadata_json = excluded.metadata_json,
                occurred_at = excluded.occurred_at
            `,
          )
          .run({
            approvalId: record.approvalId,
            eventId: record.eventId,
            eventType: record.eventType,
            jobId: record.jobId,
            level: record.level,
            metadataJson:
              record.metadata === null ? null : JSON.stringify(record.metadata),
            occurredAt: record.occurredAt,
            requestId: record.requestId,
            sessionId: record.sessionId,
            summary: record.summary,
            traceId: record.traceId,
          });
        const row = selectRuntimeEventById(database, record.eventId);

        if (!row) {
          throw new OperationalStoreError(
            'operational-store-init-failed',
            store.databasePath,
            `Runtime event was not persisted: ${record.eventId}`,
          );
        }

        return mapRuntimeEventRow(row, store.databasePath);
      });
    },
  };
}

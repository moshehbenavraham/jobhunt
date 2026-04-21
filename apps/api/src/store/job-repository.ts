import type { DatabaseSync } from 'node:sqlite';
import type {
  JobRepository,
  RuntimeJobRecord,
  RuntimeJobStatus,
} from './store-contract.js';
import {
  OperationalStoreError,
  type SqliteStoreContext,
} from './sqlite-store.js';

type JobRow = {
  attempt: number;
  completed_at: string | null;
  created_at: string;
  error_json: string | null;
  job_id: string;
  job_type: string;
  payload_json: string;
  result_json: string | null;
  session_id: string;
  started_at: string | null;
  status: RuntimeJobStatus;
  updated_at: string;
};

const SELECT_JOB_SQL = `
  SELECT
    job_id,
    session_id,
    job_type,
    status,
    attempt,
    payload_json,
    result_json,
    error_json,
    created_at,
    updated_at,
    started_at,
    completed_at
  FROM runtime_jobs
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
      `Runtime job ${fieldName} must not be empty.`,
    );
  }
}

function assertNonNegativeInteger(
  value: number,
  fieldName: string,
  databasePath: string,
): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new OperationalStoreError(
      'operational-store-invalid-input',
      databasePath,
      `Runtime job ${fieldName} must be a non-negative integer.`,
    );
  }
}

function parseJsonValue(
  serializedValue: string | null,
  databasePath: string,
  recordId: string,
  fieldName: string,
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
      `Runtime job ${recordId} contains invalid JSON in ${fieldName}.`,
      { cause: error },
    );
  }
}

function assertJobRecord(record: RuntimeJobRecord, databasePath: string): void {
  assertNonEmptyString(record.jobId, 'jobId', databasePath);
  assertNonEmptyString(record.sessionId, 'sessionId', databasePath);
  assertNonEmptyString(record.jobType, 'jobType', databasePath);
  assertNonEmptyString(record.status, 'status', databasePath);
  assertNonEmptyString(record.createdAt, 'createdAt', databasePath);
  assertNonEmptyString(record.updatedAt, 'updatedAt', databasePath);
  assertNonNegativeInteger(record.attempt, 'attempt', databasePath);
}

function mapJobRow(row: JobRow, databasePath: string): RuntimeJobRecord {
  return {
    attempt: row.attempt,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    error: parseJsonValue(row.error_json, databasePath, row.job_id, 'error_json'),
    jobId: row.job_id,
    jobType: row.job_type,
    payload: parseJsonValue(
      row.payload_json,
      databasePath,
      row.job_id,
      'payload_json',
    ),
    result: parseJsonValue(row.result_json, databasePath, row.job_id, 'result_json'),
    sessionId: row.session_id,
    startedAt: row.started_at,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function selectJobById(database: DatabaseSync, jobId: string): JobRow | null {
  return (
    (database
      .prepare(`${SELECT_JOB_SQL} WHERE job_id = @jobId LIMIT 1`)
      .get({ jobId }) as JobRow | undefined) ?? null
  );
}

export function createJobRepository(store: SqliteStoreContext): JobRepository {
  return {
    async getById(jobId: string): Promise<RuntimeJobRecord | null> {
      assertNonEmptyString(jobId, 'jobId', store.databasePath);
      const row = await store.get<JobRow>(
        `${SELECT_JOB_SQL} WHERE job_id = @jobId LIMIT 1`,
        { jobId },
      );

      return row ? mapJobRow(row, store.databasePath) : null;
    },
    async listBySessionId(sessionId: string): Promise<RuntimeJobRecord[]> {
      assertNonEmptyString(sessionId, 'sessionId', store.databasePath);
      const rows = await store.all<JobRow>(
        `${SELECT_JOB_SQL} WHERE session_id = @sessionId ORDER BY updated_at DESC, job_id ASC`,
        { sessionId },
      );

      return rows.map((row) => mapJobRow(row, store.databasePath));
    },
    async save(record: RuntimeJobRecord): Promise<RuntimeJobRecord> {
      assertJobRecord(record, store.databasePath);

      return store.withTransaction((database) => {
        database
          .prepare(
            `
              INSERT INTO runtime_jobs (
                job_id,
                session_id,
                job_type,
                status,
                attempt,
                payload_json,
                result_json,
                error_json,
                created_at,
                updated_at,
                started_at,
                completed_at
              ) VALUES (
                @jobId,
                @sessionId,
                @jobType,
                @status,
                @attempt,
                @payloadJson,
                @resultJson,
                @errorJson,
                @createdAt,
                @updatedAt,
                @startedAt,
                @completedAt
              )
              ON CONFLICT(job_id) DO UPDATE SET
                session_id = excluded.session_id,
                job_type = excluded.job_type,
                status = excluded.status,
                attempt = excluded.attempt,
                payload_json = excluded.payload_json,
                result_json = excluded.result_json,
                error_json = excluded.error_json,
                updated_at = excluded.updated_at,
                started_at = excluded.started_at,
                completed_at = excluded.completed_at
            `,
          )
          .run({
            attempt: record.attempt,
            completedAt: record.completedAt,
            createdAt: record.createdAt,
            errorJson:
              record.error === null ? null : JSON.stringify(record.error),
            jobId: record.jobId,
            jobType: record.jobType,
            payloadJson: JSON.stringify(record.payload),
            resultJson:
              record.result === null ? null : JSON.stringify(record.result),
            sessionId: record.sessionId,
            startedAt: record.startedAt,
            status: record.status,
            updatedAt: record.updatedAt,
          });

        const row = selectJobById(database, record.jobId);

        if (!row) {
          throw new OperationalStoreError(
            'operational-store-init-failed',
            store.databasePath,
            `Runtime job was not persisted: ${record.jobId}`,
          );
        }

        return mapJobRow(row, store.databasePath);
      });
    },
  };
}

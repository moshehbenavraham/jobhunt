import type { DatabaseSync } from 'node:sqlite';
import type {
  RunMetadataRepository,
  RuntimeRunCheckpointRecord,
  RuntimeRunCheckpointSaveInput,
  RuntimeRunMetadataRecord,
} from './store-contract.js';
import {
  OperationalStoreError,
  type SqliteStoreContext,
} from './sqlite-store.js';
import type { JsonValue } from '../workspace/workspace-types.js';

type RunMetadataRow = {
  created_at: string;
  job_id: string | null;
  metadata_json: string;
  run_id: string;
  session_id: string;
  updated_at: string;
};

const SELECT_RUN_METADATA_SQL = `
  SELECT
    run_id,
    session_id,
    job_id,
    metadata_json,
    created_at,
    updated_at
  FROM runtime_run_metadata
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
      `Runtime run metadata ${fieldName} must not be empty.`,
    );
  }
}

function parseMetadataJson(
  serializedMetadata: string,
  databasePath: string,
  runId: string,
): JsonValue {
  try {
    return JSON.parse(serializedMetadata);
  } catch (error) {
    throw new OperationalStoreError(
      'operational-store-corrupt',
      databasePath,
      `Runtime run metadata ${runId} contains invalid JSON metadata.`,
      { cause: error },
    );
  }
}

function assertRunMetadataRecord(
  record: RuntimeRunMetadataRecord,
  databasePath: string,
): void {
  assertNonEmptyString(record.runId, 'runId', databasePath);
  assertNonEmptyString(record.sessionId, 'sessionId', databasePath);
  assertNonEmptyString(record.createdAt, 'createdAt', databasePath);
  assertNonEmptyString(record.updatedAt, 'updatedAt', databasePath);
}

function mapRunMetadataRow(
  row: RunMetadataRow,
  databasePath: string,
): RuntimeRunMetadataRecord {
  return {
    createdAt: row.created_at,
    jobId: row.job_id,
    metadata: parseMetadataJson(row.metadata_json, databasePath, row.run_id),
    runId: row.run_id,
    sessionId: row.session_id,
    updatedAt: row.updated_at,
  };
}

function selectRunMetadataById(
  database: DatabaseSync,
  runId: string,
): RunMetadataRow | null {
  return (
    (database
      .prepare(`${SELECT_RUN_METADATA_SQL} WHERE run_id = @runId LIMIT 1`)
      .get({ runId }) as RunMetadataRow | undefined) ?? null
  );
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCheckpoint(
  checkpoint: RuntimeRunCheckpointRecord,
): RuntimeRunCheckpointRecord {
  return {
    completedSteps: [...checkpoint.completedSteps],
    cursor: checkpoint.cursor,
    updatedAt: checkpoint.updatedAt,
    value: checkpoint.value,
  };
}

function extractCheckpoint(
  metadata: JsonValue,
): RuntimeRunCheckpointRecord | null {
  if (!isJsonObject(metadata)) {
    return null;
  }

  const candidate =
    'checkpoint' in metadata
      ? ((metadata.checkpoint as JsonValue | undefined) ?? null)
      : null;

  if (!isJsonObject(candidate)) {
    return null;
  }

  const completedSteps = Array.isArray(candidate.completedSteps)
    ? candidate.completedSteps.filter(
        (value): value is string => typeof value === 'string',
      )
    : null;
  const cursor =
    typeof candidate.cursor === 'string' || candidate.cursor === null
      ? candidate.cursor
      : null;
  const updatedAt =
    typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null;
  const value =
    'value' in candidate
      ? ((candidate.value as JsonValue | undefined) ?? null)
      : null;

  if (completedSteps === null || updatedAt === null) {
    return null;
  }

  return {
    completedSteps,
    cursor,
    updatedAt,
    value,
  };
}

export function createRunMetadataRepository(
  store: SqliteStoreContext,
): RunMetadataRepository {
  return {
    async getByRunId(runId: string): Promise<RuntimeRunMetadataRecord | null> {
      assertNonEmptyString(runId, 'runId', store.databasePath);
      const row = await store.get<RunMetadataRow>(
        `${SELECT_RUN_METADATA_SQL} WHERE run_id = @runId LIMIT 1`,
        { runId },
      );

      return row ? mapRunMetadataRow(row, store.databasePath) : null;
    },
    async getLatestByJobId(jobId: string): Promise<RuntimeRunMetadataRecord | null> {
      assertNonEmptyString(jobId, 'jobId', store.databasePath);
      const row = await store.get<RunMetadataRow>(
        `
          ${SELECT_RUN_METADATA_SQL}
          WHERE job_id = @jobId
          ORDER BY updated_at DESC, run_id ASC
          LIMIT 1
        `,
        { jobId },
      );

      return row ? mapRunMetadataRow(row, store.databasePath) : null;
    },
    async listBySessionId(
      sessionId: string,
    ): Promise<RuntimeRunMetadataRecord[]> {
      assertNonEmptyString(sessionId, 'sessionId', store.databasePath);
      const rows = await store.all<RunMetadataRow>(
        `${SELECT_RUN_METADATA_SQL} WHERE session_id = @sessionId ORDER BY updated_at DESC, run_id ASC`,
        { sessionId },
      );

      return rows.map((row) => mapRunMetadataRow(row, store.databasePath));
    },
    async loadCheckpoint(
      runId: string,
    ): Promise<RuntimeRunCheckpointRecord | null> {
      assertNonEmptyString(runId, 'runId', store.databasePath);
      const row = await store.get<RunMetadataRow>(
        `${SELECT_RUN_METADATA_SQL} WHERE run_id = @runId LIMIT 1`,
        { runId },
      );

      if (!row) {
        return null;
      }

      return extractCheckpoint(
        parseMetadataJson(row.metadata_json, store.databasePath, runId),
      );
    },
    async save(
      record: RuntimeRunMetadataRecord,
    ): Promise<RuntimeRunMetadataRecord> {
      assertRunMetadataRecord(record, store.databasePath);

      return store.withTransaction((database) => {
        database
          .prepare(
            `
              INSERT INTO runtime_run_metadata (
                run_id,
                session_id,
                job_id,
                metadata_json,
                created_at,
                updated_at
              ) VALUES (
                @runId,
                @sessionId,
                @jobId,
                @metadataJson,
                @createdAt,
                @updatedAt
              )
              ON CONFLICT(run_id) DO UPDATE SET
                session_id = excluded.session_id,
                job_id = excluded.job_id,
                metadata_json = excluded.metadata_json,
                updated_at = excluded.updated_at
            `,
          )
          .run({
            createdAt: record.createdAt,
            jobId: record.jobId,
            metadataJson: JSON.stringify(record.metadata),
            runId: record.runId,
            sessionId: record.sessionId,
            updatedAt: record.updatedAt,
          });

        const row = selectRunMetadataById(database, record.runId);

        if (!row) {
          throw new OperationalStoreError(
            'operational-store-init-failed',
            store.databasePath,
            `Runtime run metadata was not persisted: ${record.runId}`,
          );
        }

        return mapRunMetadataRow(row, store.databasePath);
      });
    },
    async saveCheckpoint(
      input: RuntimeRunCheckpointSaveInput,
    ): Promise<RuntimeRunMetadataRecord> {
      assertNonEmptyString(input.runId, 'runId', store.databasePath);
      assertNonEmptyString(input.sessionId, 'sessionId', store.databasePath);
      assertNonEmptyString(
        input.checkpoint.updatedAt,
        'checkpoint.updatedAt',
        store.databasePath,
      );

      return store.withTransaction((database) => {
        const existingRow = selectRunMetadataById(database, input.runId);
        const existingMetadata = existingRow
          ? parseMetadataJson(
              existingRow.metadata_json,
              store.databasePath,
              input.runId,
            )
          : {};
        const metadataObject = isJsonObject(existingMetadata)
          ? { ...existingMetadata }
          : {
              legacyValue: existingMetadata,
            };
        const nextMetadata = {
          ...metadataObject,
          checkpoint: normalizeCheckpoint(input.checkpoint),
        };
        const createdAt = existingRow?.created_at ?? input.checkpoint.updatedAt;

        database
          .prepare(
            `
              INSERT INTO runtime_run_metadata (
                run_id,
                session_id,
                job_id,
                metadata_json,
                created_at,
                updated_at
              ) VALUES (
                @runId,
                @sessionId,
                @jobId,
                @metadataJson,
                @createdAt,
                @updatedAt
              )
              ON CONFLICT(run_id) DO UPDATE SET
                session_id = excluded.session_id,
                job_id = excluded.job_id,
                metadata_json = excluded.metadata_json,
                updated_at = excluded.updated_at
            `,
          )
          .run({
            createdAt,
            jobId: input.jobId,
            metadataJson: JSON.stringify(nextMetadata),
            runId: input.runId,
            sessionId: input.sessionId,
            updatedAt: input.checkpoint.updatedAt,
          });

        const row = selectRunMetadataById(database, input.runId);

        if (!row) {
          throw new OperationalStoreError(
            'operational-store-init-failed',
            store.databasePath,
            `Runtime run checkpoint was not persisted: ${input.runId}`,
          );
        }

        return mapRunMetadataRow(row, store.databasePath);
      });
    },
  };
}

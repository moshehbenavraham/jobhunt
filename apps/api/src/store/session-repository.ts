import type { DatabaseSync } from 'node:sqlite';
import type {
  RuntimeSessionHeartbeatInput,
  RuntimeSessionRecord,
  RuntimeSessionStatus,
  SessionRepository,
} from './store-contract.js';
import {
  OperationalStoreError,
  type SqliteStoreContext,
} from './sqlite-store.js';

type SessionRow = {
  active_job_id: string | null;
  context_json: string;
  created_at: string;
  last_heartbeat_at: string | null;
  runner_id: string | null;
  session_id: string;
  status: RuntimeSessionStatus;
  updated_at: string;
  workflow: string;
};

const SELECT_SESSION_SQL = `
  SELECT
    session_id,
    workflow,
    status,
    context_json,
    created_at,
    updated_at,
    last_heartbeat_at,
    runner_id,
    active_job_id
  FROM runtime_sessions
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
      `Runtime session ${fieldName} must not be empty.`,
    );
  }
}

function assertSessionRecord(
  record: RuntimeSessionRecord,
  databasePath: string,
): void {
  assertNonEmptyString(record.sessionId, 'sessionId', databasePath);
  assertNonEmptyString(record.workflow, 'workflow', databasePath);
  assertNonEmptyString(record.status, 'status', databasePath);
  assertNonEmptyString(record.createdAt, 'createdAt', databasePath);
  assertNonEmptyString(record.updatedAt, 'updatedAt', databasePath);
}

function parseContextJson(
  serializedContext: string,
  databasePath: string,
  sessionId: string,
) {
  try {
    return JSON.parse(serializedContext);
  } catch (error) {
    throw new OperationalStoreError(
      'operational-store-corrupt',
      databasePath,
      `Runtime session ${sessionId} contains invalid JSON context.`,
      { cause: error },
    );
  }
}

function mapSessionRow(
  row: SessionRow,
  databasePath: string,
): RuntimeSessionRecord {
  return {
    activeJobId: row.active_job_id,
    context: parseContextJson(row.context_json, databasePath, row.session_id),
    createdAt: row.created_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    runnerId: row.runner_id,
    sessionId: row.session_id,
    status: row.status,
    updatedAt: row.updated_at,
    workflow: row.workflow,
  };
}

function selectSessionById(
  database: DatabaseSync,
  sessionId: string,
): SessionRow | null {
  return (
    (database
      .prepare(`${SELECT_SESSION_SQL} WHERE session_id = @sessionId LIMIT 1`)
      .get({ sessionId }) as SessionRow | undefined) ?? null
  );
}

export function createSessionRepository(
  store: SqliteStoreContext,
): SessionRepository {
  return {
    async getById(sessionId: string): Promise<RuntimeSessionRecord | null> {
      assertNonEmptyString(sessionId, 'sessionId', store.databasePath);
      const row = await store.get<SessionRow>(
        `${SELECT_SESSION_SQL} WHERE session_id = @sessionId LIMIT 1`,
        { sessionId },
      );

      return row ? mapSessionRow(row, store.databasePath) : null;
    },
    async listActive(): Promise<RuntimeSessionRecord[]> {
      const rows = await store.all<SessionRow>(
        `
          ${SELECT_SESSION_SQL}
          WHERE status IN ('running', 'waiting')
          ORDER BY
            COALESCE(last_heartbeat_at, updated_at) DESC,
            session_id ASC
        `,
      );

      return rows.map((row) => mapSessionRow(row, store.databasePath));
    },
    async listByStatus(
      status: RuntimeSessionStatus,
    ): Promise<RuntimeSessionRecord[]> {
      assertNonEmptyString(status, 'status', store.databasePath);
      const rows = await store.all<SessionRow>(
        `${SELECT_SESSION_SQL} WHERE status = @status ORDER BY updated_at DESC, session_id ASC`,
        { status },
      );

      return rows.map((row) => mapSessionRow(row, store.databasePath));
    },
    async save(record: RuntimeSessionRecord): Promise<RuntimeSessionRecord> {
      assertSessionRecord(record, store.databasePath);

      return store.withTransaction((database) => {
        database
          .prepare(
            `
              INSERT INTO runtime_sessions (
                session_id,
                workflow,
                status,
                context_json,
                created_at,
                updated_at,
                last_heartbeat_at,
                runner_id,
                active_job_id
              ) VALUES (
                @sessionId,
                @workflow,
                @status,
                @contextJson,
                @createdAt,
                @updatedAt,
                @lastHeartbeatAt,
                @runnerId,
                @activeJobId
              )
              ON CONFLICT(session_id) DO UPDATE SET
                workflow = excluded.workflow,
                status = excluded.status,
                context_json = excluded.context_json,
                updated_at = excluded.updated_at,
                last_heartbeat_at = excluded.last_heartbeat_at,
                runner_id = excluded.runner_id,
                active_job_id = excluded.active_job_id
            `,
          )
          .run({
            activeJobId: record.activeJobId,
            contextJson: JSON.stringify(record.context),
            createdAt: record.createdAt,
            lastHeartbeatAt: record.lastHeartbeatAt,
            runnerId: record.runnerId,
            sessionId: record.sessionId,
            status: record.status,
            updatedAt: record.updatedAt,
            workflow: record.workflow,
          });

        const row = selectSessionById(database, record.sessionId);

        if (!row) {
          throw new OperationalStoreError(
            'operational-store-init-failed',
            store.databasePath,
            `Runtime session was not persisted: ${record.sessionId}`,
          );
        }

        return mapSessionRow(row, store.databasePath);
      });
    },
    async touchHeartbeat(
      input: RuntimeSessionHeartbeatInput,
    ): Promise<RuntimeSessionRecord> {
      assertNonEmptyString(input.sessionId, 'sessionId', store.databasePath);
      assertNonEmptyString(input.status, 'status', store.databasePath);
      assertNonEmptyString(input.timestamp, 'timestamp', store.databasePath);

      return store.withTransaction((database) => {
        const result = database
          .prepare(
            `
              UPDATE runtime_sessions
              SET
                status = @status,
                last_heartbeat_at = @timestamp,
                runner_id = @runnerId,
                active_job_id = @activeJobId,
                updated_at = @timestamp
              WHERE session_id = @sessionId
            `,
          )
          .run({
            activeJobId: input.activeJobId,
            runnerId: input.runnerId,
            sessionId: input.sessionId,
            status: input.status,
            timestamp: input.timestamp,
          });

        if (result.changes === 0) {
          throw new OperationalStoreError(
            'operational-store-invalid-input',
            store.databasePath,
            `Runtime session does not exist for heartbeat update: ${input.sessionId}`,
          );
        }

        const row = selectSessionById(database, input.sessionId);

        if (!row) {
          throw new OperationalStoreError(
            'operational-store-init-failed',
            store.databasePath,
            `Runtime session heartbeat update was not persisted: ${input.sessionId}`,
          );
        }

        return mapSessionRow(row, store.databasePath);
      });
    },
  };
}

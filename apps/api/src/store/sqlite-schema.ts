import type { DatabaseSync } from 'node:sqlite';

export const OPERATIONAL_STORE_SCHEMA_VERSION = 1;

export const OPERATIONAL_STORE_REQUIRED_TABLES = [
  'runtime_approvals',
  'runtime_jobs',
  'runtime_run_metadata',
  'runtime_sessions',
] as const;

const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS runtime_sessions (
      session_id TEXT PRIMARY KEY,
      workflow TEXT NOT NULL,
      status TEXT NOT NULL,
      context_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_heartbeat_at TEXT
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_sessions_status_updated_at_idx
    ON runtime_sessions (status, updated_at DESC);
  `,
  `
    CREATE TABLE IF NOT EXISTS runtime_jobs (
      job_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      result_json TEXT,
      error_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions (session_id)
        ON DELETE CASCADE
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_jobs_session_status_updated_at_idx
    ON runtime_jobs (session_id, status, updated_at DESC);
  `,
  `
    CREATE TABLE IF NOT EXISTS runtime_approvals (
      approval_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      job_id TEXT,
      status TEXT NOT NULL,
      request_json TEXT NOT NULL,
      response_json TEXT,
      requested_at TEXT NOT NULL,
      resolved_at TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions (session_id)
        ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES runtime_jobs (job_id)
        ON DELETE SET NULL
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_approvals_session_status_requested_at_idx
    ON runtime_approvals (session_id, status, requested_at DESC);
  `,
  `
    CREATE TABLE IF NOT EXISTS runtime_run_metadata (
      run_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      job_id TEXT,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions (session_id)
        ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES runtime_jobs (job_id)
        ON DELETE SET NULL
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_run_metadata_session_updated_at_idx
    ON runtime_run_metadata (session_id, updated_at DESC);
  `,
] as const;

export function applyOperationalStoreSchema(database: DatabaseSync): void {
  database.exec(`PRAGMA foreign_keys = ON;`);

  for (const statement of SCHEMA_STATEMENTS) {
    database.exec(statement);
  }

  database.exec(`PRAGMA user_version = ${OPERATIONAL_STORE_SCHEMA_VERSION};`);
}

export function listMissingOperationalStoreTables(
  tableNames: readonly string[],
): string[] {
  const availableTables = new Set(tableNames);

  return OPERATIONAL_STORE_REQUIRED_TABLES.filter(
    (tableName) => !availableTables.has(tableName),
  );
}

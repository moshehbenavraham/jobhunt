import type { DatabaseSync } from 'node:sqlite';

export const OPERATIONAL_STORE_SCHEMA_VERSION = 3;

export const OPERATIONAL_STORE_REQUIRED_TABLES = [
  'runtime_approvals',
  'runtime_events',
  'runtime_jobs',
  'runtime_run_metadata',
  'runtime_sessions',
] as const;

const CREATE_TABLE_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS runtime_sessions (
      session_id TEXT PRIMARY KEY,
      workflow TEXT NOT NULL,
      status TEXT NOT NULL,
      context_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_heartbeat_at TEXT,
      runner_id TEXT,
      active_job_id TEXT
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS runtime_jobs (
      job_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 1,
      retry_backoff_ms INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      result_json TEXT,
      error_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      claim_owner_id TEXT,
      claim_token TEXT,
      last_heartbeat_at TEXT,
      lease_expires_at TEXT,
      next_attempt_at TEXT,
      run_id TEXT,
      wait_reason TEXT,
      wait_approval_id TEXT,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions (session_id)
        ON DELETE CASCADE
    );
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
      trace_id TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions (session_id)
        ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES runtime_jobs (job_id)
        ON DELETE SET NULL
    );
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
    CREATE TABLE IF NOT EXISTS runtime_events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT,
      job_id TEXT,
      approval_id TEXT,
      request_id TEXT,
      trace_id TEXT,
      event_type TEXT NOT NULL,
      level TEXT NOT NULL,
      summary TEXT NOT NULL,
      metadata_json TEXT,
      occurred_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES runtime_sessions (session_id)
        ON DELETE SET NULL,
      FOREIGN KEY (job_id) REFERENCES runtime_jobs (job_id)
        ON DELETE SET NULL,
      FOREIGN KEY (approval_id) REFERENCES runtime_approvals (approval_id)
        ON DELETE SET NULL
    );
  `,
] as const;

const INDEX_STATEMENTS = [
  `
    CREATE INDEX IF NOT EXISTS runtime_sessions_status_updated_at_idx
    ON runtime_sessions (status, updated_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_sessions_status_heartbeat_idx
    ON runtime_sessions (status, last_heartbeat_at DESC, session_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_jobs_session_status_updated_at_idx
    ON runtime_jobs (session_id, status, updated_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_jobs_claimable_idx
    ON runtime_jobs (
      status,
      next_attempt_at ASC,
      lease_expires_at ASC,
      updated_at ASC,
      job_id ASC
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_jobs_claim_token_idx
    ON runtime_jobs (claim_token);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_jobs_run_id_idx
    ON runtime_jobs (run_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_jobs_wait_reason_next_attempt_idx
    ON runtime_jobs (wait_reason, next_attempt_at ASC, updated_at ASC, job_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_approvals_session_status_requested_at_idx
    ON runtime_approvals (session_id, status, requested_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_approvals_job_status_requested_at_idx
    ON runtime_approvals (job_id, status, requested_at DESC, approval_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_approvals_trace_requested_at_idx
    ON runtime_approvals (trace_id, requested_at DESC, approval_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_run_metadata_session_updated_at_idx
    ON runtime_run_metadata (session_id, updated_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_run_metadata_job_updated_at_idx
    ON runtime_run_metadata (job_id, updated_at DESC, run_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_events_occurred_at_idx
    ON runtime_events (occurred_at DESC, event_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_events_session_occurred_at_idx
    ON runtime_events (session_id, occurred_at DESC, event_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_events_job_occurred_at_idx
    ON runtime_events (job_id, occurred_at DESC, event_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS runtime_events_trace_occurred_at_idx
    ON runtime_events (trace_id, occurred_at DESC, event_id ASC);
  `,
] as const;

const TABLE_COLUMN_MIGRATIONS = {
  runtime_jobs: [
    'ALTER TABLE runtime_jobs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 1;',
    'ALTER TABLE runtime_jobs ADD COLUMN retry_backoff_ms INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE runtime_jobs ADD COLUMN claim_owner_id TEXT;',
    'ALTER TABLE runtime_jobs ADD COLUMN claim_token TEXT;',
    'ALTER TABLE runtime_jobs ADD COLUMN last_heartbeat_at TEXT;',
    'ALTER TABLE runtime_jobs ADD COLUMN lease_expires_at TEXT;',
    'ALTER TABLE runtime_jobs ADD COLUMN next_attempt_at TEXT;',
    'ALTER TABLE runtime_jobs ADD COLUMN run_id TEXT;',
    'ALTER TABLE runtime_jobs ADD COLUMN wait_reason TEXT;',
    'ALTER TABLE runtime_jobs ADD COLUMN wait_approval_id TEXT;',
  ],
  runtime_approvals: [
    'ALTER TABLE runtime_approvals ADD COLUMN trace_id TEXT;',
  ],
  runtime_sessions: [
    'ALTER TABLE runtime_sessions ADD COLUMN runner_id TEXT;',
    'ALTER TABLE runtime_sessions ADD COLUMN active_job_id TEXT;',
  ],
} as const;

function listTableColumns(database: DatabaseSync, tableName: string): Set<string> {
  const rows = database
    .prepare(`PRAGMA table_info(${tableName});`)
    .all() as Array<{ name?: string }>;

  return new Set(
    rows
      .map((row) => row.name)
      .filter((columnName): columnName is string => typeof columnName === 'string'),
  );
}

function extractAddedColumnName(statement: string): string {
  const match = statement.match(/ADD COLUMN ([a-z_]+)/i);

  if (!match?.[1]) {
    throw new Error(`Unable to determine migrated column name from: ${statement}`);
  }

  return match[1];
}

function applyColumnMigrations(
  database: DatabaseSync,
  tableName: keyof typeof TABLE_COLUMN_MIGRATIONS,
): void {
  const existingColumns = listTableColumns(database, tableName);

  for (const statement of TABLE_COLUMN_MIGRATIONS[tableName]) {
    const columnName = extractAddedColumnName(statement);

    if (existingColumns.has(columnName)) {
      continue;
    }

    database.exec(statement);
    existingColumns.add(columnName);
  }
}

export function applyOperationalStoreSchema(database: DatabaseSync): void {
  database.exec(`PRAGMA foreign_keys = ON;`);

  for (const statement of CREATE_TABLE_STATEMENTS) {
    database.exec(statement);
  }

  applyColumnMigrations(database, 'runtime_sessions');
  applyColumnMigrations(database, 'runtime_jobs');
  applyColumnMigrations(database, 'runtime_approvals');

  for (const statement of INDEX_STATEMENTS) {
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

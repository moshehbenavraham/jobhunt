import {
  DatabaseSync,
  type SQLInputValue,
  type StatementResultingChanges,
} from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import {
  ensureAppStateRoot,
  getOperationalStoreFileStatus,
  resolveOperationalStorePath,
} from '../config/app-state-root.js';
import type { RepoPathOptions } from '../config/repo-paths.js';
import {
  applyOperationalStoreSchema,
  listMissingOperationalStoreTables,
  OPERATIONAL_STORE_SCHEMA_VERSION,
} from './sqlite-schema.js';
import type {
  OperationalStoreErrorCode,
  OperationalStoreStatus,
} from './store-contract.js';

const DEFAULT_BUSY_TIMEOUT_MS = 250;
const DEFAULT_LOCK_RETRY_ATTEMPTS = 3;
const DEFAULT_LOCK_RETRY_BASE_DELAY_MS = 25;

type SqliteStatementParameters = Record<string, SQLInputValue>;

export type SqliteStoreContext = {
  all: <TRow extends object>(
    sql: string,
    parameters?: SqliteStatementParameters,
  ) => Promise<TRow[]>;
  close: () => Promise<void>;
  databasePath: string;
  get: <TRow extends object>(
    sql: string,
    parameters?: SqliteStatementParameters,
  ) => Promise<TRow | null>;
  getStatus: () => Promise<OperationalStoreStatus>;
  run: (
    sql: string,
    parameters?: SqliteStatementParameters,
  ) => Promise<StatementResultingChanges>;
  withTransaction: <TResult>(
    callback: (database: DatabaseSync) => TResult,
  ) => Promise<TResult>;
};

export class OperationalStoreError extends Error {
  readonly code: OperationalStoreErrorCode;
  readonly databasePath: string;

  constructor(
    code: OperationalStoreErrorCode,
    databasePath: string,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, options);
    this.code = code;
    this.databasePath = databasePath;
    this.name = 'OperationalStoreError';
  }
}

function isDatabaseLockedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /database is locked|database table is locked/i.test(error.message);
}

function isDatabaseCorruptionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /file is not a database|database disk image is malformed/i.test(
    error.message,
  );
}

function isConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /constraint failed|foreign key mismatch|foreign key constraint failed/i.test(
    error.message,
  );
}

function mapOperationalStoreError(
  error: unknown,
  databasePath: string,
  action: string,
): OperationalStoreError {
  if (error instanceof OperationalStoreError) {
    return error;
  }

  if (isDatabaseLockedError(error)) {
    return new OperationalStoreError(
      'operational-store-locked',
      databasePath,
      `Operational store is locked while attempting to ${action}: ${databasePath}`,
      { cause: error },
    );
  }

  if (isDatabaseCorruptionError(error)) {
    return new OperationalStoreError(
      'operational-store-corrupt',
      databasePath,
      `Operational store is corrupt while attempting to ${action}: ${databasePath}`,
      { cause: error },
    );
  }

  if (isConstraintError(error)) {
    return new OperationalStoreError(
      'operational-store-invalid-input',
      databasePath,
      `Operational store rejected invalid input while attempting to ${action}: ${databasePath}`,
      { cause: error },
    );
  }

  return new OperationalStoreError(
    'operational-store-init-failed',
    databasePath,
    `Operational store failed while attempting to ${action}: ${databasePath}`,
    { cause: error },
  );
}

async function runWithRetry<TResult>(
  databasePath: string,
  action: string,
  operation: () => TResult,
): Promise<TResult> {
  for (
    let attempt = 0;
    attempt < DEFAULT_LOCK_RETRY_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return operation();
    } catch (error) {
      const mappedError = mapOperationalStoreError(error, databasePath, action);

      if (
        mappedError.code !== 'operational-store-locked' ||
        attempt === DEFAULT_LOCK_RETRY_ATTEMPTS - 1
      ) {
        throw mappedError;
      }

      await delay(DEFAULT_LOCK_RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }

  throw new OperationalStoreError(
    'operational-store-locked',
    databasePath,
    `Operational store remained locked after retrying: ${databasePath}`,
  );
}

function configureWritableConnection(database: DatabaseSync): void {
  database.exec(`PRAGMA foreign_keys = ON;`);
  database.exec(`PRAGMA busy_timeout = ${DEFAULT_BUSY_TIMEOUT_MS};`);
  database.exec(`PRAGMA journal_mode = WAL;`);
}

function readStoreSchemaState(database: DatabaseSync): {
  missingTables: string[];
  userVersion: number;
} {
  const versionRow = database
    .prepare(`PRAGMA user_version;`)
    .get() as { user_version?: number } | undefined;
  const tableRows = database
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `,
    )
    .all() as Array<{ name: string }>;

  return {
    missingTables: listMissingOperationalStoreTables(
      tableRows.map((row) => row.name),
    ),
    userVersion: versionRow?.user_version ?? 0,
  };
}

export async function inspectOperationalStoreStatus(
  options: RepoPathOptions = {},
): Promise<OperationalStoreStatus> {
  const fileStatus = await getOperationalStoreFileStatus(options);

  if (!fileStatus.rootExists) {
    return {
      databasePath: fileStatus.databasePath,
      message: 'Operational store is absent because the app-state root does not exist yet.',
      reason: 'root-missing',
      rootExists: false,
      rootPath: fileStatus.rootPath,
      status: 'absent',
    };
  }

  if (!fileStatus.exists) {
    return {
      databasePath: fileStatus.databasePath,
      message: 'Operational store is absent because the database file has not been initialized yet.',
      reason: 'database-missing',
      rootExists: true,
      rootPath: fileStatus.rootPath,
      status: 'absent',
    };
  }

  if (fileStatus.kind !== 'file') {
    return {
      databasePath: fileStatus.databasePath,
      message: `Operational store path must be a file: ${fileStatus.databasePath}`,
      reason: 'path-not-file',
      rootExists: true,
      rootPath: fileStatus.rootPath,
      status: 'corrupt',
    };
  }

  let database: DatabaseSync | undefined;

  try {
    database = new DatabaseSync(fileStatus.databasePath, { readOnly: true });
    const schemaState = readStoreSchemaState(database);

    if (
      schemaState.userVersion < OPERATIONAL_STORE_SCHEMA_VERSION ||
      schemaState.missingTables.length > 0
    ) {
      const missingTables =
        schemaState.missingTables.length > 0
          ? ` Missing tables: ${schemaState.missingTables.join(', ')}.`
          : '';

      return {
        databasePath: fileStatus.databasePath,
        message:
          `Operational store schema is absent or incomplete at ${fileStatus.databasePath}.` +
          missingTables,
        reason: 'schema-missing',
        rootExists: true,
        rootPath: fileStatus.rootPath,
        status: 'absent',
      };
    }

    return {
      databasePath: fileStatus.databasePath,
      message: `Operational store is ready at ${fileStatus.databasePath}.`,
      reason: null,
      rootExists: true,
      rootPath: fileStatus.rootPath,
      status: 'ready',
    };
  } catch (error) {
    const mappedError = mapOperationalStoreError(
      error,
      fileStatus.databasePath,
      'inspect the operational store',
    );
    const reason =
      mappedError.code === 'operational-store-locked'
        ? 'database-locked'
        : mappedError.code === 'operational-store-corrupt'
          ? 'database-corrupt'
        : 'database-open-failed';

    return {
      databasePath: fileStatus.databasePath,
      message: mappedError.message,
      reason,
      rootExists: true,
      rootPath: fileStatus.rootPath,
      status: 'corrupt',
    };
  } finally {
    database?.close();
  }
}

export async function createSqliteStore(
  options: RepoPathOptions = {},
): Promise<SqliteStoreContext> {
  await ensureAppStateRoot(options);

  const databasePath = resolveOperationalStorePath(options);
  const database = await runWithRetry(
    databasePath,
    'open the operational store',
    () => new DatabaseSync(databasePath),
  );

  try {
    await runWithRetry(
      databasePath,
      'configure the operational store connection',
      () => {
        configureWritableConnection(database);
      },
    );
    await runWithRetry(databasePath, 'initialize the operational store schema', () => {
      applyOperationalStoreSchema(database);
    });
  } catch (error) {
    database.close();
    throw mapOperationalStoreError(
      error,
      databasePath,
      'initialize the operational store',
    );
  }

  let closed = false;

  function assertOpen(): void {
    if (closed) {
      throw new OperationalStoreError(
        'operational-store-closed',
        databasePath,
        `Operational store is closed: ${databasePath}`,
      );
    }
  }

  return {
    async all<TRow extends object>(
      sql: string,
      parameters: SqliteStatementParameters = {},
    ): Promise<TRow[]> {
      assertOpen();

      return runWithRetry(databasePath, 'read from the operational store', () => {
        const statement = database.prepare(sql);
        return statement.all(parameters) as TRow[];
      });
    },
    async close(): Promise<void> {
      if (closed) {
        return;
      }

      closed = true;
      database.close();
    },
    databasePath,
    async get<TRow extends object>(
      sql: string,
      parameters: SqliteStatementParameters = {},
    ): Promise<TRow | null> {
      assertOpen();

      return runWithRetry(databasePath, 'read from the operational store', () => {
        const statement = database.prepare(sql);
        return (statement.get(parameters) as TRow | undefined) ?? null;
      });
    },
    async getStatus(): Promise<OperationalStoreStatus> {
      return inspectOperationalStoreStatus(options);
    },
    async run(
      sql: string,
      parameters: SqliteStatementParameters = {},
    ): Promise<StatementResultingChanges> {
      assertOpen();

      return runWithRetry(databasePath, 'write to the operational store', () => {
        const statement = database.prepare(sql);
        return statement.run(parameters);
      });
    },
    async withTransaction<TResult>(
      callback: (transactionDatabase: DatabaseSync) => TResult,
    ): Promise<TResult> {
      assertOpen();

      return runWithRetry(databasePath, 'open an operational-store transaction', () => {
        database.exec('BEGIN IMMEDIATE;');

        try {
          const result = callback(database);
          database.exec('COMMIT;');
          return result;
        } catch (error) {
          try {
            database.exec('ROLLBACK;');
          } catch (rollbackError) {
            throw new AggregateError(
              [error, rollbackError],
              `Operational store transaction failed and rollback was not clean: ${databasePath}`,
            );
          }

          throw error;
        }
      });
    },
  };
}

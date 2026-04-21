import type { DatabaseSync } from 'node:sqlite';
import type {
  ApprovalRepository,
  RuntimeApprovalPendingListInput,
  RuntimeApprovalRecord,
  RuntimeApprovalResolutionInput,
  RuntimeApprovalResolutionResult,
  RuntimeApprovalStatus,
} from './store-contract.js';
import {
  OperationalStoreError,
  type SqliteStoreContext,
} from './sqlite-store.js';

type ApprovalRow = {
  approval_id: string;
  job_id: string | null;
  request_json: string;
  requested_at: string;
  resolved_at: string | null;
  response_json: string | null;
  session_id: string;
  status: RuntimeApprovalStatus;
  trace_id: string | null;
  updated_at: string;
};

const SELECT_APPROVAL_SQL = `
  SELECT
    approval_id,
    session_id,
    job_id,
    status,
    request_json,
    response_json,
    requested_at,
    resolved_at,
    trace_id,
    updated_at
  FROM runtime_approvals
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
      `Runtime approval ${fieldName} must not be empty.`,
    );
  }
}

function parseJsonValue(
  serializedValue: string | null,
  databasePath: string,
  approvalId: string,
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
      `Runtime approval ${approvalId} contains invalid JSON in ${fieldName}.`,
      { cause: error },
    );
  }
}

function assertApprovalRecord(
  record: RuntimeApprovalRecord,
  databasePath: string,
): void {
  assertNonEmptyString(record.approvalId, 'approvalId', databasePath);
  assertNonEmptyString(record.sessionId, 'sessionId', databasePath);
  assertNonEmptyString(record.status, 'status', databasePath);
  assertNonEmptyString(record.requestedAt, 'requestedAt', databasePath);
  assertNonEmptyString(record.updatedAt, 'updatedAt', databasePath);
}

function mapApprovalRow(
  row: ApprovalRow,
  databasePath: string,
): RuntimeApprovalRecord {
  return {
    approvalId: row.approval_id,
    jobId: row.job_id,
    request: parseJsonValue(
      row.request_json,
      databasePath,
      row.approval_id,
      'request_json',
    ),
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    response: parseJsonValue(
      row.response_json,
      databasePath,
      row.approval_id,
      'response_json',
    ),
    sessionId: row.session_id,
    status: row.status,
    traceId: row.trace_id,
    updatedAt: row.updated_at,
  };
}

function selectApprovalById(
  database: DatabaseSync,
  approvalId: string,
): ApprovalRow | null {
  return (
    (database
      .prepare(`${SELECT_APPROVAL_SQL} WHERE approval_id = @approvalId LIMIT 1`)
      .get({ approvalId }) as ApprovalRow | undefined) ?? null
  );
}

export function createApprovalRepository(
  store: SqliteStoreContext,
): ApprovalRepository {
  function normalizePendingListInput(
    input: RuntimeApprovalPendingListInput = {},
  ): Required<RuntimeApprovalPendingListInput> {
    const limit = input.limit ?? 25;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new OperationalStoreError(
        'operational-store-invalid-input',
        store.databasePath,
        'Runtime approval pending list limit must be an integer between 1 and 100.',
      );
    }

    return {
      limit,
      sessionId: input.sessionId ?? '',
    };
  }

  return {
    async getById(approvalId: string): Promise<RuntimeApprovalRecord | null> {
      assertNonEmptyString(approvalId, 'approvalId', store.databasePath);
      const row = await store.get<ApprovalRow>(
        `${SELECT_APPROVAL_SQL} WHERE approval_id = @approvalId LIMIT 1`,
        { approvalId },
      );

      return row ? mapApprovalRow(row, store.databasePath) : null;
    },
    async listByJobId(jobId: string): Promise<RuntimeApprovalRecord[]> {
      assertNonEmptyString(jobId, 'jobId', store.databasePath);
      const rows = await store.all<ApprovalRow>(
        `${SELECT_APPROVAL_SQL} WHERE job_id = @jobId ORDER BY requested_at DESC, approval_id ASC`,
        { jobId },
      );

      return rows.map((row) => mapApprovalRow(row, store.databasePath));
    },
    async listBySessionId(
      sessionId: string,
    ): Promise<RuntimeApprovalRecord[]> {
      assertNonEmptyString(sessionId, 'sessionId', store.databasePath);
      const rows = await store.all<ApprovalRow>(
        `${SELECT_APPROVAL_SQL} WHERE session_id = @sessionId ORDER BY requested_at DESC, approval_id ASC`,
        { sessionId },
      );

      return rows.map((row) => mapApprovalRow(row, store.databasePath));
    },
    async listPending(
      input: RuntimeApprovalPendingListInput = {},
    ): Promise<RuntimeApprovalRecord[]> {
      const normalizedInput = normalizePendingListInput(input);
      const rows = await store.all<ApprovalRow>(
        `
          ${SELECT_APPROVAL_SQL}
          WHERE status = 'pending'
            AND (
              @sessionId = ''
              OR session_id = @sessionId
            )
          ORDER BY requested_at ASC, approval_id ASC
          LIMIT @limit
        `,
        normalizedInput,
      );

      return rows.map((row) => mapApprovalRow(row, store.databasePath));
    },
    async resolve(
      input: RuntimeApprovalResolutionInput,
    ): Promise<RuntimeApprovalResolutionResult> {
      assertNonEmptyString(input.approvalId, 'approvalId', store.databasePath);
      assertNonEmptyString(input.status, 'status', store.databasePath);
      assertNonEmptyString(input.resolvedAt, 'resolvedAt', store.databasePath);
      assertNonEmptyString(input.updatedAt, 'updatedAt', store.databasePath);

      return store.withTransaction((database) => {
        const result = database
          .prepare(
            `
              UPDATE runtime_approvals
              SET
                status = @status,
                response_json = @responseJson,
                resolved_at = @resolvedAt,
                updated_at = @updatedAt
              WHERE approval_id = @approvalId
                AND status = 'pending'
            `,
          )
          .run({
            approvalId: input.approvalId,
            resolvedAt: input.resolvedAt,
            responseJson:
              input.response === null ? null : JSON.stringify(input.response),
            status: input.status,
            updatedAt: input.updatedAt,
          });
        const row = selectApprovalById(database, input.approvalId);

        if (!row) {
          throw new OperationalStoreError(
            'operational-store-invalid-input',
            store.databasePath,
            `Runtime approval does not exist: ${input.approvalId}`,
          );
        }

        return {
          approval: mapApprovalRow(row, store.databasePath),
          applied: result.changes > 0,
        };
      });
    },
    async save(record: RuntimeApprovalRecord): Promise<RuntimeApprovalRecord> {
      assertApprovalRecord(record, store.databasePath);

      return store.withTransaction((database) => {
        database
          .prepare(
            `
              INSERT INTO runtime_approvals (
                approval_id,
                session_id,
                job_id,
                status,
                request_json,
                response_json,
                requested_at,
                resolved_at,
                trace_id,
                updated_at
              ) VALUES (
                @approvalId,
                @sessionId,
                @jobId,
                @status,
                @requestJson,
                @responseJson,
                @requestedAt,
                @resolvedAt,
                @traceId,
                @updatedAt
              )
              ON CONFLICT(approval_id) DO UPDATE SET
                session_id = excluded.session_id,
                job_id = excluded.job_id,
                status = excluded.status,
                request_json = excluded.request_json,
                response_json = excluded.response_json,
                resolved_at = excluded.resolved_at,
                trace_id = excluded.trace_id,
                updated_at = excluded.updated_at
            `,
          )
          .run({
            approvalId: record.approvalId,
            jobId: record.jobId,
            requestJson: JSON.stringify(record.request),
            requestedAt: record.requestedAt,
            resolvedAt: record.resolvedAt,
            responseJson:
              record.response === null ? null : JSON.stringify(record.response),
            sessionId: record.sessionId,
            status: record.status,
            traceId: record.traceId,
            updatedAt: record.updatedAt,
          });

        const row = selectApprovalById(database, record.approvalId);

        if (!row) {
          throw new OperationalStoreError(
            'operational-store-init-failed',
            store.databasePath,
            `Runtime approval was not persisted: ${record.approvalId}`,
          );
        }

        return mapApprovalRow(row, store.databasePath);
      });
    },
  };
}

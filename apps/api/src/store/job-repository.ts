import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type {
  JobRepository,
  RuntimeJobApprovalRejectionInput,
  RuntimeJobApprovalTransitionInput,
  RuntimeJobClaimInput,
  RuntimeJobHeartbeatInput,
  RuntimeJobRecord,
  RuntimeJobStatus,
  RuntimeJobTerminalStateInput,
  RuntimeJobWaitingStateInput,
} from './store-contract.js';
import {
  OperationalStoreError,
  type SqliteStoreContext,
} from './sqlite-store.js';

type JobRow = {
  attempt: number;
  claim_owner_id: string | null;
  claim_token: string | null;
  completed_at: string | null;
  created_at: string;
  error_json: string | null;
  job_id: string;
  job_type: string;
  last_heartbeat_at: string | null;
  lease_expires_at: string | null;
  max_attempts: number;
  next_attempt_at: string | null;
  payload_json: string;
  retry_backoff_ms: number;
  result_json: string | null;
  run_id: string | null;
  session_id: string;
  started_at: string | null;
  status: RuntimeJobStatus;
  updated_at: string;
  wait_approval_id: string | null;
  wait_reason: RuntimeJobRecord['waitReason'];
};

const SELECT_JOB_SQL = `
  SELECT
    job_id,
    session_id,
    job_type,
    status,
    attempt,
    max_attempts,
    retry_backoff_ms,
    payload_json,
    result_json,
    error_json,
    created_at,
    updated_at,
    started_at,
    completed_at,
    claim_owner_id,
    claim_token,
    last_heartbeat_at,
    lease_expires_at,
    next_attempt_at,
    run_id,
    wait_reason,
    wait_approval_id
  FROM runtime_jobs
`;

const CLAIMABLE_JOB_WHERE_SQL = `
  (
    status = 'queued'
    OR (
      status = 'waiting'
      AND COALESCE(wait_reason, 'retry') = 'retry'
      AND next_attempt_at IS NOT NULL
      AND next_attempt_at <= @now
    )
    OR (
      status = 'running'
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at <= @now
    )
  )
`;

const CLAIMABLE_JOB_ORDER_SQL = `
  ORDER BY
    CASE status
      WHEN 'running' THEN 0
      WHEN 'waiting' THEN 1
      ELSE 2
    END ASC,
    CASE
      WHEN status = 'running' THEN lease_expires_at
      WHEN status = 'waiting' THEN next_attempt_at
      ELSE updated_at
    END ASC,
    created_at ASC,
    job_id ASC
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

function assertPositiveInteger(
  value: number,
  fieldName: string,
  databasePath: string,
): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new OperationalStoreError(
      'operational-store-invalid-input',
      databasePath,
      `Runtime job ${fieldName} must be a positive integer.`,
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
  assertNonEmptyString(record.currentRunId, 'currentRunId', databasePath);
  assertNonNegativeInteger(record.attempt, 'attempt', databasePath);
  assertPositiveInteger(record.maxAttempts, 'maxAttempts', databasePath);
  assertNonNegativeInteger(
    record.retryBackoffMs,
    'retryBackoffMs',
    databasePath,
  );
}

function mapJobRow(row: JobRow, databasePath: string): RuntimeJobRecord {
  return {
    attempt: row.attempt,
    claimOwnerId: row.claim_owner_id,
    claimToken: row.claim_token,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    currentRunId: row.run_id ?? row.job_id,
    error: parseJsonValue(
      row.error_json,
      databasePath,
      row.job_id,
      'error_json',
    ),
    jobId: row.job_id,
    jobType: row.job_type,
    lastHeartbeatAt: row.last_heartbeat_at,
    leaseExpiresAt: row.lease_expires_at,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    payload: parseJsonValue(
      row.payload_json,
      databasePath,
      row.job_id,
      'payload_json',
    ),
    retryBackoffMs: row.retry_backoff_ms,
    result: parseJsonValue(
      row.result_json,
      databasePath,
      row.job_id,
      'result_json',
    ),
    sessionId: row.session_id,
    startedAt: row.started_at,
    status: row.status,
    updatedAt: row.updated_at,
    waitApprovalId: row.wait_approval_id,
    waitReason: row.wait_reason,
  };
}

function selectJobById(database: DatabaseSync, jobId: string): JobRow | null {
  return (
    (database
      .prepare(`${SELECT_JOB_SQL} WHERE job_id = @jobId LIMIT 1`)
      .get({ jobId }) as JobRow | undefined) ?? null
  );
}

function selectClaimableJob(
  database: DatabaseSync,
  now: string,
): JobRow | null {
  return (
    (database
      .prepare(
        `${SELECT_JOB_SQL} WHERE ${CLAIMABLE_JOB_WHERE_SQL} ${CLAIMABLE_JOB_ORDER_SQL} LIMIT 1`,
      )
      .get({ now }) as JobRow | undefined) ?? null
  );
}

function readClaimedJobOrThrow(
  database: DatabaseSync,
  store: SqliteStoreContext,
  jobId: string,
  claimToken: string,
): RuntimeJobRecord {
  const row = selectJobById(database, jobId);

  if (!row) {
    throw new OperationalStoreError(
      'operational-store-init-failed',
      store.databasePath,
      `Runtime job was not found after update: ${jobId}`,
    );
  }

  const record = mapJobRow(row, store.databasePath);

  if (record.claimToken !== claimToken && record.status === 'running') {
    throw new OperationalStoreError(
      'operational-store-invalid-input',
      store.databasePath,
      `Runtime job claim token no longer owns running job ${jobId}.`,
    );
  }

  return record;
}

function readJobOrThrow(
  database: DatabaseSync,
  store: SqliteStoreContext,
  jobId: string,
): RuntimeJobRecord {
  const row = selectJobById(database, jobId);

  if (!row) {
    throw new OperationalStoreError(
      'operational-store-init-failed',
      store.databasePath,
      `Runtime job was not found after update: ${jobId}`,
    );
  }

  return mapJobRow(row, store.databasePath);
}

function assertClaimInput(
  input:
    | RuntimeJobHeartbeatInput
    | RuntimeJobTerminalStateInput
    | RuntimeJobWaitingStateInput,
  databasePath: string,
): void {
  assertNonEmptyString(input.jobId, 'jobId', databasePath);
  assertNonEmptyString(input.claimToken, 'claimToken', databasePath);
  assertNonEmptyString(input.timestamp, 'timestamp', databasePath);
}

function assertClaimOperationInput(
  input: RuntimeJobClaimInput,
  databasePath: string,
): void {
  assertNonEmptyString(input.claimOwnerId, 'claimOwnerId', databasePath);
  assertNonEmptyString(input.claimToken, 'claimToken', databasePath);
  assertNonEmptyString(input.leaseExpiresAt, 'leaseExpiresAt', databasePath);
  assertNonEmptyString(input.timestamp, 'timestamp', databasePath);
}

function updateClaimedJobState(
  database: DatabaseSync,
  store: SqliteStoreContext,
  input:
    | RuntimeJobTerminalStateInput
    | RuntimeJobWaitingStateInput
    | RuntimeJobHeartbeatInput,
  sql: string,
  parameters: Record<string, SQLInputValue>,
): RuntimeJobRecord {
  const result = database.prepare(sql).run(parameters);
  const record = readClaimedJobOrThrow(
    database,
    store,
    input.jobId,
    input.claimToken,
  );

  if (result.changes === 0 && record.status === 'running') {
    throw new OperationalStoreError(
      'operational-store-invalid-input',
      store.databasePath,
      `Runtime job claim token no longer owns running job ${input.jobId}.`,
    );
  }

  return record;
}

export function createJobRepository(store: SqliteStoreContext): JobRepository {
  return {
    async approveWaiting(
      input: RuntimeJobApprovalTransitionInput,
    ): Promise<RuntimeJobRecord> {
      assertNonEmptyString(input.approvalId, 'approvalId', store.databasePath);
      assertNonEmptyString(input.jobId, 'jobId', store.databasePath);
      assertNonEmptyString(input.timestamp, 'timestamp', store.databasePath);

      return store.withTransaction((database) => {
        const result = database
          .prepare(
            `
              UPDATE runtime_jobs
              SET
                status = 'queued',
                error_json = NULL,
                result_json = NULL,
                claim_owner_id = NULL,
                claim_token = NULL,
                last_heartbeat_at = NULL,
                lease_expires_at = NULL,
                next_attempt_at = NULL,
                completed_at = NULL,
                wait_reason = NULL,
                wait_approval_id = NULL,
                updated_at = @timestamp
              WHERE job_id = @jobId
                AND status = 'waiting'
                AND wait_reason = 'approval'
                AND wait_approval_id = @approvalId
            `,
          )
          .run({
            approvalId: input.approvalId,
            jobId: input.jobId,
            timestamp: input.timestamp,
          });
        const record = readJobOrThrow(database, store, input.jobId);

        if (
          result.changes === 0 &&
          record.status === 'waiting' &&
          record.waitReason === 'approval' &&
          record.waitApprovalId !== input.approvalId
        ) {
          throw new OperationalStoreError(
            'operational-store-invalid-input',
            store.databasePath,
            `Runtime job is waiting on a different approval: ${input.jobId}`,
          );
        }

        return record;
      });
    },
    async cancel(
      input: RuntimeJobTerminalStateInput,
    ): Promise<RuntimeJobRecord> {
      assertClaimInput(input, store.databasePath);

      return store.withTransaction((database) =>
        updateClaimedJobState(
          database,
          store,
          input,
          `
            UPDATE runtime_jobs
            SET
              status = @status,
              result_json = @resultJson,
              error_json = @errorJson,
              completed_at = @timestamp,
              claim_owner_id = NULL,
              claim_token = NULL,
              last_heartbeat_at = NULL,
              lease_expires_at = NULL,
              next_attempt_at = NULL,
              wait_reason = NULL,
              wait_approval_id = NULL,
              updated_at = @timestamp
            WHERE job_id = @jobId
              AND claim_token = @claimToken
              AND status = 'running'
          `,
          {
            claimToken: input.claimToken,
            errorJson:
              input.error === null ? null : JSON.stringify(input.error),
            jobId: input.jobId,
            resultJson:
              input.result === null ? null : JSON.stringify(input.result),
            status: input.status,
            timestamp: input.timestamp,
          },
        ),
      );
    },
    async claimNext(
      input: RuntimeJobClaimInput,
    ): Promise<RuntimeJobRecord | null> {
      assertClaimOperationInput(input, store.databasePath);

      return store.withTransaction((database) => {
        const row = selectClaimableJob(database, input.timestamp);

        if (!row) {
          return null;
        }

        const attempt =
          row.status === 'running' ? row.attempt : row.attempt + 1;
        database
          .prepare(
            `
              UPDATE runtime_jobs
              SET
                status = 'running',
                attempt = @attempt,
                claim_owner_id = @claimOwnerId,
                claim_token = @claimToken,
                last_heartbeat_at = @timestamp,
                lease_expires_at = @leaseExpiresAt,
                next_attempt_at = NULL,
                wait_reason = NULL,
                wait_approval_id = NULL,
                started_at = COALESCE(started_at, @timestamp),
                run_id = COALESCE(run_id, @runId),
                updated_at = @timestamp
              WHERE job_id = @jobId
                AND ${CLAIMABLE_JOB_WHERE_SQL}
            `,
          )
          .run({
            attempt,
            claimOwnerId: input.claimOwnerId,
            claimToken: input.claimToken,
            jobId: row.job_id,
            leaseExpiresAt: input.leaseExpiresAt,
            now: input.timestamp,
            runId: row.run_id ?? row.job_id,
            timestamp: input.timestamp,
          });

        return readClaimedJobOrThrow(
          database,
          store,
          row.job_id,
          input.claimToken,
        );
      });
    },
    async complete(
      input: RuntimeJobTerminalStateInput,
    ): Promise<RuntimeJobRecord> {
      assertClaimInput(input, store.databasePath);

      return store.withTransaction((database) =>
        updateClaimedJobState(
          database,
          store,
          input,
          `
            UPDATE runtime_jobs
            SET
              status = @status,
              result_json = @resultJson,
              error_json = @errorJson,
              completed_at = @timestamp,
              claim_owner_id = NULL,
              claim_token = NULL,
              last_heartbeat_at = NULL,
              lease_expires_at = NULL,
              next_attempt_at = NULL,
              wait_reason = NULL,
              wait_approval_id = NULL,
              updated_at = @timestamp
            WHERE job_id = @jobId
              AND claim_token = @claimToken
              AND status = 'running'
          `,
          {
            claimToken: input.claimToken,
            errorJson:
              input.error === null ? null : JSON.stringify(input.error),
            jobId: input.jobId,
            resultJson:
              input.result === null ? null : JSON.stringify(input.result),
            status: input.status,
            timestamp: input.timestamp,
          },
        ),
      );
    },
    async fail(input: RuntimeJobTerminalStateInput): Promise<RuntimeJobRecord> {
      assertClaimInput(input, store.databasePath);

      return store.withTransaction((database) =>
        updateClaimedJobState(
          database,
          store,
          input,
          `
            UPDATE runtime_jobs
            SET
              status = @status,
              result_json = @resultJson,
              error_json = @errorJson,
              completed_at = @timestamp,
              claim_owner_id = NULL,
              claim_token = NULL,
              last_heartbeat_at = NULL,
              lease_expires_at = NULL,
              next_attempt_at = NULL,
              wait_reason = NULL,
              wait_approval_id = NULL,
              updated_at = @timestamp
            WHERE job_id = @jobId
              AND claim_token = @claimToken
              AND status = 'running'
          `,
          {
            claimToken: input.claimToken,
            errorJson:
              input.error === null ? null : JSON.stringify(input.error),
            jobId: input.jobId,
            resultJson:
              input.result === null ? null : JSON.stringify(input.result),
            status: input.status,
            timestamp: input.timestamp,
          },
        ),
      );
    },
    async getById(jobId: string): Promise<RuntimeJobRecord | null> {
      assertNonEmptyString(jobId, 'jobId', store.databasePath);
      const row = await store.get<JobRow>(
        `${SELECT_JOB_SQL} WHERE job_id = @jobId LIMIT 1`,
        { jobId },
      );

      return row ? mapJobRow(row, store.databasePath) : null;
    },
    async listClaimable(now: string): Promise<RuntimeJobRecord[]> {
      assertNonEmptyString(now, 'now', store.databasePath);
      const rows = await store.all<JobRow>(
        `${SELECT_JOB_SQL} WHERE ${CLAIMABLE_JOB_WHERE_SQL} ${CLAIMABLE_JOB_ORDER_SQL}`,
        { now },
      );

      return rows.map((row) => mapJobRow(row, store.databasePath));
    },
    async listRecoverable(now: string): Promise<RuntimeJobRecord[]> {
      assertNonEmptyString(now, 'now', store.databasePath);
      const rows = await store.all<JobRow>(
        `
          ${SELECT_JOB_SQL}
          WHERE status = 'running'
            AND lease_expires_at IS NOT NULL
            AND lease_expires_at <= @now
          ORDER BY lease_expires_at ASC, updated_at ASC, job_id ASC
        `,
        { now },
      );

      return rows.map((row) => mapJobRow(row, store.databasePath));
    },
    async listBySessionId(sessionId: string): Promise<RuntimeJobRecord[]> {
      assertNonEmptyString(sessionId, 'sessionId', store.databasePath);
      const rows = await store.all<JobRow>(
        `${SELECT_JOB_SQL} WHERE session_id = @sessionId ORDER BY updated_at DESC, job_id ASC`,
        { sessionId },
      );

      return rows.map((row) => mapJobRow(row, store.databasePath));
    },
    async rejectWaiting(
      input: RuntimeJobApprovalRejectionInput,
    ): Promise<RuntimeJobRecord> {
      assertNonEmptyString(input.approvalId, 'approvalId', store.databasePath);
      assertNonEmptyString(input.jobId, 'jobId', store.databasePath);
      assertNonEmptyString(input.timestamp, 'timestamp', store.databasePath);

      return store.withTransaction((database) => {
        const result = database
          .prepare(
            `
              UPDATE runtime_jobs
              SET
                status = 'failed',
                error_json = @errorJson,
                result_json = NULL,
                claim_owner_id = NULL,
                claim_token = NULL,
                last_heartbeat_at = NULL,
                lease_expires_at = NULL,
                next_attempt_at = NULL,
                completed_at = @timestamp,
                wait_reason = NULL,
                wait_approval_id = NULL,
                updated_at = @timestamp
              WHERE job_id = @jobId
                AND status = 'waiting'
                AND wait_reason = 'approval'
                AND wait_approval_id = @approvalId
            `,
          )
          .run({
            approvalId: input.approvalId,
            errorJson: JSON.stringify(input.error),
            jobId: input.jobId,
            timestamp: input.timestamp,
          });
        const record = readJobOrThrow(database, store, input.jobId);

        if (
          result.changes === 0 &&
          record.status === 'waiting' &&
          record.waitReason === 'approval' &&
          record.waitApprovalId !== input.approvalId
        ) {
          throw new OperationalStoreError(
            'operational-store-invalid-input',
            store.databasePath,
            `Runtime job is waiting on a different approval: ${input.jobId}`,
          );
        }

        return record;
      });
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
                max_attempts,
                retry_backoff_ms,
                payload_json,
                result_json,
                error_json,
                created_at,
                updated_at,
                started_at,
                completed_at,
                claim_owner_id,
                claim_token,
                last_heartbeat_at,
                lease_expires_at,
                next_attempt_at,
                run_id,
                wait_reason,
                wait_approval_id
              ) VALUES (
                @jobId,
                @sessionId,
                @jobType,
                @status,
                @attempt,
                @maxAttempts,
                @retryBackoffMs,
                @payloadJson,
                @resultJson,
                @errorJson,
                @createdAt,
                @updatedAt,
                @startedAt,
                @completedAt,
                @claimOwnerId,
                @claimToken,
                @lastHeartbeatAt,
                @leaseExpiresAt,
                @nextAttemptAt,
                @runId,
                @waitReason,
                @waitApprovalId
              )
              ON CONFLICT(job_id) DO UPDATE SET
                session_id = excluded.session_id,
                job_type = excluded.job_type,
                status = excluded.status,
                attempt = excluded.attempt,
                max_attempts = excluded.max_attempts,
                retry_backoff_ms = excluded.retry_backoff_ms,
                payload_json = excluded.payload_json,
                result_json = excluded.result_json,
                error_json = excluded.error_json,
                updated_at = excluded.updated_at,
                started_at = excluded.started_at,
                completed_at = excluded.completed_at,
                claim_owner_id = excluded.claim_owner_id,
                claim_token = excluded.claim_token,
                last_heartbeat_at = excluded.last_heartbeat_at,
                lease_expires_at = excluded.lease_expires_at,
                next_attempt_at = excluded.next_attempt_at,
                run_id = excluded.run_id,
                wait_reason = excluded.wait_reason,
                wait_approval_id = excluded.wait_approval_id
            `,
          )
          .run({
            attempt: record.attempt,
            claimOwnerId: record.claimOwnerId,
            claimToken: record.claimToken,
            completedAt: record.completedAt,
            createdAt: record.createdAt,
            errorJson:
              record.error === null ? null : JSON.stringify(record.error),
            jobId: record.jobId,
            jobType: record.jobType,
            lastHeartbeatAt: record.lastHeartbeatAt,
            leaseExpiresAt: record.leaseExpiresAt,
            maxAttempts: record.maxAttempts,
            nextAttemptAt: record.nextAttemptAt,
            payloadJson: JSON.stringify(record.payload),
            retryBackoffMs: record.retryBackoffMs,
            resultJson:
              record.result === null ? null : JSON.stringify(record.result),
            runId: record.currentRunId,
            sessionId: record.sessionId,
            startedAt: record.startedAt,
            status: record.status,
            updatedAt: record.updatedAt,
            waitApprovalId: record.waitApprovalId,
            waitReason: record.waitReason,
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
    async touchHeartbeat(
      input: RuntimeJobHeartbeatInput,
    ): Promise<RuntimeJobRecord> {
      assertClaimInput(input, store.databasePath);
      assertNonEmptyString(
        input.leaseExpiresAt,
        'leaseExpiresAt',
        store.databasePath,
      );

      return store.withTransaction((database) =>
        updateClaimedJobState(
          database,
          store,
          input,
          `
            UPDATE runtime_jobs
            SET
              last_heartbeat_at = @timestamp,
              lease_expires_at = @leaseExpiresAt,
              updated_at = @timestamp
            WHERE job_id = @jobId
              AND claim_token = @claimToken
              AND status = 'running'
          `,
          {
            claimToken: input.claimToken,
            jobId: input.jobId,
            leaseExpiresAt: input.leaseExpiresAt,
            timestamp: input.timestamp,
          },
        ),
      );
    },
    async wait(input: RuntimeJobWaitingStateInput): Promise<RuntimeJobRecord> {
      assertClaimInput(input, store.databasePath);

      if (input.waitReason === 'retry') {
        assertNonEmptyString(
          input.nextAttemptAt ?? '',
          'nextAttemptAt',
          store.databasePath,
        );
      }

      if (input.waitReason === 'approval') {
        assertNonEmptyString(
          input.approvalId ?? '',
          'approvalId',
          store.databasePath,
        );
      }

      return store.withTransaction((database) =>
        updateClaimedJobState(
          database,
          store,
          input,
          `
            UPDATE runtime_jobs
            SET
              status = 'waiting',
              result_json = @resultJson,
              error_json = @errorJson,
              claim_owner_id = NULL,
              claim_token = NULL,
              last_heartbeat_at = NULL,
              lease_expires_at = NULL,
              next_attempt_at = @nextAttemptAt,
              wait_reason = @waitReason,
              wait_approval_id = @approvalId,
              updated_at = @timestamp
            WHERE job_id = @jobId
              AND claim_token = @claimToken
              AND status = 'running'
          `,
          {
            claimToken: input.claimToken,
            errorJson:
              input.error === null ? null : JSON.stringify(input.error),
            jobId: input.jobId,
            nextAttemptAt: input.nextAttemptAt,
            resultJson:
              input.result === null ? null : JSON.stringify(input.result),
            timestamp: input.timestamp,
            approvalId: input.approvalId,
            waitReason: input.waitReason,
          },
        ),
      );
    },
  };
}

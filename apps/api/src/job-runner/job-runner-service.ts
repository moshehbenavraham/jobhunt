import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type {
  DurableJobCheckpoint,
  DurableJobDrainSummary,
  DurableJobEnqueueRequest,
  DurableJobEnqueueResult,
  DurableJobExecutionError,
  DurableJobFailureDetails,
  DurableJobRecoverySummary,
  DurableJobRunnerService,
  DurableJobRunnerServiceOptions,
} from './job-runner-contract.js';
import {
  DurableJobExecutionError as DurableJobExecutionErrorClass,
  DurableJobRunnerError,
} from './job-runner-contract.js';
import {
  getDurableJobExecutorOrThrow,
  parseDurableJobPayload,
} from './job-runner-executors.js';
import { decideRetryTransition } from './job-runner-state-machine.js';
import type {
  OperationalStore,
  RuntimeJobRecord,
  RuntimeSessionRecord,
  RuntimeSessionStatus,
} from '../store/store-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import type { RuntimeEventWriteInput } from '../observability/index.js';

const DEFAULT_HEARTBEAT_INTERVAL_MS = 1_000;
const DEFAULT_LEASE_DURATION_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_POLL_INTERVAL_MS = 250;
const DEFAULT_RETRY_BACKOFF_MS = 1_000;

function toIsoTimestamp(now: number): string {
  return new Date(now).toISOString();
}

function addMilliseconds(timestamp: string, ms: number): string {
  return new Date(Date.parse(timestamp) + ms).toISOString();
}

function toFailureDetails(error: DurableJobExecutionError): DurableJobFailureDetails {
  return {
    detail: error.detail,
    message: error.message,
    retryable: error.retryable,
  };
}

function normalizeExecutionError(error: unknown): DurableJobExecutionError {
  if (error instanceof DurableJobExecutionErrorClass) {
    return error;
  }

  if (error instanceof DurableJobRunnerError) {
    return new DurableJobExecutionErrorClass(error.message, {
      cause: error,
      detail: error.detail,
      retryable: false,
    });
  }

  if (error instanceof Error) {
    return new DurableJobExecutionErrorClass(error.message, {
      cause: error,
      retryable: false,
    });
  }

  return new DurableJobExecutionErrorClass(String(error), {
    retryable: false,
  });
}

function createInitialRunMetadata(): JsonValue {
  return {
    checkpoint: null,
  };
}

function buildJobTraceId(job: RuntimeJobRecord): string {
  return job.currentRunId;
}

async function synchronizeSessionState(
  store: OperationalStore,
  sessionId: string,
  timestamp: string,
): Promise<RuntimeSessionRecord> {
  const session = await store.sessions.getById(sessionId);

  if (!session) {
    throw new DurableJobRunnerError(
      'job-runner-job-not-found',
      `Runtime session does not exist: ${sessionId}.`,
    );
  }

  const jobs = await store.jobs.listBySessionId(sessionId);
  const runningJob = jobs.find((job) => job.status === 'running');
  const waitingJob = jobs.find((job) => job.status === 'waiting');
  const pendingJob = jobs.find(
    (job) => job.status === 'pending' || job.status === 'queued',
  );
  let status: RuntimeSessionStatus = 'pending';
  let activeJobId: string | null = null;
  let runnerId: string | null = null;

  if (runningJob) {
    status = 'running';
    activeJobId = runningJob.jobId;
    runnerId = runningJob.claimOwnerId;
  } else if (waitingJob) {
    status = 'waiting';
  } else if (pendingJob) {
    status = 'pending';
  } else if (jobs.length > 0 && jobs.every((job) => job.status === 'completed')) {
    status = 'completed';
  } else if (jobs.some((job) => job.status === 'failed')) {
    status = 'failed';
  } else if (jobs.length > 0 && jobs.every((job) => job.status === 'cancelled')) {
    status = 'cancelled';
  }

  return store.sessions.save({
    ...session,
    activeJobId,
    lastHeartbeatAt: timestamp,
    runnerId,
    status,
    updatedAt: timestamp,
  });
}

async function ensureSessionForEnqueue(
  store: OperationalStore,
  request: DurableJobEnqueueRequest,
  timestamp: string,
): Promise<RuntimeSessionRecord> {
  const existingSession = await store.sessions.getById(request.session.sessionId);

  if (existingSession) {
    return store.sessions.save({
      ...existingSession,
      context: request.session.context,
      updatedAt: timestamp,
      workflow: request.session.workflow,
    });
  }

  return store.sessions.save({
    activeJobId: null,
    context: request.session.context,
    createdAt: timestamp,
    lastHeartbeatAt: null,
    runnerId: null,
    sessionId: request.session.sessionId,
    status: 'pending',
    updatedAt: timestamp,
    workflow: request.session.workflow,
  });
}

async function ensureRunMetadata(
  store: OperationalStore,
  job: RuntimeJobRecord,
  timestamp: string,
) {
  const existing = await store.runMetadata.getByRunId(job.currentRunId);

  if (existing) {
    return existing;
  }

  return store.runMetadata.save({
    createdAt: timestamp,
    jobId: job.jobId,
    metadata: createInitialRunMetadata(),
    runId: job.currentRunId,
    sessionId: job.sessionId,
    updatedAt: timestamp,
  });
}

export function createDurableJobRunnerService(
  options: DurableJobRunnerServiceOptions,
): DurableJobRunnerService {
  if (!options.executors) {
    throw new DurableJobRunnerError(
      'job-runner-invalid-config',
      'Durable job runner requires an executor registry.',
    );
  }

  if (!options.getStore) {
    throw new DurableJobRunnerError(
      'job-runner-invalid-config',
      'Durable job runner requires an operational-store provider.',
    );
  }

  const heartbeatIntervalMs =
    options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  const leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;
  const now = options.now ?? Date.now;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const runnerId = options.runnerId ?? `durable-job-runner-${randomUUID()}`;

  if (heartbeatIntervalMs < 1 || leaseDurationMs < heartbeatIntervalMs) {
    throw new DurableJobRunnerError(
      'job-runner-invalid-config',
      'Durable job runner heartbeat and lease settings are invalid.',
    );
  }

  let backgroundFailure: Error | null = null;
  let disposed = false;
  let drainPromise: Promise<DurableJobDrainSummary> | null = null;
  let latestRecoverySummary: DurableJobRecoverySummary | null = null;
  let loopController: AbortController | null = null;
  let loopPromise: Promise<void> | null = null;
  const activeExecutionControllers = new Map<string, AbortController>();
  const activeExecutions = new Map<string, Promise<void>>();

  function assertActive(): void {
    if (disposed) {
      throw new Error('Durable job runner has already been disposed.');
    }

    if (backgroundFailure) {
      throw backgroundFailure;
    }
  }

  async function getStore(): Promise<OperationalStore> {
    assertActive();
    return options.getStore();
  }

  async function getApprovalRuntime() {
    assertActive();

    if (!options.getApprovalRuntime) {
      throw new DurableJobRunnerError(
        'job-runner-invalid-config',
        'Durable job runner approval waits require an approval runtime provider.',
      );
    }

    return options.getApprovalRuntime();
  }

  async function recordRuntimeEvent(
    input: RuntimeEventWriteInput,
  ): Promise<void> {
    if (!options.getObservability) {
      return;
    }

    try {
      const observability = await options.getObservability();
      await observability.recordEvent(input);
    } catch {
      // Observability writes must not block durable job progress.
    }
  }

  async function persistHeartbeat(
    store: OperationalStore,
    job: RuntimeJobRecord,
    claimToken: string,
  ): Promise<void> {
    const timestamp = toIsoTimestamp(now());
    const leaseExpiresAt = addMilliseconds(timestamp, leaseDurationMs);

    await store.jobs.touchHeartbeat({
      claimToken,
      jobId: job.jobId,
      leaseExpiresAt,
      timestamp,
    });
    await store.sessions.touchHeartbeat({
      activeJobId: job.jobId,
      runnerId,
      sessionId: job.sessionId,
      status: 'running',
      timestamp,
    });
  }

  async function executeClaimedJob(
    summary: DurableJobDrainSummary,
    store: OperationalStore,
    claimedJob: RuntimeJobRecord,
    claimToken: string,
  ): Promise<void> {
    const executionController = new AbortController();
    let heartbeatFailure: unknown = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    const executionPromise = (async () => {
      const session = await store.sessions.getById(claimedJob.sessionId);

      if (!session) {
        const timestamp = toIsoTimestamp(now());
        await store.jobs.fail({
          claimToken,
          error: {
            message: `Runtime session does not exist: ${claimedJob.sessionId}.`,
            retryable: false,
          },
          jobId: claimedJob.jobId,
          result: null,
          status: 'failed',
          timestamp,
        });
        await recordRuntimeEvent({
          correlation: {
            approvalId: null,
            jobId: claimedJob.jobId,
            requestId: null,
            sessionId: claimedJob.sessionId,
            traceId: buildJobTraceId(claimedJob),
          },
          eventType: 'job-failed',
          level: 'error',
          metadata: {
            message: `Runtime session does not exist: ${claimedJob.sessionId}.`,
            runId: claimedJob.currentRunId,
          },
          occurredAt: timestamp,
          summary: `Job ${claimedJob.jobId} failed because its session is missing.`,
        });
        return;
      }

      const scheduleHeartbeat = (): void => {
        if (executionController.signal.aborted) {
          return;
        }

        heartbeatTimer = setTimeout(() => {
          void (async () => {
            try {
              await persistHeartbeat(store, claimedJob, claimToken);
              scheduleHeartbeat();
            } catch (error) {
              heartbeatFailure = error;
              executionController.abort();
            }
          })();
        }, heartbeatIntervalMs);
      };

      const saveCheckpoint = async (
        checkpoint: DurableJobCheckpoint,
      ) => {
        const timestamp = toIsoTimestamp(now());
        return store.runMetadata.saveCheckpoint({
          checkpoint: {
            ...checkpoint,
            updatedAt: timestamp,
          },
          jobId: claimedJob.jobId,
          runId: claimedJob.currentRunId,
          sessionId: claimedJob.sessionId,
        });
      };

      scheduleHeartbeat();

      try {
        const definition = getDurableJobExecutorOrThrow(
          options.executors,
          claimedJob.jobType,
        );
        const payload = parseDurableJobPayload(
          options.executors,
          claimedJob.jobType,
          claimedJob.payload,
        );
        const checkpoint = await store.runMetadata.loadCheckpoint(
          claimedJob.currentRunId,
        );
        const result = await definition.execute(payload, {
          attempt: claimedJob.attempt,
          bootstrapWorkflow: options.bootstrapWorkflow,
          checkpoint: checkpoint
            ? {
                completedSteps: checkpoint.completedSteps,
                cursor: checkpoint.cursor,
                value: checkpoint.value,
              }
            : null,
          currentRunId: claimedJob.currentRunId,
          job: claimedJob,
          saveCheckpoint,
          session,
          signal: executionController.signal,
          store,
          touchHeartbeat: async () => persistHeartbeat(store, claimedJob, claimToken),
        });

        if (heartbeatFailure) {
          throw heartbeatFailure;
        }

        const timestamp = toIsoTimestamp(now());

        if (result.status === 'waiting') {
          if (result.waitReason === 'approval') {
            const approvalRuntime = await getApprovalRuntime();
            const approval = await approvalRuntime.createApproval({
              requestedAt: timestamp,
              request: {
                action: result.approval.action,
                correlation: {
                  jobId: claimedJob.jobId,
                  requestId: null,
                  sessionId: claimedJob.sessionId,
                  traceId: result.approval.traceId ?? buildJobTraceId(claimedJob),
                },
                details: result.approval.details,
                title: result.approval.title,
              },
            });

            await store.jobs.wait({
              approvalId: approval.approval.approvalId,
              claimToken,
              error: null,
              jobId: claimedJob.jobId,
              nextAttemptAt: null,
              result: result.result,
              timestamp,
              waitReason: 'approval',
            });
            await synchronizeSessionState(store, claimedJob.sessionId, timestamp);
            summary.waitingJobIds.push(claimedJob.jobId);
            await recordRuntimeEvent({
              correlation: {
                approvalId: approval.approval.approvalId,
                jobId: claimedJob.jobId,
                requestId: null,
                sessionId: claimedJob.sessionId,
                traceId: approval.approval.traceId,
              },
              eventType: 'job-waiting-approval',
              metadata: {
                action: result.approval.action,
                runId: claimedJob.currentRunId,
                title: result.approval.title,
              },
              occurredAt: timestamp,
              summary: `Job ${claimedJob.jobId} is waiting for approval.`,
            });
            return;
          }

          await store.jobs.wait({
            approvalId: null,
            claimToken,
            error: null,
            jobId: claimedJob.jobId,
            nextAttemptAt: addMilliseconds(
              timestamp,
              Math.max(0, result.delayMs),
            ),
            result: result.result,
            timestamp,
            waitReason: 'retry',
          });
          await synchronizeSessionState(store, claimedJob.sessionId, timestamp);
          summary.waitingJobIds.push(claimedJob.jobId);
          await recordRuntimeEvent({
            correlation: {
              approvalId: null,
              jobId: claimedJob.jobId,
              requestId: null,
              sessionId: claimedJob.sessionId,
              traceId: buildJobTraceId(claimedJob),
            },
            eventType: 'job-waiting-retry',
            metadata: {
              nextAttemptAt: addMilliseconds(
                timestamp,
                Math.max(0, result.delayMs),
              ),
              runId: claimedJob.currentRunId,
            },
            occurredAt: timestamp,
            summary: `Job ${claimedJob.jobId} is waiting for retry.`,
          });
          return;
        }

        await store.jobs.complete({
          claimToken,
          error: null,
          jobId: claimedJob.jobId,
          result: result.result,
          status: 'completed',
          timestamp,
        });
        await synchronizeSessionState(store, claimedJob.sessionId, timestamp);
        summary.completedJobIds.push(claimedJob.jobId);
        await recordRuntimeEvent({
          correlation: {
            approvalId: null,
            jobId: claimedJob.jobId,
            requestId: null,
            sessionId: claimedJob.sessionId,
            traceId: buildJobTraceId(claimedJob),
          },
          eventType: 'job-completed',
          metadata: {
            attempt: claimedJob.attempt,
            runId: claimedJob.currentRunId,
          },
          occurredAt: timestamp,
          summary: `Job ${claimedJob.jobId} completed.`,
        });
      } catch (error) {
        if (executionController.signal.aborted && loopController?.signal.aborted) {
          return;
        }

        const normalizedError = normalizeExecutionError(error);
        const timestamp = toIsoTimestamp(now());
        const retryDecision = decideRetryTransition({
          attempt: claimedJob.attempt,
          errorMessage: normalizedError.message,
          now: timestamp,
          retryPolicy: {
            backoffMs: normalizedError.delayMs ?? claimedJob.retryBackoffMs,
            maxAttempts: claimedJob.maxAttempts,
          },
          retryable: normalizedError.retryable,
        });

        if (retryDecision.status === 'waiting' && retryDecision.nextAttemptAt) {
          await store.jobs.wait({
            approvalId: null,
            claimToken,
            error: toFailureDetails(normalizedError),
            jobId: claimedJob.jobId,
            nextAttemptAt: retryDecision.nextAttemptAt,
            result: null,
            timestamp,
            waitReason: 'retry',
          });
          await synchronizeSessionState(store, claimedJob.sessionId, timestamp);
          summary.waitingJobIds.push(claimedJob.jobId);
          await recordRuntimeEvent({
            correlation: {
              approvalId: null,
              jobId: claimedJob.jobId,
              requestId: null,
              sessionId: claimedJob.sessionId,
              traceId: buildJobTraceId(claimedJob),
            },
            eventType: 'job-waiting-retry',
            level: 'warn',
            metadata: {
              message: normalizedError.message,
              nextAttemptAt: retryDecision.nextAttemptAt,
              retryable: normalizedError.retryable,
              runId: claimedJob.currentRunId,
            },
            occurredAt: timestamp,
            summary: `Job ${claimedJob.jobId} is waiting for retry after an execution error.`,
          });
          return;
        }

        await store.jobs.fail({
          claimToken,
          error: toFailureDetails(normalizedError),
          jobId: claimedJob.jobId,
          result: null,
          status: 'failed',
          timestamp,
        });
        await synchronizeSessionState(store, claimedJob.sessionId, timestamp);
        await recordRuntimeEvent({
          correlation: {
            approvalId: null,
            jobId: claimedJob.jobId,
            requestId: null,
            sessionId: claimedJob.sessionId,
            traceId: buildJobTraceId(claimedJob),
          },
          eventType: 'job-failed',
          level: 'error',
          metadata: {
            message: normalizedError.message,
            retryable: normalizedError.retryable,
            runId: claimedJob.currentRunId,
          },
          occurredAt: timestamp,
          summary: `Job ${claimedJob.jobId} failed.`,
        });
      } finally {
        if (heartbeatTimer) {
          clearTimeout(heartbeatTimer);
        }
      }
    })();

    activeExecutionControllers.set(claimedJob.jobId, executionController);
    activeExecutions.set(claimedJob.jobId, executionPromise);

    try {
      await executionPromise;
    } finally {
      activeExecutionControllers.delete(claimedJob.jobId);
      activeExecutions.delete(claimedJob.jobId);
    }
  }

  async function performDrain(): Promise<DurableJobDrainSummary> {
    const store = await getStore();
    const scannedAt = toIsoTimestamp(now());
    const recoverableJobs = await store.jobs.listRecoverable(scannedAt);
    const summary: DurableJobDrainSummary = {
      claimedJobIds: [],
      completedJobIds: [],
      recoveredJobIds: recoverableJobs.map((job) => job.jobId),
      scannedAt,
      waitingJobIds: [],
    };

    latestRecoverySummary = {
      recoveredJobIds: summary.recoveredJobIds,
      runnerId,
      scannedAt,
    };

    if (activeExecutions.size > 0) {
      return summary;
    }

    const claimToken = `${runnerId}:${randomUUID()}`;
    const leaseExpiresAt = addMilliseconds(scannedAt, leaseDurationMs);
    const claimedJob = await store.jobs.claimNext({
      claimOwnerId: runnerId,
      claimToken,
      leaseExpiresAt,
      timestamp: scannedAt,
    });

    if (!claimedJob) {
      return summary;
    }

    summary.claimedJobIds.push(claimedJob.jobId);
    await store.sessions.touchHeartbeat({
      activeJobId: claimedJob.jobId,
      runnerId,
      sessionId: claimedJob.sessionId,
      status: 'running',
      timestamp: scannedAt,
    });
    await ensureRunMetadata(store, claimedJob, scannedAt);
    await recordRuntimeEvent({
      correlation: {
        approvalId: null,
        jobId: claimedJob.jobId,
        requestId: null,
        sessionId: claimedJob.sessionId,
        traceId: buildJobTraceId(claimedJob),
      },
      eventType: 'job-claimed',
      metadata: {
        attempt: claimedJob.attempt,
        runId: claimedJob.currentRunId,
        runnerId,
      },
      occurredAt: scannedAt,
      summary: `Job ${claimedJob.jobId} claimed by ${runnerId}.`,
    });
    await executeClaimedJob(summary, store, claimedJob, claimToken);

    return summary;
  }

  const service: DurableJobRunnerService = {
    async close(): Promise<void> {
      if (disposed) {
        return;
      }

      disposed = true;
      loopController?.abort();

      for (const controller of activeExecutionControllers.values()) {
        controller.abort();
      }

      await Promise.allSettled(activeExecutions.values());

      try {
        await loopPromise;
      } catch {
        // The loop is expected to stop on abort during shutdown.
      }
    },
    async drainOnce(): Promise<DurableJobDrainSummary> {
      assertActive();

      if (!drainPromise) {
        drainPromise = performDrain().finally(() => {
          drainPromise = null;
        });
      }

      return drainPromise;
    },
    async enqueue(request: DurableJobEnqueueRequest): Promise<DurableJobEnqueueResult> {
      assertActive();

      if (!request.jobId.trim()) {
        throw new DurableJobRunnerError(
          'job-runner-invalid-payload',
          'Durable job enqueue requests require a non-empty jobId.',
        );
      }

      if (!request.session.sessionId.trim()) {
        throw new DurableJobRunnerError(
          'job-runner-invalid-payload',
          'Durable job enqueue requests require a non-empty sessionId.',
        );
      }

      const parsedPayload = parseDurableJobPayload(
        options.executors,
        request.jobType,
        request.payload,
      );
      const store = await getStore();
      const timestamp = toIsoTimestamp(now());
      const existingJob = await store.jobs.getById(request.jobId);

      if (existingJob) {
        const runMetadata = await ensureRunMetadata(store, existingJob, timestamp);
        return {
          job: existingJob,
          runMetadata,
        };
      }

      await ensureSessionForEnqueue(store, request, timestamp);
      const job = await store.jobs.save({
        attempt: 0,
        claimOwnerId: null,
        claimToken: null,
        completedAt: null,
        createdAt: timestamp,
        currentRunId: request.currentRunId ?? request.jobId,
        error: null,
        jobId: request.jobId,
        jobType: request.jobType,
        lastHeartbeatAt: null,
        leaseExpiresAt: null,
        maxAttempts: request.retryPolicy?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        nextAttemptAt: null,
        payload: parsedPayload,
        result: null,
        retryBackoffMs:
          request.retryPolicy?.backoffMs ?? DEFAULT_RETRY_BACKOFF_MS,
        sessionId: request.session.sessionId,
        startedAt: null,
        status: 'queued',
        updatedAt: timestamp,
        waitApprovalId: null,
        waitReason: null,
      });
      const runMetadata = await ensureRunMetadata(store, job, timestamp);

      await synchronizeSessionState(store, request.session.sessionId, timestamp);

      return {
        job,
        runMetadata,
      };
    },
    getRecoverySummary(): DurableJobRecoverySummary | null {
      return latestRecoverySummary;
    },
    async start(): Promise<void> {
      assertActive();

      if (loopPromise) {
        return;
      }

      loopController = new AbortController();
      loopPromise = (async () => {
        while (!loopController?.signal.aborted) {
          try {
            await service.drainOnce();
          } catch (error) {
            if (loopController?.signal.aborted) {
              break;
            }

            backgroundFailure =
              error instanceof Error ? error : new Error(String(error));
            break;
          }

          try {
            await delay(pollIntervalMs, undefined, {
              signal: loopController.signal,
            });
          } catch {
            break;
          }
        }
      })();
    },
  };

  return service;
}

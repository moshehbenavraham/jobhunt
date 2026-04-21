import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { createDeferred } from './test-utils.js';
import {
  createDurableJobRunnerHarness,
  createTestExecutor,
  seedCheckpointedRunningJob,
} from './test-utils.js';

test('durable job runner enqueues work, persists checkpoints, and completes jobs', async () => {
  const harness = await createDurableJobRunnerHarness({
    executors: [
      createTestExecutor({
        description: 'Completes a single evaluation job.',
        execute: async (payload, context) => {
          await context.saveCheckpoint({
            completedSteps: ['validated'],
            cursor: 'step-1',
            value: {
              company: payload.company,
            },
          });

          return {
            result: {
              company: payload.company,
              ok: true,
            },
            status: 'completed',
          };
        },
        jobType: 'evaluate-job',
        payloadSchema: z.object({
          company: z.string(),
        }),
      }),
    ],
  });

  try {
    const enqueued = await harness.runner.enqueue({
      jobId: 'job-001',
      jobType: 'evaluate-job',
      payload: {
        company: 'Example Co',
      },
      session: {
        context: {
          workflow: 'single-evaluation',
        },
        sessionId: 'session-001',
        workflow: 'single-evaluation',
      },
    });

    assert.equal(enqueued.job.status, 'queued');

    const summary = await harness.runner.drainOnce();
    const persistedJob = await harness.store.jobs.getById('job-001');
    const checkpoint = await harness.store.runMetadata.loadCheckpoint('job-001');
    const session = await harness.store.sessions.getById('session-001');

    assert.deepEqual(summary.claimedJobIds, ['job-001']);
    assert.deepEqual(summary.completedJobIds, ['job-001']);
    assert.equal(persistedJob?.status, 'completed');
    assert.deepEqual(persistedJob?.result, {
      company: 'Example Co',
      ok: true,
    });
    assert.deepEqual(checkpoint, {
      completedSteps: ['validated'],
      cursor: 'step-1',
      updatedAt: checkpoint?.updatedAt ?? '',
      value: {
        company: 'Example Co',
      },
    });
    assert.equal(session?.status, 'completed');
  } finally {
    await harness.cleanup();
  }
});

test('durable job runner recovers stale running work and resumes from the saved checkpoint', async () => {
  const seenCheckpoints: Array<string[] | null> = [];
  const harness = await createDurableJobRunnerHarness({
    executors: [
      createTestExecutor({
        description: 'Resumes stale work from a saved checkpoint.',
        execute: async (_payload, context) => {
          seenCheckpoints.push(context.checkpoint?.completedSteps ?? null);

          await context.saveCheckpoint({
            completedSteps: ['downloaded-jd', 'scored-fit'],
            cursor: 'step-2',
            value: {
              page: 2,
            },
          });

          return {
            result: {
              resumed: true,
            },
            status: 'completed',
          };
        },
        jobType: 'evaluate-job',
        payloadSchema: z.object({
          company: z.string(),
        }),
      }),
    ],
  });

  try {
    await seedCheckpointedRunningJob(harness, {
      checkpoint: {
        completedSteps: ['downloaded-jd'],
        cursor: 'step-1',
        value: {
          page: 1,
        },
      },
      jobId: 'job-recovery',
      jobType: 'evaluate-job',
      payload: {
        company: 'Recovered Co',
      },
      sessionId: 'session-recovery',
      workflow: 'single-evaluation',
    });

    const summary = await harness.runner.drainOnce();
    const recoveredJob = await harness.store.jobs.getById('job-recovery');
    const checkpoint = await harness.store.runMetadata.loadCheckpoint(
      'job-recovery-run',
    );

    assert.deepEqual(summary.recoveredJobIds, ['job-recovery']);
    assert.deepEqual(summary.claimedJobIds, ['job-recovery']);
    assert.deepEqual(seenCheckpoints, [['downloaded-jd']]);
    assert.equal(recoveredJob?.status, 'completed');
    assert.equal(recoveredJob?.attempt, 1);
    assert.deepEqual(checkpoint, {
      completedSteps: ['downloaded-jd', 'scored-fit'],
      cursor: 'step-2',
      updatedAt: checkpoint?.updatedAt ?? '',
      value: {
        page: 2,
      },
    });
  } finally {
    await harness.cleanup();
  }
});

test('durable job runner prevents duplicate execution while a job is in flight', async () => {
  const started = createDeferred<void>();
  const release = createDeferred<void>();
  let executeCount = 0;
  const harness = await createDurableJobRunnerHarness({
    executors: [
      createTestExecutor({
        description: 'Blocks until the test releases the in-flight job.',
        execute: async () => {
          executeCount += 1;
          started.resolve();
          await release.promise;

          return {
            result: {
              done: true,
            },
            status: 'completed',
          };
        },
        jobType: 'evaluate-job',
        payloadSchema: z.object({
          company: z.string(),
        }),
      }),
    ],
  });

  try {
    await harness.runner.enqueue({
      jobId: 'job-duplicate',
      jobType: 'evaluate-job',
      payload: {
        company: 'Duplicate Co',
      },
      session: {
        context: {
          workflow: 'single-evaluation',
        },
        sessionId: 'session-duplicate',
        workflow: 'single-evaluation',
      },
    });

    const firstDrain = harness.runner.drainOnce();
    await started.promise;
    const secondDrain = harness.runner.drainOnce();

    assert.equal(executeCount, 1);

    release.resolve();
    await Promise.all([firstDrain, secondDrain]);

    const persistedJob = await harness.store.jobs.getById('job-duplicate');
    assert.equal(executeCount, 1);
    assert.equal(persistedJob?.status, 'completed');
  } finally {
    await harness.cleanup();
  }
});

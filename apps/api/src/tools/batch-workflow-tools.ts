import { z } from 'zod';
import {
  batchEvaluationPayloadSchema,
  type BatchEvaluationPayload,
} from '../job-runner/workflow-job-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';
import { enqueueWorkflowJob } from './workflow-enqueue.js';

const batchToolInputSchema = z.object({
  maxRetries: z.number().int().min(0).max(10).default(2),
  minScore: z.number().min(0).max(5).default(0),
  parallel: z.number().int().min(1).max(4).default(1),
  startFromId: z.number().int().min(0).default(0),
});

type BatchToolInput = z.output<typeof batchToolInputSchema>;

function createBatchTool(config: {
  description: string;
  dryRun: boolean;
  mode: BatchEvaluationPayload['mode'];
  name: string;
}): ToolDefinition<BatchToolInput, JsonValue> {
  return {
    description: config.description,
    async execute(input, context) {
      const payload = batchEvaluationPayloadSchema.parse({
        dryRun: config.dryRun,
        maxRetries: input.maxRetries,
        minScore: input.minScore,
        mode: config.mode,
        parallel: input.parallel,
        startFromId: input.startFromId,
      });
      const enqueued = await enqueueWorkflowJob({
        context,
        contextData: {
          dryRun: payload.dryRun,
          mode: payload.mode,
          startFromId: payload.startFromId,
        },
        payload,
        retryPolicy: {
          backoffMs: 2_000,
          maxAttempts: 2,
        },
        workflow: 'batch-evaluation',
      });

      return {
        output: {
          dryRun: payload.dryRun,
          jobId: enqueued.jobId,
          jobStatus: enqueued.jobStatus,
          mode: payload.mode,
          parallel: payload.parallel,
          requestStatus: enqueued.requestStatus,
          runId: enqueued.runId,
          startFromId: payload.startFromId,
          workflow: 'batch-evaluation',
        },
      };
    },
    inputSchema: batchToolInputSchema,
    name: config.name,
    policy: {
      permissions: {
        jobTypes: ['batch-evaluation'],
      },
    },
  };
}

export function createBatchWorkflowTools(): readonly AnyToolDefinition[] {
  return [
    createBatchTool({
      description:
        'Enqueue durable batch evaluation for runnable rows in batch/batch-input.tsv.',
      dryRun: false,
      mode: 'run-pending',
      name: 'start-batch-evaluation',
    }),
    createBatchTool({
      description:
        'Enqueue durable batch evaluation in retry-only mode for retryable infrastructure failures.',
      dryRun: false,
      mode: 'retry-failed',
      name: 'retry-batch-evaluation-failures',
    }),
    createBatchTool({
      description:
        'Enqueue a dry-run batch evaluation preview without launching worker executions.',
      dryRun: true,
      mode: 'run-pending',
      name: 'dry-run-batch-evaluation',
    }),
  ];
}

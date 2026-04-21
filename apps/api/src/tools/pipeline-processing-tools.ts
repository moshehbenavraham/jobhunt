import { z } from 'zod';
import {
  pipelineProcessingPayloadSchema,
  pipelineQueueSelectionSchema,
  type PipelineProcessingPayload,
  type PipelineQueueSelection,
} from '../job-runner/workflow-job-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import { ToolExecutionError } from './tool-errors.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';
import { enqueueWorkflowJob } from './workflow-enqueue.js';

const pipelineProcessingToolInputSchema = z.object({
  dryRun: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).nullable().default(null),
  selection: z.enum(['all', 'first', 'urls']).default('first'),
  urls: z.array(z.string().url()).max(50).default([]),
});

type PipelineProcessingToolInput = z.output<
  typeof pipelineProcessingToolInputSchema
>;

function normalizeQueueSelection(
  input: PipelineProcessingToolInput,
): PipelineQueueSelection {
  if (input.selection === 'urls') {
    return pipelineQueueSelectionSchema.parse({
      limit: input.limit,
      mode: 'selected-urls',
      urls: [...new Set(input.urls)],
    });
  }

  if (input.urls.length > 0) {
    throw new ToolExecutionError(
      'tool-invalid-input',
      'Pipeline URL overrides require selection="urls".',
      {
        detail: {
          selection: input.selection,
        },
      },
    );
  }

  if (input.selection === 'all') {
    return pipelineQueueSelectionSchema.parse({
      limit: input.limit,
      mode: 'all-pending',
      urls: [],
    });
  }

  return pipelineQueueSelectionSchema.parse({
    limit: input.limit ?? 1,
    mode: 'first-pending',
    urls: [],
  });
}

export function createPipelineProcessingTools(): readonly AnyToolDefinition[] {
  return [
    {
      description:
        'Normalize queue selection and enqueue durable pipeline processing for pending or explicitly selected pipeline URLs.',
      async execute(input, context) {
        const normalizedPayload: PipelineProcessingPayload =
          pipelineProcessingPayloadSchema.parse({
            dryRun: input.dryRun,
            queueSelection: normalizeQueueSelection(input),
          });
        const enqueued = await enqueueWorkflowJob({
          context,
          contextData: {
            dryRun: normalizedPayload.dryRun,
            queueSelection: normalizedPayload.queueSelection,
          },
          payload: normalizedPayload,
          retryPolicy: {
            backoffMs: 2_000,
            maxAttempts: 2,
          },
          workflow: 'process-pipeline',
        });

        return {
          output: {
            dryRun: normalizedPayload.dryRun,
            jobId: enqueued.jobId,
            jobStatus: enqueued.jobStatus,
            queueSelection: normalizedPayload.queueSelection,
            requestStatus: enqueued.requestStatus,
            runId: enqueued.runId,
            workflow: 'process-pipeline',
          },
        };
      },
      inputSchema: pipelineProcessingToolInputSchema,
      name: 'enqueue-pipeline-processing',
      policy: {
        permissions: {
          jobTypes: ['process-pipeline'],
        },
      },
    } satisfies ToolDefinition<PipelineProcessingToolInput, JsonValue>,
  ];
}

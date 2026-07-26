import {
  scanWorkflowPayloadSchema,
  type ScanWorkflowPayload,
} from '../job-runner/workflow-job-contract.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';
import { enqueueWorkflowJob } from './workflow-enqueue.js';

export function createScanWorkflowTools(): readonly AnyToolDefinition[] {
  return [
    {
      description:
        'Enqueue a durable portal scan job with typed scan arguments and duplicate-trigger protection while a matching scan is already live.',
      async execute(input, context) {
        const enqueued = await enqueueWorkflowJob({
          context,
          contextData: {
            company: input.company,
            dryRun: input.dryRun,
          },
          payload: input,
          retryPolicy: {
            backoffMs: 1_000,
            maxAttempts: 2,
          },
          workflow: 'scan-portals',
        });

        return {
          output: {
            compareClean: input.compareClean,
            company: input.company,
            dryRun: input.dryRun,
            jobId: enqueued.jobId,
            jobStatus: enqueued.jobStatus,
            requestStatus: enqueued.requestStatus,
            runId: enqueued.runId,
            workflow: 'scan-portals',
          },
        };
      },
      inputSchema: scanWorkflowPayloadSchema,
      name: 'enqueue-portal-scan',
      policy: {
        permissions: {
          jobTypes: ['scan-portals'],
        },
      },
    } satisfies ToolDefinition<ScanWorkflowPayload, JsonValue>,
  ];
}

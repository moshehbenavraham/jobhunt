import { createHash } from 'node:crypto';
import type { DurableJobRetryPolicy } from '../job-runner/index.js';
import type { WorkflowIntent } from '../prompt/prompt-types.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import type { ToolExecutionContext } from './tool-contract.js';

const terminalJobStatuses = new Set(['cancelled', 'completed', 'failed']);

function createStableWorkflowJobId(
  workflow: WorkflowIntent,
  sessionId: string,
  payload: JsonValue,
): string {
  const digest = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 12);

  return `${workflow}:${sessionId}:${digest}`;
}

export async function enqueueWorkflowJob(options: {
  context: ToolExecutionContext;
  contextData?: JsonValue | null;
  payload: JsonValue;
  retryPolicy?: Partial<DurableJobRetryPolicy>;
  workflow: WorkflowIntent;
}): Promise<{
  alreadyExists: boolean;
  jobId: string;
  jobStatus: string;
  requestStatus: 'accepted' | 'already-queued';
  runId: string;
}> {
  const baseJobId = createStableWorkflowJobId(
    options.workflow,
    options.context.correlation.sessionId,
    options.payload,
  );
  const initialResult = await options.context.enqueueJob({
    context: options.contextData ?? null,
    jobId: baseJobId,
    jobType: options.workflow,
    payload: options.payload,
    workflow: options.workflow,
    ...(options.retryPolicy
      ? {
          retryPolicy: options.retryPolicy,
        }
      : {}),
  });

  if (
    initialResult.alreadyExists &&
    terminalJobStatuses.has(initialResult.job.status)
  ) {
    const rerunJobId = `${baseJobId}:${options.context.correlation.jobId}`;
    const rerunResult = await options.context.enqueueJob({
      context: options.contextData ?? null,
      currentRunId: rerunJobId,
      jobId: rerunJobId,
      jobType: options.workflow,
      payload: options.payload,
      workflow: options.workflow,
      ...(options.retryPolicy
        ? {
            retryPolicy: options.retryPolicy,
          }
        : {}),
    });

    return {
      alreadyExists: false,
      jobId: rerunResult.job.jobId,
      jobStatus: rerunResult.job.status,
      requestStatus: 'accepted',
      runId: rerunResult.runMetadata.runId,
    };
  }

  return {
    alreadyExists: initialResult.alreadyExists,
    jobId: initialResult.job.jobId,
    jobStatus: initialResult.job.status,
    requestStatus: initialResult.alreadyExists ? 'already-queued' : 'accepted',
    runId: initialResult.runMetadata.runId,
  };
}

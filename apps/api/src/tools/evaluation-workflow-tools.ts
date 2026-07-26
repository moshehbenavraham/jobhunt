import { z } from 'zod';
import type {
  AgentRuntimeBootstrap,
  AgentRuntimeBootstrapError,
} from '../agent-runtime/index.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';

const supportedWorkflowValues = ['auto-pipeline', 'single-evaluation'] as const;
type SupportedWorkflow = (typeof supportedWorkflowValues)[number];

const emptyInputSchema = z.object({});

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function serializeReadyBootstrap(
  workflow: SupportedWorkflow,
  bootstrap: AgentRuntimeBootstrap,
): JsonValue {
  return toJsonValue({
    auth: bootstrap.auth,
    config: bootstrap.config,
    model: bootstrap.model,
    prompt: bootstrap.prompt,
    promptBundle: bootstrap.promptBundle,
    startedAt: bootstrap.startedAt,
    status: 'ready',
    workflow,
  });
}

function serializeBootstrapFailure(
  workflow: SupportedWorkflow,
  error: AgentRuntimeBootstrapError,
): JsonValue {
  return toJsonValue({
    auth: error.auth ?? null,
    message: error.message,
    prompt: error.prompt ?? null,
    status: error.code,
    workflow,
  });
}

function createWorkflowBootstrapTool(
  workflow: SupportedWorkflow,
  options: {
    bootstrapWorkflow: (
      workflow: SupportedWorkflow,
    ) => Promise<AgentRuntimeBootstrap>;
  },
): ToolDefinition<Record<string, never>, JsonValue> {
  return {
    description: `Bootstrap the ${workflow} workflow through the authenticated agent runtime and return a typed readiness envelope.`,
    async execute() {
      try {
        return {
          output: serializeReadyBootstrap(
            workflow,
            await options.bootstrapWorkflow(workflow),
          ),
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'AgentRuntimeBootstrapError'
        ) {
          return {
            output: serializeBootstrapFailure(
              workflow,
              error as AgentRuntimeBootstrapError,
            ),
          };
        }

        throw error;
      }
    },
    inputSchema: emptyInputSchema,
    name: `bootstrap-${workflow}`,
  };
}

export function createEvaluationWorkflowTools(options: {
  bootstrapWorkflow: (
    workflow: SupportedWorkflow,
  ) => Promise<AgentRuntimeBootstrap>;
}): readonly AnyToolDefinition[] {
  return supportedWorkflowValues.map((workflow) =>
    createWorkflowBootstrapTool(workflow, options),
  );
}

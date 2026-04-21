import { z } from 'zod';
import type { ApprovalRuntimeService } from '../approval-runtime/index.js';
import type { ObservabilityService } from '../observability/index.js';
import type {
  OperationalStore,
  RuntimeJobRecord,
  RuntimeSessionRecord,
} from '../store/index.js';
import type {
  JsonValue,
  WorkspaceMutationTarget,
} from '../workspace/workspace-types.js';
import type { WorkspaceAdapter } from '../workspace/workspace-adapter.js';
import type {
  AnyToolDefinition,
  ToolApprovalRequestShape,
  ToolExecutionContext,
  ToolExecutionEnvelope,
  ToolExecutionRequest,
  ToolExecutionService,
  ToolObservabilityEventInput,
  ToolPermissionPolicy,
  ToolRegistry,
  ToolRegistryInput,
} from './tool-contract.js';
import {
  createScriptExecutionAdapter,
  type ScriptExecutionAdapter,
  type ScriptExecutionDefinition,
} from './script-execution-adapter.js';
import {
  ToolExecutionError,
  toToolErrorEnvelope,
} from './tool-errors.js';
import {
  createToolRegistry,
  getToolDefinitionOrThrow,
} from './tool-registry.js';
import {
  createWorkspaceMutationAdapter,
  type WorkspaceMutationAdapter,
} from './workspace-mutation-adapter.js';

const toolExecutionCorrelationSchema = z.object({
  approvalId: z.string().trim().min(1).nullable().optional(),
  jobId: z.string().trim().min(1),
  requestId: z.string().trim().min(1).nullable().optional(),
  sessionId: z.string().trim().min(1),
  traceId: z.string().trim().min(1).nullable().optional(),
});

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonValue(entry));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every((entry) =>
      isJsonValue(entry),
    );
  }

  return false;
}

const toolExecutionRequestSchema = z.object({
  correlation: toolExecutionCorrelationSchema,
  input: z.custom<JsonValue>((value) => isJsonValue(value)),
  toolName: z.string().trim().min(1),
});

export type ToolExecutionServiceOptions = {
  getApprovalRuntime?: () => Promise<ApprovalRuntimeService>;
  getObservability?: () => Promise<ObservabilityService>;
  getStore?: () => Promise<OperationalStore>;
  now?: () => number;
  registry?: ToolRegistry;
  registryInput?: ToolRegistryInput;
  scriptAdapter?: ScriptExecutionAdapter;
  scriptAllowlist?: readonly ScriptExecutionDefinition[];
  workspace: WorkspaceAdapter;
  workspaceMutationAdapter?: WorkspaceMutationAdapter;
};

function resolveApprovalString<TInput extends JsonValue>(
  value: ((input: TInput) => string) | string,
  input: TInput,
): string {
  return typeof value === 'function' ? value(input) : value;
}

function resolveApprovalDetails<TInput extends JsonValue>(
  value: ((input: TInput) => JsonValue | null) | JsonValue | null | undefined,
  input: TInput,
): JsonValue | null {
  if (typeof value === 'function') {
    return value(input);
  }

  return value ?? null;
}

function buildDuplicateInvocationKey(
  request: z.infer<typeof toolExecutionRequestSchema>,
): string {
  return JSON.stringify({
    input: request.input,
    jobId: request.correlation.jobId,
    requestId: request.correlation.requestId ?? null,
    sessionId: request.correlation.sessionId,
    toolName: request.toolName,
  });
}

type ToolRuntimeState = {
  job: RuntimeJobRecord;
  session: RuntimeSessionRecord;
  store: OperationalStore;
};

function toIsoTimestamp(now: () => number): string {
  return new Date(now()).toISOString();
}

async function ensureToolRuntimeState(
  getStore: (() => Promise<OperationalStore>) | undefined,
  request: z.infer<typeof toolExecutionRequestSchema>,
  now: () => number,
): Promise<ToolRuntimeState | null> {
  if (!getStore) {
    return null;
  }

  const timestamp = toIsoTimestamp(now);
  const store = await getStore();
  const existingSession = await store.sessions.getById(
    request.correlation.sessionId,
  );
  const session =
    existingSession ??
    (await store.sessions.save({
      activeJobId: null,
      context: {
        origin: 'tool-execution',
        toolName: request.toolName,
      },
      createdAt: timestamp,
      lastHeartbeatAt: null,
      runnerId: null,
      sessionId: request.correlation.sessionId,
      status: 'pending',
      updatedAt: timestamp,
      workflow: 'tool-execution',
    }));
  const existingJob = await store.jobs.getById(request.correlation.jobId);
  const job =
    existingJob ??
    (await store.jobs.save({
      attempt: 0,
      claimOwnerId: null,
      claimToken: null,
      completedAt: null,
      createdAt: timestamp,
      currentRunId: request.correlation.jobId,
      error: null,
      jobId: request.correlation.jobId,
      jobType: `tool:${request.toolName}`,
      lastHeartbeatAt: null,
      leaseExpiresAt: null,
      maxAttempts: 1,
      nextAttemptAt: null,
      payload: request.input,
      result: null,
      retryBackoffMs: 0,
      sessionId: request.correlation.sessionId,
      startedAt: null,
      status: 'pending',
      updatedAt: timestamp,
      waitApprovalId: null,
      waitReason: null,
    }));

  return {
    job,
    session,
    store,
  };
}

async function updateToolRuntimeState(
  state: ToolRuntimeState | null,
  now: () => number,
  update:
    | {
        result: JsonValue | null;
        status: 'completed';
      }
    | {
        approvalId: string | null;
        status: 'waiting';
      }
    | {
        error: JsonValue | null;
        status: 'failed';
      }
    | {
        status: 'running';
      },
): Promise<ToolRuntimeState | null> {
  if (!state) {
    return null;
  }

  const timestamp = toIsoTimestamp(now);
  const { store } = state;
  let session = state.session;
  let job = state.job;

  if (update.status === 'running') {
    session = await store.sessions.save({
      ...session,
      activeJobId: job.jobId,
      lastHeartbeatAt: timestamp,
      status: 'running',
      updatedAt: timestamp,
    });
    job = await store.jobs.save({
      ...job,
      startedAt: job.startedAt ?? timestamp,
      status: 'running',
      updatedAt: timestamp,
    });
  } else if (update.status === 'waiting') {
    session = await store.sessions.save({
      ...session,
      activeJobId: null,
      lastHeartbeatAt: timestamp,
      status: 'waiting',
      updatedAt: timestamp,
    });
    job = await store.jobs.save({
      ...job,
      startedAt: job.startedAt ?? timestamp,
      status: 'waiting',
      updatedAt: timestamp,
      waitApprovalId: update.approvalId,
      waitReason: 'approval',
    });
  } else if (update.status === 'completed') {
    session = await store.sessions.save({
      ...session,
      activeJobId: null,
      lastHeartbeatAt: timestamp,
      status: 'completed',
      updatedAt: timestamp,
    });
    job = await store.jobs.save({
      ...job,
      completedAt: timestamp,
      error: null,
      result: update.result,
      startedAt: job.startedAt ?? timestamp,
      status: 'completed',
      updatedAt: timestamp,
      waitApprovalId: null,
      waitReason: null,
    });
  } else {
    session = await store.sessions.save({
      ...session,
      activeJobId: null,
      lastHeartbeatAt: timestamp,
      status: 'failed',
      updatedAt: timestamp,
    });
    job = await store.jobs.save({
      ...job,
      completedAt: timestamp,
      error: update.error,
      result: null,
      startedAt: job.startedAt ?? timestamp,
      status: 'failed',
      updatedAt: timestamp,
      waitApprovalId: null,
      waitReason: null,
    });
  }

  return {
    job,
    session,
    store,
  };
}

function assertPermissionAllowsScript(
  definition: AnyToolDefinition,
  permissions: ToolPermissionPolicy,
  scriptName: string,
): void {
  if (permissions.scripts?.includes(scriptName)) {
    return;
  }

  throw new ToolExecutionError(
    'tool-permission-denied',
    `Tool ${definition.name} is not allowed to run script ${scriptName}.`,
    {
      detail: {
        allowedScripts: [...(permissions.scripts ?? [])],
        scriptName,
        toolName: definition.name,
      },
    },
  );
}

function assertPermissionAllowsMutation(
  definition: AnyToolDefinition,
  permissions: ToolPermissionPolicy,
  target: WorkspaceMutationTarget,
): void {
  if (permissions.mutationTargets?.includes(target)) {
    return;
  }

  throw new ToolExecutionError(
    'tool-permission-denied',
    `Tool ${definition.name} is not allowed to mutate workspace target ${target}.`,
    {
      detail: {
        allowedTargets: [...(permissions.mutationTargets ?? [])],
        target,
        toolName: definition.name,
      },
    },
  );
}

function buildToolContext<TInput extends JsonValue>(
  definition: AnyToolDefinition,
  input: TInput,
  request: z.infer<typeof toolExecutionRequestSchema>,
  options: {
    observe: (input: ToolObservabilityEventInput) => Promise<void>;
    now: () => number;
    scriptAdapter: ScriptExecutionAdapter;
    workspace: WorkspaceAdapter;
    workspaceMutationAdapter: WorkspaceMutationAdapter;
  },
): ToolExecutionContext<TInput> {
  const permissions = definition.policy?.permissions ?? {};

  return {
    correlation: request.correlation,
    input,
    mutateWorkspace: async (mutationRequest) => {
      assertPermissionAllowsMutation(
        definition,
        permissions,
        mutationRequest.target,
      );

      return options.workspaceMutationAdapter.applyMutation(mutationRequest);
    },
    now: options.now,
    observe: options.observe,
    request,
    runScript: async (scriptRequest) => {
      assertPermissionAllowsScript(
        definition,
        permissions,
        scriptRequest.scriptName,
      );

      return options.scriptAdapter.execute(scriptRequest);
    },
    workspace: options.workspace,
  };
}

async function recordToolEvent(
  getObservability:
    | (() => Promise<ObservabilityService>)
    | undefined,
  now: () => number,
  request: z.infer<typeof toolExecutionRequestSchema>,
  input: ToolObservabilityEventInput,
): Promise<void> {
  if (!getObservability) {
    return;
  }

  try {
    const observability = await getObservability();

    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? input.metadata
        : input.metadata === null
          ? {}
          : {
              value: input.metadata,
            };

    await observability.recordEvent({
      correlation: {
        approvalId: request.correlation.approvalId ?? null,
        jobId: request.correlation.jobId,
        requestId: request.correlation.requestId ?? null,
        sessionId: request.correlation.sessionId,
        traceId:
          request.correlation.traceId ??
          `${request.correlation.sessionId}:${request.correlation.jobId}:${request.toolName}`,
      },
      eventType: input.type,
      metadata: {
        toolName: request.toolName,
        ...metadata,
      },
      occurredAt: new Date(now()).toISOString(),
      summary: input.summary,
      ...(input.level ? { level: input.level } : {}),
    });
  } catch {
    // Observability is best effort and must not block tool execution.
  }
}

async function requestApproval<TInput extends JsonValue>(
  getApprovalRuntime: (() => Promise<ApprovalRuntimeService>) | undefined,
  now: () => number,
  runtimeState: ToolRuntimeState | null,
  approvalPolicy: ToolApprovalRequestShape<TInput>,
  input: TInput,
  request: z.infer<typeof toolExecutionRequestSchema>,
): Promise<ToolExecutionEnvelope> {
  if (!getApprovalRuntime) {
    throw new ToolExecutionError(
      'tool-invalid-config',
      `Tool ${request.toolName} requires approval but no approval runtime is available.`,
    );
  }

  const approvalRuntime = await getApprovalRuntime();
  const title = resolveApprovalString(approvalPolicy.title, input);
  const action = approvalPolicy.action;
  const details = resolveApprovalDetails(approvalPolicy.details, input);
  const approval = await approvalRuntime.createApproval({
    request: {
      action,
      correlation: {
        jobId: request.correlation.jobId,
        requestId: request.correlation.requestId ?? null,
        sessionId: request.correlation.sessionId,
        traceId: request.correlation.traceId ?? null,
      },
      details,
      title,
    },
    requestedAt: new Date(now()).toISOString(),
  });

  await updateToolRuntimeState(runtimeState, now, {
    approvalId: approval.approval.approvalId,
    status: 'waiting',
  });

  return {
    approval: {
      action,
      approvalId: approval.approval.approvalId,
      title,
    },
    status: 'approval-required',
    toolName: request.toolName,
  };
}

export function createToolExecutionService(
  options: ToolExecutionServiceOptions,
): ToolExecutionService {
  const registry =
    options.registry ??
    createToolRegistry(options.registryInput ?? []);
  const scriptAdapter =
    options.scriptAdapter ??
    createScriptExecutionAdapter({
      allowlist: options.scriptAllowlist ?? [],
      repoRoot: options.workspace.repoPaths.repoRoot,
    });
  const workspaceMutationAdapter =
    options.workspaceMutationAdapter ??
    createWorkspaceMutationAdapter({
      repoRoot: options.workspace.repoPaths.repoRoot,
    });
  const now = options.now ?? Date.now;
  const inFlightInvocations = new Set<string>();

  return {
    async execute(request: ToolExecutionRequest): Promise<ToolExecutionEnvelope> {
      let parsedRequest: z.infer<typeof toolExecutionRequestSchema> | null = null;
      let duplicateKey: string | null = null;
      let runtimeState: ToolRuntimeState | null = null;

      try {
        parsedRequest = toolExecutionRequestSchema.parse(request);
        const definition = getToolDefinitionOrThrow(
          registry,
          parsedRequest.toolName,
        );
        const currentRequest = parsedRequest;
        runtimeState = await ensureToolRuntimeState(
          options.getStore,
          currentRequest,
          now,
        );
        duplicateKey = buildDuplicateInvocationKey(parsedRequest);

        if (inFlightInvocations.has(duplicateKey)) {
          return {
            error: toToolErrorEnvelope(
              new ToolExecutionError(
                'tool-duplicate-invocation',
                `Tool ${parsedRequest.toolName} is already running for this correlation key.`,
                {
                  detail: {
                    duplicateKey,
                    toolName: parsedRequest.toolName,
                  },
                },
              ),
            ),
            status: 'failed',
            toolName: parsedRequest.toolName,
          };
        }

        inFlightInvocations.add(duplicateKey);
        const parsedInput = definition.inputSchema.parse(currentRequest.input);

        if (definition.policy?.approval) {
          const approvalResponse = await requestApproval(
            options.getApprovalRuntime,
            now,
            runtimeState,
            definition.policy.approval,
            parsedInput,
            currentRequest,
          );

          await recordToolEvent(options.getObservability, now, currentRequest, {
            metadata: {
              approvalId:
                approvalResponse.status === 'approval-required'
                  ? approvalResponse.approval.approvalId
                  : null,
            },
            summary: `Tool ${parsedRequest.toolName} requires approval.`,
            type: 'tool-approval-required',
          });

          return approvalResponse;
        }

        await recordToolEvent(options.getObservability, now, currentRequest, {
          metadata: null,
          summary: `Tool ${currentRequest.toolName} started.`,
          type: 'tool-execution-started',
        });
        runtimeState = await updateToolRuntimeState(runtimeState, now, {
          status: 'running',
        });

        const context = buildToolContext(
          definition,
          parsedInput,
          currentRequest,
          {
            now,
            observe: (eventInput) =>
              recordToolEvent(
                options.getObservability,
                now,
                currentRequest,
                eventInput,
              ),
            scriptAdapter,
            workspace: options.workspace,
            workspaceMutationAdapter,
          },
        );
        const result = await definition.execute(parsedInput, context);
        const warnings = [...(result.warnings ?? [])];
        runtimeState = await updateToolRuntimeState(runtimeState, now, {
          result: result.output,
          status: 'completed',
        });

        await recordToolEvent(options.getObservability, now, currentRequest, {
          metadata: {
            warningCount: warnings.length,
          },
          summary: `Tool ${currentRequest.toolName} completed.`,
          type: 'tool-execution-completed',
        });

        return {
          output: result.output,
          status: 'completed',
          toolName: currentRequest.toolName,
          warnings,
        };
      } catch (error) {
        const envelope = toToolErrorEnvelope(error);
        runtimeState = await updateToolRuntimeState(runtimeState, now, {
          error: envelope.detail,
          status: 'failed',
        });

        if (parsedRequest) {
          await recordToolEvent(options.getObservability, now, parsedRequest, {
            level: 'error',
            metadata: {
              errorCode: envelope.code,
              retryable: envelope.retryable,
            },
            summary: `Tool ${parsedRequest.toolName} failed.`,
            type: 'tool-execution-failed',
          });
        }

        return {
          error: envelope,
          status: 'failed',
          toolName: parsedRequest?.toolName ?? request.toolName,
        };
      } finally {
        if (duplicateKey) {
          inFlightInvocations.delete(duplicateKey);
        }
      }
    },
    getRegistry(): ToolRegistry {
      return registry;
    },
  };
}

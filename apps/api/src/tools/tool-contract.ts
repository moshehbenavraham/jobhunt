import type { ZodType } from 'zod';
import type {
  DurableJobEnqueueResult,
  DurableJobRetryPolicy,
} from '../job-runner/job-runner-contract.js';
import type { WorkflowIntent } from '../prompt/prompt-types.js';
import type { WorkspaceAdapter } from '../workspace/workspace-adapter.js';
import type {
  JsonValue,
  WorkspaceMutationTarget,
  WorkspaceWriteFormat,
} from '../workspace/workspace-types.js';
import type { ToolErrorEnvelope } from './tool-errors.js';

export type ToolExecutionCorrelation = {
  approvalId?: string | null | undefined;
  jobId: string;
  requestId?: string | null | undefined;
  sessionId: string;
  traceId?: string | null | undefined;
};

export type ToolExecutionRequest = {
  correlation: ToolExecutionCorrelation;
  input: JsonValue;
  toolName: string;
};

export type ToolWarning = {
  code: string;
  detail?: JsonValue | null;
  message: string;
};

export type ToolHandlerResult<TOutput extends JsonValue = JsonValue> = {
  output: TOutput | null;
  warnings?: readonly ToolWarning[];
};

export type ToolScriptDispatchRequest = {
  args?: readonly string[];
  scriptName: string;
  timeoutMs?: number;
};

export type ToolScriptDispatchResult = {
  attempts: number;
  durationMs: number;
  exitCode: number;
  stderr: string;
  stdout: string;
};

export type ToolWorkspaceMutationRequest = {
  content: JsonValue | string;
  format?: WorkspaceWriteFormat;
  overwrite?: boolean;
  repoRelativePath: string;
  target: WorkspaceMutationTarget;
};

export type ToolWorkspaceMutationResult = {
  bytesWritten: number;
  created: boolean;
  overwritten: boolean;
  path: string;
  repoRelativePath: string;
  target: WorkspaceMutationTarget;
};

export type ToolDurableJobEnqueueRequest = {
  context?: JsonValue | null;
  currentRunId?: string | null;
  jobId: string;
  jobType: string;
  payload: JsonValue;
  retryPolicy?: Partial<DurableJobRetryPolicy>;
  workflow: WorkflowIntent;
};

export type ToolDurableJobEnqueueResult = DurableJobEnqueueResult & {
  alreadyExists: boolean;
};

export type ToolObservabilityEventInput = {
  level?: 'error' | 'info' | 'warn';
  metadata: JsonValue | null;
  summary: string;
  type:
    | 'tool-execution-completed'
    | 'tool-execution-failed'
    | 'tool-execution-started'
    | 'tool-approval-required';
};

export type ToolExecutionContext<TInput extends JsonValue = JsonValue> = {
  correlation: ToolExecutionCorrelation;
  enqueueJob: (
    request: ToolDurableJobEnqueueRequest,
  ) => Promise<ToolDurableJobEnqueueResult>;
  input: TInput;
  mutateWorkspace: (
    request: ToolWorkspaceMutationRequest,
  ) => Promise<ToolWorkspaceMutationResult>;
  now: () => number;
  observe: (input: ToolObservabilityEventInput) => Promise<void>;
  request: ToolExecutionRequest;
  runScript: (
    request: ToolScriptDispatchRequest,
  ) => Promise<ToolScriptDispatchResult>;
  workspace: WorkspaceAdapter;
};

export type ToolApprovalRequestShape<TInput extends JsonValue = JsonValue> = {
  action: string;
  details?: ((input: TInput) => JsonValue | null) | JsonValue | null;
  title: ((input: TInput) => string) | string;
};

export type ToolPermissionPolicy = {
  jobTypes?: readonly string[];
  mutationTargets?: readonly WorkspaceMutationTarget[];
  scripts?: readonly string[];
};

export type ToolExecutionPolicy<TInput extends JsonValue = JsonValue> = {
  approval?: ToolApprovalRequestShape<TInput> | null;
  permissions?: ToolPermissionPolicy;
};

export type ToolDefinition<
  TInput extends JsonValue = JsonValue,
  TOutput extends JsonValue = JsonValue,
> = {
  description: string;
  execute: (
    input: TInput,
    context: ToolExecutionContext<TInput>,
  ) => Promise<ToolHandlerResult<TOutput>>;
  inputSchema: ZodType<TInput>;
  name: string;
  policy?: ToolExecutionPolicy<TInput>;
};

// biome-ignore lint/suspicious/noExplicitAny: registry intentionally stores heterogeneous tool payloads
export type AnyToolDefinition = ToolDefinition<any, any>;

export type ToolCatalogEntry = {
  description: string;
  jobTypes: readonly string[];
  mutationTargets: readonly WorkspaceMutationTarget[];
  name: string;
  requiresApproval: boolean;
  scripts: readonly string[];
};

export type ToolCatalogListInput = {
  limit?: number;
  offset?: number;
  toolNames?: readonly string[] | null;
};

export type ToolRegistry = {
  definitions: ReadonlyMap<string, AnyToolDefinition>;
  get: (name: string) => AnyToolDefinition | null;
  listCatalog: (input?: ToolCatalogListInput) => ToolCatalogEntry[];
  listNames: () => string[];
};

export type ToolRegistryInput = readonly AnyToolDefinition[];

export type ToolExecutionCompletedEnvelope = {
  output: JsonValue | null;
  status: 'completed';
  toolName: string;
  warnings: readonly ToolWarning[];
};

export type ToolExecutionApprovalEnvelope = {
  approval: {
    action: string;
    approvalId: string | null;
    title: string;
  };
  status: 'approval-required';
  toolName: string;
};

export type ToolExecutionFailedEnvelope = {
  error: ToolErrorEnvelope;
  status: 'failed';
  toolName: string;
};

export type ToolExecutionEnvelope =
  | ToolExecutionApprovalEnvelope
  | ToolExecutionCompletedEnvelope
  | ToolExecutionFailedEnvelope;

export type ToolExecutionService = {
  execute: (request: ToolExecutionRequest) => Promise<ToolExecutionEnvelope>;
  getRegistry: () => ToolRegistry;
};

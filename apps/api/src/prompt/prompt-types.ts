import type {
  WorkspaceOwner,
  WorkspaceSurfaceKey,
} from '../workspace/workspace-types.js';

export const WORKFLOW_INTENTS = [
  'application-help',
  'auto-pipeline',
  'batch-evaluation',
  'compare-offers',
  'deep-company-research',
  'follow-up-cadence',
  'generate-ats-pdf',
  'interview-prep',
  'process-pipeline',
  'project-review',
  'rejection-patterns',
  'scan-portals',
  'single-evaluation',
  'tracker-status',
  'training-review',
  'linkedin-outreach',
] as const;

export type WorkflowIntent = (typeof WORKFLOW_INTENTS)[number];

export const PROMPT_SOURCE_KEYS = [
  'agents-guide',
  'shared-mode',
  'profile-mode',
  'workflow-mode',
  'profile-config',
  'profile-cv',
  'article-digest',
] as const;

export type PromptSourceKey = (typeof PROMPT_SOURCE_KEYS)[number];

export const PROMPT_SOURCE_ROLES = [
  'operational-instructions',
  'shared-rules',
  'user-overrides',
  'workflow-guidance',
  'supporting-data',
] as const;

export type PromptSourceRole = (typeof PROMPT_SOURCE_ROLES)[number];

export const PROMPT_SOURCE_STATUSES = ['empty', 'found', 'missing'] as const;

export type PromptSourceStatus = (typeof PROMPT_SOURCE_STATUSES)[number];

export const PROMPT_LOADER_STATES = [
  'empty',
  'loading',
  'missing',
  'ready',
  'unsupported-workflow',
] as const;

export type PromptLoaderState = (typeof PROMPT_LOADER_STATES)[number];

export type PromptCacheMode = 'read-through-mtime';
export type PromptSourceOwner = Extract<WorkspaceOwner, 'system' | 'user'>;

export type PromptWorkflowRoute = {
  description: string;
  intent: WorkflowIntent;
  modeRepoRelativePath: string;
};

export type PromptSourceDefinition = {
  key: PromptSourceKey;
  label: string;
  notes: readonly string[];
  optional: boolean;
  owner: PromptSourceOwner;
  precedence: number;
  role: PromptSourceRole;
  surfaceKey: WorkspaceSurfaceKey | null;
};

export type PromptResolvedSource = PromptSourceDefinition & {
  absolutePath: string;
  matchedRepoRelativePath: string | null;
};

export type PromptBundleSource = PromptResolvedSource & {
  content: string | null;
  freshnessKey: string | null;
  status: PromptSourceStatus;
};

export type PromptBundle = {
  cacheMode: PromptCacheMode;
  composedText: string;
  loadedAt: string;
  sourceOrder: PromptSourceKey[];
  sources: PromptBundleSource[];
  workflow: PromptWorkflowRoute;
};

type PromptLoaderBase = {
  cacheMode: PromptCacheMode;
  requestedWorkflow: string;
  supportedWorkflows: readonly WorkflowIntent[];
};

export type PromptLoaderLoadingResult = PromptLoaderBase & {
  state: 'loading';
  workflow: WorkflowIntent | null;
};

export type PromptLoaderReadyResult = PromptLoaderBase & {
  bundle: PromptBundle;
  state: 'ready';
  workflow: WorkflowIntent;
};

export type PromptLoaderMissingResult = PromptLoaderBase & {
  bundle: PromptBundle;
  missingSources: PromptBundleSource[];
  state: 'missing';
  workflow: WorkflowIntent;
};

export type PromptLoaderEmptyResult = PromptLoaderBase & {
  bundle: PromptBundle;
  emptySources: PromptBundleSource[];
  state: 'empty';
  workflow: WorkflowIntent;
};

export type PromptLoaderUnsupportedWorkflowResult = PromptLoaderBase & {
  issues: readonly string[];
  state: 'unsupported-workflow';
  workflow: null;
};

export type PromptLoaderResult =
  | PromptLoaderEmptyResult
  | PromptLoaderLoadingResult
  | PromptLoaderMissingResult
  | PromptLoaderReadyResult
  | PromptLoaderUnsupportedWorkflowResult;

export class PromptContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class PromptUnsupportedWorkflowError extends PromptContractError {
  requestedWorkflow: string;
  supportedWorkflows: readonly WorkflowIntent[];

  constructor(
    requestedWorkflow: string,
    supportedWorkflows: readonly WorkflowIntent[],
  ) {
    super(
      `Unsupported workflow "${requestedWorkflow}". Supported workflows: ${supportedWorkflows.join(', ')}`,
    );
    this.requestedWorkflow = requestedWorkflow;
    this.supportedWorkflows = supportedWorkflows;
  }
}

export class PromptModePathError extends PromptContractError {
  intent: WorkflowIntent;
  repoRelativePath: string;

  constructor(intent: WorkflowIntent, repoRelativePath: string) {
    super(
      `Workflow ${intent} resolved to invalid mode path ${repoRelativePath}.`,
    );
    this.intent = intent;
    this.repoRelativePath = repoRelativePath;
  }
}

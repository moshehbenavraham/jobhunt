import type { RepoPathOptions } from '../config/repo-paths.js';
import { createWorkspaceAdapter, type WorkspaceAdapter } from '../workspace/index.js';
import { createPromptCache, type PromptCache } from './prompt-cache.js';
import { composePromptBundle } from './prompt-compose.js';
import { resolvePromptSources } from './prompt-resolution.js';
import type {
  PromptLoaderEmptyResult,
  PromptLoaderLoadingResult,
  PromptLoaderMissingResult,
  PromptLoaderReadyResult,
  PromptLoaderResult,
  PromptLoaderUnsupportedWorkflowResult,
  WorkflowIntent,
} from './prompt-types.js';
import { WORKFLOW_INTENTS } from './prompt-types.js';
import {
  getWorkflowModeRoute,
  parseWorkflowIntent,
} from './workflow-mode-map.js';

export type PromptLoader = {
  cache: PromptCache;
  load: (workflowInput: unknown) => Promise<PromptLoaderResult>;
  workspace: WorkspaceAdapter;
};

function toRequestedWorkflow(workflowInput: unknown): string {
  return typeof workflowInput === 'string' ? workflowInput : String(workflowInput);
}

export function createPromptLoadingState(
  workflowInput: unknown,
  workflow: WorkflowIntent | null,
  cache: PromptCache,
): PromptLoaderLoadingResult {
  return {
    cacheMode: cache.mode,
    requestedWorkflow: toRequestedWorkflow(workflowInput),
    state: 'loading',
    supportedWorkflows: WORKFLOW_INTENTS,
    workflow,
  };
}

function createUnsupportedWorkflowResult(
  workflowInput: unknown,
  cache: PromptCache,
  message: string,
): PromptLoaderUnsupportedWorkflowResult {
  return {
    cacheMode: cache.mode,
    issues: [message],
    requestedWorkflow: toRequestedWorkflow(workflowInput),
    state: 'unsupported-workflow',
    supportedWorkflows: WORKFLOW_INTENTS,
    workflow: null,
  };
}

function createReadyResult(
  workflowInput: unknown,
  workflow: WorkflowIntent,
  cache: PromptCache,
  bundle: PromptLoaderReadyResult['bundle'],
): PromptLoaderReadyResult {
  return {
    bundle,
    cacheMode: cache.mode,
    requestedWorkflow: toRequestedWorkflow(workflowInput),
    state: 'ready',
    supportedWorkflows: WORKFLOW_INTENTS,
    workflow,
  };
}

function createMissingResult(
  workflowInput: unknown,
  workflow: WorkflowIntent,
  cache: PromptCache,
  bundle: PromptLoaderMissingResult['bundle'],
): PromptLoaderMissingResult {
  return {
    bundle,
    cacheMode: cache.mode,
    missingSources: bundle.sources.filter(
      (source) => !source.optional && source.status === 'missing',
    ),
    requestedWorkflow: toRequestedWorkflow(workflowInput),
    state: 'missing',
    supportedWorkflows: WORKFLOW_INTENTS,
    workflow,
  };
}

function createEmptyResult(
  workflowInput: unknown,
  workflow: WorkflowIntent,
  cache: PromptCache,
  bundle: PromptLoaderEmptyResult['bundle'],
): PromptLoaderEmptyResult {
  return {
    bundle,
    cacheMode: cache.mode,
    emptySources: bundle.sources.filter(
      (source) => !source.optional && source.status === 'empty',
    ),
    requestedWorkflow: toRequestedWorkflow(workflowInput),
    state: 'empty',
    supportedWorkflows: WORKFLOW_INTENTS,
    workflow,
  };
}

async function loadPromptBundle(
  workflowInput: unknown,
  workspace: WorkspaceAdapter,
  cache: PromptCache,
): Promise<PromptLoaderResult> {
  const requestedWorkflow = toRequestedWorkflow(workflowInput);

  let workflow: WorkflowIntent;

  try {
    workflow = parseWorkflowIntent(workflowInput);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createUnsupportedWorkflowResult(requestedWorkflow, cache, message);
  }

  createPromptLoadingState(requestedWorkflow, workflow, cache);

  const workflowRoute = getWorkflowModeRoute(workflow);
  const resolvedSources = await resolvePromptSources(workspace, workflow);
  const loadedSources = await Promise.all(
    resolvedSources.map((source) => cache.loadSource(source)),
  );
  const bundle = composePromptBundle({
    cacheMode: cache.mode,
    sources: loadedSources,
    workflow: workflowRoute,
  });

  if (bundle.sources.some((source) => !source.optional && source.status === 'missing')) {
    return createMissingResult(requestedWorkflow, workflow, cache, bundle);
  }

  if (bundle.sources.some((source) => !source.optional && source.status === 'empty')) {
    return createEmptyResult(requestedWorkflow, workflow, cache, bundle);
  }

  return createReadyResult(requestedWorkflow, workflow, cache, bundle);
}

export function createPromptLoader(
  options: RepoPathOptions = {},
  cache: PromptCache = createPromptCache(),
): PromptLoader {
  const workspace = createWorkspaceAdapter(options);

  return {
    cache,
    async load(workflowInput: unknown): Promise<PromptLoaderResult> {
      return loadPromptBundle(workflowInput, workspace, cache);
    },
    workspace,
  };
}

export async function loadPromptBundleForWorkflow(
  workflowInput: unknown,
  options: RepoPathOptions = {},
): Promise<PromptLoaderResult> {
  return createPromptLoader(options).load(workflowInput);
}

import type {
  PromptCacheMode,
  PromptSourceDefinition,
  PromptSourceKey,
  PromptWorkflowRoute,
  WorkflowIntent,
} from './prompt-types.js';
import {
  getPromptSourceOrder,
  getPromptSourcePolicySummary,
} from './prompt-source-policy.js';
import { WORKFLOW_INTENTS } from './prompt-types.js';
import { listWorkflowModeRoutes } from './workflow-mode-map.js';

export type PromptContractSourceSummary = Pick<
  PromptSourceDefinition,
  'key' | 'label' | 'notes' | 'optional' | 'precedence' | 'role'
>;

export type PromptContractSummary = {
  cacheMode: PromptCacheMode;
  sourceOrder: readonly PromptSourceKey[];
  sources: readonly PromptContractSourceSummary[];
  supportedWorkflows: readonly WorkflowIntent[];
  workflowRoutes: readonly PromptWorkflowRoute[];
};

export function getPromptContractSummary(): PromptContractSummary {
  return {
    cacheMode: 'read-through-mtime',
    sourceOrder: getPromptSourceOrder(),
    sources: getPromptSourcePolicySummary().map((source) => ({
      key: source.key,
      label: source.label,
      notes: source.notes,
      optional: source.optional,
      precedence: source.precedence,
      role: source.role,
    })),
    supportedWorkflows: WORKFLOW_INTENTS,
    workflowRoutes: listWorkflowModeRoutes(),
  };
}

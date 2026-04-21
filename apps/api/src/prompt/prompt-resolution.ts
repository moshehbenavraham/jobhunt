import { resolveRepoRelativePath } from '../config/repo-paths.js';
import type { WorkspaceAdapter } from '../workspace/workspace-adapter.js';
import { PromptContractError, PromptModePathError } from './prompt-types.js';
import type {
  PromptResolvedSource,
  PromptSourceDefinition,
  WorkflowIntent,
} from './prompt-types.js';
import { getPromptSourceDefinitions } from './prompt-source-policy.js';
import { getWorkflowModeRoute } from './workflow-mode-map.js';

export class PromptSourceResolutionError extends PromptContractError {
  sourceKey: PromptSourceDefinition['key'];

  constructor(source: PromptSourceDefinition, message: string) {
    super(message);
    this.sourceKey = source.key;
  }
}

function resolveWorkflowModeSource(
  source: PromptSourceDefinition,
  workspace: WorkspaceAdapter,
  workflowIntent: WorkflowIntent,
): PromptResolvedSource {
  const workflowRoute = getWorkflowModeRoute(workflowIntent);
  const classification = workspace.classifyPath(
    workflowRoute.modeRepoRelativePath,
  );

  if (
    classification.owner !== 'system' ||
    classification.repoRelativePath !== workflowRoute.modeRepoRelativePath
  ) {
    throw new PromptModePathError(
      workflowIntent,
      workflowRoute.modeRepoRelativePath,
    );
  }

  return {
    ...source,
    absolutePath: resolveRepoRelativePath(workflowRoute.modeRepoRelativePath, {
      repoRoot: workspace.repoPaths.repoRoot,
    }),
    matchedRepoRelativePath: workflowRoute.modeRepoRelativePath,
  };
}

export async function resolvePromptSource(
  source: PromptSourceDefinition,
  workspace: WorkspaceAdapter,
  workflowIntent: WorkflowIntent,
): Promise<PromptResolvedSource> {
  if (source.key === 'workflow-mode') {
    return resolveWorkflowModeSource(source, workspace, workflowIntent);
  }

  if (source.surfaceKey === null) {
    throw new PromptSourceResolutionError(
      source,
      `Prompt source ${source.key} is missing a workspace surface binding.`,
    );
  }

  const resolvedSurface = await workspace.resolveSurface(source.surfaceKey);

  return {
    ...source,
    absolutePath: resolvedSurface.path,
    matchedRepoRelativePath: resolvedSurface.matchedCandidate,
  };
}

export async function resolvePromptSources(
  workspace: WorkspaceAdapter,
  workflowIntent: WorkflowIntent,
): Promise<PromptResolvedSource[]> {
  const definitions = getPromptSourceDefinitions(workflowIntent);

  return Promise.all(
    definitions.map((source) =>
      resolvePromptSource(source, workspace, workflowIntent),
    ),
  );
}

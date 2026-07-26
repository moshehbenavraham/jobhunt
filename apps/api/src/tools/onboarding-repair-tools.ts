import { rm } from 'node:fs/promises';
import { z } from 'zod';
import type {
  WorkspaceAdapter,
  WorkspaceReadResult,
} from '../workspace/index.js';
import {
  ONBOARDING_REPAIRABLE_SURFACE_KEYS,
  type JsonValue,
  type OnboardingRepairDefinition,
  type OnboardingRepairableSurfaceKey,
} from '../workspace/workspace-types.js';
import { WorkspaceWriteConflictError } from '../workspace/workspace-errors.js';
import { ToolExecutionError } from './tool-errors.js';
import type {
  AnyToolDefinition,
  ToolDefinition,
  ToolWorkspaceMutationResult,
} from './tool-contract.js';

const repairInputSchema = z.object({
  targets: z
    .array(z.enum(ONBOARDING_REPAIRABLE_SURFACE_KEYS))
    .min(1)
    .max(5)
    .nullable()
    .default(null),
});

type RepairPreviewItem = {
  description: string;
  destination: {
    canonicalRepoRelativePath: string;
    matchedRepoRelativePath: string | null;
    status: 'found' | 'missing';
    surfaceKey: OnboardingRepairableSurfaceKey;
  };
  ready: boolean;
  reason: 'already-present' | 'ready' | 'template-missing';
  source: {
    repoRelativePath: string | null;
    status: 'found' | 'missing';
    surfaceKey: string;
  };
};

type PreparedRepair = {
  content: string;
  definition: OnboardingRepairDefinition;
};

function dedupeTargets(
  targets: readonly OnboardingRepairableSurfaceKey[] | null,
): OnboardingRepairableSurfaceKey[] {
  if (!targets) {
    return [];
  }

  return [...new Set(targets)].sort((left, right) => left.localeCompare(right));
}

async function getRepairPreviewItems(
  workspace: WorkspaceAdapter,
  targets: readonly OnboardingRepairableSurfaceKey[],
): Promise<RepairPreviewItem[]> {
  const definitions = targets.map((target) =>
    workspace.getOnboardingRepair(target),
  );
  const previewItems = await Promise.all(
    definitions.map(async (definition) => {
      const [destinationResult, sourceResult] = await Promise.all([
        workspace.readSurface(definition.destinationSurfaceKey),
        workspace.readSurface(definition.sourceSurfaceKey),
      ]);

      return buildRepairPreviewItem(
        definition,
        destinationResult,
        sourceResult,
      );
    }),
  );

  return previewItems.sort((left, right) =>
    left.destination.canonicalRepoRelativePath.localeCompare(
      right.destination.canonicalRepoRelativePath,
    ),
  );
}

function buildRepairPreviewItem(
  definition: OnboardingRepairDefinition,
  destinationResult: WorkspaceReadResult,
  sourceResult: WorkspaceReadResult,
): RepairPreviewItem {
  if (sourceResult.status === 'missing') {
    return {
      description: definition.description,
      destination: {
        canonicalRepoRelativePath: definition.destinationRepoRelativePath,
        matchedRepoRelativePath: null,
        status: destinationResult.status,
        surfaceKey: definition.destinationSurfaceKey,
      },
      ready: false,
      reason: 'template-missing',
      source: {
        repoRelativePath: null,
        status: 'missing',
        surfaceKey: definition.sourceSurfaceKey,
      },
    };
  }

  if (destinationResult.status === 'found') {
    return {
      description: definition.description,
      destination: {
        canonicalRepoRelativePath: definition.destinationRepoRelativePath,
        matchedRepoRelativePath: destinationResult.repoRelativePath,
        status: 'found',
        surfaceKey: definition.destinationSurfaceKey,
      },
      ready: false,
      reason: 'already-present',
      source: {
        repoRelativePath: sourceResult.repoRelativePath,
        status: 'found',
        surfaceKey: definition.sourceSurfaceKey,
      },
    };
  }

  return {
    description: definition.description,
    destination: {
      canonicalRepoRelativePath: definition.destinationRepoRelativePath,
      matchedRepoRelativePath: null,
      status: 'missing',
      surfaceKey: definition.destinationSurfaceKey,
    },
    ready: true,
    reason: 'ready',
    source: {
      repoRelativePath: sourceResult.repoRelativePath,
      status: 'found',
      surfaceKey: definition.sourceSurfaceKey,
    },
  };
}

async function prepareRepairs(
  workspace: WorkspaceAdapter,
  requestedTargets: readonly OnboardingRepairableSurfaceKey[] | null,
): Promise<{
  preparedRepairs: PreparedRepair[];
  previewItems: RepairPreviewItem[];
}> {
  const requested = dedupeTargets(requestedTargets);
  const defaultTargets =
    requested.length > 0
      ? requested
      : workspace
          .listOnboardingRepairs()
          .map((definition) => definition.destinationSurfaceKey);
  const previewItems = await getRepairPreviewItems(workspace, defaultTargets);
  const preparedRepairs: PreparedRepair[] = [];

  for (const previewItem of previewItems) {
    if (previewItem.reason === 'template-missing') {
      throw new ToolExecutionError(
        'tool-invalid-config',
        `Onboarding repair template ${previewItem.source.surfaceKey} is missing.`,
        {
          detail: {
            destinationSurfaceKey: previewItem.destination.surfaceKey,
            sourceSurfaceKey: previewItem.source.surfaceKey,
          },
        },
      );
    }

    if (requested.length > 0 && previewItem.reason === 'already-present') {
      throw new WorkspaceWriteConflictError(
        previewItem.destination.matchedRepoRelativePath ??
          previewItem.destination.canonicalRepoRelativePath,
      );
    }

    if (!previewItem.ready) {
      continue;
    }

    const definition = workspace.getOnboardingRepair(
      previewItem.destination.surfaceKey,
    );
    const sourceResult = await workspace.readRequiredSurface(
      definition.sourceSurfaceKey,
    );

    if (typeof sourceResult.value !== 'string') {
      throw new ToolExecutionError(
        'tool-invalid-config',
        `Onboarding repair source ${definition.sourceSurfaceKey} must be text.`,
      );
    }

    preparedRepairs.push({
      content: sourceResult.value,
      definition,
    });
  }

  return {
    preparedRepairs,
    previewItems,
  };
}

async function rollbackCreatedFiles(
  writes: readonly ToolWorkspaceMutationResult[],
): Promise<string[]> {
  const rollbackResults = await Promise.allSettled(
    writes.map((write) => rm(write.path, { force: true })),
  );

  return rollbackResults.flatMap((result, index) =>
    result.status === 'fulfilled'
      ? []
      : [writes[index]?.repoRelativePath ?? 'unknown'],
  );
}

export function createOnboardingRepairTools(options: {
  workspace: WorkspaceAdapter;
}): readonly AnyToolDefinition[] {
  const { workspace } = options;

  return [
    {
      description:
        'Preview which onboarding files can be created from checked-in templates without overwriting existing user data.',
      async execute(input) {
        const previewTargets =
          input.targets === null
            ? workspace
                .listOnboardingRepairs()
                .map((definition) => definition.destinationSurfaceKey)
            : dedupeTargets(input.targets);
        const previewItems = await getRepairPreviewItems(
          workspace,
          previewTargets,
        );

        return {
          output: {
            items: previewItems,
            repairableCount: previewItems.filter((item) => item.ready).length,
            targetCount: previewItems.length,
          },
        };
      },
      inputSchema: repairInputSchema,
      name: 'preview-onboarding-repair',
    } satisfies ToolDefinition<z.output<typeof repairInputSchema>, JsonValue>,
    {
      description:
        'Create missing onboarding files from checked-in templates through the guarded workspace mutation path.',
      async execute(input, context) {
        const { preparedRepairs, previewItems } = await prepareRepairs(
          workspace,
          input.targets,
        );

        if (preparedRepairs.length === 0) {
          return {
            output: {
              created: [],
              preview: previewItems,
              repairedCount: 0,
            },
          };
        }

        const writes: ToolWorkspaceMutationResult[] = [];

        try {
          for (const repair of preparedRepairs) {
            const writeResult = await context.mutateWorkspace({
              content: repair.content,
              format: 'text',
              repoRelativePath: repair.definition.destinationRepoRelativePath,
              target: repair.definition.mutationTarget,
            });
            writes.push(writeResult);
          }
        } catch (error) {
          const cleanupFailedPaths = await rollbackCreatedFiles(writes);

          if (cleanupFailedPaths.length > 0) {
            throw new ToolExecutionError(
              'tool-execution-failed',
              'Onboarding repair failed after partial writes and cleanup was incomplete.',
              {
                cause: error,
                detail: {
                  cleanupFailedPaths,
                },
              },
            );
          }

          throw error;
        }

        return {
          output: {
            created: writes.map((write) => ({
              repoRelativePath: write.repoRelativePath,
              target: write.target,
            })),
            repairedCount: writes.length,
          },
        };
      },
      inputSchema: repairInputSchema,
      name: 'repair-onboarding-files',
      policy: {
        approval: {
          action: 'repair-onboarding-files',
          details: (input) => ({
            requestedTargets:
              input.targets === null ? null : dedupeTargets(input.targets),
          }),
          title: 'Approve onboarding file repair',
        },
        permissions: {
          mutationTargets: ['profile', 'tracker'],
        },
      },
    } satisfies ToolDefinition<z.output<typeof repairInputSchema>, JsonValue>,
  ];
}

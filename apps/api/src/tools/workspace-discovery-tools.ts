import { lstat } from 'node:fs/promises';
import { z } from 'zod';
import { getPromptContractSummary, listWorkflowModeRoutes } from '../prompt/index.js';
import { resolveRepoRelativePath } from '../config/repo-paths.js';
import type { WorkspaceAdapter, WorkspaceReadResult } from '../workspace/index.js';
import type {
  JsonValue,
  OnboardingRepairableSurfaceKey,
  WorkspaceSurfaceDefinition,
} from '../workspace/workspace-types.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';
import {
  summarizeProfileSources,
  type ProfileSummary,
} from './profile-summary.js';

const artifactGroupValues = ['all', 'job-descriptions', 'output', 'reports'] as const;

const artifactListInputSchema = z.object({
  group: z.enum(artifactGroupValues).default('all'),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

const requiredWorkspaceInputSchema = z.object({
  includeOptional: z.boolean().default(false),
});

const workflowSupportInputSchema = z.object({
  workflow: z
    .enum([
      'application-help',
      'auto-pipeline',
      'batch-evaluation',
      'compare-offers',
      'deep-company-research',
      'follow-up-cadence',
      'generate-ats-pdf',
      'interview-prep',
      'linkedin-outreach',
      'process-pipeline',
      'project-review',
      'rejection-patterns',
      'scan-portals',
      'single-evaluation',
      'tracker-status',
      'training-review',
    ])
    .nullable()
    .default(null),
});

type ArtifactGroup = (typeof artifactGroupValues)[number];

type ArtifactDirectoryConfig = {
  label: string;
  surfaceKey: 'jdsDirectory' | 'outputDirectory' | 'reportsDirectory';
};

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

const artifactDirectories: Record<
  Exclude<ArtifactGroup, 'all'>,
  ArtifactDirectoryConfig
> = {
  'job-descriptions': {
    label: 'job-descriptions',
    surfaceKey: 'jdsDirectory',
  },
  output: {
    label: 'output',
    surfaceKey: 'outputDirectory',
  },
  reports: {
    label: 'reports',
    surfaceKey: 'reportsDirectory',
  },
};

function compareWorkspaceSurface(
  left: WorkspaceSurfaceDefinition,
  right: WorkspaceSurfaceDefinition,
): number {
  return (left.candidates[0] ?? left.key).localeCompare(
    right.candidates[0] ?? right.key,
  );
}

function isSurfaceRequiredForStartup(
  surface: WorkspaceSurfaceDefinition,
  includeOptional: boolean,
): boolean {
  if (surface.summaryExposure !== 'startup') {
    return false;
  }

  if (includeOptional) {
    return true;
  }

  return surface.startupCritical || surface.missingBehavior === 'onboarding-required';
}

function toRequiredSurfaceSummary(
  surface: WorkspaceSurfaceDefinition,
  result: WorkspaceReadResult,
): {
  canonicalRepoRelativePath: string;
  description: string;
  matchedRepoRelativePath: string | null;
  missingBehavior: string;
  owner: string;
  repairableSurfaceKey: OnboardingRepairableSurfaceKey | null;
  startupCritical: boolean;
  status: 'found' | 'missing';
  surfaceKey: string;
} {
  return {
    canonicalRepoRelativePath: surface.candidates[0] ?? result.repoRelativePath,
    description: surface.description,
    matchedRepoRelativePath:
      result.status === 'found' ? result.repoRelativePath : null,
    missingBehavior: surface.missingBehavior,
    owner: surface.owner,
    repairableSurfaceKey:
      surface.onboardingRepairSourceKey !== undefined &&
      surface.onboardingRepairSourceKey !== null
        ? (surface.key as OnboardingRepairableSurfaceKey)
        : null,
    startupCritical: surface.startupCritical,
    status: result.status,
    surfaceKey: surface.key,
  };
}

async function getArtifactItems(
  workspace: WorkspaceAdapter,
  group: ArtifactGroup,
): Promise<
  Array<{
    group: string;
    name: string;
    repoRelativePath: string;
    rootRepoRelativePath: string;
  }>
> {
  const groups =
    group === 'all'
      ? (Object.values(artifactDirectories) as ArtifactDirectoryConfig[])
      : [artifactDirectories[group]];
  const items = await Promise.all(
    groups.map(async (directory) => {
      const result = await workspace.readSurface(directory.surfaceKey);
      const rootRepoRelativePath =
        workspace.getSurface(directory.surfaceKey).candidates[0] ??
        directory.label;

      if (result.status !== 'found') {
        return [] as Array<{
          group: string;
          name: string;
          repoRelativePath: string;
          rootRepoRelativePath: string;
        }>;
      }

      return (result.directoryEntries ?? []).map((entry) => ({
        group: directory.label,
        name: entry,
        repoRelativePath: `${rootRepoRelativePath}/${entry}`,
        rootRepoRelativePath,
      }));
    }),
  );

  return items.flat().sort((left, right) =>
    left.repoRelativePath.localeCompare(right.repoRelativePath),
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isFile();
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }

    throw error;
  }
}

async function getWorkflowSupportSummary(
  workspace: WorkspaceAdapter,
  workflow: string | undefined,
): Promise<{
  missingModeCount: number;
  routes: Array<{
    description: string;
    exists: boolean;
    intent: string;
    modeRepoRelativePath: string;
    owner: string;
  }>;
  supportedWorkflows: readonly string[];
}> {
  const routes = listWorkflowModeRoutes()
    .filter((route) => workflow === undefined || route.intent === workflow)
    .sort((left, right) => left.intent.localeCompare(right.intent));
  const summarizedRoutes = await Promise.all(
    routes.map(async (route) => {
      const absolutePath = resolveRepoRelativePath(route.modeRepoRelativePath, {
        repoRoot: workspace.repoPaths.repoRoot,
      });
      const classification = workspace.classifyPath(route.modeRepoRelativePath);

      return {
        description: route.description,
        exists: await fileExists(absolutePath),
        intent: route.intent,
        modeRepoRelativePath: route.modeRepoRelativePath,
        owner: classification.owner,
      };
    }),
  );

  return {
    missingModeCount: summarizedRoutes.filter((route) => !route.exists).length,
    routes: summarizedRoutes,
    supportedWorkflows: [...getPromptContractSummary().supportedWorkflows],
  };
}

export function createWorkspaceDiscoveryTools(options: {
  workspace: WorkspaceAdapter;
}): readonly AnyToolDefinition[] {
  const { workspace } = options;

  return [
    {
      description:
        'Summarize required workspace files and whether they are repairable from checked-in templates.',
      async execute(input) {
        const includeOptional = input.includeOptional ?? false;
        const surfaces = workspace
          .listSurfaces()
          .filter((surface) =>
            isSurfaceRequiredForStartup(surface, includeOptional),
          )
          .sort(compareWorkspaceSurface);
        const results = await Promise.all(
          surfaces.map(async (surface) => ({
            result: await workspace.readSurface(surface.key),
            surface,
          })),
        );
        const summarizedSurfaces = results.map(({ result, surface }) =>
          toRequiredSurfaceSummary(surface, result),
        );

        return {
          output: toJsonValue({
            counts: {
              found: summarizedSurfaces.filter(
                (surface) => surface.status === 'found',
              ).length,
              missing: summarizedSurfaces.filter(
                (surface) => surface.status === 'missing',
              ).length,
              repairable: summarizedSurfaces.filter(
                (surface) => surface.repairableSurfaceKey !== null,
              ).length,
            },
            surfaces: summarizedSurfaces,
          }),
        };
      },
      inputSchema: requiredWorkspaceInputSchema,
      name: 'inspect-required-workspace-files',
    } satisfies ToolDefinition<z.output<typeof requiredWorkspaceInputSchema>, JsonValue>,
    {
      description:
        'Project profile, portal targeting, CV, and article-digest files into a deterministic settings summary.',
      async execute(): Promise<{ output: ProfileSummary }> {
        return {
          output: await summarizeProfileSources(workspace),
        };
      },
      inputSchema: z.object({}),
      name: 'summarize-profile-sources',
    } satisfies ToolDefinition<Record<string, never>, ProfileSummary>,
    {
      description:
        'List top-level generated artifact paths with bounded pagination and deterministic ordering.',
      async execute(input) {
        const items = await getArtifactItems(workspace, input.group);
        const pagedItems = items.slice(input.offset, input.offset + input.limit);

        return {
          output: toJsonValue({
            group: input.group,
            hasMore: input.offset + input.limit < items.length,
            items: pagedItems,
            limit: input.limit,
            offset: input.offset,
            total: items.length,
          }),
        };
      },
      inputSchema: artifactListInputSchema,
      name: 'list-workspace-artifacts',
    } satisfies ToolDefinition<z.output<typeof artifactListInputSchema>, JsonValue>,
    {
      description:
        'Summarize prompt-routed workflow support and verify that routed mode files exist.',
      async execute(input) {
        return {
          output: toJsonValue(
            await getWorkflowSupportSummary(
              workspace,
              input.workflow === null ? undefined : input.workflow,
            ),
          ),
        };
      },
      inputSchema: workflowSupportInputSchema,
      name: 'summarize-workflow-support',
    } satisfies ToolDefinition<z.output<typeof workflowSupportInputSchema>, JsonValue>,
  ];
}

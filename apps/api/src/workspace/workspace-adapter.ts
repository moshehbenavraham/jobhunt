import {
  getRepoPaths,
  type RepoPathOptions,
  type RepoPaths,
} from '../config/repo-paths.js';
import { classifyWorkspacePath } from './workspace-boundary.js';
import {
  getWorkspaceSurface,
  listWorkspaceSurfaces,
} from './workspace-contract.js';
import {
  readRequiredWorkspaceSurface,
  readWorkspaceSurface,
  resolveWorkspaceSurface,
} from './workspace-read.js';
import { getWorkspaceSummary } from './workspace-summary.js';
import { writeWorkspaceFile } from './workspace-write.js';
import type {
  WorkspaceReadResult,
  WorkspaceResolvedSurface,
  WorkspaceSummary,
  WorkspaceSurfaceDefinition,
  WorkspaceSurfaceKey,
  WorkspaceWriteInput,
  WorkspaceWriteResult,
  WorkspacePathClassification,
} from './workspace-types.js';

export type WorkspaceAdapter = {
  classifyPath: (candidatePath: string) => WorkspacePathClassification;
  getSummary: () => Promise<WorkspaceSummary>;
  getSurface: (key: WorkspaceSurfaceKey) => WorkspaceSurfaceDefinition;
  listSurfaces: () => readonly WorkspaceSurfaceDefinition[];
  readRequiredSurface: (
    key: WorkspaceSurfaceKey,
  ) => Promise<Exclude<WorkspaceReadResult, { status: 'missing' }>>;
  readSurface: (key: WorkspaceSurfaceKey) => Promise<WorkspaceReadResult>;
  repoPaths: RepoPaths;
  resolveSurface: (
    key: WorkspaceSurfaceKey,
  ) => Promise<WorkspaceResolvedSurface>;
  writeFile: (input: WorkspaceWriteInput) => Promise<WorkspaceWriteResult>;
};

export function createWorkspaceAdapter(
  options: RepoPathOptions = {},
): WorkspaceAdapter {
  const repoPaths = getRepoPaths(options);
  const adapterOptions = { repoRoot: repoPaths.repoRoot };

  return {
    classifyPath(candidatePath: string): WorkspacePathClassification {
      return classifyWorkspacePath(candidatePath, adapterOptions);
    },
    async getSummary(): Promise<WorkspaceSummary> {
      return getWorkspaceSummary(adapterOptions);
    },
    getSurface(key: WorkspaceSurfaceKey): WorkspaceSurfaceDefinition {
      return getWorkspaceSurface(key);
    },
    listSurfaces(): readonly WorkspaceSurfaceDefinition[] {
      return listWorkspaceSurfaces();
    },
    async readRequiredSurface(
      key: WorkspaceSurfaceKey,
    ): Promise<Exclude<WorkspaceReadResult, { status: 'missing' }>> {
      return readRequiredWorkspaceSurface(key, adapterOptions);
    },
    async readSurface(key: WorkspaceSurfaceKey): Promise<WorkspaceReadResult> {
      return readWorkspaceSurface(key, adapterOptions);
    },
    repoPaths,
    async resolveSurface(
      key: WorkspaceSurfaceKey,
    ): Promise<WorkspaceResolvedSurface> {
      return resolveWorkspaceSurface(key, adapterOptions);
    },
    async writeFile(input: WorkspaceWriteInput): Promise<WorkspaceWriteResult> {
      return writeWorkspaceFile(input, adapterOptions);
    },
  };
}

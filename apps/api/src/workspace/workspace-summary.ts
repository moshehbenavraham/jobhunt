import {
  APP_STATE_DIRNAME,
  getRepoPaths,
  type RepoPathOptions,
} from '../config/repo-paths.js';
import { getAppStateRootStatus } from '../config/app-state-root.js';
import { partitionMissingReadResults } from './missing-file-policy.js';
import { listWorkspaceSurfaces } from './workspace-contract.js';
import { readWorkspaceSurface } from './workspace-read.js';
import type { WorkspaceSummary } from './workspace-types.js';

export async function getWorkspaceSummary(
  options: RepoPathOptions = {},
): Promise<WorkspaceSummary> {
  const repoPaths = getRepoPaths(options);
  const appStateRoot = await getAppStateRootStatus({
    repoRoot: repoPaths.repoRoot,
  });
  const results = await Promise.all(
    listWorkspaceSurfaces()
      .filter((surface) => surface.summaryExposure === 'startup')
      .map((surface) =>
      readWorkspaceSurface(surface.key, { repoRoot: repoPaths.repoRoot }),
      ),
  );
  const missingResults = results.filter(
    (result) => result.surface.key !== 'appStateRoot',
  );
  const { onboardingMissing, optionalMissing, runtimeMissing } =
    partitionMissingReadResults(missingResults);

  return {
    appStateRootExists: appStateRoot.exists,
    appStateRootPath: appStateRoot.rootPath,
    onboardingMissing,
    optionalMissing,
    protectedOwners: ['user', 'system'],
    repoRoot: repoPaths.repoRoot,
    runtimeMissing,
    writableRoots: [APP_STATE_DIRNAME],
  };
}

export async function getStartupWorkspaceSummary(
  options: RepoPathOptions = {},
): Promise<WorkspaceSummary> {
  return getWorkspaceSummary(options);
}

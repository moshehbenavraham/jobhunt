import { pathToFileURL } from 'node:url';
import { getAppStateRootStatus } from './config/app-state-root.js';
import { getRepoPaths } from './config/repo-paths.js';

export type StartupDiagnostics = {
  service: 'jobhunt-api-scaffold';
  sessionId: string;
  repoRoot: string;
  agentsGuidePath: string;
  dataContractPath: string;
  appStateRootPath: string;
  appStateRootExists: boolean;
  mutationPolicy: 'manual-bootstrap-only';
  userLayerWrites: 'disabled';
};

export async function getStartupDiagnostics(): Promise<StartupDiagnostics> {
  const repoPaths = getRepoPaths();
  const appStateRoot = await getAppStateRootStatus();

  return {
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase00-session01-monorepo-app-skeleton',
    repoRoot: repoPaths.repoRoot,
    agentsGuidePath: repoPaths.agentsGuidePath,
    dataContractPath: repoPaths.dataContractPath,
    appStateRootPath: appStateRoot.rootPath,
    appStateRootExists: appStateRoot.exists,
    mutationPolicy: 'manual-bootstrap-only',
    userLayerWrites: 'disabled',
  };
}

async function main(): Promise<void> {
  const diagnostics = await getStartupDiagnostics();
  console.log(JSON.stringify(diagnostics, null, 2));
}

function isMainModule(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`jobhunt-api-scaffold failed: ${message}`);
    process.exitCode = 1;
  });
}

import { pathToFileURL } from 'node:url';
import { type RepoPathOptions } from './config/repo-paths.js';
import { getPromptContractSummary, type PromptContractSummary } from './prompt/index.js';
import {
  createWorkspaceAdapter,
  type WorkspaceMissingSummary,
  type WorkspaceSummary,
} from './workspace/index.js';

export type StartupDiagnostics = {
  appStateRootPath: string;
  appStateRootExists: boolean;
  agentsGuidePath: string;
  dataContractPath: string;
  mutationPolicy: 'app-owned-only';
  onboardingMissing: WorkspaceMissingSummary[];
  optionalMissing: WorkspaceMissingSummary[];
  promptContract: PromptContractSummary;
  repoRoot: string;
  runtimeMissing: WorkspaceMissingSummary[];
  service: 'jobhunt-api-scaffold';
  sessionId: 'phase00-session03-prompt-loading-contract';
  userLayerWrites: 'disabled';
  workspace: WorkspaceSummary;
};

export async function getStartupDiagnostics(
  options: RepoPathOptions = {},
): Promise<StartupDiagnostics> {
  const workspace = createWorkspaceAdapter(options);
  const summary = await workspace.getSummary();

  return {
    appStateRootPath: summary.appStateRootPath,
    appStateRootExists: summary.appStateRootExists,
    agentsGuidePath: workspace.repoPaths.agentsGuidePath,
    dataContractPath: workspace.repoPaths.dataContractPath,
    mutationPolicy: 'app-owned-only',
    onboardingMissing: summary.onboardingMissing,
    optionalMissing: summary.optionalMissing,
    promptContract: getPromptContractSummary(),
    repoRoot: workspace.repoPaths.repoRoot,
    runtimeMissing: summary.runtimeMissing,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase00-session03-prompt-loading-contract',
    userLayerWrites: 'disabled',
    workspace: summary,
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

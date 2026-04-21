import type { StartupDiagnosticsService } from '../index.js';
import type { WorkspaceAdapter } from '../workspace/index.js';
import type { ToolRegistryInput } from './tool-contract.js';
import { createOnboardingRepairTools } from './onboarding-repair-tools.js';
import { createStartupInspectionTools } from './startup-inspection-tools.js';
import { createWorkspaceDiscoveryTools } from './workspace-discovery-tools.js';

export function createDefaultToolSuite(options: {
  startupDiagnostics: StartupDiagnosticsService;
  workspace: WorkspaceAdapter;
}): ToolRegistryInput {
  return [
    ...createStartupInspectionTools({
      getStartupDiagnostics: () => options.startupDiagnostics.getDiagnostics(),
    }),
    ...createWorkspaceDiscoveryTools({
      workspace: options.workspace,
    }),
    ...createOnboardingRepairTools({
      workspace: options.workspace,
    }),
  ];
}

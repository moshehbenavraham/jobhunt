import type { AgentRuntimeBootstrap } from '../agent-runtime/index.js';
import type { StartupDiagnosticsService } from '../index.js';
import type { WorkspaceAdapter } from '../workspace/index.js';
import { createBatchWorkflowTools } from './batch-workflow-tools.js';
import type { ToolRegistryInput } from './tool-contract.js';
import { createEvaluationArtifactTools } from './evaluation-artifact-tools.js';
import { createEvaluationIntakeTools } from './evaluation-intake-tools.js';
import { createEvaluationWorkflowTools } from './evaluation-workflow-tools.js';
import { createLivenessCheckTools } from './liveness-check-tools.js';
import { createOnboardingRepairTools } from './onboarding-repair-tools.js';
import { createPipelineProcessingTools } from './pipeline-processing-tools.js';
import { createPdfGenerationTools } from './pdf-generation-tools.js';
import { createScanWorkflowTools } from './scan-workflow-tools.js';
import { createStartupInspectionTools } from './startup-inspection-tools.js';
import { createTrackerIntegrityTools } from './tracker-integrity-tools.js';
import { createWorkspaceDiscoveryTools } from './workspace-discovery-tools.js';

export function createDefaultToolSuite(options: {
  bootstrapWorkflow: (
    workflow: 'auto-pipeline' | 'single-evaluation',
  ) => Promise<AgentRuntimeBootstrap>;
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
    ...createEvaluationIntakeTools(),
    ...createEvaluationWorkflowTools({
      bootstrapWorkflow: options.bootstrapWorkflow,
    }),
    ...createLivenessCheckTools(),
    ...createScanWorkflowTools(),
    ...createPipelineProcessingTools(),
    ...createBatchWorkflowTools(),
    ...createEvaluationArtifactTools(),
    ...createPdfGenerationTools(),
    ...createTrackerIntegrityTools(),
  ];
}

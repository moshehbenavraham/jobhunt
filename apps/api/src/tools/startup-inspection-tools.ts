import { z } from 'zod';
import type { StartupDiagnostics } from '../index.js';
import { getPromptContractSummary } from '../prompt/index.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';

const promptContractInputSchema = z.object({
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

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function summarizeStartupDiagnostics(diagnostics: StartupDiagnostics): {
  agentRuntime: StartupDiagnostics['agentRuntime'];
  bootSurface: StartupDiagnostics['bootSurface'];
  currentSession: StartupDiagnostics['currentSession'];
  mutationPolicy: StartupDiagnostics['mutationPolicy'];
  onboardingMissing: StartupDiagnostics['onboardingMissing'];
  operationalStore: StartupDiagnostics['operationalStore'];
  optionalMissing: StartupDiagnostics['optionalMissing'];
  promptContract: StartupDiagnostics['promptContract'];
  repoRoot: string;
  runtimeMissing: StartupDiagnostics['runtimeMissing'];
  service: StartupDiagnostics['service'];
  sessionId: StartupDiagnostics['sessionId'];
  userLayerWrites: StartupDiagnostics['userLayerWrites'];
  workspace: {
    appStateRootExists: boolean;
    appStateRootPath: string;
    protectedOwners: readonly string[];
    writableRoots: string[];
  };
} {
  return {
    agentRuntime: diagnostics.agentRuntime,
    bootSurface: diagnostics.bootSurface,
    currentSession: diagnostics.currentSession,
    mutationPolicy: diagnostics.mutationPolicy,
    onboardingMissing: diagnostics.onboardingMissing,
    operationalStore: diagnostics.operationalStore,
    optionalMissing: diagnostics.optionalMissing,
    promptContract: diagnostics.promptContract,
    repoRoot: diagnostics.repoRoot,
    runtimeMissing: diagnostics.runtimeMissing,
    service: diagnostics.service,
    sessionId: diagnostics.sessionId,
    userLayerWrites: diagnostics.userLayerWrites,
    workspace: {
      appStateRootExists: diagnostics.appStateRootExists,
      appStateRootPath: diagnostics.appStateRootPath,
      protectedOwners: diagnostics.workspace.protectedOwners,
      writableRoots: [...diagnostics.workspace.writableRoots].sort(),
    },
  };
}

export function createStartupInspectionTools(options: {
  getStartupDiagnostics: () => Promise<StartupDiagnostics>;
}): readonly AnyToolDefinition[] {
  return [
    {
      description:
        'Inspect startup diagnostics, auth readiness, prompt contract metadata, and missing startup files without mutating the workspace.',
      async execute() {
        const diagnostics = await options.getStartupDiagnostics();

        return {
          output: toJsonValue(summarizeStartupDiagnostics(diagnostics)),
        };
      },
      inputSchema: z.object({}),
      name: 'inspect-startup-diagnostics',
    } satisfies ToolDefinition<Record<string, never>, JsonValue>,
    {
      description:
        'Summarize the prompt contract and optionally focus on the route for a single workflow intent.',
      async execute(input) {
        const promptContract = getPromptContractSummary();
        const selectedRoute =
          input.workflow === null
            ? null
            : (promptContract.workflowRoutes.find(
                (route) => route.intent === input.workflow,
              ) ?? null);

        return {
          output: toJsonValue({
            cacheMode: promptContract.cacheMode,
            selectedRoute,
            sourceOrder: promptContract.sourceOrder,
            sources: promptContract.sources,
            supportedWorkflows: promptContract.supportedWorkflows,
            workflowRoutes: promptContract.workflowRoutes,
          }),
        };
      },
      inputSchema: promptContractInputSchema,
      name: 'inspect-prompt-contract',
    } satisfies ToolDefinition<
      z.output<typeof promptContractInputSchema>,
      JsonValue
    >,
  ];
}

import { WORKFLOW_INTENTS, type WorkflowIntent } from '../prompt/index.js';
import type {
  OrchestrationRouteStatus,
  SpecialistId,
} from './orchestration-contract.js';

export type SpecialistToolPolicy = {
  allowedToolNames: readonly string[];
  deniedToolNames?: readonly string[];
  fallbackToolNames?: readonly string[];
  restrictedToolNames?: readonly string[];
  revokedToolNames?: readonly string[];
};

export type SpecialistDefinition = {
  description: string;
  id: SpecialistId;
  label: string;
};

export type WorkflowSpecialistRoute = {
  message: string;
  missingCapabilities: readonly string[];
  specialistId: SpecialistId;
  status: Exclude<
    OrchestrationRouteStatus,
    'session-not-found' | 'unsupported-workflow'
  >;
  toolPolicy: SpecialistToolPolicy;
  workflow: WorkflowIntent;
};

const EVALUATION_TOOLS = [
  'check-job-liveness',
  'check-job-liveness-batch',
  'extract-ats-job',
  'generate-ats-pdf',
  'list-evaluation-artifacts',
  'merge-tracker-additions',
  'normalize-raw-job-description',
  'reserve-report-artifact',
  'stage-tracker-addition',
  'verify-tracker-pipeline',
  'write-report-artifact',
] as const;

const SCAN_TOOLS = [
  'check-job-liveness-batch',
  'enqueue-pipeline-processing',
  'enqueue-portal-scan',
  'list-workspace-artifacts',
  'summarize-profile-sources',
] as const;

const BATCH_TOOLS = [
  'dry-run-batch-evaluation',
  'list-evaluation-artifacts',
  'merge-tracker-additions',
  'retry-batch-evaluation-failures',
  'start-batch-evaluation',
  'verify-tracker-pipeline',
] as const;

const TRACKER_FALLBACK_TOOLS = [
  'list-evaluation-artifacts',
  'list-workspace-artifacts',
  'summarize-profile-sources',
  'summarize-workflow-support',
] as const;

const RESEARCH_FALLBACK_TOOLS = [
  'inspect-prompt-contract',
  'list-workspace-artifacts',
  'summarize-profile-sources',
] as const;

const specialistDefinitions = [
  {
    description:
      'Owns job-description intake, live evaluation, report artifacts, and PDF-oriented evaluation follow-through.',
    id: 'evaluation-specialist',
    label: 'Evaluation Specialist',
  },
  {
    description:
      'Owns portal scans and queued pipeline execution through durable backend workflows.',
    id: 'scan-specialist',
    label: 'Scan Specialist',
  },
  {
    description:
      'Owns tracker review, offer comparison, follow-up analysis, and other application-history workflows.',
    id: 'tracker-specialist',
    label: 'Tracker Specialist',
  },
  {
    description:
      'Owns application-help, research, interview, training, project, and outreach workflows once typed tooling exists.',
    id: 'research-specialist',
    label: 'Research Specialist',
  },
  {
    description:
      'Owns batch-evaluation supervision and batch closeout through durable workflow controls.',
    id: 'batch-supervisor',
    label: 'Batch Supervisor',
  },
] as const satisfies readonly SpecialistDefinition[];

const workflowRoutes = [
  {
    message:
      'Auto-pipeline can launch with the evaluation specialist and the current typed evaluation artifact toolset.',
    missingCapabilities: [],
    specialistId: 'evaluation-specialist',
    status: 'ready',
    toolPolicy: {
      allowedToolNames: [
        'bootstrap-auto-pipeline',
        ...EVALUATION_TOOLS,
      ],
    },
    workflow: 'auto-pipeline',
  },
  {
    message:
      'Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.',
    missingCapabilities: [],
    specialistId: 'evaluation-specialist',
    status: 'ready',
    toolPolicy: {
      allowedToolNames: [
        'bootstrap-single-evaluation',
        ...EVALUATION_TOOLS,
      ],
    },
    workflow: 'single-evaluation',
  },
  {
    message:
      'ATS PDF generation is supported directly through the evaluation specialist.',
    missingCapabilities: [],
    specialistId: 'evaluation-specialist',
    status: 'ready',
    toolPolicy: {
      allowedToolNames: [
        'generate-ats-pdf',
        'list-evaluation-artifacts',
        'summarize-profile-sources',
      ],
    },
    workflow: 'generate-ats-pdf',
  },
  {
    message:
      'Scan portals uses the scan specialist and durable workflow enqueue surfaces.',
    missingCapabilities: [],
    specialistId: 'scan-specialist',
    status: 'ready',
    toolPolicy: {
      allowedToolNames: SCAN_TOOLS,
    },
    workflow: 'scan-portals',
  },
  {
    message:
      'Pipeline processing uses the scan specialist and durable pipeline enqueue surfaces.',
    missingCapabilities: [],
    specialistId: 'scan-specialist',
    status: 'ready',
    toolPolicy: {
      allowedToolNames: SCAN_TOOLS,
    },
    workflow: 'process-pipeline',
  },
  {
    message:
      'Batch evaluation is supported through the batch supervisor and the durable batch workflow controls.',
    missingCapabilities: [],
    specialistId: 'batch-supervisor',
    status: 'ready',
    toolPolicy: {
      allowedToolNames: BATCH_TOOLS,
    },
    workflow: 'batch-evaluation',
  },
  {
    message:
      'Tracker status remains blocked until a typed tracker-summary tool is implemented.',
    missingCapabilities: ['typed-tracker-summary'],
    specialistId: 'tracker-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: TRACKER_FALLBACK_TOOLS,
      restrictedToolNames: ['inspect-prompt-contract'],
    },
    workflow: 'tracker-status',
  },
  {
    message:
      'Offer comparison remains blocked until typed comparison tools are implemented.',
    missingCapabilities: ['typed-offer-comparison'],
    specialistId: 'tracker-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: TRACKER_FALLBACK_TOOLS,
    },
    workflow: 'compare-offers',
  },
  {
    message:
      'Follow-up cadence remains blocked until typed follow-up analysis tools are implemented.',
    missingCapabilities: ['typed-follow-up-analysis'],
    specialistId: 'tracker-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: TRACKER_FALLBACK_TOOLS,
    },
    workflow: 'follow-up-cadence',
  },
  {
    message:
      'Rejection pattern analysis remains blocked until typed tracker-analysis tools are implemented.',
    missingCapabilities: ['typed-rejection-analysis'],
    specialistId: 'tracker-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: TRACKER_FALLBACK_TOOLS,
    },
    workflow: 'rejection-patterns',
  },
  {
    message:
      'Application help remains blocked until a typed application-assistance tool surface is implemented.',
    missingCapabilities: ['typed-application-help'],
    specialistId: 'research-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
    },
    workflow: 'application-help',
  },
  {
    message:
      'Deep company research remains blocked until typed research tooling is implemented.',
    missingCapabilities: ['typed-company-research'],
    specialistId: 'research-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
    },
    workflow: 'deep-company-research',
  },
  {
    message:
      'LinkedIn outreach remains blocked until typed outreach tooling is implemented.',
    missingCapabilities: ['typed-linkedin-outreach'],
    specialistId: 'research-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
    },
    workflow: 'linkedin-outreach',
  },
  {
    message:
      'Interview prep remains blocked until typed interview-prep tooling is implemented.',
    missingCapabilities: ['typed-interview-prep'],
    specialistId: 'research-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
    },
    workflow: 'interview-prep',
  },
  {
    message:
      'Training review remains blocked until typed training-review tooling is implemented.',
    missingCapabilities: ['typed-training-review'],
    specialistId: 'research-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
    },
    workflow: 'training-review',
  },
  {
    message:
      'Project review remains blocked until typed project-review tooling is implemented.',
    missingCapabilities: ['typed-project-review'],
    specialistId: 'research-specialist',
    status: 'tooling-gap',
    toolPolicy: {
      allowedToolNames: [],
      fallbackToolNames: RESEARCH_FALLBACK_TOOLS,
    },
    workflow: 'project-review',
  },
] as const satisfies readonly WorkflowSpecialistRoute[];

const specialistMap = new Map<SpecialistId, SpecialistDefinition>(
  specialistDefinitions.map((definition) => [definition.id, definition]),
);

const workflowRouteMap = new Map<WorkflowIntent, WorkflowSpecialistRoute>(
  workflowRoutes.map((route) => [route.workflow, route]),
);

function cloneToolPolicy(policy: SpecialistToolPolicy): SpecialistToolPolicy {
  return {
    allowedToolNames: [...policy.allowedToolNames],
    ...(policy.deniedToolNames
      ? {
          deniedToolNames: [...policy.deniedToolNames],
        }
      : {}),
    ...(policy.fallbackToolNames
      ? {
          fallbackToolNames: [...policy.fallbackToolNames],
        }
      : {}),
    ...(policy.restrictedToolNames
      ? {
          restrictedToolNames: [...policy.restrictedToolNames],
        }
      : {}),
    ...(policy.revokedToolNames
      ? {
          revokedToolNames: [...policy.revokedToolNames],
        }
      : {}),
  };
}

function assertUniqueStrings(values: readonly string[], label: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (!value.trim()) {
      throw new Error(`${label} must not contain empty tool names.`);
    }

    if (seen.has(value)) {
      throw new Error(`${label} contains duplicate tool name ${value}.`);
    }

    seen.add(value);
  }
}

function assertCatalogCoverage(): void {
  for (const workflow of WORKFLOW_INTENTS) {
    const route = workflowRouteMap.get(workflow);

    if (!route) {
      throw new Error(
        `Workflow ${workflow} is missing a specialist route definition.`,
      );
    }

    if (!specialistMap.has(route.specialistId)) {
      throw new Error(
        `Workflow ${workflow} references unknown specialist ${route.specialistId}.`,
      );
    }

    assertUniqueStrings(
      route.toolPolicy.allowedToolNames,
      `${workflow} allowedToolNames`,
    );
    assertUniqueStrings(
      route.toolPolicy.deniedToolNames ?? [],
      `${workflow} deniedToolNames`,
    );
    assertUniqueStrings(
      route.toolPolicy.restrictedToolNames ?? [],
      `${workflow} restrictedToolNames`,
    );
    assertUniqueStrings(
      route.toolPolicy.revokedToolNames ?? [],
      `${workflow} revokedToolNames`,
    );
    assertUniqueStrings(
      route.toolPolicy.fallbackToolNames ?? [],
      `${workflow} fallbackToolNames`,
    );
  }
}

assertCatalogCoverage();

export function listSpecialists(): readonly SpecialistDefinition[] {
  return specialistDefinitions.map((definition) => ({ ...definition }));
}

export function getSpecialistDefinition(
  specialistId: SpecialistId,
): SpecialistDefinition {
  const specialist = specialistMap.get(specialistId);

  if (!specialist) {
    throw new Error(`Unknown specialist definition: ${specialistId}.`);
  }

  return {
    ...specialist,
  };
}

export function listWorkflowSpecialistRoutes(): readonly WorkflowSpecialistRoute[] {
  return workflowRoutes.map((route) => ({
    ...route,
    missingCapabilities: [...route.missingCapabilities],
    toolPolicy: cloneToolPolicy(route.toolPolicy),
  }));
}

export function getWorkflowSpecialistRoute(
  workflow: WorkflowIntent,
): WorkflowSpecialistRoute | null {
  const route = workflowRouteMap.get(workflow);

  if (!route) {
    return null;
  }

  return {
    ...route,
    missingCapabilities: [...route.missingCapabilities],
    toolPolicy: cloneToolPolicy(route.toolPolicy),
  };
}

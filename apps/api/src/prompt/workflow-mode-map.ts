import { normalizeRepoRelativePath } from '../config/repo-paths.js';
import {
  type PromptWorkflowRoute,
  type WorkflowIntent,
  WORKFLOW_INTENTS,
  PromptModePathError,
  PromptUnsupportedWorkflowError,
} from './prompt-types.js';

const WORKFLOW_MODE_ROUTES = [
  {
    description: 'Treat pasted JD text or a job URL as the full auto pipeline.',
    intent: 'auto-pipeline',
    modeRepoRelativePath: 'modes/auto-pipeline.md',
  },
  {
    description: 'Evaluate a single role without running the full pipeline.',
    intent: 'single-evaluation',
    modeRepoRelativePath: 'modes/oferta.md',
  },
  {
    description: 'Compare multiple offers against the current profile.',
    intent: 'compare-offers',
    modeRepoRelativePath: 'modes/ofertas.md',
  },
  {
    description: 'Scan configured job portals and score newly found roles.',
    intent: 'scan-portals',
    modeRepoRelativePath: 'modes/scan.md',
  },
  {
    description:
      'Generate the ATS-focused PDF artifacts for an evaluated role.',
    intent: 'generate-ats-pdf',
    modeRepoRelativePath: 'modes/pdf.md',
  },
  {
    description:
      'Guide a live application flow without submitting for the user.',
    intent: 'application-help',
    modeRepoRelativePath: 'modes/apply.md',
  },
  {
    description: 'Process the queued entries in data/pipeline.md.',
    intent: 'process-pipeline',
    modeRepoRelativePath: 'modes/pipeline.md',
  },
  {
    description: 'Summarize tracker state and application progress.',
    intent: 'tracker-status',
    modeRepoRelativePath: 'modes/tracker.md',
  },
  {
    description: 'Run deeper company research beyond the base evaluation.',
    intent: 'deep-company-research',
    modeRepoRelativePath: 'modes/deep.md',
  },
  {
    description: 'Draft or review LinkedIn outreach messages.',
    intent: 'linkedin-outreach',
    modeRepoRelativePath: 'modes/contacto.md',
  },
  {
    description: 'Prepare for interviews using the interview-prep mode.',
    intent: 'interview-prep',
    modeRepoRelativePath: 'modes/interview-prep.md',
  },
  {
    description: 'Review training or certification opportunities.',
    intent: 'training-review',
    modeRepoRelativePath: 'modes/training.md',
  },
  {
    description: 'Review project ideas against the profile and evidence base.',
    intent: 'project-review',
    modeRepoRelativePath: 'modes/project.md',
  },
  {
    description: 'Run batch evaluation behavior across queued jobs.',
    intent: 'batch-evaluation',
    modeRepoRelativePath: 'modes/batch.md',
  },
  {
    description: 'Analyze rejection patterns and extract recurring blockers.',
    intent: 'rejection-patterns',
    modeRepoRelativePath: 'modes/patterns.md',
  },
  {
    description: 'Review follow-up cadence and next-touch recommendations.',
    intent: 'follow-up-cadence',
    modeRepoRelativePath: 'modes/followup.md',
  },
] as const satisfies readonly PromptWorkflowRoute[];

const workflowRouteMap = new Map<WorkflowIntent, PromptWorkflowRoute>(
  WORKFLOW_MODE_ROUTES.map((route) => [route.intent, route]),
);

function assertWorkflowModePath(
  route: PromptWorkflowRoute,
): PromptWorkflowRoute {
  const normalizedPath = normalizeRepoRelativePath(route.modeRepoRelativePath);

  if (
    !normalizedPath.startsWith('modes/') ||
    !normalizedPath.endsWith('.md') ||
    normalizedPath === 'modes/_shared.md' ||
    normalizedPath === 'modes/_profile.md'
  ) {
    throw new PromptModePathError(route.intent, route.modeRepoRelativePath);
  }

  return {
    ...route,
    modeRepoRelativePath: normalizedPath,
  };
}

export function listWorkflowModeRoutes(): readonly PromptWorkflowRoute[] {
  return WORKFLOW_MODE_ROUTES.map(assertWorkflowModePath);
}

export function isWorkflowIntent(
  candidate: unknown,
): candidate is WorkflowIntent {
  return (
    typeof candidate === 'string' &&
    (WORKFLOW_INTENTS as readonly string[]).includes(candidate)
  );
}

export function parseWorkflowIntent(candidate: unknown): WorkflowIntent {
  if (typeof candidate !== 'string') {
    throw new PromptUnsupportedWorkflowError(
      String(candidate),
      WORKFLOW_INTENTS,
    );
  }

  if (!isWorkflowIntent(candidate)) {
    throw new PromptUnsupportedWorkflowError(candidate, WORKFLOW_INTENTS);
  }

  return candidate;
}

export function getWorkflowModeRoute(candidate: unknown): PromptWorkflowRoute {
  const intent = parseWorkflowIntent(candidate);
  const route = workflowRouteMap.get(intent);

  if (!route) {
    throw new PromptUnsupportedWorkflowError(intent, WORKFLOW_INTENTS);
  }

  return assertWorkflowModePath(route);
}

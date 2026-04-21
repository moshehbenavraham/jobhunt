import type {
  PromptSourceDefinition,
  PromptSourceKey,
  WorkflowIntent,
} from './prompt-types.js';
import { getWorkflowModeRoute } from './workflow-mode-map.js';

const BASE_PROMPT_SOURCE_DEFINITIONS = [
  {
    key: 'agents-guide',
    label: 'AGENTS.md',
    notes: ['Canonical repo instructions and routing constraints.'],
    optional: false,
    owner: 'system',
    precedence: 10,
    role: 'operational-instructions',
    surfaceKey: 'agentsGuide',
  },
  {
    key: 'shared-mode',
    label: 'modes/_shared.md',
    notes: ['Shared system rules load before user overrides.'],
    optional: false,
    owner: 'system',
    precedence: 20,
    role: 'shared-rules',
    surfaceKey: 'sharedMode',
  },
  {
    key: 'profile-mode',
    label: 'modes/_profile.md',
    notes: [
      'User-specific overlays override shared defaults after _shared.md.',
    ],
    optional: false,
    owner: 'user',
    precedence: 30,
    role: 'user-overrides',
    surfaceKey: 'profileMode',
  },
  {
    key: 'profile-config',
    label: 'config/profile.yml',
    notes: ['Identity, targets, and constraints for the current user.'],
    optional: false,
    owner: 'user',
    precedence: 50,
    role: 'supporting-data',
    surfaceKey: 'profileConfig',
  },
  {
    key: 'profile-cv',
    label: 'profile/cv.md',
    notes: ['Primary CV source with accepted legacy fallback to cv.md.'],
    optional: false,
    owner: 'user',
    precedence: 60,
    role: 'supporting-data',
    surfaceKey: 'profileCv',
  },
  {
    key: 'article-digest',
    label: 'profile/article-digest.md',
    notes: [
      'Optional proof-point digest.',
      'When present, article-digest metrics take precedence over conflicting CV metrics.',
    ],
    optional: true,
    owner: 'user',
    precedence: 70,
    role: 'supporting-data',
    surfaceKey: 'articleDigest',
  },
] as const satisfies readonly PromptSourceDefinition[];

const WORKFLOW_MODE_SOURCE_SUMMARY: PromptSourceDefinition = {
  key: 'workflow-mode',
  label: 'workflow mode (resolved from workflow registry)',
  notes: ['Workflow guidance comes from the explicit workflow registry.'],
  optional: false,
  owner: 'system',
  precedence: 40,
  role: 'workflow-guidance',
  surfaceKey: null,
};

export function getPromptSourceOrder(): readonly PromptSourceKey[] {
  return [
    'agents-guide',
    'shared-mode',
    'profile-mode',
    'workflow-mode',
    'profile-config',
    'profile-cv',
    'article-digest',
  ];
}

export function getPromptSourceDefinitions(
  workflowIntent: WorkflowIntent,
): PromptSourceDefinition[] {
  const workflowRoute = getWorkflowModeRoute(workflowIntent);

  return [
    BASE_PROMPT_SOURCE_DEFINITIONS[0],
    BASE_PROMPT_SOURCE_DEFINITIONS[1],
    BASE_PROMPT_SOURCE_DEFINITIONS[2],
    {
      ...WORKFLOW_MODE_SOURCE_SUMMARY,
      label: workflowRoute.modeRepoRelativePath,
      notes: [workflowRoute.description],
    },
    BASE_PROMPT_SOURCE_DEFINITIONS[3],
    BASE_PROMPT_SOURCE_DEFINITIONS[4],
    BASE_PROMPT_SOURCE_DEFINITIONS[5],
  ];
}

export function getPromptSourcePolicySummary(): PromptSourceDefinition[] {
  return [
    BASE_PROMPT_SOURCE_DEFINITIONS[0],
    BASE_PROMPT_SOURCE_DEFINITIONS[1],
    BASE_PROMPT_SOURCE_DEFINITIONS[2],
    WORKFLOW_MODE_SOURCE_SUMMARY,
    BASE_PROMPT_SOURCE_DEFINITIONS[3],
    BASE_PROMPT_SOURCE_DEFINITIONS[4],
    BASE_PROMPT_SOURCE_DEFINITIONS[5],
  ];
}

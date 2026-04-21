import { APP_STATE_DIRNAME } from '../config/repo-paths.js';
import type {
  WorkspaceMutationAuthorization,
  WorkspaceOwner,
  WorkspaceSurfaceDefinition,
  WorkspaceSurfaceKey,
} from './workspace-types.js';

const WORKSPACE_SURFACES = [
  {
    key: 'agentsGuide',
    description: 'Canonical repo instructions',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['AGENTS.md'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: true,
    missingBehavior: 'runtime-error',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'dataContract',
    description: 'User versus system boundary contract',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['docs/DATA_CONTRACT.md'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: true,
    missingBehavior: 'runtime-error',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'sharedMode',
    description: 'Shared scoring and workflow mode',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['modes/_shared.md'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: true,
    missingBehavior: 'runtime-error',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'modesDirectory',
    description: 'Checked-in workflow mode directory',
    owner: 'system',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['modes'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: true,
    missingBehavior: 'runtime-error',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'docsDirectory',
    description: 'Checked-in documentation directory',
    owner: 'system',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['docs'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: true,
    missingBehavior: 'runtime-error',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'profileMode',
    description: 'User-specific profile mode overlay',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['modes/_profile.md'],
    mutationApproval: 'required',
    mutationTarget: 'profile',
    startupCritical: true,
    missingBehavior: 'onboarding-required',
    onboardingRepairSourceKey: 'profileModeTemplate',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'profileConfig',
    description: 'User identity and targeting profile',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['config/profile.yml'],
    mutationApproval: 'required',
    mutationTarget: 'profile',
    startupCritical: true,
    missingBehavior: 'onboarding-required',
    onboardingRepairSourceKey: 'profileConfigTemplate',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'portalsConfig',
    description: 'Portal scan targeting configuration',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['config/portals.yml'],
    mutationApproval: 'required',
    mutationTarget: 'profile',
    startupCritical: true,
    missingBehavior: 'onboarding-required',
    onboardingRepairSourceKey: 'portalsConfigTemplate',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'profileCv',
    description: 'Primary CV content with accepted legacy fallback',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['profile/cv.md', 'cv.md'],
    mutationApproval: 'required',
    mutationTarget: 'profile',
    startupCritical: true,
    missingBehavior: 'onboarding-required',
    onboardingRepairSourceKey: 'profileCvTemplate',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'articleDigest',
    description: 'Optional proof-point article digest',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['profile/article-digest.md', 'article-digest.md'],
    mutationApproval: 'required',
    mutationTarget: 'profile',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'applicationsTracker',
    description: 'Application tracker markdown table',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/applications.md'],
    mutationApproval: 'required',
    mutationTarget: 'tracker',
    startupCritical: false,
    missingBehavior: 'optional',
    onboardingRepairSourceKey: 'applicationsTrackerTemplate',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'applicationsTrackerTemplate',
    description: 'Checked-in starter application tracker template',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/applications.example.md'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: false,
    missingBehavior: 'runtime-error',
    onboardingTemplateFor: 'applicationsTracker',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'pipelineInbox',
    description: 'Pipeline inbox markdown file',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/pipeline.md'],
    mutationApproval: 'required',
    mutationTarget: 'pipeline',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'scanHistory',
    description: 'Portal scan history TSV',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/scan-history.tsv'],
    mutationApproval: 'required',
    mutationTarget: 'scan-history',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'followUps',
    description: 'Follow-up history markdown file',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/follow-ups.md'],
    mutationApproval: 'required',
    mutationTarget: 'follow-ups',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'openaiAccountAuth',
    description: 'Stored OpenAI account credentials JSON',
    owner: 'user',
    kind: 'file',
    contentType: 'json',
    candidates: ['data/openai-account-auth.json'],
    mutationApproval: 'required',
    mutationTarget: 'auth-state',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'storyBank',
    description: 'Interview story bank markdown file',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['interview-prep/story-bank.md'],
    mutationApproval: 'required',
    mutationTarget: 'story-bank',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'startup',
    writePolicy: 'read-only',
  },
  {
    key: 'reportsDirectory',
    description: 'Generated evaluation reports directory',
    owner: 'user',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['reports'],
    mutationApproval: 'required',
    mutationTarget: 'reports',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'outputDirectory',
    description: 'Generated PDF output directory',
    owner: 'user',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['output'],
    mutationApproval: 'required',
    mutationTarget: 'artifacts',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'jdsDirectory',
    description: 'Saved job descriptions directory',
    owner: 'user',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['jds'],
    mutationApproval: 'required',
    mutationTarget: 'job-descriptions',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'trackerAdditionsDirectory',
    description: 'Pending tracker TSV additions directory',
    owner: 'user',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['batch/tracker-additions'],
    mutationApproval: 'required',
    mutationTarget: 'tracker-additions',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'portalsConfigTemplate',
    description: 'Checked-in starter portal configuration template',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['config/portals.example.yml'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: false,
    missingBehavior: 'runtime-error',
    onboardingTemplateFor: 'portalsConfig',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'profileConfigTemplate',
    description: 'Checked-in starter profile configuration template',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['config/profile.example.yml'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: false,
    missingBehavior: 'runtime-error',
    onboardingTemplateFor: 'profileConfig',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'profileCvTemplate',
    description: 'Checked-in starter CV template',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['profile/cv.example.md'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: false,
    missingBehavior: 'runtime-error',
    onboardingTemplateFor: 'profileCv',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'profileModeTemplate',
    description: 'Checked-in starter user profile mode template',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['modes/_profile.template.md'],
    mutationApproval: 'required',
    mutationTarget: null,
    startupCritical: false,
    missingBehavior: 'runtime-error',
    onboardingTemplateFor: 'profileMode',
    summaryExposure: 'internal',
    writePolicy: 'read-only',
  },
  {
    key: 'appStateRoot',
    description: 'App-owned runtime state directory',
    owner: 'app',
    kind: 'directory',
    contentType: 'directory',
    candidates: [APP_STATE_DIRNAME],
    mutationApproval: 'none',
    mutationTarget: 'app-state',
    startupCritical: false,
    missingBehavior: 'optional',
    summaryExposure: 'startup',
    writePolicy: 'app-owned',
  },
] as const satisfies readonly WorkspaceSurfaceDefinition[];

const workspaceSurfaceMap = new Map<
  WorkspaceSurfaceKey,
  WorkspaceSurfaceDefinition
>(WORKSPACE_SURFACES.map((surface) => [surface.key, surface]));

const USER_EXACT_PATHS = new Set<string>([
  'article-digest.md',
  'config/portals.yml',
  'config/profile.yml',
  'cv.md',
  'data/applications.md',
  'data/follow-ups.md',
  'data/openai-account-auth.json',
  'data/pipeline.md',
  'data/scan-history.tsv',
  'modes/_profile.md',
  'profile/article-digest.md',
  'profile/cv.md',
]);

const USER_DIRECTORY_PREFIXES = ['jds', 'output', 'reports'] as const;
const USER_BATCH_DIRECTORY_PREFIXES = ['batch/tracker-additions'] as const;
const SYSTEM_DIRECTORY_PREFIXES = [
  '.codex',
  '.spec_system',
  'apps',
  'batch',
  'dashboard',
  'docs',
  'fonts',
  'modes',
  'scripts',
  'templates',
] as const;
const SYSTEM_EXACT_PATHS = new Set<string>([
  'AGENTS.md',
  'README.md',
  'VERSION',
  'package-lock.json',
  'package.json',
  'tsconfig.base.json',
]);

function isPrefixMatch(prefix: string, repoRelativePath: string): boolean {
  return (
    repoRelativePath === prefix || repoRelativePath.startsWith(`${prefix}/`)
  );
}

function isInterviewPrepUserPath(repoRelativePath: string): boolean {
  return (
    repoRelativePath.startsWith('interview-prep/') &&
    repoRelativePath.endsWith('.md') &&
    !repoRelativePath.endsWith('.example.md')
  );
}

function isExampleSystemPath(repoRelativePath: string): boolean {
  return (
    repoRelativePath.endsWith('.example.md') ||
    repoRelativePath.endsWith('.example.yml') ||
    repoRelativePath.endsWith('.example.json') ||
    repoRelativePath.endsWith('.example.json.lock')
  );
}

export function listWorkspaceSurfaces(): readonly WorkspaceSurfaceDefinition[] {
  return WORKSPACE_SURFACES;
}

export function getWorkspaceSurface(
  key: WorkspaceSurfaceKey,
): WorkspaceSurfaceDefinition {
  const surface = workspaceSurfaceMap.get(key);

  if (!surface) {
    throw new Error(`Unknown workspace surface: ${key}`);
  }

  return surface;
}

export function findSurfaceByRepoRelativePath(
  repoRelativePath: string,
): WorkspaceSurfaceDefinition | null {
  for (const surface of WORKSPACE_SURFACES) {
    for (const candidate of surface.candidates) {
      if (candidate === repoRelativePath) {
        return surface;
      }

      if (
        surface.kind === 'directory' &&
        isPrefixMatch(candidate, repoRelativePath)
      ) {
        return surface;
      }
    }
  }

  return null;
}

export function classifyWorkspaceMutationPolicy(
  repoRelativePath: string,
): Pick<
  WorkspaceMutationAuthorization,
  'approval' | 'surface' | 'target'
> | null {
  const surface = findSurfaceByRepoRelativePath(repoRelativePath);

  if (!surface || surface.mutationTarget === null) {
    return null;
  }

  return {
    approval: surface.mutationApproval,
    surface,
    target: surface.mutationTarget,
  };
}

export function classifyKnownRepoRelativePath(
  repoRelativePath: string,
): WorkspaceOwner {
  if (repoRelativePath === APP_STATE_DIRNAME) {
    return 'app';
  }

  if (USER_EXACT_PATHS.has(repoRelativePath)) {
    return 'user';
  }

  if (
    USER_DIRECTORY_PREFIXES.some((prefix) =>
      isPrefixMatch(prefix, repoRelativePath),
    )
  ) {
    return 'user';
  }

  if (
    USER_BATCH_DIRECTORY_PREFIXES.some((prefix) =>
      isPrefixMatch(prefix, repoRelativePath),
    )
  ) {
    return 'user';
  }

  if (isInterviewPrepUserPath(repoRelativePath)) {
    return 'user';
  }

  if (SYSTEM_EXACT_PATHS.has(repoRelativePath)) {
    return 'system';
  }

  if (isExampleSystemPath(repoRelativePath)) {
    return 'system';
  }

  if (
    SYSTEM_DIRECTORY_PREFIXES.some((prefix) =>
      isPrefixMatch(prefix, repoRelativePath),
    )
  ) {
    return 'system';
  }

  return 'unknown';
}

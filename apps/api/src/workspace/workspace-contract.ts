import { APP_STATE_DIRNAME } from '../config/repo-paths.js';
import type {
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
    startupCritical: true,
    missingBehavior: 'runtime-error',
    writePolicy: 'read-only',
  },
  {
    key: 'dataContract',
    description: 'User versus system boundary contract',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['docs/DATA_CONTRACT.md'],
    startupCritical: true,
    missingBehavior: 'runtime-error',
    writePolicy: 'read-only',
  },
  {
    key: 'sharedMode',
    description: 'Shared scoring and workflow mode',
    owner: 'system',
    kind: 'file',
    contentType: 'text',
    candidates: ['modes/_shared.md'],
    startupCritical: true,
    missingBehavior: 'runtime-error',
    writePolicy: 'read-only',
  },
  {
    key: 'modesDirectory',
    description: 'Checked-in workflow mode directory',
    owner: 'system',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['modes'],
    startupCritical: true,
    missingBehavior: 'runtime-error',
    writePolicy: 'read-only',
  },
  {
    key: 'docsDirectory',
    description: 'Checked-in documentation directory',
    owner: 'system',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['docs'],
    startupCritical: true,
    missingBehavior: 'runtime-error',
    writePolicy: 'read-only',
  },
  {
    key: 'profileMode',
    description: 'User-specific profile mode overlay',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['modes/_profile.md'],
    startupCritical: true,
    missingBehavior: 'onboarding-required',
    writePolicy: 'read-only',
  },
  {
    key: 'profileConfig',
    description: 'User identity and targeting profile',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['config/profile.yml'],
    startupCritical: true,
    missingBehavior: 'onboarding-required',
    writePolicy: 'read-only',
  },
  {
    key: 'portalsConfig',
    description: 'Portal scan targeting configuration',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['config/portals.yml'],
    startupCritical: true,
    missingBehavior: 'onboarding-required',
    writePolicy: 'read-only',
  },
  {
    key: 'profileCv',
    description: 'Primary CV content with accepted legacy fallback',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['profile/cv.md', 'cv.md'],
    startupCritical: true,
    missingBehavior: 'onboarding-required',
    writePolicy: 'read-only',
  },
  {
    key: 'articleDigest',
    description: 'Optional proof-point article digest',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['profile/article-digest.md', 'article-digest.md'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'applicationsTracker',
    description: 'Application tracker markdown table',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/applications.md'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'pipelineInbox',
    description: 'Pipeline inbox markdown file',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/pipeline.md'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'scanHistory',
    description: 'Portal scan history TSV',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/scan-history.tsv'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'followUps',
    description: 'Follow-up history markdown file',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['data/follow-ups.md'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'openaiAccountAuth',
    description: 'Stored OpenAI account credentials JSON',
    owner: 'user',
    kind: 'file',
    contentType: 'json',
    candidates: ['data/openai-account-auth.json'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'storyBank',
    description: 'Interview story bank markdown file',
    owner: 'user',
    kind: 'file',
    contentType: 'text',
    candidates: ['interview-prep/story-bank.md'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'reportsDirectory',
    description: 'Generated evaluation reports directory',
    owner: 'user',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['reports'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'outputDirectory',
    description: 'Generated PDF output directory',
    owner: 'user',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['output'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'jdsDirectory',
    description: 'Saved job descriptions directory',
    owner: 'user',
    kind: 'directory',
    contentType: 'directory',
    candidates: ['jds'],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'read-only',
  },
  {
    key: 'appStateRoot',
    description: 'App-owned runtime state directory',
    owner: 'app',
    kind: 'directory',
    contentType: 'directory',
    candidates: [APP_STATE_DIRNAME],
    startupCritical: false,
    missingBehavior: 'optional',
    writePolicy: 'app-owned',
  },
] as const satisfies readonly WorkspaceSurfaceDefinition[];

const workspaceSurfaceMap = new Map<WorkspaceSurfaceKey, WorkspaceSurfaceDefinition>(
  WORKSPACE_SURFACES.map((surface) => [surface.key, surface]),
);

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

export function classifyKnownRepoRelativePath(
  repoRelativePath: string,
): WorkspaceOwner {
  if (repoRelativePath === APP_STATE_DIRNAME) {
    return 'app';
  }

  if (USER_EXACT_PATHS.has(repoRelativePath)) {
    return 'user';
  }

  if (USER_DIRECTORY_PREFIXES.some((prefix) => isPrefixMatch(prefix, repoRelativePath))) {
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

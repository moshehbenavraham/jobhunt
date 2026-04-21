import type { JsonValue } from '../workspace/workspace-types.js';
import type { WorkspaceAdapter, WorkspaceReadResult } from '../workspace/index.js';
import { ToolExecutionError } from './tool-errors.js';

export type ProfileSummaryArchetypeFit =
  | 'adjacent'
  | 'primary'
  | 'secondary'
  | 'unknown';
export type ProfileSummaryRemotePolicy =
  | 'allowed_locations_only'
  | 'remote_only'
  | 'remote_or_allowed_locations'
  | 'unknown'
  | 'unrestricted';

export type ProfileSourceAvailability = {
  exists: boolean;
  legacyFallback: boolean;
  repoRelativePath: string | null;
  surfaceKey: string;
};

export type ProfileSummary = {
  articleDigest: {
    headingCount: number;
    headings: string[];
    source: ProfileSourceAvailability;
  };
  candidate: {
    email: string | null;
    fullName: string | null;
    headline: string | null;
    location: string | null;
    timezone: string | null;
  };
  compensation: {
    currency: string | null;
    minimum: string | null;
    targetRange: string | null;
  };
  cv: {
    headingCount: number;
    headings: string[];
    source: ProfileSourceAvailability;
  };
  discovery: {
    allowedLocationTerms: string[];
    allowRemoteUnknownLocations: boolean | null;
    allowUnknownLocations: boolean | null;
    blockedRegions: string[];
    remotePolicy: ProfileSummaryRemotePolicy;
  };
  portals: {
    enabledTrackedCompanies: number;
    negativeTitles: string[];
    positiveTitles: string[];
    trackedCompanies: number;
  };
  targetRoles: {
    archetypes: Array<{
      fit: ProfileSummaryArchetypeFit;
      level: string | null;
      name: string;
    }>;
    primary: string[];
  };
};

type YamlModule = {
  load?: (input: string) => unknown;
};

let yamlModulePromise: Promise<YamlModule> | undefined;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map((entry) => asString(entry))
    .filter((entry): entry is string => entry !== null);
}

function buildSourceAvailability(
  surfaceKey: string,
  result: WorkspaceReadResult,
): ProfileSourceAvailability {
  return {
    exists: result.status === 'found',
    legacyFallback:
      result.status === 'found' &&
      (result.repoRelativePath === 'article-digest.md' ||
        result.repoRelativePath === 'cv.md'),
    repoRelativePath:
      result.status === 'found' ? result.repoRelativePath : null,
    surfaceKey,
  };
}

function getMarkdownHeadings(text: string): string[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.match(/^#{1,3}\s+(.+)$/u)?.[1]?.trim() ?? null)
    .filter((heading): heading is string => heading !== null)
    .slice(0, 12);
}

function normalizeArchetypeFit(value: unknown): ProfileSummaryArchetypeFit {
  switch (value) {
    case 'adjacent':
    case 'primary':
    case 'secondary':
      return value;
    default:
      return 'unknown';
  }
}

function normalizeRemotePolicy(value: unknown): ProfileSummaryRemotePolicy {
  switch (value) {
    case 'allowed_locations_only':
    case 'remote_only':
    case 'remote_or_allowed_locations':
    case 'unrestricted':
      return value;
    default:
      return 'unknown';
  }
}

async function loadYamlDocument(text: string): Promise<Record<string, unknown>> {
  if (!yamlModulePromise) {
    const moduleName = 'js-yaml';
    yamlModulePromise = import(moduleName) as Promise<YamlModule>;
  }

  const yamlModule = await yamlModulePromise;

  if (typeof yamlModule.load !== 'function') {
    throw new ToolExecutionError(
      'tool-invalid-config',
      'js-yaml is unavailable for profile summary parsing.',
    );
  }

  return asObject(yamlModule.load(text));
}

async function parseYamlSurface(
  label: string,
  result: WorkspaceReadResult,
): Promise<Record<string, unknown>> {
  if (result.status !== 'found' || typeof result.value !== 'string') {
    return {};
  }

  try {
    return await loadYamlDocument(result.value);
  } catch (error) {
    throw new ToolExecutionError(
      'tool-execution-failed',
      `Failed to parse ${label}.`,
      {
        cause: error,
        detail: {
          repoRelativePath: result.repoRelativePath,
        } satisfies JsonValue,
      },
    );
  }
}

export async function summarizeProfileSources(
  workspace: WorkspaceAdapter,
): Promise<ProfileSummary> {
  const [
    articleDigestResult,
    portalsConfigResult,
    profileConfigResult,
    profileCvResult,
  ] = await Promise.all([
    workspace.readSurface('articleDigest'),
    workspace.readSurface('portalsConfig'),
    workspace.readSurface('profileConfig'),
    workspace.readSurface('profileCv'),
  ]);
  const [portalsConfig, profileConfig] = await Promise.all([
    parseYamlSurface('portals configuration', portalsConfigResult),
    parseYamlSurface('profile configuration', profileConfigResult),
  ]);
  const candidate = asObject(profileConfig.candidate);
  const compensation = asObject(profileConfig.compensation);
  const discovery = asObject(profileConfig.discovery);
  const location = asObject(profileConfig.location);
  const narrative = asObject(profileConfig.narrative);
  const targetRoles = asObject(profileConfig.target_roles);
  const titleFilter = asObject(portalsConfig.title_filter);
  const trackedCompanies = asArray(portalsConfig.tracked_companies).map(
    (entry) => asObject(entry),
  );
  const enabledTrackedCompanies = trackedCompanies.filter(
    (entry) => entry.enabled === true,
  ).length;
  const cvText =
    profileCvResult.status === 'found' && typeof profileCvResult.value === 'string'
      ? profileCvResult.value
      : '';
  const articleDigestText =
    articleDigestResult.status === 'found' &&
    typeof articleDigestResult.value === 'string'
      ? articleDigestResult.value
      : '';

  return {
    articleDigest: {
      headingCount: getMarkdownHeadings(articleDigestText).length,
      headings: getMarkdownHeadings(articleDigestText),
      source: buildSourceAvailability('articleDigest', articleDigestResult),
    },
    candidate: {
      email: asString(candidate.email),
      fullName: asString(candidate.full_name),
      headline: asString(narrative.headline),
      location: asString(candidate.location) ?? asString(location.city),
      timezone: asString(location.timezone),
    },
    compensation: {
      currency: asString(compensation.currency),
      minimum: asString(compensation.minimum),
      targetRange: asString(compensation.target_range),
    },
    cv: {
      headingCount: getMarkdownHeadings(cvText).length,
      headings: getMarkdownHeadings(cvText),
      source: buildSourceAvailability('profileCv', profileCvResult),
    },
    discovery: {
      allowedLocationTerms: asStringArray(discovery.allowed_location_terms),
      allowRemoteUnknownLocations: asBoolean(
        discovery.allow_remote_unknown_locations,
      ),
      allowUnknownLocations: asBoolean(discovery.allow_unknown_locations),
      blockedRegions: asStringArray(discovery.blocked_regions),
      remotePolicy: normalizeRemotePolicy(discovery.remote_policy),
    },
    portals: {
      enabledTrackedCompanies,
      negativeTitles: asStringArray(titleFilter.negative),
      positiveTitles: asStringArray(titleFilter.positive),
      trackedCompanies: trackedCompanies.length,
    },
    targetRoles: {
      archetypes: asArray(targetRoles.archetypes)
        .map((entry) => asObject(entry))
        .map((entry) => ({
          fit: normalizeArchetypeFit(entry.fit),
          level: asString(entry.level),
          name: asString(entry.name) ?? 'Unknown',
        })),
      primary: asStringArray(targetRoles.primary),
    },
  };
}

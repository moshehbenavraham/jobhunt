export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type WorkspaceOwner = 'app' | 'system' | 'unknown' | 'user';
export type WorkspaceSurfaceKind = 'directory' | 'file';
export type WorkspaceContentType = 'directory' | 'json' | 'text';
export type WorkspaceSummaryExposure = 'internal' | 'startup';
export type WorkspaceMissingBehavior =
  | 'onboarding-required'
  | 'optional'
  | 'runtime-error';
export const WORKSPACE_MUTATION_TARGETS = [
  'app-state',
  'artifacts',
  'auth-state',
  'follow-ups',
  'job-descriptions',
  'pipeline',
  'profile',
  'reports',
  'scan-history',
  'story-bank',
  'tracker',
  'tracker-additions',
] as const;
export type WorkspaceMutationTarget =
  (typeof WORKSPACE_MUTATION_TARGETS)[number];
export const WORKSPACE_MUTATION_APPROVALS = ['none', 'required'] as const;
export type WorkspaceMutationApproval =
  (typeof WORKSPACE_MUTATION_APPROVALS)[number];
export type WorkspaceWritePolicy = 'app-owned' | 'explicit-allow' | 'read-only';
export type WorkspaceWriteFormat = 'json' | 'text';
export const WORKSPACE_TEMPLATE_SURFACE_KEYS = [
  'applicationsTrackerTemplate',
  'portalsConfigTemplate',
  'profileConfigTemplate',
  'profileCvTemplate',
  'profileModeTemplate',
] as const;
export type WorkspaceTemplateSurfaceKey =
  (typeof WORKSPACE_TEMPLATE_SURFACE_KEYS)[number];
export const ONBOARDING_REPAIRABLE_SURFACE_KEYS = [
  'applicationsTracker',
  'portalsConfig',
  'profileConfig',
  'profileCv',
  'profileMode',
] as const;
export type OnboardingRepairableSurfaceKey =
  (typeof ONBOARDING_REPAIRABLE_SURFACE_KEYS)[number];

export type WorkspaceSurfaceKey =
  | 'agentsGuide'
  | 'appStateRoot'
  | 'applicationsTracker'
  | 'applicationsTrackerTemplate'
  | 'articleDigest'
  | 'dataContract'
  | 'docsDirectory'
  | 'followUps'
  | 'jdsDirectory'
  | 'modesDirectory'
  | 'openaiAccountAuth'
  | 'outputDirectory'
  | 'portalsConfigTemplate'
  | 'pipelineInbox'
  | 'portalsConfig'
  | 'profileConfigTemplate'
  | 'profileConfig'
  | 'profileCv'
  | 'profileCvTemplate'
  | 'profileMode'
  | 'profileModeTemplate'
  | 'reportsDirectory'
  | 'scanHistory'
  | 'sharedMode'
  | 'storyBank'
  | 'trackerAdditionsDirectory';

export type WorkspaceSurfaceDefinition = {
  key: WorkspaceSurfaceKey;
  description: string;
  owner: Exclude<WorkspaceOwner, 'unknown'>;
  kind: WorkspaceSurfaceKind;
  contentType: WorkspaceContentType;
  candidates: readonly string[];
  mutationApproval: WorkspaceMutationApproval;
  mutationTarget: WorkspaceMutationTarget | null;
  startupCritical: boolean;
  missingBehavior: WorkspaceMissingBehavior;
  onboardingRepairSourceKey?: WorkspaceTemplateSurfaceKey | null;
  onboardingTemplateFor?: OnboardingRepairableSurfaceKey | null;
  summaryExposure: WorkspaceSummaryExposure;
  writePolicy: WorkspaceWritePolicy;
};

export type OnboardingRepairDefinition = {
  description: string;
  destinationRepoRelativePath: string;
  destinationSurfaceKey: OnboardingRepairableSurfaceKey;
  mutationApproval: WorkspaceMutationApproval;
  mutationTarget: WorkspaceMutationTarget;
  sourceRepoRelativePath: string;
  sourceSurfaceKey: WorkspaceTemplateSurfaceKey;
};

export type WorkspacePathClassification = {
  owner: WorkspaceOwner;
  path: string;
  reason: string;
  repoRelativePath: string | null;
  surfaceKey: WorkspaceSurfaceKey | null;
};

export type WorkspaceResolvedSurface = {
  exists: boolean;
  matchedCandidate: string | null;
  path: string;
  repoRelativePath: string;
  surface: WorkspaceSurfaceDefinition;
};

export type WorkspaceFoundReadResult = {
  directoryEntries?: string[];
  path: string;
  repoRelativePath: string;
  status: 'found';
  surface: WorkspaceSurfaceDefinition;
  value: JsonValue | string | null;
};

export type WorkspaceMissingReadResult = {
  missingBehavior: WorkspaceMissingBehavior;
  path: string;
  repoRelativePath: string;
  status: 'missing';
  surface: WorkspaceSurfaceDefinition;
};

export type WorkspaceReadResult =
  | WorkspaceFoundReadResult
  | WorkspaceMissingReadResult;

export type WorkspaceWriteResult = {
  bytesWritten: number;
  created: boolean;
  overwritten: boolean;
  owner: Exclude<WorkspaceOwner, 'unknown'>;
  path: string;
  repoRelativePath: string;
  surfaceKey: WorkspaceSurfaceKey | null;
};

export type WorkspaceMutationAuthorization = {
  approval: WorkspaceMutationApproval;
  classification: WorkspacePathClassification;
  path: string;
  repoRelativePath: string;
  surface: WorkspaceSurfaceDefinition | null;
  target: WorkspaceMutationTarget;
};

export type WorkspaceMutationDeniedDetail = {
  allowedTarget: WorkspaceMutationTarget | null;
  requestedTarget: WorkspaceMutationTarget;
  requiredApproval: WorkspaceMutationApproval;
  surfaceKey: WorkspaceSurfaceKey | null;
};

export type WorkspaceWriteInput = {
  content: JsonValue | string;
  format?: WorkspaceWriteFormat;
  overwrite?: boolean;
  repoRelativePath?: string;
  surfaceKey?: WorkspaceSurfaceKey;
};

export type WorkspaceMissingSummary = {
  canonicalRepoRelativePath: string;
  candidates: readonly string[];
  description: string;
  missingBehavior: WorkspaceMissingBehavior;
  owner: Exclude<WorkspaceOwner, 'unknown'>;
  surfaceKey: WorkspaceSurfaceKey;
};

export type WorkspaceSummary = {
  appStateRootExists: boolean;
  appStateRootPath: string;
  onboardingMissing: WorkspaceMissingSummary[];
  optionalMissing: WorkspaceMissingSummary[];
  protectedOwners: Array<'system' | 'user'>;
  repoRoot: string;
  runtimeMissing: WorkspaceMissingSummary[];
  writableRoots: string[];
};

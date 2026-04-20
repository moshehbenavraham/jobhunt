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
export type WorkspaceMissingBehavior =
  | 'onboarding-required'
  | 'optional'
  | 'runtime-error';
export type WorkspaceWritePolicy = 'app-owned' | 'explicit-allow' | 'read-only';
export type WorkspaceWriteFormat = 'json' | 'text';

export type WorkspaceSurfaceKey =
  | 'agentsGuide'
  | 'appStateRoot'
  | 'applicationsTracker'
  | 'articleDigest'
  | 'dataContract'
  | 'docsDirectory'
  | 'followUps'
  | 'jdsDirectory'
  | 'modesDirectory'
  | 'openaiAccountAuth'
  | 'outputDirectory'
  | 'pipelineInbox'
  | 'portalsConfig'
  | 'profileConfig'
  | 'profileCv'
  | 'profileMode'
  | 'reportsDirectory'
  | 'scanHistory'
  | 'sharedMode'
  | 'storyBank';

export type WorkspaceSurfaceDefinition = {
  key: WorkspaceSurfaceKey;
  description: string;
  owner: Exclude<WorkspaceOwner, 'unknown'>;
  kind: WorkspaceSurfaceKind;
  contentType: WorkspaceContentType;
  candidates: readonly string[];
  startupCritical: boolean;
  missingBehavior: WorkspaceMissingBehavior;
  writePolicy: WorkspaceWritePolicy;
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

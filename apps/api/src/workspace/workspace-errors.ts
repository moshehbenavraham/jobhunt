import type {
  WorkspaceMissingBehavior,
  WorkspacePathClassification,
  WorkspaceSurfaceDefinition,
  WorkspaceSurfaceKey,
} from './workspace-types.js';

export class WorkspaceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class WorkspaceBoundaryError extends WorkspaceError {
  classification: WorkspacePathClassification;

  constructor(message: string, classification: WorkspacePathClassification) {
    super(message);
    this.classification = classification;
  }
}

export class WorkspaceUnknownPathError extends WorkspaceBoundaryError {
  constructor(classification: WorkspacePathClassification) {
    super(
      `Refusing to access unknown workspace path: ${classification.path}. ${classification.reason}`,
      classification,
    );
  }
}

export class WorkspaceWriteDeniedError extends WorkspaceBoundaryError {
  constructor(classification: WorkspacePathClassification) {
    super(
      `Refusing to write protected ${classification.owner} path: ${classification.path}`,
      classification,
    );
  }
}

export class WorkspaceMissingSurfaceError extends WorkspaceError {
  missingBehavior: WorkspaceMissingBehavior;
  repoRelativePath: string;
  surfaceKey: WorkspaceSurfaceKey;

  constructor(
    surface: WorkspaceSurfaceDefinition,
    repoRelativePath: string,
    missingBehavior: WorkspaceMissingBehavior,
  ) {
    super(
      `Missing workspace surface ${surface.key} at ${repoRelativePath}. Missing behavior: ${missingBehavior}.`,
    );
    this.missingBehavior = missingBehavior;
    this.repoRelativePath = repoRelativePath;
    this.surfaceKey = surface.key;
  }
}

export class WorkspaceReadError extends WorkspaceError {
  path: string;
  surfaceKey: WorkspaceSurfaceKey;

  constructor(
    surface: WorkspaceSurfaceDefinition,
    path: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.path = path;
    this.surfaceKey = surface.key;
  }
}

export class WorkspaceJsonParseError extends WorkspaceReadError {
  constructor(
    surface: WorkspaceSurfaceDefinition,
    path: string,
    options?: ErrorOptions,
  ) {
    super(
      surface,
      path,
      `Failed to parse JSON workspace surface ${surface.key} at ${path}.`,
      options,
    );
  }
}

export class WorkspaceWriteConflictError extends WorkspaceError {
  path: string;

  constructor(path: string) {
    super(`Refusing to overwrite existing workspace file: ${path}`);
    this.path = path;
  }
}

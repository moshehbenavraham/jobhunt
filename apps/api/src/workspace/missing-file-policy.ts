import type {
  WorkspaceMissingSummary,
  WorkspaceReadResult,
  WorkspaceSurfaceDefinition,
} from './workspace-types.js';

export function isRuntimeMissingSurface(
  surface: WorkspaceSurfaceDefinition,
): boolean {
  return surface.missingBehavior === 'runtime-error';
}

export function isOnboardingMissingSurface(
  surface: WorkspaceSurfaceDefinition,
): boolean {
  return surface.missingBehavior === 'onboarding-required';
}

export function isOptionalMissingSurface(
  surface: WorkspaceSurfaceDefinition,
): boolean {
  return surface.missingBehavior === 'optional';
}

export function toMissingSurfaceSummary(
  surface: WorkspaceSurfaceDefinition,
): WorkspaceMissingSummary {
  return {
    canonicalRepoRelativePath: surface.candidates[0] ?? '',
    candidates: surface.candidates,
    description: surface.description,
    missingBehavior: surface.missingBehavior,
    owner: surface.owner,
    surfaceKey: surface.key,
  };
}

export function partitionMissingReadResults(
  results: readonly WorkspaceReadResult[],
): {
  onboardingMissing: WorkspaceMissingSummary[];
  optionalMissing: WorkspaceMissingSummary[];
  runtimeMissing: WorkspaceMissingSummary[];
} {
  const onboardingMissing: WorkspaceMissingSummary[] = [];
  const optionalMissing: WorkspaceMissingSummary[] = [];
  const runtimeMissing: WorkspaceMissingSummary[] = [];

  for (const result of results) {
    if (result.status !== 'missing') {
      continue;
    }

    const summary = toMissingSurfaceSummary(result.surface);

    if (isRuntimeMissingSurface(result.surface)) {
      runtimeMissing.push(summary);
      continue;
    }

    if (isOnboardingMissingSurface(result.surface)) {
      onboardingMissing.push(summary);
      continue;
    }

    optionalMissing.push(summary);
  }

  return {
    onboardingMissing,
    optionalMissing,
    runtimeMissing,
  };
}

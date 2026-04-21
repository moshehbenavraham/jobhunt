import type {
  OnboardingRepairDefinition,
  OnboardingRepairableSurfaceKey,
} from './workspace-types.js';

const ONBOARDING_REPAIR_DEFINITIONS = [
  {
    description: 'Create the starter portal scan configuration.',
    destinationRepoRelativePath: 'config/portals.yml',
    destinationSurfaceKey: 'portalsConfig',
    mutationApproval: 'required',
    mutationTarget: 'profile',
    sourceRepoRelativePath: 'config/portals.example.yml',
    sourceSurfaceKey: 'portalsConfigTemplate',
  },
  {
    description: 'Create the starter profile configuration.',
    destinationRepoRelativePath: 'config/profile.yml',
    destinationSurfaceKey: 'profileConfig',
    mutationApproval: 'required',
    mutationTarget: 'profile',
    sourceRepoRelativePath: 'config/profile.example.yml',
    sourceSurfaceKey: 'profileConfigTemplate',
  },
  {
    description: 'Create the starter applications tracker.',
    destinationRepoRelativePath: 'data/applications.md',
    destinationSurfaceKey: 'applicationsTracker',
    mutationApproval: 'required',
    mutationTarget: 'tracker',
    sourceRepoRelativePath: 'data/applications.example.md',
    sourceSurfaceKey: 'applicationsTrackerTemplate',
  },
  {
    description: 'Create the starter CV markdown file.',
    destinationRepoRelativePath: 'profile/cv.md',
    destinationSurfaceKey: 'profileCv',
    mutationApproval: 'required',
    mutationTarget: 'profile',
    sourceRepoRelativePath: 'profile/cv.example.md',
    sourceSurfaceKey: 'profileCvTemplate',
  },
  {
    description: 'Create the starter profile mode overlay.',
    destinationRepoRelativePath: 'modes/_profile.md',
    destinationSurfaceKey: 'profileMode',
    mutationApproval: 'required',
    mutationTarget: 'profile',
    sourceRepoRelativePath: 'modes/_profile.template.md',
    sourceSurfaceKey: 'profileModeTemplate',
  },
] as const satisfies readonly OnboardingRepairDefinition[];

const onboardingRepairMap = new Map<
  OnboardingRepairableSurfaceKey,
  OnboardingRepairDefinition
>(
  ONBOARDING_REPAIR_DEFINITIONS.map((definition) => [
    definition.destinationSurfaceKey,
    definition,
  ]),
);

export function listOnboardingRepairDefinitions(): readonly OnboardingRepairDefinition[] {
  return ONBOARDING_REPAIR_DEFINITIONS;
}

export function getOnboardingRepairDefinition(
  surfaceKey: OnboardingRepairableSurfaceKey,
): OnboardingRepairDefinition {
  const definition = onboardingRepairMap.get(surfaceKey);

  if (!definition) {
    throw new Error(`Unknown onboarding repair surface: ${surfaceKey}`);
  }

  return definition;
}

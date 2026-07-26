import type { ToolRegistry } from '../tools/index.js';
import type { SpecialistToolCatalogEntry } from './orchestration-contract.js';
import type { SpecialistToolPolicy } from './specialist-catalog.js';

export type SpecialistToolScope = {
  catalog: readonly SpecialistToolCatalogEntry[];
  deniedToolNames: readonly string[];
  fallbackApplied: boolean;
  revokedToolNames: readonly string[];
};

function assertUniqueNames(toolNames: readonly string[], label: string): void {
  const seen = new Set<string>();

  for (const toolName of toolNames) {
    if (!toolName.trim()) {
      throw new Error(`${label} must not contain empty tool names.`);
    }

    if (seen.has(toolName)) {
      throw new Error(`${label} contains duplicate tool name ${toolName}.`);
    }

    seen.add(toolName);
  }
}

function assertDisjointSets(
  left: readonly string[],
  right: readonly string[],
  leftLabel: string,
  rightLabel: string,
): void {
  const rightSet = new Set(right);

  for (const toolName of left) {
    if (rightSet.has(toolName)) {
      throw new Error(
        `${leftLabel} and ${rightLabel} both reference tool ${toolName}.`,
      );
    }
  }
}

function getCatalogEntryByName(
  registry: ToolRegistry,
  toolName: string,
): ReturnType<ToolRegistry['listCatalog']>[number] {
  const entry = registry
    .listCatalog()
    .find((candidate) => candidate.name === toolName);

  if (!entry) {
    throw new Error(
      `Specialist tool scope references unknown tool ${toolName}.`,
    );
  }

  return entry;
}

function toScopedEntries(
  registry: ToolRegistry,
  toolNames: readonly string[],
  access: SpecialistToolCatalogEntry['access'],
): SpecialistToolCatalogEntry[] {
  return toolNames
    .map((toolName) => ({
      ...getCatalogEntryByName(registry, toolName),
      access,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function resolveSpecialistToolScope(
  registry: ToolRegistry,
  policy: SpecialistToolPolicy,
): SpecialistToolScope {
  const allowedToolNames = [...policy.allowedToolNames].sort();
  const deniedToolNames = [...(policy.deniedToolNames ?? [])].sort();
  const restrictedToolNames = [...(policy.restrictedToolNames ?? [])].sort();
  const revokedToolNames = [...(policy.revokedToolNames ?? [])].sort();
  const fallbackToolNames = [...(policy.fallbackToolNames ?? [])].sort();

  assertUniqueNames(allowedToolNames, 'allowedToolNames');
  assertUniqueNames(deniedToolNames, 'deniedToolNames');
  assertUniqueNames(restrictedToolNames, 'restrictedToolNames');
  assertUniqueNames(revokedToolNames, 'revokedToolNames');
  assertUniqueNames(fallbackToolNames, 'fallbackToolNames');

  assertDisjointSets(
    allowedToolNames,
    deniedToolNames,
    'allowedToolNames',
    'deniedToolNames',
  );
  assertDisjointSets(
    allowedToolNames,
    restrictedToolNames,
    'allowedToolNames',
    'restrictedToolNames',
  );
  assertDisjointSets(
    allowedToolNames,
    revokedToolNames,
    'allowedToolNames',
    'revokedToolNames',
  );
  assertDisjointSets(
    restrictedToolNames,
    revokedToolNames,
    'restrictedToolNames',
    'revokedToolNames',
  );
  assertDisjointSets(
    fallbackToolNames,
    revokedToolNames,
    'fallbackToolNames',
    'revokedToolNames',
  );

  const allowedEntries = toScopedEntries(registry, allowedToolNames, 'allowed');
  const restrictedEntries = toScopedEntries(
    registry,
    restrictedToolNames,
    'restricted',
  );
  const fallbackApplied =
    allowedEntries.length === 0 &&
    restrictedEntries.length === 0 &&
    fallbackToolNames.length > 0;
  const fallbackEntries = fallbackApplied
    ? toScopedEntries(registry, fallbackToolNames, 'restricted')
    : [];
  const visibleCatalog = [
    ...allowedEntries,
    ...restrictedEntries,
    ...fallbackEntries,
  ].sort((left, right) => left.name.localeCompare(right.name));
  const visibleToolNames = new Set(visibleCatalog.map((entry) => entry.name));
  const deniedRegistryTools = registry
    .listNames()
    .filter(
      (toolName) =>
        !visibleToolNames.has(toolName) && !revokedToolNames.includes(toolName),
    );
  const combinedDeniedToolNames = [
    ...new Set([...deniedToolNames, ...deniedRegistryTools]),
  ].sort();

  return {
    catalog: visibleCatalog,
    deniedToolNames: combinedDeniedToolNames,
    fallbackApplied,
    revokedToolNames,
  };
}

import type {
  AnyToolDefinition,
  ToolCatalogEntry,
  ToolRegistry,
  ToolRegistryInput,
} from './tool-contract.js';
import { ToolExecutionError } from './tool-errors.js';

function assertToolName(name: string): void {
  if (!name.trim()) {
    throw new ToolExecutionError(
      'tool-invalid-config',
      'Tool definitions must declare a non-empty name.',
    );
  }
}

function toCatalogEntry(definition: AnyToolDefinition): ToolCatalogEntry {
  return {
    description: definition.description,
    jobTypes: [...(definition.policy?.permissions?.jobTypes ?? [])].sort(),
    mutationTargets: [...(definition.policy?.permissions?.mutationTargets ?? [])]
      .sort(),
    name: definition.name,
    requiresApproval: definition.policy?.approval !== undefined,
    scripts: [...(definition.policy?.permissions?.scripts ?? [])].sort(),
  };
}

export function createToolRegistry(
  definitions: ToolRegistryInput,
): ToolRegistry {
  const normalizedDefinitions = new Map<string, AnyToolDefinition>();

  for (const definition of definitions) {
    assertToolName(definition.name);

    if (normalizedDefinitions.has(definition.name)) {
      throw new ToolExecutionError(
        'tool-duplicate-registration',
        `Duplicate tool registration for ${definition.name}.`,
        {
          detail: {
            toolName: definition.name,
          },
        },
      );
    }

    normalizedDefinitions.set(definition.name, definition);
  }

  return {
    definitions: normalizedDefinitions,
    get(name: string): AnyToolDefinition | null {
      return normalizedDefinitions.get(name) ?? null;
    },
    listCatalog(): ToolCatalogEntry[] {
      return [...normalizedDefinitions.values()]
        .map((definition) => toCatalogEntry(definition))
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    listNames(): string[] {
      return [...normalizedDefinitions.keys()].sort();
    },
  };
}

export function getToolDefinitionOrThrow(
  registry: ToolRegistry,
  toolName: string,
): AnyToolDefinition {
  const definition = registry.get(toolName);

  if (!definition) {
    throw new ToolExecutionError(
      'tool-not-found',
      `Unsupported tool ${toolName}. Supported tools: ${registry.listNames().join(', ') || '(none)'}.`,
      {
        detail: {
          supportedTools: registry.listNames(),
          toolName,
        },
      },
    );
  }

  return definition;
}

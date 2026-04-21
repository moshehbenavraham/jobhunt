import type {
  AnyToolDefinition,
  ToolCatalogEntry,
  ToolCatalogListInput,
  ToolRegistry,
  ToolRegistryInput,
} from './tool-contract.js';
import { ToolExecutionError } from './tool-errors.js';

const MAX_TOOL_CATALOG_PAGE_SIZE = 100;

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

function normalizeCatalogListInput(
  registry: ToolRegistry,
  input: ToolCatalogListInput = {},
): Required<ToolCatalogListInput> {
  const offset = input.offset ?? 0;

  if (!Number.isInteger(offset) || offset < 0) {
    throw new ToolExecutionError(
      'tool-invalid-config',
      'Tool catalog offset must be a non-negative integer.',
      {
        detail: {
          offset: input.offset ?? null,
        },
      },
    );
  }

  const requestedToolNames = input.toolNames ?? null;

  if (requestedToolNames !== null) {
    const seen = new Set<string>();

    for (const toolName of requestedToolNames) {
      if (!toolName.trim()) {
        throw new ToolExecutionError(
          'tool-invalid-config',
          'Tool catalog filters must not contain empty tool names.',
        );
      }

      if (seen.has(toolName)) {
        throw new ToolExecutionError(
          'tool-invalid-config',
          `Tool catalog filters contain duplicate tool name ${toolName}.`,
          {
            detail: {
              toolName,
            },
          },
        );
      }

      seen.add(toolName);
    }

    const missingToolNames = requestedToolNames.filter(
      (toolName) => !registry.definitions.has(toolName),
    );

    if (missingToolNames.length > 0) {
      throw new ToolExecutionError(
        'tool-not-found',
        `Tool catalog filters reference unknown tools: ${missingToolNames.join(', ')}.`,
        {
          detail: {
            requestedTools: [...requestedToolNames],
            supportedTools: registry.listNames(),
            unknownTools: missingToolNames,
          },
        },
      );
    }
  }

  const limit =
    input.limit ?? (requestedToolNames?.length ?? registry.definitions.size);

  if (
    !Number.isInteger(limit) ||
    limit < 0 ||
    limit > MAX_TOOL_CATALOG_PAGE_SIZE
  ) {
    throw new ToolExecutionError(
      'tool-invalid-config',
      `Tool catalog limit must be an integer between 0 and ${MAX_TOOL_CATALOG_PAGE_SIZE}.`,
      {
        detail: {
          limit: input.limit ?? null,
          max: MAX_TOOL_CATALOG_PAGE_SIZE,
        },
      },
    );
  }

  return {
    limit,
    offset,
    toolNames: requestedToolNames,
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

  const registry: ToolRegistry = {
    definitions: normalizedDefinitions,
    get(name: string): AnyToolDefinition | null {
      return normalizedDefinitions.get(name) ?? null;
    },
    listCatalog(input: ToolCatalogListInput = {}): ToolCatalogEntry[] {
      const normalizedInput = normalizeCatalogListInput(registry, input);
      const filteredDefinitions =
        normalizedInput.toolNames === null
          ? [...normalizedDefinitions.values()]
          : normalizedInput.toolNames
              .map((toolName) => normalizedDefinitions.get(toolName) ?? null)
              .filter(
                (definition): definition is AnyToolDefinition =>
                  definition !== null,
              );

      return filteredDefinitions
        .map((definition) => toCatalogEntry(definition))
        .sort((left, right) => left.name.localeCompare(right.name))
        .slice(
          normalizedInput.offset,
          normalizedInput.offset + normalizedInput.limit,
        );
    },
    listNames(): string[] {
      return [...normalizedDefinitions.keys()].sort();
    },
  };

  return registry;
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

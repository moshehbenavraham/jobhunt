import type {
  PromptBundle,
  PromptBundleSource,
  PromptCacheMode,
  PromptWorkflowRoute,
} from './prompt-types.js';

function sortPromptSources(
  sources: readonly PromptBundleSource[],
): PromptBundleSource[] {
  return [...sources].sort((left, right) => left.precedence - right.precedence);
}

function renderPromptSource(source: PromptBundleSource): string {
  const lines = [
    `[[SOURCE ${source.key}]]`,
    `Label: ${source.label}`,
    `Role: ${source.role}`,
    `Path: ${source.matchedRepoRelativePath ?? 'missing'}`,
    `Status: ${source.status}`,
    ...source.notes.map((note) => `Note: ${note}`),
    '',
  ];

  if (source.content !== null) {
    lines.push(source.content.trimEnd());
  }

  return lines.join('\n').trimEnd();
}

export function composePromptBundle(options: {
  cacheMode: PromptCacheMode;
  loadedAt?: Date;
  sources: readonly PromptBundleSource[];
  workflow: PromptWorkflowRoute;
}): PromptBundle {
  const orderedSources = sortPromptSources(options.sources);
  const renderableSources = orderedSources.filter(
    (source) => source.status !== 'missing',
  );

  return {
    cacheMode: options.cacheMode,
    composedText: renderableSources.map(renderPromptSource).join('\n\n'),
    loadedAt: (options.loadedAt ?? new Date()).toISOString(),
    sourceOrder: orderedSources.map((source) => source.key),
    sources: orderedSources,
    workflow: options.workflow,
  };
}

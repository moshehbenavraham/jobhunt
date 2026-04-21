import { lstat, readFile } from 'node:fs/promises';
import type {
  PromptBundleSource,
  PromptCacheMode,
  PromptResolvedSource,
} from './prompt-types.js';
import { PromptContractError } from './prompt-types.js';

type NodeError = NodeJS.ErrnoException;

type PromptCacheEntry = {
  freshnessKey: string;
  source: PromptBundleSource;
};

export type PromptCache = {
  loadSource: (source: PromptResolvedSource) => Promise<PromptBundleSource>;
  mode: PromptCacheMode;
  reset: () => void;
  size: () => number;
};

export class PromptSourceReadError extends PromptContractError {
  path: string;
  sourceKey: PromptResolvedSource['key'];

  constructor(
    source: PromptResolvedSource,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.path = source.absolutePath;
    this.sourceKey = source.key;
  }
}

function isNodeError(error: unknown): error is NodeError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function toCacheKey(source: PromptResolvedSource): string {
  return `${source.key}:${source.absolutePath}`;
}

function toMissingSource(source: PromptResolvedSource): PromptBundleSource {
  return {
    ...source,
    content: null,
    freshnessKey: null,
    status: 'missing',
  };
}

function toLoadedSource(
  source: PromptResolvedSource,
  content: string,
  freshnessKey: string,
): PromptBundleSource {
  return {
    ...source,
    content,
    freshnessKey,
    status: content.trim() ? 'found' : 'empty',
  };
}

export function createPromptCache(): PromptCache {
  const entries = new Map<string, PromptCacheEntry>();

  return {
    async loadSource(
      source: PromptResolvedSource,
    ): Promise<PromptBundleSource> {
      const cacheKey = toCacheKey(source);

      try {
        const stats = await lstat(source.absolutePath);

        if (!stats.isFile()) {
          throw new PromptSourceReadError(
            source,
            `Prompt source ${source.key} did not resolve to a file: ${source.absolutePath}`,
          );
        }

        const freshnessKey = `${stats.mtimeMs}:${stats.size}`;
        const cachedEntry = entries.get(cacheKey);

        if (cachedEntry?.freshnessKey === freshnessKey) {
          return cachedEntry.source;
        }

        const content = await readFile(source.absolutePath, 'utf8');
        const loadedSource = toLoadedSource(source, content, freshnessKey);
        entries.set(cacheKey, {
          freshnessKey,
          source: loadedSource,
        });

        return loadedSource;
      } catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT') {
          entries.delete(cacheKey);
          return toMissingSource(source);
        }

        if (error instanceof PromptContractError) {
          throw error;
        }

        throw new PromptSourceReadError(
          source,
          `Failed to read prompt source ${source.key} at ${source.absolutePath}.`,
          { cause: error },
        );
      }
    },
    mode: 'read-through-mtime',
    reset(): void {
      entries.clear();
    },
    size(): number {
      return entries.size;
    },
  };
}

import { existsSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertContainedPath } from '../path-policy.mjs';

const PROVIDER_ID = /^[a-z][a-z0-9-]{1,63}$/;

function validateProvider(provider, filename) {
  if (
    !provider ||
    !PROVIDER_ID.test(provider.id || '') ||
    !['ats', 'source'].includes(provider.kind) ||
    typeof provider.fetch !== 'function' ||
    (provider.detect !== undefined && typeof provider.detect !== 'function')
  ) {
    throw new Error(
      `${filename}: default export must satisfy { id, kind, fetch, detect? }`,
    );
  }
  return Object.freeze(provider);
}

export async function loadProviders(directory, { onError = () => {} } = {}) {
  const providers = new Map();
  if (!existsSync(directory)) return providers;
  const root = realpathSync(directory);
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (
      !entry.name.endsWith('.mjs') ||
      entry.name.startsWith('_') ||
      entry.name.startsWith('test-')
    ) {
      continue;
    }
    try {
      const file = assertContainedPath(root, join(root, entry.name), {
        mustExist: true,
        label: 'Provider module',
      });
      if (!entry.isFile() || lstatSync(file).isSymbolicLink()) {
        throw new Error(`${entry.name}: provider must be a regular file`);
      }
      const provider = validateProvider(
        (await import(pathToFileURL(file).href)).default,
        entry.name,
      );
      if (providers.has(provider.id)) {
        throw new Error(`${entry.name}: duplicate provider id ${provider.id}`);
      }
      providers.set(provider.id, provider);
    } catch (error) {
      onError(error);
    }
  }
  return providers;
}

export function resolveProvider(
  entry,
  providers,
  { kinds = ['ats', 'source'] } = {},
) {
  if (entry.provider) {
    const provider = providers.get(entry.provider);
    if (!provider) return { error: `unknown provider: ${entry.provider}` };
    if (!kinds.includes(provider.kind)) {
      return { error: `provider ${entry.provider} is not allowed here` };
    }
    return { provider, explicit: true };
  }

  for (const provider of providers.values()) {
    if (!kinds.includes(provider.kind) || !provider.detect) continue;
    try {
      const detection = provider.detect(entry);
      if (detection) return { provider, detection, explicit: false };
    } catch {
      // A detector must not prevent another provider from claiming the entry.
    }
  }
  return null;
}

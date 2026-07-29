import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, resolve } from 'node:path';
import {
  assertContainedPath,
  ensureContainedDirectory,
} from './path-policy.mjs';

export function resolveArtifactPath({
  root,
  directory,
  requested,
  extensions = [],
  label = 'Artifact path',
}) {
  const projectRoot = resolve(root);
  const artifactRoot = ensureContainedDirectory(projectRoot, directory);
  const normalized = String(requested || '').replaceAll('\\', '/');
  const candidate = isAbsolute(requested)
    ? resolve(requested)
    : normalized.startsWith(`${directory}/`)
      ? resolve(projectRoot, requested)
      : resolve(artifactRoot, requested);
  const path = assertContainedPath(artifactRoot, candidate, { label });
  if (basename(path).startsWith('.')) {
    throw new Error(`${label} may not be hidden: ${requested}`);
  }
  if (
    extensions.length > 0 &&
    !extensions.includes(extname(path).toLowerCase())
  ) {
    throw new Error(
      `${label} must end in ${extensions.join(' or ')}: ${requested}`,
    );
  }
  ensureContainedDirectory(artifactRoot, dirname(path), { allowRoot: true });
  return { path, artifactRoot };
}

export async function atomicWriteArtifact(
  path,
  content,
  { mode = 0o600 } = {},
) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.partial`;
  await writeFile(temporary, content, { mode });
  try {
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

export async function publishArtifactSet(
  stagedArtifacts,
  { force = false } = {},
) {
  const entries = [...stagedArtifacts.entries()];
  if (!force) {
    const existing = entries
      .map(([, final]) => final)
      .filter((path) => existsSync(path));
    if (existing.length > 0) {
      throw new Error(
        `Refusing to overwrite existing artifacts:\n- ${existing.join('\n- ')}`,
      );
    }
  }

  const published = [];
  const backups = [];
  try {
    for (const [staged, final] of entries) {
      if (force && existsSync(final)) {
        const backup = `${staged}.previous`;
        await rename(final, backup);
        backups.push([backup, final]);
      }
      await rename(staged, final);
      published.push(final);
    }
    for (const [backup] of backups) {
      await rm(backup, { force: true });
    }
  } catch (error) {
    for (const final of published.reverse()) {
      await rm(final, { force: true }).catch(() => {});
    }
    for (const [backup, final] of backups.reverse()) {
      await rename(backup, final).catch(() => {});
    }
    throw error;
  }
}

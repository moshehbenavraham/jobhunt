import { existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';

export class PathPolicyError extends Error {
  constructor(message, code = 'ERR_PATH_POLICY') {
    super(message);
    this.name = 'PathPolicyError';
    this.code = code;
  }
}

export function pathIsInside(parent, child, { allowRoot = false } = {}) {
  const rel = relative(resolve(parent), resolve(child));
  return (
    (allowRoot && rel === '') ||
    (rel !== '' &&
      rel !== '..' &&
      !rel.startsWith('../') &&
      !rel.startsWith('..\\') &&
      !isAbsolute(rel))
  );
}

function nearestExistingAncestor(path) {
  let cursor = resolve(path);
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
  return cursor;
}

export function assertContainedPath(
  root,
  requested,
  {
    allowRoot = false,
    mustExist = false,
    rejectSymlinks = true,
    label = 'Path',
  } = {},
) {
  const absoluteRoot = resolve(root);
  if (!existsSync(absoluteRoot)) {
    throw new PathPolicyError(
      `Containment root does not exist: ${absoluteRoot}`,
      'ERR_ROOT_MISSING',
    );
  }
  const realRoot = realpathSync(absoluteRoot);
  const absolute = isAbsolute(requested)
    ? resolve(requested)
    : resolve(realRoot, requested);
  if (!pathIsInside(realRoot, absolute, { allowRoot })) {
    throw new PathPolicyError(
      `${label} escapes ${realRoot}: ${requested}`,
      'ERR_PATH_ESCAPE',
    );
  }
  if (mustExist && !existsSync(absolute)) {
    throw new PathPolicyError(
      `${label} does not exist: ${absolute}`,
      'ERR_PATH_MISSING',
    );
  }

  const ancestor = nearestExistingAncestor(absolute);
  if (!ancestor) {
    throw new PathPolicyError(
      `No existing ancestor for ${absolute}`,
      'ERR_PATH_MISSING',
    );
  }
  const realAncestor = realpathSync(ancestor);
  if (!pathIsInside(realRoot, realAncestor, { allowRoot: true })) {
    throw new PathPolicyError(
      `${label} resolves outside ${realRoot}: ${requested}`,
      'ERR_SYMLINK_ESCAPE',
    );
  }

  if (rejectSymlinks) {
    let cursor = absolute;
    const components = [];
    while (pathIsInside(realRoot, cursor, { allowRoot: true })) {
      components.push(cursor);
      if (cursor === realRoot) break;
      cursor = dirname(cursor);
    }
    for (const candidate of components.reverse()) {
      if (existsSync(candidate) && lstatSync(candidate).isSymbolicLink()) {
        throw new PathPolicyError(
          `${label} traverses a symlink: ${candidate}`,
          'ERR_SYMLINK_PATH',
        );
      }
    }
  }

  return absolute;
}

export function ensureContainedDirectory(root, requested, options = {}) {
  const path = assertContainedPath(root, requested, {
    ...options,
    mustExist: false,
  });
  mkdirSync(path, { recursive: true });
  return assertContainedPath(root, path, {
    ...options,
    allowRoot: options.allowRoot ?? false,
    mustExist: true,
  });
}

export function safeFilename(
  value,
  { fallback = 'artifact', maxLength = 120 } = {},
) {
  const leaf = String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .at(-1);
  const printable = Array.from(leaf.normalize('NFKC'))
    .filter((character) => {
      const code = character.codePointAt(0);
      return code > 31 && code !== 127;
    })
    .join('');
  const normalized = printable
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/^\.+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  const bounded = normalized.slice(0, maxLength).trim();
  const result = bounded && !['.', '..'].includes(bounded) ? bounded : fallback;
  return basename(result);
}

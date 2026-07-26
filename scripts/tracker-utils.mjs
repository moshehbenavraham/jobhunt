import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

export function rebuildRow(parts) {
  const cells = [...parts];
  if (cells[0] === '') cells.shift();
  if (cells.at(-1) === '') cells.pop();
  return `| ${cells.join(' | ')} |`;
}

export function cell(value) {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\r\n\u2028\u2029]+/g, ' ');
  return [...normalized]
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint >= 0x20 && codePoint !== 0x7f;
    })
    .join('')
    .replace(/\s*\|\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCompany(value) {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

const ROLE_STOPWORDS = new Set([
  'associate',
  'based',
  'contract',
  'contractor',
  'freelance',
  'fulltime',
  'hybrid',
  'intern',
  'internship',
  'junior',
  'lead',
  'level',
  'mid',
  'middle',
  'onsite',
  'opportunity',
  'parttime',
  'permanent',
  'position',
  'principal',
  'remote',
  'role',
  'senior',
  'staff',
  'temporary',
]);

function roleTokens(value) {
  return (
    String(value)
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}+#.]+/gu)
      ?.filter((token) => token.length > 2 && !ROLE_STOPWORDS.has(token)) ?? []
  );
}

export function roleFuzzyMatch(first, second) {
  const firstTokens = roleTokens(first);
  const secondTokens = roleTokens(second);
  if (firstTokens.length === 0 || secondTokens.length === 0) return false;
  const firstKey = firstTokens.join(' ');
  const secondKey = secondTokens.join(' ');
  if (firstKey === secondKey) return true;
  const secondSet = new Set(secondTokens);
  const overlap = new Set(firstTokens.filter((token) => secondSet.has(token)))
    .size;
  const smaller = Math.min(
    new Set(firstTokens).size,
    new Set(secondTokens).size,
  );
  return overlap >= 2 && overlap / smaller >= 0.6;
}

export function canonicalizeTrackerPath(path) {
  const absolute = resolve(path);
  try {
    return realpathSync(absolute);
  } catch {
    const parent = dirname(absolute);
    if (existsSync(parent)) {
      return join(realpathSync(parent), basename(absolute));
    }
    return absolute;
  }
}

export function resolveTrackerPath(root) {
  const override =
    process.env.JOBHUNT_TRACKER || process.env.CAREER_OPS_TRACKER;
  const raw = override
    ? override
    : existsSync(join(root, 'data/applications.md'))
      ? join(root, 'data/applications.md')
      : join(root, 'applications.md');
  return canonicalizeTrackerPath(raw);
}

function pathIsInside(child, parent) {
  const rel = relative(resolve(parent), resolve(child));
  return (
    rel === '' ||
    (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
  );
}

export function trackerLockDirFor(trackerPath) {
  const canonical = canonicalizeTrackerPath(trackerPath);
  const key = createHash('sha256').update(canonical).digest('hex').slice(0, 20);
  const tempRoot = realpathSync(tmpdir());
  const fallback = join(tempRoot, `jobhunt-tracker-${key}.lock`);
  const override =
    process.env.JOBHUNT_TRACKER_LOCK || process.env.CAREER_OPS_TRACKER_LOCK;
  if (!override || !isAbsolute(override)) return fallback;
  const candidate = resolve(override);
  const parent = dirname(candidate);
  const realParent = existsSync(parent)
    ? realpathSync(parent)
    : resolve(parent);
  if (!pathIsInside(realParent, tempRoot)) return fallback;
  if (
    !['jobhunt-tracker-', 'career-ops-merge-tracker-'].some((prefix) =>
      basename(candidate).startsWith(prefix),
    )
  ) {
    return fallback;
  }
  return candidate;
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function readLockOwner(lockDirectory) {
  try {
    const owner = JSON.parse(
      readFileSync(join(lockDirectory, 'owner.json'), 'utf8'),
    );
    return owner && typeof owner === 'object' ? owner : null;
  } catch {
    return null;
  }
}

function lockIsRecoverable(lockDirectory, staleMs) {
  const owner = readLockOwner(lockDirectory);
  if (owner?.pid) return !processIsAlive(owner.pid);
  try {
    return Date.now() - statSync(lockDirectory).mtimeMs > staleMs;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function quarantineAndRemoveLock(lockDirectory, expectedToken = null) {
  const owner = readLockOwner(lockDirectory);
  if (expectedToken !== null && owner?.token !== expectedToken) return false;
  const quarantine = `${lockDirectory}.remove-${process.pid}-${randomUUID()}`;
  try {
    renameSync(lockDirectory, quarantine);
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
  const movedOwner = readLockOwner(quarantine);
  if (expectedToken !== null && movedOwner?.token !== expectedToken) {
    if (!existsSync(lockDirectory)) {
      renameSync(quarantine, lockDirectory);
    }
    return false;
  }
  rmSync(quarantine, { recursive: true, force: true });
  return true;
}

export async function acquireTrackerLock(lockDirectory, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const retryMs = options.retryMs ?? 75;
  const staleMs = options.staleMs ?? 10 * 60_000;
  const tracker = options.tracker
    ? canonicalizeTrackerPath(options.tracker)
    : null;
  const token = randomUUID();
  const startedAt = Date.now();
  let attempts = 0;
  let staleRecovered = false;
  const recoverGuard = `${lockDirectory}.recover`;

  while (Date.now() - startedAt <= timeoutMs) {
    attempts++;
    try {
      mkdirSync(lockDirectory);
      try {
        writeFileSync(
          join(lockDirectory, 'owner.json'),
          `${JSON.stringify({
            pid: process.pid,
            token,
            acquiredAt: new Date().toISOString(),
            tracker,
          })}\n`,
          { flag: 'wx', mode: 0o600 },
        );
      } catch (error) {
        rmSync(lockDirectory, { recursive: true, force: true });
        throw error;
      }

      let released = false;
      let releaseError = null;
      return {
        path: lockDirectory,
        token,
        waitMs: Date.now() - startedAt,
        attempts,
        staleRecovered,
        release() {
          if (released) {
            if (releaseError) throw releaseError;
            return;
          }
          try {
            quarantineAndRemoveLock(lockDirectory, token);
            released = true;
          } catch (error) {
            releaseError = error;
            throw error;
          }
        },
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      let guardOwned = false;
      try {
        mkdirSync(recoverGuard);
        guardOwned = true;
      } catch (guardError) {
        if (guardError?.code !== 'EEXIST') throw guardError;
        if (lockIsRecoverable(recoverGuard, staleMs)) {
          quarantineAndRemoveLock(recoverGuard);
        }
      }
      if (guardOwned) {
        try {
          if (lockIsRecoverable(lockDirectory, staleMs)) {
            quarantineAndRemoveLock(lockDirectory);
            staleRecovered = true;
            continue;
          }
        } finally {
          quarantineAndRemoveLock(recoverGuard);
        }
      }
      await sleep(retryMs);
    }
  }
  const error = new Error(
    `Timed out waiting for tracker lock at ${lockDirectory}`,
  );
  error.code = 'LOCK_TIMEOUT';
  throw error;
}

export async function openTrackerTransaction(trackerPath, options = {}) {
  const canonical = canonicalizeTrackerPath(trackerPath);
  const envNumber = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const lock = await acquireTrackerLock(
    options.lockDirectory || trackerLockDirFor(canonical),
    {
      timeoutMs:
        options.timeoutMs ??
        envNumber('JOBHUNT_TRACKER_LOCK_TIMEOUT_MS', 60_000),
      retryMs:
        options.retryMs ?? envNumber('JOBHUNT_TRACKER_LOCK_RETRY_MS', 75),
      staleMs:
        options.staleMs ??
        envNumber('JOBHUNT_TRACKER_LOCK_STALE_MS', 10 * 60_000),
      tracker: canonical,
    },
  );
  let closed = false;
  let closeError = null;
  return {
    path: canonical,
    lock,
    read() {
      if (closed) throw new Error('Tracker transaction is closed');
      return readFileSync(canonical, 'utf8');
    },
    replace(content) {
      if (closed) throw new Error('Tracker transaction is closed');
      writeFileAtomic(canonical, content);
    },
    close() {
      if (closed) return closeError;
      try {
        lock.release();
      } catch (error) {
        closeError = error;
      } finally {
        closed = true;
      }
      return closeError;
    },
  };
}

export function writeFileAtomic(path, content) {
  const directory = dirname(path);
  const temporary = join(
    directory,
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let fileHandle = null;
  try {
    const mode = existsSync(path) ? statSync(path).mode : 0o644;
    fileHandle = openSync(temporary, 'wx', mode);
    writeFileSync(fileHandle, content);
    fsyncSync(fileHandle);
    closeSync(fileHandle);
    fileHandle = null;
    renameSync(temporary, path);
    try {
      const directoryHandle = openSync(directory, 'r');
      try {
        fsyncSync(directoryHandle);
      } finally {
        closeSync(directoryHandle);
      }
    } catch {
      // Some platforms do not permit fsync on a directory. The file rename is
      // still atomic; durability falls back to the platform default.
    }
  } catch (error) {
    if (fileHandle !== null) closeSync(fileHandle);
    rmSync(temporary, { force: true });
    throw error;
  }
}

export function loadCanonicalStates(statesPath) {
  const states = [];
  let current = null;
  const publish = () => {
    if (current) states.push(current);
  };
  for (const rawLine of readFileSync(statesPath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    const idMatch = line.match(/^-\s+id:\s*(.+)$/);
    if (idMatch) {
      publish();
      current = { id: idMatch[1].trim(), label: '', aliases: [] };
      continue;
    }
    if (!current) continue;
    const labelMatch = line.match(/^label:\s*(.+)$/);
    if (labelMatch) {
      current.label = labelMatch[1].trim().replace(/^(['"])(.*)\1$/, '$2');
      continue;
    }
    const aliasesMatch = line.match(/^aliases:\s*\[(.*)\]\s*$/);
    if (aliasesMatch) {
      current.aliases = aliasesMatch[1]
        .split(',')
        .map((alias) => alias.trim().replace(/^(['"])(.*)\1$/, '$2'))
        .filter(Boolean);
    }
  }
  publish();
  if (
    states.length === 0 ||
    states.some((state) => !state.id || !state.label)
  ) {
    throw new Error(
      `Malformed states file at ${statesPath}: expected a top-level states list`,
    );
  }
  return states;
}

export function resolveCanonicalState(input, states) {
  const clean = String(input ?? '')
    .replace(/\*\*/g, '')
    .trim()
    .toLowerCase();
  if (!clean) return null;
  for (const state of states) {
    if (
      [state.id, state.label, ...state.aliases].some(
        (value) => String(value).toLowerCase() === clean,
      )
    ) {
      return state.label;
    }
  }
  return null;
}

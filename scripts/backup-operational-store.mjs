#!/usr/bin/env node

/**
 * backup-operational-store.mjs - Create a timestamped backup of the SQLite
 * operational store and optionally verify the restored copy.
 */

import { mkdir, copyFile, readdir, rm, stat, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const PROJECT_ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');
const DEFAULT_SOURCE = join(PROJECT_ROOT, '.jobhunt-app', 'app.db');
const DEFAULT_DESTINATION = join(PROJECT_ROOT, '.jobhunt-app', 'backups');
const DEFAULT_RETENTION_DAYS = 7;
let databaseSyncLoader;

function parseIntegerFlag(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;

  const raw = args[index + 1];
  if (!raw || raw.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid integer for ${flag}: ${raw}`);
  }

  return value;
}

function parseStringFlag(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;

  const raw = args[index + 1];
  if (!raw || raw.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }

  return raw;
}

function parseArgs(args = process.argv.slice(2)) {
  if (args.includes('--help') || args.includes('-h')) {
    return { help: true };
  }

  return {
    destination: resolve(
      PROJECT_ROOT,
      parseStringFlag(args, '--destination', DEFAULT_DESTINATION),
    ),
    retentionDays: parseIntegerFlag(
      args,
      '--retention-days',
      DEFAULT_RETENTION_DAYS,
    ),
    source: resolve(PROJECT_ROOT, parseStringFlag(args, '--source', DEFAULT_SOURCE)),
    verify: args.includes('--verify'),
  };
}

function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatExpiryCutoff(retentionDays) {
  return Date.now() - retentionDays * 24 * 60 * 60 * 1000;
}

async function removeExpiredBackups(destination, retentionDays, keepPath) {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return 0;
  }

  const cutoff = formatExpiryCutoff(retentionDays);
  const entries = await readdir(destination, { withFileTypes: true });
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const candidatePath = join(destination, entry.name);
    if (keepPath && candidatePath === keepPath) {
      continue;
    }

    const stats = await stat(candidatePath);
    if (stats.mtimeMs >= cutoff) {
      continue;
    }

    await rm(candidatePath, { force: true });
    removed += 1;
  }

  return removed;
}

async function verifyRestoredBackup(backupPath) {
  const DatabaseSync = await getDatabaseSync();
  const verifyRoot = await mkdtemp(join(tmpdir(), 'jobhunt-backup-'));
  const restoredPath = join(verifyRoot, basename(backupPath));

  try {
    await copyFile(backupPath, restoredPath);

    const database = new DatabaseSync(restoredPath, { readOnly: true });
    try {
      const integrityRow = database
        .prepare('PRAGMA integrity_check;')
        .get();
      if (!integrityRow || integrityRow.integrity_check !== 'ok') {
        throw new Error(
          `Restored backup failed integrity check: ${backupPath}`,
        );
      }

      const tableRow = database
        .prepare(
          "SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table';",
        )
        .get();
      const tableCount = Number(tableRow?.table_count ?? 0);

      return { tableCount };
    } finally {
      database.close();
    }
  } finally {
    await rm(verifyRoot, { recursive: true, force: true });
  }
}

async function getDatabaseSync() {
  if (!databaseSyncLoader) {
    databaseSyncLoader = import('node:sqlite').then(
      (module) => module.DatabaseSync,
    );
  }

  return databaseSyncLoader;
}

async function createBackup({
  destination,
  retentionDays,
  source,
  verify,
}) {
  if (!existsSync(source)) {
    return {
      created: false,
      message: `Skipped backup because the source database does not exist: ${source}`,
      removed: 0,
    };
  }

  await mkdir(destination, { recursive: true });

  const backupName = `app-${formatTimestamp()}.sqlite3`;
  const backupPath = join(destination, backupName);
  await copyFile(source, backupPath);

  const removed = await removeExpiredBackups(
    destination,
    retentionDays,
    backupPath,
  );

  let verification = null;
  if (verify) {
    verification = await verifyRestoredBackup(backupPath);
  }

  return {
    backupPath,
    created: true,
    message: `Created backup at ${backupPath}`,
    removed,
    verification,
  };
}

async function main(args = process.argv.slice(2)) {
  const parsed = parseArgs(args);

  if (parsed.help) {
    console.log(
      [
        'Usage: node scripts/backup-operational-store.mjs [options]',
        '',
        'Options:',
        '  --source <path>         Source SQLite database file',
        '  --destination <path>    Backup destination directory',
        '  --retention-days <n>    Delete backups older than n days',
        '  --verify               Restore the backup copy and run integrity checks',
        '  --help, -h             Show this help text',
      ].join('\n'),
    );
    return 0;
  }

  const result = await createBackup(parsed);

  if (!result.created) {
    console.log(result.message);
    return 0;
  }

  console.log(result.message);
  if (result.removed > 0) {
    console.log(`Removed ${result.removed} expired backup(s).`);
  }

  if (result.verification) {
    console.log(
      `Verified restored backup copy: integrity ok, tables=${result.verification.tableCount}`,
    );
  }

  return 0;
}

try {
  const exitCode = await main();
  process.exit(exitCode);
} catch (error) {
  console.error(`backup-operational-store.mjs failed: ${error.message}`);
  process.exit(1);
}

#!/usr/bin/env node

/**
 * install-scan-cron.mjs - Install the repo-owned daily scan cron entry.
 *
 * This keeps the schedule definition in git while still installing the active
 * cron entry into the current user's crontab.
 *
 * Usage:
 *   node scripts/install-scan-cron.mjs
 *   node scripts/install-scan-cron.mjs --hour 6 --minute 0
 *   node scripts/install-scan-cron.mjs --remove
 */

import { chmodSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const PROJECT_ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');
const RUNNER_PATH = resolve(PROJECT_ROOT, 'scripts', 'run-scheduled-scan.sh');

const BEGIN_MARKER = '# BEGIN jobhunt daily scan';
const END_MARKER = '# END jobhunt daily scan';

function parseIntegerFlag(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  const raw = args[index + 1];
  if (!raw || raw.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid integer for ${flag}: ${raw}`);
  }
  return value;
}

function validateTime(hour, minute) {
  if (hour < 0 || hour > 23) {
    throw new Error(`Hour must be between 0 and 23. Received: ${hour}`);
  }
  if (minute < 0 || minute > 59) {
    throw new Error(`Minute must be between 0 and 59. Received: ${minute}`);
  }
}

function readCurrentCrontab() {
  try {
    return execFileSync('crontab', ['-l'], { encoding: 'utf8' });
  } catch (error) {
    if (error.status === 1) {
      return '';
    }
    throw error;
  }
}

function stripManagedBlock(text) {
  const lines = text.split('\n');
  const kept = [];
  let skipping = false;

  for (const line of lines) {
    if (line === BEGIN_MARKER) {
      skipping = true;
      continue;
    }
    if (line === END_MARKER) {
      skipping = false;
      continue;
    }
    if (!skipping) {
      kept.push(line);
    }
  }

  while (kept.length > 0 && kept.at(-1) === '') {
    kept.pop();
  }

  return kept.join('\n');
}

function buildManagedBlock({ hour, minute }) {
  return [
    BEGIN_MARKER,
    '# Managed by scripts/install-scan-cron.mjs',
    '# Intended host timezone: Asia/Jerusalem (Israel local time).',
    `${minute} ${hour} * * * /usr/bin/flock -n /tmp/jobhunt-scan.lock ${RUNNER_PATH}`,
    END_MARKER,
  ].join('\n');
}

function installCrontab(content) {
  const tmpPath = resolve(
    PROJECT_ROOT,
    'tmp',
    `install-scan-cron-${process.pid}.tmp`,
  );
  writeFileSync(tmpPath, content.endsWith('\n') ? content : `${content}\n`);
  execFileSync('crontab', [tmpPath], { stdio: 'inherit' });
  unlinkSync(tmpPath);
}

function main(args = process.argv.slice(2)) {
  const remove = args.includes('--remove');
  const hour = parseIntegerFlag(args, '--hour', 6);
  const minute = parseIntegerFlag(args, '--minute', 0);

  if (!remove) {
    validateTime(hour, minute);
  }

  chmodSync(RUNNER_PATH, 0o755);

  const current = readCurrentCrontab();
  const base = stripManagedBlock(current);

  if (remove) {
    installCrontab(base);
    console.log('Removed repo-managed jobhunt scan cron entry.');
    return;
  }

  const next = [base, buildManagedBlock({ hour, minute })]
    .filter(Boolean)
    .join('\n\n');

  installCrontab(next);
  console.log('Installed repo-managed jobhunt scan cron entry:');
  console.log(buildManagedBlock({ hour, minute }));
}

try {
  main();
} catch (error) {
  console.error(`install-scan-cron.mjs failed: ${error.message}`);
  process.exit(1);
}

#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTrackerReportNumbers, parseTracker } from './tracker-parse.mjs';
import {
  acquireTrackerLock,
  canonicalizeTrackerPath,
  resolveTrackerPath,
  trackerLockDirFor,
} from './tracker-utils.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(dirname(SCRIPT_PATH), '..');
const MAX_COUNT = 100;
const MAX_RETRIES = 100;
const DEFAULT_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const RESERVATION_TOKEN = Symbol('jobhunt-report-reservation-token');

export function formatReportId(number) {
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new TypeError(
      `Report number must be a positive safe integer, got ${number}`,
    );
  }
  return String(number).padStart(3, '0');
}

function pathIsInside(child, parent) {
  const rel = relative(resolve(parent), resolve(child));
  return (
    rel === '' ||
    (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
  );
}

function pathsFor(options = {}) {
  const root = canonicalizeTrackerPath(options.root || DEFAULT_ROOT);
  const requestedReports = resolve(
    options.reportsDirectory || join(root, 'reports'),
  );
  mkdirSync(requestedReports, { recursive: true });
  const reportsDirectory = realpathSync(requestedReports);
  if (!pathIsInside(reportsDirectory, root)) {
    throw new Error(
      `Reports directory escapes the Job-Hunt root: ${reportsDirectory}`,
    );
  }
  const reservationsDirectory = join(reportsDirectory, '.reservations');
  mkdirSync(reservationsDirectory, { recursive: true });
  if (!pathIsInside(realpathSync(reservationsDirectory), reportsDirectory)) {
    throw new Error('Reservation directory escapes reports/');
  }
  const trackerPath = options.trackerPath
    ? canonicalizeTrackerPath(options.trackerPath)
    : resolveTrackerPath(root);
  return {
    root,
    reportsDirectory,
    reservationsDirectory,
    trackerPath,
  };
}

function reservationPath(reservationsDirectory, number) {
  return join(reservationsDirectory, `${formatReportId(number)}.json`);
}

function occupiedFromReports(reportsDirectory) {
  const occupied = new Set();
  for (const name of readdirSync(reportsDirectory)) {
    const match = name.match(/^0*(\d+)(?:-|\.md$)/);
    if (!match) continue;
    const number = Number.parseInt(match[1], 10);
    if (Number.isSafeInteger(number) && number > 0) occupied.add(number);
  }
  return occupied;
}

function occupiedFromReservations(reservationsDirectory) {
  const occupied = new Set();
  for (const name of readdirSync(reservationsDirectory)) {
    const match = name.match(/^0*(\d+)\.json$/);
    if (!match) continue;
    const number = Number.parseInt(match[1], 10);
    if (Number.isSafeInteger(number) && number > 0) occupied.add(number);
  }
  return occupied;
}

function occupiedFromTracker(trackerPath) {
  const occupied = new Set();
  if (!existsSync(trackerPath)) return occupied;
  for (const row of parseTracker(readFileSync(trackerPath, 'utf8')).rows) {
    occupied.add(row.num);
    for (const number of extractTrackerReportNumbers(row.report)) {
      occupied.add(number);
    }
  }
  return occupied;
}

function occupiedFromBatch(root) {
  const occupied = new Set();
  const statePath = join(root, 'batch', 'batch-state.tsv');
  if (existsSync(statePath)) {
    for (const line of readFileSync(statePath, 'utf8').split(/\r?\n/)) {
      const fields = line.split('\t');
      if (fields[0] === 'id' || fields.length < 6) continue;
      const number = Number.parseInt(fields[5], 10);
      if (Number.isSafeInteger(number) && number > 0) occupied.add(number);
    }
  }
  const additionsDirectory = join(root, 'batch', 'tracker-additions');
  if (existsSync(additionsDirectory)) {
    for (const name of readdirSync(additionsDirectory)) {
      if (!name.endsWith('.tsv')) continue;
      const content = readFileSync(join(additionsDirectory, name), 'utf8');
      const first = content.trim().replace(/^\|/, '').split(/[\t|]/)[0];
      const number = Number.parseInt(first, 10);
      if (Number.isSafeInteger(number) && number > 0) occupied.add(number);
      for (const reportNumber of extractTrackerReportNumbers(content)) {
        occupied.add(reportNumber);
      }
    }
  }
  return occupied;
}

function collectOccupied(paths, includeReservations = true) {
  const occupied = occupiedFromReports(paths.reportsDirectory);
  for (const number of occupiedFromTracker(paths.trackerPath)) {
    occupied.add(number);
  }
  for (const number of occupiedFromBatch(paths.root)) occupied.add(number);
  if (includeReservations) {
    for (const number of occupiedFromReservations(
      paths.reservationsDirectory,
    )) {
      occupied.add(number);
    }
  }
  return occupied;
}

function highestNumber(numbers) {
  let highest = 0;
  for (const number of numbers) highest = Math.max(highest, number);
  return highest;
}

function claimReservation(paths, number, token) {
  try {
    writeFileSync(
      reservationPath(paths.reservationsDirectory, number),
      `${JSON.stringify({
        schemaVersion: 1,
        reportNumber: number,
        pid: process.pid,
        token,
        createdAt: new Date().toISOString(),
        tracker: paths.trackerPath,
      })}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    return true;
  } catch (error) {
    if (error?.code === 'EEXIST') return false;
    throw error;
  }
}

function readReservation(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function removeReservation(paths, number, token, force = false) {
  const path = reservationPath(paths.reservationsDirectory, number);
  const owner = readReservation(path);
  if (!force && owner?.token !== token) return false;
  try {
    unlinkSync(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

async function withAllocationLock(paths, options, action) {
  const lock = await acquireTrackerLock(trackerLockDirFor(paths.trackerPath), {
    tracker: paths.trackerPath,
    ...(options.lock || {}),
  });
  try {
    return await action();
  } finally {
    lock.release();
  }
}

export async function reserveReportIds(count = 1, options = {}) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    throw new RangeError(
      `Reservation count must be an integer from 1 to ${MAX_COUNT}`,
    );
  }
  const paths = pathsFor(options);
  return withAllocationLock(paths, options, async () => {
    let occupied = collectOccupied(paths);
    let base = highestNumber(occupied) + 1;
    const token = randomUUID();
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const end = base + count - 1;
      if (!Number.isSafeInteger(end)) {
        throw new RangeError('No safe report-number range remains');
      }
      const claimed = [];
      let failedAt = null;
      for (let number = base; number <= end; number++) {
        if (!occupied.has(number) && claimReservation(paths, number, token)) {
          claimed.push(number);
        } else {
          failedAt = number;
          break;
        }
      }
      if (failedAt === null) {
        Object.defineProperty(claimed, RESERVATION_TOKEN, { value: token });
        return claimed;
      }
      for (const number of claimed) {
        removeReservation(paths, number, token);
      }
      occupied = collectOccupied(paths);
      base = Math.max(failedAt + 1, highestNumber(occupied) + 1);
    }
    throw new Error(
      `Could not claim ${count} report ID(s) after ${MAX_RETRIES} attempts`,
    );
  });
}

export async function releaseReportIds(numbers, options = {}) {
  const values = Array.isArray(numbers) ? numbers : [numbers];
  for (const number of values) formatReportId(number);
  const token =
    options.reservationToken ||
    (Array.isArray(numbers) ? numbers[RESERVATION_TOKEN] : null);
  if (!options.force && !token) {
    throw new Error('Reservation ownership token is required for release');
  }
  const paths = pathsFor(options);
  return withAllocationLock(paths, options, async () =>
    values.reduce(
      (removed, number) =>
        removed +
        Number(removeReservation(paths, number, token, options.force === true)),
      0,
    ),
  );
}

export async function gcReportReservations(options = {}) {
  const paths = pathsFor(options);
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const now = Date.now();
  return withAllocationLock(paths, options, async () => {
    const durable = collectOccupied(paths, false);
    let removed = 0;
    for (const name of readdirSync(paths.reservationsDirectory).sort()) {
      const match = name.match(/^0*(\d+)\.json$/);
      if (!match) continue;
      const number = Number.parseInt(match[1], 10);
      const path = join(paths.reservationsDirectory, name);
      const owner = readReservation(path);
      const age = now - statSync(path).mtimeMs;
      if (
        durable.has(number) ||
        (age > maxAgeMs && !processIsAlive(owner?.pid))
      ) {
        unlinkSync(path);
        removed++;
      }
    }
    return removed;
  });
}

function parsePositiveInteger(value, label) {
  if (!/^\d+$/.test(value || '')) {
    throw new Error(`${label} must be a positive integer`);
  }
  const number = Number(value);
  formatReportId(number);
  return number;
}

async function main(args = process.argv.slice(2)) {
  let count = 1;
  let json = false;
  if (args.includes('--json')) {
    json = true;
    args = args.filter((arg) => arg !== '--json');
  }
  if (args[0] === '--gc') {
    const removed = await gcReportReservations();
    console.log(json ? JSON.stringify({ removed }) : `Removed ${removed}`);
    return;
  }
  if (args[0] === '--release') {
    const match = (args[1] || '').match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error('--release requires NNN or NNN-MMM');
    const start = parsePositiveInteger(match[1], 'release start');
    const end = match[2]
      ? parsePositiveInteger(match[2], 'release end')
      : start;
    if (end < start || end - start + 1 > MAX_COUNT) {
      throw new Error(`Release range must contain 1-${MAX_COUNT} IDs`);
    }
    const values = Array.from(
      { length: end - start + 1 },
      (_, index) => start + index,
    );
    const removed = await releaseReportIds(values, { force: true });
    console.log(json ? JSON.stringify({ removed }) : `Released ${removed}`);
    return;
  }
  if (args[0] === '--count') {
    count = parsePositiveInteger(args[1], 'count');
  } else if (args.length > 0) {
    throw new Error(
      'Usage: reserve-report-ids.mjs [--count N|--release N[-M]|--gc] [--json]',
    );
  }
  const numbers = await reserveReportIds(count);
  const formatted = numbers.map(formatReportId);
  console.log(
    json
      ? JSON.stringify({ numbers, formatted })
      : formatted.length === 1
        ? formatted[0]
        : `${formatted[0]}-${formatted.at(-1)}`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(`Report ID reservation failed: ${error.message}`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedFollowup } from './followup-seed.mjs';
import { extractTrackerReportNumbers, parseTracker } from './tracker-parse.mjs';
import {
  cell,
  loadCanonicalStates,
  normalizeCompany,
  openTrackerTransaction,
  rebuildRow,
  resolveCanonicalState,
  resolveTrackerPath,
  roleFuzzyMatch,
  writeFileAtomic,
} from './tracker-utils.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');
const STATUS_LOG_HEADER =
  'event_id\ttimestamp\tapp_num\treport_num\tcompany\trole\tfrom_status\tto_status\tsource\tnote\n';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function tsvCell(value) {
  return cell(value).replace(/\t/g, ' ');
}

function appendUniqueNote(existing, addition) {
  const cleanExisting = cell(existing);
  const cleanAddition = cell(addition);
  if (!cleanAddition) return cleanExisting;
  const notes = cleanExisting
    .split(/\s*;\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (
    notes.some(
      (item) =>
        item.normalize('NFKC').toLowerCase() ===
        cleanAddition.normalize('NFKC').toLowerCase(),
    )
  ) {
    return cleanExisting;
  }
  return [...notes, cleanAddition].join('; ');
}

function candidateSummary(row) {
  return {
    num: row.num,
    reportNumbers: extractTrackerReportNumbers(row.report),
    company: row.company,
    role: row.role,
    status: row.status,
  };
}

function resolveRow(rows, selector, role) {
  let candidates;
  if (/^report:\d+$/i.test(selector)) {
    const reportNumber = Number.parseInt(selector.split(':')[1], 10);
    candidates = rows.filter((row) =>
      extractTrackerReportNumbers(row.report).includes(reportNumber),
    );
  } else if (/^#?\d+$/.test(selector)) {
    const number = Number.parseInt(selector.replace(/^#/, ''), 10);
    candidates = rows.filter((row) => row.num === number);
  } else {
    const companyKey = normalizeCompany(selector);
    if (!companyKey) throw new Error('Selector is empty after normalization');
    candidates = rows.filter(
      (row) => normalizeCompany(row.company) === companyKey,
    );
  }

  if (candidates.length > 1 && role) {
    const narrowed = candidates.filter((row) => roleFuzzyMatch(row.role, role));
    if (narrowed.length === 1) candidates = narrowed;
  }
  if (candidates.length === 0) {
    const error = new Error(`No tracker row matches "${selector}"`);
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (candidates.length !== 1) {
    const error = new Error(
      `Selector "${selector}" is ambiguous; use #number, report:number, or --role`,
    );
    error.code = 'AMBIGUOUS';
    error.candidates = candidates.map(candidateSummary);
    throw error;
  }
  return candidates[0];
}

function statusLogLine(event) {
  return [
    event.eventId,
    event.timestamp,
    event.appNum,
    event.reportNum || '',
    event.company,
    event.role,
    event.fromStatus,
    event.toStatus,
    event.source,
    event.note || '',
  ]
    .map(tsvCell)
    .join('\t')
    .concat('\n');
}

function appendStatusLog(statusLogPath, line) {
  const before = existsSync(statusLogPath)
    ? readFileSync(statusLogPath, 'utf8')
    : STATUS_LOG_HEADER;
  const eventId = line.split('\t', 1)[0];
  if (
    before
      .split('\n')
      .some((existing) => existing.split('\t', 1)[0] === eventId)
  ) {
    return;
  }
  const normalized = before.endsWith('\n') ? before : `${before}\n`;
  writeFileAtomic(statusLogPath, `${normalized}${line}`);
}

function recoverTransitionJournals({
  dataDirectory,
  trackerPath,
  statusLogPath,
  trackerContent,
}) {
  if (!existsSync(dataDirectory)) return;
  const journals = readdirSync(dataDirectory)
    .filter(
      (name) =>
        name.startsWith('.status-transition-') && name.endsWith('.json'),
    )
    .sort();
  for (const name of journals) {
    const journalPath = join(dataDirectory, name);
    let journal;
    try {
      journal = JSON.parse(readFileSync(journalPath, 'utf8'));
    } catch (error) {
      throw new Error(
        `Unreadable status transition journal ${name}: ${error.message}`,
      );
    }
    if (
      journal.trackerBasename !== basename(trackerPath) ||
      journal.statusLogBasename !== basename(statusLogPath)
    ) {
      throw new Error(`Status transition journal has invalid targets: ${name}`);
    }
    const currentHash = sha256(trackerContent);
    if (currentHash === journal.beforeSha256) {
      rmSync(journalPath, { force: true });
    } else if (currentHash === journal.afterSha256) {
      appendStatusLog(statusLogPath, journal.logLine);
      rmSync(journalPath, { force: true });
    } else {
      throw new Error(
        `Cannot recover ${name}: tracker changed outside the recorded transition`,
      );
    }
  }
}

export async function setTrackerStatus(options) {
  const root = resolve(options.root || DEFAULT_ROOT);
  const trackerPath = resolveTrackerPath(root);
  const statesPath = resolve(root, 'templates/states.yml');
  if (!existsSync(trackerPath)) {
    const error = new Error(`No tracker found at ${trackerPath}`);
    error.code = 'NOT_FOUND';
    throw error;
  }
  const states = loadCanonicalStates(statesPath);
  const newStatus = resolveCanonicalState(options.state, states);
  if (!newStatus) {
    const error = new Error(
      `"${options.state}" is not canonical. Valid states: ${states
        .map((state) => state.label)
        .join(', ')}`,
    );
    error.code = 'INVALID_STATE';
    throw error;
  }

  const execute = (content, replace = null) => {
    const parsed = parseTracker(content);
    const row = resolveRow(parsed.rows, options.selector, options.role);
    const parts = [...row.parts];
    const nextNote = options.note
      ? appendUniqueNote(row.notes, options.note)
      : row.notes;
    parts[parsed.columns.status] = newStatus;
    if (options.note && parsed.columns.notes === undefined) {
      throw new Error('Tracker has no Notes column for --note');
    }
    if (parsed.columns.notes !== undefined) {
      parts[parsed.columns.notes] = nextNote;
    }
    const nextLine = rebuildRow(parts);
    const nextLines = [...parsed.lines];
    nextLines[row.lineIndex] = nextLine;
    const nextContent = nextLines.join('\n');
    const changed = nextContent !== content;
    const reportNumbers = extractTrackerReportNumbers(row.report);
    const event = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      appNum: row.num,
      reportNum: reportNumbers.length === 1 ? reportNumbers[0] : '',
      company: row.company,
      role: row.role,
      fromStatus: row.status,
      toStatus: newStatus,
      source: options.source || 'cli',
      note: options.note || '',
    };
    if (!replace || !changed) {
      return {
        changed,
        row: candidateSummary({ ...row, status: newStatus }),
        previousStatus: row.status,
        status: newStatus,
        note: nextNote,
        followupSeedCandidate:
          newStatus === 'Applied' && row.status !== 'Applied',
      };
    }

    const dataDirectory = resolve(root, 'data');
    const statusLogPath = resolve(dataDirectory, 'status-log.tsv');
    mkdirSync(dataDirectory, { recursive: true });
    recoverTransitionJournals({
      dataDirectory,
      trackerPath,
      statusLogPath,
      trackerContent: content,
    });
    const logLine = statusLogLine(event);
    const journalPath = join(
      dataDirectory,
      `.status-transition-${event.eventId}.json`,
    );
    const journal = {
      schemaVersion: 1,
      trackerBasename: basename(trackerPath),
      statusLogBasename: basename(statusLogPath),
      beforeSha256: sha256(content),
      afterSha256: sha256(nextContent),
      logLine,
    };
    writeFileAtomic(journalPath, `${JSON.stringify(journal, null, 2)}\n`);
    copyFileSync(trackerPath, `${trackerPath}.bak`);
    try {
      replace(nextContent);
      appendStatusLog(statusLogPath, logLine);
      rmSync(journalPath, { force: true });
    } catch (error) {
      try {
        replace(content);
        rmSync(journalPath, { force: true });
      } catch {
        // Keep the journal: the next locked transition will finish or report
        // the interrupted operation instead of hiding it.
      }
      throw error;
    }
    return {
      changed: true,
      row: candidateSummary({ ...row, status: newStatus }),
      previousStatus: row.status,
      status: newStatus,
      note: nextNote,
      statusLogPath,
      followupSeedCandidate:
        newStatus === 'Applied' && row.status !== 'Applied',
    };
  };

  if (options.dryRun) {
    return execute(readFileSync(trackerPath, 'utf8'));
  }
  const transaction = await openTrackerTransaction(trackerPath, options.lock);
  let result;
  let operationError = null;
  try {
    result = execute(transaction.read(), (content) =>
      transaction.replace(content),
    );
  } catch (error) {
    operationError = error;
  }
  const closeError = transaction.close();
  if (operationError && closeError) {
    throw new AggregateError(
      [operationError, closeError],
      'Status transition and lock release both failed',
    );
  }
  if (operationError) throw operationError;
  if (closeError) throw closeError;
  if (result.changed && result.followupSeedCandidate) {
    try {
      result.followupSeed = await seedFollowup({
        root,
        appNum: result.row.num,
        appliedDate:
          options.appliedDate || new Date().toISOString().slice(0, 10),
      });
    } catch (error) {
      result.followupSeed = {
        seeded: false,
        error: error.message,
      };
    }
  }
  return result;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/set-status.mjs <#num|report:num|company> <state> [options]',
    '',
    'Options:',
    '  --role=<role>      Disambiguate same-company or duplicate-number rows',
    '  --note=<text>      Append one idempotent tracker note',
    '  --source=<source>  Status-log source label (default: cli)',
    '  --applied-date=DATE Submission date used to seed first follow-up',
    '  --dry-run          Resolve and preview without writing',
    '  --json             Print machine-readable output',
  ].join('\n');
}

function parseArgs(args) {
  const options = {};
  const positional = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    const takeValue = (name) => {
      const value = args[++index];
      if (!value || value.startsWith('--')) {
        throw new Error(`${name} requires a value`);
      }
      return value;
    };
    if (arg === '--role') options.role = takeValue('--role');
    else if (arg.startsWith('--role=')) options.role = arg.slice(7);
    else if (arg === '--note') options.note = takeValue('--note');
    else if (arg.startsWith('--note=')) options.note = arg.slice(7);
    else if (arg === '--source') options.source = takeValue('--source');
    else if (arg.startsWith('--source=')) options.source = arg.slice(9);
    else if (arg === '--applied-date')
      options.appliedDate = takeValue('--applied-date');
    else if (arg.startsWith('--applied-date='))
      options.appliedDate = arg.slice(15);
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (!options.help && positional.length !== 2) throw new Error(usage());
  [options.selector, options.state] = positional;
  return options;
}

async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(usage());
    return;
  }
  const result = await setTrackerStatus(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!result.changed) {
    console.log(
      `No change: #${result.row.num} is already ${result.status} with that note`,
    );
  } else {
    console.log(
      `Updated #${result.row.num}: ${result.previousStatus} -> ${result.status}`,
    );
    if (result.statusLogPath) {
      console.log(`Status log: ${result.statusLogPath}`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    if (process.argv.includes('--json')) {
      console.log(
        JSON.stringify({
          error: error.message,
          code: error.code || 'ERROR',
          candidates: error.candidates,
        }),
      );
    }
    console.error(`Status update failed: ${error.message}`);
    process.exit(
      error.code === 'NOT_FOUND'
        ? 2
        : error.code === 'AMBIGUOUS'
          ? 3
          : error.code === 'LOCK_TIMEOUT'
            ? 4
            : 1,
    );
  });
}

#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTrackerReportNumbers, parseTracker } from './tracker-parse.mjs';
import {
  acquireTrackerLock,
  cell,
  normalizeCompany,
  openTrackerTransaction,
  resolveTrackerPath,
  roleFuzzyMatch,
  trackerLockDirFor,
  writeFileAtomic,
} from './tracker-utils.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(dirname(SCRIPT_PATH), '..');
const DONE_STATUSES = new Set(['completed', 'partial', 'skipped']);
const PENDING_HEADING_RE =
  /^##\s+(?:Pending|Pendientes|En attente|Offen|Pendentes|Ожидающие)\s*$/i;
const PROCESSED_HEADING_RE =
  /^##\s+(?:Processed|Procesadas|Traitées|Verarbeitet|Processadas|Обработанные)\s*$/i;
const SECTION_RE = /^##\s+/;
const PENDING_ITEM_RE = /^-\s+\[\s\]\s+(.+)$/;
const PROCESSED_ITEM_RE = /^-\s+\[x\]\s+(.+)$/i;

function pathIsInside(child, parent) {
  const rel = relative(resolve(parent), resolve(child));
  return (
    rel === '' ||
    (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
  );
}

function containedFile(root, requested, label) {
  const rootReal = realpathSync(root);
  const absolute = resolve(requested);
  const target = existsSync(absolute)
    ? realpathSync(absolute)
    : join(realpathSync(dirname(absolute)), absolute.split(/[\\/]/).at(-1));
  if (!pathIsInside(target, rootReal)) {
    throw new Error(`${label} escapes the Job-Hunt root: ${absolute}`);
  }
  if (existsSync(target) && !statSync(target).isFile()) {
    throw new Error(`${label} must be a file: ${absolute}`);
  }
  return target;
}

function pathsFor(options = {}) {
  const root = realpathSync(resolve(options.root || DEFAULT_ROOT));
  const pipelinePath = containedFile(
    root,
    options.pipelinePath || join(root, 'data', 'pipeline.md'),
    'Pipeline path',
  );
  const statePath = containedFile(
    root,
    options.statePath || join(root, 'batch', 'batch-state.tsv'),
    'Batch state path',
  );
  const trackerPath = options.trackerPath
    ? containedFile(root, options.trackerPath, 'Tracker path')
    : resolveTrackerPath(root);
  const reportsDirectory = realpathSync(
    options.reportsDirectory || join(root, 'reports'),
  );
  if (!pathIsInside(reportsDirectory, root)) {
    throw new Error('Reports directory escapes the Job-Hunt root');
  }
  return {
    root,
    pipelinePath,
    statePath,
    trackerPath,
    reportsDirectory,
  };
}

function parseBatchState(content) {
  const latestByUrl = new Map();
  for (const line of String(content).split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('id\t')) continue;
    const fields = line.split('\t');
    if (fields.length < 7) continue;
    const [id, url, status, , , report, score] = fields;
    if (!url.trim()) continue;
    latestByUrl.set(url.trim(), {
      id,
      url: url.trim(),
      status: status.trim().toLowerCase(),
      reportNumber: Number.parseInt(report, 10),
      score: score.trim(),
    });
  }
  return latestByUrl;
}

function reportsByNumber(reportsDirectory) {
  const index = new Map();
  for (const name of readdirSync(reportsDirectory)) {
    if (!name.endsWith('.md')) continue;
    const match = name.match(/^0*(\d+)-/);
    if (!match) continue;
    const number = Number.parseInt(match[1], 10);
    if (!index.has(number)) index.set(number, []);
    index.get(number).push(name);
  }
  return index;
}

function splitPipelineBody(body) {
  const parts = body.split('|').map((part) => part.trim());
  return {
    url: parts[0] || '',
    company: parts[1] || '',
    role: parts[2] || '',
  };
}

function processedUrl(body) {
  const parts = body.split('|').map((part) => part.trim());
  if (parts.length >= 2) return parts[1];
  return parts[0]?.match(/https?:\/\/\S+/)?.[0] || '';
}

function sectionEnd(lines, start) {
  for (let index = start + 1; index < lines.length; index++) {
    if (SECTION_RE.test(lines[index])) return index;
  }
  return lines.length;
}

function processedHeadingFor(pendingHeading) {
  if (/Pendientes/i.test(pendingHeading)) return '## Procesadas';
  if (/En attente/i.test(pendingHeading)) return '## Traitées';
  if (/Offen/i.test(pendingHeading)) return '## Verarbeitet';
  if (/Pendentes/i.test(pendingHeading)) return '## Processadas';
  if (/Ожидающие/i.test(pendingHeading)) return '## Обработанные';
  return '## Processed';
}

function trackerRowsByReport(tracker) {
  const rowsByReport = new Map();
  for (const row of tracker.rows) {
    for (const number of extractTrackerReportNumbers(row.report)) {
      if (!rowsByReport.has(number)) rowsByReport.set(number, []);
      rowsByReport.get(number).push(row);
    }
  }
  return rowsByReport;
}

function proveOutcome(entry, pipelineItem, reportIndex, rowsByReport) {
  if (!DONE_STATUSES.has(entry.status)) {
    return { valid: false, reason: `batch status is ${entry.status || '?'}` };
  }
  if (!Number.isSafeInteger(entry.reportNumber) || entry.reportNumber < 1) {
    return { valid: false, reason: 'batch report number is missing' };
  }
  const reports = reportIndex.get(entry.reportNumber) || [];
  if (reports.length !== 1) {
    return {
      valid: false,
      reason:
        reports.length === 0
          ? 'report file is missing'
          : 'report number is ambiguous',
    };
  }
  const rows = rowsByReport.get(entry.reportNumber) || [];
  if (rows.length !== 1) {
    return {
      valid: false,
      reason:
        rows.length === 0
          ? 'tracker row is missing'
          : 'tracker report number is duplicated',
    };
  }
  const row = rows[0];
  if (
    pipelineItem.company &&
    normalizeCompany(pipelineItem.company) !== normalizeCompany(row.company)
  ) {
    return { valid: false, reason: 'pipeline/tracker company mismatch' };
  }
  if (pipelineItem.role && !roleFuzzyMatch(pipelineItem.role, row.role)) {
    return { valid: false, reason: 'pipeline/tracker role mismatch' };
  }
  return { valid: true, report: reports[0], row };
}

function renderProcessedLine(paths, entry, proof, item) {
  const reportPath = join(paths.reportsDirectory, proof.report);
  const relativeReport = relative(dirname(paths.pipelinePath), reportPath)
    .split(sep)
    .join('/');
  const number = formatPipelineNumber(entry.reportNumber);
  const score = proof.row.score || (entry.score ? `${entry.score}/5` : 'N/A');
  const pdf = proof.row.pdf || '❌';
  const company = cell(proof.row.company || item.company);
  const role = cell(proof.row.role || item.role);
  return `- [x] [${number}](${relativeReport}) | ${entry.url} | ${company} | ${role} | ${score} | PDF ${pdf}`;
}

function formatPipelineNumber(number) {
  return String(number).padStart(3, '0');
}

export async function reconcilePipeline(options = {}) {
  const paths = pathsFor(options);
  if (
    !existsSync(paths.pipelinePath) ||
    !existsSync(paths.statePath) ||
    !existsSync(paths.trackerPath)
  ) {
    return {
      changed: false,
      moved: [],
      droppedDuplicates: [],
      skipped: [],
      reason: 'pipeline, batch state, or tracker is missing',
    };
  }

  const trackerTransaction = await openTrackerTransaction(
    paths.trackerPath,
    options.trackerLock,
  );
  let pipelineLock = null;
  const runLocked = async () => {
    pipelineLock = await acquireTrackerLock(
      trackerLockDirFor(paths.pipelinePath),
      {
        tracker: paths.pipelinePath,
        ...(options.pipelineLock || {}),
      },
    );
    const tracker = parseTracker(trackerTransaction.read());
    const batch = parseBatchState(readFileSync(paths.statePath, 'utf8'));
    const reportIndex = reportsByNumber(paths.reportsDirectory);
    const rowsByReport = trackerRowsByReport(tracker);
    const before = readFileSync(paths.pipelinePath, 'utf8');
    const lines = before.split(/\r?\n/);
    const pendingStart = lines.findIndex((line) =>
      PENDING_HEADING_RE.test(line),
    );
    if (pendingStart < 0) {
      return {
        changed: false,
        moved: [],
        droppedDuplicates: [],
        skipped: [],
        reason: 'pending section is missing',
      };
    }
    const processedStart = lines.findIndex((line) =>
      PROCESSED_HEADING_RE.test(line),
    );
    const pendingEnd = sectionEnd(lines, pendingStart);
    const processedEnd =
      processedStart >= 0 ? sectionEnd(lines, processedStart) : -1;
    const existingProcessedUrls = new Set();
    if (processedStart >= 0) {
      for (let index = processedStart + 1; index < processedEnd; index++) {
        const match = lines[index].match(PROCESSED_ITEM_RE);
        if (match) existingProcessedUrls.add(processedUrl(match[1]));
      }
    }

    const removeIndexes = new Set();
    const newProcessedLines = [];
    const moved = [];
    const droppedDuplicates = [];
    const skipped = [];
    for (let index = pendingStart + 1; index < pendingEnd; index++) {
      const match = lines[index].match(PENDING_ITEM_RE);
      if (!match) continue;
      const item = splitPipelineBody(match[1]);
      const entry = batch.get(item.url);
      if (!entry) continue;
      const proof = proveOutcome(entry, item, reportIndex, rowsByReport);
      if (!proof.valid) {
        skipped.push({
          url: item.url,
          reportNumber: entry.reportNumber || null,
          reason: proof.reason,
        });
        continue;
      }
      removeIndexes.add(index);
      if (existingProcessedUrls.has(item.url)) {
        droppedDuplicates.push(item.url);
        continue;
      }
      const processedLine = renderProcessedLine(paths, entry, proof, item);
      newProcessedLines.push(processedLine);
      existingProcessedUrls.add(item.url);
      moved.push({
        url: item.url,
        reportNumber: entry.reportNumber,
        company: proof.row.company,
        role: proof.row.role,
        status: entry.status,
      });
    }
    if (removeIndexes.size === 0) {
      return {
        changed: false,
        moved,
        droppedDuplicates,
        skipped,
      };
    }

    const output = [];
    for (let index = 0; index < lines.length; index++) {
      if (removeIndexes.has(index)) continue;
      output.push(lines[index]);
      if (index === processedStart && newProcessedLines.length > 0) {
        output.push('', ...newProcessedLines);
      }
    }
    if (processedStart < 0 && newProcessedLines.length > 0) {
      while (output.at(-1) === '') output.pop();
      output.push(
        '',
        processedHeadingFor(lines[pendingStart]),
        '',
        ...newProcessedLines,
        '',
      );
    }
    const after = output.join('\n');
    if (!options.dryRun) {
      writeFileAtomic(`${paths.pipelinePath}.pre-reconcile.bak`, before);
      writeFileAtomic(paths.pipelinePath, after);
    }
    return {
      changed: after !== before,
      dryRun: options.dryRun === true,
      moved,
      droppedDuplicates,
      skipped,
      remainingPending: output.filter((line) => PENDING_ITEM_RE.test(line))
        .length,
    };
  };
  let result;
  let operationError = null;
  try {
    result = await runLocked();
  } catch (error) {
    operationError = error;
  }
  let releaseError = null;
  if (pipelineLock) {
    try {
      pipelineLock.release();
    } catch (error) {
      releaseError = error;
    }
  }
  const trackerCloseError = trackerTransaction.close();
  const errors = [operationError, releaseError, trackerCloseError].filter(
    Boolean,
  );
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Pipeline reconciliation failed');
  }
  if (errors.length === 1) throw errors[0];
  return result;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--json') options.json = true;
    else if (argument === '--pipeline') options.pipelinePath = args[++index];
    else if (argument === '--state') options.statePath = args[++index];
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(
      'Usage: node scripts/reconcile-pipeline.mjs [--dry-run] [--json] [--pipeline PATH] [--state PATH]',
    );
    return;
  }
  const result = await reconcilePipeline(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(
    `Pipeline reconciliation: ${result.moved.length} moved, ${result.droppedDuplicates.length} stale duplicate(s) removed, ${result.skipped.length} unproven outcome(s) retained`,
  );
  if (result.dryRun) console.log('(dry-run — no changes written)');
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(`Pipeline reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  });
}

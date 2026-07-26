#!/usr/bin/env node
/**
 * merge-tracker.mjs — Merge batch tracker additions into applications.md
 *
 * Handles multiple TSV formats:
 * - 9-col: num\tdate\tcompany\trole\tstatus\tscore\tpdf\treport\tnotes
 * - 8-col: num\tdate\tcompany\trole\tstatus\tscore\tpdf\treport (no notes)
 * - Pipe-delimited (markdown table row): | col | col | ... |
 *
 * Dedup: company normalized + role fuzzy match + report number match
 * If duplicate with higher score → update in-place, update report link
 * Validates status against states.yml (rejects non-canonical, logs warning)
 *
 * Run: node scripts/merge-tracker.mjs [--dry-run] [--verify]
 */

import {
  readFileSync,
  readdirSync,
  mkdirSync,
  renameSync,
  existsSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  extractTrackerReportNumbers,
  parseTracker,
  resolveScoreStatus,
} from './tracker-parse.mjs';
import {
  cell,
  loadCanonicalStates,
  normalizeCompany,
  openTrackerTransaction,
  rebuildRow,
  resolveCanonicalState,
  resolveTrackerPath,
  roleFuzzyMatch,
} from './tracker-utils.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const CAREER_OPS = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');
const APPS_FILE = resolveTrackerPath(CAREER_OPS);
const ADDITIONS_DIR = join(CAREER_OPS, 'batch/tracker-additions');
const MERGED_DIR = join(ADDITIONS_DIR, 'merged');
const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY = process.argv.includes('--verify');
const STATE_DEFINITIONS = loadCanonicalStates(
  join(CAREER_OPS, 'templates/states.yml'),
);

// Ensure required directories exist (fresh setup)
mkdirSync(join(CAREER_OPS, 'data'), { recursive: true });
mkdirSync(ADDITIONS_DIR, { recursive: true });

// Canonical states and aliases
function validateStatus(status) {
  const clean = status
    .replace(/\*\*/g, '')
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .trim();
  const fromStates = resolveCanonicalState(clean, STATE_DEFINITIONS);
  if (fromStates) return fromStates;
  const lower = clean.toLowerCase();

  // Aliases
  const aliases = {
    // Spanish → English
    evaluada: 'Evaluated',
    condicional: 'Evaluated',
    hold: 'Evaluated',
    evaluar: 'Evaluated',
    verificar: 'Evaluated',
    aplicado: 'Applied',
    enviada: 'Applied',
    aplicada: 'Applied',
    applied: 'Applied',
    sent: 'Applied',
    respondido: 'Responded',
    entrevista: 'Interview',
    oferta: 'Offer',
    rechazado: 'Rejected',
    rechazada: 'Rejected',
    descartado: 'Discarded',
    descartada: 'Discarded',
    cerrada: 'Discarded',
    cancelada: 'Discarded',
    'no aplicar': 'SKIP',
    no_aplicar: 'SKIP',
    skip: 'SKIP',
    monitor: 'SKIP',
    'geo blocker': 'SKIP',
  };

  if (aliases[lower]) return aliases[lower];

  // DUPLICADO/Repost → Discarded
  if (/^(duplicado|dup|repost)/i.test(lower)) return 'Discarded';

  console.warn(`⚠️  Non-canonical status "${status}" — addition left pending`);
  return null;
}

function extractReportNum(reportStr) {
  return extractTrackerReportNumbers(reportStr)[0] || null;
}

function parseScore(s) {
  const m = s.replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Parse a TSV file content into a structured addition object.
 * Handles: 9-col TSV, 8-col TSV, pipe-delimited markdown.
 */
function parseTsvContent(content, filename) {
  content = content.trim();
  if (!content) return null;

  let parts;
  let addition;

  // Detect pipe-delimited (markdown table row)
  if (content.startsWith('|')) {
    parts = content.split('|').map((s) => s.trim());
    if (parts[0] === '') parts.shift();
    if (parts.at(-1) === '') parts.pop();
    if (parts.length < 8) {
      console.warn(
        `⚠️  Skipping malformed pipe-delimited ${filename}: ${parts.length} fields`,
      );
      return null;
    }
    // Format: num | date | company | role | score | status | pdf | report | notes
    addition = {
      num: parseInt(parts[0], 10),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      score: parts[4],
      status: validateStatus(parts[5]),
      pdf: parts[6],
      report: parts[7],
      notes: parts[8] || '',
    };
  } else {
    // Tab-separated
    parts = content.split('\t');
    if (parts.length < 8) {
      console.warn(
        `⚠️  Skipping malformed TSV ${filename}: ${parts.length} fields`,
      );
      return null;
    }

    const col4 = parts[4].trim();
    const col5 = parts[5].trim();
    const resolved = resolveScoreStatus(col4, col5);
    const statusCol = resolved?.status ?? col4;
    const scoreCol = resolved?.score ?? col5;

    addition = {
      num: parseInt(parts[0], 10),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      status: validateStatus(statusCol),
      score: scoreCol,
      pdf: parts[6],
      report: parts[7],
      notes: parts[8] || '',
    };
  }

  if (Number.isNaN(addition.num) || addition.num === 0) {
    console.warn(`⚠️  Skipping ${filename}: invalid entry number`);
    return null;
  }
  if (!addition.status) return null;
  for (const field of [
    'date',
    'company',
    'role',
    'score',
    'status',
    'pdf',
    'report',
    'notes',
  ]) {
    addition[field] = cell(addition[field]);
  }

  return addition;
}

// ---- Main ----

if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to merge into.');
  process.exit(0);
}
if (!existsSync(ADDITIONS_DIR)) {
  console.log('No tracker-additions directory found.');
  process.exit(0);
}

const tsvFiles = readdirSync(ADDITIONS_DIR).filter((f) => f.endsWith('.tsv'));
if (tsvFiles.length === 0) {
  console.log('✅ No pending additions to merge.');
  process.exit(0);
}

// Sort files numerically for deterministic processing
tsvFiles.sort((a, b) => {
  const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
  return numA - numB;
});

console.log(`📥 Found ${tsvFiles.length} pending additions`);

function identityMatches(first, second) {
  return (
    normalizeCompany(first.company) === normalizeCompany(second.company) &&
    roleFuzzyMatch(first.role, second.role)
  );
}

function buildTrackerLine(columns, values) {
  const lastColumn = Math.max(...Object.values(columns));
  const parts = Array.from({ length: lastColumn + 2 }, () => '');
  for (const [field, index] of Object.entries(columns)) {
    parts[index] = cell(values[field] || '');
  }
  return rebuildRow(parts);
}

const transaction = DRY_RUN ? null : await openTrackerTransaction(APPS_FILE);
let closeError = null;
let added = 0;
let updated = 0;
let skipped = 0;
let conflicted = 0;
try {
  const appContent = transaction
    ? transaction.read()
    : readFileSync(APPS_FILE, 'utf-8');
  const tracker = parseTracker(appContent);
  const appLines = [...tracker.lines];
  const existingApps = tracker.rows.map((row) => ({
    ...row,
    newIndex: null,
  }));
  let maxNum = existingApps.reduce(
    (maximum, app) => Math.max(maximum, app.num),
    0,
  );
  const newLines = [];
  const processedFiles = [];

  console.log(`📊 Existing: ${existingApps.length} entries, max #${maxNum}`);

  for (const file of tsvFiles) {
    const content = readFileSync(join(ADDITIONS_DIR, file), 'utf-8').trim();
    const addition = parseTsvContent(content, file);
    if (!addition) {
      skipped++;
      continue;
    }

    const reportNum = extractReportNum(addition.report);
    const reportMatch = reportNum
      ? existingApps.find((app) =>
          extractTrackerReportNumbers(app.report).includes(reportNum),
        )
      : null;
    if (reportMatch && !identityMatches(reportMatch, addition)) {
      console.warn(
        `⚠️  Conflict in ${file}: report #${reportNum} belongs to ${reportMatch.company} — ${reportMatch.role}; left pending`,
      );
      conflicted++;
      continue;
    }

    const numberMatch = existingApps.find((app) => app.num === addition.num);
    if (numberMatch && !identityMatches(numberMatch, addition)) {
      console.warn(
        `⚠️  Conflict in ${file}: tracker #${addition.num} belongs to ${numberMatch.company} — ${numberMatch.role}; left pending`,
      );
      conflicted++;
      continue;
    }

    const normCompany = normalizeCompany(addition.company);
    const duplicate =
      reportMatch ||
      numberMatch ||
      existingApps.find(
        (app) =>
          normalizeCompany(app.company) === normCompany &&
          roleFuzzyMatch(addition.role, app.role),
      );

    if (duplicate) {
      const newScore = parseScore(addition.score);
      const oldScore = parseScore(duplicate.score);
      if (newScore > oldScore) {
        console.log(
          `🔄 Update: #${duplicate.num} ${addition.company} — ${addition.role} (${oldScore}→${newScore})`,
        );
        const next = {
          ...duplicate,
          date: addition.date,
          company: addition.company,
          role: addition.role,
          score: addition.score,
          report: addition.report,
          notes: cell(
            `Re-eval ${addition.date} (${oldScore}→${newScore}). ${addition.notes}`,
          ),
        };
        const updatedLine = buildTrackerLine(tracker.columns, next);
        if (duplicate.newIndex === null) {
          appLines[duplicate.lineIndex] = updatedLine;
        } else {
          newLines[duplicate.newIndex] = updatedLine;
        }
        Object.assign(duplicate, next);
        updated++;
      } else {
        console.log(
          `⏭️  Skip: ${addition.company} — ${addition.role} (existing #${duplicate.num} ${oldScore} >= new ${newScore})`,
        );
        skipped++;
      }
      processedFiles.push(file);
      continue;
    }

    const entryNum = addition.num;
    maxNum = Math.max(maxNum, entryNum);
    const next = { ...addition, num: entryNum };
    const newIndex = newLines.length;
    newLines.push(buildTrackerLine(tracker.columns, next));
    existingApps.push({
      ...next,
      lineIndex: null,
      newIndex,
    });
    added++;
    processedFiles.push(file);
    console.log(
      `➕ Add #${entryNum}: ${addition.company} — ${addition.role} (${addition.score})`,
    );
  }

  if (newLines.length > 0) {
    const separatorIndex = appLines.findIndex(
      (line) =>
        line.trimStart().startsWith('|') &&
        /^\s*\|(?:\s*[-:]+\s*\|)+\s*$/.test(line),
    );
    if (separatorIndex < 0) {
      throw new Error('Cannot find tracker table separator');
    }
    appLines.splice(separatorIndex + 1, 0, ...newLines);
  }

  if (transaction) {
    if (added > 0 || updated > 0) {
      transaction.replace(appLines.join('\n'));
    }
    if (processedFiles.length > 0) {
      if (!existsSync(MERGED_DIR)) mkdirSync(MERGED_DIR, { recursive: true });
      for (const file of processedFiles) {
        renameSync(join(ADDITIONS_DIR, file), join(MERGED_DIR, file));
      }
      console.log(`\n✅ Moved ${processedFiles.length} TSVs to merged/`);
    }
  }

  console.log(
    `\n📊 Summary: +${added} added, 🔄${updated} updated, ⏭️${skipped} skipped, ⚠️${conflicted} conflicts`,
  );
  if (DRY_RUN) console.log('(dry-run — no changes written)');
} finally {
  if (transaction) closeError = transaction.close();
}
if (closeError) throw closeError;

// Optional verify
if (VERIFY && !DRY_RUN) {
  console.log('\n--- Running verification ---');
  try {
    execFileSync('node', [join(CAREER_OPS, 'scripts', 'verify-pipeline.mjs')], {
      stdio: 'inherit',
    });
  } catch (_e) {
    process.exit(1);
  }
}

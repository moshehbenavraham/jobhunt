#!/usr/bin/env node
/**
 * normalize-statuses.mjs — Clean non-canonical states in applications.md
 *
 * Maps all non-canonical statuses to canonical ones per states.yml:
 *   Evaluada, Aplicado, Respondido, Entrevista, Oferta, Rechazado, Descartado, NO APLICAR
 *
 * Also strips markdown bold (**) and dates from the status field,
 * moving DUPLICADO info to the notes column.
 *
 * Run: node scripts/normalize-statuses.mjs [--dry-run]
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTracker } from './tracker-parse.mjs';
import {
  loadCanonicalStates,
  openTrackerTransaction,
  rebuildRow,
  resolveCanonicalState,
  resolveTrackerPath,
} from './tracker-utils.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const CAREER_OPS = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');
// Support both layouts: data/applications.md (boilerplate) and applications.md (original)
const APPS_FILE = resolveTrackerPath(CAREER_OPS);
const DRY_RUN = process.argv.includes('--dry-run');
const STATE_DEFINITIONS = loadCanonicalStates(
  join(CAREER_OPS, 'templates/states.yml'),
);

// Ensure required directories exist (fresh setup)
mkdirSync(join(CAREER_OPS, 'data'), { recursive: true });

// Canonical status mapping
export function normalizeStatus(raw) {
  // Strip markdown bold
  const s = raw.replace(/\*\*/g, '').trim();
  const lower = s.toLowerCase();

  // DUPLICADO variants → Discarded
  if (/^duplicado/i.test(s) || /^dup\b/i.test(s)) {
    return { status: 'Discarded', moveToNotes: raw.trim() };
  }

  // CERRADA / Cancelada / Descartada → Discarded
  if (/^cerrada$/i.test(s)) return { status: 'Discarded' };
  if (/^cancelada/i.test(s)) return { status: 'Discarded' };
  if (/^descartada$/i.test(s)) return { status: 'Discarded' };
  if (/^descartado$/i.test(s)) return { status: 'Discarded' };

  // Rechazada / Rechazado → Rejected
  if (/^rechazada?$/i.test(s)) return { status: 'Rejected' };
  if (/^rechazado\s+\d{4}/i.test(s)) return { status: 'Rejected' };

  // Aplicado with date → Applied (strip date)
  if (/^aplicado\s+\d{4}/i.test(s)) return { status: 'Applied' };

  // CONDICIONAL / HOLD / EVALUAR / Verificar → Evaluated
  if (/^(condicional|hold|evaluar|verificar)$/i.test(s))
    return { status: 'Evaluated' };

  // MONITOR → SKIP
  if (/^monitor$/i.test(s)) return { status: 'SKIP' };

  // GEO BLOCKER → SKIP
  if (/geo.?blocker/i.test(s)) return { status: 'SKIP' };

  // Repost #NNN → Discarded
  if (/^repost/i.test(s))
    return { status: 'Discarded', moveToNotes: raw.trim() };

  // "—" (em dash, no status) → Discarded
  if (s === '—' || s === '-' || s === '') return { status: 'Discarded' };

  // Already canonical (English, per states.yml) — just fix casing/bold
  const canonical = resolveCanonicalState(s, STATE_DEFINITIONS);
  if (canonical) return { status: canonical };

  // Spanish aliases → English canonicals
  if (['evaluada'].includes(lower)) return { status: 'Evaluated' };
  if (['aplicado', 'enviada', 'aplicada', 'applied', 'sent'].includes(lower))
    return { status: 'Applied' };
  if (['respondido'].includes(lower)) return { status: 'Responded' };
  if (['entrevista'].includes(lower)) return { status: 'Interview' };
  if (['oferta'].includes(lower)) return { status: 'Offer' };
  if (['cerrada', 'descartada'].includes(lower)) return { status: 'Discarded' };
  if (['no aplicar', 'no_aplicar', 'skip'].includes(lower))
    return { status: 'SKIP' };

  // Unknown — flag it
  return { status: null, unknown: true };
}

// Read applications.md
if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to normalize.');
  process.exit(0);
}
const transaction = DRY_RUN ? null : await openTrackerTransaction(APPS_FILE);
let closeError = null;
try {
  const content = transaction
    ? transaction.read()
    : readFileSync(APPS_FILE, 'utf-8');
  const parsed = parseTracker(content);
  const lines = [...parsed.lines];

  let changes = 0;
  const unknowns = [];

  for (const row of parsed.rows) {
    const parts = [...row.parts];
    const rawStatus = row.status;
    const result = normalizeStatus(rawStatus);

    if (result.unknown) {
      unknowns.push({
        num: row.num,
        rawStatus,
        line: row.lineIndex + 1,
      });
      continue;
    }

    const cleanScore = row.score.replace(/\*\*/g, '');
    const statusChanged = result.status !== rawStatus;
    const scoreChanged = cleanScore !== row.score;
    let noteChanged = false;

    parts[parsed.columns.status] = result.status;
    if (parsed.columns.score !== undefined) {
      parts[parsed.columns.score] = cleanScore;
    }

    if (result.moveToNotes) {
      if (parsed.columns.notes === undefined) {
        unknowns.push({
          num: row.num,
          rawStatus,
          line: row.lineIndex + 1,
          reason: 'tracker has no Notes column',
        });
        continue;
      }
      const existing = row.notes || '';
      if (!existing.includes(result.moveToNotes)) {
        parts[parsed.columns.notes] =
          result.moveToNotes + (existing ? `. ${existing}` : '');
        noteChanged = true;
      }
    }
    if (!statusChanged && !scoreChanged && !noteChanged) continue;

    lines[row.lineIndex] = rebuildRow(parts);
    changes++;
    console.log(`#${row.num}: "${rawStatus}" → "${result.status}"`);
  }

  if (unknowns.length > 0) {
    console.log(`\n⚠️  ${unknowns.length} unknown statuses:`);
    for (const unknown of unknowns) {
      console.log(
        `  #${unknown.num} (line ${unknown.line}): "${unknown.rawStatus}"${
          unknown.reason ? ` — ${unknown.reason}` : ''
        }`,
      );
    }
  }

  console.log(`\n📊 ${changes} statuses normalized`);

  if (transaction && changes > 0) {
    copyFileSync(APPS_FILE, `${APPS_FILE}.bak`);
    transaction.replace(lines.join('\n'));
    console.log('✅ Written to applications.md (backup: applications.md.bak)');
  } else if (DRY_RUN) {
    console.log('(dry-run — no changes written)');
  } else {
    console.log('✅ No changes needed');
  }
} finally {
  if (transaction) closeError = transaction.close();
}
if (closeError) throw closeError;

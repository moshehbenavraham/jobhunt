#!/usr/bin/env node
/**
 * dedup-tracker.mjs — Remove duplicate entries from applications.md
 *
 * Groups by normalized company + fuzzy role match.
 * Keeps entry with highest score. If discarded entry had more advanced status,
 * preserves that status. Merges notes.
 *
 * Run: node scripts/dedup-tracker.mjs [--dry-run]
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTracker } from './tracker-parse.mjs';
import {
  normalizeCompany,
  openTrackerTransaction,
  rebuildRow,
  resolveTrackerPath,
  roleFuzzyMatch,
} from './tracker-utils.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const CAREER_OPS = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');
// Support both layouts: data/applications.md (boilerplate) and applications.md (original)
const APPS_FILE = resolveTrackerPath(CAREER_OPS);
const DRY_RUN = process.argv.includes('--dry-run');

// Ensure required directories exist (fresh setup)
mkdirSync(join(CAREER_OPS, 'data'), { recursive: true });

// Status advancement order (higher = more advanced in pipeline)
// Aplicado > Rechazado because active application > terminal state
const STATUS_RANK = {
  // English canonicals (states.yml labels)
  skip: 0,
  discarded: 0,
  rejected: 1,
  evaluated: 2,
  applied: 3,
  responded: 4,
  interview: 5,
  offer: 6,
  hired: 7,
  // Spanish aliases — kept for backwards compat with existing tracker data
  no_aplicar: 0,
  'no aplicar': 0,
  descartado: 0,
  descartada: 0,
  rechazado: 1, // Terminal — below active states
  rechazada: 1,
  evaluada: 2,
  aplicado: 3,
  respondido: 4,
  entrevista: 5,
  oferta: 6,
  contratado: 7,
  contratada: 7,
  accepted: 7,
  accept: 7,
};

function parseScore(s) {
  const m = s.replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

// Read
if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to dedup.');
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

  const entries = parsed.rows;

  console.log(`📊 ${entries.length} entries loaded`);

  // Group by company+role
  const groups = new Map();
  for (const entry of entries) {
    const key = normalizeCompany(entry.company);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  // Find duplicates
  let removed = 0;
  const linesToRemove = new Set();

  for (const [_company, companyEntries] of groups) {
    if (companyEntries.length < 2) continue;

    // Within same company, find role matches
    const processed = new Set();
    for (let i = 0; i < companyEntries.length; i++) {
      if (processed.has(i)) continue;
      const cluster = [companyEntries[i]];
      processed.add(i);

      for (let j = i + 1; j < companyEntries.length; j++) {
        if (processed.has(j)) continue;
        if (roleFuzzyMatch(companyEntries[i].role, companyEntries[j].role)) {
          cluster.push(companyEntries[j]);
          processed.add(j);
        }
      }

      if (cluster.length < 2) continue;

      // Keep the one with highest score
      cluster.sort((a, b) => parseScore(b.score) - parseScore(a.score));
      const keeper = cluster[0];

      // Check if any removed entry has more advanced status
      let bestStatusRank = STATUS_RANK[keeper.status.toLowerCase()] || 0;
      let bestStatus = keeper.status;
      for (let k = 1; k < cluster.length; k++) {
        const rank = STATUS_RANK[cluster[k].status.toLowerCase()] || 0;
        if (rank > bestStatusRank) {
          bestStatusRank = rank;
          bestStatus = cluster[k].status;
        }
      }

      // Update keeper's status if a removed entry had a more advanced one
      if (bestStatus !== keeper.status) {
        const lineIdx = keeper.lineIndex;
        if (lineIdx !== undefined) {
          const parts = [...keeper.parts];
          parts[parsed.columns.status] = bestStatus;
          lines[lineIdx] = rebuildRow(parts);
          console.log(
            `  📝 #${keeper.num}: status promoted to "${bestStatus}" (from #${cluster.find((e) => e.status === bestStatus)?.num})`,
          );
        }
      }

      // Remove duplicates
      for (let k = 1; k < cluster.length; k++) {
        const dup = cluster[k];
        const lineIdx = dup.lineIndex;
        if (lineIdx !== undefined) {
          linesToRemove.add(lineIdx);
          removed++;
          console.log(
            `🗑️  Remove #${dup.num} (${dup.company} — ${dup.role}, ${dup.score}) → kept #${keeper.num} (${keeper.score})`,
          );
        }
      }
    }
  }

  // Remove lines (in reverse order to preserve indices)
  const sortedRemoveIndices = [...linesToRemove].sort((a, b) => b - a);
  for (const index of sortedRemoveIndices) {
    lines.splice(index, 1);
  }

  console.log(`\n📊 ${removed} duplicates removed`);

  if (transaction && removed > 0) {
    copyFileSync(APPS_FILE, `${APPS_FILE}.bak`);
    transaction.replace(lines.join('\n'));
    console.log('✅ Written to applications.md (backup: applications.md.bak)');
  } else if (DRY_RUN) {
    console.log('(dry-run — no changes written)');
  } else {
    console.log('✅ No duplicates found');
  }
} finally {
  if (transaction) closeError = transaction.close();
}
if (closeError) throw closeError;

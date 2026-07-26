#!/usr/bin/env node
/**
 * verify-pipeline.mjs — Health check for jobhunt pipeline integrity
 *
 * Checks:
 * 1. All statuses are canonical (per states.yml)
 * 2. No duplicate company+role entries
 * 3. All report links point to existing files
 * 4. Scores match format X.XX/5 or N/A or DUP
 * 5. All rows have proper pipe-delimited format
 * 6. No pending TSVs in tracker-additions/ (only in merged/ or archived/)
 * 7. states.yml canonical IDs for cross-system consistency
 * 8. Manifest-backed PDFs are valid and fresh
 *
 * Run: node scripts/verify-pipeline.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const CAREER_OPS = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');
// Support both layouts: data/applications.md (boilerplate) and applications.md (original)
const APPS_FILE = existsSync(join(CAREER_OPS, 'data/applications.md'))
  ? join(CAREER_OPS, 'data/applications.md')
  : join(CAREER_OPS, 'applications.md');
const ADDITIONS_DIR = join(CAREER_OPS, 'batch/tracker-additions');
const REPORTS_DIR = join(CAREER_OPS, 'reports');
const OUTPUT_DIR = join(CAREER_OPS, 'output');
const _STATES_FILE = existsSync(join(CAREER_OPS, 'templates/states.yml'))
  ? join(CAREER_OPS, 'templates/states.yml')
  : join(CAREER_OPS, 'states.yml');

// Ensure required directories exist (fresh setup)
mkdirSync(join(CAREER_OPS, 'data'), { recursive: true });
mkdirSync(REPORTS_DIR, { recursive: true });

const CANONICAL_STATUSES = [
  'evaluated',
  'applied',
  'responded',
  'interview',
  'offer',
  'rejected',
  'discarded',
  'skip',
];

const ALIASES = {
  evaluada: 'evaluated',
  condicional: 'evaluated',
  hold: 'evaluated',
  evaluar: 'evaluated',
  verificar: 'evaluated',
  aplicado: 'applied',
  enviada: 'applied',
  aplicada: 'applied',
  applied: 'applied',
  sent: 'applied',
  respondido: 'responded',
  entrevista: 'interview',
  oferta: 'offer',
  rechazado: 'rejected',
  rechazada: 'rejected',
  descartado: 'discarded',
  descartada: 'discarded',
  cerrada: 'discarded',
  cancelada: 'discarded',
  'no aplicar': 'skip',
  no_aplicar: 'skip',
  monitor: 'skip',
  'geo blocker': 'skip',
};

let errors = 0;
let warnings = 0;

function error(msg) {
  console.log(`❌ ${msg}`);
  errors++;
}
function warn(msg) {
  console.log(`⚠️  ${msg}`);
  warnings++;
}
function ok(msg) {
  console.log(`✅ ${msg}`);
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeIdentity(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function identityKey(company, role) {
  return `${normalizeIdentity(company)}::${normalizeIdentity(role)}`;
}

function hasPdfMarker(value) {
  const normalized = String(value).replace(/\*\*/g, '').trim().toLowerCase();
  return (
    normalized !== '' &&
    !['no', 'none', 'n/a', '-', '❌', 'false'].includes(normalized)
  );
}

function linkedPdfPath(value) {
  const match = String(value).match(/\]\((output\/[^)]+\.pdf)\)/i);
  return match?.[1];
}

function resolveManifestArtifact(manifestPath, artifactPath) {
  if (!artifactPath) throw new Error('artifact path missing');
  if (!isAbsolute(artifactPath)) {
    const absolute = resolve(CAREER_OPS, artifactPath);
    const rel = relative(CAREER_OPS, absolute);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new Error(`artifact escapes project root: ${artifactPath}`);
    }
    return absolute;
  }

  const absolute = resolve(artifactPath);
  const rel = relative(dirname(manifestPath), absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(
      `absolute artifact is not beside manifest: ${artifactPath}`,
    );
  }
  return absolute;
}

function manifestFreshnessIssues(record) {
  const { manifest, path: manifestPath } = record;
  const issues = [];
  const checkHash = (label, path, expectedHash) => {
    if (!path || !expectedHash) {
      issues.push(`${label} path/hash missing`);
      return;
    }
    try {
      const absolute = resolveManifestArtifact(manifestPath, path);
      if (!existsSync(absolute)) {
        issues.push(`${label} missing: ${path}`);
      } else if (sha256File(absolute) !== expectedHash) {
        issues.push(`${label} changed: ${path}`);
      }
    } catch (cause) {
      issues.push(`${label}: ${cause.message}`);
    }
  };

  if (manifest.schemaVersion !== 1) {
    issues.push(
      `unsupported manifest schema version: ${manifest.schemaVersion}`,
    );
  }
  if (!manifest.candidate?.name || !manifest.candidate?.email) {
    issues.push('candidate identity missing');
  }
  if (
    !manifest.job?.company ||
    !manifest.job?.role ||
    !manifest.job?.jdSha256
  ) {
    issues.push('job identity/JD hash missing');
  }
  if (!['letter', 'a4'].includes(manifest.output?.format)) {
    issues.push('paper format missing or invalid');
  }
  if (
    !Number.isInteger(manifest.output?.pageCount) ||
    manifest.output.pageCount < 1
  ) {
    issues.push('page count missing or invalid');
  }
  if (
    !Array.isArray(manifest.inputs?.sources) ||
    manifest.inputs.sources.length === 0
  ) {
    issues.push('profile source hashes missing');
  }

  checkHash('PDF', manifest.output?.pdfPath, manifest.output?.pdfSha256);
  checkHash(
    'structured build',
    manifest.inputs?.buildPath,
    manifest.inputs?.buildSha256,
  );
  checkHash(
    'template',
    manifest.inputs?.templatePath,
    manifest.inputs?.templateSha256,
  );
  checkHash(
    'rendered HTML',
    manifest.output?.htmlPath,
    manifest.output?.htmlSha256,
  );
  const seenSources = new Set();
  for (const source of manifest.inputs?.sources || []) {
    if (!source.path || !source.sha256) {
      issues.push('profile source path/hash missing');
      continue;
    }
    if (seenSources.has(source.path)) {
      issues.push(`duplicate profile source: ${source.path}`);
      continue;
    }
    seenSources.add(source.path);
    checkHash('source', source.path, source.sha256);
  }

  try {
    const version = readFileSync(join(CAREER_OPS, 'VERSION'), 'utf8').trim();
    if (manifest.pipeline?.version !== version) {
      issues.push('pipeline version changed');
    }
    if (manifest.pipeline?.versionSha256 !== sha256Text(version)) {
      issues.push('pipeline version hash changed');
    }
  } catch (cause) {
    issues.push(`VERSION unavailable: ${cause.message}`);
  }

  try {
    const buildPath = resolveManifestArtifact(
      manifestPath,
      manifest.inputs?.buildPath,
    );
    const build = JSON.parse(readFileSync(buildPath, 'utf8'));
    if (manifest.job?.jdSha256 !== sha256Text(build.job?.jdText || '')) {
      issues.push('JD hash changed');
    }
  } catch (cause) {
    issues.push(`JD hash unavailable: ${cause.message}`);
  }

  return issues;
}

function loadPdfManifests() {
  if (!existsSync(OUTPUT_DIR)) return [];
  const records = [];
  for (const file of readdirSync(OUTPUT_DIR)) {
    if (!file.endsWith('.manifest.json')) continue;
    const path = join(OUTPUT_DIR, file);
    try {
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      records.push({ path, manifest });
    } catch (cause) {
      error(`Invalid PDF manifest ${file}: ${cause.message}`);
    }
  }
  return records;
}

// --- Read applications.md ---
if (!existsSync(APPS_FILE)) {
  console.log(
    '\n📊 No applications.md found. This is normal for a fresh setup.',
  );
  console.log(
    '   The file will be created when you evaluate your first offer.\n',
  );
  process.exit(0);
}
const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');

const entries = [];
for (const line of lines) {
  if (!line.startsWith('|')) continue;
  const parts = line.split('|').map((s) => s.trim());
  if (parts.length < 9) continue;
  const num = parseInt(parts[1], 10);
  if (Number.isNaN(num)) continue;
  entries.push({
    num,
    date: parts[2],
    company: parts[3],
    role: parts[4],
    score: parts[5],
    status: parts[6],
    pdf: parts[7],
    report: parts[8],
    notes: parts[9] || '',
  });
}

console.log(`\n📊 Checking ${entries.length} entries in applications.md\n`);

// --- Check 1: Canonical statuses ---
let badStatuses = 0;
for (const e of entries) {
  const clean = e.status.replace(/\*\*/g, '').trim().toLowerCase();
  // Strip trailing dates
  const statusOnly = clean.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();

  if (!CANONICAL_STATUSES.includes(statusOnly) && !ALIASES[statusOnly]) {
    error(`#${e.num}: Non-canonical status "${e.status}"`);
    badStatuses++;
  }

  // Check for markdown bold in status
  if (e.status.includes('**')) {
    error(`#${e.num}: Status contains markdown bold: "${e.status}"`);
    badStatuses++;
  }

  // Check for dates in status
  if (/\d{4}-\d{2}-\d{2}/.test(e.status)) {
    error(
      `#${e.num}: Status contains date: "${e.status}" — dates go in date column`,
    );
    badStatuses++;
  }
}
if (badStatuses === 0) ok('All statuses are canonical');

// --- Check 2: Duplicates ---
const companyRoleMap = new Map();
let dupes = 0;
for (const e of entries) {
  const key =
    e.company.toLowerCase().replace(/[^a-z0-9]/g, '') +
    '::' +
    e.role.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  if (!companyRoleMap.has(key)) companyRoleMap.set(key, []);
  companyRoleMap.get(key).push(e);
}
for (const [_key, group] of companyRoleMap) {
  if (group.length > 1) {
    warn(
      `Possible duplicates: ${group.map((e) => `#${e.num}`).join(', ')} (${group[0].company} — ${group[0].role})`,
    );
    dupes++;
  }
}
if (dupes === 0) ok('No exact duplicates found');

// --- Check 3: Report links ---
let brokenReports = 0;
for (const e of entries) {
  const match = e.report.match(/\]\(([^)]+)\)/);
  if (!match) continue;
  const reportPath = join(CAREER_OPS, match[1]);
  if (!existsSync(reportPath)) {
    error(`#${e.num}: Report not found: ${match[1]}`);
    brokenReports++;
  }
}
if (brokenReports === 0) ok('All report links valid');

// --- Check 4: Score format ---
let badScores = 0;
for (const e of entries) {
  const s = e.score.replace(/\*\*/g, '').trim();
  if (!/^\d+\.?\d*\/5$/.test(s) && s !== 'N/A' && s !== 'DUP') {
    error(`#${e.num}: Invalid score format: "${e.score}"`);
    badScores++;
  }
}
if (badScores === 0) ok('All scores valid');

// --- Check 5: Row format ---
let badRows = 0;
for (const line of lines) {
  if (!line.startsWith('|')) continue;
  if (line.includes('---') || line.includes('Empresa')) continue;
  const parts = line.split('|');
  if (parts.length < 9) {
    error(`Row with <9 columns: ${line.substring(0, 80)}...`);
    badRows++;
  }
}
if (badRows === 0) ok('All rows properly formatted');

// --- Check 6: Pending TSVs ---
let pendingTsvs = 0;
if (existsSync(ADDITIONS_DIR)) {
  const files = readdirSync(ADDITIONS_DIR).filter((f) => f.endsWith('.tsv'));
  pendingTsvs = files.length;
  if (pendingTsvs > 0) {
    warn(`${pendingTsvs} pending TSVs in tracker-additions/ (not merged)`);
  }
}
if (pendingTsvs === 0) ok('No pending TSVs');

// --- Check 7: Bold in scores ---
let boldScores = 0;
for (const e of entries) {
  if (e.score.includes('**')) {
    warn(`#${e.num}: Score has markdown bold: "${e.score}"`);
    boldScores++;
  }
}
if (boldScores === 0) ok('No bold in scores');

// --- Check 8: PDF manifests and freshness ---
const manifestRecords = loadPdfManifests();
const manifestsByIdentity = new Map();
const manifestsByPdf = new Map();
for (const record of manifestRecords) {
  const { manifest } = record;
  if (manifest.job?.company && manifest.job?.role) {
    const key = identityKey(manifest.job.company, manifest.job.role);
    const existing = manifestsByIdentity.get(key);
    if (
      !existing ||
      String(existing.manifest.generatedAt || '') <
        String(manifest.generatedAt || '')
    ) {
      manifestsByIdentity.set(key, record);
    }
  }
  if (manifest.output?.pdfPath) {
    manifestsByPdf.set(manifest.output.pdfPath.replaceAll('\\', '/'), record);
    manifestsByPdf.set(basename(manifest.output.pdfPath), record);
  }
}

let checkedPdfManifests = 0;
let legacyPdfs = 0;
for (const entry of entries.filter((item) => hasPdfMarker(item.pdf))) {
  const linkedPath = linkedPdfPath(entry.pdf);
  const record = linkedPath
    ? manifestsByPdf.get(linkedPath) || manifestsByPdf.get(basename(linkedPath))
    : manifestsByIdentity.get(identityKey(entry.company, entry.role));
  if (!record) {
    warn(
      `#${entry.num}: PDF is unverified legacy output (no matching manifest)`,
    );
    legacyPdfs++;
    continue;
  }

  checkedPdfManifests++;
  if (record.manifest.validation?.valid !== true) {
    error(`#${entry.num}: PDF manifest validation is not valid`);
    continue;
  }
  const issues = manifestFreshnessIssues(record);
  if (issues.length > 0) {
    error(`#${entry.num}: Stale PDF manifest: ${issues.join('; ')}`);
  }
}
if (checkedPdfManifests > 0) {
  ok(`${checkedPdfManifests} manifest-backed PDF(s) checked for freshness`);
} else if (legacyPdfs === 0) {
  ok('No tracker PDFs require manifest validation');
}

// --- Summary ---
console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Pipeline Health: ${errors} errors, ${warnings} warnings`);
if (errors === 0 && warnings === 0) {
  console.log('🟢 Pipeline is clean!');
} else if (errors === 0) {
  console.log('🟡 Pipeline OK with warnings');
} else {
  console.log('🔴 Pipeline has errors — fix before proceeding');
}

process.exit(errors > 0 ? 1 : 0);

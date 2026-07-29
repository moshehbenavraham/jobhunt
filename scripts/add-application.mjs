#!/usr/bin/env node

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  atomicWriteArtifact,
  resolveArtifactPath,
} from './artifact-policy.mjs';
import { assertContainedPath } from './path-policy.mjs';
import { parseTracker } from './tracker-parse.mjs';
import {
  cell,
  loadCanonicalStates,
  normalizeCompany,
  resolveCanonicalState,
  resolveTrackerPath,
  roleFuzzyMatch,
} from './tracker-utils.mjs';

function safeSlug(value) {
  const slug = String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('company cannot form a safe slug');
  return slug;
}

function parsePending(content) {
  const cells = String(content).trim().split('\t');
  if (cells.length < 6) return null;
  return { num: Number(cells[0]), company: cells[2], role: cells[3] };
}

function duplicate(rows, company, role) {
  const key = normalizeCompany(company);
  return rows.find(
    (row) =>
      normalizeCompany(row.company) === key && roleFuzzyMatch(row.role, role),
  );
}

export async function addApplicationTsv({
  root = process.cwd(),
  num,
  date,
  company,
  role,
  status = 'Evaluated',
  score,
  pdf = 'No',
  report,
  notes = '',
}) {
  const projectRoot = resolve(root);
  if (!Number.isInteger(Number(num)) || Number(num) <= 0) {
    throw new Error('num must be a positive integer');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    throw new Error('date must use YYYY-MM-DD');
  }
  if (!company || !role) throw new Error('company and role are required');
  if (!/^(?:N\/A|[1-5](?:\.\d{1,2})?\/5)$/.test(String(score))) {
    throw new Error('score must be N/A or X/5 from 1 through 5');
  }
  const canonical = resolveCanonicalState(
    status,
    loadCanonicalStates(resolve(projectRoot, 'templates/states.yml')),
  );
  if (!canonical) throw new Error(`status is not canonical: ${status}`);
  const reportRoot = resolve(projectRoot, 'reports');
  const reportPath = assertContainedPath(
    reportRoot,
    resolve(projectRoot, report),
    {
      mustExist: true,
      label: 'Tracker report',
    },
  );
  const reportStat = lstatSync(reportPath);
  if (
    !reportStat.isFile() ||
    reportStat.isSymbolicLink() ||
    !reportPath.endsWith('.md')
  ) {
    throw new Error('report must be a regular Markdown file inside reports/');
  }
  const reportNum = basename(reportPath).match(/^(\d{3,})-/)?.[1];
  if (reportNum && Number(reportNum) !== Number(num)) {
    throw new Error(`num ${num} does not match report ${reportNum}`);
  }
  const trackerPath = resolveTrackerPath(projectRoot);
  const existingRows = existsSync(trackerPath)
    ? parseTracker(readFileSync(trackerPath, 'utf8')).rows
    : [];
  const existing = duplicate(existingRows, company, role);
  if (existing) {
    const error = new Error(
      `company+role already exists as tracker #${existing.num}`,
    );
    error.code = 'DUPLICATE';
    throw error;
  }
  const additions = resolve(projectRoot, 'batch/tracker-additions');
  const pendingRows = existsSync(additions)
    ? readdirSync(additions)
        .filter((name) => name.endsWith('.tsv'))
        .map((name) =>
          parsePending(readFileSync(resolve(additions, name), 'utf8')),
        )
        .filter(Boolean)
    : [];
  const pending = duplicate(pendingRows, company, role);
  if (pending) {
    const error = new Error(
      `company+role already has pending TSV #${pending.num}`,
    );
    error.code = 'DUPLICATE';
    throw error;
  }
  const relativeReport = `reports/${basename(reportPath)}`;
  const line = [
    num,
    date,
    company,
    role,
    canonical,
    score,
    /^(?:yes|✅)$/i.test(pdf) ? 'Yes' : 'No',
    `[${String(num).padStart(3, '0')}](${relativeReport})`,
    notes,
  ]
    .map(cell)
    .join('\t')
    .concat('\n');
  const filename = `${num}-${safeSlug(company)}.tsv`;
  const target = resolveArtifactPath({
    root: projectRoot,
    directory: 'batch/tracker-additions',
    requested: filename,
    extensions: ['.tsv'],
    label: 'Tracker addition',
  }).path;
  if (existsSync(target))
    throw new Error(`tracker addition already exists: ${filename}`);
  await atomicWriteArtifact(target, line);
  return {
    created: `batch/tracker-additions/${filename}`,
    mergeCommand: 'node scripts/merge-tracker.mjs',
    trackerMutated: false,
  };
}

function argument(argv, name) {
  return argv
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function usage() {
  return [
    'Usage: node scripts/add-application.mjs --num=N --date=YYYY-MM-DD',
    '  --company=... --role=... --score=X/5 --report=reports/N-company.md',
    '  [--status=Evaluated] [--pdf=No] [--notes=...]',
    'Writes a pending TSV only; merge remains explicit.',
  ].join('\n');
}

export async function runAddApplicationCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const result = await addApplicationTsv({
    root: options.root || argument(argv, '--root') || process.cwd(),
    num: Number(argument(argv, '--num')),
    date: argument(argv, '--date'),
    company: argument(argv, '--company'),
    role: argument(argv, '--role'),
    status: argument(argv, '--status') || 'Evaluated',
    score: argument(argv, '--score'),
    pdf: argument(argv, '--pdf') || 'No',
    report: argument(argv, '--report'),
    notes: argument(argv, '--notes') || '',
  });
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = await runAddApplicationCli();
  } catch (error) {
    console.error(`Add application failed: ${error.message}`);
    process.exitCode = error.code === 'DUPLICATE' ? 2 : 1;
  }
}

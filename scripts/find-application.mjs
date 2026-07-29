#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTrackerReportNumbers, parseTracker } from './tracker-parse.mjs';
import { resolveTrackerPath, roleFuzzyMatch } from './tracker-utils.mjs';

export function findApplications(rows, query) {
  const value = String(query || '').trim();
  if (!value) return [];
  if (/^#?\d+$/.test(value)) {
    const number = Number(value.replace(/^#/, ''));
    return rows.filter(
      (row) =>
        row.num === number ||
        extractTrackerReportNumbers(row.report).includes(number),
    );
  }
  const lower = value.toLowerCase();
  return rows.filter(
    (row) =>
      row.company.toLowerCase().includes(lower) ||
      row.role.toLowerCase().includes(lower) ||
      roleFuzzyMatch(row.role, value),
  );
}

function artifactsFor(root, row) {
  const reportNumbers = extractTrackerReportNumbers(row.report);
  const reportFiles = existsSync(resolve(root, 'reports'))
    ? readdirSync(resolve(root, 'reports')).filter((name) =>
        reportNumbers.some((number) =>
          name.startsWith(`${String(number).padStart(3, '0')}-`),
        ),
      )
    : [];
  const outputFiles = existsSync(resolve(root, 'output'))
    ? readdirSync(resolve(root, 'output')).filter((name) => {
        const companySlug = row.company
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return companySlug && name.toLowerCase().includes(companySlug);
      })
    : [];
  return {
    reports: reportFiles.map((name) => `reports/${name}`),
    output: outputFiles.map((name) => `output/${name}`),
  };
}

function usage() {
  return 'Usage: node scripts/find-application.mjs <number|company|role> [--json]';
}

export function runFindApplicationCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const query = argv.filter((value) => !value.startsWith('--')).join(' ');
  if (!query) throw new Error(usage());
  const root = resolve(options.root || process.cwd());
  const tracker = resolveTrackerPath(root);
  const rows = parseTracker(readFileSync(tracker, 'utf8')).rows;
  const results = findApplications(rows, query).map((row) => ({
    trackerNum: row.num,
    company: row.company,
    role: row.role,
    status: row.status,
    score: row.score,
    reportNumbers: extractTrackerReportNumbers(row.report),
    artifacts: artifactsFor(root, row),
  }));
  if (argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
  else {
    for (const result of results) {
      console.log(
        `#${result.trackerNum} ${result.company} — ${result.role} [${result.status}]`,
      );
      [...result.artifacts.reports, ...result.artifacts.output].forEach(
        (path) => {
          console.log(`  ${path}`);
        },
      );
    }
  }
  return results.length > 0 ? 0 : 2;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = runFindApplicationCli();
  } catch (error) {
    console.error(`Find application failed: ${error.message}`);
    process.exitCode = 1;
  }
}

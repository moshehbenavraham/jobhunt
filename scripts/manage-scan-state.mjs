#!/usr/bin/env node

import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensurePipelineFile, ensureScanHistoryFile } from './scan.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const PROJECT_ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');

const PIPELINE_PATH = resolve(PROJECT_ROOT, 'data', 'pipeline.md');
const SCAN_HISTORY_PATH = resolve(PROJECT_ROOT, 'data', 'scan-history.tsv');
const ARCHIVE_ROOT = resolve(PROJECT_ROOT, 'tmp', 'scan-state');

function printUsage() {
  console.log(`Usage:
  node scripts/manage-scan-state.mjs --archive-pipeline
  node scripts/manage-scan-state.mjs --archive-history
  node scripts/manage-scan-state.mjs --archive-all
  node scripts/manage-scan-state.mjs --reset-pipeline
  node scripts/manage-scan-state.mjs --reset-history --yes

Behavior:
  --archive-pipeline  Move data/pipeline.md into tmp/scan-state/<timestamp>/ and recreate a fresh pipeline scaffold.
  --archive-history   Move data/scan-history.tsv into tmp/scan-state/<timestamp>/ and recreate a fresh history header.
  --archive-all       Archive both files together, then recreate fresh versions.
  --reset-pipeline    Recreate data/pipeline.md without archiving the old file.
  --reset-history     Recreate data/scan-history.tsv without archiving. Requires --yes.
`);
}

function buildArchiveDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return resolve(ARCHIVE_ROOT, stamp);
}

function archiveFile(src, destinationDir) {
  if (!existsSync(src)) return null;
  mkdirSync(destinationDir, { recursive: true });
  const destination = resolve(
    destinationDir,
    src.endsWith('pipeline.md') ? 'pipeline.md' : 'scan-history.tsv',
  );
  renameSync(src, destination);
  return destination;
}

function resetPipeline() {
  if (existsSync(PIPELINE_PATH)) {
    rmSync(PIPELINE_PATH, { force: true });
  }
  ensurePipelineFile();
}

function resetHistory() {
  if (existsSync(SCAN_HISTORY_PATH)) {
    rmSync(SCAN_HISTORY_PATH, { force: true });
  }
  ensureScanHistoryFile();
}

function main(args = process.argv.slice(2)) {
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printUsage();
    return 0;
  }

  const actionFlags = [
    '--archive-pipeline',
    '--archive-history',
    '--archive-all',
    '--reset-pipeline',
    '--reset-history',
  ].filter((flag) => args.includes(flag));

  if (actionFlags.length !== 1) {
    console.error(
      'Choose exactly one scan-state action. Use --help for usage.',
    );
    return 1;
  }

  const action = actionFlags[0];
  if (action === '--reset-history' && !args.includes('--yes')) {
    console.error('Refusing to reset data/scan-history.tsv without --yes.');
    return 1;
  }

  const shouldArchivePipeline =
    action === '--archive-pipeline' || action === '--archive-all';
  const shouldArchiveHistory =
    action === '--archive-history' || action === '--archive-all';
  const shouldResetPipeline =
    shouldArchivePipeline || action === '--reset-pipeline';
  const shouldResetHistory =
    shouldArchiveHistory || action === '--reset-history';
  const archiveDir =
    shouldArchivePipeline || shouldArchiveHistory ? buildArchiveDir() : null;

  if (shouldArchivePipeline) {
    const archived = archiveFile(PIPELINE_PATH, archiveDir);
    if (archived) {
      console.log(`Archived data/pipeline.md -> ${archived}`);
    } else {
      console.log('No existing data/pipeline.md to archive.');
    }
  }

  if (shouldArchiveHistory) {
    const archived = archiveFile(SCAN_HISTORY_PATH, archiveDir);
    if (archived) {
      console.log(`Archived data/scan-history.tsv -> ${archived}`);
    } else {
      console.log('No existing data/scan-history.tsv to archive.');
    }
  }

  if (shouldResetPipeline) {
    resetPipeline();
    console.log(`Reset data/pipeline.md -> ${PIPELINE_PATH}`);
  }

  if (shouldResetHistory) {
    resetHistory();
    console.log(`Reset data/scan-history.tsv -> ${SCAN_HISTORY_PATH}`);
  }

  return 0;
}

const exitCode = main();
if (exitCode !== 0) {
  process.exit(exitCode);
}

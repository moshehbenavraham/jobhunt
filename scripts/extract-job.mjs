#!/usr/bin/env node

/**
 * extract-job.mjs - Deterministic ATS-backed single-job extractor
 *
 * Fetches structured job data directly from supported ATS providers and prints
 * a normalized JSON document. Supported hosts: Ashby, Greenhouse, and Lever.
 *
 * Usage:
 *   node scripts/extract-job.mjs <job-url>
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAtsJob } from './ats-core.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

export async function runExtractJob({
  args = process.argv.slice(2),
  stdout = console.log,
} = {}) {
  if (args.length !== 1 || args[0] === '--help') {
    throw new Error('Usage: node scripts/extract-job.mjs <job-url>');
  }

  const result = await extractAtsJob(args[0]);
  stdout(JSON.stringify(result, null, 2));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runExtractJob().catch((error) => {
    console.error(
      error.message.startsWith('Usage:')
        ? error.message
        : `Fatal: ${error.message}`,
    );
    process.exit(1);
  });
}

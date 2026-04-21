import type { ScriptExecutionDefinition } from './script-execution-adapter.js';

const DEFAULT_TOOL_SCRIPT_TIMEOUT_MS = {
  'dedup-tracker': 15_000,
  'extract-job': 15_000,
  'generate-pdf': 30_000,
  'merge-tracker': 15_000,
  'normalize-statuses': 15_000,
  'verify-pipeline': 15_000,
} as const;

const DEFAULT_SESSION03_TOOL_SCRIPTS = [
  {
    command: process.execPath,
    commandArgs: ['scripts/extract-job.mjs'],
    description: 'Extract structured job data from a supported ATS posting.',
    name: 'extract-job',
    timeoutMs: DEFAULT_TOOL_SCRIPT_TIMEOUT_MS['extract-job'],
  },
  {
    command: process.execPath,
    commandArgs: ['scripts/generate-pdf.mjs'],
    description: 'Render an ATS-oriented HTML resume into a PDF artifact.',
    name: 'generate-pdf',
    timeoutMs: DEFAULT_TOOL_SCRIPT_TIMEOUT_MS['generate-pdf'],
  },
  {
    command: process.execPath,
    commandArgs: ['scripts/merge-tracker.mjs'],
    description: 'Merge staged tracker TSV additions into the applications tracker.',
    name: 'merge-tracker',
    timeoutMs: DEFAULT_TOOL_SCRIPT_TIMEOUT_MS['merge-tracker'],
  },
  {
    command: process.execPath,
    commandArgs: ['scripts/verify-pipeline.mjs'],
    description: 'Verify tracker, report, and pending-TSV pipeline integrity.',
    name: 'verify-pipeline',
    timeoutMs: DEFAULT_TOOL_SCRIPT_TIMEOUT_MS['verify-pipeline'],
  },
  {
    command: process.execPath,
    commandArgs: ['scripts/normalize-statuses.mjs'],
    description: 'Normalize tracker statuses onto the canonical state set.',
    name: 'normalize-statuses',
    timeoutMs: DEFAULT_TOOL_SCRIPT_TIMEOUT_MS['normalize-statuses'],
  },
  {
    command: process.execPath,
    commandArgs: ['scripts/dedup-tracker.mjs'],
    description: 'Deduplicate tracker rows while preserving the strongest record.',
    name: 'dedup-tracker',
    timeoutMs: DEFAULT_TOOL_SCRIPT_TIMEOUT_MS['dedup-tracker'],
  },
] as const satisfies readonly ScriptExecutionDefinition[];

export function createDefaultToolScripts(): readonly ScriptExecutionDefinition[] {
  return DEFAULT_SESSION03_TOOL_SCRIPTS.map((definition) => ({
    ...definition,
    commandArgs: definition.commandArgs ? [...definition.commandArgs] : [],
  }));
}

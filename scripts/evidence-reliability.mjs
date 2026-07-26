#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVIDENCE_TIERS = Object.freeze([
  'first_party',
  'reliable_third_party',
  'inferred',
  'unknown',
]);

const SOURCE_TIERS = Object.freeze({
  employer_posting: 'first_party',
  employer_site: 'first_party',
  employer_disclosure: 'first_party',
  public_salary_grade: 'first_party',
  government_filing: 'reliable_third_party',
  government_statistics: 'reliable_third_party',
  established_salary_database: 'reliable_third_party',
  reputable_media: 'reliable_third_party',
  recruiter_listing: 'inferred',
  job_board_listing: 'inferred',
  employee_report: 'inferred',
  search_snippet: 'inferred',
  model_inference: 'inferred',
});

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources
    .filter((source) => source && typeof source === 'object')
    .map((source) => ({
      kind: String(source.kind || '').trim(),
      label: String(source.label || '').trim(),
      url:
        typeof source.url === 'string' && /^https?:\/\//i.test(source.url)
          ? source.url
          : null,
    }))
    .filter((source) => Object.hasOwn(SOURCE_TIERS, source.kind));
}

export function classifyEvidenceReliability(input = {}) {
  const sources = normalizeSources(input.sources);
  const tiers = new Set(sources.map((source) => SOURCE_TIERS[source.kind]));
  let tier = 'unknown';
  if (tiers.has('first_party')) tier = 'first_party';
  else if (tiers.has('reliable_third_party')) tier = 'reliable_third_party';
  else if (tiers.has('inferred')) tier = 'inferred';

  const conflicts =
    input.conflicts === true ||
    (Number.isInteger(input.conflictCount) && input.conflictCount > 0);

  return {
    schemaVersion: 1,
    subject: input.subject === 'compensation' ? 'compensation' : 'company',
    tier,
    conflicts,
    sourceCount: sources.length,
    sourceKinds: [...new Set(sources.map((source) => source.kind))].sort(),
    sources,
    interpretation:
      tier === 'unknown'
        ? 'No usable evidence; do not infer.'
        : conflicts
          ? `${tier} evidence is present but conflicting; show the conflict explicitly.`
          : `${tier} evidence is present; preserve its provenance in the report.`,
  };
}

function usage() {
  return [
    'Usage: node scripts/evidence-reliability.mjs <input.json>',
    'Input: {"subject":"company|compensation","sources":[{"kind":"..."}]}',
  ].join('\n');
}

export function runEvidenceReliabilityCli(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  if (argv.length !== 1) throw new Error(usage());
  const input = JSON.parse(readFileSync(resolve(argv[0]), 'utf8'));
  console.log(JSON.stringify(classifyEvidenceReliability(input), null, 2));
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = runEvidenceReliabilityCli();
  } catch (error) {
    console.error(
      `Evidence reliability classification failed: ${error.message}`,
    );
    process.exitCode = 1;
  }
}

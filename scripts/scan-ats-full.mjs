#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yamlModule from 'js-yaml';
import { canonicalizeListingUrl } from './fingerprint-core.mjs';
import { assertContainedPath, pathIsInside } from './path-policy.mjs';
import { fetchNormalized } from './providers/_contract.mjs';
import { makeHttpContext } from './providers/_http.mjs';
import { loadProviders, resolveProvider } from './providers/_registry.mjs';
import { writeFileAtomic } from './tracker-utils.mjs';

const parseYaml = (yamlModule.default ?? yamlModule).load;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');

export function flattenSeedSets(config, { selectedSet = null } = {}) {
  const entries = [];
  for (const seedSet of Array.isArray(config?.seed_sets)
    ? config.seed_sets
    : []) {
    if (
      seedSet?.enabled === false ||
      (selectedSet &&
        String(seedSet.name || '').toLowerCase() !== selectedSet.toLowerCase())
    ) {
      continue;
    }
    for (const entry of Array.isArray(seedSet.entries) ? seedSet.entries : []) {
      if (entry?.enabled === false) continue;
      entries.push({
        ...entry,
        seedSet: String(seedSet.name || '').trim(),
        seedSourceUrl: String(seedSet.source_url || '').trim(),
      });
    }
  }
  return entries;
}

async function mapBounded(values, limit, mapper) {
  const output = new Array(values.length);
  let index = 0;
  async function worker() {
    while (index < values.length) {
      const current = index++;
      output[current] = await mapper(values[current], current);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return output;
}

export async function runReverseDiscovery(
  entries,
  {
    providers,
    context = makeHttpContext(),
    concurrency = 5,
    knownUrls = new Set(),
  },
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) {
    throw new Error('concurrency must be an integer from 1 to 20');
  }
  const results = await mapBounded(entries, concurrency, async (entry) => {
    const resolution = resolveProvider(entry, providers, { kinds: ['ats'] });
    if (!resolution || resolution.error) {
      return {
        entry,
        provider: null,
        jobs: [],
        error: resolution?.error || 'no ATS provider detected',
      };
    }
    if (resolution.provider.id === 'browser') {
      return {
        entry,
        provider: 'browser',
        jobs: [],
        error: 'browser seeds require the main scanner explicit fallback',
      };
    }
    try {
      const jobs = await fetchNormalized(resolution.provider, entry, context);
      const unique = [];
      for (const job of jobs) {
        const canonical = canonicalizeListingUrl(job.url) || job.url;
        if (knownUrls.has(canonical)) continue;
        knownUrls.add(canonical);
        unique.push({
          ...job,
          seedSet: entry.seedSet,
          seedSourceUrl: entry.seedSourceUrl,
        });
      }
      return {
        entry,
        provider: resolution.provider.id,
        jobs: unique,
        error: null,
      };
    } catch (error) {
      return {
        entry,
        provider: resolution.provider.id,
        jobs: [],
        error: error.message,
      };
    }
  });
  return {
    results,
    jobs: results.flatMap((result) => result.jobs),
    errors: results.filter((result) => result.error),
  };
}

function loadKnownUrls(root) {
  const seen = new Set();
  for (const relative of ['data/scan-history.tsv', 'data/pipeline.md']) {
    const path = resolve(root, relative);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)\t]+/g)) {
      seen.add(canonicalizeListingUrl(match[0]) || match[0]);
    }
  }
  return seen;
}

function appendPipeline(root, jobs) {
  if (jobs.length === 0) return;
  const dataRoot = assertContainedPath(root, 'data', {
    allowRoot: false,
    mustExist: true,
  });
  const path = assertContainedPath(
    dataRoot,
    resolve(root, 'data/pipeline.md'),
    {
      label: 'Pipeline',
    },
  );
  const initial = existsSync(path)
    ? readFileSync(path, 'utf8')
    : '# Pipeline\n\n## Pending\n\n## Processed\n';
  const marker = '## Pending';
  const markerIndex = initial.indexOf(marker);
  if (markerIndex === -1) throw new Error('data/pipeline.md lacks ## Pending');
  const nextSection = initial.indexOf('\n## ', markerIndex + marker.length);
  const insertAt = nextSection === -1 ? initial.length : nextSection;
  const lines = jobs
    .map(
      (job) =>
        `- [ ] ${job.url} | ${job.company} | ${job.title}\n  - Seed: ${job.seedSet}${job.seedSourceUrl ? ` (${job.seedSourceUrl})` : ''}; provider: ${job.provider}; trust: ${job.trustScore}/100`,
    )
    .join('\n');
  const updated = `${initial.slice(0, insertAt)}\n${lines}\n${initial.slice(insertAt)}`;
  writeFileAtomic(path, updated);
}

export async function runReverseDiscoveryCli(
  args = process.argv.slice(2),
  { stdout = console.log } = {},
) {
  const seedIndex = args.indexOf('--seed');
  const seedRelative =
    seedIndex === -1 ? 'config/ats-seeds.yml' : args[seedIndex + 1];
  if (!seedRelative) throw new Error('--seed requires a path');
  const seedPath = assertContainedPath(ROOT, resolve(ROOT, seedRelative), {
    mustExist: true,
    label: 'Seed file',
  });
  if (
    !pathIsInside(resolve(ROOT, 'config'), seedPath) &&
    !pathIsInside(resolve(ROOT, 'seeds'), seedPath)
  ) {
    throw new Error('Seed file must be under config/ or seeds/');
  }
  const concurrencyIndex = args.indexOf('--concurrency');
  const concurrency =
    concurrencyIndex === -1 ? 5 : Number(args[concurrencyIndex + 1]);
  const setIndex = args.indexOf('--set');
  const selectedSet = setIndex === -1 ? null : args[setIndex + 1];
  const config = parseYaml(readFileSync(seedPath, 'utf8')) || {};
  const entries = flattenSeedSets(config, { selectedSet });
  const providers = await loadProviders(resolve(SCRIPT_DIR, 'providers'));
  const report = await runReverseDiscovery(entries, {
    providers,
    concurrency,
    knownUrls: loadKnownUrls(ROOT),
  });
  if (args.includes('--write')) appendPipeline(ROOT, report.jobs);

  if (args.includes('--json')) {
    stdout(JSON.stringify(report, null, 2));
  } else {
    stdout(
      `Seed boards: ${entries.length}; jobs: ${report.jobs.length}; failures: ${report.errors.length}`,
    );
    for (const result of report.results) {
      stdout(
        `${result.error ? 'FAIL' : 'OK'} ${result.entry.name}: ${result.error || `${result.jobs.length} new jobs`}`,
      );
    }
    if (!args.includes('--write')) {
      stdout('Dry run: pass --write to append new jobs to data/pipeline.md');
    }
  }
  return report.errors.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runReverseDiscoveryCli().then(
    (code) => {
      if (code) process.exit(code);
    },
    (error) => {
      console.error(`Fatal: ${error.message}`);
      process.exit(1);
    },
  );
}

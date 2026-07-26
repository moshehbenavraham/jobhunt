#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yamlModule from 'js-yaml';
import { fetchNormalized } from './providers/_contract.mjs';
import { makeHttpContext } from './providers/_http.mjs';
import { loadProviders, resolveProvider } from './providers/_registry.mjs';
import { validatePortalConfig } from './validate-portals.mjs';

const parseYaml = (yamlModule.default ?? yamlModule).load;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(dirname(SCRIPT_PATH), '..');
const PROVIDERS_DIR = resolve(dirname(SCRIPT_PATH), 'providers');

export async function verifyPortalEntries(
  config,
  {
    providers,
    context = makeHttpContext(),
    includeBrowser = false,
    now = () => Date.now(),
  },
) {
  const validation = validatePortalConfig(config, { providers });
  if (!validation.valid) {
    return { validation, results: [] };
  }
  const entries = validation.entries.filter((entry) => entry.enabled !== false);
  const results = [];
  for (const entry of entries) {
    const resolution = resolveProvider(entry, providers);
    if (!resolution || resolution.error) {
      results.push({
        name: entry.name,
        outcome: 'unroutable',
        error: resolution?.error || 'no provider detected',
      });
      continue;
    }
    if (resolution.provider.id === 'browser' && !includeBrowser) {
      results.push({
        name: entry.name,
        provider: 'browser',
        outcome: 'unconfirmed',
        error: 'browser verification requires --browser',
      });
      continue;
    }
    const started = now();
    try {
      const jobs = await fetchNormalized(
        resolution.provider,
        { ...entry, max_pages: 1 },
        context,
      );
      results.push({
        name: entry.name,
        provider: resolution.provider.id,
        outcome: 'healthy',
        jobs: jobs.length,
        durationMs: Math.max(0, now() - started),
      });
    } catch (error) {
      results.push({
        name: entry.name,
        provider: resolution.provider.id,
        outcome: 'failed',
        jobs: 0,
        durationMs: Math.max(0, now() - started),
        error: error.message,
      });
    }
  }
  return { validation, results };
}

export async function runVerifyPortals(
  args = process.argv.slice(2),
  { stdout = console.log, stderr = console.error } = {},
) {
  const configPath = resolve(
    ROOT,
    args.find((arg) => !arg.startsWith('--')) || 'config/portals.yml',
  );
  if (!existsSync(configPath))
    throw new Error(`Config not found: ${configPath}`);
  const providers = await loadProviders(PROVIDERS_DIR, {
    onError: (error) => stderr(`Provider load error: ${error.message}`),
  });
  const config = parseYaml(readFileSync(configPath, 'utf8')) || {};
  const report = await verifyPortalEntries(config, {
    providers,
    includeBrowser: args.includes('--browser'),
  });
  if (args.includes('--json')) {
    stdout(JSON.stringify(report, null, 2));
  } else {
    for (const result of report.results) {
      stdout(
        `${result.outcome.toUpperCase()} ${result.name}${result.provider ? ` (${result.provider})` : ''}${result.error ? `: ${result.error}` : `: ${result.jobs} jobs`}`,
      );
    }
  }
  return report.validation.valid &&
    report.results.every((result) =>
      ['healthy', 'unconfirmed'].includes(result.outcome),
    )
    ? 0
    : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runVerifyPortals().then(
    (code) => {
      if (code) process.exit(code);
    },
    (error) => {
      console.error(`Fatal: ${error.message}`);
      process.exit(1);
    },
  );
}

#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yamlModule from 'js-yaml';
import { loadProviders, resolveProvider } from './providers/_registry.mjs';
import { validateScanFilters } from './scan-policy.mjs';

const parseYaml = (yamlModule.default ?? yamlModule).load;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(dirname(SCRIPT_PATH), '..');
const PROVIDERS_DIR = resolve(dirname(SCRIPT_PATH), 'providers');

function list(value) {
  return Array.isArray(value) ? value : [];
}

function validateConfiguredUrl(value, field, errors) {
  if (value === undefined || value === null || value === '') return;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    ) {
      errors.push(`${field} must be credential-free HTTPS on port 443`);
    }
  } catch {
    errors.push(`${field} must be an absolute URL`);
  }
}

export function validatePortalConfig(config, { providers = new Map() } = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { valid: false, errors: ['config must be a YAML object'], warnings };
  }

  for (const key of ['positive', 'negative', 'seniority_boost']) {
    const value = config.title_filter?.[key];
    if (value !== undefined && !Array.isArray(value)) {
      errors.push(`title_filter.${key} must be an array`);
    }
  }
  errors.push(...validateScanFilters(config.scan_filters || {}));

  const entries = [
    ...list(config.tracked_companies).map((entry) => ({
      ...entry,
      section: 'tracked_companies',
    })),
    ...list(config.job_boards).map((entry) => ({
      ...entry,
      section: 'job_boards',
    })),
  ];
  const names = new Set();
  entries.forEach((entry, index) => {
    const label = `${entry.section}[${index}]`;
    if (!entry.name || typeof entry.name !== 'string') {
      errors.push(`${label}.name is required`);
    } else {
      const key = entry.name.trim().toLowerCase();
      if (names.has(key))
        errors.push(`${label}.name is duplicated: ${entry.name}`);
      names.add(key);
    }
    if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
      errors.push(`${label}.enabled must be true or false`);
    }
    validateConfiguredUrl(entry.careers_url, `${label}.careers_url`, errors);
    validateConfiguredUrl(entry.api, `${label}.api`, errors);
    const resolution = resolveProvider(entry, providers);
    if (resolution?.error) {
      errors.push(`${label}.provider: ${resolution.error}`);
    } else if (!resolution && entry.enabled !== false) {
      warnings.push(
        `${label}: no provider detected; scan will skip this entry`,
      );
    }
  });

  return { valid: errors.length === 0, errors, warnings, entries };
}

export async function runValidatePortals(
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
  const result = validatePortalConfig(config, { providers });
  if (args.includes('--json')) {
    stdout(JSON.stringify(result, null, 2));
  } else {
    for (const warning of result.warnings) stdout(`WARN: ${warning}`);
    for (const error of result.errors) stderr(`ERROR: ${error}`);
    stdout(
      result.valid
        ? `Portal config valid (${result.entries.length} entries)`
        : `Portal config invalid (${result.errors.length} errors)`,
    );
  }
  return result.valid ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runValidatePortals().then(
    (code) => {
      if (code) process.exit(code);
    },
    (error) => {
      console.error(`Fatal: ${error.message}`);
      process.exit(1);
    },
  );
}

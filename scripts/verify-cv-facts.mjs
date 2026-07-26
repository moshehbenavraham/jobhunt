#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertContainedPath } from './path-policy.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SOURCES = [
  'profile/cv.md',
  'profile/article-digest.md',
  'config/profile.yml',
];

export function stripCvMarkup(text) {
  return String(text)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<\/?[a-z][^>\n]*>/gi, ' ')
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{([^}]*)\})?/g, ' $1 ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeClaim(value) {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/(\d)\s+(?=[%x])/g, '$1')
    .replace(/([€£$])\s+/g, '$1')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractCvFactClaims(text) {
  const clean = stripCvMarkup(text);
  const definitions = [
    ['percentage', /\b\d+(?:\.\d+)?\s*%/g],
    ['currency', /(?:[$€£]\s*\d[\d,.]*(?:\s*[kKmMbB])?)/g],
    ['multiplier', /\b\d+(?:\.\d+)?\s*[xX]\b/g],
    [
      'quantity',
      /\b\d[\d,.]*\+?\s*(?:users|customers|clients|employees|engineers|teams|companies|hours|days|weeks|months|years|minutes|seconds|requests|tokens|documents|workflows|pipelines|agents|interviews|applications|offers|reports|cvs|resumes|deployments|services|models|projects|countries|regions)\b/gi,
    ],
    [
      'statistic',
      /\b(?:p|r|r²|rho|ρ)\s*(?:<|>|≤|≥|=)\s*0?\.\d+\b/giu,
    ],
  ];
  const claims = new Map();
  for (const [type, pattern] of definitions) {
    for (const match of clean.matchAll(pattern)) {
      const normalized = normalizeClaim(match[0]);
      if (!claims.has(normalized)) {
        claims.set(normalized, { type, normalized, raw: match[0] });
      }
    }
  }
  return [...claims.values()];
}

function normalizeConfig(config = {}) {
  const result = {
    allow_metrics: config.allow_metrics ?? [],
    forbidden_phrases: config.forbidden_phrases ?? [],
  };
  for (const [key, value] of Object.entries(result)) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new Error(`${key} must be an array of strings`);
    }
  }
  return result;
}

export function verifyCvFacts({
  targetText,
  sourceTexts,
  config = {},
  target = '<memory>',
} = {}) {
  const normalizedConfig = normalizeConfig(config);
  const sourceClaims = extractCvFactClaims(sourceTexts.join('\n'));
  const allowed = new Set([
    ...sourceClaims.map((claim) => claim.normalized),
    ...normalizedConfig.allow_metrics.map(normalizeClaim),
  ]);
  const targetClaims = extractCvFactClaims(targetText);
  const unsupportedClaims = targetClaims.filter(
    (claim) => !allowed.has(claim.normalized),
  );
  const normalizedTarget = stripCvMarkup(targetText).toLowerCase();
  const forbiddenPhrases = normalizedConfig.forbidden_phrases.filter(
    (phrase) => phrase && normalizedTarget.includes(phrase.toLowerCase()),
  );
  return {
    schemaVersion: 1,
    valid: unsupportedClaims.length === 0 && forbiddenPhrases.length === 0,
    target,
    sourceClaimCount: sourceClaims.length,
    targetClaimCount: targetClaims.length,
    unsupportedClaims,
    forbiddenPhrases,
  };
}

function parseArgs(argv) {
  const options = { sources: [], json: false, root: DEFAULT_ROOT };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--source') {
      if (!argv[index + 1]) throw new Error('--source requires a path');
      options.sources.push(argv[++index]);
    } else if (value.startsWith('--source=')) {
      options.sources.push(value.slice('--source='.length));
    } else if (value === '--config') {
      if (!argv[index + 1]) throw new Error('--config requires a path');
      options.config = argv[++index];
    } else if (value.startsWith('--config=')) {
      options.config = value.slice('--config='.length);
    } else if (value.startsWith('--root=')) {
      options.root = resolve(value.slice('--root='.length));
    } else if (value === '--json') {
      options.json = true;
    } else if (value === '--help' || value === '-h') {
      options.help = true;
    } else if (!value.startsWith('--') && !options.target) {
      options.target = value;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return options;
}

function readContained(root, path, label) {
  const absolute = assertContainedPath(root, path, {
    mustExist: true,
    label,
  });
  return { path: absolute, text: readFileSync(absolute, 'utf8') };
}

export function runCvFactCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help || !options.target) {
    console.log(`Usage:
  node scripts/verify-cv-facts.mjs <generated-cv.html|md|tex> [options]

Options:
  --source=<path>   Evidence source; repeatable
  --config=<path>   Optional JSON allow/forbid policy
  --root=<path>     Project root
  --json            Print the versioned machine report`);
    return options.help ? 0 : 1;
  }
  const root = resolve(options.root);
  const target = readContained(root, options.target, 'CV target');
  const requestedSources =
    options.sources.length > 0 ? options.sources : DEFAULT_SOURCES;
  const sourceTexts = requestedSources
    .filter((path) => existsSync(resolve(root, path)))
    .map((path) => readContained(root, path, 'CV fact source').text);
  if (sourceTexts.length === 0) {
    throw new Error('No readable CV fact sources were found');
  }

  let config = {};
  const configPath = options.config || 'config/cv-facts.json';
  if (existsSync(resolve(root, configPath))) {
    config = JSON.parse(readContained(root, configPath, 'CV fact config').text);
  }
  const report = verifyCvFacts({
    targetText: target.text,
    sourceTexts,
    config,
    target: target.path,
  });
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.valid) {
    console.log(`CV fact check passed: ${basename(target.path)}`);
  } else {
    console.error(`CV fact check failed: ${basename(target.path)}`);
    for (const claim of report.unsupportedClaims) {
      console.error(
        `- unsupported ${claim.type}: ${JSON.stringify(claim.normalized)}`,
      );
    }
    for (const phrase of report.forbiddenPhrases) {
      console.error(`- forbidden phrase: ${JSON.stringify(phrase)}`);
    }
  }
  return report.valid ? 0 : 1;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    process.exitCode = runCvFactCli();
  } catch (error) {
    console.error(`CV fact check error: ${error.message}`);
    process.exitCode = 2;
  }
}

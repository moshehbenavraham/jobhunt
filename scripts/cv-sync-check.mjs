#!/usr/bin/env node

/**
 * cv-sync-check.mjs — Validates that the jobhunt setup is consistent.
 *
 * Checks:
 * 1. profile/cv.md exists (legacy root cv.md also accepted)
 * 2. config/profile.yml exists and has required fields
 * 3. No hardcoded metrics in _shared.md or batch/batch-prompt.md
 * 4. profile/article-digest.md freshness (legacy root article-digest.md also accepted)
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(SCRIPT_DIR, '..');

const warnings = [];
const errors = [];

function resolveArticleDigestPath() {
  const preferred = join(projectRoot, 'profile', 'article-digest.md');
  if (existsSync(preferred)) return preferred;

  const legacy = join(projectRoot, 'article-digest.md');
  if (existsSync(legacy)) return legacy;

  return preferred;
}

function resolveCvPath() {
  const preferred = join(projectRoot, 'profile', 'cv.md');
  if (existsSync(preferred)) return preferred;

  const legacy = join(projectRoot, 'cv.md');
  if (existsSync(legacy)) return legacy;

  return preferred;
}

// 1. Check profile/cv.md exists (legacy root cv.md also accepted)
const cvPath = resolveCvPath();
if (!existsSync(cvPath)) {
  errors.push(
    'profile/cv.md not found. Copy profile/cv.example.md and fill it in with your CV in markdown format. Legacy root cv.md is also accepted during migration.',
  );
} else {
  const cvContent = readFileSync(cvPath, 'utf-8');
  if (cvContent.trim().length < 100) {
    const cvLabel = cvPath.includes(join('profile', 'cv.md'))
      ? 'profile/cv.md'
      : 'cv.md';
    warnings.push(
      `${cvLabel} seems too short. Make sure it contains your full CV.`,
    );
  }
}

// 2. Check profile.yml exists
const profilePath = join(projectRoot, 'config', 'profile.yml');
if (!existsSync(profilePath)) {
  errors.push(
    'config/profile.yml not found. Copy from config/profile.example.yml and fill in your details.',
  );
} else {
  const profileContent = readFileSync(profilePath, 'utf-8');
  const requiredFields = ['full_name', 'email', 'location'];
  for (const field of requiredFields) {
    if (
      !profileContent.includes(field) ||
      profileContent.includes(`"Jane Smith"`)
    ) {
      warnings.push(
        `config/profile.yml may still have example data. Check field: ${field}`,
      );
      break;
    }
  }
}

// 3. Check for hardcoded metrics in prompt files
const filesToCheck = [
  { path: join(projectRoot, 'modes', '_shared.md'), name: '_shared.md' },
  {
    path: join(projectRoot, 'batch', 'batch-prompt.md'),
    name: 'batch-prompt.md',
  },
];

// Pattern: numbers that look like hardcoded metrics (e.g., "170+ hours", "90% self-service")
const metricPattern =
  /\b\d{2,4}\+?\s*(hours?|%|evals?|layers?|tests?|fields?|bases?)\b/gi;

for (const { path, name } of filesToCheck) {
  if (!existsSync(path)) continue;
  const content = readFileSync(path, 'utf-8');

  // Skip lines that are clearly instructions (contain "NEVER hardcode" etc.)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.includes('NEVER hardcode') ||
      line.includes('NUNCA hardcode') ||
      line.startsWith('#') ||
      line.startsWith('<!--')
    )
      continue;
    const matches = line.match(metricPattern);
    if (matches) {
      warnings.push(
        `${name}:${i + 1} — Possible hardcoded metric: "${matches[0]}". Should this be read from profile/cv.md or profile/article-digest.md?`,
      );
    }
  }
}

// 4. Check profile/article-digest.md freshness (legacy root article-digest.md still accepted)
const digestPath = resolveArticleDigestPath();
if (existsSync(digestPath)) {
  const stats = statSync(digestPath);
  const daysSinceModified =
    (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
  if (daysSinceModified > 30) {
    const digestLabel = digestPath.includes(join('profile', 'article-digest.md'))
      ? 'profile/article-digest.md'
      : 'article-digest.md';
    warnings.push(
      `${digestLabel} is ${Math.round(daysSinceModified)} days old. Consider updating if your projects have new metrics.`,
    );
  }
}

// Output results
console.log('\n=== jobhunt sync check ===\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('All checks passed.');
} else {
  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    errors.forEach((e) => {
      console.log(`  ERROR: ${e}`);
    });
  }
  if (warnings.length > 0) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    warnings.forEach((w) => {
      console.log(`  WARN: ${w}`);
    });
  }
}

console.log('');
process.exit(errors.length > 0 ? 1 : 0);

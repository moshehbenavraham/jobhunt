#!/usr/bin/env node

import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';
import { writeFileAtomic } from './tracker-utils.mjs';

const TITLE_FAMILIES = Object.freeze([
  {
    pattern: /forward deployed|deployment/i,
    titles: [
      'Forward Deployed',
      'Deployment Engineer',
      'Implementation Engineer',
      'Customer Engineer',
    ],
  },
  {
    pattern: /solutions? architect|solutions? engineer/i,
    titles: [
      'Solutions Architect',
      'Solutions Engineer',
      'AI Architect',
      'Partner Engineer',
    ],
  },
  {
    pattern: /applied ai|ai engineer|machine learning/i,
    titles: [
      'Applied AI',
      'AI Engineer',
      'Machine Learning Engineer',
      'AI Product Engineer',
    ],
  },
  {
    pattern: /agent|automation|workflow/i,
    titles: [
      'Agent Engineer',
      'Automation Engineer',
      'Workflow Engineer',
      'AI Integration Engineer',
    ],
  },
  {
    pattern: /product manager|technical pm/i,
    titles: ['Technical AI Product Manager', 'AI Product Manager'],
  },
  {
    pattern: /developer relations|developer advocate|devrel/i,
    titles: ['Developer Relations', 'Developer Advocate', 'AI Evangelist'],
  },
]);

function list(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export function suggestTitleExpansion(profile, portals) {
  const archetypes = Array.isArray(profile.target_roles?.archetypes)
    ? profile.target_roles.archetypes
        .map((item) =>
          typeof item === 'string' ? item : String(item?.name || '').trim(),
        )
        .filter(Boolean)
    : [];
  const targets = [
    ...list(profile.target_roles?.primary),
    ...archetypes,
  ].filter(Boolean);
  const existing = list(portals.title_filter?.positive);
  const negative = list(portals.title_filter?.negative);
  const suggestions = [];
  for (const family of TITLE_FAMILIES) {
    if (!targets.some((target) => family.pattern.test(target))) continue;
    for (const title of family.titles) {
      if (
        existing.some((value) =>
          title.toLowerCase().includes(value.toLowerCase()),
        ) ||
        negative.some((value) =>
          title.toLowerCase().includes(value.toLowerCase()),
        )
      ) {
        continue;
      }
      suggestions.push({
        title,
        reason: `adjacent to configured target: ${targets.find((target) => family.pattern.test(target))}`,
        breadthWarning:
          title.split(/\s+/).length < 2
            ? 'Broad substring; review scan noise before accepting.'
            : null,
      });
    }
  }
  return {
    existing,
    suggestions: suggestions.filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.title === item.title) === index,
    ),
  };
}

function argument(argv, name) {
  return argv
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function usage() {
  return [
    'Usage: node scripts/expand-titles.mjs [--accept="Title A,Title B" --apply]',
    'Preview is read-only. --apply requires explicit --accept and writes only config/portals.yml.',
  ].join('\n');
}

export function runExpandTitlesCli(argv = process.argv.slice(2), options = {}) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const root = resolve(options.root || process.cwd());
  const profilePath = resolve(root, 'config/profile.yml');
  const portalsPath = resolve(root, 'config/portals.yml');
  const profile = yaml.load(readFileSync(profilePath, 'utf8')) || {};
  const portals = yaml.load(readFileSync(portalsPath, 'utf8')) || {};
  const expansion = suggestTitleExpansion(profile, portals);
  const accepted = list(
    argument(argv, '--accept')
      ?.split(',')
      .map((value) => value.trim()),
  );
  const allowed = new Set(expansion.suggestions.map((item) => item.title));
  const invalid = accepted.filter((title) => !allowed.has(title));
  if (invalid.length > 0) {
    throw new Error(
      `accepted titles are not current suggestions: ${invalid.join(', ')}`,
    );
  }
  if (argv.includes('--apply')) {
    if (accepted.length === 0) {
      throw new Error('--apply requires at least one explicit --accept title');
    }
    const next = structuredClone(portals);
    next.title_filter ||= {};
    next.title_filter.positive = [
      ...list(next.title_filter.positive),
      ...accepted,
    ];
    if (existsSync(portalsPath))
      copyFileSync(portalsPath, `${portalsPath}.bak`);
    writeFileAtomic(
      portalsPath,
      yaml.dump(next, { lineWidth: 100, noRefs: true, quotingType: "'" }),
    );
  }
  console.log(
    JSON.stringify(
      {
        ...expansion,
        accepted,
        applied: argv.includes('--apply'),
        writeTarget: argv.includes('--apply') ? 'config/portals.yml' : null,
        profileMutated: false,
      },
      null,
      2,
    ),
  );
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = runExpandTitlesCli();
  } catch (error) {
    console.error(`Title expansion failed: ${error.message}`);
    process.exitCode = 1;
  }
}

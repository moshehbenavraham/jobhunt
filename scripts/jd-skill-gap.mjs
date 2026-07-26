#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertContainedPath,
  ensureContainedDirectory,
} from './path-policy.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');

const REQUIREMENT_HEADING =
  /^#{1,5}\s*(requirements?|qualifications?|what you(?:'|’)ll need|must[- ]haves?|preferred|nice[- ]to[- ]haves?|bonus)\b/i;
const NICE_HEADING = /\b(?:preferred|nice[- ]to[- ]have|bonus)\b/i;
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/;
const STOPWORDS = new Set(
  [
    'ability',
    'applicant',
    'applicants',
    'background',
    'bachelor',
    'bachelors',
    'candidate',
    'candidates',
    'communication',
    'degree',
    'excellent',
    'experience',
    'familiarity',
    'ideal',
    'knowledge',
    'minimum',
    'preferred',
    'proven',
    'required',
    'senior',
    'skills',
    'strong',
    'successful',
    'team',
    'teams',
    'understanding',
    'work',
    'working',
    'year',
    'years',
  ].map((value) => value.toLowerCase()),
);

const MULTIWORD_SKILLS = [
  'artificial intelligence',
  'change management',
  'cloud computing',
  'computer vision',
  'data engineering',
  'data science',
  'deep learning',
  'distributed systems',
  'generative ai',
  'machine learning',
  'natural language processing',
  'product management',
  'project management',
  'retrieval augmented generation',
  'site reliability engineering',
  'stakeholder management',
];

const ALIASES = new Map([
  ['amazon web services', 'AWS'],
  ['aws', 'AWS'],
  ['google cloud platform', 'GCP'],
  ['gcp', 'GCP'],
  ['microsoft azure', 'Azure'],
  ['k8s', 'Kubernetes'],
  ['nodejs', 'Node.js'],
  ['node.js', 'Node.js'],
  ['postgres', 'PostgreSQL'],
  ['postgresql', 'PostgreSQL'],
  ['retrieval augmented generation', 'RAG'],
  ['large language models', 'LLMs'],
]);

function canonicalSkill(value) {
  const clean = String(value)
    .normalize('NFKC')
    .replace(/[.,;:]+$/g, '')
    .trim();
  return ALIASES.get(clean.toLowerCase()) || clean;
}

function skillKey(value) {
  return canonicalSkill(value)
    .toLowerCase()
    .replace(/[./_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mentioned(text, skill) {
  const aliases = [skill];
  for (const [alias, canonical] of ALIASES) {
    if (skillKey(canonical) === skillKey(skill)) aliases.push(alias);
  }
  return aliases.some((candidate) => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').test(
      text,
    );
  });
}

function candidatesFromBullet(text) {
  const found = new Set();
  for (const phrase of MULTIWORD_SKILLS) {
    if (mentioned(text, phrase)) found.add(canonicalSkill(phrase));
  }
  const tokenPattern =
    /(?<![\p{L}\p{N}])([A-Z][A-Za-z0-9]*(?:[.+#][A-Za-z0-9+#]*)*|[A-Z]{2,})(?![\p{L}\p{N}])/gu;
  for (const match of text.matchAll(tokenPattern)) {
    const candidate = canonicalSkill(match[1]);
    if (
      candidate.length > 1 &&
      !STOPWORDS.has(candidate.toLowerCase()) &&
      !/^\d/.test(candidate)
    ) {
      found.add(candidate);
    }
  }
  return [...found];
}

export function extractJdRequirements(jdText) {
  const requirements = [];
  const lines = String(jdText).split(/\r?\n/);
  let inRequirements = false;
  let importance = 'must-have';
  let heading = '';
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^#{1,5}\s+/.test(line)) {
      if (REQUIREMENT_HEADING.test(line)) {
        inRequirements = true;
        importance = NICE_HEADING.test(line) ? 'nice-to-have' : 'must-have';
        heading = line.replace(/^#{1,5}\s+/, '').trim();
      } else {
        inRequirements = false;
      }
      continue;
    }
    if (!inRequirements) continue;
    const bullet = line.match(BULLET);
    if (!bullet) continue;
    for (const skill of candidatesFromBullet(bullet[1])) {
      requirements.push({
        skill,
        importance,
        requirement: bullet[1].trim(),
        heading,
        line: index + 1,
      });
    }
  }

  const byKey = new Map();
  for (const item of requirements) {
    const key = skillKey(item.skill);
    const existing = byKey.get(key);
    if (!existing || existing.importance === 'nice-to-have') {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

export function splitCvSkillsSection(cvText) {
  const lines = String(cvText).split(/\r?\n/);
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^#{1,5}\s+(?:technical\s+)?skills\s*$/i.test(lines[index])) {
      start = index + 1;
      break;
    }
  }
  if (start < 0) return { namedSkillsText: '', proseText: cvText };
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    if (/^#{1,5}\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return {
    namedSkillsText: lines.slice(start, end).join('\n'),
    proseText: [...lines.slice(0, start - 1), ...lines.slice(end)].join('\n'),
  };
}

export function createSkillGapReport({ jdText, cvText, jdPath, cvPath }) {
  const requirements = extractJdRequirements(jdText);
  const { namedSkillsText, proseText } = splitCvSkillsSection(cvText);
  const classified = requirements.map((item) => ({
    ...item,
    classification: mentioned(namedSkillsText, item.skill)
      ? 'existing'
      : mentioned(proseText, item.skill)
        ? 'supported-by-resume'
        : 'gap',
  }));
  const counts = {
    total: classified.length,
    existing: classified.filter((item) => item.classification === 'existing')
      .length,
    supportedByResume: classified.filter(
      (item) => item.classification === 'supported-by-resume',
    ).length,
    gap: classified.filter((item) => item.classification === 'gap').length,
    mustHaveGaps: classified.filter(
      (item) =>
        item.classification === 'gap' && item.importance === 'must-have',
    ).length,
  };
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      jdPath,
      jdSha256: createHash('sha256').update(jdText).digest('hex'),
      cvPath,
      cvSha256: createHash('sha256').update(cvText).digest('hex'),
    },
    counts,
    requirements: classified,
    warning:
      requirements.length === 0
        ? 'No explicit skill tokens were found in requirement-style sections.'
        : null,
    policy: {
      zeroLlm: true,
      autoAddClaims: false,
    },
  };
}

export function renderSkillGapMarkdown(report) {
  const rows = report.requirements.map(
    (item) =>
      `| ${item.skill.replaceAll('|', '\\|')} | ${item.importance} | ${item.classification} | ${item.line} |`,
  );
  return [
    '# JD Skill-Gap Preflight',
    '',
    `- JD: \`${report.sources.jdPath}\``,
    `- CV: \`${report.sources.cvPath}\``,
    `- Skills checked: ${report.counts.total}`,
    `- Must-have gaps: ${report.counts.mustHaveGaps}`,
    '- Policy: zero LLM; no claims are added automatically',
    '',
    '| Skill | Importance | Classification | JD line |',
    '| --- | --- | --- | ---: |',
    ...rows,
    '',
    ...(report.warning ? [`> ${report.warning}`, ''] : []),
  ].join('\n');
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, json: false };
  for (const value of argv) {
    if (value.startsWith('--root=')) {
      options.root = resolve(value.slice('--root='.length));
    } else if (value.startsWith('--cv=')) {
      options.cvPath = value.slice('--cv='.length);
    } else if (value.startsWith('--output=')) {
      options.output = value.slice('--output='.length);
    } else if (value === '--json') {
      options.json = true;
    } else if (value === '--help' || value === '-h') {
      options.help = true;
    } else if (!value.startsWith('--') && !options.jdPath) {
      options.jdPath = value;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return options;
}

function relativeLabel(root, path) {
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

export function runSkillGapCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help || !options.jdPath) {
    console.log(`Usage:
  node scripts/jd-skill-gap.mjs <jd-file> [--cv=profile/cv.md]
    [--output=reports/skill-gap.json|.md] [--json] [--root=PATH]`);
    return options.help ? 0 : 1;
  }
  const root = resolve(options.root);
  const jdPath = assertContainedPath(root, options.jdPath, {
    mustExist: true,
    label: 'JD path',
  });
  const requestedCv = options.cvPath || 'profile/cv.md';
  const cvPath = assertContainedPath(root, requestedCv, {
    mustExist: true,
    label: 'CV path',
  });
  const report = createSkillGapReport({
    jdText: readFileSync(jdPath, 'utf8'),
    cvText: readFileSync(cvPath, 'utf8'),
    jdPath: relativeLabel(root, jdPath),
    cvPath: relativeLabel(root, cvPath),
  });

  if (options.output) {
    const reportsRoot = ensureContainedDirectory(root, 'reports');
    const requestedOutput = String(options.output)
      .replaceAll('\\', '/')
      .startsWith('reports/')
      ? resolve(root, options.output)
      : resolve(reportsRoot, options.output);
    const output = assertContainedPath(reportsRoot, requestedOutput, {
      label: 'Skill-gap output',
    });
    const extension = extname(output).toLowerCase();
    if (!['.json', '.md'].includes(extension)) {
      throw new Error('Skill-gap output must end in .json or .md');
    }
    ensureContainedDirectory(reportsRoot, dirname(output), { allowRoot: true });
    writeFileSync(
      output,
      extension === '.json'
        ? `${JSON.stringify(report, null, 2)}\n`
        : renderSkillGapMarkdown(report),
      { encoding: 'utf8', mode: 0o600 },
    );
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderSkillGapMarkdown(report));
  }
  return 0;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    process.exitCode = runSkillGapCli();
  } catch (error) {
    console.error(`JD skill-gap preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}

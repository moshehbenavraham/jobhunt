#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as yamlModule from 'js-yaml';
import { assertContainedPath } from './path-policy.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');
const yaml = yamlModule.default || yamlModule;

const TEMPLATE_KINDS = {
  cv: {
    prefix: 'cv-template',
    formats: new Set(['html', 'tex']),
    requiredByFormat: {
      html: [
        'LANG',
        'PAGE_WIDTH',
        'DOCUMENT_TITLE',
        'NAME',
        'CONTACT_ITEMS',
        'SUMMARY_SECTION',
        'COMPETENCIES_SECTION',
        'EXPERIENCE_SECTION',
        'PROJECTS_SECTION',
        'EDUCATION_SECTION',
        'CERTIFICATIONS_SECTION',
        'SKILLS_SECTION',
      ],
      tex: [
        'NAME',
        'CONTACT_LINE',
        'EMAIL_URL',
        'EMAIL_DISPLAY',
        'LINKEDIN_URL',
        'LINKEDIN_DISPLAY',
        'GITHUB_URL',
        'GITHUB_DISPLAY',
        'SUMMARY_SECTION',
        'COMPETENCIES_SECTION',
        'EXPERIENCE_SECTION',
        'PROJECTS_SECTION',
        'EDUCATION_SECTION',
        'SKILLS_SECTION',
      ],
    },
    profilePaths: [
      ['documents', 'cv_template'],
      ['cv', 'template'],
    ],
  },
  'cover-letter': {
    prefix: 'cover-letter-template',
    formats: new Set(['html']),
    requiredByFormat: {
      html: [
        'LANGUAGE',
        'NAME',
        'CONTACT_LINE',
        'ROLE',
        'COMPANY',
        'DATELINE',
        'GREETING',
        'PARAGRAPHS',
        'SIGN_OFF',
      ],
    },
    profilePaths: [
      ['documents', 'cover_letter_template'],
      ['cover_letter', 'template'],
    ],
  },
};

function kindConfig(kind) {
  const config = TEMPLATE_KINDS[kind];
  if (!config) throw new Error(`Unknown document template kind: ${kind}`);
  return config;
}

function normalizeName(value) {
  const name = String(value || 'standard')
    .normalize('NFKC')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error(`Invalid template name: ${value}`);
  }
  return name;
}

function assertFormat(config, format) {
  if (!config.formats.has(format)) {
    throw new Error(`Unsupported template format: ${format}`);
  }
}

function filenameFor(config, name, format) {
  return name === 'standard'
    ? `${config.prefix}.${format}`
    : `${config.prefix}.${name}.${format}`;
}

function parseFilename(config, filename) {
  const escaped = config.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = filename.match(
    new RegExp(`^${escaped}(?:\\.([a-z0-9]+(?:-[a-z0-9]+)*))?\\.(html|tex)$`),
  );
  return match
    ? { name: match[1] || 'standard', format: match[2] }
    : null;
}

function templateTokens(text) {
  return [
    ...new Set(
      [...text.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

export function validateDocumentTemplate(path, kind, format = 'html') {
  const config = kindConfig(kind);
  assertFormat(config, format);
  const content = readFileSync(path, 'utf8');
  const tokens = templateTokens(content);
  const missing = config.requiredByFormat[format].filter(
    (token) => !tokens.includes(token),
  );
  return {
    valid: missing.length === 0,
    missing,
    tokens,
  };
}

function profileValue(document, paths) {
  for (const path of paths) {
    let value = document;
    for (const segment of path) value = value?.[segment];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function loadTemplateDefault({
  root = DEFAULT_ROOT,
  kind,
  profilePath = 'config/profile.yml',
} = {}) {
  const config = kindConfig(kind);
  const absoluteRoot = resolve(root);
  if (!existsSync(absoluteRoot)) return null;
  const absoluteProfile = assertContainedPath(absoluteRoot, profilePath, {
    mustExist: false,
    label: 'Profile path',
  });
  if (!existsSync(absoluteProfile)) return null;
  let document;
  try {
    document = yaml.load(readFileSync(absoluteProfile, 'utf8')) || {};
  } catch (error) {
    throw new Error(`Invalid profile YAML for template selection: ${error.message}`);
  }
  const value = profileValue(document, config.profilePaths);
  return value ? normalizeName(value) : null;
}

function resolveExplicitPath(root, templatesRoot, value) {
  if (isAbsolute(value)) return resolve(value);
  if (String(value).replaceAll('\\', '/').startsWith('templates/')) {
    return resolve(root, value);
  }
  return resolve(templatesRoot, value);
}

export function resolveDocumentTemplate({
  root = DEFAULT_ROOT,
  kind,
  name,
  format = 'html',
  explicitPath,
  fallback = false,
  profilePath = 'config/profile.yml',
} = {}) {
  const config = kindConfig(kind);
  assertFormat(config, format);
  const absoluteRoot = resolve(root);
  const templatesRoot = resolve(absoluteRoot, 'templates');
  if (!existsSync(templatesRoot)) {
    throw new Error(`Templates directory does not exist: ${templatesRoot}`);
  }

  let selectedName;
  let candidate;
  if (explicitPath) {
    candidate = resolveExplicitPath(absoluteRoot, templatesRoot, explicitPath);
    const parsed = parseFilename(config, basename(candidate));
    selectedName = parsed?.name || 'explicit';
    if (extname(candidate).slice(1).toLowerCase() !== format) {
      throw new Error(`Template must use the .${format} extension`);
    }
  } else {
    selectedName = normalizeName(
      name ||
        loadTemplateDefault({
          root: absoluteRoot,
          kind,
          profilePath,
        }) ||
        'standard',
    );
    candidate = resolve(
      templatesRoot,
      filenameFor(config, selectedName, format),
    );
    if (!existsSync(candidate) && fallback && selectedName !== 'standard') {
      selectedName = 'standard';
      candidate = resolve(
        templatesRoot,
        filenameFor(config, selectedName, format),
      );
    }
  }

  const path = assertContainedPath(templatesRoot, candidate, {
    mustExist: true,
    label: 'Template path',
  });
  const validation = validateDocumentTemplate(path, kind, format);
  if (!validation.valid) {
    throw new Error(
      `Template ${basename(path)} is missing required placeholders: ${validation.missing
        .map((token) => `{{${token}}}`)
        .join(', ')}`,
    );
  }
  return {
    kind,
    name: selectedName,
    format,
    path,
    validation,
  };
}

export function listDocumentTemplates({
  root = DEFAULT_ROOT,
  kind,
  format = 'html',
} = {}) {
  const config = kindConfig(kind);
  assertFormat(config, format);
  const templatesRoot = resolve(root, 'templates');
  if (!existsSync(templatesRoot)) return [];
  const templates = [];
  for (const entry of readdirSync(templatesRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const parsed = parseFilename(config, entry.name);
    if (!parsed || parsed.format !== format) continue;
    try {
      const resolved = resolveDocumentTemplate({
        root,
        kind,
        name: parsed.name,
        format,
      });
      templates.push({
        name: parsed.name,
        format,
        path: resolved.path,
        valid: true,
      });
    } catch (error) {
      templates.push({
        name: parsed.name,
        format,
        path: resolve(templatesRoot, entry.name),
        valid: false,
        error: error.message,
      });
    }
  }
  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

function usage() {
  return `Usage:
  node scripts/document-templates.mjs list <cv|cover-letter> [--format=html|tex] [--root=PATH]
  node scripts/document-templates.mjs resolve <cv|cover-letter> [name] [--format=html|tex] [--fallback] [--root=PATH]`;
}

function runCli(argv = process.argv.slice(2)) {
  const [command, kind, ...rest] = argv;
  if (!command || !kind || argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return command || kind ? 0 : 1;
  }
  const positional = rest.filter((value) => !value.startsWith('--'));
  const option = (prefix) =>
    rest.find((value) => value.startsWith(prefix))?.slice(prefix.length);
  const root = option('--root=') || DEFAULT_ROOT;
  const format = option('--format=') || 'html';

  if (command === 'list') {
    console.log(
      JSON.stringify(listDocumentTemplates({ root, kind, format }), null, 2),
    );
    return 0;
  }
  if (command === 'resolve') {
    const resolved = resolveDocumentTemplate({
      root,
      kind,
      name: positional[0],
      format,
      fallback: rest.includes('--fallback'),
    });
    console.log(JSON.stringify(resolved, null, 2));
    return 0;
  }
  throw new Error(usage());
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

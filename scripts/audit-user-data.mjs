#!/usr/bin/env node

/**
 * Fail closed when a commit contains user-owned artifacts, likely private
 * career documents, credentials, or high-confidence secrets.
 *
 * Only Git-tracked files are audited. Local ignored user data remains private
 * and does not create false positives.
 */

import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

const USER_LAYER_PREFIXES = new Set([
  '.jobhunt-app',
  'profile',
  'config',
  'data',
  'reports',
  'output',
  'jds',
  'interview-prep',
  'offers',
]);

const GENERATED_BATCH_PREFIXES = [
  'batch/logs/',
  'batch/tracker-additions/',
  'batch/results/',
];

const GENERATED_BATCH_FILES = new Set([
  'batch/batch-input.tsv',
  'batch/batch-state.tsv',
]);

const LEGACY_USER_FILES = new Set([
  'article-digest.md',
  'cv.md',
  'portals.yml',
]);

const PUBLIC_CONTACT_PATHS = new Set([
  '.github/SECURITY.md',
  'docs/CODE_OF_CONDUCT.md',
  'docs/SECURITY.md',
  'docs/SUPPORT.md',
]);

const TEXT_EXTENSIONS = new Set([
  '',
  '.bash',
  '.cjs',
  '.conf',
  '.css',
  '.csv',
  '.env',
  '.go',
  '.html',
  '.ini',
  '.js',
  '.json',
  '.jsonl',
  '.jsx',
  '.md',
  '.mjs',
  '.properties',
  '.sh',
  '.tex',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
  '.zsh',
]);

const PRIVATE_DOCUMENT_EXTENSIONS = new Set([
  '.doc',
  '.docx',
  '.md',
  '.odt',
  '.pdf',
  '.rtf',
  '.tex',
  '.txt',
]);

const SECRET_PATTERNS = [
  {
    id: 'private-key',
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g,
  },
  { id: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  {
    id: 'github-token',
    pattern:
      /\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/g,
  },
  {
    id: 'google-api-key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: 'openai-api-key',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: 'slack-token',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    id: 'stripe-live-key',
    pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g,
  },
  {
    id: 'npm-token',
    pattern: /\bnpm_[A-Za-z0-9]{30,}\b/g,
  },
  {
    id: 'credential-value',
    pattern:
      /\b(?:access[_-]?token|refresh[_-]?token|api[_-]?key|client[_-]?secret|password)\b["']?\s*[:=]\s*["']([A-Za-z0-9._~+/-]{20,})["']/gi,
    accept(match) {
      return !/(?:agents|dummy|example|expired|fake|fixture|mock|placeholder|test)/i.test(
        match[1],
      );
    },
  },
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi;
const PHONE_FIELD_PATTERN =
  /\b(?:mobile|phone|telephone)\b["']?\s*[:=]\s*["']?\+?[0-9][0-9 ()-]{8,}[0-9]/gi;

function normalizeTrackedPath(value) {
  const normalized = String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '');
  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    normalized.split('/').some((part) => part === '..')
  ) {
    return null;
  }
  return normalized;
}

function isScaffoldPath(path) {
  const name = basename(path).toLowerCase();
  return (
    name === '.gitkeep' ||
    /^readme(?:[-_.].*)?\.md$/.test(name) ||
    /(?:^|[-_.])(?:example|template)(?:[-_.]|$)/.test(name)
  );
}

function isSyntheticContentPath(path) {
  const normalized = path.toLowerCase();
  const name = basename(normalized);
  return (
    isScaffoldPath(path) ||
    normalized.startsWith('docs/examples/') ||
    normalized.includes('/test-fixtures/') ||
    /^test[-_.]/.test(name) ||
    name.endsWith('_test.go')
  );
}

function classifyUserArtifact(path) {
  if (LEGACY_USER_FILES.has(path)) {
    return 'legacy-user-artifact';
  }

  if (
    GENERATED_BATCH_FILES.has(path) ||
    GENERATED_BATCH_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    return isScaffoldPath(path) ? null : 'generated-user-artifact';
  }

  const [topLevel] = path.split('/');
  if (!USER_LAYER_PREFIXES.has(topLevel)) return null;
  if (isScaffoldPath(path)) return null;
  return 'user-layer-artifact';
}

function classifySensitivePath(path) {
  const lower = path.toLowerCase();
  const name = basename(lower);
  const extension = extname(name);

  if (
    name === '.env' ||
    name.startsWith('.env.') ||
    name === '.npmrc' ||
    name === '.pypirc' ||
    name === 'credentials.json' ||
    name === 'secrets.json' ||
    name === 'id_rsa' ||
    name === 'id_ed25519' ||
    extension === '.pem' ||
    extension === '.key' ||
    extension === '.p12' ||
    extension === '.pfx'
  ) {
    return 'credential-file';
  }

  if (
    PRIVATE_DOCUMENT_EXTENSIONS.has(extension) &&
    /(?:^|[-_. ])(?:cv|resume|résumé|curriculum|transcript|offer[-_. ]?letter|passport|identity[-_. ]?card|id[-_. ]?card)(?:[-_. ]|$)/i.test(
      name,
    ) &&
    !isSyntheticContentPath(path)
  ) {
    return 'private-career-document';
  }

  return null;
}

function lineNumberAt(content, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (content.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function addPatternFindings(findings, path, content, rule) {
  const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
  for (const match of content.matchAll(pattern)) {
    if (rule.accept && !rule.accept(match)) continue;
    findings.push({
      path,
      category: 'secret',
      rule: rule.id,
      line: lineNumberAt(content, match.index),
      message: `high-confidence ${rule.id} material`,
    });
  }
}

function addPiiFindings(findings, path, content) {
  if (isSyntheticContentPath(path) || PUBLIC_CONTACT_PATHS.has(path)) return;

  const emailPattern = new RegExp(EMAIL_PATTERN.source, EMAIL_PATTERN.flags);
  for (const emailMatch of content.matchAll(emailPattern)) {
    const domain = emailMatch[1].toLowerCase();
    if (['example.com', 'example.net', 'example.org'].includes(domain)) {
      continue;
    }
    findings.push({
      path,
      category: 'pii',
      rule: 'non-example-email',
      line: lineNumberAt(content, emailMatch.index),
      message:
        'non-example email address outside an approved public-contact file',
    });
  }

  const phonePattern = new RegExp(
    PHONE_FIELD_PATTERN.source,
    PHONE_FIELD_PATTERN.flags,
  );
  for (const phoneMatch of content.matchAll(phonePattern)) {
    findings.push({
      path,
      category: 'pii',
      rule: 'phone-field',
      line: lineNumberAt(content, phoneMatch.index),
      message: 'phone number assigned to an identity field',
    });
  }
}

function shouldReadAsText(path) {
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase());
}

export function auditTrackedFiles({
  files,
  readFile,
  isSymlink = () => false,
  maxFileBytes = DEFAULT_MAX_BYTES,
}) {
  const findings = [];
  const seen = new Set();

  for (const value of files) {
    const path = normalizeTrackedPath(value);
    if (!path) {
      findings.push({
        path: String(value || '<empty>'),
        category: 'path',
        rule: 'invalid-tracked-path',
        message: 'invalid or escaping tracked path',
      });
      continue;
    }
    if (seen.has(path)) continue;
    seen.add(path);

    const artifactRule = classifyUserArtifact(path);
    if (artifactRule) {
      findings.push({
        path,
        category: 'user-data',
        rule: artifactRule,
        message: 'user-owned or generated artifact must remain untracked',
      });
    }

    const sensitiveRule = artifactRule ? null : classifySensitivePath(path);
    if (sensitiveRule) {
      findings.push({
        path,
        category: 'private-document',
        rule: sensitiveRule,
        message: 'likely private career or credential document',
      });
    }

    if (isSymlink(path)) {
      findings.push({
        path,
        category: 'path',
        rule: 'tracked-symlink',
        message: 'tracked symlinks can expose files outside the repository',
      });
      continue;
    }

    if (!shouldReadAsText(path)) continue;
    let bytes;
    try {
      bytes = readFile(path);
    } catch (error) {
      findings.push({
        path,
        category: 'audit',
        rule: 'unreadable-tracked-file',
        message: `tracked file could not be audited: ${error.message}`,
      });
      continue;
    }

    const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes));
    if (buffer.length > maxFileBytes || buffer.includes(0)) continue;
    const content = buffer.toString('utf8');

    for (const rule of SECRET_PATTERNS) {
      addPatternFindings(findings, path, content, rule);
    }
    addPiiFindings(findings, path, content);
  }

  findings.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      (a.line || 0) - (b.line || 0) ||
      a.rule.localeCompare(b.rule),
  );
  return {
    valid: findings.length === 0,
    filesAudited: seen.size,
    findings,
  };
}

function parseArgs(argv) {
  const options = {
    json: false,
    root: resolve(fileURLToPath(import.meta.url), '../..'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--json') {
      options.json = true;
    } else if (value === '--root') {
      if (!argv[index + 1]) throw new Error('--root requires a path');
      options.root = resolve(argv[index + 1]);
      index += 1;
    } else if (value === '--help' || value === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${value}`);
    }
  }
  return options;
}

function trackedFiles(root) {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  return output.toString('utf8').split('\0').filter(Boolean);
}

function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(`Usage: node scripts/audit-user-data.mjs [--json] [--root PATH]

Audits Git-tracked files for user-owned artifacts, private career documents,
PII, credentials, and high-confidence secrets. Secret values are never printed.`);
    return 0;
  }

  const files = trackedFiles(options.root);
  const result = auditTrackedFiles({
    files,
    readFile(path) {
      return readFileSync(resolve(options.root, path));
    },
    isSymlink(path) {
      return lstatSync(resolve(options.root, path)).isSymbolicLink();
    },
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.valid) {
    console.log(
      `User-data audit passed: ${result.filesAudited} tracked files checked.`,
    );
  } else {
    console.error(
      `User-data audit failed with ${result.findings.length} finding(s):`,
    );
    for (const finding of result.findings) {
      const location = finding.line
        ? `${finding.path}:${finding.line}`
        : finding.path;
      console.error(`- ${location} [${finding.rule}] ${finding.message}`);
    }
    console.error('Secret values are intentionally redacted.');
  }
  return result.valid ? 0 : 1;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error(`User-data audit error: ${error.message}`);
    process.exitCode = 2;
  }
}

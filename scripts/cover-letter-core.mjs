import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import * as z from 'zod';
import { escapeHtml } from './cv-build-core.mjs';

export const COVER_LETTER_BUILD_SCHEMA_VERSION = 1;
export const DEFAULT_COVER_LETTER_SOURCE_FILES = [
  'profile/cv.md',
  'config/profile.yml',
  'modes/_profile.md',
];

const evidenceIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/i,
    'evidence IDs may contain letters, numbers, dots, underscores, and dashes',
  );

const relativeSourcePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !isAbsolute(value) &&
      !value.split(/[\\/]+/).some((part) => part === '..'),
    'source paths must stay inside the project',
  );

const evidenceSourceSchema = z.union([
  z.literal('job.jd'),
  relativeSourcePathSchema,
]);

const evidenceSchema = z
  .object({
    id: evidenceIdSchema,
    source: evidenceSourceSchema,
    locator: z.string().min(1).optional(),
    sourceText: z.string().min(1),
  })
  .strict();

const paragraphSchema = z
  .object({
    kind: z.enum(['motivation', 'evidence', 'fit', 'approach', 'closing']),
    text: z.string().min(1),
    evidenceIds: z.array(evidenceIdSchema).default([]),
  })
  .strict()
  .superRefine((paragraph, ctx) => {
    if (paragraph.kind !== 'closing' && paragraph.evidenceIds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['evidenceIds'],
        message: `${paragraph.kind} paragraphs need at least one evidence ID`,
      });
    }
  });

export const CoverLetterBuildSchema = z
  .object({
    schemaVersion: z.literal(COVER_LETTER_BUILD_SCHEMA_VERSION),
    candidate: z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1).optional(),
        location: z.string().min(1).optional(),
        linkedin: z.string().min(1).optional(),
        github: z.string().min(1).optional(),
      })
      .strict(),
    job: z
      .object({
        company: z.string().min(1),
        role: z.string().min(1),
        location: z.string().min(1).optional(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must use YYYY-MM-DD'),
        language: z.string().min(2).default('en'),
        format: z.enum(['letter', 'a4']).default('a4'),
        jdText: z.string().min(40),
      })
      .strict(),
    application: z
      .object({
        trigger: z.enum([
          'explicit-user-request',
          'form-required',
          'form-optional',
          'strong-fit-policy',
        ]),
        fieldStatus: z.enum(['required', 'optional', 'not-present', 'unknown']),
      })
      .strict(),
    letter: z
      .object({
        greeting: z.string().min(1),
        paragraphs: z.array(paragraphSchema).min(3).max(6),
        signOff: z.string().min(1).default('Sincerely,'),
      })
      .strict(),
    evidence: z.array(evidenceSchema).min(1),
    sourceFiles: z
      .array(relativeSourcePathSchema)
      .min(1)
      .default(DEFAULT_COVER_LETTER_SOURCE_FILES),
    review: z
      .object({
        humanReviewRequired: z.literal(true),
      })
      .strict()
      .default({ humanReviewRequired: true }),
  })
  .strict()
  .superRefine((build, ctx) => {
    addDuplicateIssues(
      build.evidence.map((item) => item.id),
      ['evidence'],
      'duplicate evidence ID',
      ctx,
    );
    addDuplicateIssues(
      build.sourceFiles,
      ['sourceFiles'],
      'duplicate source file',
      ctx,
    );

    const evidenceIds = new Set(build.evidence.map((item) => item.id));
    build.letter.paragraphs.forEach((paragraph, paragraphIndex) => {
      paragraph.evidenceIds.forEach((id, evidenceIndex) => {
        if (!evidenceIds.has(id)) {
          ctx.addIssue({
            code: 'custom',
            path: [
              'letter',
              'paragraphs',
              paragraphIndex,
              'evidenceIds',
              evidenceIndex,
            ],
            message: `unknown evidence ID: ${id}`,
          });
        }
      });
    });

    const closingIndexes = build.letter.paragraphs
      .map((paragraph, index) => (paragraph.kind === 'closing' ? index : -1))
      .filter((index) => index >= 0);
    if (closingIndexes.length > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['letter', 'paragraphs'],
        message: 'only one closing paragraph is allowed',
      });
    }
    if (
      closingIndexes.length === 1 &&
      closingIndexes[0] !== build.letter.paragraphs.length - 1
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['letter', 'paragraphs', closingIndexes[0], 'kind'],
        message: 'the closing paragraph must be last',
      });
    }

    const sourceFiles = new Set(build.sourceFiles);
    for (const [index, item] of build.evidence.entries()) {
      if (item.source !== 'job.jd' && !sourceFiles.has(item.source)) {
        ctx.addIssue({
          code: 'custom',
          path: ['evidence', index, 'source'],
          message: `evidence source must be listed in sourceFiles: ${item.source}`,
        });
      }
    }

    for (const [index, paragraph] of build.letter.paragraphs.entries()) {
      if (/\{\{[^}]+\}\}/.test(paragraph.text)) {
        ctx.addIssue({
          code: 'custom',
          path: ['letter', 'paragraphs', index, 'text'],
          message: 'unresolved template placeholder found in letter content',
        });
      }
    }
  });

export function createCoverLetterBuildJsonSchema() {
  const schema = z.toJSONSchema(CoverLetterBuildSchema, {
    target: 'draft-2020-12',
  });
  schema.$id = 'https://jobhunt.local/templates/cover-letter-build.schema.json';
  schema.title = 'jobhunt deterministic cover letter build';
  return schema;
}

function addDuplicateIssues(values, path, message, ctx) {
  const seen = new Set();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: `${message}: ${value}`,
      });
    }
    seen.add(value);
  });
}

function resolveProjectPath(root, path) {
  const projectRoot = resolve(root);
  const absolute = resolve(projectRoot, path);
  const rel = relative(projectRoot, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Source path escapes project root: ${path}`);
  }
  return absolute;
}

function normalizeEvidenceText(value) {
  return String(value)
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}+#@.$%/-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeQuantity(value) {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '');
}

function extractQuantities(value) {
  const matches = String(value).match(
    /(?:[$€£]\s*)?\d[\d,.]*(?:\s*(?:\+|%|k|m|b))?/gi,
  );
  return [...new Set((matches || []).map(normalizeQuantity))];
}

function buildEvidenceSource(build, item, sourceCache) {
  if (item.source === 'job.jd') return build.job.jdText;
  return sourceCache.get(item.source);
}

export async function validateCoverLetterEvidence(build, options = {}) {
  const root = options.root || process.cwd();
  const sourceCache = new Map();
  const issues = [];

  for (const source of build.sourceFiles) {
    try {
      sourceCache.set(
        source,
        await readFile(resolveProjectPath(root, source), 'utf8'),
      );
    } catch (error) {
      issues.push(`Cannot read source file ${source}: ${error.message}`);
    }
  }

  const profileText = sourceCache.get('config/profile.yml');
  if (!profileText) {
    issues.push(
      'config/profile.yml must be listed and readable to verify candidate identity',
    );
  } else {
    const normalizedProfile = normalizeEvidenceText(profileText);
    for (const [label, value] of [
      ['candidate name', build.candidate.name],
      ['candidate email', build.candidate.email],
    ]) {
      if (!normalizedProfile.includes(normalizeEvidenceText(value))) {
        issues.push(`${label} was not found in config/profile.yml`);
      }
    }
  }

  for (const item of build.evidence) {
    const content = buildEvidenceSource(build, item, sourceCache);
    if (content === undefined) continue;
    if (
      !normalizeEvidenceText(content).includes(
        normalizeEvidenceText(item.sourceText),
      )
    ) {
      issues.push(
        `Evidence ${item.id} sourceText was not found in ${item.source}`,
      );
    }
  }

  const evidenceById = new Map(build.evidence.map((item) => [item.id, item]));
  for (const [index, paragraph] of build.letter.paragraphs.entries()) {
    const evidenceText = paragraph.evidenceIds
      .map((id) => evidenceById.get(id)?.sourceText || '')
      .join(' ');
    const normalizedEvidence = normalizeQuantity(evidenceText);
    for (const quantity of extractQuantities(paragraph.text)) {
      if (!normalizedEvidence.includes(quantity)) {
        issues.push(
          `Paragraph ${index + 1} contains quantity "${quantity}" not present in its evidence`,
        );
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    verifiedEvidenceCount: build.evidence.length,
    verifiedParagraphCount: build.letter.paragraphs.length,
  };
}

export async function parseAndValidateCoverLetterBuild(raw, options = {}) {
  const build = CoverLetterBuildSchema.parse(raw);
  const evidence = await validateCoverLetterEvidence(build, options);
  if (!evidence.valid) {
    throw new Error(
      `Cover letter evidence validation failed:\n- ${evidence.issues.join('\n- ')}`,
    );
  }
  return { build, evidence };
}

function safeUrl(value) {
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function shortUrl(value) {
  return String(value)
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
}

function contactHtml(candidate) {
  const parts = [];
  if (candidate.location) {
    parts.push(
      `<span class="contact-item">${escapeHtml(candidate.location)}</span>`,
    );
  }
  parts.push(
    `<a class="contact-item" href="mailto:${escapeHtml(candidate.email)}">${escapeHtml(candidate.email)}</a>`,
  );
  if (candidate.phone) {
    parts.push(
      `<span class="contact-item">${escapeHtml(candidate.phone)}</span>`,
    );
  }
  for (const value of [candidate.linkedin, candidate.github]) {
    const url = safeUrl(value);
    if (url) {
      parts.push(
        `<a class="contact-item" href="${escapeHtml(url)}">${escapeHtml(shortUrl(value))}</a>`,
      );
    }
  }
  return parts.join('<span class="contact-separator"> | </span>');
}

function contactMarkdown(candidate) {
  const parts = [];
  if (candidate.location) parts.push(escapeMarkdownInline(candidate.location));
  parts.push(`[${candidate.email}](mailto:${candidate.email})`);
  if (candidate.phone) parts.push(escapeMarkdownInline(candidate.phone));
  for (const value of [candidate.linkedin, candidate.github]) {
    const url = safeUrl(value);
    if (url) parts.push(`[${escapeMarkdownInline(shortUrl(value))}](${url})`);
  }
  return parts.join(' | ');
}

function escapeMarkdownInline(value) {
  return String(value).replace(/([\\`*_[\]<>])/g, '\\$1');
}

function htmlParagraphs(build) {
  return build.letter.paragraphs
    .map(
      (paragraph) =>
        `<p data-evidence-ids="${escapeHtml(paragraph.evidenceIds.join(' '))}">${escapeHtml(paragraph.text)}</p>`,
    )
    .join('\n');
}

export function renderCoverLetterHtml(build, template) {
  const dateline = [build.job.date, build.job.location]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' | ');
  const replacements = {
    '{{LANGUAGE}}': escapeHtml(build.job.language),
    '{{NAME}}': escapeHtml(build.candidate.name),
    '{{CONTACT_LINE}}': contactHtml(build.candidate),
    '{{ROLE}}': escapeHtml(build.job.role),
    '{{COMPANY}}': escapeHtml(build.job.company),
    '{{DATELINE}}': dateline,
    '{{GREETING}}': escapeHtml(build.letter.greeting),
    '{{PARAGRAPHS}}': htmlParagraphs(build),
    '{{SIGN_OFF}}': escapeHtml(build.letter.signOff),
  };
  return template.replace(
    /\{\{[A-Z_]+\}\}/g,
    (token) => replacements[token] ?? token,
  );
}

export function renderCoverLetterMarkdown(build) {
  const dateline = [build.job.date, build.job.location]
    .filter(Boolean)
    .map(escapeMarkdownInline)
    .join(' | ');
  const paragraphs = build.letter.paragraphs
    .map((paragraph) => escapeMarkdownInline(paragraph.text))
    .join('\n\n');
  return [
    `# ${escapeMarkdownInline(build.candidate.name)}`,
    '',
    contactMarkdown(build.candidate),
    '',
    `## Cover Letter: ${escapeMarkdownInline(build.job.role)} at ${escapeMarkdownInline(build.job.company)}`,
    '',
    dateline,
    '',
    escapeMarkdownInline(build.letter.greeting),
    '',
    paragraphs,
    '',
    escapeMarkdownInline(build.letter.signOff),
    '',
    escapeMarkdownInline(build.candidate.name),
    '',
    '<!-- jobhunt: draft artifact; human review and editing required before submission -->',
    '',
  ].join('\n');
}

export function canonicalizeCoverLetterBuild(build) {
  return `${JSON.stringify(build, null, 2)}\n`;
}

export function slugifyCoverLetterPart(value, maxLength = 48) {
  const slug = String(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug || 'unknown';
}

export function defaultCoverLetterBase(build) {
  return [
    'cover-letter',
    slugifyCoverLetterPart(build.candidate.name),
    slugifyCoverLetterPart(build.job.company),
    slugifyCoverLetterPart(build.job.role),
    build.job.date,
  ].join('-');
}

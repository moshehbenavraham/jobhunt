#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';
import * as z from 'zod';
import {
  atomicWriteArtifact,
  resolveArtifactPath,
} from './artifact-policy.mjs';
import { assertContainedPath } from './path-policy.mjs';

export const APPLICATION_EMAIL_SCHEMA_VERSION = 1;

const relativeSourceSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      /^(?:profile|config|modes|reports|interview-prep)\//.test(value) &&
      !value.split(/[\\/]+/).includes('..'),
    'source must be an allowed project-relative path',
  );

const evidenceSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
    source: relativeSourceSchema,
    sourceText: z.string().min(1),
  })
  .strict();

const paragraphSchema = z
  .object({
    text: z.string().min(1).max(3000),
    evidenceIds: z.array(z.string().min(1)).max(20),
  })
  .strict();

export const ApplicationEmailDraftSchema = z
  .object({
    schemaVersion: z.literal(APPLICATION_EMAIL_SCHEMA_VERSION),
    reportId: z
      .string()
      .regex(/^\d{3,}$/)
      .nullable(),
    kind: z.enum([
      'hr_application',
      'recruiter_application',
      'referral_request',
      'cold_application',
      'confirmed_time_no_show',
      'ats_failure',
    ]),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(300),
    recipientName: z.string().min(1).max(200).nullable(),
    recipientEmail: z.string().email().nullable(),
    subject: z.string().min(1).max(200),
    greeting: z.string().min(1).max(300),
    paragraphs: z.array(paragraphSchema).min(2).max(8),
    signOff: z.string().min(1).max(100),
    evidence: z.array(evidenceSchema).min(1).max(100),
    sourceFiles: z.array(relativeSourceSchema).min(2).max(30),
    attachments: z.array(z.string().regex(/^output\/.+/)).max(10),
    humanReviewRequired: z.literal(true),
    sendPerformedByTool: z.literal(false),
  })
  .strict()
  .superRefine((draft, ctx) => {
    const ids = draft.evidence.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: 'evidence IDs must be unique',
      });
    }
    const available = new Set(ids);
    draft.paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraph.evidenceIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['paragraphs', paragraphIndex, 'evidenceIds'],
          message: 'every paragraph needs evidence',
        });
      }
      paragraph.evidenceIds.forEach((id, evidenceIndex) => {
        if (!available.has(id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['paragraphs', paragraphIndex, 'evidenceIds', evidenceIndex],
            message: `unknown evidence ID: ${id}`,
          });
        }
      });
    });
    const sources = new Set(draft.sourceFiles);
    draft.evidence.forEach((item, index) => {
      if (!sources.has(item.source)) {
        ctx.addIssue({
          code: 'custom',
          path: ['evidence', index, 'source'],
          message: 'evidence source must be listed in sourceFiles',
        });
      }
    });
    if (
      !draft.sourceFiles.includes('config/profile.yml') ||
      !draft.sourceFiles.includes('modes/_profile.md')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['sourceFiles'],
        message:
          'email drafts must include config/profile.yml and modes/_profile.md',
      });
    }
  });

function normalizeComparable(value) {
  return String(value).replace(/\r\n/g, '\n').normalize('NFKC');
}

function verifyEvidence(root, draft) {
  const contents = new Map();
  for (const source of draft.sourceFiles) {
    const path = assertContainedPath(root, resolve(root, source), {
      mustExist: true,
      label: 'Email evidence source',
    });
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`email source must be a regular file: ${source}`);
    }
    contents.set(source, normalizeComparable(readFileSync(path, 'utf8')));
  }
  for (const item of draft.evidence) {
    if (
      !contents.get(item.source).includes(normalizeComparable(item.sourceText))
    ) {
      throw new Error(
        `email evidence ${item.id} is not an exact excerpt of ${item.source}`,
      );
    }
  }
}

function validateAttachment(root, requested) {
  const output = resolve(root, 'output');
  const path = assertContainedPath(output, resolve(root, requested), {
    mustExist: true,
    label: 'Email attachment',
  });
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`attachment must be a regular output file: ${requested}`);
  }
  if (path.endsWith('.pdf')) {
    const manifest = path.replace(/\.pdf$/i, '.manifest.json');
    if (!existsSync(manifest)) {
      throw new Error(`PDF attachment manifest is missing: ${requested}`);
    }
    const parsed = JSON.parse(readFileSync(manifest, 'utf8'));
    if (parsed.validation?.valid !== true) {
      throw new Error(`PDF attachment manifest is invalid: ${requested}`);
    }
    if (lstatSync(manifest).mtimeMs < stat.mtimeMs) {
      throw new Error(`PDF attachment manifest is stale: ${requested}`);
    }
  }
  return requested;
}

function readContactBlock(root) {
  const profile = yaml.load(
    readFileSync(resolve(root, 'config/profile.yml'), 'utf8'),
  );
  return {
    name: String(profile?.candidate?.full_name || '').trim(),
    email: String(profile?.candidate?.email || '').trim(),
    location: String(profile?.candidate?.location || '').trim(),
    linkedin: String(profile?.candidate?.linkedin || '').trim(),
    portfolio: String(profile?.candidate?.portfolio_url || '').trim(),
  };
}

export function formatApplicationEmailDraft(draftInput, contact) {
  const draft = ApplicationEmailDraftSchema.parse(draftInput);
  const attachmentLines =
    draft.attachments.length > 0
      ? draft.attachments.map((path) => `- ${path}`)
      : ['- None'];
  const contactLines = [
    contact.name,
    contact.email,
    contact.location,
    contact.linkedin,
    contact.portfolio,
  ].filter(Boolean);
  return [
    `# Application Email Draft: ${draft.company} — ${draft.role}`,
    '',
    `**Schema:** ${draft.schemaVersion}`,
    `**Kind:** ${draft.kind}`,
    `**Recipient:** ${draft.recipientName || 'Not specified'}${draft.recipientEmail ? ` <${draft.recipientEmail}>` : ''}`,
    `**Subject:** ${draft.subject}`,
    '**Human review required:** yes',
    '**Sent by tool:** no',
    '',
    '---',
    '',
    draft.greeting,
    '',
    ...draft.paragraphs.flatMap((paragraph) => [paragraph.text, '']),
    draft.signOff,
    contact.name,
    '',
    '## Contact block',
    '',
    ...contactLines.map((line) => `- ${line}`),
    '',
    '## Attachment checklist',
    '',
    ...attachmentLines,
    '',
    '## Evidence',
    '',
    ...draft.evidence.map(
      (item) => `- \`${item.id}\` — ${item.source}: ${item.sourceText}`,
    ),
    '',
    '> Draft only. Review in your own voice, attach the selected files, and send manually.',
    '',
  ].join('\n');
}

function safeSlug(value) {
  const slug = String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('company name cannot form a safe slug');
  return slug;
}

function argument(argv, name) {
  return argv
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function usage() {
  return [
    'Usage: node scripts/application-email.mjs --input=draft.json',
    '  [--output=reports/042-company.application-email.md] [--force]',
    'Creates a draft artifact only. No send action exists.',
  ].join('\n');
}

export async function runApplicationEmailCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const input = argument(argv, '--input');
  if (!input) throw new Error(usage());
  const root = resolve(options.root || process.cwd());
  const draft = ApplicationEmailDraftSchema.parse(
    JSON.parse(readFileSync(resolve(input), 'utf8')),
  );
  verifyEvidence(root, draft);
  draft.attachments.forEach((path) => {
    validateAttachment(root, path);
  });
  const defaultName = `${draft.reportId ? `${draft.reportId}-` : ''}${safeSlug(draft.company)}.application-email.md`;
  const output = argument(argv, '--output') || `reports/${defaultName}`;
  const draftPath = resolveArtifactPath({
    root,
    directory: 'reports',
    requested: output,
    extensions: ['.md'],
    label: 'Application email draft',
  }).path;
  const manifestPath = draftPath.replace(/\.md$/, '.json');
  if (
    !argv.includes('--force') &&
    (existsSync(draftPath) || existsSync(manifestPath))
  ) {
    throw new Error('email draft already exists; use --force to replace it');
  }
  const contact = readContactBlock(root);
  await atomicWriteArtifact(
    draftPath,
    formatApplicationEmailDraft(draft, contact),
  );
  await atomicWriteArtifact(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: APPLICATION_EMAIL_SCHEMA_VERSION,
        artifact: `reports/${basename(draftPath)}`,
        kind: draft.kind,
        reportId: draft.reportId,
        sourceFiles: draft.sourceFiles,
        attachmentCount: draft.attachments.length,
        humanReviewRequired: true,
        sendPerformedByTool: false,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    JSON.stringify(
      {
        draft: `reports/${basename(draftPath)}`,
        manifest: `reports/${basename(manifestPath)}`,
        humanReviewRequired: true,
        sendPerformedByTool: false,
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
    process.exitCode = await runApplicationEmailCli();
  } catch (error) {
    console.error(`Application email draft failed: ${error.message}`);
    process.exitCode = 1;
  }
}

#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, readFileSync, rmSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as z from 'zod';
import { publishArtifactSet, resolveArtifactPath } from './artifact-policy.mjs';
import { assertContainedPath } from './path-policy.mjs';
import { writeFileAtomic } from './tracker-utils.mjs';

export const OFFER_PREP_SCHEMA_VERSION = 1;

const evidenceSchema = z
  .object({
    excerpt: z.string().min(1).max(2000),
    page: z.number().int().positive().nullable().default(null),
    label: z.string().min(1).max(200),
  })
  .strict();

const termSchema = z
  .object({
    type: z.enum([
      'base_salary',
      'bonus',
      'equity',
      'signing_bonus',
      'benefits',
      'location',
      'work_model',
      'employment_type',
      'start_date',
      'notice',
      'probation',
      'leave',
      'termination',
      'intellectual_property',
      'non_compete',
      'other',
    ]),
    value: z.string().min(1).max(1000),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullable()
      .default(null),
    evidence: evidenceSchema,
  })
  .strict();

const riskSchema = z
  .object({
    severity: z.enum(['low', 'medium', 'high']),
    topic: z.string().min(1).max(200),
    why: z.string().min(1).max(1200),
    evidence: evidenceSchema,
    needsProfessionalAdvice: z.boolean().default(false),
  })
  .strict();

export const OfferPrepSchema = z
  .object({
    schemaVersion: z.literal(OFFER_PREP_SCHEMA_VERSION),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(300),
    trackerNum: z.number().int().positive().nullable().default(null),
    offerDocument: z.string().min(1).max(500),
    extractedTextPath: z.string().min(1).max(500),
    terms: z.array(termSchema).min(1).max(100),
    risks: z.array(riskSchema).max(100),
    questions: z.array(z.string().min(1).max(1000)).max(50),
    priorities: z.array(z.string().min(1).max(1000)).max(30),
    negotiationDraft: z
      .object({
        subject: z.string().min(1).max(240),
        body: z.string().min(1).max(12000),
      })
      .strict(),
    humanReviewRequired: z.literal(true),
    sendPerformedByTool: z.literal(false),
    acceptancePerformedByTool: z.literal(false),
  })
  .strict();

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function regularContainedFile(root, requested, label) {
  const offersRoot = resolve(root, 'offers');
  const path = assertContainedPath(offersRoot, resolve(root, requested), {
    mustExist: true,
    label,
  });
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  return path;
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

export function renderOfferPrep(prep, source) {
  return `${[
    `# Offer Preparation: ${prep.company} — ${prep.role}`,
    '',
    `- Tracker: ${prep.trackerNum ? `#${prep.trackerNum}` : 'not linked'}`,
    `- Offer source: \`${source.offerDocument}\``,
    `- Source SHA-256: \`${source.offerSha256}\``,
    `- Extracted text: \`${source.extractedTextPath}\``,
    `- Extracted-text SHA-256: \`${source.extractedTextSha256}\``,
    '- Human review required: yes',
    '- Draft only: this tool cannot accept an offer or send a negotiation',
    '',
    '## Extracted Terms',
    '',
    '| Term | Value | Currency | Evidence | Page |',
    '| --- | --- | --- | --- | --- |',
    ...prep.terms.map(
      (term) =>
        `| ${term.type} | ${escapeCell(term.value)} | ${term.currency || '—'} | ${escapeCell(term.evidence.excerpt)} | ${term.evidence.page || '—'} |`,
    ),
    '',
    '## Risks and Ambiguities',
    '',
    ...(prep.risks.length
      ? prep.risks.map(
          (risk) =>
            `- **${risk.severity}: ${risk.topic}** — ${risk.why} Evidence: “${risk.evidence.excerpt}”${risk.needsProfessionalAdvice ? ' Professional legal/tax advice may be appropriate.' : ''}`,
        )
      : ['- No risks recorded; this is not legal or tax clearance.']),
    '',
    '## Questions to Resolve',
    '',
    ...prep.questions.map((question) => `- ${question}`),
    '',
    '## Negotiation Priorities',
    '',
    ...prep.priorities.map((priority) => `- ${priority}`),
    '',
    '## Negotiation Draft — Do Not Send Without Review',
    '',
    `**Subject:** ${prep.negotiationDraft.subject}`,
    '',
    prep.negotiationDraft.body,
    '',
  ]
    .join('\n')
    .trimEnd()}\n`;
}

export async function createOfferPrep({
  root = process.cwd(),
  input,
  output,
  force = false,
}) {
  const projectRoot = resolve(root);
  const prep = OfferPrepSchema.parse(input);
  const offerPath = regularContainedFile(
    projectRoot,
    prep.offerDocument,
    'Offer document',
  );
  const textPath = regularContainedFile(
    projectRoot,
    prep.extractedTextPath,
    'Extracted offer text',
  );
  const offerBytes = readFileSync(offerPath);
  const extractedText = readFileSync(textPath, 'utf8');
  for (const item of [...prep.terms, ...prep.risks]) {
    if (!extractedText.includes(item.evidence.excerpt)) {
      throw new Error(
        `Offer evidence excerpt not found exactly: ${item.evidence.label}`,
      );
    }
  }
  const source = {
    offerDocument: relative(projectRoot, offerPath).replaceAll('\\', '/'),
    offerSha256: sha256(offerBytes),
    extractedTextPath: relative(projectRoot, textPath).replaceAll('\\', '/'),
    extractedTextSha256: sha256(extractedText),
  };
  const defaultName = `${String(prep.trackerNum || 'untracked').padStart(3, '0')}-${
    prep.company
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'company'
  }-offer-prep.md`;
  const markdown = resolveArtifactPath({
    root: projectRoot,
    directory: 'interview-prep/offers',
    requested: output || defaultName,
    extensions: ['.md'],
    label: 'Offer-prep output',
  });
  const json = resolveArtifactPath({
    root: projectRoot,
    directory: 'interview-prep/offers',
    requested: markdown.path.replace(/\.md$/i, '.json'),
    extensions: ['.json'],
    label: 'Offer-prep snapshot',
  });
  const canonical = {
    ...prep,
    offerDocument: source.offerDocument,
    extractedTextPath: source.extractedTextPath,
    artifact: {
      createdAt: new Date().toISOString(),
      ...source,
      humanReviewRequired: true,
      sendPerformedByTool: false,
      acceptancePerformedByTool: false,
      notLegalOrTaxAdvice: true,
    },
  };
  const mdStage = `${markdown.path}.${process.pid}.${randomUUID()}.stage`;
  const jsonStage = `${json.path}.${process.pid}.${randomUUID()}.stage`;
  const staged = new Map([
    [mdStage, markdown.path],
    [jsonStage, json.path],
  ]);
  try {
    writeFileAtomic(mdStage, renderOfferPrep(prep, source));
    writeFileAtomic(jsonStage, `${JSON.stringify(canonical, null, 2)}\n`);
    await publishArtifactSet(staged, { force });
  } catch (error) {
    rmSync(mdStage, { force: true });
    rmSync(jsonStage, { force: true });
    throw error;
  }
  return {
    draft: relative(projectRoot, markdown.path).replaceAll('\\', '/'),
    snapshot: relative(projectRoot, json.path).replaceAll('\\', '/'),
    humanReviewRequired: true,
    sendPerformedByTool: false,
    acceptancePerformedByTool: false,
  };
}

function argument(argv, name) {
  return argv
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function usage() {
  return [
    'Usage: node scripts/offer-prep.mjs --input=offer-prep.json',
    '  [--output=interview-prep/offers/name.md] [--force] [--root=.]',
    'Source documents must stay under offers/. Creates a draft only.',
  ].join('\n');
}

export async function runOfferPrepCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const input = argument(argv, '--input');
  if (!input) throw new Error(usage());
  const root = resolve(
    argument(argv, '--root') || options.root || process.cwd(),
  );
  const inputPath = assertContainedPath(root, resolve(root, input), {
    mustExist: true,
    label: 'Offer-prep input',
  });
  const result = await createOfferPrep({
    root,
    input: JSON.parse(readFileSync(inputPath, 'utf8')),
    output: argument(argv, '--output'),
    force: argv.includes('--force'),
  });
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  runOfferPrepCli().catch((error) => {
    console.error(`Offer preparation failed: ${error.message}`);
    process.exitCode = 1;
  });
}

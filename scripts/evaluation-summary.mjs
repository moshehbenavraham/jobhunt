#!/usr/bin/env node

import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';
import * as z from 'zod';
import { pathIsInside } from './path-policy.mjs';

export const EVALUATION_SUMMARY_SCHEMA_VERSION = 1;

export const RISK_LABELS = Object.freeze({
  legitimacy: 'Posting legitimacy',
  remote_contradiction: 'Remote/location contradiction',
  employment_classification: 'Employment classification',
  compensation_reliability: 'Compensation reliability',
  ai_infrastructure: 'AI claims vs. infrastructure',
  country_benefit_terminology: 'Country/benefit terminology',
  third_party_tags: 'Third-party tags',
  culture: 'Culture screen',
  interview_redflags: 'Interview red flags',
});

const evidenceTierSchema = z.enum([
  'first_party',
  'reliable_third_party',
  'inferred',
  'unknown',
]);

const sourceKindSchema = z.enum([
  'live_posting',
  'job_description',
  'employer_site',
  'platform_listing',
  'government_source',
  'salary_database',
  'web_research',
  'tracker_history',
  'interview_notes',
  'model_inference',
  'not_available',
]);

const sourceReferenceSchema = z
  .object({
    kind: sourceKindSchema,
    label: z.string().min(1).max(160),
    url: z.string().url().nullable().default(null),
  })
  .strict();

const evidenceAssessmentSchema = z
  .object({
    tier: evidenceTierSchema,
    conflicts: z.boolean(),
    sources: z.array(sourceReferenceSchema).max(20),
  })
  .strict()
  .superRefine((assessment, ctx) => {
    if (assessment.tier === 'unknown' && assessment.sources.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['sources'],
        message: 'unknown evidence must not claim usable sources',
      });
    }
    if (assessment.tier !== 'unknown' && assessment.sources.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['sources'],
        message: `${assessment.tier} evidence needs at least one source`,
      });
    }
  });

const riskSignalSchema = z
  .object({
    status: z.enum(['clear', 'flagged', 'not_evaluated']),
    severity: z.enum(['none', 'low', 'medium', 'high', 'unknown']),
    source: sourceKindSchema,
    evidence: z.string().min(1).max(600).nullable(),
  })
  .strict()
  .superRefine((signal, ctx) => {
    if (signal.status === 'not_evaluated') {
      if (signal.severity !== 'unknown') {
        ctx.addIssue({
          code: 'custom',
          path: ['severity'],
          message: 'not_evaluated risks need unknown severity',
        });
      }
      if (signal.source !== 'not_available' || signal.evidence !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['source'],
          message:
            'not_evaluated risks need source not_available and null evidence',
        });
      }
    } else if (signal.source === 'not_available' || signal.evidence === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: 'evaluated risks need source attribution and evidence',
      });
    }
    if (signal.status === 'clear' && signal.severity !== 'none') {
      ctx.addIssue({
        code: 'custom',
        path: ['severity'],
        message: 'clear risks need severity none',
      });
    }
    if (
      signal.status === 'flagged' &&
      !['low', 'medium', 'high'].includes(signal.severity)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['severity'],
        message: 'flagged risks need low, medium, or high severity',
      });
    }
  });

const nonEmptyUniqueStrings = z
  .array(z.string().min(1).max(500))
  .max(30)
  .refine(
    (values) =>
      new Set(values.map((value) => value.toLowerCase())).size ===
      values.length,
    'values must be unique',
  );

export const EvaluationSummarySchema = z
  .object({
    schema_version: z.literal(EVALUATION_SUMMARY_SCHEMA_VERSION),
    report_id: z.string().regex(/^\d{3,}$/),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    url: z
      .string()
      .url()
      .refine((value) => /^https?:\/\//i.test(value)),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(300),
    score: z.number().min(1).max(5),
    dimension_scores: z
      .object({
        cv_match: z.number().min(1).max(5),
        north_star_alignment: z.number().min(1).max(5),
        compensation: z.number().min(1).max(5),
        culture_working_model: z.number().min(1).max(5),
        red_flag_adjustment: z.number().min(-4).max(0),
      })
      .strict(),
    legitimacy_tier: z.enum([
      'High Confidence',
      'Proceed with Caution',
      'Suspicious',
    ]),
    archetype: z.string().min(1).max(200),
    final_decision: z.enum(['apply', 'consider', 'research_first', 'skip']),
    risk_level: z.enum(['low', 'medium', 'high']),
    confidence: z.enum(['low', 'medium', 'high']),
    next_action: z.string().min(1).max(500),
    hard_stops: nonEmptyUniqueStrings,
    soft_gaps: nonEmptyUniqueStrings,
    top_strengths: nonEmptyUniqueStrings,
    discard_reasons: nonEmptyUniqueStrings,
    via: z.string().min(1).max(200).nullable(),
    company_confidential: z.boolean(),
    advertised_comp: z.string().min(1).max(300).nullable(),
    output_language: z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
    market_ruleset: z.enum([
      'global',
      'us',
      'canada',
      'uk',
      'eu',
      'israel',
      'india',
      'apac',
      'latam',
    ]),
    company_evidence: evidenceAssessmentSchema,
    compensation_evidence: evidenceAssessmentSchema,
    risk_summary: z
      .object(
        Object.fromEntries(
          Object.keys(RISK_LABELS).map((key) => [key, riskSignalSchema]),
        ),
      )
      .strict(),
  })
  .strict()
  .superRefine((summary, ctx) => {
    if (summary.company_confidential && summary.company !== '?') {
      ctx.addIssue({
        code: 'custom',
        path: ['company'],
        message: 'confidential companies use the canonical ? marker',
      });
    }
    if (
      summary.legitimacy_tier === 'High Confidence' &&
      summary.risk_summary.legitimacy.status !== 'clear'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['risk_summary', 'legitimacy', 'status'],
        message: 'High Confidence legitimacy must normalize to clear',
      });
    }
    if (
      summary.legitimacy_tier !== 'High Confidence' &&
      summary.risk_summary.legitimacy.status !== 'flagged'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['risk_summary', 'legitimacy', 'status'],
        message: 'caution/suspicious legitimacy must normalize to flagged',
      });
    }
  });

export function createEvaluationSummaryJsonSchema() {
  const schema = z.toJSONSchema(EvaluationSummarySchema, {
    target: 'draft-2020-12',
  });
  schema.$id = 'https://jobhunt.local/templates/evaluation-summary.schema.json';
  schema.title = 'jobhunt machine-readable evaluation summary';
  return schema;
}

function extractMachineSummaryYaml(reportText) {
  const matches = [
    ...String(reportText).matchAll(
      /^## Machine Summary\s*\n+```(?:yaml|yml)\s*\n([\s\S]*?)\n```/gim,
    ),
  ];
  if (matches.length !== 1) {
    throw new Error(
      `report needs exactly one ## Machine Summary YAML fence; found ${matches.length}`,
    );
  }
  return matches[0][1];
}

export function parseEvaluationSummary(input, options = {}) {
  let parsed;
  if (options.format === 'yaml') {
    parsed = yaml.load(String(input));
  } else if (options.format === 'json') {
    parsed = JSON.parse(String(input));
  } else {
    parsed = yaml.load(extractMachineSummaryYaml(input));
  }
  return EvaluationSummarySchema.parse(parsed);
}

function headerValue(reportText, name) {
  return String(reportText).match(
    new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+?)\\s*$`, 'im'),
  )?.[1];
}

function statusFromCell(cell) {
  const value = String(cell).trim();
  if (/^(?:✅|clear\b)/i.test(value)) return 'clear';
  if (/^(?:⚠️?|flagged\b)/i.test(value)) return 'flagged';
  if (/^(?:—|-)\s*(?:not evaluated|no interview)/i.test(value)) {
    return 'not_evaluated';
  }
  return null;
}

export function parseRiskSummaryTable(reportText) {
  const text = String(reportText);
  const heading = /^## Risk Summary\s*$/im.exec(text);
  if (!heading) throw new Error('report is missing ## Risk Summary');
  const remainder = text.slice(heading.index + heading[0].length);
  const nextHeading = /^##\s+/m.exec(remainder);
  const section = nextHeading
    ? remainder.slice(0, nextHeading.index)
    : remainder;
  const rows = new Map();
  for (const line of section.split('\n')) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 2 || /^-+$/.test(cells[0])) continue;
    const key = Object.entries(RISK_LABELS).find(
      ([, label]) => label.toLowerCase() === cells[0].toLowerCase(),
    )?.[0];
    if (key) rows.set(key, statusFromCell(cells[1]));
  }
  return rows;
}

export function validateEvaluationReport(reportText, options = {}) {
  const summary = parseEvaluationSummary(reportText);
  const issues = [];
  const expected = {
    Date: summary.date,
    URL: summary.url,
    Score: `${summary.score}/5`,
    Legitimacy: summary.legitimacy_tier,
  };
  for (const [name, expectedValue] of Object.entries(expected)) {
    const actual = headerValue(reportText, name);
    if (actual !== expectedValue) {
      issues.push(
        `header ${name} mismatch: expected "${expectedValue}", found "${actual || 'missing'}"`,
      );
    }
  }
  const rows = parseRiskSummaryTable(reportText);
  for (const key of Object.keys(RISK_LABELS)) {
    if (!rows.has(key)) {
      issues.push(`Risk Summary missing row: ${RISK_LABELS[key]}`);
    } else if (rows.get(key) !== summary.risk_summary[key].status) {
      issues.push(
        `Risk Summary status mismatch for ${RISK_LABELS[key]}: table=${rows.get(key) || 'invalid'}, machine=${summary.risk_summary[key].status}`,
      );
    }
  }
  if (
    options.expectedReportId &&
    summary.report_id !== options.expectedReportId
  ) {
    issues.push(
      `report_id mismatch: expected ${options.expectedReportId}, found ${summary.report_id}`,
    );
  }
  return { valid: issues.length === 0, issues, summary };
}

function resolveReportPath(root, requested) {
  const reportsRoot = resolve(root, 'reports');
  const absolute = resolve(root, requested);
  if (!pathIsInside(reportsRoot, absolute)) {
    throw new Error('report path must stay inside reports/');
  }
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('report must be a regular non-symlink file');
  }
  return absolute;
}

function usage() {
  return [
    'Usage: node scripts/evaluation-summary.mjs <reports/report.md> [--json]',
    'Validates the versioned Machine Summary, header, and Risk Summary.',
  ].join('\n');
}

export function runEvaluationSummaryCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  if (positional.length !== 1) throw new Error(usage());
  const root = resolve(options.root || process.cwd());
  const path = resolveReportPath(root, positional[0]);
  const report = readFileSync(path, 'utf8');
  const reportId = path.match(/\/(\d{3,})-/)?.[1];
  const result = validateEvaluationReport(report, {
    expectedReportId: reportId,
  });
  if (argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else if (result.valid)
    console.log(`Valid evaluation report: ${positional[0]}`);
  else
    result.issues.forEach((issue) => {
      console.error(`- ${issue}`);
    });
  return result.valid ? 0 : 1;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = runEvaluationSummaryCli();
  } catch (error) {
    console.error(`Evaluation summary validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

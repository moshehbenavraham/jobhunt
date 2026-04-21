import { z } from 'zod';
import type { JsonValue } from '../workspace/workspace-types.js';
import { ToolExecutionError } from './tool-errors.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';

const SUPPORTED_ATS_TYPES = ['ashby', 'greenhouse', 'lever'] as const;

const compensationSchema = z
  .object({
    currency: z.string().nullable(),
    interval: z.string().nullable(),
    max: z.number().nullable(),
    min: z.number().nullable(),
    summary: z.string().nullable(),
  })
  .nullable();

const extractedJobSchema = z.object({
  apiUrl: z.string().url(),
  applyUrl: z.string().url(),
  ats: z.enum(SUPPORTED_ATS_TYPES),
  company: z.string(),
  companyKey: z.string(),
  compensation: compensationSchema,
  datePosted: z.string().nullable(),
  department: z.string(),
  descriptionHtml: z.string(),
  descriptionText: z.string(),
  employmentType: z.string(),
  jobId: z.string(),
  location: z.string(),
  sourceUrl: z.string().url(),
  team: z.string(),
  title: z.string(),
  url: z.string().url(),
  workplaceType: z.string(),
});

const extractAtsJobInputSchema = z.object({
  sourceUrl: z.string().url(),
});

const normalizeRawJobDescriptionInputSchema = z.object({
  company: z.string().trim().min(1).nullable().default(null),
  descriptionText: z.string().trim().min(1),
  location: z.string().trim().min(1).nullable().default(null),
  sourceUrl: z.string().url().nullable().default(null),
  title: z.string().trim().min(1).nullable().default(null),
});

type ExtractedJob = z.output<typeof extractedJobSchema>;

function buildNormalizedEvaluationInput(
  value:
    | (ExtractedJob & {
        kind: 'ats-url';
      })
    | (z.output<typeof normalizeRawJobDescriptionInputSchema> & {
        kind: 'raw-jd';
      }),
): JsonValue {
  if (value.kind === 'ats-url') {
    return {
      applyUrl: value.applyUrl,
      ats: value.ats,
      company: value.company,
      compensation: value.compensation,
      datePosted: value.datePosted,
      department: value.department,
      descriptionHtml: value.descriptionHtml,
      descriptionText: value.descriptionText,
      employmentType: value.employmentType,
      kind: value.kind,
      location: value.location,
      sourceUrl: value.sourceUrl,
      team: value.team,
      title: value.title,
      url: value.url,
      workplaceType: value.workplaceType,
    };
  }

  return {
    applyUrl: value.sourceUrl,
    ats: null,
    company: value.company ?? '',
    compensation: null,
    datePosted: null,
    department: '',
    descriptionHtml: '',
    descriptionText: value.descriptionText,
    employmentType: '',
    kind: value.kind,
    location: value.location ?? '',
    sourceUrl: value.sourceUrl,
    team: '',
    title: value.title ?? '',
    url: value.sourceUrl,
    workplaceType: '',
  };
}

function getScriptFailureMessage(error: unknown): string {
  if (
    error instanceof ToolExecutionError &&
    error.code === 'tool-script-failed' &&
    error.detail &&
    typeof error.detail === 'object' &&
    !Array.isArray(error.detail)
  ) {
    const stderr = error.detail.stderr;
    if (typeof stderr === 'string' && stderr.trim().length > 0) {
      return stderr.trim();
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isUnsupportedAtsError(error: unknown): boolean {
  return getScriptFailureMessage(error).includes('Unsupported ATS URL');
}

function parseExtractedJob(stdout: string): ExtractedJob {
  try {
    return extractedJobSchema.parse(JSON.parse(stdout));
  } catch (error) {
    throw new ToolExecutionError(
      'tool-invalid-config',
      'ATS extraction script returned invalid JSON.',
      {
        cause: error,
        detail: {
          stdout,
        },
      },
    );
  }
}

export function createEvaluationIntakeTools(): readonly AnyToolDefinition[] {
  return [
    {
      description:
        'Extract structured evaluation input from a supported ATS job URL through the constrained repo script surface.',
      async execute(input, context) {
        try {
          const result = await context.runScript({
            args: [input.sourceUrl],
            scriptName: 'extract-job',
          });
          const extractedJob = parseExtractedJob(result.stdout);

          return {
            output: {
              evaluationInput: buildNormalizedEvaluationInput({
                ...extractedJob,
                kind: 'ats-url',
              }),
              status: 'ready',
              supportedAtsTypes: [...SUPPORTED_ATS_TYPES],
            },
          };
        } catch (error) {
          if (isUnsupportedAtsError(error)) {
            return {
              output: {
                message: getScriptFailureMessage(error),
                sourceUrl: input.sourceUrl,
                status: 'unsupported-ats',
                supportedAtsTypes: [...SUPPORTED_ATS_TYPES],
              },
            };
          }

          throw error;
        }
      },
      inputSchema: extractAtsJobInputSchema,
      name: 'extract-ats-job',
      policy: {
        permissions: {
          scripts: ['extract-job'],
        },
      },
    } satisfies ToolDefinition<
      z.output<typeof extractAtsJobInputSchema>,
      JsonValue
    >,
    {
      description:
        'Normalize pasted job-description text into the shared evaluation input shape without calling external scripts.',
      async execute(input) {
        return {
          output: {
            evaluationInput: buildNormalizedEvaluationInput({
              ...input,
              kind: 'raw-jd',
            }),
            status: 'ready',
          },
        };
      },
      inputSchema: normalizeRawJobDescriptionInputSchema,
      name: 'normalize-raw-job-description',
    } satisfies ToolDefinition<
      z.output<typeof normalizeRawJobDescriptionInputSchema>,
      JsonValue
    >,
  ];
}

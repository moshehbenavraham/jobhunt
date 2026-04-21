import { z } from 'zod';
import type { JsonValue } from '../workspace/workspace-types.js';

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonValue(entry));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every((entry) =>
      isJsonValue(entry),
    );
  }

  return false;
}

export const workflowJsonValueSchema = z.custom<JsonValue>((value) =>
  isJsonValue(value),
);

export const workflowJobTypeValues = [
  'batch-evaluation',
  'process-pipeline',
  'scan-portals',
] as const;

export type WorkflowJobType = (typeof workflowJobTypeValues)[number];

export const workflowWarningSchema = z.object({
  code: z.string().trim().min(1),
  detail: workflowJsonValueSchema.nullable().default(null),
  message: z.string().trim().min(1),
});

export type WorkflowWarning = z.output<typeof workflowWarningSchema>;

export const scanWorkflowPayloadSchema = z.object({
  company: z.string().trim().min(1).nullable().default(null),
  compareClean: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

export type ScanWorkflowPayload = z.output<typeof scanWorkflowPayloadSchema>;

export const scanWorkflowResultSchema = z.object({
  company: z.string().nullable(),
  dryRun: z.boolean(),
  summary: z.object({
    companiesConfigured: z.number().int().nonnegative(),
    companiesScanned: z.number().int().nonnegative(),
    companiesSkipped: z.number().int().nonnegative(),
    duplicatesSkipped: z.number().int().nonnegative(),
    filteredByLocation: z.number().int().nonnegative(),
    filteredByTitle: z.number().int().nonnegative(),
    newOffersAdded: z.number().int().nonnegative(),
    totalJobsFound: z.number().int().nonnegative(),
  }),
  warnings: z.array(workflowWarningSchema),
  workflow: z.literal('scan-portals'),
});

export type ScanWorkflowResult = z.output<typeof scanWorkflowResultSchema>;

export const pipelineQueueSelectionModeValues = [
  'all-pending',
  'first-pending',
  'selected-urls',
] as const;

export type PipelineQueueSelectionMode =
  (typeof pipelineQueueSelectionModeValues)[number];

export const pipelineQueueSelectionSchema = z
  .object({
    limit: z.number().int().min(1).max(50).nullable().default(null),
    mode: z.enum(pipelineQueueSelectionModeValues).default('first-pending'),
    urls: z.array(z.string().url()).max(50).default([]),
  })
  .superRefine((value, context) => {
    if (value.mode === 'selected-urls' && value.urls.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'selected-urls queue selection requires at least one URL.',
        path: ['urls'],
      });
    }

    if (value.mode !== 'selected-urls' && value.urls.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'queue-selection URLs are only allowed when mode is selected-urls.',
        path: ['urls'],
      });
    }
  });

export type PipelineQueueSelection = z.output<
  typeof pipelineQueueSelectionSchema
>;

export const pipelineItemStatusValues = [
  'completed',
  'failed',
  'partial',
  'skipped',
] as const;

export type PipelineItemStatus = (typeof pipelineItemStatusValues)[number];

export const pipelineItemResultSchema = z.object({
  error: z.string().nullable(),
  pdf: z.string().nullable(),
  report: z.string().nullable(),
  reportNumber: z
    .string()
    .regex(/^\d{3}$/)
    .nullable(),
  role: z.string().trim().min(1),
  score: z.number().nullable(),
  status: z.enum(pipelineItemStatusValues),
  tracker: z.string().nullable(),
  url: z.string().url(),
  warnings: z.array(z.string().trim().min(1)),
});

export type PipelineItemResult = z.output<typeof pipelineItemResultSchema>;

export const pipelineProcessingPayloadSchema = z.object({
  dryRun: z.boolean().default(false),
  queueSelection: pipelineQueueSelectionSchema.default({
    limit: 1,
    mode: 'first-pending',
    urls: [],
  }),
});

export type PipelineProcessingPayload = z.output<
  typeof pipelineProcessingPayloadSchema
>;

export const pipelineProcessingResultSchema = z.object({
  dryRun: z.boolean(),
  items: z.array(pipelineItemResultSchema),
  selectedCount: z.number().int().nonnegative(),
  trackerMerged: z.boolean(),
  trackerVerified: z.boolean(),
  warnings: z.array(workflowWarningSchema),
  workflow: z.literal('process-pipeline'),
});

export type PipelineProcessingResult = z.output<
  typeof pipelineProcessingResultSchema
>;

export const batchExecutionModeValues = [
  'run-pending',
  'retry-failed',
] as const;

export type BatchExecutionMode = (typeof batchExecutionModeValues)[number];

export const batchWorkerStatusValues = [
  'completed',
  'failed',
  'partial',
] as const;

export type BatchWorkerStatus = (typeof batchWorkerStatusValues)[number];

export const batchWorkerResultSchema = z
  .object({
    company: z.string().trim().min(1),
    error: z.string().nullable(),
    id: z.string().trim().min(1),
    legitimacy: z
      .enum(['High Confidence', 'Proceed with Caution', 'Suspicious'])
      .nullable(),
    pdf: z
      .string()
      .regex(/^output\/.+\.pdf$/)
      .nullable(),
    report: z
      .string()
      .regex(/^reports\/.+\.md$/)
      .nullable(),
    report_num: z.string().regex(/^\d{3}$/),
    role: z.string().trim().min(1),
    score: z.number().nullable(),
    status: z.enum(batchWorkerStatusValues),
    tracker: z
      .string()
      .regex(/^batch\/tracker-additions\/.+\.tsv$/)
      .nullable(),
    warnings: z.array(z.string().trim().min(1)),
  })
  .superRefine((value, context) => {
    if (value.status === 'completed') {
      if (value.score === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'completed worker results require a numeric score.',
          path: ['score'],
        });
      }

      if (value.legitimacy === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'completed worker results require a legitimacy classification.',
          path: ['legitimacy'],
        });
      }

      if (
        value.pdf === null ||
        value.report === null ||
        value.tracker === null
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'completed worker results require report, PDF, and tracker paths.',
          path: ['status'],
        });
      }

      if (value.warnings.length > 0 || value.error !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'completed worker results must not carry warnings or semantic errors.',
          path: ['warnings'],
        });
      }
    }

    if (value.status === 'partial') {
      if (
        value.score === null ||
        value.legitimacy === null ||
        value.report === null
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'partial worker results require score, legitimacy, and report metadata.',
          path: ['status'],
        });
      }

      if (value.warnings.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'partial worker results require at least one warning.',
          path: ['warnings'],
        });
      }

      if (value.error !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'partial worker results must not carry semantic error strings.',
          path: ['error'],
        });
      }
    }

    if (value.status === 'failed') {
      if (value.score !== null || value.legitimacy !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'failed worker results must not carry score or legitimacy data.',
          path: ['status'],
        });
      }

      if (
        value.pdf !== null ||
        value.tracker !== null ||
        value.warnings.length > 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'failed worker results must not carry PDF, tracker, or warning data.',
          path: ['status'],
        });
      }

      if (value.error === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'failed worker results require an error string.',
          path: ['error'],
        });
      }
    }
  });

export type BatchWorkerResult = z.output<typeof batchWorkerResultSchema>;

export const batchItemSummaryStatusValues = [
  'completed',
  'failed',
  'pending',
  'partial',
  'retryable-failed',
  'skipped',
] as const;

export type BatchItemSummaryStatus =
  (typeof batchItemSummaryStatusValues)[number];

export const batchItemSummarySchema = z.object({
  error: z.string().nullable(),
  id: z.number().int().positive(),
  reportNumber: z
    .string()
    .regex(/^\d{3}$/)
    .nullable(),
  retries: z.number().int().nonnegative(),
  score: z.number().nullable(),
  status: z.enum(batchItemSummaryStatusValues),
  url: z.string().url(),
});

export type BatchItemSummary = z.output<typeof batchItemSummarySchema>;

export const batchEvaluationPayloadSchema = z.object({
  dryRun: z.boolean().default(false),
  maxRetries: z.number().int().min(0).max(10).default(2),
  minScore: z.number().min(0).max(5).default(0),
  mode: z.enum(batchExecutionModeValues).default('run-pending'),
  parallel: z.number().int().min(1).max(4).default(1),
  startFromId: z.number().int().min(0).default(0),
});

export type BatchEvaluationPayload = z.output<
  typeof batchEvaluationPayloadSchema
>;

export const batchEvaluationResultSchema = z.object({
  counts: z.object({
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    partial: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    retryableFailed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
  dryRun: z.boolean(),
  items: z.array(batchItemSummarySchema),
  warnings: z.array(workflowWarningSchema),
  workflow: z.literal('batch-evaluation'),
});

export type BatchEvaluationResult = z.output<
  typeof batchEvaluationResultSchema
>;

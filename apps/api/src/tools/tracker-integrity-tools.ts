import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { resolveRepoRelativePath } from '../config/repo-paths.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import { ToolExecutionError } from './tool-errors.js';
import type {
  AnyToolDefinition,
  ToolDefinition,
  ToolWarning,
} from './tool-contract.js';

const trackerWarningPrefix = '\u26a0\ufe0f';
const canonicalStatusLabelsCache = new Map<string, Set<string>>();

const emptyInputSchema = z.object({});
const maintenanceInputSchema = z.object({
  dryRun: z.boolean().default(false),
});

const stageTrackerAdditionInputSchema = z.object({
  company: z.string().trim().min(1),
  companySlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .default(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryNumber: z.number().int().positive(),
  notes: z.string().default(''),
  pdf: z.string().default(''),
  report: z.string().regex(/^\[[^\]]+\]\(reports\/[^)]+\.md\)$/),
  role: z.string().trim().min(1),
  score: z.string().regex(/^(?:\d+(?:\.\d+)?\/5|N\/A|DUP)$/),
  status: z.string().trim().min(1),
});

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function slugifySegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'job';
}

async function readTextIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function sanitizeTsvField(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}

async function loadCanonicalStatusLabels(repoRoot: string): Promise<Set<string>> {
  const cached = canonicalStatusLabelsCache.get(repoRoot);
  if (cached) {
    return cached;
  }

  const statesPath = resolveRepoRelativePath('templates/states.yml', {
    repoRoot,
  });
  const statesText = await readFile(statesPath, 'utf8');
  const labels = new Set<string>();
  const labelPattern = /^\s*label:\s*(.+?)\s*$/gm;

  for (const match of statesText.matchAll(labelPattern)) {
    const value = match[1]?.trim();
    if (value) {
      labels.add(value.replace(/^['"]|['"]$/g, ''));
    }
  }

  if (labels.size === 0) {
    throw new ToolExecutionError(
      'tool-invalid-config',
      'templates/states.yml does not define any canonical status labels.',
    );
  }

  canonicalStatusLabelsCache.set(repoRoot, labels);
  return labels;
}

function collectWarnings(
  warningCode: string,
  ...chunks: string[]
): readonly ToolWarning[] {
  const messages = new Set<string>();

  for (const chunk of chunks) {
    for (const rawLine of chunk.split('\n')) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      if (line.startsWith(trackerWarningPrefix)) {
        messages.add(line.slice(trackerWarningPrefix.length).trim());
        continue;
      }

      if (line.startsWith('[WARN]')) {
        messages.add(line.slice('[WARN]'.length).trim());
      }
    }
  }

  return [...messages].map((message) => ({
    code: warningCode,
    message,
  }));
}

function createMaintenanceTool(
  config: {
    description: string;
    name: string;
    scriptName:
      | 'dedup-tracker'
      | 'merge-tracker'
      | 'normalize-statuses'
      | 'verify-pipeline';
    supportsDryRun?: boolean;
    warningCode: string;
  },
): ToolDefinition<
  z.output<typeof emptyInputSchema> | z.output<typeof maintenanceInputSchema>,
  JsonValue
> {
  return {
    description: config.description,
    async execute(input, context) {
      const args =
        config.supportsDryRun && 'dryRun' in input && input.dryRun
          ? ['--dry-run']
          : [];
      const result = await context.runScript({
        args,
        scriptName: config.scriptName,
      });

      return {
        output: {
          attempts: result.attempts,
          dryRun:
            config.supportsDryRun && 'dryRun' in input ? input.dryRun : false,
          durationMs: result.durationMs,
          exitCode: result.exitCode,
          scriptName: config.scriptName,
          status: 'completed',
        },
        warnings: collectWarnings(
          config.warningCode,
          result.stdout,
          result.stderr,
        ),
      };
    },
    inputSchema: config.supportsDryRun
      ? maintenanceInputSchema
      : emptyInputSchema,
    name: config.name,
    policy: {
      permissions: {
        scripts: [config.scriptName],
      },
    },
  };
}

export function createTrackerIntegrityTools(): readonly AnyToolDefinition[] {
  return [
    {
      description:
        'Stage one TSV tracker addition in batch/tracker-additions without writing applications.md directly.',
      async execute(input, context) {
        const repoRoot = context.workspace.repoPaths.repoRoot;
        const canonicalStatusLabels = await loadCanonicalStatusLabels(repoRoot);

        if (!canonicalStatusLabels.has(input.status)) {
          throw new ToolExecutionError(
            'tool-invalid-input',
            `Status ${input.status} is not canonical.`,
            {
              detail: {
                allowedStatuses: [...canonicalStatusLabels].sort(),
                status: input.status,
              },
            },
          );
        }

        const companySlug = input.companySlug ?? slugifySegment(input.company);
        const repoRelativePath =
          `batch/tracker-additions/${input.entryNumber}-${companySlug}.tsv`;
        const absolutePath = resolveRepoRelativePath(repoRelativePath, {
          repoRoot,
        });
        const tsvLine = [
          String(input.entryNumber),
          sanitizeTsvField(input.date),
          sanitizeTsvField(input.company),
          sanitizeTsvField(input.role),
          sanitizeTsvField(input.status),
          sanitizeTsvField(input.score),
          sanitizeTsvField(input.pdf),
          sanitizeTsvField(input.report),
          sanitizeTsvField(input.notes),
        ].join('\t');
        const tsvContent = `${tsvLine}\n`;
        const existingContent = await readTextIfExists(absolutePath);

        if (existingContent !== null) {
          if (existingContent === tsvContent) {
            return {
              output: {
                entryNumber: input.entryNumber,
                repoRelativePath,
                status: 'already-staged',
                tsvLine,
              },
            };
          }

          throw new ToolExecutionError(
            'tool-workspace-conflict',
            `Tracker addition ${repoRelativePath} already exists with different content.`,
            {
              detail: {
                repoRelativePath,
              },
            },
          );
        }

        await context.mutateWorkspace({
          content: tsvContent,
          format: 'text',
          repoRelativePath,
          target: 'tracker-additions',
        });

        return {
          output: {
            entryNumber: input.entryNumber,
            repoRelativePath,
            status: 'staged',
            tsvLine,
          },
        };
      },
      inputSchema: stageTrackerAdditionInputSchema,
      name: 'stage-tracker-addition',
      policy: {
        permissions: {
          mutationTargets: ['tracker-additions'],
        },
      },
    } satisfies ToolDefinition<
      z.output<typeof stageTrackerAdditionInputSchema>,
      JsonValue
    >,
    createMaintenanceTool({
      description:
        'Merge staged tracker TSV additions into the applications tracker through the allowlisted repo script.',
      name: 'merge-tracker-additions',
      scriptName: 'merge-tracker',
      warningCode: 'tracker-merge-warning',
    }),
    createMaintenanceTool({
      description:
        'Verify tracker, report, and pending-TSV integrity through the repo validator.',
      name: 'verify-tracker-pipeline',
      scriptName: 'verify-pipeline',
      warningCode: 'tracker-verify-warning',
    }),
    createMaintenanceTool({
      description:
        'Normalize tracker statuses onto the canonical state set with optional dry-run support.',
      name: 'normalize-tracker-statuses',
      scriptName: 'normalize-statuses',
      supportsDryRun: true,
      warningCode: 'tracker-normalize-warning',
    }),
    createMaintenanceTool({
      description:
        'Deduplicate tracker rows with optional dry-run support while preserving the strongest record.',
      name: 'dedup-tracker-entries',
      scriptName: 'dedup-tracker',
      supportsDryRun: true,
      warningCode: 'tracker-dedup-warning',
    }),
  ];
}

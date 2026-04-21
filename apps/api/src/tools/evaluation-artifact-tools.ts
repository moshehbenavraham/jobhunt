import { lstat, readdir, readFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  resolveRepoRelativePath,
  type RepoPathOptions,
} from '../config/repo-paths.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import { WorkspaceWriteConflictError } from '../workspace/workspace-errors.js';
import { ToolExecutionError } from './tool-errors.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';

const evaluationArtifactGroupValues = ['all', 'output', 'reports'] as const;
const reportReservationDirectory = '.jobhunt-app/report-reservations';

const reserveReportArtifactInputSchema = z.object({
  company: z.string().trim().min(1),
  companySlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .default(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  role: z.string().trim().min(1),
});

const reportReservationSchema = z.object({
  bytesWritten: z.number().int().nonnegative().nullable(),
  company: z.string(),
  companySlug: z.string(),
  createdAt: z.string(),
  reportNumber: z.string(),
  reportRepoRelativePath: z.string(),
  reservationId: z.string(),
  role: z.string(),
  status: z.enum(['reserved', 'written']),
  writtenAt: z.string().nullable(),
});

const writeReportArtifactInputSchema = z.object({
  content: z.string().min(1),
  reservationId: z.string().regex(/^\d+$/),
});

const listEvaluationArtifactsInputSchema = z.object({
  group: z.enum(evaluationArtifactGroupValues).default('all'),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

type ReportReservation = z.output<typeof reportReservationSchema>;
type EvaluationArtifactGroup = (typeof evaluationArtifactGroupValues)[number];

type ArtifactListItem = {
  group: 'output' | 'reports';
  name: string;
  repoRelativePath: string;
  rootRepoRelativePath: string;
};

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

function formatReportNumber(value: number): string {
  return String(value).padStart(3, '0');
}

function getReservationRepoRelativePath(reservationId: string): string {
  return `${reportReservationDirectory}/${reservationId}.json`;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isFile();
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function listNumberedArtifacts(
  directoryRepoRelativePath: string,
  repoRoot: string,
): Promise<number[]> {
  try {
    const absoluteDirectoryPath = resolveRepoRelativePath(
      directoryRepoRelativePath,
      {
        repoRoot,
      },
    );
    const entries = await readdir(absoluteDirectoryPath);

    return entries
      .map((entry) => entry.match(/^(\d+)-/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => Number.parseInt(match[1] ?? '0', 10))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function listReservedReportNumbers(repoRoot: string): Promise<number[]> {
  try {
    const reservationDirectoryPath = resolveRepoRelativePath(
      reportReservationDirectory,
      { repoRoot },
    );
    const entries = await readdir(reservationDirectoryPath);

    return entries
      .map((entry) => entry.match(/^(\d+)\.json$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => Number.parseInt(match[1] ?? '0', 10))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function getNextReportNumber(repoRoot: string): Promise<number> {
  const [reportNumbers, reservedNumbers] = await Promise.all([
    listNumberedArtifacts('reports', repoRoot),
    listReservedReportNumbers(repoRoot),
  ]);
  const allNumbers = [...reportNumbers, ...reservedNumbers];

  if (allNumbers.length === 0) {
    return 1;
  }

  return Math.max(...allNumbers) + 1;
}

async function readReservation(
  reservationId: string,
  options: RepoPathOptions,
): Promise<ReportReservation> {
  const reservationPath = resolveRepoRelativePath(
    getReservationRepoRelativePath(reservationId),
    options,
  );

  let content: string;
  try {
    content = await readFile(reservationPath, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new ToolExecutionError(
        'tool-invalid-input',
        `Unknown report reservation ${reservationId}.`,
        {
          detail: {
            reservationId,
          },
        },
      );
    }

    throw error;
  }

  try {
    return reportReservationSchema.parse(JSON.parse(content));
  } catch (error) {
    throw new ToolExecutionError(
      'tool-invalid-config',
      `Report reservation ${reservationId} is invalid.`,
      {
        cause: error,
        detail: {
          reservationId,
        },
      },
    );
  }
}

async function reserveReportArtifact(
  input: z.output<typeof reserveReportArtifactInputSchema>,
  context: Parameters<ToolDefinition['execute']>[1],
): Promise<{
  reportNumber: string;
  reportRepoRelativePath: string;
  reservationId: string;
  reservationRepoRelativePath: string;
}> {
  const repoRoot = context.workspace.repoPaths.repoRoot;
  const companySlug = input.companySlug ?? slugifySegment(input.company);
  let nextReportNumber = await getNextReportNumber(repoRoot);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const reportNumber = formatReportNumber(nextReportNumber + attempt);
    const reservationId = reportNumber;
    const reportRepoRelativePath = `reports/${reportNumber}-${companySlug}-${input.date}.md`;
    const reservationRepoRelativePath =
      getReservationRepoRelativePath(reservationId);

    try {
      await context.mutateWorkspace({
        content: {
          bytesWritten: null,
          company: input.company,
          companySlug,
          createdAt: new Date(context.now()).toISOString(),
          reportNumber,
          reportRepoRelativePath,
          reservationId,
          role: input.role,
          status: 'reserved',
          writtenAt: null,
        },
        repoRelativePath: reservationRepoRelativePath,
        target: 'app-state',
      });

      return {
        reportNumber,
        reportRepoRelativePath,
        reservationId,
        reservationRepoRelativePath,
      };
    } catch (error) {
      if (error instanceof WorkspaceWriteConflictError) {
        continue;
      }

      throw error;
    }
  }

  throw new ToolExecutionError(
    'tool-execution-failed',
    'Unable to reserve a unique report artifact path.',
  );
}

async function collectArtifactListItems(
  group: EvaluationArtifactGroup,
  context: Parameters<ToolDefinition['execute']>[1],
): Promise<ArtifactListItem[]> {
  const groups =
    group === 'all'
      ? ([
          ['output', 'outputDirectory'],
          ['reports', 'reportsDirectory'],
        ] as const)
      : ([
          [group, group === 'reports' ? 'reportsDirectory' : 'outputDirectory'],
        ] as const);

  const results = await Promise.all(
    groups.map(async ([label, surfaceKey]) => {
      const result = await context.workspace.readSurface(surfaceKey);

      if (result.status !== 'found') {
        return [] as ArtifactListItem[];
      }

      const rootRepoRelativePath =
        context.workspace.getSurface(surfaceKey).candidates[0] ?? label;

      return (result.directoryEntries ?? []).map((name) => ({
        group: label,
        name,
        repoRelativePath: `${rootRepoRelativePath}/${name}`,
        rootRepoRelativePath,
      }));
    }),
  );

  return results
    .flat()
    .sort((left, right) =>
      left.repoRelativePath.localeCompare(right.repoRelativePath),
    );
}

export function createEvaluationArtifactTools(): readonly AnyToolDefinition[] {
  return [
    {
      description:
        'Reserve the next canonical report artifact path and persist the reservation in app-owned state to avoid duplicate report numbers.',
      async execute(input, context) {
        const reserved = await reserveReportArtifact(input, context);

        return {
          output: {
            reportLink: `[${reserved.reportNumber}](${reserved.reportRepoRelativePath})`,
            reportNumber: reserved.reportNumber,
            reportRepoRelativePath: reserved.reportRepoRelativePath,
            reservationId: reserved.reservationId,
            reservationRepoRelativePath: reserved.reservationRepoRelativePath,
            status: 'reserved',
          },
        };
      },
      inputSchema: reserveReportArtifactInputSchema,
      name: 'reserve-report-artifact',
      policy: {
        permissions: {
          mutationTargets: ['app-state'],
        },
      },
    } satisfies ToolDefinition<
      z.output<typeof reserveReportArtifactInputSchema>,
      JsonValue
    >,
    {
      description:
        'Write a reserved evaluation report into reports/ and mark the corresponding reservation as written.',
      async execute(input, context) {
        const reservation = await readReservation(input.reservationId, {
          repoRoot: context.workspace.repoPaths.repoRoot,
        });

        if (reservation.status === 'written') {
          return {
            output: {
              bytesWritten: reservation.bytesWritten,
              reportNumber: reservation.reportNumber,
              reportRepoRelativePath: reservation.reportRepoRelativePath,
              reservationId: reservation.reservationId,
              status: 'already-written',
              writtenAt: reservation.writtenAt,
            },
          };
        }

        const writeResult = await context.mutateWorkspace({
          content: input.content,
          format: 'text',
          repoRelativePath: reservation.reportRepoRelativePath,
          target: 'reports',
        });
        const writtenAt = new Date(context.now()).toISOString();

        await context.mutateWorkspace({
          content: {
            ...reservation,
            bytesWritten: writeResult.bytesWritten,
            status: 'written',
            writtenAt,
          },
          overwrite: true,
          repoRelativePath: getReservationRepoRelativePath(
            reservation.reservationId,
          ),
          target: 'app-state',
        });

        return {
          output: {
            bytesWritten: writeResult.bytesWritten,
            reportNumber: reservation.reportNumber,
            reportRepoRelativePath: reservation.reportRepoRelativePath,
            reservationId: reservation.reservationId,
            status: 'written',
            writtenAt,
          },
        };
      },
      inputSchema: writeReportArtifactInputSchema,
      name: 'write-report-artifact',
      policy: {
        permissions: {
          mutationTargets: ['app-state', 'reports'],
        },
      },
    } satisfies ToolDefinition<
      z.output<typeof writeReportArtifactInputSchema>,
      JsonValue
    >,
    {
      description:
        'List report and PDF artifacts in deterministic repo-relative order with bounded pagination.',
      async execute(input, context) {
        const allItems = await collectArtifactListItems(input.group, context);
        const items = allItems.slice(input.offset, input.offset + input.limit);

        return {
          output: {
            group: input.group,
            hasMore: input.offset + items.length < allItems.length,
            items,
            limit: input.limit,
            offset: input.offset,
            total: allItems.length,
          },
        };
      },
      inputSchema: listEvaluationArtifactsInputSchema,
      name: 'list-evaluation-artifacts',
    } satisfies ToolDefinition<
      z.output<typeof listEvaluationArtifactsInputSchema>,
      JsonValue
    >,
  ];
}

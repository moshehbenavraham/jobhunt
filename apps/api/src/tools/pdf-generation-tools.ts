import { lstat, readFile, rm } from 'node:fs/promises';
import { z } from 'zod';
import {
  resolveRepoRelativePath,
  type RepoPathOptions,
} from '../config/repo-paths.js';
import { authorizeWorkspaceMutationPath } from '../workspace/workspace-boundary.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import { ToolExecutionError } from './tool-errors.js';
import type { AnyToolDefinition, ToolDefinition } from './tool-contract.js';

const generateAtsPdfInputSchema = z.object({
  format: z.enum(['a4', 'letter']).default('a4'),
  htmlPath: z.string().trim().min(1),
  outputRepoRelativePath: z.string().trim().min(1),
});

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
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

function resolveHtmlInputPath(
  htmlPath: string,
  options: RepoPathOptions,
): string {
  if (htmlPath.startsWith('/')) {
    return htmlPath;
  }

  try {
    return resolveRepoRelativePath(htmlPath, options);
  } catch (error) {
    throw new ToolExecutionError(
      'tool-invalid-input',
      `Invalid HTML input path ${htmlPath}.`,
      {
        cause: error,
        detail: {
          htmlPath,
        },
      },
    );
  }
}

function parsePageCount(stdout: string): number | null {
  const match = stdout.match(/Pages:\s+(\d+)/);
  return match ? Number.parseInt(match[1] ?? '0', 10) : null;
}

export function createPdfGenerationTools(): readonly AnyToolDefinition[] {
  return [
    {
      description:
        'Generate an ATS-oriented PDF artifact from HTML using the allowlisted repo script and validated output paths.',
      async execute(input, context) {
        if (!input.outputRepoRelativePath.endsWith('.pdf')) {
          throw new ToolExecutionError(
            'tool-invalid-input',
            'PDF output paths must end with .pdf.',
            {
              detail: {
                outputRepoRelativePath: input.outputRepoRelativePath,
              },
            },
          );
        }

        const repoRoot = context.workspace.repoPaths.repoRoot;
        const outputAuthorization = authorizeWorkspaceMutationPath(
          input.outputRepoRelativePath,
          'artifacts',
          { repoRoot },
        );
        const outputPath = resolveRepoRelativePath(
          outputAuthorization.repoRelativePath,
          { repoRoot },
        );

        if (await fileExists(outputPath)) {
          throw new ToolExecutionError(
            'tool-workspace-conflict',
            `Refusing to overwrite existing PDF artifact ${input.outputRepoRelativePath}.`,
            {
              detail: {
                outputRepoRelativePath: input.outputRepoRelativePath,
              },
            },
          );
        }

        const htmlPath = resolveHtmlInputPath(input.htmlPath, {
          repoRoot,
        });

        try {
          const result = await context.runScript({
            args: [htmlPath, outputPath, `--format=${input.format}`],
            scriptName: 'generate-pdf',
          });

          if (!(await fileExists(outputPath))) {
            throw new ToolExecutionError(
              'tool-invalid-config',
              `PDF generation script completed without creating ${input.outputRepoRelativePath}.`,
            );
          }

          const pdfBytes = await readFile(outputPath);

          return {
            output: {
              attempts: result.attempts,
              durationMs: result.durationMs,
              format: input.format,
              outputPath,
              outputRepoRelativePath: input.outputRepoRelativePath,
              pageCount: parsePageCount(result.stdout),
              sizeBytes: pdfBytes.byteLength,
              status: 'generated',
            },
          };
        } catch (error) {
          await rm(outputPath, { force: true });
          throw error;
        }
      },
      inputSchema: generateAtsPdfInputSchema,
      name: 'generate-ats-pdf',
      policy: {
        permissions: {
          scripts: ['generate-pdf'],
        },
      },
    } satisfies ToolDefinition<
      z.output<typeof generateAtsPdfInputSchema>,
      JsonValue
    >,
  ];
}

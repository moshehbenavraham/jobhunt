import { z } from 'zod';
import { resolveRepoRelativePath, type RepoPathOptions } from '../config/repo-paths.js';
import { authorizeWorkspaceMutationPath } from '../workspace/workspace-boundary.js';
import {
  WORKSPACE_MUTATION_TARGETS,
  type JsonValue,
} from '../workspace/workspace-types.js';
import { writeTextFileAtomically } from '../workspace/workspace-write.js';
import type {
  ToolWorkspaceMutationRequest,
  ToolWorkspaceMutationResult,
} from './tool-contract.js';

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

const workspaceMutationRequestSchema = z.object({
  content: z.custom<JsonValue | string>((value) => isJsonValue(value)),
  format: z.enum(['json', 'text']).optional(),
  overwrite: z.boolean().optional(),
  repoRelativePath: z.string().trim().min(1),
  target: z.enum(WORKSPACE_MUTATION_TARGETS),
});

export type WorkspaceMutationAdapter = {
  applyMutation: (
    request: ToolWorkspaceMutationRequest,
  ) => Promise<ToolWorkspaceMutationResult>;
};

function serializeMutationContent(
  request: z.infer<typeof workspaceMutationRequestSchema>,
): string {
  const format =
    request.format ??
    (typeof request.content === 'string' ? 'text' : 'json');

  if (format === 'text') {
    if (typeof request.content !== 'string') {
      throw new Error('Text workspace mutations require string content.');
    }

    return request.content;
  }

  return `${JSON.stringify(request.content, null, 2)}\n`;
}

export function createWorkspaceMutationAdapter(
  options: RepoPathOptions = {},
): WorkspaceMutationAdapter {
  return {
    async applyMutation(
      request: ToolWorkspaceMutationRequest,
    ): Promise<ToolWorkspaceMutationResult> {
      const parsedRequest = workspaceMutationRequestSchema.parse(request);
      const authorization = authorizeWorkspaceMutationPath(
        parsedRequest.repoRelativePath,
        parsedRequest.target,
        options,
      );
      const targetPath = resolveRepoRelativePath(authorization.repoRelativePath, {
        ...options,
      });
      const writeResult = await writeTextFileAtomically({
        content: serializeMutationContent(parsedRequest),
        targetPath,
        ...(parsedRequest.overwrite !== undefined
          ? {
              overwrite: parsedRequest.overwrite,
            }
          : {}),
      });

      return {
        bytesWritten: writeResult.bytesWritten,
        created: writeResult.created,
        overwritten: writeResult.overwritten,
        path: targetPath,
        repoRelativePath: authorization.repoRelativePath,
        target: parsedRequest.target,
      };
    },
  };
}

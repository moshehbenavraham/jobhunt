import { rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createWorkspaceFixture,
  type WorkspaceFixture,
} from '../workspace/test-utils.js';
import { listWorkflowModeRoutes } from './workflow-mode-map.js';

const DEFAULT_PROMPT_FILES: Record<string, string> = {
  'config/portals.yml': 'title_filter:\n  positive: []\n',
  'config/profile.yml': 'full_name: Test User\nlocation: Remote\n',
  'modes/_profile.md': '# Profile Mode\n',
  'modes/_shared.md': '# Shared Mode\n',
  'profile/cv.md': '# CV\n- Baseline metric: 10\n',
};

for (const route of listWorkflowModeRoutes()) {
  DEFAULT_PROMPT_FILES[route.modeRepoRelativePath] = `# ${route.intent}\n${route.description}\n`;
}

export type PromptFixture = WorkspaceFixture & {
  deleteText: (repoRelativePath: string) => Promise<void>;
  updateText: (repoRelativePath: string, content: string) => Promise<void>;
};

async function bumpFileTimestamp(absolutePath: string): Promise<void> {
  const nextTick = new Date(Date.now() + 1000);
  await utimes(absolutePath, nextTick, nextTick);
}

export async function createPromptFixture(options: {
  files?: Record<string, string>;
} = {}): Promise<PromptFixture> {
  const fixture = await createWorkspaceFixture({
    files: {
      ...DEFAULT_PROMPT_FILES,
      ...(options.files ?? {}),
    },
  });

  return {
    ...fixture,
    async deleteText(repoRelativePath: string): Promise<void> {
      await rm(join(fixture.repoRoot, repoRelativePath), { force: true });
    },
    async updateText(repoRelativePath: string, content: string): Promise<void> {
      await fixture.writeText(repoRelativePath, content);
      await bumpFileTimestamp(join(fixture.repoRoot, repoRelativePath));
    },
  };
}

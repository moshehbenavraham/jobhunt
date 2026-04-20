import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const DEFAULT_FIXTURE_FILES: Record<string, string> = {
  'AGENTS.md': '# Agents\n',
  'docs/DATA_CONTRACT.md': '# Data Contract\n',
  'modes/_shared.md': '# Shared Mode\n',
  'package.json': '{\n  "name": "workspace-fixture"\n}\n',
};

const DEFAULT_FIXTURE_DIRECTORIES = [
  'apps/api/src',
  'config',
  'data',
  'docs',
  'interview-prep',
  'modes',
  'profile',
] as const;

export const USER_LAYER_SNAPSHOT_PATHS = [
  'article-digest.md',
  'config/portals.yml',
  'config/profile.yml',
  'cv.md',
  'data/applications.md',
  'data/follow-ups.md',
  'data/openai-account-auth.json',
  'data/pipeline.md',
  'data/scan-history.tsv',
  'modes/_profile.md',
  'profile/article-digest.md',
  'profile/cv.md',
] as const;

async function writeRepoFile(
  repoRoot: string,
  repoRelativePath: string,
  content: string,
): Promise<void> {
  const absolutePath = join(repoRoot, repoRelativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
}

export type WorkspaceFixture = {
  apiStartDirectory: string;
  cleanup: () => Promise<void>;
  readText: (repoRelativePath: string) => Promise<string | null>;
  repoRoot: string;
  snapshotUserLayer: () => Promise<Record<string, string | null>>;
  writeText: (repoRelativePath: string, content: string) => Promise<void>;
};

export async function createWorkspaceFixture(options: {
  directories?: string[];
  files?: Record<string, string>;
} = {}): Promise<WorkspaceFixture> {
  const repoRoot = await mkdtemp(join(tmpdir(), 'jobhunt-workspace-'));

  for (const directory of DEFAULT_FIXTURE_DIRECTORIES) {
    await mkdir(join(repoRoot, directory), { recursive: true });
  }

  for (const directory of options.directories ?? []) {
    await mkdir(join(repoRoot, directory), { recursive: true });
  }

  for (const [repoRelativePath, content] of Object.entries(DEFAULT_FIXTURE_FILES)) {
    await writeRepoFile(repoRoot, repoRelativePath, content);
  }

  for (const [repoRelativePath, content] of Object.entries(options.files ?? {})) {
    await writeRepoFile(repoRoot, repoRelativePath, content);
  }

  const readText = async (repoRelativePath: string): Promise<string | null> => {
    try {
      return await readFile(join(repoRoot, repoRelativePath), 'utf8');
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return null;
      }

      throw error;
    }
  };

  const snapshotUserLayer = async (): Promise<Record<string, string | null>> => {
    const snapshot: Record<string, string | null> = {};

    for (const repoRelativePath of USER_LAYER_SNAPSHOT_PATHS) {
      snapshot[repoRelativePath] = await readText(repoRelativePath);
    }

    return snapshot;
  };

  const writeText = async (
    repoRelativePath: string,
    content: string,
  ): Promise<void> => {
    await writeRepoFile(repoRoot, repoRelativePath, content);
  };

  return {
    apiStartDirectory: join(repoRoot, 'apps', 'api', 'src'),
    async cleanup(): Promise<void> {
      await rm(repoRoot, { force: true, recursive: true });
    },
    readText,
    repoRoot,
    snapshotUserLayer,
    writeText,
  };
}

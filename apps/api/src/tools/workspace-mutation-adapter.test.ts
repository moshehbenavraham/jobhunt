import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import {
  WorkspaceMutationPolicyDeniedError,
  WorkspaceWriteConflictError,
} from '../workspace/workspace-errors.js';
import { createWorkspaceMutationAdapter } from './workspace-mutation-adapter.js';

test('workspace mutation adapter rejects protected paths that do not match the declared mutation target', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  const adapter = createWorkspaceMutationAdapter({
    repoRoot: fixture.repoRoot,
  });

  try {
    await assert.rejects(
      () =>
        adapter.applyMutation({
          content: '# blocked\n',
          repoRelativePath: 'modes/_shared.md',
          target: 'profile',
        }),
      WorkspaceMutationPolicyDeniedError,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('workspace mutation adapter performs atomic writes for approved artifact targets', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  const adapter = createWorkspaceMutationAdapter({
    repoRoot: fixture.repoRoot,
  });

  try {
    const result = await adapter.applyMutation({
      content: '# Report\n',
      repoRelativePath: 'reports/acme.md',
      target: 'reports',
    });

    assert.equal(result.created, true);
    assert.equal(await fixture.readText('reports/acme.md'), '# Report\n');
  } finally {
    await fixture.cleanup();
  }
});

test('workspace mutation adapter cleans temp state after write conflicts', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  const adapter = createWorkspaceMutationAdapter({
    repoRoot: fixture.repoRoot,
  });

  try {
    await adapter.applyMutation({
      content: '# Report\n',
      repoRelativePath: 'reports/conflict.md',
      target: 'reports',
    });

    await assert.rejects(
      () =>
        adapter.applyMutation({
          content: '# Conflict\n',
          repoRelativePath: 'reports/conflict.md',
          target: 'reports',
        }),
      WorkspaceWriteConflictError,
    );

    const reportDirectoryEntries = await readdir(join(fixture.repoRoot, 'reports'));

    assert.deepEqual(reportDirectoryEntries, ['conflict.md']);
  } finally {
    await fixture.cleanup();
  }
});

test('workspace mutation adapter authorizes tracker additions separately from the main tracker file', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  const adapter = createWorkspaceMutationAdapter({
    repoRoot: fixture.repoRoot,
  });

  try {
    const result = await adapter.applyMutation({
      content:
        '1\t2026-04-21\tAcme\tPlatform Engineer\tEvaluated\t4.5/5\t\t[001](reports/001-acme-2026-04-21.md)\tnote\n',
      repoRelativePath: 'batch/tracker-additions/1-acme.tsv',
      target: 'tracker-additions',
    });

    assert.equal(result.created, true);
    assert.equal(
      await fixture.readText('batch/tracker-additions/1-acme.tsv'),
      '1\t2026-04-21\tAcme\tPlatform Engineer\tEvaluated\t4.5/5\t\t[001](reports/001-acme-2026-04-21.md)\tnote\n',
    );

    await assert.rejects(
      () =>
        adapter.applyMutation({
          content: 'bad\n',
          repoRelativePath: 'batch/tracker-additions/1-acme.tsv',
          target: 'tracker',
        }),
      WorkspaceMutationPolicyDeniedError,
    );
  } finally {
    await fixture.cleanup();
  }
});

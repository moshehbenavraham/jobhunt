import assert from 'node:assert/strict';
import test from 'node:test';
import { getStartupDiagnostics } from '../index.js';
import {
  WorkspaceMissingSurfaceError,
  WorkspaceUnknownPathError,
  WorkspaceWriteConflictError,
  WorkspaceWriteDeniedError,
} from './workspace-errors.js';
import { createWorkspaceAdapter } from './workspace-adapter.js';
import { createWorkspaceFixture } from './test-utils.js';

test('workspace adapter resolves repo root from a temp api package and reads legacy CV fallback', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      cv: '',
      'cv.md': '# Legacy CV\n',
      'modes/_profile.md': '# Profile\n',
    },
  });

  try {
    const adapter = createWorkspaceAdapter({
      startDirectory: fixture.apiStartDirectory,
    });
    const result = await adapter.readSurface('profileCv');

    assert.equal(result.status, 'found');
    assert.equal(result.repoRelativePath, 'cv.md');
    assert.equal(result.value, '# Legacy CV\n');
  } finally {
    await fixture.cleanup();
  }
});

test('startup diagnostics report onboarding gaps without mutating user-layer files', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });

  try {
    const beforeSnapshot = await fixture.snapshotUserLayer();
    const diagnostics = await getStartupDiagnostics({ repoRoot: fixture.repoRoot });
    const afterSnapshot = await fixture.snapshotUserLayer();
    const onboardingKeys = diagnostics.onboardingMissing
      .map((item) => item.surfaceKey)
      .sort();

    assert.deepEqual(afterSnapshot, beforeSnapshot);
    assert.deepEqual(onboardingKeys, ['profileConfig', 'profileCv']);
    assert.equal(diagnostics.runtimeMissing.length, 0);
    assert.ok(
      diagnostics.optionalMissing.some(
        (item) => item.surfaceKey === 'reportsDirectory',
      ),
    );
  } finally {
    await fixture.cleanup();
  }
});

test('protected and escaping writes are rejected before mutation', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });

  try {
    const adapter = createWorkspaceAdapter({ repoRoot: fixture.repoRoot });
    const profileModePath = adapter.classifyPath('modes/_profile.md');
    const scriptsPath = adapter.classifyPath('scripts/example.mjs');

    assert.equal(profileModePath.owner, 'user');
    assert.equal(scriptsPath.owner, 'system');

    await assert.rejects(
      () =>
        adapter.writeFile({
          content: '# not allowed\n',
          overwrite: true,
          repoRelativePath: 'modes/_shared.md',
        }),
      WorkspaceWriteDeniedError,
    );
    await assert.rejects(
      () =>
        adapter.writeFile({
          content: 'escape\n',
          repoRelativePath: '../escape.txt',
        }),
      WorkspaceUnknownPathError,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('app-owned writes are atomic and JSON workspace reads are decoded', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'data/openai-account-auth.json': '{\n  "token": "abc"\n}\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });

  try {
    const adapter = createWorkspaceAdapter({ repoRoot: fixture.repoRoot });
    const authResult = await adapter.readSurface('openaiAccountAuth');

    assert.equal(authResult.status, 'found');
    assert.deepEqual(authResult.value, { token: 'abc' });

    const writeResult = await adapter.writeFile({
      content: { ok: true },
      repoRelativePath: '.jobhunt-app/state.json',
    });

    assert.equal(writeResult.created, true);
    assert.equal(writeResult.owner, 'app');
    assert.equal(
      await fixture.readText('.jobhunt-app/state.json'),
      '{\n  "ok": true\n}\n',
    );

    await assert.rejects(
      () =>
        adapter.writeFile({
          content: { ok: false },
          repoRelativePath: '.jobhunt-app/state.json',
        }),
      WorkspaceWriteConflictError,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('required surface reads throw explicit missing-surface errors', async () => {
  const fixture = await createWorkspaceFixture();

  try {
    const adapter = createWorkspaceAdapter({ repoRoot: fixture.repoRoot });

    await assert.rejects(
      () => adapter.readRequiredSurface('profileCv'),
      WorkspaceMissingSurfaceError,
    );
  } finally {
    await fixture.cleanup();
  }
});

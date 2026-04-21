import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createApiServiceContainer } from './service-container.js';

test('service container reuses runtime services while reflecting live repo state', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const container = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });

  try {
    const beforeFirstRead = await fixture.snapshotUserLayer();
    const firstDiagnostics = await container.startupDiagnostics.getDiagnostics();
    const afterFirstRead = await fixture.snapshotUserLayer();

    assert.deepEqual(afterFirstRead, beforeFirstRead);
    assert.deepEqual(
      firstDiagnostics.onboardingMissing.map((item) => item.surfaceKey),
      ['profileConfig', 'profileCv'],
    );

    await fixture.writeText('config/profile.yml', 'full_name: Test User\n');
    await fixture.writeText('profile/cv.md', '# CV\n');

    const beforeSecondRead = await fixture.snapshotUserLayer();
    const secondDiagnostics = await container.startupDiagnostics.getDiagnostics();
    const afterSecondRead = await fixture.snapshotUserLayer();

    assert.deepEqual(afterSecondRead, beforeSecondRead);
    assert.equal(secondDiagnostics.onboardingMissing.length, 0);
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container cleanup is idempotent and blocks reuse after dispose', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  const container = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });
  let cleanupCount = 0;

  container.addCleanupTask(() => {
    cleanupCount += 1;
  });

  await container.dispose();
  await container.dispose();

  assert.equal(cleanupCount, 1);
  await assert.rejects(
    () => container.startupDiagnostics.getDiagnostics(),
    /disposed/i,
  );

  await fixture.cleanup();
});

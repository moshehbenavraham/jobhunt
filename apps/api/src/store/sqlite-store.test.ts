import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { resolveOperationalStorePath } from '../config/app-state-root.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import {
  createOperationalStore,
  inspectOperationalStoreStatus,
  OperationalStoreError,
} from './index.js';

test('store status stays absent without creating the app-state root', async () => {
  const fixture = await createWorkspaceFixture();
  const appStateRoot = join(fixture.repoRoot, '.jobhunt-app');

  try {
    const status = await inspectOperationalStoreStatus({
      repoRoot: fixture.repoRoot,
    });

    assert.equal(status.status, 'absent');
    assert.equal(status.reason, 'root-missing');
    assert.equal(existsSync(appStateRoot), false);
  } finally {
    await fixture.cleanup();
  }
});

test('explicit store initialization is idempotent and produces a ready status', async () => {
  const fixture = await createWorkspaceFixture();
  const databasePath = resolveOperationalStorePath({
    repoRoot: fixture.repoRoot,
  });

  try {
    const firstStore = await createOperationalStore({
      repoRoot: fixture.repoRoot,
    });
    await firstStore.close();

    assert.equal(existsSync(databasePath), true);

    const statusAfterFirstInit = await inspectOperationalStoreStatus({
      repoRoot: fixture.repoRoot,
    });

    assert.equal(statusAfterFirstInit.status, 'ready');
    assert.equal(statusAfterFirstInit.reason, null);

    const secondStore = await createOperationalStore({
      repoRoot: fixture.repoRoot,
    });
    await secondStore.close();

    const statusAfterSecondInit = await inspectOperationalStoreStatus({
      repoRoot: fixture.repoRoot,
    });

    assert.equal(statusAfterSecondInit.status, 'ready');
    assert.equal(statusAfterSecondInit.reason, null);
  } finally {
    await fixture.cleanup();
  }
});

test('corrupt store contents surface actionable status and init failures', async () => {
  const fixture = await createWorkspaceFixture();
  const databasePath = resolveOperationalStorePath({
    repoRoot: fixture.repoRoot,
  });

  try {
    await mkdir(join(fixture.repoRoot, '.jobhunt-app'), { recursive: true });
    await writeFile(databasePath, 'not sqlite\n', 'utf8');

    const status = await inspectOperationalStoreStatus({
      repoRoot: fixture.repoRoot,
    });

    assert.equal(status.status, 'corrupt');
    assert.equal(status.reason, 'database-corrupt');
    assert.match(status.message, /corrupt/i);

    await assert.rejects(
      () =>
        createOperationalStore({
          repoRoot: fixture.repoRoot,
        }),
      (error: unknown) =>
        error instanceof OperationalStoreError &&
        error.code === 'operational-store-corrupt',
    );
  } finally {
    await fixture.cleanup();
  }
});

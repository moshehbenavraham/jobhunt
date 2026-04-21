import assert from 'node:assert/strict';
import test from 'node:test';
import { createOperationalStore } from '../store/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { OrchestrationError } from './orchestration-contract.js';
import { createWorkflowRouter } from './workflow-router.js';

async function createStoreHarness() {
  const fixture = await createWorkspaceFixture();
  const store = await createOperationalStore({
    repoRoot: fixture.repoRoot,
  });

  return {
    async cleanup() {
      await store.close();
      await fixture.cleanup();
    },
    fixture,
    store,
  };
}

test('workflow router resolves launch requests into deterministic specialist routes', async () => {
  const harness = await createStoreHarness();
  const router = createWorkflowRouter({
    getStore: async () => harness.store,
  });

  try {
    const route = await router.route({
      context: {
        origin: 'test',
      },
      kind: 'launch',
      sessionId: 'session-launch',
      workflow: 'single-evaluation',
    });

    assert.equal(route.status, 'ready');
    assert.equal(route.specialistId, 'evaluation-specialist');
    assert.equal(route.sessionId, 'session-launch');
    assert.equal(route.workflow, 'single-evaluation');
  } finally {
    await harness.cleanup();
  }
});

test('workflow router classifies unknown launch workflows as unsupported', async () => {
  const harness = await createStoreHarness();
  const router = createWorkflowRouter({
    getStore: async () => harness.store,
  });

  try {
    const route = await router.route({
      kind: 'launch',
      sessionId: 'session-unsupported',
      workflow: 'not-a-real-workflow',
    });

    assert.equal(route.status, 'unsupported-workflow');
    assert.equal(route.specialistId, null);
    assert.equal(route.workflow, null);
  } finally {
    await harness.cleanup();
  }
});

test('workflow router resolves resume requests from stored session state', async () => {
  const harness = await createStoreHarness();
  const router = createWorkflowRouter({
    getStore: async () => harness.store,
  });

  try {
    await harness.store.sessions.save({
      activeJobId: null,
      context: {
        origin: 'seed',
      },
      createdAt: '2026-04-21T09:00:00.000Z',
      lastHeartbeatAt: null,
      runnerId: null,
      sessionId: 'session-resume',
      status: 'pending',
      updatedAt: '2026-04-21T09:00:00.000Z',
      workflow: 'scan-portals',
    });

    const route = await router.route({
      kind: 'resume',
      sessionId: 'session-resume',
    });

    assert.equal(route.status, 'ready');
    assert.equal(route.specialistId, 'scan-specialist');
    assert.equal(route.workflow, 'scan-portals');
  } finally {
    await harness.cleanup();
  }
});

test('workflow router reports missing resume sessions without creating new state', async () => {
  const harness = await createStoreHarness();
  const router = createWorkflowRouter({
    getStore: async () => harness.store,
  });

  try {
    const route = await router.route({
      kind: 'resume',
      sessionId: 'missing-session',
    });

    assert.equal(route.status, 'session-not-found');
    assert.equal(route.sessionId, 'missing-session');
    assert.equal(route.workflow, null);
  } finally {
    await harness.cleanup();
  }
});

test('workflow router rejects malformed requests with explicit validation errors', async () => {
  const harness = await createStoreHarness();
  const router = createWorkflowRouter({
    getStore: async () => harness.store,
  });

  try {
    await assert.rejects(
      () => router.route({
        workflow: 'single-evaluation',
      }),
      (error: unknown) => {
        assert.ok(error instanceof OrchestrationError);
        assert.equal(error.code, 'orchestration-invalid-request');
        return true;
      },
    );
  } finally {
    await harness.cleanup();
  }
});

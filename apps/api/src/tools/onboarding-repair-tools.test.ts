import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServiceContainer } from '../runtime/service-container.js';
import { createWorkspaceMutationAdapter } from './workspace-mutation-adapter.js';
import { ToolExecutionError } from './tool-errors.js';
import { createWorkspaceAdapter } from '../workspace/index.js';
import { WorkspaceWriteConflictError } from '../workspace/workspace-errors.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createOnboardingRepairTools } from './onboarding-repair-tools.js';
import type {
  ToolExecutionContext,
  ToolWorkspaceMutationRequest,
} from './tool-contract.js';

const TEMPLATE_FIXTURE_FILES = {
  'config/portals.example.yml': 'title_filter:\n  positive:\n    - Forward Deployed\n',
  'config/profile.example.yml': 'candidate:\n  full_name: Template User\n',
  'data/applications.example.md': [
    '# Applications Tracker',
    '',
    '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
    '',
  ].join('\n'),
  'modes/_profile.template.md': '# Profile Template\n',
  'profile/cv.example.md': '# Template CV\n',
};

function createDirectToolContext(repoRoot: string): ToolExecutionContext<any> {
  const workspace = createWorkspaceAdapter({ repoRoot });
  const mutationAdapter = createWorkspaceMutationAdapter({ repoRoot });

  return {
    correlation: {
      jobId: 'job-repair-tool',
      requestId: 'request-repair-tool',
      sessionId: 'session-repair-tool',
      traceId: 'trace-repair-tool',
    },
    input: {},
    mutateWorkspace: (request: ToolWorkspaceMutationRequest) =>
      mutationAdapter.applyMutation(request),
    now: () => Date.parse('2026-04-21T08:00:00.000Z'),
    observe: async () => {},
    request: {
      correlation: {
        jobId: 'job-repair-tool',
        requestId: 'request-repair-tool',
        sessionId: 'session-repair-tool',
        traceId: 'trace-repair-tool',
      },
      input: {},
      toolName: 'repair-tool',
    },
    runScript: async () => {
      throw new Error('runScript should not be called by repair tools');
    },
    workspace,
  };
}

test('repair preview reports ready and already-present onboarding targets', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      ...TEMPLATE_FIXTURE_FILES,
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const tool = createOnboardingRepairTools({
    workspace,
  }).find((candidate) => candidate.name === 'preview-onboarding-repair');

  assert.ok(tool);

  try {
    const result = await tool.execute(
      tool.inputSchema.parse({
        targets: null,
      }),
      createDirectToolContext(fixture.repoRoot),
    );
    const output = result.output as Record<string, unknown>;
    const items = output.items as Array<Record<string, unknown>>;
    const readyTargets = items
      .filter((item) => item.ready === true)
      .map((item) => (item.destination as Record<string, unknown>).surfaceKey)
      .sort();
    const portalsItem = items.find(
      (item) =>
        ((item.destination as Record<string, unknown>).surfaceKey as string) ===
        'portalsConfig',
    );

    assert.equal(output.repairableCount, 3);
    assert.deepEqual(readyTargets, [
      'applicationsTracker',
      'profileConfig',
      'profileCv',
    ]);
    assert.equal(portalsItem?.reason, 'already-present');
  } finally {
    await fixture.cleanup();
  }
});

test('repair apply creates missing files from checked-in templates', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      ...TEMPLATE_FIXTURE_FILES,
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const tool = createOnboardingRepairTools({
    workspace,
  }).find((candidate) => candidate.name === 'repair-onboarding-files');

  assert.ok(tool);

  try {
    const result = await tool.execute(
      tool.inputSchema.parse({
        targets: ['applicationsTracker', 'profileConfig'],
      }),
      createDirectToolContext(fixture.repoRoot),
    );
    const output = result.output as Record<string, unknown>;

    assert.equal(output.repairedCount, 2);
    assert.equal(
      await fixture.readText('config/profile.yml'),
      'candidate:\n  full_name: Template User\n',
    );
    assert.ok((await fixture.readText('data/applications.md'))?.includes('# Applications Tracker'));
  } finally {
    await fixture.cleanup();
  }
});

test('repair apply refuses overwrite when the legacy CV fallback is already present', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      ...TEMPLATE_FIXTURE_FILES,
      'cv.md': '# Existing Legacy CV\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const tool = createOnboardingRepairTools({
    workspace,
  }).find((candidate) => candidate.name === 'repair-onboarding-files');

  assert.ok(tool);

  try {
    await assert.rejects(
      () =>
        tool.execute(
          tool.inputSchema.parse({
            targets: ['profileCv'],
          }),
          createDirectToolContext(fixture.repoRoot),
        ),
      WorkspaceWriteConflictError,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('repair apply maps missing template sources onto explicit configuration errors', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.example.yml': 'title_filter:\n  positive: []\n',
      'data/applications.example.md': '# Applications Tracker\n',
      'modes/_profile.template.md': '# Profile Template\n',
      'profile/cv.example.md': '# Template CV\n',
    },
  });
  const workspace = createWorkspaceAdapter({
    repoRoot: fixture.repoRoot,
  });
  const tool = createOnboardingRepairTools({
    workspace,
  }).find((candidate) => candidate.name === 'repair-onboarding-files');

  assert.ok(tool);

  try {
    await assert.rejects(
      () =>
        tool.execute(
          tool.inputSchema.parse({
            targets: ['profileConfig'],
          }),
          createDirectToolContext(fixture.repoRoot),
        ),
      (error: unknown) =>
        error instanceof ToolExecutionError &&
        error.code === 'tool-invalid-config',
    );
  } finally {
    await fixture.cleanup();
  }
});

test('repair tool requests approval before mutating the workspace through the runtime service', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      ...TEMPLATE_FIXTURE_FILES,
    },
  });
  const container = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });

  try {
    const toolService = await container.tools.getService();
    const result = await toolService.execute({
      correlation: {
        jobId: 'job-approval-repair',
        requestId: 'request-approval-repair',
        sessionId: 'session-approval-repair',
        traceId: 'trace-approval-repair',
      },
      input: {
        targets: ['profileConfig'],
      },
      toolName: 'repair-onboarding-files',
    });
    const approvals = await (
      await container.operationalStore.getStore()
    ).approvals.listByJobId('job-approval-repair');

    assert.equal(result.status, 'approval-required');
    assert.equal(approvals.length, 1);
    assert.equal(await fixture.readText('config/profile.yml'), null);
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

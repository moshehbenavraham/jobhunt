import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { z } from 'zod';
import { createAgentRuntimeService } from '../agent-runtime/index.js';
import { createTestExecutor } from '../job-runner/index.js';
import { getWorkflowModeRoute, type PromptSourceKey } from '../prompt/index.js';
import type { ToolDefinition } from '../tools/index.js';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import { createApiServiceContainer } from './service-container.js';
import { getRepoOpenAIAccountModuleImportPath } from '../agent-runtime/test-utils.js';

function createReadyBootstrap(
  workflow: 'single-evaluation',
  closeState: { count: number },
) {
  const sourceOrder: PromptSourceKey[] = [
    'agents-guide',
    'shared-mode',
    'profile-mode',
    'workflow-mode',
    'profile-config',
    'profile-cv',
  ];

  return {
    auth: {
      accountId: 'account-test',
      authPath: '/tmp/openai-account-auth.json',
      expiresAt: null,
      message: 'Runtime ready.',
      nextSteps: [],
      state: 'ready' as const,
      updatedAt: '2026-04-21T13:00:00.000Z',
    },
    config: {
      authPath: '/tmp/openai-account-auth.json',
      baseUrl: 'https://chatgpt.com/backend-api',
      model: 'gpt-5.4-mini',
      originator: 'pi',
      overrides: {
        authPath: false,
        baseUrl: false,
        model: false,
        originator: false,
      },
    },
    model: 'gpt-5.4-mini',
    prompt: {
      emptySources: [],
      issues: [],
      message: `Prompt bundle for workflow ${workflow} is ready.`,
      missingSources: [],
      modeRepoRelativePath: getWorkflowModeRoute(workflow).modeRepoRelativePath,
      requestedWorkflow: workflow,
      state: 'ready' as const,
      supportedWorkflows: [workflow],
      workflow,
    },
    promptBundle: {
      cacheMode: 'read-through-mtime' as const,
      composedText: `Prompt bundle for ${workflow}`,
      loadedAt: '2026-04-21T13:00:00.000Z',
      sourceOrder,
      sources: [],
      workflow: getWorkflowModeRoute(workflow),
    },
    provider: {
      async close() {
        closeState.count += 1;
      },
      getModel() {
        return {
          id: 'gpt-5.4-mini',
        };
      },
    },
    startedAt: '2026-04-21T13:00:01.000Z',
    status: 'ready' as const,
  };
}

test('service container reuses runtime services while reflecting live repo state', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'modes/_profile.md': '# Profile\n',
    },
  });
  const agentRuntime = createAgentRuntimeService({
    authModuleImportPath: getRepoOpenAIAccountModuleImportPath(),
    repoRoot: fixture.repoRoot,
  });
  const container = createApiServiceContainer({
    agentRuntime,
    repoRoot: fixture.repoRoot,
  });

  try {
    const beforeFirstRead = await fixture.snapshotUserLayer();
    const firstDiagnostics =
      await container.startupDiagnostics.getDiagnostics();
    const runtimeReadiness = await container.agentRuntime.getReadiness();
    const afterFirstRead = await fixture.snapshotUserLayer();

    assert.deepEqual(afterFirstRead, beforeFirstRead);
    assert.deepEqual(
      firstDiagnostics.onboardingMissing.map((item) => item.surfaceKey),
      ['profileConfig', 'profileCv'],
    );
    assert.equal(firstDiagnostics.agentRuntime.status, 'auth-required');
    assert.equal(runtimeReadiness.status, 'auth-required');
    assert.equal(
      runtimeReadiness.auth.authPath,
      join(fixture.repoRoot, 'data', 'openai-account-auth.json'),
    );

    await fixture.writeText('config/profile.yml', 'full_name: Test User\n');
    await fixture.writeText('profile/cv.md', '# CV\n');

    const beforeSecondRead = await fixture.snapshotUserLayer();
    const secondDiagnostics =
      await container.startupDiagnostics.getDiagnostics();
    const afterSecondRead = await fixture.snapshotUserLayer();

    assert.deepEqual(afterSecondRead, beforeSecondRead);
    assert.equal(secondDiagnostics.onboardingMissing.length, 0);
    assert.equal(secondDiagnostics.agentRuntime.status, 'auth-required');
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container cleanup is idempotent, disposes the agent runtime, and blocks reuse after dispose', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  let agentRuntimeCloseCount = 0;
  const container = createApiServiceContainer({
    agentRuntime: {
      async bootstrap() {
        throw new Error('bootstrap not needed in this test');
      },
      async close() {
        agentRuntimeCloseCount += 1;
      },
      async getReadiness() {
        return {
          auth: {
            accountId: null,
            authPath: join(
              fixture.repoRoot,
              'data',
              'openai-account-auth.json',
            ),
            expiresAt: null,
            message: 'Stored OpenAI account credentials are required.',
            nextSteps: ['npm run auth:openai -- login'],
            state: 'auth-required' as const,
            updatedAt: null,
          },
          config: {
            authPath: join(
              fixture.repoRoot,
              'data',
              'openai-account-auth.json',
            ),
            baseUrl: 'https://chatgpt.com/backend-api',
            model: 'gpt-5.4-mini',
            originator: 'pi',
            overrides: {
              authPath: false,
              baseUrl: false,
              model: false,
              originator: false,
            },
          },
          message: 'Stored OpenAI account credentials are required.',
          prompt: null,
          status: 'auth-required' as const,
        };
      },
    },
    repoRoot: fixture.repoRoot,
  });
  let cleanupCount = 0;

  container.addCleanupTask(() => {
    cleanupCount += 1;
  });
  await container.agentRuntime.getReadiness();

  await container.dispose();
  await container.dispose();

  assert.equal(cleanupCount, 1);
  assert.equal(agentRuntimeCloseCount, 1);
  await assert.rejects(
    () => container.startupDiagnostics.getDiagnostics(),
    /disposed/i,
  );

  await fixture.cleanup();
});

test('service container lazily creates and reuses a durable job runner', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  let executeCount = 0;
  const container = createApiServiceContainer({
    jobRunnerExecutors: [
      createTestExecutor({
        description: 'Completes a container-owned durable job.',
        execute: async (payload) => {
          executeCount += 1;
          return {
            result: {
              company: payload.company,
              ok: true,
            },
            status: 'completed',
          };
        },
        jobType: 'evaluate-job',
        payloadSchema: z.object({
          company: z.string(),
        }),
      }),
    ],
    repoRoot: fixture.repoRoot,
  });

  try {
    const runnerA = await container.jobRunner.getService();
    const runnerB = await container.jobRunner.getService();

    assert.equal(runnerA, runnerB);

    await runnerA.enqueue({
      jobId: 'job-container',
      jobType: 'evaluate-job',
      payload: {
        company: 'Container Co',
      },
      session: {
        context: {
          workflow: 'single-evaluation',
        },
        sessionId: 'session-container',
        workflow: 'single-evaluation',
      },
    });
    await runnerA.drainOnce();

    const store = await container.operationalStore.getStore();
    const job = await store.jobs.getById('job-container');

    assert.equal(executeCount, 1);
    assert.equal(job?.status, 'completed');
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container closes the durable job runner before generic cleanup tasks', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  let cleanupSawClosedRunner = false;
  let runnerCloseCount = 0;
  const fakeJobRunner = {
    async close() {
      runnerCloseCount += 1;
    },
    async drainOnce() {
      return {
        claimedJobIds: [],
        completedJobIds: [],
        recoveredJobIds: [],
        scannedAt: '2026-04-21T06:00:00.000Z',
        waitingJobIds: [],
      };
    },
    async enqueue() {
      throw new Error('enqueue not needed in this test');
    },
    getRecoverySummary() {
      return null;
    },
    async start() {},
  };
  const container = createApiServiceContainer({
    jobRunner: fakeJobRunner,
    repoRoot: fixture.repoRoot,
  });

  try {
    const runnerA = await container.jobRunner.getService();
    const runnerB = await container.jobRunner.getService();

    container.addCleanupTask(() => {
      cleanupSawClosedRunner = runnerCloseCount === 1;
    });

    assert.equal(runnerA, fakeJobRunner);
    assert.equal(runnerB, fakeJobRunner);

    await container.dispose();
    await container.dispose();

    assert.equal(runnerCloseCount, 1);
    assert.equal(cleanupSawClosedRunner, true);
    await assert.rejects(() => container.jobRunner.getService(), /disposed/i);
  } finally {
    await fixture.cleanup();
  }
});

test('service container lazily creates and reuses a tool execution service with shared runtime dependencies', async () => {
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
    toolDefinitions: [
      {
        description: 'Writes app-owned tool state.',
        async execute(_input, context) {
          const write = await context.mutateWorkspace({
            content: {
              ok: true,
            },
            repoRelativePath: '.jobhunt-app/tool-state.json',
            target: 'app-state',
          });

          return {
            output: {
              repoRelativePath: write.repoRelativePath,
            },
          };
        },
        inputSchema: z.object({}),
        name: 'write-tool-state',
        policy: {
          permissions: {
            mutationTargets: ['app-state'],
          },
        },
      } satisfies ToolDefinition<{}>,
    ],
  });

  try {
    await container.operationalStore.getStore();
    const toolServiceA = await container.tools.getService();
    const toolServiceB = await container.tools.getService();
    const catalogNames = toolServiceA.getRegistry().listNames();
    const result = await toolServiceA.execute({
      correlation: {
        jobId: 'job-tool-service',
        requestId: 'request-tool-service',
        sessionId: 'session-tool-service',
        traceId: 'trace-tool-service',
      },
      input: {},
      toolName: 'write-tool-state',
    });
    const events = await (
      await container.operationalStore.getStore()
    ).events.list({
      jobId: 'job-tool-service',
      limit: 10,
    });

    assert.equal(toolServiceA, toolServiceB);
    assert.ok(catalogNames.includes('bootstrap-single-evaluation'));
    assert.ok(catalogNames.includes('check-job-liveness'));
    assert.ok(catalogNames.includes('dry-run-batch-evaluation'));
    assert.ok(catalogNames.includes('enqueue-pipeline-processing'));
    assert.ok(catalogNames.includes('enqueue-portal-scan'));
    assert.ok(catalogNames.includes('extract-ats-job'));
    assert.ok(catalogNames.includes('generate-ats-pdf'));
    assert.ok(catalogNames.includes('inspect-startup-diagnostics'));
    assert.ok(catalogNames.includes('preview-onboarding-repair'));
    assert.ok(catalogNames.includes('retry-batch-evaluation-failures'));
    assert.ok(catalogNames.includes('reserve-report-artifact'));
    assert.ok(catalogNames.includes('start-batch-evaluation'));
    assert.ok(catalogNames.includes('stage-tracker-addition'));
    assert.ok(catalogNames.includes('write-tool-state'));
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.output, {
      repoRelativePath: '.jobhunt-app/tool-state.json',
    });
    assert.equal(
      await fixture.readText('.jobhunt-app/tool-state.json'),
      '{\n  "ok": true\n}\n',
    );
    assert.ok(
      events.some((event) => event.eventType === 'tool-execution-started'),
    );
    assert.ok(
      events.some((event) => event.eventType === 'tool-execution-completed'),
    );
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container lazily creates and reuses an orchestration service', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
    },
  });
  const closeState = {
    count: 0,
  };
  const container = createApiServiceContainer({
    agentRuntime: {
      async bootstrap(workflow) {
        assert.equal(workflow, 'single-evaluation');
        return createReadyBootstrap('single-evaluation', closeState);
      },
      async close() {},
      async getReadiness() {
        return {
          auth: {
            accountId: 'account-test',
            authPath: '/tmp/openai-account-auth.json',
            expiresAt: null,
            message: 'Runtime ready.',
            nextSteps: [],
            state: 'ready' as const,
            updatedAt: '2026-04-21T13:00:00.000Z',
          },
          config: {
            authPath: '/tmp/openai-account-auth.json',
            baseUrl: 'https://chatgpt.com/backend-api',
            model: 'gpt-5.4-mini',
            originator: 'pi',
            overrides: {
              authPath: false,
              baseUrl: false,
              model: false,
              originator: false,
            },
          },
          message: 'Runtime ready.',
          prompt: null,
          status: 'ready' as const,
        };
      },
    },
    repoRoot: fixture.repoRoot,
  });

  try {
    const orchestrationA = await container.orchestration.getService();
    const orchestrationB = await container.orchestration.getService();
    const result = await orchestrationA.orchestrate({
      kind: 'launch',
      sessionId: 'session-container-orchestration',
      workflow: 'single-evaluation',
    });

    assert.equal(orchestrationA, orchestrationB);
    assert.equal(result.route.status, 'ready');
    assert.equal(result.specialist?.id, 'evaluation-specialist');
    assert.equal(result.runtime.status, 'ready');
    assert.equal(result.session?.sessionId, 'session-container-orchestration');
    assert.equal(closeState.count, 1);
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container registers default Session 04 workflow executors', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
      'scripts/scan.mjs': [
        "process.stdout.write('Companies configured: 1\\n');",
        "process.stdout.write('Companies scanned: 1\\n');",
        "process.stdout.write('Companies skipped: 0\\n');",
        "process.stdout.write('Duplicates: 0 skipped\\n');",
        "process.stdout.write('Filtered by location: 0 removed\\n');",
        "process.stdout.write('Filtered by title: 0 removed\\n');",
        "process.stdout.write('New offers added: 2\\n');",
        "process.stdout.write('Total jobs found: 2\\n');",
        '',
      ].join('\n'),
    },
  });
  const container = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });

  try {
    const runner = await container.jobRunner.getService();

    await runner.enqueue({
      jobId: 'job-default-scan',
      jobType: 'scan-portals',
      payload: {
        compareClean: false,
        company: 'Example Co',
        dryRun: true,
      },
      session: {
        context: {
          origin: 'test',
        },
        sessionId: 'session-default-scan',
        workflow: 'scan-portals',
      },
    });
    await runner.drainOnce();

    const job = await (
      await container.operationalStore.getStore()
    ).jobs.getById('job-default-scan');
    const result = job?.result as {
      summary?: { newOffersAdded?: number; totalJobsFound?: number };
      workflow?: string;
    } | null;

    assert.equal(job?.status, 'completed');
    assert.equal(result?.workflow, 'scan-portals');
    assert.equal(result?.summary?.newOffersAdded, 2);
    assert.equal(result?.summary?.totalJobsFound, 2);
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container merges the default Session 03 script allowlist into tool execution', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.yml': 'full_name: Test User\n',
      'modes/_profile.md': '# Profile\n',
      'profile/cv.md': '# CV\n',
      'scripts/verify-pipeline.mjs':
        "process.stdout.write('pipeline-ok\\n');\n",
    },
  });
  const container = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
    toolDefinitions: [
      {
        description: 'Runs a default verify-pipeline script.',
        async execute(_input, context) {
          const scriptResult = await context.runScript({
            scriptName: 'verify-pipeline',
          });

          return {
            output: {
              exitCode: scriptResult.exitCode,
              stdout: scriptResult.stdout,
            },
          };
        },
        inputSchema: z.object({}),
        name: 'run-default-verify-script',
        policy: {
          permissions: {
            scripts: ['verify-pipeline'],
          },
        },
      } satisfies ToolDefinition<{}>,
    ],
  });

  try {
    const toolService = await container.tools.getService();
    const result = await toolService.execute({
      correlation: {
        jobId: 'job-default-script',
        requestId: 'request-default-script',
        sessionId: 'session-default-script',
        traceId: 'trace-default-script',
      },
      input: {},
      toolName: 'run-default-verify-script',
    });

    assert.equal(result.status, 'completed');
    assert.deepEqual(result.output, {
      exitCode: 0,
      stdout: 'pipeline-ok\n',
    });
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container default tool suite revalidates onboarding repair state on repeated calls', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'config/portals.example.yml': 'title_filter:\n  positive: []\n',
      'config/portals.yml': 'title_filter:\n  positive: []\n',
      'config/profile.example.yml': 'candidate:\n  full_name: Template User\n',
      'data/applications.example.md': '# Applications Tracker\n',
      'modes/_profile.md': '# Profile\n',
      'modes/_profile.template.md': '# Profile Template\n',
      'profile/cv.example.md': '# Template CV\n',
    },
  });
  const container = createApiServiceContainer({
    repoRoot: fixture.repoRoot,
  });

  try {
    const toolServiceA = await container.tools.getService();
    const firstResult = await toolServiceA.execute({
      correlation: {
        jobId: 'job-preview-a',
        requestId: 'request-preview-a',
        sessionId: 'session-preview',
        traceId: 'trace-preview-a',
      },
      input: {
        targets: null,
      },
      toolName: 'preview-onboarding-repair',
    });

    await fixture.writeText(
      'config/profile.yml',
      'candidate:\n  full_name: Live User\n',
    );

    const toolServiceB = await container.tools.getService();
    const secondResult = await toolServiceB.execute({
      correlation: {
        jobId: 'job-preview-b',
        requestId: 'request-preview-b',
        sessionId: 'session-preview',
        traceId: 'trace-preview-b',
      },
      input: {
        targets: null,
      },
      toolName: 'preview-onboarding-repair',
    });

    assert.equal(toolServiceA, toolServiceB);
    assert.equal(firstResult.status, 'completed');
    assert.equal(secondResult.status, 'completed');
    assert.equal(
      (firstResult.output as { repairableCount: number }).repairableCount,
      3,
    );
    assert.equal(
      (secondResult.output as { repairableCount: number }).repairableCount,
      2,
    );
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

test('service container blocks tool access after dispose', async () => {
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

  try {
    const toolService = await container.tools.getService();

    assert.ok(toolService);

    await container.dispose();
    await assert.rejects(() => container.tools.getService(), /disposed/i);
  } finally {
    await fixture.cleanup();
  }
});

test('service container reuses approval-runtime and observability services', async () => {
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

  try {
    const approvalRuntimeA = await container.approvalRuntime.getService();
    const approvalRuntimeB = await container.approvalRuntime.getService();
    const observabilityA = await container.observability.getService();
    const observabilityB = await container.observability.getService();
    const store = await container.operationalStore.getStore();

    await store.sessions.save({
      activeJobId: 'job-services',
      context: {
        workflow: 'single-evaluation',
      },
      createdAt: '2026-04-21T07:22:00.000Z',
      lastHeartbeatAt: '2026-04-21T07:22:00.000Z',
      runnerId: 'runner-services',
      sessionId: 'session-services',
      status: 'running',
      updatedAt: '2026-04-21T07:22:00.000Z',
      workflow: 'single-evaluation',
    });
    await store.jobs.save({
      attempt: 1,
      claimOwnerId: 'runner-services',
      claimToken: 'claim-services',
      completedAt: null,
      createdAt: '2026-04-21T07:22:00.000Z',
      currentRunId: 'run-services',
      error: null,
      jobId: 'job-services',
      jobType: 'evaluate-job',
      lastHeartbeatAt: '2026-04-21T07:22:00.000Z',
      leaseExpiresAt: '2026-04-21T07:23:00.000Z',
      maxAttempts: 3,
      nextAttemptAt: null,
      payload: {
        company: 'Services Co',
      },
      result: null,
      retryBackoffMs: 1_000,
      sessionId: 'session-services',
      startedAt: '2026-04-21T07:22:00.000Z',
      status: 'running',
      updatedAt: '2026-04-21T07:22:00.000Z',
      waitApprovalId: null,
      waitReason: null,
    });

    const approval = await approvalRuntimeA.createApproval({
      requestedAt: '2026-04-21T07:22:30.000Z',
      request: {
        action: 'send-email',
        correlation: {
          jobId: 'job-services',
          requestId: 'request-services',
          sessionId: 'session-services',
          traceId: 'trace-services',
        },
        details: null,
        title: 'Send services email',
      },
    });
    await observabilityA.recordEvent({
      correlation: {
        jobId: 'job-services',
        requestId: 'request-services',
        sessionId: 'session-services',
        traceId: 'trace-services',
      },
      eventType: 'job-failed',
      level: 'error',
      metadata: {
        message: 'Service container test failure',
        runId: 'run-services',
      },
      occurredAt: '2026-04-21T07:23:00.000Z',
      summary: 'Job failed.',
    });
    const pendingApprovals = await approvalRuntimeB.listPendingApprovals();
    const diagnostics = await observabilityB.getDiagnosticsSummary({
      traceId: 'trace-services',
    });

    assert.equal(approvalRuntimeA, approvalRuntimeB);
    assert.equal(observabilityA, observabilityB);
    assert.equal(pendingApprovals[0]?.approvalId, approval.approval.approvalId);
    assert.equal(diagnostics.failedJobs[0]?.jobId, 'job-services');
  } finally {
    await container.dispose();
    await fixture.cleanup();
  }
});

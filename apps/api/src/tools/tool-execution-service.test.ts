import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import type { ToolDefinition } from './tool-contract.js';
import { createToolHarness } from './test-utils.js';

function createCorrelation() {
  return {
    jobId: 'job-tool',
    requestId: 'req-tool',
    sessionId: 'session-tool',
    traceId: 'trace-tool',
  };
}

test('tool execution service maps invalid input onto deterministic error envelopes', async () => {
  const harness = await createToolHarness({
    tools: [
      {
        description: 'Validates a string payload.',
        async execute(input) {
          return {
            output: {
              value: input.value,
            },
          };
        },
        inputSchema: z.object({
          value: z.string().min(1),
        }),
        name: 'validate-input',
      } satisfies ToolDefinition<{ value: string }>,
    ],
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {
        value: 42,
      },
      toolName: 'validate-input',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error.code, 'tool-invalid-input');
  } finally {
    await harness.cleanup();
  }
});

test('tool execution service denies script usage that falls outside the declared policy', async () => {
  const harness = await createToolHarness({
    tools: [
      {
        description: 'Attempts a script without permission.',
        async execute(_input, context) {
          await context.runScript({
            scriptName: 'run-check',
          });

          return {
            output: null,
          };
        },
        inputSchema: z.object({}),
        name: 'script-without-permission',
      } satisfies ToolDefinition<{}>,
    ],
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {},
      toolName: 'script-without-permission',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error.code, 'tool-permission-denied');
  } finally {
    await harness.cleanup();
  }
});

test('tool execution service routes approval-required tools through the approval runtime before side effects', async () => {
  let executeCount = 0;
  const harness = await createToolHarness({
    tools: [
      {
        description: 'Requires approval before running.',
        async execute() {
          executeCount += 1;

          return {
            output: {
              ran: true,
            },
          };
        },
        inputSchema: z.object({
          company: z.string(),
        }),
        name: 'approval-tool',
        policy: {
          approval: {
            action: 'write-profile',
            details: (input) => ({
              company: input.company,
            }),
            title: (input) => `Approve ${input.company}`,
          },
        },
      } satisfies ToolDefinition<{ company: string }>,
    ],
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {
        company: 'Acme',
      },
      toolName: 'approval-tool',
    });

    const approvals = await harness.store.approvals.listByJobId('job-tool');
    const events = await harness.store.events.list({
      jobId: 'job-tool',
      limit: 10,
    });

    assert.equal(result.status, 'approval-required');
    assert.equal(result.approval.title, 'Approve Acme');
    assert.equal(executeCount, 0);
    assert.equal(approvals.length, 1);
    assert.equal(approvals[0]?.status, 'pending');
    assert.ok(
      events.some((event) => event.eventType === 'approval-requested'),
    );
    assert.ok(
      events.some((event) => event.eventType === 'tool-approval-required'),
    );
  } finally {
    await harness.cleanup();
  }
});

test('tool execution service maps workspace boundary failures into stable envelopes', async () => {
  const harness = await createToolHarness({
    tools: [
      {
        description: 'Attempts a denied mutation.',
        async execute(_input, context) {
          await context.mutateWorkspace({
            content: '# blocked\n',
            repoRelativePath: 'modes/_shared.md',
            target: 'profile',
          });

          return {
            output: null,
          };
        },
        inputSchema: z.object({}),
        name: 'blocked-mutation',
        policy: {
          permissions: {
            mutationTargets: ['profile'],
          },
        },
      } satisfies ToolDefinition<{}>,
    ],
  });

  try {
    const result = await harness.service.execute({
      correlation: createCorrelation(),
      input: {},
      toolName: 'blocked-mutation',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error.code, 'tool-workspace-denied');
  } finally {
    await harness.cleanup();
  }
});

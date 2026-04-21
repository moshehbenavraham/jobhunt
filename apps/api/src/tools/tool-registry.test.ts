import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { createToolRegistry } from './tool-registry.js';
import { ToolExecutionError } from './tool-errors.js';

function createTestTool(name: string, description = `Tool ${name}`) {
  return {
    description,
    async execute() {
      return {
        output: {
          ok: true,
        },
      };
    },
    inputSchema: z.object({}),
    name,
    policy: {
      permissions: {
        jobTypes: ['scan-portals'] as const,
        mutationTargets: ['app-state'] as const,
        scripts: ['health-check'] as const,
      },
    },
  };
}

test('tool registry lists catalog entries in deterministic order', () => {
  const registry = createToolRegistry([
    createTestTool('write-report'),
    createTestTool('check-health'),
  ]);

  assert.deepEqual(registry.listNames(), ['check-health', 'write-report']);
  assert.deepEqual(registry.listCatalog(), [
    {
      description: 'Tool check-health',
      jobTypes: ['scan-portals'],
      mutationTargets: ['app-state'],
      name: 'check-health',
      requiresApproval: false,
      scripts: ['health-check'],
    },
    {
      description: 'Tool write-report',
      jobTypes: ['scan-portals'],
      mutationTargets: ['app-state'],
      name: 'write-report',
      requiresApproval: false,
      scripts: ['health-check'],
    },
  ]);
});

test('tool registry rejects duplicate registrations', () => {
  assert.throws(
    () =>
      createToolRegistry([
        createTestTool('duplicate-tool'),
        createTestTool('duplicate-tool', 'Other duplicate'),
      ]),
    (error: unknown) => {
      assert.ok(error instanceof ToolExecutionError);
      assert.equal(error.code, 'tool-duplicate-registration');
      return true;
    },
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { createToolRegistry } from '../tools/index.js';
import { resolveSpecialistToolScope } from './tool-scope.js';

function createTestTool(name: string) {
  return {
    description: `Tool ${name}`,
    async execute() {
      return {
        output: {
          ok: true,
        },
      };
    },
    inputSchema: z.object({}),
    name,
  };
}

test('tool scope returns deterministic allowed and restricted entries', () => {
  const registry = createToolRegistry([
    createTestTool('alpha'),
    createTestTool('beta'),
    createTestTool('gamma'),
    createTestTool('delta'),
  ]);
  const scope = resolveSpecialistToolScope(registry, {
    allowedToolNames: ['beta'],
    deniedToolNames: ['delta'],
    restrictedToolNames: ['alpha'],
    revokedToolNames: ['gamma'],
  });

  assert.deepEqual(
    scope.catalog.map((entry) => ({
      access: entry.access,
      name: entry.name,
    })),
    [
      {
        access: 'restricted',
        name: 'alpha',
      },
      {
        access: 'allowed',
        name: 'beta',
      },
    ],
  );
  assert.deepEqual(scope.revokedToolNames, ['gamma']);
  assert.deepEqual(scope.deniedToolNames, ['delta']);
  assert.equal(scope.fallbackApplied, false);
});

test('tool scope applies restricted fallback tools when no direct tools are available', () => {
  const registry = createToolRegistry([
    createTestTool('alpha'),
    createTestTool('beta'),
  ]);
  const scope = resolveSpecialistToolScope(registry, {
    allowedToolNames: [],
    fallbackToolNames: ['beta'],
  });

  assert.equal(scope.fallbackApplied, true);
  assert.deepEqual(scope.catalog.map((entry) => entry.name), ['beta']);
  assert.deepEqual(scope.catalog.map((entry) => entry.access), ['restricted']);
  assert.deepEqual(scope.revokedToolNames, []);
});

test('tool scope fails fast when a specialist policy references an unknown tool', () => {
  const registry = createToolRegistry([createTestTool('alpha')]);

  assert.throws(
    () =>
      resolveSpecialistToolScope(registry, {
        allowedToolNames: ['missing-tool'],
      }),
    /unknown tool/i,
  );
});

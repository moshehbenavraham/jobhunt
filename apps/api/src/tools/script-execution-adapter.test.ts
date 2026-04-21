import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { createWorkspaceFixture } from '../workspace/test-utils.js';
import {
  createScriptExecutionAdapter,
  type ScriptExecutionDefinition,
} from './script-execution-adapter.js';
import { ToolExecutionError } from './tool-errors.js';

function createDefinition(
  repoRoot: string,
  name: string,
  overrides: Partial<ScriptExecutionDefinition> = {},
): ScriptExecutionDefinition {
  return {
    command: process.execPath,
    commandArgs: [join(repoRoot, 'scripts', `${name}.mjs`)],
    description: `Script ${name}`,
    name,
    ...overrides,
  };
}

test('script execution adapter runs allowlisted scripts with deterministic stdout mapping', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'scripts/print-ok.mjs': "process.stdout.write('ok\\n');\n",
    },
  });
  const adapter = createScriptExecutionAdapter({
    allowlist: [createDefinition(fixture.repoRoot, 'print-ok')],
    repoRoot: fixture.repoRoot,
  });

  try {
    const result = await adapter.execute({
      scriptName: 'print-ok',
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, 'ok\n');
    assert.equal(result.stderr, '');
  } finally {
    await fixture.cleanup();
  }
});

test('script execution adapter maps timeouts onto tool-script-timeout errors', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'scripts/slow-script.mjs':
        "await new Promise((resolve) => setTimeout(resolve, 200));\n",
    },
  });
  const adapter = createScriptExecutionAdapter({
    allowlist: [
      createDefinition(fixture.repoRoot, 'slow-script', {
        timeoutMs: 50,
      }),
    ],
    repoRoot: fixture.repoRoot,
  });

  try {
    await assert.rejects(
      () =>
        adapter.execute({
          scriptName: 'slow-script',
        }),
      (error: unknown) => {
        assert.ok(error instanceof ToolExecutionError);
        assert.equal(error.code, 'tool-script-timeout');
        return true;
      },
    );
  } finally {
    await fixture.cleanup();
  }
});

test('script execution adapter reports failed subprocess exits without leaking shell state', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'scripts/fail-script.mjs':
        "process.stderr.write('failure\\n');\nprocess.exit(5);\n",
    },
  });
  const adapter = createScriptExecutionAdapter({
    allowlist: [createDefinition(fixture.repoRoot, 'fail-script')],
    repoRoot: fixture.repoRoot,
  });

  try {
    await assert.rejects(
      () =>
        adapter.execute({
          scriptName: 'fail-script',
        }),
      (error: unknown) => {
        assert.ok(error instanceof ToolExecutionError);
        assert.equal(error.code, 'tool-script-failed');
        assert.ok(error.detail && typeof error.detail === 'object');
        const detail = error.detail as Record<string, unknown>;

        assert.equal(detail.attempts, 1);
        assert.equal(detail.exitCode, 5);
        assert.equal(detail.scriptName, 'fail-script');
        assert.equal(detail.stderr, 'failure\n');
        assert.equal(detail.stdout, '');
        assert.equal(typeof detail.durationMs, 'number');
        return true;
      },
    );
  } finally {
    await fixture.cleanup();
  }
});

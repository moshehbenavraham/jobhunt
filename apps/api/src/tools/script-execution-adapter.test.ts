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

test('script execution adapter accepts configured non-zero success exits', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'scripts/check-liveness-fixture.mjs': [
        "process.stdout.write('Checking 1 URL(s)...\\n\\n');",
        "process.stdout.write('WARN uncertain  https://example.com/job\\n');",
        "process.stdout.write('           timed out waiting for apply button\\n');",
        "process.stdout.write('\\nResults: 0 active  0 expired  1 uncertain\\n');",
        'process.exit(1);',
        '',
      ].join('\n'),
    },
  });
  const adapter = createScriptExecutionAdapter({
    allowlist: [
      createDefinition(fixture.repoRoot, 'check-liveness-fixture', {
        successExitCodes: [0, 1],
      }),
    ],
    repoRoot: fixture.repoRoot,
  });

  try {
    const result = await adapter.execute({
      scriptName: 'check-liveness-fixture',
    });

    assert.equal(result.exitCode, 1);
    assert.match(result.stdout, /uncertain/);
    assert.equal(result.stderr, '');
  } finally {
    await fixture.cleanup();
  }
});

test('script execution adapter retries configured retryable exits before succeeding', async () => {
  const fixture = await createWorkspaceFixture({
    files: {
      'scripts/retry-once.mjs': [
        "import { existsSync, readFileSync, writeFileSync } from 'node:fs';",
        "const statePath = new URL('./retry-once.state', import.meta.url);",
        'const attempts = existsSync(statePath)',
        "  ? Number.parseInt(readFileSync(statePath, 'utf8'), 10)",
        '  : 0;',
        "writeFileSync(statePath, String(attempts + 1), 'utf8');",
        'if (attempts === 0) {',
        "  process.stderr.write('retry me\\n');",
        '  process.exit(75);',
        '}',
        "process.stdout.write('ok after retry\\n');",
        '',
      ].join('\n'),
    },
  });
  const adapter = createScriptExecutionAdapter({
    allowlist: [
      createDefinition(fixture.repoRoot, 'retry-once', {
        retryableExitCodes: [75],
      }),
    ],
    repoRoot: fixture.repoRoot,
    retryBackoffMs: 0,
    retryAttempts: 2,
  });

  try {
    const result = await adapter.execute({
      scriptName: 'retry-once',
    });

    assert.equal(result.attempts, 2);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, 'ok after retry\n');
  } finally {
    await fixture.cleanup();
  }
});

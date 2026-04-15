#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const RUNNER_SOURCE = join(ROOT, 'batch', 'batch-runner.sh');
const PROMPT_SOURCE = join(ROOT, 'batch', 'batch-prompt.md');
const SCHEMA_SOURCE = join(ROOT, 'batch', 'worker-result.schema.json');
const MOCK_CODEX_SOURCE = join(
  ROOT,
  'batch',
  'test-fixtures',
  'mock-codex-exec.sh',
);

const EXPECTED_RESULT_KEYS = [
  'company',
  'error',
  'id',
  'legitimacy',
  'pdf',
  'report',
  'report_num',
  'role',
  'score',
  'status',
  'tracker',
  'warnings',
];

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function copyExecutable(sourcePath, targetPath) {
  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
  chmodSync(targetPath, 0o755);
}

function createSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'jobhunt-batch-contract-'));
  const batchDir = join(root, 'batch');
  const scriptsDir = join(root, 'scripts');
  const dataDir = join(root, 'data');
  const binDir = join(root, 'bin');

  mkdirSync(join(batchDir, 'logs'), { recursive: true });
  mkdirSync(join(batchDir, 'tracker-additions'), { recursive: true });
  mkdirSync(join(root, 'reports'), { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(binDir, { recursive: true });

  copyExecutable(RUNNER_SOURCE, join(batchDir, 'batch-runner.sh'));
  writeFile(
    join(batchDir, 'batch-prompt.md'),
    readFileSync(PROMPT_SOURCE, 'utf8'),
  );
  writeFile(
    join(batchDir, 'worker-result.schema.json'),
    readFileSync(SCHEMA_SOURCE, 'utf8'),
  );
  copyExecutable(MOCK_CODEX_SOURCE, join(binDir, 'codex'));

  writeFile(
    join(batchDir, 'batch-input.tsv'),
    `${[
      'id\turl\tsource\tnotes',
      '1\thttps://example.com/jobs/1\tfixture\tcontract test',
    ].join('\n')}\n`,
  );

  writeFile(
    join(dataDir, 'applications.md'),
    [
      '# Applications Tracker',
      '',
      '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
      '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
      '',
    ].join('\n'),
  );

  writeFile(join(scriptsDir, 'merge-tracker.mjs'), 'process.exit(0);\n');
  writeFile(join(scriptsDir, 'verify-pipeline.mjs'), 'process.exit(0);\n');

  return root;
}

function assertValidWorkerResult(result) {
  assert.deepEqual(Object.keys(result).sort(), EXPECTED_RESULT_KEYS);
  assert.match(result.id, /^[0-9]+$/);
  assert.match(result.report_num, /^[0-9]{3}$/);
  assert.equal(typeof result.company, 'string');
  assert.ok(result.company.length > 0);
  assert.equal(typeof result.role, 'string');
  assert.ok(result.role.length > 0);

  const legitimacyValues = new Set([
    'High Confidence',
    'Proceed with Caution',
    'Suspicious',
  ]);

  switch (result.status) {
    case 'completed':
      assert.equal(typeof result.score, 'number');
      assert.ok(legitimacyValues.has(result.legitimacy));
      assert.match(result.pdf, /^output\/.+\.pdf$/);
      assert.match(result.report, /^reports\/.+\.md$/);
      assert.match(result.tracker, /^batch\/tracker-additions\/.+\.tsv$/);
      assert.deepEqual(result.warnings, []);
      assert.equal(result.error, null);
      break;
    case 'partial':
      assert.equal(typeof result.score, 'number');
      assert.ok(legitimacyValues.has(result.legitimacy));
      assert.ok(result.pdf === null || /^output\/.+\.pdf$/.test(result.pdf));
      assert.match(result.report, /^reports\/.+\.md$/);
      assert.ok(
        result.tracker === null ||
          /^batch\/tracker-additions\/.+\.tsv$/.test(result.tracker),
      );
      assert.equal(Array.isArray(result.warnings), true);
      assert.ok(result.warnings.length > 0);
      assert.equal(new Set(result.warnings).size, result.warnings.length);
      assert.equal(result.error, null);
      break;
    case 'failed':
      assert.equal(result.score, null);
      assert.equal(result.legitimacy, null);
      assert.equal(result.pdf, null);
      assert.ok(
        result.report === null || /^reports\/.+\.md$/.test(result.report),
      );
      assert.equal(result.tracker, null);
      assert.deepEqual(result.warnings, []);
      assert.equal(typeof result.error, 'string');
      assert.ok(result.error.length > 0);
      break;
    default:
      assert.fail(`Unexpected worker status: ${result.status}`);
  }
}

function readStateRow(statePath) {
  const lines = readFileSync(statePath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2, `Expected one state row in ${statePath}`);
  const row = lines[1].split('\t');
  return {
    id: row[0],
    url: row[1],
    status: row[2],
    startedAt: row[3],
    completedAt: row[4],
    reportNum: row[5],
    score: row[6],
    error: row[7],
    retries: row[8],
  };
}

function assertInvocation(invocation, sandboxRoot) {
  const expectedSchemaPath = join(
    sandboxRoot,
    'batch',
    'worker-result.schema.json',
  );
  const expectedLastMessagePath = join(
    sandboxRoot,
    'batch',
    'logs',
    '001-1.last-message.json',
  );
  const expectedResultPath = join(
    sandboxRoot,
    'batch',
    'logs',
    '001-1.result.json',
  );

  assert.equal(invocation.cwd, sandboxRoot);
  assert.equal(invocation.schema, expectedSchemaPath);
  assert.equal(invocation.lastMessage, expectedLastMessagePath);
  assert.equal(invocation.resultFile, expectedResultPath);
  assert.equal(invocation.json, true);
  assert.ok(
    invocation.args.includes('--dangerously-bypass-approvals-and-sandbox'),
  );
  assert.ok(invocation.args.includes('--json'));
  assert.ok(invocation.args.includes('-'));
  assert.ok(invocation.prompt.includes(`RESULT_FILE: ${expectedResultPath}`));
  assert.ok(invocation.prompt.includes('https://example.com/jobs/1'));
  assert.ok(!invocation.prompt.includes('{{RESULT_FILE}}'));
  assert.ok(!invocation.prompt.includes('{{URL}}'));
  assert.ok(!invocation.prompt.includes('{{REPORT_NUM}}'));
}

function runScenario({
  name,
  fixturePath,
  mockExitCode = 0,
  mockWriteResult = true,
  expectedStateStatus,
  expectedStateScore,
  expectedStateError,
  expectedStateErrorPrefix,
  expectedRetries,
  expectedWorkerStatus,
  expectResultArtifact,
}) {
  const sandboxRoot = createSandbox();

  try {
    const invocationPath = join(sandboxRoot, 'mock-codex-invocation.json');
    const env = {
      ...process.env,
      PATH: `${join(sandboxRoot, 'bin')}:${process.env.PATH ?? ''}`,
      MOCK_CODEX_INVOCATION_FILE: invocationPath,
      MOCK_CODEX_FIXTURE: fixturePath ?? '',
      MOCK_CODEX_EXIT_CODE: String(mockExitCode),
      MOCK_CODEX_WRITE_RESULT: mockWriteResult ? 'true' : 'false',
    };

    const runnerPath = join(sandboxRoot, 'batch', 'batch-runner.sh');
    const runResult = spawnSync(runnerPath, [], {
      cwd: sandboxRoot,
      env,
      encoding: 'utf8',
    });

    assert.equal(
      runResult.status,
      0,
      `${name}: runner exited ${runResult.status}\nSTDOUT:\n${runResult.stdout}\nSTDERR:\n${runResult.stderr}`,
    );

    const invocation = readJson(invocationPath);
    assertInvocation(invocation, sandboxRoot);

    const schema = readJson(
      join(sandboxRoot, 'batch', 'worker-result.schema.json'),
    );
    assert.equal(Array.isArray(schema.oneOf), true);
    assert.equal(schema.oneOf.length, 3);

    const stateRow = readStateRow(
      join(sandboxRoot, 'batch', 'batch-state.tsv'),
    );
    assert.equal(
      stateRow.status,
      expectedStateStatus,
      `${name}: unexpected state status`,
    );
    assert.equal(
      stateRow.score,
      expectedStateScore,
      `${name}: unexpected score`,
    );
    assert.equal(
      stateRow.retries,
      expectedRetries,
      `${name}: unexpected retries`,
    );
    assert.equal(stateRow.reportNum, '001');
    if (expectedStateError !== undefined) {
      assert.equal(
        stateRow.error,
        expectedStateError,
        `${name}: unexpected state error`,
      );
    }
    if (expectedStateErrorPrefix !== undefined) {
      assert.ok(
        stateRow.error.startsWith(expectedStateErrorPrefix),
        `${name}: state error did not start with ${expectedStateErrorPrefix}`,
      );
    }

    const eventLogPath = join(sandboxRoot, 'batch', 'logs', '001-1.log');
    assert.equal(existsSync(eventLogPath), true, `${name}: missing event log`);
    const eventLog = readFileSync(eventLogPath, 'utf8');
    assert.ok(eventLog.includes('"type":"session.started"'));

    const lastMessagePath = join(
      sandboxRoot,
      'batch',
      'logs',
      '001-1.last-message.json',
    );
    const resultPath = join(sandboxRoot, 'batch', 'logs', '001-1.result.json');

    if (expectResultArtifact) {
      assert.equal(
        existsSync(lastMessagePath),
        true,
        `${name}: missing last message file`,
      );
      assert.equal(
        existsSync(resultPath),
        true,
        `${name}: missing result file`,
      );

      const expectedFixture = readJson(fixturePath);
      const lastMessage = readJson(lastMessagePath);
      const resultFile = readJson(resultPath);

      assert.deepEqual(lastMessage, expectedFixture);
      assert.deepEqual(resultFile, expectedFixture);
      assertValidWorkerResult(resultFile);

      if (expectedWorkerStatus) {
        assert.ok(
          runResult.stdout.includes(`worker status: ${expectedWorkerStatus}`),
          `${name}: stdout did not include worker status ${expectedWorkerStatus}`,
        );
      }
    } else {
      assert.equal(
        existsSync(lastMessagePath),
        false,
        `${name}: unexpected last message file`,
      );
      assert.equal(
        existsSync(resultPath),
        false,
        `${name}: unexpected result file`,
      );
      assert.ok(
        stateRow.error.length > 0,
        `${name}: expected a stored error message`,
      );
    }
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true });
  }
}

const completedFixture = join(
  ROOT,
  'batch',
  'test-fixtures',
  'worker-result-completed.json',
);
const partialFixture = join(
  ROOT,
  'batch',
  'test-fixtures',
  'worker-result-partial.json',
);
const failedFixture = join(
  ROOT,
  'batch',
  'test-fixtures',
  'worker-result-failed.json',
);

assertValidWorkerResult(readJson(completedFixture));
assertValidWorkerResult(readJson(partialFixture));
assertValidWorkerResult(readJson(failedFixture));

runScenario({
  name: 'completed fixture',
  fixturePath: completedFixture,
  expectedStateStatus: 'completed',
  expectedStateScore: '4.6',
  expectedStateError: '-',
  expectedRetries: '0',
  expectedWorkerStatus: 'completed',
  expectResultArtifact: true,
});

runScenario({
  name: 'partial fixture',
  fixturePath: partialFixture,
  expectedStateStatus: 'partial',
  expectedStateScore: '4.2',
  expectedStateError: 'warnings: pdf-not-generated; tracker-not-written',
  expectedRetries: '0',
  expectedWorkerStatus: 'partial',
  expectResultArtifact: true,
});

runScenario({
  name: 'semantic failed fixture',
  fixturePath: failedFixture,
  expectedStateStatus: 'failed',
  expectedStateScore: '-',
  expectedStateError:
    'semantic: The worker could not complete the evaluation pipeline',
  expectedRetries: '0',
  expectedWorkerStatus: 'failed',
  expectResultArtifact: true,
});

runScenario({
  name: 'non-zero codex exit',
  fixturePath: failedFixture,
  mockExitCode: 23,
  mockWriteResult: false,
  expectedStateStatus: 'failed',
  expectedStateScore: '-',
  expectedStateErrorPrefix: 'infrastructure: exit 23;',
  expectedRetries: '1',
  expectedWorkerStatus: null,
  expectResultArtifact: false,
});

console.log('Batch runner contract tests passed');

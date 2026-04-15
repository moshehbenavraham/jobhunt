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

const COMPLETED_FIXTURE = join(
  ROOT,
  'batch',
  'test-fixtures',
  'worker-result-completed.json',
);
const PARTIAL_FIXTURE = join(
  ROOT,
  'batch',
  'test-fixtures',
  'worker-result-partial.json',
);
const FAILED_FIXTURE = join(
  ROOT,
  'batch',
  'test-fixtures',
  'worker-result-failed.json',
);

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function copyExecutable(sourcePath, targetPath) {
  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
  chmodSync(targetPath, 0o755);
}

function buildInputRow(id) {
  const url = `https://example.com/jobs/${id}`;
  const notes = `Role ${id} @ Example ${id} | 95% | ${url}`;
  return `${id}\t${url}\tfixture\t${notes}`;
}

function buildStateRow({
  id,
  status,
  reportNum,
  score = '-',
  error = '-',
  retries = '0',
}) {
  const url = `https://example.com/jobs/${id}`;
  return [
    id,
    url,
    status,
    '2026-04-15T10:00:00Z',
    '2026-04-15T10:10:00Z',
    reportNum,
    score,
    error,
    retries,
  ].join('\t');
}

function createSandbox({ inputRows, stateRows = [] }) {
  const root = mkdtempSync(join(tmpdir(), 'career-ops-batch-state-'));
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
  writeFile(join(batchDir, 'batch-prompt.md'), readFileSync(PROMPT_SOURCE, 'utf8'));
  writeFile(join(batchDir, 'worker-result.schema.json'), readFileSync(SCHEMA_SOURCE, 'utf8'));
  copyExecutable(MOCK_CODEX_SOURCE, join(binDir, 'codex'));

  writeFile(
    join(batchDir, 'batch-input.tsv'),
    ['id\turl\tsource\tnotes', ...inputRows].join('\n') + '\n',
  );

  if (stateRows.length > 0) {
    writeFile(
      join(batchDir, 'batch-state.tsv'),
      [
        'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries',
        ...stateRows,
      ].join('\n') + '\n',
    );
  }

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

function runRunner(sandboxRoot, { args = [], env = {} } = {}) {
  const runnerPath = join(sandboxRoot, 'batch', 'batch-runner.sh');
  return spawnSync(runnerPath, args, {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      PATH: `${join(sandboxRoot, 'bin')}:${process.env.PATH ?? ''}`,
      ...env,
    },
    encoding: 'utf8',
  });
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

function summaryLine(stdout) {
  return stdout
    .split('\n')
    .find((line) => line.startsWith('Total: '));
}

function dryRunIds(stdout) {
  return stdout
    .split('\n')
    .filter((line) => line.startsWith('  #'))
    .map((line) => {
      const match = /^  #(\d+):/.exec(line);
      return match ? match[1] : null;
    })
    .filter(Boolean);
}

function assertRunSucceeded(result, name) {
  assert.equal(
    result.status,
    0,
    `${name}: runner exited ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
}

function runSingleOfferScenario({
  name,
  fixturePath,
  mockExitCode = 0,
  mockWriteResult = true,
  expectedStatus,
  expectedScore,
  expectedError,
  expectedErrorPrefix,
  expectedRetries,
  expectedSummary,
  expectedStdoutFragment,
}) {
  const sandboxRoot = createSandbox({ inputRows: [buildInputRow('1')] });

  try {
    const result = runRunner(sandboxRoot, {
      env: {
        MOCK_CODEX_FIXTURE: fixturePath ?? '',
        MOCK_CODEX_EXIT_CODE: String(mockExitCode),
        MOCK_CODEX_WRITE_RESULT: mockWriteResult ? 'true' : 'false',
      },
    });

    assertRunSucceeded(result, name);

    const stateRow = readStateRow(join(sandboxRoot, 'batch', 'batch-state.tsv'));
    assert.equal(stateRow.status, expectedStatus, `${name}: unexpected state status`);
    assert.equal(stateRow.score, expectedScore, `${name}: unexpected state score`);
    if (expectedError !== undefined) {
      assert.equal(stateRow.error, expectedError, `${name}: unexpected state error`);
    }
    if (expectedErrorPrefix !== undefined) {
      assert.ok(
        stateRow.error.startsWith(expectedErrorPrefix),
        `${name}: state error did not start with "${expectedErrorPrefix}"`,
      );
    }
    assert.equal(stateRow.retries, expectedRetries, `${name}: unexpected retries`);
    assert.equal(summaryLine(result.stdout), expectedSummary, `${name}: unexpected summary line`);
    assert.ok(
      result.stdout.includes(expectedStdoutFragment),
      `${name}: stdout did not include "${expectedStdoutFragment}"`,
    );
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true });
  }
}

runSingleOfferScenario({
  name: 'completed state semantics',
  fixturePath: COMPLETED_FIXTURE,
  expectedStatus: 'completed',
  expectedScore: '4.6',
  expectedError: '-',
  expectedRetries: '0',
  expectedSummary: 'Total: 1 | Completed: 1 | Partial: 0 | Failed: 0 | Retryable Failed: 0 | Skipped: 0 | Pending: 0',
  expectedStdoutFragment: 'Completed (worker status: completed, score: 4.6, report: 001)',
});

runSingleOfferScenario({
  name: 'partial state semantics',
  fixturePath: PARTIAL_FIXTURE,
  expectedStatus: 'partial',
  expectedScore: '4.2',
  expectedError: 'warnings: pdf-not-generated; tracker-not-written',
  expectedRetries: '0',
  expectedSummary: 'Total: 1 | Completed: 0 | Partial: 1 | Failed: 0 | Retryable Failed: 0 | Skipped: 0 | Pending: 0',
  expectedStdoutFragment: 'Partial (worker status: partial, score: 4.2, report: 001, warnings: 2)',
});

runSingleOfferScenario({
  name: 'semantic failed state semantics',
  fixturePath: FAILED_FIXTURE,
  expectedStatus: 'failed',
  expectedScore: '-',
  expectedError: 'semantic: The worker could not complete the evaluation pipeline',
  expectedRetries: '0',
  expectedSummary: 'Total: 1 | Completed: 0 | Partial: 0 | Failed: 1 | Retryable Failed: 0 | Skipped: 0 | Pending: 0',
  expectedStdoutFragment: 'Failed (worker status: failed, report: 001)',
});

runSingleOfferScenario({
  name: 'infrastructure failure state semantics',
  fixturePath: FAILED_FIXTURE,
  mockExitCode: 17,
  mockWriteResult: false,
  expectedStatus: 'failed',
  expectedScore: '-',
  expectedErrorPrefix: 'infrastructure: exit 17;',
  expectedRetries: '1',
  expectedSummary: 'Total: 1 | Completed: 0 | Partial: 0 | Failed: 0 | Retryable Failed: 1 | Skipped: 0 | Pending: 0',
  expectedStdoutFragment: 'Failed (retryable infrastructure failure, attempt 1, exit code 17)',
});

{
  const sandboxRoot = createSandbox({
    inputRows: [
      buildInputRow('1'),
      buildInputRow('2'),
      buildInputRow('3'),
      buildInputRow('4'),
      buildInputRow('5'),
      buildInputRow('6'),
      buildInputRow('7'),
    ],
    stateRows: [
      buildStateRow({
        id: '1',
        status: 'completed',
        reportNum: '001',
        score: '4.8',
        error: '-',
      }),
      buildStateRow({
        id: '2',
        status: 'partial',
        reportNum: '002',
        score: '4.2',
        error: 'warnings: pdf-not-generated',
      }),
      buildStateRow({
        id: '3',
        status: 'failed',
        reportNum: '003',
        error: 'semantic: worker could not evaluate the role',
        retries: '0',
      }),
      buildStateRow({
        id: '4',
        status: 'failed',
        reportNum: '004',
        error: 'infrastructure: exit 17; worker timed out',
        retries: '1',
      }),
      buildStateRow({
        id: '5',
        status: 'skipped',
        reportNum: '005',
        score: '2.1',
        error: 'below-min-score',
      }),
      buildStateRow({
        id: '7',
        status: 'failed',
        reportNum: '007',
        error: 'infrastructure: exit 17; worker timed out',
        retries: '2',
      }),
    ],
  });

  try {
    const normalDryRun = runRunner(sandboxRoot, { args: ['--dry-run'] });
    assertRunSucceeded(normalDryRun, 'normal rerun gating');
    assert.deepEqual(
      dryRunIds(normalDryRun.stdout),
      ['4', '6'],
      'normal rerun gating: expected only retryable infra failure and pending rows',
    );

    const retryDryRun = runRunner(sandboxRoot, {
      args: ['--dry-run', '--retry-failed'],
    });
    assertRunSucceeded(retryDryRun, 'retry-failed rerun gating');
    assert.deepEqual(
      dryRunIds(retryDryRun.stdout),
      ['4'],
      'retry-failed rerun gating: expected only retryable infra failure rows',
    );
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true });
  }
}

console.log('Batch runner state-semantics tests passed');

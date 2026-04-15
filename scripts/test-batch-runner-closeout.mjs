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
const MERGE_SOURCE = join(ROOT, 'scripts', 'merge-tracker.mjs');
const VERIFY_SOURCE = join(ROOT, 'scripts', 'verify-pipeline.mjs');

const MOCK_CODEX_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail

if [[ "\${1:-}" != "exec" ]]; then
  echo "mock-codex-closeout: expected 'exec' subcommand" >&2
  exit 64
fi
shift

last_message_file=""
json_mode=false
prompt_source=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -C|--cd)
      shift 2
      ;;
    --output-schema)
      shift 2
      ;;
    -o|--output-last-message)
      last_message_file="$2"
      shift 2
      ;;
    --json|--dangerously-bypass-approvals-and-sandbox)
      if [[ "$1" == "--json" ]]; then
        json_mode=true
      fi
      shift
      ;;
    --)
      shift
      break
      ;;
    -)
      prompt_source="-"
      shift
      break
      ;;
    -*)
      shift
      ;;
    *)
      prompt_source="$1"
      shift
      break
      ;;
  esac
done

if [[ "$prompt_source" == "-" || -p /dev/stdin ]]; then
  prompt_text="$(cat)"
else
  prompt_text="$prompt_source"
fi

result_file="$(printf '%s\n' "$prompt_text" | sed -n 's/^RESULT_FILE:[[:space:]]*//p' | head -1)"
if [[ -z "$result_file" ]]; then
  echo "mock-codex-closeout: RESULT_FILE missing from prompt" >&2
  exit 65
fi

base_name="$(basename "$result_file")"
report_num="\${base_name%%-*}"
rest="\${base_name#*-}"
offer_id="\${rest%%.*}"
report_num_value=$((10#$report_num))

mode="\${MOCK_CLOSEOUT_MODE:-completed}"
date_value="\${MOCK_CLOSEOUT_DATE:-2026-04-15}"
company_slug="example-ai"
company_name="Example AI"
role_name="Senior AI Engineer"
report_path="reports/\${report_num}-\${company_slug}-\${date_value}.md"
pdf_path="output/cv-candidate-\${company_slug}-\${date_value}.pdf"
tracker_path="batch/tracker-additions/\${offer_id}.tsv"

mkdir -p "$(dirname "$result_file")"
if [[ -n "$last_message_file" ]]; then
  mkdir -p "$(dirname "$last_message_file")"
fi

if [[ "$json_mode" == "true" ]]; then
  printf '{"type":"session.started","mock_mode":"%s"}\n' "$mode"
fi

case "$mode" in
  completed)
    mkdir -p "$(dirname "$report_path")" "$(dirname "$tracker_path")" "$(dirname "$pdf_path")"
    printf '# Report %s\n\nFixture closeout report for offer %s.\n' "$report_num" "$offer_id" > "$report_path"
    : > "$pdf_path"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$report_num_value" \
      "$date_value" \
      "$company_name" \
      "$role_name" \
      "Evaluated" \
      "4.6/5" \
      "[PDF](\${pdf_path})" \
      "[\${report_num}](\${report_path})" \
      "sandbox closeout" > "$tracker_path"
    cat > "$result_file" <<EOF
{
  "status": "completed",
  "id": "$offer_id",
  "report_num": "$report_num",
  "company": "$company_name",
  "role": "$role_name",
  "score": 4.6,
  "legitimacy": "High Confidence",
  "pdf": "$pdf_path",
  "report": "$report_path",
  "tracker": "$tracker_path",
  "warnings": [],
  "error": null
}
EOF
    if [[ -n "$last_message_file" ]]; then
      cp "$result_file" "$last_message_file"
    fi
    ;;
  infrastructure)
    echo "mock infrastructure failure for offer $offer_id" >&2
    if [[ "$json_mode" == "true" ]]; then
      printf '{"type":"session.failed","exit_code":17}\n'
    fi
    exit 17
    ;;
  *)
    echo "mock-codex-closeout: unsupported mode $mode" >&2
    exit 66
    ;;
esac

if [[ "$json_mode" == "true" ]]; then
  printf '{"type":"session.completed","exit_code":0}\n'
fi
`;

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function copyExecutable(sourcePath, targetPath) {
  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
  chmodSync(targetPath, 0o755);
}

function createApplicationsTracker() {
  return [
    '# Applications Tracker',
    '',
    '| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |',
    '| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |',
    '',
  ].join('\n');
}

function createSandbox({ existingReportNums = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'jobhunt-batch-closeout-'));
  const batchDir = join(root, 'batch');
  const scriptsDir = join(root, 'scripts');
  const dataDir = join(root, 'data');
  const reportsDir = join(root, 'reports');
  const outputDir = join(root, 'output');
  const binDir = join(root, 'bin');

  mkdirSync(join(batchDir, 'logs'), { recursive: true });
  mkdirSync(join(batchDir, 'tracker-additions'), { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(reportsDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });
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
  writeFile(
    join(scriptsDir, 'merge-tracker.mjs'),
    readFileSync(MERGE_SOURCE, 'utf8'),
  );
  writeFile(
    join(scriptsDir, 'verify-pipeline.mjs'),
    readFileSync(VERIFY_SOURCE, 'utf8'),
  );
  writeFile(join(binDir, 'codex'), MOCK_CODEX_SCRIPT);
  chmodSync(join(binDir, 'codex'), 0o755);

  writeFile(
    join(batchDir, 'batch-input.tsv'),
    `${[
      'id\turl\tsource\tnotes',
      '1\thttps://example.com/jobs/1\tfixture\tcloseout test',
    ].join('\n')}\n`,
  );
  writeFile(join(dataDir, 'applications.md'), createApplicationsTracker());

  for (const reportNum of existingReportNums) {
    const padded = String(reportNum).padStart(3, '0');
    writeFile(
      join(reportsDir, `${padded}-seed-report.md`),
      `# Seed report ${padded}\n`,
    );
  }

  return root;
}

function runRunner(sandboxRoot, args = [], extraEnv = {}) {
  return spawnSync(join(sandboxRoot, 'batch', 'batch-runner.sh'), args, {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      PATH: `${join(sandboxRoot, 'bin')}:${process.env.PATH ?? ''}`,
      MOCK_CLOSEOUT_DATE: '2026-04-15',
      ...extraEnv,
    },
    encoding: 'utf8',
  });
}

function runNodeScript(sandboxRoot, scriptName) {
  return spawnSync('node', [join(sandboxRoot, 'scripts', scriptName)], {
    cwd: sandboxRoot,
    env: process.env,
    encoding: 'utf8',
  });
}

function assertSucceeded(result, name) {
  assert.equal(
    result.status,
    0,
    `${name}: exit ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
}

function readStateRows(statePath) {
  const lines = readFileSync(statePath, 'utf8').trim().split('\n');
  return lines.slice(1).map((line) => {
    const row = line.split('\t');
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
  });
}

function assertIncludes(text, fragment, name) {
  assert.ok(
    text.includes(fragment),
    `${name}: expected output to include "${fragment}"\nSTDOUT:\n${text}`,
  );
}

function readApplications(path) {
  return readFileSync(path, 'utf8');
}

function scenarioCloseoutWithSeededReport() {
  const sandboxRoot = createSandbox({ existingReportNums: [4] });

  try {
    const dryRun = runRunner(sandboxRoot, ['--dry-run'], {
      MOCK_CLOSEOUT_MODE: 'completed',
    });
    assertSucceeded(dryRun, 'closeout dry run');
    assertIncludes(
      dryRun.stdout,
      '=== DRY RUN (no processing) ===',
      'closeout dry run',
    );
    assertIncludes(
      dryRun.stdout,
      '#1: https://example.com/jobs/1',
      'closeout dry run',
    );
    const dryRunState = readFileSync(
      join(sandboxRoot, 'batch', 'batch-state.tsv'),
      'utf8',
    );
    assert.equal(
      dryRunState.trim(),
      'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries',
      'closeout dry run: expected only state header',
    );

    const runResult = runRunner(sandboxRoot, [], {
      MOCK_CLOSEOUT_MODE: 'completed',
    });
    assertSucceeded(runResult, 'closeout normal run');
    assertIncludes(
      runResult.stdout,
      '=== Merging tracker additions ===',
      'closeout normal run',
    );
    assertIncludes(
      runResult.stdout,
      '=== Verifying pipeline integrity ===',
      'closeout normal run',
    );

    const stateRows = readStateRows(
      join(sandboxRoot, 'batch', 'batch-state.tsv'),
    );
    assert.equal(
      stateRows.length,
      1,
      'closeout normal run: expected one state row',
    );
    assert.equal(stateRows[0].status, 'completed');
    assert.equal(stateRows[0].reportNum, '005');
    assert.equal(stateRows[0].score, '4.6');
    assert.equal(stateRows[0].retries, '0');

    const appsContent = readApplications(
      join(sandboxRoot, 'data', 'applications.md'),
    );
    assertIncludes(
      appsContent,
      '| 5 | 2026-04-15 | Example AI | Senior AI Engineer | 4.6/5 | Evaluated |',
      'closeout applications',
    );
    assertIncludes(
      appsContent,
      '[005](reports/005-example-ai-2026-04-15.md)',
      'closeout applications',
    );
    assert.equal(
      existsSync(join(sandboxRoot, 'batch', 'tracker-additions', '1.tsv')),
      false,
      'closeout normal run: tracker TSV should be moved after merge',
    );
    assert.equal(
      existsSync(
        join(sandboxRoot, 'batch', 'tracker-additions', 'merged', '1.tsv'),
      ),
      true,
      'closeout normal run: merged tracker TSV missing',
    );
    assert.equal(
      existsSync(join(sandboxRoot, 'reports', '005-example-ai-2026-04-15.md')),
      true,
      'closeout normal run: expected report artifact',
    );

    const verifyResult = runNodeScript(sandboxRoot, 'verify-pipeline.mjs');
    assertSucceeded(verifyResult, 'closeout verify rerun');
    assertIncludes(
      verifyResult.stdout,
      'No pending TSVs',
      'closeout verify rerun',
    );
    assertIncludes(
      verifyResult.stdout,
      'All report links valid',
      'closeout verify rerun',
    );
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true });
  }
}

function scenarioRetryFailedRerunUsesNextReportNumber() {
  const sandboxRoot = createSandbox({ existingReportNums: [5] });

  try {
    const failedRun = runRunner(sandboxRoot, [], {
      MOCK_CLOSEOUT_MODE: 'infrastructure',
    });
    assertSucceeded(failedRun, 'retry-failed initial infrastructure run');
    assertIncludes(
      failedRun.stdout,
      'Failed (retryable infrastructure failure, attempt 1, exit code 17)',
      'retry-failed initial infrastructure run',
    );

    let stateRows = readStateRows(
      join(sandboxRoot, 'batch', 'batch-state.tsv'),
    );
    assert.equal(
      stateRows.length,
      1,
      'retry-failed initial infrastructure run: expected one state row',
    );
    assert.equal(stateRows[0].status, 'failed');
    assert.equal(stateRows[0].reportNum, '006');
    assert.equal(stateRows[0].retries, '1');
    assert.ok(
      stateRows[0].error.startsWith('infrastructure: exit 17;'),
      'retry-failed initial infrastructure run: missing infrastructure error prefix',
    );

    const retryDryRun = runRunner(
      sandboxRoot,
      ['--dry-run', '--retry-failed'],
      {
        MOCK_CLOSEOUT_MODE: 'completed',
      },
    );
    assertSucceeded(retryDryRun, 'retry-failed dry run');
    assertIncludes(
      retryDryRun.stdout,
      '#1: https://example.com/jobs/1',
      'retry-failed dry run',
    );

    const retryRun = runRunner(sandboxRoot, ['--retry-failed'], {
      MOCK_CLOSEOUT_MODE: 'completed',
    });
    assertSucceeded(retryRun, 'retry-failed rerun');
    assertIncludes(
      retryRun.stdout,
      'Completed (worker status: completed, score: 4.6, report: 007)',
      'retry-failed rerun',
    );

    stateRows = readStateRows(join(sandboxRoot, 'batch', 'batch-state.tsv'));
    assert.equal(stateRows[0].status, 'completed');
    assert.equal(stateRows[0].reportNum, '007');
    assert.equal(stateRows[0].retries, '1');

    const appsContent = readApplications(
      join(sandboxRoot, 'data', 'applications.md'),
    );
    assertIncludes(
      appsContent,
      '[007](reports/007-example-ai-2026-04-15.md)',
      'retry-failed applications',
    );

    const verifyResult = runNodeScript(sandboxRoot, 'verify-pipeline.mjs');
    assertSucceeded(verifyResult, 'retry-failed verify rerun');
    assertIncludes(
      verifyResult.stdout,
      'No pending TSVs',
      'retry-failed verify rerun',
    );
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true });
  }
}

scenarioCloseoutWithSeededReport();
scenarioRetryFailedRerunUsesNextReportNumber();

console.log('Batch runner closeout tests passed');

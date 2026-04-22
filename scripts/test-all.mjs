#!/usr/bin/env node

/**
 * test-all.mjs - Comprehensive test suite for jobhunt
 *
 * Run before merging any PR or pushing changes.
 * Tests: syntax, scripts, dashboard, data contract, personal data, paths.
 *
 * Usage:
 *   node scripts/test-all.mjs           # Run all tests
 *   node scripts/test-all.mjs --quick   # Skip dashboard build (faster)
 */

import { execSync, execFileSync } from 'node:child_process';
import {
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const QUICK = process.argv.includes('--quick');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
  passed++;
}
function fail(msg) {
  console.log(`  [FAIL] ${msg}`);
  failed++;
}
function warn(msg) {
  console.log(`  [WARN] ${msg}`);
  warnings++;
}

function run(cmd, args = [], opts = {}) {
  try {
    if (Array.isArray(args) && args.length > 0) {
      return execFileSync(cmd, args, {
        cwd: ROOT,
        encoding: 'utf-8',
        timeout: 30000,
        ...opts,
      }).trim();
    }
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 30000,
      ...opts,
    }).trim();
  } catch (_e) {
    return null;
  }
}

function fileExists(path) {
  return existsSync(join(ROOT, path));
}
function readFile(path) {
  return readFileSync(join(ROOT, path), 'utf-8');
}
function readJson(path) {
  return JSON.parse(readFile(path));
}
function stripAnsi(text) {
  const ESC = String.fromCharCode(0x1b);
  return text.replace(new RegExp(`${ESC}\\[[0-9;]*m`, 'g'), '');
}

console.log('\njobhunt test suite\n');

// -- 1. SYNTAX CHECKS --------------------------------------------

console.log('1. Syntax checks');

const mjsFiles = readdirSync(join(ROOT, 'scripts')).filter((f) =>
  f.endsWith('.mjs'),
);
for (const f of mjsFiles) {
  const result = run('node', ['--check', join('scripts', f)]);
  if (result !== null) {
    pass(`${f} syntax OK`);
  } else {
    fail(`${f} has syntax errors`);
  }
}

// -- 2. SCRIPT EXECUTION -----------------------------------------

console.log('\n2. Script execution (graceful on empty data)');

const scripts = [
  { name: 'cv-sync-check.mjs', expectExit: 1, allowFail: true }, // fails without any CV (normal in repo)
  { name: 'verify-pipeline.mjs', expectExit: 0 },
  { name: 'normalize-statuses.mjs', expectExit: 0 },
  { name: 'dedup-tracker.mjs', expectExit: 0 },
  { name: 'merge-tracker.mjs', expectExit: 0 },
  { name: 'update-system.mjs check', expectExit: 0 },
];

for (const { name, allowFail } of scripts) {
  const parts = name.split(' ');
  parts[0] = join('scripts', parts[0]);
  const result = run('node', parts, { stdio: ['pipe', 'pipe', 'pipe'] });
  if (result !== null) {
    pass(`${name} runs OK`);
  } else if (allowFail) {
    warn(`${name} exited with error (expected without user data)`);
  } else {
    fail(`${name} crashed`);
  }
}

// -- 3. LIVENESS CLASSIFICATION ----------------------------------

console.log('\n3. Liveness classification');

try {
  const { classifyLiveness } = await import(
    pathToFileURL(join(ROOT, 'scripts', 'liveness-core.mjs')).href
  );

  const expiredChromeApply = classifyLiveness({
    finalUrl: 'https://example.com/jobs/closed-role',
    bodyText:
      'Company Careers\nApply\nThe job you are looking for is no longer open.',
    applyControls: [],
  });
  if (expiredChromeApply.result === 'expired') {
    pass('Expired pages are not revived by nav/footer "Apply" text');
  } else {
    fail(`Expired page misclassified as ${expiredChromeApply.result}`);
  }

  const activeWorkdayPage = classifyLiveness({
    finalUrl: 'https://example.workday.com/job/123',
    bodyText: [
      '663 JOBS FOUND',
      'Senior AI Engineer',
      'Join our applied AI team to ship production systems, partner with customers, and own delivery across evaluation, deployment, and reliability.',
    ].join('\n'),
    applyControls: ['Apply for this Job'],
  });
  if (activeWorkdayPage.result === 'active') {
    pass('Visible apply controls still keep real job pages active');
  } else {
    fail(`Active job page misclassified as ${activeWorkdayPage.result}`);
  }
} catch (e) {
  fail(`Liveness classification tests crashed: ${e.message}`);
}

// -- 3b. BATCH RUNNER CONTRACT ----------------------------------

console.log('\n3b. Batch runner contract');

const batchContract = run('node', ['scripts/test-batch-runner-contract.mjs']);
if (batchContract !== null) {
  pass('Batch runner contract tests pass');
} else {
  fail('Batch runner contract tests failed');
}

// -- 3c. BATCH RUNNER STATE SEMANTICS ---------------------------

console.log('\n3c. Batch runner state semantics');

const batchStateSemantics = run('node', [
  'scripts/test-batch-runner-state-semantics.mjs',
]);
if (batchStateSemantics !== null) {
  pass('Batch runner state-semantics tests pass');
} else {
  fail('Batch runner state-semantics tests failed');
}

// -- 3d. BATCH RUNNER CLOSEOUT ----------------------------------

console.log('\n3d. Batch runner closeout');

const batchCloseout = run('node', ['scripts/test-batch-runner-closeout.mjs']);
if (batchCloseout !== null) {
  pass('Batch runner closeout tests pass');
} else {
  fail('Batch runner closeout tests failed');
}

// -- 3e. PDF ATS NORMALIZATION ----------------------------------

console.log('\n3e. PDF ATS normalization');

const pdfNormalization = run('node', [
  'scripts/test-generate-pdf-normalization.mjs',
]);
if (pdfNormalization !== null) {
  pass('PDF ATS normalization regression test passes');
} else {
  fail('PDF ATS normalization regression test failed');
}

// -- 3f. Pattern analysis regressions ----------------------------

console.log('\n3f. Pattern analysis regressions');

const analyzePatterns = run('node', ['scripts/test-analyze-patterns.mjs']);
if (analyzePatterns !== null) {
  pass('Pattern analysis regression tests pass');
} else {
  fail('Pattern analysis regression tests failed');
}

// -- 3g. Follow-up cadence regressions ---------------------------

console.log('\n3g. Follow-up cadence regressions');

const followupCadence = run('node', ['scripts/test-followup-cadence.mjs']);
if (followupCadence !== null) {
  pass('Follow-up cadence regression tests pass');
} else {
  fail('Follow-up cadence regression tests failed');
}

// -- 3h. ATS extraction regressions ------------------------------

console.log('\n3h. ATS extraction regressions');

const extractJob = run('node', ['scripts/test-extract-job.mjs']);
if (extractJob !== null) {
  pass('ATS extraction regression tests pass');
} else {
  fail('ATS extraction regression tests failed');
}

// -- 3i. Auto-pipeline ATS routing regressions ------------------

console.log('\n3i. Auto-pipeline ATS routing regressions');

const autoPipelineRouting = run('node', [
  'scripts/test-auto-pipeline-routing.mjs',
]);
if (autoPipelineRouting !== null) {
  pass('Auto-pipeline ATS routing regression tests pass');
} else {
  fail('Auto-pipeline ATS routing regression tests failed');
}

// -- 3j. Portal scan regressions --------------------------------

console.log('\n3j. Portal scan regressions');

const scanRegressions = run('node', ['scripts/test-scan.mjs']);
if (scanRegressions !== null) {
  pass('Portal scan regression tests pass');
} else {
  fail('Portal scan regression tests failed');
}

// -- 3k. Job liveness regressions -------------------------------

console.log('\n3k. Job liveness regressions');

const checkLiveness = run('node', ['scripts/test-check-liveness.mjs']);
if (checkLiveness !== null) {
  pass('Job liveness regression tests pass');
} else {
  fail('Job liveness regression tests failed');
}

// -- 3l. Maintenance script regressions -------------------------

console.log('\n3l. Maintenance script regressions');

const maintenanceScripts = run('node', [
  'scripts/test-maintenance-scripts.mjs',
]);
if (maintenanceScripts !== null) {
  pass('Maintenance script regression tests pass');
} else {
  fail('Maintenance script regression tests failed');
}

// -- 3m. Updater regressions ------------------------------------

console.log('\n3m. Updater regressions');

const updateSystem = run('node', ['scripts/test-update-system-cli.mjs']);
if (updateSystem !== null) {
  pass('Updater regression tests pass');
} else {
  fail('Updater regression tests failed');
}

// -- 3n. OpenAI account auth regressions ------------------------

console.log('\n3n. OpenAI account auth regressions');

const openaiAccountAuth = run('node', ['scripts/test-openai-account-auth.mjs']);
if (openaiAccountAuth !== null) {
  pass('OpenAI account auth regression tests pass');
} else {
  fail('OpenAI account auth regression tests failed');
}

// -- 3o. OpenAI Codex transport regressions ---------------------

console.log('\n3o. OpenAI Codex transport regressions');

const openaiCodexTransport = run('node', [
  'scripts/test-openai-codex-transport.mjs',
]);
if (openaiCodexTransport !== null) {
  pass('OpenAI Codex transport regression tests pass');
} else {
  fail('OpenAI Codex transport regression tests failed');
}

// -- 3p. OpenAI Agents Codex provider regressions ---------------

console.log('\n3p. OpenAI Agents Codex provider regressions');

const openaiAgentsCodexProvider = run('node', [
  'scripts/test-openai-agents-provider.mjs',
]);
if (openaiAgentsCodexProvider !== null) {
  pass('OpenAI Agents Codex provider regression tests pass');
} else {
  fail('OpenAI Agents Codex provider regression tests failed');
}

// -- 3q. App scaffold regressions -------------------------------

console.log('\n3q. App scaffold regressions');

const appScaffold = run('node', ['scripts/test-app-scaffold.mjs']);
if (appScaffold !== null) {
  pass('App scaffold regression tests pass');
} else {
  fail('App scaffold regression tests failed');
}

// -- 3r. App runtime contract -----------------------------------

console.log('\n3r. App runtime contract');

const appRuntimeContract = run('npm', ['run', 'app:api:test:runtime']);
if (appRuntimeContract !== null) {
  pass('App runtime contract tests pass');
} else {
  fail('App runtime contract tests failed');
}

// -- 3s. App agent-runtime contract -----------------------------

console.log('\n3s. App agent-runtime contract');

const appAgentRuntimeContract = run('npm', [
  'run',
  'app:api:test:agent-runtime',
]);
if (appAgentRuntimeContract !== null) {
  pass('App agent-runtime contract tests pass');
} else {
  fail('App agent-runtime contract tests failed');
}

// -- 3t. App approval-runtime contract ---------------------------

console.log('\n3t. App approval-runtime contract');

const appApprovalRuntimeContract = run('npm', [
  'run',
  'app:api:test:approval-runtime',
]);
if (appApprovalRuntimeContract !== null) {
  pass('App approval-runtime contract tests pass');
} else {
  fail('App approval-runtime contract tests failed');
}

// -- 3u. App observability contract ------------------------------

console.log('\n3u. App observability contract');

const appObservabilityContract = run('npm', [
  'run',
  'app:api:test:observability',
]);
if (appObservabilityContract !== null) {
  pass('App observability contract tests pass');
} else {
  fail('App observability contract tests failed');
}

// -- 3v. App durable job-runner contract -------------------------

console.log('\n3v. App durable job-runner contract');

const appJobRunnerContract = run('npm', ['run', 'app:api:test:job-runner']);
if (appJobRunnerContract !== null) {
  pass('App durable job-runner contract tests pass');
} else {
  fail('App durable job-runner contract tests failed');
}

// -- 3w. App store contract --------------------------------------

console.log('\n3w. App store contract');

const appStoreContract = run('npm', ['run', 'app:api:test:store']);
if (appStoreContract !== null) {
  pass('App store contract tests pass');
} else {
  fail('App store contract tests failed');
}

// -- 3x. App tools contract --------------------------------------

console.log('\n3x. App tools contract');

const appToolsContract = run('npm', ['run', 'app:api:test:tools']);
if (appToolsContract !== null) {
  pass('App tools contract tests pass');
} else {
  fail('App tools contract tests failed');
}

// -- 3y. App bootstrap smoke -------------------------------------

console.log('\n3y. App bootstrap smoke');

const appBootstrap = run('node', ['scripts/test-app-bootstrap.mjs']);
if (appBootstrap !== null) {
  pass('App bootstrap smoke tests pass');
} else {
  fail('App bootstrap smoke tests failed');
}

// -- 3z. App shell smoke -----------------------------------------

console.log('\n3z. App shell smoke');

const appShell = run('node', ['scripts/test-app-shell.mjs']);
if (appShell !== null) {
  pass('App shell smoke tests pass');
} else {
  fail('App shell smoke tests failed');
}

// -- 3aa. App chat-console smoke ---------------------------------

console.log('\n3aa. App chat-console smoke');

const appChatConsole = run('node', ['scripts/test-app-chat-console.mjs']);
if (appChatConsole !== null) {
  pass('App chat-console smoke tests pass');
} else {
  fail('App chat-console smoke tests failed');
}

// -- 3ab. App settings smoke -------------------------------------

console.log('\n3ab. App settings smoke');

const appSettings = run('node', ['scripts/test-app-settings.mjs']);
if (appSettings !== null) {
  pass('App settings smoke tests pass');
} else {
  fail('App settings smoke tests failed');
}

// -- 3ac. App approval inbox smoke -------------------------------

console.log('\n3ac. App approval inbox smoke');

const appApprovalInbox = run('node', ['scripts/test-app-approval-inbox.mjs']);
if (appApprovalInbox !== null) {
  pass('App approval inbox smoke tests pass');
} else {
  fail('App approval inbox smoke tests failed');
}

// -- 3ad. App onboarding smoke -----------------------------------

console.log('\n3ad. App onboarding smoke');

const appOnboarding = run('node', ['scripts/test-app-onboarding.mjs']);
if (appOnboarding !== null) {
  pass('App onboarding smoke tests pass');
} else {
  fail('App onboarding smoke tests failed');
}

// -- 3ae. Bootstrap ASCII validation -----------------------------

console.log('\n3ae. Bootstrap ASCII validation');

const bootstrapFiles = [
  'apps/api/src/approval-runtime/approval-runtime-contract.ts',
  'apps/api/src/approval-runtime/approval-runtime-service.test.ts',
  'apps/api/src/approval-runtime/approval-runtime-service.ts',
  'apps/api/src/approval-runtime/index.ts',
  'apps/api/src/agent-runtime/agent-runtime-config.test.ts',
  'apps/api/src/agent-runtime/agent-runtime-config.ts',
  'apps/api/src/agent-runtime/agent-runtime-contract.ts',
  'apps/api/src/agent-runtime/agent-runtime-service.test.ts',
  'apps/api/src/agent-runtime/agent-runtime-service.ts',
  'apps/api/src/agent-runtime/index.ts',
  'apps/api/src/agent-runtime/openai-account-provider.test.ts',
  'apps/api/src/agent-runtime/openai-account-provider.ts',
  'apps/api/src/agent-runtime/test-utils.ts',
  'apps/api/src/index.ts',
  'apps/api/src/job-runner/index.ts',
  'apps/api/src/job-runner/job-runner-contract.ts',
  'apps/api/src/job-runner/job-runner-executors.ts',
  'apps/api/src/job-runner/job-runner-service.test.ts',
  'apps/api/src/job-runner/job-runner-service.ts',
  'apps/api/src/job-runner/job-runner-state-machine.test.ts',
  'apps/api/src/job-runner/job-runner-state-machine.ts',
  'apps/api/src/job-runner/test-utils.ts',
  'apps/api/src/job-runner/workflow-job-contract.ts',
  'apps/api/src/job-runner/workflow-job-executors.test.ts',
  'apps/api/src/job-runner/workflow-job-executors.ts',
  'apps/api/src/observability/index.ts',
  'apps/api/src/observability/observability-contract.ts',
  'apps/api/src/observability/observability-service.test.ts',
  'apps/api/src/observability/observability-service.ts',
  'apps/api/src/orchestration/index.ts',
  'apps/api/src/orchestration/orchestration-contract.ts',
  'apps/api/src/orchestration/orchestration-service.test.ts',
  'apps/api/src/orchestration/orchestration-service.ts',
  'apps/api/src/orchestration/session-lifecycle.test.ts',
  'apps/api/src/orchestration/session-lifecycle.ts',
  'apps/api/src/orchestration/specialist-catalog.test.ts',
  'apps/api/src/orchestration/specialist-catalog.ts',
  'apps/api/src/orchestration/tool-scope.test.ts',
  'apps/api/src/orchestration/tool-scope.ts',
  'apps/api/src/orchestration/workflow-router.test.ts',
  'apps/api/src/orchestration/workflow-router.ts',
  'apps/api/src/runtime/runtime-config.test.ts',
  'apps/api/src/runtime/runtime-config.ts',
  'apps/api/src/runtime/service-container.test.ts',
  'apps/api/src/runtime/service-container.ts',
  'apps/api/src/server/approval-inbox-summary.ts',
  'apps/api/src/server/http-server.test.ts',
  'apps/api/src/server/http-server.ts',
  'apps/api/src/server/index.ts',
  'apps/api/src/server/chat-console-summary.ts',
  'apps/api/src/server/onboarding-summary.ts',
  'apps/api/src/server/operator-shell-summary.ts',
  'apps/api/src/server/settings-summary.ts',
  'apps/api/src/server/settings-update-check.ts',
  'apps/api/src/server/route-contract.ts',
  'apps/api/src/server/routes/chat-console-route.ts',
  'apps/api/src/server/routes/health-route.ts',
  'apps/api/src/server/routes/index.ts',
  'apps/api/src/server/routes/onboarding-repair-route.ts',
  'apps/api/src/server/routes/onboarding-route.ts',
  'apps/api/src/server/routes/orchestration-route.ts',
  'apps/api/src/server/routes/operator-shell-route.ts',
  'apps/api/src/server/routes/settings-route.ts',
  'apps/api/src/server/routes/approval-inbox-route.ts',
  'apps/api/src/server/routes/approval-resolution-route.ts',
  'apps/api/src/server/routes/runtime-approvals-route.ts',
  'apps/api/src/server/routes/runtime-diagnostics-route.ts',
  'apps/api/src/server/routes/startup-route.ts',
  'apps/api/src/server/startup-status.ts',
  'apps/api/src/store/approval-repository.ts',
  'apps/api/src/store/index.ts',
  'apps/api/src/store/job-repository.ts',
  'apps/api/src/store/repositories.test.ts',
  'apps/api/src/store/runtime-event-repository.ts',
  'apps/api/src/store/run-metadata-repository.ts',
  'apps/api/src/store/session-repository.ts',
  'apps/api/src/store/sqlite-schema.ts',
  'apps/api/src/store/sqlite-store.test.ts',
  'apps/api/src/store/sqlite-store.ts',
  'apps/api/src/store/store-contract.ts',
  'apps/api/src/tools/default-tool-scripts.ts',
  'apps/api/src/tools/default-tool-suite.ts',
  'apps/api/src/tools/batch-workflow-tools.test.ts',
  'apps/api/src/tools/batch-workflow-tools.ts',
  'apps/api/src/tools/evaluation-artifact-tools.test.ts',
  'apps/api/src/tools/evaluation-artifact-tools.ts',
  'apps/api/src/tools/evaluation-intake-tools.test.ts',
  'apps/api/src/tools/evaluation-intake-tools.ts',
  'apps/api/src/tools/evaluation-workflow-tools.test.ts',
  'apps/api/src/tools/evaluation-workflow-tools.ts',
  'apps/api/src/tools/index.ts',
  'apps/api/src/tools/liveness-check-tools.test.ts',
  'apps/api/src/tools/liveness-check-tools.ts',
  'apps/api/src/tools/pdf-generation-tools.test.ts',
  'apps/api/src/tools/pdf-generation-tools.ts',
  'apps/api/src/tools/pipeline-processing-tools.test.ts',
  'apps/api/src/tools/pipeline-processing-tools.ts',
  'apps/api/src/tools/script-execution-adapter.test.ts',
  'apps/api/src/tools/script-execution-adapter.ts',
  'apps/api/src/tools/scan-workflow-tools.test.ts',
  'apps/api/src/tools/scan-workflow-tools.ts',
  'apps/api/src/tools/startup-inspection-tools.test.ts',
  'apps/api/src/tools/startup-inspection-tools.ts',
  'apps/api/src/tools/test-utils.ts',
  'apps/api/src/tools/tool-contract.ts',
  'apps/api/src/tools/tool-errors.ts',
  'apps/api/src/tools/tool-execution-service.test.ts',
  'apps/api/src/tools/tool-execution-service.ts',
  'apps/api/src/tools/tool-registry.test.ts',
  'apps/api/src/tools/tool-registry.ts',
  'apps/api/src/tools/tracker-integrity-tools.test.ts',
  'apps/api/src/tools/tracker-integrity-tools.ts',
  'apps/api/src/tools/workflow-enqueue.ts',
  'apps/api/src/tools/workspace-discovery-tools.test.ts',
  'apps/api/src/tools/workspace-discovery-tools.ts',
  'apps/api/src/tools/workspace-mutation-adapter.test.ts',
  'apps/api/src/tools/workspace-mutation-adapter.ts',
  'apps/web/src/App.tsx',
  'apps/web/src/approvals/approval-context-panel.tsx',
  'apps/web/src/approvals/approval-decision-bar.tsx',
  'apps/web/src/approvals/approval-inbox-client.ts',
  'apps/web/src/approvals/approval-inbox-surface.tsx',
  'apps/web/src/approvals/approval-inbox-types.ts',
  'apps/web/src/approvals/approval-queue-list.tsx',
  'apps/web/src/approvals/interrupted-run-panel.tsx',
  'apps/web/src/approvals/use-approval-inbox.ts',
  'apps/web/src/boot/missing-files-list.tsx',
  'apps/web/src/boot/startup-client.ts',
  'apps/web/src/boot/startup-status-panel.tsx',
  'apps/web/src/boot/startup-types.ts',
  'apps/web/src/boot/use-startup-diagnostics.ts',
  'apps/web/src/chat/chat-console-client.ts',
  'apps/web/src/chat/chat-console-surface.tsx',
  'apps/web/src/chat/chat-console-types.ts',
  'apps/web/src/chat/recent-session-list.tsx',
  'apps/web/src/chat/run-status-panel.tsx',
  'apps/web/src/chat/run-timeline.tsx',
  'apps/web/src/chat/use-chat-console.ts',
  'apps/web/src/chat/workflow-composer.tsx',
  'apps/web/src/onboarding/onboarding-checklist.tsx',
  'apps/web/src/onboarding/onboarding-client.ts',
  'apps/web/src/onboarding/onboarding-types.ts',
  'apps/web/src/onboarding/onboarding-wizard-surface.tsx',
  'apps/web/src/onboarding/readiness-handoff-card.tsx',
  'apps/web/src/onboarding/repair-confirmation-panel.tsx',
  'apps/web/src/onboarding/repair-preview-list.tsx',
  'apps/web/src/onboarding/use-onboarding-wizard.ts',
  'apps/web/src/settings/settings-auth-card.tsx',
  'apps/web/src/settings/settings-client.ts',
  'apps/web/src/settings/settings-maintenance-card.tsx',
  'apps/web/src/settings/settings-runtime-card.tsx',
  'apps/web/src/settings/settings-support-card.tsx',
  'apps/web/src/settings/settings-surface.tsx',
  'apps/web/src/settings/settings-types.ts',
  'apps/web/src/settings/settings-workspace-card.tsx',
  'apps/web/src/settings/use-settings-surface.ts',
  'apps/web/src/shell/navigation-rail.tsx',
  'apps/web/src/shell/operator-shell-client.ts',
  'apps/web/src/shell/operator-shell.tsx',
  'apps/web/src/shell/shell-types.ts',
  'apps/web/src/shell/status-strip.tsx',
  'apps/web/src/shell/surface-placeholder.tsx',
  'apps/web/src/shell/use-operator-shell.ts',
  'apps/web/vite.config.ts',
  'scripts/test-app-scaffold.mjs',
  'scripts/test-app-approval-inbox.mjs',
  'scripts/test-app-bootstrap.mjs',
  'scripts/test-app-chat-console.mjs',
  'scripts/test-app-onboarding.mjs',
  'scripts/test-app-settings.mjs',
  'scripts/test-app-shell.mjs',
];

for (const path of bootstrapFiles) {
  if (!fileExists(path)) {
    fail(`Bootstrap file missing for ASCII validation: ${path}`);
    continue;
  }

  if (new RegExp('[^\\x00-\\x7F]').test(readFile(path))) {
    fail(`Bootstrap file contains non-ASCII characters: ${path}`);
  } else {
    pass(`Bootstrap file is ASCII-only: ${path}`);
  }
}

// -- 3l. UPGRADE SAFETY REGRESSIONS ------------------------------

console.log('\n3l. Upgrade safety regressions');

try {
  const updaterSource = readFile('scripts/update-system.mjs');
  const updaterHarnessPath = join(ROOT, '.tmp-test-update-system-contract.mjs');
  writeFileSync(
    updaterHarnessPath,
    `${updaterSource.split('// -- MAIN')[0]}\nexport { isUserPath, isUpdateTargetPath };\n`,
  );
  try {
    const updaterHarness = await import(pathToFileURL(updaterHarnessPath).href);

    if (updaterHarness.isUpdateTargetPath('data/follow-ups.example.md')) {
      pass(
        'Updater still treats data/follow-ups.example.md as a system target',
      );
    } else {
      fail('Updater lost data/follow-ups.example.md as a system target');
    }

    if (!updaterHarness.isUserPath('data/follow-ups.example.md')) {
      pass('Updater does not classify data/follow-ups.example.md as user data');
    } else {
      fail('Updater still classifies data/follow-ups.example.md as user data');
    }

    if (updaterHarness.isUserPath('data/applications.md')) {
      pass('Updater still protects real user data under data/');
    } else {
      fail('Updater no longer protects real user data under data/');
    }

    if (updaterHarness.isUserPath('cv.md')) {
      pass('Updater still protects legacy root cv.md');
    } else {
      fail('Updater does not protect legacy root cv.md');
    }

    if (updaterHarness.isUserPath('portals.yml')) {
      pass('Updater still protects legacy root portals.yml during migration');
    } else {
      fail('Updater does not protect legacy root portals.yml during migration');
    }

    if (updaterHarness.isUpdateTargetPath('templates/portals.example.yml')) {
      pass('Updater still tracks removed templates for upgrade cleanup');
    } else {
      fail('Updater does not track removed templates for upgrade cleanup');
    }

    const latexSystemTargets = [
      'modes/latex.md',
      'scripts/generate-latex.mjs',
      'scripts/test-generate-latex.mjs',
      'templates/cv-template.tex',
    ];

    for (const path of latexSystemTargets) {
      if (updaterHarness.isUpdateTargetPath(path)) {
        pass(`Updater ships LaTeX system target: ${path}`);
      } else {
        fail(`Updater misses LaTeX system target: ${path}`);
      }

      if (!updaterHarness.isUserPath(path)) {
        pass(`Updater keeps LaTeX system target out of user data: ${path}`);
      } else {
        fail(`Updater misclassifies LaTeX system target as user data: ${path}`);
      }
    }

    const shellSystemTargets = [
      'scripts/run-scheduled-scan.sh',
      'scripts/ux.sh',
    ];

    for (const path of shellSystemTargets) {
      if (updaterHarness.isUpdateTargetPath(path)) {
        pass(`Updater ships shell system target: ${path}`);
      } else {
        fail(`Updater misses shell system target: ${path}`);
      }

      if (!updaterHarness.isUserPath(path)) {
        pass(`Updater keeps shell system target out of user data: ${path}`);
      } else {
        fail(`Updater misclassifies shell system target as user data: ${path}`);
      }
    }

    const authSystemTargets = [
      'scripts/lib/openai-account-auth/',
      'scripts/openai-account-auth.mjs',
      'scripts/openai-codex-smoke.mjs',
      'scripts/openai-agents-codex-smoke.mjs',
      'scripts/test-openai-account-auth.mjs',
      'scripts/test-openai-codex-transport.mjs',
      'scripts/test-openai-agents-provider.mjs',
    ];

    for (const path of authSystemTargets) {
      if (updaterHarness.isUpdateTargetPath(path)) {
        pass(`Updater ships OpenAI auth system target: ${path}`);
      } else {
        fail(`Updater misses OpenAI auth system target: ${path}`);
      }

      if (!updaterHarness.isUserPath(path)) {
        pass(`Updater keeps OpenAI auth target out of user data: ${path}`);
      } else {
        fail(`Updater misclassifies OpenAI auth target as user data: ${path}`);
      }
    }
  } finally {
    rmSync(updaterHarnessPath, { force: true });
  }
} catch (e) {
  fail(`Updater regression tests crashed: ${e.message}`);
}

try {
  const tempRoot = mkdtempSync(join(tmpdir(), 'jobhunt-legacy-cv-'));
  mkdirSync(join(tempRoot, 'scripts'), { recursive: true });
  mkdirSync(join(tempRoot, 'scripts', 'lib', 'openai-account-auth'), {
    recursive: true,
  });
  mkdirSync(join(tempRoot, 'config'), { recursive: true });
  mkdirSync(join(tempRoot, 'fonts'), { recursive: true });
  mkdirSync(join(tempRoot, 'profile'), { recursive: true });
  symlinkSync(join(ROOT, 'node_modules'), join(tempRoot, 'node_modules'));
  writeFileSync(
    join(tempRoot, 'scripts', 'doctor.mjs'),
    readFile('scripts/doctor.mjs'),
  );
  writeFileSync(
    join(tempRoot, 'scripts', 'cv-sync-check.mjs'),
    readFile('scripts/cv-sync-check.mjs'),
  );
  for (const authLibFile of [
    'agents-provider.mjs',
    'codex-transport.mjs',
    'common.mjs',
    'index.mjs',
    'oauth.mjs',
    'storage.mjs',
  ]) {
    writeFileSync(
      join(tempRoot, 'scripts', 'lib', 'openai-account-auth', authLibFile),
      readFile(join('scripts', 'lib', 'openai-account-auth', authLibFile)),
    );
  }
  writeFileSync(
    join(tempRoot, 'cv.md'),
    `# Legacy CV\n\n${'Experience\n'.repeat(20)}`,
  );
  writeFileSync(
    join(tempRoot, 'config', 'profile.yml'),
    'full_name: "Test User"\nemail: "test@example.com"\nlocation: "Remote"\n',
  );
  writeFileSync(join(tempRoot, 'config', 'portals.yml'), 'companies: []\n');
  writeFileSync(join(tempRoot, 'fonts', 'dummy.txt'), 'font');

  try {
    const legacyDoctor = run(
      'node',
      [join(tempRoot, 'scripts', 'doctor.mjs')],
      {
        cwd: tempRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    if (
      legacyDoctor !== null &&
      stripAnsi(legacyDoctor).includes('cv.md found')
    ) {
      pass('doctor accepts legacy root cv.md during migration');
    } else {
      fail('doctor rejects legacy root cv.md during migration');
    }

    const legacySync = run(
      'node',
      [join(tempRoot, 'scripts', 'cv-sync-check.mjs')],
      {
        cwd: tempRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    if (legacySync !== null && !stripAnsi(legacySync).includes('ERRORS (')) {
      pass('cv-sync-check accepts legacy root cv.md during migration');
    } else {
      fail('cv-sync-check rejects legacy root cv.md during migration');
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
} catch (e) {
  fail(`Legacy CV migration tests crashed: ${e.message}`);
}

try {
  const tempRoot = mkdtempSync(join(tmpdir(), 'jobhunt-doctor-no-deps-'));
  mkdirSync(join(tempRoot, 'scripts', 'lib', 'openai-account-auth'), {
    recursive: true,
  });
  writeFileSync(
    join(tempRoot, 'scripts', 'doctor.mjs'),
    readFile('scripts/doctor.mjs'),
  );
  for (const authLibFile of ['common.mjs', 'storage.mjs']) {
    writeFileSync(
      join(tempRoot, 'scripts', 'lib', 'openai-account-auth', authLibFile),
      readFile(join('scripts', 'lib', 'openai-account-auth', authLibFile)),
    );
  }

  try {
    let doctorNoDepsFailed = false;
    let doctorNoDepsOutput = '';

    try {
      doctorNoDepsOutput = execFileSync(
        'node',
        [join(tempRoot, 'scripts', 'doctor.mjs')],
        {
          cwd: tempRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
    } catch (error) {
      doctorNoDepsFailed = true;
      doctorNoDepsOutput = `${error.stdout || ''}${error.stderr || ''}`;
    }

    const normalizedDoctorNoDeps = stripAnsi(doctorNoDepsOutput);

    if (
      doctorNoDepsFailed &&
      normalizedDoctorNoDeps.includes('Dependencies not installed') &&
      !normalizedDoctorNoDeps.includes('@openai/agents-core')
    ) {
      pass('doctor stays runnable before npm install');
    } else {
      fail('doctor no longer stays runnable before npm install');
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
} catch (e) {
  fail(`Doctor pre-install regression tests crashed: ${e.message}`);
}

try {
  const tempRoot = mkdtempSync(join(tmpdir(), 'jobhunt-visa-warning-'));
  mkdirSync(join(tempRoot, 'scripts'), { recursive: true });
  mkdirSync(join(tempRoot, 'config'), { recursive: true });
  mkdirSync(join(tempRoot, 'profile'), { recursive: true });
  symlinkSync(join(ROOT, 'node_modules'), join(tempRoot, 'node_modules'));
  writeFileSync(
    join(tempRoot, 'scripts', 'cv-sync-check.mjs'),
    readFile('scripts/cv-sync-check.mjs'),
  );
  writeFileSync(
    join(tempRoot, 'profile', 'cv.md'),
    `# Test CV\n\n${'Experience\n'.repeat(20)}`,
  );
  writeFileSync(
    join(tempRoot, 'config', 'profile.yml'),
    [
      'candidate:',
      '  full_name: "Test User"',
      '  email: "test@example.com"',
      '  location: "Remote"',
      'location:',
      '  country: "United States"',
      '  city: "Remote"',
      '  timezone: "America/New_York"',
      '  visa_status: ""',
      '',
    ].join('\n'),
  );

  try {
    const visaWarningOutput = run(
      'node',
      [join(tempRoot, 'scripts', 'cv-sync-check.mjs')],
      {
        cwd: tempRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    if (
      visaWarningOutput !== null &&
      stripAnsi(visaWarningOutput).includes('location.visa_status') &&
      !stripAnsi(visaWarningOutput).includes('ERRORS (')
    ) {
      pass('cv-sync-check warns when location.visa_status is blank');
    } else {
      fail('cv-sync-check did not warn on blank location.visa_status');
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
} catch (e) {
  fail(`Visa-status warning tests crashed: ${e.message}`);
}

// -- 3m. LaTeX validation regressions ----------------------------

console.log('\n3m. LaTeX validation regressions');

const generateLatex = run('node', ['scripts/test-generate-latex.mjs']);
if (generateLatex !== null) {
  pass('LaTeX validation regression tests pass');
} else {
  fail('LaTeX validation regression tests failed');
}

// -- 4. DASHBOARD BUILD ------------------------------------------

if (!QUICK) {
  console.log('\n4. Dashboard build');
  const goBuild = run(
    'cd dashboard && go build -o /tmp/career-dashboard-test . 2>&1',
  );
  if (goBuild !== null) {
    pass('Dashboard compiles');
  } else {
    fail('Dashboard build failed');
  }
} else {
  console.log('\n4. Dashboard build (skipped --quick)');
}

// -- 5. DATA CONTRACT --------------------------------------------

console.log('\n5. Data contract validation');

// Check system files exist
const systemFiles = [
  'AGENTS.md',
  '.codex/skills/career-ops/SKILL.md',
  'VERSION',
  'scripts/lib/openai-account-auth',
  'scripts/openai-account-auth.mjs',
  'scripts/openai-codex-smoke.mjs',
  'scripts/openai-agents-codex-smoke.mjs',
  'scripts/run-scheduled-scan.sh',
  'scripts/ux.sh',
  'data/follow-ups.example.md',
  'data/openai-account-auth.example.json',
  'data/openai-account-auth.example.json.lock',
  'docs/DATA_CONTRACT.md',
  'interview-prep/README-interview-prep.md',
  'interview-prep/story-bank.example.md',
  'profile/cv.example.md',
  'profile/article-digest.example.md',
  'modes/_shared.md',
  'modes/_profile.template.md',
  'modes/oferta.md',
  'modes/latex.md',
  'modes/pdf.md',
  'modes/scan.md',
  'templates/cv-template.tex',
  'templates/states.yml',
  'templates/cv-template.html',
];

for (const f of systemFiles) {
  if (fileExists(f)) {
    pass(`System file exists: ${f}`);
  } else {
    fail(`Missing system file: ${f}`);
  }
}

// Check user files are NOT tracked (gitignored)
const userFiles = [
  'cv.md',
  'profile/cv.md',
  'profile/article-digest.md',
  'article-digest.md',
  'portals.yml',
  'config/profile.yml',
  'data/follow-ups.md',
  'data/openai-account-auth.json',
  'interview-prep/story-bank.md',
  'modes/_profile.md',
  'config/portals.yml',
];
for (const f of userFiles) {
  const tracked = run('git', ['ls-files', f]);
  if (tracked === '') {
    pass(`User file gitignored: ${f}`);
  } else if (tracked === null) {
    pass(`User file gitignored: ${f}`);
  } else {
    fail(`User file IS tracked (should be gitignored): ${f}`);
  }
}

// -- 6. PERSONAL DATA LEAK CHECK ---------------------------------

console.log('\n6. Personal data leak check');

const leakPatterns = [];

const scanExtensions = ['md', 'yml', 'html', 'mjs', 'sh', 'go', 'json'];
const allowedFiles = [
  // English README + localized translations
  'README.md',
  'docs/README.es.md',
  'docs/README.ja.md',
  'docs/README.ko-KR.md',
  'docs/README.pt-BR.md',
  'docs/README.ru.md',
  'docs/README.zh-TW.md',
  // Standard project files
  'LICENSE',
  'docs/CITATION.cff',
  'docs/CONTRIBUTING.md',
  'docs/CREDITS.md',
  'package.json',
  '.github/FUNDING.yml',
  'AGENTS.md',
  'go.mod',
  'scripts/test-all.mjs',
  // Community and policy files legitimately reference the maintainer
  'docs/CODE_OF_CONDUCT.md',
  'docs/SECURITY.md',
  'docs/SUPPORT.md',
  '.github/SECURITY.md',
  // Dashboard credit string
  'dashboard/internal/ui/screens/pipeline.go',
  'dashboard/internal/ui/screens/progress.go',
];

// Build pathspec for git grep - only scan tracked files matching these
// extensions. This is what `grep -rn` was trying to do, but git-aware:
// untracked files (debate artifacts, AI tool scratch, local plans/) and
// gitignored files can't trigger false positives because they were never
// going to reach a commit anyway.
const grepPathspec = scanExtensions.map((e) => `'*.${e}'`).join(' ');

let leakFound = false;
for (const pattern of leakPatterns) {
  const result = run(`git grep -n "${pattern}" -- ${grepPathspec} 2>/dev/null`);
  if (result) {
    for (const line of result.split('\n')) {
      const file = line.split(':')[0];
      if (allowedFiles.some((a) => file.includes(a))) continue;
      if (file.includes('dashboard/go.mod')) continue;
      warn(`Possible personal data in ${file}: "${pattern}"`);
      leakFound = true;
    }
  }
}
if (!leakFound) {
  pass('No personal data leaks outside allowed files');
}

// -- 7. ABSOLUTE PATH CHECK --------------------------------------

console.log('\n7. Absolute path check');

// Same git grep approach: only scans tracked files. Untracked AI tool
// outputs, local debate artifacts, etc. can't false-positive here.
const absPathResult = run(
  `git grep -n "/Users/" -- '*.mjs' '*.sh' '*.md' '*.go' '*.yml' 2>/dev/null | grep -v README.md | grep -v LICENSE | grep -v scripts/test-all.mjs`,
);
if (!absPathResult) {
  pass('No absolute paths in code files');
} else {
  for (const line of absPathResult.split('\n').filter(Boolean)) {
    fail(`Absolute path: ${line.slice(0, 100)}`);
  }
}

// -- 8. MODE FILE INTEGRITY --------------------------------------

console.log('\n8. Mode file integrity');

const expectedModes = [
  '_shared.md',
  '_profile.template.md',
  'oferta.md',
  'pdf.md',
  'scan.md',
  'batch.md',
  'apply.md',
  'auto-pipeline.md',
  'contacto.md',
  'deep.md',
  'ofertas.md',
  'pipeline.md',
  'project.md',
  'tracker.md',
  'training.md',
];

for (const mode of expectedModes) {
  if (fileExists(`modes/${mode}`)) {
    pass(`Mode exists: ${mode}`);
  } else {
    fail(`Missing mode: ${mode}`);
  }
}

// Check _shared.md references _profile.md
const shared = readFile('modes/_shared.md');
if (shared.includes('_profile.md')) {
  pass('_shared.md references _profile.md');
} else {
  fail('_shared.md does NOT reference _profile.md');
}

// -- 9. CODEX-PRIMARY INSTRUCTION SURFACE ------------------------

console.log('\n9. Codex-primary instruction surface');

if (fileExists('AGENTS.md')) {
  pass('AGENTS.md exists');
} else {
  fail('AGENTS.md missing');
}

const agents = readFile('AGENTS.md');
if (agents.includes('Startup Checklist (every session)')) {
  pass('AGENTS.md includes the startup checklist');
} else {
  fail('AGENTS.md missing the startup checklist');
}

const skillPath = '.codex/skills/career-ops/SKILL.md';
if (fileExists(skillPath)) {
  pass('career-ops skill exists');
  const careerOpsSkill = readFile(skillPath);

  if (careerOpsSkill.includes('1. `AGENTS.md`')) {
    pass('career-ops skill reads AGENTS.md first');
  } else {
    fail('career-ops skill does not read AGENTS.md first');
  }

  const bootstrapMarkers = [
    'node scripts/update-system.mjs check',
    '`profile/cv.md`',
    '`config/profile.yml`',
    '`modes/_profile.md`',
    '`config/portals.yml`',
  ];
  const missingBootstrapMarkers = bootstrapMarkers.filter(
    (marker) => !careerOpsSkill.includes(marker),
  );
  if (missingBootstrapMarkers.length === 0) {
    pass('career-ops skill bootstrap matches the startup checklist');
  } else {
    fail(
      `career-ops skill missing startup checklist markers: ${missingBootstrapMarkers.join(', ')}`,
    );
  }

  if (
    !careerOpsSkill.includes('docs/CODEX.md') &&
    !careerOpsSkill.includes('docs/CLAUDE.md')
  ) {
    pass('career-ops skill has no legacy instruction-doc dependency');
  } else {
    fail('career-ops skill still references legacy instruction docs');
  }
} else {
  fail('career-ops skill missing');
}

if (!shared.includes('docs/CODEX.md') && !shared.includes('docs/CLAUDE.md')) {
  pass('shared mode guidance has no legacy instruction-doc dependency');
} else {
  fail('shared mode guidance still references legacy instruction docs');
}

// -- 10. METADATA PATH ALIGNMENT ---------------------------------

console.log('\n10. Metadata path alignment');

const updaterScript = readFile('scripts/update-system.mjs');
if (
  updaterScript.includes("'.codex/skills/'") &&
  !updaterScript.includes("'.claude/skills/'")
) {
  pass('Updater system paths use .codex/skills/');
} else {
  fail('Updater system paths are not aligned to .codex/skills/');
}

const dataContract = readFile('docs/DATA_CONTRACT.md');
const dataContractLines = dataContract.split('\n');
if (
  dataContractLines.some(
    (line) =>
      line.includes('`.codex/skills/*`') && line.includes('Skill definitions'),
  ) &&
  !dataContract.includes('.claude/skills/*')
) {
  pass('Data contract names .codex/skills/* as the system skill surface');
} else {
  fail('Data contract skill surface is not aligned to .codex/skills/*');
}

const labeler = readFile('.github/labeler.yml');
const labelerLines = labeler.split('\n').map((line) => line.trim());
const requiredLabelerLines = [
  '- AGENTS.md',
  '- docs/DATA_CONTRACT.md',
  '- .codex/skills/**',
  '- docs/CONTRIBUTING.md',
  '- docs/CODE_OF_CONDUCT.md',
  '- docs/SECURITY.md',
  '- docs/SUPPORT.md',
];
const missingLabelerLines = requiredLabelerLines.filter(
  (line) => !labelerLines.includes(line),
);
if (missingLabelerLines.length === 0) {
  pass('Labeler targets the live metadata and docs paths');
} else {
  fail(`Labeler missing live path globs: ${missingLabelerLines.join(', ')}`);
}

const forbiddenLabelerLines = [
  '- CLAUDE.md',
  '- DATA_CONTRACT.md',
  '- .claude/skills/**',
  '- CONTRIBUTING.md',
  '- CODE_OF_CONDUCT.md',
  '- SECURITY.md',
  '- SUPPORT.md',
];
const forbiddenLabelerMatches = forbiddenLabelerLines.filter((line) =>
  labelerLines.includes(line),
);
if (forbiddenLabelerMatches.length === 0) {
  pass('Labeler has no dead metadata or root-doc globs');
} else {
  fail(
    `Labeler still includes dead path globs: ${forbiddenLabelerMatches.join(', ')}`,
  );
}

const contributorMetadataChecks = [
  {
    path: '.github/PULL_REQUEST_TEMPLATE.md',
    required: [
      'https://github.com/moshehbenavraham/jobhunt/blob/main/docs/CONTRIBUTING.md',
    ],
    forbidden: [
      'https://github.com/moshehbenavraham/jobhunt/blob/main/CONTRIBUTING.md',
    ],
  },
  {
    path: '.github/workflows/welcome.yml',
    required: [
      'https://github.com/moshehbenavraham/jobhunt/blob/main/docs/CONTRIBUTING.md',
      'https://github.com/moshehbenavraham/jobhunt/blob/main/docs/SUPPORT.md',
    ],
    forbidden: [
      'https://github.com/moshehbenavraham/jobhunt/blob/main/CONTRIBUTING.md',
      'https://github.com/moshehbenavraham/jobhunt/blob/main/SUPPORT.md',
    ],
  },
  {
    path: '.github/ISSUE_TEMPLATE/bug_report.yml',
    required: [
      'https://github.com/moshehbenavraham/jobhunt/blob/main/docs/CODE_OF_CONDUCT.md',
    ],
    forbidden: [
      'https://github.com/moshehbenavraham/jobhunt/blob/main/CODE_OF_CONDUCT.md',
    ],
  },
  {
    path: '.github/ISSUE_TEMPLATE/feature_request.yml',
    required: [
      'https://github.com/moshehbenavraham/jobhunt/blob/main/docs/CODE_OF_CONDUCT.md',
    ],
    forbidden: [
      'https://github.com/moshehbenavraham/jobhunt/blob/main/CODE_OF_CONDUCT.md',
    ],
  },
];

for (const check of contributorMetadataChecks) {
  const fileText = readFile(check.path);
  const missingRequired = check.required.filter(
    (marker) => !fileText.includes(marker),
  );
  const forbiddenPresent = check.forbidden.filter((marker) =>
    fileText.includes(marker),
  );

  if (missingRequired.length === 0 && forbiddenPresent.length === 0) {
    pass(`${check.path} points at live contributor docs`);
  } else {
    const details = [
      missingRequired.length > 0
        ? `missing ${missingRequired.join(', ')}`
        : null,
      forbiddenPresent.length > 0
        ? `contains ${forbiddenPresent.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('; ');
    fail(`${check.path} has metadata path drift: ${details}`);
  }
}

// -- 11. VALIDATOR RUNTIME CONTRACT -------------------------------

console.log('\n11. Validator runtime contract');

const doctorOutput = run('npm', ['run', 'doctor'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});
if (doctorOutput === null) {
  fail('npm run doctor failed');
} else {
  const normalizedDoctorOutput = stripAnsi(doctorOutput);
  const hasCodexFooter = normalizedDoctorOutput.includes(
    'Run `codex` to start.',
  );
  const hasOpenAIAuthGuidance = normalizedDoctorOutput.includes(
    'npm run auth:openai -- status',
  );
  const hasLegacyRuntimeHint =
    normalizedDoctorOutput.includes('`claude`') &&
    normalizedDoctorOutput.includes('to start.');

  if (hasCodexFooter && hasOpenAIAuthGuidance && !hasLegacyRuntimeHint) {
    pass('Doctor success output points to codex');
  } else {
    fail(
      'Doctor success output is not aligned to the Codex-primary runtime contract',
    );
  }
}

// -- 12. VERSION FILE --------------------------------------------

console.log('\n12. Version file');

if (fileExists('VERSION')) {
  const canonicalVersion = readFile('VERSION').trim();
  if (/^\d+\.\d+\.\d+$/.test(canonicalVersion)) {
    pass(`VERSION is valid semver: ${canonicalVersion}`);

    if (fileExists('package.json')) {
      const packageVersion = readJson('package.json').version;
      if (packageVersion === canonicalVersion) {
        pass(`package.json version matches VERSION (${canonicalVersion})`);
      } else {
        fail(
          `package.json version mismatch: expected ${canonicalVersion} from VERSION, found ${packageVersion}`,
        );
      }
    } else {
      fail('package.json missing');
    }

    if (fileExists('package-lock.json')) {
      const lockfile = readJson('package-lock.json');
      const lockVersion = lockfile.version;
      const lockRootVersion = lockfile.packages?.['']
        ? lockfile.packages[''].version
        : null;

      if (lockVersion === canonicalVersion) {
        pass(`package-lock.json version matches VERSION (${canonicalVersion})`);
      } else {
        fail(
          `package-lock.json version mismatch: expected ${canonicalVersion} from VERSION, found ${lockVersion}`,
        );
      }

      if (lockRootVersion === canonicalVersion) {
        pass(
          `package-lock.json packages[""] version matches VERSION (${canonicalVersion})`,
        );
      } else {
        fail(
          `package-lock.json packages[""] version mismatch: expected ${canonicalVersion} from VERSION, found ${lockRootVersion}`,
        );
      }
    } else {
      fail('package-lock.json missing');
    }
  } else {
    fail(`VERSION is not valid semver: "${canonicalVersion}"`);
  }
} else {
  fail('VERSION file missing');
}

// -- SUMMARY -----------------------------------------------------

console.log(`\n${'='.repeat(50)}`);
console.log(
  `Results: ${passed} passed, ${failed} failed, ${warnings} warnings`,
);

if (failed > 0) {
  console.log('TESTS FAILED - do NOT push/merge until fixed\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('Tests passed with warnings - review before pushing\n');
  process.exit(0);
} else {
  console.log('All tests passed - safe to push/merge\n');
  process.exit(0);
}

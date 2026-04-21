import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import {
  DurableJobExecutionError,
  type AnyDurableJobExecutorDefinition,
  type DurableJobCheckpoint,
  type DurableJobExecutorContext,
} from './job-runner-contract.js';
import {
  batchEvaluationPayloadSchema,
  batchWorkerResultSchema,
  type BatchEvaluationPayload,
  type BatchEvaluationResult,
  type BatchItemSummary,
  type BatchWorkerResult,
  pipelineProcessingPayloadSchema,
  type PipelineItemResult,
  type PipelineProcessingPayload,
  type PipelineProcessingResult,
  scanWorkflowPayloadSchema,
  type ScanWorkflowPayload,
  type ScanWorkflowResult,
  type WorkflowWarning,
} from './workflow-job-contract.js';
import type { ToolExecutionEnvelope, ToolExecutionService } from '../tools/index.js';
import type { JsonValue } from '../workspace/workspace-types.js';

const execFileAsync = promisify(execFile);

const DEFAULT_CLI_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_SCAN_TIMEOUT_MS = 30_000;
const DEFAULT_SYNC_CHECK_TIMEOUT_MS = 15_000;
const MAX_STDIO_BYTES = 32 * 1024;
const batchStateHeader =
  'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries\n';

type BatchInputRow = {
  id: number;
  notes: string;
  source: string;
  url: string;
};

type BatchStateRow = {
  completedAt: string;
  error: string;
  id: number;
  reportNum: string;
  retries: number;
  score: string;
  startedAt: string;
  status: string;
  url: string;
};

type DefaultBatchWorkerInvocation = {
  id: string;
  reportNumber: string;
  repoRoot: string;
  url: string;
};

type DefaultBatchWorkerRunResult =
  | {
      workerResult: BatchWorkerResult;
    }
  | {
      error: string;
      retryable: boolean;
    };

type PipelinePendingEntry = {
  company: string | null;
  title: string | null;
  url: string;
};

export type WorkflowJobExecutorOptions = {
  getToolExecutionService?: () => Promise<ToolExecutionService>;
  repoRoot: string;
  runBatchWorker?: (
    input: DefaultBatchWorkerInvocation,
  ) => Promise<DefaultBatchWorkerRunResult>;
  runScanWorkflow?: (
    payload: ScanWorkflowPayload,
  ) => Promise<ScanWorkflowResult>;
  runSyncCheck?: () => Promise<readonly WorkflowWarning[]>;
};

function normalizeStdio(value: string | Buffer | undefined): string {
  const text =
    typeof value === 'string'
      ? value
      : value instanceof Buffer
        ? value.toString('utf8')
        : '';
  const normalized = text.replace(/\r\n/g, '\n');

  if (Buffer.byteLength(normalized, 'utf8') <= MAX_STDIO_BYTES) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_STDIO_BYTES)}\n[truncated]\n`;
}

function buildBoundedEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const allowedKeys = [
    'HOME',
    'PATH',
    'SHELL',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'TMPDIR',
    'USER',
  ];
  const boundedEnv: NodeJS.ProcessEnv = {
    FORCE_COLOR: '0',
  };

  for (const key of allowedKeys) {
    const value = env[key];

    if (typeof value === 'string' && value.length > 0) {
      boundedEnv[key] = value;
    }
  }

  return boundedEnv;
}

function toWorkflowWarning(
  code: string,
  message: string,
  detail: JsonValue | null = null,
): WorkflowWarning {
  return {
    code,
    detail,
    message,
  };
}

function toCheckpointCursor(value: number | null): string | null {
  return value === null ? null : String(value);
}

function parseCheckpointCursor(
  checkpoint: DurableJobCheckpoint | null,
): number {
  if (!checkpoint?.cursor) {
    return 0;
  }

  const parsed = Number.parseInt(checkpoint.cursor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseCheckpointItems<TValue>(
  checkpoint: DurableJobCheckpoint | null,
): TValue[] {
  const value = checkpoint?.value;

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const items = value.items;
  return Array.isArray(items) ? (items as TValue[]) : [];
}

function parseBooleanCheckpointValue(
  checkpoint: DurableJobCheckpoint | null,
  key: string,
): boolean {
  const value = checkpoint?.value;

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return value[key] === true;
}

async function saveProgressCheckpoint(
  context: DurableJobExecutorContext,
  input: {
    completedSteps: string[];
    cursor: number | null;
    value: JsonValue;
  },
): Promise<void> {
  await context.saveCheckpoint({
    completedSteps: input.completedSteps,
    cursor: toCheckpointCursor(input.cursor),
    value: input.value,
  });
}

function nextCompletedSteps(
  checkpoint: DurableJobCheckpoint | null,
  step: string,
): string[] {
  const completed = new Set(checkpoint?.completedSteps ?? []);
  completed.add(step);
  return [...completed];
}

async function runNodeScript(options: {
  args: readonly string[];
  repoRoot: string;
  scriptRepoRelativePath: string;
  successExitCodes?: readonly number[];
  timeoutMs: number;
}): Promise<{
  exitCode: number;
  stderr: string;
  stdout: string;
}> {
  try {
    const result = await execFileAsync(
      process.execPath,
      [options.scriptRepoRelativePath, ...options.args],
      {
        cwd: options.repoRoot,
        encoding: 'utf8',
        env: buildBoundedEnv(process.env),
        maxBuffer: 256 * 1024,
        timeout: options.timeoutMs,
        windowsHide: true,
      },
    );

    return {
      exitCode: 0,
      stderr: normalizeStdio(result.stderr),
      stdout: normalizeStdio(result.stdout),
    };
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    const execError = error as Error & {
      code?: number | string | null;
      killed?: boolean;
      signal?: NodeJS.Signals | null;
      stderr?: string | Buffer;
      stdout?: string | Buffer;
    };

    if (
      /timed out/i.test(execError.message) ||
      execError.killed === true ||
      execError.signal === 'SIGTERM'
    ) {
      throw new DurableJobExecutionError(
        `Script ${options.scriptRepoRelativePath} timed out after ${options.timeoutMs}ms.`,
        {
          detail: {
            scriptRepoRelativePath: options.scriptRepoRelativePath,
            timeoutMs: options.timeoutMs,
          },
          retryable: true,
        },
      );
    }

    const exitCode =
      typeof execError.code === 'number' ? execError.code : 1;
    const successExitCodes = options.successExitCodes ?? [0];

    if (successExitCodes.includes(exitCode)) {
      return {
        exitCode,
        stderr: normalizeStdio(execError.stderr),
        stdout: normalizeStdio(execError.stdout),
      };
    }

    throw new DurableJobExecutionError(
      `Script ${options.scriptRepoRelativePath} exited with code ${exitCode}.`,
      {
        detail: {
          exitCode,
          scriptRepoRelativePath: options.scriptRepoRelativePath,
          stderr: normalizeStdio(execError.stderr),
          stdout: normalizeStdio(execError.stdout),
        },
        retryable: false,
      },
    );
  }
}

function parseScanSummary(stdout: string): ScanWorkflowResult['summary'] {
  const patterns = {
    companiesConfigured: /Companies configured:\s+(\d+)/,
    companiesScanned: /Companies scanned:\s+(\d+)/,
    companiesSkipped: /Companies skipped:\s+(\d+)/,
    duplicatesSkipped: /Duplicates:\s+(\d+)\s+skipped/,
    filteredByLocation: /Filtered by location:\s+(\d+)\s+removed/,
    filteredByTitle: /Filtered by title:\s+(\d+)\s+removed/,
    newOffersAdded: /New offers added:\s+(\d+)/,
    totalJobsFound: /Total jobs found:\s+(\d+)/,
  } as const;
  const summary = {
    companiesConfigured: 0,
    companiesScanned: 0,
    companiesSkipped: 0,
    duplicatesSkipped: 0,
    filteredByLocation: 0,
    filteredByTitle: 0,
    newOffersAdded: 0,
    totalJobsFound: 0,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = stdout.match(pattern);

    if (!match?.[1]) {
      throw new DurableJobExecutionError(
        `Scan output did not contain ${key}.`,
        {
          detail: {
            key,
          },
          retryable: false,
        },
      );
    }

    summary[key as keyof typeof summary] = Number.parseInt(match[1], 10);
  }

  return summary;
}

function collectScanWarnings(stdout: string): WorkflowWarning[] {
  const warnings: WorkflowWarning[] = [];
  let inErrorsBlock = false;

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();

    if (!line) {
      inErrorsBlock = false;
      continue;
    }

    if (line.startsWith('Errors (')) {
      inErrorsBlock = true;
      continue;
    }

    if (inErrorsBlock && line.startsWith('-')) {
      warnings.push(
        toWorkflowWarning(
          'scan-script-warning',
          line.slice(1).trim(),
        ),
      );
    }
  }

  return warnings;
}

async function defaultRunScanWorkflow(
  repoRoot: string,
  payload: ScanWorkflowPayload,
): Promise<ScanWorkflowResult> {
  const args = [
    ...(payload.dryRun ? ['--dry-run'] : []),
    ...(payload.compareClean ? ['--compare-clean'] : []),
    ...(payload.company ? ['--company', payload.company] : []),
  ];
  const result = await runNodeScript({
    args,
    repoRoot,
    scriptRepoRelativePath: 'scripts/scan.mjs',
    timeoutMs: DEFAULT_SCAN_TIMEOUT_MS,
  });

  return {
    company: payload.company,
    dryRun: payload.dryRun,
    summary: parseScanSummary(result.stdout),
    warnings: collectScanWarnings(result.stdout),
    workflow: 'scan-portals',
  };
}

async function defaultRunSyncCheck(
  repoRoot: string,
): Promise<readonly WorkflowWarning[]> {
  const result = await runNodeScript({
    args: [],
    repoRoot,
    scriptRepoRelativePath: 'scripts/cv-sync-check.mjs',
    successExitCodes: [0],
    timeoutMs: DEFAULT_SYNC_CHECK_TIMEOUT_MS,
  });
  const warnings: WorkflowWarning[] = [];

  for (const rawLine of result.stdout.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('WARN:')) {
      warnings.push(
        toWorkflowWarning('cv-sync-warning', line.slice('WARN:'.length).trim()),
      );
    }
  }

  return warnings;
}

function formatInfrastructureFailure(
  exitCode: number,
  stderr: string,
  stdout: string,
): string {
  const detail = stderr.trim() || stdout.trim() || 'worker exited without output';
  return `infrastructure: exit ${exitCode}; ${detail}`;
}

async function runCommandWithInput(options: {
  args: readonly string[];
  command: string;
  cwd: string;
  input: string;
  timeoutMs: number;
}): Promise<{
  exitCode: number;
  stderr: string;
  stdout: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.command, [...options.args], {
      cwd: options.cwd,
      env: buildBoundedEnv(process.env),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;
    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill('SIGTERM');
      reject(
        new DurableJobExecutionError(
          `Command ${options.command} timed out after ${options.timeoutMs}ms.`,
          {
            retryable: true,
          },
        ),
      );
    }, options.timeoutMs);

    child.on('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      reject(
        new DurableJobExecutionError(
          `Command ${options.command} failed to start.`,
          {
            cause: error,
            retryable: true,
          },
        ),
      );
    });
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });
    child.on('close', (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      resolve({
        exitCode: code ?? 1,
        stderr: normalizeStdio(Buffer.concat(stderrChunks)),
        stdout: normalizeStdio(Buffer.concat(stdoutChunks)),
      });
    });
    child.stdin.end(options.input);
  });
}

async function defaultRunBatchWorker(
  input: DefaultBatchWorkerInvocation,
): Promise<DefaultBatchWorkerRunResult> {
  const batchDir = join(input.repoRoot, 'batch');
  const logsDir = join(batchDir, 'logs');
  const promptTemplate = await readFile(join(batchDir, 'batch-prompt.md'), 'utf8');
  const resultFilePath = join(logsDir, `${input.reportNumber}-${input.id}.result.json`);
  const lastMessageFilePath = join(
    logsDir,
    `${input.reportNumber}-${input.id}.last-message.json`,
  );
  const eventLogPath = join(logsDir, `${input.reportNumber}-${input.id}.log`);
  const jdFilePath = join(tmpdir(), `jobhunt-workflow-${input.id}.txt`);
  const today = new Date().toISOString().slice(0, 10);
  const prompt = promptTemplate
    .replaceAll('{{URL}}', input.url)
    .replaceAll('{{JD_FILE}}', jdFilePath)
    .replaceAll('{{REPORT_NUM}}', input.reportNumber)
    .replaceAll('{{DATE}}', today)
    .replaceAll('{{ID}}', input.id)
    .replaceAll('{{RESULT_FILE}}', resultFilePath);

  await mkdir(logsDir, { recursive: true });

  const commandResult = await runCommandWithInput({
    args: [
      'exec',
      '-C',
      input.repoRoot,
      '--dangerously-bypass-approvals-and-sandbox',
      '--output-schema',
      join(batchDir, 'worker-result.schema.json'),
      '--output-last-message',
      lastMessageFilePath,
      '--json',
      '-',
    ],
    command: 'codex',
    cwd: input.repoRoot,
    input: prompt,
    timeoutMs: DEFAULT_CLI_TIMEOUT_MS,
  });

  await writeFile(
    eventLogPath,
    `${commandResult.stdout}${commandResult.stderr ? `\n${commandResult.stderr}` : ''}`,
    'utf8',
  );

  if (commandResult.exitCode !== 0) {
    return {
      error: formatInfrastructureFailure(
        commandResult.exitCode,
        commandResult.stderr,
        commandResult.stdout,
      ),
      retryable: true,
    };
  }

  let parsed: BatchWorkerResult;

  try {
    parsed = batchWorkerResultSchema.parse(
      JSON.parse(await readFile(resultFilePath, 'utf8')),
    );
  } catch (error) {
    return {
      error: formatInfrastructureFailure(
        commandResult.exitCode,
        commandResult.stderr,
        commandResult.stdout || String(error),
      ),
      retryable: true,
    };
  }

  if (parsed.id !== input.id || parsed.report_num !== input.reportNumber) {
    return {
      error: formatInfrastructureFailure(
        commandResult.exitCode,
        commandResult.stderr,
        `worker result identity mismatch for ${input.id}/${input.reportNumber}`,
      ),
      retryable: true,
    };
  }

  return {
    workerResult: parsed,
  };
}

async function runTool(options: {
  context: DurableJobExecutorContext;
  getToolExecutionService?: () => Promise<ToolExecutionService>;
  input: JsonValue;
  toolName: string;
}): Promise<JsonValue | null> {
  if (!options.getToolExecutionService) {
    throw new DurableJobExecutionError(
      `Tool service is not configured for ${options.toolName}.`,
      {
        retryable: false,
      },
    );
  }

  const toolService = await options.getToolExecutionService();
  const result = await toolService.execute({
    correlation: {
      jobId: `${options.context.job.jobId}:${options.toolName}`,
      requestId: null,
      sessionId: options.context.session.sessionId,
      traceId: `${options.context.currentRunId}:${options.toolName}`,
    },
    input: options.input,
    toolName: options.toolName,
  });

  if (result.status === 'failed') {
    throw new DurableJobExecutionError(
      `Tool ${options.toolName} failed: ${result.error.message}`,
      {
        detail: result.error.detail,
        retryable: result.error.retryable,
      },
    );
  }

  if (result.status === 'approval-required') {
    throw new DurableJobExecutionError(
      `Tool ${options.toolName} unexpectedly required approval during background execution.`,
      {
        retryable: false,
      },
    );
  }

  return result.output;
}

function parsePendingPipelineEntries(text: string): PipelinePendingEntry[] {
  const pendingMarker = '## Pending';
  const startIndex = text.indexOf(pendingMarker);

  if (startIndex === -1) {
    return [];
  }

  const endIndex = text.indexOf('\n## ', startIndex + pendingMarker.length);
  const sectionText =
    endIndex === -1 ? text.slice(startIndex) : text.slice(startIndex, endIndex);
  const entries: PipelinePendingEntry[] = [];

  for (const line of sectionText.split('\n')) {
    const match = line.match(
      /^- \[ \] (https?:\/\/\S+)(?: \| ([^|]+) \| (.+))?$/,
    );

    if (!match?.[1]) {
      continue;
    }

    entries.push({
      company: match[2]?.trim() ?? null,
      title: match[3]?.trim() ?? null,
      url: match[1],
    });
  }

  return entries;
}

function selectPipelineEntries(
  entries: readonly PipelinePendingEntry[],
  payload: PipelineProcessingPayload,
): PipelinePendingEntry[] {
  if (payload.queueSelection.mode === 'selected-urls') {
    const allowedUrls = new Set(payload.queueSelection.urls);
    return entries.filter((entry) => allowedUrls.has(entry.url));
  }

  if (payload.queueSelection.mode === 'all-pending') {
    return payload.queueSelection.limit
      ? entries.slice(0, payload.queueSelection.limit)
      : [...entries];
  }

  return entries.slice(0, payload.queueSelection.limit ?? 1);
}

async function updatePipelineFile(
  repoRoot: string,
  url: string,
  replacementLine: string,
): Promise<void> {
  const pipelinePath = join(repoRoot, 'data', 'pipeline.md');
  const original = await readFile(pipelinePath, 'utf8');
  const pendingLinePattern = new RegExp(
    `^- \\[ \\] ${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: .+)?$`,
    'm',
  );
  let updated = original.replace(pendingLinePattern, '').replace(/\n{3,}/g, '\n\n');

  if (updated.includes('## Processed')) {
    updated = updated.replace(
      /## Processed\s*\n?/,
      `## Processed\n\n${replacementLine}\n`,
    );
  } else {
    updated = `${updated.trimEnd()}\n\n## Processed\n\n${replacementLine}\n`;
  }

  await writeFile(pipelinePath, updated, 'utf8');
}

function formatPipelineProcessedLine(item: PipelineItemResult): string {
  if (item.status === 'failed') {
    return `- [!] ${item.url} -- Error: ${item.error ?? 'workflow failed'}`;
  }

  const score =
    item.score === null ? 'N/A' : `${item.score.toFixed(2)}/5`;

  return `- [x] #${item.reportNumber ?? '---'} | ${item.url} | ${item.role} | ${score} | PDF ${item.pdf ? 'Yes' : 'No'}`;
}

function createPipelineSyntheticId(url: string): string {
  const digest = url
    .split('')
    .reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);

  return String(100000 + (digest % 900000));
}

async function nextReportNumber(
  repoRoot: string,
  reserved: Set<number>,
): Promise<string> {
  const reportsDirectory = join(repoRoot, 'reports');
  await mkdir(reportsDirectory, { recursive: true });
  const entries = await readdir(reportsDirectory).catch(() => []);
  const numbers = new Set<number>(reserved);

  for (const entry of entries) {
    const match = entry.match(/^(\d{3})-/);

    if (match?.[1]) {
      numbers.add(Number.parseInt(match[1], 10));
    }
  }

  let next = 1;

  while (numbers.has(next)) {
    next += 1;
  }

  reserved.add(next);
  return String(next).padStart(3, '0');
}

async function readBatchInputRows(repoRoot: string): Promise<BatchInputRow[]> {
  const inputPath = join(repoRoot, 'batch', 'batch-input.tsv');
  const text = await readFile(inputPath, 'utf8');

  return text
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [id, url, source = '', notes = ''] = line.split('\t');
      return {
        id: Number.parseInt(id ?? '0', 10),
        notes,
        source,
        url: url ?? '',
      };
    })
    .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.url.length > 0);
}

async function ensureBatchStateFile(repoRoot: string): Promise<void> {
  const statePath = join(repoRoot, 'batch', 'batch-state.tsv');
  await mkdir(dirname(statePath), { recursive: true });
  try {
    await readFile(statePath, 'utf8');
  } catch {
    await writeFile(statePath, batchStateHeader, 'utf8');
  }
}

async function readBatchState(repoRoot: string): Promise<Map<number, BatchStateRow>> {
  const statePath = join(repoRoot, 'batch', 'batch-state.tsv');

  try {
    const text = await readFile(statePath, 'utf8');
    const rows = text
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [
          id,
          url,
          status,
          startedAt,
          completedAt,
          reportNum,
          score,
          error,
          retries,
        ] = line.split('\t');
        return {
          completedAt: completedAt ?? '-',
          error: error ?? '-',
          id: Number.parseInt(id ?? '0', 10),
          reportNum: reportNum ?? '-',
          retries: Number.parseInt(retries ?? '0', 10),
          score: score ?? '-',
          startedAt: startedAt ?? '-',
          status: status ?? 'pending',
          url: url ?? '',
        } satisfies BatchStateRow;
      })
      .filter((row) => Number.isFinite(row.id) && row.id > 0);

    return new Map(rows.map((row) => [row.id, row]));
  } catch {
    return new Map();
  }
}

async function writeBatchState(
  repoRoot: string,
  state: Map<number, BatchStateRow>,
): Promise<void> {
  const statePath = join(repoRoot, 'batch', 'batch-state.tsv');
  const lines = [batchStateHeader.trimEnd()];

  for (const row of [...state.values()].sort((left, right) => left.id - right.id)) {
    lines.push(
      [
        row.id,
        row.url,
        row.status,
        row.startedAt,
        row.completedAt,
        row.reportNum,
        row.score,
        row.error,
        row.retries,
      ].join('\t'),
    );
  }

  await writeFile(statePath, `${lines.join('\n')}\n`, 'utf8');
}

function isRetryableStateRow(
  row: BatchStateRow | undefined,
  maxRetries: number,
): boolean {
  return Boolean(
    row &&
      row.status === 'failed' &&
      row.error.startsWith('infrastructure:') &&
      row.retries < maxRetries,
  );
}

function selectBatchRows(
  rows: readonly BatchInputRow[],
  state: Map<number, BatchStateRow>,
  payload: BatchEvaluationPayload,
): BatchInputRow[] {
  return rows.filter((row) => {
    if (row.id < payload.startFromId) {
      return false;
    }

    const stateRow = state.get(row.id);

    if (payload.mode === 'retry-failed') {
      return isRetryableStateRow(stateRow, payload.maxRetries);
    }

    if (!stateRow) {
      return true;
    }

    if (
      stateRow.status === 'completed' ||
      stateRow.status === 'partial' ||
      stateRow.status === 'skipped'
    ) {
      return false;
    }

    if (stateRow.status === 'failed') {
      return isRetryableStateRow(stateRow, payload.maxRetries);
    }

    return true;
  });
}

function summarizeBatchItems(items: readonly BatchItemSummary[]): BatchEvaluationResult['counts'] {
  const counts = {
    completed: 0,
    failed: 0,
    partial: 0,
    pending: 0,
    retryableFailed: 0,
    skipped: 0,
    total: items.length,
  };

  for (const item of items) {
    if (item.status === 'completed') {
      counts.completed += 1;
    } else if (item.status === 'failed') {
      counts.failed += 1;
    } else if (item.status === 'partial') {
      counts.partial += 1;
    } else if (item.status === 'retryable-failed') {
      counts.retryableFailed += 1;
    } else if (item.status === 'skipped') {
      counts.skipped += 1;
    } else if (item.status === 'pending') {
      counts.pending += 1;
    }
  }

  return counts;
}

function reserveCheckpointedReportNumbers(
  reserved: Set<number>,
  items: readonly { reportNumber: string | null }[],
): void {
  for (const item of items) {
    if (!item.reportNumber) {
      continue;
    }

    const parsed = Number.parseInt(item.reportNumber, 10);

    if (Number.isFinite(parsed) && parsed > 0) {
      reserved.add(parsed);
    }
  }
}

export function createWorkflowJobExecutors(
  options: WorkflowJobExecutorOptions,
): readonly AnyDurableJobExecutorDefinition[] {
  const runScanWorkflow =
    options.runScanWorkflow ??
    ((payload: ScanWorkflowPayload) =>
      defaultRunScanWorkflow(options.repoRoot, payload));
  const runBatchWorker =
    options.runBatchWorker ?? defaultRunBatchWorker;
  const runSyncCheck =
    options.runSyncCheck ??
    (() => defaultRunSyncCheck(options.repoRoot));

  return [
    {
      description:
        'Run the repo-owned portal scan through a durable job boundary and persist a single-step checkpoint.',
      async execute(payload, context) {
        const existingResult = parseCheckpointItems<ScanWorkflowResult>(
          context.checkpoint,
        )[0];

        if (existingResult) {
          return {
            result: existingResult,
            status: 'completed',
          };
        }

        const result = await runScanWorkflow(payload);
        await saveProgressCheckpoint(context, {
          completedSteps: nextCompletedSteps(context.checkpoint, 'scan-complete'),
          cursor: null,
          value: {
            items: [result],
          },
        });

        return {
          result,
          status: 'completed',
        };
      },
      jobType: 'scan-portals',
      payloadSchema: scanWorkflowPayloadSchema,
    },
    {
      description:
        'Process queued pipeline URLs in deterministic order while checkpointing after each item and closing out tracker maintenance through typed tools.',
      async execute(payload, context) {
        const syncWarnings = await runSyncCheck();
        const pipelinePath = join(options.repoRoot, 'data', 'pipeline.md');
        const pendingEntries = parsePendingPipelineEntries(
          await readFile(pipelinePath, 'utf8'),
        );
        const selectedEntries = selectPipelineEntries(pendingEntries, payload);
        const reservedReportNumbers = new Set<number>();
        const items = parseCheckpointItems<PipelineItemResult>(context.checkpoint);
        let processedCount = Math.max(
          parseCheckpointCursor(context.checkpoint),
          items.length,
        );
        let trackerMerged = parseBooleanCheckpointValue(
          context.checkpoint,
          'trackerMerged',
        );
        let trackerVerified = parseBooleanCheckpointValue(
          context.checkpoint,
          'trackerVerified',
        );
        const selectedCount = items.length + selectedEntries.length;

        reserveCheckpointedReportNumbers(reservedReportNumbers, items);

        if (!payload.dryRun) {
          for (let index = 0; index < selectedEntries.length; index += 1) {
            const entry = selectedEntries[index];

            if (!entry) {
              continue;
            }

            const reportNumber = await nextReportNumber(
              options.repoRoot,
              reservedReportNumbers,
            );
            const workerResult = await runBatchWorker({
              id: createPipelineSyntheticId(entry.url),
              reportNumber,
              repoRoot: options.repoRoot,
              url: entry.url,
            });
            let item: PipelineItemResult;

            if ('workerResult' in workerResult) {
              item = {
                error: workerResult.workerResult.error,
                pdf: workerResult.workerResult.pdf,
                report: workerResult.workerResult.report,
                reportNumber: workerResult.workerResult.report_num,
                role: workerResult.workerResult.role,
                score: workerResult.workerResult.score,
                status: workerResult.workerResult.status,
                tracker: workerResult.workerResult.tracker,
                url: entry.url,
                warnings: [...workerResult.workerResult.warnings],
              };
            } else {
              item = {
                error: workerResult.error,
                pdf: null,
                report: null,
                reportNumber: reportNumber,
                role: entry.title ?? 'Unknown role',
                score: null,
                status: 'failed',
                tracker: null,
                url: entry.url,
                warnings: [],
              };
            }

            items.push(item);
            processedCount += 1;
            await updatePipelineFile(
              options.repoRoot,
              entry.url,
              formatPipelineProcessedLine(item),
            );
            await saveProgressCheckpoint(context, {
              completedSteps: nextCompletedSteps(
                context.checkpoint,
                `pipeline-item-${processedCount}`,
              ),
              cursor: processedCount,
              value: {
                items,
                trackerMerged,
                trackerVerified,
              },
            });
            await context.touchHeartbeat();
          }

          if (items.some((item) => item.status === 'completed' || item.status === 'partial')) {
            await runTool({
              context,
              input: {},
              ...(options.getToolExecutionService
                ? { getToolExecutionService: options.getToolExecutionService }
                : {}),
              toolName: 'merge-tracker-additions',
            });
            trackerMerged = true;
            await runTool({
              context,
              input: {},
              ...(options.getToolExecutionService
                ? { getToolExecutionService: options.getToolExecutionService }
                : {}),
              toolName: 'verify-tracker-pipeline',
            });
            trackerVerified = true;
          }
        }

        const result: PipelineProcessingResult = {
          dryRun: payload.dryRun,
          items,
          selectedCount,
          trackerMerged,
          trackerVerified,
          warnings: [...syncWarnings],
          workflow: 'process-pipeline',
        };

        await saveProgressCheckpoint(context, {
          completedSteps: nextCompletedSteps(
            context.checkpoint,
            'pipeline-complete',
          ),
          cursor: null,
          value: {
            items,
            trackerMerged,
            trackerVerified,
          },
        });

        return {
          result,
          status: 'completed',
        };
      },
      jobType: 'process-pipeline',
      payloadSchema: pipelineProcessingPayloadSchema,
    },
    {
      description:
        'Run batch evaluation rows through durable checkpoints while preserving completed, partial, failed, skipped, and retryable failure state semantics.',
      async execute(payload, context) {
        await ensureBatchStateFile(options.repoRoot);
        const state = await readBatchState(options.repoRoot);
        const selectedRows = selectBatchRows(
          await readBatchInputRows(options.repoRoot),
          state,
          payload,
        );
        const items = parseCheckpointItems<BatchItemSummary>(context.checkpoint);
        let processedCount = Math.max(
          parseCheckpointCursor(context.checkpoint),
          items.length,
        );
        const reservedReportNumbers = new Set<number>();
        const warnings: WorkflowWarning[] = [];

        reserveCheckpointedReportNumbers(reservedReportNumbers, items);

        if (payload.dryRun) {
          const pendingItems = selectedRows.map((row) => ({
            error: null,
            id: row.id,
            reportNumber: null,
            retries: state.get(row.id)?.retries ?? 0,
            score: null,
            status: 'pending' as const,
            url: row.url,
          }));

          return {
            result: {
              counts: summarizeBatchItems(pendingItems),
              dryRun: true,
              items: pendingItems,
              warnings,
              workflow: 'batch-evaluation',
            },
            status: 'completed',
          };
        }

        for (let index = 0; index < selectedRows.length; index += 1) {
          const row = selectedRows[index];

          if (!row) {
            continue;
          }

          const existing = state.get(row.id);
          const reportNumber = await nextReportNumber(
            options.repoRoot,
            reservedReportNumbers,
          );
          const startedAt = new Date().toISOString();
          state.set(row.id, {
            completedAt: '-',
            error: '-',
            id: row.id,
            reportNum: reportNumber,
            retries: existing?.retries ?? 0,
            score: '-',
            startedAt,
            status: 'processing',
            url: row.url,
          });
          await writeBatchState(options.repoRoot, state);

          const workerResult = await runBatchWorker({
            id: String(row.id),
            reportNumber,
            repoRoot: options.repoRoot,
            url: row.url,
          });
          let item: BatchItemSummary;

          if ('workerResult' in workerResult) {
            const completedAt = new Date().toISOString();

            if (
              workerResult.workerResult.score !== null &&
              workerResult.workerResult.score < payload.minScore
            ) {
              state.set(row.id, {
                completedAt,
                error: 'below-min-score',
                id: row.id,
                reportNum: reportNumber,
                retries: existing?.retries ?? 0,
                score: String(workerResult.workerResult.score),
                startedAt,
                status: 'skipped',
                url: row.url,
              });
              item = {
                error: 'below-min-score',
                id: row.id,
                reportNumber,
                retries: existing?.retries ?? 0,
                score: workerResult.workerResult.score,
                status: 'skipped',
                url: row.url,
              };
            } else if (workerResult.workerResult.status === 'failed') {
              state.set(row.id, {
                completedAt,
                error: `semantic: ${workerResult.workerResult.error ?? 'worker failed'}`,
                id: row.id,
                reportNum: reportNumber,
                retries: existing?.retries ?? 0,
                score: '-',
                startedAt,
                status: 'failed',
                url: row.url,
              });
              item = {
                error: workerResult.workerResult.error,
                id: row.id,
                reportNumber,
                retries: existing?.retries ?? 0,
                score: null,
                status: 'failed',
                url: row.url,
              };
            } else {
              state.set(row.id, {
                completedAt,
                error:
                  workerResult.workerResult.status === 'partial'
                    ? `warnings: ${workerResult.workerResult.warnings.join('; ')}`
                    : '-',
                id: row.id,
                reportNum: reportNumber,
                retries: existing?.retries ?? 0,
                score:
                  workerResult.workerResult.score === null
                    ? '-'
                    : String(workerResult.workerResult.score),
                startedAt,
                status: workerResult.workerResult.status,
                url: row.url,
              });
              item = {
                error: workerResult.workerResult.error,
                id: row.id,
                reportNumber,
                retries: existing?.retries ?? 0,
                score: workerResult.workerResult.score,
                status: workerResult.workerResult.status,
                url: row.url,
              };
            }
          } else {
            const retries = (existing?.retries ?? 0) + 1;
            const retryable = workerResult.retryable && retries < payload.maxRetries;
            state.set(row.id, {
              completedAt: new Date().toISOString(),
              error: workerResult.error,
              id: row.id,
              reportNum: reportNumber,
              retries,
              score: '-',
              startedAt,
              status: 'failed',
              url: row.url,
            });
            item = {
              error: workerResult.error,
              id: row.id,
              reportNumber,
              retries,
              score: null,
              status: retryable ? 'retryable-failed' : 'failed',
              url: row.url,
            };
          }

          items.push(item);
          processedCount += 1;
          await writeBatchState(options.repoRoot, state);
          await saveProgressCheckpoint(context, {
            completedSteps: nextCompletedSteps(
              context.checkpoint,
              `batch-item-${processedCount}`,
            ),
            cursor: processedCount,
            value: {
              items,
            },
          });
          await context.touchHeartbeat();
        }

        if (items.some((item) => item.status === 'completed' || item.status === 'partial')) {
          try {
            await runTool({
              context,
              input: {},
              ...(options.getToolExecutionService
                ? { getToolExecutionService: options.getToolExecutionService }
                : {}),
              toolName: 'merge-tracker-additions',
            });
            await runTool({
              context,
              input: {},
              ...(options.getToolExecutionService
                ? { getToolExecutionService: options.getToolExecutionService }
                : {}),
              toolName: 'verify-tracker-pipeline',
            });
          } catch (error) {
            warnings.push(
              toWorkflowWarning(
                'batch-closeout-warning',
                error instanceof Error ? error.message : String(error),
              ),
            );
          }
        }

        const result: BatchEvaluationResult = {
          counts: summarizeBatchItems(items),
          dryRun: false,
          items,
          warnings,
          workflow: 'batch-evaluation',
        };

        await saveProgressCheckpoint(context, {
          completedSteps: nextCompletedSteps(
            context.checkpoint,
            'batch-complete',
          ),
          cursor: null,
          value: {
            items,
          },
        });

        return {
          result,
          status: 'completed',
        };
      },
      jobType: 'batch-evaluation',
      payloadSchema: batchEvaluationPayloadSchema,
    },
  ];
}

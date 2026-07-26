#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  atomicWriteArtifact,
  resolveArtifactPath,
} from './artifact-policy.mjs';

export const TOKEN_USAGE_SCHEMA_VERSION = 1;

function finiteToken(value) {
  const token = Number(value);
  return Number.isSafeInteger(token) && token >= 0 ? token : null;
}

function usageFromObject(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) return null;
  const input =
    finiteToken(value.input_tokens) ??
    finiteToken(value.inputTokens) ??
    finiteToken(value.prompt_tokens) ??
    finiteToken(value.promptTokens);
  const output =
    finiteToken(value.output_tokens) ??
    finiteToken(value.outputTokens) ??
    finiteToken(value.completion_tokens) ??
    finiteToken(value.completionTokens);
  const cached =
    finiteToken(value.cached_input_tokens) ??
    finiteToken(value.cachedInputTokens) ??
    finiteToken(value.cached_tokens) ??
    finiteToken(value.cachedTokens) ??
    0;
  if (input !== null || output !== null) {
    const inputTokens = input ?? 0;
    const outputTokens = output ?? 0;
    return {
      inputTokens,
      outputTokens,
      cachedInputTokens: Math.min(cached, inputTokens),
      totalTokens:
        finiteToken(value.total_tokens) ??
        finiteToken(value.totalTokens) ??
        inputTokens + outputTokens,
    };
  }
  for (const key of [
    'usage',
    'token_usage',
    'tokenUsage',
    'response',
    'turn',
  ]) {
    const nested = usageFromObject(value[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

export function extractMeasuredUsage(jsonl) {
  const candidates = [];
  const preferred = [];
  for (const [index, line] of String(jsonl).split('\n').entries()) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const usage = usageFromObject(event);
    if (!usage) continue;
    const record = { index, eventType: String(event.type || 'unknown'), usage };
    candidates.push(record);
    if (
      /(?:turn|thread|response|session)\.(?:completed|done)$/i.test(
        record.eventType,
      )
    ) {
      preferred.push(record);
    }
  }
  return preferred.at(-1) || candidates.at(-1) || null;
}

function zeroTokenStep(label) {
  return {
    label,
    measurement: 'zero_token_by_design',
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    totalTokens: 0,
  };
}

export function createTokenUsageReport({
  jsonl,
  spendTier = 'standard',
  reasoningEffort = 'medium',
  workerId = null,
  reportId = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const measured = extractMeasuredUsage(jsonl);
  const workerStep = measured
    ? {
        label:
          'Codex evaluation worker, including research and artifact planning',
        measurement: 'measured',
        eventType: measured.eventType,
        ...measured.usage,
      }
    : {
        label:
          'Codex evaluation worker, including research and artifact planning',
        measurement: 'unavailable',
        reason: 'No token-usage fields were present in the Codex JSONL events.',
        inputTokens: null,
        outputTokens: null,
        cachedInputTokens: null,
        totalTokens: null,
      };
  return {
    schemaVersion: TOKEN_USAGE_SCHEMA_VERSION,
    generatedAt,
    workerId,
    reportId,
    policy: { spendTier, reasoningEffort },
    steps: {
      posting_preflight: zeroTokenStep(
        'Local liveness and JD extraction preflight',
      ),
      evaluation_worker: workerStep,
      artifact_validation: zeroTokenStep(
        'Local PDF, manifest, and report validation',
      ),
      tracker_closeout: zeroTokenStep(
        'Local tracker merge, verification, and reconciliation',
      ),
    },
    totals: measured
      ? { measurement: 'measured', ...measured.usage }
      : {
          measurement: 'unavailable',
          inputTokens: null,
          outputTokens: null,
          cachedInputTokens: null,
          totalTokens: null,
        },
    pricing: {
      estimatedCost: null,
      reason:
        'No mutable provider pricing is hardcoded; token counts remain auditable.',
    },
  };
}

export function formatTokenUsageReport(report) {
  const lines = [
    `Token usage (${report.policy.spendTier}/${report.policy.reasoningEffort}):`,
  ];
  for (const [name, step] of Object.entries(report.steps)) {
    const value =
      step.measurement === 'measured'
        ? `${step.inputTokens} input / ${step.outputTokens} output / ${step.totalTokens} total`
        : step.measurement === 'zero_token_by_design'
          ? 'zero-token by design'
          : 'unavailable';
    lines.push(`  ${name}: ${value}`);
  }
  return lines.join('\n');
}

export function aggregateTokenUsageReports(reports) {
  const usable = reports.filter(
    (report) => report?.totals?.measurement === 'measured',
  );
  return {
    schemaVersion: TOKEN_USAGE_SCHEMA_VERSION,
    reportCount: reports.length,
    measuredReportCount: usable.length,
    unavailableReportCount: reports.length - usable.length,
    totals: {
      inputTokens: usable.reduce(
        (sum, report) => sum + report.totals.inputTokens,
        0,
      ),
      outputTokens: usable.reduce(
        (sum, report) => sum + report.totals.outputTokens,
        0,
      ),
      cachedInputTokens: usable.reduce(
        (sum, report) => sum + report.totals.cachedInputTokens,
        0,
      ),
      totalTokens: usable.reduce(
        (sum, report) => sum + report.totals.totalTokens,
        0,
      ),
    },
  };
}

function argument(argv, name, fallback = undefined) {
  return (
    argv
      .find((value) => value.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? fallback
  );
}

function usage() {
  return [
    'Usage:',
    '  node scripts/token-usage.mjs <batch/logs/worker.log> --output=batch/logs/worker.usage.json',
    '    [--spend-tier=standard] [--effort=medium] [--worker-id=1] [--report-id=001]',
    '  node scripts/token-usage.mjs --aggregate [--root=. ] [--json]',
  ].join('\n');
}

export async function runTokenUsageCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const root = resolve(options.root || argument(argv, '--root', process.cwd()));
  if (argv.includes('--aggregate')) {
    const logs = resolve(root, 'batch', 'logs');
    const reports = existsSync(logs)
      ? readdirSync(logs)
          .filter((name) => name.endsWith('.usage.json'))
          .sort()
          .map((name) => resolve(logs, name))
          .filter((path) => {
            const stat = lstatSync(path);
            return stat.isFile() && !stat.isSymbolicLink();
          })
          .map((path) => JSON.parse(readFileSync(path, 'utf8')))
      : [];
    const aggregate = aggregateTokenUsageReports(reports);
    console.log(
      argv.includes('--json')
        ? JSON.stringify(aggregate, null, 2)
        : [
            `Token usage manifests: ${aggregate.reportCount}`,
            `Measured: ${aggregate.measuredReportCount}; unavailable: ${aggregate.unavailableReportCount}`,
            `Total: ${aggregate.totals.inputTokens} input / ${aggregate.totals.outputTokens} output / ${aggregate.totals.totalTokens} tokens`,
          ].join('\n'),
    );
    return 0;
  }

  const positional = argv.filter((value) => !value.startsWith('--'));
  const output = argument(argv, '--output');
  if (positional.length !== 1 || !output) throw new Error(usage());
  const logPath = resolve(root, positional[0]);
  const logsRoot = resolve(root, 'batch', 'logs');
  if (!logPath.startsWith(`${logsRoot}/`)) {
    throw new Error('event log must stay inside batch/logs/');
  }
  const stat = lstatSync(logPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('event log must be a regular non-symlink file');
  }
  const report = createTokenUsageReport({
    jsonl: readFileSync(logPath, 'utf8'),
    spendTier: argument(argv, '--spend-tier', 'standard'),
    reasoningEffort: argument(argv, '--effort', 'medium'),
    workerId: argument(argv, '--worker-id', null),
    reportId: argument(argv, '--report-id', null),
  });
  const target = resolveArtifactPath({
    root,
    directory: 'batch/logs',
    requested: output,
    extensions: ['.json'],
    label: 'Token usage manifest',
  }).path;
  await atomicWriteArtifact(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    argv.includes('--json')
      ? JSON.stringify(report)
      : `${formatTokenUsageReport(report)}\n  manifest: batch/logs/${basename(target)}`,
  );
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = await runTokenUsageCli();
  } catch (error) {
    console.error(`Token usage reporting failed: ${error.message}`);
    process.exitCode = 1;
  }
}

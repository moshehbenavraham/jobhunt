#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishArtifactSet, resolveArtifactPath } from './artifact-policy.mjs';
import {
  marketHeuristicsInstruction,
  outputLanguageInstruction,
  resolveEvaluationPolicy,
} from './evaluation-policy.mjs';
import {
  createEvaluationSummaryJsonSchema,
  validateEvaluationReport,
} from './evaluation-summary.mjs';
import {
  assertContainedPath,
  ensureContainedDirectory,
  pathIsInside,
} from './path-policy.mjs';
import { writeFileAtomic } from './tracker-utils.mjs';

const RESPONSE_LIMIT_BYTES = 4 * 1024 * 1024;
const OUTPUT_LIMIT_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 180_000;
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;

export const MODEL_PROVIDERS = Object.freeze({
  gemini: Object.freeze({
    modelEnv: 'GEMINI_MODEL',
    keyEnv: 'GEMINI_API_KEY',
  }),
  ollama: Object.freeze({
    modelEnv: 'OLLAMA_MODEL',
    keyEnv: null,
  }),
  openrouter: Object.freeze({
    modelEnv: 'OPENROUTER_MODEL',
    keyEnv: 'OPENROUTER_API_KEY',
  }),
});

function cleanModel(value) {
  const model = String(value ?? '').trim();
  if (!MODEL_PATTERN.test(model)) {
    throw new Error(
      'A model identifier is required and may contain only letters, numbers, ., _, :, /, and -',
    );
  }
  return model;
}

function boundedInteger(value, fallback, minimum, maximum, label) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${label} must be an integer from ${minimum} to ${maximum}`,
    );
  }
  return parsed;
}

function requiredRegularFile(path, label) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  return readFileSync(path, 'utf8').trim();
}

function optionalRegularFile(path) {
  if (!existsSync(path)) return '';
  return requiredRegularFile(path, path);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeUsage(provider, body) {
  if (provider === 'gemini') {
    const usage = body.usageMetadata ?? {};
    const inputTokens = Number(usage.promptTokenCount ?? 0);
    const outputTokens = Number(usage.candidatesTokenCount ?? 0);
    const totalTokens = Number(
      usage.totalTokenCount ?? inputTokens + outputTokens,
    );
    return { inputTokens, outputTokens, totalTokens };
  }
  if (provider === 'ollama') {
    const inputTokens = Number(body.prompt_eval_count ?? 0);
    const outputTokens = Number(body.eval_count ?? 0);
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }
  const usage = body.usage ?? {};
  const inputTokens = Number(usage.prompt_tokens ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? 0);
  return {
    inputTokens,
    outputTokens,
    totalTokens: Number(usage.total_tokens ?? inputTokens + outputTokens),
  };
}

function safeUsage(usage) {
  const result = {};
  for (const key of ['inputTokens', 'outputTokens', 'totalTokens']) {
    const value = usage[key];
    result[key] = Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  return result;
}

export function redactProviderError(value, secrets = []) {
  let message = String(value instanceof Error ? value.message : value);
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 4) {
      message = message.replaceAll(secret, '[REDACTED]');
    }
  }
  return message
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:sk-or-v1-|AIza)[A-Za-z0-9._-]+/g, '[REDACTED]');
}

function outputText(provider, body) {
  if (provider === 'gemini') {
    return (body.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part?.text ?? '')
      .join('');
  }
  if (provider === 'ollama') return body.message?.content ?? '';
  return body.choices?.[0]?.message?.content ?? '';
}

function unwrapMarkdownFence(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i);
  return (match?.[1] ?? text).trim();
}

function loopbackOllamaBase(value) {
  const requested = String(value || 'http://127.0.0.1:11434').replace(
    /\/+$/,
    '',
  );
  let url;
  try {
    url = new URL(requested);
  } catch {
    throw new Error('OLLAMA_BASE_URL must be a valid loopback URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    !['', '/'].includes(url.pathname) ||
    url.search ||
    url.hash ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ) {
    throw new Error(
      'OLLAMA_BASE_URL must be an origin on localhost, 127.0.0.1, or ::1',
    );
  }
  return url.origin;
}

function providerRequest({
  provider,
  model,
  systemPrompt,
  userPrompt,
  apiKey,
  ollamaBaseUrl,
  maxOutputTokens,
}) {
  if (provider === 'gemini') {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens,
        },
      },
    };
  }
  if (provider === 'ollama') {
    return {
      url: `${loopbackOllamaBase(ollamaBaseUrl)}/api/chat`,
      headers: { 'content-type': 'application/json' },
      body: {
        model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: { temperature: 0.1, num_predict: maxOutputTokens },
      },
    };
  }
  return {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'http-referer': 'https://github.com/moshehbenavraham/jobhunt',
      'x-title': 'jobhunt',
    },
    body: {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: maxOutputTokens,
    },
  };
}

async function responseJson(response) {
  const declaredLength = Number(response.headers?.get?.('content-length') ?? 0);
  if (declaredLength > RESPONSE_LIMIT_BYTES) {
    throw new Error('Provider response exceeded the 4 MiB safety limit');
  }
  const text = await response.text();
  if (Buffer.byteLength(text) > RESPONSE_LIMIT_BYTES) {
    throw new Error('Provider response exceeded the 4 MiB safety limit');
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Provider returned invalid JSON (HTTP ${response.status})`);
  }
  if (!response.ok) {
    const detail =
      body?.error?.message ?? body?.message ?? `HTTP ${response.status}`;
    throw new Error(`Provider request failed: ${String(detail).slice(0, 500)}`);
  }
  return body;
}

export function loadEvaluationContext(root) {
  const projectRoot = resolve(root);
  const cvPath = existsSync(resolve(projectRoot, 'profile/cv.md'))
    ? resolve(projectRoot, 'profile/cv.md')
    : resolve(projectRoot, 'cv.md');
  const files = {
    shared: requiredRegularFile(
      resolve(projectRoot, 'modes/_shared.md'),
      'modes/_shared.md',
    ),
    profileMode: requiredRegularFile(
      resolve(projectRoot, 'modes/_profile.md'),
      'modes/_profile.md',
    ),
    offerMode: requiredRegularFile(
      resolve(projectRoot, 'modes/oferta.md'),
      'modes/oferta.md',
    ),
    profileYaml: requiredRegularFile(
      resolve(projectRoot, 'config/profile.yml'),
      'config/profile.yml',
    ),
    cv: requiredRegularFile(cvPath, 'profile/cv.md'),
    articleDigest: optionalRegularFile(
      resolve(projectRoot, 'profile/article-digest.md'),
    ),
  };
  return {
    ...files,
    policy: resolveEvaluationPolicy(files.profileYaml),
  };
}

export function buildProviderPrompts({
  context,
  jdText,
  postingUrl,
  reportId,
  date,
}) {
  const schema = JSON.stringify(createEvaluationSummaryJsonSchema(), null, 2);
  const systemPrompt = [
    "You are jobhunt's read-only evaluation worker.",
    'Follow the checked-in evaluation modes exactly. Never invent candidate experience, metrics, live-page verification, company research, or compensation facts.',
    'The supplied job description is the only posting evidence. Mark live-posting and web-only checks not_evaluated unless the text itself proves them.',
    outputLanguageInstruction(context.policy),
    marketHeuristicsInstruction(context.policy),
    'Return only one complete Markdown evaluation report. It must contain the exact **Date:**, **URL:**, **Score:**, and **Legitimacy:** headers, all required Risk Summary rows, and exactly one `## Machine Summary` YAML fence matching the schema below.',
    'Do not claim to update the tracker, build a PDF, send a message, or submit an application. A human must review every result.',
    `Machine Summary JSON Schema:\n${schema}`,
    `Shared rules:\n${context.shared}`,
    `Candidate-specific profile mode:\n${context.profileMode}`,
    `Evaluation mode:\n${context.offerMode}`,
    `Profile configuration:\n${context.profileYaml}`,
    `Canonical CV:\n${context.cv}`,
    context.articleDigest
      ? `Higher-priority public proof-point digest:\n${context.articleDigest}`
      : 'No article digest is available.',
  ].join('\n\n');
  const userPrompt = [
    `Report ID: ${reportId}`,
    `Report date: ${date}`,
    `Posting URL: ${postingUrl}`,
    'Evaluate only the following user-supplied job description:',
    jdText,
  ].join('\n\n');
  return { systemPrompt, userPrompt };
}

export async function runProviderEvaluation(options) {
  const provider = String(options.provider ?? '').toLowerCase();
  const contract = MODEL_PROVIDERS[provider];
  if (!contract) {
    throw new Error(
      `Unknown provider "${provider}". Choose gemini, ollama, or openrouter`,
    );
  }
  const env = options.env ?? process.env;
  const model = cleanModel(options.model ?? env[contract.modelEnv]);
  const apiKey = contract.keyEnv ? String(env[contract.keyEnv] ?? '') : '';
  if (contract.keyEnv && !apiKey) {
    throw new Error(`${contract.keyEnv} is required for ${provider}`);
  }
  const reportId = String(options.reportId ?? '');
  if (!/^\d{3,}$/.test(reportId)) {
    throw new Error('reportId must contain at least three digits');
  }
  let postingUrl;
  try {
    postingUrl = new URL(String(options.postingUrl));
  } catch {
    throw new Error('postingUrl must be an absolute http(s) URL');
  }
  if (!['http:', 'https:'].includes(postingUrl.protocol)) {
    throw new Error('postingUrl must be an absolute http(s) URL');
  }
  if (
    postingUrl.username ||
    postingUrl.password ||
    /[\r\n\0]/.test(String(options.postingUrl))
  ) {
    throw new Error(
      'postingUrl must not contain credentials or control characters',
    );
  }
  const jdText = String(options.jdText ?? '').trim();
  if (jdText.length < 80) {
    throw new Error('The job description must contain at least 80 characters');
  }
  if (Buffer.byteLength(jdText) > 1024 * 1024) {
    throw new Error('The job description exceeds the 1 MiB input limit');
  }
  const date = String(options.date ?? new Date().toISOString().slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('date must use YYYY-MM-DD');
  }
  const context = options.context ?? loadEvaluationContext(options.root);
  const prompts = buildProviderPrompts({
    context,
    jdText,
    postingUrl: postingUrl.href,
    reportId,
    date,
  });
  const request = providerRequest({
    provider,
    model,
    ...prompts,
    apiKey,
    ollamaBaseUrl: options.ollamaBaseUrl ?? env.OLLAMA_BASE_URL,
    maxOutputTokens: boundedInteger(
      options.maxOutputTokens ?? env.JOBHUNT_RUNNER_MAX_OUTPUT_TOKENS,
      12_000,
      1_000,
      32_000,
      'maxOutputTokens',
    ),
  });
  const timeoutMs = boundedInteger(
    options.timeoutMs ?? env.JOBHUNT_RUNNER_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    1_000,
    600_000,
    'timeoutMs',
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  let body;
  try {
    const response = await fetchImpl(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
    body = await responseJson(response);
  } catch (error) {
    throw new Error(redactProviderError(error, [apiKey]));
  }
  const report = unwrapMarkdownFence(outputText(provider, body));
  if (!report || Buffer.byteLength(report) > OUTPUT_LIMIT_BYTES) {
    throw new Error('Provider returned an empty or oversized report');
  }
  let validation;
  try {
    validation = validateEvaluationReport(report, {
      expectedReportId: reportId,
    });
  } catch (error) {
    throw new Error(
      `Provider output failed the canonical evaluation contract: ${error.message}`,
      { cause: error },
    );
  }
  if (!validation.valid) {
    throw new Error(
      `Provider output failed the canonical evaluation contract:\n- ${validation.issues.join('\n- ')}`,
    );
  }
  return {
    provider,
    model,
    report,
    summary: validation.summary,
    usage: safeUsage(normalizeUsage(provider, body)),
    promptHash: sha256(`${prompts.systemPrompt}\n${prompts.userPrompt}`),
    jdHash: sha256(jdText),
  };
}

export async function saveProviderEvaluation({
  root,
  output,
  result,
  force = false,
}) {
  const projectRoot = resolve(root);
  const reportId = result.summary.report_id;
  const reportResolved = resolveArtifactPath({
    root: projectRoot,
    directory: 'reports',
    requested: output,
    extensions: ['.md'],
    label: 'Provider report path',
  });
  if (!basename(reportResolved.path).startsWith(`${reportId}-`)) {
    throw new Error(`Report filename must start with ${reportId}-`);
  }
  const manifestName = `${basename(
    reportResolved.path,
    extname(reportResolved.path),
  )}.runner.json`;
  const manifestResolved = resolveArtifactPath({
    root: projectRoot,
    directory: 'reports',
    requested: resolve(dirname(reportResolved.path), manifestName),
    extensions: ['.json'],
    label: 'Provider usage manifest path',
  });
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    provider: result.provider,
    model: result.model,
    report: reportResolved.path.slice(projectRoot.length + 1),
    reportSha256: sha256(`${result.report}\n`),
    promptSha256: result.promptHash,
    jdSha256: result.jdHash,
    usage: {
      measurement: Object.values(result.usage).every((value) =>
        Number.isSafeInteger(value),
      )
        ? 'measured'
        : 'unavailable',
      ...result.usage,
    },
    pricing: {
      estimatedCost: null,
      reason: 'Mutable provider pricing is not hardcoded.',
    },
    invariants: {
      humanReviewRequired: true,
      trackerUpdated: false,
      pdfGenerated: false,
      applicationSubmitted: false,
      messageSent: false,
    },
  };
  const suffix = `${process.pid}.${randomUUID()}.stage`;
  const reportStage = `${reportResolved.path}.${suffix}`;
  const manifestStage = `${manifestResolved.path}.${suffix}`;
  writeFileAtomic(reportStage, `${result.report}\n`);
  writeFileAtomic(manifestStage, `${JSON.stringify(manifest, null, 2)}\n`);
  try {
    await publishArtifactSet(
      new Map([
        [reportStage, reportResolved.path],
        [manifestStage, manifestResolved.path],
      ]),
      { force },
    );
  } catch (error) {
    for (const stage of [reportStage, manifestStage]) {
      if (
        existsSync(stage) &&
        pathIsInside(reportResolved.artifactRoot, stage)
      ) {
        try {
          await rm(stage, { force: true });
        } catch {}
      }
    }
    throw error;
  }
  return {
    reportPath: reportResolved.path,
    manifestPath: manifestResolved.path,
    manifest,
  };
}

function usage() {
  return [
    'Usage: node scripts/model-provider-runner.mjs <gemini|ollama|openrouter>',
    '  --jd-file=jds/posting.txt --url=https://example.com/job --report-id=123',
    '  [--model=<provider model>] [--output=reports/123-company-role.md]',
    '  [--force] [--json]',
    '',
    'Read-only by default. --output saves only a validated report and an auditable',
    'usage manifest. It never updates the tracker, builds a PDF, sends, or submits.',
  ].join('\n');
}

function option(argv, name) {
  return argv
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function runModelProviderCli(
  argv = process.argv.slice(2),
  options = {},
) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  const provider = argv.find((entry) => !entry.startsWith('-'));
  if (!provider) throw new Error(usage());
  const root = resolve(options.root ?? process.cwd());
  const jdsRoot = ensureContainedDirectory(root, 'jds');
  const requestedJd = option(argv, '--jd-file');
  if (!requestedJd) throw new Error('--jd-file is required');
  const jdPath = assertContainedPath(jdsRoot, resolve(root, requestedJd), {
    mustExist: true,
    label: 'JD input path',
  });
  const jdText = requiredRegularFile(jdPath, 'JD input');
  const result = await runProviderEvaluation({
    provider,
    model: option(argv, '--model'),
    jdText,
    postingUrl: option(argv, '--url'),
    reportId: option(argv, '--report-id'),
    root,
    env: options.env,
    fetchImpl: options.fetchImpl,
    date: options.date,
  });
  const output = option(argv, '--output');
  if (output) {
    const saved = await saveProviderEvaluation({
      root,
      output,
      result,
      force: argv.includes('--force'),
    });
    const response = {
      provider: result.provider,
      model: result.model,
      usage: result.usage,
      report: saved.reportPath.slice(root.length + 1),
      manifest: saved.manifestPath.slice(root.length + 1),
      humanReviewRequired: true,
    };
    console.log(
      argv.includes('--json')
        ? JSON.stringify(response, null, 2)
        : `Saved validated draft: ${response.report}\nUsage manifest: ${response.manifest}\nHuman review required; tracker/PDF/send/submit were not touched.`,
    );
  } else if (argv.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          humanReviewRequired: true,
          report: result.report,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(result.report);
    console.error(
      `Provider usage: ${result.usage.inputTokens ?? 'unknown'} input / ${result.usage.outputTokens ?? 'unknown'} output / ${result.usage.totalTokens ?? 'unknown'} total. Human review required.`,
    );
  }
  return 0;
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) {
  try {
    process.exitCode = await runModelProviderCli();
  } catch (error) {
    console.error(`Provider evaluation failed: ${redactProviderError(error)}`);
    process.exitCode = 1;
  }
}

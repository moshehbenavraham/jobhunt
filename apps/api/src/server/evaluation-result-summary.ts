import { existsSync } from 'node:fs';
import { STARTUP_SERVICE_NAME, STARTUP_SESSION_ID } from '../index.js';
import type { ApiServiceContainer } from '../runtime/service-container.js';
import type {
  OperationalStore,
  RuntimeApprovalRecord,
  RuntimeEventRecord,
  RuntimeJobRecord,
  RuntimeRunCheckpointRecord,
  RuntimeSessionRecord,
} from '../store/store-contract.js';
import { resolveRepoRelativePath } from '../config/repo-paths.js';
import { classifyWorkspacePath } from '../workspace/index.js';
import type { JsonValue } from '../workspace/workspace-types.js';
import {
  DEFAULT_EVALUATION_RESULT_PREVIEW_LIMIT,
  MAX_EVALUATION_RESULT_PREVIEW_LIMIT,
  type EvaluationResultApprovalSummary,
  type EvaluationResultArtifactKind,
  type EvaluationResultArtifactState,
  type EvaluationResultArtifactSummary,
  type EvaluationResultCheckpointPreview,
  type EvaluationResultCloseoutSummary,
  type EvaluationResultFailureSummary,
  type EvaluationResultHandoffSummary,
  type EvaluationResultJobSummary,
  type EvaluationResultLegitimacy,
  type EvaluationResultSessionPreview,
  type EvaluationResultSessionSummary,
  type EvaluationResultState,
  type EvaluationResultSummary,
  type EvaluationResultSummaryOptions,
  type EvaluationResultSummaryPayload,
  type EvaluationResultWarningItem,
  type EvaluationResultWarningPreview,
  type EvaluationResultWorkflow,
  evaluationResultLegitimacyValues,
  isEvaluationResultWorkflow,
} from './evaluation-result-contract.js';
import {
  getStartupMessage,
  getStartupStatus,
} from './startup-status.js';

const RECENT_SESSION_SCAN_LIMIT = 25;

type ArtifactSurfaceKey =
  | 'outputDirectory'
  | 'reportsDirectory'
  | 'trackerAdditionsDirectory';

type ExtractedEvaluationSignals = {
  legitimacy: EvaluationResultLegitimacy | null;
  pdfPath: string | null;
  reportNumber: string | null;
  reportPath: string | null;
  score: number | null;
  trackerPath: string | null;
  warnings: EvaluationResultWarningItem[];
};

function clampPreviewLimit(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_EVALUATION_RESULT_PREVIEW_LIMIT;
  }

  return Math.max(1, Math.min(value, MAX_EVALUATION_RESULT_PREVIEW_LIMIT));
}

function isJsonObject(value: JsonValue | null): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  value: Record<string, JsonValue>,
  key: string,
): string | null {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate
    : null;
}

function readNumber(
  value: Record<string, JsonValue>,
  key: string,
): number | null {
  const candidate = value[key];

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate;
  }

  if (typeof candidate === 'string' && /^-?\d+(?:\.\d+)?$/.test(candidate)) {
    return Number.parseFloat(candidate);
  }

  return null;
}

function readStringArray(
  value: Record<string, JsonValue>,
  key: string,
): string[] {
  const candidate = value[key];

  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.filter(
    (entry): entry is string =>
      typeof entry === 'string' && entry.trim().length > 0,
  );
}

function toSessionSummary(
  session: RuntimeSessionRecord,
): EvaluationResultSessionSummary {
  return {
    activeJobId: session.activeJobId,
    lastHeartbeatAt: session.lastHeartbeatAt,
    sessionId: session.sessionId,
    status: session.status,
    updatedAt: session.updatedAt,
    workflow: session.workflow,
  };
}

function toJobSummary(job: RuntimeJobRecord): EvaluationResultJobSummary {
  return {
    attempt: job.attempt,
    completedAt: job.completedAt,
    currentRunId: job.currentRunId,
    jobId: job.jobId,
    jobType: job.jobType,
    startedAt: job.startedAt,
    status: job.status,
    updatedAt: job.updatedAt,
    waitReason: job.waitReason,
  };
}

function extractApprovalString(
  request: JsonValue,
  key: 'action' | 'title',
): string {
  if (!isJsonObject(request)) {
    return '';
  }

  const candidate = request[key];
  return typeof candidate === 'string' ? candidate : '';
}

function toApprovalSummary(
  approval: RuntimeApprovalRecord,
): EvaluationResultApprovalSummary {
  return {
    action: extractApprovalString(approval.request, 'action'),
    approvalId: approval.approvalId,
    jobId: approval.jobId,
    requestedAt: approval.requestedAt,
    resolvedAt: approval.resolvedAt,
    status: approval.status,
    title: extractApprovalString(approval.request, 'title'),
    traceId: approval.traceId,
  };
}

function extractFailureMessage(event: RuntimeEventRecord): string {
  const metadata = isJsonObject(event.metadata) ? event.metadata : null;
  const candidate = metadata ? readString(metadata, 'message') : null;
  return candidate ?? event.summary;
}

function toFailureSummary(
  event: RuntimeEventRecord,
): EvaluationResultFailureSummary | null {
  if (!event.jobId || !event.sessionId) {
    return null;
  }

  const metadata = isJsonObject(event.metadata) ? event.metadata : null;

  return {
    failedAt: event.occurredAt,
    jobId: event.jobId,
    message: extractFailureMessage(event),
    runId:
      (metadata ? readString(metadata, 'runId') : null) ??
      event.traceId ??
      event.eventId,
    sessionId: event.sessionId,
    traceId: event.traceId,
  };
}

function extractJobErrorMessage(error: JsonValue | null): string | null {
  if (!isJsonObject(error)) {
    return null;
  }

  return readString(error, 'message');
}

function createFallbackFailureSummary(
  session: RuntimeSessionRecord,
  job: RuntimeJobRecord | null,
): EvaluationResultFailureSummary | null {
  if (
    session.status !== 'failed' &&
    job?.status !== 'failed'
  ) {
    return null;
  }

  return {
    failedAt: job?.completedAt ?? job?.updatedAt ?? session.updatedAt,
    jobId: job?.jobId ?? '',
    message:
      (job ? extractJobErrorMessage(job.error) : null) ??
      `Evaluation session ${session.sessionId} failed.`,
    runId: job?.currentRunId ?? session.sessionId,
    sessionId: session.sessionId,
    traceId: null,
  };
}

function parseMarkdownLinkPath(candidate: string): string | null {
  const match = candidate.match(/^\[[^\]]+\]\(([^)]+)\)$/);
  return match?.[1]?.trim() || null;
}

function normalizeArtifactPath(candidate: string | null): string | null {
  if (!candidate) {
    return null;
  }

  return parseMarkdownLinkPath(candidate) ?? candidate;
}

function parseReportNumber(candidate: string | null): string | null {
  if (!candidate) {
    return null;
  }

  const directMatch = candidate.match(/^\d{3}$/);
  if (directMatch) {
    return candidate;
  }

  const pathMatch = candidate.match(/(?:^|\/)(\d{3})-/);
  return pathMatch?.[1] ?? null;
}

function appendWarningItem(
  items: EvaluationResultWarningItem[],
  seen: Set<string>,
  input: EvaluationResultWarningItem,
): void {
  const key = `${input.code ?? ''}:${input.message}`;

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  items.push(input);
}

function collectWarningItems(
  candidate: JsonValue | null,
  items: EvaluationResultWarningItem[],
  seen: Set<string>,
): void {
  if (!Array.isArray(candidate)) {
    return;
  }

  for (const entry of candidate) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      appendWarningItem(items, seen, {
        code: null,
        message: entry,
      });
      continue;
    }

    if (!isJsonObject(entry)) {
      continue;
    }

    const message = readString(entry, 'message');
    if (!message) {
      continue;
    }

    appendWarningItem(items, seen, {
      code: readString(entry, 'code'),
      message,
    });
  }
}

function expandSignalSources(value: JsonValue | null): Record<string, JsonValue>[] {
  if (!isJsonObject(value)) {
    return [];
  }

  const sources = [value];

  if (isJsonObject(value.artifacts ?? null)) {
    sources.push(value.artifacts as Record<string, JsonValue>);
  }

  const items = value.items;
  if (Array.isArray(items)) {
    const firstObject = items.find((entry) => isJsonObject(entry));
    if (firstObject) {
      sources.push(firstObject as Record<string, JsonValue>);
    }
  }

  return sources;
}

function extractLegitimacy(
  source: Record<string, JsonValue>,
): EvaluationResultLegitimacy | null {
  const candidate = readString(source, 'legitimacy');
  return candidate &&
    (
      evaluationResultLegitimacyValues as readonly string[]
    ).includes(candidate)
    ? (candidate as EvaluationResultLegitimacy)
    : null;
}

function extractEvaluationSignals(
  sources: readonly (JsonValue | null)[],
): ExtractedEvaluationSignals {
  const warnings: EvaluationResultWarningItem[] = [];
  const seenWarnings = new Set<string>();
  let reportPath: string | null = null;
  let pdfPath: string | null = null;
  let trackerPath: string | null = null;
  let reportNumber: string | null = null;
  let score: number | null = null;
  let legitimacy: EvaluationResultLegitimacy | null = null;

  for (const source of sources) {
    for (const entry of expandSignalSources(source)) {
      reportPath =
        reportPath ??
        normalizeArtifactPath(
          readString(entry, 'report') ?? readString(entry, 'reportRepoRelativePath'),
        );
      pdfPath =
        pdfPath ??
        normalizeArtifactPath(
          readString(entry, 'pdf') ??
            readString(entry, 'outputRepoRelativePath'),
        );
      trackerPath =
        trackerPath ??
        normalizeArtifactPath(
          readString(entry, 'tracker') ??
            readString(entry, 'trackerRepoRelativePath'),
        );
      reportNumber =
        reportNumber ??
        parseReportNumber(
          readString(entry, 'reportNumber') ??
            readString(entry, 'report_num') ??
            reportPath,
        );
      score = score ?? readNumber(entry, 'score');
      legitimacy = legitimacy ?? extractLegitimacy(entry);
      collectWarningItems(entry.warnings ?? null, warnings, seenWarnings);
    }
  }

  return {
    legitimacy,
    pdfPath,
    reportNumber,
    reportPath,
    score,
    trackerPath,
    warnings,
  };
}

function createWarningPreview(
  items: readonly EvaluationResultWarningItem[],
  previewLimit: number,
): EvaluationResultWarningPreview {
  return {
    hasMore: items.length > previewLimit,
    items: items.slice(0, previewLimit),
    totalCount: items.length,
  };
}

function createCheckpointPreview(
  checkpoint: RuntimeRunCheckpointRecord | null,
  previewLimit: number,
): EvaluationResultCheckpointPreview {
  if (!checkpoint) {
    return {
      completedStepCount: 0,
      completedSteps: [],
      cursor: null,
      hasMore: false,
      updatedAt: null,
    };
  }

  return {
    completedStepCount: checkpoint.completedSteps.length,
    completedSteps: checkpoint.completedSteps.slice(0, previewLimit),
    cursor: checkpoint.cursor,
    hasMore: checkpoint.completedSteps.length > previewLimit,
    updatedAt: checkpoint.updatedAt,
  };
}

function selectJob(
  jobs: readonly RuntimeJobRecord[],
  activeJobId: string | null,
): RuntimeJobRecord | null {
  if (activeJobId) {
    const activeJob = jobs.find((job) => job.jobId === activeJobId);
    if (activeJob) {
      return activeJob;
    }
  }

  return jobs[0] ?? null;
}

function selectRelevantApproval(
  approvals: readonly RuntimeApprovalRecord[],
  job: RuntimeJobRecord | null,
): RuntimeApprovalRecord | null {
  if (job?.waitApprovalId) {
    const waitedApproval = approvals.find(
      (approval) => approval.approvalId === job.waitApprovalId,
    );

    if (waitedApproval) {
      return waitedApproval;
    }
  }

  if (job) {
    const jobApprovals = approvals.filter(
      (approval) => approval.jobId === job.jobId,
    );
    const pendingJobApproval = jobApprovals.find(
      (approval) => approval.status === 'pending',
    );

    return pendingJobApproval ?? jobApprovals[0] ?? approvals[0] ?? null;
  }

  return approvals[0] ?? null;
}

async function loadCheckpointRecord(
  store: OperationalStore,
  job: RuntimeJobRecord | null,
  sessionId: string,
): Promise<RuntimeRunCheckpointRecord | null> {
  if (job) {
    const metadata = await store.runMetadata.getLatestByJobId(job.jobId);
    if (!metadata) {
      return null;
    }

    return store.runMetadata.loadCheckpoint(metadata.runId);
  }

  const metadata = await store.runMetadata.listBySessionId(sessionId);
  if (!metadata[0]) {
    return null;
  }

  return store.runMetadata.loadCheckpoint(metadata[0].runId);
}

async function loadFailureForSession(
  store: OperationalStore,
  session: RuntimeSessionRecord,
  job: RuntimeJobRecord | null,
): Promise<EvaluationResultFailureSummary | null> {
  const failureEvents = await store.events.list({
    eventTypes: ['job-failed'],
    limit: 1,
    sessionId: session.sessionId,
  });
  const failureEvent = failureEvents[0];

  if (failureEvent) {
    return toFailureSummary(failureEvent);
  }

  return createFallbackFailureSummary(session, job);
}

function createArtifactSummary(input: {
  inFlight: boolean;
  kind: EvaluationResultArtifactKind;
  repoRelativePath: string | null;
  repoRoot: string;
  surfaceKey: ArtifactSurfaceKey;
}): EvaluationResultArtifactSummary {
  if (!input.repoRelativePath) {
    return {
      exists: false,
      kind: input.kind,
      message: input.inFlight
        ? `${input.kind} artifact is still pending.`
        : `${input.kind} artifact is missing.`,
      repoRelativePath: null,
      state: input.inFlight ? 'pending' : 'missing',
    };
  }

  const classification = classifyWorkspacePath(input.repoRelativePath, {
    repoRoot: input.repoRoot,
  });

  if (
    classification.repoRelativePath === null ||
    classification.surfaceKey !== input.surfaceKey
  ) {
    return {
      exists: false,
      kind: input.kind,
      message: `Stored ${input.kind} artifact path is outside the allowed workspace surface.`,
      repoRelativePath: input.repoRelativePath,
      state: 'missing',
    };
  }

  const absolutePath = resolveRepoRelativePath(classification.repoRelativePath, {
    repoRoot: input.repoRoot,
  });
  const exists = existsSync(absolutePath);

  return {
    exists,
    kind: input.kind,
    message: exists
      ? `${input.kind} artifact is ready.`
      : `${input.kind} artifact path is recorded but the file is missing.`,
    repoRelativePath: classification.repoRelativePath,
    state: exists ? 'ready' : 'missing',
  };
}

function resolveBaseState(input: {
  approval: RuntimeApprovalRecord | null;
  failure: EvaluationResultFailureSummary | null;
  job: RuntimeJobRecord | null;
  session: RuntimeSessionRecord;
}): Extract<
  EvaluationResultState,
  'approval-paused' | 'completed' | 'failed' | 'pending' | 'running'
> {
  if (
    input.approval?.status === 'pending' ||
    (input.job?.status === 'waiting' && input.job.waitReason === 'approval')
  ) {
    return 'approval-paused';
  }

  if (
    input.failure ||
    input.job?.status === 'failed' ||
    input.session.status === 'failed'
  ) {
    return 'failed';
  }

  if (
    input.job?.status === 'pending' ||
    input.job?.status === 'queued' ||
    input.session.status === 'pending'
  ) {
    return 'pending';
  }

  if (
    input.job?.status === 'running' ||
    input.job?.status === 'waiting' ||
    input.session.status === 'running' ||
    input.session.status === 'waiting'
  ) {
    return 'running';
  }

  return 'completed';
}

function resolveSummaryState(input: {
  artifacts: EvaluationResultSummary['artifacts'];
  approval: RuntimeApprovalRecord | null;
  failure: EvaluationResultFailureSummary | null;
  job: RuntimeJobRecord | null;
  session: RuntimeSessionRecord;
  warningCount: number;
}): EvaluationResultState {
  const baseState = resolveBaseState({
    approval: input.approval,
    failure: input.failure,
    job: input.job,
    session: input.session,
  });

  if (baseState !== 'completed') {
    return baseState;
  }

  return input.warningCount > 0 ||
    input.artifacts.report.state !== 'ready' ||
    input.artifacts.pdf.state !== 'ready' ||
    input.artifacts.tracker.state !== 'ready'
    ? 'degraded'
    : 'completed';
}

function createHandoffSummary(input: {
  approval: RuntimeApprovalRecord | null;
  state: EvaluationResultState;
}): EvaluationResultHandoffSummary {
  if (input.approval?.status === 'pending') {
    const approvalSummary = toApprovalSummary(input.approval);

    return {
      approval: approvalSummary,
      approvalStatus: 'pending',
      message:
        approvalSummary.title.length > 0
          ? `Evaluation is waiting for approval: ${approvalSummary.title}.`
          : 'Evaluation is waiting for approval.',
      resumeAllowed: false,
      state: 'waiting-for-approval',
    };
  }

  if (
    input.approval?.status === 'rejected' ||
    input.state === 'failed'
  ) {
    return {
      approval: input.approval ? toApprovalSummary(input.approval) : null,
      approvalStatus: input.approval?.status ?? 'none',
      message:
        input.approval?.status === 'rejected'
          ? 'The latest approval was rejected. The shared resume path can inspect this session.'
          : 'The shared resume path can inspect this failed session.',
      resumeAllowed: true,
      state: 'resume-ready',
    };
  }

  return {
    approval: input.approval ? toApprovalSummary(input.approval) : null,
    approvalStatus: input.approval?.status ?? 'none',
    message:
      input.approval?.status === 'approved'
        ? 'The latest approval for this session was approved.'
        : 'No approval handoff is attached to this result.',
    resumeAllowed: false,
    state: 'none',
  };
}

function createCloseoutSummary(input: {
  artifacts: EvaluationResultSummary['artifacts'];
  state: EvaluationResultState;
}): EvaluationResultCloseoutSummary {
  switch (input.state) {
    case 'completed':
      return {
        message: 'All evaluation artifacts are ready for review.',
        readyForReview: true,
        state: 'review-ready',
      };
    case 'degraded':
      return {
        message:
          'Evaluation completed with warnings or missing artifacts that need attention.',
        readyForReview: input.artifacts.report.state === 'ready',
        state: 'attention-required',
      };
    case 'pending':
    case 'running':
    case 'approval-paused':
      return {
        message: 'Evaluation closeout is still in progress.',
        readyForReview: false,
        state: 'in-progress',
      };
    case 'failed':
      return {
        message: 'Evaluation failed before a clean artifact handoff completed.',
        readyForReview: false,
        state: 'attention-required',
      };
    case 'empty':
    case 'missing-session':
    case 'unsupported-workflow':
      return {
        message: 'No review-ready evaluation closeout is available yet.',
        readyForReview: false,
        state: 'not-ready',
      };
  }
}

function resolveSummaryMessage(input: {
  approval: RuntimeApprovalRecord | null;
  failure: EvaluationResultFailureSummary | null;
  session: RuntimeSessionRecord | null;
  state: EvaluationResultState;
  workflow: string | null;
}): string {
  switch (input.state) {
    case 'approval-paused':
      return input.approval
        ? `Evaluation session is waiting for approval: ${extractApprovalString(input.approval.request, 'title') || input.approval.approvalId}.`
        : 'Evaluation session is waiting for approval.';
    case 'completed':
      return 'Evaluation result summary is ready.';
    case 'degraded':
      return 'Evaluation result summary is ready with warnings or missing artifacts.';
    case 'empty':
      return 'No evaluation sessions have been recorded yet.';
    case 'failed':
      return (
        input.failure?.message ??
        `Evaluation session ${input.session?.sessionId ?? ''} failed.`
      );
    case 'missing-session':
      return `Evaluation session ${input.session?.sessionId ?? 'requested-session'} was not found.`;
    case 'pending':
      return 'Evaluation session is queued and has not started yet.';
    case 'running':
      return 'Evaluation session is still running.';
    case 'unsupported-workflow':
      return `Workflow ${input.workflow ?? '(unknown)'} is not supported by the evaluation-result route.`;
  }
}

function createEmptyArtifacts(): EvaluationResultSummary['artifacts'] {
  const createArtifact = (
    kind: EvaluationResultArtifactKind,
  ): EvaluationResultArtifactSummary => ({
    exists: false,
    kind,
    message: `${kind} artifact is missing.`,
    repoRelativePath: null,
    state: 'missing',
  });

  return {
    pdf: createArtifact('pdf'),
    report: createArtifact('report'),
    tracker: createArtifact('tracker'),
  };
}

function createEmptySummary(input: {
  message: string;
  state: Extract<
    EvaluationResultState,
    'empty' | 'missing-session' | 'unsupported-workflow'
  >;
  workflow: string | null;
}): EvaluationResultSummary {
  const artifacts = createEmptyArtifacts();

  return {
    artifacts,
    checkpoint: createCheckpointPreview(null, DEFAULT_EVALUATION_RESULT_PREVIEW_LIMIT),
    closeout: createCloseoutSummary({
      artifacts,
      state: input.state,
    }),
    failure: null,
    handoff: {
      approval: null,
      approvalStatus: 'none',
      message: 'No approval handoff is attached to this result.',
      resumeAllowed: false,
      state: 'none',
    },
    job: null,
    legitimacy: null,
    message: input.message,
    reportNumber: null,
    score: null,
    session: null,
    state: input.state,
    workflow:
      input.workflow && isEvaluationResultWorkflow(input.workflow)
        ? input.workflow
        : null,
    warnings: createWarningPreview([], DEFAULT_EVALUATION_RESULT_PREVIEW_LIMIT),
  };
}

async function buildSessionSummary(
  store: OperationalStore,
  session: RuntimeSessionRecord,
  previewLimit: number,
  repoRoot: string,
): Promise<EvaluationResultSummary> {
  const [jobs, approvals] = await Promise.all([
    store.jobs.listBySessionId(session.sessionId),
    store.approvals.listBySessionId(session.sessionId),
  ]);
  const job = selectJob(jobs, session.activeJobId);
  const approval = selectRelevantApproval(approvals, job);
  const checkpoint = await loadCheckpointRecord(store, job, session.sessionId);
  const failure = await loadFailureForSession(store, session, job);
  const signals = extractEvaluationSignals([
    job?.result ?? null,
    checkpoint?.value ?? null,
  ]);
  const inFlight =
    session.status === 'pending' ||
    session.status === 'running' ||
    session.status === 'waiting' ||
    job?.status === 'pending' ||
    job?.status === 'queued' ||
    job?.status === 'running' ||
    job?.status === 'waiting';
  const artifacts = {
    pdf: createArtifactSummary({
      inFlight,
      kind: 'pdf',
      repoRelativePath: signals.pdfPath,
      repoRoot,
      surfaceKey: 'outputDirectory',
    }),
    report: createArtifactSummary({
      inFlight,
      kind: 'report',
      repoRelativePath: signals.reportPath,
      repoRoot,
      surfaceKey: 'reportsDirectory',
    }),
    tracker: createArtifactSummary({
      inFlight,
      kind: 'tracker',
      repoRelativePath: signals.trackerPath,
      repoRoot,
      surfaceKey: 'trackerAdditionsDirectory',
    }),
  };
  const state = resolveSummaryState({
    approval,
    artifacts,
    failure,
    job,
    session,
    warningCount: signals.warnings.length,
  });
  const handoff = createHandoffSummary({
    approval,
    state,
  });

  return {
    artifacts,
    checkpoint: createCheckpointPreview(checkpoint, previewLimit),
    closeout: createCloseoutSummary({
      artifacts,
      state,
    }),
    failure,
    handoff,
    job: job ? toJobSummary(job) : null,
    legitimacy: signals.legitimacy,
    message: resolveSummaryMessage({
      approval,
      failure,
      session,
      state,
      workflow: session.workflow,
    }),
    reportNumber:
      signals.reportNumber ?? parseReportNumber(signals.reportPath) ?? null,
    score: signals.score,
    session: toSessionSummary(session),
    state,
    workflow: isEvaluationResultWorkflow(session.workflow)
      ? session.workflow
      : null,
    warnings: createWarningPreview(signals.warnings, previewLimit),
  };
}

async function buildRecentSessionPreview(
  store: OperationalStore,
  sessions: readonly RuntimeSessionRecord[],
  previewLimit: number,
  repoRoot: string,
): Promise<EvaluationResultSessionPreview[]> {
  const previews = await Promise.all(
    sessions.map(async (session) => {
      const summary = await buildSessionSummary(
        store,
        session,
        previewLimit,
        repoRoot,
      );

      return {
        sessionId: session.sessionId,
        state: summary.state,
        status: session.status,
        updatedAt: session.updatedAt,
        workflow: session.workflow as EvaluationResultWorkflow,
      };
    }),
  );

  return previews;
}

async function listRecentEvaluationSessions(
  store: OperationalStore,
  previewLimit: number,
  workflow: string | null,
): Promise<RuntimeSessionRecord[]> {
  if (workflow && isEvaluationResultWorkflow(workflow)) {
    return store.sessions.listRecent({
      limit: previewLimit,
      workflow,
    });
  }

  if (workflow) {
    return [];
  }

  const recentSessions = await store.sessions.listRecent({
    limit: RECENT_SESSION_SCAN_LIMIT,
  });

  return recentSessions
    .filter((session) => isEvaluationResultWorkflow(session.workflow))
    .slice(0, previewLimit);
}

async function resolveFocusedSession(
  store: OperationalStore,
  options: Required<EvaluationResultSummaryPayload['filters']>,
): Promise<RuntimeSessionRecord | null> {
  if (options.sessionId) {
    return store.sessions.getById(options.sessionId);
  }

  const recentSessions = await listRecentEvaluationSessions(
    store,
    1,
    options.workflow,
  );

  return recentSessions[0] ?? null;
}

export async function createEvaluationResultSummary(
  services: ApiServiceContainer,
  options: EvaluationResultSummaryOptions = {},
): Promise<EvaluationResultSummaryPayload> {
  const diagnostics = await services.startupDiagnostics.getDiagnostics();
  const status = getStartupStatus(diagnostics);
  const generatedAt = new Date().toISOString();
  const normalizedFilters = {
    previewLimit: clampPreviewLimit(options.previewLimit),
    sessionId: options.sessionId?.trim() || null,
    workflow: options.workflow?.trim() || null,
  };

  if (diagnostics.operationalStore.status !== 'ready') {
    return {
      filters: normalizedFilters,
      generatedAt,
      message: getStartupMessage(diagnostics),
      ok: true,
      recentSessions: [],
      service: STARTUP_SERVICE_NAME,
      sessionId: STARTUP_SESSION_ID,
      status,
      summary: null,
    };
  }

  const store = await services.operationalStore.getStore();
  const repoRoot = services.workspace.repoPaths.repoRoot;

  if (
    normalizedFilters.workflow &&
    !isEvaluationResultWorkflow(normalizedFilters.workflow)
  ) {
    const summary = createEmptySummary({
      message: resolveSummaryMessage({
        approval: null,
        failure: null,
        session: null,
        state: 'unsupported-workflow',
        workflow: normalizedFilters.workflow,
      }),
      state: 'unsupported-workflow',
      workflow: normalizedFilters.workflow,
    });

    return {
      filters: normalizedFilters,
      generatedAt,
      message: status === 'ready' ? summary.message : getStartupMessage(diagnostics),
      ok: true,
      recentSessions: [],
      service: STARTUP_SERVICE_NAME,
      sessionId: STARTUP_SESSION_ID,
      status,
      summary,
    };
  }

  const recentSessions = await listRecentEvaluationSessions(
    store,
    normalizedFilters.previewLimit,
    normalizedFilters.workflow,
  );
  const recentSessionPreview = await buildRecentSessionPreview(
    store,
    recentSessions,
    normalizedFilters.previewLimit,
    repoRoot,
  );
  const focusedSession = await resolveFocusedSession(store, normalizedFilters);
  let summary: EvaluationResultSummary;

  if (!focusedSession && normalizedFilters.sessionId) {
    summary = createEmptySummary({
      message: `Evaluation session ${normalizedFilters.sessionId} was not found.`,
      state: 'missing-session',
      workflow: normalizedFilters.workflow,
    });
  } else if (!focusedSession) {
    summary = createEmptySummary({
      message: 'No evaluation sessions have been recorded yet.',
      state: 'empty',
      workflow: normalizedFilters.workflow,
    });
  } else if (!isEvaluationResultWorkflow(focusedSession.workflow)) {
    summary = createEmptySummary({
      message: resolveSummaryMessage({
        approval: null,
        failure: null,
        session: focusedSession,
        state: 'unsupported-workflow',
        workflow: focusedSession.workflow,
      }),
      state: 'unsupported-workflow',
      workflow: focusedSession.workflow,
    });
  } else {
    summary = await buildSessionSummary(
      store,
      focusedSession,
      normalizedFilters.previewLimit,
      repoRoot,
    );
  }

  return {
    filters: normalizedFilters,
    generatedAt,
    message: status === 'ready' ? summary.message : getStartupMessage(diagnostics),
    ok: true,
    recentSessions: recentSessionPreview,
    service: STARTUP_SERVICE_NAME,
    sessionId: STARTUP_SESSION_ID,
    status,
    summary,
  };
}

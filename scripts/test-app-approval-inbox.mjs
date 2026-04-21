#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (typeof address !== 'object' || address === null) {
        reject(new Error('Failed to allocate a free local port.'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePort(address.port);
      });
    });
  });
}

async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (child.exitCode !== null) {
      return;
    }

    await delay(100);
  }

  child.kill('SIGKILL');
}

async function waitForHttpOk(url, child, stderrLog) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(
        `Web server exited before becoming ready. stderr:\n${stderrLog.join('')}`,
      );
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the dev server responds or exits.
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for ${url}. stderr:\n${stderrLog.join('')}`);
}

function escapeAttributeValue(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

async function clickEnabledButton(page, ariaLabel) {
  const locator = page.locator(
    `button[aria-label="${escapeAttributeValue(ariaLabel)}"]:not([disabled])`,
  );

  await locator.waitFor();
  await locator.click();
}

function createReadyStartupPayload() {
  return {
    appStateRoot: {
      exists: true,
      path: `${ROOT}/.jobhunt-app`,
    },
    bootSurface: {
      defaultHost: '127.0.0.1',
      defaultPort: 4174,
      healthPath: '/health',
      startupPath: '/startup',
    },
    diagnostics: {
      onboardingMissing: [],
      optionalMissing: [],
      promptContract: {
        cacheMode: 'read-through-mtime',
        sourceOrder: ['agents-guide', 'workflow-mode'],
        sources: [],
        supportedWorkflows: ['single-evaluation'],
        workflowRoutes: [
          {
            description: 'Single evaluation route',
            intent: 'single-evaluation',
            modeRepoRelativePath: 'modes/oferta.md',
          },
        ],
      },
      runtimeMissing: [],
      workspace: {
        protectedOwners: ['system', 'user'],
        writableRoots: ['config', 'data', 'output', 'profile', 'reports'],
      },
    },
    health: {
      message: 'Bootstrap diagnostics are ready.',
      missing: {
        onboarding: 0,
        optional: 0,
        runtime: 0,
      },
      ok: true,
      operationalStore: {
        message: 'Operational store ready.',
        status: 'ready',
      },
      service: 'jobhunt-api-scaffold',
      sessionId: 'phase01-session03-agent-runtime-bootstrap',
      startupStatus: 'ready',
      status: 'ok',
    },
    message: 'Bootstrap diagnostics are ready.',
    mutationPolicy: 'app-owned-only',
    operationalStore: {
      databasePath: `${ROOT}/.jobhunt-app/app.db`,
      message: 'Operational store ready.',
      reason: null,
      rootExists: true,
      rootPath: `${ROOT}/.jobhunt-app`,
      status: 'ready',
    },
    repoRoot: ROOT,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
    userLayerWrites: 'disabled',
  };
}

function createApprovalRecord(input) {
  return {
    action: input.action,
    approvalId: input.approvalId,
    details: input.details ?? null,
    jobId: input.jobId,
    requestedAt: input.requestedAt,
    resolvedAt: input.resolvedAt ?? null,
    response: input.response ?? null,
    sessionId: input.sessionId,
    status: input.status,
    title: input.title,
    traceId: input.traceId,
  };
}

function createSessionRecord(input) {
  return {
    activeJobId: input.activeJobId,
    lastHeartbeatAt: input.updatedAt,
    status: input.status,
    sessionId: input.sessionId,
    updatedAt: input.updatedAt,
    workflow: input.workflow,
  };
}

function createJobRecord(input) {
  return {
    attempt: 1,
    completedAt: input.completedAt ?? null,
    currentRunId: `${input.jobId}-run`,
    jobId: input.jobId,
    jobType: 'evaluate-job',
    startedAt: input.startedAt,
    status: input.status,
    updatedAt: input.updatedAt,
    waitReason: input.waitReason ?? null,
  };
}

function createFailureRecord(input) {
  return {
    failedAt: input.failedAt,
    jobId: input.jobId,
    message: input.message,
    runId: `${input.jobId}-run`,
    sessionId: input.sessionId,
    traceId: input.traceId,
  };
}

function createTimelineItem(input) {
  return {
    approvalId: input.approvalId ?? null,
    eventId: input.eventId,
    eventType: input.eventType,
    jobId: input.jobId ?? null,
    level: input.level,
    occurredAt: input.occurredAt,
    requestId: input.requestId ?? null,
    sessionId: input.sessionId ?? null,
    summary: input.summary,
    traceId: input.traceId ?? null,
  };
}

function createCommandPayload(sessionId, message, state) {
  return {
    generatedAt: '2026-04-22T00:20:00.000Z',
    handoff: {
      job: {
        attempt: 1,
        completedAt: null,
        currentRunId: `job-${sessionId}-run`,
        jobId: `job-${sessionId}`,
        jobType: 'evaluate-job',
        startedAt: '2026-04-22T00:20:00.000Z',
        status: 'running',
        updatedAt: '2026-04-22T00:20:00.000Z',
        waitReason: null,
      },
      message,
      pendingApproval: null,
      requestedAt: '2026-04-22T00:20:00.000Z',
      route: {
        message: 'Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.',
        missingCapabilities: [],
        requestKind: 'resume',
        sessionId,
        specialistId: 'evaluation-specialist',
        status: 'ready',
        workflow: 'single-evaluation',
      },
      runtime: {
        message: 'Runtime is ready for workflow single-evaluation.',
        modeRepoRelativePath: 'modes/oferta.md',
        model: 'gpt-5.4-mini',
        promptState: 'ready',
        startedAt: '2026-04-22T00:20:00.000Z',
        status: 'ready',
        workflow: 'single-evaluation',
      },
      selectedSession: null,
      session: {
        activeJobId: `job-${sessionId}`,
        job: null,
        latestFailure: null,
        lastHeartbeatAt: '2026-04-22T00:20:00.000Z',
        pendingApproval: null,
        pendingApprovalCount: 0,
        resumeAllowed: true,
        sessionId,
        state,
        status: 'running',
        updatedAt: '2026-04-22T00:20:00.000Z',
        workflow: 'single-evaluation',
      },
      specialist: {
        description: 'Owns job-description intake and evaluation follow-through.',
        id: 'evaluation-specialist',
        label: 'Evaluation Specialist',
      },
      state,
      toolingGap: null,
    },
    ok: true,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
  };
}

function toResolutionPayload(approval, job, outcome, message) {
  return {
    generatedAt: '2026-04-22T00:10:00.000Z',
    message,
    ok: true,
    resolution: {
      applied: outcome === 'approved' || outcome === 'rejected',
      approval,
      job,
      outcome,
    },
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
  };
}

function createErrorPayload(code, message, status = 'error') {
  return {
    error: {
      code,
      message,
    },
    ok: false,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status,
  };
}

function normalizeApprovals(state) {
  return [...state.approvals.values()].sort((left, right) =>
    left.requestedAt.localeCompare(right.requestedAt),
  );
}

function buildInterruptedRun(state, sessionId) {
  const session = state.sessions.get(sessionId) ?? null;
  const job = session?.activeJobId ? state.jobs.get(session.activeJobId) ?? null : null;
  const pendingCount = normalizeApprovals(state).filter(
    (approval) => approval.sessionId === sessionId && approval.status === 'pending',
  ).length;

  if (!session) {
    return {
      message: 'No runtime session is attached to this approval anymore.',
      resumeAllowed: false,
      sessionId: null,
      state: 'missing',
    };
  }

  if (
    pendingCount > 0 ||
    (job?.status === 'waiting' && job.waitReason === 'approval')
  ) {
    return {
      message: 'Resolve the pending approval before attempting a resume handoff.',
      resumeAllowed: false,
      sessionId,
      state: 'waiting-for-approval',
    };
  }

  if (session.status === 'failed' || job?.status === 'failed') {
    return {
      message: 'This session can be handed back to the shared orchestration resume path.',
      resumeAllowed: true,
      sessionId,
      state: 'resume-ready',
    };
  }

  if (session.status === 'running' || session.status === 'pending') {
    return {
      message: 'Runtime work is already active for this session.',
      resumeAllowed: false,
      sessionId,
      state: 'running',
    };
  }

  return {
    message: 'This session is not currently resumable from the approval inbox.',
    resumeAllowed: false,
    sessionId,
    state: 'blocked',
  };
}

function buildApprovalInboxPayload(state, url) {
  const sessionFilter = url.searchParams.get('sessionId');
  const approvalId = url.searchParams.get('approvalId');
  const pendingApprovals = normalizeApprovals(state).filter(
    (approval) =>
      approval.status === 'pending' &&
      (sessionFilter ? approval.sessionId === sessionFilter : true),
  );
  const queue = pendingApprovals.slice(0, 8).map((approval) => {
    const session = state.sessions.get(approval.sessionId) ?? null;

    return {
      action: approval.action,
      approvalId: approval.approvalId,
      jobId: approval.jobId,
      requestedAt: approval.requestedAt,
      sessionId: approval.sessionId,
      sessionStatus: session?.status ?? null,
      title: approval.title,
      traceId: approval.traceId,
      workflow: session?.workflow ?? null,
    };
  });

  let selectedApproval = approvalId
    ? state.approvals.get(approvalId) ?? null
    : queue[0]
      ? state.approvals.get(queue[0].approvalId) ?? null
      : null;

  if (!selectedApproval && sessionFilter) {
    selectedApproval =
      normalizeApprovals(state).find((approval) => approval.sessionId === sessionFilter) ??
      null;
  }

  const selectedSessionId =
    selectedApproval?.sessionId ?? sessionFilter ?? null;
  const selectedSession = selectedSessionId
    ? state.sessions.get(selectedSessionId) ?? null
    : null;
  const selectedJob =
    selectedSession?.activeJobId
      ? state.jobs.get(selectedSession.activeJobId) ?? null
      : null;
  const failure = selectedSessionId ? state.failures.get(selectedSessionId) ?? null : null;
  const timeline = selectedSessionId ? state.timelines.get(selectedSessionId) ?? [] : [];
  const selectionState =
    !selectedApproval && approvalId
      ? 'missing'
      : selectedApproval?.status === 'approved'
        ? 'approved'
        : selectedApproval?.status === 'rejected'
          ? 'rejected'
          : 'active';
  const selectionMessage =
    selectionState === 'approved'
      ? `${selectedApproval?.title ?? approvalId} has already been approved. Refresh the live runtime state before taking the next action.`
      : selectionState === 'rejected'
        ? `${selectedApproval?.title ?? approvalId} has already been rejected. Review the interrupted run state before resuming.`
        : selectionState === 'missing'
          ? `Approval ${approvalId} is no longer available.`
          : `${selectedApproval?.title ?? 'Selected approval'} is ready for review. Resolve it from the shared approval runtime path.`;

  return {
    filters: {
      approvalId: approvalId ?? null,
      limit: 8,
      sessionId: sessionFilter ?? null,
    },
    generatedAt: '2026-04-22T00:00:00.000Z',
    message:
      queue.length > 0
        ? 'Approval inbox summary is ready.'
        : 'Approval inbox is ready. No pending approvals are waiting right now.',
    ok: true,
    pendingApprovalCount: pendingApprovals.length,
    queue,
    selected:
      selectedApproval || approvalId
        ? {
            approval: selectedApproval,
            failure,
            interruptedRun: buildInterruptedRun(
              state,
              selectedSessionId,
            ),
            job: selectedJob,
            route: {
              message:
                'Single evaluation can launch with the evaluation specialist and the current typed evaluation toolset.',
              missingCapabilities: [],
              specialistId: 'evaluation-specialist',
              status: 'ready',
            },
            selectionMessage,
            selectionState,
            session: selectedSession
              ? {
                  ...selectedSession,
                  pendingApprovalCount: normalizeApprovals(state).filter(
                    (approval) =>
                      approval.sessionId === selectedSession.sessionId &&
                      approval.status === 'pending',
                  ).length,
                }
              : null,
            timeline,
          }
        : null,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
  };
}

function buildShellSummary(state) {
  const approvals = normalizeApprovals(state).filter(
    (approval) => approval.status === 'pending',
  );
  const failures = [...state.failures.values()];

  return {
    activity: {
      activeSession: state.sessions.get('session-live')
        ? {
            activeJob: {
              jobId: 'job-live',
              status: state.jobs.get('job-live')?.status ?? 'running',
              updatedAt: state.jobs.get('job-live')?.updatedAt ?? '2026-04-22T00:00:00.000Z',
              waitReason: state.jobs.get('job-live')?.waitReason ?? null,
            },
            activeJobId: 'job-live',
            lastHeartbeatAt: state.sessions.get('session-live').lastHeartbeatAt,
            pendingApprovalCount: approvals.filter(
              (approval) => approval.sessionId === 'session-live',
            ).length,
            sessionId: 'session-live',
            status: state.sessions.get('session-live').status,
            updatedAt: state.sessions.get('session-live').updatedAt,
            workflow: 'single-evaluation',
          }
        : null,
      activeSessionCount: 1,
      latestPendingApprovals: approvals.slice(0, 3).map((approval) => ({
        action: approval.action,
        approvalId: approval.approvalId,
        jobId: approval.jobId,
        requestedAt: approval.requestedAt,
        sessionId: approval.sessionId,
        title: approval.title,
        traceId: approval.traceId,
      })),
      pendingApprovalCount: approvals.length,
      recentFailureCount: failures.length,
      recentFailures: failures,
      state:
        approvals.length > 0 || failures.length > 0
          ? 'attention-required'
          : 'active',
    },
    currentSession: {
      id: 'phase03-session04-approval-inbox-and-human-review-flow',
      monorepo: true,
      packagePath: 'apps/web',
      phase: 3,
      source: 'state-file',
      stateFilePath: `${ROOT}/.spec_system/state.json`,
    },
    generatedAt: '2026-04-22T00:00:00.000Z',
    health: {
      agentRuntime: {
        authPath: `${ROOT}/data/openai-account-auth.json`,
        message: 'Agent runtime ready.',
        promptState: 'ready',
        status: 'ready',
      },
      message: 'Bootstrap diagnostics are ready.',
      missing: {
        onboarding: 0,
        optional: 0,
        runtime: 0,
      },
      ok: true,
      operationalStore: {
        message: 'Operational store ready.',
        status: 'ready',
      },
      service: 'jobhunt-api-scaffold',
      sessionId: 'phase01-session03-agent-runtime-bootstrap',
      startupStatus: 'ready',
      status: 'ok',
    },
    message: 'Bootstrap diagnostics are ready.',
    ok: true,
    service: 'jobhunt-api-scaffold',
    sessionId: 'phase01-session03-agent-runtime-bootstrap',
    status: 'ready',
  };
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function startFakeApiServer() {
  const sockets = new Set();
  const state = {
    approvals: new Map([
      [
        'approval-email',
        createApprovalRecord({
          action: 'approve-email',
          approvalId: 'approval-email',
          details: {
            channel: 'email',
            recipient: 'recruiter@example.com',
          },
          jobId: 'job-live',
          requestedAt: '2026-04-22T00:01:00.000Z',
          sessionId: 'session-live',
          status: 'pending',
          title: 'Review application email',
          traceId: 'trace-email',
        }),
      ],
      [
        'approval-pdf',
        createApprovalRecord({
          action: 'approve-pdf',
          approvalId: 'approval-pdf',
          details: {
            artifact: 'pdf',
            note: 'Tailored ATS export',
          },
          jobId: 'job-pdf',
          requestedAt: '2026-04-22T00:02:00.000Z',
          sessionId: 'session-pdf',
          status: 'pending',
          title: 'Publish tailored PDF',
          traceId: 'trace-pdf',
        }),
      ],
      [
        'approval-stale',
        createApprovalRecord({
          action: 'approve-stale',
          approvalId: 'approval-stale',
          details: {
            label: 'stale review',
          },
          jobId: 'job-stale',
          requestedAt: '2026-04-22T00:03:00.000Z',
          sessionId: 'session-stale',
          status: 'pending',
          title: 'Review stale approval',
          traceId: 'trace-stale',
        }),
      ],
    ]),
    failures: new Map(),
    mode: 'ready',
    sessions: new Map([
      [
        'session-live',
        createSessionRecord({
          activeJobId: 'job-live',
          sessionId: 'session-live',
          status: 'waiting',
          updatedAt: '2026-04-22T00:01:00.000Z',
          workflow: 'single-evaluation',
        }),
      ],
      [
        'session-pdf',
        createSessionRecord({
          activeJobId: 'job-pdf',
          sessionId: 'session-pdf',
          status: 'waiting',
          updatedAt: '2026-04-22T00:02:00.000Z',
          workflow: 'single-evaluation',
        }),
      ],
      [
        'session-stale',
        createSessionRecord({
          activeJobId: 'job-stale',
          sessionId: 'session-stale',
          status: 'waiting',
          updatedAt: '2026-04-22T00:03:00.000Z',
          workflow: 'single-evaluation',
        }),
      ],
    ]),
    summaryDelayMs: 0,
    timelines: new Map([
      [
        'session-live',
        [
          createTimelineItem({
            approvalId: 'approval-email',
            eventId: 'event-email-requested',
            eventType: 'approval-requested',
            jobId: 'job-live',
            level: 'info',
            occurredAt: '2026-04-22T00:01:00.000Z',
            requestId: 'request-email',
            sessionId: 'session-live',
            summary: 'Approval requested for Review application email.',
            traceId: 'trace-email',
          }),
          createTimelineItem({
            approvalId: 'approval-email',
            eventId: 'event-email-waiting',
            eventType: 'job-waiting-approval',
            jobId: 'job-live',
            level: 'info',
            occurredAt: '2026-04-22T00:01:10.000Z',
            requestId: 'request-email',
            sessionId: 'session-live',
            summary: 'Review application email is waiting for approval.',
            traceId: 'trace-email',
          }),
        ],
      ],
      [
        'session-pdf',
        [
          createTimelineItem({
            approvalId: 'approval-pdf',
            eventId: 'event-pdf-requested',
            eventType: 'approval-requested',
            jobId: 'job-pdf',
            level: 'info',
            occurredAt: '2026-04-22T00:02:00.000Z',
            requestId: 'request-pdf',
            sessionId: 'session-pdf',
            summary: 'Approval requested for Publish tailored PDF.',
            traceId: 'trace-pdf',
          }),
        ],
      ],
      [
        'session-stale',
        [
          createTimelineItem({
            approvalId: 'approval-stale',
            eventId: 'event-stale-requested',
            eventType: 'approval-requested',
            jobId: 'job-stale',
            level: 'info',
            occurredAt: '2026-04-22T00:03:00.000Z',
            requestId: 'request-stale',
            sessionId: 'session-stale',
            summary: 'Approval requested for Review stale approval.',
            traceId: 'trace-stale',
          }),
        ],
      ],
    ]),
    jobs: new Map([
      [
        'job-live',
        createJobRecord({
          jobId: 'job-live',
          startedAt: '2026-04-22T00:01:00.000Z',
          status: 'waiting',
          updatedAt: '2026-04-22T00:01:10.000Z',
          waitReason: 'approval',
        }),
      ],
      [
        'job-pdf',
        createJobRecord({
          jobId: 'job-pdf',
          startedAt: '2026-04-22T00:02:00.000Z',
          status: 'waiting',
          updatedAt: '2026-04-22T00:02:10.000Z',
          waitReason: 'approval',
        }),
      ],
      [
        'job-stale',
        createJobRecord({
          jobId: 'job-stale',
          startedAt: '2026-04-22T00:03:00.000Z',
          status: 'waiting',
          updatedAt: '2026-04-22T00:03:10.000Z',
          waitReason: 'approval',
        }),
      ],
    ]),
  };

  function updateApprovalState(approvalId, status) {
    const approval = state.approvals.get(approvalId);

    if (!approval) {
      return null;
    }

    const session = state.sessions.get(approval.sessionId);
    const job = approval.jobId ? state.jobs.get(approval.jobId) : null;
    const resolvedAt = '2026-04-22T00:10:00.000Z';

    approval.status = status;
    approval.resolvedAt = resolvedAt;
    approval.response = {
      decision: status,
      metadata: null,
      reason: null,
    };

    if (session) {
      session.updatedAt = resolvedAt;
      session.status = status === 'approved' ? 'pending' : 'failed';
      session.lastHeartbeatAt = resolvedAt;
    }

    if (job) {
      job.updatedAt = resolvedAt;
      job.status = status === 'approved' ? 'queued' : 'failed';
      job.waitReason = null;
      job.completedAt = status === 'rejected' ? resolvedAt : null;
    }

    const timeline = state.timelines.get(approval.sessionId) ?? [];
    timeline.unshift(
      createTimelineItem({
        approvalId,
        eventId: `event-${approvalId}-${status}`,
        eventType: status === 'approved' ? 'approval-approved' : 'approval-rejected',
        jobId: approval.jobId,
        level: status === 'approved' ? 'info' : 'warn',
        occurredAt: resolvedAt,
        requestId: null,
        sessionId: approval.sessionId,
        summary:
          status === 'approved'
            ? `Approval ${approval.approvalId} approved.`
            : `Approval ${approval.approvalId} rejected.`,
        traceId: approval.traceId,
      }),
    );

    state.timelines.set(approval.sessionId, timeline);

    if (status === 'rejected') {
      state.failures.set(
        approval.sessionId,
        createFailureRecord({
          failedAt: resolvedAt,
          jobId: approval.jobId,
          message: `${approval.title} was rejected and the run stopped.`,
          sessionId: approval.sessionId,
          traceId: approval.traceId,
        }),
      );
    }

    return {
      approval,
      job,
    };
  }

  const server = createHttpServer(async (request, response) => {
    if (request.url === '/startup') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(createReadyStartupPayload(), null, 2));
      return;
    }

    if (request.url === '/operator-shell') {
      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(buildShellSummary(state), null, 2));
      return;
    }

    if ((request.url ?? '').startsWith('/approval-inbox')) {
      if (state.summaryDelayMs > 0) {
        await delay(state.summaryDelayMs);
      }

      if (state.mode === 'invalid-payload') {
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(JSON.stringify({ ok: true, message: 'broken' }, null, 2));
        return;
      }

      const url = new URL(request.url, 'http://127.0.0.1');

      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(buildApprovalInboxPayload(state, url), null, 2));
      return;
    }

    if (request.url === '/approval-resolution' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const approval = state.approvals.get(body.approvalId) ?? null;

      if (!approval) {
        response.writeHead(404, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(
          JSON.stringify(
            createErrorPayload(
              'approval-not-found',
              `Runtime approval does not exist: ${body.approvalId}`,
              'not-found',
            ),
            null,
            2,
          ),
        );
        return;
      }

      if (approval.status !== 'pending') {
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(
          JSON.stringify(
            toResolutionPayload(
              approval,
              approval.jobId ? state.jobs.get(approval.jobId) ?? null : null,
              approval.status === 'approved'
                ? 'already-approved'
                : 'already-rejected',
              approval.status === 'approved'
                ? 'Approval was already approved before this request.'
                : 'Approval was already rejected before this request.',
            ),
            null,
            2,
          ),
        );
        return;
      }

      const updated = updateApprovalState(body.approvalId, body.decision);

      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(
        JSON.stringify(
          toResolutionPayload(
            updated.approval,
            updated.job,
            body.decision,
            body.decision === 'approved'
              ? 'Approval resolved as approved.'
              : 'Approval resolved as rejected.',
          ),
          null,
          2,
        ),
      );
      return;
    }

    if (request.url === '/orchestration' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const session = state.sessions.get(body.sessionId) ?? null;

      if (!session) {
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
        });
        response.end(
          JSON.stringify(
            createCommandPayload(body.sessionId, `Runtime session does not exist: ${body.sessionId}.`, 'failed'),
            null,
            2,
          ),
        );
        return;
      }

      session.status = 'running';
      session.updatedAt = '2026-04-22T00:20:00.000Z';
      session.lastHeartbeatAt = '2026-04-22T00:20:00.000Z';
      const job = session.activeJobId ? state.jobs.get(session.activeJobId) ?? null : null;

      if (job) {
        job.status = 'running';
        job.updatedAt = '2026-04-22T00:20:00.000Z';
        job.waitReason = null;
      }

      state.failures.delete(session.sessionId);
      const timeline = state.timelines.get(session.sessionId) ?? [];
      timeline.unshift(
        createTimelineItem({
          approvalId: null,
          eventId: `event-resume-${session.sessionId}`,
          eventType: 'tool-execution-started',
          jobId: job?.jobId ?? null,
          level: 'info',
          occurredAt: '2026-04-22T00:20:00.000Z',
          requestId: null,
          sessionId: session.sessionId,
          summary: 'Run handoff is active.',
          traceId: null,
        }),
      );
      state.timelines.set(session.sessionId, timeline);

      response.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(
        JSON.stringify(
          createCommandPayload(session.sessionId, 'Run handoff is active.', 'running'),
          null,
          2,
        ),
      );
      return;
    }

    response.writeHead(404, {
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(
      JSON.stringify(
        createErrorPayload(
          'route-not-found',
          `Unknown route ${request.url ?? '/'}.`,
          'not-found',
        ),
        null,
        2,
      ),
    );
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  await new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();

  if (typeof address !== 'object' || address === null) {
    throw new Error('Failed to start the fake approval-inbox API.');
  }

  return {
    close: () =>
      new Promise((resolvePromise, reject) => {
        server.close((error) => {
          if (typeof server.closeIdleConnections === 'function') {
            server.closeIdleConnections();
          }
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }

          for (const socket of sockets) {
            socket.destroy();
          }

          if (error) {
            reject(error);
            return;
          }

          resolvePromise();
        });
      }),
    resolveExternally(approvalId, status) {
      updateApprovalState(approvalId, status);
    },
    setMode(mode) {
      state.mode = mode;
    },
    setSummaryDelayMs(delayMs) {
      state.summaryDelayMs = delayMs;
    },
    state,
    url: `http://127.0.0.1:${address.port}`,
  };
}

const fakeApi = await startFakeApiServer();
const webPort = await getFreePort();
const webUrl = `http://127.0.0.1:${webPort}`;
const stderrLog = [];
const webChild = spawn(
  'node',
  [
    join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    String(webPort),
  ],
  {
    cwd: join(ROOT, 'apps', 'web'),
    env: {
      ...process.env,
      JOBHUNT_API_ORIGIN: fakeApi.url,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  },
);

webChild.stderr.setEncoding('utf-8');
webChild.stderr.on('data', (chunk) => {
  stderrLog.push(chunk);
});

try {
  await waitForHttpOk(webUrl, webChild, stderrLog);

  const browser = await chromium.launch({ headless: true });

  try {
    fakeApi.setSummaryDelayMs(800);
    const page = await browser.newPage();
    await page.goto(`${webUrl}#approvals`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('heading', { name: 'Job-Hunt control surface' }).waitFor();
    await page.getByRole('heading', { name: 'Loading approval queue' }).waitFor();
    await page.getByRole('heading', { name: 'Loading approval context' }).waitFor();

    fakeApi.setSummaryDelayMs(0);
    await page.waitForLoadState('networkidle');

    await page.getByRole('heading', { name: '3 pending approvals' }).waitFor();
    await page
      .locator('#approval-context-title')
      .filter({ hasText: 'Review application email' })
      .waitFor();

    await clickEnabledButton(page, 'Review approval Publish tailored PDF');
    await page
      .locator('#approval-context-title')
      .filter({ hasText: 'Publish tailored PDF' })
      .waitFor();

    await clickEnabledButton(page, 'Approve Publish tailored PDF');
    await page.getByText('Approval resolved as approved.').first().waitFor();
    await page
      .getByText('Publish tailored PDF has already been approved.')
      .first()
      .waitFor();

    await clickEnabledButton(page, 'Review approval Review stale approval');
    await page
      .locator('#approval-context-title')
      .filter({ hasText: 'Review stale approval' })
      .waitFor();
    await page
      .locator('button[aria-label="Approve Review stale approval"]:not([disabled])')
      .waitFor();
    fakeApi.resolveExternally('approval-stale', 'approved');
    await clickEnabledButton(page, 'Approve Review stale approval');
    await page
      .getByText('Approval was already approved before this request.')
      .first()
      .waitFor();

    await clickEnabledButton(page, 'Review approval Review application email');
    await page
      .locator('#approval-context-title')
      .filter({ hasText: 'Review application email' })
      .waitFor();
    await clickEnabledButton(page, 'Reject Review application email');
    await page.getByText('Approval resolved as rejected.').first().waitFor();
    await page.getByText('resume-ready').first().waitFor();

    await clickEnabledButton(page, 'Resume session session-live');
    await page.getByText('Run handoff is active.').first().waitFor();
    await page.getByRole('heading', { name: 'No pending approvals' }).waitFor();

    fakeApi.setMode('invalid-payload');
    const errorPage = await browser.newPage();
    await errorPage.goto(`${webUrl}#approvals`, { waitUntil: 'networkidle' });
    await errorPage
      .getByRole('heading', { name: 'Approval queue unavailable' })
      .waitFor();
    await errorPage
      .getByRole('heading', { name: 'Approval context unavailable' })
      .waitFor();
    await errorPage.close();
    fakeApi.setMode('ready');

    const offlinePage = await browser.newPage();
    await offlinePage.route('**/api/approval-inbox*', async (route) => {
      await route.abort('failed');
    });
    await offlinePage.goto(`${webUrl}#approvals`, { waitUntil: 'networkidle' });
    await offlinePage
      .getByRole('heading', { name: 'Approval queue offline' })
      .waitFor();
    await offlinePage
      .getByRole('heading', { name: 'Approval context offline' })
      .waitFor();
    await offlinePage.close();

    await page.close();
  } finally {
    await browser.close();
  }
} finally {
  await stopChild(webChild);
  await fakeApi.close();
}

console.log('App approval inbox smoke checks passed.');

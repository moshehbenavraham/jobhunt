import { randomUUID } from 'node:crypto';
import type {
  OperationalStore,
  RuntimeApprovalRecord,
  RuntimeJobRecord,
  RuntimeSessionRecord,
} from '../store/index.js';
import { WORKFLOW_INTENTS, type WorkflowIntent } from '../prompt/index.js';
import type { JsonValue } from '../workspace/index.js';
import {
  OrchestrationError,
  SPECIALIST_IDS,
  type SpecialistId,
  type OrchestrationApprovalSummary,
  type OrchestrationJobSummary,
  type OrchestrationLaunchRequest,
  type OrchestrationSessionSummary,
  type WorkflowRouteDecision,
} from './orchestration-contract.js';

export type SessionActivitySummary = {
  job: OrchestrationJobSummary | null;
  pendingApproval: OrchestrationApprovalSummary | null;
};

export type SessionLifecycle = {
  ensureSession: (input: {
    request: OrchestrationLaunchRequest | { kind: 'resume'; sessionId: string };
    route: WorkflowRouteDecision;
  }) => Promise<OrchestrationSessionSummary | null>;
  markSessionFailed: (input: {
    code: string;
    message: string;
    sessionId: string;
  }) => Promise<OrchestrationSessionSummary | null>;
  summarizeActivity: (sessionId: string) => Promise<SessionActivitySummary>;
};

type SessionLifecycleOptions = {
  getStore: () => Promise<OperationalStore>;
  now?: () => number;
};

function toIsoTimestamp(now: number): string {
  return new Date(now).toISOString();
}

function isWorkflowIntent(candidate: unknown): candidate is WorkflowIntent {
  return (
    typeof candidate === 'string' &&
    (WORKFLOW_INTENTS as readonly string[]).includes(candidate)
  );
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSpecialistId(candidate: unknown): candidate is SpecialistId {
  return (
    typeof candidate === 'string' &&
    (SPECIALIST_IDS as readonly string[]).includes(candidate)
  );
}

function mergeJsonObjects(
  currentValue: JsonValue,
  nextValue: JsonValue,
): JsonValue {
  if (!isJsonObject(currentValue) || !isJsonObject(nextValue)) {
    return nextValue;
  }

  return {
    ...currentValue,
    ...nextValue,
  };
}

function buildSessionContext(input: {
  existingContext: JsonValue;
  requestContext: JsonValue | null;
  route: WorkflowRouteDecision;
  timestamp: string;
}): JsonValue {
  const orchestrationContext = {
    lastRouteStatus: input.route.status,
    lastRoutedAt: input.timestamp,
    missingCapabilities: [...input.route.missingCapabilities],
    requestKind: input.route.requestKind,
    specialistId: input.route.specialistId,
    workflow: input.route.workflow,
  } satisfies Record<string, JsonValue>;
  const baseContext = isJsonObject(input.existingContext)
    ? input.existingContext
    : {};
  const withRequestContext =
    input.requestContext === null
      ? baseContext
      : mergeJsonObjects(baseContext, input.requestContext);

  return mergeJsonObjects(withRequestContext, {
    orchestration: mergeJsonObjects(
      isJsonObject(withRequestContext) &&
        'orchestration' in withRequestContext &&
        withRequestContext.orchestration !== undefined
        ? (withRequestContext.orchestration as JsonValue)
        : {},
      orchestrationContext,
    ),
  });
}

function toSessionSummary(
  session: RuntimeSessionRecord,
  workflow: WorkflowIntent,
  reused: boolean,
): OrchestrationSessionSummary {
  return {
    activeJobId: session.activeJobId,
    createdAt: session.createdAt,
    reused,
    runnerId: session.runnerId,
    sessionId: session.sessionId,
    status: session.status,
    updatedAt: session.updatedAt,
    workflow,
  };
}

function toJobSummary(job: RuntimeJobRecord): OrchestrationJobSummary {
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

function extractApprovalField(
  approval: RuntimeApprovalRecord,
  key: 'action' | 'title',
): string {
  if (
    typeof approval.request === 'object' &&
    approval.request !== null &&
    !Array.isArray(approval.request) &&
    key in approval.request
  ) {
    const candidate = approval.request[key];

    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  return '';
}

function toApprovalSummary(
  approval: RuntimeApprovalRecord,
): OrchestrationApprovalSummary {
  return {
    action: extractApprovalField(approval, 'action'),
    approvalId: approval.approvalId,
    jobId: approval.jobId,
    requestedAt: approval.requestedAt,
    title: extractApprovalField(approval, 'title'),
    traceId: approval.traceId,
  };
}

function extractStoredSpecialistId(context: JsonValue): SpecialistId | null {
  if (
    !isJsonObject(context) ||
    !('orchestration' in context) ||
    !isJsonObject(context.orchestration)
  ) {
    return null;
  }

  const specialistId = context.orchestration.specialistId;
  return isSpecialistId(specialistId) ? specialistId : null;
}

function selectJobSummary(
  jobs: RuntimeJobRecord[],
): OrchestrationJobSummary | null {
  if (jobs.length === 0) {
    return null;
  }

  const priority = new Map<string, number>([
    ['running', 0],
    ['waiting', 1],
    ['pending', 2],
    ['queued', 3],
    ['completed', 4],
    ['failed', 5],
    ['cancelled', 6],
  ]);
  const [job] = [...jobs].sort((left, right) => {
    const leftPriority = priority.get(left.status) ?? 99;
    const rightPriority = priority.get(right.status) ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });

  return job ? toJobSummary(job) : null;
}

export function createSessionLifecycle(
  options: SessionLifecycleOptions,
): SessionLifecycle {
  const now = options.now ?? Date.now;

  return {
    async ensureSession(input): Promise<OrchestrationSessionSummary | null> {
      if (
        !input.route.workflow ||
        (!input.route.sessionId && input.request.kind === 'resume')
      ) {
        return null;
      }

      const store = await options.getStore();
      const timestamp = toIsoTimestamp(now());

      if (input.request.kind === 'resume') {
        const existingSession = await store.sessions.getById(input.request.sessionId);

        if (!existingSession) {
          return null;
        }

        const updatedSession = await store.sessions.save({
          ...existingSession,
          context: buildSessionContext({
            existingContext: existingSession.context,
            requestContext: null,
            route: input.route,
            timestamp,
          }),
          updatedAt: timestamp,
        });

        return toSessionSummary(updatedSession, input.route.workflow, true);
      }

      const sessionId = input.request.sessionId ?? randomUUID();
      const existingSession = await store.sessions.getById(sessionId);

      if (existingSession && existingSession.workflow !== input.route.workflow) {
        throw new OrchestrationError(
          'orchestration-invalid-request',
          `Session ${sessionId} already exists for workflow ${existingSession.workflow}.`,
          {
            detail: {
              existingWorkflow: existingSession.workflow,
              requestedWorkflow: input.route.workflow,
              sessionId,
            },
          },
        );
      }

      const savedSession = await store.sessions.save({
        activeJobId: existingSession?.activeJobId ?? null,
        context: buildSessionContext({
          existingContext: existingSession?.context ?? {},
          requestContext: input.request.context,
          route: {
            ...input.route,
            sessionId,
          },
          timestamp,
        }),
        createdAt: existingSession?.createdAt ?? timestamp,
        lastHeartbeatAt: existingSession?.lastHeartbeatAt ?? null,
        runnerId: existingSession?.runnerId ?? null,
        sessionId,
        status: existingSession?.status ?? 'pending',
        updatedAt: timestamp,
        workflow: input.route.workflow,
      });

      return toSessionSummary(
        savedSession,
        input.route.workflow,
        existingSession !== null,
      );
    },
    async markSessionFailed(input): Promise<OrchestrationSessionSummary | null> {
      const store = await options.getStore();
      const timestamp = toIsoTimestamp(now());
      const existingSession = await store.sessions.getById(input.sessionId);

      if (!existingSession) {
        return null;
      }

      if (!isWorkflowIntent(existingSession.workflow)) {
        throw new OrchestrationError(
          'orchestration-invalid-request',
          `Session ${existingSession.sessionId} stores unsupported workflow ${existingSession.workflow}.`,
          {
            detail: {
              sessionId: existingSession.sessionId,
              workflow: existingSession.workflow,
            },
          },
        );
      }

      const failedSession = await store.sessions.save({
        ...existingSession,
        activeJobId: null,
        context: buildSessionContext({
          existingContext: existingSession.context,
          requestContext: {
            orchestrationFailure: {
              code: input.code,
              failedAt: timestamp,
              message: input.message,
            },
          },
          route: {
            message: input.message,
            missingCapabilities: [],
            requestKind: 'resume',
            sessionId: existingSession.sessionId,
            specialistId: extractStoredSpecialistId(existingSession.context),
            status: 'tooling-gap',
            workflow: existingSession.workflow,
          },
          timestamp,
        }),
        runnerId: null,
        status: 'failed',
        updatedAt: timestamp,
      });

      return toSessionSummary(failedSession, existingSession.workflow, true);
    },
    async summarizeActivity(
      sessionId: string,
    ): Promise<SessionActivitySummary> {
      const store = await options.getStore();
      const [approvals, jobs] = await Promise.all([
        store.approvals.listBySessionId(sessionId),
        store.jobs.listBySessionId(sessionId),
      ]);
      const pendingApproval = approvals
        .filter((approval) => approval.status === 'pending')
        .sort((left, right) =>
          left.requestedAt.localeCompare(right.requestedAt),
        )[0];

      return {
        job: selectJobSummary(jobs),
        pendingApproval: pendingApproval
          ? toApprovalSummary(pendingApproval)
          : null,
      };
    },
  };
}

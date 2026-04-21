import { ZodError } from 'zod';
import type { OperationalStore } from '../store/index.js';
import { WORKFLOW_INTENTS, type WorkflowIntent } from '../prompt/index.js';
import {
  OrchestrationError,
  orchestrationRequestSchema,
  type OrchestrationRequest,
  type WorkflowRouteDecision,
} from './orchestration-contract.js';
import { getWorkflowSpecialistRoute } from './specialist-catalog.js';

export type WorkflowRouter = {
  route: (input: unknown) => Promise<WorkflowRouteDecision>;
};

type WorkflowRouterOptions = {
  getStore: () => Promise<OperationalStore>;
};

function isWorkflowIntent(candidate: unknown): candidate is WorkflowIntent {
  return (
    typeof candidate === 'string' &&
    (WORKFLOW_INTENTS as readonly string[]).includes(candidate)
  );
}

function toValidationDetail(error: ZodError): {
  issues: {
    code: string;
    message: string;
    path: string[];
  }[];
} {
  return {
    issues: error.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      path: issue.path.map((segment) => String(segment)),
    })),
  };
}

function toUnsupportedWorkflowRoute(input: {
  requestKind: OrchestrationRequest['kind'];
  sessionId: string | null;
  workflowCandidate: unknown;
}): WorkflowRouteDecision {
  return {
    message:
      typeof input.workflowCandidate === 'string'
        ? `Unsupported workflow "${input.workflowCandidate}".`
        : 'Unsupported workflow requested.',
    missingCapabilities: [],
    requestKind: input.requestKind,
    sessionId: input.sessionId,
    specialistId: null,
    status: 'unsupported-workflow',
    workflow: null,
  };
}

function toRouteDecision(input: {
  request: OrchestrationRequest;
  sessionId: string | null;
  workflow: WorkflowIntent;
}): WorkflowRouteDecision {
  const route = getWorkflowSpecialistRoute(input.workflow);

  if (!route) {
    return {
      message: `Workflow ${input.workflow} is not routed to a specialist yet.`,
      missingCapabilities: [],
      requestKind: input.request.kind,
      sessionId: input.sessionId,
      specialistId: null,
      status: 'unsupported-workflow',
      workflow: null,
    };
  }

  return {
    message: route.message,
    missingCapabilities: [...route.missingCapabilities],
    requestKind: input.request.kind,
    sessionId: input.sessionId,
    specialistId: route.specialistId,
    status: route.status,
    workflow: input.workflow,
  };
}

export function createWorkflowRouter(
  options: WorkflowRouterOptions,
): WorkflowRouter {
  return {
    async route(input: unknown): Promise<WorkflowRouteDecision> {
      const parsed = orchestrationRequestSchema.safeParse(input);

      if (!parsed.success) {
        if (
          typeof input === 'object' &&
          input !== null &&
          'kind' in input &&
          input.kind === 'launch' &&
          'workflow' in input
        ) {
          const sessionId =
            'sessionId' in input && typeof input.sessionId === 'string'
              ? input.sessionId
              : null;

          return toUnsupportedWorkflowRoute({
            requestKind: 'launch',
            sessionId,
            workflowCandidate: input.workflow,
          });
        }

        throw new OrchestrationError(
          'orchestration-invalid-request',
          'Orchestration request failed schema validation.',
          {
            detail: toValidationDetail(parsed.error),
          },
        );
      }

      const request = parsed.data;

      if (request.kind === 'launch') {
        if (!isWorkflowIntent(request.workflow)) {
          return toUnsupportedWorkflowRoute({
            requestKind: request.kind,
            sessionId: request.sessionId,
            workflowCandidate: request.workflow,
          });
        }

        return toRouteDecision({
          request,
          sessionId: request.sessionId,
          workflow: request.workflow,
        });
      }

      const store = await options.getStore();
      const session = await store.sessions.getById(request.sessionId);

      if (!session) {
        return {
          message: `Runtime session does not exist: ${request.sessionId}.`,
          missingCapabilities: [],
          requestKind: request.kind,
          sessionId: request.sessionId,
          specialistId: null,
          status: 'session-not-found',
          workflow: null,
        };
      }

      if (!isWorkflowIntent(session.workflow)) {
        return toUnsupportedWorkflowRoute({
          requestKind: request.kind,
          sessionId: request.sessionId,
          workflowCandidate: session.workflow,
        });
      }

      return toRouteDecision({
        request,
        sessionId: request.sessionId,
        workflow: session.workflow,
      });
    },
  };
}

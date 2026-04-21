import type { CSSProperties } from 'react';
import type { ChatConsoleClientError } from './chat-console-client';
import type {
  ChatConsoleCommandHandoff,
  ChatConsoleSessionDetail,
  ChatConsoleWorkflowOption,
} from './chat-console-types';
import type { ChatConsoleViewStatus } from './use-chat-console';

type RunStatusPanelProps = {
  command: ChatConsoleCommandHandoff | null;
  error: ChatConsoleClientError | null;
  onOpenApprovals: (focus: { approvalId: string | null; sessionId: string | null }) => void;
  selectedSession: ChatConsoleSessionDetail | null;
  selectedWorkflow: ChatConsoleWorkflowOption | null;
  startupMessage: string;
  status: ChatConsoleViewStatus;
};

const panelStyle: CSSProperties = {
  background:
    'linear-gradient(150deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.94) 50%, rgba(12, 74, 110, 0.88) 100%)',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  borderRadius: '1.4rem',
  color: '#f8fafc',
  display: 'grid',
  gap: '0.95rem',
  padding: '1.05rem 1.1rem',
};

const buttonStyle: CSSProperties = {
  background: '#f8fafc',
  border: 0,
  borderRadius: '999px',
  color: '#0f172a',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 700,
  minHeight: '2.5rem',
  padding: '0.65rem 0.95rem',
};

function getTone(state: string): {
  background: string;
  border: string;
  label: string;
} {
  switch (state) {
    case 'ready':
      return {
        background: '#bbf7d0',
        border: '#22c55e',
        label: 'Ready',
      };
    case 'running':
      return {
        background: '#bfdbfe',
        border: '#60a5fa',
        label: 'Running',
      };
    case 'waiting-for-approval':
      return {
        background: '#fde68a',
        border: '#f59e0b',
        label: 'Waiting for approval',
      };
    case 'tooling-gap':
      return {
        background: '#ddd6fe',
        border: '#8b5cf6',
        label: 'Tooling gap',
      };
    case 'auth-required':
      return {
        background: '#bae6fd',
        border: '#38bdf8',
        label: 'Auth required',
      };
    default:
      return {
        background: '#fecaca',
        border: '#ef4444',
        label: 'Failed',
      };
  }
}

function resolveDisplay(input: {
  command: ChatConsoleCommandHandoff | null;
  selectedSession: ChatConsoleSessionDetail | null;
  selectedWorkflow: ChatConsoleWorkflowOption | null;
  startupMessage: string;
  status: ChatConsoleViewStatus;
}): {
  details: string[];
  message: string;
  state:
    | 'auth-required'
    | 'failed'
    | 'ready'
    | 'running'
    | 'tooling-gap'
    | 'waiting-for-approval';
  title: string;
} {
  if (input.command) {
    return {
      details: [
        input.command.route.workflow ?? 'No workflow',
        input.command.specialist?.label ?? 'No specialist handoff',
      ],
      message: input.command.message,
      state: input.command.state,
      title: 'Latest launch or resume outcome',
    };
  }

  if (input.selectedSession) {
    return {
      details: [
        input.selectedSession.session.sessionId,
        input.selectedSession.session.workflow,
      ],
      message:
        input.selectedSession.failure?.message ??
        input.selectedSession.route.message,
      state: input.selectedSession.session.state,
      title: 'Selected session state',
    };
  }

  if (
    input.status === 'auth-required' ||
    input.status === 'expired-auth' ||
    input.status === 'invalid-auth' ||
    input.status === 'prompt-failure'
  ) {
    return {
      details: ['Agent runtime', 'Startup gate'],
      message: input.startupMessage,
      state: 'auth-required',
      title: 'Runtime readiness required',
    };
  }

  if (
    input.status === 'missing-prerequisites' ||
    input.status === 'runtime-error' ||
    input.status === 'error' ||
    input.status === 'offline'
  ) {
    return {
      details: ['Console health', 'Startup gate'],
      message: input.startupMessage,
      state: 'failed',
      title: 'Console launch is blocked',
    };
  }

  if (input.selectedWorkflow?.status === 'tooling-gap') {
    return {
      details: [
        input.selectedWorkflow.label,
        input.selectedWorkflow.specialist?.label ?? 'No specialist available',
      ],
      message: input.selectedWorkflow.message,
      state: 'tooling-gap',
      title: 'Selected workflow is blocked',
    };
  }

  return {
    details: [
      input.selectedWorkflow?.label ?? 'Workflow pending',
      input.selectedWorkflow?.specialist?.label ?? 'Backend-owned routing',
    ],
    message:
      input.selectedWorkflow?.message ??
      'Launch a workflow or select a recent session to inspect run state.',
    state: 'ready',
    title: 'Console is ready',
  };
}

export function RunStatusPanel({
  command,
  error,
  onOpenApprovals,
  selectedSession,
  selectedWorkflow,
  startupMessage,
  status,
}: RunStatusPanelProps) {
  const display = resolveDisplay({
    command,
    selectedSession,
    selectedWorkflow,
    startupMessage,
    status,
  });
  const tone = getTone(display.state);
  const focus = command?.pendingApproval
    ? {
        approvalId: command.pendingApproval.approvalId,
        sessionId:
          command.selectedSession?.session.sessionId ??
          command.session?.sessionId ??
          null,
      }
    : selectedSession?.session.pendingApproval
      ? {
          approvalId: selectedSession.session.pendingApproval.approvalId,
          sessionId: selectedSession.session.sessionId,
        }
      : display.state === 'waiting-for-approval' ||
          (display.state === 'failed' &&
            (command?.session?.sessionId ?? selectedSession?.session.sessionId))
        ? {
            approvalId: null,
            sessionId:
              command?.session?.sessionId ?? selectedSession?.session.sessionId ?? null,
          }
        : null;

  return (
    <section aria-live="polite" aria-labelledby="chat-console-status-title" style={panelStyle}>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p
            style={{
              color: '#cbd5e1',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem',
              marginTop: 0,
              textTransform: 'uppercase',
            }}
          >
            Run status
          </p>
          <h2 id="chat-console-status-title" style={{ marginBottom: '0.35rem' }}>
            {display.title}
          </h2>
          <p style={{ color: '#e2e8f0', marginBottom: 0 }}>{display.message}</p>
        </div>
        <span
          style={{
            background: tone.background,
            border: `1px solid ${tone.border}`,
            borderRadius: '999px',
            color: '#0f172a',
            fontSize: '0.88rem',
            fontWeight: 800,
            padding: '0.35rem 0.7rem',
          }}
        >
          {tone.label}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '0.8rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
        }}
      >
        {display.details.map((detail) => (
          <article
            key={detail}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(226, 232, 240, 0.14)',
              borderRadius: '1rem',
              padding: '0.8rem 0.9rem',
            }}
          >
            <p style={{ margin: 0 }}>{detail}</p>
          </article>
        ))}
      </div>

      {error ? (
        <section
          style={{
            background: 'rgba(254, 202, 202, 0.12)',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            borderRadius: '1rem',
            padding: '0.8rem 0.9rem',
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: '0.3rem', marginTop: 0 }}>
            Client message
          </p>
          <p style={{ margin: 0 }}>{error.message}</p>
        </section>
      ) : null}

      {focus ? (
        <button
          aria-label={
            focus.approvalId
              ? 'Open the approval inbox for the selected review'
              : 'Open the approval inbox for the interrupted session'
          }
          onClick={() => onOpenApprovals(focus)}
          style={buttonStyle}
          type="button"
        >
          {focus.approvalId ? 'Open approval review' : 'Open interrupted run'}
        </button>
      ) : null}
    </section>
  );
}

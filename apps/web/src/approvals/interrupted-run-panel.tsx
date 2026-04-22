import type { CSSProperties } from 'react';
import type { ApprovalInboxSelectedDetail } from './approval-inbox-types';
import type {
  ApprovalInboxPendingAction,
  ApprovalInboxViewStatus,
} from './use-approval-inbox';

type InterruptedRunPanelProps = {
  onResume: () => void;
  pendingAction: ApprovalInboxPendingAction;
  selected: ApprovalInboxSelectedDetail | null;
  status: ApprovalInboxViewStatus;
};

const panelStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.4rem',
  display: 'grid',
  gap: '0.9rem',
  padding: '1rem',
};

const buttonStyle: CSSProperties = {
  background: '#0f172a',
  border: 0,
  borderRadius: '999px',
  color: '#f8fafc',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 700,
  minHeight: '2.7rem',
  padding: '0.7rem 1rem',
};

function getTone(state: string): CSSProperties {
  switch (state) {
    case 'resume-ready':
      return {
        background: '#dbeafe',
        color: '#1d4ed8',
      };
    case 'waiting-for-approval':
      return {
        background: '#fef3c7',
        color: '#92400e',
      };
    case 'running':
      return {
        background: '#dcfce7',
        color: '#166534',
      };
    case 'completed':
      return {
        background: '#e2e8f0',
        color: '#334155',
      };
    default:
      return {
        background: '#fee2e2',
        color: '#991b1b',
      };
  }
}

function getEmptyState(status: ApprovalInboxViewStatus): string {
  switch (status) {
    case 'loading':
      return 'Loading interrupted-run state from the API.';
    case 'offline':
      return 'Interrupted-run state cannot refresh while the API is offline.';
    case 'error':
      return 'Interrupted-run state failed to load.';
    default:
      return 'Select an approval to inspect whether the attached session can resume.';
  }
}

export function InterruptedRunPanel({
  onResume,
  pendingAction,
  selected,
  status,
}: InterruptedRunPanelProps) {
  const interruptedRun = selected?.interruptedRun ?? null;
  const isResuming =
    pendingAction?.kind === 'resume' &&
    pendingAction.sessionId === interruptedRun?.sessionId;

  return (
    <section aria-labelledby="approval-resume-title" style={panelStyle}>
      <header>
        <p
          style={{
            color: '#475569',
            letterSpacing: '0.08em',
            marginBottom: '0.35rem',
            marginTop: 0,
            textTransform: 'uppercase',
          }}
        >
          Interrupted run
        </p>
        <h2 id="approval-resume-title" style={{ marginBottom: '0.35rem' }}>
          Resume handoff
        </h2>
        <p style={{ color: '#64748b', marginBottom: 0 }}>
          Resume uses the existing orchestration route instead of a second
          runner path.
        </p>
      </header>

      {!interruptedRun ? (
        <p style={{ margin: 0 }}>{getEmptyState(status)}</p>
      ) : (
        <>
          <section
            style={{
              ...getTone(interruptedRun.state),
              borderRadius: '1rem',
              padding: '0.85rem 0.9rem',
            }}
          >
            <p
              style={{ fontWeight: 700, marginBottom: '0.3rem', marginTop: 0 }}
            >
              {interruptedRun.state}
            </p>
            <p style={{ margin: 0 }}>{interruptedRun.message}</p>
          </section>

          {selected?.failure ? (
            <p style={{ color: '#991b1b', margin: 0 }}>
              Latest failure: {selected.failure.message}
            </p>
          ) : null}

          {interruptedRun.resumeAllowed ? (
            <button
              aria-label={`Resume session ${interruptedRun.sessionId ?? ''}`}
              disabled={pendingAction !== null}
              onClick={onResume}
              style={{
                ...buttonStyle,
                opacity: pendingAction !== null ? 0.7 : 1,
              }}
              type="button"
            >
              {isResuming ? 'Resuming...' : 'Resume from approval inbox'}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

import type { CSSProperties } from 'react';
import type { ApprovalInboxSummaryPayload } from './approval-inbox-types';
import type {
  ApprovalInboxPendingAction,
  ApprovalInboxViewStatus,
} from './use-approval-inbox';

type ApprovalQueueListProps = {
  onSelect: (input: { approvalId: string; sessionId: string }) => void;
  pendingAction: ApprovalInboxPendingAction;
  selectedApprovalId: string | null;
  status: ApprovalInboxViewStatus;
  summary: ApprovalInboxSummaryPayload | null;
};

const panelStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.4rem',
  display: 'grid',
  gap: '0.9rem',
  padding: '1rem',
};

const itemStyle: CSSProperties = {
  background: 'rgba(248, 250, 252, 0.9)',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  borderRadius: '1rem',
  display: 'grid',
  gap: '0.6rem',
  padding: '0.85rem 0.95rem',
};

const buttonStyle: CSSProperties = {
  background: '#0f172a',
  border: 0,
  borderRadius: '999px',
  color: '#f8fafc',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 700,
  minHeight: '2.4rem',
  padding: '0.55rem 0.9rem',
};

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

function getEmptyState(status: ApprovalInboxViewStatus): {
  body: string;
  title: string;
} {
  switch (status) {
    case 'loading':
      return {
        body: 'Reading the pending approval queue from the API.',
        title: 'Loading approval queue',
      };
    case 'offline':
      return {
        body: 'The approval queue cannot refresh while the API is offline.',
        title: 'Approval queue offline',
      };
    case 'error':
      return {
        body: 'The approval queue failed before it could load.',
        title: 'Approval queue unavailable',
      };
    default:
      return {
        body: 'Pending approvals will appear here as workflows pause for review.',
        title: 'No pending approvals',
      };
  }
}

export function ApprovalQueueList({
  onSelect,
  pendingAction,
  selectedApprovalId,
  status,
  summary,
}: ApprovalQueueListProps) {
  if (!summary || summary.queue.length === 0) {
    const emptyState = getEmptyState(status);

    return (
      <section aria-labelledby="approval-queue-title" style={panelStyle}>
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
            Approval queue
          </p>
          <h2 id="approval-queue-title" style={{ marginBottom: '0.35rem' }}>
            {emptyState.title}
          </h2>
          <p style={{ color: '#64748b', marginBottom: 0 }}>{emptyState.body}</p>
        </header>
      </section>
    );
  }

  return (
    <section aria-labelledby="approval-queue-title" style={panelStyle}>
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
          Approval queue
        </p>
        <h2 id="approval-queue-title" style={{ marginBottom: '0.35rem' }}>
          {summary.pendingApprovalCount} pending approvals
        </h2>
        <p style={{ color: '#64748b', marginBottom: 0 }}>
          Queue ordering is backend-owned and stays bounded for deterministic polling.
        </p>
      </header>

      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {summary.queue.map((item) => {
          const isSelected = item.approvalId === selectedApprovalId;
          const isBusy =
            pendingAction !== null &&
            (pendingAction.kind === 'resume' || pendingAction.approvalId === item.approvalId);

          return (
            <article
              key={item.approvalId}
              style={{
                ...itemStyle,
                borderColor: isSelected
                  ? 'rgba(15, 23, 42, 0.48)'
                  : 'rgba(148, 163, 184, 0.22)',
                boxShadow: isSelected
                  ? 'inset 0 0 0 1px rgba(15, 23, 42, 0.18)'
                  : 'none',
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ color: '#64748b', margin: 0 }}>
                    {item.workflow ?? 'Unknown workflow'}
                  </p>
                  <h3 style={{ marginBottom: '0.2rem', marginTop: '0.1rem' }}>
                    {item.title || item.approvalId}
                  </h3>
                </div>
                <span
                  style={{
                    background: '#fef3c7',
                    borderRadius: '999px',
                    color: '#92400e',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                  }}
                >
                  pending
                </span>
              </div>

              <p style={{ color: '#475569', margin: 0 }}>
                Session {item.sessionId}
              </p>
              <p style={{ color: '#64748b', margin: 0 }}>
                Requested {formatTimestamp(item.requestedAt)}
              </p>
              {item.traceId ? (
                <p style={{ color: '#64748b', margin: 0 }}>Trace: {item.traceId}</p>
              ) : null}

              <button
                aria-label={`Review approval ${item.title || item.approvalId}`}
                disabled={isBusy}
                onClick={() =>
                  onSelect({
                    approvalId: item.approvalId,
                    sessionId: item.sessionId,
                  })
                }
                style={{
                  ...buttonStyle,
                  opacity: isBusy ? 0.7 : 1,
                }}
                type="button"
              >
                {isSelected ? 'Reviewing now' : 'Review approval'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

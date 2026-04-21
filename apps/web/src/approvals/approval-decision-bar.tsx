import type { CSSProperties } from 'react';
import type { ApprovalInboxSelectedDetail } from './approval-inbox-types';
import type {
  ApprovalInboxActionNotice,
  ApprovalInboxPendingAction,
} from './use-approval-inbox';

type ApprovalDecisionBarProps = {
  notice: ApprovalInboxActionNotice;
  onResolve: (decision: 'approved' | 'rejected') => void;
  pendingAction: ApprovalInboxPendingAction;
  selected: ApprovalInboxSelectedDetail | null;
};

const panelStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.4rem',
  display: 'grid',
  gap: '0.9rem',
  padding: '1rem',
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.8rem',
};

const buttonStyle: CSSProperties = {
  border: 0,
  borderRadius: '999px',
  color: '#f8fafc',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 700,
  minHeight: '2.7rem',
  padding: '0.7rem 1rem',
};

export function ApprovalDecisionBar({
  notice,
  onResolve,
  pendingAction,
  selected,
}: ApprovalDecisionBarProps) {
  const approval = selected?.approval ?? null;
  const isPendingApproval = approval?.status === 'pending';
  const isApproving =
    pendingAction?.kind === 'approved' &&
    pendingAction.approvalId === approval?.approvalId;
  const isRejecting =
    pendingAction?.kind === 'rejected' &&
    pendingAction.approvalId === approval?.approvalId;

  return (
    <section aria-labelledby="approval-decision-title" style={panelStyle}>
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
          Decision controls
        </p>
        <h2 id="approval-decision-title" style={{ marginBottom: '0.35rem' }}>
          Approve or reject
        </h2>
        <p style={{ color: '#64748b', marginBottom: 0 }}>
          Decisions always route through the canonical approval runtime.
        </p>
      </header>

      {!approval ? (
        <p style={{ margin: 0 }}>
          Select a pending approval to enable decision actions.
        </p>
      ) : !isPendingApproval ? (
        <p style={{ margin: 0 }}>
          This approval is no longer pending, so decision buttons are disabled.
        </p>
      ) : (
        <div style={buttonRowStyle}>
          <button
            aria-label={`Approve ${approval.title || approval.approvalId}`}
            disabled={pendingAction !== null}
            onClick={() => onResolve('approved')}
            style={{
              ...buttonStyle,
              background: '#166534',
              opacity: pendingAction !== null ? 0.7 : 1,
            }}
            type="button"
          >
            {isApproving ? 'Approving...' : 'Approve and continue'}
          </button>
          <button
            aria-label={`Reject ${approval.title || approval.approvalId}`}
            disabled={pendingAction !== null}
            onClick={() => onResolve('rejected')}
            style={{
              ...buttonStyle,
              background: '#991b1b',
              opacity: pendingAction !== null ? 0.7 : 1,
            }}
            type="button"
          >
            {isRejecting ? 'Rejecting...' : 'Reject and stop'}
          </button>
        </div>
      )}

      {notice ? (
        <section
          aria-live="polite"
          style={{
            background:
              notice.kind === 'success'
                ? '#dcfce7'
                : notice.kind === 'warn'
                  ? '#fee2e2'
                  : '#dbeafe',
            borderRadius: '1rem',
            padding: '0.8rem 0.9rem',
          }}
        >
          <p style={{ margin: 0 }}>{notice.message}</p>
        </section>
      ) : null}
    </section>
  );
}

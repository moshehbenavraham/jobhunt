import type { CSSProperties } from 'react';
import type { OperatorShellClientError } from './operator-shell-client';
import type {
  OperatorShellStartupStatus,
  OperatorShellSummaryPayload,
} from './shell-types';
import type { OperatorShellViewStatus } from './use-operator-shell';

type StatusStripProps = {
  error: OperatorShellClientError | null;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onOpenApprovals: (focus: {
    approvalId: string | null;
    sessionId: string | null;
  }) => void;
  onRefresh: () => void;
  status: OperatorShellViewStatus;
  summary: OperatorShellSummaryPayload | null;
};

const stripStyle: CSSProperties = {
  alignItems: 'center',
  background: '#f8f9fb',
  borderTop: 'var(--jh-border-subtle)',
  color: 'var(--jh-color-text-secondary)',
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: 'var(--jh-text-caption-size)',
  gap: '0.45rem 1rem',
  justifyContent: 'space-between',
  minHeight: '2.25rem',
  padding: '0.35rem 1rem',
};

const groupStyle: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem 0.85rem',
};

const buttonStyle: CSSProperties = {
  background: 'transparent',
  border: 0,
  color: 'var(--jh-color-accent)',
  cursor: 'pointer',
  fontSize: 'var(--jh-text-caption-size)',
  fontWeight: 'var(--jh-font-weight-semibold)',
  minHeight: '1.65rem',
  padding: '0 0.2rem',
};

function getStatusLabel(status: OperatorShellStartupStatus): string {
  switch (status) {
    case 'ready':
      return 'Workspace ready';
    case 'missing-prerequisites':
      return 'Setup required';
    case 'runtime-error':
      return 'Runtime blocked';
    case 'auth-required':
      return 'Auth required';
    case 'expired-auth':
      return 'Auth expired';
    case 'invalid-auth':
      return 'Auth invalid';
    case 'prompt-failure':
      return 'Prompt issue';
  }
}

function getFallbackLabel(status: OperatorShellViewStatus): string {
  switch (status) {
    case 'loading':
      return 'Loading local workspace';
    case 'offline':
      return 'Local API offline';
    case 'error':
      return 'Workspace status unavailable';
    default:
      return 'Waiting for workspace status';
  }
}

function formatTime(value: string | null): string {
  if (!value) return 'not refreshed';
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StatusStrip({
  error,
  isRefreshing,
  lastUpdatedAt,
  onOpenApprovals,
  onRefresh,
  status,
  summary,
}: StatusStripProps) {
  const statusLabel = summary
    ? getStatusLabel(summary.status)
    : getFallbackLabel(status);
  const pendingCount = summary?.activity.pendingApprovalCount ?? 0;
  const firstApproval = summary?.activity.latestPendingApprovals[0] ?? null;

  return (
    <section
      aria-label="Workspace status"
      aria-live="polite"
      className="jh-status-strip"
      style={stripStyle}
    >
      <div style={groupStyle}>
        <strong style={{ color: 'var(--jh-color-text-primary)' }}>
          Local workspace
        </strong>
        <span>{statusLabel}</span>
        <span aria-hidden="true">·</span>
        <span>Updated {formatTime(lastUpdatedAt)}</span>
        {error ? (
          <span style={{ color: 'var(--jh-color-status-error-fg)' }}>
            {error.message}
          </span>
        ) : null}
      </div>

      <div style={groupStyle}>
        <strong style={{ color: 'var(--jh-color-text-primary)' }}>
          No send · No submit
        </strong>
        {pendingCount > 0 ? (
          <button
            onClick={() =>
              onOpenApprovals({
                approvalId: firstApproval?.approvalId ?? null,
                sessionId: firstApproval?.sessionId ?? null,
              })
            }
            style={buttonStyle}
            type="button"
          >
            {pendingCount} approval{pendingCount === 1 ? '' : 's'}
          </button>
        ) : (
          <span>No approvals waiting</span>
        )}
        <button
          aria-label="Refresh workspace status"
          disabled={isRefreshing}
          onClick={onRefresh}
          style={{ ...buttonStyle, opacity: isRefreshing ? 0.55 : 1 }}
          type="button"
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </section>
  );
}

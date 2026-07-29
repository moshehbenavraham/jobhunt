import { type CSSProperties, useEffect, useRef } from 'react';
import type {
  OperatorHomeAction,
  OperatorHomeArtifactPreview,
  OperatorHomeApprovalSummary,
  OperatorHomeFailureSummary,
} from './operator-home-types';
import type { OperatorHomeState } from './use-operator-home';

type OperatorHomeSurfaceProps = {
  onRefresh: () => void;
  onRunAction: (action: OperatorHomeAction) => void;
  state: OperatorHomeState;
};

const pageStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--jh-space-8)',
  margin: '0 auto',
  maxWidth: '62rem',
};

const headerStyle: CSSProperties = {
  alignItems: 'end',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--jh-space-4)',
  justifyContent: 'space-between',
};

const sectionStyle: CSSProperties = {
  borderTop: 'var(--jh-border-subtle)',
  display: 'grid',
  gap: 'var(--jh-space-4)',
  paddingTop: 'var(--jh-space-4)',
};

const splitStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--jh-space-6)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
};

const factsStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--jh-space-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))',
  margin: 0,
};

const factStyle: CSSProperties = {
  borderLeft: '1px solid var(--jh-color-stone)',
  margin: 0,
  paddingLeft: 'var(--jh-space-3)',
};

const eyebrowStyle: CSSProperties = {
  color: 'var(--jh-color-accent)',
  fontSize: '0.68rem',
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
};

const metaStyle: CSSProperties = {
  color: 'var(--jh-color-text-muted)',
  fontSize: 'var(--jh-text-caption-size)',
};

const actionRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--jh-space-2)',
};

const primaryButtonStyle: CSSProperties = {
  background: 'var(--jh-color-button-bg)',
  border: '1px solid var(--jh-color-button-bg)',
  borderRadius: 'var(--jh-radius-md)',
  color: 'var(--jh-color-button-fg)',
  cursor: 'pointer',
  fontSize: 'var(--jh-text-body-sm-size)',
  fontWeight: 'var(--jh-font-weight-semibold)',
  padding: '0.55rem 0.8rem',
};

const quietButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: 'transparent',
  borderColor: 'var(--jh-color-stone)',
  color: 'var(--jh-color-text-primary)',
};

const ruledListStyle: CSSProperties = {
  borderTop: 'var(--jh-border-subtle)',
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const ruledItemStyle: CSSProperties = {
  borderBottom: 'var(--jh-border-subtle)',
  display: 'grid',
  gap: '0.2rem',
  padding: '0.75rem 0',
};

function formatTimestamp(value: string | null): string {
  if (!value) return 'Not refreshed yet';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function humanize(value: string): string {
  return value.replaceAll('-', ' ');
}

function ActionRow({
  actions,
  onRunAction,
}: {
  actions: readonly OperatorHomeAction[];
  onRunAction: (action: OperatorHomeAction) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div style={actionRowStyle}>
      {actions.map((action, index) => (
        <button
          key={`${action.id}:${action.label}`}
          onClick={() => onRunAction(action)}
          style={index === 0 ? primaryButtonStyle : quietButtonStyle}
          title={action.description}
          type="button"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={factStyle}>
      <dt style={metaStyle}>{label}</dt>
      <dd style={{ fontWeight: 'var(--jh-font-weight-semibold)', margin: 0 }}>
        {value}
      </dd>
    </div>
  );
}

function AttentionList({
  approvals,
  failures,
}: {
  approvals: readonly OperatorHomeApprovalSummary[];
  failures: readonly OperatorHomeFailureSummary[];
}) {
  const hasItems = approvals.length > 0 || failures.length > 0;

  if (!hasItems) {
    return (
      <p style={{ color: 'var(--jh-color-text-secondary)' }}>
        No approvals or interrupted runs need attention.
      </p>
    );
  }

  return (
    <ul style={ruledListStyle}>
      {approvals.map((approval) => (
        <li key={approval.approvalId} style={ruledItemStyle}>
          <strong>{approval.title || approval.action}</strong>
          <span style={metaStyle}>
            Approval · {approval.sessionId} · {approval.requestedAt}
          </span>
        </li>
      ))}
      {failures.map((failure) => (
        <li key={failure.runId} style={ruledItemStyle}>
          <strong>{failure.message}</strong>
          <span style={metaStyle}>
            Interrupted run · {failure.sessionId} · {failure.failedAt}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ArtifactList({
  items,
}: {
  items: readonly OperatorHomeArtifactPreview[];
}) {
  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--jh-color-text-secondary)' }}>
        No reports or generated artifacts are available yet.
      </p>
    );
  }

  return (
    <ul style={ruledListStyle}>
      {items.map((item) => (
        <li key={item.repoRelativePath} style={ruledItemStyle}>
          <strong>{item.fileName}</strong>
          <span style={metaStyle}>
            {item.kind.toUpperCase()} · {item.repoRelativePath}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FallbackHome({
  onRefresh,
  state,
}: {
  onRefresh: () => void;
  state: OperatorHomeState;
}) {
  const isOffline = state.status === 'offline';
  const title = isOffline ? 'Local API unavailable' : 'Loading today’s queue';
  const message = isOffline
    ? 'Start the local API with `npm run app:api:serve`, then refresh.'
    : (state.error?.message ??
      'Reading readiness, active workflows, approvals, and queue state.');

  return (
    <section style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Today</p>
          <h1 style={{ marginTop: '0.35rem' }}>{title}</h1>
          <p
            style={{
              color: 'var(--jh-color-text-secondary)',
              marginTop: '0.65rem',
            }}
          >
            {message}
          </p>
        </div>
        <button
          disabled={state.isRefreshing}
          onClick={onRefresh}
          style={{
            ...quietButtonStyle,
            opacity: state.isRefreshing ? 0.55 : 1,
          }}
          type="button"
        >
          {state.isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>
    </section>
  );
}

export function OperatorHomeSurface({
  onRefresh,
  onRunAction,
  state,
}: OperatorHomeSurfaceProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (!state.data) {
    return <FallbackHome onRefresh={onRefresh} state={state} />;
  }

  const { cards } = state.data;
  const activeSession = cards.liveWork.activeSession;
  const closeoutPreview = [
    ...cards.closeout.pipeline.preview.map((item) => ({
      key: `pipeline:${item.kind}:${item.url}`,
      meta: `Pipeline · ${item.kind}`,
      title: `${item.company ?? 'Unknown company'} — ${item.role ?? 'Unknown role'}`,
    })),
    ...cards.closeout.tracker.preview.map((item) => ({
      key: `tracker:${item.entryNumber}:${item.reportNumber ?? 'none'}`,
      meta: `Tracker addition · #${item.entryNumber}`,
      title: `${item.company ?? 'Unknown company'} — ${item.role ?? 'Unknown role'}`,
    })),
  ];

  return (
    <section aria-labelledby="operator-home-title" style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Today</p>
          <h1
            id="operator-home-title"
            ref={headingRef}
            style={{ fontSize: '2.35rem', marginTop: '0.35rem' }}
            tabIndex={-1}
          >
            Today’s queue
          </h1>
          <p
            style={{
              color: 'var(--jh-color-text-secondary)',
              marginTop: '0.65rem',
            }}
          >
            {state.data.message}
          </p>
          <p style={{ ...metaStyle, marginTop: '0.35rem' }}>
            {state.data.currentSession.id} · Refreshed{' '}
            {formatTimestamp(state.lastUpdatedAt)}
          </p>
        </div>
        <button
          disabled={state.isRefreshing}
          onClick={onRefresh}
          style={{
            ...quietButtonStyle,
            opacity: state.isRefreshing ? 0.55 : 1,
          }}
          type="button"
        >
          {state.isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section style={sectionStyle}>
        <div>
          <p style={eyebrowStyle}>Attention now</p>
          <h2 style={{ marginTop: '0.3rem' }}>
            {cards.approvals.pendingApprovalCount > 0 ||
            cards.liveWork.recentFailureCount > 0
              ? 'Review before work continues'
              : 'Nothing is blocking you'}
          </h2>
        </div>
        <AttentionList
          approvals={cards.approvals.latestPendingApprovals}
          failures={cards.liveWork.recentFailures.slice(0, 3)}
        />
        <ActionRow
          actions={cards.approvals.actions}
          onRunAction={onRunAction}
        />
      </section>

      <section style={sectionStyle}>
        <div>
          <p style={eyebrowStyle}>Active work</p>
          <h2 style={{ marginTop: '0.3rem' }}>
            {activeSession
              ? humanize(activeSession.workflow)
              : 'No active workflow'}
          </h2>
          <p
            style={{
              color: 'var(--jh-color-text-secondary)',
              marginTop: '0.45rem',
            }}
          >
            {cards.liveWork.message}
          </p>
        </div>
        <dl style={factsStyle}>
          <Fact
            label="Active sessions"
            value={cards.liveWork.activeSessionCount}
          />
          <Fact
            label="Pending approvals"
            value={cards.liveWork.pendingApprovalCount}
          />
          <Fact
            label="Interrupted runs"
            value={cards.liveWork.recentFailureCount}
          />
        </dl>
        <ActionRow actions={cards.liveWork.actions} onRunAction={onRunAction} />
      </section>

      <section style={sectionStyle}>
        <div>
          <p style={eyebrowStyle}>Queue closeout</p>
          <h2 style={{ marginTop: '0.3rem' }}>
            {cards.closeout.pipeline.pendingCount} pipeline ·{' '}
            {cards.closeout.tracker.pendingAdditionCount} staged tracker
          </h2>
          <p
            style={{
              color: 'var(--jh-color-text-secondary)',
              marginTop: '0.45rem',
            }}
          >
            {cards.closeout.message}
          </p>
        </div>
        <dl style={factsStyle}>
          <Fact
            label="Processed"
            value={cards.closeout.pipeline.processedCount}
          />
          <Fact
            label="Malformed"
            value={cards.closeout.pipeline.malformedCount}
          />
          <Fact label="Tracker rows" value={cards.closeout.tracker.rowCount} />
        </dl>
        {closeoutPreview.length > 0 ? (
          <ul style={ruledListStyle}>
            {closeoutPreview.map((item) => (
              <li key={item.key} style={ruledItemStyle}>
                <strong>{item.title}</strong>
                <span style={metaStyle}>{item.meta}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <ActionRow actions={cards.closeout.actions} onRunAction={onRunAction} />
      </section>

      <section style={sectionStyle}>
        <div>
          <p style={eyebrowStyle}>Recent artifacts</p>
          <h2 style={{ marginTop: '0.3rem' }}>
            {cards.artifacts.totalCount} available
          </h2>
          <p
            style={{
              color: 'var(--jh-color-text-secondary)',
              marginTop: '0.45rem',
            }}
          >
            {cards.artifacts.message}
          </p>
        </div>
        <ArtifactList items={cards.artifacts.items} />
        <ActionRow
          actions={cards.artifacts.actions}
          onRunAction={onRunAction}
        />
      </section>

      <div style={splitStyle}>
        <section style={sectionStyle}>
          <div>
            <p style={eyebrowStyle}>Workspace readiness</p>
            <h2 style={{ marginTop: '0.3rem' }}>
              {humanize(cards.readiness.startupStatus)}
            </h2>
            <p
              style={{
                color: 'var(--jh-color-text-secondary)',
                marginTop: '0.45rem',
              }}
            >
              {cards.readiness.message}
            </p>
          </div>
          <dl style={factsStyle}>
            <Fact label="Required" value={cards.readiness.missing.onboarding} />
            <Fact label="Runtime" value={cards.readiness.missing.runtime} />
            <Fact label="Optional" value={cards.readiness.missing.optional} />
          </dl>
          <ActionRow
            actions={cards.readiness.actions}
            onRunAction={onRunAction}
          />
        </section>

        <section style={sectionStyle}>
          <div>
            <p style={eyebrowStyle}>Maintenance</p>
            <h2 style={{ marginTop: '0.3rem' }}>
              {humanize(cards.maintenance.updateCheck.state)}
            </h2>
            <p
              style={{
                color: 'var(--jh-color-text-secondary)',
                marginTop: '0.45rem',
              }}
            >
              {cards.maintenance.message}
            </p>
          </div>
          <dl style={factsStyle}>
            <Fact label="Auth" value={cards.maintenance.authState} />
            <Fact
              label="Store"
              value={cards.maintenance.operationalStoreStatus}
            />
            <Fact
              label="Version"
              value={cards.maintenance.updateCheck.localVersion ?? 'n/a'}
            />
          </dl>
          <ActionRow
            actions={cards.maintenance.actions}
            onRunAction={onRunAction}
          />
        </section>
      </div>
    </section>
  );
}

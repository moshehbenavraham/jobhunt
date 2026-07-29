import type { CSSProperties, ReactNode } from 'react';
import type { OperatorShellSummaryPayload } from './shell-types';

type EvidenceRailProps = {
  children?: ReactNode;
  className?: string;
  inline?: boolean;
  summary?: OperatorShellSummaryPayload | null;
};

const railStyle: CSSProperties = {
  background: 'var(--jh-color-surface-bg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--jh-space-6)',
  height: '100%',
  minHeight: '100vh',
  padding: '1.6rem 1.15rem',
};

const drawerContentStyle: CSSProperties = {
  ...railStyle,
  minHeight: 'auto',
  padding: 'var(--jh-space-padding)',
};

const sectionStyle: CSSProperties = {
  borderTop: 'var(--jh-border-subtle)',
  display: 'grid',
  gap: 'var(--jh-space-2)',
  paddingTop: 'var(--jh-space-4)',
};

const metaStyle: CSSProperties = {
  color: 'var(--jh-color-text-muted)',
  fontSize: 'var(--jh-text-caption-size)',
};

function statusLabel(summary: OperatorShellSummaryPayload | null): string {
  if (!summary) return 'Waiting for local API';
  if (summary.status === 'ready') return 'Ready';
  if (summary.status === 'missing-prerequisites') return 'Setup required';
  return summary.status.replaceAll('-', ' ');
}

function DefaultRailContent({
  summary,
}: {
  summary: OperatorShellSummaryPayload | null;
}) {
  const active = summary?.activity.activeSession ?? null;
  const pending = summary?.activity.pendingApprovalCount ?? 0;

  return (
    <>
      <header>
        <p
          style={{
            color: 'var(--jh-color-label-fg)',
            fontSize: '0.68rem',
            letterSpacing: '0.09em',
            marginBottom: '0.35rem',
            textTransform: 'uppercase',
          }}
        >
          Workspace
        </p>
        <h3>Evidence & context</h3>
        <p style={{ ...metaStyle, marginTop: '0.45rem' }}>
          Live facts from this local checkout.
        </p>
      </header>

      <section style={sectionStyle}>
        <p style={metaStyle}>Readiness</p>
        <strong>{statusLabel(summary)}</strong>
        {summary ? (
          <p style={metaStyle}>
            {summary.health.missing.onboarding} setup ·{' '}
            {summary.health.missing.runtime} runtime ·{' '}
            {summary.health.missing.optional} optional
          </p>
        ) : null}
      </section>

      <section style={sectionStyle}>
        <p style={metaStyle}>Current work</p>
        <strong>{active?.workflow ?? 'No active workflow'}</strong>
        <p style={metaStyle}>
          {active
            ? `${active.sessionId} · ${active.status}`
            : 'Start or resume work from the center canvas.'}
        </p>
      </section>

      <section style={sectionStyle}>
        <p style={metaStyle}>Human review</p>
        <strong>
          {pending} approval{pending === 1 ? '' : 's'} waiting
        </strong>
        <p style={metaStyle}>Outbound actions remain manual.</p>
      </section>

      <section style={{ ...sectionStyle, marginTop: 'auto' }}>
        <p style={metaStyle}>Safety boundary</p>
        <strong>No send · No submit</strong>
      </section>
    </>
  );
}

export function EvidenceRail({
  children,
  className,
  inline = true,
  summary = null,
}: EvidenceRailProps) {
  const content = children ?? <DefaultRailContent summary={summary} />;

  if (!inline) {
    return <div style={drawerContentStyle}>{content}</div>;
  }

  return (
    <aside
      aria-label="Evidence and context"
      className={className}
      style={railStyle}
    >
      {content}
    </aside>
  );
}

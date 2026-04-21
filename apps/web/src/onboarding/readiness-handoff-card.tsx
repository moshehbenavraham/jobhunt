import type { CSSProperties } from 'react';
import type { OnboardingRepairPayload, OnboardingSummaryPayload } from './onboarding-types';
import type { OnboardingWizardViewStatus } from './use-onboarding-wizard';

type ReadinessHandoffCardProps = {
  health: OnboardingSummaryPayload['health'] | null;
  lastRepair: OnboardingRepairPayload | null;
  lastUpdatedAt: string | null;
  onOpenChat: () => void;
  onOpenStartup: () => void;
  status: OnboardingWizardViewStatus;
};

const cardStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.94)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.35rem',
  display: 'grid',
  gap: '1rem',
  padding: '1rem',
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const buttonStyle: CSSProperties = {
  background: '#0f172a',
  border: 0,
  borderRadius: '999px',
  color: '#f8fafc',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 700,
  minHeight: '2.8rem',
  padding: '0.7rem 1rem',
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not refreshed yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

function getEmptyCopy(status: OnboardingWizardViewStatus) {
  switch (status) {
    case 'loading':
      return 'Waiting for a live onboarding summary before computing the next handoff.';
    case 'offline':
      return 'The onboarding API is offline, so the readiness handoff cannot refresh right now.';
    case 'error':
      return 'The latest onboarding request failed before the handoff state could refresh.';
    default:
      return 'Open the onboarding summary to calculate the next handoff.';
  }
}

function getHandoffCopy(health: OnboardingSummaryPayload['health']) {
  if (health.missing.runtime > 0) {
    return {
      nextAction: 'Review Startup',
      note: 'System-owned runtime blockers still need attention before the app is safe to use.',
      tone: '#991b1b',
    };
  }

  if (health.missing.onboarding > 0) {
    return {
      nextAction: 'Keep repairing onboarding',
      note: 'Required onboarding files are still missing. Stay on this surface and finish the remaining repairs.',
      tone: '#9a3412',
    };
  }

  if (health.startupStatus === 'ready') {
    return {
      nextAction: 'Launch work',
      note: 'Startup prerequisites are complete. The shell can hand off to the live chat surface.',
      tone: '#166534',
    };
  }

  return {
    nextAction: 'Return to Startup',
    note: health.message,
    tone: '#1d4ed8',
  };
}

export function ReadinessHandoffCard({
  health,
  lastRepair,
  lastUpdatedAt,
  onOpenChat,
  onOpenStartup,
  status,
}: ReadinessHandoffCardProps) {
  if (!health) {
    return (
      <section aria-labelledby="readiness-handoff-title" style={cardStyle}>
        <header>
          <p
            style={{
              color: '#9a3412',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem',
              marginTop: 0,
              textTransform: 'uppercase',
            }}
          >
            Handoff
          </p>
          <h2 id="readiness-handoff-title" style={{ marginBottom: '0.35rem' }}>
            Readiness handoff
          </h2>
          <p style={{ marginBottom: 0 }}>{getEmptyCopy(status)}</p>
        </header>
      </section>
    );
  }

  const copy = getHandoffCopy(health);

  return (
    <section aria-labelledby="readiness-handoff-title" style={cardStyle}>
      <header>
        <p
          style={{
            color: '#9a3412',
            letterSpacing: '0.08em',
            marginBottom: '0.35rem',
            marginTop: 0,
            textTransform: 'uppercase',
          }}
        >
          Handoff
        </p>
        <h2 id="readiness-handoff-title" style={{ marginBottom: '0.35rem' }}>
          Readiness and next steps
        </h2>
        <p style={{ color: copy.tone, fontWeight: 700, marginBottom: '0.35rem' }}>
          {copy.nextAction}
        </p>
        <p style={{ color: '#475569', marginBottom: 0 }}>{copy.note}</p>
      </header>

      <div
        style={{
          display: 'grid',
          gap: '0.8rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
        }}
      >
        <article
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.9rem',
          }}
        >
          <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
            Last refreshed
          </p>
          <p style={{ margin: 0 }}>{formatTimestamp(lastUpdatedAt)}</p>
        </article>
        <article
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.9rem',
          }}
        >
          <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
            Remaining required files
          </p>
          <p style={{ margin: 0 }}>{health.missing.onboarding}</p>
        </article>
        <article
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.9rem',
          }}
        >
          <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
            Runtime blockers
          </p>
          <p style={{ margin: 0 }}>{health.missing.runtime}</p>
        </article>
      </div>

      {lastRepair ? (
        <section
          style={{
            background: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '1rem',
            padding: '0.85rem 0.9rem',
          }}
        >
          <p style={{ marginBottom: '0.25rem', marginTop: 0 }}>
            <strong>Most recent repair</strong>
          </p>
          <p style={{ margin: 0 }}>
            {lastRepair.repairedCount} file{lastRepair.repairedCount === 1 ? '' : 's'} created.
          </p>
        </section>
      ) : null}

      <div style={buttonRowStyle}>
        <button
          aria-label="Open the startup surface"
          onClick={onOpenStartup}
          style={buttonStyle}
          type="button"
        >
          Open Startup
        </button>
        <button
          aria-label="Open the chat surface"
          disabled={health.missing.onboarding > 0 || health.missing.runtime > 0}
          onClick={onOpenChat}
          style={{
            ...buttonStyle,
            opacity:
              health.missing.onboarding > 0 || health.missing.runtime > 0 ? 0.6 : 1,
          }}
          type="button"
        >
          Open Chat
        </button>
      </div>
    </section>
  );
}

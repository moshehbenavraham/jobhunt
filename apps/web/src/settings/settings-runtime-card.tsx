import type { CSSProperties } from 'react';
import type {
  SettingsSummaryPayload,
  SettingsViewStatus,
} from './settings-types';

type SettingsRuntimeCardProps = {
  onOpenOnboarding: () => void;
  onOpenStartup: () => void;
  summary: SettingsSummaryPayload | null;
  status: SettingsViewStatus;
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

function getEmptyCopy(status: SettingsViewStatus): string {
  switch (status) {
    case 'loading':
      return 'Reading startup, operational-store, and closeout readiness from the API.';
    case 'offline':
      return 'The settings API is offline, so runtime readiness cannot refresh right now.';
    case 'error':
      return 'The latest settings request failed before runtime readiness could refresh.';
    default:
      return 'Open the settings surface to calculate runtime readiness.';
  }
}

function getTone(summary: SettingsSummaryPayload): {
  accent: string;
  background: string;
  heading: string;
  phaseReady: boolean;
} {
  switch (summary.status) {
    case 'ready':
      return {
        accent: '#166534',
        background: '#dcfce7',
        heading: 'Runtime ready',
        phaseReady: summary.operationalStore.status === 'ready',
      };
    case 'missing-prerequisites':
      return {
        accent: '#9a3412',
        background: '#ffedd5',
        heading: 'Onboarding follow-up required',
        phaseReady: false,
      };
    case 'runtime-error':
      return {
        accent: '#991b1b',
        background: '#fee2e2',
        heading: 'Runtime blocked',
        phaseReady: false,
      };
    default:
      return {
        accent: '#1d4ed8',
        background: '#dbeafe',
        heading: 'Runtime degraded',
        phaseReady: false,
      };
  }
}

export function SettingsRuntimeCard({
  onOpenOnboarding,
  onOpenStartup,
  summary,
  status,
}: SettingsRuntimeCardProps) {
  if (!summary) {
    return (
      <section aria-labelledby="settings-runtime-title" style={cardStyle}>
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
            Runtime
          </p>
          <h2 id="settings-runtime-title" style={{ marginBottom: '0.35rem' }}>
            Readiness and phase closeout
          </h2>
          <p style={{ marginBottom: 0 }}>{getEmptyCopy(status)}</p>
        </header>
      </section>
    );
  }

  const tone = getTone(summary);
  const phaseLabel =
    summary.currentSession.phase !== null
      ? `Phase ${summary.currentSession.phase.toString().padStart(2, '0')}`
      : 'Current phase';

  return (
    <section aria-labelledby="settings-runtime-title" style={cardStyle}>
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
          Runtime
        </p>
        <h2 id="settings-runtime-title" style={{ marginBottom: '0.35rem' }}>
          Readiness and phase closeout
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>{summary.message}</p>
      </header>

      <section
        style={{
          background: tone.background,
          border: `1px solid ${tone.accent}33`,
          borderRadius: '1rem',
          padding: '0.9rem 1rem',
        }}
      >
        <p style={{ color: tone.accent, fontWeight: 700, margin: 0 }}>
          {tone.heading}
        </p>
        <p style={{ color: '#475569', marginBottom: 0, marginTop: '0.35rem' }}>
          {tone.phaseReady
            ? `${phaseLabel} shell work is ready to close out from the browser surface.`
            : `${phaseLabel} shell closeout still depends on the runtime and onboarding state above.`}
        </p>
      </section>

      <div
        style={{
          display: 'grid',
          gap: '0.8rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
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
          <p
            style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}
          >
            Startup status
          </p>
          <p style={{ margin: 0 }}>{summary.health.startupStatus}</p>
        </article>
        <article
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.9rem',
          }}
        >
          <p
            style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}
          >
            Operational store
          </p>
          <p style={{ margin: 0 }}>{summary.operationalStore.status}</p>
        </article>
        <article
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.9rem',
          }}
        >
          <p
            style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}
          >
            Onboarding blockers
          </p>
          <p style={{ margin: 0 }}>{summary.health.missing.onboarding}</p>
        </article>
        <article
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.9rem',
          }}
        >
          <p
            style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}
          >
            Runtime blockers
          </p>
          <p style={{ margin: 0 }}>{summary.health.missing.runtime}</p>
        </article>
      </div>

      <section
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '1rem',
          padding: '0.85rem 0.9rem',
        }}
      >
        <p style={{ marginBottom: '0.25rem', marginTop: 0 }}>
          <strong>Operational store path</strong>
        </p>
        <p style={{ margin: 0 }}>
          Root: <code>{summary.operationalStore.rootPath}</code>
        </p>
        <p style={{ marginBottom: 0, marginTop: '0.35rem' }}>
          Database: <code>{summary.operationalStore.databasePath}</code>
        </p>
      </section>

      <div style={buttonRowStyle}>
        <button
          aria-label="Open the startup surface from runtime readiness"
          onClick={onOpenStartup}
          style={buttonStyle}
          type="button"
        >
          Open Startup
        </button>
        <button
          aria-label="Open the onboarding surface from runtime readiness"
          disabled={summary.health.missing.onboarding === 0}
          onClick={onOpenOnboarding}
          style={{
            ...buttonStyle,
            opacity: summary.health.missing.onboarding === 0 ? 0.6 : 1,
          }}
          type="button"
        >
          Open Onboarding
        </button>
      </div>
    </section>
  );
}

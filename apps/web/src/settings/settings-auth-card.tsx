import type { CSSProperties } from 'react';
import type {
  SettingsSummaryPayload,
  SettingsViewStatus,
} from './settings-types';

type SettingsAuthCardProps = {
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
      return 'Reading auth readiness, runtime config, and recovery commands from the API.';
    case 'offline':
      return 'The settings API is offline, so auth guidance cannot refresh.';
    case 'error':
      return 'The latest settings request failed before auth guidance could refresh.';
    default:
      return 'Open the settings surface to inspect runtime auth readiness.';
  }
}

function getTone(summary: SettingsSummaryPayload): {
  accent: string;
  background: string;
  heading: string;
} {
  switch (summary.auth.auth.state) {
    case 'ready':
      return {
        accent: '#166534',
        background: '#dcfce7',
        heading: 'Account auth ready',
      };
    case 'expired-auth':
      return {
        accent: '#9a3412',
        background: '#ffedd5',
        heading: 'Auth refresh required',
      };
    case 'invalid-auth':
      return {
        accent: '#991b1b',
        background: '#fee2e2',
        heading: 'Auth repair required',
      };
    case 'auth-required':
      return {
        accent: '#1d4ed8',
        background: '#dbeafe',
        heading: 'First-run login required',
      };
  }
}

export function SettingsAuthCard({
  onOpenOnboarding,
  onOpenStartup,
  summary,
  status,
}: SettingsAuthCardProps) {
  if (!summary) {
    return (
      <section aria-labelledby="settings-auth-title" style={cardStyle}>
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
            Auth
          </p>
          <h2 id="settings-auth-title" style={{ marginBottom: '0.35rem' }}>
            Runtime auth and config
          </h2>
          <p style={{ marginBottom: 0 }}>{getEmptyCopy(status)}</p>
        </header>
      </section>
    );
  }

  const tone = getTone(summary);

  return (
    <section aria-labelledby="settings-auth-title" style={cardStyle}>
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
          Auth
        </p>
        <h2 id="settings-auth-title" style={{ marginBottom: '0.35rem' }}>
          Runtime auth and config
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>
          The browser does not mutate auth state. It shows the stored account
          status and the exact terminal commands to run next.
        </p>
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
          {summary.auth.auth.message}
        </p>
      </section>

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
          <p
            style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}
          >
            Account id
          </p>
          <p style={{ margin: 0 }}>
            {summary.auth.auth.accountId ?? 'No account id stored yet'}
          </p>
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
            Auth state
          </p>
          <p style={{ margin: 0 }}>{summary.auth.auth.state}</p>
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
            Model
          </p>
          <p style={{ margin: 0 }}>{summary.auth.config.model}</p>
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
            Originator
          </p>
          <p style={{ margin: 0 }}>{summary.auth.config.originator}</p>
        </article>
      </div>

      <section
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '1rem',
          display: 'grid',
          gap: '0.45rem',
          padding: '0.85rem 0.9rem',
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Runtime config</strong>
        </p>
        <p style={{ margin: 0 }}>
          Base URL: <code>{summary.auth.config.baseUrl}</code>
        </p>
        <p style={{ margin: 0 }}>
          Auth path: <code>{summary.auth.config.authPath}</code>
        </p>
        <p style={{ marginBottom: 0, marginTop: '0.35rem' }}>
          Updated at:{' '}
          {summary.auth.auth.updatedAt ?? 'No auth timestamp stored'}
        </p>
      </section>

      <section
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '1rem',
          padding: '0.85rem 0.9rem',
        }}
      >
        <p style={{ marginBottom: '0.35rem', marginTop: 0 }}>
          <strong>Next steps</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {summary.auth.auth.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <button
          aria-label="Open the startup surface from auth guidance"
          onClick={onOpenStartup}
          style={buttonStyle}
          type="button"
        >
          Open Startup
        </button>
        <button
          aria-label="Open the onboarding surface from auth guidance"
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

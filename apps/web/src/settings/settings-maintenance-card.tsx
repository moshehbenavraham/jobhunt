import { useEffect, useRef, type CSSProperties } from 'react';
import type {
  SettingsSummaryPayload,
  SettingsViewStatus,
} from './settings-types';

type SettingsMaintenanceCardProps = {
  focusSignal: number;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onRefresh: () => void;
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

function getEmptyCopy(status: SettingsViewStatus): string {
  switch (status) {
    case 'loading':
      return 'Reading updater state and maintenance command guidance from the API.';
    case 'offline':
      return 'The settings API is offline, so maintenance guidance cannot refresh.';
    case 'error':
      return 'The latest settings request failed before maintenance guidance could refresh.';
    default:
      return 'Open the settings surface to inspect maintenance guidance.';
  }
}

function getUpdateTone(summary: SettingsSummaryPayload): {
  accent: string;
  background: string;
  heading: string;
} {
  switch (summary.maintenance.updateCheck.state) {
    case 'up-to-date':
      return {
        accent: '#166534',
        background: '#dcfce7',
        heading: 'Updater is current',
      };
    case 'update-available':
      return {
        accent: '#9a3412',
        background: '#ffedd5',
        heading: 'Update available',
      };
    case 'dismissed':
      return {
        accent: '#475569',
        background: '#e2e8f0',
        heading: 'Update checks dismissed',
      };
    case 'offline':
      return {
        accent: '#1d4ed8',
        background: '#dbeafe',
        heading: 'Update source offline',
      };
    case 'error':
      return {
        accent: '#991b1b',
        background: '#fee2e2',
        heading: 'Updater check failed',
      };
  }
}

export function SettingsMaintenanceCard({
  focusSignal,
  isRefreshing,
  lastUpdatedAt,
  onRefresh,
  summary,
  status,
}: SettingsMaintenanceCardProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (focusSignal <= 0) {
      return;
    }

    headingRef.current?.focus();
  }, [focusSignal]);

  if (!summary) {
    return (
      <section aria-labelledby="settings-maintenance-title" style={cardStyle}>
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
            Maintenance
          </p>
          <h2
            id="settings-maintenance-title"
            ref={headingRef}
            style={{ marginBottom: '0.35rem' }}
            tabIndex={-1}
          >
            Updater and terminal commands
          </h2>
          <p style={{ marginBottom: 0 }}>{getEmptyCopy(status)}</p>
        </header>

        <button
          aria-label="Refresh settings summary from maintenance guidance"
          disabled={isRefreshing || status === 'loading'}
          onClick={onRefresh}
          style={{
            ...buttonStyle,
            opacity: isRefreshing || status === 'loading' ? 0.65 : 1,
          }}
          type="button"
        >
          {isRefreshing ? 'Refreshing settings...' : 'Refresh settings'}
        </button>
      </section>
    );
  }

  const tone = getUpdateTone(summary);
  const updateCheck = summary.maintenance.updateCheck;

  return (
    <section aria-labelledby="settings-maintenance-title" style={cardStyle}>
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
          Maintenance
        </p>
        <h2
          id="settings-maintenance-title"
          ref={headingRef}
          style={{ marginBottom: '0.35rem' }}
          tabIndex={-1}
        >
          Updater and terminal commands
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>
          Refresh is the only browser action here. Update apply, rollback,
          backup, doctor, and auth changes stay explicit in the terminal.
        </p>
      </header>

      <section
        aria-live="polite"
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
          {updateCheck.message}
        </p>
        <p style={{ marginBottom: 0, marginTop: '0.45rem' }}>
          Local: <strong>{updateCheck.localVersion ?? 'n/a'}</strong> | Remote:{' '}
          <strong>{updateCheck.remoteVersion ?? 'n/a'}</strong>
        </p>
        {updateCheck.changelogExcerpt ? (
          <p style={{ color: '#475569', marginBottom: 0, marginTop: '0.45rem' }}>
            {updateCheck.changelogExcerpt}
          </p>
        ) : null}
      </section>

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'space-between',
        }}
      >
        <p style={{ color: '#475569', margin: 0 }}>
          Last refreshed: <strong>{formatTimestamp(lastUpdatedAt)}</strong>
        </p>
        <button
          aria-label="Refresh settings summary from maintenance guidance"
          disabled={isRefreshing || status === 'loading'}
          onClick={onRefresh}
          style={{
            ...buttonStyle,
            opacity: isRefreshing || status === 'loading' ? 0.65 : 1,
          }}
          type="button"
        >
          {isRefreshing ? 'Refreshing settings...' : 'Refresh settings'}
        </button>
      </div>

      <section
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '1rem',
          padding: '0.85rem 0.9rem',
        }}
      >
        <p style={{ marginBottom: '0.35rem', marginTop: 0 }}>
          <strong>Updater check command</strong>
        </p>
        <p style={{ margin: 0 }}>
          <code>{updateCheck.command}</code>
        </p>
        <p style={{ color: '#475569', marginBottom: 0, marginTop: '0.35rem' }}>
          Checked at: {formatTimestamp(updateCheck.checkedAt)}
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
          <strong>Maintenance commands</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {summary.maintenance.commands.map((command) => (
            <li key={command.id} style={{ marginBottom: '0.5rem' }}>
              <strong>{command.label}</strong>{' '}
              <span style={{ color: '#475569' }}>({command.category})</span>
              <div style={{ color: '#475569' }}>{command.description}</div>
              <div>
                <code>{command.command}</code>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

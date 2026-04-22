import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SettingsAuthCard } from './settings-auth-card';
import { SettingsMaintenanceCard } from './settings-maintenance-card';
import { SettingsRuntimeCard } from './settings-runtime-card';
import { SettingsSupportCard } from './settings-support-card';
import { SettingsWorkspaceCard } from './settings-workspace-card';
import { useSettingsSurface } from './use-settings-surface';

type SettingsSurfaceProps = {
  onOpenOnboarding: () => void;
  onOpenStartup: () => void;
  onSummaryRefresh: () => void;
};

const pageStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
};

const heroStyle: CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(255, 247, 237, 0.92) 0%, rgba(248, 250, 252, 0.94) 62%, rgba(219, 234, 254, 0.78) 100%)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: '1.35rem',
  display: 'grid',
  gap: '0.75rem',
  padding: '1rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))',
};

const staleNoticeStyle: CSSProperties = {
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  borderRadius: '1rem',
  padding: '0.85rem 0.9rem',
};

export function SettingsSurface({
  onOpenOnboarding,
  onOpenStartup,
  onSummaryRefresh,
}: SettingsSurfaceProps) {
  const settings = useSettingsSurface({
    onSummaryRefresh,
  });
  const pendingInteractiveRefreshRef = useRef(false);
  const [focusSignal, setFocusSignal] = useState(0);

  useEffect(() => {
    if (!pendingInteractiveRefreshRef.current) {
      return;
    }

    if (settings.state.status === 'loading' || settings.state.isRefreshing) {
      return;
    }

    pendingInteractiveRefreshRef.current = false;
    setFocusSignal((previous) => previous + 1);
  }, [
    settings.state.isRefreshing,
    settings.state.lastUpdatedAt,
    settings.state.status,
  ]);

  return (
    <section
      aria-labelledby="settings-surface-title"
      style={pageStyle}
    >
      <header style={heroStyle}>
        <p
          style={{
            color: '#9a3412',
            letterSpacing: '0.08em',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          Session 05
        </p>
        <h2 id="settings-surface-title" style={{ margin: 0 }}>
          Settings and maintenance surface
        </h2>
        <p style={{ color: '#475569', margin: 0 }}>
          One read-only place to inspect runtime readiness, auth state, repo
          paths, workflow support, tool coverage, and updater visibility before
          leaving the shell.
        </p>
      </header>

      {settings.state.data && settings.state.status === 'offline' ? (
        <section style={staleNoticeStyle}>
          <p style={{ fontWeight: 700, margin: 0 }}>
            Offline after the last good settings summary
          </p>
          <p style={{ marginBottom: 0, marginTop: '0.35rem' }}>
            {settings.state.error?.message ??
              'The API stopped responding after the previous settings refresh.'}
          </p>
        </section>
      ) : null}

      {settings.state.data && settings.state.status === 'error' ? (
        <section
          style={{
            ...staleNoticeStyle,
            background: '#fee2e2',
            borderColor: '#fecaca',
          }}
        >
          <p style={{ fontWeight: 700, margin: 0 }}>Settings summary error</p>
          <p style={{ marginBottom: 0, marginTop: '0.35rem' }}>
            {settings.state.error?.message ??
              'The latest settings request failed before the summary could fully refresh.'}
          </p>
        </section>
      ) : null}

      <div style={gridStyle}>
        <SettingsRuntimeCard
          onOpenOnboarding={onOpenOnboarding}
          onOpenStartup={onOpenStartup}
          summary={settings.state.data}
          status={settings.state.status}
        />
        <SettingsWorkspaceCard
          summary={settings.state.data}
          status={settings.state.status}
        />
        <SettingsAuthCard
          onOpenOnboarding={onOpenOnboarding}
          onOpenStartup={onOpenStartup}
          summary={settings.state.data}
          status={settings.state.status}
        />
        <SettingsSupportCard
          summary={settings.state.data}
          status={settings.state.status}
        />
      </div>

      <SettingsMaintenanceCard
        focusSignal={focusSignal}
        isRefreshing={settings.state.isRefreshing}
        lastUpdatedAt={settings.state.lastUpdatedAt}
        onRefresh={() => {
          pendingInteractiveRefreshRef.current = true;
          settings.refresh();
        }}
        summary={settings.state.data}
        status={settings.state.status}
      />
    </section>
  );
}

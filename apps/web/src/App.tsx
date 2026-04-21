import type { CSSProperties } from 'react';
import { StartupStatusPanel } from './boot/startup-status-panel';
import { useStartupDiagnostics } from './boot/use-startup-diagnostics';

const pageStyle: CSSProperties = {
  background: 'linear-gradient(180deg, #f6f6f0 0%, #f8fafc 48%, #fdf2f8 100%)',
  color: '#0f172a',
  fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
  lineHeight: 1.6,
  minHeight: '100vh',
  padding: '2rem 1.25rem 3rem',
};

const shellStyle: CSSProperties = {
  margin: '0 auto',
  maxWidth: '72rem',
};

const sectionStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d4d4d8',
  borderRadius: '1rem',
  padding: '1.1rem 1.25rem',
};

const mutedTextStyle: CSSProperties = {
  color: '#475569',
};

type StateCardProps = {
  children: string;
  title: string;
};

function StateCard({ children, title }: StateCardProps) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ marginBottom: 0 }}>{children}</p>
    </section>
  );
}

export function App() {
  const { refresh, state } = useStartupDiagnostics();
  const hasDiagnostics = state.data !== null;

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <header style={{ marginBottom: '1.5rem' }}>
          <p
            style={{
              ...mutedTextStyle,
              letterSpacing: '0.08em',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
            }}
          >
            Phase 01 operational store
          </p>
          <p style={{ ...mutedTextStyle, marginBottom: 0, marginTop: 0 }}>
            This screen proves the web shell can inspect live startup state
            without mutating your job-search workspace.
          </p>
        </header>

        {state.status === 'empty' ? (
          <StateCard title="Waiting for diagnostics">
            Bootstrap checks have not started yet. Refresh to request the first
            startup payload.
          </StateCard>
        ) : null}

        {state.status === 'loading' && !hasDiagnostics ? (
          <StateCard title="Checking the local bootstrap surface">
            Reading the API startup contract, repo boundary, and prompt summary.
          </StateCard>
        ) : null}

        {state.status === 'offline' && !hasDiagnostics ? (
          <StateCard title="API unavailable">
            {state.error?.message ??
              'The bootstrap API is not reachable. Start `npm run app:api:serve` and retry.'}
          </StateCard>
        ) : null}

        {state.status === 'error' && !hasDiagnostics ? (
          <StateCard title="Bootstrap error">
            {state.error?.message ??
              'The bootstrap contract failed before diagnostics could load.'}
          </StateCard>
        ) : null}

        {state.status === 'missing-prerequisites' ? (
          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Action required</h2>
            <p style={{ marginBottom: 0 }}>
              The app booted, but required onboarding files are still missing.
              The diagnostics panel below lists the exact files to create next.
            </p>
          </section>
        ) : null}

        {state.status === 'offline' && hasDiagnostics ? (
          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Offline after last successful load</h2>
            <p style={{ marginBottom: 0 }}>
              {state.error?.message ??
                'The API stopped responding after the previous successful refresh.'}
            </p>
          </section>
        ) : null}

        {state.status === 'error' && hasDiagnostics ? (
          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Bootstrap contract error</h2>
            <p style={{ marginBottom: 0 }}>
              Runtime blockers were detected in the checked-in repo contract.
              Review the diagnostics below before moving to later runtime work.
            </p>
          </section>
        ) : null}

        {state.data ? (
          <StartupStatusPanel
            diagnostics={state.data}
            isRefreshing={state.isRefreshing}
            lastUpdatedAt={state.lastUpdatedAt}
            onRefresh={refresh}
          />
        ) : null}
      </div>
    </main>
  );
}

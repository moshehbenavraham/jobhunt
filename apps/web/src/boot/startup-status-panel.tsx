import type { CSSProperties } from 'react';
import { MissingFilesList } from './missing-files-list';
import type { StartupPayload } from './startup-types';

type StartupStatusPanelProps = {
  diagnostics: StartupPayload;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onRefresh: () => void;
};

const panelStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
};

const headerStyle: CSSProperties = {
  alignItems: 'flex-start',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  justifyContent: 'space-between',
};

const cardGridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
};

const cardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d4d4d8',
  borderRadius: '1rem',
  padding: '1rem 1.15rem',
};

const badgeStyles: Record<string, CSSProperties> = {
  degraded: {
    background: '#ffedd5',
    color: '#9a3412',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  ok: {
    background: '#dcfce7',
    color: '#166534',
  },
};

const buttonStyle: CSSProperties = {
  background: '#111827',
  border: 0,
  borderRadius: '999px',
  color: '#f8fafc',
  cursor: 'pointer',
  fontSize: '0.95rem',
  fontWeight: 600,
  minWidth: '11rem',
  padding: '0.8rem 1.1rem',
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not loaded yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

export function StartupStatusPanel({
  diagnostics,
  isRefreshing,
  lastUpdatedAt,
  onRefresh,
}: StartupStatusPanelProps) {
  const promptContract = diagnostics.diagnostics.promptContract;
  const healthBadgeStyle = badgeStyles[diagnostics.health.status] ?? badgeStyles.ok;

  return (
    <section style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <p
            style={{
              color: '#64748b',
              letterSpacing: '0.08em',
              marginBottom: '0.5rem',
              marginTop: 0,
              textTransform: 'uppercase',
            }}
          >
            Local bootstrap contract
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.1rem)', margin: 0 }}>
            Job-Hunt startup diagnostics
          </h1>
          <p role="status" aria-live="polite" style={{ marginBottom: 0 }}>
            {diagnostics.message}
          </p>
          <p style={{ color: '#475569', marginBottom: 0 }}>
            Last refreshed: {formatTimestamp(lastUpdatedAt)}
          </p>
        </div>
        <button
          type="button"
          disabled={isRefreshing}
          onClick={onRefresh}
          style={{
            ...buttonStyle,
            opacity: isRefreshing ? 0.7 : 1,
          }}
        >
          {isRefreshing ? 'Refreshing diagnostics...' : 'Refresh diagnostics'}
        </button>
      </header>

      <div style={cardGridStyle}>
        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Health surface</h2>
          <p>
            <span
              style={{
                ...healthBadgeStyle,
                borderRadius: '999px',
                display: 'inline-block',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
              }}
            >
              {diagnostics.health.status}
            </span>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Startup status: <strong>{diagnostics.health.startupStatus}</strong>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Endpoint pair: <code>{diagnostics.bootSurface.healthPath}</code> and{' '}
            <code>{diagnostics.bootSurface.startupPath}</code>
          </p>
          <p style={{ marginBottom: 0 }}>
            Missing counts: onboarding {diagnostics.health.missing.onboarding},
            optional {diagnostics.health.missing.optional}, runtime{' '}
            {diagnostics.health.missing.runtime}
          </p>
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Repo contract</h2>
          <p style={{ marginBottom: '0.4rem' }}>
            Repo root: <code>{diagnostics.repoRoot}</code>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            App state root: <code>{diagnostics.appStateRoot.path}</code>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Exists on disk: <strong>{String(diagnostics.appStateRoot.exists)}</strong>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Mutation policy: <strong>{diagnostics.mutationPolicy}</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            Writable roots:{' '}
            <code>{diagnostics.diagnostics.workspace.writableRoots.join(', ')}</code>
          </p>
        </article>

        <article style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Prompt contract</h2>
          <p style={{ marginBottom: '0.4rem' }}>
            Cache mode: <strong>{promptContract.cacheMode}</strong>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Sources: {promptContract.sources.length} declared
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Workflows: {promptContract.supportedWorkflows.length} supported
          </p>
          <p style={{ marginBottom: 0 }}>
            Source order: <code>{promptContract.sourceOrder.join(' -> ')}</code>
          </p>
        </article>
      </div>

      {diagnostics.diagnostics.runtimeMissing.length > 0 ? (
        <MissingFilesList
          heading="Runtime blockers"
          id="runtime-blockers"
          items={diagnostics.diagnostics.runtimeMissing}
          tone="critical"
        />
      ) : null}

      {diagnostics.diagnostics.onboardingMissing.length > 0 ? (
        <MissingFilesList
          heading="Onboarding prerequisites"
          id="onboarding-prereqs"
          items={diagnostics.diagnostics.onboardingMissing}
          tone="warning"
        />
      ) : null}

      {diagnostics.diagnostics.optionalMissing.length > 0 ? (
        <MissingFilesList
          heading="Optional workspace surfaces"
          id="optional-surfaces"
          items={diagnostics.diagnostics.optionalMissing}
          tone="info"
        />
      ) : null}

      <details style={cardStyle}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          Prompt sources ({promptContract.sources.length})
        </summary>
        <ul>
          {promptContract.sources.map((source) => (
            <li key={source.key}>
              <strong>{source.label}</strong> - {source.key} - precedence {source.precedence}
            </li>
          ))}
        </ul>
      </details>

      <details style={cardStyle}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          Workflow routes ({promptContract.workflowRoutes.length})
        </summary>
        <ul>
          {promptContract.workflowRoutes.map((route) => (
            <li key={route.intent}>
              <strong>{route.intent}</strong> - <code>{route.modeRepoRelativePath}</code>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

import type { CSSProperties } from 'react';
import { MissingFilesList } from './missing-files-list';
import type { StartupPayload } from './startup-types';

type StartupStatusPanelProps = {
  diagnostics: StartupPayload;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onOpenOnboarding?: (() => void) | null;
  onRefresh: () => void;
  variant?: 'page' | 'shell';
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
  onOpenOnboarding = null,
  onRefresh,
  variant = 'page',
}: StartupStatusPanelProps) {
  const promptContract = diagnostics.diagnostics.promptContract;
  const healthBadgeStyle =
    badgeStyles[diagnostics.health.status] ?? badgeStyles.ok;
  const isShellVariant = variant === 'shell';
  const HeadingTag = isShellVariant ? 'h2' : 'h1';

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
            {isShellVariant ? 'Startup readiness detail' : 'Local bootstrap contract'}
          </p>
          <HeadingTag
            style={{
              fontSize: isShellVariant
                ? 'clamp(1.6rem, 4vw, 2.4rem)'
                : 'clamp(2rem, 5vw, 3.1rem)',
              margin: 0,
            }}
          >
            Job-Hunt startup diagnostics
          </HeadingTag>
          <p role="status" aria-live="polite" style={{ marginBottom: 0 }}>
            {diagnostics.message}
          </p>
          <p style={{ color: '#475569', marginBottom: 0 }}>
            Last refreshed: {formatTimestamp(lastUpdatedAt)}
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}
        >
          {onOpenOnboarding &&
          (diagnostics.health.missing.onboarding > 0 ||
            diagnostics.status === 'missing-prerequisites') ? (
            <button
              aria-label="Open the onboarding wizard"
              onClick={onOpenOnboarding}
              style={{
                ...buttonStyle,
                background: '#ea580c',
              }}
              type="button"
            >
              {isShellVariant ? 'Open onboarding' : 'Review onboarding'}
            </button>
          ) : null}
          <button
            aria-label="Refresh startup diagnostics"
            type="button"
            disabled={isRefreshing}
            onClick={onRefresh}
            style={{
              ...buttonStyle,
              opacity: isRefreshing ? 0.7 : 1,
            }}
          >
            {isRefreshing
              ? 'Refreshing diagnostics...'
              : isShellVariant
                ? 'Refresh readiness detail'
                : 'Refresh diagnostics'}
          </button>
        </div>
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
            Exists on disk:{' '}
            <strong>{String(diagnostics.appStateRoot.exists)}</strong>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Mutation policy: <strong>{diagnostics.mutationPolicy}</strong>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Store status: <strong>{diagnostics.operationalStore.status}</strong>
          </p>
          <p style={{ marginBottom: '0.4rem' }}>
            Store path: <code>{diagnostics.operationalStore.databasePath}</code>
          </p>
          <p style={{ marginBottom: 0 }}>
            Writable roots:{' '}
            <code>
              {diagnostics.diagnostics.workspace.writableRoots.join(', ')}
            </code>
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

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Operational store</h2>
        <p style={{ marginBottom: '0.4rem' }}>
          Health summary:{' '}
          <strong>{diagnostics.health.operationalStore.status}</strong>
        </p>
        <p style={{ marginBottom: '0.4rem' }}>
          {diagnostics.operationalStore.message}
        </p>
        <p style={{ marginBottom: 0 }}>
          Root path: <code>{diagnostics.operationalStore.rootPath}</code>
        </p>
      </section>

      {diagnostics.health.missing.onboarding > 0 && onOpenOnboarding ? (
        <section
          style={{
            ...cardStyle,
            background: '#fff7ed',
            borderColor: '#fed7aa',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Onboarding handoff</h2>
          <p style={{ marginBottom: '0.45rem' }}>
            Required user-layer files are still missing. Use the onboarding
            wizard to preview template-backed repairs, confirm writes
            explicitly, and then refresh readiness from the live repo state.
          </p>
          <p style={{ color: '#7c2d12', marginBottom: 0 }}>
            After a repair, refresh startup diagnostics so the shell status and
            missing-file counts stay aligned.
          </p>
        </section>
      ) : null}

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
              <strong>{source.label}</strong> - {source.key} - precedence{' '}
              {source.precedence}
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
              <strong>{route.intent}</strong> -{' '}
              <code>{route.modeRepoRelativePath}</code>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

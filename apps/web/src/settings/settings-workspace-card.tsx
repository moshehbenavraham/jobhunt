import type { CSSProperties } from 'react';
import type {
  SettingsSummaryPayload,
  SettingsViewStatus,
} from './settings-types';

type SettingsWorkspaceCardProps = {
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

function getEmptyCopy(status: SettingsViewStatus): string {
  switch (status) {
    case 'loading':
      return 'Resolving repo, app-state, and current-session paths from the API.';
    case 'offline':
      return 'The settings API is offline, so workspace context cannot refresh.';
    case 'error':
      return 'The latest settings request failed before workspace context could refresh.';
    default:
      return 'Open the settings surface to inspect the repo and app-state paths.';
  }
}

export function SettingsWorkspaceCard({
  summary,
  status,
}: SettingsWorkspaceCardProps) {
  if (!summary) {
    return (
      <section aria-labelledby="settings-workspace-title" style={cardStyle}>
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
            Workspace
          </p>
          <h2 id="settings-workspace-title" style={{ marginBottom: '0.35rem' }}>
            Repo and session paths
          </h2>
          <p style={{ marginBottom: 0 }}>{getEmptyCopy(status)}</p>
        </header>
      </section>
    );
  }

  const sessionWorkspace = summary.workspace.currentSession;

  return (
    <section aria-labelledby="settings-workspace-title" style={cardStyle}>
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
          Workspace
        </p>
        <h2 id="settings-workspace-title" style={{ marginBottom: '0.35rem' }}>
          Repo and session paths
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>
          The browser stays read-only while the API reports the repo, app-state,
          and spec-session paths it owns.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gap: '0.8rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
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
            Repo root
          </p>
          <p style={{ margin: 0 }}>
            <code>{summary.workspace.repoRoot}</code>
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
          <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
            App-state root
          </p>
          <p style={{ margin: 0 }}>
            <code>{summary.workspace.appStateRootPath}</code>
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
          <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
            Current spec session
          </p>
          <p style={{ margin: 0 }}>{summary.currentSession.id}</p>
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
            Phase / package
          </p>
          <p style={{ margin: 0 }}>
            {summary.currentSession.phase !== null
              ? `Phase ${summary.currentSession.phase}`
              : 'No phase in state file'}
          </p>
          <p style={{ color: '#475569', marginBottom: 0, marginTop: '0.35rem' }}>
            {summary.currentSession.packagePath ?? 'Cross-cutting or unresolved'}
          </p>
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
          <strong>Spec directory</strong>
        </p>
        <code>{sessionWorkspace.specDirectoryPath}</code>
        <p style={{ marginBottom: 0, marginTop: '0.35rem' }}>
          <strong>Resolved package path</strong>
        </p>
        <code>{sessionWorkspace.packageAbsolutePath ?? 'No package path resolved'}</code>
      </section>

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
          <strong>Owned paths</strong>
        </p>
        <p style={{ margin: 0 }}>
          API package: <code>{summary.workspace.apiPackagePath}</code>
        </p>
        <p style={{ margin: 0 }}>
          Web package: <code>{summary.workspace.webPackagePath}</code>
        </p>
        <p style={{ margin: 0 }}>
          Spec system: <code>{summary.workspace.specSystemPath}</code>
        </p>
        <p style={{ marginBottom: 0, marginTop: '0.35rem' }}>
          Data contract: <code>{summary.workspace.dataContractPath}</code>
        </p>
      </section>

      <div
        style={{
          display: 'grid',
          gap: '0.8rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
        }}
      >
        <section
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.9rem',
          }}
        >
          <p style={{ marginBottom: '0.35rem', marginTop: 0 }}>
            <strong>Writable roots</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {summary.workspace.writableRoots.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
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
            <strong>Protected owners</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {summary.workspace.protectedOwners.map((owner) => (
              <li key={owner}>{owner}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

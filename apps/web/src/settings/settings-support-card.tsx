import type { CSSProperties } from 'react';
import type {
  SettingsSummaryPayload,
  SettingsViewStatus,
} from './settings-types';

type SettingsSupportCardProps = {
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
      return 'Reading prompt coverage, specialist routes, and tool catalog previews from the API.';
    case 'offline':
      return 'The settings API is offline, so prompt and tool coverage cannot refresh.';
    case 'error':
      return 'The latest settings request failed before support coverage could refresh.';
    default:
      return 'Open the settings surface to inspect prompt and tool support.';
  }
}

export function SettingsSupportCard({
  summary,
  status,
}: SettingsSupportCardProps) {
  if (!summary) {
    return (
      <section aria-labelledby="settings-support-title" style={cardStyle}>
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
            Support
          </p>
          <h2 id="settings-support-title" style={{ marginBottom: '0.35rem' }}>
            Prompt and tool coverage
          </h2>
          <p style={{ marginBottom: 0 }}>{getEmptyCopy(status)}</p>
        </header>
      </section>
    );
  }

  return (
    <section aria-labelledby="settings-support-title" style={cardStyle}>
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
          Support
        </p>
        <h2 id="settings-support-title" style={{ marginBottom: '0.35rem' }}>
          Prompt and tool coverage
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>
          Settings shows bounded previews only: source order, routed workflows,
          and a small deterministic slice of the typed tool catalog.
        </p>
      </header>

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
          <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
            Prompt cache
          </p>
          <p style={{ margin: 0 }}>{summary.support.prompt.cacheMode}</p>
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
            Prompt sources
          </p>
          <p style={{ margin: 0 }}>{summary.support.prompt.sources.length}</p>
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
            Supported workflows
          </p>
          <p style={{ margin: 0 }}>{summary.support.prompt.supportedWorkflowCount}</p>
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
            Tool preview
          </p>
          <p style={{ margin: 0 }}>
            {summary.support.tools.tools.length} / {summary.support.tools.totalCount}
          </p>
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
        <p style={{ marginBottom: '0.35rem', marginTop: 0 }}>
          <strong>Source order</strong>
        </p>
        <p style={{ margin: 0 }}>
          <code>{summary.support.prompt.sourceOrder.join(' -> ')}</code>
        </p>
      </section>

      <div
        style={{
          display: 'grid',
          gap: '0.8rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
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
            <strong>Prompt sources</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {summary.support.prompt.sources.map((source) => (
              <li key={source.key}>
                <strong>{source.label}</strong>{' '}
                <span style={{ color: '#475569' }}>
                  ({source.key}, {source.role}, {source.optional ? 'optional' : 'required'})
                </span>
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
            <strong>Workflow preview</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {summary.support.workflows.workflows.map((workflow) => (
              <li key={workflow.intent} style={{ marginBottom: '0.5rem' }}>
                <strong>{workflow.intent}</strong>{' '}
                <span style={{ color: '#475569' }}>({workflow.status})</span>
                <div style={{ color: '#475569' }}>{workflow.message}</div>
                <div style={{ color: '#475569' }}>
                  Mode: <code>{workflow.modeRepoRelativePath}</code>{' '}
                  {workflow.modeExists ? 'present' : 'missing'}
                </div>
                {workflow.toolPreview.length > 0 ? (
                  <div style={{ color: '#475569' }}>
                    Tools: <code>{workflow.toolPreview.join(', ')}</code>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
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
          <strong>Typed tool preview</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {summary.support.tools.tools.map((tool) => (
            <li key={tool.name} style={{ marginBottom: '0.5rem' }}>
              <strong>{tool.name}</strong>{' '}
              <span style={{ color: '#475569' }}>
                ({tool.requiresApproval ? 'approval required' : 'no approval'})
              </span>
              <div style={{ color: '#475569' }}>{tool.description}</div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

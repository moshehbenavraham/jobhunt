import type { CSSProperties } from 'react';
import type {
  ChatConsoleViewStatus,
  ChatConsolePendingAction,
} from './use-chat-console';
import type {
  ChatConsoleWorkflowIntent,
  ChatConsoleWorkflowOption,
} from './chat-console-types';

type WorkflowComposerProps = {
  draftInput: string;
  onDraftInputChange: (value: string) => void;
  onLaunch: () => void;
  onWorkflowChange: (workflow: ChatConsoleWorkflowIntent) => void;
  pendingAction: ChatConsolePendingAction;
  selectedWorkflow: ChatConsoleWorkflowIntent;
  startupMessage: string;
  status: ChatConsoleViewStatus;
  workflowOptions: ChatConsoleWorkflowOption[];
};

const panelStyle: CSSProperties = {
  background:
    'linear-gradient(140deg, rgba(255, 247, 237, 0.96) 0%, rgba(255, 255, 255, 0.98) 48%, rgba(224, 242, 254, 0.86) 100%)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.4rem',
  display: 'grid',
  gap: '1rem',
  padding: '1.15rem',
};

const inputStyle: CSSProperties = {
  appearance: 'none',
  background: 'rgba(255, 255, 255, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.32)',
  borderRadius: '1rem',
  color: '#0f172a',
  font: 'inherit',
  padding: '0.8rem 0.95rem',
  width: '100%',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '8.5rem',
  resize: 'vertical',
};

const buttonStyle: CSSProperties = {
  background: '#0f172a',
  border: 0,
  borderRadius: '999px',
  color: '#f8fafc',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 700,
  minHeight: '2.9rem',
  padding: '0.7rem 1.1rem',
};

function getStartupNotice(status: ChatConsoleViewStatus): {
  background: string;
  borderColor: string;
  title: string;
} | null {
  switch (status) {
    case 'auth-required':
    case 'expired-auth':
    case 'invalid-auth':
    case 'prompt-failure':
      return {
        background: '#dbeafe',
        borderColor: '#bfdbfe',
        title: 'Runtime attention required',
      };
    case 'missing-prerequisites':
      return {
        background: '#ffedd5',
        borderColor: '#fdba74',
        title: 'Setup still needs attention',
      };
    case 'runtime-error':
    case 'error':
      return {
        background: '#fee2e2',
        borderColor: '#fecaca',
        title: 'Console launch is blocked',
      };
    case 'offline':
      return {
        background: '#e2e8f0',
        borderColor: '#cbd5e1',
        title: 'API currently offline',
      };
    default:
      return null;
  }
}

export function WorkflowComposer({
  draftInput,
  onDraftInputChange,
  onLaunch,
  onWorkflowChange,
  pendingAction,
  selectedWorkflow,
  startupMessage,
  status,
  workflowOptions,
}: WorkflowComposerProps) {
  const selectedOption =
    workflowOptions.find((option) => option.intent === selectedWorkflow) ?? null;
  const startupNotice = getStartupNotice(status);
  const isLaunching =
    pendingAction?.kind === 'launch' &&
    pendingAction.workflow === selectedWorkflow;

  return (
    <section aria-labelledby="chat-console-composer-title" style={panelStyle}>
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
          Run composer
        </p>
        <h2 id="chat-console-composer-title" style={{ marginBottom: '0.4rem' }}>
          Launch a supported workflow
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>
          Paste a JD block, ATS URL, or short instruction. The backend keeps
          workflow routing, tooling readiness, and session ownership
          deterministic.
        </p>
      </header>

      {startupNotice ? (
        <section
          style={{
            background: startupNotice.background,
            border: `1px solid ${startupNotice.borderColor}`,
            borderRadius: '1rem',
            padding: '0.9rem 1rem',
          }}
        >
          <h3 style={{ marginBottom: '0.35rem', marginTop: 0 }}>
            {startupNotice.title}
          </h3>
          <p style={{ margin: 0 }}>{startupMessage}</p>
        </section>
      ) : null}

      <div
        style={{
          display: 'grid',
          gap: '0.85rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
        }}
      >
        <label style={{ display: 'grid', gap: '0.45rem' }}>
          <span style={{ fontWeight: 700 }}>Workflow</span>
          <select
            aria-label="Select workflow"
            onChange={(event) =>
              onWorkflowChange(event.currentTarget.value as ChatConsoleWorkflowIntent)
            }
            style={inputStyle}
            value={selectedWorkflow}
          >
            {workflowOptions.map((option) => (
              <option key={option.intent} value={option.intent}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div
          aria-live="polite"
          style={{
            background: 'rgba(15, 23, 42, 0.05)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            borderRadius: '1rem',
            padding: '0.8rem 0.95rem',
          }}
        >
          <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
            Preflight
          </p>
          <p style={{ fontWeight: 700, marginBottom: '0.3rem', marginTop: 0 }}>
            {selectedOption?.label ?? 'Workflow selection required'}
          </p>
          <p style={{ color: '#475569', marginBottom: 0, marginTop: 0 }}>
            {selectedOption?.message ?? startupMessage}
          </p>
        </div>
      </div>

      {selectedOption?.missingCapabilities.length ? (
        <section
          style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '1rem',
            padding: '0.8rem 0.95rem',
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: '0.3rem', marginTop: 0 }}>
            Tooling gap
          </p>
          <p style={{ margin: 0 }}>
            Missing capabilities: {selectedOption.missingCapabilities.join(', ')}
          </p>
        </section>
      ) : null}

      <label style={{ display: 'grid', gap: '0.45rem' }}>
        <span style={{ fontWeight: 700 }}>Request input</span>
        <textarea
          aria-label="Workflow request input"
          onChange={(event) => onDraftInputChange(event.currentTarget.value)}
          placeholder="Paste a job description, ATS URL, or short request context for the workflow."
          style={textareaStyle}
          value={draftInput}
        />
      </label>

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.85rem',
          justifyContent: 'space-between',
        }}
      >
        <p style={{ color: '#64748b', margin: 0 }}>
          The launch route is single-shot. If the run is already in progress,
          use the recent-session resume controls instead of double-submitting.
        </p>
        <button
          aria-label={`Launch ${selectedOption?.label ?? 'workflow'}`}
          disabled={pendingAction !== null || status === 'loading'}
          onClick={onLaunch}
          style={{
            ...buttonStyle,
            opacity: pendingAction !== null || status === 'loading' ? 0.7 : 1,
          }}
          type="button"
        >
          {isLaunching ? 'Launching...' : 'Launch workflow'}
        </button>
      </div>
    </section>
  );
}

import type { CSSProperties } from 'react';
import type { OnboardingSummaryPayload } from './onboarding-types';
import type { OnboardingWizardViewStatus } from './use-onboarding-wizard';

type OnboardingChecklistProps = {
  checklist: OnboardingSummaryPayload['checklist'] | null;
  message: string;
  status: OnboardingWizardViewStatus;
};

const panelStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
};

const stateCardStyle: CSSProperties = {
  background: 'rgba(248, 250, 252, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: '1.25rem',
  padding: '1rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const toneStyles: Record<'critical' | 'info' | 'warning', CSSProperties> = {
  critical: {
    background: '#fef2f2',
    borderColor: '#fecaca',
  },
  info: {
    background: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  warning: {
    background: '#fff7ed',
    borderColor: '#fed7aa',
  },
};

function getEmptyStateCopy(
  status: OnboardingWizardViewStatus,
  message: string,
) {
  switch (status) {
    case 'loading':
      return {
        body: 'Reading the backend-owned onboarding checklist and repair preview.',
        title: 'Loading onboarding checklist',
      };
    case 'offline':
      return {
        body: message,
        title: 'Onboarding API unavailable',
      };
    case 'error':
      return {
        body: message,
        title: 'Onboarding checklist failed',
      };
    default:
      return {
        body: message,
        title: 'Onboarding checklist not loaded yet',
      };
  }
}

function ChecklistGroup(props: {
  emptyCopy: string;
  heading: string;
  items: OnboardingSummaryPayload['checklist']['required'];
  tone: 'critical' | 'info' | 'warning';
}) {
  return (
    <section
      aria-labelledby={`onboarding-checklist-${props.heading.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        ...stateCardStyle,
        ...toneStyles[props.tone],
      }}
    >
      <h3
        id={`onboarding-checklist-${props.heading.toLowerCase().replace(/\s+/g, '-')}`}
        style={{ marginTop: 0 }}
      >
        {props.heading}
      </h3>
      {props.items.length === 0 ? (
        <p style={{ marginBottom: 0 }}>{props.emptyCopy}</p>
      ) : (
        <ul style={listStyle}>
          {props.items.map((item) => (
            <li
              key={`${props.heading}:${item.surfaceKey}`}
              style={{
                background: 'rgba(255, 255, 255, 0.86)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '1rem',
                padding: '0.85rem 0.9rem',
              }}
            >
              <p style={{ marginBottom: '0.3rem', marginTop: 0 }}>
                <strong>{item.description}</strong>
              </p>
              <p style={{ color: '#475569', margin: 0 }}>
                <code>{item.canonicalRepoRelativePath}</code>
              </p>
              <p style={{ color: '#64748b', marginBottom: 0 }}>
                Owner: {item.owner}. Candidates: {item.candidates.join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function OnboardingChecklist({
  checklist,
  message,
  status,
}: OnboardingChecklistProps) {
  if (!checklist) {
    const copy = getEmptyStateCopy(status, message);

    return (
      <section aria-labelledby="onboarding-checklist-title" style={panelStyle}>
        <header style={stateCardStyle}>
          <p
            style={{
              color: '#9a3412',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem',
              marginTop: 0,
              textTransform: 'uppercase',
            }}
          >
            Checklist
          </p>
          <h2
            id="onboarding-checklist-title"
            style={{ marginBottom: '0.35rem' }}
          >
            {copy.title}
          </h2>
          <p style={{ marginBottom: 0 }}>{copy.body}</p>
        </header>
      </section>
    );
  }

  return (
    <section aria-labelledby="onboarding-checklist-title" style={panelStyle}>
      <header style={stateCardStyle}>
        <p
          style={{
            color: '#9a3412',
            letterSpacing: '0.08em',
            marginBottom: '0.35rem',
            marginTop: 0,
            textTransform: 'uppercase',
          }}
        >
          Checklist
        </p>
        <h2 id="onboarding-checklist-title" style={{ marginBottom: '0.35rem' }}>
          Startup checklist and repair scope
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>{message}</p>
      </header>

      <div style={gridStyle}>
        <ChecklistGroup
          emptyCopy="Required onboarding files are already present."
          heading="Required files"
          items={checklist.required}
          tone="warning"
        />
        <ChecklistGroup
          emptyCopy="No optional starter files are missing right now."
          heading="Optional starters"
          items={checklist.optional}
          tone="info"
        />
        <ChecklistGroup
          emptyCopy="No runtime blockers are currently missing."
          heading="Runtime blockers"
          items={checklist.runtime}
          tone="critical"
        />
      </div>
    </section>
  );
}

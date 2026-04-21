import type { CSSProperties } from 'react';
import type {
  OnboardingRepairPreviewItem,
  OnboardingRepairTarget,
} from './onboarding-types';
import type {
  OnboardingPendingAction,
  OnboardingWizardViewStatus,
} from './use-onboarding-wizard';

type RepairPreviewListProps = {
  items: OnboardingRepairPreviewItem[] | null;
  message: string;
  pendingAction: OnboardingPendingAction;
  selectedTargets: readonly OnboardingRepairTarget[];
  status: OnboardingWizardViewStatus;
  toggleTarget: (target: OnboardingRepairTarget) => void;
};

const sectionStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
};

const cardStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.3rem',
  padding: '1rem',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: '0.85rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const badgeStyles: Record<
  OnboardingRepairPreviewItem['reason'],
  CSSProperties
> = {
  'already-present': {
    background: '#e2e8f0',
    color: '#334155',
  },
  ready: {
    background: '#dcfce7',
    color: '#166534',
  },
  'template-missing': {
    background: '#fee2e2',
    color: '#991b1b',
  },
};

function getStateCopy(status: OnboardingWizardViewStatus, message: string) {
  switch (status) {
    case 'loading':
      return {
        body: 'Reading template-backed repair previews from the API.',
        title: 'Loading repair preview',
      };
    case 'offline':
      return {
        body: message,
        title: 'Repair preview offline',
      };
    case 'error':
      return {
        body: message,
        title: 'Repair preview failed',
      };
    default:
      return {
        body: message,
        title: 'Repair preview not loaded yet',
      };
  }
}

function getReasonCopy(reason: OnboardingRepairPreviewItem['reason']): string {
  switch (reason) {
    case 'already-present':
      return 'This target already exists, so the repair route will not overwrite it.';
    case 'ready':
      return 'A checked-in template is available and the destination file is still missing.';
    case 'template-missing':
      return 'The destination is missing, but the checked-in template source is unavailable.';
  }
}

export function RepairPreviewList({
  items,
  message,
  pendingAction,
  selectedTargets,
  status,
  toggleTarget,
}: RepairPreviewListProps) {
  if (!items) {
    const copy = getStateCopy(status, message);

    return (
      <section aria-labelledby="repair-preview-title" style={sectionStyle}>
        <header style={cardStyle}>
          <p
            style={{
              color: '#9a3412',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem',
              marginTop: 0,
              textTransform: 'uppercase',
            }}
          >
            Repair preview
          </p>
          <h2 id="repair-preview-title" style={{ marginBottom: '0.35rem' }}>
            {copy.title}
          </h2>
          <p style={{ marginBottom: 0 }}>{copy.body}</p>
        </header>
      </section>
    );
  }

  return (
    <section aria-labelledby="repair-preview-title" style={sectionStyle}>
      <header style={cardStyle}>
        <p
          style={{
            color: '#9a3412',
            letterSpacing: '0.08em',
            marginBottom: '0.35rem',
            marginTop: 0,
            textTransform: 'uppercase',
          }}
        >
          Repair preview
        </p>
        <h2 id="repair-preview-title" style={{ marginBottom: '0.35rem' }}>
          Template-backed repair targets
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>{message}</p>
      </header>

      {items.length === 0 ? (
        <section style={cardStyle}>
          <p style={{ marginBottom: 0 }}>
            No onboarding repair targets are registered for this workspace.
          </p>
        </section>
      ) : (
        <ul style={listStyle}>
          {items.map((item) => {
            const isSelected = selectedTargets.includes(item.destination.surfaceKey);
            const canSelect = item.reason === 'ready';

            return (
              <li key={item.destination.surfaceKey} style={cardStyle}>
                <div
                  style={{
                    alignItems: 'flex-start',
                    display: 'flex',
                    gap: '0.9rem',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        alignItems: 'center',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.6rem',
                        marginBottom: '0.45rem',
                      }}
                    >
                      <strong>{item.description}</strong>
                      <span
                        style={{
                          ...badgeStyles[item.reason],
                          borderRadius: '999px',
                          display: 'inline-block',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          padding: '0.18rem 0.55rem',
                        }}
                      >
                        {item.reason}
                      </span>
                    </div>
                    <p style={{ color: '#475569', marginBottom: '0.3rem', marginTop: 0 }}>
                      Destination:{' '}
                      <code>{item.destination.canonicalRepoRelativePath}</code>
                    </p>
                    <p style={{ color: '#475569', marginBottom: '0.3rem', marginTop: 0 }}>
                      Template:{' '}
                      <code>{item.source.repoRelativePath ?? item.source.surfaceKey}</code>
                    </p>
                    <p style={{ color: '#64748b', marginBottom: 0, marginTop: 0 }}>
                      {getReasonCopy(item.reason)}
                    </p>
                  </div>

                  <label
                    style={{
                      alignItems: 'center',
                      display: 'inline-flex',
                      gap: '0.45rem',
                      opacity: canSelect ? 1 : 0.55,
                    }}
                  >
                    <input
                      aria-label={`Select repair target ${item.destination.surfaceKey}`}
                      checked={isSelected}
                      disabled={!canSelect || pendingAction !== null}
                      onChange={() => toggleTarget(item.destination.surfaceKey)}
                      type="checkbox"
                    />
                    <span>{canSelect ? 'Repair' : 'Locked'}</span>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

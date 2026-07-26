import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import type { OnboardingClientError } from './onboarding-client';
import type {
  OnboardingRepairPayload,
  OnboardingRepairTarget,
} from './onboarding-types';
import type {
  OnboardingPendingAction,
  OnboardingWizardViewStatus,
} from './use-onboarding-wizard';

type RepairConfirmationPanelProps = {
  error: OnboardingClientError | null;
  lastRepair: OnboardingRepairPayload | null;
  pendingAction: OnboardingPendingAction;
  readyTargetCount: number;
  selectedTargets: readonly OnboardingRepairTarget[];
  status: OnboardingWizardViewStatus;
  onApplyRepair: () => void;
  onClear: () => void;
  onSelectAll: () => void;
};

const cardStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.94)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.35rem',
  display: 'grid',
  gap: '1rem',
  padding: '1rem',
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const secondaryButtonStyle: CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '999px',
  color: '#0f172a',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 600,
  minHeight: '2.8rem',
  padding: '0.7rem 1rem',
};

const primaryButtonStyle: CSSProperties = {
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

function getStateCopy(status: OnboardingWizardViewStatus) {
  switch (status) {
    case 'loading':
      return 'Waiting for the repair preview before enabling confirmation.';
    case 'offline':
      return 'The onboarding API is offline, so repair submission is disabled until the summary reloads.';
    case 'error':
      return 'The last onboarding request failed. Fix the error before submitting repairs.';
    default:
      return 'Select one or more ready targets, then confirm the repair explicitly.';
  }
}

export function RepairConfirmationPanel({
  error,
  lastRepair,
  pendingAction,
  readyTargetCount,
  selectedTargets,
  status,
  onApplyRepair,
  onClear,
  onSelectAll,
}: RepairConfirmationPanelProps) {
  const statusRef = useRef<HTMLDivElement | null>(null);
  const canSubmit =
    pendingAction === null &&
    readyTargetCount > 0 &&
    selectedTargets.length > 0 &&
    status !== 'loading';

  useEffect(() => {
    if (!statusRef.current) {
      return;
    }

    if (pendingAction || lastRepair || error) {
      statusRef.current.focus();
    }
  }, [pendingAction, lastRepair, error]);

  return (
    <section aria-labelledby="repair-confirmation-title" style={cardStyle}>
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
          Confirmation
        </p>
        <h2 id="repair-confirmation-title" style={{ marginBottom: '0.35rem' }}>
          Explicit repair confirmation
        </h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>
          {getStateCopy(status)}
        </p>
      </header>

      <div
        aria-live="polite"
        ref={statusRef}
        style={{
          background:
            pendingAction !== null
              ? '#ffedd5'
              : error
                ? '#fee2e2'
                : lastRepair
                  ? '#dcfce7'
                  : '#f8fafc',
          border:
            pendingAction !== null
              ? '1px solid #fdba74'
              : error
                ? '1px solid #fecaca'
                : lastRepair
                  ? '1px solid #bbf7d0'
                  : '1px solid #e2e8f0',
          borderRadius: '1rem',
          outline: 'none',
          padding: '0.85rem 0.95rem',
        }}
        tabIndex={-1}
      >
        {pendingAction ? (
          <p style={{ margin: 0 }}>
            Repairing {pendingAction.targets.length} target
            {pendingAction.targets.length === 1 ? '' : 's'}:{' '}
            {pendingAction.targets.join(', ')}
          </p>
        ) : error ? (
          <p style={{ margin: 0 }}>{error.message}</p>
        ) : lastRepair ? (
          <p style={{ margin: 0 }}>{lastRepair.message}</p>
        ) : (
          <p style={{ margin: 0 }}>
            {selectedTargets.length === 0
              ? 'No repair targets selected yet.'
              : `Selected targets: ${selectedTargets.join(', ')}`}
          </p>
        )}
      </div>

      <div>
        <p style={{ color: '#64748b', marginBottom: '0.35rem', marginTop: 0 }}>
          Ready targets: {readyTargetCount}. Selected: {selectedTargets.length}.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          {selectedTargets.length === 0 ? (
            <span style={{ color: '#94a3b8' }}>
              Select targets from the preview list.
            </span>
          ) : (
            selectedTargets.map((target) => (
              <span
                key={target}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '999px',
                  color: '#1d4ed8',
                  display: 'inline-block',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  padding: '0.22rem 0.6rem',
                }}
              >
                {target}
              </span>
            ))
          )}
        </div>
      </div>

      <div style={buttonRowStyle}>
        <button
          aria-label="Select all ready onboarding repair targets"
          disabled={pendingAction !== null || readyTargetCount === 0}
          onClick={onSelectAll}
          style={{
            ...secondaryButtonStyle,
            opacity: pendingAction !== null || readyTargetCount === 0 ? 0.6 : 1,
          }}
          type="button"
        >
          Select all ready
        </button>
        <button
          aria-label="Clear selected onboarding repair targets"
          disabled={pendingAction !== null || selectedTargets.length === 0}
          onClick={onClear}
          style={{
            ...secondaryButtonStyle,
            opacity:
              pendingAction !== null || selectedTargets.length === 0 ? 0.6 : 1,
          }}
          type="button"
        >
          Clear selection
        </button>
        <button
          aria-label="Confirm onboarding repair for the selected targets"
          disabled={!canSubmit}
          onClick={onApplyRepair}
          style={{
            ...primaryButtonStyle,
            opacity: canSubmit ? 1 : 0.6,
          }}
          type="button"
        >
          {pendingAction !== null
            ? 'Repairing...'
            : `Repair ${selectedTargets.length || 0} selected target${
                selectedTargets.length === 1 ? '' : 's'
              }`}
        </button>
      </div>
    </section>
  );
}

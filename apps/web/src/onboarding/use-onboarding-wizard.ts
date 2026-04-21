import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import {
  fetchOnboardingSummary,
  OnboardingClientError,
  submitOnboardingRepair,
} from './onboarding-client';
import type {
  OnboardingRepairPayload,
  OnboardingRepairTarget,
  OnboardingSummaryPayload,
} from './onboarding-types';
import type { StartupStatus } from '../boot/startup-types';

export type OnboardingWizardViewStatus =
  | 'empty'
  | 'error'
  | 'loading'
  | 'offline'
  | StartupStatus;

export type OnboardingPendingAction = {
  kind: 'repair';
  targets: OnboardingRepairTarget[];
} | null;

export type OnboardingWizardState = {
  data: OnboardingSummaryPayload | null;
  error: OnboardingClientError | null;
  isRefreshing: boolean;
  lastRepair: OnboardingRepairPayload | null;
  lastUpdatedAt: string | null;
  pendingAction: OnboardingPendingAction;
  selectedTargets: OnboardingRepairTarget[];
  status: OnboardingWizardViewStatus;
};

function createEmptyState(): OnboardingWizardState {
  return {
    data: null,
    error: null,
    isRefreshing: false,
    lastRepair: null,
    lastUpdatedAt: null,
    pendingAction: null,
    selectedTargets: [],
    status: 'empty',
  };
}

function toOnboardingClientError(error: unknown): OnboardingClientError {
  if (error instanceof OnboardingClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new OnboardingClientError({
    cause: error,
    code: 'unknown-client-error',
    message,
    state: 'error',
  });
}

function reconcileSelectedTargets(
  summary: OnboardingSummaryPayload,
  selectedTargets: readonly OnboardingRepairTarget[],
): OnboardingRepairTarget[] {
  const readyTargetSet = new Set(summary.repairPreview.readyTargets);
  const retainedTargets = selectedTargets.filter((target) =>
    readyTargetSet.has(target),
  );

  if (retainedTargets.length > 0) {
    return retainedTargets;
  }

  return [...summary.repairPreview.readyTargets];
}

export function useOnboardingWizard(options: {
  onRepairApplied?: () => void;
} = {}) {
  const summaryAbortRef = useRef<AbortController | null>(null);
  const summaryRequestIdRef = useRef(0);
  const repairAbortRef = useRef<AbortController | null>(null);
  const repairInFlightRef = useRef(false);
  const repairRequestIdRef = useRef(0);
  const [state, setState] = useState<OnboardingWizardState>(createEmptyState);

  const loadSummary = useEffectEvent(
    async (reason: 'mount' | 'refresh' | 'repair') => {
      summaryRequestIdRef.current += 1;
      const requestId = summaryRequestIdRef.current;

      summaryAbortRef.current?.abort();
      const controller = new AbortController();
      summaryAbortRef.current = controller;

      startTransition(() => {
        setState((previous) => {
          if ((reason === 'refresh' || reason === 'repair') && previous.data) {
            return {
              ...previous,
              error: null,
              isRefreshing: true,
            };
          }

          return {
            ...previous,
            error: null,
            isRefreshing: false,
            status: 'loading',
          };
        });
      });

      try {
        const payload = await fetchOnboardingSummary({
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestId !== summaryRequestIdRef.current) {
          return;
        }

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: payload,
            error: null,
            isRefreshing: false,
            lastUpdatedAt: new Date().toISOString(),
            selectedTargets: reconcileSelectedTargets(
              payload,
              previous.selectedTargets,
            ),
            status: payload.status,
          }));
        });
      } catch (error) {
        if (controller.signal.aborted || requestId !== summaryRequestIdRef.current) {
          return;
        }

        const clientError = toOnboardingClientError(error);

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: previous.data,
            error: clientError,
            isRefreshing: false,
            status: clientError.state,
          }));
        });
      }
    },
  );

  const applyRepair = useEffectEvent(async () => {
    if (
      repairInFlightRef.current ||
      state.pendingAction !== null ||
      state.selectedTargets.length === 0 ||
      state.status === 'loading'
    ) {
      return;
    }

    repairRequestIdRef.current += 1;
    const requestId = repairRequestIdRef.current;
    const selectedTargets = [...state.selectedTargets];
    repairInFlightRef.current = true;

    repairAbortRef.current?.abort();
    const controller = new AbortController();
    repairAbortRef.current = controller;

    startTransition(() => {
      setState((previous) => ({
        ...previous,
        error: null,
        lastRepair: null,
        pendingAction: {
          kind: 'repair',
          targets: selectedTargets,
        },
      }));
    });

    try {
      const payload = await submitOnboardingRepair({
        signal: controller.signal,
        targets: selectedTargets,
      });

      if (controller.signal.aborted || requestId !== repairRequestIdRef.current) {
        return;
      }

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          error: null,
          lastRepair: payload,
          pendingAction: null,
        }));
      });

      options.onRepairApplied?.();
      await loadSummary('repair');
    } catch (error) {
      if (controller.signal.aborted || requestId !== repairRequestIdRef.current) {
        return;
      }

      const clientError = toOnboardingClientError(error);

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          error: clientError,
          pendingAction: null,
          status: clientError.state,
        }));
      });
    } finally {
      if (requestId === repairRequestIdRef.current) {
        repairInFlightRef.current = false;
      }
    }
  });

  useEffect(() => {
    void loadSummary('mount');

    return () => {
      summaryRequestIdRef.current += 1;
      repairRequestIdRef.current += 1;
      repairInFlightRef.current = false;
      summaryAbortRef.current?.abort();
      repairAbortRef.current?.abort();
      summaryAbortRef.current = null;
      repairAbortRef.current = null;
    };
  }, []);

  return {
    applyRepair,
    clearSelectedTargets: () => {
      if (state.pendingAction !== null) {
        return;
      }

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          selectedTargets: [],
        }));
      });
    },
    refresh: () => {
      if (state.pendingAction !== null || state.isRefreshing || state.status === 'loading') {
        return;
      }

      void loadSummary('refresh');
    },
    selectAllReadyTargets: () => {
      if (!state.data || state.pendingAction !== null) {
        return;
      }

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          selectedTargets: [...state.data!.repairPreview.readyTargets],
        }));
      });
    },
    state,
    toggleTarget: (target: OnboardingRepairTarget) => {
      if (!state.data || state.pendingAction !== null) {
        return;
      }

      if (!state.data.repairPreview.readyTargets.includes(target)) {
        return;
      }

      startTransition(() => {
        setState((previous) => {
          const alreadySelected = previous.selectedTargets.includes(target);

          return {
            ...previous,
            selectedTargets: alreadySelected
              ? previous.selectedTargets.filter(
                  (selectedTarget) => selectedTarget !== target,
                )
              : [...previous.selectedTargets, target].sort((left, right) =>
                  left.localeCompare(right),
                ),
          };
        });
      });
    },
  };
}

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import {
  APPROVAL_FOCUS_EVENT,
  ApprovalInboxClientError,
  fetchApprovalInboxSummary,
  readApprovalInboxFocusFromUrl,
  submitApprovalResolution,
  submitApprovalResume,
  syncApprovalInboxFocus,
  type ApprovalInboxFocus,
} from './approval-inbox-client';
import type {
  ApprovalInboxSelectedDetail,
  ApprovalInboxStartupStatus,
  ApprovalInboxSummaryPayload,
} from './approval-inbox-types';

const POLL_INTERVAL_MS = 4_000;

export type ApprovalInboxViewStatus =
  | 'empty'
  | 'error'
  | 'loading'
  | 'offline'
  | ApprovalInboxStartupStatus;

export type ApprovalInboxPendingAction =
  | {
      approvalId: string;
      kind: 'approved' | 'rejected';
    }
  | {
      kind: 'resume';
      sessionId: string;
    }
  | null;

export type ApprovalInboxActionNotice = {
  kind: 'info' | 'success' | 'warn';
  message: string;
} | null;

export type ApprovalInboxState = {
  data: ApprovalInboxSummaryPayload | null;
  error: ApprovalInboxClientError | null;
  focus: ApprovalInboxFocus;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  notice: ApprovalInboxActionNotice;
  pendingAction: ApprovalInboxPendingAction;
  status: ApprovalInboxViewStatus;
};

function createEmptyState(): ApprovalInboxState {
  return {
    data: null,
    error: null,
    focus: readApprovalInboxFocusFromUrl(),
    isRefreshing: false,
    lastUpdatedAt: null,
    notice: null,
    pendingAction: null,
    status: 'empty',
  };
}

function toApprovalInboxClientError(error: unknown): ApprovalInboxClientError {
  if (error instanceof ApprovalInboxClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new ApprovalInboxClientError({
    cause: error,
    code: 'unknown-client-error',
    message,
    state: 'error',
  });
}

function createFocusFromSelected(
  selected: ApprovalInboxSelectedDetail | null,
  currentFocus: ApprovalInboxFocus,
): ApprovalInboxFocus {
  return {
    approvalId: selected?.approval?.approvalId ?? currentFocus.approvalId,
    sessionId: currentFocus.sessionId,
  };
}

function preserveSessionFilter(
  currentFocus: ApprovalInboxFocus,
  approvalId: string | null,
): ApprovalInboxFocus {
  return {
    approvalId,
    sessionId: currentFocus.sessionId,
  };
}

function hasPollingWork(summary: ApprovalInboxSummaryPayload | null): boolean {
  if (!summary) {
    return false;
  }

  return (
    summary.pendingApprovalCount > 0 ||
    summary.selected?.interruptedRun.state === 'running'
  );
}

export function useApprovalInbox(): {
  refresh: () => void;
  resolve: (decision: 'approved' | 'rejected') => void;
  selectApproval: (focus: ApprovalInboxFocus) => void;
  resume: () => void;
  state: ApprovalInboxState;
} {
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<ApprovalInboxState>(createEmptyState);

  const loadSummary = useEffectEvent(
    async (
      reason: 'decision' | 'focus' | 'mount' | 'online' | 'poll' | 'refresh' | 'resume' | 'select',
      focus: ApprovalInboxFocus = state.focus,
    ) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startTransition(() => {
        setState((previous) => {
          if ((reason === 'refresh' || reason === 'select') && previous.data) {
            return {
              ...previous,
              error: null,
              focus,
              isRefreshing: true,
              notice: reason === 'select' ? null : previous.notice,
            };
          }

          if (reason === 'poll' && previous.data) {
            return previous;
          }

          return {
            ...previous,
            error: null,
            focus,
            isRefreshing: false,
            notice:
              reason === 'focus' || reason === 'mount' || reason === 'select'
                ? null
                : previous.notice,
            status: 'loading',
          };
        });
      });

      try {
        const payload = await fetchApprovalInboxSummary({
          focus,
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        const nextFocus = createFocusFromSelected(payload.selected, focus);

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: payload,
            error: null,
            focus: nextFocus,
            isRefreshing: false,
            lastUpdatedAt: new Date().toISOString(),
            pendingAction: null,
            status: payload.status,
          }));
        });

        if (
          nextFocus.approvalId !== focus.approvalId ||
          nextFocus.sessionId !== focus.sessionId
        ) {
          syncApprovalInboxFocus(nextFocus, {
            replace: true,
          });
        }
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        const clientError = toApprovalInboxClientError(error);

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: previous.data,
            error: clientError,
            focus,
            isRefreshing: false,
            pendingAction: null,
            status: clientError.state,
          }));
        });
      }
    },
  );

  const handleFocusChange = useEffectEvent(() => {
    const nextFocus = readApprovalInboxFocusFromUrl();

    if (
      nextFocus.approvalId === state.focus.approvalId &&
      nextFocus.sessionId === state.focus.sessionId
    ) {
      return;
    }

    void loadSummary('focus', nextFocus);
  });

  const handleOnline = useEffectEvent(() => {
    if (state.status === 'offline') {
      void loadSummary('online');
    }
  });

  useEffect(() => {
    void loadSummary('mount');

    window.addEventListener(APPROVAL_FOCUS_EVENT, handleFocusChange);
    window.addEventListener('hashchange', handleFocusChange);
    window.addEventListener('popstate', handleFocusChange);
    window.addEventListener('online', handleOnline);

    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      window.removeEventListener(APPROVAL_FOCUS_EVENT, handleFocusChange);
      window.removeEventListener('hashchange', handleFocusChange);
      window.removeEventListener('popstate', handleFocusChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!hasPollingWork(state.data)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadSummary('poll');
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.data, loadSummary]);

  return {
    refresh: () => {
      if (state.isRefreshing || state.status === 'loading') {
        return;
      }

      void loadSummary('refresh');
    },
    resolve: (decision) => {
      const approval = state.data?.selected?.approval;

      if (!approval || approval.status !== 'pending' || state.pendingAction) {
        return;
      }

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          error: null,
          pendingAction: {
            approvalId: approval.approvalId,
            kind: decision,
          },
        }));
      });

      void (async () => {
        try {
          const payload = await submitApprovalResolution({
            approvalId: approval.approvalId,
            decision,
          });
          const nextFocus = preserveSessionFilter(
            state.focus,
            payload.resolution.approval.approvalId,
          );

          syncApprovalInboxFocus(nextFocus, {
            replace: true,
          });

          startTransition(() => {
            setState((previous) => ({
              ...previous,
              focus: nextFocus,
              notice: {
                kind:
                  payload.resolution.outcome === 'approved' ||
                  payload.resolution.outcome === 'already-approved'
                    ? 'success'
                    : 'warn',
                message: payload.message,
              },
            }));
          });

          await loadSummary('decision', nextFocus);
        } catch (error) {
          const clientError = toApprovalInboxClientError(error);

          startTransition(() => {
            setState((previous) => ({
              ...previous,
              error: clientError,
              pendingAction: null,
              status: clientError.state,
            }));
          });
        }
      })();
    },
    resume: () => {
      const sessionId = state.data?.selected?.interruptedRun.sessionId;

      if (
        !sessionId ||
        state.pendingAction ||
        !state.data?.selected?.interruptedRun.resumeAllowed
      ) {
        return;
      }

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          error: null,
          pendingAction: {
            kind: 'resume',
            sessionId,
          },
        }));
      });

      void (async () => {
        try {
          const payload = await submitApprovalResume({
            sessionId,
          });
          const nextFocus = preserveSessionFilter(
            state.focus,
            payload.handoff.pendingApproval?.approvalId ?? state.focus.approvalId,
          );

          syncApprovalInboxFocus(nextFocus, {
            replace: true,
          });

          startTransition(() => {
            setState((previous) => ({
              ...previous,
              focus: nextFocus,
              notice: {
                kind:
                  payload.handoff.state === 'failed' ||
                  payload.handoff.state === 'tooling-gap'
                    ? 'warn'
                    : 'info',
                message: payload.handoff.message,
              },
            }));
          });

          await loadSummary('resume', nextFocus);
        } catch (error) {
          const clientError = toApprovalInboxClientError(error);

          startTransition(() => {
            setState((previous) => ({
              ...previous,
              error: clientError,
              pendingAction: null,
              status: clientError.state,
            }));
          });
        }
      })();
    },
    selectApproval: (focus) => {
      const nextFocus = preserveSessionFilter(state.focus, focus.approvalId);

      if (
        nextFocus.approvalId === state.focus.approvalId &&
        nextFocus.sessionId === state.focus.sessionId
      ) {
        return;
      }

      syncApprovalInboxFocus(nextFocus);
      void loadSummary('select', nextFocus);
    },
    state,
  };
}

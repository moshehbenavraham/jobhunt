import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import {
  ChatConsoleClientError,
  fetchChatConsoleSummary,
  submitChatConsoleCommand,
  type ChatConsoleCommandInput,
} from './chat-console-client';
import {
  EvaluationResultClientError,
  fetchEvaluationResultSummary,
} from './evaluation-result-client';
import type {
  ChatConsoleCommandHandoff,
  ChatConsoleSessionSummary,
  ChatConsoleStartupStatus,
  ChatConsoleSummaryPayload,
  ChatConsoleWorkflowIntent,
} from './chat-console-types';
import type { EvaluationResultSummaryPayload } from './evaluation-result-types';

const POLL_INTERVAL_MS = 4_000;
const EVALUATION_PREVIEW_LIMIT = 4;

export type ChatConsoleViewStatus =
  | 'empty'
  | 'error'
  | 'loading'
  | 'offline'
  | ChatConsoleStartupStatus;

export type ChatConsoleEvaluationResultStatus =
  | 'empty'
  | 'error'
  | 'loading'
  | 'offline'
  | ChatConsoleStartupStatus;

export type ChatConsolePendingAction =
  | {
      kind: 'launch';
      sessionId: null;
      workflow: ChatConsoleWorkflowIntent;
    }
  | {
      kind: 'resume';
      sessionId: string;
      workflow: null;
    }
  | null;

export type ChatConsoleEvaluationResultState = {
  data: EvaluationResultSummaryPayload | null;
  error: EvaluationResultClientError | null;
  isRefreshing: boolean;
  status: ChatConsoleEvaluationResultStatus;
  targetSessionId: string | null;
};

export type ChatConsoleState = {
  command: ChatConsoleCommandHandoff | null;
  data: ChatConsoleSummaryPayload | null;
  draftInput: string;
  error: ChatConsoleClientError | null;
  evaluationResult: ChatConsoleEvaluationResultState;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  pendingAction: ChatConsolePendingAction;
  selectedSessionId: string | null;
  selectedWorkflow: ChatConsoleWorkflowIntent;
  status: ChatConsoleViewStatus;
};

function readSelectedSessionIdFromUrl(): string | null {
  const value = new URL(window.location.href).searchParams.get('session');
  return value?.trim() ? value.trim() : null;
}

function syncSelectedSessionId(
  sessionId: string | null,
  replace = false,
): void {
  const url = new URL(window.location.href);

  if (sessionId) {
    url.searchParams.set('session', sessionId);
  } else {
    url.searchParams.delete('session');
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) {
    return;
  }

  if (replace) {
    window.history.replaceState(null, '', nextUrl);
    return;
  }

  window.history.pushState(null, '', nextUrl);
}

function createEmptyEvaluationResultState(
  targetSessionId: string | null,
): ChatConsoleEvaluationResultState {
  return {
    data: null,
    error: null,
    isRefreshing: false,
    status: 'empty',
    targetSessionId,
  };
}

function createLoadingEvaluationResultState(
  targetSessionId: string | null,
): ChatConsoleEvaluationResultState {
  return {
    data: null,
    error: null,
    isRefreshing: false,
    status: 'loading',
    targetSessionId,
  };
}

function createEmptyState(): ChatConsoleState {
  const selectedSessionId = readSelectedSessionIdFromUrl();

  return {
    command: null,
    data: null,
    draftInput: '',
    error: null,
    evaluationResult: createEmptyEvaluationResultState(selectedSessionId),
    isRefreshing: false,
    lastUpdatedAt: null,
    pendingAction: null,
    selectedSessionId,
    selectedWorkflow: 'single-evaluation',
    status: 'empty',
  };
}

function toChatConsoleClientError(error: unknown): ChatConsoleClientError {
  if (error instanceof ChatConsoleClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new ChatConsoleClientError({
    cause: error,
    code: 'unknown-client-error',
    message,
    state: 'error',
  });
}

function toEvaluationResultClientError(
  error: unknown,
): EvaluationResultClientError {
  if (error instanceof EvaluationResultClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new EvaluationResultClientError({
    cause: error,
    code: 'unknown-client-error',
    message,
    state: 'error',
  });
}

function getCommandSessionId(
  command: ChatConsoleCommandHandoff | null,
): string | null {
  if (!command) {
    return null;
  }

  return (
    command.selectedSession?.session.sessionId ??
    command.session?.sessionId ??
    null
  );
}

function upsertRecentSession(
  sessions: ChatConsoleSessionSummary[],
  nextSession: ChatConsoleSessionSummary | null,
): ChatConsoleSessionSummary[] {
  if (!nextSession) {
    return sessions;
  }

  const merged = [
    nextSession,
    ...sessions.filter(
      (session) => session.sessionId !== nextSession.sessionId,
    ),
  ];

  return merged.sort((left, right) => {
    const updatedAtComparison = right.updatedAt.localeCompare(left.updatedAt);

    if (updatedAtComparison !== 0) {
      return updatedAtComparison;
    }

    return left.sessionId.localeCompare(right.sessionId);
  });
}

function resolveNextSelectedSessionId(
  summary: ChatConsoleSummaryPayload,
  preferredSessionId: string | null,
): string | null {
  if (
    preferredSessionId &&
    summary.selectedSession &&
    summary.selectedSession.session.sessionId === preferredSessionId
  ) {
    return preferredSessionId;
  }

  if (summary.selectedSession) {
    return summary.selectedSession.session.sessionId;
  }

  return summary.recentSessions[0]?.sessionId ?? null;
}

function resolveEvaluationTargetSessionId(
  summary: ChatConsoleSummaryPayload,
  requestedSessionId: string | null,
): string | null {
  if (requestedSessionId) {
    return requestedSessionId;
  }

  return summary.selectedSession?.session.sessionId ?? null;
}

function resolveSelectedSessionForPolling(
  summary: ChatConsoleSummaryPayload | null,
  selectedSessionId: string | null,
): ChatConsoleSessionSummary | null {
  if (!summary) {
    return null;
  }

  if (selectedSessionId) {
    return (
      summary.recentSessions.find((session) => session.sessionId === selectedSessionId) ??
      (summary.selectedSession?.session.sessionId === selectedSessionId
        ? summary.selectedSession.session
        : null)
    );
  }

  return summary.selectedSession?.session ?? summary.recentSessions[0] ?? null;
}

function hasPollingWork(input: {
  evaluationResult: EvaluationResultSummaryPayload | null;
  selectedSession: ChatConsoleSessionSummary | null;
}): boolean {
  if (
    input.selectedSession &&
    (input.selectedSession.state === 'running' ||
      input.selectedSession.state === 'waiting-for-approval')
  ) {
    return true;
  }

  const summaryState = input.evaluationResult?.summary?.state;

  return (
    summaryState === 'approval-paused' ||
    summaryState === 'pending' ||
    summaryState === 'running'
  );
}

export function useChatConsole(): {
  launch: () => void;
  refresh: () => void;
  resume: (sessionId: string) => void;
  selectSession: (sessionId: string | null) => void;
  setDraftInput: (value: string) => void;
  setSelectedWorkflow: (workflow: ChatConsoleWorkflowIntent) => void;
  state: ChatConsoleState;
} {
  const summaryAbortRef = useRef<AbortController | null>(null);
  const summaryRequestIdRef = useRef(0);
  const evaluationAbortRef = useRef<AbortController | null>(null);
  const evaluationRequestIdRef = useRef(0);
  const [state, setState] = useState<ChatConsoleState>(createEmptyState);

  const loadEvaluationResult = useEffectEvent(
    async (
      reason: 'command' | 'mount' | 'online' | 'refresh' | 'select',
      targetSessionId: string | null = state.evaluationResult.targetSessionId,
    ) => {
      evaluationRequestIdRef.current += 1;
      const requestId = evaluationRequestIdRef.current;

      evaluationAbortRef.current?.abort();
      const controller = new AbortController();
      evaluationAbortRef.current = controller;

      startTransition(() => {
        setState((previous) => {
          const targetChanged =
            previous.evaluationResult.targetSessionId !== targetSessionId;
          const canRefreshInPlace =
            !targetChanged &&
            previous.evaluationResult.data !== null &&
            (reason === 'refresh' || reason === 'online');

          if (canRefreshInPlace) {
            return {
              ...previous,
              evaluationResult: {
                ...previous.evaluationResult,
                error: null,
                isRefreshing: true,
                targetSessionId,
              },
            };
          }

          return {
            ...previous,
            evaluationResult: {
              data: targetChanged ? null : previous.evaluationResult.data,
              error: null,
              isRefreshing: false,
              status: 'loading',
              targetSessionId,
            },
          };
        });
      });

      try {
        const payload = await fetchEvaluationResultSummary({
          previewLimit: EVALUATION_PREVIEW_LIMIT,
          sessionId: targetSessionId,
          signal: controller.signal,
        });

        if (
          controller.signal.aborted ||
          requestId !== evaluationRequestIdRef.current
        ) {
          return;
        }

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            evaluationResult: {
              data: payload,
              error: null,
              isRefreshing: false,
              status: payload.status,
              targetSessionId,
            },
          }));
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== evaluationRequestIdRef.current
        ) {
          return;
        }

        const clientError = toEvaluationResultClientError(error);

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            evaluationResult: {
              data:
                previous.evaluationResult.targetSessionId === targetSessionId
                  ? previous.evaluationResult.data
                  : null,
              error: clientError,
              isRefreshing: false,
              status: clientError.state,
              targetSessionId,
            },
          }));
        });
      }
    },
  );

  const loadSummary = useEffectEvent(
    async (
      reason: 'command' | 'mount' | 'online' | 'refresh' | 'select',
      requestedSessionId: string | null = state.selectedSessionId,
    ) => {
      summaryRequestIdRef.current += 1;
      const requestId = summaryRequestIdRef.current;

      summaryAbortRef.current?.abort();
      const controller = new AbortController();
      summaryAbortRef.current = controller;

      startTransition(() => {
        setState((previous) => {
          if (
            (reason === 'refresh' ||
              reason === 'command' ||
              reason === 'select') &&
            previous.data
          ) {
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
        const payload = await fetchChatConsoleSummary({
          sessionId: requestedSessionId,
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestId !== summaryRequestIdRef.current) {
          return;
        }

        const nextSelectedSessionId = resolveNextSelectedSessionId(
          payload,
          requestedSessionId,
        );
        const nextEvaluationTargetSessionId = resolveEvaluationTargetSessionId(
          payload,
          requestedSessionId,
        );

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            command:
              getCommandSessionId(previous.command) === nextSelectedSessionId
                ? previous.command
                : null,
            data: payload,
            error: null,
            isRefreshing: false,
            lastUpdatedAt: new Date().toISOString(),
            pendingAction: null,
            selectedSessionId: nextSelectedSessionId,
            status: payload.status,
          }));
        });

        syncSelectedSessionId(nextSelectedSessionId, reason !== 'select');
        void loadEvaluationResult(reason, nextEvaluationTargetSessionId);
      } catch (error) {
        if (controller.signal.aborted || requestId !== summaryRequestIdRef.current) {
          return;
        }

        const clientError = toChatConsoleClientError(error);

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: previous.data,
            error: clientError,
            isRefreshing: false,
            lastUpdatedAt: previous.lastUpdatedAt,
            pendingAction: null,
            status: clientError.state,
          }));
        });
      }
    },
  );

  const runCommand = useEffectEvent(async (input: ChatConsoleCommandInput) => {
    if (
      state.pendingAction ||
      state.isRefreshing ||
      state.status === 'loading' ||
      state.evaluationResult.isRefreshing
    ) {
      return;
    }

    const pendingAction: ChatConsolePendingAction =
      input.kind === 'launch'
        ? {
            kind: 'launch',
            sessionId: null,
            workflow: input.workflow,
          }
        : {
            kind: 'resume',
            sessionId: input.sessionId,
            workflow: null,
          };

    startTransition(() => {
      setState((previous) => ({
        ...previous,
        error: null,
        pendingAction,
      }));
    });

    try {
      const payload = await submitChatConsoleCommand(input);
      const nextSelectedSessionId =
        payload.handoff.selectedSession?.session.sessionId ??
        payload.handoff.session?.sessionId ??
        null;

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          command: payload.handoff,
          data: previous.data
            ? {
                ...previous.data,
                recentSessions: upsertRecentSession(
                  previous.data.recentSessions,
                  payload.handoff.selectedSession?.session ??
                    payload.handoff.session,
                ),
                selectedSession:
                  payload.handoff.selectedSession ??
                  previous.data.selectedSession,
                status: payload.status,
              }
            : previous.data,
          error: null,
          evaluationResult: createLoadingEvaluationResultState(
            nextSelectedSessionId,
          ),
          pendingAction,
          selectedSessionId:
            nextSelectedSessionId ?? previous.selectedSessionId,
          status: payload.status,
        }));
      });

      syncSelectedSessionId(nextSelectedSessionId, false);
      void loadSummary('command', nextSelectedSessionId);
    } catch (error) {
      const clientError = toChatConsoleClientError(error);

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          error: clientError,
          pendingAction: null,
          status: clientError.state,
        }));
      });
    }
  });

  const handlePopState = useEffectEvent(() => {
    const nextSelectedSessionId = readSelectedSessionIdFromUrl();

    startTransition(() => {
      setState((previous) =>
        previous.selectedSessionId === nextSelectedSessionId
          ? previous
          : {
              ...previous,
              command: null,
              evaluationResult: createLoadingEvaluationResultState(
                nextSelectedSessionId,
              ),
              selectedSessionId: nextSelectedSessionId,
            },
      );
    });

    void loadSummary('select', nextSelectedSessionId);
  });

  const handleOnline = useEffectEvent(() => {
    if (
      state.status === 'offline' ||
      state.evaluationResult.status === 'offline'
    ) {
      void loadSummary('online');
    }
  });

  useEffect(() => {
    void loadSummary('mount');
    window.addEventListener('online', handleOnline);
    window.addEventListener('popstate', handlePopState);

    return () => {
      summaryRequestIdRef.current += 1;
      evaluationRequestIdRef.current += 1;
      summaryAbortRef.current?.abort();
      evaluationAbortRef.current?.abort();
      summaryAbortRef.current = null;
      evaluationAbortRef.current = null;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const selectedSession = resolveSelectedSessionForPolling(
      state.data,
      state.selectedSessionId,
    );

    if (
      !hasPollingWork({
        evaluationResult: state.evaluationResult.data,
        selectedSession,
      })
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadSummary('refresh');
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    state.data,
    state.evaluationResult.data,
    state.selectedSessionId,
  ]);

  return {
    launch: () => {
      void runCommand({
        context: state.draftInput.trim()
          ? {
              promptText: state.draftInput.trim(),
            }
          : null,
        kind: 'launch',
        sessionId: null,
        workflow: state.selectedWorkflow,
      });
    },
    refresh: () => {
      if (
        state.isRefreshing ||
        state.status === 'loading' ||
        state.evaluationResult.isRefreshing ||
        state.evaluationResult.status === 'loading'
      ) {
        return;
      }

      void loadSummary('refresh');
    },
    resume: (sessionId) => {
      if (!sessionId.trim()) {
        return;
      }

      void runCommand({
        kind: 'resume',
        sessionId,
      });
    },
    selectSession: (sessionId) => {
      startTransition(() => {
        setState((previous) => ({
          ...previous,
          command:
            getCommandSessionId(previous.command) === sessionId
              ? previous.command
              : null,
          evaluationResult: createLoadingEvaluationResultState(sessionId),
          selectedSessionId: sessionId,
        }));
      });

      syncSelectedSessionId(sessionId, false);
      void loadSummary('select', sessionId);
    },
    setDraftInput: (value) => {
      startTransition(() => {
        setState((previous) => ({
          ...previous,
          draftInput: value,
        }));
      });
    },
    setSelectedWorkflow: (workflow) => {
      startTransition(() => {
        setState((previous) => ({
          ...previous,
          selectedWorkflow: workflow,
        }));
      });
    },
    state,
  };
}

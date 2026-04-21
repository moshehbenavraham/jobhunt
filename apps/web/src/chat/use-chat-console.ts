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
import type {
  ChatConsoleCommandHandoff,
  ChatConsoleSessionSummary,
  ChatConsoleStartupStatus,
  ChatConsoleSummaryPayload,
  ChatConsoleWorkflowIntent,
} from './chat-console-types';

const POLL_INTERVAL_MS = 4_000;

export type ChatConsoleViewStatus =
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

export type ChatConsoleState = {
  command: ChatConsoleCommandHandoff | null;
  data: ChatConsoleSummaryPayload | null;
  draftInput: string;
  error: ChatConsoleClientError | null;
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

function syncSelectedSessionId(sessionId: string | null, replace = false): void {
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

function createEmptyState(): ChatConsoleState {
  return {
    command: null,
    data: null,
    draftInput: '',
    error: null,
    isRefreshing: false,
    lastUpdatedAt: null,
    pendingAction: null,
    selectedSessionId: readSelectedSessionIdFromUrl(),
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

function getCommandSessionId(command: ChatConsoleCommandHandoff | null): string | null {
  if (!command) {
    return null;
  }

  return (
    command.selectedSession?.session.sessionId ??
    command.session?.sessionId ??
    null
  );
}

function hasPollingWork(summary: ChatConsoleSummaryPayload | null): boolean {
  if (!summary) {
    return false;
  }

  return summary.recentSessions.some(
    (session) =>
      session.state === 'running' || session.state === 'waiting-for-approval',
  );
}

function upsertRecentSession(
  sessions: ChatConsoleSessionSummary[],
  nextSession: ChatConsoleSessionSummary | null,
): ChatConsoleSessionSummary[] {
  if (!nextSession) {
    return sessions;
  }

  const merged = [nextSession, ...sessions.filter((session) => session.sessionId !== nextSession.sessionId)];

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

export function useChatConsole(): {
  launch: () => void;
  refresh: () => void;
  resume: (sessionId: string) => void;
  selectSession: (sessionId: string | null) => void;
  setDraftInput: (value: string) => void;
  setSelectedWorkflow: (workflow: ChatConsoleWorkflowIntent) => void;
  state: ChatConsoleState;
} {
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<ChatConsoleState>(createEmptyState);

  const loadSummary = useEffectEvent(
    async (
      reason: 'command' | 'mount' | 'online' | 'refresh' | 'select',
      requestedSessionId: string | null = state.selectedSessionId,
    ) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

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

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        const nextSelectedSessionId = resolveNextSelectedSessionId(
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

        syncSelectedSessionId(
          nextSelectedSessionId,
          reason !== 'select',
        );
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
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
    if (state.pendingAction) {
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
                  payload.handoff.selectedSession ?? previous.data.selectedSession,
                status: payload.status,
              }
            : previous.data,
          error: null,
          pendingAction,
          selectedSessionId: nextSelectedSessionId ?? previous.selectedSessionId,
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
              selectedSessionId: nextSelectedSessionId,
            },
      );
    });

    void loadSummary('select', nextSelectedSessionId);
  });

  const handleOnline = useEffectEvent(() => {
    if (state.status === 'offline') {
      void loadSummary('online');
    }
  });

  useEffect(() => {
    void loadSummary('mount');
    window.addEventListener('online', handleOnline);
    window.addEventListener('popstate', handlePopState);

    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!hasPollingWork(state.data)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadSummary('refresh');
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.data]);

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
      if (state.isRefreshing || state.status === 'loading') {
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

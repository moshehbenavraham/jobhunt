import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import {
  StartupClientError,
  fetchStartupDiagnostics,
} from './startup-client';
import type { StartupPayload } from './startup-types';

export type StartupViewStatus =
  | 'empty'
  | 'error'
  | 'loading'
  | 'missing-prerequisites'
  | 'offline'
  | 'ready';

export type StartupDiagnosticsState = {
  data: StartupPayload | null;
  error: StartupClientError | null;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  status: StartupViewStatus;
};

const EMPTY_STATE: StartupDiagnosticsState = {
  data: null,
  error: null,
  isRefreshing: false,
  lastUpdatedAt: null,
  status: 'empty',
};

function getStatusFromPayload(payload: StartupPayload): StartupViewStatus {
  switch (payload.status) {
    case 'ready':
      return 'ready';
    case 'missing-prerequisites':
      return 'missing-prerequisites';
    case 'runtime-error':
      return 'error';
  }
}

function toStartupClientError(error: unknown): StartupClientError {
  if (error instanceof StartupClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new StartupClientError({
    cause: error,
    code: 'unknown-client-error',
    message,
    state: 'error',
  });
}

export function useStartupDiagnostics(): {
  refresh: () => void;
  state: StartupDiagnosticsState;
} {
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<StartupDiagnosticsState>(EMPTY_STATE);

  const loadDiagnostics = useEffectEvent(
    async (reason: 'mount' | 'refresh') => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startTransition(() => {
        setState((previous) => {
          if (reason === 'refresh' && previous.data) {
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
        const payload = await fetchStartupDiagnostics({
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        startTransition(() => {
          setState({
            data: payload,
            error: null,
            isRefreshing: false,
            lastUpdatedAt: new Date().toISOString(),
            status: getStatusFromPayload(payload),
          });
        });
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        const clientError = toStartupClientError(error);

        startTransition(() => {
          setState((previous) => ({
            data: previous.data,
            error: clientError,
            isRefreshing: false,
            lastUpdatedAt: previous.lastUpdatedAt,
            status: clientError.state,
          }));
        });
      }
    },
  );

  useEffect(() => {
    void loadDiagnostics('mount');

    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  return {
    refresh: () => {
      if (state.isRefreshing || state.status === 'loading') {
        return;
      }

      void loadDiagnostics('refresh');
    },
    state,
  };
}

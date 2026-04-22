import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { fetchSettingsSummary, SettingsClientError } from './settings-client';
import type {
  SettingsSummaryPayload,
  SettingsViewStatus,
} from './settings-types';

export type SettingsSurfaceState = {
  data: SettingsSummaryPayload | null;
  error: SettingsClientError | null;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  status: SettingsViewStatus;
};

const DEFAULT_TOOL_LIMIT = 6;
const DEFAULT_WORKFLOW_LIMIT = 6;

const EMPTY_STATE: SettingsSurfaceState = {
  data: null,
  error: null,
  isRefreshing: false,
  lastUpdatedAt: null,
  status: 'empty',
};

function toSettingsClientError(error: unknown): SettingsClientError {
  if (error instanceof SettingsClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new SettingsClientError({
    cause: error,
    code: 'unknown-client-error',
    message,
    state: 'error',
  });
}

export function useSettingsSurface(
  options: {
    onSummaryRefresh?: () => void;
    toolLimit?: number;
    workflowLimit?: number;
  } = {},
): {
  refresh: () => void;
  state: SettingsSurfaceState;
} {
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<SettingsSurfaceState>(EMPTY_STATE);

  const loadSummary = useEffectEvent(
    async (reason: 'mount' | 'online' | 'refresh') => {
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
        const payload = await fetchSettingsSummary({
          signal: controller.signal,
          toolLimit: options.toolLimit ?? DEFAULT_TOOL_LIMIT,
          workflowLimit: options.workflowLimit ?? DEFAULT_WORKFLOW_LIMIT,
        });

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: payload,
            error: null,
            isRefreshing: false,
            lastUpdatedAt: new Date().toISOString(),
            status: payload.status,
          }));
        });

        if (reason === 'refresh') {
          options.onSummaryRefresh?.();
        }
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        const clientError = toSettingsClientError(error);

        startTransition(() => {
          setState((previous) => ({
            ...previous,
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

  const handleOnline = useEffectEvent(() => {
    if (state.status === 'offline') {
      void loadSummary('online');
    }
  });

  useEffect(() => {
    void loadSummary('mount');
    window.addEventListener('online', handleOnline);

    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {
    refresh: () => {
      if (state.isRefreshing || state.status === 'loading') {
        return;
      }

      void loadSummary('refresh');
    },
    state,
  };
}

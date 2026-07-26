import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import type { StartupStatus } from '../boot/startup-types';
import {
  fetchPipelineReviewSummary,
  PIPELINE_REVIEW_FOCUS_EVENT,
  PipelineReviewClientError,
  readPipelineReviewFocusFromUrl,
  syncPipelineReviewFocus,
  type PipelineReviewFocus,
} from './pipeline-review-client';
import type {
  PipelineReviewQueueSection,
  PipelineReviewRowPreview,
  PipelineReviewSort,
  PipelineReviewSummaryPayload,
} from './pipeline-review-types';

export type PipelineReviewViewStatus =
  | 'empty'
  | 'error'
  | 'loading'
  | 'offline'
  | StartupStatus;

export type PipelineReviewState = {
  data: PipelineReviewSummaryPayload | null;
  error: PipelineReviewClientError | null;
  focus: PipelineReviewFocus;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  status: PipelineReviewViewStatus;
};

function createEmptyState(): PipelineReviewState {
  return {
    data: null,
    error: null,
    focus: readPipelineReviewFocusFromUrl(),
    isRefreshing: false,
    lastUpdatedAt: null,
    status: 'empty',
  };
}

function toPipelineReviewClientError(
  error: unknown,
): PipelineReviewClientError {
  if (error instanceof PipelineReviewClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new PipelineReviewClientError({
    cause: error,
    code: 'unknown-client-error',
    message,
    state: 'error',
  });
}

function focusEquals(
  left: PipelineReviewFocus,
  right: PipelineReviewFocus,
): boolean {
  return (
    left.offset === right.offset &&
    left.reportNumber === right.reportNumber &&
    left.section === right.section &&
    left.sort === right.sort &&
    left.url === right.url
  );
}

export function usePipelineReview(): {
  clearSelection: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  refresh: () => void;
  selectRow: (row: PipelineReviewRowPreview) => void;
  selectSection: (section: PipelineReviewQueueSection) => void;
  selectSort: (sort: PipelineReviewSort) => void;
  state: PipelineReviewState;
} {
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<PipelineReviewState>(createEmptyState);

  const loadSummary = useEffectEvent(
    async (
      reason: 'focus' | 'mount' | 'online' | 'refresh' | 'select',
      focus: PipelineReviewFocus = state.focus,
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
            };
          }

          return {
            ...previous,
            error: null,
            focus,
            isRefreshing: false,
            status: 'loading',
          };
        });
      });

      try {
        const payload = await fetchPipelineReviewSummary({
          focus,
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: payload,
            error: null,
            focus,
            isRefreshing: false,
            lastUpdatedAt: new Date().toISOString(),
            status: payload.status,
          }));
        });
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        const clientError = toPipelineReviewClientError(error);

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: previous.data,
            error: clientError,
            focus,
            isRefreshing: false,
            status: clientError.state,
          }));
        });
      }
    },
  );

  const handleFocusChange = useEffectEvent(() => {
    const nextFocus = readPipelineReviewFocusFromUrl();

    if (focusEquals(nextFocus, state.focus)) {
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

    window.addEventListener(PIPELINE_REVIEW_FOCUS_EVENT, handleFocusChange);
    window.addEventListener('hashchange', handleFocusChange);
    window.addEventListener('popstate', handleFocusChange);
    window.addEventListener('online', handleOnline);

    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      window.removeEventListener(
        PIPELINE_REVIEW_FOCUS_EVENT,
        handleFocusChange,
      );
      window.removeEventListener('hashchange', handleFocusChange);
      window.removeEventListener('popstate', handleFocusChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {
    clearSelection: () => {
      syncPipelineReviewFocus({
        reportNumber: null,
        url: null,
      });
    },
    goToNextPage: () => {
      if (!state.data?.queue.hasMore) {
        return;
      }

      syncPipelineReviewFocus({
        offset: state.focus.offset + state.data.queue.limit,
      });
    },
    goToPreviousPage: () => {
      if (state.focus.offset === 0) {
        return;
      }

      syncPipelineReviewFocus({
        offset: Math.max(
          0,
          state.focus.offset - (state.data?.queue.limit ?? state.focus.offset),
        ),
      });
    },
    refresh: () => {
      if (state.isRefreshing || state.status === 'loading') {
        return;
      }

      void loadSummary('refresh');
    },
    selectRow: (row) => {
      syncPipelineReviewFocus({
        reportNumber: row.reportNumber,
        url: row.reportNumber ? null : row.url,
      });
    },
    selectSection: (section) => {
      syncPipelineReviewFocus({
        offset: 0,
        section,
      });
    },
    selectSort: (sort) => {
      syncPipelineReviewFocus({
        offset: 0,
        sort,
      });
    },
    state,
  };
}

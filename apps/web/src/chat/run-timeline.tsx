import type { CSSProperties } from 'react';
import type { ChatConsoleSessionDetail } from './chat-console-types';
import type { ChatConsoleViewStatus } from './use-chat-console';

type RunTimelineProps = {
  detail: ChatConsoleSessionDetail | null;
  status: ChatConsoleViewStatus;
};

const panelStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.4rem',
  display: 'grid',
  gap: '0.9rem',
  padding: '1rem',
};

const itemStyle: CSSProperties = {
  background: 'rgba(248, 250, 252, 0.9)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1rem',
  display: 'grid',
  gap: '0.35rem',
  padding: '0.8rem 0.9rem',
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'No timestamp available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

function getEmptyState(status: ChatConsoleViewStatus): {
  body: string;
  title: string;
} {
  switch (status) {
    case 'loading':
      return {
        body: 'Loading bounded runtime events for the selected session.',
        title: 'Loading timeline',
      };
    case 'offline':
      return {
        body: 'The API is offline, so timeline events cannot refresh right now.',
        title: 'Timeline offline',
      };
    case 'error':
      return {
        body: 'The selected-session timeline failed to load.',
        title: 'Timeline unavailable',
      };
    default:
      return {
        body: 'Select a recent session to inspect its latest runtime events.',
        title: 'No session selected',
      };
  }
}

function getLevelTone(level: 'error' | 'info' | 'warn'): CSSProperties {
  switch (level) {
    case 'info':
      return {
        background: '#dbeafe',
        color: '#1d4ed8',
      };
    case 'warn':
      return {
        background: '#fef3c7',
        color: '#92400e',
      };
    case 'error':
      return {
        background: '#fee2e2',
        color: '#991b1b',
      };
  }
}

export function RunTimeline({ detail, status }: RunTimelineProps) {
  if (!detail) {
    const emptyState = getEmptyState(status);

    return (
      <section aria-labelledby="chat-console-timeline-title" style={panelStyle}>
        <header>
          <p
            style={{
              color: '#475569',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem',
              marginTop: 0,
              textTransform: 'uppercase',
            }}
          >
            Timeline
          </p>
          <h2
            id="chat-console-timeline-title"
            style={{ marginBottom: '0.35rem' }}
          >
            {emptyState.title}
          </h2>
          <p style={{ color: '#64748b', marginBottom: 0 }}>{emptyState.body}</p>
        </header>
      </section>
    );
  }

  return (
    <section aria-labelledby="chat-console-timeline-title" style={panelStyle}>
      <header>
        <p
          style={{
            color: '#475569',
            letterSpacing: '0.08em',
            marginBottom: '0.35rem',
            marginTop: 0,
            textTransform: 'uppercase',
          }}
        >
          Timeline
        </p>
        <h2
          id="chat-console-timeline-title"
          style={{ marginBottom: '0.35rem' }}
        >
          Runtime events for the selected session
        </h2>
        <p style={{ color: '#64748b', marginBottom: 0 }}>
          Session {detail.session.sessionId}
        </p>
      </header>

      {detail.timeline.length === 0 ? (
        <section style={itemStyle}>
          <p style={{ margin: 0 }}>
            No runtime events have been recorded for this session yet.
          </p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {detail.timeline.map((item) => (
            <article key={item.eventId} style={itemStyle}>
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.55rem',
                  justifyContent: 'space-between',
                }}
              >
                <strong>{item.summary}</strong>
                <span
                  style={{
                    ...getLevelTone(item.level),
                    borderRadius: '999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                  }}
                >
                  {item.level}
                </span>
              </div>
              <p style={{ color: '#475569', margin: 0 }}>
                {item.eventType} at {formatTimestamp(item.occurredAt)}
              </p>
              {item.jobId ? (
                <p style={{ color: '#64748b', margin: 0 }}>Job: {item.jobId}</p>
              ) : null}
              {item.traceId ? (
                <p style={{ color: '#64748b', margin: 0 }}>
                  Trace: {item.traceId}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

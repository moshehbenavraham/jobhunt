import type { CSSProperties } from 'react';
import { RecentSessionList } from './recent-session-list';
import { RunStatusPanel } from './run-status-panel';
import { RunTimeline } from './run-timeline';
import { useChatConsole } from './use-chat-console';
import { WorkflowComposer } from './workflow-composer';

const surfaceStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
};

const heroStyle: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  justifyContent: 'space-between',
};

const buttonStyle: CSSProperties = {
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

const twoColumnStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))',
};

const lowerGridStyle: CSSProperties = {
  alignItems: 'start',
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
};

const selectedSummaryStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.4rem',
  display: 'grid',
  gap: '0.9rem',
  padding: '1rem',
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not refreshed yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

export function ChatConsoleSurface() {
  const chatConsole = useChatConsole();
  const selectedWorkflow =
    chatConsole.state.data?.workflows.find(
      (workflow) => workflow.intent === chatConsole.state.selectedWorkflow,
    ) ?? null;
  const selectedSession =
    chatConsole.state.command?.selectedSession ??
    chatConsole.state.data?.selectedSession ??
    null;
  const startupMessage =
    chatConsole.state.data?.message ??
    chatConsole.state.error?.message ??
    'Chat console summary has not loaded yet.';

  return (
    <section aria-labelledby="chat-console-title" style={surfaceStyle}>
      <header style={heroStyle}>
        <div>
          <p
            style={{
              color: '#9a3412',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem',
              marginTop: 0,
              textTransform: 'uppercase',
            }}
          >
            Session 02
          </p>
          <h2 id="chat-console-title" style={{ marginBottom: '0.35rem' }}>
            Chat console and session resume
          </h2>
          <p style={{ color: '#64748b', marginBottom: '0.2rem' }}>
            Launch supported workflows, inspect deterministic run state, and
            reopen recent sessions without leaving the shell.
          </p>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            Last refreshed: {formatTimestamp(chatConsole.state.lastUpdatedAt)}
          </p>
        </div>

        <button
          aria-label="Refresh chat console"
          disabled={
            chatConsole.state.isRefreshing ||
            chatConsole.state.pendingAction !== null
          }
          onClick={chatConsole.refresh}
          style={{
            ...buttonStyle,
            opacity:
              chatConsole.state.isRefreshing ||
              chatConsole.state.pendingAction !== null
                ? 0.7
                : 1,
          }}
          type="button"
        >
          {chatConsole.state.isRefreshing ? 'Refreshing...' : 'Refresh console'}
        </button>
      </header>

      <div style={twoColumnStyle}>
        <WorkflowComposer
          draftInput={chatConsole.state.draftInput}
          onDraftInputChange={chatConsole.setDraftInput}
          onLaunch={chatConsole.launch}
          onWorkflowChange={chatConsole.setSelectedWorkflow}
          pendingAction={chatConsole.state.pendingAction}
          selectedWorkflow={chatConsole.state.selectedWorkflow}
          startupMessage={startupMessage}
          status={chatConsole.state.status}
          workflowOptions={chatConsole.state.data?.workflows ?? []}
        />

        <RunStatusPanel
          command={chatConsole.state.command}
          error={chatConsole.state.error}
          selectedSession={selectedSession}
          selectedWorkflow={selectedWorkflow}
          startupMessage={startupMessage}
          status={chatConsole.state.status}
        />
      </div>

      <div style={lowerGridStyle}>
        <RecentSessionList
          onResume={chatConsole.resume}
          onSelect={chatConsole.selectSession}
          pendingAction={chatConsole.state.pendingAction}
          selectedSessionId={chatConsole.state.selectedSessionId}
          sessions={chatConsole.state.data?.recentSessions ?? []}
          status={chatConsole.state.status}
        />

        <div style={{ display: 'grid', gap: '1rem' }}>
          <section aria-labelledby="chat-console-selected-title" style={selectedSummaryStyle}>
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
                Selected session
              </p>
              <h2 id="chat-console-selected-title" style={{ marginBottom: '0.35rem' }}>
                {selectedSession
                  ? selectedSession.session.sessionId
                  : 'No selected session'}
              </h2>
              <p style={{ color: '#64748b', marginBottom: 0 }}>
                {selectedSession
                  ? `Workflow ${selectedSession.session.workflow} with ${selectedSession.jobs.length} tracked jobs and ${selectedSession.approvals.length} approvals.`
                  : 'Select a recent session to see its stored route, jobs, and bounded timeline.'}
              </p>
            </header>

            {selectedSession ? (
              <div
                style={{
                  display: 'grid',
                  gap: '0.8rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                }}
              >
                <article
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.9rem',
                  }}
                >
                  <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
                    Route message
                  </p>
                  <p style={{ margin: 0 }}>{selectedSession.route.message}</p>
                </article>
                <article
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.9rem',
                  }}
                >
                  <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
                    Latest job
                  </p>
                  <p style={{ margin: 0 }}>
                    {selectedSession.session.job?.jobId ?? 'No job recorded yet'}
                  </p>
                </article>
                <article
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.9rem',
                  }}
                >
                  <p style={{ color: '#64748b', marginBottom: '0.25rem', marginTop: 0 }}>
                    Pending approvals
                  </p>
                  <p style={{ margin: 0 }}>
                    {selectedSession.session.pendingApprovalCount}
                  </p>
                </article>
              </div>
            ) : null}
          </section>

          <RunTimeline detail={selectedSession} status={chatConsole.state.status} />
        </div>
      </div>
    </section>
  );
}

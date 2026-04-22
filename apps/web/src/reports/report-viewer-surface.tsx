import type { CSSProperties } from 'react';
import {
  REPORT_VIEWER_ARTIFACT_GROUPS,
  type ReportViewerArtifactGroup,
} from './report-viewer-types';
import { useReportViewer } from './use-report-viewer';

const surfaceStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
};

const panelStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '1.4rem',
  display: 'grid',
  gap: '0.9rem',
  padding: '1rem',
};

const twoColumnStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
};

const buttonStyle: CSSProperties = {
  background: '#0f172a',
  border: 0,
  borderRadius: '999px',
  color: '#f8fafc',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 700,
  minHeight: '2.4rem',
  padding: '0.55rem 0.9rem',
};

const subtleButtonStyle: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '999px',
  color: '#0f172a',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 600,
  minHeight: '2.2rem',
  padding: '0.45rem 0.8rem',
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

function getGroupLabel(group: ReportViewerArtifactGroup): string {
  switch (group) {
    case 'all':
      return 'All artifacts';
    case 'output':
      return 'PDFs';
    case 'reports':
      return 'Reports';
  }
}

function getSelectionTone(origin: 'latest' | 'none' | 'selected') {
  switch (origin) {
    case 'latest':
      return {
        background: '#dbeafe',
        color: '#1d4ed8',
        label: 'Latest fallback',
      };
    case 'selected':
      return {
        background: '#dcfce7',
        color: '#166534',
        label: 'Selected report',
      };
    case 'none':
      return {
        background: '#e2e8f0',
        color: '#475569',
        label: 'No report selected',
      };
  }
}

function getEmptyState(input: {
  error: string | null;
  status: ReturnType<typeof useReportViewer>['state']['status'];
}) {
  switch (input.status) {
    case 'loading':
      return {
        body: 'Reading the bounded report-viewer summary and recent artifact browser from the API.',
        title: 'Loading artifact review',
      };
    case 'offline':
      return {
        body:
          input.error ??
          'The report-viewer endpoint is offline, so artifact review cannot refresh.',
        title: 'Artifact review offline',
      };
    case 'error':
      return {
        body:
          input.error ??
          'The report-viewer payload could not be parsed into the artifact review surface.',
        title: 'Artifact review unavailable',
      };
    default:
      return {
        body:
          'Open a report from chat or browse recent report artifacts once they exist in the workspace.',
        title: 'No artifact review payload yet',
      };
  }
}

export function ReportViewerSurface() {
  const viewer = useReportViewer();
  const payload = viewer.state.data;

  if (!payload) {
    const emptyState = getEmptyState({
      error: viewer.state.error?.message ?? null,
      status: viewer.state.status,
    });

    return (
      <section aria-labelledby="report-viewer-title" style={surfaceStyle}>
        <section style={panelStyle}>
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
              Session 03
            </p>
            <h2 id="report-viewer-title" style={{ marginBottom: '0.35rem' }}>
              Artifact review surface
            </h2>
            <p style={{ color: '#64748b', marginBottom: 0, marginTop: 0 }}>
              Open checked-in reports, inspect header metadata, and browse
              recent report or PDF artifacts without leaving the shell.
            </p>
          </header>

          <section
            style={{
              background: 'rgba(248, 250, 252, 0.9)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '1rem',
              padding: '0.95rem',
            }}
          >
            <h3 style={{ marginBottom: '0.35rem', marginTop: 0 }}>
              {emptyState.title}
            </h3>
            <p style={{ color: '#475569', marginBottom: 0, marginTop: 0 }}>
              {emptyState.body}
            </p>
          </section>
        </section>
      </section>
    );
  }

  const selectedReport = payload.selectedReport;
  const recentArtifacts = payload.recentArtifacts;
  const visibleRangeStart =
    recentArtifacts.totalCount === 0 ? 0 : recentArtifacts.offset + 1;
  const visibleRangeEnd = recentArtifacts.offset + recentArtifacts.items.length;

  const selectionTone = getSelectionTone(selectedReport.origin);

  return (
    <section aria-labelledby="report-viewer-title" style={surfaceStyle}>
      <section style={panelStyle}>
        <header
          style={{
            alignItems: 'start',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.9rem',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p
              style={{
                color: '#475569',
                letterSpacing: '0.08em',
                marginBottom: '0.35rem',
                marginTop: 0,
                textTransform: 'uppercase',
              }}
            >
              Session 03
            </p>
            <h2 id="report-viewer-title" style={{ marginBottom: '0.35rem' }}>
              Artifact review surface
            </h2>
            <p style={{ color: '#64748b', marginBottom: 0, marginTop: 0 }}>
              {payload.message}
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.55rem', justifyItems: 'end' }}>
            <button
              aria-label="Refresh artifact review"
              disabled={viewer.state.isRefreshing}
              onClick={() => viewer.refresh()}
              style={{
                ...buttonStyle,
                opacity: viewer.state.isRefreshing ? 0.7 : 1,
              }}
              type="button"
            >
              Refresh
            </button>
            <span style={{ color: '#64748b', fontSize: '0.92rem' }}>
              Last updated: {formatTimestamp(viewer.state.lastUpdatedAt)}
            </span>
          </div>
        </header>

        {(viewer.state.status === 'offline' || viewer.state.status === 'error') &&
        viewer.state.error ? (
          <section
            style={{
              background:
                viewer.state.status === 'offline' ? '#e2e8f0' : '#fee2e2',
              border: `1px solid ${
                viewer.state.status === 'offline' ? '#cbd5e1' : '#fecaca'
              }`,
              borderRadius: '1rem',
              padding: '0.85rem 0.9rem',
            }}
          >
            <p style={{ fontWeight: 700, marginBottom: '0.25rem', marginTop: 0 }}>
              {viewer.state.status === 'offline'
                ? 'Showing the last artifact snapshot'
                : 'Artifact review warning'}
            </p>
            <p style={{ margin: 0 }}>{viewer.state.error.message}</p>
          </section>
        ) : null}

        <section style={panelStyle}>
          <header
            style={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6rem',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ marginBottom: '0.25rem', marginTop: 0 }}>
                Recent artifacts
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Browse recent report and PDF artifacts with explicit, bounded
                pagination.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {REPORT_VIEWER_ARTIFACT_GROUPS.map((group) => {
                const selected = viewer.state.focus.group === group;

                return (
                  <button
                    aria-label={`Show ${getGroupLabel(group)}`}
                    key={group}
                    onClick={() => viewer.selectGroup(group)}
                    style={{
                      ...subtleButtonStyle,
                      background: selected ? '#0f172a' : subtleButtonStyle.background,
                      color: selected ? '#f8fafc' : subtleButtonStyle.color,
                    }}
                    type="button"
                  >
                    {getGroupLabel(group)}
                  </button>
                );
              })}
            </div>
          </header>

          <div
            style={{
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            {recentArtifacts.items.length === 0 ? (
              <section
                style={{
                  background: 'rgba(248, 250, 252, 0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '1rem',
                  padding: '0.95rem',
                }}
              >
                <p style={{ margin: 0 }}>
                  No {getGroupLabel(recentArtifacts.group).toLowerCase()} are
                  available in the current workspace view.
                </p>
              </section>
            ) : (
              recentArtifacts.items.map((artifact) => {
                const isReport = artifact.kind === 'report';

                return (
                  <article
                    key={artifact.repoRelativePath}
                    style={{
                      background: artifact.selected
                        ? 'rgba(219, 234, 254, 0.7)'
                        : 'rgba(248, 250, 252, 0.9)',
                      border: artifact.selected
                        ? '1px solid rgba(37, 99, 235, 0.35)'
                        : '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '1rem',
                      display: 'grid',
                      gap: '0.55rem',
                      padding: '0.9rem',
                    }}
                  >
                    <div
                      style={{
                        alignItems: 'center',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <p
                          style={{
                            color: '#475569',
                            marginBottom: '0.2rem',
                            marginTop: 0,
                          }}
                        >
                          {artifact.fileName}
                        </p>
                        <p style={{ color: '#64748b', margin: 0 }}>
                          {artifact.repoRelativePath}
                        </p>
                      </div>
                      <span
                        style={{
                          background:
                            artifact.kind === 'report' ? '#dbeafe' : '#fef3c7',
                          borderRadius: '999px',
                          color:
                            artifact.kind === 'report' ? '#1d4ed8' : '#92400e',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '0.22rem 0.55rem',
                        }}
                      >
                        {artifact.kind === 'report' ? 'Report' : 'PDF'}
                      </span>
                    </div>

                    <div
                      style={{
                        color: '#475569',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.8rem',
                      }}
                    >
                      <span>
                        Date: {artifact.artifactDate ?? 'No embedded date'}
                      </span>
                      <span>
                        Report #: {artifact.reportNumber ?? 'Not numbered'}
                      </span>
                    </div>

                    {isReport ? (
                      <button
                        aria-label={`Open report ${artifact.repoRelativePath}`}
                        onClick={() => viewer.selectReport(artifact.repoRelativePath)}
                        style={buttonStyle}
                        type="button"
                      >
                        {artifact.selected ? 'Selected report' : 'Open report'}
                      </button>
                    ) : (
                      <p style={{ color: '#64748b', margin: 0 }}>
                        PDF review stays read-only in the workspace for now.
                        Use the repo-relative path above when the PDF artifact is
                        needed.
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </div>

          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'space-between',
            }}
          >
            <p style={{ color: '#64748b', margin: 0 }}>
              Showing {visibleRangeStart}-{visibleRangeEnd} of{' '}
              {recentArtifacts.totalCount}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                aria-label="Previous artifact page"
                disabled={recentArtifacts.offset === 0}
                onClick={() => viewer.goToPreviousPage()}
                style={{
                  ...subtleButtonStyle,
                  opacity: recentArtifacts.offset === 0 ? 0.55 : 1,
                }}
                type="button"
              >
                Previous
              </button>
              <button
                aria-label="Next artifact page"
                disabled={!recentArtifacts.hasMore}
                onClick={() => viewer.goToNextPage()}
                style={{
                  ...subtleButtonStyle,
                  opacity: recentArtifacts.hasMore ? 1 : 0.55,
                }}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section style={twoColumnStyle}>
          <section style={panelStyle}>
            <header
              style={{
                alignItems: 'center',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.6rem',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ marginBottom: '0.25rem', marginTop: 0 }}>
                  Selected report
                </h3>
                <p style={{ color: '#64748b', margin: 0 }}>
                  Review extracted header metadata before reading the markdown
                  body.
                </p>
              </div>
              <span
                style={{
                  ...selectionTone,
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.6rem',
                }}
              >
                {selectionTone.label}
              </span>
            </header>

            {selectedReport.state === 'empty' ? (
              <section
                style={{
                  background: 'rgba(248, 250, 252, 0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '1rem',
                  padding: '0.95rem',
                }}
              >
                <p style={{ margin: 0 }}>{selectedReport.message}</p>
              </section>
            ) : selectedReport.state === 'missing' ? (
              <section
                style={{
                  background: '#ffedd5',
                  border: '1px solid #fed7aa',
                  borderRadius: '1rem',
                  display: 'grid',
                  gap: '0.8rem',
                  padding: '0.95rem',
                }}
              >
                <div>
                  <h4 style={{ marginBottom: '0.35rem', marginTop: 0 }}>
                    Selected report is stale
                  </h4>
                  <p style={{ marginBottom: '0.35rem', marginTop: 0 }}>
                    {selectedReport.message}
                  </p>
                  <p style={{ color: '#7c2d12', margin: 0 }}>
                    Requested path:{' '}
                    {selectedReport.requestedRepoRelativePath ??
                      selectedReport.repoRelativePath ??
                      'Unknown'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    aria-label="Follow the latest report"
                    onClick={() => viewer.followLatest()}
                    style={buttonStyle}
                    type="button"
                  >
                    Follow latest report
                  </button>
                </div>
              </section>
            ) : (
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <section
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    display: 'grid',
                    gap: '0.75rem',
                    padding: '0.95rem',
                  }}
                >
                  <div>
                    <h4 style={{ marginBottom: '0.25rem', marginTop: 0 }}>
                      {selectedReport.header?.title ?? 'Untitled report'}
                    </h4>
                    <p style={{ color: '#64748b', margin: 0 }}>
                      {selectedReport.repoRelativePath}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '0.7rem',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                    }}
                  >
                    <article>
                      <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
                        Report #
                      </p>
                      <p style={{ margin: 0 }}>
                        {selectedReport.reportNumber ?? 'Unavailable'}
                      </p>
                    </article>
                    <article>
                      <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
                        Date
                      </p>
                      <p style={{ margin: 0 }}>
                        {selectedReport.header?.date ?? 'Unavailable'}
                      </p>
                    </article>
                    <article>
                      <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
                        Score
                      </p>
                      <p style={{ margin: 0 }}>
                        {selectedReport.header?.score == null
                          ? 'Unavailable'
                          : `${selectedReport.header?.score.toFixed(1)} / 5`}
                      </p>
                    </article>
                    <article>
                      <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
                        Legitimacy
                      </p>
                      <p style={{ margin: 0 }}>
                        {selectedReport.header?.legitimacy ?? 'Unavailable'}
                      </p>
                    </article>
                    <article>
                      <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
                        Archetype
                      </p>
                      <p style={{ margin: 0 }}>
                        {selectedReport.header?.archetype ?? 'Unavailable'}
                      </p>
                    </article>
                    <article>
                      <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
                        Verification
                      </p>
                      <p style={{ margin: 0 }}>
                        {selectedReport.header?.verification ?? 'Unavailable'}
                      </p>
                    </article>
                  </div>

                  <div style={{ display: 'grid', gap: '0.65rem' }}>
                    <div>
                      <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
                        URL
                      </p>
                      {selectedReport.header?.url ? (
                        <a
                          href={selectedReport.header.url}
                          rel="noreferrer"
                          style={{ color: '#1d4ed8' }}
                          target="_blank"
                        >
                          {selectedReport.header.url}
                        </a>
                      ) : (
                        <p style={{ margin: 0 }}>Unavailable</p>
                      )}
                    </div>

                    <div>
                      <p style={{ color: '#64748b', marginBottom: '0.2rem', marginTop: 0 }}>
                        Linked PDF
                      </p>
                      <p style={{ margin: 0 }}>
                        {selectedReport.header?.pdf.repoRelativePath ?? 'Unavailable'}
                      </p>
                      <p style={{ color: '#64748b', marginBottom: 0 }}>
                        {selectedReport.header?.pdf.exists
                          ? 'PDF artifact exists in output/.'
                          : 'No linked PDF is currently available.'}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <header>
              <h3 style={{ marginBottom: '0.25rem', marginTop: 0 }}>
                Markdown review
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Read the checked-in report exactly as stored in the repository.
              </p>
            </header>

            {selectedReport.state !== 'ready' || !selectedReport.body ? (
              <section
                style={{
                  background: 'rgba(248, 250, 252, 0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '1rem',
                  padding: '0.95rem',
                }}
              >
                <p style={{ margin: 0 }}>
                  {selectedReport.state === 'missing'
                    ? 'The selected report no longer exists, so no markdown body can be shown.'
                    : 'Select a report to review its markdown body.'}
                </p>
              </section>
            ) : (
              <pre
                aria-label="Selected report markdown"
                style={{
                  background: '#0f172a',
                  borderRadius: '1rem',
                  color: '#e2e8f0',
                  margin: 0,
                  maxHeight: '42rem',
                  overflow: 'auto',
                  padding: '1rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {selectedReport.body}
              </pre>
            )}
          </section>
        </section>
      </section>
    </section>
  );
}

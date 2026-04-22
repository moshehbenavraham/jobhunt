import type { CSSProperties } from 'react';
import {
  PIPELINE_REVIEW_QUEUE_SECTIONS,
  PIPELINE_REVIEW_SORT_VALUES,
  type PipelineReviewQueueSection,
  type PipelineReviewSort,
  type PipelineReviewWarningCode,
} from './pipeline-review-types';
import { usePipelineReview } from './use-pipeline-review';

type PipelineReviewSurfaceProps = {
  onOpenReportViewer: (focus: {
    reportPath: string | null;
  }) => void;
};

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

const detailGridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
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

function formatScore(value: number | null): string {
  if (value === null) {
    return 'No score';
  }

  return `${value.toFixed(1)} / 5`;
}

function getSectionLabel(section: PipelineReviewQueueSection): string {
  switch (section) {
    case 'all':
      return 'All rows';
    case 'pending':
      return 'Pending';
    case 'processed':
      return 'Processed';
  }
}

function getSortLabel(sort: PipelineReviewSort): string {
  switch (sort) {
    case 'company':
      return 'Company';
    case 'queue':
      return 'Queue order';
    case 'score':
      return 'Score';
  }
}

function getWarningTone(code: PipelineReviewWarningCode): CSSProperties {
  switch (code) {
    case 'low-score':
      return {
        background: '#ffedd5',
        color: '#9a3412',
      };
    case 'suspicious-legitimacy':
      return {
        background: '#fee2e2',
        color: '#991b1b',
      };
    case 'caution-legitimacy':
    case 'missing-pdf':
    case 'missing-report':
    case 'stale-selection':
      return {
        background: '#fef3c7',
        color: '#92400e',
      };
  }
}

function getEmptyState(input: {
  error: string | null;
  status: ReturnType<typeof usePipelineReview>['state']['status'];
}) {
  switch (input.status) {
    case 'loading':
      return {
        body: 'Reading the bounded pipeline-review summary from the API.',
        title: 'Loading pipeline review',
      };
    case 'offline':
      return {
        body:
          input.error ??
          'The pipeline-review endpoint is offline, so queue review cannot refresh.',
        title: 'Pipeline review offline',
      };
    case 'error':
      return {
        body:
          input.error ??
          'The pipeline-review payload could not be parsed into the queue-review surface.',
        title: 'Pipeline review unavailable',
      };
    default:
      return {
        body:
          'Open the pipeline workspace once `data/pipeline.md` contains pending or processed queue rows.',
        title: 'No pipeline review payload yet',
      };
  }
}

export function PipelineReviewSurface({
  onOpenReportViewer,
}: PipelineReviewSurfaceProps) {
  const review = usePipelineReview();
  const payload = review.state.data;

  if (!payload) {
    const emptyState = getEmptyState({
      error: review.state.error?.message ?? null,
      status: review.state.status,
    });

    return (
      <section aria-labelledby="pipeline-review-title" style={surfaceStyle}>
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
              Phase 04 / Session 04
            </p>
            <h2 id="pipeline-review-title" style={{ marginBottom: '0.35rem' }}>
              Pipeline review workspace
            </h2>
            <p style={{ color: '#64748b', marginBottom: 0, marginTop: 0 }}>
              Review shortlist context plus pending and processed queue rows
              inside the shell without opening raw markdown.
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

  const selectedDetail = payload.selectedDetail;
  const selectedRow = selectedDetail.row;
  const visibleRangeStart =
    payload.queue.totalCount === 0 ? 0 : payload.queue.offset + 1;
  const visibleRangeEnd = payload.queue.offset + payload.queue.items.length;

  return (
    <section aria-labelledby="pipeline-review-title" style={surfaceStyle}>
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
              Phase 04 / Session 04
            </p>
            <h2 id="pipeline-review-title" style={{ marginBottom: '0.35rem' }}>
              Pipeline review workspace
            </h2>
            <p style={{ color: '#64748b', marginBottom: 0, marginTop: 0 }}>
              {payload.message}
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.55rem', justifyItems: 'end' }}>
            <button
              aria-label="Refresh pipeline review"
              disabled={review.state.isRefreshing}
              onClick={() => review.refresh()}
              style={{
                ...buttonStyle,
                opacity: review.state.isRefreshing ? 0.7 : 1,
              }}
              type="button"
            >
              Refresh
            </button>
            <span style={{ color: '#64748b', fontSize: '0.92rem' }}>
              Last updated: {formatTimestamp(review.state.lastUpdatedAt)}
            </span>
          </div>
        </header>

        {(review.state.status === 'offline' || review.state.status === 'error') &&
        review.state.error ? (
          <section
            style={{
              background:
                review.state.status === 'offline' ? '#e2e8f0' : '#fee2e2',
              border: `1px solid ${
                review.state.status === 'offline' ? '#cbd5e1' : '#fecaca'
              }`,
              borderRadius: '1rem',
              padding: '0.85rem 0.9rem',
            }}
          >
            <p style={{ fontWeight: 700, marginBottom: '0.25rem', marginTop: 0 }}>
              {review.state.status === 'offline'
                ? 'Showing the last queue snapshot'
                : 'Pipeline review warning'}
            </p>
            <p style={{ margin: 0 }}>{review.state.error.message}</p>
          </section>
        ) : null}

        <section style={panelStyle}>
          <header>
            <h3 style={{ marginBottom: '0.25rem', marginTop: 0 }}>
              Shortlist context
            </h3>
            <p style={{ color: '#64748b', margin: 0 }}>
              {payload.shortlist.message}
            </p>
          </header>

          {payload.shortlist.available ? (
            <>
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
                  <p style={{ color: '#64748b', margin: 0 }}>Last refreshed</p>
                  <strong>{payload.shortlist.lastRefreshed ?? 'Unknown'}</strong>
                </article>
                <article
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.9rem',
                  }}
                >
                  <p style={{ color: '#64748b', margin: 0 }}>Generated by</p>
                  <strong>{payload.shortlist.generatedBy ?? 'Unknown'}</strong>
                </article>
                <article
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.9rem',
                  }}
                >
                  <p style={{ color: '#64748b', margin: 0 }}>Strongest fit</p>
                  <strong>
                    {payload.shortlist.bucketCounts.strongestFit ?? 0}
                  </strong>
                </article>
                <article
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.9rem',
                  }}
                >
                  <p style={{ color: '#64748b', margin: 0 }}>Possible fit</p>
                  <strong>
                    {payload.shortlist.bucketCounts.possibleFit ?? 0}
                  </strong>
                </article>
                <article
                  style={{
                    background: 'rgba(248, 250, 252, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    padding: '0.85rem 0.9rem',
                  }}
                >
                  <p style={{ color: '#64748b', margin: 0 }}>
                    Adjacent or noisy
                  </p>
                  <strong>
                    {payload.shortlist.bucketCounts.adjacentOrNoisy ?? 0}
                  </strong>
                </article>
              </div>

              {payload.shortlist.campaignGuidance ? (
                <section
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '1rem',
                    padding: '0.9rem',
                  }}
                >
                  <strong>Campaign guidance</strong>
                  <p style={{ marginBottom: 0, marginTop: '0.35rem' }}>
                    {payload.shortlist.campaignGuidance}
                  </p>
                </section>
              ) : null}

              {payload.shortlist.topRoles.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {payload.shortlist.topRoles.slice(0, 5).map((entry) => (
                    <article
                      key={`${entry.url}:${entry.role}`}
                      style={{
                        background: 'rgba(248, 250, 252, 0.9)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '1rem',
                        display: 'grid',
                        gap: '0.35rem',
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
                        <strong>{entry.role}</strong>
                        <span
                          style={{
                            background: '#dbeafe',
                            borderRadius: '999px',
                            color: '#1d4ed8',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                          }}
                        >
                          {entry.bucketLabel}
                        </span>
                      </div>
                      <span style={{ color: '#475569' }}>
                        {entry.company ?? 'Unknown company'}
                      </span>
                      {entry.reasonSummary ? (
                        <span style={{ color: '#64748b' }}>
                          {entry.reasonSummary}
                        </span>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </section>

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
                Queue review
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Showing {visibleRangeStart}-{visibleRangeEnd} of{' '}
                {payload.queue.totalCount} row
                {payload.queue.totalCount === 1 ? '' : 's'} in the current
                view.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span
                style={{
                  background: '#e2e8f0',
                  borderRadius: '999px',
                  color: '#334155',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                }}
              >
                Pending {payload.queue.counts.pending}
              </span>
              <span
                style={{
                  background: '#dbeafe',
                  borderRadius: '999px',
                  color: '#1d4ed8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                }}
              >
                Processed {payload.queue.counts.processed}
              </span>
              <span
                style={{
                  background: '#fef3c7',
                  borderRadius: '999px',
                  color: '#92400e',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                }}
              >
                Malformed {payload.queue.counts.malformed}
              </span>
            </div>
          </header>

          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {PIPELINE_REVIEW_QUEUE_SECTIONS.map((section) => {
                const selected = payload.queue.section === section;

                return (
                  <button
                    aria-label={`Show ${getSectionLabel(section)}`}
                    key={section}
                    onClick={() => review.selectSection(section)}
                    style={{
                      ...subtleButtonStyle,
                      background: selected ? '#0f172a' : subtleButtonStyle.background,
                      color: selected ? '#f8fafc' : subtleButtonStyle.color,
                    }}
                    type="button"
                  >
                    {getSectionLabel(section)}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {PIPELINE_REVIEW_SORT_VALUES.map((sort) => {
                const selected = payload.queue.sort === sort;

                return (
                  <button
                    aria-label={`Sort by ${getSortLabel(sort)}`}
                    key={sort}
                    onClick={() => review.selectSort(sort)}
                    style={{
                      ...subtleButtonStyle,
                      background: selected ? '#1d4ed8' : subtleButtonStyle.background,
                      color: selected ? '#f8fafc' : subtleButtonStyle.color,
                    }}
                    type="button"
                  >
                    {getSortLabel(sort)}
                  </button>
                );
              })}
            </div>
          </div>

          {payload.queue.items.length === 0 ? (
            <section
              style={{
                background: 'rgba(248, 250, 252, 0.9)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '1rem',
                padding: '0.95rem',
              }}
            >
              <p style={{ margin: 0 }}>
                No queue rows match the current section and sort settings.
              </p>
            </section>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {payload.queue.items.map((row) => (
                <article
                  key={`${row.kind}:${row.reportNumber ?? row.url}`}
                  style={{
                    background: row.selected
                      ? 'rgba(219, 234, 254, 0.7)'
                      : 'rgba(248, 250, 252, 0.9)',
                    border: row.selected
                      ? '1px solid rgba(37, 99, 235, 0.35)'
                      : '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    display: 'grid',
                    gap: '0.6rem',
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
                      <strong>{row.role ?? row.url}</strong>
                      <p style={{ color: '#64748b', margin: 0 }}>
                        {(row.company ?? 'Unknown company') +
                          ' | ' +
                          getSectionLabel(row.kind)}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {row.reportNumber ? (
                        <span
                          style={{
                            background: '#e2e8f0',
                            borderRadius: '999px',
                            color: '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                          }}
                        >
                          #{row.reportNumber}
                        </span>
                      ) : null}
                      <span
                        style={{
                          background: '#dcfce7',
                          borderRadius: '999px',
                          color: '#166534',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                        }}
                      >
                        {formatScore(row.score)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    <span
                      style={{
                        background: row.report.exists ? '#dcfce7' : '#fee2e2',
                        borderRadius: '999px',
                        color: row.report.exists ? '#166534' : '#991b1b',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                      }}
                    >
                      Report {row.report.exists ? 'ready' : 'missing'}
                    </span>
                    <span
                      style={{
                        background: row.pdf.exists ? '#dcfce7' : '#ffedd5',
                        borderRadius: '999px',
                        color: row.pdf.exists ? '#166534' : '#9a3412',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                      }}
                    >
                      PDF {row.pdf.exists ? 'ready' : 'missing'}
                    </span>
                    {row.legitimacy ? (
                      <span
                        style={{
                          background:
                            row.legitimacy === 'High Confidence'
                              ? '#dcfce7'
                              : row.legitimacy === 'Proceed with Caution'
                                ? '#fef3c7'
                                : '#fee2e2',
                          borderRadius: '999px',
                          color:
                            row.legitimacy === 'High Confidence'
                              ? '#166534'
                              : row.legitimacy === 'Proceed with Caution'
                                ? '#92400e'
                                : '#991b1b',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                        }}
                      >
                        {row.legitimacy}
                      </span>
                    ) : null}
                  </div>

                  {row.warnings.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {row.warnings.map((warning) => (
                        <span
                          key={`${warning.code}:${warning.message}`}
                          style={{
                            ...getWarningTone(warning.code),
                            borderRadius: '999px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                          }}
                        >
                          {warning.message}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div
                    style={{
                      alignItems: 'center',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.6rem',
                      justifyContent: 'space-between',
                    }}
                  >
                    <a
                      href={row.url}
                      rel="noreferrer"
                      style={{ color: '#1d4ed8' }}
                      target="_blank"
                    >
                      Open job posting
                    </a>
                    <button
                      aria-label={
                        row.reportNumber
                          ? `Review queue row ${row.reportNumber}`
                          : `Review queue row ${row.url}`
                      }
                      onClick={() => review.selectRow(row)}
                      style={buttonStyle}
                      type="button"
                    >
                      {row.selected ? 'Selected' : 'Review detail'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6rem',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                aria-label="Previous queue page"
                disabled={payload.queue.offset === 0}
                onClick={() => review.goToPreviousPage()}
                style={{
                  ...subtleButtonStyle,
                  opacity: payload.queue.offset === 0 ? 0.55 : 1,
                }}
                type="button"
              >
                Previous
              </button>
              <button
                aria-label="Next queue page"
                disabled={!payload.queue.hasMore}
                onClick={() => review.goToNextPage()}
                style={{
                  ...subtleButtonStyle,
                  opacity: payload.queue.hasMore ? 1 : 0.55,
                }}
                type="button"
              >
                Next
              </button>
            </div>

            <button
              aria-label="Clear selected queue row"
              disabled={selectedDetail.state === 'empty'}
              onClick={() => review.clearSelection()}
              style={{
                ...subtleButtonStyle,
                opacity: selectedDetail.state === 'empty' ? 0.55 : 1,
              }}
              type="button"
            >
              Clear selection
            </button>
          </div>
        </section>

        <section style={panelStyle}>
          <header>
            <h3 style={{ marginBottom: '0.25rem', marginTop: 0 }}>
              Selected detail
            </h3>
            <p style={{ color: '#64748b', margin: 0 }}>
              {selectedDetail.message}
            </p>
          </header>

          {selectedDetail.state === 'empty' ? (
            <section
              style={{
                background: 'rgba(248, 250, 252, 0.9)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '1rem',
                padding: '0.95rem',
              }}
            >
              <p style={{ margin: 0 }}>
                Select a pending or processed queue row to inspect its report,
                PDF, legitimacy, and warning context.
              </p>
            </section>
          ) : selectedDetail.state === 'missing' ? (
            <section
              style={{
                background: '#ffedd5',
                border: '1px solid #fed7aa',
                borderRadius: '1rem',
                display: 'grid',
                gap: '0.75rem',
                padding: '0.95rem',
              }}
            >
              <p style={{ margin: 0 }}>
                The focused queue row is stale for the current section or sort
                view. Clear the selection or pick another row from the queue.
              </p>
              <div>
                <button
                  aria-label="Clear stale queue selection"
                  onClick={() => review.clearSelection()}
                  style={buttonStyle}
                  type="button"
                >
                  Clear stale selection
                </button>
              </div>
            </section>
          ) : selectedRow ? (
            <div style={detailGridStyle}>
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
                  <strong>{selectedRow.role ?? selectedRow.url}</strong>
                  <p style={{ color: '#64748b', margin: 0 }}>
                    {selectedRow.company ?? 'Unknown company'}
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '0.65rem',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                  }}
                >
                  <article>
                    <p style={{ color: '#64748b', margin: 0 }}>Queue state</p>
                    <strong>{getSectionLabel(selectedRow.kind)}</strong>
                  </article>
                  <article>
                    <p style={{ color: '#64748b', margin: 0 }}>Score</p>
                    <strong>{formatScore(selectedRow.score)}</strong>
                  </article>
                  <article>
                    <p style={{ color: '#64748b', margin: 0 }}>Legitimacy</p>
                    <strong>{selectedRow.legitimacy ?? 'Unknown'}</strong>
                  </article>
                  <article>
                    <p style={{ color: '#64748b', margin: 0 }}>Verification</p>
                    <strong>
                      {selectedRow.verification ?? 'No verification note'}
                    </strong>
                  </article>
                </div>

                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  <span>{selectedRow.report.message}</span>
                  <span>{selectedRow.pdf.message}</span>
                </div>

                <div
                  style={{
                    alignItems: 'center',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.6rem',
                  }}
                >
                  <a
                    href={selectedRow.url}
                    rel="noreferrer"
                    style={{ color: '#1d4ed8' }}
                    target="_blank"
                  >
                    Open job posting
                  </a>

                  {selectedRow.report.exists ? (
                    <button
                      aria-label="Open report viewer from pipeline detail"
                      onClick={() =>
                        onOpenReportViewer({
                          reportPath: selectedRow.report.repoRelativePath,
                        })
                      }
                      style={buttonStyle}
                      type="button"
                    >
                      Open report viewer
                    </button>
                  ) : null}
                </div>
              </section>

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
                <header>
                  <h4 style={{ marginBottom: '0.25rem', marginTop: 0 }}>
                    Warning review
                  </h4>
                  <p style={{ color: '#64748b', margin: 0 }}>
                    Explicit review warnings stay in the API payload so the
                    browser does not infer queue risk on its own.
                  </p>
                </header>

                {selectedRow.warnings.length === 0 ? (
                  <p style={{ margin: 0 }}>
                    No queue-review warnings are attached to this row.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.65rem' }}>
                    {selectedRow.warnings.map((warning) => (
                      <article
                        key={`${warning.code}:${warning.message}`}
                        style={{
                          ...getWarningTone(warning.code),
                          borderRadius: '1rem',
                          padding: '0.75rem 0.8rem',
                        }}
                      >
                        <strong>{warning.message}</strong>
                        <p style={{ marginBottom: 0, marginTop: '0.3rem' }}>
                          Code: {warning.code}
                        </p>
                      </article>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    padding: '0.8rem',
                  }}
                >
                  <p style={{ color: '#64748b', marginBottom: '0.3rem', marginTop: 0 }}>
                    Source line
                  </p>
                  <code
                    style={{
                      display: 'block',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedRow.sourceLine}
                  </code>
                </div>

                {selectedRow.header ? (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '1rem',
                      display: 'grid',
                      gap: '0.45rem',
                      padding: '0.8rem',
                    }}
                  >
                    <strong>Report header snapshot</strong>
                    <span>
                      {selectedRow.header.title ?? 'Untitled report'}
                    </span>
                    <span>
                      {selectedRow.header.date ?? 'No report date'}
                    </span>
                    <span>
                      {selectedRow.header.archetype ?? 'No archetype'}
                    </span>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </section>
      </section>
    </section>
  );
}

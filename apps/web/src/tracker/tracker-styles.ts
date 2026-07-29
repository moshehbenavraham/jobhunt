import type { CSSProperties } from 'react';

export const trackerPanel: CSSProperties = {
  background: 'var(--jh-color-surface-bg)',
  borderTop: 'var(--jh-border-subtle)',
  display: 'grid',
  gap: 'var(--jh-space-4)',
  padding: 'var(--jh-space-4) 0',
};

export const trackerRow: CSSProperties = {
  alignItems: 'center',
  background: 'var(--jh-color-surface-bg)',
  borderBottom: '1px solid var(--jh-color-tracker-row-border)',
  borderLeft: '2px solid transparent',
  borderRight: 0,
  borderTop: 0,
  cursor: 'pointer',
  display: 'grid',
  gap: 'var(--jh-space-3)',
  gridTemplateColumns: '2.4rem minmax(0, 1fr) auto',
  minHeight: '4rem',
  padding: '0.75rem 0.65rem',
  textAlign: 'left',
  width: '100%',
};

export const trackerRowSelected: CSSProperties = {
  ...trackerRow,
  background: 'var(--jh-color-tracker-row-selected-bg)',
  borderBottom: '1px solid var(--jh-color-tracker-row-selected-border)',
  borderLeft: '2px solid var(--jh-color-tracker-row-selected-border)',
};

export const trackerFilterBar: CSSProperties = {
  background: 'var(--jh-color-tracker-filter-bar-bg)',
  borderBottom: '1px solid var(--jh-color-tracker-filter-bar-border)',
  borderTop: '1px solid var(--jh-color-tracker-filter-bar-border)',
  display: 'grid',
  gap: 'var(--jh-space-3)',
  padding: 'var(--jh-space-3) 0',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

export const trackerButton: CSSProperties = {
  background: 'var(--jh-color-button-bg)',
  border: '1px solid var(--jh-color-button-bg)',
  borderRadius: 'var(--jh-radius-md)',
  color: 'var(--jh-color-button-fg)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 'var(--jh-text-body-sm-size)',
  fontWeight: 'var(--jh-font-weight-bold)' as unknown as number,
  minHeight: '2.4rem',
  padding: 'var(--jh-space-2) var(--jh-space-3)',
};

export const trackerSubtleButton: CSSProperties = {
  background: 'var(--jh-color-button-subtle-bg)',
  border: 'var(--jh-border-subtle)',
  borderRadius: 'var(--jh-radius-md)',
  color: 'var(--jh-color-text-primary)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 'var(--jh-text-body-sm-size)',
  fontWeight: 'var(--jh-font-weight-semibold)' as unknown as number,
  minHeight: '2.2rem',
  padding: 'var(--jh-space-1) var(--jh-space-3)',
};

export const trackerInput: CSSProperties = {
  background: 'var(--jh-color-input-bg)',
  border: '1px solid var(--jh-color-stone)',
  borderRadius: 'var(--jh-radius-md)',
  color: 'var(--jh-color-text-primary)',
  font: 'inherit',
  fontSize: 'var(--jh-text-body-sm-size)',
  minHeight: 'var(--jh-dense-row-height)',
  padding: 'var(--jh-space-2) var(--jh-space-3)',
};

export const trackerStatCard: CSSProperties = {
  background: 'var(--jh-color-fog)',
  borderLeft: '2px solid var(--jh-color-stone)',
  padding: 'var(--jh-space-2) var(--jh-space-3)',
};

export const trackerWarning: CSSProperties = {
  background: 'var(--jh-color-status-warning-bg)',
  border: '1px solid var(--jh-color-status-warning-border)',
  borderRadius: 'var(--jh-radius-sm)',
  padding: 'var(--jh-space-2) var(--jh-space-3)',
};

export const trackerNoticeInfo: CSSProperties = {
  background: 'var(--jh-color-severity-info-bg)',
  borderColor: 'var(--jh-color-status-running-border)',
};

export const trackerNoticeSuccess: CSSProperties = {
  background: 'var(--jh-color-status-ready-bg)',
  borderColor: 'var(--jh-color-status-ready-border)',
};

export const trackerNoticeWarn: CSSProperties = {
  background: 'var(--jh-color-status-offline-bg)',
  borderColor: 'var(--jh-color-status-offline-border)',
};

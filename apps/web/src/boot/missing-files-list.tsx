import type { CSSProperties } from 'react';
import type { StartupMissingItem } from './startup-types';

type MissingFilesListProps = {
  heading: string;
  id: string;
  items: StartupMissingItem[];
  tone: 'critical' | 'info' | 'warning';
};

const toneStyles: Record<MissingFilesListProps['tone'], CSSProperties> = {
  critical: {
    background: '#fff1f2',
    borderColor: '#fecdd3',
  },
  info: {
    background: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  warning: {
    background: '#fff7ed',
    borderColor: '#fed7aa',
  },
};

const sectionStyle: CSSProperties = {
  border: '1px solid #d4d4d8',
  borderRadius: '1rem',
  padding: '1rem 1.25rem',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const itemStyle: CSSProperties = {
  borderRadius: '0.75rem',
  border: '1px solid #e5e7eb',
  padding: '0.85rem 0.95rem',
};

const labelStyle: CSSProperties = {
  color: '#475569',
  display: 'block',
  fontSize: '0.9rem',
  marginTop: '0.4rem',
};

function formatCandidates(item: StartupMissingItem): string {
  return item.candidates.join(' or ');
}

export function MissingFilesList({
  heading,
  id,
  items,
  tone,
}: MissingFilesListProps) {
  const orderedItems = [...items].sort((left, right) =>
    left.canonicalRepoRelativePath.localeCompare(right.canonicalRepoRelativePath),
  );

  return (
    <section
      aria-labelledby={id}
      style={{
        ...sectionStyle,
        ...toneStyles[tone],
      }}
    >
      <h2 id={id} style={{ marginTop: 0 }}>
        {heading}
      </h2>
      <ul aria-label={heading} style={listStyle}>
        {orderedItems.map((item) => (
          <li key={item.surfaceKey} style={itemStyle}>
            <strong>{item.description}</strong>
            <span style={labelStyle}>Expected path: {item.canonicalRepoRelativePath}</span>
            <span style={labelStyle}>Accepted candidates: {formatCandidates(item)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

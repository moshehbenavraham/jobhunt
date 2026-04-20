import type { CSSProperties } from 'react';

const shellState = {
  title: 'Local parity scaffold',
  status: 'ready',
  summary:
    'This placeholder confirms the web workspace loads without reading or mutating user-layer files.',
} as const;

const guarantees = [
  {
    id: 'workspace',
    label: 'Root workspace routing',
    detail: 'Repo-level npm commands now address the web and API packages directly.',
  },
  {
    id: 'app-state',
    label: '.jobhunt-app ownership',
    detail: 'App-owned runtime state is reserved for the API helper layer, not the browser shell.',
  },
  {
    id: 'user-layer',
    label: 'User data boundary',
    detail: 'Profile, tracker, report, and output files remain outside this scaffold session.',
  },
] as const;

const pageStyle: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1.5,
  margin: '0 auto',
  maxWidth: '48rem',
  padding: '3rem 1.5rem',
};

const sectionStyle: CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: '0.75rem',
  padding: '1rem 1.25rem',
};

export function App() {
  return (
    <main style={pageStyle}>
      <header>
        <p>Job-Hunt app scaffold</p>
        <h1>{shellState.title}</h1>
        <p role="status" aria-live="polite">
          Scaffold status: {shellState.status}. {shellState.summary}
        </p>
      </header>

      <section aria-labelledby="guarantees-heading" style={sectionStyle}>
        <h2 id="guarantees-heading">Current guarantees</h2>
        <ul>
          {guarantees.map((item) => (
            <li key={item.id}>
              <strong>{item.label}:</strong> {item.detail}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

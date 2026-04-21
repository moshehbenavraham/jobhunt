# Web

The web package owns the local bootstrap shell for Job-Hunt. It renders
startup state from the API boot surface and keeps the onboarding and readiness
signals visible in the browser.

## Quick Start

```bash
npm run dev
npm run build
npm run check
```

## What Lives Here

- `src/App.tsx` - the bootstrap shell that renders loading, ready, offline,
  and error states
- `src/boot/` - client, hook, and view helpers for startup diagnostics
- `src/main.tsx` - the React entrypoint
- `vite.config.ts` - local dev server and `/api` proxy wiring

When you are working from the repo root, the corresponding aliases are
`npm run app:web:dev`, `npm run app:web:build`, and `npm run app:check`.

## Runtime Boundaries

- The shell reads startup state from the API instead of duplicating repo
  contract logic.
- The package must remain read-only with respect to user-layer content.
- It is safe to run locally even when the repo is missing onboarding files,
  because the UI should surface those gaps instead of masking them.

## Related Docs

- [Architecture](../../docs/ARCHITECTURE.md)
- [Development](../../docs/development.md)
- [Onboarding](../../docs/onboarding.md)

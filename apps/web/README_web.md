# Web

The web package owns the local operator shell for Job-Hunt. It renders
startup state from the API boot surface and keeps onboarding, approval,
settings, and readiness signals visible in the browser.

## Quick Start

```bash
npm run dev
npm run build
npm run check
```

## What Lives Here

- `src/App.tsx` - the operator shell that switches between startup, onboarding,
  approval, settings, and error states
- `src/boot/` - client, hook, and view helpers for startup diagnostics
- `src/onboarding/` - onboarding summary, repair, and checklist views
- `src/approvals/` - approval inbox views and mutation helpers
- `src/settings/` - settings, maintenance, and update-check views
- `src/main.tsx` - the React entrypoint
- `vite.config.ts` - local dev server and `/api` proxy wiring

When you are working from the repo root, the corresponding aliases are
`npm run app:web:dev`, `npm run app:web:build`, and `npm run app:check`.

## Runtime Boundaries

- The shell reads startup and maintenance state from the API instead of
  duplicating repo contract logic.
- The package must remain read-only with respect to user-layer content.
- It is safe to run locally even when the repo is missing onboarding files,
  because the UI should surface those gaps and the repair options instead of
  masking them.

## Related Docs

- [Architecture](../../docs/ARCHITECTURE.md)
- [Development](../../docs/development.md)
- [Onboarding](../../docs/onboarding.md)

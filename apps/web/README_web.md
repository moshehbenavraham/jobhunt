# Web

The web package owns the local operator shell for Job-Hunt. It renders
startup state from the API boot surface and keeps onboarding, approval,
settings, application-help, and readiness signals visible in the browser.

The shell uses a design token system (mineral paper palette, Space Grotesk /
IBM Plex typography), a CSS Grid three-zone layout, React Router for
deep-linkable navigation, and a Cmd/Ctrl+K command palette.

## Quick Start

```bash
npm run dev
npm run build
npm run check
```

## What Lives Here

- `src/main.tsx` - React entrypoint, mounts `RouterProvider`
- `src/routes.tsx` - route tree with 13 surface routes, legacy hash redirect,
  and catch-all 404
- `src/styles/` - design token layer
  - `tokens.css` - color palette, spacing, radius, shadow, typography scale,
    font families, breakpoints, and responsive layout tokens
  - `base.css` - CSS reset and typographic defaults
  - `layout.css` - CSS Grid shell frame, three-zone body, and responsive
    breakpoints (desktop >= 1200px, tablet 768-1199px, mobile < 768px)
- `src/shell/` - shell chrome and composition
  - `root-layout.tsx` - three-zone layout with `<Outlet />`, ShellContext
    provider, and command palette mount
  - `shell-context.tsx` - cross-surface navigation callbacks via React context
  - `navigation-rail.tsx` - full / collapsed / hidden variants with NavLink
  - `evidence-rail.tsx` - right-side evidence panel (inline or drawer)
  - `bottom-nav.tsx` - mobile bottom navigation bar
  - `drawer.tsx` - slide-over drawer with focus trap and scroll lock
  - `use-responsive-layout.ts` - breakpoint detection and drawer state
  - `command-palette.tsx` - Cmd/Ctrl+K overlay with fuzzy search
  - `use-command-palette.ts` - keyboard listener and command registry
  - `command-palette-types.ts` - palette command and action types
  - `operator-home-surface.tsx` - daily landing view
  - `status-strip.tsx` - top-level status cards
  - `surface-placeholder.tsx` - placeholder content for unbuilt surfaces
  - `shell-types.ts` - surface definitions, path mappings, and type contracts
- `src/pages/` - 14 route page components (thin wrappers around surface
  components with router-aware props)
- `src/boot/` - client, hook, and view helpers for startup diagnostics
- `src/onboarding/` - onboarding summary, repair, and checklist views
- `src/approvals/` - approval inbox views and mutation helpers
- `src/settings/` - settings, maintenance, and update-check views
- `src/application-help/` - draft review, context, and approval-aware views
- `src/App.tsx` - legacy wrapper (RouterProvider passthrough)
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

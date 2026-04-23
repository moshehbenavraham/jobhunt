# 0003. React Router for Deep-Linkable Navigation

**Status:** Accepted
**Date:** 2026-04-23

## Context

The shell previously used hash-fragment navigation (`#surface-id`) managed by
a custom `useOperatorShell` hook. This prevented browser back/forward, URL
sharing, and bookmark support.

## Options Considered

1. Keep hash-fragment navigation with improved sync - backward compatible but
   no real URL routing
2. React Router with `createBrowserRouter` and page components - standard
   routing, deep linking, browser history integration

## Decision

Option 2. A `createBrowserRouter` route tree in `src/routes.tsx` maps all 13
surfaces to clean URL paths. A root layout component (`root-layout.tsx`)
provides shell chrome around the router `<Outlet />`. Cross-surface navigation
uses `useNavigate()` via `ShellContext`.

## Consequences

- All 13 operator surfaces are deep-linkable and bookmarkable.
- Browser back/forward navigation works natively.
- Legacy `#surface-id` bookmarks are redirected by a route loader.
- `App.tsx` and `operator-shell.tsx` become thin wrappers for backward
  compatibility.
- Future Phase 02 routes (`/runs/:runId`, `/reports/:reportId`) have stub
  redirects ready for implementation.

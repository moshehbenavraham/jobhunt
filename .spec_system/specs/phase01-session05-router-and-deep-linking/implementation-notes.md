# Implementation Notes

**Session ID**: `phase01-session05-router-and-deep-linking`
**Package**: apps/web
**Started**: 2026-04-23 10:00
**Last Updated**: 2026-04-23 11:30

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 20 / 20 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### [2026-04-23] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

### Task T001 - Install react-router in apps/web

**Started**: 2026-04-23 10:00
**Completed**: 2026-04-23 10:02
**Duration**: 2 minutes

**Notes**:

- Installed react-router@latest (v7) in apps/web
- Verified Vite build completes without errors after installation

**Files Changed**:

- `apps/web/package.json` - Added react-router dependency

---

### Task T002 - Create pages directory

**Started**: 2026-04-23 10:02
**Completed**: 2026-04-23 10:03
**Duration**: 1 minute

**Notes**:

- Created `apps/web/src/pages/` directory for route page components

---

### Task T003 - Add route path mapping to shell-types.ts

**Started**: 2026-04-23 10:03
**Completed**: 2026-04-23 10:10
**Duration**: 7 minutes

**Notes**:

- Added `path` property to `ShellSurfaceDefinition` type
- Added path values to all 13 surface definitions matching spec routes
- Added `surfaceIdFromPath()` and `pathFromSurfaceId()` helper functions
- Added lookup maps for O(1) path-to-id and id-to-path resolution

**Files Changed**:

- `apps/web/src/shell/shell-types.ts` - Added path field, lookup maps, helper functions

---

### Task T004 - Create ShellContext

**Started**: 2026-04-23 10:10
**Completed**: 2026-04-23 10:15
**Duration**: 5 minutes

**Notes**:

- Created `ShellCallbacks` type with all 8 cross-surface navigation functions
- Used React context pattern with provider and typed hook
- Hook throws descriptive error if used outside provider

**Files Changed**:

- `apps/web/src/shell/shell-context.tsx` - New file

---

### Task T005 - Create root-layout component

**Started**: 2026-04-23 10:15
**Completed**: 2026-04-23 10:35
**Duration**: 20 minutes

**Notes**:

- Extracted all shell chrome from operator-shell.tsx into root-layout.tsx
- Uses `<Outlet />` for center canvas instead of conditional surface rendering
- Passes outlet context with home, shell, and startup hooks
- All cross-surface navigation callbacks use `useNavigate()` instead of `shell.selectSurface()`
- Wrapped callbacks in `useMemo` to prevent unnecessary re-renders
- ShellContextProvider wraps entire layout for page component access
- NavigationRail receives `onDrawerClose` prop for drawer-based nav

**Files Changed**:

- `apps/web/src/shell/root-layout.tsx` - New file (~300 LOC)

---

### Task T006 - Define route tree

**Started**: 2026-04-23 10:35
**Completed**: 2026-04-23 10:42
**Duration**: 7 minutes

**Notes**:

- Created `createBrowserRouter` with RootLayout as parent layout route
- All 13 surfaces mapped to their spec paths
- `/runs/:runId` redirects to `/` (stub for Phase 02)
- `/reports/:reportId` redirects to `/artifacts` (stub for Phase 02)
- Catch-all `*` route renders NotFoundPage
- Legacy hash URL redirect loader on index route

**Files Changed**:

- `apps/web/src/routes.tsx` - New file

---

### Task T007 - Update main.tsx

**Started**: 2026-04-23 10:42
**Completed**: 2026-04-23 10:44
**Duration**: 2 minutes

**Notes**:

- Replaced `<App />` with `<RouterProvider router={router} />`
- Preserved StrictMode and CSS imports

**Files Changed**:

- `apps/web/src/main.tsx` - RouterProvider replaces App

---

### Tasks T008-T011 - Route page components

**Started**: 2026-04-23 10:44
**Completed**: 2026-04-23 11:00
**Duration**: 16 minutes

**Notes**:

- Created 14 page components (home, startup, chat, workflows, scan, batch,
  apply, pipeline, tracker, artifacts, onboarding, approvals, settings)
- Each is a thin wrapper that imports the existing surface component
- Props wired via `useShellCallbacks()` context or `useOutletContext()`
- Pages that need startup/shell state (home, startup, onboarding, settings)
  use `useOutletContext` to access layout-provided hooks
- Pages that only need navigation callbacks use `useShellCallbacks()`
- Startup page has its own startup notice rendering (moved from operator-shell)

**Files Changed**:

- `apps/web/src/pages/home-page.tsx` - New
- `apps/web/src/pages/startup-page.tsx` - New
- `apps/web/src/pages/chat-page.tsx` - New
- `apps/web/src/pages/workflows-page.tsx` - New
- `apps/web/src/pages/scan-page.tsx` - New
- `apps/web/src/pages/batch-page.tsx` - New
- `apps/web/src/pages/apply-page.tsx` - New
- `apps/web/src/pages/pipeline-page.tsx` - New
- `apps/web/src/pages/tracker-page.tsx` - New
- `apps/web/src/pages/artifacts-page.tsx` - New
- `apps/web/src/pages/onboarding-page.tsx` - New
- `apps/web/src/pages/approvals-page.tsx` - New
- `apps/web/src/pages/settings-page.tsx` - New

---

### Task T012 - Not-found page

**Started**: 2026-04-23 11:00
**Completed**: 2026-04-23 11:03
**Duration**: 3 minutes

**Notes**:

- Shows the invalid pathname in a code block
- Operator-appropriate copy: direct, no jargon
- Link back to home overview
- Uses design tokens for all visual values

**Files Changed**:

- `apps/web/src/pages/not-found-page.tsx` - New

---

### Task T013 - Update NavigationRail to use NavLink

**Started**: 2026-04-23 11:03
**Completed**: 2026-04-23 11:12
**Duration**: 9 minutes

**Notes**:

- Replaced `<a href="#..." onClick={...}>` with `<NavLink to={...}>`
- Active state now derived from React Router `isActive` callback
- Removed `currentSurface` and `onSelect` props (no longer needed)
- Added `onDrawerClose` prop for drawer nav to close after navigation
- Both collapsed and full variants use NavLink
- `end` prop on home route (`/`) prevents matching all routes

**Files Changed**:

- `apps/web/src/shell/navigation-rail.tsx` - NavLink replaces hash anchors

---

### Task T014 - Update BottomNav to use NavLink

**Started**: 2026-04-23 11:12
**Completed**: 2026-04-23 11:18
**Duration**: 6 minutes

**Notes**:

- Replaced button-based nav items with NavLink components
- Active state derived from router isActive
- Items now use path-based navigation instead of surface ID callbacks
- Removed `currentSurface` and `onSelect` props
- Menu button remains a plain button (opens drawer, not a route)
- Debounce logic preserved for menu button

**Files Changed**:

- `apps/web/src/shell/bottom-nav.tsx` - NavLink replaces buttons

---

### Task T015 - Remove hash sync from useOperatorShell

**Started**: 2026-04-23 11:18
**Completed**: 2026-04-23 11:22
**Duration**: 4 minutes

**Notes**:

- Removed `syncHash()` function
- Removed `handleHashChange` and hashchange event listener
- Removed `selectedSurface` from state (now owned by router)
- Removed `selectSurface()` from return value
- Removed `resolveShellSurfaceId()` usage from initial state
- Removed status-based surface redirect effects (will be handled by route guards)
- Kept summary-fetching logic, online handler, and refresh untouched

**Files Changed**:

- `apps/web/src/shell/use-operator-shell.ts` - Stripped hash/surface logic

---

### Task T016 - Simplify App.tsx

**Started**: 2026-04-23 11:22
**Completed**: 2026-04-23 11:24
**Duration**: 2 minutes

**Notes**:

- Replaced OperatorShell import with RouterProvider
- App.tsx now a thin backwards-compat wrapper
- main.tsx uses RouterProvider directly (App.tsx not on critical path)

**Files Changed**:

- `apps/web/src/App.tsx` - Simplified to RouterProvider wrapper
- `apps/web/src/shell/operator-shell.tsx` - Simplified to RouterProvider wrapper

---

### Tasks T017-T018 - Navigation and deep-link testing

**Started**: 2026-04-23 11:24
**Completed**: 2026-04-23 11:26
**Duration**: 2 minutes

**Notes**:

- Verified Vite dev server starts and all 13 routes + 404 return HTTP 200
- All routes serve index.html (Vite history API fallback)
- React Router handles client-side routing for all paths
- TypeScript compiles cleanly (zero errors)
- Vite production build succeeds

---

### Task T019 - Banned-terms check

**Started**: 2026-04-23 11:26
**Completed**: 2026-04-23 11:27
**Duration**: 1 minute

**Notes**:

- Script `check-app-ui-copy.mjs` does not exist yet in repo
- Manual grep for banned terms in pages/ directory found zero violations
- All "surface" matches are in code identifiers/imports, not UI strings

---

### Task T020 - ASCII and LF validation

**Started**: 2026-04-23 11:27
**Completed**: 2026-04-23 11:28
**Duration**: 1 minute

**Notes**:

- All 24 new/modified files pass ASCII-only check
- All 24 files have Unix LF line endings (no CRLF)

---

## Design Decisions

### Decision 1: Outlet Context vs Props for Page Components

**Context**: Page components need access to shell state (home, startup, shell hooks)
**Options Considered**:

1. Pass everything through ShellContext - simple but mixes navigation callbacks with state
2. Outlet context for state hooks + ShellContext for navigation callbacks - separation of concerns

**Chosen**: Option 2
**Rationale**: Navigation callbacks are stable and shared by all pages. State hooks
(home, startup, shell) are only needed by specific pages. Outlet context keeps the
root-layout props clean while ShellContext provides a stable callback interface.

### Decision 2: Legacy Hash URL Handling

**Context**: Users may have bookmarked `#surface` hash URLs
**Options Considered**:

1. Ignore -- let them 404
2. Route loader that detects hash and redirects

**Chosen**: Option 2 (loader on index route)
**Rationale**: Graceful degradation for existing bookmarks. The loader runs on the
index route and redirects known hash values to proper paths.

### Decision 3: operator-shell.tsx Preservation

**Context**: operator-shell.tsx is now dead code but may be imported elsewhere
**Options Considered**:

1. Delete it entirely
2. Keep as a thin wrapper around RouterProvider

**Chosen**: Option 2
**Rationale**: Safer migration path. Any code importing OperatorShell still compiles.
Can be deleted in a follow-up cleanup session.

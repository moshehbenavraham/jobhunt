# Session Specification

**Session ID**: `phase01-session05-router-and-deep-linking`
**Phase**: 01 - Rebuild Foundation and Shell
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session replaces the current hash-based navigation with React Router,
giving every major app surface a real URL that survives browser refresh and
can be shared or bookmarked. The existing `useOperatorShell` hook manages
surface selection through `window.location.hash` and manual `hashchange`
listeners; this approach is stretched past its useful limit and cannot
support deep links to parameterized views like `/runs/:runId` or
`/reports/:reportId`.

The migration touches three layers: (1) installing and configuring React
Router with a route tree that mirrors the UX PRD surface list, (2) rewiring
`App.tsx` and `main.tsx` to mount a `RouterProvider` / `BrowserRouter`,
and (3) updating the operator shell, navigation rail, bottom nav, and
drawer nav to derive active state from the router instead of local hash
state. Surface components themselves are not rebuilt -- they remain as-is
behind route-level lazy boundaries or direct imports.

Completing this session unblocks Session 06 (command palette), which needs
route-based navigation targets for palette commands.

---

## 2. Objectives

1. Install React Router and configure a route tree covering all major PRD
   surfaces with distinct URL paths
2. Rewire App.tsx and main.tsx to use RouterProvider so the router owns
   navigation state
3. Update operator-shell.tsx, navigation-rail.tsx, bottom-nav.tsx, and
   drawer nav to derive active state from the router instead of hash state
4. Ensure browser refresh preserves the operator's current surface and that
   deep links pasted into a new tab resolve correctly
5. Add a 404 catch-all route with operator-appropriate copy
6. Remove all hash-based navigation code once the router is in place

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - design tokens in place
- [x] `phase01-session02-typography-and-base-styles` - typography loaded
- [x] `phase01-session03-three-zone-shell-layout` - three-zone layout stable
- [x] `phase01-session04-responsive-layout-and-mobile` - responsive behavior stable

### Required Tools/Knowledge

- React Router v7 API (createBrowserRouter, RouterProvider, NavLink, Outlet,
  useLocation, useNavigate, useParams)
- Vite dev server history-api-fallback (enabled by default)

### Environment Requirements

- Node.js, npm, Vite dev server
- `apps/web` builds and starts without errors

---

## 4. Scope

### In Scope (MVP)

- Install `react-router` in apps/web
- Define route config with paths: `/` (home), `/startup`, `/evaluate`
  (chat), `/workflows`, `/scan`, `/batch`, `/apply` (application-help),
  `/pipeline`, `/tracker`, `/artifacts`, `/onboarding`, `/approvals`,
  `/settings`, `/runs/:runId`, `/reports/:reportId`
- Create a root layout route that renders the operator shell frame (status
  strip, nav rail, center outlet, evidence rail)
- Update `main.tsx` to mount `RouterProvider` instead of bare `<App />`
- Convert `App.tsx` into the root layout component that renders `<Outlet />`
  for the center canvas
- Create route-level page components that wrap existing surface components
- Update `NavigationRail` to use `NavLink` for active-state highlighting
- Update `BottomNav` to use `NavLink` or `useLocation` for active state
- Update drawer nav to close drawer and navigate via router
- Remove `syncHash`, `resolveShellSurfaceId` hash logic, and `hashchange`
  listener from `useOperatorShell`
- Add a `NotFoundPage` component for the 404 catch-all
- Ensure Vite dev server serves index.html for all routes (default behavior)
- Maintain all existing surface focus-sync helpers (they remain internal
  state, not URL params)

### Out of Scope (Deferred)

- Building out individual surface content (Phase 02)
- Nested sub-routes within surfaces (Phase 02)
- URL-based focus state for reports/runs (Phase 02 `/runs/:runId` content)
- Server-side rendering
- Code splitting / lazy loading optimization (can be added later)

---

## 5. Technical Approach

### Architecture

- Single `createBrowserRouter` call in `main.tsx` defining a flat route tree
  under a root layout
- Root layout component renders the shell frame (StatusStrip, nav rail,
  evidence rail) with an `<Outlet />` for the center canvas
- Each route element is a thin page component that imports and renders the
  existing surface component, passing required cross-surface callbacks via
  context or props
- Navigation state is owned entirely by React Router; the shell reads
  `useLocation()` to determine active surface instead of local state
- Cross-surface navigation helpers (`openApprovals`, `openPipeline`, etc.)
  call `navigate()` from React Router instead of `shell.selectSurface()`

### Design Patterns

- **Layout Route**: Root layout renders persistent shell chrome around an
  Outlet
- **Thin Route Pages**: Each page component is a minimal wrapper around the
  existing surface component -- no logic duplication
- **Context for Shell Callbacks**: A ShellContext provides cross-surface
  navigation functions so surface components do not need prop drilling
  through the route tree

### Technology Stack

- React Router v7 (`react-router`)
- React 19 (existing)
- Vite 8 (existing)
- CSS custom properties for design tokens (existing)

---

## 6. Deliverables

### Files to Create

| File                                     | Purpose                                              | Est. Lines |
| ---------------------------------------- | ---------------------------------------------------- | ---------- |
| `apps/web/src/routes.tsx`                | Route tree definition with createBrowserRouter       | ~120       |
| `apps/web/src/shell/shell-context.tsx`   | React context for cross-surface navigation callbacks | ~80        |
| `apps/web/src/shell/root-layout.tsx`     | Root layout component (shell frame + Outlet)         | ~100       |
| `apps/web/src/pages/home-page.tsx`       | Route page wrapping OperatorHomeSurface              | ~30        |
| `apps/web/src/pages/startup-page.tsx`    | Route page wrapping startup surface                  | ~30        |
| `apps/web/src/pages/chat-page.tsx`       | Route page wrapping ChatConsoleSurface               | ~25        |
| `apps/web/src/pages/workflows-page.tsx`  | Route page wrapping SpecialistWorkspaceSurface       | ~25        |
| `apps/web/src/pages/scan-page.tsx`       | Route page wrapping ScanReviewSurface                | ~20        |
| `apps/web/src/pages/batch-page.tsx`      | Route page wrapping BatchWorkspaceSurface            | ~25        |
| `apps/web/src/pages/apply-page.tsx`      | Route page wrapping ApplicationHelpSurface           | ~25        |
| `apps/web/src/pages/pipeline-page.tsx`   | Route page wrapping PipelineReviewSurface            | ~20        |
| `apps/web/src/pages/tracker-page.tsx`    | Route page wrapping TrackerWorkspaceSurface          | ~20        |
| `apps/web/src/pages/artifacts-page.tsx`  | Route page wrapping ReportViewerSurface              | ~20        |
| `apps/web/src/pages/onboarding-page.tsx` | Route page wrapping OnboardingWizardSurface          | ~25        |
| `apps/web/src/pages/approvals-page.tsx`  | Route page wrapping ApprovalInboxSurface             | ~20        |
| `apps/web/src/pages/settings-page.tsx`   | Route page wrapping SettingsSurface                  | ~25        |
| `apps/web/src/pages/not-found-page.tsx`  | 404 catch-all with operator-appropriate copy         | ~35        |

### Files to Modify

| File                                       | Changes                                                      | Est. Lines |
| ------------------------------------------ | ------------------------------------------------------------ | ---------- |
| `apps/web/src/main.tsx`                    | Replace `<App />` with `<RouterProvider>`                    | ~15        |
| `apps/web/src/App.tsx`                     | Remove or redirect to root-layout                            | ~5         |
| `apps/web/src/shell/operator-shell.tsx`    | Extract shell frame to root-layout; remove surface switching | ~-200      |
| `apps/web/src/shell/navigation-rail.tsx`   | Replace `onSelect` + hash links with `NavLink`               | ~40        |
| `apps/web/src/shell/bottom-nav.tsx`        | Use router NavLink for active state                          | ~20        |
| `apps/web/src/shell/use-operator-shell.ts` | Remove hash sync, use router for surface state               | ~-60       |
| `apps/web/src/shell/shell-types.ts`        | Add route path mapping to surface definitions                | ~20        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] All 13 major surfaces reachable via distinct URL paths
- [ ] Browser refresh preserves the operator's current surface
- [ ] Deep links pasted into a new tab resolve to the correct surface
- [ ] Navigation rail highlights the active route
- [ ] Bottom nav highlights the active route on mobile
- [ ] Drawer nav closes and navigates via router
- [ ] 404 route renders operator-appropriate "not found" page
- [ ] All existing cross-surface navigation flows still work

### Testing Requirements

- [ ] Manual navigation test: visit each route, verify correct surface renders
- [ ] Manual refresh test: refresh on each route, verify surface persists
- [ ] Manual deep-link test: paste URL in new tab, verify correct surface
- [ ] Manual 404 test: visit invalid URL, verify not-found page

### Non-Functional Requirements

- [ ] No flash of wrong content on route transitions
- [ ] Navigation transitions feel instant (no loading spinners for surface switching)

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (CONVENTIONS.md)
- [ ] No banned terms in user-visible strings
- [ ] Banned-terms check passes (`scripts/check-app-ui-copy.mjs`)

---

## 8. Implementation Notes

### Key Considerations

- The existing `useOperatorShell` hook manages both shell summary fetching
  AND surface selection via hash state. The summary-fetching logic stays;
  the surface-selection and hash-sync logic is replaced by the router.
- Surface focus-sync helpers (e.g., `syncApprovalInboxFocus`) remain
  unchanged -- they manage internal component state, not URL state.
- The Vite dev server serves `index.html` for all paths by default
  (history API fallback), so no server config changes are needed.

### Potential Challenges

- **Large operator-shell.tsx refactor**: The component currently owns both
  shell chrome and surface rendering. Splitting into root-layout (chrome)
  and route pages (surfaces) requires careful extraction without breaking
  callback wiring.
  Mitigation: Use a ShellContext to provide cross-surface callbacks.
- **Hash-to-path migration**: Users with bookmarked `#surface` URLs will
  get 404s.
  Mitigation: Add a catch-all that redirects legacy hash URLs to the
  correct path.

### Relevant Considerations

- [P00] **No real router -- hash and query syncing is stretched past its
  useful limit**: This session directly resolves this concern.
- [P00] **No deep-linkable routes for report, run, or pipeline review
  states**: This session adds the route structure; Phase 02 fills in
  parameterized route content.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Navigation to an invalid route must render a clear not-found state, not
  a blank screen or crash
- Browser back/forward must work correctly after programmatic navigation
- Legacy hash URLs should degrade gracefully (redirect or not-found) rather
  than rendering a broken state

---

## 9. Testing Strategy

### Unit Tests

- Verify route config maps all surface IDs to correct paths
- Verify ShellContext provides all required navigation callbacks

### Integration Tests

- None required at this stage (no backend changes)

### Manual Testing

- Navigate to each route via URL bar, verify correct surface
- Click each nav rail item, verify URL updates and surface renders
- Click each bottom nav item on mobile, verify URL updates
- Refresh browser on each route, verify surface persists
- Paste deep link in new tab, verify correct surface
- Use browser back/forward after navigating, verify correct behavior
- Visit invalid URL, verify 404 page renders
- Visit legacy hash URL (e.g., `/#chat`), verify redirect or not-found

### Edge Cases

- Double-click on nav item (should not double-navigate)
- Navigate while shell summary is loading (should not lose summary data)
- Navigate to onboarding when status is "ready" (should redirect to home)
- Navigate to home when status is "missing-prerequisites" (should redirect
  to onboarding)

---

## 10. Dependencies

### External Libraries

- `react-router`: v7 (latest stable)

### Other Sessions

- **Depends on**: phase01-session01 through phase01-session04
- **Depended by**: phase01-session06-command-palette-and-operator-copy

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.

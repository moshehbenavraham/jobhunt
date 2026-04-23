# Implementation Summary

**Session ID**: `phase01-session05-router-and-deep-linking`
**Package**: apps/web
**Completed**: 2026-04-23
**Duration**: ~1.5 hours

---

## Overview

Replaced hash-based navigation with React Router v7, giving every major app
surface a real URL that survives browser refresh and can be shared or
bookmarked. Introduced a root layout route that renders the persistent shell
frame around an Outlet, created thin route-level page components for all 13
surfaces, and wired NavigationRail/BottomNav to use NavLink for active-state
highlighting. Removed all hash sync code from useOperatorShell.

---

## Deliverables

### Files Created

| File                                     | Purpose                                              | Lines |
| ---------------------------------------- | ---------------------------------------------------- | ----- |
| `apps/web/src/routes.tsx`                | Route tree with createBrowserRouter                  | ~70   |
| `apps/web/src/shell/shell-context.tsx`   | React context for cross-surface navigation callbacks | ~40   |
| `apps/web/src/shell/root-layout.tsx`     | Root layout (shell frame + Outlet)                   | ~300  |
| `apps/web/src/pages/home-page.tsx`       | Route page wrapping OperatorHomeSurface              | ~25   |
| `apps/web/src/pages/startup-page.tsx`    | Route page wrapping startup diagnostics              | ~170  |
| `apps/web/src/pages/chat-page.tsx`       | Route page wrapping ChatConsoleSurface               | ~15   |
| `apps/web/src/pages/workflows-page.tsx`  | Route page wrapping SpecialistWorkspaceSurface       | ~20   |
| `apps/web/src/pages/scan-page.tsx`       | Route page wrapping ScanReviewSurface                | ~10   |
| `apps/web/src/pages/batch-page.tsx`      | Route page wrapping BatchWorkspaceSurface            | ~15   |
| `apps/web/src/pages/apply-page.tsx`      | Route page wrapping ApplicationHelpSurface           | ~15   |
| `apps/web/src/pages/pipeline-page.tsx`   | Route page wrapping PipelineReviewSurface            | ~10   |
| `apps/web/src/pages/tracker-page.tsx`    | Route page wrapping TrackerWorkspaceSurface          | ~10   |
| `apps/web/src/pages/artifacts-page.tsx`  | Route page wrapping ReportViewerSurface              | ~5    |
| `apps/web/src/pages/onboarding-page.tsx` | Route page wrapping OnboardingWizardSurface          | ~25   |
| `apps/web/src/pages/approvals-page.tsx`  | Route page wrapping ApprovalInboxSurface             | ~10   |
| `apps/web/src/pages/settings-page.tsx`   | Route page wrapping SettingsSurface                  | ~25   |
| `apps/web/src/pages/not-found-page.tsx`  | 404 catch-all with operator copy                     | ~50   |

### Files Modified

| File                                       | Changes                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| `apps/web/package.json`                    | Added react-router ^7.14.2                              |
| `apps/web/src/main.tsx`                    | RouterProvider replaces bare App                        |
| `apps/web/src/App.tsx`                     | Simplified to thin backwards-compat wrapper             |
| `apps/web/src/shell/operator-shell.tsx`    | Simplified to RouterProvider wrapper                    |
| `apps/web/src/shell/navigation-rail.tsx`   | NavLink replaces hash anchors, active state from router |
| `apps/web/src/shell/bottom-nav.tsx`        | NavLink replaces buttons, active state from router      |
| `apps/web/src/shell/use-operator-shell.ts` | Removed hash sync, hashchange listener, selectSurface   |
| `apps/web/src/shell/shell-types.ts`        | Added path field, lookup maps, helper functions         |

---

## Technical Decisions

1. **Outlet context for state + ShellContext for callbacks**: Navigation callbacks
   are stable and shared by all pages; state hooks (home, startup, shell) are only
   needed by specific pages. This separation keeps each context focused.
2. **Legacy hash URL redirect loader**: A loader on the index route detects hash
   values and redirects to proper paths for graceful migration of old bookmarks.
3. **operator-shell.tsx preserved as thin wrapper**: Safer migration path -- any
   code importing OperatorShell still compiles. Can be deleted in cleanup.

---

## Test Results

| Metric                | Value                             |
| --------------------- | --------------------------------- |
| Tests                 | 0 (no test files in apps/web yet) |
| TypeScript Compile    | 0 errors                          |
| Vite Production Build | Succeeds (142 modules, 849 kB)    |
| Coverage              | N/A                               |

---

## Lessons Learned

1. Splitting shell chrome from surface rendering into layout route + page
   components was the highest-risk refactor; ShellContext made callback wiring
   clean without prop drilling through the route tree.
2. The `end` prop on NavLink is essential for the home route (`/`) to prevent
   it matching all routes.

---

## Future Considerations

Items for future sessions:

1. Delete operator-shell.tsx once all external imports are confirmed migrated
2. Add lazy loading / code splitting for route page components
3. Implement parameterized route content for `/runs/:runId` and
   `/reports/:reportId` (Phase 02)
4. Add route guards for onboarding/ready status redirects

---

## Session Statistics

- **Tasks**: 20 completed
- **Files Created**: 17
- **Files Modified**: 7
- **Tests Added**: 0
- **Blockers**: 0 resolved

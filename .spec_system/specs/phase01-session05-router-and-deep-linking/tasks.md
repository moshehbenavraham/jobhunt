# Task Checklist

**Session ID**: `phase01-session05-router-and-deep-linking`
**Total Tasks**: 20
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[S0105]` = Session reference (Phase 01, Session 05)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 2      | 2      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 9      | 9      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **20** | **20** | **0**     |

---

## Setup (2 tasks)

Initial configuration and dependency installation.

- [x] T001 [S0105] Install react-router in apps/web and verify the dev server starts without errors (`apps/web/package.json`)
- [x] T002 [S0105] Create pages directory structure for route page components (`apps/web/src/pages/`)

---

## Foundation (5 tasks)

Route definitions, shell context, and root layout.

- [x] T003 [S0105] Add route path mapping to shell surface definitions so each surface ID has a canonical URL path (`apps/web/src/shell/shell-types.ts`)
- [x] T004 [S0105] Create ShellContext providing cross-surface navigation callbacks (openApprovals, openPipeline, openTracker, openArtifacts, openChatConsole, openApplicationHelp, openSpecialistDetailSurface, runHomeAction) with types matching declared contract; exhaustive enum handling (`apps/web/src/shell/shell-context.tsx`)
- [x] T005 [S0105] Create root-layout component that renders the persistent shell frame (StatusStrip, nav rail, center Outlet, evidence rail, drawers, bottom nav) with cleanup on scope exit for all acquired resources (`apps/web/src/shell/root-layout.tsx`)
- [x] T006 [S0105] Define the route tree with createBrowserRouter covering all 13 surfaces plus /runs/:runId and /reports/:reportId stubs, with a catch-all 404 route (`apps/web/src/routes.tsx`)
- [x] T007 [S0105] Update main.tsx to mount RouterProvider with the browser router instead of bare App component (`apps/web/src/main.tsx`)

---

## Implementation (9 tasks)

Route page components and navigation updates.

- [x] T008 [S0105] [P] Create home-page route component wrapping OperatorHomeSurface (`apps/web/src/pages/home-page.tsx`)
- [x] T009 [S0105] [P] Create startup-page route component wrapping startup diagnostics (`apps/web/src/pages/startup-page.tsx`)
- [x] T010 [S0105] [P] Create chat-page, workflows-page, scan-page, batch-page, apply-page route components wrapping their respective surfaces (`apps/web/src/pages/`)
- [x] T011 [S0105] [P] Create pipeline-page, tracker-page, artifacts-page, onboarding-page, approvals-page, settings-page route components wrapping their respective surfaces (`apps/web/src/pages/`)
- [x] T012 [S0105] Create not-found-page with operator-appropriate copy and a link back to home, with state reset or revalidation on re-entry (`apps/web/src/pages/not-found-page.tsx`)
- [x] T013 [S0105] Update NavigationRail to use NavLink from React Router for active-state highlighting instead of manual isSelected comparison and hash hrefs (`apps/web/src/shell/navigation-rail.tsx`)
- [x] T014 [S0105] Update BottomNav to use NavLink or useLocation from React Router for active-state derivation (`apps/web/src/shell/bottom-nav.tsx`)
- [x] T015 [S0105] Update useOperatorShell to remove hash sync (syncHash, resolveShellSurfaceId hash logic, hashchange listener) and derive selectedSurface from router location with duplicate-trigger prevention while in-flight (`apps/web/src/shell/use-operator-shell.ts`)
- [x] T016 [S0105] Remove or simplify App.tsx since the root-layout component now owns shell chrome rendering (`apps/web/src/App.tsx`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0105] Manual navigation test: visit each of the 13 surface routes via URL bar and verify the correct surface renders, nav rail highlights active item, and URL is stable on refresh
- [x] T018 [S0105] Manual deep-link and 404 test: paste deep links in new tab, verify correct surface; visit invalid URL, verify not-found page; test browser back/forward after programmatic navigation
- [x] T019 [S0105] Run banned-terms check (`node scripts/check-app-ui-copy.mjs`) and verify no new violations in route pages or not-found copy
- [x] T020 [S0105] Validate ASCII encoding on all new and modified files and verify Unix LF line endings

---

## Completion Checklist

Before marking session complete:

- [ ] All tasks marked `[x]`
- [ ] All 13 surfaces reachable via distinct URL paths
- [ ] Browser refresh preserves current surface
- [ ] Deep links resolve correctly in new tab
- [ ] 404 route renders operator-appropriate page
- [ ] Navigation rail, bottom nav, and drawer nav use router
- [ ] No remaining hash-based navigation for primary surfaces
- [ ] Banned-terms check passes
- [ ] All files ASCII-encoded with Unix LF line endings
- [ ] implementation-notes.md updated
- [ ] Ready for the validate workflow step

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.

# Session 05: Router and Deep-Linkable Navigation

**Session ID**: `phase01-session05-router-and-deep-linking`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~20
**Estimated Duration**: 3-4 hours

---

## Objective

Replace the current hash/query-based navigation with React Router to provide
deep-linkable URLs for all major app states, so refreshing the browser preserves
the operator's place and review states are shareable.

---

## Scope

### In Scope (MVP)

- Install and configure React Router in apps/web
- Define route structure aligned with UX PRD surfaces:
  - / (home/dashboard)
  - /evaluate (evaluation console)
  - /runs/:runId (run detail)
  - /reports/:reportId (report viewer)
  - /pipeline (pipeline review)
  - /tracker (tracker)
  - /scan (scan)
  - /batch (batch)
  - /settings (settings)
- Update App.tsx and main.tsx with router provider
- Update operator-shell.tsx to use router-based navigation instead of state
  switching
- Update navigation-rail.tsx to use NavLink or equivalent for active states
- Ensure browser refresh preserves current route
- Add 404/not-found fallback route
- Run sculpt-ui design brief before implementation

### Out of Scope

- Building out the content of individual surfaces (Phase 02)
- Nested sub-routes within surfaces (Phase 02 as needed)
- Server-side rendering

---

## Prerequisites

- [ ] Sessions 01-04 completed (shell layout and responsive behavior stable)
- [ ] sculpt-ui design brief completed for this session

---

## Deliverables

1. React Router installed and configured
2. Route definitions for all major PRD surfaces
3. Updated App.tsx with RouterProvider
4. operator-shell.tsx using router-based navigation
5. navigation-rail.tsx with active route indicators
6. Browser refresh preserves current route
7. 404 fallback route

---

## Success Criteria

- [ ] All major surfaces are reachable via distinct URLs
- [ ] Browser refresh does not lose the operator's place
- [ ] Navigation rail highlights the current route
- [ ] Deep links to specific routes work when pasted into a new tab
- [ ] Routes match the UX PRD where the PRD defines explicit paths
- [ ] No remaining hash or query-param navigation for primary surfaces
- [ ] sculpt-ui design brief was followed

# Session 01: Monorepo App Skeleton

**Session ID**: `phase00-session01-monorepo-app-skeleton`
**Packages**: apps/web, apps/api
**Status**: Complete
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Create the initial `apps/web` and `apps/api` package structure, shared tooling,
and app-owned state bootstrap points needed to start the migration without
changing existing repo workflows.

---

## Scope

### In Scope (MVP)

- Create the `apps/web` and `apps/api` directories and baseline package
  manifests
- Define shared workspace tooling and config needed to build or run both
  packages locally
- Add the initial `.jobhunt-app/` state-directory contract and ignore rules
- Keep the new app scaffold isolated from current report, tracker, and script
  surfaces

### Out of Scope

- Real workflow execution
- SQLite schema design
- Full UI implementation beyond the minimum shell needed for later phases

---

## Prerequisites

- [ ] Phase 00 PRD approved as the current implementation target
- [ ] Existing repo scripts and data-contract surfaces reviewed

---

## Deliverables

1. `apps/web` and `apps/api` skeletons with aligned workspace configuration
2. Initial app-owned state root definition under `.jobhunt-app/`
3. Minimal developer entrypoints or scripts that prove the scaffold is wired

---

## Success Criteria

- [x] Both packages exist and resolve from the chosen workspace tooling
- [x] The scaffold does not alter existing repo-owned user artifacts on setup
- [x] The app-owned state path is explicit and ignored where appropriate

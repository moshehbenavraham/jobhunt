# Session 04: Boot Path and Validation

**Session ID**: `phase00-session04-boot-path-and-validation`
**Packages**: apps/web, apps/api
**Status**: Not Started
**Estimated Tasks**: ~13
**Estimated Duration**: 2-4 hours

---

## Objective

Prove the new app can boot against the live repo, expose a minimal health or
status surface, and validate the phase-00 contract before deeper runtime work
starts.

---

## Scope

### In Scope (MVP)

- Add a minimal boot path spanning the web and API packages
- Surface startup diagnostics for missing prerequisites and repo resolution
- Add validation coverage or checks for the new bootstrap and contract wiring
- Keep startup behavior read-first unless explicitly creating app-owned state

### Out of Scope

- Long-running jobs
- Approval inbox flows
- Full workflow execution or report generation

---

## Prerequisites

- [ ] Sessions 01-03 completed
- [ ] Validation approach chosen for app bootstrap regressions

---

## Deliverables

1. Minimal runnable app boot path across `apps/web` and `apps/api`
2. Startup-status or health-check surface for repo resolution diagnostics
3. Validation coverage that guards the phase-00 contract

---

## Success Criteria

- [ ] The app boots against a live repo clone with deterministic path
      resolution
- [ ] Startup checks report missing prerequisites without mutating user files
- [ ] Validation catches contract drift in the new bootstrap path


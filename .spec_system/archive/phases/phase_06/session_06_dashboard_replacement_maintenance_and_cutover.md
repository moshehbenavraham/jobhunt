# Session 06: Dashboard Replacement, Maintenance, and Cutover

**Session ID**: `phase06-session06-dashboard-replacement-maintenance-and-cutover`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Packages**: apps/web, apps/api

---

## Objective

Replace the remaining dashboard and CLI-only operator paths, finalize
maintenance and update-check surfaces, and run the final parity gate needed to
decide whether the Go dashboard can be retired for normal single-user
operation.

---

## Scope

### In Scope (MVP)

- Add dashboard-equivalent views or home summaries for the daily operator path
- Finalize settings, maintenance, update-check, and onboarding copy so the app
  no longer points users back to `codex` as the primary entry point
- Run final smoke or regression validation and document the dashboard cutover
  decision with any remaining gaps

### Out of Scope

- Post-PRD packaging, desktop shell work, or new product scope beyond parity
- Reopening already-complete Phase 04 or Phase 05 workflows unless parity
  validation finds a blocking regression

---

## Prerequisites

- [x] `phase03-session05-settings-and-maintenance-surface`
- [x] `phase05-session06-application-help-review-and-approvals`
- [ ] `phase06-session05-specialist-review-surfaces`

---

## Deliverables

1. Dashboard-equivalent operator surface and maintenance or update-check polish
2. Final parity validation notes and cutover decision for the Go dashboard
3. Updated onboarding or operator messaging that makes the app the primary
   single-user path

---

## Success Criteria

- [ ] A single operator can complete normal daily Job-Hunt work in the app
      without launching `codex`
- [ ] Dashboard-equivalent views and maintenance surfaces cover the remaining
      legacy operator path
- [ ] Final parity validation clearly documents whether the Go dashboard stays
      as a secondary surface or can be retired

# Session 06: Auto-Pipeline Parity and Regression

**Session ID**: `phase04-session06-auto-pipeline-parity-and-regression`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/api

---

## Objective

Close Phase 04 by wiring the full JD and live-URL auto-pipeline path to the
new evaluation, report, pipeline, and tracker surfaces, then lock parity with
regression coverage.

---

## Scope

### In Scope (MVP)

- Align auto-pipeline launch, liveness verification, evaluation closeout, and
  artifact handoff with the new Phase 04 contracts
- Verify the main JD and URL workflow end to end against report, PDF, tracker,
  and warning expectations
- Extend regression coverage for the finished Phase 04 parity path

### Out of Scope

- Scan, batch, and application-help parity work reserved for Phase 05
- Remaining specialist workflow surfaces reserved for Phase 06

---

## Prerequisites

- [ ] `phase04-session01-evaluation-result-contract`
- [ ] `phase04-session02-evaluation-console-and-artifact-handoff`
- [ ] `phase04-session03-report-viewer-and-artifact-browser`
- [ ] `phase04-session04-pipeline-review-workspace`
- [ ] `phase04-session05-tracker-workspace-and-integrity-actions`

---

## Deliverables

1. End-to-end auto-pipeline closeout aligned with Phase 04 read and write
   contracts
2. Regression suite updates for JD and live-URL parity flows
3. Phase-exit validation checklist for evaluation, artifacts, and tracker
   behavior

---

## Success Criteria

- [ ] The main JD and URL workflow produces the same durable artifacts and
      tracker behavior as the current Codex-primary path
- [ ] Regression coverage exercises report, PDF, tracker, and verification
      outcomes through the app-owned runtime
- [ ] Phase 04 can exit to Phase 05 without unresolved parity gaps in the core
      evaluation loop

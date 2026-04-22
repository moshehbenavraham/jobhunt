# Session 03: Batch Supervisor Contract

**Session ID**: `phase05-session03-batch-supervisor-contract`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/api

---

## Objective

Expose a typed backend contract for batch workflow composition, per-item state,
retry and resume controls, and merge-plus-verify closeout so batch supervision
is app-owned instead of shell-driven.

---

## Scope

### In Scope (MVP)

- Define bounded batch summaries for draft, queued, running, waiting, failed,
  completed, and merge-ready states
- Surface per-item status, warnings, approval pauses, retry eligibility, and
  merge-and-verify readiness from one canonical API contract
- Add explicit backend action routes for retry, resume, merge, and verify
  controls with idempotent semantics

### Out of Scope

- Batch workspace layout and matrix UI
- Specialist workflows beyond batch evaluation and closeout

---

## Prerequisites

- [x] `phase01-session04-durable-job-runner`
- [x] `phase02-session04-scan-pipeline-and-batch-tools`
- [x] `phase04-session05-tracker-workspace-and-integrity-actions`
- [ ] `phase05-session02-scan-review-workspace`

---

## Deliverables

1. API summary contract for batch composition, item matrix, and run detail
2. Backend action support for retry, resume, merge, and verify
3. Contract and route coverage for approval-paused, warning, failed, and
   merge-blocked batch states

---

## Success Criteria

- [ ] Operators can fetch one typed summary for batch readiness, item state,
      and closeout actions
- [ ] Retry, resume, merge, and verify actions stay backend-owned and explicit
- [ ] Approval pauses and tracker-integrity warnings remain visible instead of
      collapsing into generic failures
